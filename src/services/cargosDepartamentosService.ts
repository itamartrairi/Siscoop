import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Cadastros de Cargos e Departamentos da cooperativa.
 *
 * Ficam no Firestore nas coleções `departamentos` e `cargos`, sempre com o
 * campo `tenantId` (as regras em firestore.rules isolam os documentos por
 * cooperativa, igual a `cooperados`). Sem sessão no Firebase Auth (modo
 * demonstração / contingência) os mesmos dados ficam só no navegador, em
 * localStorage, para a tela continuar funcionando.
 */

export type ColecaoCadastroRH = 'departamentos' | 'cargos';

export interface Departamento {
  id: string;
  tenantId: string;
  nome: string;
  sigla?: string;
  responsavel?: string;
  descricao?: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Cargo {
  id: string;
  tenantId: string;
  nome: string;
  /** Departamento ao qual o cargo pertence (opcional: vazio = qualquer setor). */
  departamentoId?: string;
  cbo?: string;
  descricao?: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}

type DocumentoCadastro = Departamento | Cargo;

export const gerarIdCadastro = (prefixo: 'dep' | 'cargo') =>
  `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizarNome = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

export const ordenarPorNome = <T extends { nome: string }>(lista: T[]): T[] =>
  [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

/** O Firestore recusa campos `undefined`: remove-os antes de gravar. */
const semIndefinidos = <T extends object>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

export function ouvirCadastrosRH<T extends DocumentoCadastro>(
  colecao: ColecaoCadastroRH,
  tenantId: string,
  aoReceber: (lista: T[]) => void,
  aoFalhar: (erro: Error & { code?: string }) => void
): Unsubscribe {
  const alvo = query(collection(db, colecao), where('tenantId', '==', tenantId));
  return onSnapshot(
    alvo,
    snap => {
      const lista = snap.docs.map(d => ({ ...(d.data() as T), id: d.id }));
      aoReceber(ordenarPorNome(lista));
    },
    erro => aoFalhar(erro as Error & { code?: string })
  );
}

export async function gravarCadastroRHNoFirestore(colecao: ColecaoCadastroRH, item: DocumentoCadastro): Promise<void> {
  const agora = new Date().toISOString();
  await setDoc(
    doc(db, colecao, item.id),
    semIndefinidos({ ...item, criadoEm: item.criadoEm || agora, atualizadoEm: agora }),
    { merge: true }
  );
}

export async function excluirCadastroRHNoFirestore(colecao: ColecaoCadastroRH, id: string): Promise<void> {
  await deleteDoc(doc(db, colecao, id));
}

// ---------------------------------------------------------------------------
// Cache / contingência local
// ---------------------------------------------------------------------------

const chaveLocal = (colecao: ColecaoCadastroRH, tenantId: string) => `siscoop_${colecao}_${tenantId || 'sem-tenant'}`;

export function lerCadastrosRHLocais<T extends DocumentoCadastro>(colecao: ColecaoCadastroRH, tenantId: string): T[] {
  try {
    const bruto = localStorage.getItem(chaveLocal(colecao, tenantId));
    const lista = bruto ? (JSON.parse(bruto) as T[]) : [];
    return Array.isArray(lista) ? ordenarPorNome(lista) : [];
  } catch {
    return [];
  }
}

export function gravarCadastrosRHLocais<T extends DocumentoCadastro>(colecao: ColecaoCadastroRH, tenantId: string, lista: T[]): void {
  try {
    localStorage.setItem(chaveLocal(colecao, tenantId), JSON.stringify(lista));
  } catch {
    // localStorage cheio ou bloqueado: o Firestore continua sendo a fonte principal.
  }
}

export function traduzirErroFirestore(erro: unknown): string {
  const code = (erro as { code?: string })?.code || '';
  switch (code) {
    case 'permission-denied':
      return 'O Firestore recusou a operação (permission-denied). Publique o firestore.rules atualizado e confira se o seu usuário está vinculado à cooperativa.';
    case 'unavailable':
      return 'Sem conexão com o Firestore no momento. Verifique a internet e tente de novo.';
    case 'failed-precondition':
      return 'O Firestore pediu uma configuração adicional (failed-precondition). Veja o console do navegador para detalhes.';
    default:
      return (erro as Error)?.message || 'Falha ao acessar o Firestore.';
  }
}
