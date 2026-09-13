import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  getDoc,
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

  try {
    // Write test document to confirm write access
    const testDoc = doc(db, 'test', 'ping');
    await setDoc(testDoc, { ping: true, timestamp: new Date().toISOString() });

    // Fetch counts from key collections
    const collectionsToCheck = [
      'cooperados',
      'transacoesCapital',
      'contasFinanceiras',
      'assembleias',
      'backups'
    ];

    const collectionsStatus: { name: string; count: number }[] = [];

    for (const colName of collectionsToCheck) {
      try {
        const snap = await getDocs(collection(db, colName));
        collectionsStatus.push({ name: colName, count: snap.size });
      } catch {
        collectionsStatus.push({ name: colName, count: 0 });
      }
    }

    return {
      connected: true,
      message: `Conectado com sucesso ao Google Cloud Firestore (Database: ${databaseId})!`,
      projectId,
      databaseId,
      collectionsStatus
    };
  } catch (err: any) {
    console.error('Erro na conexão com Firestore:', err);
    return {
      connected: false,
      message: `Erro ao conectar ao Firebase Firestore: ${err?.message || 'Falha de rede'}`,
      projectId,
      databaseId,
      collectionsStatus: []
    };
  }
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
  const target = tenantId
    ? query(collection(db, 'cooperados'), where('tenantId', '==', tenantId))
    : collection(db, 'cooperados');
  return onSnapshot(
    target,
    snapshot => {
      const list: Cooperado[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Cooperado);
      });
      callback(tenantId ? list.filter(c => !c.tenantId || c.tenantId === tenantId) : list);
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
  const target = tenantId
    ? query(collection(db, 'transacoesCapital'), where('tenantId', '==', tenantId))
    : collection(db, 'transacoesCapital');
  return onSnapshot(
    target,
    snapshot => {
      const list: TransacaoCapital[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as TransacaoCapital);
      });
      callback(tenantId ? list.filter(t => !t.tenantId || t.tenantId === tenantId) : list);
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
  const target = tenantId
    ? query(collection(db, 'contasFinanceiras'), where('tenantId', '==', tenantId))
    : collection(db, 'contasFinanceiras');
  return onSnapshot(
    target,
    snapshot => {
      const list: ContaPagarReceber[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ContaPagarReceber);
      });
      callback(tenantId ? list.filter(c => !c.tenantId || c.tenantId === tenantId) : list);
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
      ...tenant,
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
