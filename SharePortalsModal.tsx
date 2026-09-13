import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  QrCode,
  Download,
  UserCircle,
  GraduationCap,
  Smartphone,
  Truck,
  X,
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { abrirLinkExterno, montarLinkWhatsAppGenerico } from '../utils/whatsappHelpers';

export interface PortalShareInfo {
  id: 'portal-cooperado' | 'portal-escola' | 'app-produtor' | 'app-motorista';
  title: string;
  subtitle: string;
  roleTarget: string;
  icon: React.ElementType;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  features: string[];
  paramValue: string;
}

export const PORTALS_LIST: PortalShareInfo[] = [
  {
    id: 'portal-cooperado',
    title: 'Portal do Cooperado',
    subtitle: 'Extrato de Capital, Produção & Recibos',
    roleTarget: 'Cooperados e Associados',
    icon: UserCircle,
    gradient: 'from-emerald-600 to-teal-700',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    description: 'Acesso exclusivo para o cooperado consultar cotas de capital social integralizado, histórico de produção entregue, recibos de pagamento em PDF, convocações de assembleias e informes fiscais.',
    features: [
      'Extrato detalhado de cotas e aportes',
      'Download de recibos oficiais em PDF',
      'Histórico de entregas da agricultura familiar',
      'Cadastro e login individual por e-mail/CPF'
    ],
    paramValue: 'portal-cooperado'
  },
  {
    id: 'portal-escola',
    title: 'Portal da Escola (PNAE)',
    subtitle: 'Gestão de Merenda & Ateste de Entregas',
    roleTarget: 'Diretorias Escolares & Nutricionistas',
    icon: GraduationCap,
    gradient: 'from-blue-600 to-indigo-700',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-800 dark:text-blue-300',
    description: 'Portal para unidades escolares e prefeituras conferirem o cronograma de entregas de alimentos, atestarem digitalmente o recebimento de produtos frescos da cooperativa e gerarem relatórios do PNAE/FNDE.',
    features: [
      'Ateste digital de recebimento de mercadorias',
      'Controle de cardápio e pesagem (kg/un)',
      'Relatórios e histórico de remessas entregues',
      'Registro de nutricionistas responsáveis'
    ],
    paramValue: 'portal-escola'
  },
  {
    id: 'app-produtor',
    title: 'App do Produtor Rural',
    subtitle: 'Lançamento de Colheita & Campo',
    roleTarget: 'Agricultores Familiares',
    icon: Smartphone,
    gradient: 'from-amber-600 to-orange-700',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-800 dark:text-amber-300',
    description: 'Aplicativo simplificado para o agricultor lançar suas colheitas no campo direto do celular, informar previsão de colheita, registrar lotes com DAP/CAF e acompanhar a entrada no galpão.',
    features: [
      'Lançamento rápido de colheita em kg',
      'Vinculação com DAP/CAF e talhão/comunidade',
      'Acompanhamento de status de recebimento',
      'Interface adaptada para smartphones no campo'
    ],
    paramValue: 'app-produtor'
  },
  {
    id: 'app-motorista',
    title: 'App do Motorista & Logística',
    subtitle: 'Romaneios de Carga & Rotas de Entrega',
    roleTarget: 'Motoristas e Transportadores',
    icon: Truck,
    gradient: 'from-purple-600 to-indigo-800',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-800 dark:text-purple-300',
    description: 'Aplicativo de logística para motoristas acompanharem rotas de coleta e distribuição nas escolas, conferirem romaneios de carga, checarem checklists veiculares e coletarem assinaturas no destino.',
    features: [
      'Visualização de romaneio de carga digital',
      'Atualização de status da rota em tempo real',
      'Integração com rotas e pontos de entrega',
      'Checklist de baú e confirmação de entrega'
    ],
    paramValue: 'app-motorista'
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialPortalId?: string;
}

export const SharePortalsModal: React.FC<Props> = ({ isOpen, onClose, initialPortalId }) => {
  const { currentTenant } = useCoop();
  const [selectedPortalId, setSelectedPortalId] = useState<string>(initialPortalId || 'portal-cooperado');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  useEffect(() => {
    if (initialPortalId) {
      setSelectedPortalId(initialPortalId);
    }
  }, [initialPortalId]);

  const activePortal = PORTALS_LIST.find(p => p.id === selectedPortalId) || PORTALS_LIST[0];

  // Build the canonical full URL for the portal
  const getPortalUrl = (portalParam: string) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?portal=${portalParam}`;
  };

  const currentUrl = getPortalUrl(activePortal.paramValue);

  // Generate QR Code for the active portal
  useEffect(() => {
    let isMounted = true;
    if (currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => {
          if (isMounted) setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [currentUrl]);

  const handleCopyLink = async (portal: PortalShareInfo) => {
    const url = getPortalUrl(portal.paramValue);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(portal.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleWhatsAppShare = (portal: PortalShareInfo) => {
    const url = getPortalUrl(portal.paramValue);
    const tenantName = currentTenant?.name || 'SICOOP Cooperativa';
    const message = `🌿 *${portal.title}* - ${tenantName}\n\nOlá! Acesse o portal oficial através do link abaixo:\n\n🔗 ${url}\n\n_${portal.description}_`;
    abrirLinkExterno(montarLinkWhatsAppGenerico(message));
  };

  const handleOpenNewTab = (portal: PortalShareInfo) => {
    const url = getPortalUrl(portal.paramValue);
    abrirLinkExterno(url);
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `qrcode-${activePortal.id}-${currentTenant?.name ? currentTenant.name.toLowerCase().replace(/\s+/g, '-') : 'coop'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Central de Compartilhamento de Portais & Apps
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  Links Públicos
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compartilhe o acesso direto com cooperados, escolas, produtores e motoristas via Link, WhatsApp ou QR Code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Cooperative Identifier Info Banner */}
          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">
                Cooperativa Ativa: <strong className="text-slate-900 dark:text-white font-bold">{currentTenant.name}</strong> • CNPJ: <strong className="font-mono text-slate-900 dark:text-white">{currentTenant.cnpj}</strong>
              </span>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              Acessos protegidos e criptografados
            </span>
          </div>

          {/* Portal Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
            {PORTALS_LIST.map(portal => {
              const Icon = portal.icon;
              const isSelected = selectedPortalId === portal.id;
              return (
                <button
                  key={portal.id}
                  onClick={() => setSelectedPortalId(portal.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${portal.gradient} text-white flex items-center justify-center shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {portal.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {portal.roleTarget}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Portal Detail Box */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-5 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column: header, description, features, link */}
              <div className="lg:col-span-2 space-y-5">
                {/* Header of Active Portal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activePortal.gradient} text-white flex items-center justify-center shadow-md shrink-0`}>
                      <activePortal.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {activePortal.title}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${activePortal.badgeBg} ${activePortal.badgeText}`}>
                          {activePortal.roleTarget}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {activePortal.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Instant Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleWhatsAppShare(activePortal)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Enviar WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleOpenNewTab(activePortal)}
                      className="px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir Portal</span>
                    </button>
                  </div>
                </div>

                {/* Description & Features */}
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activePortal.description}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                  {activePortal.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Link Box with Copy Button */}
                <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Link Direto de Acesso</span>
                    <span className="text-slate-400 font-normal normal-case">Sem necessidade de senha de administrador</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
                      {currentUrl}
                    </div>
                    <button
                      onClick={() => handleCopyLink(activePortal)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                        copiedId === activePortal.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs'
                      }`}
                    >
                      {copiedId === activePortal.id ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right column: QR Code Card */}
              <div className="lg:col-span-1">
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt={`QR Code ${activePortal.title}`}
                      className="w-36 h-36 rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 bg-white shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div className="w-36 h-36 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0"></div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      QR Code para Acesso Rápido
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Imprima ou envie para os usuários escanearem com a câmera do celular.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadQr}
                    disabled={!qrCodeDataUrl}
                    className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar QR Code (PNG)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick All Links Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Resumo de Todos os Links dos Portais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PORTALS_LIST.map(portal => {
                const pUrl = getPortalUrl(portal.paramValue);
                const isCopied = copiedId === portal.id;
                return (
                  <div
                    key={portal.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${portal.gradient} text-white flex items-center justify-center shrink-0`}>
                        <portal.icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {portal.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          ?portal={portal.paramValue}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopyLink(portal)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                        title="Copiar Link"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleWhatsAppShare(portal)}
                        className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl transition-all cursor-pointer"
                        title="Compartilhar no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenNewTab(portal)}
                        className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all cursor-pointer"
                        title="Abrir em nova aba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Dica: Ao acessar qualquer link, o usuário é direcionado diretamente para o portal sem precisar da senha geral do ERP.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
