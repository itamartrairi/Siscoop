import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { ouvirStatusSincronizacao, type StatusSincronizacao } from '../services/firestoreSync';

/** Selo discreto (canto inferior esquerdo) com o estado do salvamento no Firestore. */
export const IndicadorSincronizacao: React.FC = () => {
  const [status, setStatus] = useState<StatusSincronizacao>({ fase: 'desligado' });
  const [aberto, setAberto] = useState(false);

  useEffect(() => ouvirStatusSincronizacao(setStatus), []);

  if (status.fase === 'desligado') return null;

  const erro = status.fase === 'erro';
  const ocupado = status.fase === 'carregando' || status.fase === 'gravando';
  const rotulo = erro
    ? 'Erro ao salvar na nuvem'
    : status.fase === 'carregando'
      ? 'Carregando da nuvem...'
      : status.fase === 'gravando'
        ? `Salvando na nuvem${status.pendentes ? ` (${status.pendentes})` : ''}...`
        : 'Salvo na nuvem';
  const hora = status.ultimaGravacao ? new Date(status.ultimaGravacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="fixed bottom-3 left-3 z-[70] print:hidden">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        title={status.mensagem || rotulo}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm border ${
          erro ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white/90 text-slate-600 border-slate-200'
        }`}
      >
        {erro ? <CloudOff className="w-3.5 h-3.5" /> : ocupado ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5 text-emerald-600" />}
        {rotulo}{!erro && !ocupado && hora ? ` às ${hora}` : ''}
      </button>
      {aberto && status.mensagem && (
        <div className="mt-1 max-w-xs p-2.5 rounded-xl bg-white border border-slate-200 shadow-lg text-[11px] text-slate-700">
          {status.mensagem}
        </div>
      )}
    </div>
  );
};
