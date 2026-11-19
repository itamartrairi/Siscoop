import { doc, getDocsFromServer, collection, query, where, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Cooperado, ContaPagarReceber } from '../types';

export interface BackupHistoryItem {
  id: string;
  tenantId: string;
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
    partes?: number;
  }[];
}

const HISTORY_STORAGE_KEY = 'SISCOOPE_FIREBASE_BACKUP_HISTORY';
const LAST_BACKUP_KEY = 'SISCOOPE_LAST_FIREBASE_BACKUP_TIMESTAMP';
const backupsEmAndamento = new Set<string>();
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
const dividirCsv = (csv: string) => csv.match(/[\s\S]{1,140000}/gu) || [];

export async function saveBackupHistoryRecord(item: BackupHistoryItem, conteudos: string[]): Promise<void> {
  const backup = doc(db, 'backups', item.id);
  const lote = writeBatch(db);
  lote.set(backup, { ...item, savedAt: new Date().toISOString() });
  conteudos.forEach((csv, arquivo) => {
    dividirCsv(csv).forEach((conteudo, parte) => {
      lote.set(doc(backup, 'arquivos', `${arquivo}-${parte}`), { arquivo, parte, conteudo });
    });
  });
  await lote.commit();
}

export function getBackupHistory(tenantId?: string): BackupHistoryItem[] {
  try {
    return tenantId ? JSON.parse(localStorage.getItem(`${HISTORY_STORAGE_KEY}:${tenantId}`) || '[]') : [];
  } catch {
    return [];
  }
}

export async function fetchFirestoreBackupHistory(tenantId: string): Promise<BackupHistoryItem[]> {
  const q = query(collection(db, 'backups'), where('tenantId', '==', tenantId));
  const snapshot = await getDocsFromServer(q);
  return snapshot.docs.map(item => item.data() as BackupHistoryItem)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 30);
}

export async function baixarArquivosBackup(item: BackupHistoryItem): Promise<void> {
  const snapshot = await getDocsFromServer(collection(db, 'backups', item.id, 'arquivos'));
  const partes = snapshot.docs.map(parte => parte.data());
  const arquivos = item.files.map((arquivo, indice) => {
    const blocos = partes.filter(parte => parte.arquivo === indice).sort((a, b) => a.parte - b.parte);
    if (!arquivo.partes || blocos.length !== arquivo.partes || blocos.some((parte, ordem) => parte.parte !== ordem)) {
      throw new Error('O conteúdo deste backup está incompleto.');
    }
    return blocos.map(parte => parte.conteudo).join('');
  });
  arquivos.forEach((csv, indice) => downloadCSVLocally(csv, item.files[indice].name));
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
export function getLastBackupTimestamp(tenantId?: string): string | null {
  return tenantId ? localStorage.getItem(`${LAST_BACKUP_KEY}:${tenantId}`) : null;
}

/**
 * Executes backup of Cooperados and SisFin data and saves to Firebase Firestore
 */
export async function executeFirebaseBackup({
  tenantId,
  cooperados,
  contasPagarReceber,
  tipo = 'MANUAL'
}: {
  tenantId: string;
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

  const cooperadosDaCooperativa = cooperados.filter(item => item.tenantId === tenantId);
  const contasDaCooperativa = contasPagarReceber.filter(item => item.tenantId === tenantId);
  const cooperadosCsv = generateCooperadosCSV(cooperadosDaCooperativa);
  const sisfinCsv = generateSisFinTransacoesCSV(contasDaCooperativa);

  const cooperadosFileName = `weekly_cooperados_${dateStr}_${timeSuffix}.csv`;
  const sisfinFileName = `weekly_sisfin_transacoes_${dateStr}_${timeSuffix}.csv`;

  const totalBytes = new Blob([cooperadosCsv]).size + new Blob([sisfinCsv]).size;

  const filesRecorded = [
    {
      name: cooperadosFileName,
      bucket: 'firebase-firestore',
      sizeBytes: new Blob([cooperadosCsv]).size,
      partes: dividirCsv(cooperadosCsv).length
    },
    {
      name: sisfinFileName,
      bucket: 'firebase-firestore',
      sizeBytes: new Blob([sisfinCsv]).size,
      partes: dividirCsv(sisfinCsv).length
    }
  ];

  try {
    if (!tenantId || !auth.currentUser) throw new Error('Entre na cooperativa para salvar o backup.');
    if (totalBytes > 8_000_000) throw new Error('Os CSVs excedem o limite de 8 MB por backup.');
    const historyItem: BackupHistoryItem = {
      id: `bkp-firebase-${crypto.randomUUID()}`,
      tenantId,
      timestamp,
      tipo,
      status: 'SUCESSO',
      arquivosCount: filesRecorded.length,
      tamanhoTotalBytes: totalBytes,
      menssagem: `Backup ${tipo === 'AUTOMATICO_SEMANAL' ? 'automático semanal' : 'manual'} concluído com sucesso e registrado no Firebase Firestore.`,
      files: filesRecorded
    };

    await saveBackupHistoryRecord(historyItem, [cooperadosCsv, sisfinCsv]);
    try {
      localStorage.setItem(`${LAST_BACKUP_KEY}:${tenantId}`, timestamp);
      const historico = [historyItem, ...getBackupHistory(tenantId)].slice(0, 30);
      localStorage.setItem(`${HISTORY_STORAGE_KEY}:${tenantId}`, JSON.stringify(historico));
    } catch (error) {
      console.warn('Falha ao atualizar o cache do backup confirmado.', error);
    }

    return {
      success: true,
      message: `Backup salvo com sucesso no Firebase Firestore (${cooperadosDaCooperativa.length} cooperados e ${contasDaCooperativa.length} transações financeiras).`,
      item: historyItem
    };
  } catch (err: any) {
    const errorMsg = `Erro ao salvar backup no Firebase: ${err?.message || 'Falha na conexão'}`;
    return { success: false, message: errorMsg };
  }
}

/**
 * Routine to check and run weekly backup if due
 */
export async function checkAndRunWeeklyBackupIfNeeded({
  tenantId,
  cooperados,
  contasPagarReceber
}: {
  tenantId: string;
  cooperados: Cooperado[];
  contasPagarReceber: ContaPagarReceber[];
}) {
  if (!tenantId || !auth.currentUser || !isWeeklyBackupEnabled() || backupsEmAndamento.has(tenantId)) return;

  const lastBackupStr = getLastBackupTimestamp(tenantId);
  const now = new Date();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  if (lastBackupStr) {
    const lastDate = new Date(lastBackupStr);
    const elapsed = now.getTime() - lastDate.getTime();
    if (elapsed < ONE_WEEK_MS) {
      return; // Still within 7 days
    }
  }

  backupsEmAndamento.add(tenantId);
  try {
    const historico = await fetchFirestoreBackupHistory(tenantId);
    const ultimo = historico.find(item => item.status === 'SUCESSO' && item.files.some(file => file.partes));
    if (ultimo && now.getTime() - new Date(ultimo.timestamp).getTime() < ONE_WEEK_MS) {
      try { localStorage.setItem(`${LAST_BACKUP_KEY}:${tenantId}`, ultimo.timestamp); } catch {}
      return;
    }
    await executeFirebaseBackup({
      tenantId,
      cooperados,
      contasPagarReceber,
      tipo: 'AUTOMATICO_SEMANAL'
    });
  } catch (e) {
    console.error('Erro na rotina de backup semanal no Firebase:', e);
  } finally {
    backupsEmAndamento.delete(tenantId);
  }
}
