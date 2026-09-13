import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { UserRole } from '../types';
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Building2, Database, Sparkles, KeyRound } from 'lucide-react';

interface Props {
  onLoginSuccess?: () => void;
  onOpenCooperativeSetup?: () => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess, onOpenCooperativeSetup }) => {
  const { loginWithEmail, registerUser, recoverPassword, switchUserRole } = useCoop();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for Login
  const [loginEmail, setLoginEmail] = useState('admin@siscoope.com.br');
  const [loginPassword, setLoginPassword] = useState('123456');

  // Form states for Registration
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('ADMIN');

  // Form state for Password Recovery
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await loginWithEmail(loginEmail, loginPassword);
      setIsLoading(false);

      if (res.success) {
        setSuccessMessage('Autenticação realizada com sucesso!');
        if (res.requiresCooperativeSetup) {
          if (onOpenCooperativeSetup) onOpenCooperativeSetup();
        } else {
          if (onLoginSuccess) onLoginSuccess();
        }
      } else {
        setErrorMessage(res.error || 'Não foi possível autenticar.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Erro ao conectar ao serviço de autenticação.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword) {
      setErrorMessage('Preencha o e-mail e a senha desejada.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await registerUser(regName, regEmail, regPassword, regRole);
      setIsLoading(false);

      if (res.user) {
        setSuccessMessage('Conta de usuário cadastrada com sucesso!');
        if (res.requiresCooperativeSetup) {
          if (onOpenCooperativeSetup) onOpenCooperativeSetup();
        } else {
          if (onLoginSuccess) onLoginSuccess();
        }
      } else {
        setErrorMessage(res.error || 'Erro ao criar conta de usuário.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Erro ao criar conta no Supabase.');
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      setErrorMessage('Informe seu e-mail cadastrado para solicitar a redefinição de senha.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await recoverPassword(recoveryEmail);
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage('Erro ao solicitar recuperação de senha.');
    }
  };

  const handleDemoQuickLogin = (role: UserRole) => {
    switchUserRole(role);
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative">
        {/* Ambient Top Glow Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand Header */}
        <div className="p-8 pb-6 text-center border-b border-slate-100 relative bg-slate-50/60">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 mb-4 shadow-xs">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            SisCoope <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono border border-emerald-200 font-bold">SaaS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            Plataforma Integrada de Gestão Cooperativa
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/50 shadow-2xs">
              <Database className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Firebase Firestore & Auth Ativo
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-2xl border border-slate-200 mt-6">
            <button
              onClick={() => { setActiveTab('login'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'login' || activeTab === 'forgot'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cadastrar-se
            </button>
          </div>
        </div>

        <div className="p-8 space-y-5">
          {/* Status Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail do Usuário
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="seu.email@cooperativa.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(loginEmail);
                      setActiveTab('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold hover:underline transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[10px] text-slate-500 hover:text-slate-800 font-mono font-medium"
                  >
                    {showPassword ? 'Ocultar' : 'Exibir'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isLoading ? 'Autenticando...' : 'Entrar no SisCoope'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB: FORGOT PASSWORD FORM */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleRecoverPassword} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Informe seu e-mail cadastrado para receber o link de redefinição e recuperação de senha.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail do Usuário
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="seu.email@cooperativa.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setErrorMessage(null); setSuccessMessage(null); }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold hover:underline"
                >
                  Voltar para a Tela de Login
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Ex: Carlos Alberto Silva"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="carlos@cooperativa.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Criar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Perfil Inicial de Acesso
                </label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors font-medium"
                >
                  <option value="ADMIN">Administrador (Presidente / TI / Direção)</option>
                  <option value="GERENTE">Gerente de Operações</option>
                  <option value="SECRETARIA">Secretaria Cooperativa</option>
                  <option value="FINANCEIRO">Financeiro & Tesouraria</option>
                  <option value="AUDITORIA">Conselho Fiscal & Auditoria</option>
                  <option value="CONSULTA">Consulta Apenas Leitura</option>
                </select>
              </div>

              {regRole === 'ADMIN' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Novo Cadastro:</strong> Como <strong>Administrador</strong>, após o cadastro você registrará a Cooperativa (Razão Social, CNPJ, Sede, Cota-Parte e Logotipo).
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isLoading ? 'Cadastrando...' : 'Criar Conta Admin & Onboarding da Cooperativa'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

