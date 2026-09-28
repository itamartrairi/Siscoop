import React, { useRef, useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';

/**
 * Aba "Proposta de compra" do Portal da Escola.
 *
 * O PDF é enviado para uma pasta do Google Drive da cooperativa através de um
 * Google Apps Script publicado como aplicativo da Web (ver
 * apps-script/PropostasCompraDrive.gs). A URL desse aplicativo vem da variável
 * de ambiente VITE_PROPOSTAS_DRIVE_URL, configurada no Netlify.
 */

const URL_DRIVE: string = ((import.meta as any).env?.VITE_PROPOSTAS_DRIVE_URL || '').trim();
const TAMANHO_MAX_MB = 20;

interface EscolaInfo {
  id: string;
  nomeEscola: string;
  email?: string;
}

interface PropostaEnviada {
  nome: string;
  titulo: string;
  enviadoEm: string;
}

const chaveHistorico = (escola: EscolaInfo) =>
  `siscoop:propostas-enviadas:${(escola.email || escola.id).toLowerCase()}`;

function lerHistorico(escola: EscolaInfo): PropostaEnviada[] {
  try {
    const raw = localStorage.getItem(chaveHistorico(escola));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function salvarHistorico(escola: EscolaInfo, lista: PropostaEnviada[]) {
  try {
    localStorage.setItem(chaveHistorico(escola), JSON.stringify(lista.slice(0, 50)));
  } catch {
    // sem localStorage: o histórico fica só nesta sessão
  }
}

function lerComoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(',')[1] || '');
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}

async function enviarParaDrive(dados: {
  arquivo: File;
  titulo: string;
  observacao: string;
  escola: EscolaInfo;
}): Promise<{ nome: string }> {
  const arquivoBase64 = await lerComoBase64(dados.arquivo);
  // text/plain evita a requisição de pré-verificação (CORS) que o Apps Script não responde.
  const resposta = await fetch(URL_DRIVE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      arquivoBase64,
      nomeArquivo: dados.arquivo.name,
      titulo: dados.titulo,
      observacao: dados.observacao,
      escolaId: dados.escola.id,
      escolaNome: dados.escola.nomeEscola,
      escolaEmail: dados.escola.email || '',
    }),
  });
  let json: any = null;
  try {
    json = await resposta.json();
  } catch {
    throw new Error('Resposta inesperada do Google Drive. Verifique a publicação do Apps Script.');
  }
  if (!json?.ok) throw new Error(json?.erro || 'O Google Drive recusou o envio.');
  return { nome: json.nome || dados.arquivo.name };
}

export const PropostaCompraEscola: React.FC<{ escola: EscolaInfo }> = ({ escola }) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [historico, setHistorico] = useState<PropostaEnviada[]>(() => lerHistorico(escola));
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionarArquivo = (f: File | undefined | null) => {
    setMensagem(null);
    if (!f) return;
    const ehPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!ehPdf) {
      setMensagem({ tipo: 'erro', texto: 'Envie apenas arquivos em PDF.' });
      return;
    }
    if (f.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setMensagem({ tipo: 'erro', texto: `O arquivo passa de ${TAMANHO_MAX_MB} MB. Reduza o tamanho do PDF e tente de novo.` });
      return;
    }
    setArquivo(f);
    if (!titulo) setTitulo(f.name.replace(/\.pdf$/i, ''));
  };

  const limpar = () => {
    setArquivo(null);
    setTitulo('');
    setObservacao('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o PDF da proposta de compra.' });
      return;
    }
    setEnviando(true);
    setMensagem(null);
    try {
      const r = await enviarParaDrive({ arquivo, titulo: titulo.trim(), observacao: observacao.trim(), escola });
      const novo: PropostaEnviada = { nome: r.nome, titulo: titulo.trim() || arquivo.name, enviadoEm: new Date().toISOString() };
      const lista = [novo, ...historico];
      setHistorico(lista);
      salvarHistorico(escola, lista);
      setMensagem({ tipo: 'ok', texto: 'Proposta enviada para a cooperativa com sucesso.' });
      limpar();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err?.message || 'Falha ao enviar a proposta. Tente novamente.' });
    } finally {
      setEnviando(false);
    }
  };

  const campo =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-500';

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-5">
      <div>
        <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-600" /> Proposta de compra
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Envie o PDF da proposta de compra da escola. O arquivo vai direto para a pasta da cooperativa no Google Drive.
        </p>
      </div>

      {!URL_DRIVE ? (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          O envio de propostas ainda não foi configurado pela cooperativa. Entre em contato com a cooperativa.
        </div>
      ) : (
        <form onSubmit={handleEnviar} className="space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              selecionarArquivo(e.dataTransfer.files?.[0]);
            }}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-violet-400 p-6 text-center transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={e => selecionarArquivo(e.target.files?.[0])}
            />
            {arquivo ? (
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <FileText className="w-5 h-5 text-violet-600" />
                <span className="truncate max-w-[16rem]">{arquivo.name}</span>
                <span className="text-xs font-normal text-slate-500">({(arquivo.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    limpar();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Remover arquivo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-7 h-7 mx-auto text-violet-500" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Clique ou arraste o PDF aqui</p>
                <p className="text-xs text-slate-500">Somente PDF, até {TAMANHO_MAX_MB} MB</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Título</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Proposta de compra - 1º semestre"
                className={campo}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Observação (opcional)</label>
              <input
                type="text"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Informações para a cooperativa"
                className={campo}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando || !arquivo}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black flex items-center justify-center gap-2 transition-colors"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {enviando ? 'Enviando...' : 'Enviar proposta'}
          </button>
        </form>
      )}

      {mensagem && (
        <div
          className={`p-3 rounded-xl text-xs flex gap-2 ${
            mensagem.tipo === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {mensagem.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {historico.length > 0 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Enviadas por este dispositivo</h4>
          <ul className="space-y-2">
            {historico.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <span className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate text-slate-700 dark:text-slate-200">{p.titulo}</span>
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {new Date(p.enviadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PropostaCompraEscola;
