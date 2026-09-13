/**
 * Tabela de referência para preenchimento automático de códigos fiscais dos
 * produtos agropecuários cadastrados no sistema:
 *
 * - codigoNcm: Nomenclatura Comum do Mercosul, usada pela SEFAZ na emissão
 *   de Nota Fiscal (campo NCM do item, obrigatório em toda NF-e).
 * - codigoConab: código de produto/grupo da tabela de acompanhamento de
 *   preços da CONAB (Companhia Nacional de Abastecimento), referência usual
 *   para preços do PAA (Programa de Aquisição de Alimentos).
 *
 * Os códigos abaixo cobrem os grupos de alimentos mais comuns na
 * agricultura familiar / PAA / PNAE. Não substituem a conferência com o
 * contador ou a tabela oficial da CONAB para itens muito específicos —
 * servem para agilizar o cadastro, e podem sempre ser ajustados manualmente
 * no formulário do produto.
 */

export interface CodigoFiscalMatch {
  codigoNcm: string;
  codigoConab: string;
  fonte: 'nome' | 'categoria';
  termoCorrespondido?: string;
}

interface RegraCodigoFiscal {
  /** Palavras-chave para casar com o nome do produto (case-insensitive, sem acento) */
  termos: string[];
  codigoNcm: string;
  codigoConab: string;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Regras por nome de produto (mais específicas — checadas primeiro)
const REGRAS_POR_NOME: RegraCodigoFiscal[] = [
  { termos: ['mandioca', 'macaxeira', 'aipim'], codigoNcm: '0714.10.00', codigoConab: '1301001' },
  { termos: ['banana'], codigoNcm: '0803.90.00', codigoConab: '1101002' },
  { termos: ['abacaxi'], codigoNcm: '0804.30.00', codigoConab: '1101010' },
  { termos: ['manga'], codigoNcm: '0804.50.00', codigoConab: '1101011' },
  { termos: ['laranja'], codigoNcm: '0805.10.00', codigoConab: '1101006' },
  { termos: ['limao', 'lima acida'], codigoNcm: '0805.50.00', codigoConab: '1101008' },
  { termos: ['melancia'], codigoNcm: '0807.11.00', codigoConab: '1101015' },
  { termos: ['melao'], codigoNcm: '0807.19.00', codigoConab: '1101016' },
  { termos: ['mamao'], codigoNcm: '0807.20.00', codigoConab: '1101012' },
  { termos: ['maracuja'], codigoNcm: '0810.90.00', codigoConab: '1101018' },
  { termos: ['goiaba'], codigoNcm: '0804.40.00', codigoConab: '1101019' },
  { termos: ['acerola', 'caju', 'polpa de fruta', 'polpa'], codigoNcm: '2008.99.00', codigoConab: '1401001' },
  { termos: ['alface'], codigoNcm: '0705.11.00', codigoConab: '1201001' },
  { termos: ['couve'], codigoNcm: '0704.90.00', codigoConab: '1201002' },
  { termos: ['tomate'], codigoNcm: '0702.00.00', codigoConab: '1201003' },
  { termos: ['cebola'], codigoNcm: '0703.10.00', codigoConab: '1201004' },
  { termos: ['cenoura'], codigoNcm: '0706.10.00', codigoConab: '1201005' },
  { termos: ['pimentao', 'pimenta'], codigoNcm: '0709.60.00', codigoConab: '1201006' },
  { termos: ['abobora', 'jerimum', 'moranga'], codigoNcm: '0709.93.00', codigoConab: '1201007' },
  { termos: ['batata doce'], codigoNcm: '0714.20.00', codigoConab: '1301002' },
  { termos: ['inhame'], codigoNcm: '0714.90.00', codigoConab: '1301003' },
  { termos: ['feijao'], codigoNcm: '0713.33.00', codigoConab: '0101001' },
  { termos: ['feijao caupi', 'macassar'], codigoNcm: '0713.35.00', codigoConab: '0101002' },
  { termos: ['milho'], codigoNcm: '1005.90.00', codigoConab: '0201001' },
  { termos: ['arroz'], codigoNcm: '1006.30.00', codigoConab: '0301001' },
  { termos: ['farinha de mandioca', 'farinha'], codigoNcm: '1106.20.00', codigoConab: '1302001' },
  { termos: ['castanha de caju', 'castanha'], codigoNcm: '0801.32.00', codigoConab: '1501001' },
  { termos: ['mel', 'apicultura'], codigoNcm: '0409.00.00', codigoConab: '1601001' },
  { termos: ['leite'], codigoNcm: '0401.20.00', codigoConab: '0401001' },
  { termos: ['queijo'], codigoNcm: '0406.10.00', codigoConab: '0402001' },
  { termos: ['manteiga', 'requeijao', 'iogurte'], codigoNcm: '0405.10.00', codigoConab: '0402002' },
  { termos: ['ovo'], codigoNcm: '0407.21.00', codigoConab: '0501001' },
  { termos: ['frango', 'galinha', 'ave'], codigoNcm: '0207.14.00', codigoConab: '0601001' },
  { termos: ['carne bovina', 'carne de gado', 'boi'], codigoNcm: '0201.30.00', codigoConab: '0602001' },
  { termos: ['carne suina', 'porco'], codigoNcm: '0203.29.00', codigoConab: '0603001' },
  { termos: ['peixe', 'pescado', 'tilapia'], codigoNcm: '0302.99.00', codigoConab: '0701001' },
  { termos: ['pao', 'panificado', 'biscoito', 'bolo'], codigoNcm: '1905.90.00', codigoConab: '1701001' },
  { termos: ['doce', 'geleia', 'compota'], codigoNcm: '2007.99.00', codigoConab: '1402001' },
];

// Regras de fallback por categoria (quando o nome não casa com nada acima)
const REGRAS_POR_CATEGORIA: Record<string, { codigoNcm: string; codigoConab: string }> = {
  HORTIFRUTI: { codigoNcm: '0709.99.00', codigoConab: '1201099' },
  GRAOS: { codigoNcm: '1008.90.00', codigoConab: '0101099' },
  LATICINIOS: { codigoNcm: '0401.10.00', codigoConab: '0401099' },
  PROCESSADOS: { codigoNcm: '2106.90.00', codigoConab: '1701099' },
  CARNES: { codigoNcm: '0210.99.00', codigoConab: '0601099' },
  OUTROS: { codigoNcm: '2106.90.90', codigoConab: '9999999' },
};

/**
 * Busca o código NCM (SEFAZ) e o código CONAB mais adequado para um produto,
 * a partir do nome digitado e, na falta de correspondência, da categoria.
 * Retorna null se não houver nome nem categoria suficientes para inferir nada.
 */
export function buscarCodigosFiscais(nomeProduto: string, categoria?: string): CodigoFiscalMatch | null {
  const nomeNormalizado = normalizar(nomeProduto || '');

  if (nomeNormalizado) {
    for (const regra of REGRAS_POR_NOME) {
      const termoEncontrado = regra.termos.find(t => nomeNormalizado.includes(normalizar(t)));
      if (termoEncontrado) {
        return {
          codigoNcm: regra.codigoNcm,
          codigoConab: regra.codigoConab,
          fonte: 'nome',
          termoCorrespondido: termoEncontrado
        };
      }
    }
  }

  if (categoria && REGRAS_POR_CATEGORIA[categoria]) {
    const fallback = REGRAS_POR_CATEGORIA[categoria];
    return {
      codigoNcm: fallback.codigoNcm,
      codigoConab: fallback.codigoConab,
      fonte: 'categoria'
    };
  }

  return null;
}
