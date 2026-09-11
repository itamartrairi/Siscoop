import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export type PlanoLicenca = 'MENSAL' | 'ANUAL';
export type StatusAssinatura = 'ACTIVE' | 'INACTIVE';

export interface Assinatura {
  id: string;
  clientEmail: string;
  clientName: string;
  plan: PlanoLicenca;
  status: StatusAssinatura;
  licenseKey: string;
  orderId: string;
  activatedAt: string;
  expiresAt: string;
  updatedAt: string;
}

export interface LogWebhook {
  id: string;
  receivedAt: string;
  orderId: string;
  event: string;
  orderStatus: string;
  customerEmail: string;
  customerName: string;
  productName: string;
  amount: number;
  licenseKey: string;
  statusActivated: boolean;
}

const DATA_DIR = process.env.SISCOOP_DATA_DIR || path.join(process.cwd(), 'data');
const ASSINATURAS_FILE = path.join(DATA_DIR, 'assinaturas.json');
const LOGS_FILE = path.join(DATA_DIR, 'webhook-logs.json');

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') console.error(`[Assinaturas] erro ao ler ${file}:`, error);
    return fallback;
  }
}

async function writeJson<T>(file: string, value: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temporary, file);
}

export function gerarChaveLicenca(plan: PlanoLicenca): string {
  const prefixo = plan === 'ANUAL' ? 'SISCOOP-A' : 'SISCOOP-M';
  const partes = [prefixo, ...Array.from({ length: 3 }, () => crypto.randomBytes(3).toString('hex').toUpperCase())];
  return partes.join('-');
}

export async function buscarAssinatura(email: string): Promise<Assinatura | undefined> {
  const normalizado = email.toLowerCase().trim();
  const assinaturas = await readJson<Assinatura[]>(ASSINATURAS_FILE, []);
  return assinaturas.find(item => item.clientEmail.toLowerCase().trim() === normalizado);
}

export async function salvarAssinatura(assinatura: Assinatura): Promise<void> {
  const assinaturas = await readJson<Assinatura[]>(ASSINATURAS_FILE, []);
  const index = assinaturas.findIndex(item => item.clientEmail.toLowerCase() === assinatura.clientEmail.toLowerCase());
  if (index >= 0) assinaturas[index] = assinatura;
  else assinaturas.push(assinatura);
  await writeJson(ASSINATURAS_FILE, assinaturas);
}

export async function listarLogs(limite = 50): Promise<LogWebhook[]> {
  const logs = await readJson<LogWebhook[]>(LOGS_FILE, []);
  return logs.slice(-Math.max(1, limite)).reverse();
}

export async function registrarLog(log: LogWebhook): Promise<void> {
  const logs = await readJson<LogWebhook[]>(LOGS_FILE, []);
  logs.push(log);
  await writeJson(LOGS_FILE, logs.slice(-500));
}

export async function validarLicenca(email: string, licenseKey: string): Promise<{
  valida: boolean;
  motivo?: 'NAO_ENCONTRADA' | 'CHAVE_INCORRETA' | 'INATIVA' | 'EXPIRADA';
  plan?: PlanoLicenca;
  expiresAt?: string;
}> {
  const assinatura = await buscarAssinatura(email);
  if (!assinatura) return { valida: false, motivo: 'NAO_ENCONTRADA' };
  if (assinatura.licenseKey !== licenseKey.trim()) return { valida: false, motivo: 'CHAVE_INCORRETA' };
  if (assinatura.status !== 'ACTIVE') return { valida: false, motivo: 'INATIVA' };
  if (new Date(assinatura.expiresAt).getTime() < Date.now()) return { valida: false, motivo: 'EXPIRADA', plan: assinatura.plan, expiresAt: assinatura.expiresAt };
  return { valida: true, plan: assinatura.plan, expiresAt: assinatura.expiresAt };
}

export type { Assinatura as Subscription, LogWebhook as WebhookLog };

export default {
  buscarAssinatura,
  gerarChaveLicenca,
  listarLogs,
  registrarLog,
  salvarAssinatura,
  validarLicenca,
};

void (0);
