import React, { useState } from 'react';
import { X, Coins } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { ChamadaPublica } from '../types';
import { dataBR, formatarMoeda, gerarParcelas, hojeISO } from '../utils/parcelamento';

/**
 * Lança o valor de uma Chamada Pública (PAA/PNAE) no Contas a Receber, de
 * forma integral (parcela única) ou parcelada. O lançamento contábil é
 * gerado automaticamente pelo Financeiro.
 */
export const LancarChamadaReceberModal: React.FC<{ chamada: ChamadaPublica; onClose: () => void }> = ({ chamada, onClose }) => {
  const { lancarChamadaPublicaNoReceber, contasPagarReceber } = useCoop();

  const valorCalculado = chamada.itensSolicitados?.reduce((s, it) => s + (it.valorTotalItem || it.quantidadeTotal * it.precoMaximoUnitario), 0) || chamada.valorTotalEdital || 0;
  const [modo, setModo] = useState<'INTEGRAL' | 'PARCELADO'>('INTEGRAL');
  const [valor, setValor] = useState(Number(valorCalculado.toFixed(2)));
  const [numeroParcelas, setNumeroParcelas] = useState(2);
  const [primeiroVencimento, setPrimeiroVencimento] = useState(chamada.dataEncerramento || hojeISO());
  const [intervaloDias, setIntervaloDias] = useState(30);

  const jaLancadas = contasPagarReceber.filter(c => (chamada.contasReceberIds || []).includes(c.id) && c.status !== 'CANCELADO');
  const parcelas = gerarParcelas(valor, modo === 'INTEGRAL' ? 1 : numeroParcelas, primeiroVencimento, intervaloDias);

  const confirmar = () => {
    if (!valor || valor <= 0) { alert('Informe um valor maior que zero.'); return; }
    if (jaLancadas.length && !confirm('Esta chamada já tem valores lançados no Contas a Receber. Deseja lançar novamente?')) return;
    const ids = lancarChamadaPublicaNoReceber(chamada.id, {
      valorTotal: valor,
      numeroParcelas: parcelas.length,
      primeiroVencimento,
      intervaloDias,
      dataEmissao: hojeISO(),
      centroCusto: chamada.programaNome || chamada.programa,
    });
    if (ids.length) onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 text-xs" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><Coins className="w-5 h-5 text-emerald-600" /> Lançar no Contas a Receber</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="text-slate-600">
          Chamada <strong>{chamada.numeroEdital}</strong> · {chamada.programaNome || chamada.programa} · {chamada.orgaoComprador}
        </div>
        {jaLancadas.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
            Já lançado: {jaLancadas.length} conta(s), total {formatarMoeda(jaLancadas.reduce((s, c) => s + c.valor, 0))}.
          </div>
        )}
        <div className="flex gap-2">
          {(['INTEGRAL', 'PARCELADO'] as const).map(m => (
            <button key={m} type="button" onClick={() => setModo(m)} className={`flex-1 p-2.5 rounded-xl border font-bold ${modo === m ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {m === 'INTEGRAL' ? 'Integral (parcela única)' : 'Parcelado'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Valor total (R$)</label>
            <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(Number(e.target.value) || 0)} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold" />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">{modo === 'INTEGRAL' ? 'Vencimento' : '1º vencimento'}</label>
            <input type="date" value={primeiroVencimento} onChange={e => setPrimeiroVencimento(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl" />
          </div>
          {modo === 'PARCELADO' && (
            <>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nº de parcelas</label>
                <input type="number" min="2" max="60" value={numeroParcelas} onChange={e => setNumeroParcelas(Math.max(2, Number(e.target.value) || 2))} className="w-full p-2.5 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Intervalo (dias)</label>
                <input type="number" min="1" value={intervaloDias} onChange={e => setIntervaloDias(Math.max(1, Number(e.target.value) || 30))} className="w-full p-2.5 border border-slate-200 rounded-xl" />
              </div>
            </>
          )}
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-800 space-y-0.5 max-h-48 overflow-y-auto">
          {parcelas.map(p => (
            <div key={p.numero} className="flex justify-between">
              <span>{parcelas.length > 1 ? `Parcela ${p.numero}/${parcelas.length}` : 'Parcela única'} — venc. {dataBR(p.vencimento)}</span>
              <span className="font-bold">{formatarMoeda(p.valor)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
          <button type="button" onClick={confirmar} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">Lançar {parcelas.length > 1 ? `${parcelas.length} parcelas` : 'valor integral'}</button>
        </div>
      </div>
    </div>
  );
};
