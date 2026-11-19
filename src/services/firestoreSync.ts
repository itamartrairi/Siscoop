/**
 * Sincronização automática de TODOS os dados da cooperativa com o Firestore.
 *
 * Cada registro (cooperado, conta a pagar, venda, lançamento contábil...) vira
 * um documento na coleção `dadosCooperativa`, com o id
 * `<tenantId>__<coleção>__<id do registro>` e os campos:
 *   - tenantId, colecao, registroId  → usados pelas regras e pelas consultas
 *   - json                           → o registro inteiro serializado
 *   - atualizadoEm, atualizadoPor
 *
 * Guardar o registro como texto JSON evita as restrições do Firestore
 * (undefined, arrays aninhados, chaves com caracteres especiais).
 *
 * Fluxo:
 *  1. Ao entrar (Firebase Auth + cooperativa definida), abre um listener em
 *     tempo real dos documentos da cooperativa. A primeira leitura é mesclada
 *     com os dados locais (o Firestore prevalece; o que só existe no
 *     navegador é enviado em seguida).
 *  2. A cada alteração no sistema, compara cada registro com a última versão
 *     gravada (hash) e envia só o que mudou, em lotes (writeBatch).
 *  3. Alterações feitas em outro computador chegam pelo listener e são
 *     aplicadas na tela.
 *
 * O localStorage continua como cache local (o sistema abre mesmo offline).
 */
