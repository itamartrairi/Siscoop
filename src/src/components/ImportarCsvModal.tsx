import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { sanitizeCooperado, isCpfPattern, isRgPattern, isMatriculaPattern, isNamePattern } from '../utils/cooperadoSanitizer';
import { GooglePickerButton } from './GooglePickerButton';
import { fetchGoogleDriveFileBlob, PickedGoogleFile } from '../services/googlePickerService';
import * as XLSX from '@e965/xlsx';
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
  const { importarCooperadosCSV, restaurarCooperadosBaseCompleta } = useCoop();

  const [activeTab, setActiveTab] = useState<'FILE' | 'DRIVE' | 'PASTE'>('FILE');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Function to parse CSV/TSV text into objects
  const parseCsvContent = (text: string) => {
    if (!text || !text.trim()) return [];

    const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    // Detect delimiter: comma, semicolon, or tab
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';

    const rawHeaders = firstLine.split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());

    // Check if first line is a header row by checking header names
    const headerLower = rawHeaders.map(h => h.toLowerCase());
    const isHeaderRow = headerLower.some(h => 
      h.includes('nome') || h.includes('cpf') || h.includes('matr') || h.includes('socio') || h.includes('sócio') || h.includes('rg')
    );

    const startIndex = isHeaderRow ? 1 : 0;
    const result: any[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      const rowObj: Record<string, any> = {};

      if (isHeaderRow) {
        rawHeaders.forEach((header, idx) => {
          const val = cols[idx] !== undefined ? cols[idx] : '';
          rowObj[header] = val;

          const hNorm = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (hNorm.includes('nome') || hNorm.includes('cooperado') || hNorm.includes('socio') || hNorm.includes('produtor')) {
            rowObj['nome'] = val;
          }
          if (hNorm.includes('cpf') || hNorm.includes('cnpj') || hNorm.includes('documento')) {
            rowObj['cpf'] = val;
          }
          if (hNorm.includes('matr') || hNorm.includes('cod') || hNorm.includes('no') || hNorm.includes('num')) {
            rowObj['matricula'] = val;
          }
          if (hNorm.includes('rg') || hNorm.includes('identidade')) {
            rowObj['rg'] = val;
          }
          if (hNorm.includes('dap') || hNorm.includes('caf')) {
            rowObj['dapCaf'] = val;
          }
          if (hNorm.includes('comunidade') || hNorm.includes('localidade') || hNorm.includes('bairro')) {
            rowObj['localidadeComunidade'] = val;
          }
        });
      } else {
        // No header row - use smart column content analysis
        cols.forEach(val => {
          if (isCpfPattern(val) && !rowObj['cpf']) rowObj['cpf'] = val;
          else if (isRgPattern(val) && !rowObj['rg']) rowObj['rg'] = val;
          else if (isMatriculaPattern(val) && !rowObj['matricula']) rowObj['matricula'] = val;
          else if (isNamePattern(val) && !rowObj['nome']) rowObj['nome'] = val;
        });
      }

      // Sanitize and re-align any remaining misplaced fields
      const sanitized = sanitizeCooperado(rowObj);
      result.push(sanitized);
    }

    return result;
  };

  const handleGoogleDriveFilesPicked = async (files: PickedGoogleFile[]) => {
    if (!files || files.length === 0) return;
    const picked = files[0];
    setFileName(picked.name);
    setIsLoadingDrive(true);
    setFeedback(null);

    try {
      const blob = await fetchGoogleDriveFileBlob(picked.id, picked.mimeType);

      // If it's a binary Excel file (.xlsx / .xls) or Google Spreadsheet exported as XLSX
      if (
        picked.mimeType === 'application/vnd.google-apps.spreadsheet' ||
        picked.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        picked.mimeType === 'application/vnd.ms-excel' ||
        picked.name.endsWith('.xlsx') ||
        picked.name.endsWith('.xls')
      ) {
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvGenerated = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });

        const rows = parseCsvContent(csvGenerated);
        if (rows.length === 0) {
          setFeedback({ type: 'error', message: 'Nenhum cooperado válido encontrado na planilha selecionada do Google Drive.' });
        } else {
          setParsedRows(rows);
          setFeedback({
            type: 'success',
            message: `${rows.length} registros extraídos da planilha "${picked.name}" do Google Drive!`
          });
        }
      } else {
        // Plain CSV/TSV text file
        const text = await blob.text();
        const rows = parseCsvContent(text);
        if (rows.length === 0) {
          setFeedback({ type: 'error', message: 'Nenhum cooperado válido encontrado no arquivo do Google Drive.' });
        } else {
          setParsedRows(rows);
          setFeedback({
            type: 'success',
            message: `${rows.length} registros extraídos do arquivo "${picked.name}" do Google Drive!`
          });
        }
      }
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
      const text = evt.target?.result as string;
      if (!text) {
        setFeedback({ type: 'error', message: 'O arquivo está vazio ou ilegível.' });
        return;
      }

      const rows = parseCsvContent(text);
      if (rows.length === 0) {
        setFeedback({ type: 'error', message: 'Nenhuma linha válida de dados foi identificada.' });
      } else {
        setParsedRows(rows);
        setFeedback({
          type: 'success',
          message: `${rows.length} registros identificados no arquivo "${file.name}". Confira a prévia abaixo.`
        });
      }
    };

    reader.onerror = () => {
      setFeedback({ type: 'error', message: 'Falha ao ler o arquivo selecionado.' });
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handlePasteProcess = () => {
    setFeedback(null);
    if (!pastedText.trim()) {
      setFeedback({ type: 'error', message: 'Cole o conteúdo da planilha no campo de texto.' });
      return;
    }

    const rows = parseCsvContent(pastedText);
    if (rows.length === 0) {
      setFeedback({ type: 'error', message: 'Não foi possível extrair colunas do texto colado.' });
    } else {
      setParsedRows(rows);
      setFeedback({
        type: 'success',
        message: `${rows.length} linhas processadas com sucesso do texto colado.`
      });
    }
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) {
      setFeedback({ type: 'error', message: 'Processe um arquivo CSV/Excel antes de confirmar a importação.' });
      return;
    }

    const res = importarCooperadosCSV(parsedRows);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => {
        onClose();
        setParsedRows([]);
        setPastedText('');
        setFileName('');
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleDownloadTemplate = () => {
    const csvHeader = 'Matrícula;Nome Completo;CPF;RG;Comunidade/Localidade;DAP/CAF;Telefone;Cidade;Estado;Capital Integralizado (R$)\n';
    const sampleRows = [
      'IMP-001;JOAO DA SILVA ALVES;123.456.789-00;1234567 SSP-CE;SEDE;SIM;(85) 99888-1111;Trairi;CE;1000',
      'IMP-002;MARIA DAS GRACAS MENEZES;987.654.321-11;7654321 SSP-CE;GUAIRAS;SIM;(85) 99777-2222;Trairi;CE;1500',
      'IMP-003;ANTONIO PEREIRA LIMA;456.789.123-22;9876543 SSP-CE;CANAAN;SIM;(85) 99666-3333;Trairi;CE;1000'
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Modelo_Importacao_Cooperados_SisCoope.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              <h3 className="text-lg font-black text-white">Importar Cooperados da Planilha CSV / Excel</h3>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('FILE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'FILE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Upload className="w-4 h-4" /> Arquivo Local (.CSV / .TSV)
              </button>

              <button
                onClick={() => setActiveTab('DRIVE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'DRIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Cloud className="w-4 h-4 text-emerald-400" /> Google Drive (Picker)
              </button>

              <button
                onClick={() => setActiveTab('PASTE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'PASTE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" /> Copiar & Colar
              </button>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Modelo CSV
            </button>
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
                accept=".csv,.tsv,.txt"
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
                    {fileName ? `Arquivo selecionado: ${fileName}` : 'Clique para selecionar seu arquivo CSV / Excel'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Suporta arquivos delimitados por vírgula (,), ponto e vírgula (;) ou Tab.
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
                placeholder="Cole aqui as linhas copiadas da planilha... Exemplo:&#10;Matrícula&#9;Nome Completo&#9;CPF&#10;IMP-001&#9;JOAO DA SILVA&#9;123.456.789-00"
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
                      <th className="p-2.5">DAP/CAF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono">{row.matricula || row.Matricula || `IMP-${i+1}`}</td>
                        <td className="p-2.5 font-semibold">{row.nome || row.nomeCompleto || row['Nome Completo'] || row['Nome'] || 'N/I'}</td>
                        <td className="p-2.5 font-mono">{row.cpf || row.CPF || '000.000.000-00'}</td>
                        <td className="p-2.5">{row.comunidade || row.localidadeComunidade || row['Comunidade'] || 'SEDE'}</td>
                        <td className="p-2.5">{row.dapCaf || row['DAP/CAF'] || row['DAP'] || 'SIM'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Option to restore full 1,718 base */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50">
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                Anular exclusões e restaurar base oficial Trairi?
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Restaura instantaneamente todos os 1.718 cooperados oficiais importados da planilha.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                restaurarCooperadosBaseCompleta();
                setFeedback({
                  type: 'success',
                  message: 'Base oficial de 1.718 cooperados do Trairi restaurada e sincronizada!'
                });
                setTimeout(() => onClose(), 1500);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0"
            >
              Restaurar Base (1.718 Cooperados)
            </button>
          </div>
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
