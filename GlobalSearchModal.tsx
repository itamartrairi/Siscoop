import React from 'react';
import { useCoop } from '../context/CoopContext';
import { Search, User, DollarSign, Calendar, Shield, X, ArrowRight } from 'lucide-react';

interface Props {
  onNavigate?: (view: string) => void;
  onSelectModule?: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ onNavigate, onSelectModule, isOpen, onClose }) => {
  const { searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, cooperados, transacoesCapital, assembleias, mandatos } = useCoop();

  const showModal = isOpen !== undefined ? isOpen : isSearchOpen;

  if (!showModal) return null;

  const handleClose = () => {
    if (onClose) onClose();
    setIsSearchOpen(false);
  };

  const handleSelect = (view: string) => {
    handleClose();
    if (onNavigate) onNavigate(view);
    if (onSelectModule) onSelectModule(view);
  };

  const query = searchQuery.toLowerCase().trim();

  const matchedCooperados = query ? cooperados.filter(c =>
    c.nome.toLowerCase().includes(query) ||
    c.cpf.includes(query) ||
    c.matricula.toLowerCase().includes(query) ||
    c.cidade.toLowerCase().includes(query) ||
    c.email.toLowerCase().includes(query)
  ) : [];

  const matchedCapital = query ? transacoesCapital.filter(t =>
    t.cooperadoNome.toLowerCase().includes(query) ||
    t.numeroDocumento.toLowerCase().includes(query) ||
    t.tipo.toLowerCase().includes(query)
  ) : [];

  const matchedAssembleias = query ? assembleias.filter(a =>
    a.titulo.toLowerCase().includes(query) ||
    a.local.toLowerCase().includes(query) ||
    a.tipo.toLowerCase().includes(query)
  ) : [];

  const activeMandato = mandatos.find(m => m.status === 'VIGENTE');
  const matchedDiretoria = query && activeMandato ? activeMandato.membros.filter(m =>
    m.cooperadoNome.toLowerCase().includes(query) ||
    m.cargo.toLowerCase().includes(query)
  ) : [];

  return (
    <div className="fixed inset-0 z-50 bg-[#020617]/80 backdrop-blur-md flex items-start justify-center pt-20 px-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400" />
          <input
            type="text"
            autoFocus
            placeholder="Pesquisar por Nome, CPF, Matrícula, Cidade, Documento, Cargo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-white text-base placeholder:text-slate-500"
          />
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="text-center py-8 text-slate-500 text-sm">
              Digite para buscar em Cooperados, Capital Social, Assembleias e Diretoria...
            </div>
          )}

          {query && matchedCooperados.length === 0 && matchedCapital.length === 0 && matchedAssembleias.length === 0 && matchedDiretoria.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhum resultado encontrado para "<span className="font-semibold text-white">{searchQuery}</span>".
            </div>
          )}

          {/* Cooperados Results */}
          {matchedCooperados.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Cooperados ({matchedCooperados.length})
              </div>
              <div className="space-y-1">
                {matchedCooperados.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect('cooperados')}
                    className="p-3 rounded-xl hover:bg-slate-800/60 cursor-pointer flex items-center justify-between group transition-colors border border-transparent hover:border-slate-800"
                  >
                    <div>
                      <div className="font-medium text-slate-200 text-sm flex items-center gap-2">
                        {c.nome}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-mono">
                          {c.matricula}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        CPF: {c.cpf} • {c.cidade}/{c.estado} • {c.categoria}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capital Results */}
          {matchedCapital.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-400" /> Capital Social ({matchedCapital.length})
              </div>
              <div className="space-y-1">
                {matchedCapital.map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleSelect('capital')}
                    className="p-3 rounded-xl hover:bg-slate-800/60 cursor-pointer flex items-center justify-between group transition-colors border border-transparent hover:border-slate-800"
                  >
                    <div>
                      <div className="font-medium text-slate-200 text-sm">
                        {t.tipo} - R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {t.cooperadoNome} ({t.numeroDocumento}) • {t.data}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assembleias Results */}
          {matchedAssembleias.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Assembleias ({matchedAssembleias.length})
              </div>
              <div className="space-y-1">
                {matchedAssembleias.map(a => (
                  <div
                    key={a.id}
                    onClick={() => handleSelect('assembleias')}
                    className="p-3 rounded-xl hover:bg-slate-800/60 cursor-pointer flex items-center justify-between group transition-colors border border-transparent hover:border-slate-800"
                  >
                    <div>
                      <div className="font-medium text-slate-200 text-sm">
                        {a.titulo}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {a.tipo} • {new Date(a.dataHora).toLocaleDateString('pt-BR')} • {a.local}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diretoria Results */}
          {matchedDiretoria.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Diretoria ({matchedDiretoria.length})
              </div>
              <div className="space-y-1">
                {matchedDiretoria.map(d => (
                  <div
                    key={d.id}
                    onClick={() => handleSelect('diretoria')}
                    className="p-3 rounded-xl hover:bg-slate-800/60 cursor-pointer flex items-center justify-between group transition-colors border border-transparent hover:border-slate-800"
                  >
                    <div>
                      <div className="font-medium text-slate-200 text-sm">
                        {d.cooperadoNome} - <span className="text-amber-400">{d.cargo}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Mandato até {new Date(d.dataFimMandato).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center px-4 font-mono">
          <span>Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">ESC</kbd> para fechar</span>
          <span>SisCoope Immersive Search</span>
        </div>
      </div>
    </div>
  );
};
