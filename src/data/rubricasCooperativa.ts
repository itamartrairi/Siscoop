import type { ContaPagarReceber, LancamentoContabil, PlanoContaContabil } from '../types';

export const rubricasResultado = {
  comercial: '(+) Venda de Produção dos Cooperados',
  vendasTerceiros: '(+) Venda de Mercadorias a Terceiros',
  institucional: '(+) Venda de Produção dos Cooperados (PNAE / PAA)',
  insumos: '(+) Fornecimento de Insumos aos Cooperados',
  servicos: '(+) Prestação de Serviços (Armazenagem, Secagem e Beneficiamento)',
  outrasReceitas: '(+) Outras Receitas Operacionais',
  devolucoes: '(-) Devoluções e Abatimentos sobre Vendas',
  impostos: '(-) Impostos e Contribuições sobre Vendas (ICMS, PIS, COFINS, Funrural)',
  repasse: '(-) Repasse de Produção Vendida aos Cooperados',
  terceiros: '(-) Custo das Mercadorias Vendidas a Terceiros (CMV)',
  custoInsumos: '(-) Custo dos Insumos Fornecidos',
  custosDiretos: '(-) Custos Diretos de Beneficiamento, Armazenagem e Embalagem',
  administrativas: '(-) Dispêndios / Despesas Administrativas e Gerais',
  pessoal: '(-) Dispêndios / Despesas com Pessoal e Encargos Sociais',
  comuns: '(-) Dispêndios / Despesas Administrativas e Gerais (Rateio)',
  assembleias: '(-) Dispêndios com Assembleias e Conselhos',
  comerciais: '(-) Despesas Comerciais e Logísticas (Fretes, Comissões, Feiras)',
  ater: '(-) Assistência Técnica e Extensão Rural (ATER)',
  depreciacao: '(-) Depreciação e Amortização de Máquinas e Galpões',
  receitasFinanceiras: '(+) Receitas Financeiras (Rendimentos de Aplicações, Juros Recebidos)',
  despesasFinanceiras: '(-) Despesas Financeiras (Tarifas Bancárias, Juros de Financiamentos/Pronaf)',
  naoOperacional: '(+/-) Outras Receitas e Despesas Não Operacionais',
  tributosLucro: '(-) Provisão para IRPJ e CSLL',
  outros: '(+/-) Outras Contas de Resultado',
};

type Rubrica = keyof typeof rubricasResultado;
type Valores = [number, number];
export type RegimeResultado = 'competencia' | 'caixa';

// As contas novas ficam nas famílias já utilizadas pelos lançamentos e balancetes.
export const contasRubricas: [string, string, Rubrica][] = [
  ['31901.0070', 'Salários, Ordenados e Encargos Administrativos Comuns', 'comuns'],
  ['31901.0071', 'Energia Elétrica, Água e Telecomunicações Comuns', 'comuns'],
  ['31901.0072', 'Serviços Contábeis, Auditoria e Jurídico Comuns', 'comuns'],
  ['31901.0073', 'Outras Despesas Administrativas Comuns', 'comuns'],
  ['31901.0099', '(-) Transferência de Rateio para Atos Não Cooperativos', 'comuns'],
  ['35901.0073', 'Despesas Administrativas Recebidas por Rateio', 'comuns'],
  ['31901.0074', 'Dispêndios com Assembleias e Conselhos', 'assembleias'],
  ['35902.0001', 'Comissões sobre Vendas a Terceiros', 'comerciais'],
  ['31101.0010', 'Vendas Institucionais (PNAE / PAA)', 'institucional'],
  ['35101.0011', 'Fornecimento de Insumos e Embalagens – Ato Não Cooperativo', 'insumos'],
  ['35601.0010', 'Custo dos Insumos Fornecidos – Ato Não Cooperativo', 'custoInsumos'],
  ['35901.0060', 'Depreciações e Amortizações – Ato Não Cooperativo', 'depreciacao'],
  ['31101.0011', 'Fornecimento de Insumos e Embalagens aos Cooperados', 'insumos'],
  ['31103.0010', 'Serviços Técnicos e Beneficiamento – Ato Cooperativo', 'servicos'],
  ['35103.0010', 'Serviços Técnicos e Beneficiamento – Ato Não Cooperativo', 'servicos'],
  ['31903.0040', 'Devoluções e Abatimentos sobre Vendas – Ato Cooperativo', 'devolucoes'],
  ['35903.0040', 'Devoluções e Abatimentos sobre Vendas – Ato Não Cooperativo', 'devolucoes'],
  ['31903.0041', 'Impostos e Contribuições sobre Vendas – Ato Cooperativo', 'impostos'],
  ['31601.0010', 'Custo dos Insumos Fornecidos', 'custoInsumos'],
  ['31601.0011', 'Custos Diretos de Beneficiamento e Armazenagem – Ato Cooperativo', 'custosDiretos'],
  ['35601.0011', 'Custos Diretos de Beneficiamento e Armazenagem – Ato Não Cooperativo', 'custosDiretos'],
  ['31901.0047', 'Assistência Técnica e Extensão Rural (ATER)', 'ater'],
  ['31901.0061', 'Pró-labore e Gestão', 'administrativas'],
  ['31904.0020', 'Tarifas Bancárias e IOF – Ato Cooperativo', 'despesasFinanceiras'],
  ['31904.0025', 'Juros Pagos – Ato Cooperativo', 'despesasFinanceiras'],
  ['31301.0010', 'Receitas Financeiras – Ato Cooperativo', 'receitasFinanceiras'],
];

