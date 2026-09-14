/**
 * Utilitário global para formatação de datas no padrão brasileiro (DD/MM/AAAA)
 */
export function formatarData(dataStr?: string | null): string {
  if (!dataStr) return '—';
  const limpa = String(dataStr).trim();
  if (!limpa) return '—';

  // Já está no formato DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpa)) {
    return limpa;
  }

  // Formato ISO ou YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(limpa)) {
    const [ano, mes, dia] = limpa.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // Tenta parse via Date
  const d = new Date(limpa);
  if (!isNaN(d.getTime())) {
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  return limpa;
}

export function formatarDataHora(dataStr?: string | null): string {
  if (!dataStr) return '—';
  const d = new Date(dataStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return formatarData(dataStr);
}
