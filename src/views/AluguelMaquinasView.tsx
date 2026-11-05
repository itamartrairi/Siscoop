import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { DataGrid, GridStatus } from '../components/ui/DataGrid';
import {
  Tractor,
  Plus,
  Pencil,
  Trash2,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  Check,
  Ban
} from 'lucide-react';
import { Maquina, LocacaoMaquina } from '../types';

export const AluguelMaquinasView: React.FC = () => {
  const {
    maquinas,
    addMaquina,
    updateMaquina,
    deleteMaquina,
    locacoesMaquinas,
    addLocacaoMaquina,
    deleteLocacaoMaquina,
    concluirLocacao,
    cooperados,
    canWriteModule
  } = useCoop();

  // O módulo usado para controle de permissões pode ser 'cadastros' ou 'sisfin'.
  // Vamos usar 'cadastros' ou uma tag customizada se houver, mas como adicionei
  // no mesmo lugar, usaremos 'cadastros'
  const canWrite = canWriteModule('cadastros');
  const blockWriteAction = () => {
    alert('Seu perfil não tem permissão para editar.');
  };

  const [activeTab, setActiveTab] = useState<'maquinas' | 'locacoes'>('maquinas');

  // Modals
  const [showMaquinaModal, setShowMaquinaModal] = useState(false);
  const [showLocacaoModal, setShowLocacaoModal] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState<Maquina | null>(null);

  // Forms
  const [maquinaForm, setMaquinaForm] = useState({
    nome: '',
    tipo: 'TRATOR' as 'TRATOR' | 'COLHEITADEIRA' | 'PULVERIZADOR' | 'IMPLEMENTO' | 'OUTRO',
    placaOuChassi: '',
    valorHora: 0,
    valorDiaria: 0,
    status: 'DISPONIVEL' as Maquina['status']
  });

  const [locacaoForm, setLocacaoForm] = useState({
    maquinaId: '',
    cooperadoId: '',
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: new Date(Date.now() + 86400000).toISOString().split('T')[0], // +1 dia
    tipoCobranca: 'DIARIA' as 'HORA' | 'DIARIA',
    quantidadeCobranca: 1,
    valorTotal: 0,
    observacoes: ''
  });

  const openNewMaquina = () => {
    if (!canWrite) return blockWriteAction();
    setEditingMaquina(null);
    setMaquinaForm({
      nome: '',
      tipo: 'TRATOR',
      placaOuChassi: '',
      valorHora: 0,
      valorDiaria: 0,
      status: 'DISPONIVEL'
    });
    setShowMaquinaModal(true);
  };

  const openEditMaquina = (m: Maquina) => {
    if (!canWrite) return blockWriteAction();
    setEditingMaquina(m);
    setMaquinaForm({
      nome: m.nome,
      tipo: m.tipo,
      placaOuChassi: m.placaOuChassi || '',
      valorHora: m.valorHora,
      valorDiaria: m.valorDiaria,
      status: m.status
    });
    setShowMaquinaModal(true);
  };

  const handleSaveMaquina = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return blockWriteAction();
    
    if (editingMaquina) {
      updateMaquina(editingMaquina.id, maquinaForm);
    } else {
      addMaquina(maquinaForm);
    }
    setShowMaquinaModal(false);
  };

  const openNewLocacao = () => {
    if (!canWrite) return blockWriteAction();
    const maqId = maquinas.find(m => m.status === 'DISPONIVEL')?.id || '';
    const coopId = cooperados[0]?.id || '';
    const valDiaria = maquinas.find(m => m.id === maqId)?.valorDiaria || 0;
    
    setLocacaoForm({
      maquinaId: maqId,
      cooperadoId: coopId,
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      tipoCobranca: 'DIARIA',
      quantidadeCobranca: 1,
      valorTotal: valDiaria,
      observacoes: ''
    });
    setShowLocacaoModal(true);
  };

  const recalcTotal = (maqId: string, tipo: string, qtd: number) => {
    const maq = maquinas.find(m => m.id === maqId);
    if (!maq) return 0;
    return tipo === 'HORA' ? maq.valorHora * qtd : maq.valorDiaria * qtd;
  };

  const handleSaveLocacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return blockWriteAction();
    if (!locacaoForm.maquinaId || !locacaoForm.cooperadoId) {
      alert('Selecione a máquina e o cooperado.');
      return;
    }
    
    addLocacaoMaquina({
      maquinaId: locacaoForm.maquinaId,
      cooperadoId: locacaoForm.cooperadoId,
      dataInicio: locacaoForm.dataInicio,
      dataFim: locacaoForm.dataFim,
      tipoCobranca: locacaoForm.tipoCobranca as any,
      quantidadeCobranca: locacaoForm.quantidadeCobranca,
      valorTotal: locacaoForm.valorTotal,
      status: 'ATIVA',
      statusPagamento: 'PENDENTE',
      observacoes: locacaoForm.observacoes
    });
    setShowLocacaoModal(false);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Tractor className="w-8 h-8 text-emerald-600" />
            Aluguel e Gestão de Máquinas
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gerencie o patrimônio de maquinário, alugue equipamentos para cooperados e integre com o financeiro.
          </p>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('maquinas')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'maquinas' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Tractor className="w-4 h-4" />
          Cadastro de Máquinas
          {activeTab === 'maquinas' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button
          onClick={() => setActiveTab('locacoes')}
          className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'locacoes' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Gerenciar Locações
          {activeTab === 'locacoes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
      </div>

      {activeTab === 'maquinas' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">Equipamentos Disponíveis</h3>
            <button
              onClick={openNewMaquina}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Cadastrar Máquina
            </button>
          </div>
          <DataGrid
            rows={maquinas}
            getRowId={maq => maq.id}
            onRowDoubleClick={maq => openEditMaquina(maq)}
            panelTitle={maq => maq.nome}
            panelSubtitle={maq => maq.tipo}
            emptyMessage="Nenhuma máquina cadastrada no sistema."
            columns={[
              {
                key: 'status',
                header: 'Status',
                width: 130,
                value: maq => ({ DISPONIVEL: 'Disponível', ALUGADA: 'Alugada', MANUTENCAO: 'Manutenção' } as Record<string, string>)[maq.status] || maq.status,
                render: maq => (
                  <GridStatus
                    tone={maq.status === 'DISPONIVEL' ? 'success' : maq.status === 'ALUGADA' ? 'warning' : 'danger'}
                    label={({ DISPONIVEL: 'Disponível', ALUGADA: 'Alugada', MANUTENCAO: 'Manutenção' } as Record<string, string>)[maq.status] || maq.status}
                  />
                ),
              },
              { key: 'nome', header: 'Máquina / Equipamento', width: 240 },
              { key: 'tipo', header: 'Tipo', width: 150 },
              { key: 'placaOuChassi', header: 'Placa / Chassi', width: 150 },
              { key: 'valorHora', header: 'Valor Hora', width: 120, align: 'right', value: maq => maq.valorHora || 0, render: maq => formatCurrency(maq.valorHora) },
              { key: 'valorDiaria', header: 'Valor Diária', width: 120, align: 'right', value: maq => maq.valorDiaria || 0, render: maq => formatCurrency(maq.valorDiaria) },
            ]}
            actions={[
              { label: 'Editar', icon: Pencil, onClick: maq => openEditMaquina(maq) },
              {
                label: 'Excluir',
                icon: Trash2,
                tone: 'danger',
                divider: true,
                onClick: maq => {
                  if (confirm('Deseja excluir esta máquina?')) {
                    if (!canWrite) return blockWriteAction();
                    deleteMaquina(maq.id);
                  }
                },
              },
            ]}
          />
        </div>
      )}

      {activeTab === 'locacoes' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">Contratos de Locação</h3>
            <button
              onClick={openNewLocacao}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nova Locação
            </button>
          </div>
          <DataGrid
            rows={locacoesMaquinas}
            getRowId={loc => loc.id}
            panelTitle={loc => maquinas.find(m => m.id === loc.maquinaId)?.nome || 'Máquina excluída'}
            panelSubtitle={loc => cooperados.find(c => c.id === loc.cooperadoId)?.nome || ''}
            emptyMessage="Nenhuma locação cadastrada no sistema."
            columns={[
              {
                key: 'status',
                header: 'Status',
                width: 120,
                value: loc => ({ ATIVA: 'Ativa', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' } as Record<string, string>)[loc.status] || loc.status,
                render: loc => (
                  <GridStatus
                    tone={loc.status === 'ATIVA' ? 'warning' : loc.status === 'CONCLUIDA' ? 'success' : 'danger'}
                    label={({ ATIVA: 'Ativa', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' } as Record<string, string>)[loc.status] || loc.status}
                  />
                ),
              },
              { key: 'dataInicio', header: 'Início', width: 110, value: loc => loc.dataInicio, render: loc => loc.dataInicio.split('-').reverse().join('/') },
              { key: 'dataFim', header: 'Fim', width: 110, value: loc => loc.dataFim, render: loc => loc.dataFim.split('-').reverse().join('/') },
              { key: 'maquina', header: 'Máquina', width: 200, value: loc => maquinas.find(m => m.id === loc.maquinaId)?.nome || 'Excluída' },
              { key: 'cooperado', header: 'Cooperado', width: 220, value: loc => cooperados.find(c => c.id === loc.cooperadoId)?.nome || 'Excluído' },
              { key: 'duracao', header: 'Duração', width: 120, value: loc => `${loc.quantidadeCobranca} ${loc.tipoCobranca.toLowerCase()}(s)` },
              { key: 'valorTotal', header: 'Valor Total', width: 130, align: 'right', value: loc => loc.valorTotal || 0, render: loc => formatCurrency(loc.valorTotal) },
            ]}
            actions={[
              {
                label: 'Concluir e faturar',
                icon: CheckCircle,
                hidden: loc => loc.status !== 'ATIVA',
                onClick: loc => {
                  if (confirm('Concluir locação e gerar Conta a Receber no Financeiro?')) {
                    if (!canWrite) return blockWriteAction();
                    concluirLocacao(loc.id);
                  }
                },
              },
              {
                label: 'Cancelar / Excluir',
                icon: Trash2,
                tone: 'danger',
                divider: true,
                onClick: loc => {
                  if (confirm('Deseja excluir/cancelar esta locação?')) {
                    if (!canWrite) return blockWriteAction();
                    deleteLocacaoMaquina(loc.id);
                  }
                },
              },
            ]}
          />
        </div>
      )}

      {/* MODAL MÁQUINA */}
      {showMaquinaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">
                {editingMaquina ? 'Editar Máquina' : 'Nova Máquina'}
              </h3>
              <button onClick={() => setShowMaquinaModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMaquina} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome/Descrição</label>
                <input
                  type="text" required
                  value={maquinaForm.nome}
                  onChange={e => setMaquinaForm({...maquinaForm, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Trator Massey Ferguson 4292"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={maquinaForm.tipo}
                    onChange={e => setMaquinaForm({...maquinaForm, tipo: e.target.value as any})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="TRATOR">Trator</option>
                    <option value="COLHEITADEIRA">Colheitadeira</option>
                    <option value="PULVERIZADOR">Pulverizador</option>
                    <option value="IMPLEMENTO">Implemento Agrícola</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Placa / Chassi (Opcional)</label>
                  <input
                    type="text"
                    value={maquinaForm.placaOuChassi}
                    onChange={e => setMaquinaForm({...maquinaForm, placaOuChassi: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="ABC1234"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor por Hora (R$)</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={maquinaForm.valorHora}
                    onChange={e => setMaquinaForm({...maquinaForm, valorHora: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Diária (R$)</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={maquinaForm.valorDiaria}
                    onChange={e => setMaquinaForm({...maquinaForm, valorDiaria: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={maquinaForm.status}
                  onChange={e => setMaquinaForm({...maquinaForm, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="DISPONIVEL">Disponível</option>
                  <option value="ALUGADA">Alugada</option>
                  <option value="MANUTENCAO">Em Manutenção</option>
                  <option value="INATIVA">Inativa</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowMaquinaModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white font-medium hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
                  Salvar Máquina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LOCAÇÃO */}
      {showLocacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Nova Locação</h3>
              <button onClick={() => setShowLocacaoModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLocacao} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Máquina</label>
                <select
                  required
                  value={locacaoForm.maquinaId}
                  onChange={e => {
                    const id = e.target.value;
                    const val = recalcTotal(id, locacaoForm.tipoCobranca, locacaoForm.quantidadeCobranca);
                    setLocacaoForm({...locacaoForm, maquinaId: id, valorTotal: val});
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Selecione a máquina...</option>
                  {maquinas.filter(m => m.status === 'DISPONIVEL').map(m => (
                    <option key={m.id} value={m.id}>{m.nome} ({formatCurrency(m.valorDiaria)}/dia)</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cooperado Locatário</label>
                <select
                  required
                  value={locacaoForm.cooperadoId}
                  onChange={e => setLocacaoForm({...locacaoForm, cooperadoId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Selecione o cooperado...</option>
                  {cooperados.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} (Mat. {c.matricula})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                  <input
                    type="date" required
                    value={locacaoForm.dataInicio}
                    onChange={e => setLocacaoForm({...locacaoForm, dataInicio: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim Prevista</label>
                  <input
                    type="date" required
                    value={locacaoForm.dataFim}
                    onChange={e => setLocacaoForm({...locacaoForm, dataFim: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Cobrança</label>
                  <select
                    value={locacaoForm.tipoCobranca}
                    onChange={e => {
                      const t = e.target.value as any;
                      const val = recalcTotal(locacaoForm.maquinaId, t, locacaoForm.quantidadeCobranca);
                      setLocacaoForm({...locacaoForm, tipoCobranca: t, valorTotal: val});
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="DIARIA">Diária</option>
                    <option value="HORA">Hora</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Qtd</label>
                  <input
                    type="number" min="1" step="0.5" required
                    value={locacaoForm.quantidadeCobranca}
                    onChange={e => {
                      const q = Number(e.target.value);
                      const val = recalcTotal(locacaoForm.maquinaId, locacaoForm.tipoCobranca, q);
                      setLocacaoForm({...locacaoForm, quantidadeCobranca: q, valorTotal: val});
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total (R$)</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={locacaoForm.valorTotal}
                    onChange={e => setLocacaoForm({...locacaoForm, valorTotal: Number(e.target.value)})}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none text-emerald-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  value={locacaoForm.observacoes}
                  onChange={e => setLocacaoForm({...locacaoForm, observacoes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-20"
                  placeholder="Instruções de entrega, condições da máquina, etc."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowLocacaoModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white font-medium hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
                  Confirmar Locação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
