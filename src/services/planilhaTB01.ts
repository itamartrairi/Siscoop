/**
 * Layout "TB-01 - Cadastro do sócio": a planilha oficial de cadastro de
 * sócios da cooperativa (75 colunas). Esta lista é a única fonte da verdade
 * para:
 *   - ler a planilha na importação (cabeçalho -> campo do cadastro);
 *   - gerar o modelo de importação e a exportação do cadastro atual;
 *   - mostrar no formulário do cooperado os campos que só existem na TB-01.
 *
 * Os cabeçalhos são comparados sem acento, maiúsculas, espaços ou pontuação,
 * por isso pequenas variações ("Número" x "Nímero", "RG-Ide ntidade") também
 * são reconhecidas.
 */
import * as XLSX from '@e965/xlsx';
import type { Cooperado } from '../types';

export type TipoCampoTB01 = 'texto' | 'data' | 'sn' | 'bool' | 'numero';
export type AbaCadastro = 'geral' | 'endereco' | 'contatos' | 'documentos' | 'banco';

export interface ColunaTB01 {
  /** Cabeçalho exatamente como na planilha TB-01. */
  cabecalho: string;
  /** Campo do cadastro do cooperado. */
  campo: keyof Cooperado;
  tipo: TipoCampoTB01;
  /** Rótulo para o formulário. */
  rotulo: string;
  aba: AbaCadastro;
  /** Grafias alternativas aceitas na importação. */
  apelidos?: string[];
  /** true quando o formulário já tem um campo próprio para este dado. */
  noFormulario?: boolean;
}

