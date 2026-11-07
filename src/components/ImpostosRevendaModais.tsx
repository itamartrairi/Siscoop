import React, { useMemo, useState } from 'react';
import { X, Settings2, Landmark } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { ConfigTributariaRevenda, ImpostosVenda, RegimeApuracaoRevenda } from '../types';
import {
  PADRAO_POR_REGIME, ROTULO_REGIME, TRIBUTOS_GUIA, calcularImpostosVenda, configTributaria, vencimentoGuia,
} from '../utils/impostosRevenda';
import { dataBR, formatarMoeda, hojeISO } from '../utils/parcelamento';

const inputCls = 'w-full p-2.5 border border-slate-200 rounded-xl';
const labelCls = 'block text-slate-700 font-bold mb-1';

/** Regime da cooperativa e alíquotas usadas no cálculo dos impostos da revenda. */
export const ConfigTributariaModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { config, updateConfig } = useCoop();
  const [form, setForm] = useState<ConfigTributariaRevenda>(configTributaria(config?.tributacaoRevenda));
  const num = (k: keyof ConfigTributariaRevenda) => ({
    type: 'number' as const,
    step: '0.01',
    min: '0',
    value: Number(form[k]) || 0,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: Number(e.target.value) || 0 })),
    className: inputCls,
  });
  const simples = form.regime === 'SIMPLES_NACIONAL';

  const salvar = () => {
    updateConfig({ tributacaoRevenda: form });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-xs" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><Settings2 className="w-5 h-5 text-emerald-600" /> Configuração tributária da revenda</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-slate-500">Valores padrão conforme as regras do Ceará e a legislação federal. Confira com o contador da cooperativa — eles são usados para calcular os impostos de cada venda e gerar as guias.</p>

        <div>
          <label className={labelCls}>Regime de apuração da cooperativa</label>
          <select
            value={form.regime}
            onChange={e => { const regime = e.target.value as RegimeApuracaoRevenda; setForm(prev => ({ ...prev, regime, ...PADRAO_POR_REGIME[regime] })); }}
            className={`${inputCls} bg-white font-bold`}
          >
            {(Object.keys(ROTULO_REGIME) as RegimeApuracaoRevenda[]).map(r => <option key={r} value={r}>{ROTULO_REGIME[r]}</option>)}
          </select>
          {simples && <p className="mt-1 text-amber-700">Atenção: cooperativas (exceto de consumo) não podem optar pelo Simples Nacional (LC 123/2006, art. 3º, §4º, VI).</p>}
        </div>

        {simples ? (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Alíquota efetiva do DAS (%)</label><input {...num('aliquotaDasEfetiva')} /></div>
          </div>
        ) : (
          <>
            <div className="font-extrabold text-slate-800 pt-1">ICMS — Ceará</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className={labelCls}>Alíquota interna (%)</label><input {...num('aliquotaIcmsInterna')} /></div>
              <div><label className={labelCls}>Adicional FECOP (p.p.)</label><input {...num('aliquotaFecop')} /></div>
              <div><label className={labelCls}>Interestadual (%)</label><input {...num('aliquotaInterestadual')} /></div>
              <div><label className={labelCls}>Redução base insumos (%)</label><input {...num('reducaoBaseInsumos')} /></div>
              <div className="md:col-span-2"><label className={labelCls}>Crédito de ICMS das compras (% sobre o custo)</label><input {...num('creditoIcmsCustoPercent')} /></div>
            </div>
            <div className="font-extrabold text-slate-800 pt-1">Tributos federais</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className={labelCls}>PIS (%)</label><input {...num('pis')} /></div>
              <div><label className={labelCls}>COFINS (%)</label><input {...num('cofins')} /></div>
              <div><label className={labelCls}>IRPJ presumido (%)</label><input {...num('irpjPresumido')} disabled={!form.incluirIrpjCsll} /></div>
              <div><label className={labelCls}>CSLL presumido (%)</label><input {...num('csllPresumido')} disabled={!form.incluirIrpjCsll} /></div>
            </div>
            <label className="flex items-center gap-2 font-bold text-slate-700">
              <input type="checkbox" checked={form.creditoPisCofinsCusto} onChange={e => setForm({ ...form, creditoPisCofinsCusto: e.target.checked })} />
              Descontar créditos de PIS/COFINS sobre o custo das mercadorias (não cumulativo)
            </label>
            <label className="flex items-center gap-2 font-bold text-slate-700">
              <input type="checkbox" checked={form.incluirIrpjCsll} onChange={e => setForm({ ...form, incluirIrpjCsll: e.target.checked })} />
              Estimar IRPJ/CSLL sobre a receita (lucro presumido)
            </label>
          </>
        )}

        <div className="font-extrabold text-slate-800 pt-1">Reforma tributária (2026 — destaque informativo)</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className={labelCls}>CBS (%)</label><input {...num('cbsTeste')} /></div>
          <div><label className={labelCls}>IBS (%)</label><input {...num('ibsTeste')} /></div>
        </div>

        <div className="flex justify-between gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={() => setForm(configTributaria({ regime: form.regime, ...PADRAO_POR_REGIME[form.regime] }))} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">Restaurar padrões</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
            <button type="button" onClick={salvar} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Apuração mensal: soma os impostos das vendas do mês e gera as guias no Contas a Pagar. */
export const ApuracaoImpostosModal: React.FC<{ canWrite: boolean; onBlocked: () => void; onClose: () => void }> = ({ canWrite, onBlocked, onClose }) => {
  const { vendasRevenda, clientes, contasPagarReceber, lancarParcelasFinanceiras, config } = useCoop();
  const [competencia, setCompetencia] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [msg, setMsg] = useState('');
  const rotuloComp = `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`;

  const { vendas, totais } = useMemo(() => {
    const doMes = vendasRevenda.filter(v => v.status !== 'CANCELADA' && (v.dataVenda || '').slice(0, 7) === competencia);
    const soma: Record<string, number> = {};
    doMes.forEach(v => {
      let imp: ImpostosVenda | undefined = v.impostos;
      if (!imp) { // vendas antigas, sem impostos gravados: calcula com a configuração atual
        const cli = clientes.find(c => c.id === v.clienteId);
        imp = calcularImpostosVenda(v.itens, v.desconto || 0, cli?.uf || 'CE', !!cli?.inscricaoEstadual, config?.tributacaoRevenda);
      }
      TRIBUTOS_GUIA.forEach(t => { soma[t.nome] = (soma[t.nome] || 0) + (Number(imp?.[t.chave]) || 0); });
      soma.CBS = (soma.CBS || 0) + imp.cbs;
      soma.IBS = (soma.IBS || 0) + imp.ibs;
      soma.__receita = (soma.__receita || 0) + imp.receita;
    });
    return { vendas: doMes, totais: soma };
  }, [vendasRevenda, clientes, competencia, config]);

  const descricaoGuia = (nome: string) => `${nome} — apuração ${rotuloComp} (revenda)`;
  const jaGeradas = contasPagarReceber.filter(c => TRIBUTOS_GUIA.some(t => c.descricao === descricaoGuia(t.nome)) && c.status !== 'CANCELADO');

  const gerar = () => {
    if (!canWrite) { onBlocked(); return; }
    if (jaGeradas.length && !confirm(`Já existem ${jaGeradas.length} guia(s) desta competência. Gerar as que faltam?`)) return;
    let geradas = 0;
    TRIBUTOS_GUIA.forEach(t => {
      const valor = Math.round((totais[t.nome] || 0) * 100) / 100;
      if (valor <= 0 || contasPagarReceber.some(c => c.descricao === descricaoGuia(t.nome) && c.status !== 'CANCELADO')) return;
      const ids = lancarParcelasFinanceiras({
        tipo: 'PAGAR',
        descricaoBase: descricaoGuia(t.nome),
        pessoaNome: t.orgao,
        categoria: t.categoria,
        subcategoria: t.nome,
        valorTotal: valor,
        numeroParcelas: 1,
        primeiroVencimento: vencimentoGuia(competencia, t.diaVencimento),
        intervaloDias: 0,
        dataEmissao: hojeISO(),
        centroCusto: `Apuração ${rotuloComp}`,
      });
      geradas += ids.length;
    });
    setMsg(geradas ? `${geradas} guia(s) lançada(s) no Contas a Pagar, com o lançamento contábil.` : 'Nenhuma guia nova para gerar.');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 text-xs" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><Landmark className="w-5 h-5 text-emerald-600" /> Apuração de impostos da revenda</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-end gap-3">
          <div><label className={labelCls}>Competência</label><input type="month" value={competencia} onChange={e => { setCompetencia(e.target.value); setMsg(''); }} className={inputCls} /></div>
          <div className="text-slate-600 pb-2.5">{vendas.length} venda(s) · receita {formatarMoeda(totais.__receita || 0)}</div>
        </div>
        <table className="w-full">
          <thead><tr className="text-left text-slate-500"><th className="py-1">Tributo</th><th>Órgão</th><th>Vencimento</th><th className="text-right">Valor</th></tr></thead>
          <tbody>
            {TRIBUTOS_GUIA.filter(t => (totais[t.nome] || 0) > 0).map(t => (
              <tr key={t.nome} className="border-t border-slate-100">
                <td className="py-1 font-bold">{t.nome}</td><td>{t.orgao}</td><td>{dataBR(vencimentoGuia(competencia, t.diaVencimento))}</td>
                <td className="text-right font-bold">{formatarMoeda(totais[t.nome] || 0)}</td>
              </tr>
            ))}
            {!TRIBUTOS_GUIA.some(t => (totais[t.nome] || 0) > 0) && <tr><td colSpan={4} className="py-3 text-center text-slate-400">Sem impostos a recolher nesta competência.</td></tr>}
          </tbody>
        </table>
        {((totais.CBS || 0) > 0 || (totais.IBS || 0) > 0) && (
          <div className="text-slate-500">CBS {formatarMoeda(totais.CBS || 0)} e IBS {formatarMoeda(totais.IBS || 0)}: apenas informativos em 2026 (sem guia).</div>
        )}
        {jaGeradas.length > 0 && <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">Já geradas para {rotuloComp}: {jaGeradas.map(c => `${c.subcategoria || c.descricao} (${c.status === 'PAGO' ? 'paga' : 'em aberto'})`).join(', ')}.</div>}
        {msg && <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">{msg}</div>}
        <p className="text-[10px] text-slate-500">Vencimentos padrão: ICMS/FECOP (DAE) e DAS dia 20, PIS/COFINS dia 25 e IRPJ/CSLL dia 28 do mês seguinte — ajuste no Financeiro se o calendário da cooperativa for diferente.</p>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">Fechar</button>
          <button type="button" onClick={gerar} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">Gerar guias no Contas a Pagar</button>
        </div>
      </div>
    </div>
  );
};
