import type { ContaBancaria, ContaPagarReceber, ExtratoBancario } from '../types';

type MovimentoFluxo = NonNullable<ExtratoBancario['lancamentos']>[number];

export type LinhaDemonstrativo = {
  id?: string;
  nome: string;
  valores: number[];
  filhos?: LinhaDemonstrativo[];
};

export function montarFluxoCaixa(
  extrato: ExtratoBancario | undefined,
  bancos: ContaBancaria[],
  ano: string,
  mes: string,
  bancoId: string,
  titulos: ContaPagarReceber[],
  projetado = false,
) {
  const mesesDoAno = Array.from({ length: 12 }, (_, indice) => String(indice + 1).padStart(2, '0'));
  const selecionados = mes === 'TODOS' ? mesesDoAno : mes === 'S1' ? mesesDoAno.slice(0, 6)
    : mes === 'S2' ? mesesDoAno.slice(6) : [mes];
  const periodos = selecionados.map(numero => `${ano}-${numero}`);
  const meses = periodos.map(periodo => ({
    periodo, inicial: 0, saldosCadastrados: 0, entradas: 0, saidas: 0, final: 0, operacional: 0,
    categoriasEntrada: new Map<string, number>(), categoriasSaida: new Map<string, number>()
  }));
  const categoriasEntrada = new Set<string>();
  const categoriasSaida = new Set<string>();
  const porBanco = new Map<string, MovimentoFluxo[]>();
  const titulosPorId = new Map(titulos.map(titulo => [titulo.id, titulo]));
  const realizados = extrato?.lancamentos ?? [];
  const documentosRealizados = new Set(realizados.map(movimento => movimento.documento));
  const previstos: MovimentoFluxo[] = projetado ? titulos.filter(titulo =>
    titulo.status !== 'PAGO' && titulo.status !== 'CANCELADO' && !documentosRealizados.has(titulo.id)
    && periodos.includes(titulo.dataVencimento?.slice(0, 7)),
  ).map(titulo => ({
    id: titulo.id, documento: titulo.id, tipo: titulo.tipo === 'RECEBER' ? 'CREDITO' : 'DEBITO',
    data: titulo.dataVencimento, historico: titulo.descricao, valor: titulo.valor,
    categoria: titulo.categoria, subcategoria: titulo.subcategoria, contaBancariaId: titulo.contaBancariaId,
  })) : [];
  for (const lancamento of [...realizados, ...previstos]) {
    if (typeof lancamento.data !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-\d{2}/.test(lancamento.data)) continue;
    const id = lancamento.contaBancariaId ?? '';
    if (bancoId !== 'TODAS' && id !== bancoId) continue;
    const registros = porBanco.get(id) ?? [];
    registros.push(lancamento);
    porBanco.set(id, registros);
  }

  const ids = new Set([...bancos.filter(banco => bancoId === 'TODAS' || banco.id === bancoId).map(banco => banco.id), ...porBanco.keys()]);
  const saldoLegado = bancos.length === 0 && bancoId === 'TODAS' ? Number(extrato?.saldoInicial) || 0 : 0;
  if (saldoLegado) ids.add('');
  const contas = [...ids].map(id => {
    const banco = bancos.find(item => item.id === id);
    const dataBase = banco?.dataSaldoInicial?.slice(0, 10) || '';
    const saldoBase = Number(banco?.saldoInicial ?? (id === '' ? saldoLegado : 0)) || 0;
    const registros = porBanco.get(id) ?? [];
    const movimentos = registros.filter(lancamento => !dataBase || lancamento.data.slice(0, 10) >= dataBase).sort((a, b) => a.data.localeCompare(b.data));
    const conta = {
      id, nome: banco ? `${banco.banco} · ${banco.agencia}/${banco.conta}` : id || 'Sem conta vinculada',
      inicial: 0, saldosCadastrados: 0, entradas: 0, saidas: 0, operacional: 0, final: 0,
    };
    let saldo = 0;
    let cursor = 0;
    for (const [indice, coluna] of meses.entries()) {
      const mesBase = dataBase.slice(0, 7);
      if (indice === 0 && (!mesBase || mesBase <= coluna.periodo)) saldo += saldoBase;
      while (cursor < movimentos.length && movimentos[cursor].data.slice(0, 7) < coluna.periodo) {
        const lancamento = movimentos[cursor++];
        saldo += (lancamento.tipo === 'CREDITO' ? 1 : -1) * Math.abs(Number(lancamento.valor) || 0);
      }
      coluna.inicial += saldo;
      if (indice === 0) conta.inicial = saldo;
      if (indice > 0 && mesBase === coluna.periodo) {
        coluna.saldosCadastrados += saldoBase;
        conta.saldosCadastrados += saldoBase;
        saldo += saldoBase;
      }
      while (cursor < movimentos.length && movimentos[cursor].data.slice(0, 7) === coluna.periodo) {
        const lancamento = movimentos[cursor++];
        const entrada = lancamento.tipo === 'CREDITO';
        const valor = Math.abs(Number(lancamento.valor) || 0);
        const titulo = titulosPorId.get(lancamento.documento ?? '');
        const categoria = lancamento.subcategoria || titulo?.subcategoria || lancamento.categoria || titulo?.categoria;
        const nome = categoria?.trim().replaceAll('_', ' ') || 'Sem categoria';
        if (!Number.isFinite(valor)) continue;
        const operacional = tipoMovimentoCaixa(nome, entrada).atividade === 'operacional';
        const grupo = entrada ? coluna.categoriasEntrada : coluna.categoriasSaida;
        grupo.set(nome, (grupo.get(nome) ?? 0) + valor);
        if (entrada) {
          categoriasEntrada.add(nome);
          coluna.entradas += valor;
          conta.entradas += valor;
        } else {
          categoriasSaida.add(nome);
          coluna.saidas += valor;
          conta.saidas += valor;
        }
        const variacao = entrada ? valor : -valor;
        saldo += variacao;
        if (operacional) {
          coluna.operacional += variacao;
          conta.operacional += variacao;
        }
      }
      coluna.final += saldo;
      conta.final = saldo;
    }
    return conta;
  });

  const total = contas.reduce((soma, conta) => ({
    inicial: soma.inicial + conta.inicial,
    saldosCadastrados: soma.saldosCadastrados + conta.saldosCadastrados,
    entradas: soma.entradas + conta.entradas,
    saidas: soma.saidas + conta.saidas,
    operacional: soma.operacional + conta.operacional,
    final: soma.final + conta.final,
  }), { inicial: 0, saldosCadastrados: 0, entradas: 0, saidas: 0, operacional: 0, final: 0 });

  return { meses, contas, total, categorias: {
    entradas: [...categoriasEntrada].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    saidas: [...categoriasSaida].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  } };
}

