import { formatarData } from '../utils/dateHelpers';
import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { DemonstracoesContabeis } from '../components/DemonstracoesContabeis';
import { FortesExportModal } from '../components/FortesExportModal';
import {
  Calculator,
  Plus,
  FileSpreadsheet,
  Building2,
  TrendingUp,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { LancamentoContabil, ItemPatrimonio } from '../types';
import { DataGrid, GridStatus } from '../components/ui/DataGrid';
import { playActionCompleteSound } from '../utils/actionSound';
import jsPDF from 'jspdf';

export const SisContView: React.FC = () => {
  const {
    planoContas,
    contasPagarReceber,
    addPlanoConta,
    deletePlanoConta,
    lancamentosContabeis,
    addLancamentoContabil,
    updateLancamentoContabil,
    deleteLancamentoContabil,
    patrimonio,
    addItemPatrimonio,
    updateItemPatrimonio,
    deleteItemPatrimonio,
    processarDepreciacaoMensal,
    canWriteModule
  } = useCoop();

  const canWrite = canWriteModule('siscont');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };


  const [activeTab, setActiveTab] = useState<'plano' | 'lancamentos' | 'balancete' | 'balanco' | 'dsp' | 'patrimonio'>('lancamentos');

  // Modals & Editing
  const [showLancModal, setShowLancModal] = useState(false);
  const [showPatrimonioModal, setShowPatrimonioModal] = useState(false);
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [showFortesModal, setShowFortesModal] = useState(false);
  const [filterPlanoContas, setFilterPlanoContas] = useState('');
  const [filterLancamentos, setFilterLancamentos] = useState('');
  const [competenciaDepreciacao, setCompetenciaDepreciacao] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [editingPatrimonio, setEditingPatrimonio] = useState<ItemPatrimonio | null>(null);
  const [editingLancamentoId, setEditingLancamentoId] = useState<string | null>(null);

  // Forms
  const [planoForm, setPlanoForm] = useState({
    codigo: '',
    nome: '',
    tipo: 'ATIVO' as 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO' | 'RECEITA' | 'CUSTO' | 'DESPESA',
    natureza: 'DEVEDORA' as 'DEVEDORA' | 'CREDORA',
    nivel: 4,
    tipoConta: 'ANALITICA' as 'SINTETICA' | 'ANALITICA',
    atoCooperativo: 'AMBOS' as 'COOPERATIVO' | 'NAO_COOPERATIVO' | 'AMBOS'
  });
  const [novoLancamento, setNovoLancamento] = useState({
    numeroLancamento: `L-${Date.now().toString().slice(-4)}`,
    data: new Date().toISOString().split('T')[0],
    contaDebitoCodigo: '11101.0001',
    contaCreditoCodigo: '11201.9999',
    valor: 5000.00,
    historico: 'Integralização de Cota-Parte / Recebimento de Contrato PAA',
    documentoRef: 'NF-1029',
    usuario: 'Contador SICOOP'
  });

  const [patrimonioForm, setPatrimonioForm] = useState({
    descricao: '',
    tombamentoNum: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
    categoria: 'MAQUINARIO' as 'VEICULO' | 'MAQUINARIO' | 'IMOVEL' | 'EQUIPAMENTO' | 'MOVEIS',
    dataAquisicao: new Date().toISOString().split('T')[0],
    valorAquisicao: 15000,
    depreciacaoAcumulada: 1200,
    vidaUtilAnos: 10,
    localizacao: 'Sede Administrativa'
  });

  const handleAddLancamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!novoLancamento.valor || !novoLancamento.contaDebitoCodigo || !novoLancamento.contaCreditoCodigo) return;
    if (novoLancamento.contaDebitoCodigo === novoLancamento.contaCreditoCodigo) {
      alert('Escolha contas diferentes para débito e crédito.');
      return;
    }
    const contaDebito = planoContas.find(pc => pc.codigo === novoLancamento.contaDebitoCodigo && pc.aceitaLancamento);
    const contaCredito = planoContas.find(pc => pc.codigo === novoLancamento.contaCreditoCodigo && pc.aceitaLancamento);
    if (!contaDebito || !contaCredito) {
      alert('Débito e crédito devem ser contas analíticas habilitadas para lançamento.');
      return;
    }
    const payload = {
      ...novoLancamento,
      contaDebitoCodigo: contaDebito.codigo,
      contaDebitoNome: contaDebito.nome,
      contaCreditoCodigo: contaCredito.codigo,
      contaCreditoNome: contaCredito.nome
    };
    if (editingLancamentoId) {
      updateLancamentoContabil(editingLancamentoId, payload);
    } else {
      addLancamentoContabil(payload);
    }
    setShowLancModal(false);
    setEditingLancamentoId(null);
  };

  const handleOpenLancamento = (l?: LancamentoContabil) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (l) {
      setEditingLancamentoId(l.id);
      setNovoLancamento({
        numeroLancamento: String(l.numeroLancamento),
        data: l.data,
        contaDebitoCodigo: l.contaDebitoCodigo || '',
        contaCreditoCodigo: l.contaCreditoCodigo || '',
        valor: l.valor,
        historico: l.historico,
        documentoRef: l.documentoRef || '',
        usuario: l.usuario || ''
      });
    } else {
      setEditingLancamentoId(null);
      setNovoLancamento(prev => ({
        ...prev,
        numeroLancamento: `L-${Date.now().toString().slice(-4)}`,
        data: new Date().toISOString().split('T')[0],
        documentoRef: ''
      }));
    }
    setShowLancModal(true);
  };

  const prazoEdicaoLancamento = (data: string) => {
    const original = new Date(`${String(data).substring(0, 10)}T00:00:00`);
    const prazo = new Date(original.getFullYear(), original.getMonth() + 1, 5, 23, 59, 59, 999);
    return { aberto: new Date() <= prazo, prazo };
  };

  const handleOpenPatrimonio = (p?: ItemPatrimonio) => {
        if (!canWrite) { blockWriteAction(); return; }
if (p) {
      setEditingPatrimonio(p);
      setPatrimonioForm({
        descricao: p.descricao,
        tombamentoNum: p.tombamentoNum || p.codigoTombo || '',
        categoria: (p.categoria as any) || 'MAQUINARIO',
        dataAquisicao: p.dataAquisicao,
        valorAquisicao: p.valorAquisicao,
        depreciacaoAcumulada: p.depreciacaoAcumulada,
        vidaUtilAnos: p.vidaUtilAnos || 10,
        localizacao: p.localizacao || 'Sede Administrativa'
      });
    } else {
      setEditingPatrimonio(null);
      setPatrimonioForm({
        descricao: '',
        tombamentoNum: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
        categoria: 'MAQUINARIO',
        dataAquisicao: new Date().toISOString().split('T')[0],
        valorAquisicao: 15000,
        depreciacaoAcumulada: 0,
        vidaUtilAnos: 10,
        localizacao: 'Sede / Galpão'
      });
    }
    setShowPatrimonioModal(true);
  };

  const handleSavePatrimonio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!patrimonioForm.descricao) return;
    const payload = { ...patrimonioForm, codigoTombo: patrimonioForm.tombamentoNum };
    if (editingPatrimonio) {
      updateItemPatrimonio(editingPatrimonio.id, payload);
    } else {
      addItemPatrimonio(payload);
    }
    setShowPatrimonioModal(false);
  };

  const handleSavePlanoConta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!planoForm.codigo || !planoForm.nome) return;
    if (planoContas.some(pc => pc.codigo === planoForm.codigo)) {
      alert(`Já existe uma conta com o código ${planoForm.codigo}. Use um código diferente.`);
      return;
    }
    addPlanoConta({ ...planoForm, aceitaLancamento: planoForm.tipoConta === 'ANALITICA', ativo: true });
    setShowPlanoModal(false);
    playActionCompleteSound();
    setPlanoForm({
      codigo: '',
      nome: '',
      tipo: 'ATIVO',
      natureza: 'DEVEDORA',
      nivel: 4,
      tipoConta: 'ANALITICA',
      atoCooperativo: 'AMBOS'
    });
  };

  const totalDebitos = lancamentosContabeis.reduce((sum, l) => sum + (l.valor || 0), 0);
  const financeirosSemContabilidade = contasPagarReceber.filter(c =>
    !lancamentosContabeis.some(l => l.documentoRef === c.id)
  );
  const termoLancamento = filterLancamentos.trim().toLowerCase();
  const lancamentosFiltrados = lancamentosContabeis.filter(l => {
    if (!termoLancamento) return true;
    return [
      l.numeroLancamento,
      l.data,
      l.contaDebitoCodigo,
      l.contaDebitoNome,
      l.contaCreditoCodigo,
      l.contaCreditoNome,
      l.historico,
      l.documentoRef,
      l.moduloOrigem
    ].some(valor => String(valor || '').toLowerCase().includes(termoLancamento));
  });

  const handleProcessarDepreciacao = () => {
    if (!canWrite) { blockWriteAction(); return; }
    if (!competenciaDepreciacao.trim()) {
      alert('Informe a competência (mês/ano) para processar a depreciação.');
      return;
    }
    const resultado = processarDepreciacaoMensal(competenciaDepreciacao);
    playActionCompleteSound();
    alert(
      `Depreciação de ${competenciaDepreciacao} processada:\n` +
      `${resultado.processados} bem(ns) depreciado(s) — lançamento contábil gerado para cada um.\n` +
      `${resultado.puladosJaFeitos} já tinham essa competência processada (pulados).\n` +
      `${resultado.puladosSemValor} sem saldo a depreciar (já totalmente depreciados ou sem valor).`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <Calculator className="w-3.5 h-3.5" /> Contabilidade do Ramo Agropecuário
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contabilidade da Cooperativa & Livro Diário</h1>
          <p className="text-sm text-slate-500 mt-1">
            Plano de contas padronizado para cooperativas agrícolas, segregação de atos cooperativos e não cooperativos, partidas dobradas, balancetes e destinação de sobras/perdas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFortesModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            title="Exportar Lançamentos, Plano de Contas e SPED ECD para o Fortes Total Contador"
          >
            <Building2 className="w-4 h-4" /> Exportar Fortes Contábil
          </button>

          {activeTab === 'plano' && (
            <button
              onClick={() => setShowPlanoModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar Conta Contábil
            </button>
          )}
          {activeTab === 'lancamentos' && (
            <button
              onClick={() => handleOpenLancamento()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Lançamento Contábil
            </button>
          )}
          {activeTab === 'patrimonio' && (
            <button
              onClick={() => handleOpenPatrimonio()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Cadastrar Bem / Ativo
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border p-4 text-xs ${financeirosSemContabilidade.length === 0
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
        <div className="font-bold">
          {financeirosSemContabilidade.length === 0 ? 'Integração SisFin → SisCont OK' : 'Atenção: integração contábil incompleta'}
        </div>
        <div className="mt-1">
          {financeirosSemContabilidade.length === 0
            ? `Todos os ${contasPagarReceber.length} lançamentos financeiros possuem vínculo contábil.`
            : `${financeirosSemContabilidade.length} de ${contasPagarReceber.length} lançamentos financeiros não possuem lançamento contábil vinculado.`}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('lancamentos')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'lancamentos'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Lançamentos Contábeis ({lancamentosContabeis.length})
        </button>
        <button
          onClick={() => setActiveTab('plano')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'plano'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" /> Plano de Contas ({planoContas.length})
        </button>
        <button
          onClick={() => setActiveTab('balancete')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'balancete'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Balancete de Verificação
        </button>
        <button
          onClick={() => setActiveTab('balanco')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'balanco'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Balanço Patrimonial
        </button>
        <button
          onClick={() => setActiveTab('dsp')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'dsp'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Sobras ou Perdas
        </button>
        <button
          onClick={() => setActiveTab('patrimonio')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'patrimonio'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Patrimônio e Ativos ({patrimonio.length})
        </button>
      </div>

      {/* Tab Lançamentos */}
      {activeTab === 'lancamentos' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Livro de Lançamentos Contábeis</h2>
                <p className="text-[11px] text-slate-500 mt-1">Consulte por código, nome da conta, histórico, documento ou módulo de origem.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total lançado</div>
                  <div className="text-lg font-black text-emerald-700">R$ {totalDebitos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="h-9 w-px bg-slate-200" />
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Exibindo</div>
                  <div className="text-lg font-black text-slate-800">{lancamentosFiltrados.length} <span className="text-xs text-slate-400">/ {lancamentosContabeis.length}</span></div>
                </div>
              </div>
            </div>
            <div className="relative mt-4">
              <input
                type="search"
                value={filterLancamentos}
                onChange={e => setFilterLancamentos(e.target.value)}
                placeholder="Pesquisar por código ou nome da conta, histórico, documento..."
                className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 shadow-sm"
              />
              {filterLancamentos && <button onClick={() => setFilterLancamentos('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>}
            </div>
          </div>

          <DataGrid
            rows={lancamentosFiltrados}
            getRowId={l => l.id}
            pageSize={25}
            panelTitle={l => `Lançamento #${l.numeroLancamento}`}
            panelSubtitle={l => formatarData(l.data)}
            emptyMessage="Nenhum lançamento encontrado para a pesquisa."
            columns={[
              {
                key: 'periodo',
                header: 'Período',
                width: 120,
                value: l => (prazoEdicaoLancamento(l.data).aberto ? 'Aberto' : 'Encerrado'),
                render: l => <GridStatus tone={prazoEdicaoLancamento(l.data).aberto ? 'success' : 'neutral'} label={prazoEdicaoLancamento(l.data).aberto ? 'Aberto' : 'Encerrado'} />,
              },
              { key: 'numeroLancamento', header: 'Nº', width: 80, value: l => Number(l.numeroLancamento) || l.numeroLancamento },
              { key: 'data', header: 'Data', width: 100, value: l => l.data, render: l => formatarData(l.data) },
              { key: 'debito', header: 'Débito', width: 240, value: l => `${l.contaDebitoCodigo || ''} — ${l.contaDebito || l.contaDebitoNome || ''}` },
              { key: 'credito', header: 'Crédito', width: 240, value: l => `${l.contaCreditoCodigo || ''} — ${l.contaCredito || l.contaCreditoNome || ''}` },
              { key: 'historico', header: 'Histórico', width: 300 },
              { key: 'documentoRef', header: 'Documento', width: 120 },
              { key: 'moduloOrigem', header: 'Origem', width: 110 },
              {
                key: 'valor',
                header: 'Valor',
                width: 130,
                align: 'right',
                value: l => l.valor || 0,
                render: l => (l.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              },
            ]}
            actions={[
              {
                label: 'Editar',
                icon: Pencil,
                hidden: () => !canWrite,
                onClick: l => {
                  const prazo = prazoEdicaoLancamento(l.data);
                  if (prazo.aberto) handleOpenLancamento(l);
                  else alert(`Este lançamento só podia ser editado até ${prazo.prazo.toLocaleDateString('pt-BR')}.`);
                },
              },
              {
                label: 'Estornar / Excluir',
                icon: Trash2,
                tone: 'danger',
                divider: true,
                onClick: l => {
                  if (!canWrite) { blockWriteAction(); return; }
                  if (confirm('Deseja estornar/excluir este lançamento contábil?')) deleteLancamentoContabil(l.id);
                },
              },
            ]}
          />
        </div>
      )}

      {/* Tab Plano de Contas */}
      {activeTab === 'plano' && (() => {
        const contasOrdenadas = [...planoContas].sort((a, b) => (a.ordemExibicao || 0) - (b.ordemExibicao || 0) || a.codigo.localeCompare(b.codigo));
        const contasFiltradas = contasOrdenadas.filter(pc =>
          !filterPlanoContas ||
          pc.codigo.includes(filterPlanoContas) ||
          pc.nome.toLowerCase().includes(filterPlanoContas.toLowerCase())
        );
        return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={filterPlanoContas}
              onChange={e => setFilterPlanoContas(e.target.value)}
              placeholder="Buscar por código ou nome da conta..."
              className="w-full max-w-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <span className="text-[11px] text-slate-400 whitespace-nowrap">{contasFiltradas.length} de {planoContas.length} contas</span>
          </div>
          <DataGrid
                rows={contasFiltradas}
                getRowId={pc => pc.id}
                pageSize={50}
                panelTitle={pc => pc.nome}
                panelSubtitle={pc => pc.codigo}
                emptyMessage="Nenhuma conta encontrada."
                columns={[
                  {
                    key: 'codigo',
                    header: 'Código',
                    width: 160,
                    render: pc => <span style={{ paddingLeft: `${(pc.nivel - 1) * 0.9}rem`, fontWeight: pc.nivel === 1 ? 600 : undefined }}>{pc.codigo}</span>,
                  },
                  { key: 'nome', header: 'Descrição da Conta', width: 300, render: pc => <span style={{ fontWeight: pc.nivel === 1 || pc.tipoConta === 'SINTETICA' ? 600 : undefined }}>{pc.nome}</span> },
                  { key: 'tipo', header: 'Grupo Contábil', width: 140 },
                  { key: 'natureza', header: 'Natureza', width: 110, value: pc => (pc.natureza === 'DEVEDORA' ? 'Devedora' : 'Credora') },
                  { key: 'nivel', header: 'Nível', width: 80, align: 'center' },
                  { key: 'tipoConta', header: 'Tipo', width: 110, value: pc => (pc.tipoConta === 'ANALITICA' ? 'Analítica' : 'Sintética') },
                  {
                    key: 'atoCooperativo',
                    header: 'Ato',
                    width: 120,
                    value: pc => (pc.atoCooperativo === 'COOPERATIVO' ? 'Cooperativo' : pc.atoCooperativo === 'NAO_COOPERATIVO' ? 'Não Coop.' : 'Ambos'),
                  },
                ]}
                actions={[
                  {
                    label: 'Excluir conta',
                    icon: Trash2,
                    tone: 'danger',
                    onClick: pc => {
                      if (!canWrite) { blockWriteAction(); return; }
                      if (confirm(`Excluir conta contábil ${pc.codigo}?`)) deletePlanoConta(pc.id);
                    },
                  },
                ]}
              />
        </div>
        );
      })()}

      {/* Tab Balancete */}
      {activeTab === 'balancete' && <DemonstracoesContabeis modo="balancete" />}
      {activeTab === 'balanco' && <DemonstracoesContabeis modo="balanco" />}
      {activeTab === 'dsp' && <DemonstracoesContabeis modo="dsp" />}

      {/* Tab Patrimônio */}
      {activeTab === 'patrimonio' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl">
            <div>
              <label className="block text-indigo-800 font-bold text-[11px] uppercase mb-1">Competência (Mês/Ano)</label>
              <input
                type="text"
                value={competenciaDepreciacao}
                onChange={e => setCompetenciaDepreciacao(e.target.value)}
                placeholder="08/2026"
                className="p-2 border border-indigo-200 rounded-lg text-xs w-32"
              />
            </div>
            <button
              onClick={handleProcessarDepreciacao}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Processar Depreciação do Mês
            </button>
            <p className="text-[11px] text-indigo-700 sm:ml-2">
              Calcula e lança automaticamente a depreciação do mês para cada bem (pelo prazo de vida útil cadastrado, ou padrão por categoria), gerando o lançamento contábil correspondente. Bens já processados nesta competência são pulados — pode rodar quantas vezes quiser sem duplicar.
            </p>
          </div>
          <DataGrid
            rows={patrimonio}
            getRowId={item => item.id}
            onRowDoubleClick={item => handleOpenPatrimonio(item)}
            panelTitle={item => item.descricao}
            panelSubtitle={item => item.tombamentoNum || item.codigoTombo || ''}
            emptyMessage="Nenhum bem patrimonial cadastrado."
            columns={[
              { key: 'descricao', header: 'Ativo', width: 240 },
              { key: 'tombamento', header: 'Plaqueta / Tombamento', width: 160, value: item => item.tombamentoNum || item.codigoTombo },
              { key: 'dataAquisicao', header: 'Data Aquisição', width: 120 },
              { key: 'valorAquisicao', header: 'Valor Aquisição', width: 140, align: 'right', value: item => item.valorAquisicao || 0, render: item => (item.valorAquisicao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
              { key: 'depreciacaoAcumulada', header: 'Depreciação Acum.', width: 140, align: 'right', value: item => item.depreciacaoAcumulada || 0, render: item => (item.depreciacaoAcumulada || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
              {
                key: 'valorAtual',
                header: 'Valor Atual',
                width: 140,
                align: 'right',
                value: item => item.valorAtual ?? (item.valorAquisicao - (item.depreciacaoAcumulada || 0)),
                render: item => (item.valorAtual ?? (item.valorAquisicao - (item.depreciacaoAcumulada || 0))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              },
              { key: 'ultimaDepreciacaoCompetencia', header: 'Última Depreciação', width: 140 },
            ]}
            actions={[
              { label: 'Editar', icon: Pencil, onClick: item => handleOpenPatrimonio(item) },
              {
                label: 'Excluir',
                icon: Trash2,
                tone: 'danger',
                divider: true,
                onClick: item => {
                  if (!canWrite) { blockWriteAction(); return; }
                  if (confirm(`Deseja excluir o ativo ${item.descricao}?`)) deleteItemPatrimonio(item.id);
                },
              },
            ]}
          />
        </div>
      )}

      {/* Modal Lançamento Contábil */}
      {showLancModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">{editingLancamentoId ? 'Editar Lançamento Contábil' : 'Novo Lançamento Contábil'}</h2>
              <button onClick={() => setShowLancModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLancamento} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data do lançamento</label>
                  <input type="date" value={novoLancamento.data} onChange={e => setNovoLancamento({ ...novoLancamento, data: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl" required />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Documento de referência</label>
                  <input type="text" value={novoLancamento.documentoRef} onChange={e => setNovoLancamento({ ...novoLancamento, documentoRef: e.target.value })} placeholder="NF, recibo, contrato..." className="w-full p-2.5 border border-slate-200 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Conta Débito</label>
                <select
                  value={novoLancamento.contaDebitoCodigo}
                  onChange={e => setNovoLancamento({ ...novoLancamento, contaDebitoCodigo: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                >
                  <option value="">Selecione uma conta analítica</option>
                  {planoContas.filter(pc => pc.aceitaLancamento && pc.ativo !== false).map(pc => (
                    <option key={pc.id} value={pc.codigo}>{pc.codigo} — {pc.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Conta Crédito</label>
                <select
                  value={novoLancamento.contaCreditoCodigo}
                  onChange={e => setNovoLancamento({ ...novoLancamento, contaCreditoCodigo: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  required
                >
                  <option value="">Selecione uma conta analítica</option>
                  {planoContas.filter(pc => pc.aceitaLancamento && pc.ativo !== false).map(pc => (
                    <option key={pc.id} value={pc.codigo}>{pc.codigo} — {pc.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Valor R$</label>
                <input
                  type="number"
                  step="0.01"
                  value={novoLancamento.valor}
                  onChange={e => setNovoLancamento({ ...novoLancamento, valor: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Histórico</label>
                <input
                  type="text"
                  value={novoLancamento.historico}
                  onChange={e => setNovoLancamento({ ...novoLancamento, historico: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLancModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Registrar Partida Dobrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Patrimônio */}
      {showPatrimonioModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingPatrimonio ? 'Editar Item do Patrimônio' : 'Novo Item do Patrimônio'}
              </h2>
              <button onClick={() => setShowPatrimonioModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePatrimonio} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Descrição do Bem *</label>
                <input
                  type="text"
                  required
                  value={patrimonioForm.descricao}
                  onChange={e => setPatrimonioForm({ ...patrimonioForm, descricao: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Trator Agrícola 75CV"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Plaqueta / Tombamento</label>
                  <input
                    type="text"
                    value={patrimonioForm.tombamentoNum}
                    onChange={e => setPatrimonioForm({ ...patrimonioForm, tombamentoNum: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Categoria</label>
                  <select
                    value={patrimonioForm.categoria}
                    onChange={e => {
                      const cat = e.target.value as any;
                      const vidaUtilPadrao = { VEICULO: 5, MAQUINARIO: 10, EQUIPAMENTO: 10, IMOVEL: 25, MOVEIS: 10 }[cat] || 10;
                      setPatrimonioForm({ ...patrimonioForm, categoria: cat, vidaUtilAnos: vidaUtilPadrao });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="VEICULO">Veículo</option>
                    <option value="MAQUINARIO">Máquinas e Equipamentos</option>
                    <option value="IMOVEL">Imóvel / Edificação</option>
                    <option value="EQUIPAMENTO">Equipamento</option>
                    <option value="MOVEIS">Móveis e Utensílios</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor Aquisição (R$)</label>
                  <input
                    type="number"
                    value={patrimonioForm.valorAquisicao}
                    onChange={e => setPatrimonioForm({ ...patrimonioForm, valorAquisicao: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vida Útil (anos)</label>
                  <input
                    type="number"
                    min={1}
                    value={patrimonioForm.vidaUtilAnos}
                    onChange={e => setPatrimonioForm({ ...patrimonioForm, vidaUtilAnos: parseInt(e.target.value) || 10 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Categoria e vida útil definem a conta contábil e o valor da depreciação mensal calculada automaticamente em "Processar Depreciação do Mês".
              </p>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPatrimonioModal(false)}
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
      {/* Modal Plano de Contas */}
      {showPlanoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">Cadastrar Conta Contábil</h2>
              <button onClick={() => setShowPlanoModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePlanoConta} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Código Estruturado *</label>
                <input
                  type="text"
                  required
                  value={planoForm.codigo}
                  onChange={e => setPlanoForm({ ...planoForm, codigo: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-xs"
                  placeholder="Ex: 1.1.3.01.001"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Descrição da Conta *</label>
                <input
                  type="text"
                  required
                  value={planoForm.nome}
                  onChange={e => setPlanoForm({ ...planoForm, nome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                  placeholder="Ex: Adiantamento a Produtores Rurais"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Grupo Contábil</label>
                  <select
                    value={planoForm.tipo}
                    onChange={e => {
                      const novoTipo = e.target.value as any;
                      // Sugere a natureza padrão do grupo — mas continua
                      // editável manualmente logo abaixo, para os casos de
                      // conta "contra" (ex.: Depreciação Acumulada é ATIVO
                      // mas natureza Credora; Capital a Integralizar é
                      // Patrimônio Líquido mas natureza Devedora).
                      const naturezaPadrao = (novoTipo === 'ATIVO' || novoTipo === 'CUSTO' || novoTipo === 'DESPESA') ? 'DEVEDORA' : 'CREDORA';
                      setPlanoForm({ ...planoForm, tipo: novoTipo, natureza: naturezaPadrao });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="PASSIVO">PASSIVO</option>
                    <option value="PATRIMONIO_LIQUIDO">PATRIMÔNIO LÍQUIDO</option>
                    <option value="RECEITA">RECEITAS</option>
                    <option value="CUSTO">CUSTOS</option>
                    <option value="DESPESA">DESPESAS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Natureza</label>
                  <select
                    value={planoForm.natureza}
                    onChange={e => setPlanoForm({ ...planoForm, natureza: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="DEVEDORA">Devedora</option>
                    <option value="CREDORA">Credora</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nível de Detalhamento</label>
                  <select
                    value={planoForm.nivel}
                    onChange={e => {
                      const nivel = parseInt(e.target.value);
                      setPlanoForm({ ...planoForm, nivel, tipoConta: nivel === 4 ? 'ANALITICA' : 'SINTETICA' });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold bg-white"
                  >
                    <option value={1}>Nível 1 — Grupo Principal</option>
                    <option value={2}>Nível 2 — Subgrupo</option>
                    <option value={3}>Nível 3 — Conta Sintética</option>
                    <option value={4}>Nível 4 — Conta Analítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ato Cooperativo</label>
                  <select
                    value={planoForm.atoCooperativo}
                    onChange={e => setPlanoForm({ ...planoForm, atoCooperativo: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="AMBOS">Ambos</option>
                    <option value="COOPERATIVO">Cooperativo</option>
                    <option value="NAO_COOPERATIVO">Não Cooperativo</option>
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-slate-400">
                {planoForm.tipoConta === 'ANALITICA'
                  ? 'Conta Analítica: pode receber lançamentos diretamente.'
                  : 'Conta Sintética: apenas agrupa/totaliza contas de nível inferior — não recebe lançamentos.'}
              </p>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPlanoModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exportação para o Fortes Tecnologia - Total Contador */}
      <FortesExportModal
        isOpen={showFortesModal}
        onClose={() => setShowFortesModal(false)}
        initialTab="contabil"
      />
    </div>
  );
};
