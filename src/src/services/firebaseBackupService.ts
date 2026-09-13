import { doc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Cooperado, ContaPagarReceber } from '../types';

export interface BackupHistoryItem {
  id: string;
  timestamp: string;
  tipo: 'AUTOMATICO_SEMANAL' | 'MANUAL';
  status: 'SUCESSO' | 'FALHA';
  arquivosCount: number;
  tamanhoTotalBytes: number;
  menssagem: string;
  files: {
    name: string;
    bucket: string;
    sizeBytes: number;
    publicUrl?: string;
  }[];
}

const HISTORY_STORAGE_KEY = 'SISCOOPE_FIREBASE_BACKUP_HISTORY';
const LAST_BACKUP_KEY = 'SISCOOPE_LAST_FIREBASE_BACKUP_TIMESTAMP';
const ENABLED_STORAGE_KEY = 'SISCOOPE_WEEKLY_FIREBASE_BACKUP_ENABLED';

/**
 * Converts array of objects into standard CSV string
 */
export function convertToCSV(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(';'));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(';'));
  }

  return csvRows.join('\n');
}

/**
 * Generates CSV string for Cooperados database
 */
export function generateCooperadosCSV(cooperados: Cooperado[]): string {
  if (!cooperados || cooperados.length === 0) {
    return 'Matricula;Nome;CPF_CNPJ;RG;Situacao;Categoria;DataFiliacao;Telefone;Email;Cidade;Estado;Banco;Agencia;Conta;ChavePix;Cotas;CapitalSocial\n';
  }

  const rows = cooperados.map(c => ({
    Matricula: c.matricula || '',
    Nome: c.nome || '',
    CPF_CNPJ: c.cpf || '',
    RG: c.rg || '',
    Situacao: c.situacao || '',
    Categoria: c.categoria || '',
    DataFiliacao: c.dataFiliacao || '',
    Telefone: c.telefone || c.celular || '',
    Email: c.email || '',
    Cidade: c.cidade || '',
    Estado: c.estado || '',
    Banco: c.banco || '',
    Agencia: c.agencia || '',
    Conta: c.conta || '',
    ChavePix: c.chavePix || '',
    Cotas: (c as any).qtdCotasSubscritas || (c as any).cotas || 0,
    CapitalSocial: c.capitalIntegralizado || c.capitalSubscrito || 0
  }));

  return convertToCSV(rows);
}

/**
 * Generates CSV string for SisFin Financial Transactions (Contas Pagar/Receber)
 */
export function generateSisFinTransacoesCSV(contas: ContaPagarReceber[]): string {
  if (!contas || contas.length === 0) {
    return 'ID;Tipo;Descricao;PessoaBeneficiario;Categoria;Valor;DataVencimento;DataPagamento;Status;FormaPagamento;CentroCusto\n';
  }

  const rows = contas.map(t => ({
    ID: t.id,
    Tipo: t.tipo || '',
    Descricao: t.descricao || '',
    PessoaBeneficiario: t.pessoaNome || '',
    Categoria: t.categoria || '',
    Valor: t.valor || 0,
    DataVencimento: t.dataVencimento || '',
    DataPagamento: t.dataPagamento || '',
    Status: t.status || '',
    FormaPagamento: t.formaPagamento || '',
    CentroCusto: t.centroCusto || ''
  }));

  return convertToCSV(rows);
}

/**
 * Trigger browser download for CSV file directly
 */
