// Cálculo dos impostos sobre as vendas da revenda de produtos, conforme as
// regras do Ceará (ICMS/FECOP) e os tributos federais (PIS/COFINS, IRPJ/CSLL,
// Simples Nacional) e o teste da reforma tributária (CBS/IBS em 2026).
//
// IMPORTANTE: é uma ESTIMATIVA para gestão e para gerar as guias no
// Financeiro. Alíquotas, benefícios e o regime da cooperativa ficam na
// "Configuração tributária" da aba Revendas e devem ser conferidos com o
// contador (benefícios como o Convênio ICMS 100/97 mudam com frequência).
//
// Referências usadas nos valores padrão:
//  - ICMS/CE: alíquota interna modal de 20% desde 01/01/2024 (Lei 18.305/2023).
//  - FECOP/CE: adicional de 2 p.p. em itens como bebidas, cosméticos, artigos
//    para animais de estimação e inseticidas/fungicidas/herbicidas.
//  - Interestadual a partir do CE: 12% (Res. Senado 22/1989); 4% p/ importados.
//    Venda a não contribuinte de outro estado: DIFAL devido ao estado de
//    destino (EC 87/2015).
//  - PIS/COFINS: não cumulativo 1,65% / 7,6% (cooperativas de produção
//    agropecuária); cumulativo 0,65% / 3% (lucro presumido).
//  - Venda de mercadorias de terceiros a não associados é ato NÃO cooperativo
//    (tributado normalmente).
//  - Cooperativas (exceto de consumo) não podem optar pelo Simples Nacional
//    (LC 123/2006, art. 3º, §4º, VI) — a opção existe só para casos especiais.
//  - CBS 0,9% e IBS 0,1% em 2026: destaque na nota (fase de teste), sem
//    recolhimento para quem cumpre as obrigações acessórias (LC 214/2025).

import type { ConfigTributariaRevenda, ImpostosVenda, ItemVendaRevenda, RegimeApuracaoRevenda, TributacaoIcmsItem } from '../types';

export const OPCOES_TRIBUTACAO_ICMS: { valor: TributacaoIcmsItem; rotulo: string }[] = [
  { valor: 'TRIBUTADO', rotulo: 'Tributado (alíquota interna)' },
  { valor: 'FECOP', rotulo: 'Tributado + FECOP' },
  { valor: 'REDUCAO_INSUMO', rotulo: 'Insumo agropecuário (redução de base)' },
  { valor: 'ISENTO', rotulo: 'Isento / não tributado' },
  { valor: 'ST', rotulo: 'ICMS-ST já retido' },
];

export const ROTULO_REGIME: Record<RegimeApuracaoRevenda, string> = {
  LUCRO_REAL: 'Lucro real (PIS/COFINS não cumulativo)',
  LUCRO_PRESUMIDO: 'Lucro presumido (PIS/COFINS cumulativo)',
  SIMPLES_NACIONAL: 'Simples Nacional (DAS)',
};

export const PADRAO_POR_REGIME: Record<RegimeApuracaoRevenda, Partial<ConfigTributariaRevenda>> = {
  LUCRO_REAL: { pis: 1.65, cofins: 7.6, creditoPisCofinsCusto: true, incluirIrpjCsll: false },
  LUCRO_PRESUMIDO: { pis: 0.65, cofins: 3, creditoPisCofinsCusto: false, incluirIrpjCsll: true, irpjPresumido: 1.2, csllPresumido: 1.08 },
  SIMPLES_NACIONAL: { aliquotaDasEfetiva: 4 },
};

export const CONFIG_TRIBUTARIA_PADRAO: ConfigTributariaRevenda = {
  regime: 'LUCRO_REAL',
  aliquotaIcmsInterna: 20,
  aliquotaFecop: 2,
  aliquotaInterestadual: 12,
  reducaoBaseInsumos: 60,
  creditoIcmsCustoPercent: 0,
  pis: 1.65,
  cofins: 7.6,
  creditoPisCofinsCusto: true,
  incluirIrpjCsll: false,
  irpjPresumido: 1.2,
  csllPresumido: 1.08,
  aliquotaDasEfetiva: 4,
  cbsTeste: 0.9,
  ibsTeste: 0.1,
};

export const configTributaria = (salva?: Partial<ConfigTributariaRevenda> | null): ConfigTributariaRevenda => ({
  ...CONFIG_TRIBUTARIA_PADRAO,
  ...(salva || {}),
});

