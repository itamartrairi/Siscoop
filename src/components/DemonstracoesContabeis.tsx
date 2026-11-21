import React, { useMemo, useState } from 'react';
import { FileDown, ChevronRight, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import jsPDF from 'jspdf';
import { useCoop } from '../context/CoopContext';
import { PlanoContaContabil } from '../types';
import { montarResultadoCooperativa, rubricasResultado, type RegimeResultado } from '../data/rubricasCooperativa';

/**
 * Demonstrações do SisCont calculadas a partir dos lançamentos contábeis:
 * - Balancete de Verificação (saldo anterior, débitos, créditos e saldo atual,
 *   com as contas sintéticas totalizando as analíticas);
 * - Balanço Patrimonial (Ativo × Passivo + Patrimônio Líquido, com comparativo);
 * - Demonstração de Sobras ou Perdas (ato cooperativo × ato não cooperativo).
 *
 * Convenção interna: saldo > 0 é devedor, saldo < 0 é credor.
 */

type Modo = 'balancete' | 'balanco' | 'dsp';

const moeda = (v: number) =>
  (Math.abs(v) < 0.005 ? 0 : v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Valor com indicação D/C (balancete). */
const dc = (saldo: number) => (Math.abs(saldo) < 0.005 ? '0,00' : `${moeda(Math.abs(saldo))} ${saldo > 0 ? 'D' : 'C'}`);

/** Valor com parênteses quando negativo (balanço e DSP). */
const valorDemo = (v: number) => (Math.abs(v) < 0.005 ? '-' : v < 0 ? `(${moeda(-v)})` : moeda(v));

const hoje = () => new Date().toISOString().split('T')[0];
const inicioDoAno = (data: string) => `${data.slice(0, 4)}-01-01`;
const fimDoAnoAnterior = (data: string) => `${Number(data.slice(0, 4)) - 1}-12-31`;
const dataBR = (d: string) => (d ? d.split('-').reverse().join('/') : '');

interface Movimento {
  anterior: number;
  debitos: number;
  creditos: number;
}

/** Soma os lançamentos por conta analítica e propaga para as contas pai. */
function calcularSaldos(
  plano: PlanoContaContabil[],
  lancamentos: any[],
  inicio: string | null,
  fim: string
): { porCodigo: Map<string, Movimento>; naoEncontradas: Map<string, Movimento> } {
  const porCodigo = new Map<string, Movimento>();
  const naoEncontradas = new Map<string, Movimento>();
  const contas = new Map(plano.map(c => [c.codigo, c]));
  const paiDe = (codigo: string) => {
    const conta = contas.get(codigo);
    return conta?.contaPaiId ? contas.get(conta.contaPaiId)?.codigo || conta.contaPaiId : undefined;
  };
  const somar = (codigo: string | undefined, campo: keyof Movimento, valor: number) => {
    if (!codigo || !valor) return;
    if (!contas.has(codigo)) {
      const m = naoEncontradas.get(codigo) || { anterior: 0, debitos: 0, creditos: 0 };
      m[campo] += valor;
      naoEncontradas.set(codigo, m);
      return;
    }
    let atual: string | undefined = codigo;
    const vistos = new Set<string>();
    while (atual && contas.has(atual) && !vistos.has(atual)) {
      vistos.add(atual);
      const m = porCodigo.get(atual) || { anterior: 0, debitos: 0, creditos: 0 };
      m[campo] += valor;
      porCodigo.set(atual, m);
      atual = paiDe(atual);
    }
  };
  for (const l of lancamentos) {
    const data = String(l.data || '').slice(0, 10);
    if (!data || data > fim) continue;
    const valor = Number(l.valor) || 0;
    const deb = l.contaDebitoCodigo || l.contaDebito;
    const cred = l.contaCreditoCodigo || l.contaCredito;
    if (inicio && data < inicio) {
      somar(deb, 'anterior', valor);
      somar(cred, 'anterior', -valor);
    } else {
      somar(deb, 'debitos', valor);
      somar(cred, 'creditos', valor);
    }
  }
  return { porCodigo, naoEncontradas };
}

const saldoFinal = (m?: Movimento) => (m ? m.anterior + m.debitos - m.creditos : 0);

/** Gera um PDF simples em tabela, com quebra de página. */
export function exportarPdf(titulo: string, subtitulo: string, colunas: string[], larguras: number[], linhas: { cels: string[]; negrito?: boolean; recuo?: number }[], nomeArquivo: string, cooperativa?: string, colunaDescricao = colunas.length === 2 ? 0 : 1) {
  const doc = new jsPDF({ orientation: colunas.length > 4 || colunaDescricao === 0 && colunas.length >= 4 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  let y = 14;
  const cabecalho = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(cooperativa || 'Cooperativa', 10, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(titulo, 10, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(subtitulo, 10, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    let x = 10;
    colunas.forEach((c, i) => {
      const alinhaDireita = i > colunaDescricao;
      doc.text(c, alinhaDireita ? x + larguras[i] - 1 : x, y, alinhaDireita ? { align: 'right' } : undefined);
      x += larguras[i];
    });
    y += 2;
    doc.line(10, y, largura - 10, y);
    y += 4;
  };
  cabecalho();
  for (const linha of linhas) {
    const ajustarFonte = () => {
      doc.setFont('helvetica', linha.negrito ? 'bold' : 'normal');
      doc.setFontSize(8);
    };
    ajustarFonte();
    const recuo = (linha.recuo || 0) * 3;
    const descricao: string[] = doc.splitTextToSize(linha.cels[colunaDescricao], larguras[colunaDescricao] - 2 - recuo);
    const alturaLinha = Math.max(5, descricao.length * 3.5 + 1.5);
    if (y + alturaLinha > altura - 8) {
      doc.addPage();
      y = 14;
      cabecalho();
      ajustarFonte();
    }
    let x = 10;
    linha.cels.forEach((c, i) => {
      if (i === colunaDescricao) doc.text(descricao, x + recuo, y, { lineHeightFactor: 1.24 });
      else if (i > colunaDescricao) doc.text(c, x + larguras[i] - 1, y, { align: 'right' });
      else doc.text(c, x, y);
      x += larguras[i];
    });
    y += alturaLinha;
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado pelo Siscoop em ${new Date().toLocaleString('pt-BR')}`, 10, altura - 6);
  doc.save(nomeArquivo);
}

export const DemonstracoesContabeis: React.FC<{ modo: Modo }> = ({ modo }) => {
  const { planoContas, lancamentosContabeis, contasPagarReceber, currentTenant } = useCoop();
  const [regime, setRegime] = useState<RegimeResultado>('competencia');
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [simularTributos, setSimularTributos] = useState(false);
  const [percentualOutrosFundos, setPercentualOutrosFundos] = useState(0);
  const [dataFim, setDataFim] = useState(hoje());
  const [dataInicio, setDataInicio] = useState(inicioDoAno(hoje()));
  const [mostrarZeradas, setMostrarZeradas] = useState(false);
  const [nivelMaximo, setNivelMaximo] = useState(modo === 'balanco' ? 4 : 5);
  const [comparativo, setComparativo] = useState(true);

  const plano: PlanoContaContabil[] = useMemo(
    () =>
      [...(planoContas || [])]
        .filter((c: PlanoContaContabil) => c.ativo !== false)
        .sort((a: PlanoContaContabil, b: PlanoContaContabil) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0)),
    [planoContas]
  );
  const lancamentos: any[] = lancamentosContabeis || [];
  const nomeCoop: string = currentTenant?.razaoSocial || currentTenant?.name || 'Cooperativa';

  const periodo = useMemo(() => calcularSaldos(plano, lancamentos, dataInicio, dataFim), [plano, lancamentos, dataInicio, dataFim]);
  const acumulado = useMemo(() => calcularSaldos(plano, lancamentos, null, dataFim), [plano, lancamentos, dataFim]);
  const acumuladoAnterior = useMemo(
    () => calcularSaldos(plano, lancamentos, null, fimDoAnoAnterior(dataFim)),
    [plano, lancamentos, dataFim]
  );

  const filtros = (
    <div className="flex flex-wrap items-end gap-3 text-xs">
      {modo !== 'balanco' && (
        <div>
          <label className="block font-bold text-slate-600 mb-1">De</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="p-2 border border-slate-200 rounded-xl" />
        </div>
      )}
      <div>
        <label className="block font-bold text-slate-600 mb-1">{modo === 'balanco' ? 'Posição em' : 'Até'}</label>
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="p-2 border border-slate-200 rounded-xl" />
      </div>
      {modo !== 'dsp' && <div>
        <label className="block font-bold text-slate-600 mb-1">Detalhar até</label>
        <select value={nivelMaximo} onChange={e => setNivelMaximo(Number(e.target.value))} className="p-2 border border-slate-200 rounded-xl">
          <option value={2}>Grupos</option>
          <option value={3}>Subgrupos</option>
          <option value={4}>Contas sintéticas</option>
          <option value={5}>Contas analíticas</option>
        </select>
      </div>}
      {modo === 'dsp' && (
        <label className="block font-bold text-slate-600">
          Regime
          <select value={regime} onChange={e => setRegime(e.target.value as RegimeResultado)} className="block mt-1 p-2 border border-slate-200 rounded-xl">
            <option value="competencia">Competência</option>
            <option value="caixa">Caixa</option>
          </select>
        </label>
      )}
      {modo === 'balancete' && (
        <label className="flex items-center gap-1.5 font-bold text-slate-600 pb-2">
          <input type="checkbox" checked={mostrarZeradas} onChange={e => setMostrarZeradas(e.target.checked)} /> Mostrar contas zeradas
        </label>
      )}
      {modo === 'balanco' && (
        <label className="flex items-center gap-1.5 font-bold text-slate-600 pb-2">
          <input type="checkbox" checked={comparativo} onChange={e => setComparativo(e.target.checked)} /> Comparar com {fimDoAnoAnterior(dataFim).slice(0, 4)}
        </label>
      )}
    </div>
  );

  const avisoNaoEncontradas = (mapa: Map<string, Movimento>) =>
    mapa.size > 0 && (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          Há lançamentos em contas que não existem no plano de contas ({[...mapa.keys()].slice(0, 6).join(', ')}
          {mapa.size > 6 ? '…' : ''}). Eles ficam fora das demonstrações até serem reclassificados.
        </span>
      </div>
    );

  /* ------------------------------ BALANCETE ------------------------------ */
  if (modo === 'balancete') {
    const linhas = plano
      .filter(c => (c.nivel || 5) <= nivelMaximo)
      .map(c => {
        const m = periodo.porCodigo.get(c.codigo) || { anterior: 0, debitos: 0, creditos: 0 };
        return { conta: c, ...m, atual: saldoFinal(m) };
      })
      .filter(l => mostrarZeradas || Math.abs(l.anterior) > 0.004 || l.debitos > 0.004 || l.creditos > 0.004);
    const raizes = plano.filter(c => !c.contaPaiId);
    const tot = raizes.reduce(
      (s, c) => {
        const m = periodo.porCodigo.get(c.codigo);
        return { anterior: s.anterior + (m?.anterior || 0), debitos: s.debitos + (m?.debitos || 0), creditos: s.creditos + (m?.creditos || 0) };
      },
      { anterior: 0, debitos: 0, creditos: 0 }
    );
    const fechado = Math.abs(tot.debitos - tot.creditos) < 0.01 && Math.abs(tot.anterior) < 0.01;

    const pdf = () =>
      exportarPdf(
        'Balancete de Verificação',
        `Período: ${dataBR(dataInicio)} a ${dataBR(dataFim)}`,
        ['Código', 'Conta', 'Saldo anterior', 'Débitos', 'Créditos', 'Saldo atual'],
        [24, 105, 37, 37, 37, 37],
        [
          ...linhas.map(l => ({
            cels: [l.conta.codigo, l.conta.nome, dc(l.anterior), moeda(l.debitos), moeda(l.creditos), dc(l.atual)],
            negrito: l.conta.tipoConta === 'SINTETICA',
            recuo: (l.conta.nivel || 1) - 1,
          })),
          { cels: ['', 'TOTAIS', dc(tot.anterior), moeda(tot.debitos), moeda(tot.creditos), dc(tot.anterior + tot.debitos - tot.creditos)], negrito: true },
        ],
        `balancete-${dataInicio}-a-${dataFim}.pdf`,
        nomeCoop
      );

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          {filtros}
          <button type="button" onClick={pdf} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5">
            <FileDown className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
        <div className={`p-3 rounded-xl text-xs flex gap-2 border ${fechado ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {fechado ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {fechado
            ? 'Balancete fechado: total de débitos igual ao total de créditos.'
            : `Diferença no balancete: débitos ${moeda(tot.debitos)} × créditos ${moeda(tot.creditos)}${Math.abs(tot.anterior) >= 0.01 ? ` e saldo anterior ${dc(tot.anterior)}` : ''}. Verifique lançamentos em contas fora do plano.`}
        </div>
        {avisoNaoEncontradas(periodo.naoEncontradas)}
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Código</th>
                <th className="p-3 text-left">Conta</th>
                <th className="p-3 text-right">Saldo anterior</th>
                <th className="p-3 text-right">Débitos</th>
                <th className="p-3 text-right">Créditos</th>
                <th className="p-3 text-right">Saldo atual</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(l => (
                <tr key={l.conta.codigo} className={`border-t border-slate-100 ${l.conta.tipoConta === 'SINTETICA' ? 'font-bold bg-slate-50/60' : ''}`}>
                  <td className="p-2.5 font-mono whitespace-nowrap">{l.conta.codigo}</td>
                  <td className="p-2.5" style={{ paddingLeft: `${0.6 + ((l.conta.nivel || 1) - 1) * 0.9}rem` }}>
                    {l.conta.nome}
                  </td>
                  <td className="p-2.5 text-right whitespace-nowrap">{dc(l.anterior)}</td>
                  <td className="p-2.5 text-right whitespace-nowrap">{moeda(l.debitos)}</td>
                  <td className="p-2.5 text-right whitespace-nowrap">{moeda(l.creditos)}</td>
                  <td className="p-2.5 text-right whitespace-nowrap">{dc(l.atual)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 font-black bg-slate-100">
                <td className="p-3" />
                <td className="p-3">TOTAIS</td>
                <td className="p-3 text-right">{dc(tot.anterior)}</td>
                <td className="p-3 text-right">{moeda(tot.debitos)}</td>
                <td className="p-3 text-right">{moeda(tot.creditos)}</td>
                <td className="p-3 text-right">{dc(tot.anterior + tot.debitos - tot.creditos)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">
          D = saldo devedor · C = saldo credor. As contas sintéticas somam as analíticas abaixo delas. Lançamentos só são permitidos nas contas analíticas.
        </p>
      </div>
    );
  }

  /* -------------------------- BALANÇO PATRIMONIAL ------------------------ */
  if (modo === 'balanco') {
    // Ativo é devedor (positivo); Passivo e PL são credores (exibidos positivos).
    const valorConta = (mapa: Map<string, Movimento>, codigo: string, sinal: 1 | -1) => sinal * saldoFinal(mapa.get(codigo));
    // Resultado ainda não destinado: saldo do grupo 3 (receitas − custos − despesas).
    const resultado = (mapa: Map<string, Movimento>) =>
      plano.filter(c => !c.contaPaiId && c.codigo.startsWith('3')).reduce((s, c) => s - saldoFinal(mapa.get(c.codigo)), 0);

    const blocos = (raiz: string, sinal: 1 | -1) =>
      plano.filter(
        c =>
          c.codigo.startsWith(raiz) &&
          c.codigo !== raiz &&
          (c.nivel || 5) <= nivelMaximo &&
          (Math.abs(saldoFinal(acumulado.porCodigo.get(c.codigo))) > 0.004 || Math.abs(saldoFinal(acumuladoAnterior.porCodigo.get(c.codigo))) > 0.004)
      ).map(c => ({ conta: c, atual: valorConta(acumulado.porCodigo, c.codigo, sinal), anterior: valorConta(acumuladoAnterior.porCodigo, c.codigo, sinal) }));

    const contaRaiz = (prefixo: string) => plano.find(c => c.codigo === prefixo);
    const totalAtivo = valorConta(acumulado.porCodigo, '1', 1);
    const totalAtivoAnt = valorConta(acumuladoAnterior.porCodigo, '1', 1);
    const gruposPassivo = ['21', '22'].filter(g => contaRaiz(g));
    const totalPassivo = gruposPassivo.reduce((s, g) => s + valorConta(acumulado.porCodigo, g, -1), 0);
    const totalPassivoAnt = gruposPassivo.reduce((s, g) => s + valorConta(acumuladoAnterior.porCodigo, g, -1), 0);
    const pl = valorConta(acumulado.porCodigo, '24', -1);
    const plAnt = valorConta(acumuladoAnterior.porCodigo, '24', -1);
    const res = resultado(acumulado.porCodigo);
    const resAnt = resultado(acumuladoAnterior.porCodigo);
    const totalPlComResultado = pl + res;
    const totalPassivoPl = totalPassivo + totalPlComResultado;
    const totalPassivoPlAnt = totalPassivoAnt + plAnt + resAnt;
    const diferenca = totalAtivo - totalPassivoPl;
    const fechado = Math.abs(diferenca) < 0.01;

    type Linha = { rotulo: string; codigo?: string; atual: number; anterior: number; negrito?: boolean; recuo?: number; destaque?: boolean };
    const linhasAtivo: Linha[] = [
      ...blocos('1', 1).map(b => ({ rotulo: b.conta.nome, codigo: b.conta.codigo, atual: b.atual, anterior: b.anterior, negrito: b.conta.tipoConta === 'SINTETICA', recuo: (b.conta.nivel || 2) - 2 })),
    ];
    const linhasPassivo: Linha[] = [
      ...gruposPassivo.flatMap(g => [
        { rotulo: contaRaiz(g)!.nome, codigo: g, atual: valorConta(acumulado.porCodigo, g, -1), anterior: valorConta(acumuladoAnterior.porCodigo, g, -1), negrito: true, recuo: 0 },
        ...blocos(g, -1).map(b => ({ rotulo: b.conta.nome, codigo: b.conta.codigo, atual: b.atual, anterior: b.anterior, negrito: b.conta.tipoConta === 'SINTETICA', recuo: (b.conta.nivel || 3) - 2 })),
      ]),
      { rotulo: contaRaiz('24')?.nome || 'PATRIMÔNIO LÍQUIDO', codigo: '24', atual: totalPlComResultado, anterior: plAnt + resAnt, negrito: true, recuo: 0 },
      ...blocos('24', -1).map(b => ({ rotulo: b.conta.nome, codigo: b.conta.codigo, atual: b.atual, anterior: b.anterior, negrito: b.conta.tipoConta === 'SINTETICA', recuo: (b.conta.nivel || 3) - 2 })),
      { rotulo: 'Sobras ou Perdas do Exercício (a destinar)', atual: res, anterior: resAnt, recuo: 1 },
    ];

    const tabela = (titulo: string, linhas: Linha[], total: number, totalAnt: number) => (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-900 text-white text-sm font-black">{titulo}</div>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2.5 text-left">Conta</th>
              <th className="p-2.5 text-right">{dataBR(dataFim)}</th>
              {comparativo && <th className="p-2.5 text-right">{dataBR(fimDoAnoAnterior(dataFim))}</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={(l.codigo || l.rotulo) + i} className={`border-t border-slate-100 ${l.negrito ? 'font-bold' : ''}`}>
                <td className="p-2" style={{ paddingLeft: `${0.6 + (l.recuo || 0) * 0.9}rem` }}>
                  {l.codigo && <span className="font-mono text-slate-400 mr-2">{l.codigo}</span>}
                  {l.rotulo}
                </td>
                <td className="p-2 text-right whitespace-nowrap">{valorDemo(l.atual)}</td>
                {comparativo && <td className="p-2 text-right whitespace-nowrap text-slate-500">{valorDemo(l.anterior)}</td>}
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 bg-slate-100 font-black">
              <td className="p-3">TOTAL DO {titulo}</td>
              <td className="p-3 text-right">{valorDemo(total)}</td>
              {comparativo && <td className="p-3 text-right">{valorDemo(totalAnt)}</td>}
            </tr>
          </tbody>
        </table>
      </div>
    );

    const pdf = () => {
      const col = comparativo ? ['Conta', '', dataBR(dataFim), dataBR(fimDoAnoAnterior(dataFim))] : ['Conta', '', dataBR(dataFim)];
      const larg = comparativo ? [24, 96, 35, 35] : [24, 131, 35];
      const conv = (l: Linha) => ({
        cels: comparativo ? [l.codigo || '', l.rotulo, valorDemo(l.atual), valorDemo(l.anterior)] : [l.codigo || '', l.rotulo, valorDemo(l.atual)],
        negrito: l.negrito,
        recuo: l.recuo,
      });
      const total = (rot: string, a: number, b: number) => ({ cels: comparativo ? ['', rot, valorDemo(a), valorDemo(b)] : ['', rot, valorDemo(a)], negrito: true });
      exportarPdf(
        'Balanço Patrimonial',
        `Posição em ${dataBR(dataFim)}`,
        col,
        larg,
        [
          { cels: ['', 'ATIVO'], negrito: true },
          ...linhasAtivo.map(conv),
          total('TOTAL DO ATIVO', totalAtivo, totalAtivoAnt),
          { cels: ['', ''] },
          { cels: ['', 'PASSIVO E PATRIMÔNIO LÍQUIDO'], negrito: true },
          ...linhasPassivo.map(conv),
          total('TOTAL DO PASSIVO + PATRIMÔNIO LÍQUIDO', totalPassivoPl, totalPassivoPlAnt),
        ],
        `balanco-patrimonial-${dataFim}.pdf`,
        nomeCoop
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          {filtros}
          <button type="button" onClick={pdf} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5">
            <FileDown className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
        <div className={`p-3 rounded-xl text-xs flex gap-2 border ${fechado ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <Scale className="w-4 h-4 shrink-0" />
          {fechado
            ? `Balanço fechado: Ativo = Passivo + Patrimônio Líquido (${moeda(totalAtivo)}).`
            : `Diferença de ${moeda(diferenca)} entre o Ativo e o Passivo + PL. Verifique lançamentos fora do plano ou sem contrapartida.`}
        </div>
        {avisoNaoEncontradas(acumulado.naoEncontradas)}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {tabela('ATIVO', linhasAtivo, totalAtivo, totalAtivoAnt)}
          {tabela('PASSIVO E PATRIMÔNIO LÍQUIDO', linhasPassivo, totalPassivoPl, totalPassivoPlAnt)}
        </div>
        <p className="text-[11px] text-slate-500">
          Valores entre parênteses reduzem o grupo (ex.: depreciação acumulada, capital a integralizar, perdas). "Sobras ou Perdas do
          Exercício" é o saldo das contas de resultado (grupo 3) ainda não destinado pela assembleia.
        </p>
      </div>
    );
  }

  const demonstrativo = montarResultadoCooperativa(planoContas, lancamentosContabeis, contasPagarReceber, dataInicio, dataFim, regime, simularTributos, percentualOutrosFundos);
  type LinhaDsp = (typeof demonstrativo.linhas)[number];
  const gruposDsp: { principal: LinhaDsp; subitens: LinhaDsp[] }[] = [];
  const ajustesAntesDosTributos: LinhaDsp[] = [];
  for (const linha of demonstrativo.linhas) {
    if (!linha.detalhe) {
      gruposDsp.push({
        principal: linha,
        subitens: linha.rotulo.startsWith('8.') ? ajustesAntesDosTributos : [],
      });
    } else if (linha.rotulo === rubricasResultado.naoOperacional || linha.rotulo === rubricasResultado.outros) {
      ajustesAntesDosTributos.push(linha);
    } else {
      gruposDsp.at(-1)?.subitens.push(linha);
    }
  }
  const colunasDsp = ['Conta / Rubrica', 'Ato Cooperativo (R$)', 'Ato Não Cooperativo (R$)', 'Total Consolidado (R$)', '% Receita Líquida'];
  const percentual = (valor: number | null) => valor === null ? '—' : `${moeda(demonstrativo.receitaLiquida > 0 ? 100 * valor / demonstrativo.receitaLiquida : 0)}%`;
  const formatarDsp = (valor: number | null) => valor === null ? '—' : valor < 0 ? `(${moeda(-valor)})` : moeda(valor);
  const nomeRegime = regime === 'caixa' ? 'Caixa' : 'Competência';
  const pdfDsp = () => exportarPdf(
    'Demonstração de Sobras ou Perdas',
    `${nomeRegime} | ${dataBR(dataInicio)} a ${dataBR(dataFim)}${regime === 'competencia' ? ' | Destinações indicativas' : ''}`,
    colunasDsp,
    [129, 34, 45, 39, 30],
    demonstrativo.linhas.map(linha => ({
      cels: [linha.rotulo, ...linha.valores.map(formatarDsp), percentual(linha.valores[2])],
      negrito: !linha.detalhe,
      recuo: linha.detalhe ? 1 : 0,
    })),
    `demonstracao-sobras-perdas-${regime}-${dataInicio}-a-${dataFim}.pdf`,
    nomeCoop,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {filtros}
        <button type="button" onClick={pdfDsp} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5">
          <FileDown className="w-4 h-4" /> Exportar PDF
        </button>
      </div>
      {regime === 'competencia' && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={simularTributos} onChange={e => setSimularTributos(e.target.checked)} />
            Simular IRPJ e CSLL (34%) quando não houver provisão contabilizada
          </label>
          <label className="flex items-center gap-2">
            Outros fundos estatutários (%)
            <input type="number" min="0" max="85" step="0.01" value={percentualOutrosFundos}
              onChange={e => setPercentualOutrosFundos(Math.max(0, Math.min(85, Number(e.target.value) || 0)))}
              className="w-20 rounded-lg border border-slate-200 p-1.5" />
          </label>
        </div>
      )}
      {avisoNaoEncontradas(periodo.naoEncontradas)}
      {demonstrativo.semAto.length > 0 && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          Classifique o ato das contas para incluí-las no resultado: {demonstrativo.semAto.join(', ')}.
        </p>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[660px] text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>{colunasDsp.map((coluna, indice) => <th key={coluna} scope="col" className={indice === 0 ? 'text-left' : 'text-right'}>{coluna}</th>)}</tr>
          </thead>
          <tbody>
            {gruposDsp.flatMap(({ principal, subitens }) => {
              const aberto = gruposAbertos[principal.rotulo] ?? false;
              return [principal, ...(aberto ? subitens : [])].map(linha => (
                <tr key={linha.rotulo} className={linha.detalhe ? 'border-t border-slate-100' : 'border-t border-slate-100 font-bold bg-slate-50'}>
                  <th scope="row" className={linha.detalhe ? 'text-left font-normal !pl-8' : 'text-left'}>
                    {!linha.detalhe && subitens.length > 0 ? (
                      <button
                        type="button"
                        aria-expanded={aberto}
                        onClick={() => setGruposAbertos(anteriores => ({ ...anteriores, [principal.rotulo]: !anteriores[principal.rotulo] }))}
                        className="flex w-full items-center gap-2 rounded text-left hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600"
                      >
                        <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 ${aberto ? 'rotate-90' : ''}`} />
                        <span>{linha.rotulo}</span>
                      </button>
                    ) : linha.rotulo}
                  </th>
                  {linha.valores.map((valor, indice) => (
                    <td key={indice} className={`text-right whitespace-nowrap tabular-nums ${(valor ?? 0) < 0 ? 'text-rose-700' : ''}`}>{formatarDsp(valor)}</td>
                  ))}
                  <td className="text-right whitespace-nowrap tabular-nums">{percentual(linha.valores[2])}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600">
        {regime === 'competencia'
          ? 'Os tributos sobre o lucro vêm da escrituração. As destinações indicativas usam os mínimos legais da Reserva (10%) e do FATES (5%) sobre as sobras do ato cooperativo. O FATES inclui o resultado positivo do ato não cooperativo. A destinação efetiva é definida no encerramento do exercício.'
          : 'A visão gerencial de caixa usa a liquidação dos títulos vinculados e os lançamentos de resultado com contrapartida em caixa ou banco.'}
      </p>
    </div>
  );
};

export default DemonstracoesContabeis;
