// Textos prontos enviados pelo WhatsApp (link wa.me / api.whatsapp.com):
// ordem de compra ao fornecedor, comprovante de venda e cobrança ao cliente.

import type { ContaPagarReceber, VendaRevenda } from '../types';
import { dataBR, descreverParcelamento, formatarMoeda, hojeISO } from './parcelamento';

interface ItemMensagem {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  subtotal?: number;
}

const linhasItens = (itens: ItemMensagem[]): string =>
  itens
    .map(i => `• ${i.descricao} — ${i.quantidade} ${i.unidade} x ${formatarMoeda(i.precoUnitario)} = ${formatarMoeda(i.subtotal ?? i.quantidade * i.precoUnitario)}`)
    .join('\n');

const situacaoParcela = (c: ContaPagarReceber): string => {
  if (c.status === 'PAGO') return 'PAGO';
  if (c.status === 'CANCELADO') return 'CANCELADO';
  return c.dataVencimento < hojeISO() ? 'VENCIDO' : 'EM ABERTO';
};

export const mensagemOrdemCompra = (p: {
  cooperativa: string;
  numeroOrdem: string;
  fornecedor: string;
  dataEmissao: string;
  dataPrevisaoEntrega?: string;
  itens: ItemMensagem[];
  valorTotal: number;
  formaPagamento?: string;
  numeroParcelas?: number;
  intervaloDias?: number;
  primeiroVencimento?: string;
  observacoes?: string;
}): string => [
  `*ORDEM DE COMPRA ${p.numeroOrdem}*`,
  p.cooperativa,
  '',
  `Fornecedor: ${p.fornecedor}`,
  `Emissão: ${dataBR(p.dataEmissao)}`,
  p.dataPrevisaoEntrega ? `Previsão de entrega: ${dataBR(p.dataPrevisaoEntrega)}` : '',
  '',
  '*Itens:*',
  linhasItens(p.itens),
  '',
  `*Total: ${formatarMoeda(p.valorTotal)}*`,
  `Pagamento: ${descreverParcelamento(p.formaPagamento, p.valorTotal, p.numeroParcelas || 1, p.intervaloDias || 30)}`,
  p.primeiroVencimento ? `1º vencimento: ${dataBR(p.primeiroVencimento)}` : '',
  p.observacoes ? `\nObs.: ${p.observacoes}` : '',
  '',
  'Por favor, confirme o recebimento desta ordem. Obrigado!',
].filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');

export const mensagemComprovanteVenda = (cooperativa: string, venda: VendaRevenda, parcelas: ContaPagarReceber[]): string => {
  const ordenadas = [...parcelas].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  const bruto = venda.itens.reduce((s, i) => s + i.subtotal, 0);
  return [
    `*COMPROVANTE DE VENDA ${venda.numeroVenda}*`,
    cooperativa,
    '',
    `Cliente: ${venda.clienteNome}`,
    `Data: ${dataBR(venda.dataVenda)}`,
    '',
    '*Itens:*',
    linhasItens(venda.itens),
    '',
    venda.desconto ? `Subtotal: ${formatarMoeda(bruto)}\nDesconto: ${formatarMoeda(venda.desconto)}` : '',
    `*Total: ${formatarMoeda(venda.valorTotal)}*`,
    `Pagamento: ${descreverParcelamento(venda.formaPagamento, venda.valorTotal, venda.numeroParcelas, venda.intervaloDias)}`,
    ordenadas.length > 1
      ? '\n*Parcelas:*\n' + ordenadas.map((c, i) => `${i + 1}/${ordenadas.length} — ${formatarMoeda(c.valor)} — venc. ${dataBR(c.dataVencimento)} — ${situacaoParcela(c)}`).join('\n')
      : (ordenadas[0] ? `Situação: ${situacaoParcela(ordenadas[0])}` : ''),
    venda.status === 'CANCELADA' ? '\n*VENDA CANCELADA*' : '',
    '',
    'Obrigado pela preferência!',
  ].filter(Boolean).join('\n');
};

export const mensagemCobranca = (cooperativa: string, clienteNome: string, contas: ContaPagarReceber[]): string => {
  const abertas = contas
    .filter(c => c.status !== 'PAGO' && c.status !== 'CANCELADO')
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  const total = abertas.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  return [
    `Olá, ${clienteNome}! Tudo bem?`,
    '',
    `Aqui é da ${cooperativa}. Seguem os valores em aberto:`,
    '',
    ...abertas.map(c => `• ${c.descricao} — ${formatarMoeda(c.valor)} — venc. ${dataBR(c.dataVencimento)}${c.dataVencimento < hojeISO() ? ' (vencido)' : ''}`),
    '',
    `*Total em aberto: ${formatarMoeda(total)}*`,
    '',
    'Se o pagamento já foi feito, por favor desconsidere esta mensagem e nos envie o comprovante. Obrigado!',
  ].join('\n');
};
