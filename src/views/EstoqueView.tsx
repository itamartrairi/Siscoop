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
    quantidadeAtual: 100,
    estoqueMinimo: 20,
    localizacaoGalpao: 'Galpão A - Prateleira 1'
  });

  const [novaMov, setNovaMov] = useState({
    itemEstoqueId: estoque[0]?.id || '',
    tipoMovimento: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
    quantidade: 100,
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
          quantidade: item.quantidadeAtual || 100,
          valorTotal: (item.quantidadeAtual || 100) * (item.valorUnitarioMedio || 5),
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
        quantidadeAtual: 100,
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
      updateItemEstoque(editingItem.id, itemForm);
    } else {
      addItemEstoque(itemForm);
    }
    setShowItemModal(false);
  };

  const handleAddMov = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!novaMov.quantidade) return;
    addMovimentacaoEstoque(novaMov);
    setShowMovModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <Boxes className="w-3.5 h-3.5" /> Módulo SisEstoque
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SisEstoque - Galpão & Almoxarifado</h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle do saldo físico de hortifruti, grãos, embalagens e insumos nos galpões da cooperativa.
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
              onClick={() => setShowMovModal(true)}
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Código</th>
                    <th className="p-3">Produto / Item</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Localização</th>
                    <th className="p-3 text-right text-emerald-800">Entradas</th>
                    <th className="p-3 text-right text-rose-800">Saídas</th>
                    <th className="p-3 text-right text-indigo-900">Estoque Atual</th>
                    <th className="p-3 text-right">Estoque Mínimo</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estoqueFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                        Nenhum item encontrado para a categoria selecionada.
                      </td>
                    </tr>
                  ) : (
                    estoqueFiltrado.map(item => {
                      const totalEntradas = (movimentacoesEstoque || [])
                        .filter(m => m.itemEstoqueId === item.id && m.tipoMovimento === 'ENTRADA')
                        .reduce((sum, m) => sum + (Number(m.quantidade) || 0), 0);

                      const totalSaidas = (movimentacoesEstoque || [])
                        .filter(m => m.itemEstoqueId === item.id && m.tipoMovimento === 'SAIDA')
                        .reduce((sum, m) => sum + (Number(m.quantidade) || 0), 0);

                      const isBaixo = (item.quantidadeAtual || 0) <= (item.estoqueMinimo || 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono text-slate-500 font-bold">{item.codigoItem || 'N/A'}</td>
                          <td className="p-3 font-extrabold text-slate-900">{item.nomeItem}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]">
                              {item.categoria}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">{item.localizacaoGalpao}</td>
                          
                          {/* Coluna Entradas */}
                          <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                            + {totalEntradas.toLocaleString('pt-BR')} <span className="text-[10px] text-emerald-600/80">{item.unidadeMedida}</span>
                          </td>

                          {/* Coluna Saídas */}
                          <td className="p-3 text-right font-mono font-bold text-rose-700 bg-rose-50/40">
                            - {totalSaidas.toLocaleString('pt-BR')} <span className="text-[10px] text-rose-600/80">{item.unidadeMedida}</span>
                          </td>

                          {/* Coluna Estoque Atual */}
                          <td className="p-3 text-right font-mono font-black text-indigo-900 bg-indigo-50/40 text-sm">
                            {(item.quantidadeAtual || 0).toLocaleString('pt-BR')} <span className="text-xs text-indigo-700 font-semibold">{item.unidadeMedida}</span>
                          </td>

                          <td className="p-3 text-right font-mono text-slate-600">
                            {(item.estoqueMinimo || 0).toLocaleString('pt-BR')} {item.unidadeMedida}
                          </td>

                          <td className="p-3 text-center">
                            {isBaixo ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black rounded text-[10px]">
                                Crítico / Repor
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                                Normal
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenItem(item)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                title="Editar item"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (!canWrite) { blockWriteAction(); return; }
                                  if (confirm(`Deseja excluir o item ${item.nomeItem}?`)) deleteItemEstoque(item.id);
                                }}
                                className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Excluir item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Quantidade</th>
                  <th className="p-3">Motivo / Origem</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimentacoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Nenhuma movimentação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : movimentacoesFiltradas.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="p-3 text-slate-600 font-mono">{m.dataHora}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        m.tipoMovimento === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {m.tipoMovimento}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{m.quantidade}</td>
                    <td className="p-3 text-slate-800">{m.motivo}</td>
                    <td className="p-3 text-slate-600">{m.responsavel}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          if (!canWrite) { blockWriteAction(); return; }
                          if (confirm('Deseja excluir este registro de movimentação?')) deleteMovimentacaoEstoque(m.id);
                        }}
                        className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <label className="block text-slate-700 font-bold mb-1">Quantidade Inicial</label>
                  <input
                    type="number"
                    value={itemForm.quantidadeAtual}
                    onChange={e => setItemForm({ ...itemForm, quantidadeAtual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
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