/** Sugere o tratamento de ICMS pelo nome/categoria do produto (o usuário pode trocar). */
export const sugerirTributacaoIcms = (nome?: string, categoria?: string): TributacaoIcmsItem => {
  const t = `${nome || ''} ${categoria || ''}`.toLowerCase();
  if (/(bebida|cerveja|refrigerante|isot[oô]nico|cosm[eé]tico|perfume|maquiagem|\bpet\b|animais de estima|inseticida|fungicida|herbicida)/.test(t)) return 'FECOP';
  if (/(hortifr|fruta|verdura|legume|hortali|in natura|ovos?\b)/.test(t)) return 'ISENTO';
  if (/(insumo|adubo|fertiliz|semente|muda|ra[cç][aã]o|calc[aá]rio|vacina|corretivo|defensivo|agrot[oó]x)/.test(t)) return 'REDUCAO_INSUMO';
  return 'TRIBUTADO';
};

const pct = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Calcula os impostos de uma venda.
 * @param ufDestino UF do cliente ('' = Ceará)
 * @param contribuinte cliente com inscrição estadual (PJ/produtor inscrito)
 */
export const calcularImpostosVenda = (
  itens: ItemVendaRevenda[],
  desconto: number,
  ufDestino: string,
  contribuinte: boolean,
  cfgSalva?: Partial<ConfigTributariaRevenda> | null
): ImpostosVenda => {
  const cfg = configTributaria(cfgSalva);
  const bruto = itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0), 0);
  const receita = Math.max(0, bruto - (Number(desconto) || 0));
  const fatorDesconto = bruto > 0 ? receita / bruto : 0;
  const custo = itens.reduce((s, i) => s + (Number(i.custoUnitario) || 0) * (Number(i.quantidade) || 0), 0);
  const uf = (ufDestino || 'CE').toUpperCase();
  const interestadual = uf !== 'CE';
  const obs: string[] = [];

  let icms = 0, fecop = 0, pis = 0, cofins = 0, irpj = 0, csll = 0, das = 0;

  if (cfg.regime === 'SIMPLES_NACIONAL') {
    das = receita * cfg.aliquotaDasEfetiva / 100;
    obs.push(`Simples Nacional: ICMS, PIS, COFINS, IRPJ e CSLL recolhidos no DAS (${pct(cfg.aliquotaDasEfetiva)}% efetivo).`);
    obs.push('Atenção: cooperativas (exceto de consumo) não podem optar pelo Simples Nacional (LC 123/2006, art. 3º, §4º, VI).');
  } else {
    itens.forEach(i => {
      const base = (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0) * fatorDesconto;
      const trib = i.tributacaoIcms || 'TRIBUTADO';
      if (trib === 'ISENTO' || trib === 'ST') return;
      const aliquota = interestadual ? cfg.aliquotaInterestadual : cfg.aliquotaIcmsInterna;
      const baseIcms = trib === 'REDUCAO_INSUMO' ? base * (1 - cfg.reducaoBaseInsumos / 100) : base;
      icms += baseIcms * aliquota / 100;
      if (trib === 'FECOP' && !interestadual) fecop += baseIcms * cfg.aliquotaFecop / 100;
    });
    if (cfg.creditoIcmsCustoPercent > 0 && custo > 0) {
      const credito = custo * cfg.creditoIcmsCustoPercent / 100;
      icms = Math.max(0, icms - credito);
      obs.push(`Crédito de ICMS das compras abatido: ${pct(cfg.creditoIcmsCustoPercent)}% sobre o custo.`);
    }
    if (itens.some(i => i.tributacaoIcms === 'ST')) obs.push('Itens com ICMS-ST: imposto já retido na compra, sem ICMS próprio na venda.');
    if (itens.some(i => i.tributacaoIcms === 'REDUCAO_INSUMO')) obs.push(`Insumos agropecuários: base do ICMS reduzida em ${pct(cfg.reducaoBaseInsumos)}% (Convênio ICMS 100/97 — confirme a vigência e o percentual com o contador).`);
    if (interestadual) {
      obs.push(`Venda interestadual (CE → ${uf}): ICMS a ${pct(cfg.aliquotaInterestadual)}%.`);
      if (!contribuinte) obs.push(`Cliente não contribuinte em ${uf}: há DIFAL devido ao estado de destino (EC 87/2015), não incluído aqui.`);
    }

    const basePisCofins = cfg.creditoPisCofinsCusto ? Math.max(0, receita - custo) : receita;
    pis = basePisCofins * cfg.pis / 100;
    cofins = basePisCofins * cfg.cofins / 100;
    if (cfg.creditoPisCofinsCusto && custo > 0) obs.push('PIS/COFINS não cumulativo: créditos sobre o custo das mercadorias abatidos.');
    if (cfg.incluirIrpjCsll) {
      irpj = receita * cfg.irpjPresumido / 100;
      csll = receita * cfg.csllPresumido / 100;
      obs.push('IRPJ/CSLL estimados pelo lucro presumido (apuração trimestral).');
    }
  }

  const cbs = receita * cfg.cbsTeste / 100;
  const ibs = receita * cfg.ibsTeste / 100;
  if (cbs || ibs) obs.push(`CBS ${pct(cfg.cbsTeste)}% e IBS ${pct(cfg.ibsTeste)}%: destaque informativo na nota em 2026, sem recolhimento (LC 214/2025).`);
  obs.push('Venda de mercadorias de terceiros é ato não cooperativo (tributação normal).');

  const res = {
    icms: r2(icms), fecop: r2(fecop), pis: r2(pis), cofins: r2(cofins), irpj: r2(irpj), csll: r2(csll), das: r2(das),
  };
  return {
    regime: cfg.regime,
    ufDestino: uf,
    interestadual,
    receita: r2(receita),
    ...res,
    cbs: r2(cbs),
    ibs: r2(ibs),
    totalRecolher: r2(res.icms + res.fecop + res.pis + res.cofins + res.irpj + res.csll + res.das),
    observacoes: obs,
  };
};

