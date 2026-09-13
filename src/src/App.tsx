import React, { Suspense, lazy, useState, useEffect } from 'react';
import { CoopProvider, useCoop } from './context/CoopContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { SharePortalsModal } from './components/SharePortalsModal';

// Telas de entrada: carregadas junto com o app porque são a primeira coisa que
// um visitante não autenticado vê. Esperar um chunk aqui atrasaria o login.
import { LoginView } from './views/LoginView';

/**
 * Os demais módulos entram por import dinâmico.
 *
 * Antes as 20 views eram importadas de forma estática, o que colocava o ERP
 * inteiro — SisGepa, Fiscal, Contábil, BI, portais — num único chunk de 2,97 MB
 * baixado já na tela de login. Como o usuário só abre um módulo por vez, cada
 * um vira seu próprio chunk.
 *
 * As views são named exports, daí o `.then` remapeando para `default`.
 */
const carregar = <T extends Record<string, any>, K extends keyof T>(
  importar: () => Promise<T>,
  nome: K,
) => lazy(() => importar().then((m) => ({ default: m[nome] })));

const DashboardView = carregar(() => import('./views/DashboardView'), 'DashboardView');
const CooperadosView = carregar(() => import('./views/CooperadosView'), 'CooperadosView');
const CapitalSocialView = carregar(() => import('./views/CapitalSocialView'), 'CapitalSocialView');
const AssembleiasView = carregar(() => import('./views/AssembleiasView'), 'AssembleiasView');
const DiretoriaView = carregar(() => import('./views/DiretoriaView'), 'DiretoriaView');
const RelatoriosView = carregar(() => import('./views/RelatoriosView'), 'RelatoriosView');
const ConfiguracoesView = carregar(() => import('./views/ConfiguracoesView'), 'ConfiguracoesView');
const LicencaView = carregar(() => import('./views/LicencaView'), 'LicencaView');
const CadastroCooperativaView = carregar(
  () => import('./views/CadastroCooperativaView'),
  'CadastroCooperativaView',
);
const CadastrosView = carregar(() => import('./views/CadastrosView'), 'CadastrosView');
const SisGepaView = carregar(() => import('./views/SisGepaView'), 'SisGepaView');
const SisContView = carregar(() => import('./views/SisContView'), 'SisContView');
const SisFinView = carregar(() => import('./views/SisFinView'), 'SisFinView');
const ComprasView = carregar(() => import('./views/ComprasView'), 'ComprasView');
const EstoqueView = carregar(() => import('./views/EstoqueView'), 'EstoqueView');
const RhView = carregar(() => import('./views/RhView'), 'RhView');
const BiView = carregar(() => import('./views/BiView'), 'BiView');
const PortalCooperadoView = carregar(() => import('./views/PortalCooperadoView'), 'PortalCooperadoView');
const PortalEscolaView = carregar(() => import('./views/PortalEscolaView'), 'PortalEscolaView');
const AppProdutorView = carregar(() => import('./views/AppProdutorView'), 'AppProdutorView');
const AppMotoristaView = carregar(() => import('./views/AppMotoristaView'), 'AppMotoristaView');
const FiscalView = carregar(() => import('./views/FiscalView'), 'FiscalView');

const CarregandoModulo: React.FC = () => (
  <div className="flex items-center justify-center py-24 text-slate-500" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">Carregando módulo…</span>
    </div>
  </div>
);

import {
  Share2,
  Building,
  LogIn,
  Layers,
  ShieldCheck,
  UserCircle,
  GraduationCap,
  Smartphone,
  Truck
} from 'lucide-react';

const VALID_PORTALS = ['portal-cooperado', 'portal-escola', 'app-produtor', 'app-motorista'];

