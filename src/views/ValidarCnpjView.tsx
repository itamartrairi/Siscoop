import React, { useState } from 'react';
import { Building2, AlertCircle, LogOut } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { cnpjValido } from '../services/cnpjService';
import { somenteDigitos, marcarCnpjValidado, limparValidacoesCnpj } from '../services/validacaoCnpjSessao';
import './LoginView.css';

/**
 * Etapa obrigatória logo depois do login Google: o usuário informa o CNPJ da
 * cooperativa e ele é comparado com o CNPJ do cadastro da cooperativa
 * vinculada à conta (carregado do Firestore no login).
 *
 * A confirmação vale para a aba do navegador (sessionStorage). Ao sair do
 * sistema ou fechar o navegador, o CNPJ é pedido de novo.
 */

const MAX_TENTATIVAS = 3;

function formatarCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

interface Props {
  onValidado: () => void;
  /** Para administradores quando a cooperativa ainda não tem CNPJ no cadastro. */
  onAbrirCadastro?: () => void;
}

export const ValidarCnpjView: React.FC<Props> = ({ onValidado, onAbrirCadastro }) => {
  const { currentUser, currentTenant, logout, addAuditLog } = useCoop();

  const [cnpj, setCnpj] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const [saindo, setSaindo] = useState(false);

  const cnpjCadastrado = somenteDigitos(currentTenant?.cnpj || '');
  const podeEditarCadastro = ['ADMIN', 'PRESIDENTE', 'DIRETOR_FINANCEIRO'].includes(currentUser?.role);

  const sair = async () => {
    setSaindo(true);
    limparValidacoesCnpj();
    await logout();
  };

  const validar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const digitado = somenteDigitos(cnpj);

    if (digitado.length !== 14 || !cnpjValido(digitado)) {
      setErro('CNPJ inválido. Confira os 14 números digitados.');
      return;
    }

    if (digitado === cnpjCadastrado) {
      marcarCnpjValidado(currentUser?.id, currentTenant?.id);
      addAuditLog('AUTH', 'LOGIN', `Usuário ${currentUser?.name || ''} confirmou o CNPJ da cooperativa`);
      onValidado();
      return;
    }

    const usadas = tentativas + 1;
    setTentativas(usadas);
    addAuditLog('AUTH', 'LOGIN', `CNPJ informado não confere com o cadastro (${currentUser?.email || ''}), tentativa ${usadas}`);

    if (usadas >= MAX_TENTATIVAS) {
      setErro('CNPJ não confere com o cadastro. Limite de tentativas atingido; a sessão foi encerrada.');
      await sair();
      return;
    }
    setErro(`O CNPJ informado não confere com o cadastro da cooperativa. Restam ${MAX_TENTATIVAS - usadas} tentativa(s).`);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-ambient-1"></div>
        <div className="login-ambient-2"></div>

        <div className="login-header">
          <div className="login-icon-box">
            <Building2 size={28} />
          </div>
          <h2 className="login-title">Confirme sua cooperativa</h2>
          <p className="login-subtitle">
            Olá{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}! Para continuar, informe o CNPJ da
            cooperativa vinculada à sua conta.
          </p>
        </div>

        <div className="login-body">
          {erro && (
            <div className="login-alert error" role="alert">
              <AlertCircle size={16} />
              <span>{erro}</span>
            </div>
          )}

          {!cnpjCadastrado ? (
            <div className="login-form">
              <div className="login-alert error" role="alert">
                <AlertCircle size={16} />
                <span>
                  A cooperativa vinculada à sua conta ainda não tem CNPJ no cadastro, então não é possível validar o acesso.
                  {podeEditarCadastro ? ' Complete o cadastro da cooperativa para continuar.' : ' Peça ao administrador para completar o cadastro.'}
                </span>
              </div>
              {podeEditarCadastro && onAbrirCadastro && (
                <button type="button" className="login-submit-btn" onClick={onAbrirCadastro}>
                  Abrir cadastro da cooperativa
                </button>
              )}
              <button type="button" className="login-google-btn" onClick={sair} disabled={saindo}>
                <LogOut size={16} /> Sair
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={validar} noValidate>
              <div className="login-field-group">
                <div className="login-label-row">
                  <label className="login-label" htmlFor="cnpj-cooperativa">CNPJ da cooperativa</label>
                </div>
                <div className="login-input-wrap">
                  <input
                    id="cnpj-cooperativa"
                    className="login-input"
                    style={{ paddingLeft: '0.9rem' }}
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={ev => setCnpj(formatarCnpj(ev.target.value))}
                    disabled={saindo}
                  />
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={saindo || somenteDigitos(cnpj).length !== 14}>
                Validar e entrar
              </button>
              <button type="button" className="login-google-btn" onClick={sair} disabled={saindo}>
                <LogOut size={16} /> Sair / trocar de conta
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