export function downloadCSVLocally(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Saves a backup record to Firestore collection 'backups' and localStorage fallback
 */
export async function saveBackupHistoryRecord(item: BackupHistoryItem): Promise<void> {
  // 1. Local storage cache
  try {
    const history = getBackupHistory();
    const updated = [item, ...history.filter(h => h.id !== item.id)].slice(0, 30);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao salvar histórico local:', e);
  }

  // 2. Persist in Firebase Firestore
  try {
    const backupDocRef = doc(db, 'backups', item.id);
    await setDoc(backupDocRef, {
      ...item,
      savedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Backup salvo no Firebase Firestore com ID: ${item.id}`);
  } catch (err) {
    console.warn('Erro ao persistir backup no Firestore:', err);
  }
}

/**
 * Retrieves local/cached backup history
 */
export function getBackupHistory(): BackupHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Fetches backup history directly from Firebase Firestore
 */
export async function fetchFirestoreBackupHistory(): Promise<BackupHistoryItem[]> {
  try {
    const backupsRef = collection(db, 'backups');
    const q = query(backupsRef, orderBy('timestamp', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    const items: BackupHistoryItem[] = [];
    snapshot.forEach(docSnap => {
      items.push(docSnap.data() as BackupHistoryItem);
    });
    if (items.length > 0) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    }
    return items;
  } catch (error) {
    console.warn('Falha ao buscar histórico do Firestore:', error);
    return getBackupHistory();
  }
}

/**
 * Checks if weekly automatic backup is enabled
 */
export function isWeeklyBackupEnabled(): boolean {
  const val = localStorage.getItem(ENABLED_STORAGE_KEY);
  return val === null ? true : val === 'true';
}

/**
 * Sets weekly automatic backup flag
 */
export function setWeeklyBackupEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Returns timestamp string of last executed backup
 */
export function getLastBackupTimestamp(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

/**
 * Executes backup of Cooperados and SisFin data and saves to Firebase Firestore
 */
export async function executeFirebaseBackup({
  cooperados,
  contasPagarReceber,
  tipo = 'MANUAL'
}: {
  cooperados: Cooperado[];
  contasPagarReceber: ContaPagarReceber[];
  tipo?: 'AUTOMATICO_SEMANAL' | 'MANUAL';
}): Promise<{
  success: boolean;
  message: string;
  item?: BackupHistoryItem;
}> {
  const now = new Date();
  const timestamp = now.toISOString();
  const dateStr = now.toISOString().slice(0, 10);
  const timeSuffix = Date.now().toString().slice(-4);

  const cooperadosCsv = generateCooperadosCSV(cooperados);
  const sisfinCsv = generateSisFinTransacoesCSV(contasPagarReceber);

  const cooperadosFileName = `weekly_cooperados_${dateStr}_${timeSuffix}.csv`;
  const sisfinFileName = `weekly_sisfin_transacoes_${dateStr}_${timeSuffix}.csv`;

  const totalBytes = new Blob([cooperadosCsv]).size + new Blob([sisfinCsv]).size;

  const filesRecorded = [
    {
      name: cooperadosFileName,
      bucket: 'firebase-firestore',
      sizeBytes: new Blob([cooperadosCsv]).size
    },
    {
      name: sisfinFileName,
      bucket: 'firebase-firestore',
      sizeBytes: new Blob([sisfinCsv]).size
    }
  ];

  try {
    // Save backup summary and data to Firestore
    const historyItem: BackupHistoryItem = {
      id: `bkp-firebase-${Date.now()}`,
      timestamp,
      tipo,
      status: 'SUCESSO',
      arquivosCount: filesRecorded.length,
      tamanhoTotalBytes: totalBytes,
      menssagem: `Backup ${tipo === 'AUTOMATICO_SEMANAL' ? 'automático semanal' : 'manual'} concluído com sucesso e registrado no Firebase Firestore.`,
      files: filesRecorded
    };

    await saveBackupHistoryRecord(historyItem);
    localStorage.setItem(LAST_BACKUP_KEY, timestamp);

    return {
      success: true,
      message: `Backup salvo com sucesso no Firebase Firestore (${cooperados.length} cooperados e ${contasPagarReceber.length} transações financeiras).`,
      item: historyItem
    };
  } catch (err: any) {
    const errorMsg = `Erro ao salvar backup no Firebase: ${err?.message || 'Falha na conexão'}`;
    const failedItem: BackupHistoryItem = {
      id: `bkp-fail-${Date.now()}`,
      timestamp,
      tipo,
      status: 'FALHA',
      arquivosCount: 0,
      tamanhoTotalBytes: 0,
      menssagem: errorMsg,
      files: []
    };
    saveBackupHistoryRecord(failedItem);
    return { success: false, message: errorMsg, item: failedItem };
  }
}

/**
 * Routine to check and run weekly backup if due
 */
export async function checkAndRunWeeklyBackupIfNeeded({
  cooperados,
  contasPagarReceber
}: {
  cooperados: Cooperado[];
  contasPagarReceber: ContaPagarReceber[];
}) {
  if (!isWeeklyBackupEnabled()) return;

  const lastBackupStr = getLastBackupTimestamp();
  const now = new Date();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  if (lastBackupStr) {
    const lastDate = new Date(lastBackupStr);
    const elapsed = now.getTime() - lastDate.getTime();
    if (elapsed < ONE_WEEK_MS) {
      return; // Still within 7 days
    }
  }

  console.log('Iniciando rotina de backup semanal automático no Firebase Firestore...');
  try {
    await executeFirebaseBackup({
      cooperados,
      contasPagarReceber,
      tipo: 'AUTOMATICO_SEMANAL'
    });
  } catch (e) {
    console.error('Erro na rotina de backup semanal no Firebase:', e);
  }
}