type AtividadeCaixa = 'operacional' | 'investimento' | 'financiamento' | 'ajuste';
interface TipoCaixa {
  nome: string;
  atividade: AtividadeCaixa;
  padrao?: RegExp;
}

export const TIPOS_ENTRADA_CAIXA: TipoCaixa[] = [
  { atividade: 'ajuste', nome: 'Transferências recebidas entre contas', padrao: /transferenc/ },
  { atividade: 'investimento', nome: '(+) Venda de Máquinas, Veículos ou Equipamentos', padrao: /venda.*(maquina|veiculo|equipamento|imobilizado)|alienacao/ },
  { atividade: 'financiamento', nome: '(+) Integralização de Quotas-Partes pelos Cooperados', padrao: /capital social|quota|integralizacao|aporte/ },
  { atividade: 'financiamento', nome: '(+) Liberação de Crédito Rural / Capital de Giro (Pronaf / Bancos)', padrao: /credito rural|capital de giro|emprestimo|financiamento|pronaf/ },
  { atividade: 'operacional', nome: '(+) Recebimento de Vendas Institucionais (PNAE / PAA / Prefeituras)', padrao: /venda.*(pnae|paa|instituc)|chamada publica/ },
  { atividade: 'operacional', nome: '(+) Recebimento de Insumos/Embalagens Vendidos aos Cooperados', padrao: /insumos|embalagens/ },
  { atividade: 'operacional', nome: '(+) Receitas de Prestação de Serviços (Beneficiamento / Frete)', padrao: /servico|beneficiamento|frete|locacao/ },
  { atividade: 'operacional', nome: '(+) Recebimento de Vendas Comerciais (Atacado / Indústria / Feiras)', padrao: /venda|revenda/ },
  { atividade: 'operacional', nome: '(+) Outras Entradas Operacionais', padrao: /taxa administrativa|rendimento|receita financeira/ },
  { atividade: 'ajuste', nome: 'Entradas a classificar' },
];

