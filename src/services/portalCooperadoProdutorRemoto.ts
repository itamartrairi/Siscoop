/**
 * Portal do Cooperado e App do Produtor acessíveis de qualquer aparelho.
 *
 * Mesmo modelo dos portais da escola e do motorista:
 * - a cooperativa publica um resumo por pessoa (/portalCooperados, /portalProdutores);
 * - a pessoa entra com um link enviado ao e-mail cadastrado e lê só o seu documento;
 * - as ofertas feitas pelo produtor vão para /portalProdutoresOfertas e a
 *   cooperativa aplica e apaga.
 */
import { useCallback, useEffect, useState } from 'react';
import { isSignInWithEmailLink, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db as dbCooperativa } from './firebase';
import {
  authPortal,
  dbPortal,
  LIMITE_DOC,
  norm,
  semUndefined,
  traduzirErro,
  enviarLinkAcesso,
  concluirLinkAcesso,
} from './portalEscolaRemoto';

export const COL_PORTAL_COOPERADO = 'portalCooperados';
export const COL_PORTAL_PRODUTOR = 'portalProdutores';
export const COL_OFERTAS_PRODUTOR = 'portalProdutoresOfertas';

/* ------------------------------------------------------------------ */
/* Publicação genérica (lado da cooperativa)                            */
/* ------------------------------------------------------------------ */

function hashTexto(texto: string): string {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

function lerAssinaturas(colecao: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('siscoop:portal-assinaturas:' + colecao) || '{}');
  } catch {
    return {};
  }
}

function salvarAssinaturas(colecao: string, mapa: Record<string, string>) {
  try {
    localStorage.setItem('siscoop:portal-assinaturas:' + colecao, JSON.stringify(mapa));
  } catch {
    // sem espaço: só republica mais vezes
  }
}

const limpezaFeita = new Set<string>();

/**
 * Grava só os documentos que mudaram (a assinatura fica no navegador, para não
 * regravar tudo a cada sessão) e, uma vez por sessão, apaga os documentos de
 * pessoas que saíram do cadastro.
 */
async function publicarColecao(colecao: string, tenantId: string, itens: { id: string; dados: any }[]) {
  const assinaturas = lerAssinaturas(colecao);
  const ids = new Set<string>();
  for (const item of itens) {
    const docId = `${tenantId}__${item.id}`;
    ids.add(docId);
    const { atualizadoEm, ...semData } = item.dados;
    const assinatura = hashTexto(JSON.stringify(semData));
    if (assinaturas[docId] === assinatura) continue;
    await setDoc(doc(dbCooperativa, colecao, docId), item.dados);
    assinaturas[docId] = assinatura;
  }
  const chaveLimpeza = colecao + ':' + tenantId;
  if (!limpezaFeita.has(chaveLimpeza)) {
    limpezaFeita.add(chaveLimpeza);
    const existentes = await getDocs(query(collection(dbCooperativa, colecao), where('tenantId', '==', tenantId)));
    for (const d of existentes.docs) {
      if (!ids.has(d.id)) {
        await deleteDoc(d.ref);
        delete assinaturas[d.id];
      }
    }
  }
  salvarAssinaturas(colecao, assinaturas);
}

function reduzirAteCaber<T>(montar: () => T, cortes: Array<() => boolean>): T {
  let dados = montar();
  for (const cortar of cortes) {
    if (JSON.stringify(dados).length <= LIMITE_DOC) break;
    while (JSON.stringify(dados).length > LIMITE_DOC && cortar()) dados = montar();
  }
  return dados;
}

/* ---------------------------- Cooperado ---------------------------- */

export function montarDadosPortalCooperado(cooperado: any, registros: any[], transacoes: any[], tenantId: string) {
  const nome = norm(cooperado.nome);
  let producao = registros.filter(
    r => r.cooperadoId === cooperado.id || (nome && (norm(r.cooperadoNome) === nome || norm(r.produtorNome) === nome))
  );
  let capital = transacoes.filter(
    t =>
      t.cooperadoId === cooperado.id ||
      (cooperado.matricula && t.cooperadoMatricula === cooperado.matricula) ||
      (nome && norm(t.cooperadoNome) === nome)
  );
  const montar = () =>
    semUndefined({
      tenantId,
      cooperadoId: cooperado.id,
      cooperadoEmail: norm(cooperado.email),
      cooperado,
      producao,
      capital,
      atualizadoEm: new Date().toISOString(),
    });
  return reduzirAteCaber(montar, [
    () => (producao.length > 20 ? ((producao = producao.slice(-Math.floor(producao.length / 2))), true) : false),
    () => (capital.length > 20 ? ((capital = capital.slice(-Math.floor(capital.length / 2))), true) : false),
  ]);
}

