import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Cooperado, ContaPagarReceber, TransacaoCapital, Assembleia, Tenant } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export interface FirestoreStatusResult {
  connected: boolean;
  message: string;
  projectId: string;
  databaseId: string;
  /** Há sessão no Firebase Auth (sem ela as regras recusam leitura e gravação). */
  authenticated?: boolean;
  /** Resultado do teste real de gravação + leitura em diagnostico/{uid}. */
  writeOk?: boolean;
  collectionsStatus: {
    name: string;
    count: number;
  }[];
}

/**
 * Tests Firebase Firestore connectivity and counts documents in primary collections
 */
export async function checkFirestoreDatabaseConnection(): Promise<FirestoreStatusResult> {
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const usuario = auth.currentUser;
  const base = { projectId, databaseId, authenticated: !!usuario };

  // 1) O servidor responde? Lê um documento fixo direto do servidor (sem
  // cache local). "permission-denied" também prova que o banco respondeu.
  // Antes, qualquer falha era engolida e o teste sempre dizia "conectado".
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (e: any) {
    if (e?.code !== 'permission-denied') {
      console.error('Erro na conexão com Firestore:', e);
      return {
        ...base,
        connected: false,
        message: `Sem conexão com o Firebase Firestore: ${e?.message || 'falha de rede'}`,
        collectionsStatus: []
      };
    }
  }

  if (!usuario) {
    return {
      ...base,
      connected: true,
      writeOk: false,
      message: `O Firestore (${databaseId}) respondeu, mas não há sessão no Firebase Auth: entre com Google ou com e-mail/senha para ler e gravar os dados da cooperativa.`,
      collectionsStatus: []
    };
  }

  // 2) Gravação real: escreve e lê de volta diagnostico/{uid}.
  let writeOk = false;
  let erroGravacao = '';
  try {
    const ref = doc(db, 'diagnostico', usuario.uid);
    const marca = new Date().toISOString();
    await setDoc(ref, { ultimoTeste: marca, email: usuario.email || null });
    const lido = await getDocFromServer(ref);
    writeOk = lido.data()?.ultimoTeste === marca;
    if (!writeOk) erroGravacao = 'o documento gravado não voltou igual na leitura';
  } catch (e: any) {
    erroGravacao = e?.code === 'permission-denied'
      ? 'as regras do Firestore recusaram a gravação de teste (publique o firestore.rules deste repositório: firebase deploy --only firestore:rules)'
      : (e?.message || 'falha desconhecida');
  }

  // 3) Contagem por coleção, só da cooperativa do usuário — as regras negam
  // consultas sem o filtro de tenantId (antes todas voltavam 0).
  let tenantId: string | undefined;
  try {
    const vinculo = await getDoc(doc(db, 'users', usuario.uid));
    tenantId = vinculo.data()?.tenantId || undefined;
  } catch {
    tenantId = undefined;
  }

  const collectionsToCheck = ['cooperados', 'transacoesCapital', 'contasFinanceiras', 'assembleias', 'backups', 'departamentos', 'cargos'];
  const collectionsStatus: { name: string; count: number }[] = [];
  if (tenantId) {
    for (const colName of collectionsToCheck) {
      try {
        const snap = await getDocs(query(collection(db, colName), where('tenantId', '==', tenantId)));
        collectionsStatus.push({ name: colName, count: snap.size });
      } catch {
        collectionsStatus.push({ name: colName, count: 0 });
      }
    }
  }

  const partes = [
    `Conectado ao Google Cloud Firestore (Database: ${databaseId}).`,
    writeOk ? 'Teste de gravação OK.' : `Falha no teste de gravação: ${erroGravacao}.`,
    tenantId ? '' : 'Este usuário ainda não está vinculado a uma cooperativa no Firestore (users/{uid}).'
  ].filter(Boolean);

  return {
    ...base,
    connected: true,
    writeOk,
    message: partes.join(' '),
    collectionsStatus
  };
}

/**
 * Mantém o documento users/{uid} sincronizado com o tenantId do usuário logado.
 * Esse documento é a fonte de verdade usada pelas Firestore Security Rules
 * para decidir a quais cooperativas (tenants) cada usuário autenticado tem
 * acesso — sem ele, as regras não têm como saber a qual cooperativa um
 * usuário pertence, e isolar os dados por tenant no banco não é possível.
 */
