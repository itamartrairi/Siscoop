import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  UserCircle,
  Wallet,
  CalendarDays,
  Sprout,
  DollarSign,
  Printer,
  Lock,
  Mail,
  LogOut,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';

export const PortalCooperadoView: React.FC = () => {
  const { currentUser, cooperados, registrosProducao, transacoesCapital } = useCoop();
  const [selectedReceiptTxId, setSelectedReceiptTxId] = useState<string | null>(null);

  // Acesso simplificado — somente por e-mail, sem senha. O cadastro do
  // cooperado é feito só pela administração (Cooperados); este portal é
  // exclusivamente de login/consulta.
  const [authEmail, setAuthEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registered Cooperado matching strictly the logged-in email
  const cooperadoAtual = cooperados.find(
    c => c.email && authEmail.trim() && c.email.toLowerCase().trim() === authEmail.toLowerCase().trim()
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!authEmail.trim()) {
      setLoginError('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    const found = cooperados.find(
      c => c.email && c.email.toLowerCase().trim() === authEmail.toLowerCase().trim()
    );

    if (!found) {
      setLoginError(`Nenhum cooperado cadastrado encontrado com o e-mail "${authEmail}". Peça para a cooperativa cadastrar seu e-mail em Cooperados.`);
      return;
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthEmail('');
    setLoginError(null);
  };

  // IF NOT LOGGED IN: Render Portal Login Card
  if (!isLoggedIn || !cooperadoAtual) {
    return (
      <div className="max-w-2xl mx-auto my-6 space-y-6">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-xs">
              <UserCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Portal do Cooperado</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acesse com seu e-mail cadastrado para consultar seu Capital Social, Produção e Recibos.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                E-mail do Cooperado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="cooperado@exemplo.com.br"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                Seu e-mail já deve estar no seu cadastro de cooperado. Se ainda não tiver acesso, fale com a administração da cooperativa.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Entrar no Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // LOGGED IN & ISOLATED DATA FILTERING:
  // Strictly filter data linked to this cooperado's email/ID
  const producaoDoCooperado = registrosProducao.filter(
    r => r.cooperadoId === cooperadoAtual.id ||
         (r.cooperadoNome && r.cooperadoNome.toLowerCase() === cooperadoAtual.nome.toLowerCase()) ||
         (r.produtorNome && r.produtorNome.toLowerCase() === cooperadoAtual.nome.toLowerCase())
  );

  const capitalDoCooperado = transacoesCapital.filter(
    t => t.cooperadoId === cooperadoAtual.id ||
         t.cooperadoMatricula === cooperadoAtual.matricula ||
         (t.cooperadoNome && t.cooperadoNome.toLowerCase() === cooperadoAtual.nome.toLowerCase())
  );

  const totalKgEntregue = producaoDoCooperado.reduce(
    (acc, item) => acc + ((item as any).quantidadeColhidaKg || (item as any).quantidadeEstimadaKg || item.quantidadeEstimada || 0),
    0
  );

  return (
    <div className="space-y-6">

      {/* Top Session Banner with Logout Button */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 p-6 rounded-2xl text-white shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg border border-white/20">
              <UserCircle className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Portal Exclusivo do Cooperado</span>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-100 rounded-full text-[10px] font-mono border border-emerald-400/40">
                  {cooperadoAtual.email}
                </span>
              </div>
              <h1 className="text-xl font-extrabold">{cooperadoAtual.nome}</h1>
              <p className="text-xs text-emerald-100/80 font-mono">CPF: {cooperadoAtual.cpf || (cooperadoAtual as any).cpfCnpj} | Matrícula: {cooperadoAtual.matricula}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-bold">
              {cooperadoAtual.situacao || 'Ativo Regular'}
            </span>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Encerrar sessão deste e-mail"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair / Trocar E-mail
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards for this specific Cooperado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" /> Meu Capital Integralizado
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            R$ {(cooperadoAtual.capitalIntegralizado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
            Subscrito: R$ {(cooperadoAtual.capitalSubscrito || cooperadoAtual.capitalIntegralizado || 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sprout className="w-4 h-4 text-emerald-600" /> Volume Entregue PAA/PNAE
          </span>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400 font-mono">{totalKgEntregue.toLocaleString('pt-BR')} Kg</div>
          <div className="text-[11px] text-slate-500">{producaoDoCooperado.length} Registros de Entregas Cadastrados</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-emerald-600" /> Votação nas Assembleias
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">1 Voto Ativo</div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">Vinculado a {cooperadoAtual.email}</div>
        </div>
      </div>

      {/* Extrato de Capital Social Exclusivo do E-mail */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          Extrato de Capital Social de {cooperadoAtual.nome}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold uppercase border-b border-emerald-200 dark:border-emerald-800">
                <th className="p-3">Data / Documento</th>
                <th className="p-3">Tipo de Operação</th>
                <th className="p-3">Forma Pagto</th>
                <th className="p-3">Valor (R$)</th>
                <th className="p-3 text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {capitalDoCooperado.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                    Nenhum lançamento de capital social cadastrado para o e-mail {cooperadoAtual.email}.
                  </td>
                </tr>
              ) : (
                capitalDoCooperado.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">{t.numeroDocumento}</div>
                      <div className="text-[10px] text-slate-400">{t.data}</div>
                    </td>
                    <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-400">{t.tipo}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{t.formaPagamento}</td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptTxId(t.id)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 text-slate-700 dark:text-slate-200 rounded-lg font-semibold inline-flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" /> Recibo
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceiptTxId && (
        <ReceiptModal
          transacaoId={selectedReceiptTxId}
          onClose={() => setSelectedReceiptTxId(null)}
        />
      )}
    </div>
  );
};
