/**
 * Portal da Escola acessível de qualquer computador.
 *
 * - A cooperativa (usuário logado) publica em /portalEscolas um resumo por
 *   escola: dados da escola, pedidos, programações, chamadas e entregas.
 * - A escola entra com um link enviado ao e-mail cadastrado (Firebase Auth,
 *   login por link, sem senha) e lê apenas o documento com o seu e-mail.
 * - Os comprovantes que a escola registra vão para /portalEscolasComprovantes;
 *   a cooperativa importa para as entregas e apaga o documento.
 *
 * A sessão da escola usa um app Firebase separado ("portal-escola"), para não
 * se misturar com a sessão da cooperativa no mesmo navegador.
 */
import { useCallback, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db as dbCooperativa } from './firebase';

export const COL_PORTAL = 'portalEscolas';
export const COL_COMPROVANTES = 'portalEscolasComprovantes';

const NOME_APP_PORTAL = 'portal-escola';
const cfg: any = firebaseConfig;
const appPortal = getApps().find(a => a.name === NOME_APP_PORTAL) || initializeApp(cfg, NOME_APP_PORTAL);
export const authPortal = getAuth(appPortal);
export const dbPortal: Firestore = cfg.firestoreDatabaseId
  ? getFirestore(appPortal, cfg.firestoreDatabaseId)
  : getFirestore(appPortal);

const CHAVE_EMAIL_LINK = 'siscoop:portal-escola:email-link';
export const LIMITE_DOC = 900_000; // o Firestore aceita até ~1 MB por documento

export const norm = (s?: string) => (s || '').toLowerCase().trim();
export const semUndefined = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

export interface DadosPortalEscola {
  tenantId: string;
  escolaId: string;
  escolaEmail: string;
  escola: any;
  pedidos: any[];
  programacoes: any[];
  chamadas: any[];
  entregas: any[];
  atualizadoEm: string;
}

interface FontesPortal {
  pedidos: any[];
  programacoes: any[];
  chamadas: any[];
  entregas: any[];
}

/* ------------------------------------------------------------------ */
/* Lado da cooperativa                                                  */
/* ------------------------------------------------------------------ */

/** Monta o resumo de uma escola com os mesmos filtros usados no portal. */
export function montarDadosPortalEscola(escola: any, fontes: FontesPortal, tenantId: string): DadosPortalEscola {
  const nome = norm(escola.nomeEscola);
  const pedidos = fontes.pedidos.filter(
    p =>
      p.escolaId === escola.id ||
      (p.escolasIds || []).includes(escola.id) ||
      (p.itens || []).some((it: any) => it.escolaId === escola.id)
  );
  const programacoes = fontes.programacoes.filter(
    p =>
      p.escolaId === escola.id ||
      (p.escolasIds || []).includes(escola.id) ||
      (p.paradasEntrega || []).some((pa: any) => pa.escolaId === escola.id || norm(pa.escolaNome) === nome) ||
      norm(p.escolaNome) === nome ||
      norm(p.escolaOrgaoDestino) === nome
  );
  const idsChamadas = new Set(programacoes.map(p => p.chamadaPublicaId).filter(Boolean));
  const chamadas = fontes.chamadas.filter(c => idsChamadas.has(c.id));
  // Fotos e assinaturas ficam de fora para o documento não passar de 1 MB.
  let entregas = fontes.entregas
    .filter(e => (escola.email && norm(e.escolaEmail) === norm(escola.email)) || norm(e.escolaNome) === nome || e.escolaId === escola.id)
    .map(({ assinaturaUrl, fotoComprovanteUrl, ...resto }: any) => resto);

  const montar = (): DadosPortalEscola =>
    semUndefined({
      tenantId,
      escolaId: escola.id,
      escolaEmail: norm(escola.email),
      escola,
      pedidos,
      programacoes,
      chamadas,
      entregas,
      atualizadoEm: new Date().toISOString(),
    });

  let dados = montar();
  while (JSON.stringify(dados).length > LIMITE_DOC && entregas.length > 10) {
    entregas = entregas.slice(0, Math.floor(entregas.length / 2));
    dados = montar();
  }
  return dados;
}

const assinaturasPublicadas = new Map<string, string>();