export const TIPOS_SAIDA_CAIXA: TipoCaixa[] = [
  { atividade: 'ajuste', nome: 'Transferências enviadas entre contas', padrao: /transferenc/ },
  { atividade: 'investimento', nome: '(-) Obras, Ampliação de Silos e Benfeitorias Operacionais', padrao: /obra|ampliacao.*silo|benfeitoria/ },
  { atividade: 'investimento', nome: '(-) Aquisição de Máquinas, Câmaras Frias, Balanças e Benfeitorias', padrao: /imobilizado|aquisicao.*(maquina|maquinario|camara fria|balanca|implemento|equipamento|veiculo)/ },
  { atividade: 'financiamento', nome: '(-) Distribuição de Sobras Líquidas Aprovadas em Assembleia (AGO)', padrao: /distribuicao.*sobra|sobras.*assembleia/ },
  { atividade: 'financiamento', nome: '(-) Devolução de Capital Social a Cooperados Desligados', padrao: /capital social|devolucao.*quota|restituicao de capital/ },
  { atividade: 'financiamento', nome: '(-) Amortização de Empréstimos, Financiamentos e Juros', padrao: /amortizacao|emprestimo|financiamento|pronaf|juros/ },
  { atividade: 'operacional', nome: '(-) Adiantamentos de Safra Concedidos aos Cooperados', padrao: /adiantamento.*(safra|cooperado)/ },
  { atividade: 'operacional', nome: '(-) Pagamento / Repasse da Produção aos Cooperados', padrao: /repasse|produtores rurais|pagamento por producao/ },
  { atividade: 'operacional', nome: '(-) Aquisições de Produtos de Terceiros (Não Cooperados)', padrao: /compra.*revenda|mercadorias para revenda|produtos de terceiros/ },
  { atividade: 'operacional', nome: '(-) Compra de Insumos, Sementes e Embalagens (Fornecedores)', padrao: /insumo|semente|embalagem/ },
  { atividade: 'operacional', nome: '(-) Custos Diretos de Beneficiamento, Armazenagem e Transporte', padrao: /beneficiamento|armazenagem|logistica|frete|transporte|combustivel/ },
  { atividade: 'operacional', nome: '(-) Pagamento de Folha Administrativa, Pró-labore e Encargos', padrao: /pessoal|folha|salario|encargo|pro.labore/ },
  { atividade: 'operacional', nome: '(-) Pagamento de Assistência Técnica (ATER) e Capacitações', padrao: /assistencia tecnica|\bater\b|capacitac/ },
  { atividade: 'operacional', nome: '(-) Pagamento de Tributos e Taxas (Funrural, ICMS, PIS/COFINS, IRPJ/CSLL)', padrao: /imposto|tributo|retenc|funrural|icms|pis|cofins|irpj|csll|\bdas\b/ },
  { atividade: 'operacional', nome: '(-) Despesas Gerais e Administrativas (Energia, Água, Contabilidade)', padrao: /administrativ|aluguel|energia|agua|internet|contabilidade|software|assinatura|tarifa/ },
  { atividade: 'operacional', nome: '(-) Outras Saídas Operacionais', padrao: /compra|fornecedor|revenda|mercadoria/ },
  { atividade: 'ajuste', nome: 'Saídas a classificar' },
];

function tipoMovimentoCaixa(nome: string, entrada: boolean) {
  const tipos = entrada ? TIPOS_ENTRADA_CAIXA : TIPOS_SAIDA_CAIXA;
  const chave = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return tipos.find(tipo => tipo.nome === nome) ?? tipos.find(tipo => tipo.padrao?.test(chave)) ?? tipos[tipos.length - 1];
}

