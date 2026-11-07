import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import { FileDown, Filter, RotateCcw, FileText } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { ContaPagarReceber, OrdemCompra, VendaRevenda } from '../types';
import { dataBR, formatarMoeda, hojeISO, rotuloFormaPagamento } from '../utils/parcelamento';
import { ehContaDeImposto, nomeTributo } from '../utils/impostosRevenda';

/**
 * Relatórios em PDF de Contas a Pagar e Receber, Compras (ordens de compra) e
 * Vendas (revenda de produtos) e Impostos pagos pela cooperativa, com filtros
 * de período (intervalo de datas, mês e ano), cliente, fornecedor e status.
 * PDF em A4 retrato.
 */

type TipoRelatorio = 'CONTAS' | 'COMPRAS' | 'VENDAS' | 'IMPOSTOS';
type BaseDataContas = 'VENCIMENTO' | 'EMISSAO' | 'PAGAMENTO';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS_CONTAS = [
  { v: 'TODOS', r: 'Todos' },
  { v: 'ABERTO', r: 'Em aberto (inclui vencidas)' },
  { v: 'VENCIDO', r: 'Vencidas' },
  { v: 'PAGO', r: 'Pagas / Recebidas' },
  { v: 'CANCELADO', r: 'Canceladas' },
];
const STATUS_COMPRAS = [
  { v: 'TODOS', r: 'Todos' },
  { v: 'EM_ABERTO', r: 'Em aberto' },
  { v: 'APROVADA', r: 'Aprovada' },
  { v: 'ENTREGUE', r: 'Entregue' },
  { v: 'CANCELADA', r: 'Cancelada' },
  { v: 'PAGTO_ABERTO', r: 'Com pagamento em aberto' },
  { v: 'PAGTO_QUITADO', r: 'Pagamento quitado' },
];
const STATUS_VENDAS = [
  { v: 'TODOS', r: 'Todos' },
  { v: 'RECEBER_ABERTO', r: 'Concluída — a receber em aberto' },
  { v: 'RECEBIDA', r: 'Concluída — recebida' },
  { v: 'CONCLUIDA', r: 'Concluídas (todas)' },
  { v: 'CANCELADA', r: 'Canceladas' },
];

const norm = (s?: string) => (s || '').trim().toLowerCase();

interface Coluna { titulo: string; largura: number; direita?: boolean }

interface Relatorio {
  titulo: string;
  colunas: Coluna[];
  linhas: string[][];
  totais: [string, string][];
}