/** Publica (ou atualiza) um documento por escola com e-mail. Só grava o que mudou. */
export async function publicarPortalEscolas(tenantId: string, escolas: any[], fontes: FontesPortal): Promise<void> {
  const idsAtuais = new Set<string>();
  for (const escola of escolas) {
    if (!escola?.id || !escola.email) continue;
    if (escola.tenantId && escola.tenantId !== tenantId) continue;
    const id = `${tenantId}__${escola.id}`;
    idsAtuais.add(id);
    const dados = montarDadosPortalEscola(escola, fontes, tenantId);
    const { atualizadoEm, ...semData } = dados;
    const assinatura = JSON.stringify(semData);
    if (assinaturasPublicadas.get(id) === assinatura) continue;
    await setDoc(doc(dbCooperativa, COL_PORTAL, id), dados);
    assinaturasPublicadas.set(id, assinatura);
  }
  // Remove o acesso de escolas excluídas desta cooperativa.
  const existentes = await getDocs(query(collection(dbCooperativa, COL_PORTAL), where('tenantId', '==', tenantId)));
  for (const d of existentes.docs) {
    if (!idsAtuais.has(d.id)) {
      await deleteDoc(d.ref);
      assinaturasPublicadas.delete(d.id);
    }
  }
}

/** Escuta os comprovantes enviados pelas escolas, entrega ao sistema e apaga do Firestore. */
export function ouvirComprovantesPortal(tenantId: string, aoReceber: (docId: string, entrega: any) => void): () => void {
  const q = query(collection(dbCooperativa, COL_COMPROVANTES), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    snap => {
      snap.docChanges().forEach(ch => {
        if (ch.type !== 'added') return;
        const d: any = ch.doc.data();
        if (d?.entrega) aoReceber(ch.doc.id, d.entrega);
        deleteDoc(ch.doc.ref).catch(err => console.warn('Portal da Escola: não foi possível limpar o comprovante', err));
      });
    },
    err => console.warn('Portal da Escola: falha ao receber comprovantes', err)
  );
}

/* ------------------------------------------------------------------ */
/* Lado da escola                                                       */
/* ------------------------------------------------------------------ */

export function traduzirErro(e: any): string {
  const code = e?.code || '';
  if (code === 'auth/operation-not-allowed')
    return 'O acesso por link de e-mail ainda não foi ativado pela cooperativa (Firebase > Authentication > E-mail/link).';
  if (code === 'auth/unauthorized-continue-uri' || code === 'auth/invalid-continue-uri')
    return 'Este endereço do sistema não está autorizado no Firebase (Authentication > Settings > Authorized domains).';
  if (code === 'auth/invalid-email') return 'E-mail inválido.';
  if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code')
    return 'Este link de acesso expirou ou já foi usado. Peça um novo link.';
  if (code === 'auth/too-many-requests') return 'Muitas tentativas seguidas. Aguarde alguns minutos.';
  if (code === 'permission-denied') return 'Sem permissão para ler os dados. Peça à cooperativa para publicar as regras do Firestore.';
  return e?.message || 'Não foi possível concluir a operação.';
}

export async function enviarLinkAcesso(email: string, portal = 'portal-escola') {
  const url = `${window.location.origin}${window.location.pathname}?portal=${portal}`;
  await sendSignInLinkToEmail(authPortal, email.trim(), { url, handleCodeInApp: true });
  try {
    localStorage.setItem(CHAVE_EMAIL_LINK, email.trim());
  } catch {
    // sem localStorage: a escola confirma o e-mail ao abrir o link
  }
}

export async function concluirLinkAcesso(emailInformado?: string, portal = 'portal-escola'): Promise<void> {
  let email = (emailInformado || '').trim();
  if (!email) {
    try {
      email = localStorage.getItem(CHAVE_EMAIL_LINK) || '';
    } catch {
      email = '';
    }
  }
  if (!email) throw Object.assign(new Error('PEDIR_EMAIL'), { code: 'PEDIR_EMAIL' });
  await signInWithEmailLink(authPortal, email, window.location.href);
  try {
    localStorage.removeItem(CHAVE_EMAIL_LINK);
  } catch {
    // ignora
  }
  window.history.replaceState(null, '', `${window.location.pathname}?portal=${portal}`);
}

async function carregarDadosEscola(): Promise<DadosPortalEscola | null> {
  const email = norm(authPortal.currentUser?.email || '');
  if (!email) return null;
  const snap = await getDocs(query(collection(dbPortal, COL_PORTAL), where('escolaEmail', '==', email)));
  return snap.empty ? null : (snap.docs[0].data() as DadosPortalEscola);
}

export type StatusPortalRemoto =
  | 'verificando'
  | 'deslogado'
  | 'link-enviado'
  | 'pedir-email'
  | 'carregando'
  | 'pronto'
  | 'sem-cadastro';

/**
 * Reduz uma imagem em data URL (foto ou assinatura) para caber no Firestore.
 * Redimensiona e converte para JPEG, baixando a qualidade até ficar abaixo do alvo.
 */