export async function saveUserTenantMappingToFirestore(uid: string, tenantId: string, email?: string): Promise<void> {
  // No modo demo local não existe uma sessão Firebase para este UID.
  // Só sincronize quando a sessão autenticada corresponder ao usuário.
  if (!uid || !tenantId || auth.currentUser?.uid !== uid) return;
  try {
    // Registra o dono da cooperativa uma única vez. As regras do Firestore só
    // deixam alguém se vincular a uma cooperativa se for o dono registrado.
    const donoRef = doc(db, 'tenantOwners', tenantId);
    const dono = await getDoc(donoRef);
    // Quem entra como membro da equipe (tenantMembers) nunca vira dono.
    const membro = email ? await getTenantMemberFromFirestore(email) : null;
    if (!dono.exists() && membro?.tenantId !== tenantId) {
      await setDoc(donoRef, { ownerUid: uid, email: email || null, criadoEm: new Date().toISOString() });
    }

    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      tenantId,
      email: email || null,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn('Erro ao sincronizar users/{uid} -> tenantId no Firestore:', error);
  }
}

/**
 * Migra documentos legados (gravados antes do isolamento por tenant) que
 * estão SEM o campo tenantId, atribuindo-os a uma cooperativa específica.
 * Só funciona se as Firestore Security Rules permitirem (na prática, exige
 * que o usuário logado seja admin conforme a função isAdmin() das regras —
 * documentos sem tenantId não passam mais pela checagem normal de tenant).
 */
export interface MigrationResult {
  collection: string;
  found: number;
  migrated: number;
  error?: string;
}

export async function migrateLegacyDocsToTenant(tenantId: string): Promise<{
  success: boolean;
  message: string;
  results: MigrationResult[];
}> {
  const collections = ['cooperados', 'transacoesCapital', 'contasFinanceiras', 'assembleias', 'backups'];
  const results: MigrationResult[] = [];

  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      const legacyDocs = snap.docs.filter(d => {
        const data = d.data();
        return !data.tenantId;
      });

      if (legacyDocs.length === 0) {
        results.push({ collection: colName, found: 0, migrated: 0 });
        continue;
      }

      // Firestore limita batches a 500 operações
      let migrated = 0;
      for (let i = 0; i < legacyDocs.length; i += 400) {
        const chunk = legacyDocs.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(docSnap => {
          batch.update(docSnap.ref, { tenantId, migratedLegacyAt: new Date().toISOString() });
        });
        await batch.commit();
        migrated += chunk.length;
      }

      results.push({ collection: colName, found: legacyDocs.length, migrated });
    } catch (error: any) {
      results.push({
        collection: colName,
        found: 0,
        migrated: 0,
        error: error?.code === 'permission-denied'
          ? 'Acesso negado pelas regras do Firestore (é preciso estar logado como admin: e-mail cadastrado em firestore.rules ou em admins/{uid}).'
          : (error?.message || 'Erro desconhecido')
      });
    }
  }

  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
  const anyError = results.some(r => r.error);

  return {
    success: !anyError || totalMigrated > 0,
    message: anyError
      ? `Migração concluída com pendências. ${totalMigrated} documento(s) migrado(s) para a cooperativa. Veja detalhes por coleção.`
      : `Migração concluída: ${totalMigrated} documento(s) legado(s) (sem cooperativa) agora atribuído(s) a esta cooperativa.`,
    results
  };
}

/**
 * Synchronizes list of Cooperados to Firestore
 */
export async function syncCooperadosToFirestore(cooperados: Cooperado[]): Promise<number> {
  if (!cooperados || cooperados.length === 0) return 0;

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const c of cooperados) {
      const docRef = doc(db, 'cooperados', c.id);
      batch.set(docRef, {
        ...c,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;
    }

    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'cooperados');
    return 0;
  }
}

/**
 * Loads Cooperados from Firestore
 * @param tenantId Quando informado, restringe a consulta à cooperativa ativa
 * (isolamento multi-tenant). Mantido opcional por compatibilidade, mas todos
 * os pontos de chamada no app devem sempre passar o tenantId atual.
 */
