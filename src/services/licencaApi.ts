import { auth } from './firebase';

/**
 * Cliente dos endpoints de licença.
 *
 * Toda decisão sobre "esta licença é válida?" acontece no servidor. O front
 * apenas exibe o resultado. Antes, o próprio navegador decidia — e guardava a
 * decisão no localStorage, onde qualquer pessoa podia editá-la.
 */

export interface RespostaLicenca {
  success: boolean;
  message: string;
  plan?: 'MENSAL' | 'ANUAL';
  expiresAt?: string;
}

async function cabecalhoAutenticado(): Promise<Record<string, string>> {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error('SEM_SESSAO');
  const idToken = await usuario.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };
}

export async function validarLicencaNoServidor(chave: string): Promise<RespostaLicenca> {
  let headers: Record<string, string>;
  try {
    headers = await cabecalhoAutenticado();
  } catch {
    return { success: false, message: 'Faça login antes de ativar a licença.' };
  }

  try {
    const res = await fetch('/api/license/validate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ licenseKey: chave }),
    });
    const dados = await res.json().catch(() => ({}));
    return {
      success: res.ok && dados.success === true,
      message: dados.message || 'Não foi possível validar a licença agora.',
      plan: dados.plan,
      expiresAt: dados.expiresAt,
    };
  } catch {
    return {
      success: false,
      message: 'Não foi possível falar com o servidor de licenças. Tente novamente.',
    };
  }
}

export interface StatusAssinatura {
  hasActiveSubscription: boolean;
  plan?: 'MENSAL' | 'ANUAL';
  status?: string;
  expiresAt?: string;
  activatedAt?: string;
}

export async function consultarAssinatura(): Promise<StatusAssinatura | null> {
  let headers: Record<string, string>;
  try {
    headers = await cabecalhoAutenticado();
  } catch {
    return null;
  }

  try {
    // O servidor identifica o usuário pelo ID token. Não existe mais parâmetro
    // de e-mail na URL — era assim que dava para consultar a assinatura alheia.
    const res = await fetch('/api/subscription/status', { headers });
    if (!res.ok) return null;
    const dados = await res.json();
    return {
      hasActiveSubscription: Boolean(dados.hasActiveSubscription),
      ...(dados.subscription ?? {}),
    };
  } catch {
    return null;
  }
}