export const COLUNAS_TB01: ColunaTB01[] = [
  { cabecalho: 'CPF', campo: 'cpf', tipo: 'texto', rotulo: 'CPF', aba: 'geral', noFormulario: true },
  { cabecalho: 'MATRICULA', campo: 'matricula', tipo: 'texto', rotulo: 'Matrícula', aba: 'geral', noFormulario: true },
  { cabecalho: 'RG-Ide ntidade', campo: 'rg', tipo: 'texto', rotulo: 'RG', aba: 'geral', apelidos: ['RG', 'RG-Identidade', 'Identidade RG'], noFormulario: true },
  { cabecalho: 'Orgão-Emissor', campo: 'orgaoEmissor', tipo: 'texto', rotulo: 'Órgão Emissor', aba: 'geral', noFormulario: true },
  { cabecalho: 'NOME DO(A) SOCIO(A)', campo: 'nome', tipo: 'texto', rotulo: 'Nome', aba: 'geral', apelidos: ['Nome', 'Nome Completo', 'Nome do Socio'], noFormulario: true },
  { cabecalho: 'NOME USUAL / APELIDO', campo: 'nomeUsual', tipo: 'texto', rotulo: 'Nome usual / apelido', aba: 'geral', apelidos: ['Nome Usual', 'Apelido'] },
  { cabecalho: 'DT. NASCIM.', campo: 'dataNascimento', tipo: 'data', rotulo: 'Data de nascimento', aba: 'geral', apelidos: ['Data Nascimento', 'Data de Nascimento'], noFormulario: true },
  { cabecalho: 'Natural/Municipio-onde-nasceu', campo: 'naturalidade', tipo: 'texto', rotulo: 'Naturalidade', aba: 'geral', apelidos: ['Naturalidade'], noFormulario: true },
  { cabecalho: 'DAP', campo: 'dapCaf', tipo: 'texto', rotulo: 'DAP/CAF', aba: 'geral', apelidos: ['DAP/CAF', 'CAF'], noFormulario: true },
  { cabecalho: 'PAI', campo: 'nomePai', tipo: 'texto', rotulo: 'Nome do pai', aba: 'geral', noFormulario: true },
  { cabecalho: 'MAE', campo: 'nomeMae', tipo: 'texto', rotulo: 'Nome da mãe', aba: 'geral', noFormulario: true },
  { cabecalho: 'NACIONALIDADE', campo: 'nacionalidade', tipo: 'texto', rotulo: 'Nacionalidade', aba: 'geral', noFormulario: true },
  { cabecalho: 'Estado-civil', campo: 'estadoCivil', tipo: 'texto', rotulo: 'Estado civil', aba: 'geral', noFormulario: true },
  { cabecalho: 'Situação-conjugal', campo: 'situacaoConjugal', tipo: 'texto', rotulo: 'Situação conjugal', aba: 'geral' },
  { cabecalho: 'Profissão', campo: 'profissao', tipo: 'texto', rotulo: 'Profissão', aba: 'geral', noFormulario: true },
  { cabecalho: 'Loclidade/Comunidade-onde-mora', campo: 'localidadeComunidade', tipo: 'texto', rotulo: 'Localidade / comunidade onde mora', aba: 'endereco', apelidos: ['Localidade/Comunidade-onde-mora', 'Comunidade', 'Localidade'] },
  { cabecalho: 'Tipo-de-logradouro-do-socio', campo: 'tipoLogradouro', tipo: 'texto', rotulo: 'Tipo de logradouro', aba: 'endereco', noFormulario: true },
  { cabecalho: 'Nome-do-logradouro-do-socio', campo: 'logradouro', tipo: 'texto', rotulo: 'Logradouro', aba: 'endereco', apelidos: ['Logradouro', 'Endereco'], noFormulario: true },
  { cabecalho: 'Nímero-do-logradouro-do-socio', campo: 'numero', tipo: 'texto', rotulo: 'Número', aba: 'endereco', apelidos: ['Numero-do-logradouro-do-socio', 'Numero'], noFormulario: true },
  { cabecalho: 'Complemento-do-logradouro-do-socio', campo: 'complemento', tipo: 'texto', rotulo: 'Complemento', aba: 'endereco', apelidos: ['Complemento'], noFormulario: true },
  { cabecalho: 'Bairro', campo: 'bairro', tipo: 'texto', rotulo: 'Bairro', aba: 'endereco', noFormulario: true },
  { cabecalho: 'CEP-do-socio', campo: 'cep', tipo: 'texto', rotulo: 'CEP', aba: 'endereco', apelidos: ['CEP'], noFormulario: true },
  // Cidade/UF é desmembrada em cidade e estado na leitura (ver lerLinha).
  { cabecalho: 'Cidade/UF', campo: 'cidade', tipo: 'texto', rotulo: 'Cidade', aba: 'endereco', noFormulario: true },
  { cabecalho: 'Tipo-de-logradouro-do-local-entrega-correspon', campo: 'correspTipoLogradouro', tipo: 'texto', rotulo: 'Correspondência: tipo de logradouro', aba: 'endereco' },
  { cabecalho: 'Nome-do-logradouro-para-entrega-correspond', campo: 'correspLogradouro', tipo: 'texto', rotulo: 'Correspondência: logradouro', aba: 'endereco' },
  { cabecalho: 'Nímero-do-logradouro-para-entrega-correspond', campo: 'correspNumero', tipo: 'texto', rotulo: 'Correspondência: número', aba: 'endereco', apelidos: ['Numero-do-logradouro-para-entrega-correspond'] },
  { cabecalho: 'Complemento-do-logradouro-para-entrega-corresp', campo: 'correspComplemento', tipo: 'texto', rotulo: 'Correspondência: complemento', aba: 'endereco' },
  { cabecalho: 'CEP-para-entregs-da-correspondencia', campo: 'correspCep', tipo: 'texto', rotulo: 'Correspondência: CEP', aba: 'endereco', apelidos: ['CEP-para-entrega-da-correspondencia'] },
  { cabecalho: 'Fone-residencial', campo: 'telefone', tipo: 'texto', rotulo: 'Telefone residencial', aba: 'contatos', apelidos: ['Telefone'], noFormulario: true },
  { cabecalho: 'Fone-celular-1', campo: 'celular', tipo: 'texto', rotulo: 'Celular 1', aba: 'contatos', apelidos: ['Celular'], noFormulario: true },
  { cabecalho: 'Fone-do-trabalho', campo: 'foneTrabalho', tipo: 'texto', rotulo: 'Telefone do trabalho', aba: 'contatos' },
  { cabecalho: 'Tem-WhatsApp-1', campo: 'temWhatsapp1', tipo: 'bool', rotulo: 'Celular 1 tem WhatsApp', aba: 'contatos' },
  { cabecalho: 'Fone-celular-2', campo: 'celular2', tipo: 'texto', rotulo: 'Celular 2', aba: 'contatos' },
  { cabecalho: 'Tem-WhatsApp-2', campo: 'temWhatsapp2', tipo: 'bool', rotulo: 'Celular 2 tem WhatsApp', aba: 'contatos' },
  { cabecalho: 'Fone-de-Terceiros-para-contato', campo: 'foneTerceiros', tipo: 'texto', rotulo: 'Telefone de terceiros para contato', aba: 'contatos' },
  { cabecalho: 'Fone-do-filho', campo: 'foneFilho', tipo: 'texto', rotulo: 'Telefone do filho', aba: 'contatos' },
  { cabecalho: 'Whatzap-filho', campo: 'temWhatsappFilho', tipo: 'bool', rotulo: 'Telefone do filho tem WhatsApp', aba: 'contatos', apelidos: ['WhatsApp-filho'] },
  { cabecalho: 'Grau-de-relacionamento', campo: 'grauRelacionamentoContato', tipo: 'texto', rotulo: 'Grau de relacionamento do contato', aba: 'contatos' },
  { cabecalho: 'Tem-WhatsApp-3', campo: 'temWhatsapp3', tipo: 'bool', rotulo: 'Contato de terceiros tem WhatsApp', aba: 'contatos' },
  { cabecalho: 'Tem fone contato?', campo: 'temFoneContato', tipo: 'sn', rotulo: 'Tem telefone de contato?', aba: 'contatos' },
  { cabecalho: 'Tem WA?', campo: 'temWa', tipo: 'sn', rotulo: 'Tem WhatsApp?', aba: 'contatos' },
  { cabecalho: 'E-mail-1', campo: 'email', tipo: 'texto', rotulo: 'E-mail', aba: 'contatos', apelidos: ['E-mail', 'Email'], noFormulario: true },
  { cabecalho: 'E-mail-2', campo: 'email2', tipo: 'texto', rotulo: 'E-mail 2', aba: 'contatos' },
  { cabecalho: 'Nome-da-esposa', campo: 'nomeConjuge', tipo: 'texto', rotulo: 'Nome do cônjuge', aba: 'geral', apelidos: ['Nome do Conjuge'], noFormulario: true },
  { cabecalho: 'CPF-da-esposa', campo: 'cpfConjuge', tipo: 'texto', rotulo: 'CPF do cônjuge', aba: 'geral', apelidos: ['CPF do Conjuge'], noFormulario: true },
  { cabecalho: 'Celular-da-esposa', campo: 'celularConjuge', tipo: 'texto', rotulo: 'Celular do cônjuge', aba: 'contatos' },
  { cabecalho: 'Tem-WhatsApp-4', campo: 'temWhatsappConjuge', tipo: 'bool', rotulo: 'Celular do cônjuge tem WhatsApp', aba: 'contatos' },
  { cabecalho: 'Regime-de-bens', campo: 'regimeBens', tipo: 'texto', rotulo: 'Regime de bens', aba: 'geral', noFormulario: true },
  { cabecalho: 'DT. ADMIS.', campo: 'dataFiliacao', tipo: 'data', rotulo: 'Data de admissão', aba: 'geral', apelidos: ['Data Admissao', 'Data de Admissao'], noFormulario: true },
  { cabecalho: 'Data-da-admissão-como-socio-2', campo: 'dataAdmissao2', tipo: 'data', rotulo: 'Data da admissão como sócio (2)', aba: 'geral' },
  { cabecalho: 'Data-da-demissão-ou-exclusão', campo: 'dataDemissao', tipo: 'data', rotulo: 'Data da demissão ou exclusão', aba: 'geral' },
  { cabecalho: 'Motivo-da-demissão-ou-exclusão', campo: 'motivoDemissao', tipo: 'texto', rotulo: 'Motivo da demissão ou exclusão', aba: 'geral' },
  { cabecalho: 'S.E.A.', campo: 'sea', tipo: 'sn', rotulo: 'S.E.A.', aba: 'geral' },
  { cabecalho: 'DT. ATU. CAD.', campo: 'dataAtualizacaoCadastro', tipo: 'data', rotulo: 'Data da atualização cadastral', aba: 'geral' },
  { cabecalho: 'FALECIDO', campo: 'falecido', tipo: 'sn', rotulo: 'Falecido', aba: 'geral' },
  { cabecalho: 'T.F.', campo: 'tf', tipo: 'sn', rotulo: 'T.F.', aba: 'geral' },
  { cabecalho: 'Presidente', campo: 'presidenteAdmissao', tipo: 'texto', rotulo: 'Presidente na admissão', aba: 'geral' },
  { cabecalho: 'BANCO1', campo: 'banco', tipo: 'texto', rotulo: 'Banco', aba: 'banco', apelidos: ['Banco'], noFormulario: true },
  { cabecalho: 'AGENCIA1', campo: 'agencia', tipo: 'texto', rotulo: 'Agência', aba: 'banco', apelidos: ['Agencia'], noFormulario: true },
  { cabecalho: 'CONTA1', campo: 'conta', tipo: 'texto', rotulo: 'Conta', aba: 'banco', apelidos: ['Conta'], noFormulario: true },
  { cabecalho: 'TIPO', campo: 'tipoConta', tipo: 'texto', rotulo: 'Tipo de conta', aba: 'banco', apelidos: ['TIPO1'], noFormulario: true },
  { cabecalho: 'BANCO2', campo: 'banco2', tipo: 'texto', rotulo: 'Banco (2ª conta)', aba: 'banco' },
  { cabecalho: 'AGENCIA2', campo: 'agencia2', tipo: 'texto', rotulo: 'Agência (2ª conta)', aba: 'banco' },
  { cabecalho: 'CONTA2', campo: 'conta2', tipo: 'texto', rotulo: 'Conta (2ª conta)', aba: 'banco' },
  { cabecalho: 'TIPO2', campo: 'tipoConta2', tipo: 'texto', rotulo: 'Tipo (2ª conta)', aba: 'banco' },
  { cabecalho: 'Identidade', campo: 'docIdentidadeDig', tipo: 'bool', rotulo: 'Identidade digitalizada', aba: 'documentos' },
  { cabecalho: 'CPF-dig', campo: 'docCpfDig', tipo: 'bool', rotulo: 'CPF digitalizado', aba: 'documentos' },
  { cabecalho: 'DAP-dig', campo: 'docDapDig', tipo: 'bool', rotulo: 'DAP digitalizada', aba: 'documentos' },
  { cabecalho: 'CNH-dig', campo: 'docCnhDig', tipo: 'bool', rotulo: 'CNH digitalizada', aba: 'documentos' },
  { cabecalho: 'CERTIDAO DE CASAMENTO-dig', campo: 'docCertidaoCasamentoDig', tipo: 'bool', rotulo: 'Certidão de casamento digitalizada', aba: 'documentos' },
  { cabecalho: 'COMP DE RESIDENCIA-dig', campo: 'docComprovanteResidenciaDig', tipo: 'bool', rotulo: 'Comprovante de residência digitalizado', aba: 'documentos' },
  { cabecalho: 'Valor em Cota Parte', campo: 'capitalIntegralizado', tipo: 'numero', rotulo: 'Valor em cota-parte', aba: 'geral', apelidos: ['Capital Integralizado'], noFormulario: true },
  { cabecalho: 'AptoAVotar', campo: 'aptoAVotar', tipo: 'bool', rotulo: 'Apto a votar', aba: 'geral', apelidos: ['Apto a Votar'] },
  { cabecalho: 'CNIS', campo: 'cnis', tipo: 'texto', rotulo: 'CNIS', aba: 'documentos' },
  { cabecalho: 'NumPessoasNaCasa', campo: 'numPessoasCasa', tipo: 'numero', rotulo: 'Número de pessoas na casa', aba: 'geral' },
];

