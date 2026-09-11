import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { ImportarCsvModal } from '../components/ImportarCsvModal';
import { sanitizeCooperado } from '../utils/cooperadoSanitizer';
import {
  Cooperado,
  SituacaoCooperado,
  CategoriaCooperado
} from '../types';
import {
  Search,
  Plus,
  Filter,
  User,
  MapPin,
  Phone,
  FileText,
  CreditCard,
  History,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  ExternalLink,
  Printer,
  Download,
  Upload,
  Cloud,
  Sparkles,
  Map,
  MessageCircle,
  Sprout,
  DollarSign,
  ArrowUpRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import { ReceiptModal } from '../components/ReceiptModal';
import { GeoLocationPicker } from '../components/GeoLocationPicker';

export const CooperadosView: React.FC = () => {
  const {
    cooperados,
    addCooperado,
    updateCooperado,
    deleteCooperado,
    deleteAllCooperados,
    fetchAddressByCep,
    currentUser,
    config,
    registrosProducao,
    transacoesCapital,
    addTransacaoCapital,
    canWriteModule
  } = useCoop();

  // Nível de permissão do usuário logado para este módulo (Cooperados).
  const canWrite = canWriteModule('cooperados');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSituacao, setFilterSituacao] = useState<string>('TODOS');
  const [filterCategoria, setFilterCategoria] = useState<string>('TODOS');
  const [filterPaa, setFilterPaa] = useState<string>('TODOS');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'capital' | 'endereco' | 'contatos' | 'documentos' | 'banco' | 'historico' | 'producao'>('geral');

  const [fichaModalCooperado, setFichaModalCooperado] = useState<Cooperado | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [selectedReceiptTxId, setSelectedReceiptTxId] = useState<string | null>(null);

  // Quick Capital Transaction Modal
  const [isQuickCapModalOpen, setIsQuickCapModalOpen] = useState(false);
  const [quickCapForm, setQuickCapForm] = useState({
    tipo: 'INTEGRALIZACAO' as any,
    valor: 1000,
    formaPagamento: 'PIX' as any,
    numeroDocumento: `REC-${Date.now().toString().substring(6)}`,
    observacao: ''
  });

  const checkCafValida = (validadeStr?: string) => {
    if (!validadeStr) return true;
    let d: Date;
    if (validadeStr.includes('/')) {
      const parts = validadeStr.split('/');
      d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    } else {
      d = new Date(validadeStr);
    }
    if (isNaN(d.getTime())) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  };

  // Form State
  const initialFormState: Omit<Cooperado, 'id' | 'tenantId' | 'historico' | 'capitalSubscrito' | 'capitalIntegralizado'> = {
    matricula: `COOP-${String((cooperados?.length || 0) + 1).padStart(4, '0')}`,
    nome: '',
    cpf: '',
    rg: '',
    dataNascimento: '1990-01-01',
    sexo: 'M',
    estadoCivil: 'CASADO',
    profissao: '',
    escolaridade: 'Superior Completo',
    naturalidade: '',
    nacionalidade: 'Brasileira',
    situacao: 'ATIVO',
    dataFiliacao: new Date().toISOString().substring(0, 10),
    categoria: 'EFETIVO',
    dapCaf: 'DAP-TRAIRI-2026',
    cafDapValidade: '2028-12-31',
    aptoPaa: true,
    fotoUrl: '',
    assinaturaDigitalUrl: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: 'Trairi',
    estado: 'CE',
    pais: 'Brasil',
    latitude: -3.3768,
    longitude: -39.2689,
    pontoReferencia: '',
    telefone: '',
    celular: '',
    whatsapp: '',
    email: '',
    contatoEmergencia: '',
    documentos: [],
    banco: 'Banco do Brasil',
    agencia: '',
    conta: '',
    tipoConta: 'CORRENTE',
    chavePix: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Filter logic - completely defensive against undefined/null
  const filteredCooperados = React.useMemo(() => {
    if (!Array.isArray(cooperados)) return [];
    return cooperados.filter(c => {
      if (!c) return false;
      const cleanNome = (c.nome || '').toString().toLowerCase();
      const cleanCpf = (c.cpf || '').toString();
      const cleanCpfDigits = cleanCpf.replace(/\D/g, '');
      const cleanMatricula = (c.matricula || '').toString().toLowerCase();
      const cleanCidade = (c.cidade || '').toString().toLowerCase();
      const cleanBairro = (c.bairro || c.localidadeComunidade || '').toString().toLowerCase();
      const term = (searchTerm || '').trim().toLowerCase();
      const termDigits = term.replace(/\D/g, '');

      const matchesSearch =
        !term ||
        cleanNome.includes(term) ||
        cleanCpf.toLowerCase().includes(term) ||
        (termDigits.length >= 3 && cleanCpfDigits.includes(termDigits)) ||
        cleanMatricula.includes(term) ||
        cleanCidade.includes(term) ||
        cleanBairro.includes(term);

      const situacao = (c.situacao || 'ATIVO').toString().toUpperCase();
      const matchesSituacao = filterSituacao === 'TODOS' || situacao === filterSituacao;

      const categoria = (c.categoria || 'EFETIVO').toString().toUpperCase();
      const matchesCategoria = filterCategoria === 'TODOS' || categoria === filterCategoria;

      const isAptoPaa = c.aptoPaa !== false;
      const isCafOk = checkCafValida(c.cafDapValidade);

      const matchesPaa =
        filterPaa === 'TODOS' ? true :
        filterPaa === 'APTO_PAA' ? (isAptoPaa && isCafOk && situacao === 'ATIVO') :
        filterPaa === 'INAPTO_PAA' ? (!isAptoPaa || situacao !== 'ATIVO') :
        filterPaa === 'CAF_EXPIRADA' ? (!isCafOk) : true;

      return matchesSearch && matchesSituacao && matchesCategoria && matchesPaa;
    });
  }, [cooperados, searchTerm, filterSituacao, filterCategoria, filterPaa]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSituacao, filterCategoria, filterPaa]);

  // Pagination calculation
  const totalItems = filteredCooperados.length;
  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(totalItems / itemsPerPage);
  const paginatedCooperados = React.useMemo(() => {
    if (itemsPerPage === 0) return filteredCooperados;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCooperados.slice(start, start + itemsPerPage);
  }, [filteredCooperados, currentPage, itemsPerPage]);

  const handleOpenAdd = () => {
    if (!canWrite) { blockWriteAction(); return; }
    setEditingId(null);
    setFormData({
      ...initialFormState,
      matricula: `COOP-${String(cooperados.length + 1).padStart(4, '0')}`
    });
    setActiveTab('geral');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (coop: Cooperado) => {
    if (!canWrite) { blockWriteAction(); return; }
    const cleanCoop = sanitizeCooperado(coop);
    setEditingId(cleanCoop.id);
    setFormData({ ...cleanCoop });
    setActiveTab('geral');
    setIsFormOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem selecionada é muito grande. Por favor selecione uma imagem de até 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({ ...prev, fotoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!formData.nome || !formData.cpf) {
      alert('Por favor, preencha o Nome e o CPF do cooperado.');
      return;
    }

    if (editingId) {
      updateCooperado(editingId, formData);
    } else {
      addCooperado(formData);
    }

    setIsFormOpen(false);
  };

  const handleCepBlur = async () => {
    if (!formData.cep) return;
    setLoadingCep(true);
    const addr = await fetchAddressByCep(formData.cep);
    if (addr) {
      setFormData(prev => ({
        ...prev,
        logradouro: addr.logradouro || prev.logradouro,
        bairro: addr.bairro || prev.bairro,
        cidade: addr.cidade || prev.cidade,
        estado: addr.estado || prev.estado
      }));
    }
    setLoadingCep(false);
  };

  const exportFichaPDF = (c: Cooperado) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(config.nomeCooperativa, 20, 20);
    doc.setFontSize(12);
    doc.text(`FICHA CADASTRAL DO COOPERADO - MATRÍCULA ${c.matricula}`, 20, 30);

    doc.setFontSize(10);
    doc.text(`Nome: ${c.nome}`, 20, 45);
    doc.text(`CPF: ${c.cpf} | RG: ${c.rg}`, 20, 52);
    doc.text(`Data Nasc: ${c.dataNascimento} | Sexo: ${c.sexo}`, 20, 59);
    doc.text(`Profissão: ${c.profissao} | Escolaridade: ${c.escolaridade}`, 20, 66);
    doc.text(`Situação: ${c.situacao} | Data Filiação: ${c.dataFiliacao}`, 20, 73);
    doc.text(`Categoria: ${c.categoria}`, 20, 80);

    doc.text(`Endereço: ${c.logradouro}, ${c.numero} ${c.complemento ? '- ' + c.complemento : ''}`, 20, 93);
    doc.text(`Bairro: ${c.bairro} - ${c.cidade}/${c.estado} | CEP: ${c.cep}`, 20, 100);

    doc.text(`Telefone: ${c.telefone} | Celular: ${c.celular}`, 20, 113);
    doc.text(`E-mail: ${c.email}`, 20, 120);

    doc.text(`Banco: ${c.banco} | Agência: ${c.agencia} | Conta: ${c.conta}`, 20, 133);
    doc.text(`Chave PIX: ${c.chavePix}`, 20, 140);

    doc.text(`Capital Subscrito: R$ ${(Number(c.capitalSubscrito) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 153);
    doc.text(`Capital Integralizado: R$ ${(Number(c.capitalIntegralizado) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 160);

    doc.save(`Ficha_${c.matricula || 'COOP'}_${(c.nome || 'Cooperado').replace(/\s+/g, '_')}.pdf`);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterSituacao('TODOS');
    setFilterCategoria('TODOS');
    setFilterPaa('TODOS');
    setCurrentPage(1);
  };

  const handleDeleteAllCooperados = () => {
    if (!canWrite) { blockWriteAction(); return; }
    const total = cooperados?.length || 0;
    if (total === 0) {
      alert('Não há cooperados cadastrados para excluir.');
      return;
    }

    const confirmation = window.prompt(
      `ATENÇÃO: esta ação excluirá permanentemente ${total} cooperado(s) da cooperativa atual.\n\n` +
      'Digite EXCLUIR TODOS para confirmar:'
    );
    if (confirmation !== 'EXCLUIR TODOS') {
      if (confirmation !== null) alert('Exclusão cancelada. O texto de confirmação não confere.');
      return;
    }

    const removed = deleteAllCooperados();
    setCurrentPage(1);
    alert(`${removed} cooperado(s) excluído(s) com sucesso.`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Gestão de Quadro Social
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              {cooperados?.length || 0} Cooperados
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Base de dados e cadastro oficial de cooperados ativos e histórico social
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsImportCsvOpen(true)}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Importar Planilha / Google Drive
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Cooperado
          </button>

          <button
            onClick={handleDeleteAllCooperados}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            title="Excluir todos os cooperados da cooperativa atual"
          >
            <Trash2 className="w-4 h-4" /> Excluir Todos
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nome, CPF, Matrícula ou Cidade..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Situação:</span>
            <select
              value={filterSituacao}
              onChange={e => setFilterSituacao(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="TODOS">Todas</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="DEMITIDO">Demitido</option>
              <option value="EXCLUIDO">Excluído</option>
              <option value="FALECIDO">Falecido</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categoria:</span>
            <select
              value={filterCategoria}
              onChange={e => setFilterCategoria(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="TODOS">Todas</option>
              <option value="FUNDADOR">Fundador</option>
              <option value="EFETIVO">Efetivo</option>
              <option value="SUPLENTE">Suplente</option>
              <option value="HONORARIO">Honorário</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Apto PAA / CAF:</span>
            <select
              value={filterPaa}
              onChange={e => setFilterPaa(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none font-medium"
            >
              <option value="TODOS">Todos</option>
              <option value="APTO_PAA">✓ Aptos PAA (CAF Válida)</option>
              <option value="INAPTO_PAA">✕ Inaptos PAA</option>
              <option value="CAF_EXPIRADA">⚠ CAF Vencida / Expirada</option>
            </select>
          </div>

          {(searchTerm || filterSituacao !== 'TODOS' || filterCategoria !== 'TODOS' || filterPaa !== 'TODOS') && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="p-4">Cooperado</th>
                <th className="p-4">Matrícula / CPF</th>
                <th className="p-4">Localidade</th>
                <th className="p-4">Apto PAA / CAF</th>
                <th className="p-4">Capital Integralizado</th>
                <th className="p-4">Situação</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
              {filteredCooperados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="space-y-2">
                      <p className="text-slate-500 dark:text-slate-400">
                        Nenhum cooperado localizado com os filtros aplicados.
                      </p>
                      {(searchTerm || filterSituacao !== 'TODOS' || filterCategoria !== 'TODOS' || filterPaa !== 'TODOS') && (
                        <button
                          onClick={handleResetFilters}
                          className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold underline hover:text-emerald-700 cursor-pointer"
                        >
                          Limpar todos os filtros de busca
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCooperados.map(c => {
                  const isCafOk = checkCafValida(c.cafDapValidade);
                  const isAptoPaa = c.aptoPaa !== false && isCafOk && c.situacao === 'ATIVO';
                  const capitalInt = Number(c.capitalIntegralizado) || 0;
                  const capitalSub = Math.max(1, Number(c.capitalSubscrito) || 1000);
                  const percentCapital = Math.min(100, Math.round((capitalInt / capitalSub) * 100));

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={c.nome || 'Cooperado'}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{c.nome || 'COOPERADO SEM NOME'}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.profissao || 'Agricultor(a)'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">{c.matricula || 'S/N'}</div>
                        <div className="text-[11px] text-slate-400">{c.cpf || '000.000.000-00'}</div>
                      </td>

                      <td className="p-4">
                        <div className="text-slate-800 dark:text-slate-200">{c.cidade || 'Trairi'} - {c.estado || 'CE'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" /> {c.celular || c.telefone || '(85) 99900-0000'}
                        </div>
                      </td>

                      <td className="p-4">
                        {isAptoPaa ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                              ✓ Apto PAA
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              CAF: {c.cafDapValidade || '2028-12-31'}
                            </div>
                          </div>
                        ) : !isCafOk ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                              ⚠ CAF Vencida
                            </span>
                            <div className="text-[10px] text-rose-500 font-mono">
                              Expirou em {c.cafDapValidade}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium text-[10px] inline-flex items-center gap-1">
                              ✕ Inapto PAA
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-mono">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">
                          R$ {capitalInt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Subscrito: R$ {capitalSub.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="w-28 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${percentCapital}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          c.situacao === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          c.situacao === 'INATIVO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {c.situacao || 'ATIVO'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setFichaModalCooperado(c)}
                            title="Ficha Cadastral"
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {c.whatsapp && (
                            <a
                              href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp Direto"
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Editar Cadastro"
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (!canWrite) { blockWriteAction(); return; }
                              if (confirm(`Deseja remover/inativar o cooperado ${c.nome}?`)) {
                                deleteCooperado(c.id);
                              }
                            }}
                            title="Excluir"
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Exibindo <span className="font-semibold text-slate-700 dark:text-slate-200">{itemsPerPage === 0 ? 1 : ((currentPage - 1) * itemsPerPage) + 1}</span> a{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{itemsPerPage === 0 ? totalItems : Math.min(currentPage * itemsPerPage, totalItems)}</span> de{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{totalItems.toLocaleString('pt-BR')}</span> cooperados
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">Por página:</span>
                <select
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={0}>Todos ({totalItems})</option>
                </select>
              </div>
            </div>

            {itemsPerPage > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  title="Primeira Página"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  title="Página Anterior"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Página {currentPage} de {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  title="Próxima Página"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Última Página"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comprehensive Tabbed Modal for Add/Edit Member */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl lg:max-w-6xl max-h-[90vh] flex flex-col overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingId ? 'Editar Cadastro do Cooperado' : 'Novo Cooperado'}
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os dados organizados pelas abas temáticas
                </p>
              </div>

              <div className="flex items-center gap-2">
                {editingId && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const novaSituacao = formData.situacao === 'INATIVO' ? 'ATIVO' : 'INATIVO';
                        setFormData({ ...formData, situacao: novaSituacao });
                        updateCooperado(editingId, { situacao: novaSituacao });
                        alert(`Cooperado ${novaSituacao === 'ATIVO' ? 'Reativado' : 'Suspenso / Inativado'} com sucesso!`);
                      }}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Suspender ou Reativar registro do cooperado"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {formData.situacao === 'INATIVO' ? 'Reativar' : 'Suspender'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!canWrite) { blockWriteAction(); return; }
                        if (confirm(`Tem certeza que deseja excluir permanentemente o cadastro de "${formData.nome}"?`)) {
                          deleteCooperado(editingId);
                          setIsFormOpen(false);
                          alert('Cooperado excluído com sucesso!');
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Excluir cooperado permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tab Headers */}
            <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('geral')}
                className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'geral' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Dados Gerais
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('capital')}
                className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'capital' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Capital Social & Cotas
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('endereco')}
                className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'endereco' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> Endereço
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('contatos')}
                className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'contatos' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> Contatos
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('documentos')}
                className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'documentos' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Documentos & Anexos
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('banco')}
                className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'banco' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Dados Bancários
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('producao')}
                className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  activeTab === 'producao' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sprout className="w-3.5 h-3.5" /> Histórico de Produção
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => setActiveTab('historico')}
                  className={`px-3 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeTab === 'historico' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" /> Histórico Auditado
                </button>
              )}
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: DADOS GERAIS */}
              {activeTab === 'geral' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Matrícula *</label>
                    <input
                      type="text"
                      required
                      value={formData.matricula}
                      onChange={e => setFormData({ ...formData, matricula: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João Batista de Oliveira"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">CPF *</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">RG / Órgão Expedidor</label>
                    <input
                      type="text"
                      placeholder="12.345.678-9 SSP/SP"
                      value={formData.rg}
                      onChange={e => setFormData({ ...formData, rg: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.dataNascimento}
                      onChange={e => setFormData({ ...formData, dataNascimento: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Sexo</label>
                    <select
                      value={formData.sexo}
                      onChange={e => setFormData({ ...formData, sexo: e.target.value as any })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Estado Civil</label>
                    <select
                      value={formData.estadoCivil}
                      onChange={e => setFormData({ ...formData, estadoCivil: e.target.value as any })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="SOLTEIRO">Solteiro(a)</option>
                      <option value="CASADO">Casado(a)</option>
                      <option value="DIVORCIADO">Divorciado(a)</option>
                      <option value="VIUVO">Viúvo(a)</option>
                      <option value="UNIAO_ESTAVEL">União Estável</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Profissão</label>
                    <input
                      type="text"
                      placeholder="Ex: Engenheiro, Produtor Rural"
                      value={formData.profissao}
                      onChange={e => setFormData({ ...formData, profissao: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Situação Societária</label>
                    <select
                      value={formData.situacao}
                      onChange={e => setFormData({ ...formData, situacao: e.target.value as SituacaoCooperado })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                      <option value="DEMITIDO">Demitido</option>
                      <option value="EXCLUIDO">Excluído</option>
                      <option value="FALECIDO">Falecido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Categoria de Socio</label>
                    <select
                      value={formData.categoria}
                      onChange={e => setFormData({ ...formData, categoria: e.target.value as CategoriaCooperado })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="EFETIVO">Efetivo</option>
                      <option value="FUNDADOR">Fundador</option>
                      <option value="SUPLENTE">Suplente</option>
                      <option value="HONORARIO">Honorário</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Data de Filiação</label>
                    <input
                      type="date"
                      value={formData.dataFiliacao}
                      onChange={e => setFormData({ ...formData, dataFiliacao: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* SEÇÃO APTIDÃO PAA & DOCUMENTAÇÃO CAF/DAP */}
                  <div className="md:col-span-3 p-4 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-2 uppercase tracking-wider">
                        Elegibilidade e Documentação PAA / CAF / DAP
                      </h4>
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
                        <input
                          type="checkbox"
                          checked={formData.aptoPaa !== false}
                          onChange={e => setFormData({ ...formData, aptoPaa: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Apto PAA (Programa de Aquisição de Alimentos)</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Número CAF / DAP</label>
                        <input
                          type="text"
                          placeholder="Ex: CAF-123456789 ou DAP-SIM"
                          value={formData.dapCaf || ''}
                          onChange={e => setFormData({ ...formData, dapCaf: e.target.value })}
                          className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                          Data de Validade da CAF / DAP *
                        </label>
                        <input
                          type="date"
                          value={formData.cafDapValidade || '2028-12-31'}
                          onChange={e => setFormData({ ...formData, cafDapValidade: e.target.value })}
                          className={`w-full p-2 rounded-lg bg-white dark:bg-slate-900 border text-slate-900 dark:text-white font-mono ${
                            !checkCafValida(formData.cafDapValidade)
                              ? 'border-rose-500 text-rose-600 font-bold'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                        {!checkCafValida(formData.cafDapValidade) && (
                          <p className="text-[10px] text-rose-600 font-bold mt-1">
                            ⚠️ A CAF/DAP está vencida. Cooperado não será sincronizado como produtor rural ativo.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                      Foto do Cooperado (Upload de Imagem)
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-emerald-500 shadow-sm shrink-0 flex items-center justify-center">
                        {formData.fotoUrl ? (
                          <img
                            src={formData.fotoUrl}
                            alt="Foto do cooperado"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                          <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <span>{formData.fotoUrl ? 'Alterar Imagem' : 'Selecionar Imagem do Dispositivo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>

                          {formData.fotoUrl && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, fotoUrl: '' }))}
                              className="px-3 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" /> Remover Foto
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Selecione um arquivo de imagem (PNG, JPG, JPEG, WEBP) no seu dispositivo para atualizar a foto oficial do cooperado.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CAPITAL SOCIAL & COTAS */}
              {activeTab === 'capital' && (
                <div className="space-y-5 text-xs">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                        Capital Subscrito Total
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                        R$ {((formData as any).capitalSubscrito || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Cotas Subscritas: {Math.floor(((formData as any).capitalSubscrito || 0) / (config?.cotaParteValor || 100))} un
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                        Capital Integralizado (Pago)
                      </div>
                      <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono mt-1">
                        R$ {((formData as any).capitalIntegralizado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Cotas Adquiridas: {Math.floor(((formData as any).capitalIntegralizado || 0) / (config?.cotaParteValor || 100))} un
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        A Integralizar (Saldo Devedor)
                      </div>
                      <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono mt-1">
                        R$ {Math.max(0, ((formData as any).capitalSubscrito || 0) - ((formData as any).capitalIntegralizado || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Valor unitário da Cota: R$ {(config?.cotaParteValor || 100).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Quitação Progress Bar */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between font-bold mb-1.5">
                      <span className="text-slate-700 dark:text-slate-300">Progresso da Integralização do Cooperado</span>
                      <span className="text-emerald-600 font-mono">
                        {Math.min(100, Math.round((((formData as any).capitalIntegralizado || 0) / (((formData as any).capitalSubscrito) || 1)) * 100))}% Quitado
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round((((formData as any).capitalIntegralizado || 0) / (((formData as any).capitalSubscrito) || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Header & Button for Transactions */}
                  <div className="flex items-center justify-between pt-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Extrato de Lançamentos de Capital Social
                    </h4>
                    {currentUser.role !== 'CONSULTA' && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickCapForm({
                            tipo: 'INTEGRALIZACAO',
                            valor: Math.max(100, Math.max(0, ((formData as any).capitalSubscrito || 0) - ((formData as any).capitalIntegralizado || 0))),
                            formaPagamento: 'PIX',
                            numeroDocumento: `REC-${Date.now().toString().substring(6)}`,
                            observacao: `Integralização direta para ${formData.nome}`
                          });
                          setIsQuickCapModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Lançar Nova Movimentação
                      </button>
                    )}
                  </div>

                  {/* Extrato Table */}
                  {(() => {
                    const txsDoCooperado = (transacoesCapital || []).filter(
                      t => t && (
                        t.cooperadoId === editingId ||
                        (formData.matricula && t.cooperadoMatricula === formData.matricula) ||
                        (formData.nome && (t.cooperadoNome || '').toLowerCase() === (formData.nome || '').toLowerCase())
                      )
                    );

                    if (txsDoCooperado.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                          Nenhum lançamento de capital registrado para este cooperado ainda.
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                              <th className="p-3">Data / Doc</th>
                              <th className="p-3">Tipo</th>
                              <th className="p-3">Forma Pagto</th>
                              <th className="p-3">Valor (R$)</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Recibo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {txsDoCooperado.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                <td className="p-3 font-mono">
                                  <div className="font-bold text-slate-900 dark:text-white">{tx.numeroDocumento}</div>
                                  <div className="text-[10px] text-slate-400">{tx.data}</div>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    tx.tipo === 'INTEGRALIZACAO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                    tx.tipo === 'SUBSCRICAO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                    tx.tipo === 'DEVOLUCAO' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  }`}>
                                    {tx.tipo}
                                  </span>
                                </td>
                                <td className="p-3 font-medium text-slate-600 dark:text-slate-300">
                                  {tx.formaPagamento}
                                </td>
                                <td className="p-3 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                  R$ {(Number(tx.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold text-[10px]">
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptTxId(tx.id)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors inline-flex items-center gap-1 font-semibold text-[11px]"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Recibo</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: ENDEREÇO */}
              {activeTab === 'endereco' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">CEP *</label>
                      <input
                        type="text"
                        placeholder="14801-000"
                        value={formData.cep}
                        onChange={e => setFormData({ ...formData, cep: e.target.value })}
                        onBlur={handleCepBlur}
                        className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCepBlur}
                      disabled={loadingCep}
                      className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold shrink-0"
                    >
                      {loadingCep ? 'Buscando...' : 'Buscar CEP'}
                    </button>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Logradouro / Avenida</label>
                    <input
                      type="text"
                      placeholder="Ex: Av. dos Cooperados"
                      value={formData.logradouro}
                      onChange={e => setFormData({ ...formData, logradouro: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 450"
                      value={formData.numero}
                      onChange={e => setFormData({ ...formData, numero: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Ex: Apt 12 / Sítio Boa Vista"
                      value={formData.complemento}
                      onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Ex: Centro / Zona Rural"
                      value={formData.bairro}
                      onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">UF (Estado)</label>
                    <input
                      type="text"
                      value={formData.estado}
                      onChange={e => setFormData({ ...formData, estado: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 uppercase text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">País</label>
                    <input
                      type="text"
                      value={formData.pais}
                      onChange={e => setFormData({ ...formData, pais: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Geolocation Map & Coordinates Component */}
                  <div className="md:col-span-3 pt-2">
                    <GeoLocationPicker
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      pontoReferencia={formData.pontoReferencia}
                      addressQuery={`${formData.logradouro || ''} ${formData.numero || ''}, ${formData.bairro || ''}, ${formData.cidade || 'Trairi'} - ${formData.estado || 'CE'}, ${formData.cep || ''}`}
                      onChange={(geo) => {
                        setFormData(prev => ({
                          ...prev,
                          latitude: geo.latitude,
                          longitude: geo.longitude,
                          pontoReferencia: geo.pontoReferencia ?? prev.pontoReferencia
                        }));
                      }}
                      themeColor="emerald"
                      title="Georreferenciamento e Localização da Propriedade / Residência"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: CONTATOS */}
              {activeTab === 'contatos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Telefone Fixo</label>
                    <input
                      type="text"
                      placeholder="(16) 3333-0000"
                      value={formData.telefone}
                      onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Celular *</label>
                    <input
                      type="text"
                      required
                      placeholder="(16) 99999-0000"
                      value={formData.celular}
                      onChange={e => setFormData({ ...formData, celular: e.target.value, whatsapp: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">WhatsApp (Com DDD)</label>
                    <input
                      type="text"
                      placeholder="5516999990000"
                      value={formData.whatsapp}
                      onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">E-mail Principal</label>
                    <input
                      type="email"
                      placeholder="cooperado@email.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Contato de Emergência</label>
                    <input
                      type="text"
                      placeholder="Nome do parente / Telefone de emergência"
                      value={formData.contatoEmergencia}
                      onChange={e => setFormData({ ...formData, contatoEmergencia: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: DOCUMENTOS */}
              {activeTab === 'documentos' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Anexar Documento Digitalizado</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Suporta RG, CPF, CNH, Comprovante de Residência ou Contrato (PDF, JPG, PNG)</p>
                    <button
                      type="button"
                      onClick={() => {
                        const docNome = prompt('Nome do documento (ex: CNH do Cooperado):');
                        if (docNome) {
                          setFormData({
                            ...formData,
                            documentos: [
                              ...formData.documentos,
                              {
                                id: `doc-${Date.now()}`,
                                nome: docNome,
                                tipo: 'OUTROS',
                                url: '#',
                                dataUpload: new Date().toISOString().substring(0, 10),
                                status: 'VALIDO'
                              }
                            ]
                          });
                        }
                      }}
                      className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 rounded-lg font-semibold text-xs transition-colors"
                    >
                      + Simular Upload de Documento
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.documentos.map(doc => (
                      <div key={doc.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{doc.nome}</div>
                            <div className="text-[10px] text-slate-400">Upload em: {doc.dataUpload} • Tipo: {doc.tipo}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px]">
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: DADOS BANCÁRIOS */}
              {activeTab === 'banco' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Banco</label>
                    <input
                      type="text"
                      placeholder="Ex: Banco do Brasil, Sicoob, Itaú"
                      value={formData.banco}
                      onChange={e => setFormData({ ...formData, banco: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Agência</label>
                    <input
                      type="text"
                      placeholder="Ex: 1234-5"
                      value={formData.agencia}
                      onChange={e => setFormData({ ...formData, agencia: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Conta Corrente / Poupança</label>
                    <input
                      type="text"
                      placeholder="Ex: 98765-4"
                      value={formData.conta}
                      onChange={e => setFormData({ ...formData, conta: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Chave PIX</label>
                    <input
                      type="text"
                      placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                      value={formData.chavePix}
                      onChange={e => setFormData({ ...formData, chavePix: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: HISTÓRICO */}
              {activeTab === 'historico' && editingId && (
                <div className="space-y-3 text-xs">
                  <div className="text-slate-500 mb-2">Trilha de alterações gravadas pelo sistema para este registro:</div>
                  {formData.historico?.map(h => (
                    <div key={h.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                      <History className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{h.acao}</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{h.detalhes}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">{h.usuario} • {h.data}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 7: PRODUÇÃO E ENTREGAS */}
              {activeTab === 'producao' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">Histórico de Produção do Cooperado</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          Entregas e declarações agrícolas vinculadas ao cadastro do cooperado {formData.nome}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const producaoCooperado = registrosProducao.filter(
                      r => r.cooperadoId === editingId || r.cooperadoNome === formData.nome || r.produtorNome === formData.nome
                    );

                    if (producaoCooperado.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                          Nenhum registro de produção agrícola vinculado a este cooperado até o momento.
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                              <th className="p-3">Data Prevista/Lançamento</th>
                              <th className="p-3">Produto Agro</th>
                              <th className="p-3">Qtd Prevista</th>
                              <th className="p-3">Qtd Colhida</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {producaoCooperado.map(r => (
                              <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                                  {(r as any).dataLancamento || r.dataColheitaPrevista}
                                </td>
                                <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">
                                  {r.produtoNome}
                                </td>
                                <td className="p-3 font-medium">
                                  {(r as any).quantidadeEstimadaKg || r.quantidadeEstimada} kg
                                </td>
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                  {(r as any).quantidadeColhidaKg || 0} kg
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold text-[10px]">
                                    {(r as any).statusAprovacao || r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>

                  {editingId && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const novaSituacao = formData.situacao === 'INATIVO' ? 'ATIVO' : 'INATIVO';
                          setFormData({ ...formData, situacao: novaSituacao });
                          updateCooperado(editingId, { situacao: novaSituacao });
                          alert(`Cooperado ${novaSituacao === 'ATIVO' ? 'Reativado' : 'Suspenso / Inativado'} com sucesso!`);
                        }}
                        className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Ban className="w-4 h-4" />
                        {formData.situacao === 'INATIVO' ? 'Reativar Cooperado' : 'Suspender Cooperado'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!canWrite) { blockWriteAction(); return; }
                          if (confirm(`Tem certeza que deseja excluir permanentemente o cadastro de "${formData.nome}"?`)) {
                            deleteCooperado(editingId);
                            setIsFormOpen(false);
                            alert('Cooperado excluído com sucesso!');
                          }
                        }}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Cooperado
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> {editingId ? 'Salvar Alterações' : 'Salvar Cooperado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha do Cooperado Printable Modal */}
      {fichaModalCooperado && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl overflow-hidden p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ficha Cadastral do Cooperado</h3>
                <p className="text-xs text-slate-400">Matrícula: {fichaModalCooperado.matricula}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportFichaPDF(fichaModalCooperado)}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar PDF
                </button>
                <button
                  onClick={() => setFichaModalCooperado(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-4">
                <img
                  src={fichaModalCooperado.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={fichaModalCooperado.nome}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500/30"
                />
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{fichaModalCooperado.nome}</h4>
                  <p className="text-slate-500">CPF: {fichaModalCooperado.cpf} • RG: {fichaModalCooperado.rg}</p>
                  <p className="text-slate-500">{fichaModalCooperado.profissao} • Filiação: {fichaModalCooperado.dataFiliacao}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div><strong>Categoria:</strong> {fichaModalCooperado.categoria}</div>
                <div><strong>Situação:</strong> {fichaModalCooperado.situacao}</div>
                <div><strong>Endereço:</strong> {fichaModalCooperado.logradouro || 'Zona Rural'}, {fichaModalCooperado.numero || 'S/N'} {fichaModalCooperado.bairro ? `- ${fichaModalCooperado.bairro}` : ''}</div>
                <div><strong>Cidade/UF:</strong> {fichaModalCooperado.cidade} / {fichaModalCooperado.estado} - CEP: {fichaModalCooperado.cep || '62690-000'}</div>
                <div><strong>Celular/WhatsApp:</strong> {fichaModalCooperado.celular || fichaModalCooperado.whatsapp || 'Não informado'}</div>
                <div><strong>E-mail:</strong> {fichaModalCooperado.email || 'Não informado'}</div>
                <div><strong>Banco:</strong> {fichaModalCooperado.banco} - Ag {fichaModalCooperado.agencia}</div>
                <div><strong>Capital Subscrito:</strong> R$ {(Number(fichaModalCooperado.capitalSubscrito) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="col-span-2"><strong>Capital Integralizado:</strong> R$ {(Number(fichaModalCooperado.capitalIntegralizado) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>

              {/* Localização Geográfica e Coordenadas GPS */}
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    Localização Geográfica do Cooperado / Propriedade
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${fichaModalCooperado.latitude || -3.3768},${fichaModalCooperado.longitude || -39.2689}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition-all"
                    >
                      <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
                    </a>
                    <a
                      href={`https://www.waze.com/ul?ll=${fichaModalCooperado.latitude || -3.3768},${fichaModalCooperado.longitude || -39.2689}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition-all"
                    >
                      <Map className="w-3 h-3" /> Rota Waze
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Coordenadas GPS</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      Lat: {Number(fichaModalCooperado.latitude || -3.3768).toFixed(6)} | Lng: {Number(fichaModalCooperado.longitude || -39.2689).toFixed(6)}
                    </span>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Ponto de Referência / Acesso</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {fichaModalCooperado.pontoReferencia || 'Próximo à sede da comunidade / Acesso pela rodovia principal'}
                    </span>
                  </div>
                </div>
                {/* Mini Mapa Incorporado */}
                <div className="w-full h-36 rounded-lg overflow-hidden border border-emerald-200/80 dark:border-emerald-800/60">
                  <iframe
                    title="Mini Mapa do Cooperado"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(fichaModalCooperado.longitude || -39.2689) - 0.01}%2C${(fichaModalCooperado.latitude || -3.3768) - 0.01}%2C${(fichaModalCooperado.longitude || -39.2689) + 0.01}%2C${(fichaModalCooperado.latitude || -3.3768) + 0.01}&layer=mapnik&marker=${fichaModalCooperado.latitude || -3.3768}%2C${fichaModalCooperado.longitude || -39.2689}`}
                  />
                </div>
              </div>

              {/* Extrato de Capital Social na Ficha */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Extrato de Capital Social & Cotas-Partes
                </h5>
                {(() => {
                  const capItems = (transacoesCapital || []).filter(
                    t => t && (
                      t.cooperadoId === fichaModalCooperado.id ||
                      (fichaModalCooperado.matricula && t.cooperadoMatricula === fichaModalCooperado.matricula) ||
                      (fichaModalCooperado.nome && (t.cooperadoNome || '').toLowerCase() === (fichaModalCooperado.nome || '').toLowerCase())
                    )
                  );
                  if (capItems.length === 0) {
                    return <p className="text-slate-400 italic text-[11px]">Nenhum lançamento de capital registrado até o momento.</p>;
                  }
                  return (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700">
                      {capItems.map(t => (
                        <div key={t.id} className="py-1.5 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{t.numeroDocumento}</span>
                            <span className="text-slate-500 ml-2">({t.tipo})</span>
                            <span className="text-slate-400 ml-2 font-mono">{t.data}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              R$ {(Number(t.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold text-[10px]">
                              {t.formaPagamento}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Histórico de Produção do Cooperado */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Sprout className="w-4 h-4 text-emerald-600" /> Histórico de Produção & Entregas
                </h5>
                {(() => {
                  const items = registrosProducao.filter(
                    r => r.cooperadoId === fichaModalCooperado.id || r.cooperadoNome === fichaModalCooperado.nome || r.produtorNome === fichaModalCooperado.nome
                  );
                  if (items.length === 0) {
                    return <p className="text-slate-400 italic text-[11px]">Nenhuma entrega ou produção declarada até o momento.</p>;
                  }
                  return (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700">
                      {items.map(r => (
                        <div key={r.id} className="py-1.5 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{r.produtoNome}</span>
                            <span className="text-slate-400 ml-2">({(r as any).dataLancamento || r.dataColheitaPrevista})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {(r as any).quantidadeEstimadaKg || r.quantidadeEstimada} kg
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold text-[10px]">
                              {(r as any).statusAprovacao || r.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quick Capital Transaction */}
      {isQuickCapModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Lançar Movimentação de Capital
                </h3>
                <p className="text-xs text-slate-400">Cooperado: {formData.nome} ({formData.matricula})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCapModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const valorNum = Number(quickCapForm.valor);
                if (valorNum <= 0) {
                  alert('Informe um valor maior que zero.');
                  return;
                }
                addTransacaoCapital({
                  cooperadoId: editingId || `temp-${Date.now()}`,
                  cooperadoNome: formData.nome,
                  cooperadoMatricula: formData.matricula,
                  tipo: quickCapForm.tipo,
                  valor: valorNum,
                  data: new Date().toISOString().substring(0, 10),
                  formaPagamento: quickCapForm.formaPagamento,
                  numeroDocumento: quickCapForm.numeroDocumento || `REC-${Date.now().toString().substring(6)}`,
                  status: 'CONCLUIDO',
                  observacao: quickCapForm.observacao || `Lançamento direto no cadastro do cooperado ${formData.nome}`
                });

                // Update form local state for immediate visual feedback
                setFormData(prev => {
                  let sub = (prev as any).capitalSubscrito || 0;
                  let int = (prev as any).capitalIntegralizado || 0;
                  if (quickCapForm.tipo === 'SUBSCRICAO') sub += valorNum;
                  if (quickCapForm.tipo === 'INTEGRALIZACAO') int += valorNum;
                  if (quickCapForm.tipo === 'DEVOLUCAO') {
                    sub = Math.max(0, sub - valorNum);
                    int = Math.max(0, int - valorNum);
                  }
                  return { ...prev, capitalSubscrito: sub, capitalIntegralizado: int };
                });

                setIsQuickCapModalOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Tipo de Operação</label>
                <select
                  value={quickCapForm.tipo}
                  onChange={e => setQuickCapForm({ ...quickCapForm, tipo: e.target.value as any })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-emerald-600"
                >
                  <option value="INTEGRALIZACAO">Integralização (Pagamento de Cota)</option>
                  <option value="SUBSCRICAO">Subscrição (Compromisso de Capital)</option>
                  <option value="AUMENTO">Aumento de Capital</option>
                  <option value="DEVOLUCAO">Devolução / Resgate de Capital</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickCapForm.valor}
                    onChange={e => setQuickCapForm({ ...quickCapForm, valor: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Forma de Pagamento</label>
                  <select
                    value={quickCapForm.formaPagamento}
                    onChange={e => setQuickCapForm({ ...quickCapForm, formaPagamento: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="TRANSFERENCIA">Transferência / TED</option>
                    <option value="DINHEIRO">Dinheiro / Espécie</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Nº do Documento / Recibo</label>
                <input
                  type="text"
                  value={quickCapForm.numeroDocumento}
                  onChange={e => setQuickCapForm({ ...quickCapForm, numeroDocumento: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={quickCapForm.observacao}
                  onChange={e => setQuickCapForm({ ...quickCapForm, observacao: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCapModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Confirmar e Registrar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceiptTxId && (
        <ReceiptModal
          transacaoId={selectedReceiptTxId}
          onClose={() => setSelectedReceiptTxId(null)}
        />
      )}

      {/* Import CSV Modal */}
      <ImportarCsvModal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
      />
    </div>
  );
};
