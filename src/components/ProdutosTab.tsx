import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search, Package, Power } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { ItemEstoque, TributacaoIcmsItem } from '../types';
import { DataGrid, GridStatus } from './ui/DataGrid';
import { formatarMoeda } from '../utils/parcelamento';
import { OPCOES_TRIBUTACAO_ICMS, sugerirTributacaoIcms } from '../utils/impostosRevenda';

/**
 * Cadastro de Produtos & Insumos (Compras & Insumos → Produtos).
 * Os produtos ficam no mesmo cadastro do Galpão & Estoque, então são usados
 * nas Ordens de Compra, na Revenda de Produtos e no controle de saldo.
 */

type FormProduto = Omit<ItemEstoque, 'id' | 'tenantId'>;

const CATEGORIAS_PADRAO = [
  'Insumos Agropecuários', 'Adubos e Fertilizantes', 'Sementes e Mudas', 'Rações e Nutrição Animal',
  'Defensivos Agrícolas', 'Medicamentos Veterinários', 'Ferramentas e Equipamentos', 'Embalagens',
  'Hortifruti', 'Mercadorias para Revenda', 'Material de Consumo',
];
const UNIDADES = ['UN', 'KG', 'G', 'L', 'ML', 'SC', 'CX', 'FD', 'PCT', 'M', 'TON', 'DZ'];

const formVazio = (): FormProduto => ({
  codigoSku: '',
  nomeItem: '',
  descricao: '',
  categoria: 'Mercadorias para Revenda',
  unidadeMedida: 'UN',
  quantidadeAtual: 0,
  quantidadeMinima: 0,
  valorUnitarioMedio: 0,
  precoVenda: 0,
  tributacaoIcms: 'TRIBUTADO',
  ncm: '',
  fornecedorPadraoId: '',
  localizacaoGalpao: '',
  paraRevenda: true,
  ativo: true,
});

const inputCls = 'w-full p-2.5 border border-slate-200 rounded-xl';
const labelCls = 'block text-slate-700 font-bold mb-1';
const margem = (custo?: number, venda?: number) => (custo && venda ? ((venda - custo) / custo) * 100 : 0);

