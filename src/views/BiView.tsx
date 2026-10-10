import React, { useState, useMemo } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart2,
  Package,
  ShoppingCart,
  ArrowRightLeft,
  Calendar,
  Layers,
  Filter,
  Target,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Users,
  Building2,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

export const BiView: React.FC = () => {
  const { produtores, ofertasPAA, cooperados, transacoesCapital, estoque } = useCoop();

  // Active View Tab inside BI
  const [activeTab, setActiveTab] = useState<'vendas_vs_estoque' | 'overview' | 'metas' | 'sazonalidade'>('vendas_vs_estoque');
  const [selectedTipoCooperado, setSelectedTipoCooperado] = useState<string>('TODOS');

  // Modal for Custom Goals
  const [showModal, setShowModal] = useState(false);
  const [metasCustomizadas, setMetasCustomizadas] = useState([
    { id: '1', nome: 'Faturamento PNAE 2026', valorMeta: 200000, atingido: 142000, unidade: 'R$' },
    { id: '2', nome: 'Volume de Entregas Orgânicas', valorMeta: 50000, atingido: 42500, unidade: 'Kg' },
    { id: '3', nome: 'Giro de Estoque Médio Mensal', valorMeta: 1.2, atingido: 0.98, unidade: 'Taxa' }
  ]);

  const [formMeta, setFormMeta] = useState({
    nome: 'Meta de Cobertura de Estoque PAA 2026',
    valorMeta: 100000,
    atingido: 35000,
    unidade: 'R$'
  });

  // Vendas vs. Estoque Filters
  const [metricUnit, setMetricUnit] = useState<'volume' | 'valor'>('volume'); // volume (Kg) vs valor (R$)
  const [chartType, setChartType] = useState<'composed' | 'bar' | 'area'>('composed');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('TODAS');

  const handleAddMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMeta.nome) return;
    setMetasCustomizadas(prev => [...prev, { id: `meta-${Date.now()}`, ...formMeta }]);
    setShowModal(false);
  };

  // Monthly Sales vs. Stock Dataset (12 Months)
  const monthlyDataRaw = [
    { mes: 'Jan', vendasKg: 18500, estoqueKg: 24000, vendasRs: 92500, estoqueRs: 120000, giro: 0.77, categoria: 'Hortifruti' },
    { mes: 'Fev', vendasKg: 21000, estoqueKg: 22500, vendasRs: 105000, estoqueRs: 112500, giro: 0.93, categoria: 'Hortifruti' },
    { mes: 'Mar', vendasKg: 25400, estoqueKg: 28000, vendasRs: 127000, estoqueRs: 140000, giro: 0.90, categoria: 'Laticínios' },
    { mes: 'Abr', vendasKg: 29800, estoqueKg: 31200, vendasRs: 149000, estoqueRs: 156000, giro: 0.95, categoria: 'Grãos & Farinhas' },
    { mes: 'Mai', vendasKg: 34200, estoqueKg: 33000, vendasRs: 171000, estoqueRs: 165000, giro: 1.03, categoria: 'Hortifruti' },
    { mes: 'Jun', vendasKg: 38000, estoqueKg: 36500, vendasRs: 190000, estoqueRs: 182500, giro: 1.04, categoria: 'Processados' },
    { mes: 'Jul', vendasKg: 32500, estoqueKg: 35000, vendasRs: 162500, estoqueRs: 175000, giro: 0.92, categoria: 'Grãos & Farinhas' },
    { mes: 'Ago', vendasKg: 36000, estoqueKg: 38000, vendasRs: 180000, estoqueRs: 190000, giro: 0.94, categoria: 'Hortifruti' },
    { mes: 'Set', vendasKg: 41200, estoqueKg: 42000, vendasRs: 206000, estoqueRs: 210000, giro: 0.98, categoria: 'Laticínios' },
    { mes: 'Out', vendasKg: 44500, estoqueKg: 40000, vendasRs: 222500, estoqueRs: 200000, giro: 1.11, categoria: 'Hortifruti' },
    { mes: 'Nov', vendasKg: 39000, estoqueKg: 37000, vendasRs: 195000, estoqueRs: 185000, giro: 1.05, categoria: 'Processados' },
    { mes: 'Dez', vendasKg: 42800, estoqueKg: 39500, vendasRs: 214000, estoqueRs: 197500, giro: 1.08, categoria: 'Hortifruti' }
  ];

  // Product Level Comparison Data (Vendas vs. Estoque)
  const productData = [
    { produto: 'Mandioca In Natura', vendasKg: 48000, estoqueKg: 12500, status: 'NORMAL' },
    { produto: 'Polpa de Fruta Tropical', vendasKg: 32000, estoqueKg: 8200, status: 'NORMAL' },
    { produto: 'Leite Pasteurizado (L)', vendasKg: 28500, estoqueKg: 4000, status: 'BAIXO' },
    { produto: 'Feijão Caupi Verde', vendasKg: 22000, estoqueKg: 6800, status: 'NORMAL' },
    { produto: 'Mel de Abelha Silvestre', vendasKg: 14500, estoqueKg: 5100, status: 'EXCESSO' },
    { produto: 'Milho em Grão', vendasKg: 35000, estoqueKg: 11000, status: 'NORMAL' },
    { produto: 'Farinha de Mandioca', vendasKg: 19800, estoqueKg: 7200, status: 'NORMAL' }
  ];

  // Sazonalidade e Gargalos Logísticos por Tipo de Cooperado
  const sazonalidadeDataRaw = [
    { mes: 'Jan', tipo: 'FUNDADOR', recebimentoKg: 8500, entregasKg: 8200, gargalo: 'Baixo' },
    { mes: 'Jan', tipo: 'EFETIVO', recebimentoKg: 6200, entregasKg: 5900, gargalo: 'Baixo' },
    { mes: 'Jan', tipo: 'SUPLENTE', recebimentoKg: 2100, entregasKg: 1900, gargalo: 'Moderado' },
    { mes: 'Jan', tipo: 'HONORARIO', recebimentoKg: 500, entregasKg: 500, gargalo: 'Baixo' },
    
    { mes: 'Fev', tipo: 'FUNDADOR', recebimentoKg: 9100, entregasKg: 9000, gargalo: 'Baixo' },
    { mes: 'Fev', tipo: 'EFETIVO', recebimentoKg: 7400, entregasKg: 7100, gargalo: 'Baixo' },
    { mes: 'Fev', tipo: 'SUPLENTE', recebimentoKg: 2500, entregasKg: 2200, gargalo: 'Moderado' },
    { mes: 'Fev', tipo: 'HONORARIO', recebimentoKg: 600, entregasKg: 600, gargalo: 'Baixo' },

    { mes: 'Mar', tipo: 'FUNDADOR', recebimentoKg: 11200, entregasKg: 10800, gargalo: 'Moderado' },
    { mes: 'Mar', tipo: 'EFETIVO', recebimentoKg: 9800, entregasKg: 9100, gargalo: 'Alto (Fila de Descarga)' },
    { mes: 'Mar', tipo: 'SUPLENTE', recebimentoKg: 3100, entregasKg: 2800, gargalo: 'Baixo' },
    { mes: 'Mar', tipo: 'HONORARIO', recebimentoKg: 700, entregasKg: 700, gargalo: 'Baixo' },

    { mes: 'Abr', tipo: 'FUNDADOR', recebimentoKg: 13500, entregasKg: 13000, gargalo: 'Alto (Capacidade Galpão)' },
    { mes: 'Abr', tipo: 'EFETIVO', recebimentoKg: 11500, entregasKg: 11000, gargalo: 'Alto (Logística Frota)' },
    { mes: 'Abr', tipo: 'SUPLENTE', recebimentoKg: 4000, entregasKg: 3600, gargalo: 'Moderado' },
    { mes: 'Abr', tipo: 'HONORARIO', recebimentoKg: 800, entregasKg: 800, gargalo: 'Baixo' },

    { mes: 'Mai', tipo: 'FUNDADOR', recebimentoKg: 14200, entregasKg: 14000, gargalo: 'Baixo' },
    { mes: 'Mai', tipo: 'EFETIVO', recebimentoKg: 12800, entregasKg: 12200, gargalo: 'Moderado' },
    { mes: 'Mai', tipo: 'SUPLENTE', recebimentoKg: 4500, entregasKg: 4200, gargalo: 'Baixo' },
    { mes: 'Mai', tipo: 'HONORARIO', recebimentoKg: 900, entregasKg: 900, gargalo: 'Baixo' },

    { mes: 'Jun', tipo: 'FUNDADOR', recebimentoKg: 15000, entregasKg: 14800, gargalo: 'Baixo' },
    { mes: 'Jun', tipo: 'EFETIVO', recebimentoKg: 13900, entregasKg: 13500, gargalo: 'Baixo' },
    { mes: 'Jun', tipo: 'SUPLENTE', recebimentoKg: 5100, entregasKg: 4800, gargalo: 'Baixo' },
    { mes: 'Jun', tipo: 'HONORARIO', recebimentoKg: 1000, entregasKg: 1000, gargalo: 'Baixo' },

    { mes: 'Jul', tipo: 'FUNDADOR', recebimentoKg: 12800, entregasKg: 12500, gargalo: 'Baixo' },
    { mes: 'Jul', tipo: 'EFETIVO', recebimentoKg: 11000, entregasKg: 10600, gargalo: 'Baixo' },
    { mes: 'Jul', tipo: 'SUPLENTE', recebimentoKg: 3800, entregasKg: 3500, gargalo: 'Baixo' },
    { mes: 'Jul', tipo: 'HONORARIO', recebimentoKg: 750, entregasKg: 750, gargalo: 'Baixo' },

    { mes: 'Ago', tipo: 'FUNDADOR', recebimentoKg: 14000, entregasKg: 13800, gargalo: 'Baixo' },
    { mes: 'Ago', tipo: 'EFETIVO', recebimentoKg: 12500, entregasKg: 12000, gargalo: 'Moderado' },
    { mes: 'Ago', tipo: 'SUPLENTE', recebimentoKg: 4200, entregasKg: 3900, gargalo: 'Baixo' },
    { mes: 'Ago', tipo: 'HONORARIO', recebimentoKg: 850, entregasKg: 850, gargalo: 'Baixo' },

    { mes: 'Set', tipo: 'FUNDADOR', recebimentoKg: 16200, entregasKg: 15500, gargalo: 'Alto (Gargalo Rota Escola)' },
    { mes: 'Set', tipo: 'EFETIVO', recebimentoKg: 14800, entregasKg: 14000, gargalo: 'Alto (Gargalo Rota Escola)' },
    { mes: 'Set', tipo: 'SUPLENTE', recebimentoKg: 5500, entregasKg: 5000, gargalo: 'Moderado' },
    { mes: 'Set', tipo: 'HONORARIO', recebimentoKg: 1100, entregasKg: 1100, gargalo: 'Baixo' },

    { mes: 'Out', tipo: 'FUNDADOR', recebimentoKg: 17500, entregasKg: 17000, gargalo: 'Alto (Pico Safra)' },
    { mes: 'Out', tipo: 'EFETIVO', recebimentoKg: 16000, entregasKg: 15200, gargalo: 'Alto (Pico Safra)' },
    { mes: 'Out', tipo: 'SUPLENTE', recebimentoKg: 6000, entregasKg: 5600, gargalo: 'Moderado' },
    { mes: 'Out', tipo: 'HONORARIO', recebimentoKg: 1200, entregasKg: 1200, gargalo: 'Baixo' },

    { mes: 'Nov', tipo: 'FUNDADOR', recebimentoKg: 15100, entregasKg: 14900, gargalo: 'Baixo' },
    { mes: 'Nov', tipo: 'EFETIVO', recebimentoKg: 13500, entregasKg: 13100, gargalo: 'Baixo' },
    { mes: 'Nov', tipo: 'SUPLENTE', recebimentoKg: 4800, entregasKg: 4500, gargalo: 'Baixo' },
    { mes: 'Nov', tipo: 'HONORARIO', recebimentoKg: 950, entregasKg: 950, gargalo: 'Baixo' },

    { mes: 'Dez', tipo: 'FUNDADOR', recebimentoKg: 16800, entregasKg: 16500, gargalo: 'Moderado (Encerramento PNAE)' },
    { mes: 'Dez', tipo: 'EFETIVO', recebimentoKg: 15200, entregasKg: 14800, gargalo: 'Moderado (Encerramento PNAE)' },
    { mes: 'Dez', tipo: 'SUPLENTE', recebimentoKg: 5800, entregasKg: 5400, gargalo: 'Baixo' },
    { mes: 'Dez', tipo: 'HONORARIO', recebimentoKg: 1100, entregasKg: 1100, gargalo: 'Baixo' }
  ];

  const sazonalidadeChartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map(mes => {
      const items = sazonalidadeDataRaw.filter(d => d.mes === mes && (selectedTipoCooperado === 'TODOS' || d.tipo === selectedTipoCooperado));
      const recebimento = items.reduce((acc, curr) => acc + curr.recebimentoKg, 0);
      const entregas = items.reduce((acc, curr) => acc + curr.entregasKg, 0);
      const diff = recebimento - entregas;
      const gargaloMax = items.some(i => i.gargalo.includes('Alto')) ? 'Alto' : items.some(i => i.gargalo.includes('Moderado')) ? 'Moderado' : 'Baixo';
      return {
        mes,
        Recebimento: recebimento,
        Entregas: entregas,
        DiferencaEstoque: diff,
        GargaloStatus: gargaloMax
      };
    });
  }, [selectedTipoCooperado]);

  // Processed Dataset based on metric unit
  const chartData = useMemo(() => {
    return monthlyDataRaw.map(item => ({
      mes: item.mes,
      Vendas: metricUnit === 'volume' ? item.vendasKg : item.vendasRs,
      Estoque: metricUnit === 'volume' ? item.estoqueKg : item.estoqueRs,
      Giro: item.giro,
      Diferenca: (metricUnit === 'volume' ? item.vendasKg : item.vendasRs) - (metricUnit === 'volume' ? item.estoqueKg : item.estoqueRs)
    }));
  }, [metricUnit]);

  // Comparative Totals
  const totalVendas = useMemo(() => {
    return monthlyDataRaw.reduce((acc, curr) => acc + (metricUnit === 'volume' ? curr.vendasKg : curr.vendasRs), 0);
  }, [metricUnit]);

  const totalEstoqueMedio = useMemo(() => {
    const sum = monthlyDataRaw.reduce((acc, curr) => acc + (metricUnit === 'volume' ? curr.estoqueKg : curr.estoqueRs), 0);
    return Math.round(sum / monthlyDataRaw.length);
  }, [metricUnit]);

  const giroMedio = useMemo(() => {
    const sum = monthlyDataRaw.reduce((acc, curr) => acc + curr.giro, 0);
    return (sum / monthlyDataRaw.length).toFixed(2);
  }, []);

  const coberturaDiasMedia = useMemo(() => {
    // Dias de cobertura = (Estoque / Vendas) * 30
    return Math.round((totalEstoqueMedio / (totalVendas / 12)) * 30);
  }, [totalEstoqueMedio, totalVendas]);

  // Auxiliary data for Overview
  const dataFaturamentoPrograma = [
    { name: 'PAA Doação', valor: 85000 },
    { name: 'PNAE Escolar', valor: 142000 },
    { name: 'Venda Direta', valor: 48000 },
    { name: 'Feiras Rurais', valor: 22000 }
  ];

  const dataProducaoCategoria = [
    { name: 'Hortifruti', value: 55, color: '#059669' },
    { name: 'Laticínios', value: 25, color: '#0284c7' },
    { name: 'Grãos & Farinhas', value: 12, color: '#d97706' },
    { name: 'Processados', value: 8, color: '#7c3aed' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-emerald-500/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-mono font-bold border border-emerald-400/30 flex items-center gap-1.5">
              <PieChartIcon className="w-3.5 h-3.5" /> Módulo SisBI
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Business Intelligence & Analytics
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Análise Inteligente de Produção & Comercialização
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Gráficos comparativos de volume de vendas vs. estoque mensal, taxa de giro, cobertura logística e indicadores PAA/PNAE.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Meta BI
          </button>
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-2xl border border-slate-300/80 dark:border-slate-700 w-fit">
        <button
          onClick={() => setActiveTab('vendas_vs_estoque')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'vendas_vs_estoque'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Vendas vs. Estoque Mensal
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <PieChartIcon className="w-4 h-4" /> Visão Geral de Programas PAA/PNAE
        </button>

        <button
          onClick={() => setActiveTab('metas')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'metas'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" /> Metas Estratégicas ({metasCustomizadas.length})
        </button>

        <button
          onClick={() => setActiveTab('sazonalidade')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'sazonalidade'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Sazonalidade & Logística
        </button>
      </div>

      {/* TAB 1: VENDAS VS. ESTOQUE MENSAL */}
      {activeTab === 'vendas_vs_estoque' && (
        <div className="space-y-6">
          {/* Controls Bar for Comparative Chart */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Unit Toggle */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setMetricUnit('volume')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    metricUnit === 'volume'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 inline mr-1" /> Volume (Quilogramas)
                </button>
                <button
                  onClick={() => setMetricUnit('valor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    metricUnit === 'valor'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Financeiro (R$)
                </button>
              </div>

              {/* Chart Type Toggle */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Tipo de Gráfico:</span>
                <select
                  value={chartType}
                  onChange={e => setChartType(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="composed">Gráfico Composto (Barras + Linha de Giro)</option>
                  <option value="bar">Barras Comparativas Lado a Lado</option>
                  <option value="area">Área Sobreposta (Tendência)</option>
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Exercício:</span>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="2026">2026 (Atual)</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin-slow" />
              Sincronizado com Sistema de Estoque
            </div>
          </div>

          {/* Comparative Metrics KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Total de Vendas no Período</span>
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {metricUnit === 'volume'
                  ? `${totalVendas.toLocaleString('pt-BR')} Kg`
                  : `R$ ${totalVendas.toLocaleString('pt-BR')}`}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                Média de {(totalVendas / 12).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {metricUnit === 'volume' ? 'Kg/mês' : 'R$/mês'}
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Estoque Médio Armazenado</span>
                <Package className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black text-sky-700 dark:text-sky-400 font-mono">
                {metricUnit === 'volume'
                  ? `${totalEstoqueMedio.toLocaleString('pt-BR')} Kg`
                  : `R$ ${totalEstoqueMedio.toLocaleString('pt-BR')}`}
              </div>
              <div className="text-[11px] text-sky-600 font-semibold">
                Nível de reserva nos galpões
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Giro de Estoque Médio</span>
                <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">
                {giroMedio}x / mês
              </div>
              <div className="text-[11px] text-emerald-700 font-bold">
                Alta rotatividade (sem perdas por validade)
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Cobertura Média de Estoque</span>
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
                {coberturaDiasMedia} Dias
              </div>
              <div className="text-[11px] text-slate-500">
                Tempo estimado de suprimento das chamadas
              </div>
            </div>
          </div>

          {/* Main Recharts Monthly Comparison Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-600" /> Comparativo Mensal: Volume Comercializado vs. Nível de Estoque
                </h2>
                <p className="text-xs text-slate-500">
                  Evolução comparativa entre o volume de entregas efetuadas no PAA/PNAE e a posição física do estoque residual.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-600 rounded-xs" />
                  <span className="text-slate-700 dark:text-slate-300">Volume de Vendas ({metricUnit === 'volume' ? 'Kg' : 'R$'})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-sky-500 rounded-xs" />
                  <span className="text-slate-700 dark:text-slate-300">Estoque Mensal ({metricUnit === 'volume' ? 'Kg' : 'R$'})</span>
                </div>
                {chartType === 'composed' && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-500" />
                    <span className="text-slate-700 dark:text-slate-300">Giro de Estoque (Taxa)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'composed' ? (
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 2]} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const vendasVal = payload[0]?.value || 0;
                          const estoqueVal = payload[1]?.value || 0;
                          const giroVal = payload[2]?.value || 0;
                          const diff = Number(vendasVal) - Number(estoqueVal);
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                              <div className="font-extrabold border-b border-slate-700 pb-1 text-emerald-400">
                                Mês de {label} - Balanço BI
                              </div>
                              <div className="flex justify-between gap-4 font-mono">
                                <span className="text-slate-300">Vendas:</span>
                                <span className="font-bold text-emerald-300">
                                  {metricUnit === 'volume' ? `${vendasVal.toLocaleString('pt-BR')} Kg` : `R$ ${vendasVal.toLocaleString('pt-BR')}`}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 font-mono">
                                <span className="text-slate-300">Estoque Mensal:</span>
                                <span className="font-bold text-sky-300">
                                  {metricUnit === 'volume' ? `${estoqueVal.toLocaleString('pt-BR')} Kg` : `R$ ${estoqueVal.toLocaleString('pt-BR')}`}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 font-mono pt-1 border-t border-slate-800">
                                <span className="text-slate-400">Saldo Vendas/Estoque:</span>
                                <span className={`font-bold ${diff >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {diff >= 0 ? '+' : ''}{diff.toLocaleString('pt-BR')} {metricUnit === 'volume' ? 'Kg' : 'R$'}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 font-mono">
                                <span className="text-slate-400">Taxa de Giro:</span>
                                <span className="font-bold text-amber-300">{giroVal}x</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar yAxisId="left" dataKey="Vendas" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar yAxisId="left" dataKey="Estoque" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Line yAxisId="right" type="monotone" dataKey="Giro" stroke="#d97706" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value, name) => [`${value.toLocaleString()} ${metricUnit === 'volume' ? 'Kg' : 'R$'}`, name]} />
                    <Area type="monotone" dataKey="Vendas" stroke="#059669" fill="#059669" fillOpacity={0.25} strokeWidth={2} />
                    <Area type="monotone" dataKey="Estoque" stroke="#0284c7" fill="#0284c7" fillOpacity={0.25} strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value, name) => [`${value.toLocaleString()} ${metricUnit === 'volume' ? 'Kg' : 'R$'}`, name]} />
                    <Bar dataKey="Vendas" fill="#059669" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Estoque" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Level Comparison & Monthly Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Level Horizontal Comparison */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" /> Vendas Acumuladas vs. Estoque por Produto
              </h2>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="produto" type="category" tick={{ fontSize: 10, fontWeight: 600 }} width={120} />
                    <Tooltip formatter={(val, name) => [`${val.toLocaleString()} Kg`, name === 'vendasKg' ? 'Vendas Acumuladas' : 'Estoque Atual']} />
                    <Bar dataKey="vendasKg" fill="#059669" name="vendasKg" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="estoqueKg" fill="#0284c7" name="estoqueKg" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 font-medium pt-2 border-t border-slate-100 dark:border-slate-700">
                <span>Legenda: Verde = Vendas Acumuladas | Azul = Posição Atual de Estoque</span>
              </div>
            </div>

            {/* Monthly Balance Table */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" /> Tabela de Balanço Vendas x Estoque Mensal
              </h2>

              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700 text-[10px]">
                      <th className="p-2">Mês</th>
                      <th className="p-2 text-right">Vendas (Kg)</th>
                      <th className="p-2 text-right">Estoque (Kg)</th>
                      <th className="p-2 text-center">Giro</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                    {monthlyDataRaw.map(item => (
                      <tr key={item.mes} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-2 font-extrabold text-slate-900 dark:text-white">{item.mes}</td>
                        <td className="p-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          {item.vendasKg.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-2 text-right font-bold text-sky-700 dark:text-sky-400">
                          {item.estoqueKg.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-2 text-center text-amber-700 dark:text-amber-400 font-bold">
                          {item.giro}x
                        </td>
                        <td className="p-2 text-center">
                          {item.giro >= 1.0 ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                              ÓTIMO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
                              NORMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW PROGRAMAS PAA/PNAE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">Volume Total PAA / PNAE</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">42,500 Kg</div>
              <div className="text-[10px] text-emerald-700 font-bold">+18.4% em relação ao ano anterior</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">Faturamento Anual Bruto</div>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400">R$ 297.000,00</div>
              <div className="text-[10px] text-emerald-700 font-bold">100% Repassado aos Produtores</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">Produtores Ativos com CAF/DAP</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{produtores.length} Ativos</div>
              <div className="text-[10px] text-slate-500">100% Regularizados pela EMATER</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">Capital Social Atual</div>
              <div className="text-2xl font-black text-teal-800 dark:text-teal-400">R$ 150.000,00</div>
              <div className="text-[10px] text-teal-700 font-bold">Reserva de Sobras Garantida</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart - Faturamento por Programa */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" /> Receita Distribuída por Programa Comprador
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataFaturamentoPrograma}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString()}`, 'Valor']} />
                    <Bar dataKey="valor" fill="#059669" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart - Categorias de Produtos */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" /> Distribuição de Produção por Categoria (%)
              </h2>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={dataProducaoCategoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dataProducaoCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val}%`, 'Participação']} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-xs font-semibold">
                {dataProducaoCategoria.map(c => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-slate-700 dark:text-slate-300">{c.name} ({c.value}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: METAS ESTRATÉGICAS */}
      {activeTab === 'metas' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-base">
              <Target className="w-5 h-5 text-emerald-600" /> Metas Estratégicas Registradas no SisBI
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Nova Meta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {metasCustomizadas.map(m => {
              const pct = Math.min(100, Math.round((m.atingido / m.valorMeta) * 100));
              return (
                <div key={m.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-900 dark:text-white">{m.nome}</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Atingido: {m.unidade === 'R$' ? `R$ ${m.atingido.toLocaleString()}` : `${m.atingido.toLocaleString()} ${m.unidade}`}</span>
                    <span>Meta: {m.unidade === 'R$' ? `R$ ${m.valorMeta.toLocaleString()}` : `${m.valorMeta.toLocaleString()} ${m.unidade}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SAZONALIDADE & GARGALOS LOGÍSTICOS POR TIPO DE COOPERADO */}
      {activeTab === 'sazonalidade' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>Filtrar por Tipo de Cooperado:</span>
                <select
                  value={selectedTipoCooperado}
                  onChange={e => setSelectedTipoCooperado(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="TODOS">Todos os Tipos de Cooperados (Consolidado)</option>
                  <option value="FUNDADOR">Fundadores (Alta Escala)</option>
                  <option value="EFETIVO">Efetivos (Produtores Regulares)</option>
                  <option value="SUPLENTE">Suplentes / Em Homologação</option>
                  <option value="HONORARIO">Honorários</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Análise de Sazonalidade & Gargalos Logísticos
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">Pico de Sazonalidade (Safra)</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">Outubro / Setembro</div>
              <div className="text-[11px] text-slate-500">Maior volume de recebimento nos armazéns</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">Gargalo Logístico Principal</div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">Abril & Outubro</div>
              <div className="text-[11px] text-amber-600 font-bold">Fila de descarga e capacidade de frota</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">Volume Total Recebido (Anual)</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">158.400 Kg</div>
              <div className="text-[11px] text-emerald-700 font-bold">Soma de todas as entregas dos cooperados</div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-1">
              <div className="text-xs font-bold text-slate-500">Eficiência de Expedição</div>
              <div className="text-2xl font-black text-sky-700 dark:text-sky-400 font-mono">97.8%</div>
              <div className="text-[11px] text-sky-600 font-semibold">Baixo índice de perda por estocagem</div>
            </div>
          </div>

          {/* Bar Chart: Evolução Mensal de Recebimento e Entregas por Tipo de Cooperado */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" /> Evolução Mensal: Recebimento vs. Entregas de Produtos ({selectedTipoCooperado})
                </h2>
                <p className="text-xs text-slate-500">
                  Identificação visual de sazonalidade agrícola e gargalos logísticos mensais por categoria de cooperado.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-600 rounded-xs" />
                  <span className="text-slate-700 dark:text-slate-300">Recebimento de Produtos (Kg)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-sky-600 rounded-xs" />
                  <span className="text-slate-700 dark:text-slate-300">Entregas Realizadas (Kg)</span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sazonalidadeChartData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const rec = payload[0]?.value || 0;
                        const ent = payload[1]?.value || 0;
                        const diff = Number(rec) - Number(ent);
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                            <div className="font-extrabold border-b border-slate-700 pb-1 text-emerald-400">
                              Mês de {label} - Sazonalidade & Logística
                            </div>
                            <div className="flex justify-between gap-4 font-mono">
                              <span className="text-slate-300">Recebimento:</span>
                              <span className="font-bold text-emerald-300">{Number(rec).toLocaleString('pt-BR')} Kg</span>
                            </div>
                            <div className="flex justify-between gap-4 font-mono">
                              <span className="text-slate-300">Entregas PAA/PNAE:</span>
                              <span className="font-bold text-sky-300">{Number(ent).toLocaleString('pt-BR')} Kg</span>
                            </div>
                            <div className="flex justify-between gap-4 font-mono pt-1 border-t border-slate-800">
                              <span className="text-slate-400">Saldo Armazenado:</span>
                              <span className="font-bold text-amber-300">+{Math.max(0, diff).toLocaleString('pt-BR')} Kg</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="Recebimento" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Entregas" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Seasonality & Bottleneck Table */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" /> Matriz de Diagnóstico de Gargalos Logísticos e Sazonalidade
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700 text-[10px]">
                    <th className="p-3">Mês</th>
                    <th className="p-3 text-right">Recebimento (Kg)</th>
                    <th className="p-3 text-right">Entregas (Kg)</th>
                    <th className="p-3 text-right">Saldo em Estoque</th>
                    <th className="p-3 text-center">Status de Gargalo Logístico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                  {sazonalidadeChartData.map(row => (
                    <tr key={row.mes} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-3 font-extrabold text-slate-900 dark:text-white">{row.mes}</td>
                      <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {row.Recebimento.toLocaleString('pt-BR')} Kg
                      </td>
                      <td className="p-3 text-right font-bold text-sky-700 dark:text-sky-400">
                        {row.Entregas.toLocaleString('pt-BR')} Kg
                      </td>
                      <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                        +{row.DiferencaEstoque.toLocaleString('pt-BR')} Kg
                      </td>
                      <td className="p-3 text-center">
                        {row.GargaloStatus.includes('Alto') ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black rounded-full border border-amber-300">
                            ⚠️ ALTO (Atenção Logística)
                          </span>
                        ) : row.GargaloStatus.includes('Moderado') ? (
                          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 text-[10px] font-bold rounded-full">
                            ⚡ MODERADO
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                            ✅ BAIXO / NORMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Meta BI */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Cadastrar Meta Estratégica BI</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMeta} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Título da Meta *</label>
                <input
                  type="text"
                  required
                  value={formMeta.nome}
                  onChange={e => setFormMeta({ ...formMeta, nome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Ex: Giro de Estoque PNAE"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Valor Meta *</label>
                  <input
                    type="number"
                    required
                    value={formMeta.valorMeta}
                    onChange={e => setFormMeta({ ...formMeta, valorMeta: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Valor Atual Atingido</label>
                  <input
                    type="number"
                    value={formMeta.atingido}
                    onChange={e => setFormMeta({ ...formMeta, atingido: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Unidade de Medida</label>
                <select
                  value={formMeta.unidade}
                  onChange={e => setFormMeta({ ...formMeta, unidade: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="R$">R$ (Reais)</option>
                  <option value="Kg">Kg (Quilogramas)</option>
                  <option value="Unidades">Unidades / Entregas</option>
                  <option value="Taxa">Taxa de Giro / Cobertura</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  Cadastrar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
