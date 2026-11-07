import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  Award,
  FileSpreadsheet,
  Settings,
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
  Share2,
  Tractor,
  X,
  ArrowRight,
  Lightbulb,
  Briefcase
  } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { SharePortalsModal } from './SharePortalsModal';

interface Props {
  activeView?: string;
  setActiveView?: (view: string) => void;
  activeModule?: string;
  onChangeModule?: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  description: string;
  action: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  key: string;
  title: string;
  shortLabel: string;
  icon: React.ElementType;
  subtitle: string;
  tip: string;
  items: NavItem[];
}

/**
 * Menu lateral em formato "trilho": mostra só o ícone de cada grupo.
 * Ao clicar num grupo abre-se uma janela sobre a área de trabalho com os
 * submenus em passos numerados (cada um com descrição e botão de acesso).
 * Grupos com um único item navegam direto, sem abrir a janela.
 */
export const Sidebar: React.FC<Props> = ({
  activeView,
  setActiveView,
  activeModule,
  onChangeModule
}) => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { currentTenant, licenseInfo, trialDaysRemaining, isTrialExpired, currentUser, canAccessModule } = useCoop();

  const isSystemCreator = ['ADMIN', 'PRESIDENTE', 'DIRETOR_FINANCEIRO'].includes(currentUser?.role);
  const currentActive = activeModule || activeView || 'dashboard';

  const MODULE_ID_MAP: Record<string, any> = {
    'dashboard': 'dashboard',
    'cadastro-cooperativa': 'cadastro-cooperativa',
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
    'cargos-departamentos': 'rh',
    'bi': 'bi',
    'aluguel-maquinas': 'aluguel-maquinas',
    'portal-cooperado': 'portal-cooperado',
    'portal-escola': 'portal-escola',
    'app-produtor': 'app-produtor',
    'app-motorista': 'app-motorista',
    'relatorios': 'relatorios',
    'backup-sistema': 'backup-sistema',
    'licenca': 'licenca',
    'configuracoes': 'configuracoes'
  };

  const rawNavSections: NavSection[] = [
    {
      key: 'visao-geral',
      title: 'Visão Geral',
      shortLabel: 'Painel',
      icon: LayoutDashboard,
      subtitle: 'Acompanhe os números da cooperativa em um só lugar.',
      tip: 'O painel resume produção, financeiro e quadro social.',
      items: [
        { id: 'dashboard', label: 'Painel da Cooperativa', description: 'Visão consolidada dos principais indicadores da cooperativa.', action: 'Abrir Painel', icon: LayoutDashboard }
      ]
    },
    {
      key: 'quadro-social',
      title: 'Quadro Social & Governança',
      shortLabel: 'Social',
      icon: Users,
      subtitle: 'Siga os passos ao lado para organizar a base da sua cooperativa.',
      tip: 'Comece pelos dados da cooperativa: eles aparecem em notas, atas e relatórios.',
      items: [
        { id: 'cadastro-cooperativa', label: 'Dados da Cooperativa', description: 'Informe CNPJ, endereço, estatuto e dados institucionais.', action: 'Editar Dados', icon: Building2 },
        { id: 'cadastros', label: 'Cadastros Agropecuários', description: 'Cadastre produtos, culturas, unidades e demais tabelas de apoio.', action: 'Abrir Cadastros', icon: FolderTree },
        { id: 'cooperados', label: 'Cooperados & Produtores', description: 'Mantenha o quadro de cooperados e produtores sempre atualizado.', action: 'Gerenciar Cooperados', icon: Users },
        { id: 'capital', label: 'Capital Social & Cotas', description: 'Controle integralizações, cotas-partes e movimentações de capital.', action: 'Abrir Capital Social', icon: Wallet },
        { id: 'assembleias', label: 'Assembleias Gerais (AGO/AGE)', description: 'Convoque, registre presenças e gere atas das assembleias.', action: 'Abrir Assembleias', icon: CalendarDays },
        { id: 'diretoria', label: 'Diretoria & Conselho Fiscal', description: 'Registre mandatos da diretoria e do conselho fiscal.', action: 'Abrir Diretoria', icon: Award }
      ]
    },
    {
      key: 'producao',
      title: 'Gestão da Produção & Agro',
      shortLabel: 'Produção',
      icon: Sprout,
      subtitle: 'Da comercialização ao estoque, toda a operação agrícola em um só lugar.',
      tip: 'Registre as entregas e compras para manter estoque e comercialização sempre em dia.',
      items: [
        { id: 'sisgepa', label: 'Comercialização Agrícola (PAA/PNAE)', description: 'Gerencie projetos de venda, contratos e entregas do PAA e PNAE.', action: 'Abrir Comercialização', icon: Landmark },
        { id: 'estoque', label: 'Galpão & Estoque Agrícola', description: 'Consulte e movimente o estoque, evitando perdas e faltas.', action: 'Consultar Estoque', icon: Boxes },
        { id: 'compras', label: 'Compras & Insumos Agrícolas', description: 'Registre compras de insumos e acompanhe pedidos a receber.', action: 'Abrir Compras', icon: ShoppingCart },
        { id: 'aluguel-maquinas', label: 'Aluguel de Máquinas', description: 'Agende e controle o aluguel de máquinas aos cooperados.', action: 'Abrir Aluguel', icon: Tractor }
      ]
    },
    {
      key: 'financas',
      title: 'Finanças & Contabilidade',
      shortLabel: 'Finanças',
      icon: CircleDollarSign,
      subtitle: 'Financeiro, notas fiscais, contabilidade, folha e indicadores da cooperativa.',
      tip: 'Mantenha as contas conciliadas: assim a contabilidade e os indicadores ficam sempre em dia.',
      items: [
        { id: 'sisfin', label: 'Financeiro & Contas da Cooperativa', description: 'Contas a pagar e receber, caixa e conciliação bancária.', action: 'Abrir Financeiro', icon: CircleDollarSign },
        { id: 'fiscal', label: 'Notas Fiscais (NF-e / SEFAZ)', description: 'Emita e consulte NF-e com integração à SEFAZ.', action: 'Abrir Notas Fiscais', icon: FileText },
        { id: 'siscont', label: 'Contabilidade & Livro Diário', description: 'Lançamentos, livro diário e demonstrações contábeis.', action: 'Abrir Contabilidade', icon: Calculator },
        { id: 'rh', label: 'Colaboradores & Folha', description: 'Cadastro de colaboradores e controle da folha de pagamento.', action: 'Abrir RH', icon: UserCheck },
        { id: 'cargos-departamentos', label: 'Cargos & Departamentos', description: 'Cadastre os setores e as funções usados nos usuários e colaboradores.', action: 'Abrir Cadastro', icon: Briefcase },
        { id: 'bi', label: 'Indicadores de Desempenho (BI)', description: 'Gráficos e indicadores para apoiar as decisões da diretoria.', action: 'Abrir Indicadores', icon: PieChart }
      ]
    },
    {
      key: 'portais',
      title: 'Canais de Campo & Portais',
      shortLabel: 'Portais',
      icon: Smartphone,
      subtitle: 'Leve a cooperativa até o cooperado, o motorista e a escola.',
      tip: 'Compartilhe os links dos portais: quem os abre não vê o menu interno do ERP.',
      items: [
        { id: 'portal-cooperado', label: 'Portal do Cooperado', description: 'Extratos, entregas e informações para o cooperado.', action: 'Abrir Portal', icon: UserCircle },
        { id: 'app-produtor', label: 'App do Produtor (Colheita)', description: 'Registro de colheita e entregas direto do campo.', action: 'Abrir App', icon: Smartphone },
        { id: 'app-motorista', label: 'App do Motorista (Rotas)', description: 'Rotas de coleta e entrega para os motoristas.', action: 'Abrir App', icon: Truck },
        { id: 'portal-escola', label: 'Portal da Merenda / Escolas', description: 'Pedidos e recebimentos da alimentação escolar.', action: 'Abrir Portal', icon: GraduationCap }
      ]
    },
    {
      key: 'administracao',
      title: 'Administração & Sistema',
      shortLabel: 'Sistema',
      icon: Settings,
      subtitle: 'Relatórios, segurança dos dados e configurações da plataforma.',
      tip: 'Faça backups periódicos para manter seus dados sempre protegidos.',
      items: [
        { id: 'relatorios', label: 'Relatórios Operacionais', description: 'Gere e exporte relatórios de todos os módulos.', action: 'Abrir Relatórios', icon: FileSpreadsheet },
        { id: 'backup-sistema', label: 'Backup de Dados', description: 'Salve e restaure cópias de segurança dos dados.', action: 'Abrir Backup', icon: Database },
        { id: 'licenca', label: 'Licença da Plataforma', description: 'Situação da licença e período de teste.', action: 'Ver Licença', icon: Key, badge: licenseInfo.status === 'ACTIVE' ? 'Ativa' : `${trialDaysRemaining}d Teste` },
        { id: 'configuracoes', label: 'Configurações Gerais', description: 'Perfil, usuários, permissões e preferências.', action: 'Abrir Configurações', icon: Settings }
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

  const activeSection = navSections.find(sec => sec.key === openSection) || null;

  // Fecha a janela com Esc
  useEffect(() => {
    if (!openSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSection(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSection]);

  const handleSelect = (id: string) => {
    if (onChangeModule) onChangeModule(id);
    if (setActiveView) setActiveView(id);
    setOpenSection(null);
  };

  const handleSectionClick = (section: NavSection) => {
    if (section.items.length === 1) {
      handleSelect(section.items[0].id);
      return;
    }
    setOpenSection(prev => (prev === section.key ? null : section.key));
  };

  const badgeClass = (isActive: boolean) =>
    isActive
      ? 'bg-emerald-700 text-white border-emerald-500'
      : licenseInfo.status === 'ACTIVE'
        ? 'bg-emerald-200/80 text-emerald-900 border-emerald-300'
        : isTrialExpired
          ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
          : 'bg-amber-100 text-amber-800 border-amber-200';

  return (
    <aside className="relative w-20 bg-emerald-900 text-emerald-50 flex flex-col justify-between z-30 select-none shrink-0">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Brand */}
        <div className="h-16 flex items-center justify-center border-b border-emerald-800" title="SICOOP – ERP Integrado de Cooperativas">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
            <Sprout className="w-5 h-5" />
          </div>
        </div>

        {/* Grupos do menu (somente ícones) */}
        <nav className="py-3 px-2 space-y-1.5">
          {navSections.map(section => {
            const Icon = section.icon;
            const hasActive = section.items.some(item => item.id === currentActive);
            const isOpen = openSection === section.key;
            const highlighted = isOpen || (hasActive && !openSection);
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => handleSectionClick(section)}
                title={section.title}
                aria-expanded={section.items.length > 1 ? isOpen : undefined}
                className={`w-full flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                  highlighted
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-900/30'
                    : hasActive
                      ? 'bg-emerald-800 text-white'
                      : 'text-emerald-100/80 hover:bg-emerald-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="leading-none truncate max-w-full px-1">{section.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Rodapé: cooperativa atual */}
      <div className="p-2 pb-3 flex justify-center" title={`${currentTenant.name} · Servidor SSO OK`}>
        <div className="h-10 w-10 rounded-xl bg-emerald-800 flex items-center justify-center">
          <Building className="w-4 h-4 text-emerald-200" />
        </div>
      </div>

      {/* Janela de submenus */}
      {activeSection && (
        <>
          <div
            className="absolute top-0 bottom-0 left-full w-[calc(100vw-5rem)] bg-slate-900/20"
            onClick={() => setOpenSection(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label={activeSection.title}
            className="absolute top-0 bottom-0 left-full w-[calc(100vw-5rem)] max-w-[1400px] bg-white text-slate-800 shadow-2xl overflow-y-auto"
          >
            {/* Aba com o nome do grupo */}
            <div className="sticky top-0 bg-white z-10 border-b-2 border-orange-500 flex items-end justify-between pl-6 pr-3 pt-3">
              <span className="bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-t-xl">
                {activeSection.title}
              </span>
              <button
                type="button"
                onClick={() => setOpenSection(null)}
                className="mb-1.5 p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-8 p-6 lg:p-10">
              {/* Coluna esquerda: título do grupo */}
              <div className="text-center lg:pt-2">
                <div className="mx-auto h-24 w-24 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                  <activeSection.icon className="w-11 h-11 text-orange-500" />
                </div>
                <h2 className="text-2xl font-semibold text-orange-500">{activeSection.title}</h2>
                <p className="mt-4 text-sm text-slate-500 leading-relaxed">{activeSection.subtitle}</p>
              </div>

              {/* Coluna central: passos numerados */}
              <ol className="relative">
                {activeSection.items.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = currentActive === item.id;
                  const isLast = idx === activeSection.items.length - 1;
                  return (
                    <li key={item.id} className="relative flex gap-5 pb-8">
                      {!isLast && <span className="absolute left-7 top-14 bottom-0 w-px bg-slate-200" aria-hidden="true" />}
                      <div className={`relative h-14 w-14 shrink-0 rounded-full border flex items-center justify-center bg-white ${isActive ? 'border-orange-400' : 'border-slate-200'}`}>
                        <Icon className={`w-6 h-6 ${isActive ? 'text-orange-500' : 'text-slate-600'}`} />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2 flex-wrap">
                          {idx + 1}. {item.label}
                          {item.badge && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badgeClass(false)}`}>
                              {item.badge}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelect(item.id)}
                            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-colors cursor-pointer"
                          >
                            {item.action}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          {isActive && (
                            <span className="self-center text-xs font-semibold text-orange-600">Você está aqui</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Coluna direita: dica e atalhos */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                  <div className="flex items-center gap-2 text-orange-600 font-semibold text-sm">
                    <Lightbulb className="w-4 h-4" /> Dica
                  </div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{activeSection.tip}</p>
                </div>

                {activeSection.key === 'portais' && (
                  <button
                    type="button"
                    onClick={() => { setShowShareModal(true); setOpenSection(null); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-semibold text-orange-600 border border-orange-300 hover:bg-orange-50 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" /> Compartilhar Links de Acesso
                  </button>
                )}

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 text-xs text-slate-500">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm truncate">
                    <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{currentTenant.name}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Servidor SSO OK
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Central Share Portals Modal */}
      <SharePortalsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </aside>
  );
};