/** Impostos que viram guias (contas a pagar) na apuração mensal. */
export const TRIBUTOS_GUIA: { chave: keyof ImpostosVenda; nome: string; categoria: string; orgao: string; diaVencimento: number }[] = [
  { chave: 'icms', nome: 'ICMS', categoria: 'IMPOSTO_ICMS', orgao: 'SEFAZ-CE (DAE)', diaVencimento: 20 },
  { chave: 'fecop', nome: 'FECOP', categoria: 'IMPOSTO_ICMS', orgao: 'SEFAZ-CE (DAE)', diaVencimento: 20 },
  { chave: 'pis', nome: 'PIS', categoria: 'IMPOSTO_PIS', orgao: 'Receita Federal (DARF)', diaVencimento: 25 },
  { chave: 'cofins', nome: 'COFINS', categoria: 'IMPOSTO_COFINS', orgao: 'Receita Federal (DARF)', diaVencimento: 25 },
  { chave: 'irpj', nome: 'IRPJ', categoria: 'IMPOSTO_IRPJ', orgao: 'Receita Federal (DARF)', diaVencimento: 28 },
  { chave: 'csll', nome: 'CSLL', categoria: 'IMPOSTO_CSLL', orgao: 'Receita Federal (DARF)', diaVencimento: 28 },
  { chave: 'das', nome: 'Simples Nacional (DAS)', categoria: 'IMPOSTO_DAS', orgao: 'Receita Federal (DAS)', diaVencimento: 20 },
];

/** Vencimento no mês seguinte à competência (AAAA-MM), no dia indicado. */
export const vencimentoGuia = (competencia: string, dia: number): string => {
  const [a, m] = competencia.split('-').map(Number);
  const prox = new Date(a, m, 1); // mês seguinte (m já é 1-based)
  const ultimo = new Date(prox.getFullYear(), prox.getMonth() + 1, 0).getDate();
  const d = Math.min(dia, ultimo);
  return `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

/** É uma conta de imposto/tributo? (para o relatório de impostos) */
export const ehContaDeImposto = (c: { categoria?: string; subcategoria?: string; descricao?: string }): boolean =>
  (c.categoria || '').startsWith('IMPOSTO_') ||
  /impost|tribut|reten[cç]/i.test(c.categoria || '') ||
  /\b(icms|fecop|pis|cofins|irpj|csll|das|funrural|inss|iss|darf|dae|gps|ipva|iptu)\b/i.test(`${c.subcategoria || ''} ${c.descricao || ''}`);

/** Nome do tributo de uma conta de imposto. */
export const nomeTributo = (c: { categoria?: string; subcategoria?: string; descricao?: string }): string => {
  const t = `${c.categoria || ''} ${c.subcategoria || ''} ${c.descricao || ''}`;
  const m = t.match(/\b(ICMS|FECOP|PIS|COFINS|IRPJ|CSLL|DAS|FUNRURAL|INSS|ISS|IPVA|IPTU|IRRF)\b/i);
  return m ? m[1].toUpperCase() : (c.subcategoria || c.categoria || 'Outros');
};
