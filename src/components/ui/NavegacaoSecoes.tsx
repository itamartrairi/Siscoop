import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Secao = { titulo: React.ReactNode; descricao: string; icone: React.ElementType; abrir: () => void };

export function NavegacaoSecoes({ selecionada, voltar, secoes }: {
  selecionada: boolean;
  voltar: () => void;
  secoes: readonly Secao[];
}) {
  if (selecionada) return <VoltarSecoes voltar={voltar} />;

  return (
    <ol aria-label="Seções disponíveis" className="rounded-2xl border border-slate-200 border-t-2 border-t-orange-500 bg-white p-6 dark:border-slate-700 dark:border-t-orange-500 dark:bg-slate-900">
      {secoes.map(({ titulo, descricao, icone: Icone, abrir }, index) => (
        <li key={index} className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-4 pb-7 last:pb-0 before:absolute before:bottom-0 before:left-6 before:top-12 before:w-px before:bg-slate-200 last:before:hidden dark:before:bg-slate-700">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Icone className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{index + 1}. {titulo}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{descricao}</p>
            <button type="button" onClick={abrir} aria-label={`Abrir seção ${index + 1}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-800">Abrir <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function VoltarSecoes({ voltar, rotulo = 'Voltar às opções' }: { voltar: () => void; rotulo?: string }) {
  const origem = useRef<HTMLSpanElement>(null);
  const [destino, setDestino] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    // Procura a faixa fixa da tela atual. Janelas sem essa faixa mantêm o retorno no próprio formulário.
    const pai = origem.current?.parentElement;
    const faixa = Array.from(pai?.children ?? []).find(el => el.matches('.sticky.top-0.z-20'));
    const titulo = faixa?.querySelector('h1, h2, h3');
    if (!faixa || !titulo) return;

    const linha = titulo.parentElement?.closest('.flex');
    const linhaDoCabecalho = linha && faixa.contains(linha) ? linha : null;
    const suporte = document.createElement('div');
    suporte.className = linhaDoCabecalho
      ? 'ml-auto flex max-w-full shrink-0 justify-end self-end'
      : 'mt-1 flex justify-end';
    (linhaDoCabecalho ?? faixa).appendChild(suporte);
    setDestino(suporte);
    return () => suporte.remove();
  }, []);

  const botao = (
    <button type="button" onClick={voltar} className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100 focus-visible:outline-2 focus-visible:outline-orange-700">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {rotulo}
    </button>
  );

  return (
    <>
      <span ref={origem} hidden />
      {destino ? createPortal(botao, destino) : <div className="flex justify-end">{botao}</div>}
    </>
  );
}
