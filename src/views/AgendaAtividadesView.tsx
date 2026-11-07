import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Unlink,
  Clock,
  MapPin,
  Filter,
  RotateCcw
} from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { DataGrid, GridStatus } from '../components/ui/DataGrid';
import { formatarData } from '../utils/dateHelpers';
import type { Atividade, PrioridadeAtividade, StatusAtividade } from '../types/agenda';
import { STATUS_ATIVIDADE, rotuloStatusAtividade } from '../types/agenda';
import {
  agendaConectada,
  conectarGoogleAgenda,
  desconectarGoogleAgenda,
  emailAgendaConectada,
  listarEventosGoogle,
  criarEventoGoogle,
  atualizarEventoGoogle,
  excluirEventoGoogle,
  type EventoGoogle
} from '../services/googleCalendarService';

type Aba = 'agenda' | 'atividades';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isoDe = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

const diaDoEvento = (e: EventoGoogle) => (e.start.date || (e.start.dateTime || '').slice(0, 10));
const horaDoEvento = (e: EventoGoogle) => {
  if (e.start.date) return 'Dia inteiro';
  const fmt = (s?: string) => (s ? new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
  return `${fmt(e.start.dateTime)}${e.end.dateTime ? ` – ${fmt(e.end.dateTime)}` : ''}`;
};

const tomStatus = (s: StatusAtividade): 'success' | 'warning' | 'danger' | 'neutral' =>
  s === 'CONCLUIDA' ? 'success' : s === 'CANCELADA' ? 'danger' : s === 'EM_ANDAMENTO' ? 'warning' : 'neutral';

const inputCls = 'w-full p-2.5 border border-slate-200 rounded-xl bg-white';
const labelCls = 'block text-slate-700 font-bold mb-1';

export const AgendaAtividadesView: React.FC = () => {
  const { atividades, addAtividade, updateAtividade, deleteAtividade, users, currentUser, currentTenant } = useCoop();
  const [activeTab, setActiveTab] = useState<Aba>('agenda');

  // ---------------------------------------------------------------- Google Agenda
  const [conectada, setConectada] = useState(agendaConectada());
  const [eventos, setEventos] = useState<EventoGoogle[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erroAgenda, setErroAgenda] = useState('');
  const hoje = new Date();
  const [mesRef, setMesRef] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });

  const carregarEventos = useCallback(async () => {
    if (!agendaConectada()) { setConectada(false); return; }
    setCarregando(true);
    setErroAgenda('');
    try {
      const inicio = isoDe(mesRef.ano, mesRef.mes, 1);
      const proximo = new Date(mesRef.ano, mesRef.mes + 1, 1);
      const fim = isoDe(proximo.getFullYear(), proximo.getMonth(), 1);
      setEventos(await listarEventosGoogle(inicio, fim));
    } catch (e: any) {
      setErroAgenda(e?.message || 'Erro ao carregar a agenda.');
      setConectada(agendaConectada());
    } finally {
      setCarregando(false);
    }
  }, [mesRef]);

  useEffect(() => { if (conectada) carregarEventos(); }, [conectada, carregarEventos]);

  const conectar = async () => {
    setErroAgenda('');
    try {
      await conectarGoogleAgenda();
      setConectada(true);
    } catch (e: any) {
      setErroAgenda(e?.message || 'Não foi possível conectar.');
    }
  };

  const desconectar = () => {
    desconectarGoogleAgenda();
    setConectada(false);
    setEventos([]);
  };

  const mudarMes = (delta: number) => {
    const d = new Date(mesRef.ano, mesRef.mes + delta, 1);
    setMesRef({ ano: d.getFullYear(), mes: d.getMonth() });
  };

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, EventoGoogle[]>();
    eventos.forEach(e => {
      const dia = diaDoEvento(e);
      mapa.set(dia, [...(mapa.get(dia) || []), e]);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [eventos]);

  // Modal de evento
  const [showEvento, setShowEvento] = useState(false);
  const [editandoEvento, setEditandoEvento] = useState<EventoGoogle | null>(null);
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [eventoForm, setEventoForm] = useState({ titulo: '', data: hojeISO(), horaInicio: '09:00', horaFim: '10:00', diaInteiro: false, local: '', descricao: '' });

  const abrirEvento = (e?: EventoGoogle) => {
    if (e) {
      const ini = e.start.dateTime ? new Date(e.start.dateTime) : null;
      const fim = e.end.dateTime ? new Date(e.end.dateTime) : null;
      const hhmm = (d: Date | null) => (d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '');
      setEditandoEvento(e);
      setEventoForm({
        titulo: e.summary || '',
        data: diaDoEvento(e),
        horaInicio: hhmm(ini) || '09:00',
        horaFim: hhmm(fim) || '10:00',
        diaInteiro: !!e.start.date,
        local: e.location || '',
        descricao: e.description || ''
      });
    } else {
      setEditandoEvento(null);
      setEventoForm({ titulo: '', data: hojeISO(), horaInicio: '09:00', horaFim: '10:00', diaInteiro: false, local: '', descricao: '' });
    }
    setShowEvento(true);
  };

  const salvarEvento = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!eventoForm.titulo.trim() || !eventoForm.data) return;
    setSalvandoEvento(true);
    setErroAgenda('');
    try {
      const dados = {
        titulo: eventoForm.titulo.trim(),
        data: eventoForm.data,
        horaInicio: eventoForm.diaInteiro ? undefined : eventoForm.horaInicio,
        horaFim: eventoForm.diaInteiro ? undefined : eventoForm.horaFim,
        local: eventoForm.local,
        descricao: eventoForm.descricao
      };
      if (editandoEvento) await atualizarEventoGoogle(editandoEvento.id, dados);
      else await criarEventoGoogle(dados);
      setShowEvento(false);
      await carregarEventos();
    } catch (e: any) {
      setErroAgenda(e?.message || 'Erro ao salvar o evento.');
    } finally {
      setSalvandoEvento(false);
    }
  };

  const removerEvento = async (e: EventoGoogle) => {
    if (!confirm(`Excluir "${e.summary || 'evento'}" da sua Google Agenda?`)) return;
    try {
      await excluirEventoGoogle(e.id);
      await carregarEventos();
    } catch (err: any) {
      setErroAgenda(err?.message || 'Erro ao excluir o evento.');
    }
  };

  // ---------------------------------------------------------------- Atividades
  const equipe = useMemo(
    () => (users || []).filter(u => u.active !== false && (!u.tenantId || u.tenantId === currentTenant?.id)),
    [users, currentTenant]
  );

  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ABERTAS' | StatusAtividade>('ABERTAS');
  const [filtroResp, setFiltroResp] = useState('TODOS');
  const responsaveis = useMemo(
    () => Array.from(new Set((atividades || []).map(a => a.responsavelNome).filter(Boolean))).sort(),
    [atividades]
  );
  const atividadesFiltradas = useMemo(() => (atividades || [])
    .filter(a => filtroStatus === 'TODOS'
      || (filtroStatus === 'ABERTAS' ? (a.status === 'PENDENTE' || a.status === 'EM_ANDAMENTO') : a.status === filtroStatus))
    .filter(a => filtroResp === 'TODOS' || a.responsavelNome === filtroResp)
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999')), [atividades, filtroStatus, filtroResp]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = { PENDENTE: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0, CANCELADA: 0, ATRASADA: 0 };
    const hj = hojeISO();
    (atividades || []).forEach(a => {
      c[a.status] = (c[a.status] || 0) + 1;
      if ((a.status === 'PENDENTE' || a.status === 'EM_ANDAMENTO') && a.prazo && a.prazo < hj) c.ATRASADA++;
    });
    return c;
  }, [atividades]);

  const [showAtividade, setShowAtividade] = useState(false);
  const [editandoAtiv, setEditandoAtiv] = useState<Atividade | null>(null);
  const [salvandoAtiv, setSalvandoAtiv] = useState(false);
  const formVazio = () => ({
    titulo: '',
    descricao: '',
    responsavelId: currentUser?.id || '',
    responsavelNome: currentUser?.name || '',
    status: 'PENDENTE' as StatusAtividade,
    prioridade: 'MEDIA' as PrioridadeAtividade,
    prazo: hojeISO(),
    noGoogle: agendaConectada()
  });
  const [ativForm, setAtivForm] = useState(formVazio());

  const abrirAtividade = (a?: Atividade) => {
    if (a) {
      setEditandoAtiv(a);
      setAtivForm({
        titulo: a.titulo,
        descricao: a.descricao || '',
        responsavelId: a.responsavelId || '',
        responsavelNome: a.responsavelNome || '',
        status: a.status,
        prioridade: a.prioridade || 'MEDIA',
        prazo: a.prazo || '',
        noGoogle: !!a.googleEventId
      });
    } else {
      setEditandoAtiv(null);
      setAtivForm(formVazio());
    }
    setShowAtividade(true);
  };

  const escolherResponsavel = (valor: string) => {
    if (valor === '__outro') { setAtivForm({ ...ativForm, responsavelId: '', responsavelNome: '' }); return; }
    const u = equipe.find(x => x.id === valor);
    setAtivForm({ ...ativForm, responsavelId: u?.id || '', responsavelNome: u?.name || '' });
  };

  const eventoDaAtividade = (f: typeof ativForm) => ({
    titulo: `[Atividade] ${f.titulo.trim()}`,
    data: f.prazo,
    descricao: [
      f.descricao,
      `Responsável: ${f.responsavelNome}`,
      `Status: ${rotuloStatusAtividade(f.status)}`,
      'Lançado no SICOOP — Agenda & Atividades'
    ].filter(Boolean).join('\n')
  });

  const salvarAtividade = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!ativForm.titulo.trim()) return;
    if (!ativForm.responsavelNome.trim()) { alert('Informe o responsável pela atividade.'); return; }
    setSalvandoAtiv(true);
    try {
      let googleEventId = editandoAtiv?.googleEventId;
      let avisoGoogle = '';
      const querGoogle = ativForm.noGoogle && !!ativForm.prazo;
      if (agendaConectada()) {
        try {
          if (querGoogle && googleEventId) await atualizarEventoGoogle(googleEventId, eventoDaAtividade(ativForm));
          else if (querGoogle) googleEventId = (await criarEventoGoogle(eventoDaAtividade(ativForm))).id;
          else if (!querGoogle && googleEventId) { await excluirEventoGoogle(googleEventId); googleEventId = undefined; }
        } catch (e: any) {
          avisoGoogle = e?.message || 'Falha ao atualizar a Google Agenda.';
        }
      } else if (querGoogle && !googleEventId) {
        avisoGoogle = 'A atividade foi salva, mas a Google Agenda não está conectada. Conecte na aba Agenda para enviar o prazo.';
      }
      const dados = {
        titulo: ativForm.titulo.trim(),
        descricao: ativForm.descricao.trim() || undefined,
        responsavelId: ativForm.responsavelId || undefined,
        responsavelNome: ativForm.responsavelNome.trim(),
        status: ativForm.status,
        prioridade: ativForm.prioridade,
        prazo: ativForm.prazo || undefined,
        googleEventId
      };
      if (editandoAtiv) updateAtividade(editandoAtiv.id, dados);
      else addAtividade(dados);
      setShowAtividade(false);
      if (avisoGoogle) alert(avisoGoogle);
      if (conectada) carregarEventos();
    } finally {
      setSalvandoAtiv(false);
    }
  };

  const mudarStatus = (a: Atividade, status: StatusAtividade) => updateAtividade(a.id, { status });

  const removerAtividade = async (a: Atividade) => {
    if (!confirm(`Excluir a atividade "${a.titulo}"?`)) return;
    if (a.googleEventId && agendaConectada()) {
      try { await excluirEventoGoogle(a.googleEventId); } catch { /* evento já removido na agenda */ }
    }
    deleteAtividade(a.id);
    if (conectada) carregarEventos();
  };

  // ---------------------------------------------------------------- Render
  const hj = hojeISO();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <CalendarDays className="w-3.5 h-3.5" /> Organização da Equipe
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Agenda & Atividades</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sua Google Agenda e as atividades da cooperativa, com status e responsável.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'agenda' && conectada && (
            <button onClick={() => abrirEvento()} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Evento
            </button>
          )}
          {activeTab === 'atividades' && (
            <button onClick={() => abrirAtividade()} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nova Atividade
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {([['agenda', 'Agenda', CalendarDays], ['atividades', `Atividades (${(atividades || []).length})`, ListChecks]] as [Aba, string, React.ElementType][]).map(([id, rotulo, Icone]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === id ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icone className="w-4 h-4" /> {rotulo}
          </button>
        ))}
      </div>

      {erroAgenda && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 flex items-start justify-between gap-3">
          <span>{erroAgenda}</span>
          <button onClick={() => setErroAgenda('')} className="text-rose-500"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Aba Agenda */}
      {activeTab === 'agenda' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          {!conectada ? (
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CalendarDays className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <div className="text-lg font-black text-slate-900">Conecte sua Google Agenda</div>
                <p className="text-sm text-slate-500 max-w-lg mx-auto mt-1">
                  Veja, crie e edite os eventos da agenda Google da conta com que você entrou no sistema
                  {currentUser?.email ? <> (<strong>{currentUser.email}</strong>)</> : null}. O Google vai pedir sua autorização.
                </p>
              </div>
              <button onClick={conectar} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm inline-flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Conectar Google Agenda
              </button>
              <p className="text-[11px] text-slate-400">A conexão vale enquanto esta aba estiver aberta (cerca de 1 hora); depois é só conectar de novo.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <button onClick={() => mudarMes(-1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50" title="Mês anterior"><ChevronLeft className="w-4 h-4" /></button>
                  <div className="min-w-[160px] text-center font-black text-slate-900">{MESES[mesRef.mes]} {mesRef.ano}</div>
                  <button onClick={() => mudarMes(1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50" title="Próximo mês"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={() => setMesRef({ ano: hoje.getFullYear(), mes: hoje.getMonth() })} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Hoje</button>
                  <button onClick={carregarEventos} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50" title="Atualizar"><RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} /></button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Conectada: <strong className="text-slate-700">{emailAgendaConectada()}</strong></span>
                  <button onClick={desconectar} className="px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"><Unlink className="w-3.5 h-3.5" /> Desconectar</button>
                </div>
              </div>

              {carregando && eventos.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">Carregando eventos…</div>
              ) : eventosPorDia.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">Nenhum evento em {MESES[mesRef.mes].toLowerCase()}.</div>
              ) : (
                <div className="space-y-4">
                  {eventosPorDia.map(([dia, lista]) => {
                    const d = new Date(`${dia}T12:00:00`);
                    return (
                      <div key={dia} className="grid grid-cols-[88px_1fr] gap-4">
                        <div className={`text-center rounded-xl p-2 h-fit ${dia === hj ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700'}`}>
                          <div className="text-2xl font-black leading-none">{d.getDate()}</div>
                          <div className="text-[10px] font-bold uppercase mt-1 opacity-80">{DIAS_SEMANA[d.getDay()].slice(0, 3)}</div>
                        </div>
                        <div className="space-y-2">
                          {lista.map(e => (
                            <div key={e.id} className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-sm truncate">{e.summary || '(sem título)'}</div>
                                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {horaDoEvento(e)}</span>
                                  {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</span>}
                                </div>
                                {e.description && <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 whitespace-pre-line">{e.description}</div>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {e.htmlLink && <a href={e.htmlLink} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Abrir no Google Agenda"><ExternalLink className="w-4 h-4" /></a>}
                                <button onClick={() => abrirEvento(e)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Editar"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => removerEvento(e)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Aba Atividades */}
      {activeTab === 'atividades' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {([
              ['Pendentes', contagem.PENDENTE, 'text-slate-800'],
              ['Em andamento', contagem.EM_ANDAMENTO, 'text-amber-700'],
              ['Atrasadas', contagem.ATRASADA, 'text-rose-700'],
              ['Concluídas', contagem.CONCLUIDA, 'text-emerald-700'],
              ['Canceladas', contagem.CANCELADA, 'text-slate-500']
            ] as [string, number, string][]).map(([rot, val, cor]) => (
              <div key={rot} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-[10px] font-bold uppercase text-slate-500">{rot}</div>
                <div className={`text-2xl font-black ${cor}`}>{val}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-1"><Filter className="w-3.5 h-3.5" /> Filtros</div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Status</label>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                  <option value="ABERTAS">Em aberto (pendentes e em andamento)</option>
                  <option value="TODOS">Todos</option>
                  {STATUS_ATIVIDADE.map(s => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Responsável</label>
                <select value={filtroResp} onChange={e => setFiltroResp(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white max-w-[220px]">
                  <option value="TODOS">Todos</option>
                  {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={() => { setFiltroStatus('ABERTAS'); setFiltroResp('TODOS'); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl">
                <RotateCcw className="w-3.5 h-3.5" /> Limpar
              </button>
              <span className="text-[11px] text-slate-400 font-semibold ml-auto">{atividadesFiltradas.length} de {(atividades || []).length} atividade(s)</span>
            </div>

            <DataGrid
              rows={atividadesFiltradas}
              getRowId={a => a.id}
              pageSize={20}
              onRowDoubleClick={a => abrirAtividade(a)}
              panelTitle={a => a.titulo}
              panelSubtitle={a => [a.responsavelNome, a.prazo ? `prazo ${formatarData(a.prazo)}` : ''].filter(Boolean).join(' · ')}
              emptyMessage="Nenhuma atividade para os filtros selecionados."
              columns={[
                {
                  key: 'status',
                  header: 'Status',
                  width: 140,
                  value: a => rotuloStatusAtividade(a.status),
                  render: a => <GridStatus tone={tomStatus(a.status)} label={rotuloStatusAtividade(a.status)} />
                },
                { key: 'titulo', header: 'Atividade', width: 280 },
                { key: 'responsavelNome', header: 'Responsável', width: 180 },
                {
                  key: 'prazo',
                  header: 'Prazo',
                  width: 120,
                  value: a => a.prazo || '',
                  render: a => {
                    if (!a.prazo) return '—';
                    const atrasada = (a.status === 'PENDENTE' || a.status === 'EM_ANDAMENTO') && a.prazo < hj;
                    return <span className={atrasada ? 'font-bold text-rose-600' : ''}>{formatarData(a.prazo)}{atrasada ? ' (atrasada)' : ''}</span>;
                  }
                },
                {
                  key: 'prioridade',
                  header: 'Prioridade',
                  width: 110,
                  render: a => <GridStatus tone={a.prioridade === 'ALTA' ? 'danger' : 'neutral'} label={a.prioridade === 'MEDIA' ? 'Média' : a.prioridade === 'ALTA' ? 'Alta' : 'Baixa'} />
                },
                { key: 'google', header: 'Google Agenda', width: 120, value: a => (a.googleEventId ? 'Na agenda' : '—') },
                { key: 'descricao', header: 'Descrição', width: 240 }
              ]}
              actions={[
                { label: 'Editar', icon: Pencil, onClick: a => abrirAtividade(a) },
                { label: 'Iniciar (em andamento)', icon: Clock, onClick: a => mudarStatus(a, 'EM_ANDAMENTO') },
                { label: 'Concluir', icon: ListChecks, onClick: a => mudarStatus(a, 'CONCLUIDA') },
                { label: 'Reabrir (pendente)', icon: RotateCcw, onClick: a => mudarStatus(a, 'PENDENTE') },
                { label: 'Excluir', icon: Trash2, tone: 'danger', divider: true, onClick: a => removerAtividade(a) }
              ]}
            />
          </div>
        </div>
      )}

      {/* Modal Evento Google */}
      {showEvento && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">{editandoEvento ? 'Editar Evento' : 'Novo Evento na Google Agenda'}</h2>
              <button onClick={() => setShowEvento(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={salvarEvento} className="space-y-3 text-xs">
              <div>
                <label className={labelCls}>Título *</label>
                <input required value={eventoForm.titulo} onChange={e => setEventoForm({ ...eventoForm, titulo: e.target.value })} className={inputCls} placeholder="Ex: Reunião da diretoria" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div className="col-span-2 md:col-span-1">
                  <label className={labelCls}>Data *</label>
                  <input type="date" required value={eventoForm.data} onChange={e => setEventoForm({ ...eventoForm, data: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Início</label>
                  <input type="time" disabled={eventoForm.diaInteiro} value={eventoForm.horaInicio} onChange={e => setEventoForm({ ...eventoForm, horaInicio: e.target.value })} className={`${inputCls} disabled:bg-slate-100`} />
                </div>
                <div>
                  <label className={labelCls}>Fim</label>
                  <input type="time" disabled={eventoForm.diaInteiro} value={eventoForm.horaFim} onChange={e => setEventoForm({ ...eventoForm, horaFim: e.target.value })} className={`${inputCls} disabled:bg-slate-100`} />
                </div>
                <label className="flex items-center gap-2 font-bold text-slate-700 pb-3">
                  <input type="checkbox" checked={eventoForm.diaInteiro} onChange={e => setEventoForm({ ...eventoForm, diaInteiro: e.target.checked })} /> Dia inteiro
                </label>
              </div>
              <div>
                <label className={labelCls}>Local</label>
                <input value={eventoForm.local} onChange={e => setEventoForm({ ...eventoForm, local: e.target.value })} className={inputCls} placeholder="Ex: Sede da cooperativa" />
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <textarea rows={3} value={eventoForm.descricao} onChange={e => setEventoForm({ ...eventoForm, descricao: e.target.value })} className={inputCls} />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowEvento(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={salvandoEvento} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-60">{salvandoEvento ? 'Salvando…' : 'Salvar na Google Agenda'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Atividade */}
      {showAtividade && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">{editandoAtiv ? 'Editar Atividade' : 'Nova Atividade'}</h2>
              <button onClick={() => setShowAtividade(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={salvarAtividade} className="space-y-3 text-xs">
              <div>
                <label className={labelCls}>Atividade *</label>
                <input required value={ativForm.titulo} onChange={e => setAtivForm({ ...ativForm, titulo: e.target.value })} className={inputCls} placeholder="Ex: Enviar prestação de contas do PNAE" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Responsável *</label>
                  <select
                    value={ativForm.responsavelId || (ativForm.responsavelNome || !equipe.length ? '__outro' : '')}
                    onChange={e => escolherResponsavel(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Selecione</option>
                    {equipe.map(u => <option key={u.id} value={u.id}>{u.name}{u.cargo ? ` — ${u.cargo}` : ''}</option>)}
                    <option value="__outro">Outra pessoa (digitar o nome)</option>
                  </select>
                  {!ativForm.responsavelId && (
                    <input
                      value={ativForm.responsavelNome}
                      onChange={e => setAtivForm({ ...ativForm, responsavelNome: e.target.value })}
                      className={`${inputCls} mt-2`}
                      placeholder="Nome do responsável"
                    />
                  )}
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={ativForm.status} onChange={e => setAtivForm({ ...ativForm, status: e.target.value as StatusAtividade })} className={`${inputCls} font-bold`}>
                    {STATUS_ATIVIDADE.map(s => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Prazo</label>
                  <input type="date" value={ativForm.prazo} onChange={e => setAtivForm({ ...ativForm, prazo: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Prioridade</label>
                  <select value={ativForm.prioridade} onChange={e => setAtivForm({ ...ativForm, prioridade: e.target.value as PrioridadeAtividade })} className={inputCls}>
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <textarea rows={3} value={ativForm.descricao} onChange={e => setAtivForm({ ...ativForm, descricao: e.target.value })} className={inputCls} />
              </div>
              <label className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <input type="checkbox" className="mt-0.5" checked={ativForm.noGoogle} disabled={!ativForm.prazo} onChange={e => setAtivForm({ ...ativForm, noGoogle: e.target.checked })} />
                <span>
                  <span className="font-bold text-slate-800">Colocar o prazo na minha Google Agenda</span>
                  <span className="block text-[11px] text-slate-500">
                    {conectada ? `Cria um evento de dia inteiro na data do prazo em ${emailAgendaConectada()}.` : 'Conecte a Google Agenda na aba Agenda para usar esta opção.'}
                  </span>
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAtividade(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={salvandoAtiv} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-60">{salvandoAtiv ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaAtividadesView;
