import { formatarData } from '../utils/dateHelpers';
import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  CircleDollarSign,
  Plus,
  Landmark,
  BarChart3,
  FileText,
  Pencil,
  Trash2,
  X,
  TrendingUp,
  WalletCards,
  Scale,
  PieChart as PieChartIcon,
  Printer
} from 'lucide-react';
import { ContaPagarReceber } from '../types';
import { playActionCompleteSound } from '../utils/actionSound';
import jsPDF from 'jspdf';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

// Presets de Categoria/Subcategoria de despesas e receitas, cada um já
// classificado como Fixa (se repete todo mês com valor estável) ou
// Variável (depende do volume de produção/vendas do mês). Selecionar um
// preset preenche os três campos de uma vez, mas a classificação continua
// editável manualmente se o caso for atípico.
const CATEGORIAS_FINANCEIRAS: { categoria: string; subcategoria: string; classificacao: 'FIXA' | 'VARIAVEL' }[] = [
  { categoria: 'Fornecedores e Insumos', subcategoria: 'Produtores Rurais (Pagamento por Produção)', classificacao: 'VARIAVEL' },
  { categoria: 'Fornecedores e Insumos', subcategoria: 'Compras de Insumos e Materiais', classificacao: 'VARIAVEL' },
  { categoria: 'Pessoal', subcategoria: 'Salários e Encargos', classificacao: 'FIXA' },
  { categoria: 'Pessoal', subcategoria: 'Vale Transporte / Alimentação', classificacao: 'FIXA' },
  { categoria: 'Impostos e Contribuições', subcategoria: 'FUNRURAL', classificacao: 'VARIAVEL' },
  { categoria: 'Impostos e Contribuições', subcategoria: 'Impostos Federais/Estaduais', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Aluguel', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Água / Energia / Internet', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Software e Assinaturas', classificacao: 'FIXA' },
  { categoria: 'Logística', subcategoria: 'Combustível', classificacao: 'VARIAVEL' },
  { categoria: 'Logística', subcategoria: 'Manutenção de Veículos', classificacao: 'VARIAVEL' },
  { categoria: 'Logística', subcategoria: 'Frete e Transporte', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Venda PNAE/PAA', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Taxa Administrativa', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Capital Social', classificacao: 'FIXA' },
  { categoria: 'Outros', subcategoria: 'Diversos', classificacao: 'VARIAVEL' }
];

export const SisFinView: React.FC = () => {
  const {
    contasPagarReceber,
    addContaPagarReceber,
    updateContaPagarReceber,
    deleteContaPagarReceber,
    pagarReceberConta,
    extratoBancario,
    addLancamentoExtrato,
    estoque,
    movimentacoesEstoque,
    lancamentosContabeis,
    planoContas,
    canWriteModule
  } = useCoop();

  const canWrite = canWriteModule('sisfin');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'dre' | 'fluxo' | 'contas' | 'estoque' | 'custos' | 'extrato' | 'balanco'>('dashboard');
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [filtroConta, setFiltroConta] = useState('TODAS');
  const [fluxoAnoCompleto, setFluxoAnoCompleto] = useState(true);

  // Modals & Editing
  const [showModal, setShowModal] = useState(false);
  const [showExtratoModal, setShowExtratoModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagarReceber | null>(null);

  const [extratoForm, setExtratoForm] = useState({
    data: new Date().toISOString().split('T')[0],
    historico: 'Depósito de Venda PAA / Repasse Banco do Brasil',
    documento: `PIX-${Date.now().toString().slice(-6)}`,
    tipo: 'CREDITO' as 'CREDITO' | 'DEBITO',
    valor: 2500,
    categoria: 'RECEITA_VENDA'
  });

  const [contaForm, setContaForm] = useState({
    tipo: 'PAGAR' as 'PAGAR' | 'RECEBER',
    descricao: '',
    pessoaNome: '',
    valor: 1500,
    dataVencimento: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    categoria: 'FORNECEDOR' as any,
    subcategoria: '',
    classificacaoDespesa: 'VARIAVEL' as 'FIXA' | 'VARIAVEL',
    status: 'PENDENTE' as any
  });

  const handleOpenModal = (c?: ContaPagarReceber) => {
        if (!canWrite) { blockWriteAction(); return; }
if (c) {
      setEditingConta(c);
      setContaForm({
        tipo: c.tipo,
        descricao: c.descricao,
        pessoaNome: c.pessoaNome,
        valor: c.valor,
        dataVencimento: c.dataVencimento,
        categoria: c.categoria,
        subcategoria: c.subcategoria || '',
        classificacaoDespesa: c.classificacaoDespesa || 'VARIAVEL',
        status: c.status
      });
    } else {
      setEditingConta(null);
      setContaForm({
        tipo: 'PAGAR',
        descricao: '',
        pessoaNome: '',
        valor: 1500,
        dataVencimento: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        categoria: 'FORNECEDOR',
        subcategoria: '',
        classificacaoDespesa: 'VARIAVEL',
        status: 'PENDENTE'
      });
    }
    setShowModal(true);
  };

  const handleSaveConta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!contaForm.descricao || !contaForm.valor) return;
    if (editingConta) {
      updateContaPagarReceber(editingConta.id, contaForm);
    } else {
      addContaPagarReceber(contaForm);
    }
    setShowModal(false);
    playActionCompleteSound();
  };

  const handleSaveExtrato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!extratoForm.historico || !extratoForm.valor) return;
    addLancamentoExtrato(extratoForm);
    setShowExtratoModal(false);
    setExtratoForm({
      data: new Date().toISOString().split('T')[0],
      historico: '',
      documento: `PIX-${Date.now().toString().slice(-6)}`,
      tipo: 'CREDITO',
      valor: 1000,
      categoria: 'RECEITA_VENDA'
    });
  };

  const dataNoPeriodo = (data?: string) => {
    if (!data) return false;
    const anoOk = filtroAno === 'TODAS' || data.startsWith(filtroAno);
    const mesOk = filtroMes === 'TODOS' || data.slice(5, 7) === filtroMes;
    return anoOk && mesOk;
  };
  const chaveMesAno = `${filtroAno}-${filtroMes}`;
  const contasDoPeriodo = contasPagarReceber.filter(c => dataNoPeriodo(c.dataEmissao || c.dataVencimento));
  const extratoDoPeriodo = (extratoBancario?.lancamentos || []).filter(l => dataNoPeriodo(l.data));
  const periodoPagar = contasDoPeriodo.filter(c => c.tipo === 'PAGAR').reduce((sum, c) => sum + (c.valor || 0), 0);
  const periodoReceber = contasDoPeriodo.filter(c => c.tipo === 'RECEBER').reduce((sum, c) => sum + (c.valor || 0), 0);
  const periodoPago = contasDoPeriodo.filter(c => c.tipo === 'PAGAR' && c.status === 'PAGO').reduce((sum, c) => sum + (c.valor || 0), 0);
  const periodoRecebido = contasDoPeriodo.filter(c => c.tipo === 'RECEBER' && c.status === 'PAGO').reduce((sum, c) => sum + (c.valor || 0), 0);
  const periodoEntradas = extratoDoPeriodo.filter(l => l.tipo === 'CREDITO').reduce((sum, l) => sum + (l.valor || 0), 0);
  const periodoSaidas = extratoDoPeriodo.filter(l => l.tipo === 'DEBITO').reduce((sum, l) => sum + (l.valor || 0), 0);
  const categoriasFinanceiras = Array.from(new Set(contasPagarReceber.map(c => c.categoria).filter(Boolean))) as string[];
  const contasFinanceiras = Array.from(new Set(contasPagarReceber.map(c => c.centroCusto || c.categoria).filter(Boolean))) as string[];
  const contasFiltradas = contasDoPeriodo.filter(c =>
    (filtroCategoria === 'TODAS' || c.categoria === filtroCategoria) &&
    (filtroConta === 'TODAS' || (c.centroCusto || c.categoria) === filtroConta)
  );
  const totalContasReceber = contasFiltradas.filter(c => c.tipo === 'RECEBER' && c.status !== 'CANCELADO').reduce((sum, c) => sum + c.valor, 0);
  const totalContasPagar = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.status !== 'CANCELADO').reduce((sum, c) => sum + c.valor, 0);

  // DRE Empresarial Completo
  const dreReceitaBruta = totalContasReceber;
  const dreDeducoes = Math.round(dreReceitaBruta * 0.0565 * 100) / 100; // Impostos e retenções sobre vendas (ex: ICMS/PIS/COFINS/Devoluções ~5.65%)
  const dreReceitaLiquida = Math.max(0, dreReceitaBruta - dreDeducoes);
  const dreCpv = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.classificacaoDespesa !== 'FIXA').reduce((sum, c) => sum + c.valor, 0);
  const dreLucroBruto = dreReceitaLiquida - dreCpv;
  const dreDespesasAdm = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.classificacaoDespesa === 'FIXA').reduce((sum, c) => sum + c.valor, 0);
  const dreEbitda = dreLucroBruto - dreDespesasAdm;
  const dreReceitasFin = (extratoDoPeriodo || []).filter(l => l.tipo === 'CREDITO' && (l.descricao?.toLowerCase().includes('rendimento') || l.descricao?.toLowerCase().includes('juros'))).reduce((s, l) => s + (l.valor || 0), 0);
  const dreDespesasFin = (extratoDoPeriodo || []).filter(l => l.tipo === 'DEBITO' && (l.descricao?.toLowerCase().includes('tarifa') || l.descricao?.toLowerCase().includes('juros') || l.descricao?.toLowerCase().includes('iof'))).reduce((s, l) => s + (l.valor || 0), 0) || (contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.categoria === 'FINANCEIRA').reduce((s, c) => s + c.valor, 0));
  const dreResultadoFin = dreReceitasFin - dreDespesasFin;
  const dreLair = dreEbitda + dreResultadoFin;
  const dreProvisaoTributos = dreLair > 0 ? Math.round(dreLair * 0.15 * 100) / 100 : 0;
  const dreResultadoLiquido = dreLair - dreProvisaoTributos;
    const receitasDre = contasFiltradas.filter(c => c.tipo === 'RECEBER' && c.status !== 'CANCELADO').reduce((sum, c) => sum + c.valor, 0);
  const despesasDre = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.status !== 'CANCELADO').reduce((sum, c) => sum + c.valor, 0);
  const custosFixos = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.classificacaoDespesa === 'FIXA').reduce((sum, c) => sum + c.valor, 0);
  const custosVariaveis = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.classificacaoDespesa !== 'FIXA').reduce((sum, c) => sum + c.valor, 0);
  const valorEstoque = estoque.reduce((sum, item) => sum + (item.quantidadeAtual || 0) * (item.valorUnitarioMedio || 0), 0);
  const itensEstoqueBaixo = estoque.filter(item => item.quantidadeAtual <= (item.quantidadeMinima ?? item.estoqueMinimo ?? 0));

  const mesesAno = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
  const fluxoAnual = mesesAno.map(mes => {
    const contasMes = contasPagarReceber.filter(c => {
      const data = c.dataEmissao || c.dataVencimento || '';
      return (filtroAno === 'TODAS' || data.startsWith(filtroAno)) && data.slice(5, 7) === mes;
    });
    const extratoMes = (extratoBancario?.lancamentos || []).filter(l => (filtroAno === 'TODAS' || l.data.startsWith(filtroAno)) && l.data.slice(5, 7) === mes);
    return {
      mes: `${mes}/${filtroAno === 'TODAS' ? 'Todos' : filtroAno.slice(-2)}`,
      entradas: extratoMes.filter(l => l.tipo === 'CREDITO').reduce((s, l) => s + l.valor, 0),
      saidas: extratoMes.filter(l => l.tipo === 'DEBITO').reduce((s, l) => s + l.valor, 0),
      receber: contasMes.filter(c => c.tipo === 'RECEBER' && c.status !== 'CANCELADO').reduce((s, c) => s + c.valor, 0),
      pagar: contasMes.filter(c => c.tipo === 'PAGAR' && c.status !== 'CANCELADO').reduce((s, c) => s + c.valor, 0)
    };
  });
  const lancamentosContabeisPeriodo = lancamentosContabeis.filter(l => l.data.startsWith(chaveMesAno));
  const balanceteContas = planoContas.filter(conta => conta.ativo !== false).map(conta => {
    const movimentos = lancamentosContabeisPeriodo.filter(l => l.contaDebitoCodigo === conta.codigo || l.contaCreditoCodigo === conta.codigo);
    const debitos = movimentos.filter(l => l.contaDebitoCodigo === conta.codigo).reduce((s, l) => s + l.valor, 0);
    const creditos = movimentos.filter(l => l.contaCreditoCodigo === conta.codigo).reduce((s, l) => s + l.valor, 0);
    const saldo = conta.natureza === 'DEVEDORA' ? debitos - creditos : creditos - debitos;
    return { ...conta, debitos, creditos, saldoDevedor: saldo > 0 && conta.natureza === 'DEVEDORA' ? saldo : 0, saldoCredor: saldo > 0 && conta.natureza === 'CREDORA' ? saldo : 0 };
  }).filter(conta => conta.debitos || conta.creditos || conta.tipoConta === 'SINTETICA');
  const totalBalanceteDebitos = balanceteContas.reduce((s, c) => s + c.debitos, 0);
  const totalBalanceteCreditos = balanceteContas.reduce((s, c) => s + c.creditos, 0);
  const contasFluxo = Array.from(new Set([
    'Caixa', 'Bancos – Conta Movimento', 'Aplicações Financeiras', 'Contas a Receber de Cooperados', 'Contas a Receber de Terceiros', 'Fornecedores', 'Obrigações com Cooperados', 'Salários e Encargos a Pagar', 'Impostos e Contribuições a Recolher', 'Empréstimos e Financiamentos', 'Receita de Vendas', 'Receita de Serviços', 'Receita de Operações com Cooperados', 'Receita de Operações com Não Cooperados', 'Compras de Mercadorias', 'Custo dos Produtos Vendidos', 'Despesas Administrativas', 'Despesas com Pessoal', 'Despesas Financeiras', 'Despesas Operacionais', ...categoriasFinanceiras
  ]));
  const anosDisponiveis = Array.from(new Set([
    String(new Date().getFullYear()),
    ...contasPagarReceber.map(c => (c.dataEmissao || c.dataVencimento || '').slice(0, 4)),
    ...(extratoBancario?.lancamentos || []).map(l => l.data.slice(0, 4))
  ])).filter(Boolean).sort().reverse();

  const aplicarFiltros = () => {
    setFiltroCategoria('TODAS');
    setFiltroConta('TODAS');
  };

  const gerarRelatorioGerencialPdf = (tipo: 'DRE' | 'FLUXO' | 'PAGAR_RECEBER' | 'ESTOQUE' | 'CUSTOS' | 'BALANCETE') => {
    const doc = new jsPDF();
    const dinheiro = (valor: number) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const titulos = { DRE: 'DRE — Demonstração do Resultado', FLUXO: 'Fluxo de Caixa', PAGAR_RECEBER: 'Contas a Pagar e Receber', ESTOQUE: 'Posição Financeira do Estoque', CUSTOS: 'Custos Fixos e Variáveis', BALANCETE: 'Balancete de Verificação' };
    doc.setFillColor(4, 120, 87); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(17); doc.text('SICOOP', 14, 13); doc.setFontSize(10); doc.text(titulos[tipo], 14, 22);
    doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.text(`Período: ${filtroMes}/${filtroAno}`, 14, 42); doc.text(`Categoria: ${filtroCategoria} | Conta: ${filtroConta}`, 14, 49);
    let y = 65; doc.setFont('helvetica', 'bold');
    const linhas: [string, string][] = tipo === 'DRE' ? [
        ['1.0 RECEITA OPERACIONAL BRUTA', dinheiro(dreReceitaBruta)],
        ['2.0 (-) DEDUÇÕES E TRIBUTOS SOBRE VENDAS', `- ${dinheiro(dreDeducoes)}`],
        ['3.0 (=) RECEITA OPERACIONAL LÍQUIDA', dinheiro(dreReceitaLiquida)],
        ['4.0 (-) CUSTOS DAS MERCADORIAS/PRODUTOS (CPV)', `- ${dinheiro(dreCpv)}`],
        ['5.0 (=) LUCRO BRUTO / MARGEM BRUTA', dinheiro(dreLucroBruto)],
        ['6.0 (-) DESPESAS OPERACIONAIS E FIXAS', `- ${dinheiro(dreDespesasAdm)}`],
        ['7.0 (=) RESULTADO OPERACIONAL (EBITDA)', dinheiro(dreEbitda)],
        ['8.0 (+/-) RESULTADO FINANCEIRO LÍQUIDO', dinheiro(dreResultadoFin)],
        ['9.0 (=) RESULTADO ANTES TRIBUTOS (LAIR)', dinheiro(dreLair)],
        ['10.0 (-) PROVISÃO DE TRIBUTOS E ENCARGOS', `- ${dinheiro(dreProvisaoTributos)}`],
        ['11.0 (=) RESULTADO LÍQUIDO (SOBRAS/PERDAS)', dinheiro(dreResultadoLiquido)]
      ]
      : tipo === 'FLUXO' ? [['Saldo inicial', dinheiro(extratoBancario?.saldoInicial || 0)], ['Entradas conciliadas', dinheiro(periodoEntradas)], ['Saídas conciliadas', dinheiro(periodoSaidas)], ['Saldo projetado', dinheiro((extratoBancario?.saldoInicial || 0) + periodoEntradas - periodoSaidas)]]
      : tipo === 'CUSTOS' ? [['Custos fixos', dinheiro(custosFixos)], ['Custos variáveis', dinheiro(custosVariaveis)], ['Custos totais', dinheiro(custosFixos + custosVariaveis)]]
      : tipo === 'ESTOQUE' ? [['Valor total em estoque', dinheiro(valorEstoque)], ['Itens cadastrados', String(estoque.length)], ['Itens abaixo do mínimo', String(itensEstoqueBaixo.length)]]
      : tipo === 'BALANCETE' ? [['Total de débitos', dinheiro(totalBalanceteDebitos)], ['Total de créditos', dinheiro(totalBalanceteCreditos)], ['Diferença', dinheiro(Math.abs(totalBalanceteDebitos - totalBalanceteCreditos))]]
      : [['Contas a receber', dinheiro(contasFiltradas.filter(c => c.tipo === 'RECEBER').reduce((s, c) => s + c.valor, 0))], ['Contas a pagar', dinheiro(contasFiltradas.filter(c => c.tipo === 'PAGAR').reduce((s, c) => s + c.valor, 0))], ['Títulos no período', String(contasFiltradas.length)]];
    linhas.forEach(([label, valor]) => { doc.setFont('helvetica', 'normal'); doc.text(label, 16, y); doc.text(valor, 145, y); y += 10; });
    y += 7; doc.setFont('helvetica', 'bold'); doc.text('Detalhamento', 14, y); y += 9; doc.setFont('helvetica', 'normal');
    if (tipo === 'ESTOQUE') estoque.slice(0, 24).forEach(item => { doc.text(`${item.nomeItem} | ${item.quantidadeAtual} ${item.unidadeMedida} | ${dinheiro((item.quantidadeAtual || 0) * (item.valorUnitarioMedio || 0))}`.substring(0, 115), 14, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    else if (tipo === 'BALANCETE') balanceteContas.slice(0, 24).forEach(c => { doc.text(`${c.codigo} | ${c.nome} | D: ${dinheiro(c.debitos)} | C: ${dinheiro(c.creditos)}`.substring(0, 115), 14, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    else contasFiltradas.slice(0, 24).forEach(c => { doc.text(`${c.tipo} | ${c.descricao} | ${c.categoria || '-'} | ${dinheiro(c.valor)}`.substring(0, 115), 14, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Relatório gerencial gerado pelo SisFin — SICOOP', 14, 289); doc.save(`${tipo.toLowerCase()}-${filtroAno}-${filtroMes}.pdf`);
  };

  const gerarRelatorioFinanceiroPdf = () => {
    const doc = new jsPDF();
    const dinheiro = (valor: number) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    doc.setFillColor(4, 120, 87); doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text('SICOOP', 14, 13);
    doc.setFontSize(10); doc.text('Balanço Financeiro Mensal', 14, 22);
    doc.setTextColor(30, 41, 59); doc.setFontSize(11);
    doc.text(`Período: ${filtroMes}/${filtroAno}`, 14, 42);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 140, 42);
    let y = 58;
    const linhas = [['Contas a receber previstas', periodoReceber], ['Contas a pagar previstas', periodoPagar], ['Recebimentos realizados', periodoRecebido], ['Pagamentos realizados', periodoPago], ['Entradas conciliadas', periodoEntradas], ['Saídas conciliadas', periodoSaidas], ['Resultado previsto', periodoReceber - periodoPagar], ['Resultado realizado', periodoRecebido - periodoPago + periodoEntradas - periodoSaidas]] as [string, number][];
    doc.setFillColor(241, 245, 249); doc.rect(12, y - 8, 186, 10, 'F'); doc.setFont('helvetica', 'bold'); doc.text('Indicador', 16, y - 1); doc.text('Valor', 145, y - 1); y += 10; doc.setFont('helvetica', 'normal');
    linhas.forEach(([label, valor], index) => { if (index % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(12, y - 7, 186, 9, 'F'); } doc.text(label, 16, y); doc.text(dinheiro(valor), 145, y); y += 10; });
    y += 8; doc.setFont('helvetica', 'bold'); doc.text('Detalhamento de títulos do período', 14, y); y += 9; doc.setFont('helvetica', 'normal');
    contasDoPeriodo.slice(0, 18).forEach(c => { doc.text(`${c.tipo} | ${c.descricao} | ${c.status} | ${dinheiro(c.valor)}`.substring(0, 115), 14, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Relatório gerado pelo SisFin — SICOOP', 14, 289);
    doc.save(`balanco-financeiro-${filtroAno}-${filtroMes}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <CircleDollarSign className="w-3.5 h-3.5" /> Módulo SisFin
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SisFin - Gestão Financeira</h1>
          <p className="text-sm text-slate-500 mt-1">
            Contas a Pagar, Contas a Receber, Fluxo de Caixa Diário e Conciliação Bancária com a conta da Cooperativa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'extrato' ? (
            <button
              onClick={() => setShowExtratoModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Lançar Entrada / Saída Extrato
            </button>
          ) : activeTab === 'balanco' ? (
            <button onClick={gerarRelatorioFinanceiroPdf} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Exportar balanço PDF</button>
          ) : (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nova Conta (Pagar / Receber)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('contas')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'contas'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CircleDollarSign className="w-4 h-4" /> Títulos & Lançamentos ({contasPagarReceber.length})
        </button>
        <button
          onClick={() => setActiveTab('extrato')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'extrato'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-4 h-4" /> Extrato Conciliado ({extratoBancario?.bancoNome || 'Sicoob Credi'})
        </button>
        <button
          onClick={() => setActiveTab('balanco')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'balanco' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          <BarChart3 className="w-4 h-4" /> Balanço Financeiro
        </button>
        {([['dashboard', 'Dashboard'], ['dre', 'DRE'], ['fluxo', 'Fluxo de Caixa'], ['estoque', 'Estoque'], ['custos', 'Custos']] as const).map(([tab, label]) => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{label}</button>)}
      </div>

      {(activeTab === 'dashboard' || activeTab === 'dre' || activeTab === 'fluxo' || activeTab === 'estoque' || activeTab === 'custos') && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col xl:flex-row xl:items-end gap-3">
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Mês</label><select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm"><option value="TODOS">Todos</option><option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option><option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option><option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option></select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Ano</label><select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm w-28"><option value="TODAS">Todos</option>{anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Categoria</label><select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm"><option value="TODAS">Todas as categorias</option>{categoriasFinanceiras.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Conta / centro de custo</label><select value={filtroConta} onChange={e => setFiltroConta(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm"><option value="TODAS">Todas as contas</option>{contasFluxo.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <button onClick={aplicarFiltros} className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Limpar filtros</button>
          </div>

          {activeTab === 'dashboard' && <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                ['Resultado DRE', receitasDre - despesasDre, (receitasDre - despesasDre >= 0 ? 'text-emerald-700' : 'text-rose-700'), (receitasDre - despesasDre >= 0 ? 'bg-emerald-50' : 'bg-rose-50')],
                ['Saldo de caixa', (extratoBancario?.saldoInicial || 0) + periodoEntradas - periodoSaidas, 'text-blue-700', 'bg-blue-50'],
                ['Contas a pagar', contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.status !== 'CANCELADO').reduce((s, c) => s + c.valor, 0), 'text-rose-700', 'bg-rose-50/80'],
                ['Contas a receber', contasFiltradas.filter(c => c.tipo === 'RECEBER' && c.status !== 'CANCELADO').reduce((s, c) => s + c.valor, 0), 'text-emerald-700', 'bg-emerald-50/80'],
                ['Valor do estoque', valorEstoque, 'text-indigo-700', 'bg-indigo-50']
              ].map(([label, value, color, bg]) => (
                <div key={String(label)} className={`p-5 rounded-2xl border border-slate-200/80 shadow-xs ${bg}`}>
                  <div className="text-xs font-bold text-slate-600">{label}</div>
                  <div className={`text-xl font-black mt-2 ${color}`}>
                    R$ {Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><div className="bg-white rounded-2xl border border-slate-200 p-6"><h2 className="font-black text-slate-900">Desempenho do período</h2><div className="space-y-4 mt-5"><div><div className="flex justify-between text-xs"><span>Receitas</span><strong className="text-emerald-700">R$ {receitasDre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="h-2 bg-slate-100 rounded-full mt-2"><div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, receitasDre ? (receitasDre / Math.max(receitasDre, despesasDre)) * 100 : 0)}%` }} /></div></div><div><div className="flex justify-between text-xs"><span>Despesas</span><strong className="text-rose-700">R$ {despesasDre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="h-2 bg-slate-100 rounded-full mt-2"><div className="h-2 bg-rose-500 rounded-full" style={{ width: `${Math.min(100, despesasDre ? (despesasDre / Math.max(receitasDre, despesasDre)) * 100 : 0)}%` }} /></div></div></div></div><div className="bg-white rounded-2xl border border-slate-200 p-6"><h2 className="font-black text-slate-900">Acompanhamento gerencial</h2><div className="grid grid-cols-2 gap-3 mt-5"><div className="p-3 rounded-xl bg-indigo-50"><span className="text-[11px] text-indigo-700">Custos fixos</span><strong className="block text-lg text-indigo-900">R$ {custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="p-3 rounded-xl bg-amber-50"><span className="text-[11px] text-amber-700">Custos variáveis</span><strong className="block text-lg text-amber-900">R$ {custosVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="p-3 rounded-xl bg-rose-50"><span className="text-[11px] text-rose-700">Estoque mínimo</span><strong className="block text-lg text-rose-900">{itensEstoqueBaixo.length} item(ns)</strong></div><div className="p-3 rounded-xl bg-slate-50"><span className="text-[11px] text-slate-500">Títulos filtrados</span><strong className="block text-lg text-slate-900">{contasFiltradas.length}</strong></div></div></div></div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Fluxo anual</h2><span className="text-[10px] text-slate-500">Entradas x saídas</span></div><ResponsiveContainer width="100%" height={270}><AreaChart data={fluxoAnual}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="mes" fontSize={10} /><YAxis fontSize={10} tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`} /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /><Area type="monotone" dataKey="entradas" name="Entradas" stroke="#059669" fill="#a7f3d0" strokeWidth={2} /><Area type="monotone" dataKey="saidas" name="Saídas" stroke="#e11d48" fill="#fecdd3" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-900 flex items-center gap-2"><WalletCards className="w-4 h-4 text-blue-600" /> Previsão mensal</h2><span className="text-[10px] text-slate-500">A pagar x receber</span></div><ResponsiveContainer width="100%" height={270}><BarChart data={fluxoAnual}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="mes" fontSize={10} /><YAxis fontSize={10} tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`} /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /><Bar dataKey="receber" name="A receber" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="pagar" name="A pagar" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><div className="bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-slate-900 mb-4 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-indigo-600" /> Composição dos custos</h2><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={[{ name: 'Fixos', value: custosFixos }, { name: 'Variáveis', value: custosVariaveis }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} label>{["#6366f1", "#f59e0b"].map(color => <Cell key={color} fill={color} />)}</Pie><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /></PieChart></ResponsiveContainer></div><div className="bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Scale className="w-4 h-4 text-cyan-600" /> Equilíbrio contábil</h2><ResponsiveContainer width="100%" height={250}><BarChart data={[{ nome: 'Débitos x créditos', debitos: totalBalanceteDebitos, creditos: totalBalanceteCreditos }]}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="nome" fontSize={10} /><YAxis fontSize={10} /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /><Bar dataKey="debitos" name="Débitos" fill="#0ea5e9" /><Bar dataKey="creditos" name="Créditos" fill="#8b5cf6" /></BarChart></ResponsiveContainer></div></div>
          </>}

          {activeTab === 'dre' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      DRE — Demonstração do Resultado do Exercício (Empresarial & Contábil)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Demonstração completa em conformidade com as normas contábeis brasileiras (CPC / Lei 6.404/76 e Lei das Cooperativas 5.764/71).
                    </p>
                  </div>
                  <button
                    onClick={() => gerarRelatorioGerencialPdf('DRE')}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" /> Exportar DRE em PDF
                  </button>
                </div>

                {/* KPIs Sintéticos da DRE */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">1. Receita Operacional Bruta</span>
                    <strong className="text-lg font-black text-slate-900 mt-1 block">
                      R$ {dreReceitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <span className="text-[11px] font-bold text-blue-700 uppercase block">3. Receita Operacional Líquida</span>
                    <strong className="text-lg font-black text-blue-900 mt-1 block">
                      R$ {dreReceitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase block">5. Lucro Bruto</span>
                    <strong className={`text-lg font-black mt-1 block ${dreLucroBruto >= 0 ? 'text-indigo-900' : 'text-rose-700'}`}>
                      R$ {dreLucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className={`p-4 rounded-xl border ${dreResultadoLiquido >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                    <span className="text-[11px] font-bold uppercase block">
                      {dreResultadoLiquido >= 0 ? 'Sobras Líquidas do Exercício' : 'Perdas Líquidas do Exercício'}
                    </span>
                    <strong className="text-lg font-black mt-1 block">
                      R$ {dreResultadoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* Tabela Estruturada do DRE Empresarial */}
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                        <th className="p-3 w-12">Item</th>
                        <th className="p-3">Descrição da Linha Contábil</th>
                        <th className="p-3 text-right w-24">% AV</th>
                        <th className="p-3 text-right w-44">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {/* 1. Receita Bruta */}
                      <tr className="bg-slate-50/70 font-bold text-slate-900">
                        <td className="p-3 font-mono">1.0</td>
                        <td className="p-3">RECEITA OPERACIONAL BRUTA</td>
                        <td className="p-3 text-right font-mono text-slate-500">100.0%</td>
                        <td className="p-3 text-right font-mono text-slate-900 font-black">
                          R$ {dreReceitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="text-slate-600">
                        <td className="p-2.5 pl-6 font-mono text-[11px]">1.1</td>
                        <td className="p-2.5 pl-6">Venda de Produtos e Produção Agropecuária (PAA / PNAE / Privado)</td>
                        <td className="p-2.5 text-right font-mono text-slate-400 text-[11px]">
                          {dreReceitaBruta > 0 ? '100.0%' : '0.0%'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          R$ {dreReceitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 2. Deduções */}
                      <tr className="text-rose-700">
                        <td className="p-2.5 font-mono font-bold">2.0</td>
                        <td className="p-2.5 font-bold">(−) DEDUÇÕES DA RECEITA BRUTA E IMPOSTOS</td>
                        <td className="p-2.5 text-right font-mono text-[11px]">
                          {dreReceitaBruta > 0 ? ((dreDeducoes / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          - R$ {dreDeducoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="text-slate-500">
                        <td className="p-2 pl-6 font-mono text-[11px]">2.1</td>
                        <td className="p-2 pl-6">Tributos sobre Faturamento (ICMS, PIS, COFINS, ISS e Devoluções)</td>
                        <td className="p-2 text-right font-mono text-[11px]">
                          {dreReceitaBruta > 0 ? ((dreDeducoes / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="p-2 text-right font-mono">
                          - R$ {dreDeducoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 3. Receita Líquida */}
                      <tr className="bg-blue-50/60 font-black text-blue-950 border-y border-blue-100">
                        <td className="p-3 font-mono">3.0</td>
                        <td className="p-3">(=) RECEITA OPERACIONAL LÍQUIDA</td>
                        <td className="p-3 text-right font-mono text-blue-700">
                          {dreReceitaBruta > 0 ? ((dreReceitaLiquida / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="p-3 text-right font-mono text-blue-900">
                          R$ {dreReceitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 4. Custos CPV */}
                      <tr className="text-amber-800">
                        <td className="p-2.5 font-mono font-bold">4.0</td>
                        <td className="p-2.5 font-bold">(−) CUSTOS DOS PRODUTOS E MERCADORIAS VENDIDAS (CPV / CMV)</td>
                        <td className="p-2.5 text-right font-mono text-[11px]">
                          {dreReceitaBruta > 0 ? ((dreCpv / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          - R$ {dreCpv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 5. Lucro Bruto */}
                      <tr className="bg-indigo-50/60 font-black text-indigo-950 border-y border-indigo-100">
                        <td className="p-3 font-mono">5.0</td>
                        <td className="p-3">(=) LUCRO BRUTO / MARGEM BRUTA</td>
                        <td className="p-3 text-right font-mono text-indigo-700">
                          {dreReceitaBruta > 0 ? ((dreLucroBruto / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className={`p-3 text-right font-mono ${dreLucroBruto >= 0 ? 'text-indigo-900' : 'text-rose-700'}`}>
                          R$ {dreLucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 6. Despesas Operacionais */}
                      <tr className="text-slate-700">
                        <td className="p-2.5 font-mono font-bold">6.0</td>
                        <td className="p-2.5 font-bold">(−) DESPESAS OPERACIONAIS FIXAS E ADMINISTRATIVAS</td>
                        <td className="p-2.5 text-right font-mono text-[11px]">
                          {dreReceitaBruta > 0 ? ((dreDespesasAdm / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                          - R$ {dreDespesasAdm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 7. EBITDA */}
                      <tr className="bg-slate-100/80 font-black text-slate-900 border-y border-slate-200">
                        <td className="p-3 font-mono">7.0</td>
                        <td className="p-3">(=) RESULTADO OPERACIONAL ANTES DO RESULTADO FINANCEIRO (EBITDA / LAJIDA)</td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {dreReceitaBruta > 0 ? ((dreEbitda / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className={`p-3 text-right font-mono ${dreEbitda >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          R$ {dreEbitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 8. Resultado Financeiro */}
                      <tr className="text-slate-600">
                        <td className="p-2.5 font-mono font-bold">8.0</td>
                        <td className="p-2.5 font-bold">(+/−) RESULTADO FINANCEIRO LÍQUIDO</td>
                        <td className="p-2.5 text-right font-mono text-[11px]">
                          {dreReceitaBruta > 0 ? ((dreResultadoFin / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className={`p-2.5 text-right font-mono font-bold ${dreResultadoFin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          R$ {dreResultadoFin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 9. LAIR */}
                      <tr className="bg-slate-50 font-black text-slate-900 border-y border-slate-200">
                        <td className="p-3 font-mono">9.0</td>
                        <td className="p-3">(=) RESULTADO ANTES DOS TRIBUTOS (LAIR)</td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {dreReceitaBruta > 0 ? ((dreLair / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className={`p-3 text-right font-mono ${dreLair >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          R$ {dreLair.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 10. Provisão de Tributos */}
                      <tr className="text-slate-500">
                        <td className="p-2.5 font-mono font-bold">10.0</td>
                        <td className="p-2.5 font-bold">(−) PROVISÃO PARA IRPJ / CSLL / ENCARGOS COOPERATIVOS</td>
                        <td className="p-2.5 text-right font-mono text-[11px]">
                          {dreReceitaBruta > 0 ? ((dreProvisaoTributos / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                          - R$ {dreProvisaoTributos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* 11. Resultado Líquido Final */}
                      <tr className={`font-black text-sm border-t-2 border-slate-300 ${dreResultadoLiquido >= 0 ? 'bg-emerald-100/70 text-emerald-950' : 'bg-rose-100/70 text-rose-950'}`}>
                        <td className="p-4 font-mono">11.0</td>
                        <td className="p-4">(=) RESULTADO LÍQUIDO DO EXERCÍCIO (SOBRAS / PERDAS LÍQUIDAS)</td>
                        <td className="p-4 text-right font-mono">
                          {dreReceitaBruta > 0 ? ((dreResultadoLiquido / dreReceitaBruta) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="p-4 text-right font-mono text-base font-black">
                          R$ {dreResultadoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fluxo' && <div className="space-y-5"><div className="bg-white rounded-2xl border border-slate-200 p-6"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Fluxo de Caixa Anual</h2><p className="text-xs text-slate-500 mt-1">Todos os meses de {filtroAno}, com contas operacionais da cooperativa.</p></div><div className="flex gap-2"><button onClick={() => setFluxoAnoCompleto(!fluxoAnoCompleto)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold">{fluxoAnoCompleto ? 'Exibir resumo' : 'Exibir ano completo'}</button><button onClick={() => gerarRelatorioGerencialPdf('FLUXO')} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Exportar PDF</button></div></div><div className="mt-5"><ResponsiveContainer width="100%" height={300}><LineChart data={fluxoAnual}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="mes" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Legend /><Line type="monotone" dataKey="entradas" name="Entradas" stroke="#059669" strokeWidth={3} /><Line type="monotone" dataKey="saidas" name="Saídas" stroke="#e11d48" strokeWidth={3} /><Line type="monotone" dataKey="receber" name="A receber" stroke="#0284c7" strokeDasharray="5 5" /><Line type="monotone" dataKey="pagar" name="A pagar" stroke="#f59e0b" strokeDasharray="5 5" /></LineChart></ResponsiveContainer></div><div className="overflow-x-auto mt-5"><table className="w-full text-xs"><thead><tr className="border-b text-left"><th className="p-3">Mês</th><th className="p-3 text-right">Entradas</th><th className="p-3 text-right">Saídas</th><th className="p-3 text-right">A receber</th><th className="p-3 text-right">A pagar</th><th className="p-3 text-right">Saldo do mês</th></tr></thead><tbody className="divide-y">{((fluxoAnoCompleto || filtroMes === 'TODOS') ? fluxoAnual : fluxoAnual.filter(m => m.mes.startsWith(filtroMes))).map(m => <tr key={m.mes}><td className="p-3 font-bold">{m.mes}</td><td className="p-3 text-right text-emerald-700">R$ {m.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="p-3 text-right text-rose-700">R$ {m.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="p-3 text-right">R$ {m.receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="p-3 text-right">R$ {m.pagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="p-3 text-right font-black">R$ {(m.entradas - m.saidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>)}</tbody></table></div></div><div className="bg-white rounded-2xl border border-slate-200 p-6"><h2 className="text-lg font-black text-slate-900">Contas do fluxo de caixa</h2><p className="text-xs text-slate-500 mt-1">Contas padrão para cooperativas, conforme o plano contábil e o balancete.</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-5">{contasFluxo.map(conta => <div key={conta} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs font-semibold text-slate-700">{conta}</div>)}</div></div></div>}

          {activeTab === 'estoque' && <div className="bg-white rounded-2xl border border-slate-200 p-6"><div className="flex justify-between"><div><h2 className="text-lg font-black text-slate-900">Estoque — visão financeira</h2><p className="text-xs text-slate-500 mt-1">Valor do inventário e itens abaixo do estoque mínimo.</p></div><button onClick={() => gerarRelatorioGerencialPdf('ESTOQUE')} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Exportar PDF</button></div><div className="mt-5 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left border-b"><th className="p-3">Produto</th><th className="p-3">Quantidade</th><th className="p-3">Valor unitário</th><th className="p-3 text-right">Valor total</th></tr></thead><tbody className="divide-y">{estoque.map(item => <tr key={item.id}><td className="p-3 font-bold">{item.nomeItem}</td><td className="p-3">{item.quantidadeAtual} {item.unidadeMedida}</td><td className="p-3">R$ {(item.valorUnitarioMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="p-3 text-right font-bold">R$ {((item.quantidadeAtual || 0) * (item.valorUnitarioMedio || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>)}</tbody></table></div></div>}

          {activeTab === 'custos' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Gestão de Custos da Cooperativa</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Acompanhamento integrado de Custos Totais, Fixos e Variáveis com proporção percentual.
                    </p>
                  </div>
                  <button
                    onClick={() => gerarRelatorioGerencialPdf('CUSTOS')}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" /> Exportar PDF de Custos
                  </button>
                </div>

                {/* Cards de Custos com Custo Total */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                  {/* Card Custo Total */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md border border-slate-700/50 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Custos Totais</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-mono font-bold">100%</span>
                    </div>
                    <strong className="block text-3xl font-black text-white mt-3">
                      R$ {(custosFixos + custosVariaveis).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Soma total dos custos fixos e variáveis do período selecionado.
                    </p>
                  </div>

                  {/* Card Custos Fixos */}
                  <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Custos Fixos</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-200 text-indigo-900 text-[10px] font-mono font-bold">
                        {(custosFixos + custosVariaveis) > 0 ? (((custosFixos) / (custosFixos + custosVariaveis)) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <strong className="block text-3xl font-black text-indigo-950 mt-3">
                      R$ {custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <p className="text-[11px] text-indigo-600/80 mt-2">
                      Salários, aluguéis, contabilidade, softwares e infraestrutura.
                    </p>
                  </div>

                  {/* Card Custos Variáveis */}
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Custos Variáveis</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">
                        {(custosFixos + custosVariaveis) > 0 ? (((custosVariaveis) / (custosFixos + custosVariaveis)) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <strong className="block text-3xl font-black text-amber-950 mt-3">
                      R$ {custosVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <p className="text-[11px] text-amber-700/80 mt-2">
                      Insumos, combustíveis, embalagens, fretes e pagamentos a produtores.
                    </p>
                  </div>
                </div>

                {/* Gráfico de Rosca com Percentual */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 items-center bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-emerald-600" />
                      Composição Proporcional dos Custos (Gráfico de Rosca)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Visualização percentual de impacto na estrutura de despesas da cooperativa.
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-md bg-[#6366f1]" />
                          <span className="text-xs font-bold text-slate-700">Custos Fixos</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-slate-900">
                            {(custosFixos + custosVariaveis) > 0 ? (((custosFixos) / (custosFixos + custosVariaveis)) * 100).toFixed(1) : '0.0'}%
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            R$ {custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-md bg-[#f59e0b]" />
                          <span className="text-xs font-bold text-slate-700">Custos Variáveis</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-slate-900">
                            {(custosFixos + custosVariaveis) > 0 ? (((custosVariaveis) / (custosFixos + custosVariaveis)) * 100).toFixed(1) : '0.0'}%
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            R$ {custosVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[280px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Custos Fixos', value: custosFixos || 0.001 },
                            { name: 'Custos Variáveis', value: custosVariaveis || 0.001 }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={98}
                          paddingAngle={3}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          <Cell fill="#6366f1" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip
                          formatter={(val: number) => [
                            `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${(custosFixos + custosVariaveis) > 0 ? ((val / (custosFixos + custosVariaveis)) * 100).toFixed(1) : 0}%)`,
                            'Valor'
                          ]}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                      <span className="text-xs font-black text-slate-800">
                        R$ {(custosFixos + custosVariaveis).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'balanco' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-end gap-3">
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Mês</label><select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm"><option value="TODOS">Todos</option><option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option><option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option><option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option></select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Ano</label><select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm w-28"><option value="TODAS">Todos</option>{anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></div>
            <div className="flex-1 text-xs text-slate-500 pb-2">Filtros aplicados a títulos e lançamentos conciliados do período selecionado.</div>
            <button onClick={gerarRelatorioFinanceiroPdf} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Exportar PDF</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[['Receitas previstas', periodoReceber, 'text-emerald-700', 'bg-emerald-50'], ['Despesas previstas', periodoPagar, 'text-rose-700', 'bg-rose-50'], ['Entradas conciliadas', periodoEntradas, 'text-blue-700', 'bg-blue-50'], ['Saídas conciliadas', periodoSaidas, 'text-amber-700', 'bg-amber-50']].map(([label, valor, color, bg]) => <div key={String(label)} className={`p-5 rounded-2xl border border-slate-200 ${bg}`}><div className="text-xs font-bold text-slate-600">{label}</div><div className={`text-xl font-black mt-2 ${color}`}>R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></div>)}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm"><h2 className="font-black text-slate-900">Resumo do balanço — {filtroMes}/{filtroAno}</h2><div className="grid md:grid-cols-2 gap-4 mt-4"><div className="p-4 rounded-xl bg-slate-50"><span className="text-xs text-slate-500">Resultado previsto</span><strong className={`block text-2xl mt-1 ${periodoReceber - periodoPagar >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>R$ {(periodoReceber - periodoPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="p-4 rounded-xl bg-slate-50"><span className="text-xs text-slate-500">Resultado realizado</span><strong className={`block text-2xl mt-1 ${periodoRecebido - periodoPago + periodoEntradas - periodoSaidas >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>R$ {(periodoRecebido - periodoPago + periodoEntradas - periodoSaidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div></div></div>
        </div>
      )}

      {/* Tab Contas */}
      {activeTab === 'contas' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Contas a Pagar e Receber</h2><p className="text-xs text-slate-500 mt-1">Títulos financeiros registrados no período.</p></div><button onClick={() => gerarRelatorioGerencialPdf('PAGAR_RECEBER')} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Exportar PDF</button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Pessoa / Favorecido</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contasPagarReceber.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        c.tipo === 'RECEBER' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {c.descricao}
                      {c.subcategoria && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-normal text-slate-500">{c.categoria} — {c.subcategoria}</span>
                          {c.classificacaoDespesa && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              c.classificacaoDespesa === 'FIXA' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {c.classificacaoDespesa === 'FIXA' ? 'FIXA' : 'VARIÁVEL'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-700">{c.pessoaNome}</td>
                    <td className="p-3 text-slate-600 font-mono">{formatarData(c.dataVencimento)}</td>
                    <td className={`p-3 font-bold ${c.tipo === 'RECEBER' ? 'text-emerald-700' : 'text-slate-900'}`}>
                      R$ {(c.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        c.status === 'PAGO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'PENDENTE' && (
                          <button
                            onClick={() => { if (!canWrite) { blockWriteAction(); return; } pagarReceberConta(c.id); }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg mr-1"
                          >
                            Dar Baixa
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canWrite) { blockWriteAction(); return; }
                            if (confirm('Deseja excluir este lançamento financeiro?')) deleteContaPagarReceber(c.id);
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Extrato */}
      {activeTab === 'extrato' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs font-bold">
            <span>Agência / Conta: {extratoBancario?.agenciaConta || '0001 / 12345-6'}</span>
            <span className="text-emerald-700">Saldo Atual: R$ {(extratoBancario?.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Data</th>
                  <th className="p-3">Histórico / Lançamento</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(extratoBancario?.lancamentos || []).map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3 text-slate-600 font-mono">{formatarData(l.data)}</td>
                    <td className="p-3 font-bold text-slate-900">{l.historico}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        l.tipo === 'CREDITO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {l.tipo}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-bold ${l.tipo === 'CREDITO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {l.tipo === 'CREDITO' ? '+' : '-'} R$ {(l.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Lançamento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingConta ? 'Editar Conta' : 'Nova Conta Pagar/Receber'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveConta} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tipo de Título</label>
                  <select
                    value={contaForm.tipo}
                    onChange={e => setContaForm({ ...contaForm, tipo: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="PAGAR">Conta a Pagar</option>
                    <option value="RECEBER">Conta a Receber</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    required
                    value={contaForm.valor}
                    onChange={e => setContaForm({ ...contaForm, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Descrição do Título *</label>
                <input
                  type="text"
                  required
                  value={contaForm.descricao}
                  onChange={e => setContaForm({ ...contaForm, descricao: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Aquisição de caixas para PNAE"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Pessoa / Favorecido</label>
                <input
                  type="text"
                  value={contaForm.pessoaNome}
                  onChange={e => setContaForm({ ...contaForm, pessoaNome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Nome do cooperado ou fornecedor"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={contaForm.dataVencimento}
                  onChange={e => setContaForm({ ...contaForm, dataVencimento: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Categoria / Subcategoria</label>
                <select
                  value={contaForm.subcategoria ? `${contaForm.categoria}|${contaForm.subcategoria}` : ''}
                  onChange={e => {
                    const [categoria, subcategoria] = e.target.value.split('|');
                    const preset = CATEGORIAS_FINANCEIRAS.find(c => c.categoria === categoria && c.subcategoria === subcategoria);
                    setContaForm({
                      ...contaForm,
                      categoria: categoria || contaForm.categoria,
                      subcategoria: subcategoria || '',
                      classificacaoDespesa: preset?.classificacao || contaForm.classificacaoDespesa
                    });
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="">Selecione a categoria...</option>
                  {CATEGORIAS_FINANCEIRAS.map(c => (
                    <option key={`${c.categoria}|${c.subcategoria}`} value={`${c.categoria}|${c.subcategoria}`}>
                      {c.categoria} — {c.subcategoria}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Classificação</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setContaForm({ ...contaForm, classificacaoDespesa: 'FIXA' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      contaForm.classificacaoDespesa === 'FIXA'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    Fixa
                  </button>
                  <button
                    type="button"
                    onClick={() => setContaForm({ ...contaForm, classificacaoDespesa: 'VARIAVEL' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      contaForm.classificacaoDespesa === 'VARIAVEL'
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                    }`}
                  >
                    Variável
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Fixa: valor estável, se repete todo mês (aluguel, salários). Variável: depende do volume do mês (insumos, combustível).</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Lançar Extrato Bancário */}
      {showExtratoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">Lançamento no Extrato Bancário</h2>
              <button onClick={() => setShowExtratoModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveExtrato} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tipo Movimentação</label>
                  <select
                    value={extratoForm.tipo}
                    onChange={e => setExtratoForm({ ...extratoForm, tipo: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                  >
                    <option value="CREDITO">CRÉDITO (Entrada)</option>
                    <option value="DEBITO">DÉBITO (Saída)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    required
                    value={extratoForm.valor}
                    onChange={e => setExtratoForm({ ...extratoForm, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Histórico / Descrição *</label>
                <input
                  type="text"
                  required
                  value={extratoForm.historico}
                  onChange={e => setExtratoForm({ ...extratoForm, historico: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                  placeholder="Ex: Recebimento de Ordem de Pagamento PNAE"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={extratoForm.data}
                    onChange={e => setExtratoForm({ ...extratoForm, data: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nº Documento / PIX</label>
                  <input
                    type="text"
                    value={extratoForm.documento}
                    onChange={e => setExtratoForm({ ...extratoForm, documento: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExtratoModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
