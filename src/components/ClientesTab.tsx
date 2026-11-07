import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search, MessageCircle, BadgeDollarSign, Power, Users } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { Cliente } from '../types';
import { DataGrid, GridStatus } from './ui/DataGrid';
import { consultarCnpjReceita } from '../services/cnpjService';
import { abrirLinkExterno, montarLinkWhatsApp, getTelefoneContato } from '../utils/whatsappHelpers';
import { mensagemCobranca } from '../utils/mensagensWhatsApp';
import { formatarMoeda, hojeISO } from '../utils/parcelamento';
import {
  somenteDigitos, cpfValido, cnpjDigitosValidos, formatarDocumento, formatarCep, formatarTelefone, consultarCep,
} from '../utils/documentos';

type FormCliente = Omit<Cliente, 'id' | 'tenantId'>;

const formVazio = (): FormCliente => ({
  tipoPessoa: 'PF',
  nome: '',
  nomeFantasia: '',
  documento: '',
  inscricaoEstadual: '',
  rg: '',
  dataNascimento: '',
  contatoNome: '',
  telefone: '',
  whatsapp: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  limiteCredito: 0,
  observacoes: '',
  ativo: true,
  dataCadastro: hojeISO(),
});

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const inputCls = 'w-full p-2.5 border border-slate-200 rounded-xl';
const labelCls = 'block text-slate-700 font-bold mb-1';

