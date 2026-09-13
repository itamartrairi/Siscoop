import type { NextFunction, Request, Response } from 'express';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface UsuarioAutenticado {
  uid: string;
  email: string;
  name?: string;
  admin?: boolean;
}

export interface RequisicaoAutenticada extends Request {
  usuario?: UsuarioAutenticado;
}

function obterAdminAuth() {
  const app = getApps()[0] || initializeApp({
    credential: applicationDefault(),
  });
  return getAuth(app);
}

function tokenAdministrativoValido(req: Request): boolean {
  const configurado = process.env.ADMIN_API_TOKEN?.trim();
  const recebido = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  return Boolean(configurado && recebido && recebido === configurado);
}

async function autenticar(req: RequisicaoAutenticada, res: Response, next: NextFunction): Promise<void> {
  if (tokenAdministrativoValido(req)) {
    req.usuario = { uid: 'admin-api', email: process.env.OWNER_EMAIL || 'admin@siscoop.local', admin: true };
    next();
    return;
  }

  const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) {
    res.status(401).json({ success: false, message: 'Autenticação necessária.' });
    return;
  }

  try {
    const decoded = await obterAdminAuth().verifyIdToken(bearer);
    if (!decoded.email) {
      res.status(401).json({ success: false, message: 'O token não possui e-mail.' });
      return;
    }
    req.usuario = {
      uid: decoded.uid,
      email: decoded.email.toLowerCase().trim(),
      name: decoded.name,
      admin: decoded.admin === true,
    };
    next();
  } catch (error) {
    console.error('[Auth] token inválido:', error instanceof Error ? error.message : error);
    res.status(401).json({ success: false, message: 'Token de autenticação inválido ou expirado.' });
  }
}

export function exigirUsuario(req: RequisicaoAutenticada, res: Response, next: NextFunction): void {
  void autenticar(req, res, next);
}

export function exigirAdmin(req: RequisicaoAutenticada, res: Response, next: NextFunction): void {
  void autenticar(req, res, () => {
    if (!req.usuario?.admin) {
      res.status(403).json({ success: false, message: 'Acesso administrativo necessário.' });
      return;
    }
    next();
  });
}
