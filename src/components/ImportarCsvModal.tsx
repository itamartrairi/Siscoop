import { NavegacaoSecoes } from './ui/NavegacaoSecoes';
import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { GooglePickerButton } from './GooglePickerButton';
import { fetchGoogleDriveFileBlob, PickedGoogleFile } from '../services/googlePickerService';
import { lerPlanilhaCooperados, baixarPlanilhaTB01, pareceTB01, COLUNAS_TB01, type LinhaImportada } from '../services/planilhaTB01';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  FileText,
  Sparkles,
  ArrowRight,
  Cloud,
  Loader2
} from 'lucide-react';

interface ImportarCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportarCsvModal: React.FC<ImportarCsvModalProps> = ({ isOpen, onClose }) => {
  const { importarCooperadosCSV, cooperados, currentTenant } = useCoop();

  const [activeTab, setActiveTab] = useState<'FILE' | 'DRIVE' | 'PASTE' | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<LinhaImportada[]>([]);
  const [colunasIgnoradas, setColunasIgnoradas] = useState<string[]>([]);
  const [linhasIgnoradas, setLinhasIgnoradas] = useState<string[]>([]);
  const [limparVazios, setLimparVazios] = useState(true);
  const [fileName, setFileName] = useState('');
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  /** Lê a planilha (arquivo ou texto colado) no layout TB-01 e mostra a prévia. */
  const processar = (dados: ArrayBuffer | string, origem: string) => {
    setFeedback(null);
    setLinhasIgnoradas([]);
    try {
      const { linhas, colunasReconhecidas, colunasIgnoradas: ignoradas } = lerPlanilhaCooperados(dados);
      if (!pareceTB01(colunasReconhecidas) || linhas.length === 0) {
        setParsedRows([]);
        setColunasIgnoradas([]);
        setFeedback({
          type: 'error',
          message: 'Não reconheci o layout da planilha. A primeira linha precisa ter os cabeçalhos do modelo TB-01 (baixe o modelo para conferir).',
        });
        return;
      }
      setParsedRows(linhas);
      setColunasIgnoradas(ignoradas);
      setFeedback({
        type: 'success',
        message: `${linhas.length} sócio(s) lidos de ${origem}, com ${colunasReconhecidas.length} coluna(s) reconhecida(s). Confira a prévia abaixo.`,
      });
    } catch (err: any) {
      console.error('Erro ao ler planilha de cooperados:', err);
      setParsedRows([]);
      setFeedback({ type: 'error', message: `Não foi possível ler a planilha: ${err?.message || 'arquivo inválido'}` });
    }
  };