const rubricaPorConta = new Map(contasRubricas.map(([codigo, , rubrica]) => [codigo, rubrica]));
const semAcentos = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll('_', ' ');

function classificarConta(codigo: string, conta?: PlanoContaContabil): Rubrica {
  const direta = rubricaPorConta.get(codigo);
  if (direta) return direta;
  if (/^35903\.000[56]$/.test(codigo)) return 'tributosLucro';
  if (/^35903\.000[1-4]$/.test(codigo)) return 'impostos';
  if (codigo.startsWith('35101')) return 'vendasTerceiros';
  if (codigo.startsWith('31101')) return 'comercial';
  if (/^3[15]1/.test(codigo)) return 'outrasReceitas';
  if (/^3[15]3/.test(codigo)) return 'receitasFinanceiras';
  if (codigo.startsWith('316')) return 'repasse';
  if (codigo.startsWith('356')) return 'terceiros';
  if (codigo.startsWith('357')) return 'naoOperacional';
  if (/^3[15]904/.test(codigo)) return 'despesasFinanceiras';
  if (/^3[15]902/.test(codigo) || /^(319|359)01\.0019$/.test(codigo)) return 'comerciais';
  if (/^3[15]901\.0060$/.test(codigo)) return 'depreciacao';
  if (/^31901\.(0001|0014|030[159]|0061)$/.test(codigo)) return 'pessoal';
  if (/^3[15]9/.test(codigo)) return 'administrativas';
  if (conta?.tipo === 'RECEITA') return 'outrasReceitas';
  if (conta?.tipo === 'CUSTO') return 'custosDiretos';
  if (conta?.tipo === 'DESPESA') return 'administrativas';
  return 'outros';
}

/** Referência ao plano do modelo para as contas analíticas do Siscoop. */
export function codigoDoModelo(conta: PlanoContaContabil): string {
  const patrimoniais: Record<string, string> = {
    '24201.1000': '3.5.2.01', '24401.0001': '3.5.2.02',
    '21901.0010': '3.5.2.03', '24201.1001': '3.5.2.04',
  };
  if (patrimoniais[conta.codigo]) return patrimoniais[conta.codigo];
  if (conta.codigo === '31901.0099') return '3.3.3.99';
  if (conta.codigo === '35901.0073') return '3.3.2';
  if (!conta.aceitaLancamento || !['RECEITA', 'CUSTO', 'DESPESA'].includes(conta.tipo)) return '';
  const nc = conta.atoCooperativo === 'NAO_COOPERATIVO';
  const referencias: Partial<Record<Rubrica, string>> = {
    comercial: '3.1.1.01', institucional: '3.1.1.01', insumos: nc ? '3.1.2' : '3.1.1.02',
    servicos: nc ? '3.1.2.02' : '3.1.1.03', vendasTerceiros: '3.1.2.01',
    outrasReceitas: nc ? '3.1.2' : '3.1.1',
    devolucoes: nc ? '3.1.3' : '3.1.3.01', impostos: nc ? '3.1.3.03' : '3.1.3.02',
    repasse: '3.2.1.01', terceiros: '3.2.2.01', custoInsumos: nc ? '3.2.2' : '3.2.1.02',
    custosDiretos: nc ? '3.2.2' : '3.2.1.03',
    ater: '3.3.1.01', assembleias: '3.3.1.02',
    administrativas: nc ? '3.3.2' : '3.3.1', pessoal: nc ? '3.3.2' : '3.3.1',
    comerciais: conta.codigo === '35902.0001' ? '3.3.2.01' : nc ? '3.3.2' : '3.3.1',
    comuns: ({ '31901.0070': '3.3.3.01', '31901.0071': '3.3.3.02',
      '31901.0072': '3.3.3.03' } as Record<string, string>)[conta.codigo] ?? '3.3.3',
    depreciacao: nc ? '3.3.2' : '3.3.1',
    receitasFinanceiras: nc ? '3.4.1.02' : '3.4.1.01', despesasFinanceiras: '3.4.2.01',
    tributosLucro: conta.codigo === '35903.0005' ? '3.5.1.01' : '3.5.1.02',
  };
  return referencias[classificarConta(conta.codigo, conta)] ?? '';
}

