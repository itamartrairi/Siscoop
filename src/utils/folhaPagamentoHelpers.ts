/**
 * Cálculo estimado de descontos de folha de pagamento (INSS, IRPF, FGTS).
 *
 * IMPORTANTE: usa faixas aproximadas conhecidas (referência 2024/2025,
 * já que as faixas de 2026 podem ser reajustadas pelo governo). Os valores
 * calculados aqui são um PONTO DE PARTIDA e continuam totalmente editáveis
 * na tela — a folha oficial deve ser conferida por um contador/profissional
 * de departamento pessoal antes do pagamento.
 */

export interface FaixaProgressiva {
  ate: number; // limite superior da faixa (Infinity para a última)
  aliquota: number; // percentual, ex.: 0.075 = 7,5%
  parcelaDeduzir: number; // valor fixo a deduzir (só usado no IRPF)
}

// Faixas do INSS (contribuição do empregado) — cálculo progressivo por
// faixa, não uma alíquota única sobre o valor total.
const FAIXAS_INSS: FaixaProgressiva[] = [
  { ate: 1412.00, aliquota: 0.075, parcelaDeduzir: 0 },
  { ate: 2666.68, aliquota: 0.09, parcelaDeduzir: 0 },
  { ate: 4000.03, aliquota: 0.12, parcelaDeduzir: 0 },
  { ate: 7786.02, aliquota: 0.14, parcelaDeduzir: 0 }
];
const TETO_INSS = 7786.02;
const TETO_CONTRIBUICAO_INSS = 908.85; // valor máximo de desconto de INSS (teto)

// Faixas do IRPF mensal (aplicadas sobre a base de cálculo = salário bruto
// menos o INSS já descontado).
const FAIXAS_IRPF: FaixaProgressiva[] = [
  { ate: 2259.20, aliquota: 0, parcelaDeduzir: 0 },
  { ate: 2826.65, aliquota: 0.075, parcelaDeduzir: 169.44 },
  { ate: 3751.05, aliquota: 0.15, parcelaDeduzir: 381.44 },
  { ate: 4664.68, aliquota: 0.225, parcelaDeduzir: 662.77 },
  { ate: Infinity, aliquota: 0.275, parcelaDeduzir: 896.00 }
];

export function calcularInss(salarioBruto: number): number {
  if (!salarioBruto || salarioBruto <= 0) return 0;
  const base = Math.min(salarioBruto, TETO_INSS);
  let total = 0;
  let faixaAnterior = 0;
  for (const faixa of FAIXAS_INSS) {
    if (base > faixaAnterior) {
      const valorNaFaixa = Math.min(base, faixa.ate) - faixaAnterior;
      total += valorNaFaixa * faixa.aliquota;
    }
    faixaAnterior = faixa.ate;
  }
  return Number(Math.min(total, TETO_CONTRIBUICAO_INSS).toFixed(2));
}

export function calcularIrpf(salarioBruto: number, inss: number): number {
  if (!salarioBruto || salarioBruto <= 0) return 0;
  const base = Math.max(0, salarioBruto - inss);
  const faixa = FAIXAS_IRPF.find(f => base <= f.ate) || FAIXAS_IRPF[FAIXAS_IRPF.length - 1];
  const valor = base * faixa.aliquota - faixa.parcelaDeduzir;
  return Number(Math.max(0, valor).toFixed(2));
}

export function calcularFgts(salarioBruto: number): number {
  if (!salarioBruto || salarioBruto <= 0) return 0;
  return Number((salarioBruto * 0.08).toFixed(2));
}

export function calcularDescontosFolha(salarioBruto: number) {
  const inss = calcularInss(salarioBruto);
  const irpf = calcularIrpf(salarioBruto, inss);
  const fgts = calcularFgts(salarioBruto);
  return { inss, irpf, fgts };
}