export function linhasDoFluxo(fluxo: ReturnType<typeof montarFluxoCaixa>): LinhaDemonstrativo[] {
  const acumulado = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0);
  const linha = (nome: string, valores: number[], filhos?: LinhaDemonstrativo[], total = acumulado(valores)) =>
    ({ nome, valores: [...valores, total], filhos });
  const tiposDeMovimento = (entrada: boolean, atividade: AtividadeCaixa) => {
    const campo = entrada ? 'categoriasEntrada' : 'categoriasSaida';
    const sinal = entrada ? 1 : -1;
    return (entrada ? TIPOS_ENTRADA_CAIXA : TIPOS_SAIDA_CAIXA).filter(tipo => tipo.atividade === atividade).map(tipo => {
      const filhos = fluxo.categorias[entrada ? 'entradas' : 'saidas'].filter(nome => tipoMovimentoCaixa(nome, entrada) === tipo)
        .map(nome => linha(nome, fluxo.meses.map(mes => sinal * (mes[campo].get(nome) ?? 0))));
      return somarLinhas(tipo.nome, filhos);
    }).filter(rubrica => atividade !== 'ajuste' || rubrica.filhos?.length);
  };
  function somarLinhas(nome: string, linhas: LinhaDemonstrativo[], filhos = linhas) {
    return linha(nome, fluxo.meses.map((_, indice) => linhas.reduce((total, item) => total + item.valores[indice], 0)), filhos);
  }
  const titulo = (nome: string) => ({ nome, valores: [] });
  const entradas = somarLinhas('1.1 (+) Entradas Operacionais', tiposDeMovimento(true, 'operacional'));
  const saidas = somarLinhas('1.2 (-) Saídas Operacionais', tiposDeMovimento(false, 'operacional'));
  const investimentos = [...tiposDeMovimento(true, 'investimento'), ...tiposDeMovimento(false, 'investimento')];
  const financiamentos = [...tiposDeMovimento(true, 'financiamento'), ...tiposDeMovimento(false, 'financiamento')];
  const ajustes = [...tiposDeMovimento(true, 'ajuste'), ...tiposDeMovimento(false, 'ajuste')];
  return [
    linha('(=) SALDO INICIAL DE CAIXA E BANCOS', fluxo.meses.map(m => m.inicial), undefined, fluxo.total.inicial),
    titulo('1. ATIVIDADES OPERACIONAIS'),
    entradas, saidas,
    somarLinhas('(=) GERAÇÃO LÍQUIDA DE CAIXA OPERACIONAL', [entradas, saidas], []),
    titulo('2. ATIVIDADES DE INVESTIMENTO'),
    ...investimentos,
    somarLinhas('(=) FLUXO DE CAIXA DE INVESTIMENTOS', investimentos, []),
    titulo('3. ATIVIDADES DE FINANCIAMENTO E CAPITAL SOCIAL'),
    ...financiamentos,
    somarLinhas('(=) FLUXO DE CAIXA DE FINANCIAMENTOS', financiamentos, []),
    ...ajustes,
    linha('(=) VARIAÇÃO LÍQUIDA DE CAIXA NO PERÍODO', fluxo.meses.map(m => m.entradas - m.saidas)),
    ...(fluxo.total.saldosCadastrados || fluxo.meses.some(m => m.saldosCadastrados)
      ? [linha('Saldos cadastrados no período', fluxo.meses.map(m => m.saldosCadastrados))] : []),
    linha('(=) SALDO FINAL DE CAIXA E BANCOS', fluxo.meses.map(m => m.final), undefined, fluxo.total.final),
  ];
}

export function tipoAtividadeCaixa(fluxo: ReturnType<typeof montarFluxoCaixa>, atividade: AtividadeCaixa) {
  const total = (entrada: boolean) => fluxo.meses.reduce((acumulado, mes) => acumulado
    + [...(entrada ? mes.categoriasEntrada : mes.categoriasSaida)]
      .filter(([nome]) => tipoMovimentoCaixa(nome, entrada).atividade === atividade)
      .reduce((subtotal, [, valor]) => subtotal + valor, 0), 0);
  const entradas = total(true);
  const saidas = total(false);
  return { entradas, saidas, liquido: entradas - saidas };
}
