import React, { useMemo, useState } from 'react';
import { Plus, X, Store, MessageCircle, BadgeDollarSign, Ban, Trash2, Eye, Landmark, Settings2 } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { VendaRevenda, ItemVendaRevenda, FormaPagamentoComercial, TributacaoIcmsItem, ImpostosVenda } from '../types';
import { DataGrid, GridStatus } from './ui/DataGrid';
import { abrirLinkExterno, montarLinkWhatsApp, getTelefoneContato } from '../utils/whatsappHelpers';
import { mensagemCobranca, mensagemComprovanteVenda } from '../utils/mensagensWhatsApp';
import {
  FORMAS_PAGAMENTO_COMERCIAL, dataBR, descreverParcelamento, formatarMoeda, gerarParcelas, hojeISO, rotuloFormaPagamento,
} from '../utils/parcelamento';
import { OPCOES_TRIBUTACAO_ICMS, calcularImpostosVenda, configTributaria, sugerirTributacaoIcms } from '../utils/impostosRevenda';
import { ConfigTributariaModal, ApuracaoImpostosModal } from './ImpostosRevendaModais';

const inputCls = 'w-full p-2.5 border border-slate-200 rounded-xl';
const labelCls = 'block text-slate-700 font-bold mb-1';

interface FormVenda {
  numeroVenda: string;
  dataVenda: string;
  clienteId: string;
  desconto: number;
  formaPagamento: FormaPagamentoComercial;
  numeroParcelas: number;
  intervaloDias: number;
  primeiroVencimento: string;
  quitarPrimeiraParcela: boolean;
  observacoes: string;
}

const novoForm = (): FormVenda => ({
  numeroVenda: `VD-${Date.now().toString().slice(-6)}`,
  dataVenda: hojeISO(),
  clienteId: '',
  desconto: 0,
  formaPagamento: 'PIX',
  numeroParcelas: 1,
  intervaloDias: 30,
  primeiroVencimento: hojeISO(),
  quitarPrimeiraParcela: true,
  observacoes: '',
});

const itemVazio = (): ItemVendaRevenda => ({ estoqueItemId: '', descricao: '', unidade: 'UN', quantidade: 1, precoUnitario: 0, subtotal: 0 });

