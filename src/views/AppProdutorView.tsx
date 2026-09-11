import React, { useEffect, useState } from 'react';
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
  const { produtores, produtos, chamadasPublicas, ofertasPAA, addOfertaPAA, updateOfertaPAA, cooperados, pedidosProdutorPAA, programacoesEntrega } = useCoop();

  // Filtros do extrato de pedidos e entregas do produtor
  const [filtroMesPortal, setFiltroMesPortal] = useState('TODOS');
  const [filtroAnoPortal, setFiltroAnoPortal] = useState('TODOS');
  const [filtroStatusPortal, setFiltroStatusPortal] = useState('TODOS');
  const [buscaPortal, setBuscaPortal] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'ofertar' | 'ofertas' | 'historico'>('ofertar');

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

  const [produtoOfertaId, setProdutoOfertaId] = useState(produtos[0]?.id || '');
  const [chamadaOfertaId, setChamadaOfertaId] = useState('');
  // Campo livre — sem valor padrão, o produtor digita a quantidade que quiser.
  const [qtdOfertaKg, setQtdOfertaKg] = useState<string>('');
  // Itens já adicionados à proposta atual, antes de enviar (permite juntar
  // vários produtos numa única proposta do mesmo edital).
  const [itensOferta, setItensOferta] = useState<{
    produtoId: string;
    produtoNome: string;
    unidadeMedida: string;
    quantidadeKg: number;
    precoUnitario: number;
    valorTotal: number;
  }[]>([]);
  const [sucessoMsg, setSucessoMsg] = useState(false);
  const [ofertaErro, setOfertaErro] = useState<string | null>(null);

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

    if (itensOferta.length === 0) {
      setOfertaErro('Adicione pelo menos um produto à proposta antes de enviar.');
      return;
    }

    const chamada = chamadasPublicas.find(c => c.id === chamadaOfertaId);
    if (!chamada || chamada.status !== 'ABERTA') {
      setOfertaErro('Esta chamada pública não está aberta para novas ofertas.');
      return;
    }

    // Se este produtor já tem uma proposta enviada para esta mesma chamada
    // pública, os novos produtos entram JUNTO nela (mesma proposta), em vez
    // de criar uma proposta separada.
    const propostaExistente = ofertasPAA.find(
      o => o.chamadaPublicaId === chamada.id &&
        (o.produtorId === produtorAtual.id || o.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase())
    );

    if (propostaExistente) {
      const itensAtuais = propostaExistente.itens && propostaExistente.itens.length > 0
        ? propostaExistente.itens
        : [{
            produtoId: propostaExistente.produtoId,
            produtoNome: propostaExistente.produtoNome,
            unidadeMedida: propostaExistente.unidadeMedida || 'KG',
            quantidadeKg: propostaExistente.quantidadeOfertada || propostaExistente.quantidadeKg || 0,
            precoUnitario: propostaExistente.precoUnitario || propostaExistente.valorUnitario || 0,
            valorTotal: propostaExistente.valorTotal || 0
          }];
      const itensCombinados = [...itensAtuais, ...itensOferta];
      const valorTotalGeral = itensCombinados.reduce((s, i) => s + (i.valorTotal || i.quantidadeKg * i.precoUnitario), 0);
      const qtdTotal = itensCombinados.reduce((s, i) => s + i.quantidadeKg, 0);

      updateOfertaPAA(propostaExistente.id, {
        itens: itensCombinados,
        valorTotal: valorTotalGeral,
        produtoNome: itensCombinados.map(i => i.produtoNome).join(', '),
        quantidadeOfertada: qtdTotal,
        quantidadeKg: qtdTotal
      });
    } else {
      const valorTotalGeral = itensOferta.reduce((s, i) => s + i.valorTotal, 0);
      const qtdTotal = itensOferta.reduce((s, i) => s + i.quantidadeKg, 0);

      addOfertaPAA({
        chamadaPublicaId: chamada.id,
        chamadaPublicaEdital: chamada.numeroEdital,
        programaId: chamada.programaId,
        programaNome: chamada.programaNome || chamada.programa,
        produtorId: produtorAtual.id,
        produtorNome: produtorAtual.nome,
        produtoId: itensOferta[0].produtoId,
        produtoNome: itensOferta.map(i => i.produtoNome).join(', '),
        unidadeMedida: itensOferta[0].unidadeMedida,
        quantidadeOfertada: qtdTotal,
        quantidadeKg: qtdTotal,
        valorUnitario: itensOferta[0].precoUnitario,
        precoUnitario: itensOferta[0].precoUnitario,
        valorTotal: valorTotalGeral,
        status: 'SUBMETIDA',
        dataEnvio: new Date().toISOString().split('T')[0],
        itens: itensOferta
      });
    }

    setItensOferta([]);
    setChamadaOfertaId('');
    setOfertaErro(null);
    setSucessoMsg(true);
    setTimeout(() => setSucessoMsg(false), 3000);
  };

  // Preço unitário vem do próprio cadastro da chamada pública (itensSolicitados
  // → precoMaximoUnitario) — o produtor não digita o preço, só a quantidade.
  const chamadaSelecionada = chamadasPublicas.find(c => c.id === chamadaOfertaId);
  const produtoOfertaObj = produtos.find(p => p.id === produtoOfertaId);
  const itemDaChamada = chamadaSelecionada?.itensSolicitados.find(
    i => i.produtoId === produtoOfertaId || i.produtoNome === produtoOfertaObj?.nome
  );
  const precoAtual = itemDaChamada?.precoMaximoUnitario || 0;

  const handleAddItemOferta = () => {
    setOfertaErro(null);
    if (!chamadaOfertaId) {
      setOfertaErro('Selecione a chamada pública / edital primeiro.');
      return;
    }
    const qtd = Number(qtdOfertaKg);
    if (!qtd || qtd <= 0) {
      setOfertaErro('Informe uma quantidade válida.');
      return;
    }
    if (!produtoOfertaObj) return;
    if (!itemDaChamada) {
      setOfertaErro('Este produto não está na lista de itens solicitados desta chamada pública.');
      return;
    }
    if (itensOferta.some(i => i.produtoId === produtoOfertaObj.id)) {
      setOfertaErro('Este produto já foi adicionado à proposta. Remova-o antes de adicionar de novo com outra quantidade.');
      return;
    }

    setItensOferta(prev => [...prev, {
      produtoId: produtoOfertaObj.id,
      produtoNome: produtoOfertaObj.nome,
      unidadeMedida: produtoOfertaObj.unidadeMedida || 'KG',
      quantidadeKg: qtd,
      precoUnitario: precoAtual,
      valorTotal: qtd * precoAtual
    }]);
    setQtdOfertaKg('');
  };

  const handleRemoveItemOferta = (produtoId: string) => {
    setItensOferta(prev => prev.filter(i => i.produtoId !== produtoId));
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
  const minhasOfertas = ofertasPAA.filter(
    o => o.produtorId === produtorAtual.id ||
         (o.produtorNome && o.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase())
  );

  // O portal consulta todas as chamadas cadastradas no SisGepa. Apenas chamadas
  // abertas aceitam novas propostas, mas as demais continuam visíveis para
  // conferência do produtor.
  const chamadasVisiveis = chamadasPublicas;

  // O catálogo do produtor é reduzido aos itens efetivamente solicitados no
  // edital selecionado. O vínculo aceita tanto produtoId quanto nome para
  // manter compatibilidade com chamadas importadas do SIGEPA/SisGepa.
  const produtosDaChamada = chamadaSelecionada
    ? chamadaSelecionada.itensSolicitados
        .map(item => produtos.find(p => (item.produtoId && p.id === item.produtoId) || p.nome.trim().toLowerCase() === item.produtoNome.trim().toLowerCase()))
        .filter((produto): produto is typeof produtos[number] => Boolean(produto))
    : [];

  useEffect(() => {
    if (!chamadaOfertaId) return;
    const primeiroProduto = produtosDaChamada[0];
    if (primeiroProduto && !produtosDaChamada.some(p => p.id === produtoOfertaId)) {
      setProdutoOfertaId(primeiroProduto.id);
    }
  }, [chamadaOfertaId, produtosDaChamada.length]);

  const chamadasAbertas = chamadasPublicas.filter(c => c.status === 'ABERTA');

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
    <div className="max-w-5xl mx-auto space-y-6">
      <nav className="sticky top-2 z-10 -mx-1 flex gap-2 overflow-x-auto rounded-2xl bg-slate-950/95 p-2 shadow-lg backdrop-blur" aria-label="Seções do portal do produtor">
        {[['ofertar', 'Ofertar produtos'], ['ofertas', 'Minhas ofertas'], ['historico', 'Pedidos e entregas']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setAbaAtiva(id as typeof abaAtiva)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition-all ${abaAtiva === id ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}>
            {label}
          </button>
        ))}
      </nav>

      {abaAtiva === 'ofertar' && <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-slate-800">
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
          <h1 className="text-xl font-extrabold text-white">Enviar Oferta de Produtos - {produtorAtual.nome}</h1>
          <p className="text-xs text-slate-300 mt-1">
            Propriedade: <strong className="text-white">{produtorAtual.nomePropriedade}</strong>
            {produtorAtual.cafDapNum && <> | DAP/CAF: <span className="font-mono text-white">{produtorAtual.cafDapNum}</span></>}
          </p>
        </div>

        {sucessoMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Oferta enviada com sucesso! Ela já aparece na Proposta de Oferta do SisGepa.
          </div>
        )}

        {chamadasVisiveis.length === 0 ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-2xl text-xs font-semibold">
            Nenhuma chamada pública cadastrada no SisGepa no momento.
          </div>
        ) : (
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
              <label className="block text-slate-300 font-bold mb-1">Chamada Pública / Edital</label>
              <select
                required
                value={chamadaOfertaId}
                onChange={e => { setChamadaOfertaId(e.target.value); setItensOferta([]); setOfertaErro(null); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Selecione a chamada pública --</option>
                {chamadasVisiveis.map(c => (
                  <option key={c.id} value={c.id} disabled={c.status !== 'ABERTA'}>{c.numeroEdital} — {c.orgaoComprador} ({c.programaNome || c.programa}) — {c.status === 'ABERTA' ? 'Aberta' : c.status}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Você pode incluir vários produtos nesta mesma proposta. Se você já tiver uma proposta enviada para este edital, os novos itens entram junto nela.
              </p>
            </div>

            {chamadaOfertaId && (
              <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Produto da Lavoura</label>
                  <select
                    value={produtoOfertaId}
                    onChange={e => setProdutoOfertaId(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500"
                  >
                    {produtosDaChamada.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.unidadeMedida})</option>
                    ))}
                  </select>
                  {produtosDaChamada.length === 0 && (
                    <p className="text-[10px] text-amber-400 mt-1.5">Nenhum produto do catálogo foi vinculado aos itens deste edital.</p>
                  )}
                  {!itemDaChamada && produtosDaChamada.length > 0 && (
                    <p className="text-[10px] text-amber-400 mt-1.5">Este produto não está na lista de itens solicitados desta chamada.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Quantidade (Kg)</label>
                    <input
                      type="number"
                      placeholder="Digite a quantidade"
                      value={qtdOfertaKg}
                      onChange={e => setQtdOfertaKg(e.target.value)}
                      className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-2xl text-lg font-black focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 placeholder:text-xs placeholder:font-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Preço Unitário (edital)</label>
                    <div className="w-full p-3 bg-slate-900 border border-slate-700 text-emerald-400 rounded-2xl text-lg font-black">
                      R$ {precoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItemOferta}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  + Adicionar Produto à Proposta
                </button>
              </div>
            )}

            {ofertaErro && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> {ofertaErro}
              </div>
            )}

            {itensOferta.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">Produtos nesta proposta</p>
                {itensOferta.map(item => (
                  <div key={item.produtoId} className="p-3 bg-slate-800 rounded-2xl flex items-center justify-between border border-slate-700">
                    <div>
                      <div className="font-bold text-white">{item.produtoNome}</div>
                      <div className="text-[10px] text-slate-400">{item.quantidadeKg} {item.unidadeMedida} × R$ {item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-400">R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemOferta(item.produtoId)}
                        className="text-rose-400 hover:text-rose-300 text-[11px] font-bold cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 bg-slate-800/60 rounded-2xl text-slate-300 font-semibold flex items-center justify-between">
              <span>Valor total da proposta</span>
              <span className="text-emerald-400 font-mono font-black text-sm">
                R$ {itensOferta.reduce((s, i) => s + i.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="submit"
              disabled={itensOferta.length === 0}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Enviar Proposta ao SisGepa
            </button>
          </form>
        )}
      </div>}

      {/* Ofertas Enviadas pelo Produtor — aparecem também na Proposta de
          Oferta do SisGepa, já que usam o mesmo cadastro (ofertasPAA). */}
      {abaAtiva === 'ofertas' && <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-400" />
          Minhas Ofertas Enviadas ({produtorAtual.nome})
        </h2>
        <div className="space-y-2">
          {minhasOfertas.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhuma oferta enviada ainda para seu e-mail.</p>
          ) : (
            minhasOfertas.map(o => (
              <div key={o.id} className="p-3 bg-slate-800 rounded-2xl flex items-center justify-between text-xs border border-slate-700">
                <div>
                  <div className="font-bold text-white">{o.produtoNome}</div>
                  <div className="text-[10px] text-slate-400">
                    Edital: {o.chamadaPublicaEdital} · Enviada em {o.dataEnvio}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-extrabold text-emerald-400">
                    {o.quantidadeOfertada || o.quantidadeKg} {o.unidadeMedida || 'Kg'}
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                    o.status === 'ACEITA' ? 'bg-emerald-500/20 text-emerald-300' :
                    o.status === 'RECUSADA' ? 'bg-rose-500/20 text-rose-300' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>}

      {/* Extrato de Pedidos e Entregas Vinculados ao Produtor */}
      {abaAtiva === 'historico' && <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-800 border border-slate-700"><div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Mês</label><select value={filtroMesPortal} onChange={e => setFiltroMesPortal(e.target.value)} className="w-full p-2 rounded-xl border border-slate-600 text-xs text-white bg-slate-900"><option value="TODOS">Todos</option>{Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, "0")).map(m => <option key={m} value={m}>{m}</option>)}</select></div><div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Ano</label><select value={filtroAnoPortal} onChange={e => setFiltroAnoPortal(e.target.value)} className="w-full p-2 rounded-xl border border-slate-600 text-xs text-white bg-slate-900"><option value="TODOS">Todos</option>{anosPortal.map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></div><div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label><select value={filtroStatusPortal} onChange={e => setFiltroStatusPortal(e.target.value)} className="w-full p-2 rounded-xl border border-slate-600 text-xs text-white bg-slate-900"><option value="TODOS">Todos</option><option value="PENDENTE">Pendente</option><option value="CONFIRMADO">Confirmado</option><option value="RECEBIDO">Recebido</option><option value="AGENDADA">Agendada</option><option value="EM_TRANSITO">Em trânsito</option><option value="ENTREGUE">Entregue</option><option value="PARCIAL">Parcial</option></select></div><div><label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Pesquisar</label><input value={buscaPortal} onChange={e => setBuscaPortal(e.target.value)} placeholder="Pedido, produto ou destino" className="w-full p-2 rounded-xl border border-slate-600 text-xs text-white bg-slate-900 placeholder:text-slate-500" /></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="p-4 rounded-xl bg-emerald-950 border border-emerald-800"><span className="text-[10px] uppercase font-bold text-emerald-400">Pedidos encontrados</span><strong className="block text-2xl text-white">{pedidosFiltrados.length}</strong></div><div className="p-4 rounded-xl bg-teal-950 border border-teal-800"><span className="text-[10px] uppercase font-bold text-teal-400">Entregas encontradas</span><strong className="block text-2xl text-white">{entregasFiltradas.length}</strong></div><div className="p-4 rounded-xl bg-amber-950 border border-amber-800"><span className="text-[10px] uppercase font-bold text-amber-400">Valor dos pedidos</span><strong className="block text-xl text-white">R$ {totalPedidoFiltrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div></div>
        {entregasPorStatus.length > 0 && <div className="p-4 rounded-2xl border border-slate-700 bg-slate-800"><h3 className="text-xs font-black text-slate-200 mb-2">Entregas por status</h3><ResponsiveContainer width="100%" height={190}><BarChart data={entregasPorStatus}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="status" fontSize={10} stroke="#94a3b8" /><YAxis allowDecimals={false} fontSize={10} stroke="#94a3b8" /><Tooltip /><Bar dataKey="total" name="Entregas" fill="#059669" radius={[5, 5, 0, 0]}>{entregasPorStatus.map((item, index) => <Cell key={item.status} fill={["#10b981", "#0ea5e9", "#34d399", "#fbbf24", "#f43f5e"][index % 5]} />)}</Bar></BarChart></ResponsiveContainer></div> }
        <div><h2 className="text-sm font-bold text-white flex items-center gap-2"><ClipboardList className="w-4 h-4 text-emerald-400" /> Extrato de Pedidos e Entregas de {produtorAtual.nome}</h2><p className="text-[11px] text-slate-400 mt-1">Pedidos realizados, produtos solicitados e entregas vinculadas ao seu cadastro.</p></div>
        <div><h3 className="text-xs font-black uppercase tracking-wide text-slate-400 mb-3">Pedidos</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-emerald-950 text-emerald-300 font-bold uppercase border-b border-emerald-800"><th className="p-3">Pedido / Data</th><th className="p-3">Programa</th><th className="p-3">Produtos</th><th className="p-3">Entrega prevista</th><th className="p-3">Status</th><th className="p-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-slate-800">{pedidosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhum pedido encontrado para o e-mail {resolverEmailProdutor(produtorAtual)}.</td></tr> : pedidosFiltrados.map(p => { const itens = p.itens?.filter(item => item.produtorId === produtorAtual.id || item.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase()) || []; return <tr key={p.id} className="hover:bg-slate-800/60"><td className="p-3"><div className="font-bold text-white">{p.numeroPedido}</div><div className="text-[10px] text-slate-500">{p.dataPedido}</div></td><td className="p-3 font-semibold text-emerald-400">{p.programaNome || p.programa}</td><td className="p-3 text-slate-300">{itens.map(item => <div key={item.produtoId + item.produtoNome}>{item.produtoNome} — {item.quantidadePedida} {item.unidadeMedida}</div>)}</td><td className="p-3 font-mono text-slate-300">{p.dataPrevistaEntrega}</td><td className="p-3"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px]">{p.status}</span></td><td className="p-3 text-right font-mono font-bold text-white">R$ {itens.reduce((s, item) => s + (item.valorTotalItem || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>; })}</tbody></table></div></div>
        <div><h3 className="text-xs font-black uppercase tracking-wide text-slate-400 mb-3">Entregas</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-emerald-950 text-emerald-300 font-bold uppercase border-b border-emerald-800"><th className="p-3">Pedido / Data</th><th className="p-3">Produtos</th><th className="p-3">Destino</th><th className="p-3">Quantidade</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-800">{entregasFiltradas.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhuma entrega encontrada para o e-mail {resolverEmailProdutor(produtorAtual)}.</td></tr> : entregasFiltradas.map(e => { const itens = e.itens?.filter(item => item.produtorId === produtorAtual.id || item.produtorNome.toLowerCase() === produtorAtual.nome.toLowerCase()) || []; return <tr key={e.id} className="hover:bg-slate-800/60"><td className="p-3"><div className="font-bold text-white">{e.pedidoNumero || 'Entrega avulsa'}</div><div className="text-[10px] text-slate-500">{e.dataPrevista}</div></td><td className="p-3 text-slate-300">{itens.map(item => <div key={item.produtoId + item.produtoNome}>{item.produtoNome}</div>)}</td><td className="p-3 text-slate-300">{e.localEntrega || e.escolaNome || e.escolaOrgaoDestino}</td><td className="p-3 font-mono text-slate-300">{itens.reduce((s, item) => s + (item.quantidadeEntregue || item.quantidadePrevista || 0), 0)} kg</td><td className="p-3"><span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded font-bold text-[10px]">{e.status}</span></td></tr>; })}</tbody></table></div></div>
      </div>}
    </div>
  );
};
