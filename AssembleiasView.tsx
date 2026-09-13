import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { Assembleia, TipoAssembleia, StatusAssembleia, PautaItem } from '../types';
import {
  Calendar,
  Plus,
  QrCode,
  Users,
  Vote,
  FileCheck,
  Send,
  CheckCircle,
  X,
  Clock,
  MapPin,
  Check,
  Download,
  Printer,
  Sparkles,
  AlertTriangle,
  Edit3,
  Trash2,
  Search,
  Filter,
  Lock,
  Unlock,
  RefreshCw,
  UserCheck,
  UserX
} from 'lucide-react';
import jsPDF from 'jspdf';

export const AssembleiasView: React.FC = () => {
  const {
    assembleias,
    addAssembleia,
    updateAssembleia,
    registrarPresenca,
    computarVoto,
    dispararConvocacoes,
    cooperados,
    currentUser,
    config,
    canWriteModule
  } = useCoop();

  const canWrite = canWriteModule('assembleias');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [selectedAssId, setSelectedAssId] = useState<string>(assembleias[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'presenca' | 'pautas' | 'convocatoria' | 'ata'>('presenca');

  // Search and filter for presence
  const [searchTerm, setSearchTerm] = useState('');
  const [presenceFilter, setPresenceFilter] = useState<'TODOS' | 'PRESENTES' | 'AUSENTES'>('TODOS');
  const [cpfCheckinInput, setCpfCheckinInput] = useState('');
  const [checkinMessage, setCheckinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Assembly Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTipo, setNewTipo] = useState<TipoAssembleia>('AGO');
  const [newDataHora, setNewDataHora] = useState('2026-09-10T19:00');
  const [newLocal, setNewLocal] = useState('Auditório Central CoopBrasil');
  const [newQuorumPercent, setNewQuorumPercent] = useState<number>(50);
  const [newConvocatoria, setNewConvocatoria] = useState('');
  const [pautasDraftText, setPautasDraftText] = useState('Aprovação das Contas do Exercício\nDestinação das Sobras Líquidas\nEleição dos Membros do Conselho Fiscal');

  // Edit Assembly Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTipo, setEditTipo] = useState<TipoAssembleia>('AGO');
  const [editDataHora, setEditDataHora] = useState('');
  const [editLocal, setEditLocal] = useState('');
  const [editQuorumPercent, setEditQuorumPercent] = useState<number>(50);
  const [editConvocatoria, setEditConvocatoria] = useState('');
  const [editStatus, setEditStatus] = useState<StatusAssembleia>('AGENDADA');

  // Add Pauta Modal State
  const [isAddPautaOpen, setIsAddPautaOpen] = useState(false);
  const [pautaTitulo, setPautaTitulo] = useState('');
  const [pautaDescricao, setPautaDescricao] = useState('');
  const [pautaTipoQuorum, setPautaTipoQuorum] = useState<'SIMPLES' | 'ABSOLUTA' | 'QUALIFICADO'>('SIMPLES');

  // Ata Officials State
  const [presidenteNome, setPresidenteNome] = useState('Diretor Presidente');
  const [secretarioNome, setSecretarioNome] = useState('Secretário Geral');

  // Dispatch state
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [channels, setChannels] = useState<{ whatsapp: boolean; email: boolean; sms: boolean }>({
    whatsapp: true,
    email: true,
    sms: false
  });

  // Active Selected Assembly
  const selectedAss = assembleias.find(a => a.id === selectedAssId) || assembleias[0];

  // Quorum Calculations
  const totalAtivos = cooperados.filter(c => c.situacao === 'ATIVO').length;
  const participantesArray = selectedAss?.participantes || [];
  const presentesCount = participantesArray.filter(p => p.presente).length;
  const quorumPercent = totalAtivos > 0 ? (presentesCount / totalAtivos) * 100 : 0;
  const quorumAtingido = quorumPercent >= (selectedAss?.quorumMinimoPercent || 50);

  // Filtered Cooperados for Presence List
  const filteredCooperados = cooperados.filter(c => {
    const isPresente = participantesArray.some(p => p.cooperadoId === c.id && p.presente);
    if (presenceFilter === 'PRESENTES' && !isPresente) return false;
    if (presenceFilter === 'AUSENTES' && isPresente) return false;

    const query = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(query) ||
      c.cpf.includes(query) ||
      c.matricula.toLowerCase().includes(query)
    );
  });

  // Handlers
  const handleCreateAssembly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!newTitle.trim()) return;

    const initialPautasArray = pautasDraftText
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean)
      .map((p, idx) => ({
        id: `pt-${Date.now()}-${idx}`,
        titulo: p,
        descricao: `Deliberação em plenária referente a "${p}"`,
        encerrada: false,
        votosSim: 0,
        votosNao: 0,
        abstencoes: 0,
        tipoQuorum: 'SIMPLES' as const
      }));

    addAssembleia({
      titulo: newTitle,
      tipo: newTipo,
      dataHora: newDataHora,
      local: newLocal,
      convocatoriaTexto: newConvocatoria || `Ficam convocados todos os cooperados para a ${newTitle}, a realizar-se no local ${newLocal} na data ${new Date(newDataHora).toLocaleString('pt-BR')}.`,
      status: 'AGENDADA',
      quorumMinimoPercent: Number(newQuorumPercent) || 50,
      pautas: initialPautasArray,
      participantes: []
    });

    setIsNewModalOpen(false);
    setNewTitle('');
    setNewConvocatoria('');
  };

  const openEditModal = () => {
    if (!selectedAss) return;
    setEditTitle(selectedAss.titulo);
    setEditTipo(selectedAss.tipo);
    setEditDataHora(selectedAss.dataHora);
    setEditLocal(selectedAss.local);
    setEditQuorumPercent(selectedAss.quorumMinimoPercent || 50);
    setEditConvocatoria(selectedAss.convocatoriaTexto || '');
    setEditStatus(selectedAss.status);
    setIsEditModalOpen(true);
  };

  const handleSaveEditAssembly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!selectedAss || !editTitle.trim()) return;

    updateAssembleia(selectedAss.id, {
      titulo: editTitle,
      tipo: editTipo,
      dataHora: editDataHora,
      local: editLocal,
      quorumMinimoPercent: Number(editQuorumPercent) || 50,
      convocatoriaTexto: editConvocatoria,
      status: editStatus
    });

    setIsEditModalOpen(false);
  };

  const handleAddPauta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!selectedAss || !pautaTitulo.trim()) return;

    const newPauta: PautaItem = {
      id: `pt-${Date.now()}`,
      titulo: pautaTitulo,
      descricao: pautaDescricao || `Deliberação sobre ${pautaTitulo}`,
      encerrada: false,
      votosSim: 0,
      votosNao: 0,
      abstencoes: 0,
      tipoQuorum: pautaTipoQuorum
    };

    updateAssembleia(selectedAss.id, {
      pautas: [...selectedAss.pautas, newPauta]
    });

    setPautaTitulo('');
    setPautaDescricao('');
    setIsAddPautaOpen(false);
  };

  const handleTogglePautaEncerrada = (pautaId: string, atualEncerrada: boolean) => {
        if (!canWrite) { blockWriteAction(); return; }
if (!selectedAss) return;
    const updatedPautas = selectedAss.pautas.map(p => {
      if (p.id === pautaId) {
        return { ...p, encerrada: !atualEncerrada };
      }
      return p;
    });
    updateAssembleia(selectedAss.id, { pautas: updatedPautas });
  };

  const handleResetPautaVotos = (pautaId: string) => {
        if (!canWrite) { blockWriteAction(); return; }
if (!selectedAss) return;
    const updatedPautas = selectedAss.pautas.map(p => {
      if (p.id === pautaId) {
        return { ...p, votosSim: 0, votosNao: 0, abstencoes: 0, resultado: undefined };
      }
      return p;
    });
    updateAssembleia(selectedAss.id, { pautas: updatedPautas });
  };

  const handleDeletePauta = (pautaId: string) => {
        if (!canWrite) { blockWriteAction(); return; }
if (!selectedAss) return;
    const updatedPautas = selectedAss.pautas.filter(p => p.id !== pautaId);
    updateAssembleia(selectedAss.id, { pautas: updatedPautas });
  };

  const handleCpfCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpfCheckinInput.trim() || !selectedAss) return;

    const cleanInput = cpfCheckinInput.trim().toLowerCase();
    const coop = cooperados.find(c => 
      c.cpf.replaceAll('.', '').replaceAll('-', '') === cleanInput.replaceAll('.', '').replaceAll('-', '') ||
      c.cpf.includes(cleanInput) ||
      c.matricula.toLowerCase() === cleanInput
    );

    if (coop) {
      registrarPresenca(selectedAss.id, coop.id, 'CPF');
      setCheckinMessage({ type: 'success', text: `Presença de ${coop.nome} (Matrícula: ${coop.matricula}) registrada com sucesso!` });
      setCpfCheckinInput('');
    } else {
      setCheckinMessage({ type: 'error', text: 'Cooperado não encontrado pelo CPF ou Matrícula digitados.' });
    }

    setTimeout(() => setCheckinMessage(null), 4000);
  };

  const handleDispatch = async () => {
    if (!selectedAss) return;
    setDispatching(true);
    const channelList: string[] = [];
    if (channels.email) channelList.push('EMAIL');
    if (channels.whatsapp) channelList.push('WHATSAPP');
    if (channels.sms) channelList.push('SMS');

    await dispararConvocacoes(selectedAss.id, channelList);
    setDispatching(false);
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 4000);
  };

  const handleGerarAtaAutomatica = () => {
    if (!selectedAss) return;
    const dataFormatada = new Date(selectedAss.dataHora).toLocaleString('pt-BR');
    
    let pautasTexto = selectedAss.pautas.map((p, idx) => {
      const res = p.resultado || (p.votosSim > p.votosNao ? 'APROVADO' : p.votosNao > p.votosSim ? 'REJEITADO' : 'EM DELIBERAÇÃO');
      return `PAUTA ${idx + 1}: ${p.titulo.toUpperCase()}\nDescrição: ${p.descricao}\nVotação: ${p.votosSim} votos favoráveis, ${p.votosNao} contrários e ${p.abstencoes} abstenções. Deliberação Final: ${res}.`;
    }).join('\n\n');

    const novaAta = `ATA DA ${selectedAss.titulo.toUpperCase()} DA COOPERATIVA ${config.nomeCooperativa.toUpperCase()}

Ao(s) ${dataFormatada}, no local ${selectedAss.local}, reuniram-se em ${selectedAss.tipo} os membros cooperados ativos da ${config.nomeCooperativa}, devidamente convocados conforme edital de convocação expedido pela Diretoria.

I. ABERTURA E QUÓRUM
A mesa diretora foi composta pelo(a) Presidente Sr(a). ${presidenteNome} e pelo(a) Secretário(a) ad-hoc Sr(a). ${secretarioNome}. Registrou-se a presença de ${presentesCount} cooperados de um total de ${totalAtivos} associados ativos, perfazendo o quórum legal de ${quorumPercent.toFixed(1)}% (Mínimo exigido: ${selectedAss.quorumMinimoPercent}%). Verificado o quórum regimental, o Sr. Presidente declarou aberta a assembleia.

II. DELIBERAÇÕES DAS PAUTAS
${pautasTexto}

III. ENCERRAMENTO
Nada mais havendo a tratar, o Sr. Presidente encerrou os trabalhos, lavrando-se a presente ata que, lida e achada conforme, vai assinada pela mesa diretora e demais presentes.

${selectedAss.local}, ${new Date().toLocaleDateString('pt-BR')}.

______________________________________________________
${presidenteNome} - Presidente da Mesa

______________________________________________________
${secretarioNome} - Secretário ad-hoc`;

    updateAssembleia(selectedAss.id, { ataTexto: novaAta });
  };

  const exportAtaPDF = () => {
    if (!selectedAss) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(config.nomeCooperativa, 20, 20);
    doc.setFontSize(12);
    doc.text(`ATA DA ${selectedAss.titulo.toUpperCase()}`, 20, 30);
    doc.setFontSize(10);
    doc.text(`Data/Hora: ${new Date(selectedAss.dataHora).toLocaleString('pt-BR')} | Local: ${selectedAss.local}`, 20, 38);

    doc.setFontSize(10);
    const splitAta = doc.splitTextToSize(selectedAss.ataTexto || 'Ata ainda não redigida.', 170);
    doc.text(splitAta, 20, 50);

    doc.save(`Ata_${selectedAss.titulo.replaceAll(' ', '_')}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Assembleias & Governança Cooperativa
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestão Ativa de Convocações, Quórum, Votação em Tempo Real, Credenciamento e Emissão de Atas
          </p>
        </div>
        {currentUser.role !== 'CONSULTA' && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nova Assembleia / Reunião
          </button>
        )}
      </div>

      {/* Assembly List Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {assembleias.map(ass => (
          <div
            key={ass.id}
            onClick={() => setSelectedAssId(ass.id)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              ass.id === selectedAss?.id
                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {ass.tipo}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                ass.status === 'AGENDADA' ? 'bg-amber-100 text-amber-800' :
                ass.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-800' :
                ass.status === 'CONCLUIDA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {ass.status}
              </span>
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs mt-2 line-clamp-1">{ass.titulo}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {new Date(ass.dataHora).toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {/* Selected Assembly Detail Command Center */}
      {selectedAss && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xl overflow-hidden">
          {/* Header Bar */}
          <div className="p-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">{selectedAss.tipo}</span>
                {currentUser.role !== 'CONSULTA' && (
                  <button
                    onClick={openEditModal}
                    className="p-1 text-slate-400 hover:text-indigo-300 transition-colors"
                    title="Editar Informações da Assembleia"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <h3 className="text-xl font-black mt-1">{selectedAss.titulo}</h3>
              <p className="text-xs text-slate-300 mt-1.5 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400" /> {new Date(selectedAss.dataHora).toLocaleString('pt-BR')}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rose-400" /> {selectedAss.local}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Quick Status Select */}
              <div className="p-2 bg-slate-800 rounded-2xl border border-slate-700">
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Status da Assembleia</label>
                <select
                  value={selectedAss.status}
                  onChange={e => updateAssembleia(selectedAss.id, { status: e.target.value as StatusAssembleia })}
                  className="bg-slate-900 text-white text-xs font-bold rounded-xl px-2 py-1 border border-slate-600 focus:outline-hidden"
                >
                  <option value="AGENDADA">📅 AGENDADA</option>
                  <option value="EM_ANDAMENTO">⚡ EM ANDAMENTO</option>
                  <option value="CONCLUIDA">✅ CONCLUÍDA</option>
                  <option value="CANCELADA">❌ CANCELADA</option>
                </select>
              </div>

              {/* Quorum Progress Badge */}
              <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 min-w-[220px]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-bold">Quórum Atingido:</span>
                  <span className={`font-mono font-extrabold ${quorumAtingido ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {(quorumPercent || 0).toFixed(1)}% ({presentesCount}/{totalAtivos})
                  </span>
                </div>
                <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${quorumAtingido ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, quorumPercent)}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Mínimo: {selectedAss.quorumMinimoPercent}%</span>
                  <span>{quorumAtingido ? '✓ Validade Legal OK' : '⚠️ Abaixo do Quórum'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subtabs Bar */}
          <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('presenca')}
              className={`px-4 py-3 font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'presenca' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'
              }`}
            >
              <Users className="w-4 h-4" /> Controle de Presença ({presentesCount}/{totalAtivos})
            </button>

            <button
              onClick={() => setActiveTab('pautas')}
              className={`px-4 py-3 font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'pautas' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'
              }`}
            >
              <Vote className="w-4 h-4" /> Votação das Pautas ({selectedAss.pautas.length})
            </button>

            <button
              onClick={() => setActiveTab('convocatoria')}
              className={`px-4 py-3 font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'convocatoria' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'
              }`}
            >
              <Send className="w-4 h-4" /> Disparar Convocações
            </button>

            <button
              onClick={() => setActiveTab('ata')}
              className={`px-4 py-3 font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'ata' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'
              }`}
            >
              <FileCheck className="w-4 h-4" /> Ata Oficial
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 sm:p-6">
            {/* SUBTAB 1: CONTROLE DE PRESENÇA */}
            {activeTab === 'presenca' && (
              <div className="space-y-6">
                {/* Fast Check-in Section */}
                <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h4 className="font-black text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-emerald-600" /> Credenciamento / Registrar Presença de Cooperado
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                        Digite o CPF ou Nº de Matrícula para check-in imediato ou simule a leitura de QR Code.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const target = cooperados.find(c => !participantesArray.some(p => p.cooperadoId === c.id && p.presente));
                        if (target) {
                          registrarPresenca(selectedAss.id, target.id, 'QRCODE');
                          setCheckinMessage({ type: 'success', text: `Check-in QR Code realizado para ${target.nome}!` });
                          setTimeout(() => setCheckinMessage(null), 3000);
                        } else {
                          alert('Todos os cooperados ativos já realizaram o check-in!');
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      <QrCode className="w-4 h-4" /> Simular Leitor QR Code
                    </button>
                  </div>

                  {/* Manual Input Form */}
                  <form onSubmit={handleCpfCheckinSubmit} className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Digite o CPF ou Matrícula do Cooperado..."
                      value={cpfCheckinInput}
                      onChange={e => setCpfCheckinInput(e.target.value)}
                      className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                    >
                      Registrar Check-in
                    </button>
                  </form>

                  {checkinMessage && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      checkinMessage.type === 'success' ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-rose-200 text-rose-900 border border-rose-300'
                    }`}>
                      {checkinMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {checkinMessage.text}
                    </div>
                  )}
                </div>

                {/* Filter and Search Bar */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, CPF ou matrícula..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setPresenceFilter('TODOS')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${presenceFilter === 'TODOS' ? 'bg-white dark:bg-slate-800 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                      Todos ({cooperados.length})
                    </button>
                    <button
                      onClick={() => setPresenceFilter('PRESENTES')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${presenceFilter === 'PRESENTES' ? 'bg-white dark:bg-slate-800 shadow-xs text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}
                    >
                      Presentes ({presentesCount})
                    </button>
                    <button
                      onClick={() => setPresenceFilter('AUSENTES')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${presenceFilter === 'AUSENTES' ? 'bg-white dark:bg-slate-800 shadow-xs text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}
                    >
                      Ausentes ({totalAtivos - presentesCount})
                    </button>
                  </div>
                </div>

                {/* Cooperados List Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCooperados.map(coop => {
                    const checkin = participantesArray.find(p => p.cooperadoId === coop.id);
                    const isPresente = checkin?.presente;

                    return (
                      <div
                        key={coop.id}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          isPresente ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${isPresente ? 'bg-emerald-500 ring-4 ring-emerald-200 dark:ring-emerald-900' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                          <div className="truncate">
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{coop.nome}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              Matrícula: {coop.matricula} • CPF: {coop.cpf}
                            </div>
                            {isPresente && checkin?.dataPresenca && (
                              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                                Check-in: {checkin.dataPresenca} ({checkin.tipoCheckin})
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => registrarPresenca(selectedAss.id, coop.id, 'MANUAL')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
                            isPresente
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          }`}
                        >
                          {isPresente ? 'Remover' : 'Dar Presença'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBTAB 2: VOTAÇÃO DA PAUTA */}
            {activeTab === 'pautas' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <Vote className="w-5 h-5 text-indigo-600" /> Deliberações e Votação Eletrônica de Pautas
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Controle a contagem de votos simples, qualificada ou absoluta de cada pauta da assembleia.
                    </p>
                  </div>
                  {currentUser.role !== 'CONSULTA' && (
                    <button
                      onClick={() => setIsAddPautaOpen(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Incluir Nova Pauta
                    </button>
                  )}
                </div>

                {selectedAss.pautas.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    Nenhuma pauta cadastrada para esta assembleia. Clique em "+ Incluir Nova Pauta" acima.
                  </div>
                ) : (
                  selectedAss.pautas.map((pauta, idx) => {
                    const totalVotos = pauta.votosSim + pauta.votosNao + pauta.abstencoes;
                    return (
                      <div key={pauta.id} className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-xs">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              Item {idx + 1} da Pauta • Quórum: {pauta.tipoQuorum || 'SIMPLES'}
                            </span>
                            <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{pauta.titulo}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{pauta.descricao}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {pauta.encerrada && (
                              <span className="px-3 py-1 rounded-full font-bold text-xs bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" /> Votação Encerrada
                              </span>
                            )}
                            {pauta.resultado && (
                              <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                                pauta.resultado === 'APROVADO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {pauta.resultado}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Vote Buttons */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => computarVoto(selectedAss.id, pauta.id, 'SIM')}
                            disabled={pauta.encerrada}
                            className="flex-1 min-w-[140px] py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" /> Favor (Sim) [{pauta.votosSim}]
                          </button>

                          <button
                            onClick={() => computarVoto(selectedAss.id, pauta.id, 'NAO')}
                            disabled={pauta.encerrada}
                            className="flex-1 min-w-[140px] py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <X className="w-4 h-4" /> Contra (Não) [{pauta.votosNao}]
                          </button>

                          <button
                            onClick={() => computarVoto(selectedAss.id, pauta.id, 'ABSTENCAO')}
                            disabled={pauta.encerrada}
                            className="flex-1 min-w-[140px] py-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            Abstenção [{pauta.abstencoes}]
                          </button>

                          {/* Secondary Pauta Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTogglePautaEncerrada(pauta.id, pauta.encerrada)}
                              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-xs font-bold"
                              title={pauta.encerrada ? "Reabrir Votação" : "Encerrar Votação"}
                            >
                              {pauta.encerrada ? <Unlock className="w-4 h-4 text-amber-600" /> : <Lock className="w-4 h-4 text-slate-500" />}
                            </button>

                            <button
                              onClick={() => handleResetPautaVotos(pauta.id)}
                              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-xs font-bold"
                              title="Zerar Votos desta Pauta"
                            >
                              <RefreshCw className="w-4 h-4 text-slate-500" />
                            </button>

                            <button
                              onClick={() => handleDeletePauta(pauta.id)}
                              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 transition-all text-xs font-bold"
                              title="Excluir Pauta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Vote Tally Bar */}
                        <div className="text-xs space-y-1.5 pt-2">
                          <div className="flex justify-between text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold">
                            <span className="text-emerald-700 dark:text-emerald-400">Favoráveis: {pauta.votosSim} ({totalVotos > 0 ? ((pauta.votosSim/totalVotos)*100).toFixed(1) : 0}%)</span>
                            <span className="text-rose-700 dark:text-rose-400">Contrários: {pauta.votosNao} ({totalVotos > 0 ? ((pauta.votosNao/totalVotos)*100).toFixed(1) : 0}%)</span>
                            <span>Abstenções: {pauta.abstencoes}</span>
                            <span>Total Computado: {totalVotos}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                            <div style={{ width: `${totalVotos > 0 ? (pauta.votosSim/totalVotos)*100 : 0}%` }} className="bg-emerald-500 h-full"></div>
                            <div style={{ width: `${totalVotos > 0 ? (pauta.votosNao/totalVotos)*100 : 0}%` }} className="bg-rose-500 h-full"></div>
                            <div style={{ width: `${totalVotos > 0 ? (pauta.abstencoes/totalVotos)*100 : 0}%` }} className="bg-slate-400 h-full"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SUBTAB 3: DISPARAR CONVOCAÇÕES */}
            {activeTab === 'convocatoria' && (
              <div className="space-y-5 text-xs">
                <div className="p-5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <h4 className="font-extrabold text-indigo-950 dark:text-indigo-200 text-sm flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-600" /> Central de Notificações e Edital de Convocação
                  </h4>
                  <p className="text-indigo-800 dark:text-indigo-300">
                    Envie o edital de convocação em lote para todos os {totalAtivos} cooperados ativos da cooperativa através de canais digitais.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Texto Oficial do Edital de Convocação *
                  </label>
                  <textarea
                    rows={6}
                    value={selectedAss.convocatoriaTexto}
                    onChange={e => updateAssembleia(selectedAss.id, { convocatoriaTexto: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100 text-xs shadow-xs"
                  ></textarea>
                </div>

                {/* Channel selection */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">Canais de Disparo Selecionados:</label>
                  <div className="flex items-center gap-6 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channels.whatsapp}
                        onChange={e => setChannels({ ...channels, whatsapp: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-300">WhatsApp API Oficial (Lote)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channels.email}
                        onChange={e => setChannels({ ...channels, email: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-300">E-mail SMTP Corporativo</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channels.sms}
                        onChange={e => setChannels({ ...channels, sms: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-300">SMS Notificação</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-4 flex-wrap">
                  <button
                    onClick={handleDispatch}
                    disabled={dispatching || (!channels.whatsapp && !channels.email && !channels.sms)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    {dispatching ? 'Enviando Convocações em Lote...' : `Disparar Convocações para ${totalAtivos} Cooperados`}
                  </button>

                  {dispatchSuccess && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950 px-4 py-2 rounded-xl">
                      <CheckCircle className="w-4 h-4" /> Convocações disparadas com sucesso!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 4: ATA OFICIAL */}
            {activeTab === 'ata' && (
              <div className="space-y-5 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-indigo-600" /> Redação e Emissão de Ata Oficial
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gere a ata com formato jurídico standard contendo os quóruns e resultados das votações.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGerarAtaAutomatica}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition-all"
                    >
                      <Sparkles className="w-4 h-4" /> Gerar Ata Automática
                    </button>

                    <button
                      onClick={exportAtaPDF}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition-all"
                    >
                      <Download className="w-4 h-4" /> Exportar Ata em PDF
                    </button>
                  </div>
                </div>

                {/* President and Secretary Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Presidente da Mesa</label>
                    <input
                      type="text"
                      value={presidenteNome}
                      onChange={e => setPresidenteNome(e.target.value)}
                      placeholder="Nome do Presidente da Mesa"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Secretário ad-hoc</label>
                    <input
                      type="text"
                      value={secretarioNome}
                      onChange={e => setSecretarioNome(e.target.value)}
                      placeholder="Nome do Secretário ad-hoc"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Texto Íntegra da Ata *</label>
                  <textarea
                    rows={12}
                    value={selectedAss.ataTexto || ''}
                    onChange={e => updateAssembleia(selectedAss.id, { ataTexto: e.target.value })}
                    placeholder="Redija a ata da assembleia ou clique em 'Gerar Ata Automática'..."
                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-serif leading-relaxed text-slate-900 dark:text-slate-100 text-sm shadow-xs"
                  ></textarea>
                </div>

                {/* Signatures Display */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 mb-3 text-center uppercase tracking-wider text-xs">Assinaturas Digitais Registradas</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="border-b-2 border-slate-400 mb-2 w-3/4 mx-auto"></div>
                      <p className="font-bold text-slate-900 dark:text-white">{presidenteNome}</p>
                      <p className="text-[10px] text-slate-500">Presidente da Mesa Assemblear</p>
                    </div>
                    <div>
                      <div className="border-b-2 border-slate-400 mb-2 w-3/4 mx-auto"></div>
                      <p className="font-bold text-slate-900 dark:text-white">{secretarioNome}</p>
                      <p className="text-[10px] text-slate-500">Secretário(a) ad-hoc</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for New Assembly */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl lg:max-w-4xl overflow-hidden p-6 sm:p-8 space-y-5 my-8 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" /> Nova Convocação de Assembleia / Reunião
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssembly} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Título da Convocação *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 8ª Assembleia Geral Ordinária (AGO 2026)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Assembleia *</label>
                  <select
                    value={newTipo}
                    onChange={e => setNewTipo(e.target.value as TipoAssembleia)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value="AGO">AGO - Geral Ordinária</option>
                    <option value="AGE">AGE - Geral Extraordinária</option>
                    <option value="REUNIAO">Reunião de Conselho</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newDataHora}
                    onChange={e => setNewDataHora(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quórum Mínimo (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newQuorumPercent}
                    onChange={e => setNewQuorumPercent(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Local da Realização *</label>
                <input
                  type="text"
                  required
                  value={newLocal}
                  onChange={e => setNewLocal(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Texto do Edital de Convocação</label>
                <textarea
                  rows={3}
                  value={newConvocatoria}
                  onChange={e => setNewConvocatoria(e.target.value)}
                  placeholder="Instruções de convocação aos associados..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pautas Iniciais (Uma por linha)</label>
                <textarea
                  rows={4}
                  value={pautasDraftText}
                  onChange={e => setPautasDraftText(e.target.value)}
                  placeholder="Insira um item de pauta por linha..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Cadastrar Assembleia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Editing Assembly */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl overflow-hidden p-6 sm:p-8 space-y-5 my-8 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" /> Editar Dados da Assembleia
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAssembly} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Título da Assembleia *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    value={editTipo}
                    onChange={e => setEditTipo(e.target.value as TipoAssembleia)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value="AGO">AGO - Geral Ordinária</option>
                    <option value="AGE">AGE - Geral Extraordinária</option>
                    <option value="REUNIAO">Reunião de Conselho</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editDataHora}
                    onChange={e => setEditDataHora(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quórum Mínimo (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={editQuorumPercent}
                    onChange={e => setEditQuorumPercent(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Local da Realização *</label>
                  <input
                    type="text"
                    required
                    value={editLocal}
                    onChange={e => setEditLocal(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status da Assembleia</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as StatusAssembleia)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value="AGENDADA">AGENDADA</option>
                    <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                    <option value="CONCLUIDA">CONCLUÍDA</option>
                    <option value="CANCELADA">CANCELADA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Texto do Edital de Convocação</label>
                <textarea
                  rows={4}
                  value={editConvocatoria}
                  onChange={e => setEditConvocatoria(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Adding Pauta */}
      {isAddPautaOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl overflow-hidden p-6 sm:p-8 space-y-5 my-8 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Vote className="w-5 h-5 text-indigo-600" /> Incluir Nova Pauta na Assembleia
              </h3>
              <button onClick={() => setIsAddPautaOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPauta} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Título da Pauta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aprovação da Prestação de Contas 2025/2026"
                  value={pautaTitulo}
                  onChange={e => setPautaTitulo(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Detalhes *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explicação resumida do objeto em deliberação..."
                  value={pautaDescricao}
                  onChange={e => setPautaDescricao(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Quórum Necessário</label>
                <select
                  value={pautaTipoQuorum}
                  onChange={e => setPautaTipoQuorum(e.target.value as 'SIMPLES' | 'ABSOLUTA' | 'QUALIFICADO')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value="SIMPLES">Maioria Simples (50% + 1 dos presentes)</option>
                  <option value="ABSOLUTA">Maioria Absoluta (50% + 1 dos ativos)</option>
                  <option value="QUALIFICADO">Quórum Qualificado (2/3 dos votos)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddPautaOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Adicionar Pauta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