export const RevendasTab: React.FC<{ canWrite: boolean; onBlocked: () => void }> = ({ canWrite, onBlocked }) => {
  const {
    vendasRevenda, addVendaRevenda, cancelarVendaRevenda, deleteVendaRevenda,
    clientes, estoque, fornecedores, contasPagarReceber, currentTenant, config,
  } = useCoop();
  const cfgTrib = configTributaria(config?.tributacaoRevenda);
  const [showConfigTrib, setShowConfigTrib] = useState(false);
  const [showApuracao, setShowApuracao] = useState(false);

  const [filtroStatus, setFiltroStatus] = useState<'TODAS' | 'CONCLUIDA' | 'CANCELADA'>('TODAS');
  const [showModal, setShowModal] = useState(false);
  const [detalhe, setDetalhe] = useState<VendaRevenda | null>(null);
  const [form, setForm] = useState<FormVenda>(novoForm());
  const [itens, setItens] = useState<ItemVendaRevenda[]>([itemVazio()]);
  const [erro, setErro] = useState('');

  const cooperativa = currentTenant?.name || currentTenant?.razaoSocial || 'Cooperativa';
  const clientesAtivos = clientes.filter(c => c.ativo !== false);
  // Produtos ativos; os marcados "para revenda" (Compras → Produtos & Insumos) aparecem primeiro.
  const produtosVenda = estoque
    .filter(p => p.ativo !== false)
    .sort((a, b) => Number(!!b.paraRevenda) - Number(!!a.paraRevenda) || a.nomeItem.localeCompare(b.nomeItem, 'pt-BR'));

  const linhas = useMemo(
    () => vendasRevenda.filter(v => filtroStatus === 'TODAS' || v.status === filtroStatus),
    [vendasRevenda, filtroStatus]
  );

  const parcelasDaVenda = (v: VendaRevenda) => contasPagarReceber.filter(c => (v.contasReceberIds || []).includes(c.id));
  const emAberto = (v: VendaRevenda) => parcelasDaVenda(v).filter(c => c.status !== 'PAGO' && c.status !== 'CANCELADO');

  const totalBruto = itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0), 0);
  const totalVenda = Math.max(0, totalBruto - (Number(form.desconto) || 0));
  const previa = gerarParcelas(totalVenda, form.numeroParcelas, form.primeiroVencimento, form.intervaloDias);

  // Impostos da venda (regras do Ceará) conforme o cliente e os produtos
  const clienteForm = clientes.find(c => c.id === form.clienteId);
  const ufCliente = (clienteForm?.uf || 'CE').toUpperCase();
  const clienteContribuinte = !!clienteForm?.inscricaoEstadual && !/isento/i.test(clienteForm.inscricaoEstadual);
  const impostosPrevia: ImpostosVenda = calcularImpostosVenda(
    itens.filter(i => i.estoqueItemId), Number(form.desconto) || 0, ufCliente, clienteContribuinte, cfgTrib
  );

  const abrirNova = () => {
    if (!canWrite) { onBlocked(); return; }
    if (!clientesAtivos.length) { alert('Cadastre um cliente na aba Clientes antes de lançar uma venda.'); return; }
    setForm({ ...novoForm(), clienteId: clientesAtivos[0].id });
    setItens([itemVazio()]);
    setErro('');
    setShowModal(true);
  };

  const atualizarItem = (idx: number, dados: Partial<ItemVendaRevenda>) =>
    setItens(prev => prev.map((it, i) => (i === idx ? { ...it, ...dados } : it)));

  const escolherProduto = (idx: number, estoqueItemId: string) => {
    const p = estoque.find(e => e.id === estoqueItemId);
    atualizarItem(idx, {
      estoqueItemId,
      descricao: p?.nomeItem || '',
      unidade: p?.unidadeMedida || 'UN',
      custoUnitario: p?.valorUnitarioMedio || 0,
      precoUnitario: p?.precoVenda || itens[idx]?.precoUnitario || p?.valorUnitarioMedio || 0,
      tributacaoIcms: p?.tributacaoIcms || sugerirTributacaoIcms(p?.nomeItem, p?.categoria),
      fornecedorId: p?.fornecedorPadraoId || itens[idx]?.fornecedorId,
    });
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { onBlocked(); return; }
    setErro('');
    const cliente = clientes.find(c => c.id === form.clienteId);
    if (!cliente) { setErro('Selecione o cliente.'); return; }
    const validos = itens
      .filter(i => i.estoqueItemId && Number(i.quantidade) > 0)
      .map(i => {
        const forn = fornecedores.find(f => f.id === i.fornecedorId);
        const item: ItemVendaRevenda = {
          estoqueItemId: i.estoqueItemId,
          descricao: i.descricao,
          unidade: i.unidade,
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario) || 0,
          custoUnitario: Number(i.custoUnitario) || 0,
          subtotal: Number(((Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0)).toFixed(2)),
          tributacaoIcms: i.tributacaoIcms || 'TRIBUTADO',
        };
        if (forn) { item.fornecedorId = forn.id; item.fornecedorNome = forn.nomeFantasia || forn.razaoSocial; }
        return item;
      });
    if (!validos.length) { setErro('Adicione ao menos um produto com quantidade.'); return; }
    if (totalVenda <= 0) { setErro('O total da venda deve ser maior que zero.'); return; }
    const id = addVendaRevenda({
      numeroVenda: form.numeroVenda.trim() || `VD-${Date.now().toString().slice(-6)}`,
      dataVenda: form.dataVenda,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      itens: validos,
      desconto: Number(form.desconto) || 0,
      valorTotal: Number(totalVenda.toFixed(2)),
      formaPagamento: form.formaPagamento,
      numeroParcelas: Math.max(1, Number(form.numeroParcelas) || 1),
      intervaloDias: Math.max(0, Number(form.intervaloDias) || 0),
      primeiroVencimento: form.primeiroVencimento || form.dataVenda,
      observacoes: form.observacoes,
      impostos: calcularImpostosVenda(validos, Number(form.desconto) || 0, ufCliente, clienteContribuinte, cfgTrib),
      quitarPrimeiraParcela: form.quitarPrimeiraParcela,
    });
    if (id) setShowModal(false);
  };

  const enviarParaCliente = (v: VendaRevenda, texto: string) => {
    const cliente = clientes.find(c => c.id === v.clienteId);
    const tel = getTelefoneContato(cliente);
    if (!tel) { alert('O cliente desta venda não tem WhatsApp ou telefone cadastrado.'); return; }
    abrirLinkExterno(montarLinkWhatsApp(tel, texto));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mr-auto">
          <Store className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-black text-slate-900">Revenda de Produtos</h2>
            <p className="text-xs text-slate-500">Vendas dos itens do estoque: baixa o estoque, gera o contas a receber e o lançamento contábil.</p>
          </div>
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as typeof filtroStatus)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
          <option value="TODAS">Todas</option>
          <option value="CONCLUIDA">Concluídas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
        <button onClick={() => { if (!canWrite) { onBlocked(); return; } setShowConfigTrib(true); }} className="px-3 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-2" title="Regime e alíquotas usados no cálculo dos impostos">
          <Settings2 className="w-4 h-4" /> Configuração tributária
        </button>
        <button onClick={() => setShowApuracao(true)} className="px-3 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-2" title="Soma os impostos das vendas do mês e gera as guias no Contas a Pagar">
          <Landmark className="w-4 h-4" /> Apurar impostos do mês
        </button>
        <button onClick={abrirNova} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Venda
        </button>
      </div>

      <DataGrid
        rows={linhas}
        getRowId={v => v.id}
        pageSize={20}
        onRowDoubleClick={v => setDetalhe(v)}
        panelTitle={v => `Venda ${v.numeroVenda}`}
        panelSubtitle={v => v.clienteNome}
        emptyMessage="Nenhuma venda registrada."
        summary={<span className="text-xs font-bold text-slate-600">Total no filtro: {formatarMoeda(linhas.filter(v => v.status !== 'CANCELADA').reduce((s, v) => s + v.valorTotal, 0))}</span>}
        columns={[
          {
            key: 'status', header: 'Status', width: 120,
            value: v => (v.status === 'CANCELADA' ? 'Cancelada' : emAberto(v).length ? 'Em aberto' : 'Recebida'),
            render: v => v.status === 'CANCELADA'
              ? <GridStatus tone="danger" label="Cancelada" />
              : emAberto(v).length ? <GridStatus tone="warning" label="Em aberto" /> : <GridStatus tone="success" label="Recebida" />,
          },
          { key: 'numeroVenda', header: 'Nº Venda', width: 110 },
          { key: 'dataVenda', header: 'Data', width: 100, render: v => dataBR(v.dataVenda) },
          { key: 'clienteNome', header: 'Cliente', width: 220 },
          { key: 'itens', header: 'Produtos', width: 220, value: v => v.itens.map(i => `${i.quantidade} ${i.unidade} ${i.descricao}`).join('; ') },
          { key: 'formaPagamento', header: 'Pagamento', width: 140, value: v => `${rotuloFormaPagamento(v.formaPagamento)} ${v.numeroParcelas > 1 ? `${v.numeroParcelas}x` : 'à vista'}` },
          { key: 'impostos', header: 'Impostos', width: 110, align: 'right', value: v => v.impostos?.totalRecolher ?? 0, render: v => (v.impostos ? formatarMoeda(v.impostos.totalRecolher) : '—') },
          { key: 'valorTotal', header: 'Total', width: 120, align: 'right', value: v => v.valorTotal, render: v => formatarMoeda(v.valorTotal) },
        ]}
        actions={[
          { label: 'Ver detalhes', icon: Eye, onClick: v => setDetalhe(v) },
          { label: 'Enviar comprovante (WhatsApp)', icon: MessageCircle, onClick: v => enviarParaCliente(v, mensagemComprovanteVenda(cooperativa, v, parcelasDaVenda(v))) },
          {
            label: 'Cobrar por WhatsApp', icon: BadgeDollarSign,
            hidden: v => v.status === 'CANCELADA' || emAberto(v).length === 0,
            onClick: v => enviarParaCliente(v, mensagemCobranca(cooperativa, v.clienteNome, parcelasDaVenda(v))),
          },
          {
            label: 'Cancelar venda', icon: Ban, tone: 'danger', divider: true,
            hidden: v => v.status === 'CANCELADA',
            onClick: v => {
              if (!canWrite) { onBlocked(); return; }
              if (confirm(`Cancelar a venda ${v.numeroVenda}? Os produtos voltam ao estoque e as parcelas em aberto são canceladas no Financeiro.`)) cancelarVendaRevenda(v.id);
            },
          },
          {
            label: 'Excluir', icon: Trash2, tone: 'danger',
            hidden: v => v.status !== 'CANCELADA',
            onClick: v => {
              if (!canWrite) { onBlocked(); return; }
              if (confirm(`Excluir o registro da venda cancelada ${v.numeroVenda}?`)) deleteVendaRevenda(v.id);
            },
          },
        ]}
      />

      {detalhe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setDetalhe(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-xs" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Venda {detalhe.numeroVenda} — {detalhe.clienteNome}</h2>
              <button onClick={() => setDetalhe(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-slate-600">Data: {dataBR(detalhe.dataVenda)} · {descreverParcelamento(detalhe.formaPagamento, detalhe.valorTotal, detalhe.numeroParcelas, detalhe.intervaloDias)}{detalhe.status === 'CANCELADA' ? ' · CANCELADA' : ''}</div>
            <table className="w-full">
              <thead><tr className="text-left text-slate-500"><th className="py-1">Produto</th><th>Fornecedor</th><th className="text-right">Qtd</th><th className="text-right">Preço</th><th className="text-right">Subtotal</th></tr></thead>
              <tbody>
                {detalhe.itens.map((i, idx) => (
                  <tr key={idx} className="border-t border-slate-100"><td className="py-1">{i.descricao}</td><td>{i.fornecedorNome || '—'}</td><td className="text-right">{i.quantidade} {i.unidade}</td><td className="text-right">{formatarMoeda(i.precoUnitario)}</td><td className="text-right">{formatarMoeda(i.subtotal)}</td></tr>
                ))}
              </tbody>
            </table>
            {!!detalhe.desconto && <div className="text-right">Desconto: {formatarMoeda(detalhe.desconto)}</div>}
            <div className="text-right font-black text-emerald-700 text-sm">Total: {formatarMoeda(detalhe.valorTotal)}</div>
            {detalhe.impostos && <QuadroImpostos impostos={detalhe.impostos} />}
            <div>
              <div className="font-bold text-slate-700 mb-1">Parcelas no Contas a Receber</div>
              {parcelasDaVenda(detalhe).sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)).map(c => (
                <div key={c.id} className="flex justify-between border-t border-slate-100 py-1">
                  <span>{c.descricao}</span>
                  <span>{dataBR(c.dataVencimento)} · {formatarMoeda(c.valor)} · <strong className={c.status === 'PAGO' ? 'text-emerald-700' : c.status === 'CANCELADO' ? 'text-slate-400' : 'text-amber-600'}>{c.status === 'PAGO' ? 'Recebido' : c.status === 'CANCELADO' ? 'Cancelado' : 'Em aberto'}</strong></span>
                </div>
              ))}
              {parcelasDaVenda(detalhe).length === 0 && <div className="text-slate-400">Nenhuma parcela encontrada.</div>}
            </div>
          </div>
        </div>
      )}

      {showConfigTrib && <ConfigTributariaModal onClose={() => setShowConfigTrib(false)} />}
      {showApuracao && <ApuracaoImpostosModal canWrite={canWrite} onBlocked={onBlocked} onClose={() => setShowApuracao(false)} />}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Store className="w-5 h-5 text-emerald-600" /> Nova Venda (Revenda)</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={salvar} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-[140px_150px_1fr] gap-3">
                <div><label className={labelCls}>Nº da Venda</label><input value={form.numeroVenda} onChange={e => setForm({ ...form, numeroVenda: e.target.value })} className={`${inputCls} font-mono font-bold`} /></div>
                <div><label className={labelCls}>Data *</label><input type="date" required value={form.dataVenda} onChange={e => setForm({ ...form, dataVenda: e.target.value, primeiroVencimento: form.numeroParcelas === 1 ? e.target.value : form.primeiroVencimento })} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Cliente *</label>
                  <select required value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })} className={`${inputCls} bg-white font-bold`}>
                    {clientesAtivos.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.documento})</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-slate-800">Produtos vendidos</div>
                    <div className="text-[10px] text-slate-500">Cadastre os produtos em Compras → Produtos & Insumos. A quantidade vendida sai do estoque.</div>
                  </div>
                  <button type="button" onClick={() => setItens([...itens, itemVazio()])} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold">+ Adicionar produto</button>
                </div>
                <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[660px] text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-2 py-2 text-left font-bold w-8">#</th>
                        <th className="px-2 py-2 text-left font-bold">Produto / insumo</th>
                        <th className="px-2 py-2 text-left font-bold w-36">ICMS</th>
                        <th className="px-2 py-2 text-right font-bold w-20">Qtd.</th>
                        <th className="px-2 py-2 text-right font-bold w-24">Preço unit.</th>
                        <th className="px-2 py-2 text-right font-bold w-24">Subtotal</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itens.map((item, idx) => {
                        const est = estoque.find(e => e.id === item.estoqueItemId);
                        const semSaldo = !!est && Number(item.quantidade) > est.quantidadeAtual;
                        return (
                          <tr key={idx} className={semSaldo ? 'bg-rose-50/60 align-top' : 'align-top'}>
                            <td className="px-2 py-1.5 font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-2 py-1.5">
                              <select required value={item.estoqueItemId} onChange={e => escolherProduto(idx, e.target.value)} className="w-full p-1.5 border border-slate-200 rounded-lg bg-white">
                                <option value="">Selecione</option>
                                {produtosVenda.map(p => <option key={p.id} value={p.id}>{p.nomeItem} — saldo {p.quantidadeAtual} {p.unidadeMedida}{p.precoVenda ? ` — ${formatarMoeda(p.precoVenda)}` : ''}</option>)}
                              </select>
                              {semSaldo && <div className="mt-0.5 text-[10px] font-bold text-rose-600">Saldo insuficiente: disponível {est?.quantidadeAtual} {est?.unidadeMedida}.</div>}
                            </td>
                            <td className="px-2 py-1.5">
                              <select value={item.tributacaoIcms || 'TRIBUTADO'} onChange={e => atualizarItem(idx, { tributacaoIcms: e.target.value as TributacaoIcmsItem })} className="w-full p-1.5 border border-slate-200 rounded-lg bg-white">
                                {OPCOES_TRIBUTACAO_ICMS.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min="0.01" step="any" required value={item.quantidade} onChange={e => atualizarItem(idx, { quantidade: Number(e.target.value) || 0 })} className={`w-full p-1.5 border rounded-lg text-right ${semSaldo ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`} />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min="0" step="0.01" required value={item.precoUnitario} onChange={e => atualizarItem(idx, { precoUnitario: Number(e.target.value) || 0 })} className="w-full p-1.5 border border-slate-200 rounded-lg text-right" />
                            </td>
                            <td className="px-2 py-1.5 pt-3 text-right font-bold text-slate-700 whitespace-nowrap">{formatarMoeda((Number(item.quantidade) || 0) * (Number(item.precoUnitario) || 0))}</td>
                            <td className="px-1 py-1.5 text-center">
                              <button type="button" title="Remover produto" onClick={() => setItens(itens.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50">×</button>
                            </td>
                          </tr>
                        );
                      })}
                      {itens.length === 0 && (
                        <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-400">Nenhum produto. Clique em “+ Adicionar produto”.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{itens.length} produto(s)</span>
                  <span className="font-black text-emerald-700">Total dos produtos: {formatarMoeda(totalBruto)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div><label className={labelCls}>Desconto (R$)</label><input type="number" min="0" step="0.01" value={form.desconto} onChange={e => setForm({ ...form, desconto: Number(e.target.value) || 0 })} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Forma de pagamento *</label>
                  <select value={form.formaPagamento} onChange={e => setForm({ ...form, formaPagamento: e.target.value as FormaPagamentoComercial })} className={`${inputCls} bg-white`}>
                    {FORMAS_PAGAMENTO_COMERCIAL.map(f => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Parcelas</label>
                  <select value={form.numeroParcelas} onChange={e => { const n = Number(e.target.value); setForm({ ...form, numeroParcelas: n, quitarPrimeiraParcela: n === 1 ? form.quitarPrimeiraParcela : false }); }} className={`${inputCls} bg-white`}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n === 1 ? 'À vista (1x)' : `${n}x`}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>1º vencimento</label><input type="date" value={form.primeiroVencimento} onChange={e => setForm({ ...form, primeiroVencimento: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>Intervalo (dias)</label><input type="number" min="0" disabled={form.numeroParcelas === 1} value={form.intervaloDias} onChange={e => setForm({ ...form, intervaloDias: Number(e.target.value) || 0 })} className={inputCls} /></div>
              </div>

              <label className="flex items-center gap-2 font-bold text-slate-700">
                <input type="checkbox" checked={form.quitarPrimeiraParcela} onChange={e => setForm({ ...form, quitarPrimeiraParcela: e.target.checked })} />
                {form.numeroParcelas === 1 ? 'Valor já recebido (lança como pago)' : '1ª parcela já recebida (entrada)'}
              </label>

              <div><label className={labelCls}>Observações</label><input value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className={inputCls} /></div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                <div className="flex justify-between font-black text-sm"><span>Total da venda</span><span>{formatarMoeda(totalVenda)}</span></div>
                {previa.map(p => (
                  <div key={p.numero} className="flex justify-between">
                    <span>{previa.length > 1 ? `Parcela ${p.numero}/${previa.length}` : 'Parcela única'} — venc. {dataBR(p.vencimento)}</span>
                    <span>{formatarMoeda(p.valor)}{p.numero === 1 && form.quitarPrimeiraParcela ? ' (recebida)' : ''}</span>
                  </div>
                ))}
                <div className="text-emerald-700 pt-1">Ao salvar: baixa no estoque, {previa.length} conta(s) a receber no Financeiro e lançamento contábil automático.</div>
              </div>

              <QuadroImpostos impostos={impostosPrevia} titulo={`Impostos estimados (${ufCliente === 'CE' ? 'venda dentro do Ceará' : `CE → ${ufCliente}`})`} />

              {erro && <p className="text-rose-600 font-bold">{erro}</p>}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">Registrar Venda</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/** Quadro com o detalhamento dos impostos de uma venda. */
export const QuadroImpostos: React.FC<{ impostos: ImpostosVenda; titulo?: string }> = ({ impostos, titulo = 'Impostos da venda' }) => {
  const linhas: [string, number][] = ([
    ['ICMS', impostos.icms], ['FECOP', impostos.fecop], ['PIS', impostos.pis], ['COFINS', impostos.cofins],
    ['IRPJ', impostos.irpj], ['CSLL', impostos.csll], ['Simples Nacional (DAS)', impostos.das],
  ] as [string, number][]).filter(([, v]) => v > 0);
  return (
    <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-[11px] text-slate-700 space-y-1">
      <div className="font-extrabold text-slate-800">{titulo}</div>
      {linhas.length === 0 && <div className="text-slate-500">Sem impostos a recolher nesta venda.</div>}
      {linhas.map(([n, v]) => (
        <div key={n} className="flex justify-between"><span>{n}</span><span className="font-bold">{formatarMoeda(v)}</span></div>
      ))}
      <div className="flex justify-between border-t border-amber-200 pt-1 font-black text-amber-800">
        <span>Total a recolher</span><span>{formatarMoeda(impostos.totalRecolher)}</span>
      </div>
      {(impostos.cbs > 0 || impostos.ibs > 0) && (
        <div className="flex justify-between text-slate-500"><span>CBS / IBS (informativo 2026)</span><span>{formatarMoeda(impostos.cbs)} / {formatarMoeda(impostos.ibs)}</span></div>
      )}
      <ul className="list-disc list-inside text-[10px] text-slate-500 pt-1">
        {impostos.observacoes.map((o, i) => <li key={i}>{o}</li>)}
      </ul>
    </div>
  );
};
