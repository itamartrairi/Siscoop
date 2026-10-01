import React, { useMemo, useState } from 'react';
import { Landmark, Plus, Pencil, Trash2, Star, X, CheckCircle2 } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { ContaBancaria } from '../types';

/**
 * Financeiro → Contas Bancárias.
 * Cadastro das contas da cooperativa e saldo calculado de cada uma a partir das
 * contas a pagar/receber já quitadas e dos lançamentos do extrato vinculados a ela.
 */

const moeda = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const nomeContaBancaria = (contas: ContaBancaria[], id?: string) => {
  const cb = contas.find(b => b.id === id);
  return cb ? `${cb.banco} · ${cb.agencia}/${cb.conta}` : '—';
};

const TIPOS: { valor: ContaBancaria['tipo']; rotulo: string }[] = [
  { valor: 'CORRENTE', rotulo: 'Conta corrente' },
  { valor: 'POUPANCA', rotulo: 'Poupança' },
  { valor: 'PAGAMENTO', rotulo: 'Conta de pagamento' },
  { valor: 'APLICACAO', rotulo: 'Aplicação' },
  { valor: 'CAIXA', rotulo: 'Caixa (dinheiro)' },
];

/** Seletor de conta bancária usado nas telas do Financeiro. */
export const SelectContaBancaria: React.FC<{
  value: string;
  onChange: (id: string) => void;
  contas: ContaBancaria[];
  todasLabel?: string;
  vazioLabel?: string;
  className?: string;
}> = ({ value, onChange, contas, todasLabel, vazioLabel = 'Sem conta definida', className }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className={className || 'w-full p-2.5 border border-slate-200 rounded-xl'}>
    {todasLabel ? <option value="TODAS">{todasLabel}</option> : <option value="">{vazioLabel}</option>}
    {contas
      .filter(b => b.ativa !== false || b.id === value)
      .map(b => (
        <option key={b.id} value={b.id}>
          {b.banco} · {b.agencia}/{b.conta}
          {b.padrao ? ' (padrão)' : ''}
          {b.ativa === false ? ' (inativa)' : ''}
        </option>
      ))}
  </select>
);

const formVazio = {
  banco: '',
  codigoBanco: '',
  agencia: '',
  conta: '',
  tipo: 'CORRENTE' as ContaBancaria['tipo'],
  titular: '',
  documentoTitular: '',
  chavePix: '',
  saldoInicial: 0,
  dataSaldoInicial: new Date().toISOString().split('T')[0],
  ativa: true,
  padrao: false,
  observacao: '',
};