export const ProdutosTab: React.FC<{ canWrite: boolean; onBlocked: () => void }> = ({ canWrite, onBlocked }) => {
  const { estoque, addItemEstoque, updateItemEstoque, deleteItemEstoque, fornecedores } = useCoop();

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'TODOS' | 'REVENDA' | 'INSUMOS' | 'INATIVOS'>('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<ItemEstoque | null>(null);
  const [form, setForm] = useState<FormProduto>(formVazio());
  const [erro, setErro] = useState('');

  const categorias = useMemo(
    () => Array.from(new Set([...CATEGORIAS_PADRAO, ...estoque.map(i => i.categoria).filter(Boolean)])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [estoque]
  );

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return estoque.filter(i => {
      if (filtro === 'INATIVOS' ? i.ativo !== false : i.ativo === false) return false;
      if (filtro === 'REVENDA' && !i.paraRevenda) return false;
      if (filtro === 'INSUMOS' && i.paraRevenda) return false;
      if (filtroCategoria !== 'TODAS' && i.categoria !== filtroCategoria) return false;
      if (!termo) return true;
      return [i.nomeItem, i.codigoSku, i.codigoItem, i.categoria, i.ncm].some(v => (v || '').toLowerCase().includes(termo));
    });
  }, [estoque, busca, filtro, filtroCategoria]);

  const abrir = (p?: ItemEstoque) => {
    if (!canWrite) { onBlocked(); return; }
    setErro('');
    if (p) {
      const { id: _id, tenantId: _t, ...resto } = p;
      setEditando(p);
      setForm({ ...formVazio(), ...resto, paraRevenda: !!p.paraRevenda, tributacaoIcms: p.tributacaoIcms || sugerirTributacaoIcms(p.nomeItem, p.categoria) });
    } else {
      setEditando(null);
      setForm({ ...formVazio(), codigoSku: `PRD-${Date.now().toString().slice(-6)}` });
    }
    setShowModal(true);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { onBlocked(); return; }
    if (!form.nomeItem.trim()) { setErro('Informe o nome do produto.'); return; }
    if (!form.categoria.trim()) { setErro('Informe a categoria.'); return; }
    const dados: FormProduto = {
      ...form,
      nomeItem: form.nomeItem.trim(),
      categoria: form.categoria.trim(),
      quantidadeAtual: Number(form.quantidadeAtual) || 0,
      quantidadeMinima: Number(form.quantidadeMinima) || 0,
      valorUnitarioMedio: Number(form.valorUnitarioMedio) || 0,
      precoVenda: Number(form.precoVenda) || 0,
    };
    if (editando) {
      // O saldo só muda por movimentação (compra, venda, ajuste no Galpão & Estoque).
      const { quantidadeAtual: _q, ...semSaldo } = dados;
      updateItemEstoque(editando.id, semSaldo);
    } else {
      addItemEstoque(dados);
    }
    setShowModal(false);
  };

  const set = <K extends keyof FormProduto>(k: K, v: FormProduto[K]) => setForm(prev => ({ ...prev, [k]: v }));
  const nomeFornecedor = (id?: string) => {
    const f = fornecedores.find(x => x.id === id);
    return f ? f.nomeFantasia || f.razaoSocial : '';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mr-auto">
          <Package className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-black text-slate-900">Produtos & Insumos</h2>
            <p className="text-xs text-slate-500">Cadastro usado nas Ordens de Compra, na Revenda de Produtos e no Galpão & Estoque.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, código, NCM..." className="pl-8 p-2 border border-slate-200 rounded-xl text-xs w-52" />
        </div>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white max-w-[200px]">
          <option value="TODAS">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtro} onChange={e => setFiltro(e.target.value as typeof filtro)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
          <option value="TODOS">Todos os ativos</option>
          <option value="REVENDA">Para revenda</option>
          <option value="INSUMOS">Insumos / uso próprio</option>
          <option value="INATIVOS">Inativos</option>
        </select>
        <button onClick={() => abrir()} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <DataGrid
        rows={linhas}
        getRowId={p => p.id}
        pageSize={20}
        onRowDoubleClick={p => abrir(p)}
        panelTitle={p => p.nomeItem}
        panelSubtitle={p => p.codigoSku || p.codigoItem || p.categoria}
        emptyMessage="Nenhum produto encontrado. Clique em Novo Produto para cadastrar."
        columns={[
          {
            key: 'saldo', header: 'Saldo', width: 110, align: 'right',
            value: p => p.quantidadeAtual,
            render: p => <GridStatus tone={p.quantidadeAtual <= 0 ? 'danger' : p.quantidadeAtual <= (p.quantidadeMinima || p.estoqueMinimo || 0) ? 'warning' : 'success'} label={`${p.quantidadeAtual} ${p.unidadeMedida}`} />,
          },
          { key: 'codigoSku', header: 'Código', width: 110, value: p => p.codigoSku || p.codigoItem || '' },
          { key: 'nomeItem', header: 'Produto', width: 230 },
          { key: 'categoria', header: 'Categoria', width: 170 },
          { key: 'paraRevenda', header: 'Uso', width: 90, value: p => (p.paraRevenda ? 'Revenda' : 'Insumo') },
          { key: 'custo', header: 'Custo médio', width: 110, align: 'right', value: p => p.valorUnitarioMedio || 0, render: p => formatarMoeda(p.valorUnitarioMedio || 0) },
          { key: 'precoVenda', header: 'Preço venda', width: 110, align: 'right', value: p => p.precoVenda || 0, render: p => (p.precoVenda ? formatarMoeda(p.precoVenda) : '—') },
          { key: 'margem', header: 'Margem', width: 80, align: 'right', value: p => margem(p.valorUnitarioMedio, p.precoVenda), render: p => (p.precoVenda && p.valorUnitarioMedio ? `${margem(p.valorUnitarioMedio, p.precoVenda).toFixed(1)}%` : '—') },
          { key: 'icms', header: 'ICMS', width: 150, value: p => OPCOES_TRIBUTACAO_ICMS.find(o => o.valor === (p.tributacaoIcms || 'TRIBUTADO'))?.rotulo || '' },
          { key: 'fornecedor', header: 'Fornecedor padrão', width: 170, value: p => nomeFornecedor(p.fornecedorPadraoId) },
        ]}
        actions={[
          { label: 'Editar', icon: Pencil, onClick: p => abrir(p) },
          {
            label: 'Ativar / Inativar', icon: Power,
            onClick: p => { if (!canWrite) { onBlocked(); return; } updateItemEstoque(p.id, { ativo: p.ativo === false }); },
          },
          {
            label: 'Excluir', icon: Trash2, tone: 'danger', divider: true,
            onClick: p => {
              if (!canWrite) { onBlocked(); return; }
              if (confirm(`Deseja excluir o produto ${p.nomeItem}? Se ele já foi usado em compras ou vendas, prefira inativar.`)) deleteItemEstoque(p.id);
            },
          },
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" /> {editando ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={salvar} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
                <div><label className={labelCls}>Código (SKU)</label><input value={form.codigoSku} onChange={e => set('codigoSku', e.target.value)} className={`${inputCls} font-mono`} /></div>
                <div>
                  <label className={labelCls}>Nome do produto *</label>
                  <input
                    required
                    value={form.nomeItem}
                    onChange={e => set('nomeItem', e.target.value)}
                    onBlur={() => { if (!editando) set('tributacaoIcms', sugerirTributacaoIcms(form.nomeItem, form.categoria)); }}
                    className={inputCls}
                    placeholder="Ex: Adubo NPK 10-10-10 50kg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_1fr] gap-3">
                <div>
                  <label className={labelCls}>Categoria *</label>
                  <input required list="categorias-produtos" value={form.categoria} onChange={e => set('categoria', e.target.value)} className={inputCls} />
                  <datalist id="categorias-produtos">{categorias.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className={labelCls}>Unidade *</label>
                  <select value={form.unidadeMedida} onChange={e => set('unidadeMedida', e.target.value)} className={`${inputCls} bg-white`}>
                    {Array.from(new Set([...UNIDADES, form.unidadeMedida])).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Fornecedor padrão</label>
                  <select value={form.fornecedorPadraoId || ''} onChange={e => set('fornecedorPadraoId', e.target.value)} className={`${inputCls} bg-white`}>
                    <option value="">—</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nomeFantasia || f.razaoSocial}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>{editando ? 'Saldo atual' : 'Saldo inicial'}</label>
                  <input type="number" min="0" step="any" disabled={!!editando} value={form.quantidadeAtual} onChange={e => set('quantidadeAtual', Number(e.target.value) || 0)} className={`${inputCls} disabled:bg-slate-100`} />
                </div>
                <div><label className={labelCls}>Estoque mínimo</label><input type="number" min="0" step="any" value={form.quantidadeMinima} onChange={e => set('quantidadeMinima', Number(e.target.value) || 0)} className={inputCls} /></div>
                <div><label className={labelCls}>Custo unitário (R$)</label><input type="number" min="0" step="0.01" value={form.valorUnitarioMedio} onChange={e => set('valorUnitarioMedio', Number(e.target.value) || 0)} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Preço de venda (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.precoVenda} onChange={e => set('precoVenda', Number(e.target.value) || 0)} className={inputCls} />
                  {!!form.valorUnitarioMedio && !!form.precoVenda && (
                    <div className={`mt-1 font-bold ${margem(form.valorUnitarioMedio, form.precoVenda) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>Margem {margem(form.valorUnitarioMedio, form.precoVenda).toFixed(1)}%</div>
                  )}
                </div>
              </div>
              {editando && <p className="text-[11px] text-slate-500 -mt-2">O saldo muda pelas compras, vendas e movimentações do Galpão & Estoque.</p>}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_1fr] gap-3">
                <div>
                  <label className={labelCls}>Tributação do ICMS na venda (CE)</label>
                  <select value={form.tributacaoIcms || 'TRIBUTADO'} onChange={e => set('tributacaoIcms', e.target.value as TributacaoIcmsItem)} className={`${inputCls} bg-white`}>
                    {OPCOES_TRIBUTACAO_ICMS.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>NCM</label><input value={form.ncm} onChange={e => set('ncm', e.target.value.replace(/[^\d.]/g, '').slice(0, 10))} placeholder="0000.00.00" className={inputCls} /></div>
                <div><label className={labelCls}>Localização no galpão</label><input value={form.localizacaoGalpao} onChange={e => set('localizacaoGalpao', e.target.value)} className={inputCls} /></div>
              </div>

              <div><label className={labelCls}>Descrição / observações</label><input value={form.descricao} onChange={e => set('descricao', e.target.value)} className={inputCls} /></div>

              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input type="checkbox" checked={!!form.paraRevenda} onChange={e => set('paraRevenda', e.target.checked)} /> Disponível para revenda
                </label>
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input type="checkbox" checked={form.ativo !== false} onChange={e => set('ativo', e.target.checked)} /> Produto ativo
                </label>
              </div>

              {erro && <p className="text-rose-600 font-bold">{erro}</p>}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
