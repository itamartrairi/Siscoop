import React, { useState, useMemo } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Copy,
  Check,
  Building2,
  Calendar,
  Layers,
  FileCode,
  HelpCircle,
  ExternalLink,
  Receipt,
  X,
  FileCheck2,
  AlertCircle,
  Database,
  Filter
} from 'lucide-react';
import {
  gerarLayoutFortesContabilTXT,
  gerarSpedEcdContabil,
  gerarPlanoContasFortesTXT,
  gerarLayoutFortesFiscalTXT,
  gerarSpedFiscalEfd,
  gerarLoteXmlFortesFiscal,
  gerarLayoutFortesFinanceiroTXT,
  downloadArquivoFortes,
  filtrarLancamentosPorPeriodo,
  filtrarNotasPorPeriodo,
  FortesExportFilterOptions
} from '../services/fortesExportService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'contabil' | 'fiscal' | 'financeiro' | 'ajuda';
}

export const FortesExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTab = 'contabil'
}) => {
  const {
    lancamentosContabeis,
    planoContas,
    notasFiscais,
    contasPagarReceber,
    currentTenant
  } = useCoop();

  const [activeTab, setActiveTab] = useState<'contabil' | 'fiscal' | 'financeiro' | 'ajuda'>(initialTab);

  // Filtros
  const [competencia, setCompetencia] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${m}/${d.getFullYear()}`;
  });
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [separadorDecimal, setSeparadorDecimal] = useState<',' | '.'>(',');
  const [modeloNota, setModeloNota] = useState<'TODOS' | 'NFE_55' | 'NFCE_65'>('TODOS');
  const [apenasAutorizadas, setApenasAutorizadas] = useState(true);

  // Copiado feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filterOptions: FortesExportFilterOptions = useMemo(() => ({
    competenciaMesAno: competencia || undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    separadorDecimal,
    modeloNota,
    apenasAutorizadas
  }), [competencia, dataInicio, dataFim, separadorDecimal, modeloNota, apenasAutorizadas]);

  const lancamentosFiltrados = useMemo(() => {
    return filtrarLancamentosPorPeriodo(lancamentosContabeis, filterOptions);
  }, [lancamentosContabeis, filterOptions]);

  const notasFiltradas = useMemo(() => {
    return filtrarNotasPorPeriodo(notasFiscais, filterOptions);
  }, [notasFiscais, filterOptions]);

  const handleCopiar = (texto: string, key: string) => {
    navigator.clipboard.writeText(texto);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  if (!isOpen) return null;

  const cnpjFormatado = currentTenant?.cnpj || 'Não cadastrado';
  const razaoSocial = currentTenant?.razaoSocial || currentTenant?.name || 'Cooperativa';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header com Branding Fortes Tecnologia */}
        <div className="p-5 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Exportador Fortes Tecnologia</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
                  Total Contador
                </span>
              </div>
              <p className="text-xs text-orange-100">
                Geração de arquivos contábeis, fiscais e SPED compatíveis com o ecossistema Fortes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.fortestecnologia.com.br/gestao-contabil/sistema-total-contador/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/20"
            >
              Portal Fortes <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-black/10 hover:bg-black/20 text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros Globais */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
              <Calendar className="w-4 h-4 text-orange-500" /> Competência:
              <input
                type="text"
                value={competencia}
                onChange={e => setCompetencia(e.target.value)}
                placeholder="MM/AAAA"
                className="w-24 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 outline-none text-center"
              />
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span>Ou Datas:</span>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none text-xs"
              />
              <span>até</span>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span>Separador decimal:</span>
              <select
                value={separadorDecimal}
                onChange={e => setSeparadorDecimal(e.target.value as ',' | '.')}
                className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none font-bold text-xs"
              >
                <option value=",">Vírgula (0,00 - Padrão BR)</option>
                <option value=".">Ponto (0.00)</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Cooperativa: <span className="font-bold text-slate-700 dark:text-slate-300">{razaoSocial}</span> (CNPJ: {cnpjFormatado})
          </div>
        </div>

        {/* Navegação por Abas */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 pt-2">
          <button
            onClick={() => setActiveTab('contabil')}
            className={`pb-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'contabil'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Fortes Contábil ({lancamentosFiltrados.length})
          </button>

          <button
            onClick={() => setActiveTab('fiscal')}
            className={`pb-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'fiscal'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Receipt className="w-4 h-4" /> Fortes Fiscal ({notasFiltradas.length})
          </button>

          <button
            onClick={() => setActiveTab('financeiro')}
            className={`pb-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'financeiro'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Database className="w-4 h-4" /> Fortes Financeiro ({contasPagarReceber.length})
          </button>

          <button
            onClick={() => setActiveTab('ajuda')}
            className={`pb-2.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ml-auto ${
              activeTab === 'ajuda'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Manual do Contador
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-900/50">

          {/* ============================================================== */}
          {/* ABA 1: FORTES CONTÁBIL                                         */}
          {/* ============================================================== */}
          {activeTab === 'contabil' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Card 1: Layout Lançamentos Fortes */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-400 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold text-[10px] uppercase">
                        Layout Fortes Delimitado
                      </span>
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Lançamentos Contábeis (.TXT / .CSV)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Arquivo de partidas dobradas com débito, crédito, valor, histórico e documento. Importação rápida no Fortes Contábil.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <button
                      onClick={() => {
                        const txt = gerarLayoutFortesContabilTXT(lancamentosContabeis, planoContas, filterOptions);
                        downloadArquivoFortes(txt, `Fortes_Lancamentos_${competencia.replace('/', '_') || 'Geral'}.txt`);
                      }}
                      className="w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar Arquivo Fortes (.TXT)
                    </button>

                    <button
                      onClick={() => {
                        const txt = gerarLayoutFortesContabilTXT(lancamentosContabeis, planoContas, filterOptions);
                        handleCopiar(txt, 'lanc-fortes');
                      }}
                      className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {copiedKey === 'lanc-fortes' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'lanc-fortes' ? 'Copiado para o Clipboard!' : 'Copiar Conteúdo'}
                    </button>
                  </div>
                </div>

                {/* Card 2: SPED ECD Oficial */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-400 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase">
                        SPED ECD Oficial
                      </span>
                      <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      SPED Contábil ECD (Bloco I)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Arquivo fiscal completo contendo Bloco 0 (Abertura), I050 (Plano de Contas) e I200/I250 (Lançamentos e Partidas).
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <button
                      onClick={() => {
                        const txt = gerarSpedEcdContabil(lancamentosContabeis, planoContas, currentTenant, filterOptions);
                        downloadArquivoFortes(txt, `SPED_ECD_${competencia.replace('/', '_') || '2026'}.txt`);
                      }}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar SPED ECD (.TXT)
                    </button>

                    <button
                      onClick={() => {
                        const txt = gerarSpedEcdContabil(lancamentosContabeis, planoContas, currentTenant, filterOptions);
                        handleCopiar(txt, 'sped-ecd');
                      }}
                      className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {copiedKey === 'sped-ecd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'sped-ecd' ? 'Copiado para o Clipboard!' : 'Copiar Conteúdo'}
                    </button>
                  </div>
                </div>

                {/* Card 3: Plano de Contas */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-400 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase">
                        Estrutura Cadastral
                      </span>
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Plano de Contas Cooperativo
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Exporta as {planoContas.length} contas contábeis (Ativo, Passivo, PL, Sobras/Perdas e Atos Cooperativos) para o Fortes.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <button
                      onClick={() => {
                        const txt = gerarPlanoContasFortesTXT(planoContas);
                        downloadArquivoFortes(txt, `PlanoContas_Fortes_${currentTenant.cnpj || 'Cooperativa'}.csv`);
                      }}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar Plano de Contas (.CSV)
                    </button>

                    <button
                      onClick={() => {
                        const txt = gerarPlanoContasFortesTXT(planoContas);
                        handleCopiar(txt, 'plano-fortes');
                      }}
                      className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {copiedKey === 'plano-fortes' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'plano-fortes' ? 'Copiado para o Clipboard!' : 'Copiar Conteúdo'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Tabela de Prévia dos Lançamentos */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-orange-500" /> Prévia dos Lançamentos Contábeis a Exportar ({lancamentosFiltrados.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Total: R$ {lancamentosFiltrados.reduce((acc, cur) => acc + (cur.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-700">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">Data</th>
                        <th className="p-2">Débito</th>
                        <th className="p-2">Crédito</th>
                        <th className="p-2 text-right">Valor (R$)</th>
                        <th className="p-2">Histórico</th>
                        <th className="p-2">Doc Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                      {lancamentosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            Nenhum lançamento contábil encontrado para o período selecionado.
                          </td>
                        </tr>
                      ) : (
                        lancamentosFiltrados.slice(0, 15).map((l, i) => (
                          <tr key={l.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-2 whitespace-nowrap">{l.data?.split('T')[0]}</td>
                            <td className="p-2 font-mono text-[10px] text-indigo-600 dark:text-indigo-400">{l.contaDebitoCodigo || '11101.0001'}</td>
                            <td className="p-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{l.contaCreditoCodigo || '11201.9999'}</td>
                            <td className="p-2 text-right font-bold whitespace-nowrap">{l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 truncate max-w-xs">{l.historico}</td>
                            <td className="p-2 text-slate-400">{l.documentoRef || l.numeroLancamento}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 2: FORTES FISCAL                                           */}
          {/* ============================================================== */}
          {activeTab === 'fiscal' && (
            <div className="space-y-5">
              
              {/* Filtros específicos de notas */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-orange-500" /> Modelo:
                  </span>
                  <select
                    value={modeloNota}
                    onChange={e => setModeloNota(e.target.value as any)}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none font-bold"
                  >
                    <option value="TODOS">Todos os Modelos</option>
                    <option value="NFE_55">NF-e (Modelo 55 - Venda/Entrada)</option>
                    <option value="NFCE_65">NFC-e (Modelo 65 - Consumidor)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={apenasAutorizadas}
                    onChange={e => setApenasAutorizadas(e.target.checked)}
                    className="rounded-sm text-orange-600 focus:ring-orange-500"
                  />
                  <span>Exportar apenas notas autorizadas na SEFAZ</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Card 1: Layout Fortes Fiscal TXT */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-400 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold text-[10px] uppercase">
                        Layout Fortes Fiscal
                      </span>
                      <Receipt className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Movimento Fiscal (.TXT / .CSV)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Registro de notas fiscais de entrada e saída com CFOP, base de cálculo, ICMS, PIS, COFINS e Reforma Tributária (CBS/IBS).
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <button
                      onClick={() => {
                        const txt = gerarLayoutFortesFiscalTXT(notasFiscais, currentTenant, filterOptions);
                        downloadArquivoFortes(txt, `Fortes_Fiscal_${competencia.replace('/', '_') || 'Geral'}.txt`);
                      }}
                      className="w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar Movimento Fiscal (.TXT)
                    </button>

                    <button
                      onClick={() => {
                        const txt = gerarLayoutFortesFiscalTXT(notasFiscais, currentTenant, filterOptions);
                        handleCopiar(txt, 'fiscal-fortes');
                      }}
                      className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {copiedKey === 'fiscal-fortes' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'fiscal-fortes' ? 'Copiado para o Clipboard!' : 'Copiar Conteúdo'}
                    </button>
                  </div>
                </div>

                {/* Card 2: SPED EFD ICMS/IPI */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-400 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] uppercase">
                        SPED EFD ICMS/IPI
                      </span>
                      <Layers className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      SPED Fiscal Oficial (Bloco C)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Estrutura oficial com Registro C100 (Notas), C170 (Itens com tributação) e C190 (Analítico). Importação direta no Fortes Fiscal.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <button
                      onClick={() => {
                        const txt = gerarSpedFiscalEfd(notasFiscais, currentTenant, filterOptions);
                        downloadArquivoFortes(txt, `SPED_Fiscal_EFD_${competencia.replace('/', '_') || '2026'}.txt`);
                      }}
                      className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar SPED Fiscal (.TXT)
                    </button>

                    <button
                      onClick={() => {
                        const txt = gerarSpedFiscalEfd(notasFiscais, currentTenant, filterOptions);
                        handleCopiar(txt, 'sped-fiscal');
                      }}
                      className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {copiedKey === 'sped-fiscal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'sped-fiscal' ? 'Copiado para o Clipboard!' : 'Copiar Conteúdo'}
                    </button>
                  </div>
                </div>

                {/* Card 3: Lote XML Fortes */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-400 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-[10px] uppercase">
                        Importador XML Fortes
                      </span>
                      <FileCode className="w-5 h-5 text-teal-600" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Lote de XMLs de NF-e (.XML)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Arquivo contendo os XMLs no padrão NF-e 4.00 com protocolo de autorização para o módulo de leitura de XMLs do Fortes Fiscal.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <button
                      onClick={() => {
                        const xml = gerarLoteXmlFortesFiscal(notasFiscais, currentTenant, filterOptions);
                        downloadArquivoFortes(xml, `Lote_XML_NFe_Fortes_${competencia.replace('/', '_') || '2026'}.xml`, 'application/xml;charset=utf-8');
                      }}
                      className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar Lote de XMLs (.XML)
                    </button>

                    <button
                      onClick={() => {
                        const xml = gerarLoteXmlFortesFiscal(notasFiscais, currentTenant, filterOptions);
                        handleCopiar(xml, 'xml-fortes');
                      }}
                      className="w-full py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {copiedKey === 'xml-fortes' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'xml-fortes' ? 'Copiado para o Clipboard!' : 'Copiar Conteúdo'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Tabela de Prévia das Notas Fiscais */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-orange-500" /> Prévia das Notas Fiscais a Exportar ({notasFiltradas.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Total: R$ {notasFiltradas.reduce((acc, cur) => acc + (cur.valorTotalNota || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-700">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">Número</th>
                        <th className="p-2">Modelo</th>
                        <th className="p-2">Emissão</th>
                        <th className="p-2">Destinatário</th>
                        <th className="p-2 text-right">Valor Total (R$)</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                      {notasFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            Nenhuma nota fiscal encontrada para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        notasFiltradas.slice(0, 15).map((nf, i) => (
                          <tr key={nf.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-2 font-bold whitespace-nowrap">{nf.numeroNota}</td>
                            <td className="p-2 font-mono text-[10px]">{nf.modelo}</td>
                            <td className="p-2 whitespace-nowrap">{nf.dataEmissao?.split('T')[0]}</td>
                            <td className="p-2 truncate max-w-xs">{nf.destinatarioNome}</td>
                            <td className="p-2 text-right font-bold whitespace-nowrap">
                              {nf.valorTotalNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                nf.statusSefaz === 'AUTORIZADA'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {nf.statusSefaz}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 3: FORTES FINANCEIRO                                       */}
          {/* ============================================================== */}
          {activeTab === 'financeiro' && (
            <div className="space-y-5">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-orange-500" /> Títulos a Pagar e Receber para Conciliação Fortes
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Exporta todos os títulos operacionais, contratos de repasse aos cooperados e recebimentos do PAA/PNAE para o Fortes Financeiro.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const txt = gerarLayoutFortesFinanceiroTXT(contasPagarReceber, filterOptions);
                      downloadArquivoFortes(txt, `Fortes_Financeiro_Titulos_${competencia.replace('/', '_') || 'Geral'}.csv`);
                    }}
                    className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Download className="w-4 h-4" /> Baixar Títulos (.CSV)
                  </button>

                  <button
                    onClick={() => {
                      const txt = gerarLayoutFortesFinanceiroTXT(contasPagarReceber, filterOptions);
                      handleCopiar(txt, 'fin-fortes');
                    }}
                    className="py-2.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all"
                  >
                    {copiedKey === 'fin-fortes' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Tabela de Contas */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-orange-500" /> Prévia dos Títulos Financeiros ({contasPagarReceber.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Total: R$ {contasPagarReceber.reduce((acc, cur) => acc + (cur.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-700">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">Tipo</th>
                        <th className="p-2">Doc / Ref</th>
                        <th className="p-2">Vencimento</th>
                        <th className="p-2">Favorecido / Cliente</th>
                        <th className="p-2 text-right">Valor (R$)</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                      {contasPagarReceber.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            Nenhum título financeiro encontrado.
                          </td>
                        </tr>
                      ) : (
                        contasPagarReceber.slice(0, 15).map((c, i) => (
                          <tr key={c.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-2 font-bold whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                                c.tipo === 'PAGAR' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}>
                                {c.tipo}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[10px]">{c.id}</td>
                            <td className="p-2 whitespace-nowrap">{c.dataVencimento?.split('T')[0]}</td>
                            <td className="p-2 truncate max-w-xs">{c.pessoaNome || c.descricao}</td>
                            <td className="p-2 text-right font-bold whitespace-nowrap">
                              {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 whitespace-nowrap">{c.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 4: MANUAL DO CONTADOR / PASSO A PASSO NO FORTES            */}
          {/* ============================================================== */}
          {activeTab === 'ajuda' && (
            <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs">
              <div className="p-4 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-200 dark:border-orange-800/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-orange-950 dark:text-orange-200 text-sm mb-1">
                    Como importar os arquivos gerados pelo Siscoop no Sistema Fortes Total Contador
                  </h4>
                  <p className="text-orange-800 dark:text-orange-300">
                    O Siscoop gera arquivos pré-validados especificamente para a suíte de softwares da Fortes Tecnologia. Siga o passo a passo abaixo para importar cada módulo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Passo a Passo Fortes Contábil */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                    <FileSpreadsheet className="w-4 h-4 text-orange-600" /> No Fortes Contábil:
                  </h4>
                  <ol className="space-y-2 list-decimal list-inside text-slate-600 dark:text-slate-400">
                    <li>Abra o aplicativo <strong>Fortes Contábil</strong> e selecione a cooperativa.</li>
                    <li>
                      <strong>Opção A (Lançamentos Delimitados):</strong> Vá em <span className="font-semibold text-slate-800 dark:text-slate-200">Movimentos &gt; Importações &gt; Lançamentos Contábeis</span>.
                      Selecione o arquivo <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded">Fortes_Lancamentos.txt</code> gerado pelo Siscoop com separador ponto-e-vírgula (<code className="bg-slate-100 dark:bg-slate-900 px-1 rounded">;</code>).
                    </li>
                    <li>
                      <strong>Opção B (SPED ECD):</strong> Acesse o menu <span className="font-semibold text-slate-800 dark:text-slate-200">Utilitários &gt; Importação &gt; SPED ECD</span> e aponte para o arquivo <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded">SPED_ECD_...txt</code>.
                    </li>
                    <li>O Fortes efetuará o cruzamento das contas de débito e crédito e gravará os lotes de diário automaticamente.</li>
                  </ol>
                </div>

                {/* Passo a Passo Fortes Fiscal */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                    <Receipt className="w-4 h-4 text-purple-600" /> No Fortes Fiscal:
                  </h4>
                  <ol className="space-y-2 list-decimal list-inside text-slate-600 dark:text-slate-400">
                    <li>Abra o aplicativo <strong>Fortes Fiscal</strong> na cooperativa desejada.</li>
                    <li>
                      <strong>Opção A (Lote de XMLs):</strong> Vá em <span className="font-semibold text-slate-800 dark:text-slate-200">Movimentos &gt; Importação de XMLs &gt; NF-e / NFC-e</span> e aponte o arquivo XML exportado. O Fortes lê diretamente todas as chaves e produtos.
                    </li>
                    <li>
                      <strong>Opção B (SPED Fiscal):</strong> Acesse <span className="font-semibold text-slate-800 dark:text-slate-200">Movimentos &gt; Importações &gt; SPED Fiscal (EFD ICMS/IPI)</span> e selecione o arquivo <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded">SPED_Fiscal_EFD.txt</code>.
                    </li>
                    <li>
                      <strong>Opção C (Movimento Texto):</strong> Em <span className="font-semibold text-slate-800 dark:text-slate-200">Movimentos &gt; Importação de Documentos Fiscais</span>, escolha o layout CSV Fortes.
                    </li>
                  </ol>
                </div>

              </div>

              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Suporte e Dúvidas com o Suporte Fortes:</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Os arquivos foram estruturados em conformidade com o <em>Guia de Integrações Fortes Tecnologia v2026</em> e o <em>Manual de Orientação do Leiaute da ECD/EFD da Receita Federal</em>. Caso o seu contador utilize máscara personalizada de contas contábeis no Fortes, exporte primeiro o <strong>Plano de Contas Cooperativo (.CSV)</strong> para alinhar as classificações.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Formatos validados para <strong>Fortes Total Contador</strong> (Desktop &amp; Nuvem)
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