/** Normaliza um cabeçalho para comparação: sem acento, minúsculo, só letras e números. */
export function chaveCabecalho(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const COLUNA_POR_CHAVE = new Map<string, ColunaTB01>();
for (const col of COLUNAS_TB01) {
  for (const nome of [col.cabecalho, ...(col.apelidos || [])]) {
    const chave = chaveCabecalho(nome);
    if (!COLUNA_POR_CHAVE.has(chave)) COLUNA_POR_CHAVE.set(chave, col);
  }
}

export function colunaDoCabecalho(cabecalho: unknown): ColunaTB01 | undefined {
  return COLUNA_POR_CHAVE.get(chaveCabecalho(cabecalho));
}

// ---------------------------------------------------------------------------
// Conversões
// ---------------------------------------------------------------------------

const texto = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

/** Datas em dd/mm/aaaa, aaaa/mm/dd, aaaa-mm-dd, Date ou número serial do Excel -> aaaa-mm-dd. */
export function paraDataIso(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  if (typeof v === 'number' && v > 1000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = texto(v);
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return '';
}

/** aaaa-mm-dd -> dd/mm/aaaa (para exportar no mesmo formato da TB-01). */
function paraDataBr(v: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto(v));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : texto(v);
}

function paraBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  const s = chaveCabecalho(v);
  if (!s) return undefined;
  if (['s', 'sim', 'true', 'verdadeiro', '1', 'x'].includes(s)) return true;
  if (['n', 'nao', 'false', 'falso', '0'].includes(s)) return false;
  return undefined;
}

