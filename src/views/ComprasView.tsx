import React, { useState, useMemo } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  ShoppingCart,
  Plus,
  Truck,
  Pencil,
  Trash2,
  X,
  Filter,
  RotateCcw
} from 'lucide-react';
import { SolicitacaoCompra, Fornecedor, ItemEstoque } from '../types';

const MESES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const ComprasView: React.FC = () => {
  const {
    solicitacoesCompra,
    addSolicitacaoCompra,
    updateSolicitacaoCompra,
    deleteSolicitacaoCompra,
    ordensCompra,
    addOrdemCompra,
    updateOrdemCompra,
    deleteOrdemCompra,
    fornecedores,
    addFornecedor,
    updateFornecedor,
    deleteFornecedor,
    estoque,
    canWriteModule
  } = useCoop();

  const canWrite = canWriteModule('compras');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'solicitacoes' | 'ordens' | 'fornecedores'>('solicitacoes');

  // Editing state
  const [editingSolicitacao, setEditingSolicitacao] = useState<SolicitacaoCompra | null>(null);
  const [editingOrdem, setEditingOrdem] = useState<any | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  // Modals
  const [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  const [showOrdemModal, setShowOrdemModal] = useState(false);
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [solicitacaoItens, setSolicitacaoItens] = useState<{ estoqueItemId?: string; descricao: string; quantidade: number; unidade: string }[]>([]);
  const [ordemItens, setOrdemItens] = useState<{ estoqueItemId?: string; descricao: string; quantidade: number; unidade: string; precoUnitario: number; subtotal: number }[]>([]);

  // Filtros - Solicitações de Compra
  const [filtroSolAno, setFiltroSolAno] = useState('TODOS');
  const [filtroSolMes, setFiltroSolMes] = useState('TODOS');
  const [filtroSolStatus, setFiltroSolStatus] = useState('TODOS');
  const [filtroSolPrioridade, setFiltroSolPrioridade] = useState('TODOS');

  const solAnosDisponiveis = useMemo(() => {
    const anos: string[] = Array.from(new Set(solicitacoesCompra.map(s => (s.dataSolicitacao || '').substring(0, 4)).filter(Boolean)));
    return anos.sort((a, b) => b.localeCompare(a));
  }, [solicitacoesCompra]);
  const solStatusDisponiveis = useMemo(() => {
    return Array.from(new Set(solicitacoesCompra.map(s => s.status).filter(Boolean)));
  }, [solicitacoesCompra]);

  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoesCompra.filter(s => {
      if (filtroSolAno !== 'TODOS' && (s.dataSolicitacao || '').substring(0, 4) !== filtroSolAno) return false;
      if (filtroSolMes !== 'TODOS' && (s.dataSolicitacao || '').substring(5, 7) !== filtroSolMes) return false;
      if (filtroSolStatus !== 'TODOS' && s.status !== filtroSolStatus) return false;
      if (filtroSolPrioridade !== 'TODOS' && s.prioridade !== filtroSolPrioridade) return false;
      return true;
    });
  }, [solicitacoesCompra, filtroSolAno, filtroSolMes, filtroSolStatus, filtroSolPrioridade]);

  const limparFiltrosSolicitacoes = () => {
    setFiltroSolAno('TODOS');
    setFiltroSolMes('TODOS');
    setFiltroSolStatus('TODOS');
    setFiltroSolPrioridade('TODOS');
  };

  // Filtros - Ordens de Compra
  const [filtroOrdAno, setFiltroOrdAno] = useState('TODOS');
  const [filtroOrdMes, setFiltroOrdMes] = useState('TODOS');
  const [filtroOrdStatus, setFiltroOrdStatus] = useState('TODOS');
  const [filtroOrdFornecedorId, setFiltroOrdFornecedorId] = useState('TODOS');

  const ordAnosDisponiveis = useMemo(() => {
    const anos: string[] = Array.from(new Set(ordensCompra.map(o => (o.dataEmissao || '').substring(0, 4)).filter(Boolean)));
    return anos.sort((a, b) => b.localeCompare(a));
  }, [ordensCompra]);
  const ordStatusDisponiveis = useMemo(() => {
    return Array.from(new Set(ordensCompra.map(o => o.status).filter(Boolean)));
  }, [ordensCompra]);

  const ordensFiltradas = useMemo(() => {
    return ordensCompra.filter(o => {
      if (filtroOrdAno !== 'TODOS' && (o.dataEmissao || '').substring(0, 4) !== filtroOrdAno) return false;
      if (filtroOrdMes !== 'TODOS' && (o.dataEmissao || '').substring(5, 7) !== filtroOrdMes) return false;
      if (filtroOrdStatus !== 'TODOS' && o.status !== filtroOrdStatus) return false;
      if (filtroOrdFornecedorId !== 'TODOS' && o.fornecedorId !== filtroOrdFornecedorId) return false;
      return true;
    });
  }, [ordensCompra, filtroOrdAno, filtroOrdMes, filtroOrdStatus, filtroOrdFornecedorId]);

  const limparFiltrosOrdens = () => {
    setFiltroOrdAno('TODOS');
    setFiltroOrdMes('TODOS');
    setFiltroOrdStatus('TODOS');
    setFiltroOrdFornecedorId('TODOS');
  };

  // Forms
  const [solicitacaoForm, setSolicitacaoForm] = useState({
    departamentoSolicitante: 'LOGISTICA_E_EMBALAGEM',
    itemDescricao: '',
    quantidade: 100,
    unidadeMedida: 'UNIDADE',
    prioridade: 'MEDIA' as 'BAIXA' | 'MEDIA' | 'ALTA',
    valorEstimado: 2500,
    justificativa: ''
  });

  const [ordemForm, setOrdemForm] = useState({
    numeroOrdem: `OC-${Date.now().toString().slice(-5)}`,
    solicitacaoId: '',
    fornecedorId: '',
    fornecedorNome: '',
    itemDescricao: 'Caixas de Papelão PNAE 20kg',
    quantidade: 100,
    unidadeMedida: 'UN',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataPrevisaoEntrega: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
    valorTotal: 3500,
    condicoesPagamento: '30 Dias Fatura Boleto',
    observacoes: 'Entregar no Galpão Central da Cooperativa em Caixas Identificadas.'
  });

  const [fornecedorForm, setFornecedorForm] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    categoria: 'EMBALAGENS' as any,
    contatoNome: '',
    telefone: '',
    email: ''
  });

  // Handlers
  const handleOpenSolicitacao = (s?: SolicitacaoCompra) => {
        if (!canWrite) { blockWriteAction(); return; }
if (s) {
      setEditingSolicitacao(s);
      setSolicitacaoForm({
        departamentoSolicitante: s.departamentoSolicitante || 'LOGISTICA_E_EMBALAGEM',
        itemDescricao: s.itemDescricao || '',
        quantidade: s.quantidade || 100,
        unidadeMedida: s.unidadeMedida || 'UN',
        prioridade: s.prioridade || 'MEDIA',
        valorEstimado: s.valorEstimado || 0,
        justificativa: s.justificativa || ''
      });
      setSolicitacaoItens(s.itens?.length ? s.itens : [{ descricao: s.itemDescricao || '', quantidade: s.quantidade || 1, unidade: s.unidadeMedida || 'UN' }]);
    } else {
      setEditingSolicitacao(null);
      setSolicitacaoForm({
        departamentoSolicitante: 'LOGISTICA_E_EMBALAGEM',
        itemDescricao: '',
        quantidade: 100,
        unidadeMedida: 'UN',
        prioridade: 'MEDIA',
        valorEstimado: 2500,
        justificativa: 'Aquisição preventiva para operações do PAA/PNAE'
      });
      setSolicitacaoItens([{ descricao: '', quantidade: 1, unidade: 'UN' }]);
      setSolicitacaoItens([{ descricao: '', quantidade: 1, unidade: 'UN' }]);
    }
    setShowSolicitacaoModal(true);
  };

  const handleSaveSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    const itens = solicitacaoItens.filter(i => i.descricao.trim() && i.quantidade > 0);
    if (!itens.length) return;
    const primeiro = itens[0];
    if (editingSolicitacao) {
      updateSolicitacaoCompra(editingSolicitacao.id, { ...solicitacaoForm, itemDescricao: primeiro.descricao, quantidade: primeiro.quantidade, unidadeMedida: primeiro.unidade, itens });
    } else {
      addSolicitacaoCompra({
        ...solicitacaoForm,
        itemDescricao: primeiro.descricao,
        quantidade: primeiro.quantidade,
        unidadeMedida: primeiro.unidade,
        itens,
        dataSolicitacao: new Date().toISOString().split('T')[0],
        status: 'ABERTA'
      });
    }
    setShowSolicitacaoModal(false);
  };

  const handleOpenOrdem = (o?: any) => {
        if (!canWrite) { blockWriteAction(); return; }
if (o) {
      setEditingOrdem(o);
      const firstItem = (o.itens && o.itens.length > 0) ? o.itens[0] : null;
      setOrdemForm({
        numeroOrdem: o.numeroOrdem,
        solicitacaoId: o.solicitacaoId || '',
        fornecedorId: o.fornecedorId,
        fornecedorNome: o.fornecedorNome,
        itemDescricao: firstItem?.descricao || firstItem?.descricaoItem || o.observacoes || 'Insumos Agrícolas / Embalagens',
        quantidade: firstItem?.quantidade || 100,
        unidadeMedida: firstItem?.unidade || 'UN',
        dataEmissao: o.dataEmissao,
        dataPrevisaoEntrega: o.dataPrevisaoEntrega,
        valorTotal: o.valorTotal,
        condicoesPagamento: o.condicoesPagamento || o.condicaoPagamento || '30 Dias Fatura Boleto',
        observacoes: o.observacoes || ''
      });
      setOrdemItens(o.itens?.length ? o.itens : [{ descricao: firstItem?.descricao || '', quantidade: firstItem?.quantidade || 1, unidade: firstItem?.unidade || 'UN', precoUnitario: firstItem?.precoUnitario || 0, subtotal: firstItem?.subtotal || 0 }]);
    } else {
      setEditingOrdem(null);
      const fPadrao = fornecedores[0];
      setOrdemForm({
        numeroOrdem: `OC-${Date.now().toString().slice(-5)}`,
        solicitacaoId: '',
        fornecedorId: fPadrao?.id || 'f-1',
        fornecedorNome: fPadrao?.razaoSocial || 'Fornecedor Agro Insumos LTDA',
        itemDescricao: 'Caixas de Papelão PNAE 20kg',
        quantidade: 100,
        unidadeMedida: 'UN',
        dataEmissao: new Date().toISOString().split('T')[0],
        dataPrevisaoEntrega: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
        valorTotal: 3500,
        condicoesPagamento: '30 Dias Fatura Boleto',
        observacoes: 'Entregar no Galpão Central da Cooperativa em Caixas Identificadas.'
      });
      setOrdemItens([]);
    }
    setShowOrdemModal(true);
  };

  const handleConvertSolicitacaoToOrdem = (s: SolicitacaoCompra) => {
        if (!canWrite) { blockWriteAction(); return; }
const fPadrao = fornecedores[0];
    setEditingOrdem(null);
    setOrdemForm({
      numeroOrdem: `OC-${Date.now().toString().slice(-5)}`,
      solicitacaoId: s.id,
      fornecedorId: fPadrao?.id || 'f-1',
      fornecedorNome: fPadrao?.razaoSocial || 'Fornecedor Agro Insumos LTDA',
      itemDescricao: s.itemDescricao || 'Insumos Solicitados',
      quantidade: s.quantidade || 100,
      unidadeMedida: s.unidadeMedida || 'UN',
      dataEmissao: new Date().toISOString().split('T')[0],
      dataPrevisaoEntrega: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
      valorTotal: s.valorEstimado || 2500,
      condicoesPagamento: '30 Dias Fatura Boleto',
      observacoes: `Solicitação #${s.numeroSolicitacao || s.id} - ${s.justificativa || ''}`
    });
    setOrdemItens((s.itens?.length ? s.itens : [{ descricao: s.itemDescricao || 'Insumos Solicitados', quantidade: s.quantidade || 1, unidade: s.unidadeMedida || 'UN' }]).map(i => ({ ...i, precoUnitario: 0, subtotal: 0 })));
    updateSolicitacaoCompra(s.id, { status: 'EM_COTACAO' });
    setShowOrdemModal(true);
  };

  const handleSaveOrdem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    const itens = ordemItens.filter(i => i.descricao.trim() && i.quantidade > 0).map(i => ({ ...i, subtotal: i.quantidade * i.precoUnitario }));
    if (!ordemForm.fornecedorNome || !itens.length) return;
    const valorTotal = itens.reduce((sum, i) => sum + i.subtotal, 0);
    if (editingOrdem) {
      updateOrdemCompra(editingOrdem.id, {
        ...ordemForm,
        valorTotal,
        itens
      });
    } else {
      addOrdemCompra({
        ...ordemForm,
        condicaoPagamento: ordemForm.condicoesPagamento,
        status: 'APROVADA',
        itens
      });
    }
    setShowOrdemModal(false);
  };

  const handleOpenFornecedor = (f?: Fornecedor) => {
        if (!canWrite) { blockWriteAction(); return; }
if (f) {
      setEditingFornecedor(f);
      setFornecedorForm({
        razaoSocial: f.razaoSocial,
        nomeFantasia: f.nomeFantasia || f.razaoSocial,
        cnpj: f.cnpj,
        categoria: f.categoria,
        contatoNome: f.contatoNome || '',
        telefone: f.telefone || '',
        email: f.email || ''
      });
    } else {
      setEditingFornecedor(null);
      setFornecedorForm({
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        categoria: 'EMBALAGENS',
        contatoNome: '',
        telefone: '(88) 98888-0000',
        email: ''
      });
    }
    setShowFornecedorModal(true);
  };

  const handleSaveFornecedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!fornecedorForm.razaoSocial || !fornecedorForm.cnpj) return;
    if (editingFornecedor) {
      updateFornecedor(editingFornecedor.id, fornecedorForm);
    } else {
      addFornecedor({
        ...fornecedorForm,
        statusHomologacao: 'HOMOLOGADO'
      });
    }
    setShowFornecedorModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <ShoppingCart className="w-3.5 h-3.5" /> Módulo SisCompras
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SisCompras - Suprimentos e Cotações</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de ordens de compra, homologação de fornecedores de insumos agrícolas e embalagens para a cooperativa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'solicitacoes' && (
            <button
              onClick={() => handleOpenSolicitacao()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nova Solicitação de Compra
            </button>
          )}
          {activeTab === 'ordens' && (
            <button
              onClick={() => handleOpenOrdem()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Emissão de Ordem de Compra
            </button>
          )}
          {activeTab === 'fornecedores' && (
            <button
              onClick={() => handleOpenFornecedor()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Fornecedor Homologado
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('solicitacoes')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'solicitacoes'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Solicitações de Compras ({solicitacoesCompra.length})
        </button>
        <button
          onClick={() => setActiveTab('ordens')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'ordens'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-emerald-600" /> Ordens de Compra OC ({ordensCompra.length})
        </button>
        <button
          onClick={() => setActiveTab('fornecedores')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'fornecedores'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" /> Fornecedores Homologados ({fornecedores.length})
        </button>
      </div>

      {/* Tab Solicitacoes */}
      {activeTab === 'solicitacoes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Ano</label>
              <select value={filtroSolAno} onChange={e => setFiltroSolAno(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {solAnosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Mês</label>
              <select value={filtroSolMes} onChange={e => setFiltroSolMes(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {MESES_LABEL.map((nome, idx) => <option key={nome} value={String(idx + 1).padStart(2, '0')}>{nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Status</label>
              <select value={filtroSolStatus} onChange={e => setFiltroSolStatus(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {solStatusDisponiveis.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Prioridade</label>
              <select value={filtroSolPrioridade} onChange={e => setFiltroSolPrioridade(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todas</option>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
            <button onClick={limparFiltrosSolicitacoes} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
            <span className="text-[11px] text-slate-400 font-semibold ml-auto">
              {solicitacoesFiltradas.length} de {solicitacoesCompra.length} registro(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Data</th>
                  <th className="p-3">Item / Insumo</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Quantidade</th>
                  <th className="p-3">Prioridade</th>
                  <th className="p-3">Valor Est.</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitacoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Nenhuma solicitação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : solicitacoesFiltradas.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="p-3 text-slate-600 font-mono">{s.dataSolicitacao}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {s.itens?.length ? `${s.itens.length} produto(s) solicitado(s)` : s.itemDescricao}
                      {s.itens?.length ? <div className="text-[10px] text-emerald-700 font-semibold mt-1">{s.itens.map(i => `${i.descricao} (${i.quantidade} ${i.unidade})`).join(' · ')}</div> : null}
                      <div className="text-[10px] text-slate-500 font-normal">{s.justificativa}</div>
                    </td>
                    <td className="p-3 text-slate-700">{s.departamentoSolicitante}</td>
                    <td className="p-3 font-bold text-slate-900">{s.quantidade} {s.unidadeMedida}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        s.prioridade === 'ALTA' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {s.prioridade}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-700">R$ {(s.valorEstimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleConvertSolicitacaoToOrdem(s)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all border border-emerald-200 mr-1"
                          title="Gerar Ordem de Compra e Enviar ao Estoque"
                        >
                          <ShoppingCart className="w-3 h-3" /> Gerar OC
                        </button>
                        <button
                          onClick={() => handleOpenSolicitacao(s)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canWrite) { blockWriteAction(); return; }
                            if (confirm('Deseja excluir esta solicitação de compra?')) deleteSolicitacaoCompra(s.id);
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

      {/* Tab Ordens de Compra */}
      {activeTab === 'ordens' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Ano</label>
              <select value={filtroOrdAno} onChange={e => setFiltroOrdAno(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {ordAnosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Mês</label>
              <select value={filtroOrdMes} onChange={e => setFiltroOrdMes(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {MESES_LABEL.map((nome, idx) => <option key={nome} value={String(idx + 1).padStart(2, '0')}>{nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Status</label>
              <select value={filtroOrdStatus} onChange={e => setFiltroOrdStatus(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {ordStatusDisponiveis.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Fornecedor</label>
              <select value={filtroOrdFornecedorId} onChange={e => setFiltroOrdFornecedorId(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white max-w-[220px]">
                <option value="TODOS">Todos</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nomeFantasia || f.razaoSocial}</option>)}
              </select>
            </div>
            <button onClick={limparFiltrosOrdens} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
            <span className="text-[11px] text-slate-400 font-semibold ml-auto">
              {ordensFiltradas.length} de {ordensCompra.length} registro(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Nº Ordem OC</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Data Emissão</th>
                  <th className="p-3">Prev. Entrega</th>
                  <th className="p-3">Condições Pagto.</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3">Status OC</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordensFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Nenhuma ordem de compra encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  ordensFiltradas.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-extrabold text-slate-900">{o.numeroOrdem}</td>
                      <td className="p-3 font-bold text-slate-800">
                        {o.fornecedorNome}
                        <div className="text-[10px] text-emerald-700 font-semibold">{o.itens?.length || 0} produto(s) • {o.solicitacaoId ? 'Vinculada à solicitação' : 'Compra avulsa'}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{o.observacoes}</div>
                      </td>
                      <td className="p-3 text-slate-600 font-semibold">{o.dataEmissao}</td>
                      <td className="p-3 text-slate-600 font-semibold">{o.dataPrevisaoEntrega}</td>
                      <td className="p-3 text-slate-700 font-medium">{o.condicoesPagamento}</td>
                      <td className="p-3 font-extrabold text-emerald-700 text-sm">
                        R$ {(o.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenOrdem(o)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                            title="Editar Ordem"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!canWrite) { blockWriteAction(); return; }
                              if (confirm(`Deseja excluir a ordem de compra ${o.numeroOrdem}?`)) deleteOrdemCompra(o.id);
                            }}
                            className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Fornecedores */}
      {activeTab === 'fornecedores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fornecedores.map(f => (
            <div key={f.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">{f.razaoSocial}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">{f.categoria}</span>
                  <button
                    onClick={() => handleOpenFornecedor(f)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (!canWrite) { blockWriteAction(); return; }
                      if (confirm(`Deseja excluir o fornecedor ${f.razaoSocial}?`)) deleteFornecedor(f.id);
                    }}
                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-600 font-mono">CNPJ: {f.cnpj}</div>
              <div className="text-xs text-slate-700">Contato: {f.contatoNome} ({f.telefone})</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Solicitação */}
      {showSolicitacaoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingSolicitacao ? 'Editar Solicitação de Compra' : 'Nova Solicitação de Compra'}
              </h2>
              <button onClick={() => setShowSolicitacaoModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSolicitacao} className="space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between"><div><div className="font-black text-slate-800">Produtos solicitados</div><div className="text-[10px] text-slate-500">Selecione produtos previamente cadastrados no SisEstoque.</div></div><button type="button" onClick={() => setSolicitacaoItens([...solicitacaoItens, { descricao: '', quantidade: 1, unidade: 'UN' }])} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold">+ Adicionar produto</button></div>
                {solicitacaoItens.map((item, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_110px_90px_32px] gap-2 items-end">
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Produto do estoque</label><select required value={item.estoqueItemId || ''} onChange={e => { const p = estoque.find(x => x.id === e.target.value); setSolicitacaoItens(solicitacaoItens.map((x, i) => i === index ? { ...x, estoqueItemId: p?.id, descricao: p?.nomeItem || '', unidade: p?.unidadeMedida || x.unidade } : x)); }} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"><option value="">Selecione um produto</option>{estoque.map(p => <option key={p.id} value={p.id}>{p.codigoSku || p.codigoItem || '—'} — {p.nomeItem}</option>)}</select></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Quantidade</label><input type="number" min="1" required value={item.quantidade} onChange={e => setSolicitacaoItens(solicitacaoItens.map((x, i) => i === index ? { ...x, quantidade: Number(e.target.value) || 0 } : x))} className="w-full p-2.5 border border-slate-200 rounded-xl" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Unidade</label><input value={item.unidade} readOnly className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100" /></div>
                  <button type="button" onClick={() => setSolicitacaoItens(solicitacaoItens.filter((_, i) => i !== index))} className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50">×</button>
                </div>)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-slate-700 font-bold mb-1">Valor Estimado (R$)</label><input type="number" value={solicitacaoForm.valorEstimado} onChange={e => setSolicitacaoForm({ ...solicitacaoForm, valorEstimado: parseFloat(e.target.value) || 0 })} className="w-full p-2.5 border border-slate-200 rounded-xl" /></div>
                <div><label className="block text-slate-700 font-bold mb-1">Prioridade</label><select value={solicitacaoForm.prioridade} onChange={e => setSolicitacaoForm({ ...solicitacaoForm, prioridade: e.target.value as any })} className="w-full p-2.5 border border-slate-200 rounded-xl"><option>BAIXA</option><option>MEDIA</option><option>ALTA</option></select></div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Justificativa</label>
                <input
                  type="text"
                  value={solicitacaoForm.justificativa}
                  onChange={e => setSolicitacaoForm({ ...solicitacaoForm, justificativa: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Reposição de estoque urgente"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSolicitacaoModal(false)}
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

      {/* Modal Ordem de Compra */}
      {showOrdemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                {editingOrdem ? 'Editar Ordem de Compra' : 'Emissão de Ordem de Compra (OC)'}
              </h2>
              <button onClick={() => setShowOrdemModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOrdem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nº da Ordem (OC) *</label>
                  <input
                    type="text"
                    required
                    value={ordemForm.numeroOrdem}
                    onChange={e => setOrdemForm({ ...ordemForm, numeroOrdem: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fornecedor *</label>
                  <select
                    value={ordemForm.fornecedorNome}
                    onChange={e => setOrdemForm({ ...ordemForm, fornecedorNome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  >
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.razaoSocial}>
                        {f.razaoSocial} ({f.categoria})
                      </option>
                    ))}
                    {fornecedores.length === 0 && (
                      <option value="Fornecedor Agro Insumos LTDA">Fornecedor Agro Insumos LTDA</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between"><div><div className="text-xs font-extrabold text-slate-800">Itens da ordem de compra</div><div className="text-[10px] text-slate-500">Os produtos são sempre selecionados do SisEstoque.</div></div><button type="button" onClick={() => setOrdemItens([...ordemItens, { descricao: '', quantidade: 1, unidade: 'UN', precoUnitario: 0, subtotal: 0 }])} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold">+ Adicionar item</button></div>
                {ordemItens.map((item, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_90px_80px_110px_32px] gap-2 items-end">
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Produto do estoque</label><select required value={item.estoqueItemId || ''} onChange={e => { const p = estoque.find(x => x.id === e.target.value); setOrdemItens(ordemItens.map((x, i) => i === index ? { ...x, estoqueItemId: p?.id, descricao: p?.nomeItem || '', unidade: p?.unidadeMedida || x.unidade } : x)); }} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"><option value="">Selecione um produto</option>{estoque.map(p => <option key={p.id} value={p.id}>{p.codigoSku || p.codigoItem || '—'} — {p.nomeItem}</option>)}</select></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Qtd.</label><input type="number" min="1" required value={item.quantidade} onChange={e => setOrdemItens(ordemItens.map((x, i) => i === index ? { ...x, quantidade: Number(e.target.value) || 0 } : x))} className="w-full p-2.5 border border-slate-200 rounded-xl" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Unid.</label><input value={item.unidade} readOnly className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Preço unitário</label><input type="number" min="0" step="0.01" required value={item.precoUnitario} onChange={e => setOrdemItens(ordemItens.map((x, i) => i === index ? { ...x, precoUnitario: Number(e.target.value) || 0 } : x))} className="w-full p-2.5 border border-slate-200 rounded-xl" /></div>
                  <button type="button" onClick={() => setOrdemItens(ordemItens.filter((_, i) => i !== index))} className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50">×</button>
                </div>)}
                <div className="text-right font-black text-emerald-700">Total calculado: R$ {ordemItens.reduce((sum, i) => sum + i.quantidade * i.precoUnitario, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data de Emissão *</label>
                  <input
                    type="date"
                    required
                    value={ordemForm.dataEmissao}
                    onChange={e => setOrdemForm({ ...ordemForm, dataEmissao: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Previsão de Entrega *</label>
                  <input
                    type="date"
                    required
                    value={ordemForm.dataPrevisaoEntrega}
                    onChange={e => setOrdemForm({ ...ordemForm, dataPrevisaoEntrega: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor Total (R$) *</label>
                  <input
                    type="number"
                    required
                    value={ordemForm.valorTotal}
                    onChange={e => setOrdemForm({ ...ordemForm, valorTotal: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-emerald-300 rounded-xl font-bold text-emerald-900 bg-emerald-50/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Condições de Pagamento</label>
                  <input
                    type="text"
                    value={ordemForm.condicoesPagamento}
                    onChange={e => setOrdemForm({ ...ordemForm, condicoesPagamento: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    placeholder="Ex: 30 Dias Fatura Boleto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Observações de Logística / Destino</label>
                <input
                  type="text"
                  value={ordemForm.observacoes}
                  onChange={e => setOrdemForm({ ...ordemForm, observacoes: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Instruções de entrega e local de descarregamento"
                />
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                <div>✨ <strong>Integração Automática SisEstoque & SisFin:</strong></div>
                <ul className="list-disc list-inside text-emerald-700 space-y-0.5">
                  <li><strong>SisEstoque:</strong> Credita automaticamente <strong>{ordemForm.quantidade} {ordemForm.unidadeMedida}</strong> do item <i>"{ordemForm.itemDescricao}"</i> com registro de movimentação de entrada.</li>
                  <li><strong>SisFin (Financeiro):</strong> Gera uma conta a pagar de <strong>R$ {ordemForm.valorTotal.toFixed(2)}</strong> para o fornecedor <i>{ordemForm.fornecedorNome}</i>.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOrdemModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-sm"
                >
                  Emitir e Enviar ao Financeiro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fornecedor */}
      {showFornecedorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor Homologado'}
              </h2>
              <button onClick={() => setShowFornecedorModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFornecedor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Razão Social *</label>
                <input
                  type="text"
                  required
                  value={fornecedorForm.razaoSocial}
                  onChange={e => setFornecedorForm({ ...fornecedorForm, razaoSocial: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Embalagens do Nordeste LTDA"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">CNPJ *</label>
                <input
                  type="text"
                  required
                  value={fornecedorForm.cnpj}
                  onChange={e => setFornecedorForm({ ...fornecedorForm, cnpj: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="00.000.000/0001-00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pessoa de Contato</label>
                  <input
                    type="text"
                    value={fornecedorForm.contatoNome}
                    onChange={e => setFornecedorForm({ ...fornecedorForm, contatoNome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={fornecedorForm.telefone}
                    onChange={e => setFornecedorForm({ ...fornecedorForm, telefone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFornecedorModal(false)}
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
    </div>
  );
};