export async function loadCooperadosFromFirestore(tenantId?: string): Promise<Cooperado[]> {
  try {
    const q = tenantId
      ? query(collection(db, 'cooperados'), where('tenantId', '==', tenantId))
      : collection(db, 'cooperados');
    const snap = await getDocs(q);
    const list: Cooperado[] = [];
    snap.forEach(d => {
      list.push(d.data() as Cooperado);
    });
    // Segunda camada de defesa: mesmo que a query não filtre (ex.: documentos
    // antigos sem índice), nunca deixa vazar registro de outro tenant.
    return tenantId ? list.filter(c => !c.tenantId || c.tenantId === tenantId) : list;
  } catch (error) {
    console.warn('Erro ao carregar cooperados do Firestore:', error);
    return [];
  }
}

/**
 * Saves a single Cooperado to Firestore
 */
export async function saveCooperadoToFirestore(cooperado: Cooperado): Promise<void> {
  try {
    const docRef = doc(db, 'cooperados', cooperado.id);
    await setDoc(docRef, {
      ...cooperado,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `cooperados/${cooperado.id}`);
  }
}

/**
 * Deletes a single Cooperado from Firestore
 */
export async function deleteCooperadoFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'cooperados', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `cooperados/${id}`);
  }
}

/**
 * Synchronizes SisFin accounts to Firestore
 */
export async function syncContasFinanceirasToFirestore(contas: ContaPagarReceber[]): Promise<number> {
  if (!contas || contas.length === 0) return 0;

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const item of contas) {
      const docRef = doc(db, 'contasFinanceiras', item.id);
      batch.set(docRef, {
        ...item,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;
    }

    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'contasFinanceiras');
    return 0;
  }
}

/**
 * Loads SisFin accounts from Firestore
 */
export async function loadContasFinanceirasFromFirestore(tenantId?: string): Promise<ContaPagarReceber[]> {
  try {
    const q = tenantId
      ? query(collection(db, 'contasFinanceiras'), where('tenantId', '==', tenantId))
      : collection(db, 'contasFinanceiras');
    const snap = await getDocs(q);
    const list: ContaPagarReceber[] = [];
    snap.forEach(d => {
      list.push(d.data() as ContaPagarReceber);
    });
    return tenantId ? list.filter(c => !c.tenantId || c.tenantId === tenantId) : list;
  } catch (error) {
    console.warn('Erro ao carregar contas financeiras do Firestore:', error);
    return [];
  }
}

/**
 * Synchronizes Capital Transactions to Firestore
 */
export async function syncTransacoesCapitalToFirestore(transacoes: TransacaoCapital[]): Promise<number> {
  if (!transacoes || transacoes.length === 0) return 0;

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const t of transacoes) {
      const docRef = doc(db, 'transacoesCapital', t.id);
      batch.set(docRef, {
        ...t,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;
    }

    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'transacoesCapital');
    return 0;
  }
}

/**
 * Loads Capital Transactions from Firestore
 */
export async function loadTransacoesCapitalFromFirestore(tenantId?: string): Promise<TransacaoCapital[]> {
  try {
    const q = tenantId
      ? query(collection(db, 'transacoesCapital'), where('tenantId', '==', tenantId))
      : collection(db, 'transacoesCapital');
    const snap = await getDocs(q);
    const list: TransacaoCapital[] = [];
    snap.forEach(d => {
      list.push(d.data() as TransacaoCapital);
    });
    return tenantId ? list.filter(t => !t.tenantId || t.tenantId === tenantId) : list;
  } catch (error) {
    console.warn('Erro ao carregar transações de capital do Firestore:', error);
    return [];
  }
}

/**
 * Saves a single Capital Transaction to Firestore
 */