function paraNumero(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const s = texto(v).replace(/[R$\s]/g, '');
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? n : undefined;
}

/** Texto livre da planilha -> valor do campo estadoCivil do sistema. */
export function paraEstadoCivil(v: unknown): Cooperado['estadoCivil'] | '' {
  const s = chaveCabecalho(v);
  if (!s) return '';
  if (s.startsWith('casad')) return 'CASADO';
  if (s.startsWith('solteir')) return 'SOLTEIRO';
  if (s.startsWith('viuv')) return 'VIUVO';
  if (s.startsWith('divorc') || s.startsWith('separad') || s.startsWith('desquit')) return 'DIVORCIADO';
  if (s.includes('uniao') || s.startsWith('junt') || s.startsWith('amasiad') || s.startsWith('companheir')) return 'UNIAO_ESTAVEL';
  return '';
}

function paraTipoConta(v: unknown): Cooperado['tipoConta'] | '' {
  const s = chaveCabecalho(v);
  if (!s) return '';
  return s.includes('poup') ? 'POUPANCA' : 'CORRENTE';
}

/** "TRAIRI-CE", "TRAIRI/CE", "TRAIRI" -> { cidade, estado }. */
function separarCidadeUf(v: unknown): { cidade: string; estado: string } {
  const s = texto(v);
  const m = /^(.*?)[\s]*[-/][\s]*([A-Za-z]{2})$/.exec(s);
  if (m && m[1]) return { cidade: m[1].trim(), estado: m[2].toUpperCase() };
  if (/^[A-Za-z]{2}$/.test(s)) return { cidade: '', estado: s.toUpperCase() };
  return { cidade: s, estado: '' };
}

