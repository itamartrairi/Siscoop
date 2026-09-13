import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Building2,
  UserCheck,
  ChevronDown,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  LogOut,
  PlusCircle,
  User,
  Settings,
  Key,
  Award,
  Share2
} from 'lucide-react';
import { UserRole } from '../types';
import { SharePortalsModal } from './SharePortalsModal';

interface Props {
  activeView?: string;
  setActiveView?: (view: string) => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<Props> = ({ activeView = 'dashboard', setActiveView, onOpenSearch }) => {
  const {
    currentUser,
    switchUserRole,
    currentTenant,
    setCurrentTenant,
    tenants,
    setIsSearchOpen,
    notifications,
    markNotificationAsRead,
    themeMode,
    toggleTheme,
    logout,
    licenseInfo,
    trialDaysRemaining,
    isTrialExpired
  } = useCoop();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const unreadCount = notifications.filter(n => !n.lida).length;
  const isSystemCreator = currentUser?.role === 'ADMIN';
  const isConfigAllowed = ['ADMIN', 'PRESIDENTE', 'DIRETOR_FINANCEIRO'].includes(currentUser?.role);

  const handleSearchClick = () => {
    if (onOpenSearch) onOpenSearch();
    else setIsSearchOpen(true);
  };

  const handleNavigate = (view: string) => {
    if (setActiveView) setActiveView(view);
  };

  const rolesList: { role: UserRole; label: string; color: string }[] = [
    { role: 'ADMIN', label: 'Criador do Sistema (Admin)', color: 'bg-purple-900/60 text-purple-300 border border-purple-700/40' },
    { role: 'GERENTE', label: 'Gerente da Cooperativa', color: 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/40' },
    { role: 'SECRETARIA', label: 'Secretaria', color: 'bg-amber-900/60 text-amber-300 border border-amber-700/40' },
    { role: 'FINANCEIRO', label: 'Financeiro', color: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/40' },
    { role: 'AUDITORIA', label: 'Auditoria', color: 'bg-rose-900/60 text-rose-300 border border-rose-700/40' },
    { role: 'CONSULTA', label: 'Consulta', color: 'bg-slate-800 text-slate-300 border border-slate-700/40' }
  ];

  const viewTitles: Record<string, string> = {
    dashboard: 'Dashboard Executivo',
    cooperados: 'Cadastro de Cooperados',
    capital: 'Capital Social & Financeiro',
    assembleias: 'Assembleias & Governança',
    diretoria: 'Diretoria & Conselhos',
    relatorios: 'Relatórios Gerenciais',
    'backup-sistema': 'Backup & Gestão do Sistema',
    licenca: 'Licença & Planos de Assinatura (Kiwify)',
    'cadastro-cooperativa': 'Cadastro da Cooperativa',
    login: 'Aba de Autenticação & Acesso',
    configuracoes: 'Configurações & Auditoria'
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs">
      {/* Left Title & Breadcrumb */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
            {viewTitles[activeView] || 'SisCoope'}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </h1>
          <p className="text-[11px] text-slate-500 font-mono">
            {currentTenant.name} <span className="text-slate-300">•</span> CNPJ {currentTenant.cnpj}
          </p>
        </div>
      </div>

      {/* Middle Global Search Button */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <button
          onClick={handleSearchClick}
          className="w-full h-9 px-4 bg-slate-50 hover:bg-slate-100 rounded-full text-xs text-slate-500 flex items-center justify-between border border-slate-200 transition-all hover:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500 overflow-hidden shadow-xs"
        >
          <span className="flex items-center gap-2 truncate whitespace-nowrap min-w-0">
            <Search className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate whitespace-nowrap">Pesquisar Nome, CPF, Matrícula, Capital...</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 font-mono text-[10px] border border-slate-300/60 shrink-0 ml-2">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* License & Subscription Status Quick Button - visible only for System Creator (ADMIN) */}
        {isSystemCreator && (
          <button
            onClick={() => handleNavigate('licenca')}
            title="Ver Detalhes da Licença e Planos Kiwify"
            className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              licenseInfo.status === 'ACTIVE'
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                : isTrialExpired
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
          >
            <Key className={`w-3.5 h-3.5 ${
              licenseInfo.status === 'ACTIVE' ? 'text-emerald-600' : isTrialExpired ? 'text-rose-600' : 'text-amber-600'
            }`} />
            <span className="hidden sm:inline">
              {licenseInfo.status === 'ACTIVE'
                ? 'Licença Ativa'
                : isTrialExpired
                ? 'Teste Expirado'
                : `${trialDaysRemaining}d de Teste`}
            </span>
          </button>
        )}

        {/* Tenant Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowTenantMenu(!showTenantMenu); setShowNotifications(false); setShowRoleMenu(false); }}
            className="h-9 px-3 bg-emerald-50/80 hover:bg-emerald-100/80 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2 border border-emerald-200/80 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="max-w-[120px] truncate">{currentTenant.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
          </button>

          {showTenantMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Alternar Cooperativa (Multi-Tenant)
              </div>
              {tenants.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setCurrentTenant(t);
                    setShowTenantMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    t.id === currentTenant.id ? 'bg-emerald-50 text-emerald-800 font-bold border-l-2 border-emerald-600' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div>{t.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{t.cnpj}</div>
                  </div>
                  {t.id === currentTenant.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}


            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowRoleMenu(false); setShowTenantMenu(false); }}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl relative transition-colors border border-transparent hover:border-slate-200"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Alertas & Notificações</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  {unreadCount} pendentes
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationAsRead(n.id);
                      if (n.linkModulo) handleNavigate(n.linkModulo);
                      setShowNotifications(false);
                    }}
                    className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                      !n.lida ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {n.tipo === 'ALERTA' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-900">{n.titulo}</div>
                        <div className="text-slate-600 mt-0.5 text-[11px] leading-tight">{n.mensagem}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">{n.data}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Share Portals & Apps Quick Button */}
        <button
          onClick={() => setShowShareModal(true)}
          title="Compartilhar Links de Acesso dos Portais e Aplicativos"
          className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compartilhar Portais</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
          title="Alternar Modo Claro / Escuro"
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-700" />}
        </button>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowRoleMenu(!showRoleMenu); setShowNotifications(false); setShowTenantMenu(false); }}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/40"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 line-clamp-1">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" /> {currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40">
              {isConfigAllowed && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Ações do Perfil
                  </div>

                  <button
                    onClick={() => {
                      handleNavigate('configuracoes');
                      setShowRoleMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4 text-emerald-600" /> Meu Perfil & Senha
                  </button>

                  <button
                    onClick={() => {
                      handleNavigate('configuracoes');
                      setShowRoleMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition-colors border-b border-slate-100 pb-2"
                  >
                    <Shield className="w-4 h-4 text-blue-600" /> Usuários & Permissões
                  </button>
                </>
              )}

              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                <Key className="w-3.5 h-3.5 text-amber-600" /> Simular Perfil de Acesso
              </div>
              {rolesList.map(r => (
                <button
                  key={r.role}
                  onClick={() => {
                    switchUserRole(r.role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    currentUser.role === r.role ? 'font-bold bg-slate-100 text-slate-900' : 'text-slate-700'
                  }`}
                >
                  <span>{r.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${r.color}`}>
                    {r.role}
                  </span>
                </button>
              ))}

              <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                <button
                  onClick={() => {
                    logout();
                    setShowRoleMenu(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sair da Conta (Logout)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Central Share Portals Modal */}
      <SharePortalsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </header>
  );
};