export const ClientesTab: React.FC<{ canWrite: boolean; onBlocked: () => void }> = ({ canWrite, onBlocked }) => {
  const { clientes, addCliente, updateCliente, deleteCliente, vendasRevenda, contasPagarReceber, currentTenant } = useCoop();

  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<'ATIVOS' | 'INATIVOS' | 'TODOS'>('ATIVOS');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormCliente>(formVazio());
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'info'; texto: string } | null>(null);
  const [consultando, setConsultando] = useState(false);

  const cooperativa = currentTenant?.name || currentTenant?.razaoSocial || 'Cooperativa';

  /** Contas a receber de um cliente: parcelas das vendas dele + títulos no nome dele. */
  const contasDoCliente = (c: Cliente) => {
    const ids = new Set(vendasRevenda.filter(v => v.clienteId === c.id).flatMap(v => v.contasReceberIds || []));
    const nome = c.nome.trim().toLowerCase();
    return contasPagarReceber.filter(cp => cp.tipo === 'RECEBER' && (ids.has(cp.id) || (cp.pessoaNome || '').trim().toLowerCase() === nome));
  };
  const emAberto = (c: Cliente) => contasDoCliente(c)
    .filter(cp => cp.status !== 'PAGO' && cp.status !== 'CANCELADO')
    .reduce((s, cp) => s + (Number(cp.valor) || 0), 0);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoDigitos = somenteDigitos(busca);
    return clientes.filter(c => {
      if (filtroAtivo === 'ATIVOS' && c.ativo === false) return false;
      if (filtroAtivo === 'INATIVOS' && c.ativo !== false) return false;
      if (!termo) return true;
      return [c.nome, c.nomeFantasia, c.cidade, c.email].some(v => (v || '').toLowerCase().includes(termo))
        || (!!termoDigitos && somenteDigitos(c.documento).includes(termoDigitos));
    });
  }, [clientes, busca, filtroAtivo]);

  const abrir = (c?: Cliente) => {
    if (!canWrite) { onBlocked(); return; }
    setMensagem(null);
    if (c) {
      const { id: _id, tenantId: _t, ...resto } = c;
      setEditando(c);
      setForm({ ...formVazio(), ...resto });
    } else {
      setEditando(null);
      setForm(formVazio());
    }
    setShowModal(true);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { onBlocked(); return; }
    if (!form.nome.trim()) { setMensagem({ tipo: 'erro', texto: 'Informe o nome / razão social.' }); return; }
    const docOk = form.tipoPessoa === 'PF' ? cpfValido(form.documento) : cnpjDigitosValidos(form.documento);
    if (!docOk) { setMensagem({ tipo: 'erro', texto: `${form.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'} inválido. Confira os números digitados.` }); return; }
    const dados: FormCliente = { ...form, nome: form.nome.trim(), limiteCredito: Number(form.limiteCredito) || 0 };
    if (editando) {
      updateCliente(editando.id, dados);
    } else if (!addCliente(dados)) {
      return;
    }
    setShowModal(false);
  };

  const buscarCnpj = async () => {
    setMensagem(null);
    if (!cnpjDigitosValidos(form.documento)) { setMensagem({ tipo: 'erro', texto: 'CNPJ inválido. Confira os números digitados.' }); return; }
    setConsultando(true);
    try {
      const d = await consultarCnpjReceita(form.documento);
      setForm(prev => ({
        ...prev,
        nome: d.razaoSocial || prev.nome,
        nomeFantasia: d.nomeFantasia || prev.nomeFantasia,
        inscricaoEstadual: d.inscricaoEstadual || prev.inscricaoEstadual,
        telefone: d.telefone || prev.telefone,
        email: d.email || prev.email,
        cep: d.cep ? formatarCep(d.cep) : prev.cep,
        logradouro: d.logradouro || prev.logradouro,
        numero: d.numero || prev.numero,
        complemento: d.complemento || prev.complemento,
        bairro: d.bairro || prev.bairro,
        cidade: d.cidade || prev.cidade,
        uf: d.estado || prev.uf,
      }));
      setMensagem({ tipo: 'info', texto: `Dados da Receita aplicados. Situação cadastral: ${d.situacaoCadastral || 'não informada'}.` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err?.message || 'Não foi possível consultar o CNPJ.' });
    } finally {
      setConsultando(false);
    }
  };

  const buscarCep = async () => {
    setMensagem(null);
    try {
      const end = await consultarCep(form.cep || '');
      setForm(prev => ({ ...prev, logradouro: end.logradouro || prev.logradouro, bairro: end.bairro || prev.bairro, cidade: end.cidade || prev.cidade, uf: end.uf || prev.uf }));
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err?.message || 'Não foi possível consultar o CEP.' });
    }
  };

  const enviarWhatsApp = (c: Cliente, texto: string) => {
    const tel = getTelefoneContato(c);
    if (!tel) { alert('Este cliente não tem WhatsApp ou telefone cadastrado.'); return; }
    abrirLinkExterno(montarLinkWhatsApp(tel, texto));
  };

  const cobrar = (c: Cliente) => {
    const contas = contasDoCliente(c);
    if (!contas.some(cp => cp.status !== 'PAGO' && cp.status !== 'CANCELADO')) { alert('Este cliente não tem valores em aberto.'); return; }
    enviarWhatsApp(c, mensagemCobranca(cooperativa, c.nome, contas));
  };

  const set = <K extends keyof FormCliente>(k: K, v: FormCliente[K]) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mr-auto">
          <Users className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-black text-slate-900">Clientes</h2>
            <p className="text-xs text-slate-500">Cadastro de clientes da revenda, com cobrança e comprovantes por WhatsApp.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, CPF/CNPJ, cidade..." className="pl-8 p-2 border border-slate-200 rounded-xl text-xs w-56" />
        </div>
        <select value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value as typeof filtroAtivo)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
          <option value="ATIVOS">Ativos</option>
          <option value="INATIVOS">Inativos</option>
          <option value="TODOS">Todos</option>
        </select>
        <button onClick={() => abrir()} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <DataGrid
        rows={linhas}
        getRowId={c => c.id}
        pageSize={20}
        onRowDoubleClick={c => abrir(c)}
        panelTitle={c => c.nome}
        panelSubtitle={c => c.documento}
        emptyMessage="Nenhum cliente encontrado."
        columns={[
          { key: 'ativo', header: 'Situação', width: 100, value: c => (c.ativo === false ? 'Inativo' : 'Ativo'), render: c => <GridStatus tone={c.ativo === false ? 'neutral' : 'success'} label={c.ativo === false ? 'Inativo' : 'Ativo'} /> },
          { key: 'tipoPessoa', header: 'PF/PJ', width: 70 },
          { key: 'nome', header: 'Nome / Razão Social', width: 240 },
          { key: 'documento', header: 'CPF/CNPJ', width: 160 },
          { key: 'cidade', header: 'Cidade/UF', width: 160, value: c => [c.cidade, c.uf].filter(Boolean).join('/') },
          { key: 'whatsapp', header: 'WhatsApp', width: 140, value: c => getTelefoneContato(c) },
          { key: 'compras', header: 'Compras', width: 90, align: 'right', value: c => vendasRevenda.filter(v => v.clienteId === c.id && v.status !== 'CANCELADA').length },
          { key: 'aberto', header: 'A receber', width: 130, align: 'right', value: c => emAberto(c), render: c => formatarMoeda(emAberto(c)) },
        ]}
        actions={[
          { label: 'Editar', icon: Pencil, onClick: c => abrir(c) },
          { label: 'Cobrar por WhatsApp', icon: BadgeDollarSign, hidden: c => emAberto(c) <= 0, onClick: c => cobrar(c) },
          { label: 'Mensagem por WhatsApp', icon: MessageCircle, onClick: c => enviarWhatsApp(c, `Olá, ${c.nome}! Aqui é da ${cooperativa}.`) },
          {
            label: 'Ativar / Inativar',
            icon: Power,
            onClick: c => { if (!canWrite) { onBlocked(); return; } updateCliente(c.id, { ativo: c.ativo === false }); },
          },
          {
            label: 'Excluir',
            icon: Trash2,
            tone: 'danger',
            divider: true,
            onClick: c => {
              if (!canWrite) { onBlocked(); return; }
              if (confirm(`Deseja excluir o cliente ${c.nome}?`)) deleteCliente(c.id);
            },
          },
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" /> {editando ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={salvar} className="space-y-4 text-xs">
              <div className="flex gap-2">
                {(['PF', 'PJ'] as const).map(tp => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, tipoPessoa: tp, documento: formatarDocumento(prev.documento, tp) }))}
                    className={`flex-1 p-2.5 rounded-xl border font-bold ${form.tipoPessoa === tp ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {tp === 'PF' ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{form.tipoPessoa === 'PF' ? 'CPF *' : 'CNPJ *'}</label>
                  <div className="flex gap-2">
                    <input
                      required
                      inputMode="numeric"
                      value={form.documento}
                      onChange={e => set('documento', formatarDocumento(e.target.value, form.tipoPessoa))}
                      placeholder={form.tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                      className={inputCls}
                    />
                    {form.tipoPessoa === 'PJ' && (
                      <button type="button" onClick={buscarCnpj} disabled={consultando} className="shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-slate-800 text-white font-bold disabled:opacity-60">
                        <Search className="w-3.5 h-3.5" /> {consultando ? 'Consultando...' : 'Receita'}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{form.tipoPessoa === 'PF' ? 'Nome Completo *' : 'Razão Social *'}</label>
                  <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={inputCls} />
                </div>
                {form.tipoPessoa === 'PJ' ? (
                  <>
                    <div><label className={labelCls}>Nome Fantasia</label><input value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Inscrição Estadual</label><input value={form.inscricaoEstadual} onChange={e => set('inscricaoEstadual', e.target.value)} placeholder="Número da IE ou ISENTO" className={inputCls} /></div>
                    <div><label className={labelCls}>Pessoa de Contato</label><input value={form.contatoNome} onChange={e => set('contatoNome', e.target.value)} className={inputCls} /></div>
                  </>
                ) : (
                  <>
                    <div><label className={labelCls}>RG</label><input value={form.rg} onChange={e => set('rg', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Data de Nascimento</label><input type="date" value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Inscrição Estadual (produtor)</label><input value={form.inscricaoEstadual} onChange={e => set('inscricaoEstadual', e.target.value)} placeholder="Opcional" className={inputCls} /></div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className={labelCls}>Telefone</label><input value={form.telefone} onChange={e => set('telefone', formatarTelefone(e.target.value))} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>WhatsApp</label>
                  <input value={form.whatsapp} onChange={e => set('whatsapp', formatarTelefone(e.target.value))} placeholder="(00) 00000-0000" className={inputCls} />
                  {!form.whatsapp && form.telefone && (
                    <button type="button" onClick={() => set('whatsapp', form.telefone)} className="mt-1 text-emerald-700 font-bold">Usar o telefone</button>
                  )}
                </div>
                <div><label className={labelCls}>E-mail</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_100px] gap-3">
                <div>
                  <label className={labelCls}>CEP</label>
                  <input value={form.cep} onChange={e => set('cep', formatarCep(e.target.value))} onBlur={() => { if (somenteDigitos(form.cep).length === 8 && !form.logradouro) buscarCep(); }} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Logradouro</label>
                  <div className="flex gap-2">
                    <input value={form.logradouro} onChange={e => set('logradouro', e.target.value)} className={inputCls} />
                    <button type="button" onClick={buscarCep} className="shrink-0 px-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Buscar CEP</button>
                  </div>
                </div>
                <div><label className={labelCls}>Número</label><input value={form.numero} onChange={e => set('numero', e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_90px] gap-3">
                <div><label className={labelCls}>Complemento</label><input value={form.complemento} onChange={e => set('complemento', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Bairro</label><input value={form.bairro} onChange={e => set('bairro', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Cidade</label><input value={form.cidade} onChange={e => set('cidade', e.target.value)} className={inputCls} /></div>
                <div>
                  <label className={labelCls}>UF</label>
                  <select value={form.uf} onChange={e => set('uf', e.target.value)} className={`${inputCls} bg-white`}>
                    <option value="">—</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
                <div><label className={labelCls}>Limite de Crédito (R$)</label><input type="number" min="0" step="0.01" value={form.limiteCredito} onChange={e => set('limiteCredito', Number(e.target.value) || 0)} className={inputCls} /></div>
                <div><label className={labelCls}>Observações</label><input value={form.observacoes} onChange={e => set('observacoes', e.target.value)} className={inputCls} /></div>
              </div>

              <label className="flex items-center gap-2 font-bold text-slate-700">
                <input type="checkbox" checked={form.ativo !== false} onChange={e => set('ativo', e.target.checked)} /> Cliente ativo
              </label>

              {mensagem && <p className={mensagem.tipo === 'erro' ? 'text-rose-600' : 'text-emerald-700'}>{mensagem.texto}</p>}

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
