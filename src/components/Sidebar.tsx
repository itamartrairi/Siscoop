import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  Award,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Building,
  Key,
  FolderTree,
  Building2,
  Landmark,
  Calculator,
  CircleDollarSign,
  ShoppingCart,
  Boxes,
  UserCheck,
  PieChart,
  UserCircle,
  GraduationCap,
  Smartphone,
  Truck,
  Sprout,
  Database,
  FileText,
  Share2
} from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { SharePortalsModal } from './SharePortalsModal';

interface Props {
  activeView?: string;
  setActiveView?: (view: string) => void;
  activeModule?: string;
  onChangeModule?: (view: string) => void;
}

export const Sidebar: React.FC<Props> = ({
  activeView,
  setActiveView,
  activeModule,
  onChangeModule
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { currentTenant, licenseInfo, trialDaysRemaining, isTrialExpired, currentUser, canAccessModule } = useCoop();

  const isSystemCreator = currentUser?.role === 'ADMIN';
  const currentActive = activeModule || activeView || 'dashboard';

  const MODULE_ID_MAP: Record<string, any> = {
    'dashboard': 'dashboard',
    'cadastro-cooperativa': 'cooperativa',
    'cadastros': 'cadastros',
    'cooperados': 'cooperados',
    'capital': 'capital',
    'assembleias': 'assembleias',
    'diretoria': 'diretoria',
    'sisgepa': 'sisgepa',
    'fiscal': 'fiscal',
    'siscont': 'siscont',
    'sisfin': 'sisfin',
    'compras': 'compras',
    'estoque': 'estoque',
    'rh': 'rh',
    'bi': 'bi',
    'portal-cooperado': 'portal-cooperado',
    'portal-escola': 'portal-escola',
    'app-produtor': 'app-produtor',
    'app-motorista': 'app-motorista',
    'relatorios': 'relatorios',
    'backup-sistema': 'backup',
    'licenca': 'licenca',
    'configuracoes': 'configuracoes'
  };

  const rawNavSections = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard Central', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Núcleo & Cadastros',
      items: [
        { id: 'cadastro-cooperativa', label: 'Cadastro da Cooperativa', icon: Building2 },
        { id: 'cadastros', label: 'Cadastros Unificados', icon: FolderTree },
        { id: 'cooperados', label: 'Cooperados', icon: Users },
        { id: 'capital', label: 'Capital Social', icon: Wallet },
        { id: 'assembleias', label: 'Assembleias', icon: CalendarDays },
        { id: 'diretoria', label: 'Diretoria & Conselhos', icon: Award }
      ]
    },
    {
      title: 'Sistemas Especializados',
      items: [
        { id: 'sisgepa', label: 'SisGepa (PAA / PNAE)', icon: Landmark },
        { id: 'fiscal', label: 'Notas Fiscais (SEFAZ)', icon: FileText },
        { id: 'siscont', label: 'SisCont (Contabilidade)', icon: Calculator },
        { id: 'sisfin', label: 'SisFin (Financeiro)', icon: CircleDollarSign },
        { id: 'compras', label: 'SisCompras', icon: ShoppingCart },
        { id: 'estoque', label: 'SisEstoque', icon: Boxes },
        { id: 'rh', label: 'SisRH (Recursos Humanos)', icon: UserCheck },
        { id: 'bi', label: 'SisBI (Analytics)', icon: PieChart }
      ]
    },
    {
      title: 'Portais & Aplicativos',
      items: [
        { id: 'portal-cooperado', label: 'Portal do Cooperado', icon: UserCircle },
        { id: 'portal-escola', label: 'Portal da Escola', icon: GraduationCap },
        { id: 'app-produtor', label: 'App do Produtor', icon: Smartphone },
        { id: 'app-motorista', label: 'App do Motorista', icon: Truck }
      ]
    },
    {
      title: 'Gerencial & Configurações',
      items: [
        { id: 'relatorios', label: 'Relatórios Gerenciais', icon: FileSpreadsheet },
        { id: 'backup-sistema', label: 'Backup & Sistema', icon: Database },
        { id: 'licenca', label: 'Licença & Planos', icon: Key, badge: licenseInfo.status === 'ACTIVE' ? 'Ativa' : `${trialDaysRemaining}d Teste` },
        { id: 'configuracoes', label: 'Configurações', icon: Settings }
      ]
    }
  ];

  const isConfigAllowed = ['ADMIN', 'PRESIDENTE', 'DIRETOR_FINANCEIRO'].includes(currentUser?.role);

  // Filter navigation sections based on RBAC permissions
  const navSections = rawNavSections.map(sec => {
    const filteredItems = sec.items.filter(item => {
      // Licença tab should only be visible for system creator (ADMIN)
      if (item.id === 'licenca' && !isSystemCreator) {
        return false;
      }
      const moduleKey = MODULE_ID_MAP[item.id] || item.id;
      if (moduleKey === 'configuracoes') {
        return isConfigAllowed && canAccessModule(currentUser, moduleKey);
      }
      return canAccessModule(currentUser, moduleKey);
    });
    return { ...sec, items: filteredItems };
  }).filter(sec => sec.items.length > 0);

  // Collapsible state for sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach(sec => {
      const hasActive = sec.items.some(item => item.id === currentActive);
      initial[sec.title] = hasActive || sec.title === 'Principal';
    });
    return initial;
  });

  // Automatically expand section when active item changes
  useEffect(() => {
    navSections.forEach(sec => {
      if (sec.items.some(item => item.id === currentActive)) {
        setOpenSections(prev => ({ ...prev, [sec.title]: true }));
      }
    });
  }, [currentActive]);

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleSelect = (id: string) => {
    if (onChangeModule) onChangeModule(id);
    if (setActiveView) setActiveView(id);
  };

  return (
    <aside
      className={`bg-emerald-50/70 text-slate-700 border-r border-emerald-200/80 transition-all duration-300 flex flex-col justify-between z-20 select-none shadow-xs ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="h-16 border-b border-emerald-200/80 px-4 flex items-center justify-between bg-emerald-100/40 sticky top-0 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/20 shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="font-extrabold text-slate-900 text-sm tracking-tight leading-none flex items-center gap-1.5">
                  SICOOP <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-bold border border-emerald-300/80">PLATFORM</span>
                </div>
                <div className="text-[10px] text-emerald-800/80 mt-1 truncate font-medium">ERP Integrado de Cooperativas</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/60 rounded-lg transition-colors hidden md:block"
            title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-3">
          {navSections.map((section, idx) => {
            const isOpen = openSections[section.title];
            return (
              <div key={idx} className="space-y-1">
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-emerald-900 font-extrabold px-2.5 py-1.5 rounded-lg hover:bg-emerald-200/50 transition-colors cursor-pointer"
                  >
                    <span className="truncate">{section.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] text-emerald-800 font-bold bg-emerald-200/70 px-1.5 py-0.2 rounded-full">
                        {section.items.length}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-700" />
                      )}
                    </div>
                  </button>
                ) : null}

                {(isOpen || collapsed) && (
                  <nav className="space-y-1">
                    {section.items.map(item => {
                      const Icon = item.icon;
                      const isActive = currentActive === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/20'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-emerald-200/60 border border-transparent'
                          }`}
                          title={collapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-700'}`} />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </div>
                          {!collapsed && item.badge && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                              isActive
                                ? 'bg-emerald-700 text-white border-emerald-500'
                                : licenseInfo.status === 'ACTIVE'
                                ? 'bg-emerald-200/80 text-emerald-900 border-emerald-300'
                                : isTrialExpired
                                ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {section.title === 'Portais & Aplicativos' && !collapsed && (
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="w-full mt-1.5 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300/80 transition-all cursor-pointer shadow-2xs"
                        title="Compartilhar Links de Acesso"
                      >
                        <Share2 className="w-4 h-4 text-emerald-700" />
                        <span>Compartilhar Links</span>
                      </button>
                    )}
                  </nav>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Tenant Badge */}
      {!collapsed && (
        <div className="p-3.5 m-3 bg-white/90 rounded-xl border border-emerald-200/80 shrink-0 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-800 font-bold truncate">
            <Building className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{currentTenant.name}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>Servidor SSO OK</span>
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> SICOOP ERP
            </span>
          </div>
        </div>
      )}

      {/* Central Share Portals Modal */}
      <SharePortalsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </aside>
  );
};

