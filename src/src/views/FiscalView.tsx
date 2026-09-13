import React, { useState } from 'react';
import {
  FileText,
  Send,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Printer,
  ShieldCheck,
  RefreshCw,
  Eye,
  Settings,
  Building2,
  Trash2,
  Lock,
  QrCode,
  FileCode,
  ExternalLink,
  Award,
  Sparkles,
  ArrowRight,
  BadgeAlert,
  Sliders,
  DollarSign,
  Package,
  Layers,
  HelpCircle,
  UserCheck,
  Calendar,
  Info,
  Scale,
  Sparkle
} from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import { NotaFiscal, NotaFiscalItem, SefazCeConfig, SistemaTributarioNFe } from '../types';
import { CRONOGRAMA_REFORMA_TRIBUTARIA, ALERTA_CRONOGRAMA_TEXTO, calcularImpostosItem } from '../utils/tributacaoReforma';

export const FiscalView: React.FC = () => {
  const {
    notasFiscais,
    sefazCeConfig,
    addNotaFiscal,
    updateNotaFiscal,
    deleteNotaFiscal,
    transmitirSefazCe,
    cancelarNotaFiscalSefaz,
    updateSefazCeConfig,
    cooperados,
    produtores,
    escolasPnae,
    produtos,
    currentTenant,
    addAuditLog,
    canWriteModule
  } = useCoop();

  const canWrite = canWriteModule('fiscal');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'lista' | 'nova' | 'config' | 'reforma'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [modeloFilter, setModeloFilter] = useState<string>('TODOS');
  const [showCronogramaDetalhes, setShowCronogramaDetalhes] = useState(false);

  // Modal DANFE / Visualização
  const [selectedNfForView, setSelectedNfForView] = useState<NotaFiscal | null>(null);

  // Modal Cancelamento
  const [nfToCancel, setNfToCancel] = useState<NotaFiscal | null>(null);
  const [cancelJustification, setCancelJustification] = useState('');
  const [cancelingLoading, setCancelingLoading] = useState(false);

  // Transmissão individual / Lote estado
  const [transmittingId, setTransmittingId] = useState<string | null>(null);
  const [sefazNotice, setSefazNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State para Nova Nota Fiscal
  const [formModelo, setFormModelo] = useState<'NFE_55' | 'NFCE_65' | 'NFAE_AVULSA'>('NFE_55');
  const [formTipoOp, setFormTipoOp] = useState<'SAIDA_PNAE_PAA' | 'SAIDA_VENDA' | 'ENTRADA_PRODUTOR' | 'DEVOLUCAO'>('SAIDA_PNAE_PAA');
  const [formNatureza, setFormNatureza] = useState('Venda de Produção Agrícola Familiar para Alimentação Escolar (PNAE CE)');
  const [formSistemaTributario, setFormSistemaTributario] = useState<SistemaTributarioNFe>('NOVO_SISTEMA_REFORMA_2026');
  
  // Emitente
  const [formEmitenteTipo, setFormEmitenteTipo] = useState<'COOPERATIVA' | 'PRODUTOR_COOPERADO'>('COOPERATIVA');
  const [formSelectedProdutorId, setFormSelectedProdutorId] = useState('');
  const [formSelectedEscolaId, setFormSelectedEscolaId] = useState('');
  
  // Destinatário
  const [formDestNome, setFormDestNome] = useState('');
  const [formDestCnpjCpf, setFormDestCnpjCpf] = useState('');
  const [formDestIe, setFormDestIe] = useState('ISENTO');
  const [formDestEndereco, setFormDestEndereco] = useState('');
  const [formDestMunicipio, setFormDestMunicipio] = useState('Trairi');
  const [formDestUf, setFormDestUf] = useState('CE');
  const [formDestEmail, setFormDestEmail] = useState('');

  // Itens da Nota
  const [itemsList, setItemsList] = useState<NotaFiscalItem[]>([
    {
      id: 'item-1',
      descricao: 'Feijão Caupi Macassar Orgânico (Kg)',
      ncm: '0713.35.00',
      cfop: '5101',
      unidade: 'KG',
      quantidade: 100,
      valorUnitario: 8.50,
      valorTotal: 850.00,
      icmsCstCsosn: '400',
      icmsAliquota: 0,
      icmsValor: 0,
      cbsAliquota: 0,
      cbsValor: 0,
      ibsAliquota: 0,
      ibsValor: 0,
      isAliquota: 0,
      isValor: 0,
      funruralAliquota: 0,
      funruralValor: 0
    }
  ]);

  const [formObs, setFormObs] = useState('ISENÇÃO DE ICMS CONFORME REGULAMENTO DO ICMS DO ESTADO DO CEARÁ (DECRETO ESTADUAL PNAE/PAA). NOVO SISTEMA TRIBUTÁRIO: ALÍQUOTA ZERO DE CBS E IBS CONFORME CESTA BÁSICA NACIONAL (EC 132/2023).');

  // Config Form State
  const [configForm, setConfigForm] = useState<SefazCeConfig>(sefazCeConfig);
  const [configSavedSuccess, setConfigSavedSuccess] = useState(false);

  // Auto-fill destinatário ao selecionar escola ou cooperado
  const handleSelectEscolaDestinatario = (escolaId: string) => {
    setFormSelectedEscolaId(escolaId);
    const esc = escolasPnae.find(e => e.id === escolaId);
    if (esc) {
      setFormDestNome(esc.nomeEscola);
      setFormDestCnpjCpf(esc.cnpj || '07.418.912/0001-50');
      setFormDestEndereco(`${esc.endereco || 'Sede'}, ${esc.bairro || 'Centro'}`);
      setFormDestMunicipio(esc.municipio || 'Trairi');
      setFormDestUf('CE');
      setFormDestEmail(esc.emailContato || '');
    }
  };

  const handleSelectProdutorParaEntrada = (produtorId: string) => {
    setFormSelectedProdutorId(produtorId);
    const prod = produtores.find(p => p.id === produtorId) || cooperados.find(c => c.id === produtorId);
    if (prod) {
      setFormDestNome(`${prod.nome} (Produtor Rural Familiar)`);
      setFormDestCnpjCpf(prod.cpfCnpj || (prod as any).cpf || '');
      setFormDestEndereco((prod as any).comunidade || (prod as any).propriedade || (prod as any).endereco || 'Zona Rural');
      setFormDestMunicipio(prod.municipio || 'Trairi');
      setFormDestUf('CE');
      setFormDestIe((prod as any).inscriCaEstadual || 'ISENTO');
      
      // Update CFOP and recalculate Funrural
      setItemsList(prev => prev.map(it => {
        const impostos = calcularImpostosItem(it.valorTotal, 'ENTRADA_PRODUTOR', formSistemaTributario);
        return {
          ...it,
          cfop: '1131',
          ...impostos
        };
      }));
    }
  };

  const handleSelectProdutorEmitente = (produtorId: string) => {
    handleSelectProdutorParaEntrada(produtorId);
  };

  // Funções de itens da NF
  const handleAddItem = () => {
    const defaultVal = 50.00;
    const impostos = calcularImpostosItem(defaultVal, formTipoOp, formSistemaTributario);
    const newItem: NotaFiscalItem = {
      id: `item-${Date.now()}`,
      descricao: 'Produto da Agricultura Familiar',
      ncm: '0810.90.00',
      cfop: formTipoOp === 'ENTRADA_PRODUTOR' ? '1131' : '5101',
      unidade: 'KG',
      quantidade: 10,
      valorUnitario: 5.00,
      valorTotal: defaultVal,
      ...impostos
    };
    setItemsList(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (itemsList.length <= 1) {
      alert('A Nota Fiscal deve conter pelo menos 1 item.');
      return;
    }
    setItemsList(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof NotaFiscalItem, val: any) => {
    setItemsList(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };
        if (field === 'quantidade' || field === 'valorUnitario') {
          const q = field === 'quantidade' ? Number(val) : item.quantidade;
          const u = field === 'valorUnitario' ? Number(val) : item.valorUnitario;
          updated.valorTotal = Number((q * u).toFixed(2));
          const impostos = calcularImpostosItem(updated.valorTotal, formTipoOp, formSistemaTributario);
          Object.assign(updated, impostos);
        }
        return updated;
      }
      return item;
    }));
  };

  const totalProdutos = itemsList.reduce((acc, curr) => acc + (curr.valorTotal || 0), 0);
  const totalCbs = itemsList.reduce((acc, curr) => acc + (curr.cbsValor || 0), 0);
  const totalIbs = itemsList.reduce((acc, curr) => acc + (curr.ibsValor || 0), 0);
  const totalFunrural = itemsList.reduce((acc, curr) => acc + (curr.funruralValor || 0), 0);
  const totalIcms = itemsList.reduce((acc, curr) => acc + (curr.icmsValor || 0), 0);

  // Submissão de Nova Nota
  const handleCreateNota = (e: React.FormEvent, transmitirDireto: boolean) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!formDestNome || !formDestCnpjCpf) {
      alert('Por favor, informe o Nome/Razão Social e CPF/CNPJ do destinatário.');
      return;
    }

    let emitenteNome = currentTenant?.razaoSocial || sefazCeConfig.razaoSocialEmitente;
    let emitenteCnpjCpf = currentTenant?.cnpj || sefazCeConfig.cnpjEmitente;
    let emitenteIe = sefazCeConfig.inscricaoEstadual;

    if (formModelo === 'NFAE_AVULSA' && formEmitenteTipo === 'PRODUTOR_COOPERADO') {
      const prod = produtores.find(p => p.id === formSelectedProdutorId) || cooperados.find(c => c.id === formSelectedProdutorId);
      if (prod) {
        emitenteNome = `${prod.nome} (Produtor Rural Familiar - DAP/CAF)`;
        emitenteCnpjCpf = prod.cpfCnpj || (prod as any).cpf;
        emitenteIe = (prod as any).inscriCaEstadual || 'ISENTO';
      }
    }

    const proxNum = sefazCeConfig.proximoNumeroNFe.toString().padStart(6, '0');

    const newNf = addNotaFiscal({
      numeroNota: proxNum,
      serie: sefazCeConfig.serieNFe,
      modelo: formModelo,
      tipoOperacao: formTipoOp,
      sistemaTributario: formSistemaTributario,
      produtorId: formSelectedProdutorId || undefined,
      escolaId: formSelectedEscolaId || undefined,
      emitenteRazaoSocial: emitenteNome,
      emitenteCnpjCpf: emitenteCnpjCpf,
      emitenteInscricaoEstadual: emitenteIe,
      emitenteMunicipio: currentTenant?.cidade || 'Trairi',
      emitenteUf: 'CE',
      destinatarioNome: formDestNome,
      destinatarioCnpjCpf: formDestCnpjCpf,
      destinatarioInscricaoEstadual: formDestIe,
      destinatarioEndereco: formDestEndereco,
      destinatarioMunicipio: formDestMunicipio,
      destinatarioUf: formDestUf,
      destinatarioEmail: formDestEmail,
      dataEmissao: new Date().toISOString().substring(0, 10),
      dataSaidaEntrada: new Date().toISOString().substring(0, 10),
      valorProdutos: totalProdutos,
      valorFrete: 0,
      valorDesconto: 0,
      valorIcms: totalIcms,
      valorTotalNota: totalProdutos,
      naturezaOperacao: formNatureza,
      statusSefaz: 'RASCUNHO',
      ambienteSefaz: sefazCeConfig.ambiente,
      observacoesFiscais: formObs,
      itens: itemsList,
      cbsTotal: totalCbs,
      ibsTotal: totalIbs,
      impostoSeletivoTotal: 0,
      funruralTotal: totalFunrural,
      alertaCronogramaReforma: ALERTA_CRONOGRAMA_TEXTO
    });

    if (transmitirDireto) {
      handleTransmitirSefaz(newNf.id);
    } else {
      setSefazNotice({
        type: 'success',
        message: `Rascunho de Nota Fiscal Nº ${newNf.numeroNota} criado com sucesso!`
      });
      setActiveTab('lista');
    }
  };

  // Transmitir à SEFAZ-CE
  const handleTransmitirSefaz = async (id: string) => {
    if (!canWrite) { blockWriteAction(); return; }
    setTransmittingId(id);
    setSefazNotice(null);
    try {
      const res = await transmitirSefazCe(id);
      if (res.success) {
        setSefazNotice({
          type: 'success',
          message: `Nota Fiscal autorizada com sucesso na SEFAZ Ceará! Chave de Acesso: ${res.chaveAcesso} | Protocolo: ${res.protocolo}`
        });
        setActiveTab('lista');
      } else {
        setSefazNotice({
          type: 'error',
          message: `Rejeição SEFAZ Ceará: ${res.motivo}`
        });
      }
    } catch (e: any) {
      setSefazNotice({
        type: 'error',
        message: `Erro na conexão com os servidores da SEFAZ Ceará: ${e.message || 'Falha de comunicação.'}`
      });
    } finally {
      setTransmittingId(null);
    }
  };

  // Confirmar Cancelamento
  const handleConfirmCancelamento = async () => {
    if (!nfToCancel) return;
    if (!canWrite) { blockWriteAction(); return; }
    setCancelingLoading(true);
    try {
      const res = await cancelarNotaFiscalSefaz(nfToCancel.id, cancelJustification);
      if (res.success) {
        setSefazNotice({
          type: 'success',
          message: `Nota Fiscal Nº ${nfToCancel.numeroNota} cancelada na SEFAZ Ceará com sucesso.`
        });
        setNfToCancel(null);
        setCancelJustification('');
      } else {
        alert(res.motivo);
      }
    } finally {
      setCancelingLoading(false);
    }
  };

  // Salvar Configurações SEFAZ-CE
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    updateSefazCeConfig(configForm);
    setConfigSavedSuccess(true);
    setTimeout(() => setConfigSavedSuccess(false), 3000);
  };

  // Filtragem de Notas
  const filteredNotas = notasFiscais.filter(nf => {
    const matchSearch =
      nf.numeroNota.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nf.destinatarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nf.emitenteRazaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (nf.chaveAcesso44 && nf.chaveAcesso44.includes(searchTerm));
    
    const matchStatus = statusFilter === 'TODOS' || nf.statusSefaz === statusFilter;
    const matchModelo = modeloFilter === 'TODOS' || nf.modelo === modeloFilter;

    return matchSearch && matchStatus && matchModelo;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> WebServices SEFAZ Ceará v4.00 Integrados
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
                {sefazCeConfig.ambiente === 'HOMOLOGACAO' ? 'Ambiente de Homologação (Testes)' : 'Ambiente de Produção (Oficial)'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-7 h-7 text-emerald-400" />
              Gestão Fiscal & Emissão de Notas (SEFAZ-CE)
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-3xl">
              Emissão de NF-e (Modelo 55), NFC-e (Modelo 65) e Nota Fiscal Avulsa do Produtor Rural (NFA-e Ceará) com isenção automatizada de ICMS para programas PNAE/PAA e vendas cooperadas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('nova')}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Emitir Nota Fiscal
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 transition-all flex items-center gap-2 text-sm"
            >
              <Settings className="w-4 h-4" /> Configurar SEFAZ
            </button>
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {sefazNotice && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-md animate-fade-in ${
            sefazNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {sefazNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">{sefazNotice.message}</div>
          <button
            onClick={() => setSefazNotice(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notas Autorizadas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {notasFiscais.filter(n => n.statusSefaz === 'AUTORIZADA').length}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Homologadas na SEFAZ-CE</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Faturado (PNAE/PAA)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              R$ {notasFiscais.filter(n => n.statusSefaz === 'AUTORIZADA' && n.tipoOperacao === 'SAIDA_PNAE_PAA').reduce((a, b) => a + b.valorTotalNota, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-teal-600 font-medium mt-0.5">Isenção ICMS Ceará aplicada</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rascunhos Pendentes</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {notasFiscais.filter(n => n.statusSefaz === 'RASCUNHO').length}
            </p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Prontos para transmissão</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <FileCode className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificado Digital A1</p>
            <p className="text-sm font-bold text-emerald-700 mt-1 truncate max-w-[140px]">
              {sefazCeConfig.certificadoNomeArquivo || 'Cadastrado'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Validade: {sefazCeConfig.certificadoDataValidade || '2027-12-31'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('lista')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'lista'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" /> Notas Fiscais Emitidas ({notasFiscais.length})
        </button>
        <button
          onClick={() => setActiveTab('nova')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'nova'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plus className="w-4 h-4" /> Nova Emissão (NF-e / NFA-e)
        </button>
        <button
          onClick={() => setActiveTab('reforma')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'reforma'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 text-amber-600" /> Reforma Tributária (CBS / IBS / Cronograma)
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'config'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" /> Configurações SEFAZ-CE & Certificado
        </button>
      </div>

      {/* Alerta de Transição da Reforma Tributária */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-300/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 font-bold">
            <Scale className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-amber-950 text-sm">Cronograma Oficial: Reforma Tributária (EC 132/2023)</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase">
                Ano de Teste 2026 Ativo
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-0.5 max-w-4xl">
              Sistema preparado para o cálculo de <strong>CBS (Federal)</strong> e <strong>IBS (Estadual/Municipal)</strong>, com <strong>Alíquota Zero (0%)</strong> para Cesta Básica Nacional e Alimentação Escolar (PNAE/PAA), além de retenção de FUNRURAL e isenção de ICMS na SEFAZ-CE.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('reforma')}
          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition-all"
        >
          <Calendar className="w-3.5 h-3.5" /> Ver Cronograma Completo
        </button>
      </div>

      {/* TAB 1: LISTA DE NOTAS FISCAIS */}
      {activeTab === 'lista' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nº de nota, destinatário, CPF/CNPJ ou chave de acesso..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="AUTORIZADA">Autorizadas</option>
                <option value="RASCUNHO">Rascunhos</option>
                <option value="TRANSMITINDO">Em Transmissão</option>
                <option value="CANCELADA">Canceladas</option>
                <option value="REJEITADA">Rejeitadas</option>
              </select>

              <select
                value={modeloFilter}
                onChange={e => setModeloFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="TODOS">Todos os Modelos</option>
                <option value="NFE_55">NF-e (Modelo 55)</option>
                <option value="NFAE_AVULSA">NFA-e Avulsa Produtor Rural</option>
                <option value="NFCE_65">NFC-e (Modelo 65)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3">Nº / Serie</th>
                  <th className="p-3">Modelo</th>
                  <th className="p-3">Destinatário</th>
                  <th className="p-3">Emissão</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3">Status SEFAZ-CE</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhuma Nota Fiscal encontrada com os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredNotas.map(nf => (
                    <tr key={nf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        Nº {nf.numeroNota} <span className="text-xs text-slate-400 font-normal">(Série {nf.serie})</span>
                      </td>
                      <td className="p-3">
                        {nf.modelo === 'NFE_55' && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[11px] rounded border border-blue-200">
                            NF-e (55)
                          </span>
                        )}
                        {nf.modelo === 'NFAE_AVULSA' && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold text-[11px] rounded border border-purple-200">
                            NFA-e Avulsa CE
                          </span>
                        )}
                        {nf.modelo === 'NFCE_65' && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[11px] rounded border border-indigo-200">
                            NFC-e (65)
                          </span>
                        )}
                      </td>
                      <td className="p-3 max-w-xs truncate">
                        <div className="font-semibold text-slate-800 truncate">{nf.destinatarioNome}</div>
                        <div className="text-xs text-slate-400 font-mono">{nf.destinatarioCnpjCpf}</div>
                      </td>
                      <td className="p-3 text-slate-600 text-xs font-mono">
                        {new Date(nf.dataEmissao + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 font-bold text-slate-900 font-mono">
                        R$ {nf.valorTotalNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        {nf.statusSefaz === 'AUTORIZADA' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Autorizada
                          </span>
                        )}
                        {nf.statusSefaz === 'RASCUNHO' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                            <FileCode className="w-3.5 h-3.5 text-amber-600" /> Rascunho
                          </span>
                        )}
                        {nf.statusSefaz === 'TRANSMITINDO' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> Transmitindo...
                          </span>
                        )}
                        {nf.statusSefaz === 'CANCELADA' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                            <XCircle className="w-3.5 h-3.5 text-slate-500" /> Cancelada
                          </span>
                        )}
                        {nf.statusSefaz === 'REJEITADA' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Rejeitada
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Transmitir se Rascunho */}
                          {nf.statusSefaz === 'RASCUNHO' && (
                            <button
                              onClick={() => handleTransmitirSefaz(nf.id)}
                              disabled={transmittingId === nf.id}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-xs font-medium flex items-center gap-1 px-2 shadow-xs"
                              title="Transmitir à SEFAZ-CE"
                            >
                              <Send className="w-3.5 h-3.5" /> Transmitir
                            </button>
                          )}

                          {/* Visualizar DANFE / Espelho */}
                          <button
                            onClick={() => setSelectedNfForView(nf)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Visualizar DANFE & XML"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Cancelar Nota Autorizada */}
                          {nf.statusSefaz === 'AUTORIZADA' && (
                            <button
                              onClick={() => setNfToCancel(nf)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancelar Nota na SEFAZ-CE"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Excluir Rascunho */}
                          {nf.statusSefaz === 'RASCUNHO' && (
                            <button
                              onClick={() => {
                                if (!canWrite) { blockWriteAction(); return; }
                                if (confirm(`Deseja excluir o rascunho da Nota Fiscal Nº ${nf.numeroNota}?`)) {
                                  deleteNotaFiscal(nf.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir Rascunho"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NOVA EMISSÃO DE NOTA FISCAL */}
      {activeTab === 'nova' && (
        <form onSubmit={e => handleCreateNota(e, false)} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" /> Formutário de Emissão de Nota Fiscal Eletrônica
                </h2>
                <p className="text-xs text-slate-500">
                  Selecione os parâmetros fiscais e preencha os dados do destinatário e itens comercializados.
                </p>
              </div>
            </div>

            {/* Configurações Iniciais da Nota */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Modelo Fiscal
                </label>
                <select
                  value={formModelo}
                  onChange={e => setFormModelo(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold text-slate-800"
                >
                  <option value="NFE_55">NF-e (Modelo 55 - Cooperativa)</option>
                  <option value="NFAE_AVULSA">NFA-e (Nota Fiscal Avulsa Produtor SEFAZ-CE)</option>
                  <option value="NFCE_65">NFC-e (Modelo 65 - Consumidor Final)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Operação
                </label>
                <select
                  value={formTipoOp}
                  onChange={e => {
                    const val = e.target.value as any;
                    setFormTipoOp(val);
                    if (val === 'SAIDA_PNAE_PAA') {
                      setFormNatureza('Venda de Produção Agrícola Familiar para Alimentação Escolar (PNAE/PAA)');
                      setFormObs('ISENÇÃO DE ICMS CONFORME REGULAMENTO DO ICMS DO ESTADO DO CEARÁ (DECRETO ESTADUAL PNAE/PAA). CBS/IBS ALÍQUOTA ZERO CONFORME LEI COMPLEMENTAR 68/2024.');
                    } else if (val === 'ENTRADA_PRODUTOR') {
                      setFormNatureza('Entrada de Produção de Produtor Rural Cooperado');
                      setFormObs('Retenção FUNRURAL (1,5%) conforme Art. 25 Lei 8.212/91. Aquisição de produtos da agricultura familiar.');
                    } else {
                      setFormNatureza('Venda de Mercadorias / Produtos da Agricultura Familiar');
                      setFormObs('Saída de produtos agrícolas de cooperativa.');
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold text-slate-800"
                >
                  <option value="SAIDA_PNAE_PAA">Saída PNAE / PAA (Escola com Isenção ICMS)</option>
                  <option value="ENTRADA_PRODUTOR">Entrada de Produção (Produtor Cooperado)</option>
                  <option value="SAIDA_VENDA">Saída Venda Comercial Direta</option>
                  <option value="DEVOLUCAO">Devolução / Remessa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sistema Tributário
                </label>
                <select
                  value={formSistemaTributario}
                  onChange={e => {
                    const val = e.target.value as SistemaTributarioNFe;
                    setFormSistemaTributario(val);
                    setItemsList(prev => prev.map(it => {
                      const imp = calcularImpostosItem(it.valorTotal, formTipoOp, val);
                      return { ...it, ...imp };
                    }));
                  }}
                  className="w-full px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-lg text-sm font-bold text-slate-800"
                >
                  <option value="NOVO_SISTEMA_REFORMA_2026">Reforma 2026 (CBS / IBS / Cesta Básica Alíq. 0%)</option>
                  <option value="TRADICIONAL_ATUAL">Tradicional (ICMS / PIS / COFINS / FUNRURAL)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Natureza da Operação (CFOP)
                </label>
                <input
                  type="text"
                  value={formNatureza}
                  onChange={e => setFormNatureza(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                  required
                />
              </div>
            </div>

            {/* Quick Autocomplete Boxes for Entrada or Saída */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Autocomplete Produtor */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-700" /> Preenchimento Automático c/ Produtor
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Entrada / NFA-e</span>
                </div>
                <select
                  onChange={e => handleSelectProdutorEmitente(e.target.value)}
                  className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg text-xs bg-white font-medium text-slate-800"
                >
                  <option value="">-- Selecionar Produtor Rural Cadastrado --</option>
                  {cooperados.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} - CPF/CNPJ: {c.cpfCnpj} ({c.comunidade || c.municipio})
                    </option>
                  ))}
                </select>
              </div>

              {/* Autocomplete Escola PNAE */}
              <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-700" /> Preenchimento Automático c/ Escola
                  </span>
                  <span className="text-[10px] text-teal-700 font-semibold">Saída PNAE / PAA</span>
                </div>
                <select
                  onChange={e => handleSelectEscolaDestinatario(e.target.value)}
                  className="w-full px-3 py-1.5 border border-teal-300 rounded-lg text-xs bg-white font-medium text-slate-800"
                >
                  <option value="">-- Selecionar Escola PNAE Cadastrada --</option>
                  {escolasPnae.map(esc => (
                    <option key={esc.id} value={esc.id}>
                      {esc.nomeEscola} ({esc.municipio}) - CNPJ: {esc.cnpj || 'Prefeitura/SME'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Emitente Selection */}
            {formModelo === 'NFAE_AVULSA' && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                <div className="font-bold text-purple-900 text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-700" /> Emissão de Nota Fiscal Avulsa de Produtor Rural (NFA-e SEFAZ Ceará)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-purple-800 mb-1">Selecione o Cooperado Emitente</label>
                    <select
                      value={formSelectedProdutorId}
                      onChange={e => handleSelectProdutorEmitente(e.target.value)}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white font-medium"
                    >
                      <option value="">-- Selecione o Produtor Cadastrado --</option>
                      {cooperados.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nome} - CPF: {c.cpfCnpj} (IE: {c.inscriCaEstadual || 'Isento'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-purple-800 flex items-center">
                    A NFA-e permite ao pequeno produtor pessoa física emitir a nota fiscal diretamente com seus dados de produtor rural e DAP/CAF ativa junto à SEFAZ Ceará.
                  </div>
                </div>
              </div>
            )}

            {/* Destinatário */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                  2. Dados do Destinatário
                </h3>

                {/* Quick Selector de Escolas PNAE */}
                {escolasPnae.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Preencher c/ Escola PNAE:</span>
                    <select
                      onChange={e => handleSelectEscolaDestinatario(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-emerald-300 rounded-lg bg-emerald-50 text-emerald-900 font-semibold"
                    >
                      <option value="">-- Selecionar Escola PNAE --</option>
                      {escolasPnae.map(esc => (
                        <option key={esc.id} value={esc.id}>
                          {esc.nomeEscola} ({esc.municipio})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social / Nome Completo *</label>
                  <input
                    type="text"
                    value={formDestNome}
                    onChange={e => setFormDestNome(e.target.value)}
                    placeholder="Ex: PREFEITURA MUNICIPAL DE TRAIRI - SECRETARIA DE EDUCAÇÃO"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">CNPJ / CPF *</label>
                  <input
                    type="text"
                    value={formDestCnpjCpf}
                    onChange={e => setFormDestCnpjCpf(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Inscrição Estadual (IE)</label>
                  <input
                    type="text"
                    value={formDestIe}
                    onChange={e => setFormDestIe(e.target.value)}
                    placeholder="ISENTO ou IE Ceará"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={formDestEndereco}
                    onChange={e => setFormDestEndereco(e.target.value)}
                    placeholder="Rua, Número, Bairro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Município</label>
                    <input
                      type="text"
                      value={formDestMunicipio}
                      onChange={e => setFormDestMunicipio(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">UF</label>
                    <input
                      type="text"
                      value={formDestUf}
                      onChange={e => setFormDestUf(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold uppercase"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Itens da Nota Fiscal */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                  3. Produtos & Mercadorias Comercializadas
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Produto
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase">
                      <th className="p-2.5">Descrição do Produto</th>
                      <th className="p-2.5 w-24">NCM</th>
                      <th className="p-2.5 w-20">CFOP</th>
                      <th className="p-2.5 w-20">Unid.</th>
                      <th className="p-2.5 w-24">Qtd.</th>
                      <th className="p-2.5 w-28">Valor Un. (R$)</th>
                      <th className="p-2.5 w-32">Total (R$)</th>
                      <th className="p-2.5 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsList.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.descricao}
                            onChange={e => handleItemChange(item.id, 'descricao', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-medium"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.ncm}
                            onChange={e => handleItemChange(item.id, 'ncm', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.cfop}
                            onChange={e => handleItemChange(item.id, 'cfop', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.unidade}
                            onChange={e => handleItemChange(item.id, 'unidade', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-bold uppercase"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantidade}
                            onChange={e => handleItemChange(item.id, 'quantidade', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-bold font-mono"
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.valorUnitario}
                            onChange={e => handleItemChange(item.id, 'valorUnitario', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-bold font-mono"
                            required
                          />
                        </td>
                        <td className="p-2 font-bold font-mono text-slate-900 text-sm">
                          R$ {item.valorTotal.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totalizador */}
              <div className="flex justify-end p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Valor Total da Nota Fiscal
                  </span>
                  <span className="text-2xl font-black text-emerald-700 font-mono">
                    R$ {totalProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {formTipoOp === 'SAIDA_PNAE_PAA' && (
                    <span className="block text-[11px] text-emerald-800 font-semibold mt-0.5">
                      ✓ ICMS: R$ 0,00 (Isenção Regulamento ICMS / SEFAZ CE)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Observações e Informações Complementares */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Informações Complementares / Observações Fiscais
              </label>
              <textarea
                rows={3}
                value={formObs}
                onChange={e => setFormObs(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {/* Actions Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('lista')}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors shadow-xs"
              >
                Salvar Rascunho
              </button>

              <button
                type="button"
                onClick={e => handleCreateNota(e as any, true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition-colors shadow-lg flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Transmitir Agora para SEFAZ-CE
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: REFORMA TRIBUTÁRIA (CBS / IBS / CRONOGRAMA) */}
      {activeTab === 'reforma' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold border border-amber-300">
                  Emenda Constitucional Nº 132/2023 & Lei Complementar 68/2024
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-2">
                <Scale className="w-6 h-6 text-amber-600" />
                Cronograma Oficial de Transição da Reforma Tributária (IVA Dual)
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                O Novo Sistema Tributário Nacional unifica 5 tributos (PIS, COFINS, IPI, ICMS e ISS) em dois tributos sobre o valor agregado: <strong>CBS (Federal)</strong> e <strong>IBS (Subnacional - Estados e Municípios)</strong>, com tratamento favorecido para cooperativas e agricultura familiar.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('nova')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Emitir NF c/ Reforma 2026
            </button>
          </div>

          {/* Destaques Especiais para Cooperativas e PNAE/PAA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cesta Básica Nacional (Alíquota 0%)
              </div>
              <p className="text-xs text-emerald-800/90 leading-relaxed">
                Legislação prevê redução de 100% (isenção/alíquota zero) de CBS e IBS para alimentos essenciais in natura, hortifrutigranjeiros, feijão, arroz, mandioca, milho e leite produzidos por cooperados.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
              <div className="flex items-center gap-2 text-teal-900 font-extrabold text-sm mb-1">
                <Building2 className="w-4 h-4 text-teal-600" /> Alimentação Escolar & PNAE/PAA
              </div>
              <p className="text-xs text-teal-800/90 leading-relaxed">
                Fornecimentos para órgãos públicos de ensino (escolas municipais e estaduais) mantêm desoneração integral de tributos estaduais e federais com regime simplificado.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm mb-1">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Regime do Ato Cooperativo
              </div>
              <p className="text-xs text-indigo-800/90 leading-relaxed">
                Ato cooperativo não configurará fato gerador de CBS/IBS entre cooperado e cooperativa. Concessão de <strong>Crédito Presumido de 5%</strong> nas aquisições de cooperados pessoas físicas.
              </p>
            </div>
          </div>

          {/* Timeline de Fases */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" /> Etapas do Período de Transição (2026 - 2033)
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {CRONOGRAMA_REFORMA_TRIBUTARIA.map(etapa => (
                <div
                  key={etapa.ano}
                  className={`p-5 rounded-2xl border transition-all ${
                    etapa.vigente
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                      : etapa.status === 'PROXIMA_FASE'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black font-mono ${
                          etapa.vigente
                            ? 'bg-emerald-600 text-white'
                            : etapa.status === 'PROXIMA_FASE'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        ANO {etapa.ano}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-base">{etapa.fase}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        CBS: <strong>{etapa.aliquotaTesteCBS}%</strong>
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        IBS: <strong>{etapa.aliquotaTesteIBS}%</strong>
                      </span>
                      {etapa.vigente && (
                        <span className="px-2 py-0.5 bg-emerald-200 text-emerald-950 font-black text-[10px] rounded-full uppercase">
                          Fase Vigente
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 mt-3 leading-relaxed">
                    {etapa.descricao}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURAÇÕES SEFAZ-CE & CERTIFICADO DIGITAL */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Parâmetros de Integração SEFAZ Ceará
              </h2>
              <p className="text-xs text-slate-500">
                Configure os dados do Certificado Digital A1, tokens CSC e sequenciamento de notas para envio direto.
              </p>
            </div>

            {configSavedSuccess && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configurações salvas!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Certificado Digital */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                <Lock className="w-4 h-4 text-emerald-600" /> Certificado Digital (A1)
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Arquivo do Certificado (.PFX / .P12)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={configForm.certificadoNomeArquivo || ''}
                    onChange={e => setConfigForm(prev => ({ ...prev, certificadoNomeArquivo: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="cert_cooperativa_a1.pfx"
                  />
                  <button
                    type="button"
                    onClick={() => alert('Simulação: Certificado A1 validado e vinculado com sucesso na nuvem!')}
                    className="px-3 py-2 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    Upload PFX
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Senha do Certificado</label>
                  <input
                    type="password"
                    value={configForm.senhaCertificado || ''}
                    onChange={e => setConfigForm(prev => ({ ...prev, senhaCertificado: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Validade</label>
                  <input
                    type="date"
                    value={configForm.certificadoDataValidade || ''}
                    onChange={e => setConfigForm(prev => ({ ...prev, certificadoDataValidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Parâmetros Fiscais CE */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                <Building2 className="w-4 h-4 text-emerald-600" /> Cadastro Fiscal SEFAZ-CE
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Inscrição Estadual (IE-CE)</label>
                  <input
                    type="text"
                    value={configForm.inscricaoEstadual}
                    onChange={e => setConfigForm(prev => ({ ...prev, inscricaoEstadual: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ambiente SEFAZ</label>
                  <select
                    value={configForm.ambiente}
                    onChange={e => setConfigForm(prev => ({ ...prev, ambiente: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="HOMOLOGACAO">Homologação (Testes)</option>
                    <option value="PRODUCAO">Produção (Oficial)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Próxima NF-e (Modelo 55)</label>
                  <input
                    type="number"
                    value={configForm.proximoNumeroNFe}
                    onChange={e => setConfigForm(prev => ({ ...prev, proximoNumeroNFe: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Próxima NFC-e (Modelo 65)</label>
                  <input
                    type="number"
                    value={configForm.proximoNumeroNFCe}
                    onChange={e => setConfigForm(prev => ({ ...prev, proximoNumeroNFCe: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition-colors shadow-md flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Salvar Configurações Fiscais
            </button>
          </div>
        </form>
      )}

      {/* MODAL: DANFE ELETRÔNICO & DETALHES DA NOTA */}
      {selectedNfForView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 my-8">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    DANFE - Documento Auxiliar da Nota Fiscal Eletrônica
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Nº {selectedNfForView.numeroNota} | Série {selectedNfForView.serie} | Modelo {selectedNfForView.modelo}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedNfForView(null)}
                className="p-2 text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* DANFE Preview Container */}
            <div className="border border-slate-300 p-6 rounded-xl space-y-4 font-sans text-xs bg-slate-50/50">
              {/* Header DANFE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-300 pb-4">
                <div className="space-y-1">
                  <p className="font-extrabold text-sm text-slate-900 uppercase">{selectedNfForView.emitenteRazaoSocial}</p>
                  <p className="text-slate-600">CNPJ: {selectedNfForView.emitenteCnpjCpf}</p>
                  <p className="text-slate-600">IE: {selectedNfForView.emitenteInscricaoEstadual}</p>
                  <p className="text-slate-600">{selectedNfForView.emitenteMunicipio} - CE</p>
                </div>

                <div className="text-center border-x border-slate-300 px-2 space-y-1">
                  <p className="font-extrabold text-sm text-slate-900">DANFE</p>
                  <p className="text-[10px] text-slate-500 uppercase">Documento Auxiliar da NF-e</p>
                  <p className="font-bold text-slate-800">0 - ENTRADA / 1 - SAÍDA: <span className="text-emerald-700">1</span></p>
                  <p className="font-bold text-slate-800">Nº {selectedNfForView.numeroNota} | SÉR. {selectedNfForView.serie}</p>
                </div>

                <div className="space-y-2 text-center md:text-right">
                  {selectedNfForView.qrCodeSefazUrl ? (
                    <div className="inline-block p-1 bg-white border border-slate-200 rounded">
                      <QrCode className="w-16 h-16 text-slate-900 mx-auto" />
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-700 font-bold bg-amber-50 p-2 rounded">
                      Rascunho não transmitido
                    </div>
                  )}
                  {selectedNfForView.chaveAcesso44 && (
                    <div className="text-[10px] font-mono break-all text-slate-700">
                      <strong>CHAVE DE ACESSO:</strong><br />
                      {selectedNfForView.chaveAcesso44}
                    </div>
                  )}
                </div>
              </div>

              {/* Protocolo e Natureza */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Natureza da Operação</span>
                  <span className="font-semibold text-slate-900">{selectedNfForView.naturezaOperacao}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Protocolo de Autorização SEFAZ-CE</span>
                  <span className="font-mono text-emerald-800 font-bold">
                    {selectedNfForView.protocoloAutorizacao || 'Pendente de Transmissão'}
                  </span>
                </div>
              </div>

              {/* Destinatário */}
              <div className="border-b border-slate-300 pb-3 space-y-1">
                <span className="font-bold text-slate-500 uppercase block">Destinatário / Remetente</span>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>NOME:</strong> {selectedNfForView.destinatarioNome}</div>
                  <div><strong>CPF/CNPJ:</strong> {selectedNfForView.destinatarioCnpjCpf}</div>
                  <div><strong>ENDEREÇO:</strong> {selectedNfForView.destinatarioEndereco || 'Não informado'}</div>
                  <div><strong>MUNICÍPIO:</strong> {selectedNfForView.destinatarioMunicipio} - {selectedNfForView.destinatarioUf}</div>
                </div>
              </div>

              {/* Tabela de Produtos */}
              <div className="space-y-1">
                <span className="font-bold text-slate-500 uppercase block">Dados dos Produtos / Serviços</span>
                <table className="w-full border border-slate-300 text-left">
                  <thead className="bg-slate-200 text-slate-800 font-bold">
                    <tr>
                      <th className="p-1.5 border">Descrição</th>
                      <th className="p-1.5 border">NCM</th>
                      <th className="p-1.5 border">CFOP</th>
                      <th className="p-1.5 border">Unid.</th>
                      <th className="p-1.5 border">Qtd.</th>
                      <th className="p-1.5 border">V. Unit</th>
                      <th className="p-1.5 border">V. Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNfForView.itens.map(it => (
                      <tr key={it.id} className="border-b">
                        <td className="p-1.5 border">{it.descricao}</td>
                        <td className="p-1.5 border font-mono">{it.ncm}</td>
                        <td className="p-1.5 border font-mono">{it.cfop}</td>
                        <td className="p-1.5 border">{it.unidade}</td>
                        <td className="p-1.5 border font-mono font-bold">{it.quantidade}</td>
                        <td className="p-1.5 border font-mono">R$ {it.valorUnitario.toFixed(2)}</td>
                        <td className="p-1.5 border font-mono font-bold">R$ {it.valorTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totalizadores */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono border border-slate-300 p-2 bg-slate-100 rounded">
                <div>
                  <span className="text-[10px] text-slate-500 block">BASE CÁLC. ICMS</span>
                  <span className="font-bold">R$ 0,00</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">VALOR DO ICMS</span>
                  <span className="font-bold text-emerald-700">R$ 0,00</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">VALOR FRETE</span>
                  <span className="font-bold">R$ 0,00</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">TOTAL DA NOTA</span>
                  <span className="font-black text-slate-900 text-sm">R$ {selectedNfForView.valorTotalNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Observações */}
              <div className="text-[11px] text-slate-600 bg-white p-2 border border-slate-300 rounded">
                <strong>DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES:</strong><br />
                {selectedNfForView.observacoesFiscais}
              </div>
            </div>

            {/* Actions Modal */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div>
                {selectedNfForView.xmlUrl && (
                  <a
                    href={selectedNfForView.xmlUrl}
                    download={`NFe-${selectedNfForView.chaveAcesso44 || selectedNfForView.numeroNota}.xml`}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar XML Assinado
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir DANFE
                </button>
                <button
                  onClick={() => setSelectedNfForView(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAMENTO SEFAZ-CE */}
      {nfToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-lg text-slate-900">Cancelar Nota Fiscal na SEFAZ-CE</h3>
            </div>

            <p className="text-xs text-slate-600">
              Você está prestes a homologar o cancelamento da <strong>Nota Fiscal Nº {nfToCancel.numeroNota}</strong> perante os servidores fiscais do Ceará.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Justificativa Oficial de Cancelamento (Mínimo 15 caracteres) *
              </label>
              <textarea
                rows={3}
                value={cancelJustification}
                onChange={e => setCancelJustification(e.target.value)}
                placeholder="Ex: Erro no preenchimento dos valores e quantidade de mercadorias entregues."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setNfToCancel(null)}
                className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-xs"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancelamento}
                disabled={cancelingLoading || cancelJustification.length < 15}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {cancelingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Confirmar Cancelamento SEFAZ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