export async function publicarPortalCooperados(tenantId: string, cooperados: any[], registros: any[], transacoes: any[]) {
  const itens = cooperados
    .filter(c => c?.id && c.email && (!c.tenantId || c.tenantId === tenantId))
    .map(c => ({ id: c.id, dados: montarDadosPortalCooperado(c, registros, transacoes, tenantId) }));
  await publicarColecao(COL_PORTAL_COOPERADO, tenantId, itens);
}

/* ----------------------------- Produtor ---------------------------- */

interface FontesProdutor {
  cooperados: any[];
  produtos: any[];
  chamadas: any[];
  ofertas: any[];
  pedidos: any[];
  programacoes: any[];
}

/** O e-mail do produtor é o do cooperado vinculado ou o do próprio cadastro (igual ao app). */
export function emailDoProdutor(produtor: any, cooperados: any[]): string {
  if (produtor?.cooperadoId) {
    const c = cooperados.find(x => x.id === produtor.cooperadoId);
    if (c?.email) return norm(c.email);
  }
  return norm(produtor?.email);
}

export function montarDadosPortalProdutor(produtor: any, fontes: FontesProdutor, tenantId: string) {
  const nome = norm(produtor.nome);
  const cooperado = produtor.cooperadoId ? fontes.cooperados.find(c => c.id === produtor.cooperadoId) : undefined;
  const ofertas = fontes.ofertas.filter(o => o.produtorId === produtor.id || (nome && norm(o.produtorNome) === nome));
  let pedidos = fontes.pedidos.filter(
    p =>
      (p.produtoresParticipantes || []).some((n: string) => norm(n) === nome) ||
      (p.itens || []).some((i: any) => i.produtorId === produtor.id || norm(i.produtorNome) === nome)
  );
  let programacoes = fontes.programacoes.filter(e =>
    (e.itens || []).some((i: any) => i.produtorId === produtor.id || norm(i.produtorNome) === nome)
  );
  const idsChamadasOfertadas = new Set(ofertas.map(o => o.chamadaPublicaId));
  let chamadas = fontes.chamadas;
  const montar = () =>
    semUndefined({
      tenantId,
      produtorId: produtor.id,
      produtorEmail: emailDoProdutor(produtor, fontes.cooperados),
      produtor,
      cooperado: cooperado ? { id: cooperado.id, nome: cooperado.nome, email: cooperado.email } : null,
      produtos: fontes.produtos,
      chamadas,
      ofertas,
      ofertaIds: ofertas.map(o => o.id),
      pedidos,
      programacoes,
      atualizadoEm: new Date().toISOString(),
    });
  return reduzirAteCaber(montar, [
    () => {
      const antes = chamadas.length;
      chamadas = chamadas.filter(c => c.status === 'ABERTA' || idsChamadasOfertadas.has(c.id));
      return chamadas.length < antes;
    },
    () => (programacoes.length > 10 ? ((programacoes = programacoes.slice(-Math.floor(programacoes.length / 2))), true) : false),
    () => (pedidos.length > 10 ? ((pedidos = pedidos.slice(-Math.floor(pedidos.length / 2))), true) : false),
  ]);
}

export async function publicarPortalProdutores(tenantId: string, produtores: any[], fontes: FontesProdutor) {
  const itens = produtores
    .filter(p => p?.id && emailDoProdutor(p, fontes.cooperados) && (!p.tenantId || p.tenantId === tenantId))
    .map(p => ({ id: p.id, dados: montarDadosPortalProdutor(p, fontes, tenantId) }));
  await publicarColecao(COL_PORTAL_PRODUTOR, tenantId, itens);
}

/** Recebe as ofertas feitas pelos produtores no celular, entrega ao sistema e apaga. */
export function ouvirOfertasProdutores(
  tenantId: string,
  aplicar: (pedido: { tipo: 'nova' | 'alterar'; produtorId: string; ofertaId?: string; dados: any }) => void
): () => void {
  const q = query(collection(dbCooperativa, COL_OFERTAS_PRODUTOR), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    snap => {
      snap.docChanges().forEach(ch => {
        if (ch.type !== 'added') return;
        const d: any = ch.doc.data();
        if (d?.dados && (d.tipo === 'nova' || d.tipo === 'alterar')) {
          aplicar({ tipo: d.tipo, produtorId: d.produtorId, ofertaId: d.ofertaId, dados: d.dados });
        }
        deleteDoc(ch.doc.ref).catch(err => console.warn('App do Produtor: não foi possível limpar a oferta', err));
      });
    },
    err => console.warn('App do Produtor: falha ao receber ofertas', err)
  );
}