export type LinhaImportada = Partial<Cooperado> & { _linha: number };

/** Converte uma linha da planilha (objeto cabeçalho -> valor) para os campos do cadastro. */
export function lerLinha(bruta: Record<string, unknown>, numeroLinha: number): LinhaImportada {
  const out: Record<string, unknown> = { _linha: numeroLinha };
  for (const [cab, valor] of Object.entries(bruta)) {
    const col = colunaDoCabecalho(cab);
    if (!col) continue;
    switch (col.tipo) {
      case 'data': out[col.campo] = paraDataIso(valor); break;
      case 'bool':
      case 'sn': { const b = paraBool(valor); if (b !== undefined) out[col.campo] = b; break; }
      case 'numero': { const n = paraNumero(valor); if (n !== undefined) out[col.campo] = n; break; }
      default: out[col.campo] = texto(valor);
    }
  }

  // Campos que precisam de tradução para os valores do sistema.
  if ('estadoCivil' in out) out.estadoCivil = paraEstadoCivil(out.estadoCivil);
  if ('tipoConta' in out) out.tipoConta = paraTipoConta(out.tipoConta);
  if ('cidade' in out) Object.assign(out, separarCidadeUf(out.cidade));
  if (typeof out.matricula === 'string') out.matricula = out.matricula.replace(/\.0+$/, '');

  // WhatsApp principal: o celular 1 quando a planilha marca que ele tem WhatsApp.
  if (out.temWhatsapp1 === true && out.celular) out.whatsapp = out.celular;
  // Contato de emergência: telefone de terceiros, com o grau de relacionamento.
  if (out.foneTerceiros) {
    out.contatoEmergencia = [out.foneTerceiros, out.grauRelacionamentoContato].filter(Boolean).join(' - ');
  }

  // Situação no quadro social.
  if (out.falecido === true) out.situacao = 'FALECIDO';
  else if (out.dataDemissao) out.situacao = /exclu|elimin/i.test(String(out.motivoDemissao || '')) ? 'EXCLUIDO' : 'DEMITIDO';
  else if ('falecido' in out || 'dataDemissao' in out) out.situacao = 'ATIVO';

  return out as LinhaImportada;
}

