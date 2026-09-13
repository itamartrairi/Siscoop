import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  QrCode,
  Users,
  ChevronDown,
  ChevronUp,
  Send,
  AlertTriangle
} from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { SharePortalsModal, PORTALS_LIST, PortalShareInfo } from './SharePortalsModal';
import { abrirLinkExterno, getTelefoneContato, montarLinkWhatsApp, montarLinkWhatsAppGenerico } from '../utils/whatsappHelpers';

export interface DestinatarioPortal {
  id: string;
  nome: string;
  whatsapp?: string;
  celular?: string;
  telefone?: string;
}

interface Props {
  portalId: 'portal-cooperado' | 'portal-escola' | 'app-produtor' | 'app-motorista';
  customTitle?: string;
  customSubtitle?: string;
  // Lista de pessoas (produtores, cooperados, escolas, motoristas) que podem
  // receber o link do portal diretamente no WhatsApp cadastrado de cada um.
  // Quando informada, o banner mostra um seletor para escolher um ou vários
  // destinatários e disparar o envio individualmente para cada número.
  recipients?: DestinatarioPortal[];
  recipientLabel?: string; // ex.: "motoristas", "produtores", "escolas", "cooperados"
}

export const PortalShareBanner: React.FC<Props> = ({
  portalId,
  customTitle,
  customSubtitle,
  recipients = [],
  recipientLabel = 'destinatários'
}) => {
  const { currentTenant } = useCoop();
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);

  const portalInfo: PortalShareInfo = PORTALS_LIST.find(p => p.id === portalId) || PORTALS_LIST[0];

  const getPortalUrl = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?portal=${portalInfo.paramValue}`;
  };

  const currentUrl = getPortalUrl();

  // Cada destinatário com o telefone já resolvido (whatsapp > celular > telefone).
  const destinatariosComTelefone = recipients.map(r => ({ ...r, telefoneResolvido: getTelefoneContato(r) }));
  const comTelefoneCount = destinatariosComTelefone.filter(r => r.telefoneResolvido).length;

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selecionarTodosComTelefone = () => {
    setSelectedIds(destinatariosComTelefone.filter(r => r.telefoneResolvido).map(r => r.id));
  };

  const limparSelecao = () => setSelectedIds([]);

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

  // Envio para os destinatários selecionados: cada um recebe a mensagem no
  // PRÓPRIO número de WhatsApp cadastrado (não um número genérico), com
  // abertura escalonada para não ser bloqueada pelo navegador.
  const handleEnviarSelecionados = () => {
    const tenantName = currentTenant?.name || 'SICOOP Cooperativa';
    const selecionados = destinatariosComTelefone.filter(r => selectedIds.includes(r.id));
    const comTelefone = selecionados.filter(r => r.telefoneResolvido);
    const semTelefone = selecionados.filter(r => !r.telefoneResolvido);

    comTelefone.forEach((r, idx) => {
      const message = `🌿 *${portalInfo.title}* - ${tenantName}\n\nOlá, *${r.nome}*! Acesse o portal oficial diretamente pelo link abaixo:\n\n🔗 ${currentUrl}\n\n_${portalInfo.description}_`;
      setTimeout(() => {
        abrirLinkExterno(montarLinkWhatsApp(r.telefoneResolvido, message));
      }, idx * 700);
    });

    if (semTelefone.length > 0) {
      setSentFeedback(`Enviado para ${comTelefone.length} de ${selecionados.length}. Sem telefone cadastrado: ${semTelefone.map(r => r.nome).join(', ')}.`);
    } else {
      setSentFeedback(`Envio iniciado para ${comTelefone.length} ${comTelefone.length === 1 ? 'destinatário' : 'destinatários'}.`);
    }
    setTimeout(() => setSentFeedback(null), 6000);
  };

  // Envio genérico (sem destinatário específico) — usado quando não há
  // lista de destinatários disponível para este portal.
  const handleWhatsAppGenerico = () => {
    const tenantName = currentTenant?.name || 'SICOOP Cooperativa';
    const message = `🌿 *${portalInfo.title}* - ${tenantName}\n\nOlá! Acesse o portal oficial diretamente pelo link:\n\n🔗 ${currentUrl}\n\n_${portalInfo.description}_`;
    abrirLinkExterno(montarLinkWhatsAppGenerico(message));
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

              {recipients.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowPicker(v => !v)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title={`Selecionar ${recipientLabel} e enviar por WhatsApp`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar WhatsApp</span>
                  {showPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleWhatsAppGenerico}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                  title="Enviar por WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}

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

          {/* Seletor de destinatários — envia para o WhatsApp cadastrado de */}
          {/* cada pessoa selecionada, individualmente, um ou vários por vez. */}
          {recipients.length > 0 && showPicker && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Users className="w-4 h-4 text-emerald-300" />
                  <span>Selecione {recipientLabel} para enviar ao WhatsApp de cada um ({comTelefoneCount} com telefone cadastrado)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selecionarTodosComTelefone}
                    className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200 underline cursor-pointer"
                  >
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    onClick={limparSelecao}
                    className="text-[11px] font-bold text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {destinatariosComTelefone.length === 0 ? (
                  <p className="text-xs text-slate-300">Nenhum cadastro encontrado.</p>
                ) : (
                  destinatariosComTelefone.map(r => {
                    const checked = selectedIds.includes(r.id);
                    const semTelefone = !r.telefoneResolvido;
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          semTelefone
                            ? 'bg-white/5 text-slate-400 cursor-not-allowed'
                            : checked
                              ? 'bg-emerald-500/20 border border-emerald-400/50 text-white'
                              : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={semTelefone}
                            onChange={() => toggleSelected(r.id)}
                            className="accent-emerald-500 shrink-0"
                          />
                          <span className="truncate font-semibold">{r.nome}</span>
                        </span>
                        <span className="font-mono text-[11px] shrink-0 flex items-center gap-1">
                          {semTelefone && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                          {r.telefoneResolvido || 'Sem telefone'}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                {sentFeedback && (
                  <span className="text-[11px] text-emerald-300 font-semibold">{sentFeedback}</span>
                )}
                <button
                  type="button"
                  onClick={handleEnviarSelecionados}
                  disabled={selectedIds.length === 0}
                  className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar aos selecionados ({selectedIds.length})</span>
                </button>
              </div>
            </div>
          )}
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
