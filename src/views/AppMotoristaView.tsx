import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Navigation,
  Plus,
  X,
  Lock,
  Mail,
  LogOut,
  ShieldCheck,
  AlertCircle,
  KeyRound
} from 'lucide-react';

export const AppMotoristaView: React.FC = () => {
  const { romaneiosMotorista, atualizarStatusRomaneio, addRomaneioMotorista, motoristas, addMotorista } = useCoop();
  const [showModal, setShowModal] = useState(false);

  // Acesso simplificado — somente por e-mail, sem senha.
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration Form State
  const [regForm, setRegForm] = useState({
    nome: '',
    email: '',
    veiculoPadrao: '',
    telefone: ''
  });

  // Driver matching strictly the logged-in email — motoristas agora vem do
  // Context (persistido e isolado por cooperativa), não mais de um estado
  // local que se perdia ao recarregar a página.
  const motoristaAtual = motoristas.find(
    m => m.email && authEmail.trim() && m.email.toLowerCase().trim() === authEmail.toLowerCase().trim()
  );

  const [form, setForm] = useState({
    numeroRomaneio: `ROM-${Date.now().toString().slice(-4)}`,
    veiculoPlaca: motoristaAtual?.veiculoPadrao || 'PMN-4A92',
    rotaNome: 'Rota Centro-Norte (Escolas Estaduais)',
    statusRota: 'COLETANDO' as 'PENDENTE' | 'COLETANDO' | 'EM_TRANSITO' | 'ENTREGUE',
    totalCargaKg: 450
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!authEmail.trim()) {
      setLoginError('Por favor, informe seu e-mail de motorista.');
      return;
    }

    const found = motoristas.find(
      m => m.email && m.email.toLowerCase().trim() === authEmail.toLowerCase().trim()
    );

    if (!found) {
      setLoginError(`Nenhum motorista encontrado com o e-mail "${authEmail}". Utilize a aba "Cadastrar Motorista" para criar seu acesso.`);
      return;
    }

    setIsLoggedIn(true);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!regForm.nome.trim() || !regForm.email.trim()) {
      setLoginError('Preencha os campos obrigatórios para efetuar seu cadastro.');
      return;
    }

    const exists = motoristas.some(
      m => m.email && m.email.toLowerCase().trim() === regForm.email.toLowerCase().trim()
    );

    if (exists) {
      setLoginError('Já existe um motorista cadastrado com este e-mail. Faça login para acessar.');
      return;
    }

    addMotorista({
      nome: regForm.nome,
      email: regForm.email,
      telefone: regForm.telefone,
      veiculoPadrao: regForm.veiculoPadrao || 'PMN-4A92 (Caminhão Baú)',
      ativo: true
    });
    setAuthEmail(regForm.email);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthEmail('');
    setLoginError(null);
  };

  const handleCreateRomaneio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rotaNome || !motoristaAtual) return;
    addRomaneioMotorista({
      numeroRomaneio: form.numeroRomaneio,
      motoristaId: motoristaAtual.id,
      motoristaNome: motoristaAtual.nome,
      motoristaEmail: motoristaAtual.email,
      veiculoPlaca: form.veiculoPlaca,
      rotaNome: form.rotaNome,
      statusRota: form.statusRota,
      totalCargaKg: form.totalCargaKg,
      paradas: [
        { pontoId: '1', nomeLocal: 'Sede da Cooperativa (Carregamento)', tipoPonto: 'COOP', concluido: true },
        { pontoId: '2', nomeLocal: 'E.M. Profª Maria de Lourdes', tipoPonto: 'ESCOLA', concluido: false }
      ]
    });
    setShowModal(false);
  };

  // IF NOT LOGGED IN: Render App Login Card
  if (!isLoggedIn || !motoristaAtual) {
    return (
      <div className="max-w-xl mx-auto my-6 space-y-6">
        <div className="max-w-md mx-auto bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-300 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-xs border border-amber-500/30">
              <Truck className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">App do Motorista & Logística</h1>
            <p className="text-xs text-slate-400">
              {authMode === 'LOGIN'
                ? 'Acesse com seu e-mail de motorista para visualizar suas rotas de transporte PNAE e romaneios.'
                : 'Cadastre-se como Motorista / Transportador para gerenciar rotas e entregas escolares.'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMode('LOGIN'); setLoginError(null); }}
              className={`flex-1 py-2 rounded-xl transition-all ${
                authMode === 'LOGIN'
                  ? 'bg-amber-600 text-white shadow-xs'
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
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cadastrar Motorista
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
                  E-mail do Motorista
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="motorista@logistica.coop.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Entrar no App do Motorista
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={regForm.nome}
                  onChange={e => setRegForm({ ...regForm, nome: e.target.value })}
                  placeholder="Ex: Reginaldo de Castro"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  E-mail do Motorista
                </label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="reginaldo@logistica.coop.br"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    Placa / Veículo Padrão
                  </label>
                  <input
                    type="text"
                    value={regForm.veiculoPadrao}
                    onChange={e => setRegForm({ ...regForm, veiculoPadrao: e.target.value })}
                    placeholder="PMN-4A92 (Caminhão)"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={regForm.telefone}
                    onChange={e => setRegForm({ ...regForm, telefone: e.target.value })}
                    placeholder="(88) 98888-0000"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-xs mt-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Cadastrar Motorista e Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // DATA ISOLATION FOR LOGGED-IN DRIVER — prioriza o vínculo por motoristaId
  // (mais confiável); mantém o fallback por e-mail/nome para romaneios antigos
  // que ainda não tinham esse vínculo direto.
  const meusRomaneios = romaneiosMotorista.filter(
    rom => rom.motoristaId === motoristaAtual.id ||
           (rom.motoristaEmail && rom.motoristaEmail.toLowerCase() === motoristaAtual.email.toLowerCase()) ||
           rom.motoristaNome.toLowerCase().includes(motoristaAtual.nome.toLowerCase()) ||
           motoristaAtual.nome.toLowerCase().includes(rom.motoristaNome.toLowerCase())
  );

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full w-fit border border-emerald-200 dark:border-emerald-800 mb-2">
            <Truck className="w-3.5 h-3.5" /> Motorista: {motoristaAtual.email}
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{motoristaAtual.nome}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Veículo Atribuído: <strong className="text-slate-800 dark:text-slate-200">{motoristaAtual.veiculoPadrao}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Romaneio
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-1 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </div>

      {/* Romaneios Exclusivos do Motorista Logado */}
      <div className="space-y-4">
        {meusRomaneios.length === 0 ? (
          <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-xs font-medium">
            Nenhum romaneio de rota atribuído a {motoristaAtual.nome} ({motoristaAtual.email}).
          </div>
        ) : (
          meusRomaneios.map(rom => (
            <div key={rom.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-800 dark:text-slate-200">
                  {rom.numeroRomaneio}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  rom.statusRota === 'ENTREGUE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {rom.statusRota}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-emerald-600" /> Rota: {rom.rotaNome}
                </div>
                <div className="text-slate-600 dark:text-slate-400">Veículo: <span className="font-bold text-slate-800 dark:text-slate-200">{rom.veiculoPlaca}</span></div>
                <div className="text-slate-600 dark:text-slate-400">Carga Estimada: <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{rom.totalCargaKg} Kg</span></div>
              </div>

              {rom.statusRota !== 'ENTREGUE' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => atualizarStatusRomaneio(rom.id, 'EM_TRANSITO')}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" /> Iniciar Trajeto
                  </button>
                  <button
                    onClick={() => atualizarStatusRomaneio(rom.id, 'ENTREGUE')}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Entrega
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Romaneio */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Criar Romaneio para {motoristaAtual.nome}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRomaneio} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Identificação / Número *</label>
                <input
                  type="text"
                  required
                  value={form.numeroRomaneio}
                  onChange={e => setForm({ ...form, numeroRomaneio: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Nome da Rota de Coleta *</label>
                <input
                  type="text"
                  required
                  value={form.rotaNome}
                  onChange={e => setForm({ ...form, rotaNome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Ex: Rota Sede - Assentamento Rural - Escolas do Bairro"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Veículo / Placa</label>
                  <input
                    type="text"
                    value={form.veiculoPlaca}
                    onChange={e => setForm({ ...form, veiculoPlaca: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Carga Estimada (Kg)</label>
                  <input
                    type="number"
                    value={form.totalCargaKg}
                    onChange={e => setForm({ ...form, totalCargaKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Status da Rota</label>
                <select
                  value={form.statusRota}
                  onChange={e => setForm({ ...form, statusRota: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="COLETANDO">COLETANDO</option>
                  <option value="EM_TRANSITO">EM TRANSITO</option>
                  <option value="ENTREGUE">ENTREGUE</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Criar Romaneio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