export async function saveTransacaoCapitalToFirestore(transacao: TransacaoCapital): Promise<void> {
  try {
    const docRef = doc(db, 'transacoesCapital', transacao.id);
    await setDoc(docRef, {
      ...transacao,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transacoesCapital/${transacao.id}`);
  }
}

/**
 * Subscribes to real-time updates for Cooperados from Firestore
 * @param tenantId Restringe a assinatura à cooperativa ativa. Sem isso, o
 * listener trazia TODOS os cooperados de TODAS as cooperativas em tempo real
 * e sobrescrevia os dados já isolados por tenant vindos do Context.
 */
export function subscribeToCooperados(callback: (data: Cooperado[]) => void, tenantId?: string): Unsubscribe {
  if (!tenantId) return () => {};
  const target = query(collection(db, 'cooperados'), where('tenantId', '==', tenantId));
  return onSnapshot(
    target,
    snapshot => {
      const list: Cooperado[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Cooperado);
      });
      callback(list);
    },
    error => {
      console.warn('[Firestore Realtime] Error on Cooperados listener:', error);
    }
  );
}

/**
 * Subscribes to real-time updates for Transações de Capital from Firestore
 */
export function subscribeToTransacoesCapital(callback: (data: TransacaoCapital[]) => void, tenantId?: string): Unsubscribe {
  if (!tenantId) return () => {};
  const target = query(collection(db, 'transacoesCapital'), where('tenantId', '==', tenantId));
  return onSnapshot(
    target,
    snapshot => {
      const list: TransacaoCapital[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as TransacaoCapital);
      });
      callback(list);
    },
    error => {
      console.warn('[Firestore Realtime] Error on TransacoesCapital listener:', error);
    }
  );
}

/**
 * Subscribes to real-time updates for Contas Financeiras from Firestore
 */
export function subscribeToContasFinanceiras(callback: (data: ContaPagarReceber[]) => void, tenantId?: string): Unsubscribe {
  if (!tenantId) return () => {};
  const target = query(collection(db, 'contasFinanceiras'), where('tenantId', '==', tenantId));
  return onSnapshot(
    target,
    snapshot => {
      const list: ContaPagarReceber[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ContaPagarReceber);
      });
      callback(list);
    },
    error => {
      console.warn('[Firestore Realtime] Error on ContasFinanceiras listener:', error);
    }
  );
}

/**
 * Synchronizes Assemblies to Firestore
 */
export async function syncAssembleiasToFirestore(assembleias: Assembleia[]): Promise<number> {
  if (!assembleias || assembleias.length === 0) return 0;

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const a of assembleias) {
      const docRef = doc(db, 'assembleias', a.id);
      batch.set(docRef, {
        ...a,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;
    }

    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'assembleias');
    return 0;
  }
}

/**
 * Loads Assemblies from Firestore
 */
export async function loadAssembleiasFromFirestore(tenantId?: string): Promise<Assembleia[]> {
  try {
    const q = tenantId
      ? query(collection(db, 'assembleias'), where('tenantId', '==', tenantId))
      : collection(db, 'assembleias');
    const snap = await getDocs(q);
    const list: Assembleia[] = [];
    snap.forEach(d => {
      list.push(d.data() as Assembleia);
    });
    return tenantId ? list.filter(a => !a.tenantId || a.tenantId === tenantId) : list;
  } catch (error) {
    console.warn('Erro ao carregar assembleias do Firestore:', error);
    return [];
  }
}

/**
 * Saves Tenant / Cooperative setup to Firestore
 */
export async function saveTenantToFirestore(tenant: Tenant): Promise<void> {
  try {
    const docRef = doc(db, 'tenants', tenant.id);
    await setDoc(docRef, {
      // JSON remove campos undefined, que o Firestore recusa.
      ...JSON.parse(JSON.stringify(tenant)),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn('Erro ao salvar cooperativa no Firestore:', error);
  }
}

/**
 * One-click synchronization of the entire cooperative dataset to Firebase Firestore
 */
export async function syncEntireDatabaseToFirestore({
  cooperados,
  contasPagarReceber,
  transacoesCapital,
  assembleias,
  currentTenant
}: {
  cooperados: Cooperado[];
  contasPagarReceber: ContaPagarReceber[];
  transacoesCapital: TransacaoCapital[];
  assembleias: Assembleia[];
  currentTenant?: Tenant;
}): Promise<{
  success: boolean;
  message: string;
  counts: {
    cooperados: number;
    contas: number;
    transacoes: number;
    assembleias: number;
  };
}> {
  try {
    const [cCount, contCount, tCount, aCount] = await Promise.all([
      syncCooperadosToFirestore(cooperados),
      syncContasFinanceirasToFirestore(contasPagarReceber),
      syncTransacoesCapitalToFirestore(transacoesCapital),
      syncAssembleiasToFirestore(assembleias)
    ]);

    if (currentTenant) {
      await saveTenantToFirestore(currentTenant);
    }

    return {
      success: true,
      message: `Base sincronizada com sucesso no Firebase Firestore (${cCount} cooperados, ${contCount} contas, ${tCount} transações, ${aCount} assembleias)!`,
      counts: {
        cooperados: cCount,
        contas: contCount,
        transacoes: tCount,
        assembleias: aCount
      }
    };
  } catch (err: any) {
    console.error('Erro na sincronização global com Firebase:', err);
    return {
      success: false,
      message: `Erro na sincronização com Firebase Firestore: ${err?.message || 'Falha de gravação'}`,
      counts: {
        cooperados: 0,
        contas: 0,
        transacoes: 0,
        assembleias: 0
      }
    };
  }
}

// ---------------------------------------------------------------------------
// Equipe da cooperativa (tenantMembers)
// ---------------------------------------------------------------------------

/**
 * tenantMembers/{email}: vínculo de cada usuário cadastrado em
 * Configurações → Usuários com a cooperativa. É o que permite que esse
 * usuário, ao entrar com Google ou com e-mail/senha (em qualquer
 * computador), seja reconhecido: as regras do Firestore deixam ele gravar o
 * próprio users/{uid} com o tenantId que consta aqui.
 */
export interface TenantMember {
  email: string;
  tenantId: string;
  name: string;
  role: string;
  active: boolean;
  cargo?: string;
  departamento?: string;
  phone?: string;
  authUid?: string;
  updatedAt?: string;
}

export const chaveMembro = (email: string) => (email || '').trim().toLowerCase();

export async function saveTenantMemberToFirestore(member: TenantMember): Promise<{ ok: boolean; error?: string }> {
  const id = chaveMembro(member.email);
  if (!id || !member.tenantId || !auth.currentUser) return { ok: false, error: 'Sem sessão no Firebase Auth.' };
  try {
    const dados = Object.fromEntries(
      Object.entries({ ...member, email: id, updatedAt: new Date().toISOString() }).filter(([, v]) => v !== undefined)
    );
    await setDoc(doc(db, 'tenantMembers', id), dados, { merge: true });
    return { ok: true };
  } catch (error: any) {
    console.warn('Erro ao gravar tenantMembers no Firestore:', error);
    return {
      ok: false,
      error: error?.code === 'permission-denied'
        ? 'O Firestore recusou a gravação do usuário (permission-denied). Publique o firestore.rules atualizado.'
        : (error?.message || 'Falha ao gravar no Firestore.')
    };
  }
}

export async function deleteTenantMemberFromFirestore(email: string): Promise<void> {
  const id = chaveMembro(email);
  if (!id || !auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'tenantMembers', id));
  } catch (error) {
    console.warn('Erro ao remover tenantMembers no Firestore:', error);
  }
}

export async function getTenantMemberFromFirestore(email: string): Promise<TenantMember | null> {
  const id = chaveMembro(email);
  if (!id || !auth.currentUser) return null;
  try {
    const snap = await getDoc(doc(db, 'tenantMembers', id));
    return snap.exists() ? (snap.data() as TenantMember) : null;
  } catch {
    return null;
  }
}

export function subscribeTenantMembers(tenantId: string, onChange: (members: TenantMember[]) => void): Unsubscribe {
  const alvo = query(collection(db, 'tenantMembers'), where('tenantId', '==', tenantId));
  return onSnapshot(
    alvo,
    snap => onChange(snap.docs.map(d => d.data() as TenantMember)),
    error => console.warn('Erro ao ouvir tenantMembers no Firestore:', error)
  );
}

export async function fetchTenantFromFirestore(tenantId: string): Promise<Record<string, any> | null> {
  if (!tenantId || !auth.currentUser) return null;
  try {
    const snap = await getDoc(doc(db, 'tenants', tenantId));
    return snap.exists() ? { ...snap.data(), id: tenantId } : null;
  } catch (error) {
    console.warn('Erro ao carregar a cooperativa do Firestore:', error);
    return null;
  }
}