export async function reduzirImagem(dataUrl: string | undefined, maxLado: number, alvo: number): Promise<string | undefined> {
  if (!dataUrl || !dataUrl.startsWith('data:image') || dataUrl.length <= alvo) return dataUrl;
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = falha;
      i.src = dataUrl;
    });
    let lado = maxLado;
    let qualidade = 0.8;
    let saida = dataUrl;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const escala = Math.min(1, lado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * escala));
      canvas.height = Math.max(1, Math.round(img.height * escala));
      const ctx = canvas.getContext('2d');
      if (!ctx) return dataUrl;
      ctx.fillStyle = '#ffffff'; // fundo branco para assinaturas com transparência
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saida = canvas.toDataURL('image/jpeg', qualidade);
      if (saida.length <= alvo) break;
      lado = Math.round(lado * 0.8);
      qualidade = Math.max(0.4, qualidade - 0.1);
    }
    return saida;
  } catch {
    return dataUrl;
  }
}

/** Estado da sessão da escola no portal (login por link + dados do Firestore). */
export function usePortalEscolaRemoto() {
  const [status, setStatus] = useState<StatusPortalRemoto>('verificando');
  const [dados, setDados] = useState<DadosPortalEscola | null>(null);
  const [emailSessao, setEmailSessao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setStatus('carregando');
    try {
      const d = await carregarDadosEscola();
      setDados(d);
      setStatus(d ? 'pronto' : 'sem-cadastro');
    } catch (e) {
      setErro(traduzirErro(e));
      setStatus('deslogado');
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    if (isSignInWithEmailLink(authPortal, window.location.href)) {
      concluirLinkAcesso().catch(e => {
        if (!ativo) return;
        if (e?.code === 'PEDIR_EMAIL') setStatus('pedir-email');
        else {
          setErro(traduzirErro(e));
          setStatus('deslogado');
        }
      });
    }
    const unsub = onAuthStateChanged(authPortal, (user: FirebaseUser | null) => {
      if (!ativo) return;
      if (user?.email) {
        setEmailSessao(user.email);
        recarregar();
      } else {
        setStatus(s => (s === 'pedir-email' || s === 'link-enviado' ? s : 'deslogado'));
      }
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, [recarregar]);

  const enviarLink = useCallback(async (email: string) => {
    setErro(null);
    try {
      await enviarLinkAcesso(email);
      setStatus('link-enviado');
    } catch (e) {
      setErro(traduzirErro(e));
    }
  }, []);

  const confirmarEmailDoLink = useCallback(async (email: string) => {
    setErro(null);
    try {
      await concluirLinkAcesso(email);
    } catch (e) {
      setErro(traduzirErro(e));
    }
  }, []);

  const sair = useCallback(async () => {
    try {
      await signOut(authPortal);
    } catch {
      // ignora
    }
    setDados(null);
    setEmailSessao('');
    setStatus('deslogado');
  }, []);

  /** Envia o comprovante para a cooperativa. Retorna false se a foto precisou ficar de fora. */
  const enviarComprovante = useCallback(
    async (entrega: any): Promise<boolean> => {
      if (!dados) throw new Error('Sessão da escola não encontrada. Entre novamente.');
      // Foto e assinatura são reduzidas para o comprovante caber no Firestore
      // e chegar completo à cooperativa.
      entrega = {
        ...entrega,
        fotoComprovanteUrl: await reduzirImagem(entrega?.fotoComprovanteUrl, 1280, 450_000),
        assinaturaUrl: await reduzirImagem(entrega?.assinaturaUrl, 900, 150_000),
      };
      const email = norm(authPortal.currentUser?.email || '');
      const montar = (e: any) =>
        semUndefined({
          tenantId: dados.tenantId,
          escolaId: dados.escolaId,
          escolaEmail: email,
          entrega: e,
          criadoEm: new Date().toISOString(),
        });
      let registro = montar(entrega);
      let fotoIncluida = true;
      if (JSON.stringify(registro).length > LIMITE_DOC) {
        const { fotoComprovanteUrl, ...semFoto } = entrega || {};
        registro = montar({
          ...semFoto,
          observacaoRestricao: [semFoto.observacaoRestricao, '(Foto não enviada: arquivo grande demais.)'].filter(Boolean).join(' '),
        });
        fotoIncluida = false;
      }
      await addDoc(collection(dbPortal, COL_COMPROVANTES), registro);
      return fotoIncluida;
    },
    [dados]
  );

  return { status, dados, emailSessao, erro, setErro, enviarLink, confirmarEmailDoLink, sair, enviarComprovante, recarregar };
}
