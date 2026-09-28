/**
 * Consulta de CNPJ nos dados públicos da Receita Federal.
 *
 * Fontes (gratuitas, sem chave e liberadas para chamadas do navegador):
 *  1. BrasilAPI  - https://brasilapi.com.br/docs#tag/CNPJ  (dados cadastrais)
 *  2. CNPJ.ws    - https://docs.cnpj.ws/referencia-de-api/api-publica (dados cadastrais +
 *                  inscrições estaduais; limite de 3 consultas por minuto)
 *
 * As duas espelham a base pública de CNPJ da Receita, que é atualizada
 * periodicamente (não é em tempo real). A inscrição municipal não consta
 * nessa base e continua sendo preenchida manualmente.
 */

export interface DadosCnpjReceita {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  /** Inscrição estadual ativa no mesmo estado da sede, quando encontrada. */
  inscricaoEstadual: string;
  fonte: string;
}

/** Valida os dígitos verificadores do CNPJ. */
export function cnpjValido(valor: string): boolean {
  const cnpj = (valor || '').replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function formatarCep(cep: string): string {
  const d = (cep || '').replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function formatarTelefone(bruto: string): string {
  const d = (bruto || '').replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return bruto || '';
}

const texto = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

async function buscarJson(url: string, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (res.status === 404) throw new Error('CNPJ não encontrado na base da Receita Federal.');
    if (res.status === 429) throw new Error('Muitas consultas seguidas. Aguarde um minuto e tente de novo.');
    if (!res.ok) throw new Error(`Serviço de consulta indisponível (${res.status}).`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function consultarBrasilApi(cnpj: string): Promise<DadosCnpjReceita> {
  const d = await buscarJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  const tipo = texto(d.descricao_tipo_de_logradouro);
  const logr = texto(d.logradouro);
  return {
    cnpj,
    razaoSocial: texto(d.razao_social),
    nomeFantasia: texto(d.nome_fantasia),
    situacaoCadastral: texto(d.descricao_situacao_cadastral),
    cep: formatarCep(texto(d.cep)),
    logradouro: tipo && !logr.toUpperCase().startsWith(tipo.toUpperCase()) ? `${tipo} ${logr}` : logr,
    numero: texto(d.numero),
    complemento: texto(d.complemento),
    bairro: texto(d.bairro),
    cidade: texto(d.municipio),
    estado: texto(d.uf),
    telefone: formatarTelefone(texto(d.ddd_telefone_1)),
    email: texto(d.email).toLowerCase(),
    inscricaoEstadual: '',
    fonte: 'BrasilAPI',
  };
}

async function consultarCnpjWs(cnpj: string): Promise<DadosCnpjReceita> {
  const d = await buscarJson(`https://publica.cnpj.ws/cnpj/${cnpj}`);
  const e = d.estabelecimento || {};
  const uf = texto(e.estado?.sigla);
  const ies: any[] = Array.isArray(e.inscricoes_estaduais) ? e.inscricoes_estaduais : [];
  const ie =
    ies.find(i => i.ativo && texto(i.estado?.sigla) === uf) ||
    ies.find(i => i.ativo) ||
    null;
  const tipo = texto(e.tipo_logradouro);
  const logr = texto(e.logradouro);
  return {
    cnpj,
    razaoSocial: texto(d.razao_social),
    nomeFantasia: texto(e.nome_fantasia),
    situacaoCadastral: texto(e.situacao_cadastral),
    cep: formatarCep(texto(e.cep)),
    logradouro: tipo ? `${tipo} ${logr}` : logr,
    numero: texto(e.numero),
    complemento: texto(e.complemento),
    bairro: texto(e.bairro),
    cidade: texto(e.cidade?.nome),
    estado: uf,
    telefone: formatarTelefone(`${texto(e.ddd1)}${texto(e.telefone1)}`),
    email: texto(e.email).toLowerCase(),
    inscricaoEstadual: ie ? texto(ie.inscricao_estadual) : '',
    fonte: 'CNPJ.ws',
  };
}

/**
 * Consulta o CNPJ e devolve os dados cadastrais.
 * Usa a BrasilAPI para os dados principais e completa com a inscrição estadual
 * do CNPJ.ws. Se uma das fontes falhar, usa a outra.
 */
export async function consultarCnpjReceita(valor: string): Promise<DadosCnpjReceita> {
  const cnpj = (valor || '').replace(/\D/g, '');
  if (!cnpjValido(cnpj)) {
    throw new Error('CNPJ inválido. Confira os números digitados.');
  }

  const [principal, complementar] = await Promise.allSettled([
    consultarBrasilApi(cnpj),
    consultarCnpjWs(cnpj),
  ]);

  if (principal.status === 'fulfilled') {
    const dados = principal.value;
    if (complementar.status === 'fulfilled') {
      dados.inscricaoEstadual = complementar.value.inscricaoEstadual;
      if (!dados.email) dados.email = complementar.value.email;
      if (!dados.telefone) dados.telefone = complementar.value.telefone;
      dados.fonte = 'BrasilAPI + CNPJ.ws';
    }
    return dados;
  }

  if (complementar.status === 'fulfilled') return complementar.value;

  const erro = principal.reason instanceof Error ? principal.reason.message : '';
  throw new Error(erro || 'Não foi possível consultar o CNPJ agora. Tente novamente em instantes.');
}
