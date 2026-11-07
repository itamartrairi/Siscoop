/**
 * Google Agenda do usuário logado.
 *
 * O acesso à agenda é pedido só quando o usuário clica em "Conectar Google
 * Agenda" (o login do sistema não muda). Usa o Firebase Auth: quem entrou com
 * Google confirma a mesma conta num popup e autoriza o escopo da agenda.
 *
 * O token do Google vale ~1 hora; fica em memória e no sessionStorage da aba.
 * Requisitos no Google Cloud do projeto Firebase: "Google Calendar API"
 * ativada e o escopo calendar.events na tela de consentimento OAuth.
 */
import { GoogleAuthProvider, reauthenticateWithPopup, linkWithPopup } from 'firebase/auth';
import { auth } from './firebase';

export const ESCOPO_AGENDA = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const CHAVE_SESSAO = 'sicoop_google_agenda';

export interface EventoGoogle {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

export interface NovoEventoGoogle {
  titulo: string;
  descricao?: string;
  local?: string;
  /** AAAA-MM-DD */
  data: string;
  /** HH:MM; vazio = evento de dia inteiro */
  horaInicio?: string;
  horaFim?: string;
}

interface TokenAgenda { token: string; expira: number; email?: string | null }

let tokenAtual: TokenAgenda | null = null;

const lerSessao = (): TokenAgenda | null => {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
};

const tokenValido = (): TokenAgenda | null => {
  const t = tokenAtual || lerSessao();
  const emailAtual = auth.currentUser?.email || null;
  if (t && t.expira > Date.now() && (!t.email || t.email === emailAtual)) {
    tokenAtual = t;
    return t;
  }
  return null;
};

export const agendaConectada = () => !!tokenValido();

export const emailAgendaConectada = () => tokenValido()?.email || auth.currentUser?.email || null;

export const desconectarGoogleAgenda = () => {
  tokenAtual = null;
  try { sessionStorage.removeItem(CHAVE_SESSAO); } catch { /* sem sessionStorage */ }
};

const mensagemErroAuth = (e: any): string => {
  const code = e?.code || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Conexão cancelada.';
  if (code === 'auth/popup-blocked') return 'O navegador bloqueou o popup do Google. Permita popups para este site e tente de novo.';
  if (code === 'auth/user-mismatch') return 'Escolha no Google a mesma conta usada para entrar no sistema.';
  if (code === 'auth/credential-already-in-use') return 'Essa conta Google já está ligada a outro usuário do sistema.';
  return e?.message || 'Não foi possível conectar à Google Agenda.';
};

/** Abre o popup do Google e pede permissão para a agenda do usuário logado. */
export const conectarGoogleAgenda = async (): Promise<string> => {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error('Entre no sistema para conectar a Google Agenda.');
  const provider = new GoogleAuthProvider();
  provider.addScope(ESCOPO_AGENDA);
  if (usuario.email) provider.setCustomParameters({ login_hint: usuario.email });
  const temGoogle = usuario.providerData.some(p => p.providerId === 'google.com');
  try {
    const resultado = temGoogle
      ? await reauthenticateWithPopup(usuario, provider)
      : await linkWithPopup(usuario, provider);
    const credencial = GoogleAuthProvider.credentialFromResult(resultado);
    if (!credencial?.accessToken) throw new Error('O Google não devolveu a autorização da agenda.');
    tokenAtual = { token: credencial.accessToken, expira: Date.now() + 55 * 60 * 1000, email: usuario.email };
    try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(tokenAtual)); } catch { /* sem sessionStorage */ }
    return tokenAtual.token;
  } catch (e) {
    throw new Error(mensagemErroAuth(e));
  }
};

const chamar = async (url: string, init: RequestInit = {}) => {
  const t = tokenValido();
  if (!t) throw new Error('Conecte a Google Agenda para continuar.');
  const resp = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${t.token}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (resp.status === 401) {
    desconectarGoogleAgenda();
    throw new Error('A autorização da Google Agenda expirou. Clique em "Conectar Google Agenda" novamente.');
  }
  if (!resp.ok) {
    let detalhe = '';
    try { detalhe = (await resp.json())?.error?.message || ''; } catch { /* sem corpo */ }
    if (resp.status === 403 && /has not been used|is disabled|accessNotConfigured/i.test(detalhe)) {
      throw new Error('A Google Calendar API não está ativada no projeto do Google Cloud. Ative-a e tente de novo.');
    }
    throw new Error(`Google Agenda: ${detalhe || `erro ${resp.status}`}`);
  }
  return resp.status === 204 ? null : resp.json();
};

/** Eventos da agenda principal entre duas datas (AAAA-MM-DD, fim exclusivo). */
export const listarEventosGoogle = async (inicio: string, fim: string): Promise<EventoGoogle[]> => {
  const params = new URLSearchParams({
    timeMin: new Date(`${inicio}T00:00:00`).toISOString(),
    timeMax: new Date(`${fim}T00:00:00`).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  });
  const dados = await chamar(`${API}?${params.toString()}`);
  return (dados?.items || []).filter((e: EventoGoogle) => e.status !== 'cancelled');
};

const somarDia = (data: string) => {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const corpoEvento = (ev: NovoEventoGoogle) => {
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  const diaInteiro = !ev.horaInicio;
  const fimHora = ev.horaFim && ev.horaFim > (ev.horaInicio || '') ? ev.horaFim : null;
  let fim = fimHora;
  if (!diaInteiro && !fim) {
    const [h, m] = (ev.horaInicio as string).split(':').map(Number);
    const total = Math.min(h * 60 + m + 60, 23 * 60 + 59);
    fim = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  return {
    summary: ev.titulo,
    description: ev.descricao || undefined,
    location: ev.local || undefined,
    start: diaInteiro ? { date: ev.data } : { dateTime: `${ev.data}T${ev.horaInicio}:00`, timeZone: fuso },
    end: diaInteiro ? { date: somarDia(ev.data) } : { dateTime: `${ev.data}T${fim}:00`, timeZone: fuso }
  };
};

export const criarEventoGoogle = async (ev: NovoEventoGoogle): Promise<EventoGoogle> =>
  chamar(API, { method: 'POST', body: JSON.stringify(corpoEvento(ev)) });

export const atualizarEventoGoogle = async (id: string, ev: NovoEventoGoogle): Promise<EventoGoogle> =>
  chamar(`${API}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(corpoEvento(ev)) });

export const excluirEventoGoogle = async (id: string): Promise<void> => {
  await chamar(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
};