export const ContasBancariasTab: React.FC<{ canWrite?: boolean; onBlocked?: () => void }> = ({ canWrite = true, onBlocked }) => {
  const { contasBancarias, addContaBancaria, updateContaBancaria, deleteContaBancaria, contasPagarReceber, extratoBancario, transacoesCapital } = useCoop();
  const [editando, setEditando] = useState<ContaBancaria | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ ...formVazio });
  const [mostrarInativas, setMostrarInativas] = useState(false);

  const resumo = useMemo(() => {
    const mapa: Record<string, { recebido: number; pago: number; aReceber: number; aPagar: number; creditos: number; debitos: number; titulos: number; capitalEntrada: number; capitalSaida: number }> = {};
    const item = (id: string) => (mapa[id] ||= { recebido: 0, pago: 0, aReceber: 0, aPagar: 0, creditos: 0, debitos: 0, titulos: 0, capitalEntrada: 0, capitalSaida: 0 });
    for (const c of contasPagarReceber) {
      if (!c.contaBancariaId || c.status === 'CANCELADO') continue;
      const r = item(c.contaBancariaId);
      r.titulos++;
      const valor = Number(c.valor) || 0;
      if (c.status === 'PAGO') {
        if (c.tipo === 'RECEBER') r.recebido += valor;
        else r.pago += valor;
      } else if (c.tipo === 'RECEBER') r.aReceber += valor;
      else r.aPagar += valor;
    }
    for (const l of (extratoBancario?.lancamentos || []) as any[]) {
      if (!l.contaBancariaId) continue;
      const r = item(l.contaBancariaId);
      if (l.tipo === 'CREDITO') r.creditos += Number(l.valor) || 0;
      else r.debitos += Number(l.valor) || 0;
    }
    // Capital social: integralização e aumento entram na conta; devolução sai.
    // Subscrição (compromisso) e transferência entre cooperados não movimentam dinheiro.
    for (const tx of (transacoesCapital || []) as any[]) {
      if (!tx.contaBancariaId || tx.status === 'CANCELADO' || tx.status === 'PENDENTE') continue;
      const r = item(tx.contaBancariaId);
      const valor = Number(tx.valor) || 0;
      if (tx.tipo === 'INTEGRALIZACAO' || tx.tipo === 'AUMENTO') r.capitalEntrada += valor;
      else if (tx.tipo === 'DEVOLUCAO') r.capitalSaida += valor;
    }
    return mapa;
  }, [contasPagarReceber, extratoBancario, transacoesCapital]);

  const saldoDe = (b: ContaBancaria) => {
    const r = resumo[b.id];
    return (Number(b.saldoInicial) || 0) + (r ? r.recebido - r.pago + r.creditos - r.debitos + r.capitalEntrada - r.capitalSaida : 0);
  };

  const lista = contasBancarias.filter(b => mostrarInativas || b.ativa !== false);
  const saldoTotal = contasBancarias.filter(b => b.ativa !== false).reduce((s, b) => s + saldoDe(b), 0);

  const abrir = (b?: ContaBancaria) => {
    if (!canWrite) {
      onBlocked?.();
      return;
    }
    setEditando(b || null);
    setForm(
      b
        ? {
            ...formVazio,
            ...b,
            codigoBanco: b.codigoBanco || '',
            titular: b.titular || '',
            documentoTitular: b.documentoTitular || '',
            chavePix: b.chavePix || '',
            dataSaldoInicial: b.dataSaldoInicial || formVazio.dataSaldoInicial,
            observacao: b.observacao || '',
            padrao: !!b.padrao,
          }
        : { ...formVazio, padrao: contasBancarias.length === 0 }
    );
    setAberto(true);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.banco.trim() || !form.agencia.trim() || !form.conta.trim()) {
      alert('Informe banco, agência e conta.');
      return;
    }
    const dados = { ...form, saldoInicial: Number(form.saldoInicial) || 0 };
    if (editando) {
      const { id, tenantId, ...resto } = dados as any;
      updateContaBancaria(editando.id, resto);
    } else addContaBancaria(dados);
    setAberto(false);
  };

  const excluir = (b: ContaBancaria) => {
    if (!canWrite) {
      onBlocked?.();
      return;
    }
    const usada = !!resumo[b.id];
    const msg = usada
      ? 'Esta conta tem títulos ou lançamentos vinculados. Ela será desativada (não apagada) para manter o histórico. Continuar?'
      : 'Excluir esta conta bancária?';
    if (window.confirm(msg)) deleteContaBancaria(b.id);
  };

  const campo = 'w-full p-2.5 border border-slate-200 rounded-xl';
  const rotulo = 'block text-slate-700 font-bold mb-1';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" /> Contas Bancárias
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre as contas da cooperativa e vincule-as às contas a pagar/receber e aos lançamentos do extrato.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-600 flex items-center gap-1.5">
            <input type="checkbox" checked={mostrarInativas} onChange={e => setMostrarInativas(e.target.checked)} /> Mostrar inativas
          </label>
          <button
            type="button"
            onClick={() => abrir()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova conta
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm flex flex-wrap justify-between gap-2">
        <span className="font-bold text-emerald-900">Saldo calculado das contas ativas</span>
        <span className="font-black text-emerald-800">{moeda(saldoTotal)}</span>
      </div>

      {lista.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-2xl">
          Nenhuma conta bancária cadastrada ainda.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="p-3">Banco</th>
                <th className="p-3">Agência / Conta</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Saldo inicial</th>
                <th className="p-3 text-right">Recebido</th>
                <th className="p-3 text-right">Pago</th>
                <th className="p-3 text-right">A receber</th>
                <th className="p-3 text-right">A pagar</th>
                <th className="p-3 text-right">Saldo calculado</th>
                <th className="p-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(b => {
                const r = resumo[b.id];
                return (
                  <tr key={b.id} className={`border-t border-slate-100 ${b.ativa === false ? 'opacity-50' : ''}`}>
                    <td className="p-3 font-bold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        {b.padrao && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                        {b.codigoBanco ? `${b.codigoBanco} - ` : ''}
                        {b.banco}
                      </span>
                      {b.chavePix && <span className="block font-normal text-slate-500">PIX: {b.chavePix}</span>}
                    </td>
                    <td className="p-3 font-mono">
                      {b.agencia} / {b.conta}
                    </td>
                    <td className="p-3">{TIPOS.find(t => t.valor === b.tipo)?.rotulo || b.tipo}</td>
                    <td className="p-3 text-right">{moeda(b.saldoInicial)}</td>
                    <td className="p-3 text-right text-emerald-700">{moeda((r?.recebido || 0) + (r?.creditos || 0) + (r?.capitalEntrada || 0))}</td>
                    <td className="p-3 text-right text-rose-700">{moeda((r?.pago || 0) + (r?.debitos || 0) + (r?.capitalSaida || 0))}</td>
                    <td className="p-3 text-right text-slate-500">{moeda(r?.aReceber || 0)}</td>
                    <td className="p-3 text-right text-slate-500">{moeda(r?.aPagar || 0)}</td>
                    <td className="p-3 text-right font-black">{moeda(saldoDe(b))}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => abrir(b)} className="p-1.5 rounded-lg hover:bg-slate-100" title="Editar">
                          <Pencil className="w-4 h-4 text-slate-600" />
                        </button>
                        <button type="button" onClick={() => excluir(b)} className="p-1.5 rounded-lg hover:bg-rose-50" title="Excluir">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Saldo calculado = saldo inicial + títulos recebidos − títulos pagos + créditos − débitos do extrato + integralizações − devoluções de capital vinculadas à conta.
        Confira com o extrato do banco.
      </p>

      {aberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={salvar} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">{editando ? 'Editar conta bancária' : 'Nova conta bancária'}</h3>
              <button type="button" onClick={() => setAberto(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className={rotulo}>Banco *</label>
                <input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} placeholder="Ex: Sicoob, Banco do Brasil" className={campo} />
              </div>
              <div>
                <label className={rotulo}>Código do banco</label>
                <input value={form.codigoBanco} onChange={e => setForm({ ...form, codigoBanco: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="Ex: 756" className={campo} />
              </div>
              <div>
                <label className={rotulo}>Agência *</label>
                <input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} placeholder="0000" className={campo} />
              </div>
              <div>
                <label className={rotulo}>Conta *</label>
                <input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} placeholder="00000-0" className={campo} />
              </div>
              <div>
                <label className={rotulo}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as ContaBancaria['tipo'] })} className={campo}>
                  {TIPOS.map(t => (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={rotulo}>Titular</label>
                <input value={form.titular} onChange={e => setForm({ ...form, titular: e.target.value })} placeholder="Razão social da cooperativa" className={campo} />
              </div>
              <div>
                <label className={rotulo}>CNPJ/CPF do titular</label>
                <input value={form.documentoTitular} onChange={e => setForm({ ...form, documentoTitular: e.target.value })} className={campo} />
              </div>
              <div className="md:col-span-3">
                <label className={rotulo}>Chave PIX</label>
                <input value={form.chavePix} onChange={e => setForm({ ...form, chavePix: e.target.value })} placeholder="CNPJ, e-mail, telefone ou chave aleatória" className={campo} />
              </div>
              <div>
                <label className={rotulo}>Saldo inicial (R$)</label>
                <input type="number" step="0.01" value={form.saldoInicial} onChange={e => setForm({ ...form, saldoInicial: parseFloat(e.target.value) || 0 })} className={campo} />
              </div>
              <div>
                <label className={rotulo}>Data do saldo inicial</label>
                <input type="date" value={form.dataSaldoInicial} onChange={e => setForm({ ...form, dataSaldoInicial: e.target.value })} className={campo} />
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <input type="checkbox" checked={form.padrao} onChange={e => setForm({ ...form, padrao: e.target.checked })} /> Conta padrão
                </label>
                <label className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <input type="checkbox" checked={form.ativa} onChange={e => setForm({ ...form, ativa: e.target.checked })} /> Ativa
                </label>
              </div>
              <div className="md:col-span-3">
                <label className={rotulo}>Observação</label>
                <input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} className={campo} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAberto(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ContasBancariasTab;
