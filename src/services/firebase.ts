import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  signInWithPopup,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  type Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Cache persistente (IndexedDB): ao reabrir o app — o Android encerra páginas
// em segundo plano com frequência — o Firestore mostra os dados locais na hora
// e baixa só o que mudou, em vez de todos os registros da cooperativa. Também
// mantém na fila as gravações feitas sem rede. Se o IndexedDB não estiver
// disponível (ex.: aba anônima), o SDK volta sozinho para o cache em memória.
const firestoreSettings = {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
};

// Initialize Firestore with specific database ID if present
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, firestoreSettings, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, firestoreSettings);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Sempre deixa escolher a conta Google (útil em computadores compartilhados).
googleProvider.setCustomParameters({ prompt: 'select_account' });
export {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore conectado com sucesso.');
    return true;
  } catch (error) {
    // permission-denied = o servidor respondeu (as regras exigem login para
    // ler test/connection), então a conexão com o Firestore está OK.
    if ((error as { code?: string })?.code === 'permission-denied') {
      return true;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Verifique a conexão do Firebase Firestore.');
    }
    return false;
  }
}

// Initial boot check
if (typeof window !== 'undefined') {
  testFirestoreConnection().catch(console.error);
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  signInWithPopup
};
export type { FirebaseUser };

/**
 * Mensagens em português para os códigos de erro do Firebase Authentication.
 */
export function traduzirErroAuth(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/missing-password':
      return 'Informe a senha.';
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já tem uma conta no Firebase Authentication.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada no Firebase Authentication.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    case 'auth/operation-not-allowed':
      return 'O login por e-mail e senha está desativado no Firebase. Ative em Authentication → Sign-in method → E-mail/senha.';
    case 'auth/network-request-failed':
      return 'Sem conexão com o Firebase. Verifique a internet.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'A janela do Google foi fechada antes de concluir o login.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela do Google. Libere pop-ups para este site.';
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado no Firebase (Authentication → Settings → Authorized domains).';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta com este e-mail usando outro método de login. Entre com e-mail e senha.';
    default:
      return (err as Error)?.message || 'Falha na autenticação.';
  }
}

/**
 * Cria a conta de login (e-mail/senha) de OUTRO usuário no Firebase
 * Authentication sem derrubar a sessão de quem está cadastrando.
 *
 * createUserWithEmailAndPassword sempre deixa logada a conta recém-criada
 * na instância de Auth usada. Por isso o cadastro usa uma instância
 * secundária do app Firebase, cuja sessão é encerrada logo em seguida — o
 * administrador continua logado na instância principal.
 */
export async function criarContaFirebaseAuth(
  email: string,
  senha: string,
  nome?: string
): Promise<{ ok: boolean; uid?: string; code?: string; message?: string }> {
  const NOME_APP = 'siscoop-cadastro-usuarios';
  const appSecundario = getApps().find(a => a.name === NOME_APP) || initializeApp(firebaseConfig, NOME_APP);
  const authSecundario = getAuth(appSecundario);
  try {
    const cred = await createUserWithEmailAndPassword(authSecundario, email.trim(), senha);
    if (nome) {
      await updateProfile(cred.user, { displayName: nome }).catch(() => undefined);
    }
    return { ok: true, uid: cred.user.uid };
  } catch (err) {
    return { ok: false, code: (err as { code?: string })?.code || 'desconhecido', message: traduzirErroAuth(err) };
  } finally {
    await signOut(authSecundario).catch(() => undefined);
  }
}
