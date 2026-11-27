/**
 * Guarda, por aba do navegador, que o usuário já confirmou o CNPJ da
 * cooperativa depois do login. Limpo no logout.
 */
const PREFIXO_CHAVE = 'siscoop:cnpj-validado:';

export const somenteDigitos = (v: string) => (v || '').replace(/\D/g, '');

export function chaveValidacaoCnpj(uid?: string, tenantId?: string) {
  return `${PREFIXO_CHAVE}${uid || ''}:${tenantId || ''}`;
}

export function cnpjJaValidado(uid?: string, tenantId?: string): boolean {
  if (!uid || !tenantId) return false;
  try {
    return sessionStorage.getItem(chaveValidacaoCnpj(uid, tenantId)) === '1';
  } catch {
    return false;
  }
}

export function marcarCnpjValidado(uid?: string, tenantId?: string) {
  if (!uid || !tenantId) return;
  try {
    sessionStorage.setItem(chaveValidacaoCnpj(uid, tenantId), '1');
  } catch {
    /* navegador sem sessionStorage: a validação vale só enquanto a tela estiver aberta */
  }
}

export function limparValidacoesCnpj() {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(PREFIXO_CHAVE))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {
    /* sem sessionStorage, nada a limpar */
  }
}
