// Utilitários de parcelamento usados por Compras (ordens de compra), Revenda
// de Produtos e Chamadas Públicas para gerar as parcelas lançadas no Contas
// a Pagar e Receber.

export type FormaPagamentoComercial = 'DINHEIRO' | 'PIX' | 'CARTAO';

export const FORMAS_PAGAMENTO_COMERCIAL: { valor: FormaPagamentoComercial; rotulo: string }[] = [
  { valor: 'DINHEIRO', rotulo: 'Dinheiro' },
  { valor: 'PIX', rotulo: 'Pix' },
  { valor: 'CARTAO', rotulo: 'Cartão' },
];

export const rotuloFormaPagamento = (forma?: string): string =>
  FORMAS_PAGAMENTO_COMERCIAL.find(f => f.valor === forma)?.rotulo || forma || '—';

export interface ParcelaGerada {
  numero: number;
  valor: number;
  vencimento: string; // AAAA-MM-DD
}

/** Data de hoje (fuso local) no formato AAAA-MM-DD. */
export const hojeISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Soma dias a uma data AAAA-MM-DD (sem problemas de fuso horário). */
export const somarDias = (dataISO: string, dias: number): string => {
  const [a, m, d] = (dataISO || hojeISO()).split('-').map(Number);
  const data = new Date(a, (m || 1) - 1, d || 1, 12);
  data.setDate(data.getDate() + dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
};

/**
 * Divide um valor em N parcelas (em centavos, sem perder arredondamento: a
 * diferença fica na última parcela) com vencimentos a cada `intervaloDias`.
 */
export const gerarParcelas = (
  valorTotal: number,
  numeroParcelas: number,
  primeiroVencimento: string,
  intervaloDias = 30
): ParcelaGerada[] => {
  const n = Math.max(1, Math.min(120, Math.floor(Number(numeroParcelas) || 1)));
  const totalCentavos = Math.round((Number(valorTotal) || 0) * 100);
  const base = Math.floor(totalCentavos / n);
  const intervalo = Math.max(0, Math.floor(Number(intervaloDias) || 0));
  return Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    valor: (i === n - 1 ? totalCentavos - base * (n - 1) : base) / 100,
    vencimento: somarDias(primeiroVencimento || hojeISO(), i * intervalo),
  }));
};

export const formatarMoeda = (valor: number): string =>
  (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** AAAA-MM-DD → DD/MM/AAAA */
export const dataBR = (dataISO?: string): string => {
  if (!dataISO) return '—';
  const [a, m, d] = dataISO.substring(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : dataISO;
};

/** Texto curto do parcelamento: "Pix — 3x de R$ 100,00 (a cada 30 dias)". */
export const descreverParcelamento = (
  forma: string | undefined,
  valorTotal: number,
  numeroParcelas: number,
  intervaloDias: number
): string => {
  const n = Math.max(1, Number(numeroParcelas) || 1);
  const rotulo = rotuloFormaPagamento(forma);
  if (n === 1) return `${rotulo} — à vista (${formatarMoeda(valorTotal)})`;
  return `${rotulo} — ${n}x de ${formatarMoeda(valorTotal / n)} (a cada ${intervaloDias || 30} dias)`;
};