export function rubricaDaConta(conta: PlanoContaContabil) {
  if (!conta.aceitaLancamento || !['RECEITA', 'CUSTO', 'DESPESA'].includes(conta.tipo)) return '';
  return rubricasResultado[classificarConta(conta.codigo, conta)].replace(/^\([+/-]+\) /, '');
}

const somar = (...valores: Valores[]): Valores => valores.reduce<Valores>(
  ([coop, nc], [a, b]) => [coop + a, nc + b], [0, 0],
);

export function montarResultadoCooperativa(
  plano: PlanoContaContabil[],
  lancamentos: LancamentoContabil[],
  titulos: ContaPagarReceber[],
  inicio: string,
  fim: string,
  regime: RegimeResultado,
  simularTributos = false,
  percentualOutrosFundos = 0,
) {
  const planoPorCodigo = new Map(plano.map(conta => [conta.codigo, conta]));
  const titulosPorId = new Map(titulos.map(titulo => [titulo.id, titulo]));
  const saldos = new Map<Rubrica, Valores>();
  const semAto = new Set<string>();
  let fundosEstatutarios = 0;
  let rateioContabilizado = 0;
  const ehCaixa = (codigo: string) => /^1110[12]/.test(codigo);
  const acumular = (codigo: string, centavos: number) => {
    const conta = planoPorCodigo.get(codigo);
    const ato = codigo.startsWith('31') ? 0 : codigo.startsWith('35') ? 1
      : conta?.atoCooperativo === 'COOPERATIVO' ? 0 : conta?.atoCooperativo === 'NAO_COOPERATIVO' ? 1 : undefined;
    if (conta ? !['RECEITA', 'DESPESA', 'CUSTO'].includes(conta.tipo) : !codigo.startsWith('3')) return;
    if (ato === undefined) {
      semAto.add(codigo);
      return;
    }
    const rubrica = classificarConta(codigo, conta);
    const saldo = saldos.get(rubrica) ?? [0, 0];
    saldo[ato] += centavos;
    saldos.set(rubrica, saldo);
  };

  if (inicio && fim && inicio <= fim) for (const lancamento of lancamentos) {
    const debito = lancamento.contaDebitoCodigo || lancamento.contaDebito || '';
    const credito = lancamento.contaCreditoCodigo || lancamento.contaCredito || '';
    const titulo = titulosPorId.get(lancamento.documentoRef ?? '');
    if (titulo?.status === 'CANCELADO') continue;
    const dataContabil = lancamento.data?.slice(0, 10) || '';
    const data = regime === 'caixa' && titulo ? titulo.dataPagamento?.slice(0, 10) : dataContabil;
    if (!data || data < inicio || data > fim) continue;
    const centavos = Math.round(Number(lancamento.valor) * 100);
    if (!Number.isFinite(centavos)) continue;
    if (regime === 'competencia' && /^24501\./.test(debito) && credito === '24201.1001') fundosEstatutarios += centavos;
    if (regime === 'competencia' && /^24501\./.test(credito) && debito === '24201.1001') fundosEstatutarios -= centavos;
    if (regime === 'competencia') {
      if (debito === '35901.0073' && credito === '31901.0099') rateioContabilizado += centavos;
      if (debito === '31901.0099' && credito === '35901.0073') rateioContabilizado -= centavos;
    }
    if (regime === 'caixa' && (titulo ? titulo.status !== 'PAGO' : !ehCaixa(debito) && !ehCaixa(credito))) continue;
    const estoquePago = regime === 'caixa' && titulo?.tipo === 'PAGAR'
      ? debito === '11501.0010' ? '31601.0010' : debito === '11504.0099' ? '35601.0009' : debito
      : debito;
    const repasseLegado = debito === '31101.0009' && lancamento.historico?.startsWith('Pedido de Produtos ')
      ? '31601.0009' : estoquePago;
    const receitaInstitucional = credito === '31101.0009' &&
      (titulo?.subcategoria === 'Venda PNAE/PAA' || lancamento.historico?.startsWith('Entrega de Alimentos PNAE'))
      ? '31101.0010' : credito;
    acumular(repasseLegado, -centavos);
    acumular(receitaInstitucional, centavos);
  }

  const valor = (rubrica: Rubrica): Valores => saldos.get(rubrica) ?? [0, 0];
  const receitas = ['comercial', 'institucional', 'vendasTerceiros', 'insumos', 'servicos', 'outrasReceitas'] as const;
  const deducoes = ['devolucoes', 'impostos'] as const;
  const custos = ['repasse', 'terceiros', 'custoInsumos', 'custosDiretos'] as const;
  const despesas = ['comerciais', 'administrativas', 'comuns', 'pessoal', 'ater', 'assembleias', 'depreciacao', 'naoOperacional', 'outros'] as const;
  const financeiro = ['receitasFinanceiras', 'despesasFinanceiras'] as const;
  const totalizar = (rubricas: readonly Rubrica[]) => somar(...rubricas.map(valor));
  const receitaBruta = totalizar(receitas);
  const baseRateio = Math.max(0, receitaBruta[0]) + Math.max(0, receitaBruta[1]);
  const rateioNaoCooperativo = baseRateio ? Math.max(0, receitaBruta[1]) / baseRateio : 0;
  const despesasComuns = valor('comuns')[0];
  const parcelaNaoCooperativa = rateioContabilizado ? 0 : Math.round(despesasComuns * rateioNaoCooperativo);
  saldos.set('comuns', [despesasComuns - parcelaNaoCooperativa, valor('comuns')[1] + parcelaNaoCooperativa]);
  const receitaLiquida = somar(receitaBruta, totalizar(deducoes));
  const margemBruta = somar(receitaLiquida, totalizar(custos));
  const antesTributos = somar(margemBruta, totalizar(despesas), totalizar(financeiro));
  const tributos = valor('tributosLucro');
  const provisaoSimulada = simularTributos && regime === 'competencia' && tributos[1] === 0;
  const provisao: Valores = provisaoSimulada ? [tributos[0], -Math.round(Math.max(0, antesTributos[1]) * 0.34)] : tributos;
  const resultado = somar(antesTributos, provisao);
  const base = Math.max(0, resultado[0]);
  const reserva: Valores = [-Math.round(base * 0.10), 0];
  const fates: Valores = [-Math.round(base * 0.05), -Math.max(0, resultado[1])];
  const estatutarios: Valores = [-(fundosEstatutarios || Math.round(base * percentualOutrosFundos / 100)), 0];

  const linha = (rotulo: string, valores: Valores | null, detalhe = false, inaplicaveis: number[] = []) => ({
    rotulo, detalhe, valores: valores ? [
      inaplicaveis.includes(0) && !valores[0] ? null : valores[0] / 100,
      inaplicaveis.includes(1) && !valores[1] ? null : valores[1] / 100,
      (valores[0] + valores[1]) / 100,
    ] : [null, null, null],
  });
  const detalhes = (rubricas: readonly Rubrica[]) => rubricas
    .filter(rubrica => !['outrasReceitas', 'outros', 'naoOperacional'].includes(rubrica) || valor(rubrica).some(Boolean))
    .map(rubrica => linha(rubricasResultado[rubrica], valor(rubrica), true,
      ['comercial', 'institucional', 'repasse', 'ater', 'assembleias'].includes(rubrica) ? [1]
        : ['vendasTerceiros', 'terceiros', 'tributosLucro'].includes(rubrica) ? [0] : []));

  const linhas = [
    linha('1. INGRESSOS / RECEITAS OPERACIONAIS BRUTAS', receitaBruta), ...detalhes(receitas),
    linha('2. (-) DEDUÇÕES DOS INGRESSOS / RECEITAS', totalizar(deducoes)), ...detalhes(deducoes),
    linha('3. INGRESSOS / RECEITAS OPERACIONAIS LÍQUIDAS', receitaLiquida),
    linha('4. (-) DISPÊNDIOS / CUSTOS OPERACIONAIS', totalizar(custos)), ...detalhes(custos),
    linha('5. SOBRAS / LUCRO BRUTO', margemBruta),
    linha('6. (-) DISPÊNDIOS / DESPESAS OPERACIONAIS', totalizar(despesas)), ...detalhes(despesas),
    linha('7. RESULTADO FINANCEIRO LÍQUIDO', totalizar(financeiro)), ...detalhes(financeiro),
    linha('8. SOBRAS / LUCRO ANTES DOS TRIBUTOS', antesTributos), linha(provisaoSimulada ? '(-) Provisão estimada para IRPJ e CSLL (34%)' : rubricasResultado.tributosLucro, provisao, true, [0]),
    linha('9. SOBRAS / LUCRO LÍQUIDO DO EXERCÍCIO', resultado),
  ];
  if (regime === 'competencia') {
    const destinacoes = somar(reserva, fates, estatutarios);
    const saldo = somar(resultado, destinacoes);
    linhas.push(
      linha('10. DESTINAÇÕES LEGAIS E ESTATUTÁRIAS', destinacoes),
      linha('(-) Fundo de Reserva (mínimo 10% sobre as Sobras Líquidas)', reserva, true, [1]),
      linha('(-) FATES – Fundo de Assistência Técnica, Educacional e Social', fates, true),
      linha('(-) Outros Fundos Estatutários', estatutarios, true, [1]),
      linha(saldo.some(v => v < 0) ? '11. (=) SALDO A DESTINAR OU PERDAS A COBRIR'
        : '11. SOBRAS LÍQUIDAS À DISPOSIÇÃO DA ASSEMBLEIA GERAL', saldo, false, [1]),
    );
  }
  const total = (valores: Valores) => (valores[0] + valores[1]) / 100;
  return {
    linhas, despesasComunsSemBase: despesasComuns !== 0 && baseRateio === 0 && rateioContabilizado === 0, semAto: [...semAto], resultado: total(resultado), receitaBruta: total(receitaBruta),
    receitaLiquida: total(receitaLiquida), custosDespesas: -total(somar(totalizar(custos), totalizar(despesas))),
    depreciacao: -total(valor('depreciacao')), reservas: -total(somar(reserva, fates)),
    reserva: -total(reserva), fates: -total(fates),
  };
}

