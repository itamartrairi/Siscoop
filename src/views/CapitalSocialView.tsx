import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  TransacaoCapital,
  TipoTransacaoCapital,
  FormaPagamento
} from '../types';
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  X,
  UserCheck,
  CreditCard
} from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';

export const CapitalSocialView: React.FC = () => {
  const {
    cooperados,
    transacoesCapital,
    addTransacaoCapital,
    registrarPagamentoParcela,
    currentUser,
    config,
    canWriteModule
  } = useCoop();

  const canWrite = canWriteModule('capital');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [activeSubTab, setActiveSubTab] = useState<'extrato' | 'parcelamento'>('extrato');

  // Modal States
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [selectedReceiptTxId, setSelectedReceiptTxId] = useState<string | null>(null);
  const [modalCoopSearch, setModalCoopSearch] = useState('');

  // State for Baixa de Parcela Modal
  const [selectedBaixaParcela, setSelectedBaixaParcela] = useState<{
    transacaoId: string;
    id: string;
    numeroParcela: number;
    totalParcelas: number;
    valor: number;
    cooperadoNome: string;
    cooperadoMatricula: string;
    dataVencimento: string;
  } | null>(null);

  const [baixaForm, setBaixaForm] = useState({
    formaPagamento: 'PIX' as FormaPagamento,
    reciboNum: '',
    dataPagamento: new Date().toISOString().substring(0, 10)
  });

  // New Transaction Form State
  const [formData, setFormData] = useState({
    cooperadoId: '',
    tipo: 'INTEGRALIZACAO' as TipoTransacaoCapital,
    valor: 1000.00,
    data: new Date().toISOString().substring(0, 10),
    formaPagamento: 'PIX' as FormaPagamento,
    numeroDocumento: `REC-${Date.now().toString().substring(6)}`,
    observacao: '',
    gerarParcelas: false,
    qtdParcelas: 2,
    cooperadoDestinoId: ''
  });

  // Calculate Totals
  const totalSubscrito = (cooperados || []).reduce((acc, c) => acc + (Number(c?.capitalSubscrito) || 0), 0);
  const totalIntegralizado = (cooperados || []).reduce((acc, c) => acc + (Number(c?.capitalIntegralizado) || 0), 0);
  const totalAIntegralizar = Math.max(0, totalSubscrito - totalIntegralizado);

  // Filtered transactions
  const filteredTx = (transacoesCapital || []).filter(tx => {
    if (!tx) return false;
    const nome = (tx.cooperadoNome || '').toLowerCase();
    const mat = (tx.cooperadoMatricula || '').toLowerCase();
    const doc = (tx.numeroDocumento || '').toLowerCase();
    const term = (searchTerm || '').toLowerCase();

    const matchesSearch = !term || nome.includes(term) || mat.includes(term) || doc.includes(term);
    const matchesTipo = filterTipo === 'TODOS' || tx.tipo === filterTipo;

    return matchesSearch && matchesTipo;
  });

  // Collect all parcelas across transactions
  const allParcelas = (transacoesCapital || []).flatMap(tx =>
    (tx?.parcelas || []).map(p => ({
      ...p,
      cooperadoNome: tx?.cooperadoNome || '',
      cooperadoMatricula: tx?.cooperadoMatricula || '',
      transacaoDoc: tx?.numeroDocumento || ''
    }))
  );

  const handleOpenNewTx = () => {
    if (!canWrite) { blockWriteAction(); return; }
    setModalCoopSearch('');
    if (cooperados && cooperados.length > 0) {
      setFormData(prev => ({
        ...prev,
        cooperadoId: prev.cooperadoId && cooperados.some(c => c.id === prev.cooperadoId) ? prev.cooperadoId : cooperados[0].id,
        cooperadoDestinoId: prev.cooperadoDestinoId || (cooperados[1] ? cooperados[1].id : ''),
        numeroDocumento: `REC-${Date.now().toString().substring(6)}`
      }));
    }
    setIsNewTxOpen(true);
  };

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    const coop = cooperados.find(c => c.id === formData.cooperadoId) || cooperados[0];
    if (!coop) {
      alert('Selecione um cooperado válido para realizar a movimentação.');
      return;
    }

    const valorNumerico = Number(formData.valor) || 0;
    if (valorNumerico <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    const coopDestino = cooperados.find(c => c.id === formData.cooperadoDestinoId);

    // Build parcelas array if requested
    let parcelasArray = undefined;
    if (formData.gerarParcelas && formData.qtdParcelas > 1) {
      const valorParcela = valorNumerico / formData.qtdParcelas;
      parcelasArray = [];
      for (let i = 1; i <= formData.qtdParcelas; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        parcelasArray.push({
          id: `parc-${Date.now()}-${i}`,
          transacaoId: '',
          cooperadoId: coop.id,
          numeroParcela: i,
          totalParcelas: formData.qtdParcelas,
          valor: valorParcela,
          dataVencimento: dueDate.toISOString().substring(0, 10),
          status: i === 1 ? ('PAGO' as const) : ('PENDENTE' as const),
          formaPagamento: i === 1 ? formData.formaPagamento : undefined,
          reciboNum: i === 1 ? formData.numeroDocumento : undefined
        });
      }
    }

    addTransacaoCapital({
      cooperadoId: coop.id,
      cooperadoNome: coop.nome || 'Cooperado',
      cooperadoMatricula: coop.matricula || '',
      tipo: formData.tipo,
      valor: valorNumerico,
      data: formData.data || new Date().toISOString().substring(0, 10),
      formaPagamento: formData.formaPagamento,
      numeroDocumento: formData.numeroDocumento || `REC-${Date.now().toString().substring(6)}`,
      status: 'CONCLUIDO',
      observacao: formData.observacao || '',
      cooperadoDestinoId: coopDestino?.id,
      cooperadoDestinoNome: coopDestino?.nome,
      parcelas: parcelasArray
    });

    setIsNewTxOpen(false);
  };

  const handleConfirmarBaixa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!selectedBaixaParcela) return;

    registrarPagamentoParcela(
      selectedBaixaParcela.transacaoId,
      selectedBaixaParcela.id,
      baixaForm.formaPagamento,
      baixaForm.reciboNum
    );

    setSelectedBaixaParcela(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Capital Social & Financeiro</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Controle de Subscrições, Integralizações, Devoluções e Extrato de Cotas-Partes
          </p>
        </div>
        {currentUser.role !== 'CONSULTA' && (
          <button
            onClick={handleOpenNewTx}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Lançar Movimentação de Capital
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-400">Capital Subscrito Total</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2">
            R$ {totalSubscrito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Valor base da cota-parte: R$ {(config?.cotaParteValor || 0).toFixed(2)}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-400">Capital Integralizado (Pago)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
            R$ {totalIntegralizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            {(((totalIntegralizado || 0) / (totalSubscrito || 1)) * 100).toFixed(1)}% do capital total
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-400">A Integralizar (Pendente)</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-2">
            R$ {totalAIntegralizar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Saldos em aberto de cooperados
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-400">Parcelas Ativas</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-2">
            {allParcelas.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {allParcelas.filter(p => p.status === 'PAGO').length} quitadas • {allParcelas.filter(p => p.status === 'PENDENTE').length} pendentes
          </div>
        </div>
      </div>

      {/* Tabs for Extrato vs Parcelas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveSubTab('extrato')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'extrato' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Extrato Completo de Movimentações
        </button>
        <button
          onClick={() => setActiveSubTab('parcelamento')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'parcelamento' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Controle de Parcelas & Vencimentos ({allParcelas.length})
        </button>
      </div>

      {/* Subtab 1: Extrato Completo */}
      {activeSubTab === 'extrato' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por Cooperado, Matrícula ou Documento..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Tipo de Operação:</span>
              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="TODOS">Todas</option>
                <option value="INTEGRALIZACAO">Integralização</option>
                <option value="SUBSCRICAO">Subscrição</option>
                <option value="AUMENTO">Aumento de Capital</option>
                <option value="TRANSFERENCIA">Transferência</option>
                <option value="DEVOLUCAO">Devolução</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4">Data / Documento</th>
                    <th className="p-4">Cooperado</th>
                    <th className="p-4">Tipo de Operação</th>
                    <th className="p-4">Forma Pagto</th>
                    <th className="p-4">Valor (R$)</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                  {filteredTx.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 font-mono">
                        <div className="font-semibold text-slate-900 dark:text-white">{tx.numeroDocumento}</div>
                        <div className="text-[11px] text-slate-400">{tx.data}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{tx.cooperadoNome}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tx.cooperadoMatricula}</div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          tx.tipo === 'INTEGRALIZACAO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          tx.tipo === 'SUBSCRICAO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                          tx.tipo === 'DEVOLUCAO' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}>
                          {tx.tipo}
                        </span>
                      </td>

                      <td className="p-4 text-slate-700 dark:text-slate-300">
                        {tx.formaPagamento}
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white text-sm">
                        R$ {tx.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedReceiptTxId(tx.id)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" /> Recibo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Controle de Parcelas */}
      {activeSubTab === 'parcelamento' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-xs">
            Gerenciamento Individual de Parcelas de Capital Social
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Parcela</th>
                  <th className="p-4">Cooperado</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Situação</th>
                  <th className="p-4 text-right">Ação / Baixa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                {allParcelas.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      Parcela {p.numeroParcela}/{p.totalParcelas}
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{p.cooperadoNome}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.cooperadoMatricula}</div>
                    </td>

                    <td className="p-4 font-mono text-slate-700 dark:text-slate-300">
                      {p.dataVencimento}
                    </td>

                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        p.status === 'PAGO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      {p.status === 'PENDENTE' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBaixaParcela({
                              transacaoId: p.transacaoId,
                              id: p.id,
                              numeroParcela: p.numeroParcela,
                              totalParcelas: p.totalParcelas,
                              valor: p.valor,
                              cooperadoNome: p.cooperadoNome,
                              cooperadoMatricula: p.cooperadoMatricula,
                              dataVencimento: p.dataVencimento
                            });
                            setBaixaForm({
                              formaPagamento: 'PIX',
                              reciboNum: `REC-${Date.now().toString().substring(6)}`,
                              dataPagamento: new Date().toISOString().substring(0, 10)
                            });
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 ml-auto"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Dar Baixa (Registrar Pagamento)
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">
                          Pago ({p.reciboNum || 'Recibo Quitado'})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Transaction Modal */}
      {isNewTxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col p-6 sm:p-8 space-y-5 text-slate-900 dark:text-white my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Lançar Operação de Capital Social</h3>
              <button onClick={() => setIsNewTxOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Selecione o Cooperado Origem * ({cooperados.length} cadastrados)
                  </label>
                  {modalCoopSearch && (
                    <button
                      type="button"
                      onClick={() => setModalCoopSearch('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                    >
                      Limpar Busca
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar lista de cooperados por nome, CPF ou matrícula..."
                    value={modalCoopSearch}
                    onChange={e => setModalCoopSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={formData.cooperadoId}
                  onChange={e => setFormData({ ...formData, cooperadoId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-400">
                    -- Selecione o Cooperado --
                  </option>
                  {(cooperados || [])
                    .filter(c => {
                      if (!c) return false;
                      if (!modalCoopSearch) return true;
                      const search = modalCoopSearch.toLowerCase();
                      const nome = (c.nome || '').toLowerCase();
                      const mat = (c.matricula || '').toLowerCase();
                      const cpf = (c.cpf || '');
                      return nome.includes(search) || mat.includes(search) || cpf.includes(modalCoopSearch);
                    })
                    .map(c => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1">
                        {c.nome} (Matrícula: {c.matricula}) - Integralizado: R$ {(Number(c.capitalIntegralizado) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                </select>

                {(() => {
                  const selectedCoop = (cooperados || []).find(c => c.id === formData.cooperadoId) || (cooperados && cooperados[0]);
                  if (!selectedCoop) return null;
                  const subscrito = Number(selectedCoop.capitalSubscrito) || 0;
                  const integralizado = Number(selectedCoop.capitalIntegralizado) || 0;
                  const pendente = Math.max(0, subscrito - integralizado);
                  return (
                    <div className="mt-2 p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedCoop.nome}</span>
                        <span className="text-slate-500 ml-1 font-mono">({selectedCoop.matricula})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 font-mono">
                        <div><span className="text-slate-400">Subscrito:</span> <strong>R$ {subscrito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                        <div><span className="text-slate-400">Integralizado:</span> <strong className="text-emerald-600">R$ {integralizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                        <div><span className="text-slate-400">A Integralizar:</span> <strong className="text-amber-600">R$ {pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Operação *</label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value as TipoTransacaoCapital })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="INTEGRALIZACAO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Integralização (Pagamento de Cotas)</option>
                    <option value="SUBSCRICAO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Subscrição (Compromisso)</option>
                    <option value="AUMENTO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Aumento de Capital</option>
                    <option value="TRANSFERENCIA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Transferência entre Cooperados</option>
                    <option value="DEVOLUCAO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Devolução / Restituição</option>
                  </select>
                </div>

                {formData.tipo === 'TRANSFERENCIA' ? (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Cooperado Destino *</label>
                    <select
                      value={formData.cooperadoDestinoId}
                      onChange={e => setFormData({ ...formData, cooperadoDestinoId: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-400">-- Selecione o Destinatário --</option>
                      {cooperados
                        .filter(c => c.id !== formData.cooperadoId)
                        .map(c => (
                          <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            {c.nome} ({c.matricula})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data da Operação *</label>
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={e => setFormData({ ...formData, data: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Total (R$) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.valor || ''}
                    onChange={e => setFormData({ ...formData, valor: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Forma de Pagamento *</label>
                  <select
                    value={formData.formaPagamento}
                    onChange={e => setFormData({ ...formData, formaPagamento: e.target.value as FormaPagamento })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PIX" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">PIX Instantâneo</option>
                    <option value="BOLETO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Boleto Bancário</option>
                    <option value="TRANSFERENCIA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Transferência TED/DOC</option>
                    <option value="DINHEIRO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Dinheiro Espécie</option>
                    <option value="DESCONTO_FOLHA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Desconto em Folha</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Número do Documento / Recibo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: REC-102938"
                  value={formData.numeroDocumento}
                  onChange={e => setFormData({ ...formData, numeroDocumento: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Parcelar Movimentação?</span>
                    <span className="text-[10px] text-slate-400">Gera parcelas periódicas no controle financeiro de capital</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.gerarParcelas}
                    onChange={e => setFormData({ ...formData, gerarParcelas: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {formData.gerarParcelas && (
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <label className="block font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                    Quantidade de Parcelas (2x a 24x)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={2}
                      max={24}
                      value={formData.qtdParcelas}
                      onChange={e => setFormData({ ...formData, qtdParcelas: parseInt(e.target.value) || 2 })}
                      className="w-32 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                      <span>Valor de cada parcela: </span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                        R$ {((formData.valor || 0) / (formData.qtdParcelas || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Observações e Histórico Complementar</label>
                <textarea
                  rows={3}
                  value={formData.observacao}
                  onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Justificativa da operação, observações de atas ou informações complementares do recibo..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewTxOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal Popup */}
      {selectedReceiptTxId && (
        <ReceiptModal
          transacaoId={selectedReceiptTxId}
          onClose={() => setSelectedReceiptTxId(null)}
        />
      )}

      {/* Baixa de Parcela Modal */}
      {selectedBaixaParcela && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl overflow-hidden p-6 sm:p-8 space-y-5 my-8 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Dar Baixa na Parcela ({selectedBaixaParcela.numeroParcela}/{selectedBaixaParcela.totalParcelas})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBaixaParcela(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white">{selectedBaixaParcela.cooperadoNome}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Matrícula: {selectedBaixaParcela.cooperadoMatricula}</div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">Valor da Parcela:</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  R$ {selectedBaixaParcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Vencimento Original:</span>
                <span className="font-mono">{selectedBaixaParcela.dataVencimento}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmarBaixa} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Forma de Pagamento *</label>
                <select
                  value={baixaForm.formaPagamento}
                  onChange={e => setBaixaForm({ ...baixaForm, formaPagamento: e.target.value as FormaPagamento })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="PIX" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">PIX Instantâneo</option>
                  <option value="BOLETO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Boleto Bancário</option>
                  <option value="TRANSFERENCIA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Transferência TED/DOC</option>
                  <option value="DINHEIRO" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Dinheiro Espécie</option>
                  <option value="DESCONTO_FOLHA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Desconto em Folha</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Número do Recibo / Comprovante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: REC-987654"
                  value={baixaForm.reciboNum}
                  onChange={e => setBaixaForm({ ...baixaForm, reciboNum: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Data do Pagamento *</label>
                <input
                  type="date"
                  required
                  value={baixaForm.dataPagamento}
                  onChange={e => setBaixaForm({ ...baixaForm, dataPagamento: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedBaixaParcela(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
