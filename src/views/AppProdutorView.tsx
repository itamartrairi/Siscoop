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
  KeyRound
} from 'lucide-react';

export const AppProdutorView: React.FC = () => {
  const { produtores, produtos, registrosProducao, addRegistroProducao, addProdutor, cooperados } = useCoop();

  // Acesso simplificado — somente por e-mail, sem senha.
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration Form State
  const [regForm, setRegForm] = useState({
    cooperadoId: '',
    nome: '',
    email: '',
    cpf: '',
    nomePropriedade: '',
    cafDapNum: '',
    comunidade: ''
  });

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
      setLoginError(`Nenhum produtor rural encontrado com o e-mail "${authEmail}". Se você já é cooperado, use o e-mail do seu cadastro de cooperado. Caso contrário, faça o cadastro para acessar.`);
      return;
    }

    setIsLoggedIn(true);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!regForm.nome.trim() || !regForm.email.trim() || !regForm.cpf.trim()) {
      setLoginError('Preencha os campos obrigatórios para efetuar seu cadastro.');
      return;
    }

    const exists = produtores.some(
      p => (p.email && p.email.toLowerCase().trim() === regForm.email.toLowerCase().trim()) ||
           (p.cpf && p.cpf.replace(/\D/g, '') === regForm.cpf.replace(/\D/g, ''))
    );

    if (exists) {
      setLoginError('Já existe um produtor rural cadastrado com este e-mail ou CPF. Faça login para acessar.');
      return;
    }

    addProdutor({
      nome: regForm.nome,
      email: regForm.email,
      cpf: regForm.cpf,
      nomePropriedade: regForm.nomePropriedade || 'Propriedade Agrícola Familiar',
      cafDapNum: regForm.cafDapNum || 'DAP-2026-TRAIRI',
      comunidade: regForm.comunidade || 'Comunidade Rural Trairi',
      situacao: 'ATIVO'
    });

    setAuthEmail(regForm.email);
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
              {authMode === 'LOGIN'
                ? 'Acesse com seu e-mail de agricultor para lançar colheita e gerenciar suas ofertas PAA / PNAE.'
                : 'Cadastre-se como Produtor Rural para informar suas colheitas e ofertas agrícolas.'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMode('LOGIN'); setLoginError(null); }}
              className={`flex-1 py-2 rounded-xl transition-all ${
                authMode === 'LOGIN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Já tenho cadastro (Login)
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('REGISTER'); setLoginError(null); }}
              className={`flex-1 py-2 rounded-xl transition-all ${
                authMode === 'REGISTER'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Cadastro
            </button>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {authMode === 'LOGIN' ? (
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
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Entrar no App do Produtor
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/60">
                <label className="block text-emerald-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Vincular a Cooperado (Quadro Social)
                </label>
                <select
                  value={regForm.cooperadoId}
                  onChange={e => {
                    const cId = e.target.value;
                    const c = cooperados.find(coop => coop.id === cId);
                    if (c) {
                      setRegForm({
                        ...regForm,
                        cooperadoId: c.id,
                        nome: c.nome,
                        email: c.email || regForm.email || `cooperado${c.matricula.replace(/\D/g, '')}@trairi.coop.br`,
                        cpf: c.cpf,
                        nomePropriedade: `Sítio / Propriedade ${c.nome.split(' ')[0]}`,
                        cafDapNum: (c as any).dapCaf || `CAF-${c.id.slice(-4)}-2026`,
                        comunidade: (c as any).localidadeComunidade || c.bairro || 'Comunidade Trairi'
                      });
                    } else {
                      setRegForm({ ...regForm, cooperadoId: '' });
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="">-- Selecionar do Quadro Social de Cooperados --</option>
                  {cooperados.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.matricula} - {c.nome} (CPF: {c.cpf})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Nome do Produtor / Agricultor
                </label>
                <input
                  type="text"
                  required
                  value={regForm.nome}
                  onChange={e => setRegForm({ ...regForm, nome: e.target.value })}
                  placeholder="Ex: João Batista Ribeiro"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="joao@sitio.com"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.cpf}
                    onChange={e => setRegForm({ ...regForm, cpf: e.target.value })}
                    placeholder="123.456.789-00"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    Nome da Propriedade / Sítio
                  </label>
                  <input
                    type="text"
                    value={regForm.nomePropriedade}
                    onChange={e => setRegForm({ ...regForm, nomePropriedade: e.target.value })}
                    placeholder="Sítio Boa Esperança"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    DAP / CAF nº
                  </label>
                  <input
                    type="text"
                    value={regForm.cafDapNum}
                    onChange={e => setRegForm({ ...regForm, cafDapNum: e.target.value })}
                    placeholder="CAF-123456"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-xs mt-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Cadastrar Produtor e Entrar
              </button>
            </form>
          )}
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
    </div>
  );
};
