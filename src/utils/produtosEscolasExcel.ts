import * as XLSX from '@e965/xlsx';
import { ProdutoAgro, EscolaPnae } from '../types';
import { buscarCodigosFiscais } from './produtoCodigosFiscais';
import { normalizarPolo } from './poloHelpers';

function normalizeKey(key: string): string {
  return (key || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function toNumber(val: any, fallback = 0): number {
  if (val === '' || val === null || val === undefined) return fallback;
  const n = Number(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? fallback : n;
}

/* ============================= PRODUTOS ============================= */

/**
 * Gera e baixa a planilha-modelo (.xlsx) para importação em massa de
 * Produtos Agropecuários (aba "Produtos" do Cadastros).
 */
export function baixarModeloPlanilhaProdutos() {
  const wb = XLSX.utils.book_new();
  const dados = [
    {
      'Nome_Produto': 'Mandioca In Natura Organica',
      'Categoria': 'HORTIFRUTI',
      'Unidade': 'KG',
      'Preco_Referencia_PAA_R$': 4.80,
      'Peso_Unitario_KG': '',
      'Tipo_InNatura_ou_Beneficiado': 'IN_NATURA',
      'Codigo_NCM_SEFAZ': '',
      'Codigo_CONAB': '',
      'Sazonalidade_Observacao': 'Ano todo'
    },
    {
      'Nome_Produto': 'Polpa de Fruta Congelada (Manga)',
      'Categoria': 'PROCESSADOS',
      'Unidade': 'UN',
      'Preco_Referencia_PAA_R$': 6.50,
      'Peso_Unitario_KG': 0.5,
      'Tipo_InNatura_ou_Beneficiado': 'BENEFICIADO',
      'Codigo_NCM_SEFAZ': '',
      'Codigo_CONAB': '',
      'Sazonalidade_Observacao': 'Ano todo'
    }
  ];
  const ws = XLSX.utils.json_to_sheet(dados);
  ws['!cols'] = [
    { wch: 34 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 26 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  XLSX.writeFile(wb, 'Modelo_Importacao_Produtos_SisCoope.xlsx');
}

export interface LinhaProdutoImportado {
  nome: string;
  categoria: ProdutoAgro['categoria'];
  unidadeMedida: ProdutoAgro['unidadeMedida'];
  precoReferencia: number;
  codigoNcm: string;
  codigoConab: string;
  pesoUnitario: number;
  tipoProcessamento: 'IN_NATURA' | 'BENEFICIADO';
  descricao?: string;
  codigoAutoPreenchido: boolean;
}

export interface ParsePlanilhaProdutosResult {
  success: boolean;
  itens: LinhaProdutoImportado[];
  message: string;
}

const CATEGORIAS_VALIDAS: ProdutoAgro['categoria'][] = ['HORTIFRUTI', 'GRAOS', 'LATICINIOS', 'PROCESSADOS', 'CARNES', 'OUTROS'];
const UNIDADES_VALIDAS: ProdutoAgro['unidadeMedida'][] = ['KG', 'UN', 'MACO', 'LITRO', 'CAIXA', 'SACAS'];

/**
 * Lê um arquivo .xlsx/.xls/.csv com a lista de produtos e retorna os itens
 * já normalizados, com os códigos NCM (SEFAZ) e CONAB preenchidos
 * automaticamente para as linhas em que a planilha não os informou.
 */
export async function parsePlanilhaProdutos(file: File): Promise<ParsePlanilhaProdutosResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, itens: [], message: 'A planilha fornecida está vazia ou ilegível.' };
    }
    const sheetName = workbook.SheetNames.find(n => /produto/i.test(n)) || workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (rows.length === 0) {
      return { success: false, itens: [], message: 'Nenhuma linha de produto encontrada na planilha.' };
    }

    const itens: LinhaProdutoImportado[] = [];

    rows.forEach(row => {
      let nome = '';
      let categoria: ProdutoAgro['categoria'] = 'HORTIFRUTI';
      let unidadeMedida: ProdutoAgro['unidadeMedida'] = 'KG';
      let precoReferencia = 0;
      let codigoNcm = '';
      let codigoConab = '';
      let pesoUnitario = 0;
      let tipoProcessamento: 'IN_NATURA' | 'BENEFICIADO' = 'IN_NATURA';
      let descricao = '';

      for (const [rawKey, val] of Object.entries(row)) {
        const k = normalizeKey(rawKey);
        const v = String(val ?? '').trim();
        if (/nome|produto|descricaoproduto/i.test(k) && v) nome = v;
        else if (/categoria/i.test(k) && v) {
          const up = v.toUpperCase();
          if ((CATEGORIAS_VALIDAS as string[]).includes(up)) categoria = up as ProdutoAgro['categoria'];
        }
        else if (/unidade|un\b|medida/i.test(k) && v) {
          const up = v.toUpperCase();
          if ((UNIDADES_VALIDAS as string[]).includes(up)) unidadeMedida = up as ProdutoAgro['unidadeMedida'];
        }
        else if (/preco|valor|referencia/i.test(k) && v) precoReferencia = toNumber(val, 0);
        else if (/pesounit|peso/i.test(k) && v) pesoUnitario = toNumber(val, 0);
        else if (/tipo/i.test(k) && v) {
          const up = v.toUpperCase().replace(/\s|-/g, '_');
          if (up.includes('BENEFIC')) tipoProcessamento = 'BENEFICIADO';
          else if (up.includes('NATURA') || up.includes('NATURAL') || up.includes('FRESC')) tipoProcessamento = 'IN_NATURA';
        }
        else if (/ncm|sefaz|fiscal/i.test(k) && v) codigoNcm = v;
        else if (/conab/i.test(k) && v) codigoConab = v;
        else if (/sazonal|obs|descricao/i.test(k) && v && !/produto/i.test(k)) descricao = v;
      }

      if (!nome) return; // ignora linhas vazias

      let codigoAutoPreenchido = false;
      if (!codigoNcm || !codigoConab) {
        const match = buscarCodigosFiscais(nome, categoria);
        if (match) {
          if (!codigoNcm) { codigoNcm = match.codigoNcm; codigoAutoPreenchido = true; }
          if (!codigoConab) { codigoConab = match.codigoConab; codigoAutoPreenchido = true; }
        }
      }

      itens.push({ nome, categoria, unidadeMedida, precoReferencia, codigoNcm, codigoConab, pesoUnitario, tipoProcessamento, descricao, codigoAutoPreenchido });
    });

    if (itens.length === 0) {
      return { success: false, itens: [], message: 'Não foi possível identificar produtos válidos (com nome preenchido) na planilha.' };
    }

    return {
      success: true,
      itens,
      message: `${itens.length} produto(s) identificado(s) na planilha, pronto(s) para importação.`
    };
  } catch (err: any) {
    return { success: false, itens: [], message: `Erro ao ler a planilha: ${err?.message || 'formato inválido.'}` };
  }
}

/* ============================= ESCOLAS ============================= */

/**
 * Gera e baixa a planilha-modelo (.xlsx) para importação em massa de
 * Escolas PNAE (aba "Escolas" do Cadastros).
 */
export function baixarModeloPlanilhaEscolas() {
  const wb = XLSX.utils.book_new();
  const dados = [
    {
      'Nome_Escola': 'EMEIF Francisca das Chagas - Sede',
      'Codigo_INEP': '23091022',
      'Razao_Social': 'Prefeitura Municipal de Trairi',
      'CNPJ': '07.598.145/0001-00',
      'CNAE': '8512-1/00',
      'Endereco_Logradouro_Num': 'Rua Coronel José de Castro, 120',
      'Localidade_Municipio_UF': 'Trairi/CE',
      'Alunos_Atendidos': 650,
      'Polo': 'Sede',
      'Representante_Diretor': 'Maria das Graças Alencar',
      'Tipo': 'Municipal',
      'Telefone': '',
      'Email': ''
    }
  ];
  const ws = XLSX.utils.json_to_sheet(dados);
  ws['!cols'] = [
    { wch: 34 }, { wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 14 },
    { wch: 32 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 26 },
    { wch: 14 }, { wch: 16 }, { wch: 26 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Escolas');
  XLSX.writeFile(wb, 'Modelo_Importacao_Escolas_SisCoope.xlsx');
}

export type LinhaEscolaImportada = Omit<EscolaPnae, 'id' | 'tenantId'>;

export interface ParsePlanilhaEscolasResult {
  success: boolean;
  itens: LinhaEscolaImportada[];
  message: string;
}

/**
 * Lê um arquivo .xlsx/.xls/.csv com a lista de escolas PNAE e retorna os
 * itens já normalizados para importação.
 */
export async function parsePlanilhaEscolas(file: File): Promise<ParsePlanilhaEscolasResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, itens: [], message: 'A planilha fornecida está vazia ou ilegível.' };
    }
    const sheetName = workbook.SheetNames.find(n => /escola/i.test(n)) || workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (rows.length === 0) {
      return { success: false, itens: [], message: 'Nenhuma linha de escola encontrada na planilha.' };
    }

    const itens: LinhaEscolaImportada[] = [];

    rows.forEach(row => {
      let nomeEscola = '';
      let inepCodigo = '';
      let razaoSocial = '';
      let cnpj = '';
      let cnae = '8512-1/00';
      let logradouroNum = '';
      let localidade = '';
      let alunosAtendidos = 0;
      let polo = 'Sede';
      let representante = '';
      let tipo = 'Municipal';
      let telefone = '';
      let email = '';

      for (const [rawKey, val] of Object.entries(row)) {
        const k = normalizeKey(rawKey);
        const v = String(val ?? '').trim();
        if (/nome.*escola|escola.*nome|localdeentrega/i.test(k) && v) nomeEscola = v;
        else if (/inep/i.test(k) && v) inepCodigo = v;
        else if (/razaosocial/i.test(k) && v) razaoSocial = v;
        else if (/cnpj/i.test(k) && v) cnpj = v;
        else if (/cnae/i.test(k) && v) cnae = v;
        else if (/endereco|logradouro/i.test(k) && v) logradouroNum = v;
        else if (/localidade|municipio/i.test(k) && v) localidade = v;
        else if (/aluno/i.test(k) && v) alunosAtendidos = Math.round(toNumber(val, 0));
        else if (/polo/i.test(k) && v) polo = v;
        else if (/representante|diretor/i.test(k) && v) representante = v;
        else if (/tipo/i.test(k) && v) tipo = v;
        else if (/telefone|celular|fone/i.test(k) && v) telefone = v;
        else if (/email|e-mail/i.test(k) && v) email = v;
      }

      if (!nomeEscola) return; // ignora linhas vazias

      itens.push({
        nomeEscola,
        inepCodigo,
        localDeEntrega: nomeEscola,
        cnae,
        razaoSocial: razaoSocial || nomeEscola,
        cnpj,
        logradouroNum,
        localidade: localidade || 'Trairi/CE',
        alunosAtendidos,
        // Normaliza o polo para um dos 4 valores oficiais do sistema — sem
        // isso, uma escola importada com "Sede" ou "polo sede centro" (em
        // vez do texto oficial "Sede") nunca aparecia junto com
        // as outras escolas do mesmo polo nas telas de Pedido/Proposta.
        polo: normalizarPolo(polo),
        representante,
        diretorResponsavel: representante,
        tipo,
        telefone,
        email,
        endereco: `${logradouroNum || ''}${logradouroNum && localidade ? ' - ' : ''}${localidade || ''}`
      });
    });

    if (itens.length === 0) {
      return { success: false, itens: [], message: 'Não foi possível identificar escolas válidas (com nome preenchido) na planilha.' };
    }

    return {
      success: true,
      itens,
      message: `${itens.length} escola(s) identificada(s) na planilha, pronta(s) para importação.`
    };
  } catch (err: any) {
    return { success: false, itens: [], message: `Erro ao ler a planilha: ${err?.message || 'formato inválido.'}` };
  }
}
