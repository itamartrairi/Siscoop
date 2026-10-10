import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { UserRole } from '../types';
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Building2, Database, KeyRound } from 'lucide-react';
import './LoginView.css';

interface Props {
  onLoginSuccess?: () => void;
  onOpenCooperativeSetup?: () => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess, onOpenCooperativeSetup }) => {
  const { loginWithEmail, loginWithGoogle, registerUser, recoverPassword } = useCoop();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!loginWithGoogle) {
        throw new Error("Login com Google não configurado.");
      }
      const res = await loginWithGoogle();
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
      setErrorMessage(err?.message || 'Erro ao conectar ao serviço do Google.');
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
      setErrorMessage(err?.message || 'Erro ao criar conta no Firebase.');
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

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-ambient-1"></div>
        <div className="login-ambient-2"></div>

        <div className="login-header">
          <div className="login-icon-box">
            <Shield size={28} />
          </div>
          <h2 className="login-title">
            SisCoope <span className="login-badge">SaaS</span>
          </h2>
          <p className="login-subtitle">Plataforma Integrada de Gestão Cooperativa</p>

          <div className="login-db-status">
            <Database size={12} />
            Firebase Auth Ativo • Segurança Aprimorada
          </div>

          <div className="login-tabs">
            <button
              onClick={() => { setActiveTab('login'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`login-tab-btn ${activeTab === 'login' || activeTab === 'forgot' ? 'active' : ''}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`login-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            >
              Cadastrar-se
            </button>
          </div>
        </div>

        <div className="login-body">
          {errorMessage && (
            <div className="login-alert error">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="login-alert success">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'login' && (
            <div className="login-form">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="login-google-btn"
              >
                <svg className="login-google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isLoading ? 'Autenticando...' : 'Continuar com o Google'}
              </button>
            </div>
          )}

          {activeTab === 'forgot' && (
            <form onSubmit={handleRecoverPassword} className="login-form">
              <div className="login-info-box">
                <KeyRound size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>Informe seu e-mail cadastrado para receber o link de redefinição e recuperação de senha.</span>
              </div>

              <div className="login-field-group">
                <label className="login-label">E-mail do Usuário</label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" />
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="seu.email@cooperativa.com.br"
                    className="login-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="login-submit-btn"
              >
                <span>{isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}</span>
                <ArrowRight size={16} />
              </button>

              <div className="login-back-link">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setErrorMessage(null); setSuccessMessage(null); }}
                  className="login-back-btn"
                >
                  Voltar para a Tela de Login
                </button>
              </div>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="login-form">
              <div className="login-field-group">
                <label className="login-label">Nome Completo</label>
                <div className="login-input-wrap">
                  <User className="login-input-icon" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Ex: Carlos Alberto Silva"
                    className="login-input"
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-label">E-mail Corporativo</label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="carlos@cooperativa.com.br"
                    className="login-input"
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-label">Criar Senha</label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="login-input"
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label className="login-label">Perfil Inicial de Acesso</label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value as UserRole)}
                  className="login-input"
                  style={{ paddingLeft: '14px' }}
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
                <div className="login-info-box">
                  <Building2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    <strong>Novo Cadastro:</strong> Como Administrador, após o cadastro você registrará a Cooperativa.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="login-submit-btn"
              >
                <span>{isLoading ? 'Cadastrando...' : 'Criar Conta Admin'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
