/**
 * Junta as linhas lidas da planilha TB-01 ao cadastro atual de cooperados.
 *
 * - Identifica o cadastro existente pelo CPF válido ou, na falta dele, pela
 *   matrícula (a base histórica tem muitos sócios sem CPF).
 * - Linhas com problema são puladas e listadas com o motivo, em vez de
 *   recusar a planilha inteira.
 * - Com `limparVazios`, célula de texto vazia apaga o dado atual ("a planilha
 *   manda"); sem ela, o dado atual é mantido. Células numéricas e de marcar
 *   vazias nunca apagam nada.
 *
 * Função pura (sem React), para poder ser testada isoladamente.
 */
import type { Cooperado } from '../types';
import { cpfValido, somenteDigitos } from '../utils/documentos';
import type { LinhaImportada } from './planilhaTB01';

export interface OpcoesMesclagem {
  tenantId: string;
  usuario: string;
  limparVazios?: boolean;
  /** Data de hoje em aaaa-mm-dd (parâmetro para facilitar testes). */
  hoje?: string;
  /** Decide se um cooperado da lista pertence à cooperativa atual. */
  pertenceAoTenant?: (c: Cooperado) => boolean;
}

export interface ResultadoMesclagem {
  lista: Cooperado[];
  totalInseridos: number;
  totalAtualizados: number;
  ignorados: string[];
}

const formatarCpf = (d: string) => `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;

export function mesclarImportacao(
  cooperados: Cooperado[],
  linhas: LinhaImportada[],
  opcoes: OpcoesMesclagem
): ResultadoMesclagem {
  const limparVazios = opcoes.limparVazios ?? true;
  const hoje = opcoes.hoje ?? new Date().toISOString().substring(0, 10);
  const pertence = opcoes.pertenceAoTenant ?? ((c: Cooperado) => !c.tenantId || c.tenantId === opcoes.tenantId);
  const ignorados: string[] = [];

  const porCpf = new Map<string, Cooperado>();
  const porMatricula = new Map<string, Cooperado>();
  cooperados.filter(pertence).forEach(c => {
    const cpf = somenteDigitos(c.cpf);
    if (cpfValido(cpf)) porCpf.set(cpf, c);
    if (c.matricula) porMatricula.set(String(c.matricula).trim().toLowerCase(), c);
  });

  const cpfsVistos = new Set<string>();
  const matriculasVistas = new Set<string>();
  const idsAtualizados = new Set<string>();
  const porId = new Map(cooperados.map(c => [c.id, c] as const));
  const novos: Cooperado[] = [];
  let totalInseridos = 0;
  let totalAtualizados = 0;

  linhas.forEach(({ _linha, ...dados }) => {
    const ref = `Linha ${_linha}`;
    const nome = String(dados.nome ?? '').trim();
    const matricula = String(dados.matricula ?? '').trim();
    const cpfDig = somenteDigitos(dados.cpf);
    const temCpf = cpfValido(cpfDig);

    if (!nome) { ignorados.push(`${ref}: sem nome do sócio.`); return; }
    if (!temCpf && !matricula) { ignorados.push(`${ref} (${nome}): sem CPF válido e sem matrícula para identificar o cadastro.`); return; }
    if (temCpf && cpfsVistos.has(cpfDig)) { ignorados.push(`${ref} (${nome}): CPF repetido na planilha.`); return; }
    if (matricula && matriculasVistas.has(matricula.toLowerCase())) { ignorados.push(`${ref} (${nome}): matrícula ${matricula} repetida na planilha.`); return; }

    const pelaMatricula = matricula ? porMatricula.get(matricula.toLowerCase()) : undefined;
    const peloCpf = temCpf ? porCpf.get(cpfDig) : undefined;
    if (pelaMatricula && peloCpf && pelaMatricula.id !== peloCpf.id) {
      ignorados.push(`${ref} (${nome}): o CPF é do cadastro de ${peloCpf.nome} e a matrícula ${matricula} é de ${pelaMatricula.nome}.`);
      return;
    }
    const existente = peloCpf || pelaMatricula;
    if (existente && !peloCpf && temCpf && cpfValido(existente.cpf) && somenteDigitos(existente.cpf) !== cpfDig) {
      ignorados.push(`${ref} (${nome}): a matrícula ${matricula} já pertence a outro CPF no sistema.`);
      return;
    }
    if (existente && idsAtualizados.has(existente.id)) {
      ignorados.push(`${ref} (${nome}): o mesmo cadastro já foi atualizado por outra linha da planilha.`);
      return;
    }
    if (temCpf) cpfsVistos.add(cpfDig);
    if (matricula) matriculasVistas.add(matricula.toLowerCase());

    const base: Cooperado = existente ? { ...existente } : {
      id: `cop-imp-${Date.now()}-${_linha}`,
      tenantId: opcoes.tenantId,
      matricula: matricula || `IMP-${_linha}`,
      nome: '',
      cpf: '', rg: '', dataNascimento: '', sexo: 'M', estadoCivil: '' as Cooperado['estadoCivil'],
      profissao: '', escolaridade: '', naturalidade: '', nacionalidade: '',
      situacao: 'ATIVO', dataFiliacao: '', categoria: 'EFETIVO',
      cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', pais: 'Brasil',
      telefone: '', celular: '', whatsapp: '', email: '', contatoEmergencia: '',
      documentos: [], banco: '', agencia: '', conta: '', tipoConta: 'CORRENTE', chavePix: '',
      historico: [], capitalSubscrito: 0, capitalIntegralizado: 0, aptoPaa: true,
    };

    const atualizado: Record<string, unknown> = { ...base };
    for (const [campo, valor] of Object.entries(dados)) {
      if (valor === '' && !limparVazios) continue;
      atualizado[campo] = valor;
    }
    atualizado.nome = nome.toUpperCase();
    if (temCpf) atualizado.cpf = formatarCpf(cpfDig);
    if (!atualizado.tipoConta) atualizado.tipoConta = 'CORRENTE';
    atualizado.historico = [
      ...(base.historico || []),
      {
        id: `h-imp-${Date.now()}-${_linha}`,
        data: hoje,
        usuario: opcoes.usuario,
        acao: existente ? 'Atualização por planilha' : 'Importação por planilha',
        detalhes: existente ? 'Cadastro atualizado pela planilha TB-01' : 'Cooperado importado pela planilha TB-01',
      },
    ];

    if (existente) {
      porId.set(existente.id, atualizado as unknown as Cooperado);
      idsAtualizados.add(existente.id);
      totalAtualizados++;
    } else {
      novos.push(atualizado as unknown as Cooperado);
      totalInseridos++;
    }
  });

  return {
    lista: [...cooperados.map(c => porId.get(c.id) || c), ...novos],
    totalInseridos,
    totalAtualizados,
    ignorados,
  };
}