  const handleGoogleDriveFilesPicked = async (files: PickedGoogleFile[]) => {
    if (!files || files.length === 0) return;
    const picked = files[0];
    setFileName(picked.name);
    setIsLoadingDrive(true);
    setFeedback(null);
    try {
      const blob = await fetchGoogleDriveFileBlob(picked.id, picked.mimeType);
      processar(await blob.arrayBuffer(), `"${picked.name}" do Google Drive`);
    } catch (err: any) {
      console.error('Erro ao ler arquivo do Google Drive:', err);
      setFeedback({ type: 'error', message: `Erro ao acessar o Google Drive: ${err?.message || 'Falha na conexão'}` });
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result;
      if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
        setFeedback({ type: 'error', message: 'O arquivo está vazio ou ilegível.' });
        return;
      }
      processar(buffer, `"${file.name}"`);
    };
    reader.onerror = () => setFeedback({ type: 'error', message: 'Falha ao ler o arquivo selecionado.' });
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handlePasteProcess = () => {
    if (!pastedText.trim()) {
      setFeedback({ type: 'error', message: 'Cole o conteúdo da planilha no campo de texto, incluindo a linha de cabeçalhos.' });
      return;
    }
    processar(pastedText, 'texto colado');
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) {
      setFeedback({ type: 'error', message: 'Processe uma planilha antes de confirmar a importação.' });
      return;
    }
    const res = importarCooperadosCSV(parsedRows, { limparVazios });
    setLinhasIgnoradas(res.ignorados);
    setFeedback({ type: res.success ? 'success' : 'error', message: res.message });
    if (res.success) {
      setParsedRows([]);
      setPastedText('');
      setFileName('');
      if (res.ignorados.length === 0) setTimeout(() => { setFeedback(null); onClose(); }, 1800);
    }
  };

  const nomeArquivoExportacao = () => {
    const data = new Date().toISOString().slice(0, 10);
    const coop = (currentTenant?.name || 'cooperativa').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-');
    return `TB-01-Cadastro-do-socio-${coop}-${data}.xlsx`;
  };

  const cooperadosDaCoop = (cooperados || [])
    .filter(c => !c.tenantId || c.tenantId === currentTenant?.id)
    .sort((a, b) => (Number(a.matricula) || 0) - (Number(b.matricula) || 0) || String(a.matricula).localeCompare(String(b.matricula)));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Importar Cooperados — Planilha TB-01 (Cadastro do sócio)</h3>
              <p className="text-xs text-slate-400">
                Sincronize cadastros com vinculação direta aos módulos Produtor, Assembleia, Diretoria e Relatórios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <div className="w-full">
              <NavegacaoSecoes selecionada={activeTab !== null} voltar={() => setActiveTab(null)} secoes={[
                  { titulo: "Arquivo do computador (.xlsx / .csv)", descricao: "Selecione a planilha salva no computador.", icone: Upload, abrir: () => setActiveTab('FILE') },
                  { titulo: "Google Drive", descricao: "Escolha um arquivo do seu Drive.", icone: Cloud, abrir: () => setActiveTab('DRIVE') },
                  { titulo: "Copiar & Colar", descricao: "Cole as linhas da planilha no formulário.", icone: FileText, abrir: () => setActiveTab('PASTE') }
              ]} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => baixarPlanilhaTB01([], 'TB-01-Cadastro-do-socio-modelo.xlsx')}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Planilha em branco com as ${COLUNAS_TB01.length} colunas do cadastro do sócio`}
              >
                <Download className="w-3.5 h-3.5" /> Baixar modelo TB-01 (em branco)
              </button>
              <button
                type="button"
                onClick={() => baixarPlanilhaTB01(cooperadosDaCoop, nomeArquivoExportacao())}
                disabled={cooperadosDaCoop.length === 0}
                className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Baixa o cadastro atual no layout TB-01, para conferir, editar e importar de volta"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar cadastro atual ({cooperadosDaCoop.length})
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Tab Content FILE */}
          {activeTab === 'FILE' && (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-3xl p-8 text-center transition-colors bg-slate-50/50 dark:bg-slate-850">
              <input
                type="file"
                accept=".xlsx,.xls,.ods,.csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {fileName ? `Arquivo selecionado: ${fileName}` : 'Clique para selecionar a planilha TB-01 (Excel ou CSV)'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Aceita .xlsx, .xls, .ods e .csv. A primeira linha deve ter os cabeçalhos do modelo TB-01.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Tab Content GOOGLE DRIVE PICKER */}
          {activeTab === 'DRIVE' && (
            <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800/60 rounded-3xl p-8 text-center bg-emerald-50/30 dark:bg-emerald-950/20 space-y-4">
              <div className="w-14 h-14 mx-auto bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <Cloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Selecionar Planilha do Google Drive com Google Picker
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Abra sua conta Google Drive diretamente pelo Google Picker oficial para importar planilhas Google Sheets ou arquivos .csv/.xlsx.
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <GooglePickerButton
                  onFilesSelected={handleGoogleDriveFilesPicked}
                  viewType="SPREADSHEETS"
                  buttonText="Abrir Google Drive Picker"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                />
              </div>

              {isLoadingDrive && (
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold pt-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando arquivo do Google Drive...
                </div>
              )}
            </div>
          )}

          {/* Tab Content PASTE */}
          {activeTab === 'PASTE' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Cole o texto copiado de uma planilha Excel ou Google Sheets:
              </label>
              <textarea
                rows={6}
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Copie da planilha TB-01 a linha de cabeçalhos e as linhas dos sócios, e cole aqui."
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handlePasteProcess}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Processar Texto Colado
              </button>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" /> Prévia das primeiras 5 linhas ({parsedRows.length} total):
                </h4>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">Matrícula</th>
                      <th className="p-2.5">Nome</th>
                      <th className="p-2.5">CPF</th>
                      <th className="p-2.5">Comunidade</th>
                      <th className="p-2.5">Admissão</th>
                      <th className="p-2.5">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono">{row.matricula || '—'}</td>
                        <td className="p-2.5 font-semibold">{row.nome || '—'}</td>
                        <td className="p-2.5 font-mono">{row.cpf || '—'}</td>
                        <td className="p-2.5">{row.localidadeComunidade || '—'}</td>
                        <td className="p-2.5 font-mono">{row.dataFiliacao ? row.dataFiliacao.split('-').reverse().join('/') : '—'}</td>
                        <td className="p-2.5">{row.situacao || 'ATIVO'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {colunasIgnoradas.length > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Colunas não reconhecidas (serão ignoradas): {colunasIgnoradas.join(', ')}
                </p>
              )}
              <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={limparVazios} onChange={e => setLimparVazios(e.target.checked)} />
                <span>
                  <strong>A planilha manda:</strong> célula vazia apaga o dado que estiver no sistema.
                  Desmarque para manter o que já existe no sistema quando a célula estiver vazia.
                </span>
              </label>
            </div>
          )}

          {linhasIgnoradas.length > 0 && (
            <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 space-y-1">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                {linhasIgnoradas.length} linha(s) não importada(s):
              </p>
              <ul className="text-[11px] text-amber-800 dark:text-amber-400 max-h-40 overflow-y-auto list-disc pl-4">
                {linhasIgnoradas.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              parsedRows.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Confirmar Importação de {parsedRows.length} Registros <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