const PORTAL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'portal-cooperado': { label: 'Portal do Cooperado', icon: UserCircle, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'portal-escola': { label: 'Portal da Escola (PNAE)', icon: GraduationCap, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'app-produtor': { label: 'App do Produtor Rural', icon: Smartphone, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'app-motorista': { label: 'App do Motorista & Logística', icon: Truck, color: 'text-amber-800 bg-amber-50 border-amber-200' }
};

const MainAppContent: React.FC = () => {
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [standalonePortal, setStandalonePortal] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  const {
    isAuthenticated,
    isPendingCooperativeSetup,
    setIsPendingCooperativeSetup,
    isTrialExpired,
    currentUser,
    currentTenant
  } = useCoop();

  // Detect direct portal sharing from URL query parameters or hash
  useEffect(() => {
    const parseUrlPortal = () => {
      const params = new URLSearchParams(window.location.search);
      const portalQuery = params.get('portal') || params.get('app');
      const hash = window.location.hash.replace('#', '');

      const found = [portalQuery, hash].find(p => p && VALID_PORTALS.includes(p));
      if (found) {
        setStandalonePortal(found);
        setActiveModule(found);
      }
    };

    parseUrlPortal();
    window.addEventListener('popstate', parseUrlPortal);
    return () => window.removeEventListener('popstate', parseUrlPortal);
  }, []);

  const isConfigAllowed = ['ADMIN', 'PRESIDENTE', 'DIRETOR_FINANCEIRO'].includes(currentUser?.role);

  // Standalone Portal Shell — sempre que o link de acesso do portal é aberto
  // (via ?portal=... ou #portal-name na URL), o menu lateral do ERP fica
  // oculto, mesmo que o navegador já tenha uma sessão administrativa ativa.
  // O motivo: o link do portal é compartilhado com cooperados, escolas,
  // produtores e motoristas — eles nunca devem ver o menu interno do ERP.
  // Um administrador que precise voltar ao ERP completo usa o botão
  // "Acesso ERP Administrativo" abaixo (que aciona showAdminLogin).
  if (standalonePortal && !showAdminLogin) {
    const meta = PORTAL_META[standalonePortal] || PORTAL_META['portal-cooperado'];
    const Icon = meta.icon;

    return (
      <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900">
        {/* Clean Standalone Header */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-xl flex items-center justify-center text-white shadow-sm font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight truncate">
                  {currentTenant?.name || 'SICOOP Cooperativa'}
                </span>
                <span className={`hidden sm:flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                CNPJ: {currentTenant?.cnpj || '12.345.678/0001-90'} • Portal de Acesso Direto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
              title="Compartilhar Links e QR Codes de Todos os Portais"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Compartilhar Portais</span>
            </button>

            <button
              onClick={() => setShowAdminLogin(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Acessar Sistema Administrativo Completo do ERP"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Acesso ERP Administrativo</span>
              <span className="sm:hidden">ERP Login</span>
            </button>
          </div>
        </header>

        {/* Standalone Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Suspense fallback={<CarregandoModulo />}>
            {standalonePortal === 'portal-cooperado' && <PortalCooperadoView />}
            {standalonePortal === 'portal-escola' && <PortalEscolaView />}
            {standalonePortal === 'app-produtor' && <AppProdutorView />}
            {standalonePortal === 'app-motorista' && <AppMotoristaView />}
          </Suspense>
        </main>

        <SharePortalsModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          initialPortalId={standalonePortal as any}
        />
      </div>
    );
  }

  // If user is not authenticated and not in standalone portal view, display Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans justify-center relative">
        {standalonePortal && showAdminLogin && (
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setShowAdminLogin(false)}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              ← Voltar ao {PORTAL_META[standalonePortal]?.label || 'Portal'}
            </button>
          </div>
        )}

        <LoginView
          onLoginSuccess={() => {
            setShowAdminLogin(false);
            setActiveModule(standalonePortal || 'dashboard');
          }}
          onOpenCooperativeSetup={() => {
            setIsPendingCooperativeSetup(true);
            setActiveModule('cadastro-cooperativa');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Top Header Navigation */}
      <Header
        activeView={activeModule}
        setActiveView={setActiveModule}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Body with Sidebar + Main Workspace View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeModule={activeModule} onChangeModule={setActiveModule} />

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 p-6 lg:p-8">
          <Suspense fallback={<CarregandoModulo />}>
          {activeModule === 'login' && (
            <LoginView
              onLoginSuccess={() => setActiveModule('dashboard')}
              onOpenCooperativeSetup={() => {
                setIsPendingCooperativeSetup(true);
                setActiveModule('cadastro-cooperativa');
              }}
            />
          )}

          {activeModule === 'cadastro-cooperativa' && (
            <CadastroCooperativaView
              onComplete={() => {
                setIsPendingCooperativeSetup(false);
                setActiveModule('dashboard');
              }}
            />
          )}

          {isTrialExpired && activeModule !== 'cadastro-cooperativa' && activeModule !== 'licenca' ? (
            <LicencaView />
          ) : (
            <>
              {activeModule === 'dashboard' && (
                <DashboardView onNavigateModule={setActiveModule} setActiveView={setActiveModule} />
              )}
              {activeModule === 'cadastros' && <CadastrosView />}
              {activeModule === 'cooperados' && <CooperadosView />}
              {activeModule === 'capital' && <CapitalSocialView />}
              {activeModule === 'assembleias' && <AssembleiasView />}
              {activeModule === 'diretoria' && <DiretoriaView />}

              {/* SICOOP PLATFORM Modules */}
              {activeModule === 'sisgepa' && <SisGepaView />}
              {activeModule === 'fiscal' && <FiscalView />}
              {activeModule === 'siscont' && <SisContView />}
              {activeModule === 'sisfin' && <SisFinView />}
              {activeModule === 'compras' && <ComprasView />}
              {activeModule === 'estoque' && <EstoqueView />}
              {activeModule === 'rh' && <RhView />}
              {activeModule === 'bi' && <BiView />}

              {/* Portals and Apps */}
              {activeModule === 'portal-cooperado' && <PortalCooperadoView />}
              {activeModule === 'portal-escola' && <PortalEscolaView />}
              {activeModule === 'app-produtor' && <AppProdutorView />}
              {activeModule === 'app-motorista' && <AppMotoristaView />}

              {activeModule === 'relatorios' && <RelatoriosView />}
              {activeModule === 'backup-sistema' && <ConfiguracoesView initialTab="backup" />}
              {activeModule === 'licenca' && (
                currentUser?.role === 'ADMIN' ? (
                  <LicencaView />
                ) : (
                  <DashboardView onNavigateModule={setActiveModule} setActiveView={setActiveModule} />
                )
              )}
              {activeModule === 'configuracoes' && (
                isConfigAllowed ? (
                  <ConfiguracoesView initialTab="meu-perfil" />
                ) : (
                  <DashboardView onNavigateModule={setActiveModule} setActiveView={setActiveModule} />
                )
              )}
            </>
          )}
          </Suspense>
        </main>
      </div>

      {/* Global Search Modal Triggerable from Header or Ctrl+K */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectModule={setActiveModule}
      />
    </div>
  );
};

export function App() {
  return (
    <CoopProvider>
      <MainAppContent />
    </CoopProvider>
  );
}

export default App;