export const RelatoriosPdfTab: React.FC<{ tipoInicial?: TipoRelatorio; tiposPermitidos?: TipoRelatorio[] }> = ({
  tipoInicial = 'CONTAS',
  tiposPermitidos = ['CONTAS', 'COMPRAS', 'VENDAS', 'IMPOSTOS'],
}) => {
  const { contasPagarReceber, ordensCompra, vendasRevenda, clientes, fornecedores, currentTenant } = useCoop();

  const [tipo, setTipo] = useState<TipoRelatorio>(tipoInicial);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [mes, setMes] = useState('TODOS');
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [clienteId, setClienteId] = useState('TODOS');
  const [fornecedorId, setFornecedorId] = useState('TODOS');
  const [status, setStatus] = useState('TODOS');
  const [tipoConta, setTipoConta] = useState<'TODOS' | 'PAGAR' | 'RECEBER'>('TODOS');
  const [baseData, setBaseData] = useState<BaseDataContas>('VENCIMENTO');

  const hoje = hojeISO();
  const cliente = clientes.find(c => c.id === clienteId);
  const fornecedor = fornecedores.find(f => f.id === fornecedorId);

  const anos = useMemo(() => {
    const todos = new Set<string>([String(new Date().getFullYear())]);
    contasPagarReceber.forEach(c => [c.dataVencimento, c.dataEmissao, c.dataPagamento].forEach(d => d && todos.add(d.slice(0, 4))));
    ordensCompra.forEach(o => o.dataEmissao && todos.add(o.dataEmissao.slice(0, 4)));
    vendasRevenda.forEach(v => v.dataVenda && todos.add(v.dataVenda.slice(0, 4)));
    return [...todos].filter(a => /^\d{4}$/.test(a)).sort((a, b) => b.localeCompare(a));
  }, [contasPagarReceber, ordensCompra, vendasRevenda]);

  const naData = (data?: string) => {
    if (!data) return !dataInicio && !dataFim && mes === 'TODOS' && ano === 'TODOS';
    const d = data.slice(0, 10);
    if (dataInicio && d < dataInicio) return false;
    if (dataFim && d > dataFim) return false;
    if (ano !== 'TODOS' && d.slice(0, 4) !== ano) return false;
    if (mes !== 'TODOS' && d.slice(5, 7) !== mes) return false;
    return true;
  };

  const situacaoConta = (c: ContaPagarReceber) =>
    c.status === 'PAGO' ? 'PAGO' : c.status === 'CANCELADO' ? 'CANCELADO' : c.dataVencimento && c.dataVencimento < hoje ? 'VENCIDO' : 'ABERTO';
  const rotuloSituacao = (c: ContaPagarReceber) => {
    const s = situacaoConta(c);
    return s === 'PAGO' ? (c.tipo === 'RECEBER' ? 'Recebido' : 'Pago') : s === 'VENCIDO' ? 'Vencido' : s === 'CANCELADO' ? 'Cancelado' : 'Em aberto';
  };

  // Vínculos para filtrar títulos por cliente / fornecedor
  const idsContasCliente = useMemo(() => new Set(vendasRevenda.filter(v => v.clienteId === clienteId).flatMap(v => v.contasReceberIds || [])), [vendasRevenda, clienteId]);
  const idsContasFornecedor = useMemo(() => new Set(ordensCompra.filter(o => o.fornecedorId === fornecedorId).flatMap(o => o.contasPagarIds || [])), [ordensCompra, fornecedorId]);

  const parcelasOrdem = (o: OrdemCompra) => contasPagarReceber.filter(c => (o.contasPagarIds || []).includes(c.id));
  const parcelasVenda = (v: VendaRevenda) => contasPagarReceber.filter(c => (v.contasReceberIds || []).includes(c.id));
  const abertoDe = (lista: ContaPagarReceber[]) => lista.filter(c => c.status !== 'PAGO' && c.status !== 'CANCELADO').reduce((s, c) => s + (Number(c.valor) || 0), 0);

  const relatorio: Relatorio = useMemo(() => {
    if (tipo === 'CONTAS') {
      const lista = contasPagarReceber
        .filter(c => {
          const data = baseData === 'EMISSAO' ? c.dataEmissao : baseData === 'PAGAMENTO' ? c.dataPagamento : c.dataVencimento;
          if (!naData(data)) return false;
          if (tipoConta !== 'TODOS' && c.tipo !== tipoConta) return false;
          if (status !== 'TODOS') {
            const s = situacaoConta(c);
            if (status === 'ABERTO' ? !(s === 'ABERTO' || s === 'VENCIDO') : s !== status) return false;
          }
          if (cliente && !(idsContasCliente.has(c.id) || norm(c.pessoaNome) === norm(cliente.nome))) return false;
          if (fornecedor && !(idsContasFornecedor.has(c.id) || [fornecedor.razaoSocial, fornecedor.nomeFantasia].some(n => n && norm(n) === norm(c.pessoaNome)))) return false;
          return true;
        })
        .sort((a, b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || ''));
      const soma = (f: (c: ContaPagarReceber) => boolean) => lista.filter(f).reduce((s, c) => s + (Number(c.valor) || 0), 0);
      return {
        titulo: 'Relatório de Contas a Pagar e Receber',
        colunas: [
          { titulo: 'Vencimento', largura: 20 }, { titulo: 'Tipo', largura: 16 }, { titulo: 'Descrição', largura: 78 },
          { titulo: 'Pessoa / Favorecido', largura: 52 }, { titulo: 'Categoria', largura: 36 }, { titulo: 'Situação', largura: 20 },
          { titulo: 'Pago em', largura: 20 }, { titulo: 'Valor', largura: 25, direita: true },
        ],
        linhas: lista.map(c => [
          dataBR(c.dataVencimento), c.tipo === 'RECEBER' ? 'Receber' : 'Pagar', c.descricao, c.pessoaNome,
          [c.categoria, c.subcategoria].filter(Boolean).join(' — '), rotuloSituacao(c), c.dataPagamento ? dataBR(c.dataPagamento) : '—', formatarMoeda(c.valor),
        ]),
        totais: [
          ['Títulos', String(lista.length)],
          ['A pagar em aberto', formatarMoeda(soma(c => c.tipo === 'PAGAR' && c.status !== 'PAGO' && c.status !== 'CANCELADO'))],
          ['Pago', formatarMoeda(soma(c => c.tipo === 'PAGAR' && c.status === 'PAGO'))],
          ['A receber em aberto', formatarMoeda(soma(c => c.tipo === 'RECEBER' && c.status !== 'PAGO' && c.status !== 'CANCELADO'))],
          ['Recebido', formatarMoeda(soma(c => c.tipo === 'RECEBER' && c.status === 'PAGO'))],
          ['Vencido (em aberto)', formatarMoeda(soma(c => situacaoConta(c) === 'VENCIDO'))],
        ],
      };
    }

    if (tipo === 'IMPOSTOS') {
      const lista = contasPagarReceber
        .filter(c => {
          if (c.tipo !== 'PAGAR' || !ehContaDeImposto(c)) return false;
          const data = baseData === 'EMISSAO' ? c.dataEmissao : baseData === 'PAGAMENTO' ? c.dataPagamento : c.dataVencimento;
          if (!naData(data)) return false;
          if (status !== 'TODOS') {
            const s = situacaoConta(c);
            if (status === 'ABERTO' ? !(s === 'ABERTO' || s === 'VENCIDO') : s !== status) return false;
          }
          return true;
        })
        .sort((a, b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || ''));
      const soma = (f: (c: ContaPagarReceber) => boolean) => lista.filter(f).reduce((s, c) => s + (Number(c.valor) || 0), 0);
      const pagoPorTributo = new Map<string, number>();
      lista.filter(c => c.status === 'PAGO').forEach(c => {
        const t = nomeTributo(c);
        pagoPorTributo.set(t, (pagoPorTributo.get(t) || 0) + (Number(c.valor) || 0));
      });
      // Impostos calculados nas vendas do período (data da venda)
      const vendasPeriodo = vendasRevenda.filter(v => v.status !== 'CANCELADA' && v.impostos && naData(v.dataVenda));
      const apurado = (k: 'icms' | 'fecop' | 'pis' | 'cofins' | 'irpj' | 'csll' | 'das') => vendasPeriodo.reduce((s, v) => s + (Number(v.impostos?.[k]) || 0), 0);
      const apurados: [string, number][] = ([
        ['ICMS', apurado('icms')], ['FECOP', apurado('fecop')], ['PIS', apurado('pis')], ['COFINS', apurado('cofins')],
        ['IRPJ', apurado('irpj')], ['CSLL', apurado('csll')], ['DAS', apurado('das')],
      ] as [string, number][]).filter(([, v]) => v > 0);
      return {
        titulo: 'Relatório de Impostos Pagos pela Cooperativa',
        colunas: [
          { titulo: 'Vencimento', largura: 20 }, { titulo: 'Tributo', largura: 18 }, { titulo: 'Descrição', largura: 62 },
          { titulo: 'Órgão', largura: 36 }, { titulo: 'Situação', largura: 18 }, { titulo: 'Pago em', largura: 20 },
          { titulo: 'Valor', largura: 24, direita: true },
        ],
        linhas: lista.map(c => [
          dataBR(c.dataVencimento), nomeTributo(c), c.descricao, c.pessoaNome, rotuloSituacao(c),
          c.dataPagamento ? dataBR(c.dataPagamento) : '—', formatarMoeda(c.valor),
        ]),
        totais: [
          ['Guias / títulos', String(lista.length)],
          ['Total pago', formatarMoeda(soma(c => c.status === 'PAGO'))],
          ['Em aberto', formatarMoeda(soma(c => c.status !== 'PAGO' && c.status !== 'CANCELADO'))],
          ['Vencido (em aberto)', formatarMoeda(soma(c => situacaoConta(c) === 'VENCIDO'))],
          ...[...pagoPorTributo.entries()].sort((a, b) => b[1] - a[1]).map(([t, v]) => [`Pago — ${t}`, formatarMoeda(v)] as [string, string]),
          ...apurados.map(([t, v]) => [`Apurado nas vendas — ${t}`, formatarMoeda(v)] as [string, string]),
        ],
      };
    }

    if (tipo === 'COMPRAS') {
      const lista = ordensCompra
        .filter(o => {
          if (!naData(o.dataEmissao)) return false;
          if (fornecedor && o.fornecedorId !== fornecedor.id && norm(o.fornecedorNome) !== norm(fornecedor.razaoSocial)) return false;
          if (status === 'PAGTO_ABERTO') return o.status !== 'CANCELADA' && abertoDe(parcelasOrdem(o)) > 0;
          if (status === 'PAGTO_QUITADO') return o.status !== 'CANCELADA' && parcelasOrdem(o).length > 0 && abertoDe(parcelasOrdem(o)) === 0;
          if (status !== 'TODOS' && o.status !== status) return false;
          return true;
        })
        .sort((a, b) => (a.dataEmissao || '').localeCompare(b.dataEmissao || ''));
      const validas = lista.filter(o => o.status !== 'CANCELADA');
      return {
        titulo: 'Relatório de Compras (Ordens de Compra)',
        colunas: [
          { titulo: 'Emissão', largura: 20 }, { titulo: 'Nº OC', largura: 22 }, { titulo: 'Fornecedor', largura: 60 },
          { titulo: 'Tipo', largura: 18 }, { titulo: 'Itens', largura: 62 }, { titulo: 'Pagamento', largura: 30 },
          { titulo: 'Status', largura: 20 }, { titulo: 'Em aberto', largura: 25, direita: true }, { titulo: 'Total', largura: 25, direita: true },
        ],
        linhas: lista.map(o => [
          dataBR(o.dataEmissao), o.numeroOrdem, o.fornecedorNome, o.tipoCompra === 'REVENDA' ? 'Revenda' : 'Insumos',
          (o.itens || []).map(i => `${i.quantidade} ${i.unidade} ${i.descricao}`).join('; '),
          o.formaPagamento ? `${rotuloFormaPagamento(o.formaPagamento)} ${(o.numeroParcelas || 1) > 1 ? `${o.numeroParcelas}x` : 'à vista'}` : (o.condicaoPagamento || '—'),
          o.status, formatarMoeda(abertoDe(parcelasOrdem(o))), formatarMoeda(o.valorTotal),
        ]),
        totais: [
          ['Ordens', String(lista.length)],
          ['Total comprado (exceto canceladas)', formatarMoeda(validas.reduce((s, o) => s + (Number(o.valorTotal) || 0), 0))],
          ['Insumos', formatarMoeda(validas.filter(o => o.tipoCompra !== 'REVENDA').reduce((s, o) => s + (Number(o.valorTotal) || 0), 0))],
          ['Revenda', formatarMoeda(validas.filter(o => o.tipoCompra === 'REVENDA').reduce((s, o) => s + (Number(o.valorTotal) || 0), 0))],
          ['A pagar em aberto', formatarMoeda(validas.reduce((s, o) => s + abertoDe(parcelasOrdem(o)), 0))],
        ],
      };
    }

    const lista = vendasRevenda
      .filter(v => {
        if (!naData(v.dataVenda)) return false;
        if (cliente && v.clienteId !== cliente.id) return false;
        if (fornecedor && !v.itens.some(i => i.fornecedorId === fornecedor.id)) return false;
        if (status === 'CANCELADA') return v.status === 'CANCELADA';
        if (status === 'CONCLUIDA') return v.status !== 'CANCELADA';
        if (status === 'RECEBER_ABERTO') return v.status !== 'CANCELADA' && abertoDe(parcelasVenda(v)) > 0;
        if (status === 'RECEBIDA') return v.status !== 'CANCELADA' && abertoDe(parcelasVenda(v)) === 0;
        return true;
      })
      .sort((a, b) => (a.dataVenda || '').localeCompare(b.dataVenda || ''));
    const validas = lista.filter(v => v.status !== 'CANCELADA');
    const totalVendas = validas.reduce((s, v) => s + (Number(v.valorTotal) || 0), 0);
    const aberto = validas.reduce((s, v) => s + abertoDe(parcelasVenda(v)), 0);
    const custo = validas.reduce((s, v) => s + v.itens.reduce((x, i) => x + (Number(i.custoUnitario) || 0) * (Number(i.quantidade) || 0), 0), 0);
    return {
      titulo: 'Relatório de Vendas (Revenda de Produtos)',
      colunas: [
        { titulo: 'Data', largura: 20 }, { titulo: 'Nº Venda', largura: 24 }, { titulo: 'Cliente', largura: 58 },
        { titulo: 'Produtos', largura: 75 }, { titulo: 'Pagamento', largura: 30 }, { titulo: 'Status', largura: 22 },
        { titulo: 'A receber', largura: 25, direita: true }, { titulo: 'Total', largura: 25, direita: true },
      ],
      linhas: lista.map(v => [
        dataBR(v.dataVenda), v.numeroVenda, v.clienteNome,
        v.itens.map(i => `${i.quantidade} ${i.unidade} ${i.descricao}`).join('; '),
        `${rotuloFormaPagamento(v.formaPagamento)} ${v.numeroParcelas > 1 ? `${v.numeroParcelas}x` : 'à vista'}`,
        v.status === 'CANCELADA' ? 'Cancelada' : abertoDe(parcelasVenda(v)) > 0 ? 'Em aberto' : 'Recebida',
        formatarMoeda(v.status === 'CANCELADA' ? 0 : abertoDe(parcelasVenda(v))), formatarMoeda(v.valorTotal),
      ]),
      totais: [
        ['Vendas', String(lista.length)],
        ['Total vendido (exceto canceladas)', formatarMoeda(totalVendas)],
        ['Recebido', formatarMoeda(totalVendas - aberto)],
        ['A receber em aberto', formatarMoeda(aberto)],
        ['Custo dos produtos', formatarMoeda(custo)],
        ['Margem bruta', formatarMoeda(totalVendas - custo)],
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, contasPagarReceber, ordensCompra, vendasRevenda, dataInicio, dataFim, mes, ano, clienteId, fornecedorId, status, tipoConta, baseData, idsContasCliente, idsContasFornecedor]);

  const descricaoFiltros = (): string => {
    const partes: string[] = [];
    if (dataInicio || dataFim) partes.push(`Período: ${dataInicio ? dataBR(dataInicio) : 'início'} a ${dataFim ? dataBR(dataFim) : 'hoje'}`);
    if (mes !== 'TODOS') partes.push(`Mês: ${MESES[Number(mes) - 1]}`);
    if (ano !== 'TODOS') partes.push(`Ano: ${ano}`);
    if (tipo === 'CONTAS' || tipo === 'IMPOSTOS') partes.push(`Data base: ${baseData === 'EMISSAO' ? 'emissão' : baseData === 'PAGAMENTO' ? 'pagamento' : 'vencimento'}`);
    if (tipo === 'CONTAS' && tipoConta !== 'TODOS') partes.push(tipoConta === 'PAGAR' ? 'Somente a pagar' : 'Somente a receber');
    if (cliente) partes.push(`Cliente: ${cliente.nome}`);
    if (fornecedor) partes.push(`Fornecedor: ${fornecedor.nomeFantasia || fornecedor.razaoSocial}`);
    const listaStatus = tipo === 'CONTAS' || tipo === 'IMPOSTOS' ? STATUS_CONTAS : tipo === 'COMPRAS' ? STATUS_COMPRAS : STATUS_VENDAS;
    if (status !== 'TODOS') partes.push(`Status: ${listaStatus.find(s => s.v === status)?.r || status}`);
    return partes.length ? partes.join(' · ') : 'Sem filtros (todos os registros)';
  };

  const limpar = () => {
    setDataInicio(''); setDataFim(''); setMes('TODOS'); setAno(String(new Date().getFullYear()));
    setClienteId('TODOS'); setFornecedorId('TODOS'); setStatus('TODOS'); setTipoConta('TODOS'); setBaseData('VENCIMENTO');
  };

  const gerarPdf = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const largura = pdf.internal.pageSize.getWidth();
    const altura = pdf.internal.pageSize.getHeight();
    const margem = 10;
    const larguraUtil = largura - margem * 2;
    const somaCol = relatorio.colunas.reduce((s, c) => s + c.largura, 0);
    const escala = larguraUtil / somaCol;
    const cols = relatorio.colunas.map(c => ({ ...c, largura: c.largura * escala }));
    const alturaLinha = 6;

    const cortar = (texto: string, max: number) => {
      let t = texto || '';
      if (pdf.getTextWidth(t) <= max) return t;
      while (t.length > 1 && pdf.getTextWidth(`${t}…`) > max) t = t.slice(0, -1);
      return `${t}…`;
    };

    const cabecalho = (primeira: boolean) => {
      let y = margem + 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(primeira ? 13 : 10);
      pdf.text(currentTenant?.razaoSocial || currentTenant?.name || 'Cooperativa', margem, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, largura - margem, y, { align: 'right' });
      if (primeira) {
        y += 5;
        if (currentTenant?.cnpj) { pdf.text(`CNPJ: ${currentTenant.cnpj}`, margem, y); y += 5; }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(relatorio.titulo, margem, y + 2);
        y += 7;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const filtros = pdf.splitTextToSize(`Filtros: ${descricaoFiltros()}`, larguraUtil) as string[];
        pdf.text(filtros, margem, y);
        y += filtros.length * 3.8 + 2;
      } else {
        y += 4;
      }
      // Cabeçalho da tabela
      pdf.setFillColor(15, 118, 110);
      pdf.rect(margem, y, larguraUtil, alturaLinha, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      let x = margem;
      cols.forEach(c => {
        pdf.text(cortar(c.titulo, c.largura - 2), c.direita ? x + c.largura - 1 : x + 1, y + 4, c.direita ? { align: 'right' } : undefined);
        x += c.largura;
      });
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'normal');
      return y + alturaLinha;
    };

    let y = cabecalho(true);
    pdf.setFontSize(7);
    const alturaTexto = 3.1;
    relatorio.linhas.forEach((linha, idx) => {
      // Quebra o texto de cada célula em até 3 linhas (retrato tem colunas estreitas)
      const celulas = cols.map((c, i) => {
        const partes = pdf.splitTextToSize(String(linha[i] ?? ''), c.largura - 2) as string[];
        return partes.length > 3 ? [...partes.slice(0, 2), cortar(partes.slice(2).join(' '), c.largura - 2)] : partes;
      });
      const alturaRow = Math.max(1, ...celulas.map(l => l.length)) * alturaTexto + 2.6;
      if (y + alturaRow > altura - 14) {
        pdf.addPage();
        y = cabecalho(false);
        pdf.setFontSize(7);
      }
      if (idx % 2 === 1) {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(margem, y, larguraUtil, alturaRow, 'F');
      }
      let x = margem;
      cols.forEach((c, i) => {
        pdf.text(celulas[i], c.direita ? x + c.largura - 1 : x + 1, y + 3.6, c.direita ? { align: 'right' } : undefined);
        x += c.largura;
      });
      y += alturaRow;
    });
    if (!relatorio.linhas.length) {
      pdf.setFontSize(9);
      pdf.text('Nenhum registro encontrado para os filtros selecionados.', margem, y + 6);
      y += 8;
    }

    // Resumo / totais
    const alturaResumo = 8 + relatorio.totais.length * 5;
    if (y + alturaResumo > altura - 14) { pdf.addPage(); y = margem + 4; } else { y += 6; }
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margem, y, largura - margem, y);
    y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Resumo', margem, y);
    pdf.setFontSize(9);
    relatorio.totais.forEach(([rotulo, valor]) => {
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text(rotulo, margem, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(valor, margem + 95, y, { align: 'right' });
    });

    // Rodapé com numeração
    const paginas = pdf.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${relatorio.titulo} — página ${p} de ${paginas}`, largura - margem, altura - 6, { align: 'right' });
    }

    const nome = `${tipo === 'CONTAS' ? 'contas-pagar-receber' : tipo === 'COMPRAS' ? 'compras' : tipo === 'VENDAS' ? 'vendas' : 'impostos'}-${hojeISO()}.pdf`;
    pdf.save(nome);
  };

  const listaStatus = tipo === 'CONTAS' || tipo === 'IMPOSTOS' ? STATUS_CONTAS : tipo === 'COMPRAS' ? STATUS_COMPRAS : STATUS_VENDAS;
  const sel = 'p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white';
  const lbl = 'block text-[10px] font-bold text-slate-500 mb-1';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-black text-slate-900">Relatórios em PDF</h2>
            <p className="text-xs text-slate-500">Contas a pagar e receber, compras e vendas, com filtros de período, pessoa e status.</p>
          </div>
        </div>
        <button onClick={gerarPdf} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2">
          <FileDown className="w-4 h-4" /> Gerar PDF
        </button>
      </div>

      {tiposPermitidos.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {tiposPermitidos.map(t => (
            <button
              key={t}
              onClick={() => { setTipo(t); setStatus('TODOS'); }}
              className={`px-3 py-2 rounded-xl border text-xs font-bold ${tipo === t ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {t === 'CONTAS' ? 'Contas a Pagar e Receber' : t === 'COMPRAS' ? 'Compras' : t === 'VENDAS' ? 'Vendas' : 'Impostos'}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Filter className="w-3.5 h-3.5" /> Filtros</div>
        {(tipo === 'CONTAS' || tipo === 'IMPOSTOS') && (
          <div>
            <label className={lbl}>Data base</label>
            <select value={baseData} onChange={e => setBaseData(e.target.value as BaseDataContas)} className={sel}>
              <option value="VENCIMENTO">Vencimento</option>
              <option value="EMISSAO">Emissão</option>
              <option value="PAGAMENTO">Pagamento</option>
            </select>
          </div>
        )}
        <div><label className={lbl}>De</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={sel} /></div>
        <div><label className={lbl}>Até</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={sel} /></div>
        <div>
          <label className={lbl}>Mês</label>
          <select value={mes} onChange={e => setMes(e.target.value)} className={sel}>
            <option value="TODOS">Todos</option>
            {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Ano</label>
          <select value={ano} onChange={e => setAno(e.target.value)} className={sel}>
            <option value="TODOS">Todos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {tipo === 'CONTAS' && (
          <div>
            <label className={lbl}>Tipo</label>
            <select value={tipoConta} onChange={e => setTipoConta(e.target.value as 'TODOS' | 'PAGAR' | 'RECEBER')} className={sel}>
              <option value="TODOS">Pagar e Receber</option>
              <option value="PAGAR">A Pagar</option>
              <option value="RECEBER">A Receber</option>
            </select>
          </div>
        )}
        {(tipo === 'CONTAS' || tipo === 'VENDAS') && (
          <div>
            <label className={lbl}>Cliente</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} className={`${sel} max-w-[200px]`}>
              <option value="TODOS">Todos</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}
        {tipo !== 'IMPOSTOS' && (
          <div>
            <label className={lbl}>Fornecedor</label>
            <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} className={`${sel} max-w-[200px]`}>
              <option value="TODOS">Todos</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nomeFantasia || f.razaoSocial}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={lbl}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={sel}>
            {listaStatus.map(s => <option key={s.v} value={s.v}>{s.r}</option>)}
          </select>
        </div>
        <button onClick={limpar} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl">
          <RotateCcw className="w-3.5 h-3.5" /> Limpar
        </button>
      </div>

      <div className="text-[11px] text-slate-500">{descricaoFiltros()}</div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {relatorio.totais.map(([rotulo, valor]) => (
          <div key={rotulo} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold uppercase text-slate-500">{rotulo}</div>
            <div className="text-sm font-black text-slate-800">{valor}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>{relatorio.colunas.map(c => <th key={c.titulo} className={`px-2 py-2 font-bold whitespace-nowrap ${c.direita ? 'text-right' : 'text-left'}`}>{c.titulo}</th>)}</tr>
          </thead>
          <tbody>
            {relatorio.linhas.slice(0, 300).map((l, i) => (
              <tr key={i} className="border-t border-slate-100">
                {l.map((v, j) => <td key={j} className={`px-2 py-1.5 ${relatorio.colunas[j]?.direita ? 'text-right whitespace-nowrap' : ''}`}>{v}</td>)}
              </tr>
            ))}
            {relatorio.linhas.length === 0 && (
              <tr><td colSpan={relatorio.colunas.length} className="px-2 py-6 text-center text-slate-400">Nenhum registro encontrado para os filtros selecionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {relatorio.linhas.length > 300 && <div className="text-[11px] text-slate-500">Mostrando 300 de {relatorio.linhas.length} linhas na tela — o PDF inclui todas.</div>}
    </div>
  );
};
