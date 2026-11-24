import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import './LoginView.css';

interface Props {
  onLoginSuccess?: () => void;
  onOpenCooperativeSetup?: () => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess, onOpenCooperativeSetup }) => {
  const { loginWithGoogle } = useCoop();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

          <div className="login-form">
            <p className="login-subtitle">Use a conta Google do e-mail cadastrado na sua cooperativa.</p>
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
        </div>
      </div>
    </div>
  );
};
