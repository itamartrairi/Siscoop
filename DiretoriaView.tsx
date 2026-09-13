import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { MembroDiretoria, CargoDiretoria } from '../types';
import {
  Award,
  Plus,
  Calendar,
  AlertTriangle,
  UserCheck,
  Shield,
  Clock,
  ChevronRight,
  Edit2,
  X,
  Building,
  CheckCircle2,
  Search
} from 'lucide-react';

export const DiretoriaView: React.FC = () => {
  const { mandatos, addMandato, updateMandato, cooperados, currentUser, canWriteModule } = useCoop();

  const canWrite = canWriteModule('diretoria');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [selectedMandatoId, setSelectedMandatoId] = useState<string>(mandatos[0]?.id || '');
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);
  const [isNewMandatoOpen, setIsNewMandatoOpen] = useState(false);
  const [modalSearchCoop, setModalSearchCoop] = useState('');

  const [newMandatoForm, setNewMandatoForm] = useState({
    gestaoTitulo: `Gestão Executiva ${new Date().getFullYear()}-${new Date().getFullYear() + 2}`,
    periodoInicio: `${new Date().getFullYear()}-01-01`,
    periodoFim: `${new Date().getFullYear() + 2}-12-31`,
    status: 'VIGENTE' as 'VIGENTE' | 'ENCERRADO' | 'ELEICAO_EM_ANDAMENTO'
  });

  const handleCreateMandato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!newMandatoForm.gestaoTitulo) return;
    addMandato({
      ...newMandatoForm,
      membros: []
    });
    setIsNewMandatoOpen(false);
  };

  const activeMandato = mandatos.find(m => m.id === selectedMandatoId) || mandatos[0];

  // New Board Member Form State
  const [selectedCoopId, setSelectedCoopId] = useState('');
  const [selectedCargo, setSelectedCargo] = useState<CargoDiretoria>('CONSELHEIRO_ADMIN');
  const [posseDate, setPosseDate] = useState('2024-04-01');
  const [fimMandatoDate, setFimMandatoDate] = useState('2026-09-30');

  // Check if mandate is expiring soon
  const today = new Date();
  const endDate = activeMandato ? new Date(activeMandato.periodoFim) : today;
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const isExpiringSoon = daysRemaining <= 60 && daysRemaining > 0;

  const cargoLabels: Record<CargoDiretoria, string> = {
    PRESIDENTE: 'Presidente do Conselho / Diretoria Executiva',
    VICE_PRESIDENTE: 'Vice-Presidente',
    TESOUREIRO: 'Diretor Tesoureiro',
    SECRETARIO: 'Diretor Secretário',
    CONSELHEIRO_ADMIN: 'Conselheiro de Administração',
    CONSELHEIRO_FISCAL: 'Conselheiro Fiscal'
  };

  const handleAddBoardMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    const coop = cooperados.find(c => c.id === selectedCoopId);
    if (!coop || !activeMandato) return;

    const newMembro: MembroDiretoria = {
      id: `membro-${Date.now()}`,
      cooperadoId: coop.id,
      cooperadoNome: coop.nome,
      cooperadoCpf: coop.cpf,
      cooperadoFotoUrl: coop.fotoUrl,
      cargo: selectedCargo,
      dataPosse: posseDate,
      dataFimMandato: fimMandatoDate,
      status: 'ATIVO'
    };

    updateMandato(activeMandato.id, {
      membros: [...activeMandato.membros, newMembro]
    });

    setIsNewMemberOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Diretoria & Conselhos de Governança</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Estrutura organizacional, controle de mandatos, eleições e vigência dos dirigentes
          </p>
        </div>
        {currentUser.role !== 'CONSULTA' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewMandatoOpen(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar Novo Mandato
            </button>
            <button
              onClick={() => {
                setModalSearchCoop('');
                if (cooperados.length > 0) {
                  setSelectedCoopId(selectedCoopId && cooperados.some(c => c.id === selectedCoopId) ? selectedCoopId : cooperados[0].id);
                }
                setIsNewMemberOpen(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nomear Dirigente / Conselheiro
            </button>
          </div>
        )}
      </div>

      {/* Mandate Selector & Expiry Alert */}
      <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Award className="w-6 h-6 text-amber-500 shrink-0" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Mandato Selecionado</div>
            <select
              value={selectedMandatoId}
              onChange={e => setSelectedMandatoId(e.target.value)}
              className="mt-0.5 bg-transparent font-extrabold text-slate-900 dark:text-white text-base outline-none cursor-pointer"
            >
              {mandatos.map(m => (
                <option key={m.id} value={m.id}>
                  {m.gestaoTitulo} ({m.periodoInicio} a {m.periodoFim}) - [{m.status}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {isExpiringSoon && (
          <div className="px-4 py-2 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2 text-amber-900 dark:text-amber-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Alerta de Vencimento: Mandato expira em {daysRemaining} dias! Convoque a comissão eleitoral.</span>
          </div>
        )}
      </div>

      {/* Visual Organogram Hierarchy Chart */}
      {activeMandato && (
        <div className="space-y-6">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-500" /> Organograma da Gestão Ativa
          </div>

          {/* Top Officers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeMandato.membros.map(membro => (
              <div
                key={membro.id}
                className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs hover:shadow-md transition-all relative overflow-hidden group"
              >
                <div className="w-2 h-full bg-amber-500 absolute left-0 top-0"></div>
                <div className="pl-3">
                  <span className="text-[10px] font-bold font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    {membro.cargo}
                  </span>
                  <div className="flex items-center gap-3 mt-3">
                    <img
                      src={membro.cooperadoFotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                      alt={membro.cooperadoNome}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-500/30 shrink-0"
                    />
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">{membro.cooperadoNome}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">CPF: {membro.cooperadoCpf}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Posse: {membro.dataPosse}</span>
                    <span className="font-mono font-semibold text-amber-600">Até {membro.dataFimMandato}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Board Details Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-xs">
              Quadro de Dirigentes e Eleição
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Cargo na Diretoria</th>
                  <th className="p-4">Dirigente Efeito</th>
                  <th className="p-4">Data Posse</th>
                  <th className="p-4">Término do Mandato</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                {activeMandato.membros.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-bold text-amber-600 dark:text-amber-400">
                      {cargoLabels[m.cargo]}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {m.cooperadoNome} ({m.cooperadoCpf})
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                      {m.dataPosse}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      {m.dataFimMandato}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal to Appoint Board Member */}
      {isNewMemberOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl lg:max-w-4xl overflow-hidden p-6 sm:p-8 space-y-5 text-slate-900 dark:text-white max-h-[90vh] flex flex-col my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Nomear Dirigente de Governança</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewMemberOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBoardMember} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Selecione o Cooperado * ({cooperados.length} cadastrados)
                  </label>
                  {modalSearchCoop && (
                    <button
                      type="button"
                      onClick={() => setModalSearchCoop('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                    >
                      Limpar Busca
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar cooperado por nome, CPF ou matrícula..."
                    value={modalSearchCoop}
                    onChange={e => setModalSearchCoop(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <select
                  required
                  value={selectedCoopId}
                  onChange={e => setSelectedCoopId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-400">
                    -- Selecione o Cooperado --
                  </option>
                  {cooperados
                    .filter(c =>
                      !modalSearchCoop ||
                      c.nome.toLowerCase().includes(modalSearchCoop.toLowerCase()) ||
                      c.matricula.toLowerCase().includes(modalSearchCoop.toLowerCase()) ||
                      c.cpf.includes(modalSearchCoop)
                    )
                    .map(c => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1">
                        {c.nome} (Matrícula: {c.matricula}) - CPF: {c.cpf}
                      </option>
                    ))}
                </select>

                {(() => {
                  const targetCoop = cooperados.find(c => c.id === selectedCoopId);
                  if (!targetCoop) return null;
                  return (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center gap-3">
                      <img
                        src={targetCoop.fotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                        alt={targetCoop.nome}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40 shrink-0"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{targetCoop.nome}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          CPF: {targetCoop.cpf} | Matrícula: {targetCoop.matricula}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          Situação: {targetCoop.situacao} | Profissão: {targetCoop.profissao || 'Agricultor(a)'}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Cargo de Governança *</label>
                <select
                  value={selectedCargo}
                  onChange={e => setSelectedCargo(e.target.value as CargoDiretoria)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-amber-600 dark:text-amber-400 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="PRESIDENTE" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Presidente do Conselho / Diretoria Executiva</option>
                  <option value="VICE_PRESIDENTE" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Vice-Presidente</option>
                  <option value="TESOUREIRO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Diretor Tesoureiro</option>
                  <option value="SECRETARIO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Diretor Secretário</option>
                  <option value="CONSELHEIRO_ADMIN" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Conselheiro de Administração</option>
                  <option value="CONSELHEIRO_FISCAL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Conselheiro Fiscal</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data da Posse *</label>
                  <input
                    type="date"
                    required
                    value={posseDate}
                    onChange={e => setPosseDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Fim do Mandato *</label>
                  <input
                    type="date"
                    required
                    value={fimMandatoDate}
                    onChange={e => setFimMandatoDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewMemberOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" /> Registrar Posse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal New Mandate */}
      {isNewMandatoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-6 space-y-5 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Cadastrar Novo Mandato de Gestão</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewMandatoOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMandato} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Título do Mandato / Gestão *</label>
                <input
                  type="text"
                  required
                  value={newMandatoForm.gestaoTitulo}
                  onChange={e => setNewMandatoForm({ ...newMandatoForm, gestaoTitulo: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  placeholder="Ex: Gestão Executiva 2026-2028"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data Início *</label>
                  <input
                    type="date"
                    required
                    value={newMandatoForm.periodoInicio}
                    onChange={e => setNewMandatoForm({ ...newMandatoForm, periodoInicio: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-medium text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data Término *</label>
                  <input
                    type="date"
                    required
                    value={newMandatoForm.periodoFim}
                    onChange={e => setNewMandatoForm({ ...newMandatoForm, periodoFim: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-medium text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Status do Mandato</label>
                <select
                  value={newMandatoForm.status}
                  onChange={e => setNewMandatoForm({ ...newMandatoForm, status: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="VIGENTE">VIGENTE</option>
                  <option value="ELEICAO_EM_ANDAMENTO">ELEIÇÃO EM ANDAMENTO</option>
                  <option value="ENCERRADO">ENCERRADO</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsNewMandatoOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Criar Mandato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