/** true se a primeira linha tiver cabeçalhos suficientes da TB-01. */
export function pareceTB01(cabecalhos: unknown[]): boolean {
  const reconhecidos = cabecalhos.filter(c => colunaDoCabecalho(c)).length;
  return reconhecidos >= 3 && cabecalhos.some(c => colunaDoCabecalho(c)?.campo === 'nome');
}

/**
 * Lê a primeira aba de uma planilha (.xlsx, .xls, .csv, .ods) ou um texto
 * colado (CSV/TSV) e devolve as linhas já convertidas para o cadastro.
 */
export function lerPlanilhaCooperados(dados: ArrayBuffer | string): {
  linhas: LinhaImportada[];
  colunasReconhecidas: string[];
  colunasIgnoradas: string[];
} {
  const wb = typeof dados === 'string'
    ? XLSX.read(dados, { type: 'string', raw: false })
    : XLSX.read(dados, { type: 'array', cellDates: true });
  const aba = wb.Sheets[wb.SheetNames[0]];
  if (!aba) return { linhas: [], colunasReconhecidas: [], colunasIgnoradas: [] };

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, defval: '', raw: true, blankrows: false });
  if (matriz.length < 2) return { linhas: [], colunasReconhecidas: [], colunasIgnoradas: [] };

  const cabecalhos = (matriz[0] || []).map(c => texto(c));
  const colunasReconhecidas = cabecalhos.filter(c => c && colunaDoCabecalho(c));
  const colunasIgnoradas = cabecalhos.filter(c => c && !colunaDoCabecalho(c));

  const linhas: LinhaImportada[] = [];
  matriz.slice(1).forEach((valores, i) => {
    if (!Array.isArray(valores) || valores.every(v => v === '' || v === null || v === false)) return;
    const bruta: Record<string, unknown> = {};
    cabecalhos.forEach((cab, idx) => { if (cab) bruta[cab] = valores[idx]; });
    const linha = lerLinha(bruta, i + 2);
    if (texto(linha.nome) || texto(linha.matricula) || texto(linha.cpf)) linhas.push(linha);
  });

  return { linhas, colunasReconhecidas, colunasIgnoradas };
}

// ---------------------------------------------------------------------------
// Modelo e exportação
// ---------------------------------------------------------------------------

function valorParaPlanilha(c: Partial<Cooperado>, col: ColunaTB01): unknown {
  const v = c[col.campo] as unknown;
  if (col.campo === 'cidade') return [c.cidade, c.estado].filter(Boolean).join('-');
  if (col.campo === 'tipoConta') return c.conta ? (v === 'POUPANCA' ? 'Poupança' : 'C Corrente') : '';
  if (col.campo === 'estadoCivil') {
    const mapa: Record<string, string> = { CASADO: 'CASADO', SOLTEIRO: 'SOLTEIRO', VIUVO: 'VIÚVO', DIVORCIADO: 'SEPARADO', UNIAO_ESTAVEL: 'UNIÃO ESTÁVEL' };
    return mapa[String(v)] || '';
  }
  switch (col.tipo) {
    case 'data': return paraDataBr(v);
    case 'sn': return v === true ? 'S' : v === false ? 'N' : '';
    case 'bool': return v === true;
    case 'numero': return typeof v === 'number' ? v : '';
    default: return v ?? '';
  }
}

/**
 * Gera a planilha no layout TB-01. Sem cooperados, é o modelo em branco;
 * com cooperados, é a exportação do cadastro atual (que pode ser editada e
 * importada de volta).
 */
export function baixarPlanilhaTB01(cooperados: Partial<Cooperado>[] = [], nomeArquivo = 'TB-01-Cadastro-do-socio.xlsx') {
  const cab = COLUNAS_TB01.map(c => c.cabecalho);
  const linhas = cooperados.map(c => COLUNAS_TB01.map(col => valorParaPlanilha(c, col)));
  const ws = XLSX.utils.aoa_to_sheet([cab, ...linhas]);
  ws['!cols'] = COLUNAS_TB01.map(c => ({ wch: Math.min(Math.max(c.cabecalho.length + 2, 12), 34) }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TB-01-Cadastro-do-socio');
  XLSX.writeFile(wb, nomeArquivo);
}
