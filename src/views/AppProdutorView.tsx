import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  Smartphone,
  Sprout,
  CheckCircle2,
  Send,
  Lock,
  Mail,
  LogOut,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  ClipboardList
} from 'lucide-react';
import { BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const AppProdutorView: React.FC = () => {
  const { produtores, produtos, registrosProducao, addRegistroProducao, cooperados, pedidosProdutorPAA, programacoesEntrega } = useCoop();

  // Filtros do extrato de pedidos e entregas do produtor
  const [filtroMesPortal, setFiltroMesPortal] = useState('TODOS');
  const [filtroAnoPortal, setFiltroAnoPortal] = useState('TODOS');
  const [filtroStatusPortal, setFiltroStatusPortal] = useState('TODOS');
  const [buscaPortal, setBuscaPortal] = useState('');

  // Acesso simplificado — somente por e-mail, sem senha. O cadastro do
  // produtor é feito só pela administração (Cadastros → Produtores); este
  // portal é exclusivamente de login/lançamento de produção.
  const [authEmail, setAuthEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Quando o produtor está vinculado a um cooperado (cooperadoId), o e-mail
  // do cooperado é a fonte da verdade para login — evita exigir um e-mail
  // duplicado só para o produtor quando ele já tem cadastro como cooperado.
  const resolverEmailProdutor = (p: { cooperadoId?: string; email?: string }): string | undefined => {
    if (p.cooperadoId) {
      const coop = cooperados.find(c => c.id === p.cooperadoId);
      if (coop?.email) return coop.email;
    }
    return p.email;
  };

  // Produtor matching strictly the logged-in email
  const produtorAtual = produtores.find(p => {
    const email = resolverEmailProdutor(p);
    return email && authEmail.trim() && email.toLowerCase().trim() === authEmail.toLowerCase().trim();
  });

  const [produtoSelecionado, setProdutoSelecionado] = useState(produtos[0]?.nome || 'Morango Orgânico');
  const [qtdKg, setQtdKg] = useState(150);
  const [sucessoMsg, setSucessoMsg] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!authEmail.trim()) {
      setLoginError('Por favor, informe seu e-mail de produtor.');
      return;
    }

    const found = produtores.find(p => {
      const email = resolverEmailProdutor(p);
      return email && email.toLowerCase().trim() === authEmail.toLowerCase().trim();
    });

    if (!found) {
      setLoginError(`Nenhum produtor rural encontrado com o e-mail "${authEmail}". Se você já é cooperado, use o e-mail do seu cadastro de cooperado. Caso contrário, peça para a cooperativa cadastrar seu acesso em Cadastros → Produtores.`);
      return;
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthEmail('');
    setLoginError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtorAtual) return;

    addRegistroProducao({
      dataLancamento: new Date().toISOString().split('T')[0],
      produtorId: produtorAtual.id,
      produtorNome: produtorAtual.nome,
      produtoId: produtoSelecionado,
      produtoNome: produtoSelecionado,
      quantidadeEstimadaKg: qtdKg,
      quantidadeColhidaKg: qtdKg,
      statusAprovacao: 'HOMOLOGADO'
    });
    setSucessoMsg(true);
    setTimeout(() => setSucessoMsg(false), 3000);
  };

  // IF NOT LOGGED IN: Render App Login Card
  if (!isLoggedIn || !produtorAtual) {
    return (
      <div className="max-w-xl mx-auto my-6 space-y-6">
        <div className="max-w-md mx-auto bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-300 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-xs border border-emerald-500/30">
              <Smartphone className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">App Mobile do Produtor</h1>
            <p className="text-xs text-slate-400">
              Acesse com seu e-mail de agricultor para lançar colheita e gerenciar suas ofertas PAA / PNAE.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                E-mail do Produtor Rural
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="produtor@fazenda.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Seu produtor já deve estar cadastrado pela cooperativa (Cadastros → Produtores). Se você também é cooperado, use o e-mail do seu cadastro de cooperado.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Entrar no App do Produtor
            </button>
          </form>
        </div>
      </div>
    );
  }

  // DATA ISOLATION FOR LOGGED-IN PRODUCER
  const minhasProducoes = registrosProducao.filter(
    r => r.produtorId === produtorAtual.id ||
         (r.produtorNome && r.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase()) ||
         (r.cooperadoNome && r.cooperadoNome.toLowerCase() === produtorAtual.nome.toLowerCase())
  );

  // Extrato de Pedidos e Entregas vinculados a este produtor — movido do
  // Portal do Cooperado pra cá, já que os pedidos/entregas são feitos aos
  // produtores rurais (produtorId/produtorNome), não aos cooperados em si.
  const pedidosDoProdutor = pedidosProdutorPAA.filter(p =>
    p.produtoresParticipantes?.some(nome => nome.toLowerCase() === produtorAtual.nome.toLowerCase()) ||
    p.itens?.some(item => item.produtorId === produtorAtual.id || item.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase())
  );
  const entregasDoProdutor = programacoesEntrega.filter(e =>
    e.itens?.some(item => item.produtorId === produtorAtual.id || item.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase())
  );
  const pedidoPassaFiltro = (p: typeof pedidosDoProdutor[number]) => {
    const data = p.dataPedido || '';
    const texto = `${p.numeroPedido} ${p.programaNome || p.programa} ${p.itens?.map(i => i.produtoNome).join(' ') || ''}`.toLowerCase();
    return (filtroAnoPortal === 'TODOS' || data.startsWith(filtroAnoPortal)) &&
      (filtroMesPortal === 'TODOS' || data.slice(5, 7) === filtroMesPortal) &&
      (filtroStatusPortal === 'TODOS' || p.status === filtroStatusPortal) &&
      (!buscaPortal.trim() || texto.includes(buscaPortal.toLowerCase().trim()));
  };
  const entregaPassaFiltro = (e: typeof entregasDoProdutor[number]) => {
    const data = e.dataPrevista || '';
    const texto = `${e.pedidoNumero || ''} ${e.localEntrega || ''} ${e.escolaNome || ''} ${e.itens?.map(i => i.produtoNome).join(' ') || ''}`.toLowerCase();
    return (filtroAnoPortal === 'TODOS' || data.startsWith(filtroAnoPortal)) &&
      (filtroMesPortal === 'TODOS' || data.slice(5, 7) === filtroMesPortal) &&
      (filtroStatusPortal === 'TODOS' || e.status === filtroStatusPortal) &&
      (!buscaPortal.trim() || texto.includes(buscaPortal.toLowerCase().trim()));
  };
  const pedidosFiltrados = pedidosDoProdutor.filter(pedidoPassaFiltro);
  const entregasFiltradas = entregasDoProdutor.filter(entregaPassaFiltro);
  const anosPortal = Array.from(new Set([...pedidosDoProdutor.map(p => p.dataPedido?.slice(0, 4)), ...entregasDoProdutor.map(e => e.dataPrevista?.slice(0, 4))].filter(Boolean))).sort().reverse();
  const totalPedidoFiltrado = pedidosFiltrados.reduce((s, p) => s + (p.itens || []).filter(i => i.produtorId === produtorAtual.id || i.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase()).reduce((total, i) => total + (i.valorTotalItem || 0), 0), 0);
  const entregasPorStatus = ['AGENDADA', 'EM_TRANSITO', 'ENTREGUE', 'PARCIAL', 'CANCELADA'].map(status => ({ status, total: entregasFiltradas.filter(e => e.status === status).length })).filter(x => x.total > 0);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
            <Smartphone className="w-3.5 h-3.5" /> App do Produtor: {resolverEmailProdutor(produtorAtual)}
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-xl border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
          >
            <LogOut className="w-3 h-3" /> Sair
          </button>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-white">Lançar Colheita - {produtorAtual.nome}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Propriedade: <strong className="text-white">{produtorAtual.nomePropriedade}</strong> | DAP/CAF: <span className="font-mono">{produtorAtual.dapCaf}</span>
          </p>
        </div>

        {sucessoMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Colheita registrada no SisCoope para {produtorAtual.nome}!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Produtor Rural (Vinculado ao E-mail)</label>
            <input
              type="text"
              disabled
              value={`${produtorAtual.nome} (${produtorAtual.nomePropriedade})`}
              className="w-full p-3 bg-slate-800 border border-slate-700 text-emerald-300 rounded-2xl font-bold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Produto da Lavoura</label>
            <select
              value={produtoSelecionado}
              onChange={e => setProdutoSelecionado(e.target.value)}
              className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500"
            >
              {produtos.map(p => (
                <option key={p.id} value={p.nome}>{p.nome} ({p.unidadeMedida})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Quantidade Disposta para Entrega (Kg)</label>
            <input
              type="number"
              value={qtdKg}
              onChange={e => setQtdKg(parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-2xl text-lg font-black focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" /> Registrar Produção no SICOOP
          </button>
        </form>
      </div>

      {/* Histórico Exclusivo de Colheitas do Produtor */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-600" />
          Minhas Colheitas Declaradas ({produtorAtual.nome})
        </h2>
        <div className="space-y-2">
          {minhasProducoes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhum lançamento registrado ainda para seu e-mail.</p>
          ) : (
            minhasProducoes.map(r => (
              <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between text-xs border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{r.produtoNome}</div>
                  <div className="text-[10px] text-slate-400">Data: {(r as any).dataLancamento || r.dataColheitaPrevista}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">{(r as any).quantidadeColhidaKg || r.quantidadeEstimada} Kg</div>
                  <span className="text-[9px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">{(r as any).statusAprovacao || 'Homologado'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Extrato de Pedidos e Entregas Vinculados ao Produtor */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"><div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mês</label><select value={filtroMesPortal} onChange={e => setFiltroMesPortal(e.target.value)} className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-800 dark:bg-slate-800 dark:text-white"><option value="TODOS">Todos</option>{Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, "0")).map(m => <option key={m} value={m}>{m}</option>)}</select></div><div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Ano</label><select value={filtroAnoPortal} onChange={e => setFiltroAnoPortal(e.target.value)} className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-800 dark:bg-slate-800 dark:text-white"><option value="TODOS">Todos</option>{anosPortal.map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></div><div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Status</label><select value={filtroStatusPortal} onChange={e => setFiltroStatusPortal(e.target.value)} className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-800 dark:bg-slate-800 dark:text-white"><option value="TODOS">Todos</option><option value="PENDENTE">Pendente</option><option value="CONFIRMADO">Confirmado</option><option value="RECEBIDO">Recebido</option><option value="AGENDADA">Agendada</option><option value="EM_TRANSITO">Em trânsito</option><option value="ENTREGUE">Entregue</option><option value="PARCIAL">Parcial</option></select></div><div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Pesquisar</label><input value={buscaPortal} onChange={e => setBuscaPortal(e.target.value)} placeholder="Pedido, produto ou destino" className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-800 dark:bg-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400" /></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950"><span className="text-[10px] uppercase font-bold text-emerald-700">Pedidos encontrados</span><strong className="block text-2xl text-emerald-900 dark:text-emerald-300">{pedidosFiltrados.length}</strong></div><div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950"><span className="text-[10px] uppercase font-bold text-teal-700">Entregas encontradas</span><strong className="block text-2xl text-teal-900 dark:text-teal-300">{entregasFiltradas.length}</strong></div><div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950"><span className="text-[10px] uppercase font-bold text-amber-700">Valor dos pedidos</span><strong className="block text-xl text-amber-900 dark:text-amber-300">R$ {totalPedidoFiltrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div></div>
        {entregasPorStatus.length > 0 && <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700"><h3 className="text-xs font-black text-slate-700 dark:text-slate-200 mb-2">Entregas por status</h3><ResponsiveContainer width="100%" height={190}><BarChart data={entregasPorStatus}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="status" fontSize={10} /><YAxis allowDecimals={false} fontSize={10} /><Tooltip /><Bar dataKey="total" name="Entregas" fill="#059669" radius={[5, 5, 0, 0]}>{entregasPorStatus.map((item, index) => <Cell key={item.status} fill={["#059669", "#0284c7", "#10b981", "#f59e0b", "#e11d48"][index % 5]} />)}</Bar></BarChart></ResponsiveContainer></div> }
        <div><h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardList className="w-4 h-4 text-emerald-600" /> Extrato de Pedidos e Entregas de {produtorAtual.nome}</h2><p className="text-[11px] text-slate-500 mt-1">Pedidos realizados, produtos solicitados e entregas vinculadas ao seu cadastro.</p></div>
        <div><h3 className="text-xs font-black uppercase tracking-wide text-slate-500 mb-3">Pedidos</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold uppercase border-b border-emerald-200 dark:border-emerald-800"><th className="p-3">Pedido / Data</th><th className="p-3">Programa</th><th className="p-3">Produtos</th><th className="p-3">Entrega prevista</th><th className="p-3">Status</th><th className="p-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{pedidosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-400">Nenhum pedido encontrado para o e-mail {resolverEmailProdutor(produtorAtual)}.</td></tr> : pedidosFiltrados.map(p => { const itens = p.itens?.filter(item => item.produtorId === produtorAtual.id || item.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase()) || []; return <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-3"><div className="font-bold text-slate-900 dark:text-white">{p.numeroPedido}</div><div className="text-[10px] text-slate-400">{p.dataPedido}</div></td><td className="p-3 font-semibold text-emerald-700 dark:text-emerald-400">{p.programaNome || p.programa}</td><td className="p-3">{itens.map(item => <div key={item.produtoId + item.produtoNome}>{item.produtoNome} — {item.quantidadePedida} {item.unidadeMedida}</div>)}</td><td className="p-3 font-mono">{p.dataPrevistaEntrega}</td><td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold text-[10px]">{p.status}</span></td><td className="p-3 text-right font-mono font-bold">R$ {itens.reduce((s, item) => s + (item.valorTotalItem || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>; })}</tbody></table></div></div>
        <div><h3 className="text-xs font-black uppercase tracking-wide text-slate-500 mb-3">Entregas</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold uppercase border-b border-emerald-200 dark:border-emerald-800"><th className="p-3">Pedido / Data</th><th className="p-3">Produtos</th><th className="p-3">Destino</th><th className="p-3">Quantidade</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{entregasFiltradas.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-400">Nenhuma entrega encontrada para o e-mail {resolverEmailProdutor(produtorAtual)}.</td></tr> : entregasFiltradas.map(e => { const itens = e.itens?.filter(item => item.produtorId === produtorAtual.id || item.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase()) || []; return <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50"><td className="p-3"><div className="font-bold text-slate-900 dark:text-white">{e.pedidoNumero || 'Entrega avulsa'}</div><div className="text-[10px] text-slate-400">{e.dataPrevista}</div></td><td className="p-3">{itens.map(item => <div key={item.produtoId + item.produtoNome}>{item.produtoNome}</div>)}</td><td className="p-3">{e.localEntrega || e.escolaNome || e.escolaOrgaoDestino}</td><td className="p-3 font-mono">{itens.reduce((s, item) => s + (item.quantidadeEntregue || item.quantidadePrevista || 0), 0)} kg</td><td className="p-3"><span className="px-2 py-0.5 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 rounded font-bold text-[10px]">{e.status}</span></td></tr>; })}</tbody></table></div></div>
      </div>
    </div>
  );
};
