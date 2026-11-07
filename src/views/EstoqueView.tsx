import React, { useState, useMemo } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  Boxes,
  Plus,
  Package,
  Pencil,
  Trash2,
  X,
  Filter,
  RotateCcw,
  ShoppingCart,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { ItemEstoque } from '../types';
import { DataGrid, GridStatus } from '../components/ui/DataGrid';

const MESES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const EstoqueView: React.FC = () => {
  const {
    estoque,
    addItemEstoque,
    updateItemEstoque,
    deleteItemEstoque,
    movimentacoesEstoque,
    addMovimentacaoEstoque,
    deleteMovimentacaoEstoque,
    ordensCompra,
    canWriteModule
  } = useCoop();

  const canWrite = canWriteModule('estoque');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'saldos' | 'movimentacoes'>('saldos');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemEstoque | null>(null);

  // Forms
  const [itemForm, setItemForm] = useState({
    codigoItem: '',
    nomeItem: '',
    categoria: 'HORTIFRUTI' as any,
    unidadeMedida: 'KG',
    quantidadeAtual: 0,
    estoqueMinimo: 20,
    localizacaoGalpao: 'Galpão A - Prateleira 1'
  });

  const [novaMov, setNovaMov] = useState({
    itemEstoqueId: estoque[0]?.id || '',
    tipoMovimento: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
    quantidade: 0,
    motivo: 'Recebimento de Lote de Produtos dos Cooperados',
    responsavel: 'Operador do Galpão'
  });

  // Filtros do histórico de movimentações
  const [filtroAno, setFiltroAno] = useState('TODOS');
  const [filtroMes, setFiltroMes] = useState('TODOS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroItemId, setFiltroItemId] = useState('TODOS');

  const anosDisponiveis = useMemo(() => {
    const anos: string[] = Array.from(new Set(movimentacoesEstoque.map(m => m.dataHora.substring(0, 4))));
    return anos.sort((a, b) => b.localeCompare(a));
  }, [movimentacoesEstoque]);

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoesEstoque.filter(m => {
      if (filtroAno !== 'TODOS' && m.dataHora.substring(0, 4) !== filtroAno) return false;
      if (filtroMes !== 'TODOS' && m.dataHora.substring(5, 7) !== filtroMes) return false;
      if (filtroTipo !== 'TODOS' && m.tipoMovimento !== filtroTipo) return false;
      if (filtroItemId !== 'TODOS' && m.itemEstoqueId !== filtroItemId) return false;
      return true;
    });
  }, [movimentacoesEstoque, filtroAno, filtroMes, filtroTipo, filtroItemId]);

  const limparFiltros = () => {
    setFiltroAno('TODOS');
    setFiltroMes('TODOS');
    setFiltroTipo('TODOS');
    setFiltroItemId('TODOS');
  };

  // Filtro de categoria do saldo de estoque
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const categoriasDisponiveis = useMemo(() => {
    return Array.from(new Set(estoque.map(i => i.categoria))).sort();
  }, [estoque]);
  // Top 10 Produtos mais comprados (agregado de Ordens de Compra e Movimentações de Entrada)
  const top10Comprados = useMemo(() => {
    const mapaProdutos: Record<string, { nome: string; quantidade: number; valorTotal: number; unidade: string }> = {};

    (ordensCompra || []).forEach(ord => {
      (ord.itens || []).forEach(it => {
        const key = (it.descricao || 'Item').trim();
        if (!mapaProdutos[key]) {
          mapaProdutos[key] = {
            nome: key,
            quantidade: 0,
            valorTotal: 0,
            unidade: it.unidade || 'UN'
          };
        }
        mapaProdutos[key].quantidade += Number(it.quantidade) || 0;
        mapaProdutos[key].valorTotal += Number(it.subtotal || (it.quantidade * it.precoUnitario)) || 0;
      });
    });

    // Se ordens de compra estiverem vazias ou reduzidas, complementar com entradas no estoque
    if (Object.keys(mapaProdutos).length === 0) {
      (movimentacoesEstoque || []).filter(m => m.tipoMovimento === 'ENTRADA').forEach(m => {
        const itemEst = (estoque || []).find(e => e.id === m.itemEstoqueId);
        const key = itemEst ? itemEst.nomeItem : 'Insumo de Entrada';
        if (!mapaProdutos[key]) {
          mapaProdutos[key] = {
            nome: key,
            quantidade: 0,
            valorTotal: 0,
            unidade: itemEst?.unidadeMedida || 'KG'
          };
        }
        mapaProdutos[key].quantidade += Number(m.quantidade) || 0;
      });
    }

    // Se ainda vazio, pegar os itens do próprio estoque como fallback informativo
    if (Object.keys(mapaProdutos).length === 0) {
      (estoque || []).forEach(item => {
        mapaProdutos[item.nomeItem] = {
          nome: item.nomeItem,
          quantidade: item.quantidadeAtual || 0,
          valorTotal: (item.quantidadeAtual || 0) * (item.valorUnitarioMedio || 0),
          unidade: item.unidadeMedida || 'KG'
        };
      });
    }

    return Object.values(mapaProdutos)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [ordensCompra, movimentacoesEstoque, estoque]);

    const estoqueFiltrado = useMemo(() => {
    if (filtroCategoria === 'TODAS') return estoque;
    return estoque.filter(i => i.categoria === filtroCategoria);
  }, [estoque, filtroCategoria]);

  // Handlers
  const handleOpenItem = (item?: ItemEstoque) => {
        if (!canWrite) { blockWriteAction(); return; }
if (item) {
      setEditingItem(item);
      setItemForm({
        codigoItem: item.codigoItem || '',
        nomeItem: item.nomeItem,
        categoria: item.categoria,
        unidadeMedida: item.unidadeMedida,
        quantidadeAtual: item.quantidadeAtual,
        estoqueMinimo: item.estoqueMinimo,
        localizacaoGalpao: item.localizacaoGalpao || ''
      });
    } else {
      setEditingItem(null);
      setItemForm({
        codigoItem: `EST-${Date.now().toString().slice(-4)}`,
        nomeItem: '',
        categoria: 'HORTIFRUTI',
        unidadeMedida: 'KG',
        quantidadeAtual: 0,
        estoqueMinimo: 20,
        localizacaoGalpao: 'Galpão Principal'
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!itemForm.nomeItem) return;
    if (editingItem) {
      const { quantidadeAtual: _saldo, ...dadosSemSaldo } = itemForm; // saldo muda só por movimentação
      updateItemEstoque(editingItem.id, dadosSemSaldo);
    } else {
      addItemEstoque(itemForm);
    }
    setShowItemModal(false);
  };

  const handleAddMov = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!novaMov.itemEstoqueId || !(novaMov.quantidade > 0)) { alert('Selecione o item e informe uma quantidade maior que zero.'); return; }
    addMovimentacaoEstoque(novaMov);
    setShowMovModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <Boxes className="w-3.5 h-3.5" /> Entreposto & Armazenamento da Cooperativa
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Galpão & Estoque de Produção Agrícola</h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle do saldo físico de safras recebidas dos cooperados (hortifruti, grãos, beneficiados), insumos e embalagens nos galpões e entrepostos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'saldos' && (
            <button
              onClick={() => handleOpenItem()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Item de Estoque
            </button>
          )}
          {activeTab === 'movimentacoes' && (
            <button
              onClick={() => { if (!canWrite) { blockWriteAction(); return; } setNovaMov({ itemEstoqueId: estoque[0]?.id || '', tipoMovimento: 'ENTRADA', quantidade: 0, motivo: '', responsavel: 'Operador do Galpão' }); setShowMovModal(true); }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Lançar Movimentação
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('saldos')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'saldos'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" /> Saldo Atual de Produtos ({estoque.length})
        </button>
        <button
          onClick={() => setActiveTab('movimentacoes')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'movimentacoes'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" /> Histórico de Movimentações ({movimentacoesEstoque.length})
        </button>
      </div>

      {/* Tab Saldos */}
      {activeTab === 'saldos' && (
        <div className="space-y-6">
          {/* Gráfico dos 10 Produtos Mais Comprados */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  Top 10 Produtos Mais Comprados
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Volume total de compras por produto registrado no módulo de Compras e Entradas do Almoxarifado.
                </p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 w-fit">
                {top10Comprados.length} produtos em destaque
              </span>
            </div>

            <div className="h-[270px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Comprados} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="nome"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={val => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number, name: string, item: any) => [
                      `${Number(val).toLocaleString('pt-BR')} ${item.payload.unidade}`,
                      'Qtd Comprada'
                    ]}
                  />
                  <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                    {top10Comprados.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#059669' : index < 3 ? '#10b981' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de Estoque com Entradas, Saídas e Estoque Atual */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-600">Filtrar por Categoria:</label>
                <select
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                  className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                >
                  <option value="TODAS">Todas as categorias</option>
                  {categoriasDisponiveis.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-bold text-slate-600">
                Exibindo <strong className="text-emerald-700">{estoqueFiltrado.length}</strong> de {estoque.length} item(ns)
              </span>
            </div>

            <DataGrid
              rows={estoqueFiltrado}
              getRowId={item => item.id}
              pageSize={20}
              onRowDoubleClick={item => handleOpenItem(item)}
              panelTitle={item => item.nomeItem}
              panelSubtitle={item => item.codigoItem || ''}
              emptyMessage="Nenhum item encontrado para a categoria selecionada."
              columns={[
                {
                  key: 'status',
                  header: 'Situação',
                  width: 130,
                  value: item => ((item.quantidadeAtual || 0) <= (item.estoqueMinimo || 0) ? 'Repor' : 'Normal'),
                  render: item =>
                    (item.quantidadeAtual || 0) <= (item.estoqueMinimo || 0)
                      ? <GridStatus tone="danger" label="Repor" />
                      : <GridStatus tone="success" label="Normal" />,
                },
                { key: 'codigoItem', header: 'Código', width: 100 },
                { key: 'nomeItem', header: 'Produto / Item', width: 240 },
                { key: 'categoria', header: 'Categoria', width: 140 },
                { key: 'localizacaoGalpao', header: 'Localização', width: 150 },
                { key: 'unidadeMedida', header: 'Unidade', width: 80, align: 'center' },
                {
                  key: 'entradas',
                  header: 'Entradas',
                  width: 110,
                  align: 'right',
                  value: item => (movimentacoesEstoque || []).filter(m => m.itemEstoqueId === item.id && m.tipoMovimento === 'ENTRADA').reduce((s, m) => s + (Number(m.quantidade) || 0), 0),
                  render: item => (movimentacoesEstoque || []).filter(m => m.itemEstoqueId === item.id && m.tipoMovimento === 'ENTRADA').reduce((s, m) => s + (Number(m.quantidade) || 0), 0).toLocaleString('pt-BR'),
                },
                {
                  key: 'saidas',
                  header: 'Saídas',
                  width: 110,
                  align: 'right',
                  value: item => (movimentacoesEstoque || []).filter(m => m.itemEstoqueId === item.id && m.tipoMovimento === 'SAIDA').reduce((s, m) => s + (Number(m.quantidade) || 0), 0),
                  render: item => (movimentacoesEstoque || []).filter(m => m.itemEstoqueId === item.id && m.tipoMovimento === 'SAIDA').reduce((s, m) => s + (Number(m.quantidade) || 0), 0).toLocaleString('pt-BR'),
                },
                {
                  key: 'quantidadeAtual',
                  header: 'Estoque Atual',
                  width: 120,
                  align: 'right',
                  value: item => item.quantidadeAtual || 0,
                  render: item => <strong>{(item.quantidadeAtual || 0).toLocaleString('pt-BR')}</strong>,
                },
                {
                  key: 'estoqueMinimo',
                  header: 'Estoque Mínimo',
                  width: 120,
                  align: 'right',
                  value: item => item.estoqueMinimo || 0,
                  render: item => (item.estoqueMinimo || 0).toLocaleString('pt-BR'),
                },
              ]}
              actions={[
                { label: 'Editar', icon: Pencil, onClick: item => handleOpenItem(item) },
                {
                  label: 'Excluir',
                  icon: Trash2,
                  tone: 'danger',
                  divider: true,
                  onClick: item => {
                    if (!canWrite) { blockWriteAction(); return; }
                    if (confirm(`Deseja excluir o item ${item.nomeItem}?`)) deleteItemEstoque(item.id);
                  },
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* Tab Movimentacoes */}
      {activeTab === 'movimentacoes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Ano</label>
              <select
                value={filtroAno}
                onChange={e => setFiltroAno(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="TODOS">Todos</option>
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Mês</label>
              <select
                value={filtroMes}
                onChange={e => setFiltroMes(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="TODOS">Todos</option>
                {MESES_LABEL.map((nome, idx) => (
                  <option key={nome} value={String(idx + 1).padStart(2, '0')}>{nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Tipo</label>
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="TODOS">Todos</option>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
                <option value="TRANSFERENCIA">Transferência</option>
                <option value="PERDA">Perda</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Item</label>
              <select
                value={filtroItemId}
                onChange={e => setFiltroItemId(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white max-w-[220px]"
              >
                <option value="TODOS">Todos os itens</option>
                {estoque.map(i => (
                  <option key={i.id} value={i.id}>{i.nomeItem}</option>
                ))}
              </select>
            </div>
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
            <span className="text-[11px] text-slate-400 font-semibold ml-auto">
              {movimentacoesFiltradas.length} de {movimentacoesEstoque.length} registro(s)
            </span>
          </div>

          <DataGrid
              rows={movimentacoesFiltradas}
              getRowId={m => m.id}
              pageSize={20}
              panelTitle={m => (m.tipoMovimento === 'ENTRADA' ? 'Entrada' : 'Saída') + ' · ' + (estoque.find(i => i.id === m.itemEstoqueId)?.nomeItem || 'Item')}
              panelSubtitle={m => m.dataHora}
              emptyMessage="Nenhuma movimentação encontrada para os filtros selecionados."
              columns={[
                {
                  key: 'tipoMovimento',
                  header: 'Tipo',
                  width: 110,
                  value: m => (m.tipoMovimento === 'ENTRADA' ? 'Entrada' : 'Saída'),
                  render: m => (
                    <GridStatus tone={m.tipoMovimento === 'ENTRADA' ? 'success' : 'danger'} label={m.tipoMovimento === 'ENTRADA' ? 'Entrada' : 'Saída'} />
                  ),
                },
                { key: 'dataHora', header: 'Data / Hora', width: 150 },
                { key: 'item', header: 'Item', width: 220, value: m => estoque.find(i => i.id === m.itemEstoqueId)?.nomeItem },
                {
                  key: 'quantidade',
                  header: 'Quantidade',
                  width: 110,
                  align: 'right',
                  value: m => Number(m.quantidade) || 0,
                  render: m => (Number(m.quantidade) || 0).toLocaleString('pt-BR'),
                },
                { key: 'motivo', header: 'Motivo / Origem', width: 260, value: m => m.motivo || m.motivoHist || '' },
                { key: 'responsavel', header: 'Responsável', width: 160 },
              ]}
              actions={[
                {
                  label: 'Excluir',
                  icon: Trash2,
                  tone: 'danger',
                  onClick: m => {
                    if (!canWrite) { blockWriteAction(); return; }
                    if (confirm('Deseja excluir esta movimentação? O saldo do item será ajustado (a quantidade volta ao estoque ou é retirada).')) deleteMovimentacaoEstoque(m.id);
                  },
                },
              ]}
            />
        </div>
      )}

      {/* Modal Item Estoque */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingItem ? 'Editar Item de Estoque' : 'Novo Item de Estoque'}
              </h2>
              <button onClick={() => setShowItemModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nome do Item *</label>
                <input
                  type="text"
                  required
                  value={itemForm.nomeItem}
                  onChange={e => setItemForm({ ...itemForm, nomeItem: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Milho em Grão Seco"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">{editingItem ? 'Saldo atual (altere por movimentação)' : 'Quantidade Inicial'}</label>
                  <input
                    type="number"
                    value={itemForm.quantidadeAtual}
                    min="0"
                    step="any"
                    disabled={!!editingItem}
                    onChange={e => setItemForm({ ...itemForm, quantidadeAtual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unidade</label>
                  <input
                    type="text"
                    value={itemForm.unidadeMedida}
                    onChange={e => setItemForm({ ...itemForm, unidadeMedida: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Localização no Galpão</label>
                <input
                  type="text"
                  value={itemForm.localizacaoGalpao}
                  onChange={e => setItemForm({ ...itemForm, localizacaoGalpao: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
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

      {/* Modal Nova Movimentação */}
      {showMovModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">Lançar Movimentação de Estoque</h2>
              <button onClick={() => setShowMovModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMov} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Item do Estoque</label>
                <select
                  value={novaMov.itemEstoqueId}
                  onChange={e => setNovaMov({ ...novaMov, itemEstoqueId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                >
                  {estoque.map(i => (
                    <option key={i.id} value={i.id}>{i.nomeItem} ({i.quantidadeAtual} {i.unidadeMedida})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tipo de Movimentação</label>
                <select
                  value={novaMov.tipoMovimento}
                  onChange={e => setNovaMov({ ...novaMov, tipoMovimento: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="ENTRADA">Entrada (Recebimento / Produção)</option>
                  <option value="SAIDA">Saída (Expedição / Entrega PNAE)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Quantidade</label>
                <input
                  type="number"
                  required
                  value={novaMov.quantidade}
                  onChange={e => setNovaMov({ ...novaMov, quantidade: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Motivo / Justificativa</label>
                <input
                  type="text"
                  required
                  value={novaMov.motivo}
                  onChange={e => setNovaMov({ ...novaMov, motivo: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMovModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Confirmar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
