import type { ClassificacaoIbsCbs, TipoProdutoAgro, TributacaoIcmsItem } from '../types';
import { sugerirTributacaoIcms } from './impostosRevenda';

/**
 * Tipo do produto e classificação fiscal usados no cadastro de Produtos
 * Agropecuários e levados para as vendas.
 *
 * IBS/CBS conforme a Reforma Tributária do consumo (EC 132/2023 e
 * LC 214/2025). Os percentuais são de REDUÇÃO das alíquotas de referência.
 * Confirme sempre o enquadramento (NCM x anexos da LC 214/2025) com o contador.
 */

export const TIPOS_PRODUTO: { valor: TipoProdutoAgro; rotulo: string; dica: string }[] = [
  { valor: 'IN_NATURA', rotulo: 'In natura', dica: 'Fresco, sem processamento (como sai da roça)' },
  { valor: 'MINIMAMENTE_PROCESSADO', rotulo: 'Minimamente processado', dica: 'Lavado, descascado, cortado, resfriado ou embalado' },
  { valor: 'BENEFICIADO', rotulo: 'Beneficiado / processado', dica: 'Polpa, farinha, doce, queijo, mel envasado etc.' },
  { valor: 'INDUSTRIALIZADO', rotulo: 'Industrializado', dica: 'Produto de indústria, com transformação' },
  { valor: 'INSUMO', rotulo: 'Insumo agropecuário', dica: 'Semente, muda, adubo, ração, defensivo, vacina' },
  { valor: 'REVENDA', rotulo: 'Revenda (mercadoria de terceiros)', dica: 'Comprado pronto para revender' },
];

export const rotuloTipoProduto = (t?: string) => TIPOS_PRODUTO.find(x => x.valor === t)?.rotulo || 'In natura';

export const OPCOES_IBS_CBS: { valor: ClassificacaoIbsCbs; rotulo: string; reducao: number; fundamento: string }[] = [
  { valor: 'PADRAO', rotulo: 'Alíquota padrão', reducao: 0, fundamento: 'Regra geral (LC 214/2025)' },
  { valor: 'HORTIFRUTI_OVOS_ZERO', rotulo: 'Hortícolas, frutas e ovos — alíquota zero', reducao: 100, fundamento: 'LC 214/2025, art. 148 e Anexo XV' },
  { valor: 'CESTA_BASICA_ZERO', rotulo: 'Cesta Básica Nacional — alíquota zero', reducao: 100, fundamento: 'LC 214/2025, art. 125 e Anexo I' },
  { valor: 'IN_NATURA_REDUCAO_60', rotulo: 'Produto agropecuário in natura — redução de 60%', reducao: 60, fundamento: 'LC 214/2025, art. 137' },
  { valor: 'ALIMENTOS_REDUCAO_60', rotulo: 'Alimentos para consumo humano — redução de 60%', reducao: 60, fundamento: 'LC 214/2025, art. 135 e Anexo VII' },
  { valor: 'INSUMO_AGRO_REDUCAO_60', rotulo: 'Insumo agropecuário — redução de 60%', reducao: 60, fundamento: 'LC 214/2025, art. 138 e Anexo IX' },
];

export const reducaoIbsCbs = (c?: ClassificacaoIbsCbs) => OPCOES_IBS_CBS.find(o => o.valor === c)?.reducao ?? 0;
export const opcaoIbsCbs = (c?: ClassificacaoIbsCbs) => OPCOES_IBS_CBS.find(o => o.valor === c) || OPCOES_IBS_CBS[0];

const HORTIFRUTI_OVOS = /(hortifr|fruta|verdura|legume|hortali|folhos|alface|couve|cheiro|coentro|tomate|cebola|batata|mandioca|macaxeira|ab[oó]bora|banana|manga|caju|goiaba|acerola|mam[aã]o|maracuj|laranja|lim[aã]o|melancia|mel[aã]o|ovos?\b)/;
const CESTA_BASICA = /(arroz|feij[aã]o|farinha de mandioca|tapioca|goma|leite|manteiga|caf[eé]|a[cç][uú]car|milho|fub[aá]|cuscuz|carne|frango|peixe|queijo|mate)/;

/** Sugere a classificação IBS/CBS pelo tipo, categoria e nome do produto. */
export const sugerirClassificacaoIbsCbs = (tipo?: TipoProdutoAgro, categoria?: string, nome?: string): ClassificacaoIbsCbs => {
  const t = `${nome || ''} ${categoria || ''}`.toLowerCase();
  if (tipo === 'INSUMO') return 'INSUMO_AGRO_REDUCAO_60';
  if (tipo === 'REVENDA' || tipo === 'INDUSTRIALIZADO') return CESTA_BASICA.test(t) ? 'CESTA_BASICA_ZERO' : 'PADRAO';
  if ((tipo === 'IN_NATURA' || tipo === 'MINIMAMENTE_PROCESSADO' || !tipo) && (categoria === 'HORTIFRUTI' || HORTIFRUTI_OVOS.test(t))) return 'HORTIFRUTI_OVOS_ZERO';
  if (CESTA_BASICA.test(t) || categoria === 'GRAOS' || categoria === 'LATICINIOS' || categoria === 'CARNES') return 'CESTA_BASICA_ZERO';
  if (tipo === 'IN_NATURA') return 'IN_NATURA_REDUCAO_60';
  if (tipo === 'BENEFICIADO' || tipo === 'MINIMAMENTE_PROCESSADO' || categoria === 'PROCESSADOS') return 'ALIMENTOS_REDUCAO_60';
  return 'PADRAO';
};

/** Sugere o tratamento do ICMS (regras do Ceará) pelo tipo, categoria e nome. */
export const sugerirIcmsProduto = (tipo?: TipoProdutoAgro, categoria?: string, nome?: string): TributacaoIcmsItem => {
  if (tipo === 'INSUMO') return 'REDUCAO_INSUMO';
  if ((tipo === 'IN_NATURA' || tipo === 'MINIMAMENTE_PROCESSADO') && categoria === 'HORTIFRUTI') return 'ISENTO';
  return sugerirTributacaoIcms(nome, categoria === 'HORTIFRUTI' && tipo === 'IN_NATURA' ? 'hortifruti in natura' : categoria);
};