import { collection, doc, onSnapshot, query, where, writeBatch, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from './firebase';

export const COLECAO_FIRESTORE = 'dadosCooperativa';
const UNICO = '__unico';
const FRAGMENTOS = 'fragmentosRegistro';

/** Listas do snapshot do sistema que são gravadas no Firestore (um documento por registro). */
export const LISTAS_SINCRONIZADAS = [
  'cooperados', 'transacoesCapital', 'assembleias', 'mandatos', 'auditoriaLogs', 'webhooks', 'notasFiscais',
  'produtores', 'produtos', 'registrosProducao', 'programas', 'chamadasPublicas', 'rateiosChamadas', 'ofertasPAA',
  'programacoesEntrega', 'prestacoesContas', 'pedidosProdutorPAA', 'ordensCompra', 'planoContas',
  'lancamentosContabeis', 'patrimonio', 'contasPagarReceber', 'solicitacoesCompra', 'fornecedores', 'estoque',
  'movimentacoesEstoque', 'funcionariosRH', 'folhaPagamento', 'escolasPnae', 'motoristas', 'contasBancarias',
  'maquinas', 'locacoesMaquinas', 'clientes', 'vendasRevenda', 'entregasEscola', 'romaneiosMotorista', 'atividades',
] as const;

/** Objetos únicos (configurações) gravados como um documento cada. */
export const OBJETOS_SINCRONIZADOS = ['config', 'extratoBancario', 'sefazCeConfig', 'rolePermissions'] as const;

const TODAS = new Set<string>([...LISTAS_SINCRONIZADAS, ...OBJETOS_SINCRONIZADOS]);
const OBJETOS = new Set<string>(OBJETOS_SINCRONIZADOS);

/** Limite de segurança abaixo de 1 MiB (limite de documento do Firestore). */
const TAMANHO_MAXIMO = 900_000;
const codificadorUtf8 = new TextEncoder();
const LOTE = 400;
const MAX_BYTES_LOTE = 8_000_000;
const ESPERA_GRAVACAO_MS = 2500;

type Registro = Record<string, any>;

export type MudancaRemota =
  | { tipo: 'inicial'; registros: Registro[] }
  | { tipo: 'incremental'; upserts: Registro[]; removidos: string[] }
  | { tipo: 'objeto'; valor: unknown };

export interface StatusSincronizacao {
  fase: 'desligado' | 'carregando' | 'sincronizado' | 'gravando' | 'erro';
  mensagem?: string;
  ultimaGravacao?: string;
  pendentes?: number;
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/** Hash rápido (cyrb53) para comparar versões de um registro. */
const hash = (texto: string): string => {
  let h1 = 0xdeadbeef ^ texto.length, h2 = 0x41c6ce57 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

/** Chave estável de um registro dentro da sua lista. */
export const chaveRegistro = (r: Registro): string => {
  const id = r?.id ?? r?.codigo ?? r?.numero;
  return id !== undefined && id !== null && id !== '' ? String(id) : `h${hash(JSON.stringify(r))}`;
};

const idSeguro = (s: string) => s.replace(/[/\s#?[\]]/g, '_').slice(0, 300);
const docIdDe = (tenantId: string, colecao: string, chave: string) => `${tenantId}__${colecao}__${idSeguro(chave)}`;

const pertence = (r: Registro, tenantId: string) => !r || !r.tenantId || r.tenantId === tenantId;

type Documento = { colecao: string; registroId: string; json: string; partes?: number };
type LeituraDocumento = Partial<Documento>;

const chaveFragmento = (id: string, parte: number) => `${hash(id)}-${parte}`;

function dividirDocumento(dados: Documento): string[] {
  return codificadorUtf8.encode(dados.json).byteLength > TAMANHO_MAXIMO
    ? dados.json.match(/[\s\S]{1,140000}/gu) || []
    : [];
}

function lerDocumento(tenantId: string, id: string, dados: LeituraDocumento, docs: Map<string, LeituraDocumento>) {
  if (!dados.partes) return dados.json;
  if (!Number.isSafeInteger(dados.partes) || dados.partes < 1 || dados.partes > LOTE) return;
  const partes = [];
  for (let parte = 0; parte < dados.partes; parte++) {
    const fragmento = docs.get(docIdDe(tenantId, FRAGMENTOS, chaveFragmento(id, parte)));
    if (typeof fragmento?.json !== 'string') return;
    partes.push(fragmento.json);
  }
  const json = partes.join('');
  return 'fragmentos:' + hash(json) === dados.json ? json : undefined;
}

// ---------------------------------------------------------------------------
// Estado do módulo (uma sessão de sincronização por vez)
// ---------------------------------------------------------------------------

interface Sessao {
  tenantId: string;
  carregado: boolean;
  /** docId → hash do json gravado/lido do Firestore */
  conhecidos: Map<string, string>;
  fragmentos: Map<string, number>;
  cancelar: Unsubscribe | null;
  tentativas: number;
  timerReabrir: ReturnType<typeof setTimeout> | null;
}

let sessao: Sessao | null = null;
let pendente: Record<string, unknown> | null = null;
// Ordem dos eventos: um snapshot local mais antigo que a última mudança
// recebida do Firestore está desatualizado e não pode ser gravado (senão
// sobrescreveria a alteração feita em outro computador).
let sequencia = 0;
let pendenteSeq = 0;
let remotaSeq = 0;
let timerGravacao: ReturnType<typeof setTimeout> | null = null;
let gravando = false;
let status: StatusSincronizacao = { fase: 'desligado' };
const ouvintesStatus = new Set<(s: StatusSincronizacao) => void>();

const definirStatus = (s: Partial<StatusSincronizacao>) => {
  status = { ...status, ...s };
  ouvintesStatus.forEach(cb => {
    try { cb(status); } catch { /* ignora */ }
  });
};

export const obterStatusSincronizacao = () => status;

export const ouvirStatusSincronizacao = (cb: (s: StatusSincronizacao) => void): (() => void) => {
  ouvintesStatus.add(cb);
  cb(status);
  return () => { ouvintesStatus.delete(cb); };
};

// ---------------------------------------------------------------------------
// Mescla de dados remotos no estado local
// ---------------------------------------------------------------------------

export const aplicarMudancaRemota = (atual: unknown, mudanca: MudancaRemota): unknown => {
  if (mudanca.tipo === 'objeto') {
    return mudanca.valor && typeof mudanca.valor === 'object' ? mudanca.valor : atual;
  }
  const lista: Registro[] = Array.isArray(atual) ? (atual as Registro[]) : [];
  if (mudanca.tipo === 'inicial') {
    const remotos = new Map(mudanca.registros.map(r => [chaveRegistro(r), r]));
    const chavesLocais = new Set(lista.map(chaveRegistro));
    const soRemotos = mudanca.registros.filter(r => !chavesLocais.has(chaveRegistro(r)));
    return [...soRemotos, ...lista.map(r => remotos.get(chaveRegistro(r)) ?? r)];
  }
  const removidos = new Set(mudanca.removidos);
  const atualizados = new Map(mudanca.upserts.map(r => [chaveRegistro(r), r]));
  const resultado = lista
    .filter(r => !removidos.has(idSeguro(chaveRegistro(r))))
    .map(r => {
      const k = chaveRegistro(r);
      const novo = atualizados.get(k);
      if (novo) atualizados.delete(k);
      return novo ?? r;
    });
  return [...atualizados.values(), ...resultado];
};

// ---------------------------------------------------------------------------
// Leitura em tempo real
// ---------------------------------------------------------------------------

export const iniciarSincronizacaoFirestore = (
  tenantId: string,
  aplicar: (colecao: string, mudanca: MudancaRemota) => void
): (() => void) => {
  pararSincronizacaoFirestore();
  const atual: Sessao = { tenantId, carregado: false, conhecidos: new Map(), fragmentos: new Map(), cancelar: null, tentativas: 0, timerReabrir: null };
  sessao = atual;
  const aplicarRemoto = (colecao: string, mudanca: MudancaRemota) => {
    remotaSeq = ++sequencia;
    aplicar(colecao, mudanca);
  };

  const abrir = () => {
    if (sessao !== atual) return;
    definirStatus({ fase: 'carregando', mensagem: 'Carregando dados do Firestore...' });
    const q = query(collection(db, COLECAO_FIRESTORE), where('tenantId', '==', tenantId));
    atual.cancelar = onSnapshot(q, { includeMetadataChanges: true }, snap => {
      if (sessao !== atual) return;
      atual.tentativas = 0;
      let docs: Map<string, LeituraDocumento> | undefined;
      const ler = (id: string, dados: LeituraDocumento) => {
        if (dados.partes && !docs) docs = new Map(snap.docs.map(item => [item.id, item.data() as LeituraDocumento]));
        const json = dados.partes && docs ? lerDocumento(tenantId, id, dados, docs) : dados.json;
        if (typeof json === 'string') {
          if (dados.partes) atual.fragmentos.set(id, dados.partes);
          else atual.fragmentos.delete(id);
        }
        return json;
      };

      if (!atual.carregado) {
        // O cache pode estar incompleto. Só reconcilie e libere gravações após ler o servidor.
        if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
        const listas = new Map<string, Registro[]>();
        snap.docs.forEach(d => {
          const dados = d.data() as LeituraDocumento;
          if (!dados.colecao || !TODAS.has(dados.colecao)) return;
          const json = ler(d.id, dados);
          if (typeof json !== 'string') return;
          atual.conhecidos.set(d.id, hash(json));
          try {
            const valor = JSON.parse(json);
            if (OBJETOS.has(dados.colecao)) aplicarRemoto(dados.colecao, { tipo: 'objeto', valor });
            else listas.set(dados.colecao, [...(listas.get(dados.colecao) || []), valor]);
          } catch (e) {
            console.warn(`[Firestore] Registro ilegível ignorado: ${d.id}`, e);
          }
        });
        listas.forEach((registros, colecao) => aplicarRemoto(colecao, { tipo: 'inicial', registros }));
        atual.carregado = true;
        definirStatus({ fase: 'sincronizado', mensagem: `Dados carregados do Firestore (${snap.size} registro(s)).` });
        // Envia o que existe só neste navegador. Se dados remotos foram
        // aplicados, espera o snapshot atualizado (chega logo em seguida).
        if (pendente && pendenteSeq > remotaSeq) agendarGravacao(500);
        return;
      }

      const porColecao = new Map<string, { upserts: Registro[]; removidos: string[] }>();
      snap.docChanges({ includeMetadataChanges: true }).forEach(ch => {
        if (ch.doc.metadata.hasPendingWrites) return; // eco das gravações deste navegador
        const dados = ch.doc.data() as LeituraDocumento;
        if (!dados.colecao || !TODAS.has(dados.colecao)) return;
        if (ch.type === 'removed') {
          if (!atual.conhecidos.has(ch.doc.id)) return;
          atual.conhecidos.delete(ch.doc.id);
          atual.fragmentos.delete(ch.doc.id);
          if (OBJETOS.has(dados.colecao)) return;
          const g = porColecao.get(dados.colecao) || { upserts: [], removidos: [] };
          g.removidos.push(String(dados.registroId || ''));
          porColecao.set(dados.colecao, g);
          return;
        }
        const json = ler(ch.doc.id, dados);
        if (typeof json !== 'string') return;
        const h = hash(json);
        if (atual.conhecidos.get(ch.doc.id) === h) return;
        atual.conhecidos.set(ch.doc.id, h);
        try {
          const valor = JSON.parse(json);
          if (OBJETOS.has(dados.colecao)) { aplicarRemoto(dados.colecao, { tipo: 'objeto', valor }); return; }
          const g = porColecao.get(dados.colecao) || { upserts: [], removidos: [] };
          g.upserts.push(valor);
          porColecao.set(dados.colecao, g);
        } catch { /* ignora registro ilegível */ }
      });
      porColecao.forEach((g, colecao) => aplicarRemoto(colecao, { tipo: 'incremental', ...g }));
    }, err => {
      if (sessao !== atual) return;
      const negado = (err as { code?: string })?.code === 'permission-denied';
      definirStatus({
        fase: 'erro',
        mensagem: negado
          ? 'O Firestore recusou o acesso aos dados (permissão negada). Publique o arquivo firestore.rules atualizado no Console do Firebase.'
          : `Falha ao ler o Firestore: ${err?.message || err}`,
      });
      // O vínculo users/{uid} pode ainda estar sendo criado: tenta de novo algumas vezes.
      if (atual.tentativas < 6) {
        atual.tentativas++;
        atual.timerReabrir = setTimeout(abrir, 5000 * atual.tentativas);
      }
    });
  };

  abrir();
  return () => { if (sessao === atual) pararSincronizacaoFirestore(); };
};

export const pararSincronizacaoFirestore = () => {
  if (sessao) {
    sessao.cancelar?.();
    if (sessao.timerReabrir) clearTimeout(sessao.timerReabrir);
  }
  sessao = null;
  if (timerGravacao) { clearTimeout(timerGravacao); timerGravacao = null; }
  definirStatus({ fase: 'desligado', mensagem: undefined });
};

// ---------------------------------------------------------------------------
// Gravação (só o que mudou)
// ---------------------------------------------------------------------------

/** Chamado a cada mudança do snapshot do sistema. */
export const agendarSincronizacaoFirestore = (payload: Record<string, unknown>) => {
  pendente = payload;
  pendenteSeq = ++sequencia;
  if (!sessao?.carregado) return; // grava depois que a primeira leitura terminar
  agendarGravacao(ESPERA_GRAVACAO_MS);
};

const agendarGravacao = (ms: number) => {
  if (timerGravacao) clearTimeout(timerGravacao);
  timerGravacao = setTimeout(() => { timerGravacao = null; void gravarPendente(); }, ms);
};

const montarDesejados = (payload: Record<string, unknown>, tenantId: string) => {
  const desejados = new Map<string, { colecao: string; registroId: string; json: string }>();
  for (const colecao of LISTAS_SINCRONIZADAS) {
    const lista = payload[colecao];
    if (!Array.isArray(lista)) continue;
    for (const r of lista as Registro[]) {
      if (!r || typeof r !== 'object' || !pertence(r, tenantId)) continue;
      const registroId = idSeguro(chaveRegistro(r));
      desejados.set(docIdDe(tenantId, colecao, registroId), { colecao, registroId, json: JSON.stringify(r) });
    }
  }
  for (const colecao of OBJETOS_SINCRONIZADOS) {
    const valor = payload[colecao] as Registro | undefined;
    if (!valor || typeof valor !== 'object' || !pertence(valor, tenantId)) continue;
    desejados.set(docIdDe(tenantId, colecao, UNICO), { colecao, registroId: UNICO, json: JSON.stringify(valor) });
  }
  return desejados;
};

const gravarPendente = async () => {
  const s = sessao;
  if (!s?.carregado || !pendente) return;
  if (!auth.currentUser) return;
  if (pendenteSeq < remotaSeq) return; // snapshot desatualizado: aguarda o próximo
  if (gravando) { agendarGravacao(ESPERA_GRAVACAO_MS); return; }
  gravando = true;
  const payload = pendente;
  pendente = null;
  try {
    const desejados = montarDesejados(payload, s.tenantId);
    const gravar: [string, Documento, string, string[]][] = [];
    const grandes: string[] = [];
    desejados.forEach((d, id) => {
      const h = hash(d.json);
      if (s.conhecidos.get(id) === h) return;
      const partes = dividirDocumento(d);
      if (partes.length && codificadorUtf8.encode(d.json).byteLength + (partes.length + 1) * 4096 > MAX_BYTES_LOTE) {
        grandes.push(`${d.colecao}/${d.registroId}`);
        return;
      }
      gravar.push([id, d, h, partes]);
    });

    // Exclusões: só de documentos que este navegador conhece. Proteção contra
    // apagar em massa por engano (ex.: uma lista que ficou vazia sem querer).
    const prefixo = `${s.tenantId}__`;
    const porColecaoConhecidos = new Map<string, string[]>();
    s.conhecidos.forEach((_h, id) => {
      if (!id.startsWith(prefixo)) return;
      const colecao = id.slice(prefixo.length).split('__')[0];
      porColecaoConhecidos.set(colecao, [...(porColecaoConhecidos.get(colecao) || []), id]);
    });
    const apagar: string[] = [];
    porColecaoConhecidos.forEach((ids, colecao) => {
      if (!TODAS.has(colecao) || OBJETOS.has(colecao)) return;
      const sumidos = ids.filter(id => !desejados.has(id));
      if (sumidos.length > 20 && sumidos.length > ids.length / 2) {
        console.warn(`[Firestore] ${sumidos.length} de ${ids.length} registro(s) de "${colecao}" sumiram de uma vez — exclusão em massa não enviada por segurança.`);
        return;
      }
      apagar.push(...sumidos);
    });

    if (!gravar.length && !apagar.length) {
      if (grandes.length) definirStatus({ fase: 'erro', mensagem: `Registro(s) grande(s) demais para o Firestore (acima do limite de ~8 MB por registro): ${grandes.slice(0, 5).join(', ')}` });
      return;
    }

    definirStatus({ fase: 'gravando', pendentes: gravar.length + apagar.length, mensagem: undefined });
    const agora = new Date().toISOString();
    const quem = auth.currentUser?.email || auth.currentUser?.uid || '';
    const operacoes: (() => void)[] = [];
    let batch = writeBatch(db);
    let noLote = 0;
    let bytesNoLote = 0;
    const commits: ReturnType<typeof writeBatch>[] = [];
    const fecharLote = () => {
      if (!noLote) return;
      commits.push(batch);
      batch = writeBatch(db);
      noLote = 0;
      bytesNoLote = 0;
    };

    const gravarDocumento = (id: string, dados: Documento) => {
      batch.set(doc(db, COLECAO_FIRESTORE, id), {
        tenantId: s.tenantId, ...dados, atualizadoEm: agora, atualizadoPor: quem,
      });
    };
    const removerFragmentos = (id: string, inicio: number, total: number) => {
      for (let parte = inicio; parte < total; parte++) {
        batch.delete(doc(db, COLECAO_FIRESTORE, docIdDe(s.tenantId, FRAGMENTOS, chaveFragmento(id, parte))));
      }
    };

    for (const [id, d, h, partes] of gravar) {
      const anteriores = s.fragmentos.get(id) || 0;
      const quantidade = 1 + Math.max(partes.length, anteriores);
      const bytes = codificadorUtf8.encode(d.json).byteLength + quantidade * 4096;
      if (bytesNoLote + bytes > MAX_BYTES_LOTE || noLote + quantidade > LOTE) fecharLote();
      bytesNoLote += bytes;
      noLote += quantidade;
      partes.forEach((json, i) => {
        const registroId = chaveFragmento(id, i);
        gravarDocumento(docIdDe(s.tenantId, FRAGMENTOS, registroId), { colecao: FRAGMENTOS, registroId, json });
      });
      gravarDocumento(id, partes.length ? { ...d, json: 'fragmentos:' + h, partes: partes.length } : d);
      removerFragmentos(id, partes.length, anteriores);
      operacoes.push(() => {
        s.conhecidos.set(id, h);
        if (partes.length) s.fragmentos.set(id, partes.length);
        else s.fragmentos.delete(id);
      });
    }
    for (const id of apagar) {
      const anteriores = s.fragmentos.get(id) || 0;
      if (noLote + 1 + anteriores > LOTE) fecharLote();
      batch.delete(doc(db, COLECAO_FIRESTORE, id));
      removerFragmentos(id, 0, anteriores);
      noLote += 1 + anteriores;
      operacoes.push(() => {
        s.conhecidos.delete(id);
        s.fragmentos.delete(id);
      });
    }
    fecharLote();
    for (const lote of commits) {
      if (sessao !== s) return;
      await lote.commit();
    }
    if (sessao === s) operacoes.forEach(op => op());
    definirStatus({
      fase: grandes.length ? 'erro' : 'sincronizado',
      pendentes: 0,
      ultimaGravacao: agora,
      mensagem: grandes.length
        ? `Registro(s) grande(s) demais para o Firestore (acima do limite de ~8 MB por registro): ${grandes.slice(0, 5).join(', ')}`
        : `Salvo no Firestore (${gravar.length} gravado(s), ${apagar.length} excluído(s)).`,
    });
  } catch (err: any) {
    console.warn('[Firestore] Falha ao gravar os dados:', err);
    pendente = pendente || payload; // tenta de novo na próxima alteração/tentativa
    definirStatus({
      fase: 'erro',
      mensagem: err?.code === 'permission-denied'
        ? 'O Firestore recusou a gravação (permissão negada). Publique o arquivo firestore.rules atualizado no Console do Firebase.'
        : `Falha ao salvar no Firestore: ${err?.message || err}. Nova tentativa em 30 s.`,
    });
    agendarGravacao(30_000);
  } finally {
    gravando = false;
  }
};
