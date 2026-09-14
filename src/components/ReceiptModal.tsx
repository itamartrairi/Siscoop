import { formatarData } from '../utils/dateHelpers';
import React from 'react';
import { useCoop } from '../context/CoopContext';
import { X, Printer, Download, CheckCircle2, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';

interface Props {
  transacaoId?: string;
  reciboData?: {
    numeroRecibo: string;
    cooperadoNome: string;
    cooperadoCpf: string;
    cooperadoMatricula: string;
    valor: number;
    data: string;
    formaPagamento: string;
    historicoDetalhe: string;
  };
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ transacaoId, reciboData, onClose }) => {
  const { transacoesCapital, cooperados, config } = useCoop();

  let details = reciboData;

  if (!details && transacaoId) {
    const tx = transacoesCapital.find(t => t.id === transacaoId);
    if (tx) {
      const coop = cooperados.find(c => c.id === tx.cooperadoId);
      details = {
        numeroRecibo: tx.numeroDocumento || `REC-${tx.id}`,
        cooperadoNome: tx.cooperadoNome,
        cooperadoCpf: coop?.cpf || '123.456.789-00',
        cooperadoMatricula: tx.cooperadoMatricula,
        valor: tx.valor,
        data: tx.data,
        formaPagamento: tx.formaPagamento,
        historicoDetalhe: tx.observacao || `Integralização/Subscrição de cota-parte de capital social na ${config.nomeCooperativa}.`
      };
    }
  }

  if (!details) return null;

  const valorFormatado = (Number(details.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(config.nomeCooperativa, 20, 20);
    doc.setFontSize(10);
    doc.text(`CNPJ: ${config.cnpj}`, 20, 26);
    doc.text(`RECIBO DE INTEGRALIZAÇÃO DE CAPITAL SOCIAL Nº ${details!.numeroRecibo}`, 20, 36);

    doc.setFontSize(12);
    doc.text(`Valor: R$ ${valorFormatado}`, 20, 50);
    doc.text(`Cooperado: ${details!.cooperadoNome} (${details!.cooperadoMatricula})`, 20, 60);
    doc.text(`CPF: ${details!.cooperadoCpf}`, 20, 68);
    doc.text(`Data: ${formatarData(details!.data)}`, 20, 76);
    doc.text(`Forma de Pagamento: ${details!.formaPagamento}`, 20, 84);

    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(`Recebemos do cooperado acima qualificado a quantia supra de R$ ${valorFormatado}, referente a: ${details!.historicoDetalhe}`, 170);
    doc.text(splitText, 20, 98);

    doc.text('------------------------------------------------------------', 20, 130);
    doc.text(`${config.nomeCooperativa} - Departamento Financeiro`, 20, 138);

    doc.save(`Recibo_${details!.numeroRecibo}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl lg:max-w-4xl overflow-hidden print:shadow-none print:border-none print:max-w-none print:w-full my-8">
        {/* Header - Hidden on print */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Recibo Oficial de Integralização de Capital
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Baixar PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content Body */}
        <div className="p-8 space-y-6 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                {config.nomeCooperativa}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{config.razaoSocial}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">CNPJ: {config.cnpj}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> {details.numeroRecibo}
              </span>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Emissão: {formatarData(details.data)}</p>
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Valor Recebido</span>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 font-mono mt-0.5">
                R$ {details.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              Forma de Pagamento: <span className="font-semibold text-slate-800 dark:text-slate-200">{details.formaPagamento}</span>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p>
              Recebemos do(a) cooperado(a) <strong className="text-slate-900 dark:text-white">{details.cooperadoNome}</strong>,
              inscrito(a) sob a Matrícula <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{details.cooperadoMatricula}</span> e CPF <span className="font-mono">{details.cooperadoCpf}</span>,
              a quantia de <strong className="text-emerald-700 dark:text-emerald-400">R$ {details.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
            </p>
            <p className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs italic text-slate-600 dark:text-slate-300">
              Histórico/Referência: {details.historicoDetalhe}
            </p>
          </div>

          <div className="pt-12 grid grid-cols-2 gap-8 text-center border-t border-slate-200 dark:border-slate-800">
            <div>
              <div className="border-b border-slate-400 dark:border-slate-600 mb-2 w-3/4 mx-auto"></div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{details.cooperadoNome}</p>
              <p className="text-[11px] text-slate-400">Assinatura do Cooperado</p>
            </div>
            <div>
              <div className="border-b border-slate-400 dark:border-slate-600 mb-2 w-3/4 mx-auto"></div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{config.nomeCooperativa}</p>
              <p className="text-[11px] text-slate-400">Departamento Financeiro / Tesouraria</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-mono pt-4">
            Autenticação Digital: SISCOOPE-HASH-{Math.random().toString(36).substring(2, 10).toUpperCase()}-{details.cooperadoMatricula}
          </div>
        </div>
      </div>
    </div>
  );
};