/* ------------------------------------------------------------------ */
/* Sessão (lado do cooperado / produtor)                                */
/* ------------------------------------------------------------------ */

export type StatusPortal = 'verificando' | 'deslogado' | 'link-enviado' | 'pedir-email' | 'carregando' | 'pronto' | 'sem-cadastro';

function usePortalRemoto<T>(colecao: string, campoEmail: string, portal: string) {
  const [status, setStatus] = useState<StatusPortal>('verificando');
  const [dados, setDados] = useState<T | null>(null);
  const [emailSessao, setEmailSessao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setStatus('carregando');
    try {
      const email = norm(authPortal.currentUser?.email || '');
      const snap = email ? await getDocs(query(collection(dbPortal, colecao), where(campoEmail, '==', email))) : null;
      const d = snap && !snap.empty ? (snap.docs[0].data() as T) : null;
      setDados(d);
      setStatus(d ? 'pronto' : 'sem-cadastro');
    } catch (e) {
      setErro(traduzirErro(e));
      setStatus('deslogado');
    }
  }, [colecao, campoEmail]);

  useEffect(() => {
    let ativo = true;
    if (isSignInWithEmailLink(authPortal, window.location.href)) {
      concluirLinkAcesso(undefined, portal).catch(e => {
        if (!ativo) return;
        if (e?.code === 'PEDIR_EMAIL') setStatus('pedir-email');
        else {
          setErro(traduzirErro(e));
          setStatus('deslogado');
        }
      });
    }
    const unsub = onAuthStateChanged(authPortal, (user: FirebaseUser | null) => {
      if (!ativo) return;
      if (user?.email) {
        setEmailSessao(user.email);
        recarregar();
      } else {
        setStatus(s => (s === 'pedir-email' || s === 'link-enviado' ? s : 'deslogado'));
      }
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, [recarregar, portal]);

  const enviarLink = useCallback(
    async (email: string) => {
      setErro(null);
      try {
        await enviarLinkAcesso(email, portal);
        setStatus('link-enviado');
      } catch (e) {
        setErro(traduzirErro(e));
      }
    },
    [portal]
  );

  const confirmarEmailDoLink = useCallback(
    async (email: string) => {
      setErro(null);
      try {
        await concluirLinkAcesso(email, portal);
      } catch (e) {
        setErro(traduzirErro(e));
      }
    },
    [portal]
  );

  const sair = useCallback(async () => {
    try {
      await signOut(authPortal);
    } catch {
      // ignora
    }
    setDados(null);
    setEmailSessao('');
    setStatus('deslogado');
  }, []);

  return { status, dados, setDados, emailSessao, erro, enviarLink, confirmarEmailDoLink, sair, recarregar };
}

export function usePortalCooperadoRemoto() {
  return usePortalRemoto<any>(COL_PORTAL_COOPERADO, 'cooperadoEmail', 'portal-cooperado');
}

export function usePortalProdutorRemoto() {
  const base = usePortalRemoto<any>(COL_PORTAL_PRODUTOR, 'produtorEmail', 'app-produtor');
  const { dados, setDados } = base;

  /** Envia uma oferta nova ou alterada para a cooperativa e já mostra na tela. */
  const enviarOferta = useCallback(
    async (tipo: 'nova' | 'alterar', dadosOferta: any, ofertaId?: string) => {
      if (!dados) throw new Error('Sessão do produtor não encontrada. Entre novamente.');
      const registro = semUndefined({
        tenantId: dados.tenantId,
        produtorId: dados.produtorId,
        produtorEmail: norm(authPortal.currentUser?.email || ''),
        tipo,
        ofertaId,
        dados: dadosOferta,
        criadoEm: new Date().toISOString(),
      });
      await addDoc(collection(dbPortal, COL_OFERTAS_PRODUTOR), registro);
      setDados((atual: any) => {
        if (!atual) return atual;
        const ofertas =
          tipo === 'alterar'
            ? atual.ofertas.map((o: any) => (o.id === ofertaId ? { ...o, ...dadosOferta } : o))
            : [{ ...dadosOferta, id: 'enviando-' + Date.now(), produtorId: atual.produtorId }, ...atual.ofertas];
        return { ...atual, ofertas };
      });
    },
    [dados, setDados]
  );

  return { ...base, enviarOferta };
}
