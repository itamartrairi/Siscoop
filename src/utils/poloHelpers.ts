/**
 * Lista oficial de polos usada em todo o sistema (formulários de cadastro
 * de produtor e de escola). Qualquer comparação de polo deve passar por
 * normalizarPolo() abaixo — nunca comparar strings de polo diretamente,
 * pois dados importados de planilha podem vir com texto levemente
 * diferente do valor oficial.
 */
export const POLOS_PADRAO = [
  'Batalha',
  'Canaã',
  'Flecheiras',
  'Gualdrapas',
  'Mundaú',
  'Sede',
  'Bacumixa'
] as const;

function normalizarTexto(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normaliza um texto de polo (vindo de formulário, planilha importada ou
 * dado legado) para um dos 7 polos oficiais, usando correspondência por
 * palavra-chave — não exige que o texto bata exatamente com o valor
 * oficial. Se nada bater, assume "Sede" como padrão (mesmo comportamento
 * de fallback já usado em outros pontos do sistema).
 */
export function normalizarPolo(valorBruto: string | undefined | null): string {
  const texto = normalizarTexto(valorBruto || '');
  if (!texto) return 'Sede';

  if (texto.includes('batalha')) return 'Batalha';
  if (texto.includes('canaa')) return 'Canaã';
  if (texto.includes('flecheira')) return 'Flecheiras';
  if (texto.includes('gualdrapa')) return 'Gualdrapas';
  if (texto.includes('mundau')) return 'Mundaú';
  if (texto.includes('bacumixa')) return 'Bacumixa';
  if (texto.includes('sede') || texto.includes('centro')) return 'Sede';

  const match = POLOS_PADRAO.find(p => normalizarTexto(p) === texto);
  return match || 'Sede';
}

/**
 * Compara dois valores de polo (de fontes possivelmente diferentes —
 * cadastro manual, planilha importada, dado legado) considerando-os iguais
 * se normalizarem para o mesmo polo oficial.
 */
export function poloEquivale(poloA: string | undefined | null, poloB: string | undefined | null): boolean {
  return normalizarPolo(poloA) === normalizarPolo(poloB);
}
