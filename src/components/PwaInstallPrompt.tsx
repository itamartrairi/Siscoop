import React, { useState, useEffect } from 'react';
import { Download, Monitor, CheckCircle, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Verifica se já está rodando como PWA standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled || isDismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        setShowInstructions(true);
      }
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <>
      {/* Banner flutuante no canto inferior direito */}
      <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-900/95 border border-emerald-500/50 backdrop-blur-md rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3">
          <img 
            src="/cooperativismo.png" 
            alt="Símbolo Cooperativismo" 
            className="w-12 h-12 rounded-full border-2 border-amber-400 p-0.5 bg-slate-950 shrink-0 shadow-md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <span>Instalar Siscoop</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-normal">App</span>
              </h4>
              <button 
                onClick={() => setIsDismissed(true)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Instale o aplicativo na sua <strong>Área de Trabalho</strong> com o símbolo do cooperativismo para acesso rápido.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-lg transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar na Área de Trabalho</span>
              </button>

              <button
                onClick={() => setShowInstructions(true)}
                className="p-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 rounded-xl hover:bg-slate-800 transition-colors"
                title="Como instalar no Chrome ou Edge"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal com Instruções Detalhadas se necessário */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <img src="/cooperativismo.png" alt="Cooperativismo" className="w-8 h-8 rounded-full border border-amber-400" />
                <h3 className="font-bold text-base text-slate-100">Como instalar na sua máquina</h3>
              </div>
              <button onClick={() => setShowInstructions(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <p>
                O Siscoop é um aplicativo web progressivo (PWA). Você pode fixá-lo na sua Área de Trabalho com 2 cliques:
              </p>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>No Google Chrome ou Edge:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                  <li>Olhe na barra de endereço (onde fica o link).</li>
                  <li>Clique no ícone de <strong>computador com uma seta</strong> ou no botão <strong>"Instalar Siscoop"</strong>.</li>
                  <li>Clique em <strong>"Instalar"</strong>.</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Pelo menu do navegador (alternativa):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                  <li>Clique nos <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome.</li>
                  <li>Vá em <strong>Salvar e compartilhar</strong> (ou Mais ferramentas).</li>
                  <li>Clique em <strong>Instalar SICOOP PLATFORM...</strong></li>
                </ol>
              </div>

              <p className="text-[11px] text-slate-400">
                O atalho oficial com o símbolo do cooperativismo será colocado automaticamente na sua Área de Trabalho e no Menu Iniciar.
              </p>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs rounded-xl text-white transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
