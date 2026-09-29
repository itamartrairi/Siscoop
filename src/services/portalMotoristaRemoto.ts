/**
 * Portal do Motorista acessível do celular do motorista.
 *
 * Mesmo modelo do Portal da Escola (ver portalEscolaRemoto.ts):
 * - a cooperativa publica em /portalMotoristas as rotas de cada motorista;
 * - o motorista entra com um link enviado ao e-mail cadastrado e lê só o seu documento;
 * - cada entrega confirmada (recebedor, foto e assinatura) vai para
 *   /portalMotoristasAtualizacoes; a cooperativa aplica na programação e apaga.
 */
import { useCallback, useEffect, useState } from 'react';
import { isSignInWithEmailLink, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db as dbCooperativa } from './firebase';
import {
  authPortal,
  dbPortal,
  LIMITE_DOC,
  norm,
  semUndefined,
  traduzirErro,
  reduzirImagem,
  enviarLinkAcesso,
  concluirLinkAcesso,
} from './portalEscolaRemoto';

export const COL_PORTAL_MOTORISTA = 'portalMotoristas';
export const COL_ATUALIZACOES_MOTORISTA = 'portalMotoristasAtualizacoes';
const PORTAL = 'app-motorista';

export interface DadosPortalMotorista {
  tenantId: string;
  motoristaId: string;
  motoristaEmail: string;
  motorista: any;
  rotas: any[];
  rotaIds: string[];
  atualizadoEm: string;
}

/** Tira fotos e assinaturas das paradas (a cooperativa já as tem). */
const semImagens = (rota: any) =>
  rota?.paradasEntrega
    ? { ...rota, paradasEntrega: rota.paradasEntrega.map(({ fotoComprovanteUrl, assinaturaDataUrl, ...p }: any) => p) }
    : rota;

/* ------------------------------------------------------------------ */
/* Lado da cooperativa                                                  */
/* ------------------------------------------------------------------ */

export function montarDadosPortalMotorista(motorista: any, programacoes: any[], tenantId: string): DadosPortalMotorista {
  const nome = norm(motorista.nome);
  let rotas = nome ? programacoes.filter(p => norm(p.motoristaNome) === nome).map(semImagens) : [];
  const montar = (): DadosPortalMotorista =>
    semUndefined({
      tenantId,
      motoristaId: motorista.id,
      motoristaEmail: norm(motorista.email),
      motorista,
      rotas,
      rotaIds: rotas.map(r => r.id),
      atualizadoEm: new Date().toISOString(),
    });
  let dados = montar();
  if (JSON.stringify(dados).length > LIMITE_DOC) {
    // Primeiro saem as rotas já concluídas.
    rotas = rotas.filter(r => r.status !== 'ENTREGUE' && r.status !== 'CANCELADA');
    dados = montar();
  }
  while (JSON.stringify(dados).length > LIMITE_DOC && rotas.length > 5) {
    rotas = rotas.slice(0, Math.floor(rotas.length / 2));
    dados = montar();
  }
  return dados;
}

const assinaturasPublicadas = new Map<string, string>();

export async function publicarPortalMotoristas(tenantId: string, motoristas: any[], programacoes: any[]): Promise<void> {
  const idsAtuais = new Set<string>();
  for (const motorista of motoristas) {
    if (!motorista?.id || !motorista.email) continue;
    if (motorista.tenantId && motorista.tenantId !== tenantId) continue;
    const id = `${tenantId}__${motorista.id}`;
    idsAtuais.add(id);
    const dados = montarDadosPortalMotorista(motorista, programacoes, tenantId);
    const { atualizadoEm, ...semData } = dados;
    const assinatura = JSON.stringify(semData);
    if (assinaturasPublicadas.get(id) === assinatura) continue;
    await setDoc(doc(dbCooperativa, COL_PORTAL_MOTORISTA, id), dados);
    assinaturasPublicadas.set(id, assinatura);
  }
  // Remove o acesso de motoristas excluídos desta cooperativa.
  const existentes = await getDocs(query(collection(dbCooperativa, COL_PORTAL_MOTORISTA), where('tenantId', '==', tenantId)));
  for (const d of existentes.docs) {
    if (!idsAtuais.has(d.id)) {
      await deleteDoc(d.ref);
      assinaturasPublicadas.delete(d.id);
    }
  }
}

