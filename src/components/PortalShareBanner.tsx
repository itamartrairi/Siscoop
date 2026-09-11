import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { SharePortalsModal, PORTALS_LIST, PortalShareInfo } from './SharePortalsModal';

interface Props {
  portalId: 'portal-cooperado' | 'portal-escola' | 'app-produtor' | 'app-motorista';
  customTitle?: string;
  customSubtitle?: string;
}

export const PortalShareBanner: React.FC<Props> = ({
  portalId,
  customTitle,
  customSubtitle
}) => {
  const { currentTenant } = useCoop();
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const portalInfo: PortalShareInfo = PORTALS_LIST.find(p => p.id === portalId) || PORTALS_LIST[0];

  const getPortalUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?portal=${portalInfo.paramValue}`;
  };

  const currentUrl = getPortalUrl();

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  const handleWhatsApp = () => {
    const tenantName = currentTenant?.name || 'SICOOP Cooperativa';
    const message = `🌿 *${portalInfo.title}* - ${tenantName}\n\nOlá! Acesse o portal oficial diretamente pelo link:\n\n🔗 ${currentUrl}\n\n_${portalInfo.description}_`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    // Cria e clica um <a real> em vez de window.open(), que costuma ser
    // bloqueado silenciosamente em navegadores e ambientes de preview
    // (iframes sandbox) quando chamado a partir do onClick de um botão.
    try {
      const a = document.createElement('a');
      a.href = whatsappUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Falha ao abrir WhatsApp', e);
      window.location.href = whatsappUrl;
    }
  };

  return (
    <>
      <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-500/30 relative overflow-hidden mb-6">
        {/* Ambient Glows */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5">
                <Share2 className="w-3 h-3" />
                Link de Compartilhamento & Acesso Público
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                Público: <strong className="text-white">{portalInfo.roleTarget}</strong>
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              {customTitle || `Link Oficial: ${portalInfo.title}`}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {customSubtitle || `Compartilhe este link para que o usuário acesse diretamente seu portal sem necessitar da senha administrativa do ERP.`}
            </p>
          </div>

          {/* Link bar + actions — always full width, so nada é cortado */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
            <div className="flex-1 min-w-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3.5 py-2 text-xs font-mono text-emerald-200 truncate select-all flex items-center justify-between gap-2">
              <span className="truncate">{currentUrl}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isCopied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
                title="Copiar Link para Área de Transferência"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                title="Enviar por WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all cursor-pointer"
                title="Ver QR Code e Todos os Links"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SharePortalsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPortalId={portalId}
      />
    </>
  );
};
