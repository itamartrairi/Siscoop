import * as XLSX from '@e965/xlsx';
import { ChamadaPublica, ItemChamadaPublica, EscolaContempladaChamada } from '../types';

/**
 * Gera e realiza o download do modelo de planilha oficial (.xlsx)
 * para preenchimento de Chamada Pública / Edital da Agricultura Familiar (PNAE / PAA).
 */
export function baixarModeloPlanilhaChamadaPublica() {
  const wb = XLSX.utils.book_new();

  // Aba 1: Dados do Edital / Chamada Pública
  const dadosEdital = [
    {
      'Numero_Edital': 'Chamada Pública PNAE 002/2026',
      'Orgao_Comprador': 'Secretaria Municipal de Educação de Trairi',
      'Programa': 'PNAE',
      'Fonte_Recurso': 'FNDE / PNAE Federal',
      'Data_Abertura': '2026-08-01',
      'Data_Encerramento': '2026-08-30',
      'Status': 'ABERTA',
      'Observacoes': 'Aquisição de gêneros alimentícios da Agricultura Familiar para atendimento do PNAE.'
    }
  ];
  const wsEdital = XLSX.utils.json_to_sheet(dadosEdital);
  wsEdital['!cols'] = [
    { wch: 32 }, // Numero_Edital
    { wch: 42 }, // Orgao_Comprador
    { wch: 15 }, // Programa
    { wch: 28 }, // Fonte_Recurso
    { wch: 15 }, // Data_Abertura
    { wch: 18 }, // Data_Encerramento
    { wch: 15 }, // Status
    { wch: 50 }  // Observacoes
  ];
  XLSX.utils.book_append_sheet(wb, wsEdital, 'Edital_Chamada');

  // Aba 2: Escolas Contempladas
  const dadosEscolas = [
    {
      'Nome_Escola': 'EMEIF Francisca das Chagas - Sede',
      'Polo': 'Sede',
      'Codigo_INEP': '23091022',
      'Endereco': 'Rua Coronel José de Castro, 120 - Centro',
      'Alunos_Atendidos': 650,
      'Responsavel_Contato': 'Maria das Graças Alencar'
    },
    {
      'Nome_Escola': 'EEIEF Manoel Joaquim de Santana',
      'Polo': 'Flecheiras',
      'Codigo_INEP': '23091045',
      'Endereco': 'Avenida Beira Mar, S/N - Flecheiras',
      'Alunos_Atendidos': 420,
      'Responsavel_Contato': 'Prof. Francisco das Chagas Viana'
    },
    {
      'Nome_Escola': 'Escola Municipal Canaan - Zona Rural',
      'Polo': 'Polo Sertão Canaan',
      'Codigo_INEP': '23091088',
      'Endereco': 'Distrito de Canaan, S/N',
      'Alunos_Atendidos': 280,
      'Responsavel_Contato': 'Ana Lúcia Ferreira'
    }
  ];
  const wsEscolas = XLSX.utils.json_to_sheet(dadosEscolas);
  wsEscolas['!cols'] = [
    { wch: 38 }, // Nome_Escola
    { wch: 25 }, // Polo
    { wch: 16 }, // Codigo_INEP
    { wch: 45 }, // Endereco
    { wch: 18 }, // Alunos_Atendidos
    { wch: 30 }  // Responsavel_Contato
  ];
  XLSX.utils.book_append_sheet(wb, wsEscolas, 'Escolas_Contempladas');

  // Aba 3: Produtos e Itens Solicitados
  const dadosProdutos = [
    {
      'Nome_Produto': 'Mandioca In Natura Organica',
      'Unidade': 'KG',
      'Quantidade_Total': 15000,
      'Preco_Unitario_Maximo_R$': 4.80,
      'Valor_Total_Estimado_R$': 72000.00,
      'Categoria': 'Tubérculos e Raízes'
    },
    {
      'Nome_Produto': 'Banana Prata Agroecológica',
      'Unidade': 'KG',
      'Quantidade_Total': 20000,
      'Preco_Unitario_Maximo_R$': 5.20,
      'Valor_Total_Estimado_R$': 104000.00,
      'Categoria': 'Frutas Frescas'
    },
    {
      'Nome_Produto': 'Polpa de Frutas Diversas (Acerola/Goiaba/Caju)',
      'Unidade': 'KG',
      'Quantidade_Total': 6000,
      'Preco_Unitario_Maximo_R$': 8.50,
      'Valor_Total_Estimado_R$': 51000.00,
      'Categoria': 'Polpas Congeladas'
    },
    {
      'Nome_Produto': 'Milho Verde In Natura',
      'Unidade': 'KG',
      'Quantidade_Total': 8000,
      'Preco_Unitario_Maximo_R$': 3.50,
      'Valor_Total_Estimado_R$': 28000.00,
      'Categoria': 'Grãos e Cereais'
    },
    {
      'Nome_Produto': 'Feijão Macassar / Corda Novo',
      'Unidade': 'KG',
      'Quantidade_Total': 5000,
      'Preco_Unitario_Maximo_R$': 9.00,
      'Valor_Total_Estimado_R$': 45000.00,
      'Categoria': 'Leguminosas'
    }
  ];
  const wsProdutos = XLSX.utils.json_to_sheet(dadosProdutos);
  wsProdutos['!cols'] = [
    { wch: 45 }, // Nome_Produto
    { wch: 12 }, // Unidade
    { wch: 18 }, // Quantidade_Total
    { wch: 25 }, // Preco_Unitario_Maximo_R$
    { wch: 25 }, // Valor_Total_Estimado_R$
    { wch: 25 }  // Categoria
  ];
  XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos_Itens');

  // Aba 4: Instruções de Preenchimento
  const dadosInstrucoes = [
    {
      'Campo': 'Numero_Edital',
      'Instrução': 'Número ou identificador oficial da Chamada Pública (Ex: Chamada Pública PNAE 002/2026)'
    },
    {
      'Campo': 'Orgao_Comprador',
      'Instrução': 'Nome da Prefeitura, Secretaria de Educação, Conab ou órgão licitante'
    },
    {
      'Campo': 'Programa',
      'Instrução': 'Tipo do Programa: PNAE, PAA ou MERCADO_LIVRE'
    },
    {
      'Campo': 'Fonte_Recurso',
      'Instrução': 'Origem orçamentária: FNDE / PNAE Federal, MDS / PAA, Tesouro Municipal, SEDUC Estadual, etc.'
    },
    {
      'Campo': 'Escolas_Contempladas',
      'Instrução': 'Na aba "Escolas_Contempladas", liste as escolas participantes com Nome, Polo e Endereço'
    },
    {
      'Campo': 'Produtos_Itens',
      'Instrução': 'Na aba "Produtos_Itens", liste os alimentos solicitados com Nome, Unidade (KG, UN, etc), Quantidade e Preço Unitário teto'
    }
  ];
  const wsInstrucoes = XLSX.utils.json_to_sheet(dadosInstrucoes);
  wsInstrucoes['!cols'] = [{ wch: 25 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Como_Preencher');

  // Grava e dispara o download no navegador
  XLSX.writeFile(wb, 'modelo_chamada_publica_edital.xlsx');
}

/**
 * Função utilitária para normalizar strings de cabeçalho
 */
function normalizeKey(key: string): string {
  return (key || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Função utilitária para converter valor numérico
 */
function parseNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/R\$/gi, '').trim();
  // Se contiver vírgula decimal pt-BR (ex: "4,80" ou "1.500,50")
  if (str.includes(',') && !str.includes('e')) {
    const clean = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }
  return parseFloat(str) || 0;
}

/**
 * Converte data da planilha para YYYY-MM-DD
 */
function parseDate(val: any, fallbackDate: string): string {
  if (!val) return fallbackDate;
  if (typeof val === 'number') {
    // Número serial de data do Excel
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Formato dd/mm/yyyy
  const ptMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ptMatch) {
    const day = ptMatch[1].padStart(2, '0');
    const month = ptMatch[2].padStart(2, '0');
    const year = ptMatch[3];
    return `${year}-${month}-${day}`;
  }
  return fallbackDate;
}

export interface ParsePlanilhaResult {
  success: boolean;
  chamada?: Partial<ChamadaPublica>;
  escolasContempladas: EscolaContempladaChamada[];
  itensSolicitados: ItemChamadaPublica[];
  totalEdital: number;
  message: string;
  detalhes?: {
    totalEscolas: number;
    totalProdutos: number;
    numeroEdital: string;
    orgaoComprador: string;
    fonteRecurso: string;
  };
}

/**
 * Lê e analisa arquivo XLSX/XLS/CSV enviado pelo usuário,
 * extraindo as informações do Edital, Escolas Contempladas e Produtos.
 */
export async function parsePlanilhaChamadaPublica(file: File): Promise<ParsePlanilhaResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        escolasContempladas: [],
        itensSolicitados: [],
        totalEdital: 0,
        message: 'A planilha fornecida está vazia ou ilegível.'
      };
    }

    let numeroEdital = '';
    let orgaoComprador = '';
    let programa: 'PAA' | 'PNAE' | string = 'PNAE';
    let fonteRecurso = 'FNDE / PNAE Federal';
    let dataAbertura = new Date().toISOString().split('T')[0];
    let dataEncerramento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let status: 'ABERTA' | 'EM_ANALISE' | 'HOMOLOGADA' | 'ENCERRADA' = 'ABERTA';
    let observacoes = '';

    const escolasContempladas: EscolaContempladaChamada[] = [];
    const itensSolicitados: ItemChamadaPublica[] = [];

    // Procura por abas estruturadas
    const sheetNames = workbook.SheetNames;
    const editalSheetName = sheetNames.find(n => /edital|chamada|dados|geral|cabecalho/i.test(n)) || sheetNames[0];
    const escolasSheetName = sheetNames.find(n => /escola|unidade|consumidor|destino/i.test(n));
    const produtosSheetName = sheetNames.find(n => /produto|item|itens|generos|alimento/i.test(n));

    // 1. Processa Aba do Edital / Geral
    if (editalSheetName) {
      const sheet = workbook.Sheets[editalSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length > 0) {
        const firstRow = rows[0];
        for (const [rawKey, val] of Object.entries(firstRow)) {
          const k = normalizeKey(rawKey);
          const v = String(val || '').trim();
          if (/numero|edital|numedital|chamada/i.test(k) && v) numeroEdital = v;
          else if (/orgao|comprador|prefeitura|secretaria|cliente/i.test(k) && v) orgaoComprador = v;
          else if (/programa|tipo/i.test(k) && v) {
            const up = v.toUpperCase();
            if (up.includes('PAA')) programa = 'PAA';
            else if (up.includes('PNAE')) programa = 'PNAE';
            else programa = v;
          }
          else if (/fonte|recurso|fonterecurso|verba|financiador/i.test(k) && v) fonteRecurso = v;
          else if (/abertura|inicio|datainicio/i.test(k) && v) dataAbertura = parseDate(val, dataAbertura);
          else if (/encerramento|termino|fim|vigencia|prazo/i.test(k) && v) dataEncerramento = parseDate(val, dataEncerramento);
          else if (/status|situacao/i.test(k) && v) {
            const up = v.toUpperCase();
            if (['ABERTA', 'EM_ANALISE', 'HOMOLOGADA', 'ENCERRADA'].includes(up)) {
              status = up as any;
            }
          }
          else if (/obs|observacao|descricao/i.test(k) && v) observacoes = v;
        }
      }
    }

    // Se número do edital não estiver preenchido, usa nome do arquivo
    if (!numeroEdital) {
      const fileNameClean = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      numeroEdital = `Edital ${fileNameClean}`;
    }
    if (!orgaoComprador) {
      orgaoComprador = 'Secretaria de Educação / Órgão Licitante';
    }

    // 2. Processa Aba de Escolas Contempladas
    if (escolasSheetName) {
      const sheet = workbook.Sheets[escolasSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      rows.forEach((row, idx) => {
        let nomeEscola = '';
        let polo = 'Polo Sede';
        let codigoInep = '';
        let endereco = '';
        let alunosAtendidos = 0;
        let responsavel = '';

        for (const [rawKey, val] of Object.entries(row)) {
          const k = normalizeKey(rawKey);
          const v = String(val || '').trim();
          if (/nome|escola|unidade|colegio|instituicao/i.test(k) && v) nomeEscola = v;
          else if (/polo|regiao|distrito|zona|nucleo/i.test(k) && v) polo = v;
          else if (/inep|codigo|cod/i.test(k) && v) codigoInep = v;
          else if (/endereco|logradouro|localidade|local/i.test(k) && v) endereco = v;
          else if (/aluno|estudante|atendido|matricula|capacidade/i.test(k)) alunosAtendidos = parseNumber(val);
          else if (/responsavel|contato|diretor|gestor/i.test(k) && v) responsavel = v;
        }

        if (nomeEscola) {
          escolasContempladas.push({
            id: `esc-imp-${idx + 1}-${Date.now().toString().slice(-4)}`,
            nomeEscola,
            polo: polo || 'Polo Sede',
            codigoInep,
            endereco,
            alunosAtendidos: alunosAtendidos || 250,
            responsavel
          });
        }
      });
    }

    // 3. Processa Aba de Produtos / Itens Solicitados
    const targetProdutosSheet = produtosSheetName || (!escolasSheetName && sheetNames.length > 1 ? sheetNames[1] : (sheetNames.length === 1 ? sheetNames[0] : null));

    if (targetProdutosSheet) {
      const sheet = workbook.Sheets[targetProdutosSheet];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      rows.forEach((row, idx) => {
        let produtoNome = '';
        let unidade = 'KG';
        let quantidadeTotal = 0;
        let precoMaximoUnitario = 0;
        let categoria = '';

        for (const [rawKey, val] of Object.entries(row)) {
          const k = normalizeKey(rawKey);
          const v = String(val || '').trim();
          if (/produto|nomeproduto|item|descricao|alimento|genero/i.test(k) && v) produtoNome = v;
          else if (/unidade|medida|und|un/i.test(k) && v) unidade = v.toUpperCase();
          else if (/quantidade|qtd|quantidadetotal|volume|peso/i.test(k)) quantidadeTotal = parseNumber(val);
          else if (/preco|precounitario|valormaximo|unitario|referencia|teto/i.test(k) && !/total/i.test(k)) precoMaximoUnitario = parseNumber(val);
          else if (/categoria|grupo|tipo/i.test(k) && v) categoria = v;
          // Se em planilha plana houver também coluna de escola
          else if (/escola/i.test(k) && v && escolasContempladas.every(e => e.nomeEscola !== v)) {
            escolasContempladas.push({
              id: `esc-row-${escolasContempladas.length + 1}`,
              nomeEscola: v,
              polo: 'Polo Sede',
              alunosAtendidos: 200
            });
          }
        }

        if (produtoNome && (quantidadeTotal > 0 || precoMaximoUnitario > 0)) {
          const valorTotalItem = Number((quantidadeTotal * (precoMaximoUnitario || 5.0)).toFixed(2));
          itensSolicitados.push({
            produtoId: `pdt-imp-${idx + 1}`,
            produtoNome,
            unidade: unidade || 'KG',
            quantidadeTotal: quantidadeTotal || 1000,
            precoMaximoUnitario: precoMaximoUnitario || 5.00,
            valorTotalItem,
            categoria: categoria || 'Gêneros da Agricultura Familiar'
          });
        }
      });
    }

    // Se nenhum produto for encontrado em aba específica, vasculha todas as abas por linhas de produtos
    if (itensSolicitados.length === 0) {
      for (const sName of sheetNames) {
        const sheet = workbook.Sheets[sName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        rows.forEach((row, idx) => {
          let pNome = '';
          let und = 'KG';
          let qtd = 0;
          let prc = 0;
          for (const [rawKey, val] of Object.entries(row)) {
            const k = normalizeKey(rawKey);
            const v = String(val || '').trim();
            if (/produto|item|alimento|genero/i.test(k) && v) pNome = v;
            else if (/unidade|und/i.test(k) && v) und = v.toUpperCase();
            else if (/quantidade|qtd/i.test(k)) qtd = parseNumber(val);
            else if (/preco|unitario/i.test(k) && !/total/i.test(k)) prc = parseNumber(val);
          }
          if (pNome && (qtd > 0 || prc > 0)) {
            itensSolicitados.push({
              produtoId: `pdt-alt-${idx + 1}`,
              produtoNome: pNome,
              unidade: und,
              quantidadeTotal: qtd || 1000,
              precoMaximoUnitario: prc || 5.00,
              valorTotalItem: Number((qtd * (prc || 5.00)).toFixed(2))
            });
          }
        });
      }
    }

    // Calcula valor total acumulado do edital
    const totalEdital = itensSolicitados.reduce((sum, it) => sum + (it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario)), 0);

    const escolasNomes = escolasContempladas.map(e => e.nomeEscola);
    const escolasIds = escolasContempladas.map(e => e.id || '');

    const chamadaResult: Partial<ChamadaPublica> = {
      numeroEdital,
      orgaoComprador,
      programa,
      fonteRecurso,
      fonteRecursos: fonteRecurso,
      escolaNome: escolasNomes.join(', ') || 'Escolas da Rede Municipal',
      escolaId: escolasIds[0] || '',
      escolasIds,
      escolasNomes,
      escolasContempladas,
      dataAbertura,
      dataEncerramento,
      valorTotalEdital: totalEdital > 0 ? totalEdital : 150000,
      status,
      observacoes: observacoes || `Importado via planilha XLS/CSV: ${file.name}`,
      arquivoEditalNome: file.name,
      itensSolicitados
    };

    return {
      success: true,
      chamada: chamadaResult,
      escolasContempladas,
      itensSolicitados,
      totalEdital,
      message: `Planilha importada com sucesso! ${itensSolicitados.length} produtos e ${escolasContempladas.length} escolas reconhecidas.`,
      detalhes: {
        totalEscolas: escolasContempladas.length,
        totalProdutos: itensSolicitados.length,
        numeroEdital,
        orgaoComprador,
        fonteRecurso
      }
    };
  } catch (err: any) {
    console.error('Erro ao processar planilha de chamada pública:', err);
    return {
      success: false,
      escolasContempladas: [],
      itensSolicitados: [],
      totalEdital: 0,
      message: `Falha ao processar arquivo: ${err?.message || 'Formato de planilha inválido ou corrompido.'}`
    };
  }
}