export function contaResultadoPorSubcategoria(subcategoria?: string): string | undefined {
  switch (semAcentos(subcategoria ?? '')) {
    case 'despesas administrativas comuns': return '31901.0073';
    case 'pessoal administrativo comum': return '31901.0070';
    case 'energia, agua e telecomunicacoes comuns': return '31901.0071';
    case 'contabilidade, auditoria e juridico comuns': return '31901.0072';
    case 'assembleias e conselhos': return '31901.0074';
    case 'comissoes sobre vendas a terceiros': return '35902.0001';
    case 'venda de mercadorias a terceiros': return '35101.0009';
    case 'rendimentos de aplicacoes financeiras': return '35301.0010';
    case 'juros recebidos de cooperados': return '31301.0010';
    case 'venda pnae/paa': return '31101.0010';
    case 'insumos e embalagens vendidos aos cooperados': return '31101.0011';
    case 'locacao de maquinas':
    case 'servicos tecnicos e beneficiamento': return '31103.0010';
    case 'servicos a nao cooperados': return '35103.0010';
    case 'assistencia tecnica (ater)': return '31901.0047';
    case 'custos diretos de beneficiamento': return '31601.0011';
    case 'salarios e encargos': return '31901.0001';
    case 'vale transporte / alimentacao': return '31901.0014';
    case 'aluguel': return '31901.0009';
    case 'agua / energia / internet': return '31901.0012';
    case 'software e assinaturas': return '31901.0010';
    case 'combustivel': return '31901.0016';
    case 'manutencao de veiculos': return '31901.0017';
    case 'compra de insumos e materiais':
    case 'compras de insumos e materiais': return '31601.0010';
    case 'funrural': return '31903.0041';
    case 'pro-labore e gestao': return '31901.0061';
    case 'frete e transporte': return '31901.0019';
    default: return undefined;
  }
}