/** Escuta as entregas confirmadas pelos motoristas, aplica e apaga do Firestore. */
export function ouvirAtualizacoesMotoristas(
  tenantId: string,
  aplicar: (programacaoId: string, alteracoes: { paradasEntrega?: any[]; status?: string }) => void
): () => void {
  const q = query(collection(dbCooperativa, COL_ATUALIZACOES_MOTORISTA), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    snap => {
      snap.docChanges().forEach(ch => {
        if (ch.type !== 'added') return;
        const d: any = ch.doc.data();
        if (d?.programacaoId && d.alteracoes) aplicar(d.programacaoId, d.alteracoes);
        deleteDoc(ch.doc.ref).catch(err => console.warn('Portal do Motorista: não foi possível limpar a atualização', err));
      });
    },
    err => console.warn('Portal do Motorista: falha ao receber atualizações', err)
  );
}

/**
 * Junta as paradas recebidas do motorista com as que a cooperativa já tem.
 * O motorista não recebe as fotos antigas, então o que já existe é mantido.
 */
export function mesclarParadas(atuais: any[] | undefined, recebidas: any[] | undefined): any[] | undefined {
  if (!Array.isArray(recebidas)) return atuais;
  const base = Array.isArray(atuais) ? atuais : [];
  return recebidas.map((p, i) => ({ ...(base[i] || {}), ...p }));
}

/* ------------------------------------------------------------------ */
/* Lado do motorista                                                    */
/* ------------------------------------------------------------------ */

async function carregarDadosMotorista(): Promise<DadosPortalMotorista | null> {
  const email = norm(authPortal.currentUser?.email || '');
  if (!email) return null;
  const snap = await getDocs(query(collection(dbPortal, COL_PORTAL_MOTORISTA), where('motoristaEmail', '==', email)));
  return snap.empty ? null : (snap.docs[0].data() as DadosPortalMotorista);
}

export type StatusMotoristaRemoto =
  | 'verificando'
  | 'deslogado'
  | 'link-enviado'
  | 'pedir-email'
  | 'carregando'
  | 'pronto'
  | 'sem-cadastro';

export function usePortalMotoristaRemoto() {
  const [status, setStatus] = useState<StatusMotoristaRemoto>('verificando');
  const [dados, setDados] = useState<DadosPortalMotorista | null>(null);
  const [emailSessao, setEmailSessao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setStatus('carregando');
    try {
      const d = await carregarDadosMotorista();
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
      concluirLinkAcesso(undefined, PORTAL).catch(e => {
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
      await enviarLinkAcesso(email, PORTAL);
      setStatus('link-enviado');
    } catch (e) {
      setErro(traduzirErro(e));
    }
  }, []);

  const confirmarEmailDoLink = useCallback(async (email: string) => {
    setErro(null);
    try {
      await concluirLinkAcesso(email, PORTAL);
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

  /** Envia a entrega confirmada para a cooperativa e já mostra o resultado na tela. */
  const enviarAtualizacao = useCallback(
    async (programacaoId: string, alteracoes: { paradasEntrega?: any[]; status?: string }) => {
      if (!dados) throw new Error('Sessão do motorista não encontrada. Entre novamente.');
      const paradas = alteracoes.paradasEntrega
        ? await Promise.all(
            alteracoes.paradasEntrega.map(async (p: any) => ({
              ...p,
              fotoComprovanteUrl: await reduzirImagem(p?.fotoComprovanteUrl, 1280, 400_000),
              assinaturaDataUrl: await reduzirImagem(p?.assinaturaDataUrl, 900, 150_000),
            }))
          )
        : undefined;
      const montar = (ps: any[] | undefined) =>
        semUndefined({
          tenantId: dados.tenantId,
          motoristaId: dados.motoristaId,
          motoristaEmail: norm(authPortal.currentUser?.email || ''),
          programacaoId,
          alteracoes: { ...alteracoes, paradasEntrega: ps },
          criadoEm: new Date().toISOString(),
        });
      let registro = montar(paradas);
      if (JSON.stringify(registro).length > LIMITE_DOC && paradas) {
        // Último recurso: manda sem as fotos, mantendo as assinaturas.
        registro = montar(paradas.map(({ fotoComprovanteUrl, ...p }: any) => p));
      }
      await addDoc(collection(dbPortal, COL_ATUALIZACOES_MOTORISTA), registro);
      // Atualiza a tela do motorista sem esperar a cooperativa republicar.
      setDados(atual =>
        atual
          ? {
              ...atual,
              rotas: atual.rotas.map(r =>
                r.id === programacaoId
                  ? semImagens({ ...r, ...alteracoes, paradasEntrega: mesclarParadas(r.paradasEntrega, alteracoes.paradasEntrega) })
                  : r
              ),
            }
          : atual
      );
    },
    [dados]
  );

  return { status, dados, emailSessao, erro, enviarLink, confirmarEmailDoLink, sair, enviarAtualizacao, recarregar };
}
