import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  setDoc,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Cadastros de Cargos e Departamentos — COMUNS a todas as cooperativas.
 *
 * Ficam no Firestore nas coleções `departamentos` e `cargos`. Qualquer
 * cooperativa que usa o sistema lê e edita a mesma lista; o campo
 * `tenantId` só registra qual cooperativa cadastrou o item.
 *
 * Integridade: um cargo/departamento em uso não pode ser excluído. Como uma
 * cooperativa não enxerga os usuários e colaboradores das outras, cada uma
 * publica o próprio uso em `usoCadastrosRH/{colecao}__{itemId}` (mapa
 * `tenants: { [tenantId]: quantidade }`). As regras do Firestore negam a
 * exclusão enquanto houver uso registrado.
 *
 * Sem sessão no Firebase Auth (modo demonstração / contingência) os dados
 * ficam só no navegador, em localStorage, para a tela continuar funcionando.
 */

export type ColecaoCadastroRH = 'departamentos' | 'cargos';

export interface Departamento {
  id: string;
  /** Cooperativa que cadastrou o item (a lista é comum a todas). */
  tenantId?: string;
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
  /** Cooperativa que cadastrou o item (a lista é comum a todas). */
  tenantId?: string;
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

/** Uso de cada item por cooperativa: chave `${colecao}__${itemId}`. */
export type MapaUsoCadastrosRH = Record<string, Record<string, number>>;

export const COLECAO_USO = 'usoCadastrosRH';
export const chaveUso = (colecao: ColecaoCadastroRH, itemId: string) => `${colecao}__${itemId}`;

export const gerarIdCadastro = (prefixo: 'dep' | 'cargo') =>
  `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizarNome = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

/** Ouve a lista inteira (comum a todas as cooperativas). */
export function ouvirCadastrosRH<T extends DocumentoCadastro>(
  colecao: ColecaoCadastroRH,
  aoReceber: (lista: T[]) => void,
  aoFalhar: (erro: Error & { code?: string }) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, colecao),
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

/** Ouve o uso registrado por todas as cooperativas. */
export function ouvirUsoCadastrosRH(
  aoReceber: (mapa: MapaUsoCadastrosRH) => void,
  aoFalhar: (erro: Error & { code?: string }) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLECAO_USO),
    snap => {
      const mapa: MapaUsoCadastrosRH = {};
      snap.docs.forEach(d => {
        const tenants = (d.data().tenants || {}) as Record<string, number>;
        mapa[d.id] = tenants;
      });
      aoReceber(mapa);
    },
    erro => aoFalhar(erro as Error & { code?: string })
  );
}

/** Grava quantos usuários/colaboradores desta cooperativa usam o item (0 = remove o registro de uso). */
export async function registrarUsoCadastroRH(
  colecao: ColecaoCadastroRH,
  itemId: string,
  tenantId: string,
  quantidade: number
): Promise<void> {
  await setDoc(
    doc(db, COLECAO_USO, chaveUso(colecao, itemId)),
    { colecao, itemId, tenants: { [tenantId]: quantidade > 0 ? quantidade : deleteField() } },
    { merge: true }
  );
}

// ---------------------------------------------------------------------------
// Cache / contingência local
// ---------------------------------------------------------------------------

const chaveLocal = (colecao: ColecaoCadastroRH) => `siscoop_${colecao}_comum`;

export function lerCadastrosRHLocais<T extends DocumentoCadastro>(colecao: ColecaoCadastroRH): T[] {
  try {
    const bruto = localStorage.getItem(chaveLocal(colecao));
    const lista = bruto ? (JSON.parse(bruto) as T[]) : [];
    return Array.isArray(lista) ? ordenarPorNome(lista) : [];
  } catch {
    return [];
  }
}

export function gravarCadastrosRHLocais<T extends DocumentoCadastro>(colecao: ColecaoCadastroRH, lista: T[]): void {
  try {
    localStorage.setItem(chaveLocal(colecao), JSON.stringify(lista));
  } catch {
    // localStorage cheio ou bloqueado: o Firestore continua sendo a fonte principal.
  }
}

export function traduzirErroFirestore(erro: unknown): string {
  const code = (erro as { code?: string })?.code || '';
  switch (code) {
    case 'permission-denied':
      return 'O Firestore recusou a operação (permission-denied). Publique o firestore.rules atualizado e confira se o seu usuário está vinculado à cooperativa. Itens em uso não podem ser excluídos.';
    case 'unavailable':
      return 'Sem conexão com o Firestore no momento. Verifique a internet e tente de novo.';
    case 'failed-precondition':
      return 'O Firestore pediu uma configuração adicional (failed-precondition). Veja o console do navegador para detalhes.';
    default:
      return (erro as Error)?.message || 'Falha ao acessar o Firestore.';
  }
}
