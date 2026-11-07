import { formatarData } from '../utils/dateHelpers';
import React, { useState, useMemo, useRef } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  ShoppingCart,
  Plus,
  Truck,
  Pencil,
  Trash2,
  X,
  Filter,
  RotateCcw,
  Search,
  ExternalLink,
  MessageCircle,
  Users,
  Store,
  FileText,
  Package
} from 'lucide-react';
import { SolicitacaoCompra, Fornecedor, ItemEstoque } from '../types';
import { DataGrid, GridStatus } from '../components/ui/DataGrid';
import { ClientesTab } from '../components/ClientesTab';
import { RevendasTab } from '../components/RevendasTab';
import { RelatoriosPdfTab } from '../components/RelatoriosPdfTab';
import { ProdutosTab } from '../components/ProdutosTab';
import { abrirLinkExterno, montarLinkWhatsApp, montarLinkWhatsAppGenerico, getTelefoneContato } from '../utils/whatsappHelpers';
import { mensagemOrdemCompra } from '../utils/mensagensWhatsApp';
import { FORMAS_PAGAMENTO_COMERCIAL, type FormaPagamentoComercial, gerarParcelas, somarDias, hojeISO, dataBR, formatarMoeda, rotuloFormaPagamento } from '../utils/parcelamento';
import { consultarCnpjReceita, cnpjValido } from '../services/cnpjService';
import type { DadosCnpjReceita } from '../services/cnpjService';

// Páginas oficiais da Receita Federal
const URL_RECEITA_CPF = 'https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp';
const URL_RECEITA_CNPJ = 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp';

const somenteDigitos = (v: string) => (v || '').replace(/\D/g, '');

/** Valida os dígitos verificadores do CPF. */
const cpfValido = (valor: string): boolean => {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string) => {
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(cpf.slice(0, 9));
  const d2 = dv(cpf.slice(0, 9) + d1);
  return cpf.endsWith(`${d1}${d2}`);
};

/** Aplica a máscara de CPF ou CNPJ enquanto o usuário digita. */
const formatarDocumento = (valor: string, tipo: 'PF' | 'PJ'): string => {
  const d = somenteDigitos(valor).slice(0, tipo === 'PF' ? 11 : 14);
  if (tipo === 'PF') {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const tipoPessoaDoDocumento = (doc: string): 'PF' | 'PJ' => (somenteDigitos(doc).length === 11 ? 'PF' : 'PJ');

// Tipo de compra e condições de pagamento da Ordem de Compra
type TipoCompraOC = 'INSUMOS' | 'REVENDA';
const OC_PAGTO_PADRAO = () => ({
  tipoCompra: 'INSUMOS' as TipoCompraOC,
  formaPagamento: 'PIX' as FormaPagamentoComercial,
  numeroParcelas: 1,
  intervaloDias: 30,
  primeiroVencimento: somarDias(hojeISO(), 30)
});

const MESES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const ComprasView: React.FC = () => {
  const {
    solicitacoesCompra,
    addSolicitacaoCompra,
    updateSolicitacaoCompra,
    deleteSolicitacaoCompra,
    ordensCompra,
    addOrdemCompra,
    updateOrdemCompra,
    deleteOrdemCompra,
    fornecedores,
    addFornecedor,
    updateFornecedor,
    deleteFornecedor,
    estoque,
    currentTenant,
    canWriteModule
  } = useCoop();

  const canWrite = canWriteModule('compras');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'solicitacoes' | 'ordens' | 'fornecedores' | 'revendas' | 'clientes' | 'relatorios' | 'produtos'>('ordens');

  // Editing state
  const [editingSolicitacao, setEditingSolicitacao] = useState<SolicitacaoCompra | null>(null);
  const [editingOrdem, setEditingOrdem] = useState<any | null>(null);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  // Modals
  const [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  const [showOrdemModal, setShowOrdemModal] = useState(false);
  const [showFornecedorModal, setShowFornecedorModal] = useState(false);
  const [solicitacaoItens, setSolicitacaoItens] = useState<{ estoqueItemId?: string; descricao: string; quantidade: number; unidade: string }[]>([]);
  const [ordemItens, setOrdemItens] = useState<{ estoqueItemId?: string; descricao: string; quantidade: number; unidade: string; precoUnitario: number; subtotal: number }[]>([]);
  // Valor total da ordem: sempre calculado pelos itens (quantidade × preço unitário).
  const totalOrdemItens = ordemItens.reduce((sum, i) => sum + (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0), 0);

  // Filtros - Solicitações de Compra
  const [filtroSolAno, setFiltroSolAno] = useState('TODOS');
  const [filtroSolMes, setFiltroSolMes] = useState('TODOS');
  const [filtroSolStatus, setFiltroSolStatus] = useState('TODOS');
  const [filtroSolPrioridade, setFiltroSolPrioridade] = useState('TODOS');

  const solAnosDisponiveis = useMemo(() => {
    const anos: string[] = Array.from(new Set(solicitacoesCompra.map(s => (s.dataSolicitacao || '').substring(0, 4)).filter(Boolean)));
    return anos.sort((a, b) => b.localeCompare(a));
  }, [solicitacoesCompra]);
  const solStatusDisponiveis = useMemo(() => {
    return Array.from(new Set(solicitacoesCompra.map(s => s.status).filter(Boolean)));
  }, [solicitacoesCompra]);

  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoesCompra.filter(s => {
      if (filtroSolAno !== 'TODOS' && (s.dataSolicitacao || '').substring(0, 4) !== filtroSolAno) return false;
      if (filtroSolMes !== 'TODOS' && (s.dataSolicitacao || '').substring(5, 7) !== filtroSolMes) return false;
      if (filtroSolStatus !== 'TODOS' && s.status !== filtroSolStatus) return false;
      if (filtroSolPrioridade !== 'TODOS' && s.prioridade !== filtroSolPrioridade) return false;
      return true;
    });
  }, [solicitacoesCompra, filtroSolAno, filtroSolMes, filtroSolStatus, filtroSolPrioridade]);

  const limparFiltrosSolicitacoes = () => {
    setFiltroSolAno('TODOS');
    setFiltroSolMes('TODOS');
    setFiltroSolStatus('TODOS');
    setFiltroSolPrioridade('TODOS');
  };

  // Filtros - Ordens de Compra
  const [filtroOrdAno, setFiltroOrdAno] = useState('TODOS');
  const [filtroOrdMes, setFiltroOrdMes] = useState('TODOS');
  const [filtroOrdStatus, setFiltroOrdStatus] = useState('TODOS');
  const [filtroOrdFornecedorId, setFiltroOrdFornecedorId] = useState('TODOS');

  const ordAnosDisponiveis = useMemo(() => {
    const anos: string[] = Array.from(new Set(ordensCompra.map(o => (o.dataEmissao || '').substring(0, 4)).filter(Boolean)));
    return anos.sort((a, b) => b.localeCompare(a));
  }, [ordensCompra]);
  const ordStatusDisponiveis = useMemo(() => {
    return Array.from(new Set(ordensCompra.map(o => o.status).filter(Boolean)));
  }, [ordensCompra]);

  const ordensFiltradas = useMemo(() => {
    return ordensCompra.filter(o => {
      if (filtroOrdAno !== 'TODOS' && (o.dataEmissao || '').substring(0, 4) !== filtroOrdAno) return false;
      if (filtroOrdMes !== 'TODOS' && (o.dataEmissao || '').substring(5, 7) !== filtroOrdMes) return false;
      if (filtroOrdStatus !== 'TODOS' && o.status !== filtroOrdStatus) return false;
      if (filtroOrdFornecedorId !== 'TODOS' && o.fornecedorId !== filtroOrdFornecedorId) return false;
      return true;
    });
  }, [ordensCompra, filtroOrdAno, filtroOrdMes, filtroOrdStatus, filtroOrdFornecedorId]);

  const limparFiltrosOrdens = () => {
    setFiltroOrdAno('TODOS');
    setFiltroOrdMes('TODOS');
    setFiltroOrdStatus('TODOS');
    setFiltroOrdFornecedorId('TODOS');
  };

  // Forms
  const [solicitacaoForm, setSolicitacaoForm] = useState({
    departamentoSolicitante: 'LOGISTICA_E_EMBALAGEM',
    itemDescricao: '',
    quantidade: 100,
    unidadeMedida: 'UNIDADE',
    prioridade: 'MEDIA' as 'BAIXA' | 'MEDIA' | 'ALTA',
    valorEstimado: 2500,
    justificativa: ''
  });

  const [ordemForm, setOrdemForm] = useState({
    ...OC_PAGTO_PADRAO(),
    numeroOrdem: `OC-${Date.now().toString().slice(-5)}`,
    solicitacaoId: '',
    fornecedorId: '',
    fornecedorNome: '',
    itemDescricao: 'Caixas de Papelão PNAE 20kg',
    quantidade: 100,
    unidadeMedida: 'UN',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataPrevisaoEntrega: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
    valorTotal: 3500,
    condicoesPagamento: '30 Dias Fatura Boleto',
    observacoes: 'Entregar no Galpão Central da Cooperativa em Caixas Identificadas.'
  });

  const [fornecedorForm, setFornecedorForm] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    categoria: 'EMBALAGENS' as any,
    contatoNome: '',
    telefone: '',
    email: '',
    tipoPessoa: 'PJ' as 'PF' | 'PJ',
    inscricaoEstadual: '',
    cidadeUf: ''
  });

  // Consulta na Receita Federal
  const [consultaCnpj, setConsultaCnpj] = useState<DadosCnpjReceita | null>(null);
  const [consultandoDoc, setConsultandoDoc] = useState(false);
  const [mensagemDoc, setMensagemDoc] = useState<{ tipo: 'erro' | 'info'; texto: string } | null>(null);

  const handleVerificarDocumento = async () => {
    setMensagemDoc(null);
    const doc = somenteDigitos(fornecedorForm.cnpj);
    if (fornecedorForm.tipoPessoa === 'PF') {
      if (!cpfValido(doc)) {
        setMensagemDoc({ tipo: 'erro', texto: 'CPF inválido. Confira os números digitados.' });
        return;
      }
      try { await navigator.clipboard.writeText(doc); } catch { /* sem permissão de área de transferência */ }
      window.open(URL_RECEITA_CPF, 'receitaCpf', 'width=900,height=760');
      setMensagemDoc({
        tipo: 'info',
        texto: 'CPF válido. O CPF foi copiado: cole no site da Receita, informe a data de nascimento e resolva o captcha para ver a situação cadastral.'
      });
      return;
    }
    if (!cnpjValido(doc)) {
      setMensagemDoc({ tipo: 'erro', texto: 'CNPJ inválido. Confira os números digitados.' });
      return;
    }
    setConsultandoDoc(true);
    try {
      setConsultaCnpj(await consultarCnpjReceita(doc));
    } catch (err: any) {
      setMensagemDoc({ tipo: 'erro', texto: err?.message || 'Não foi possível consultar o CNPJ na Receita.' });
    } finally {
      setConsultandoDoc(false);
    }
  };

  const handleUsarDadosReceita = () => {
    if (!consultaCnpj) return;
    const d = consultaCnpj;
    setFornecedorForm(prev => ({
      ...prev,
      tipoPessoa: 'PJ',
      cnpj: formatarDocumento(d.cnpj || prev.cnpj, 'PJ'),
      razaoSocial: d.razaoSocial || prev.razaoSocial,
      nomeFantasia: d.nomeFantasia || prev.nomeFantasia,
      telefone: d.telefone || prev.telefone,
      email: d.email || prev.email,
      inscricaoEstadual: d.inscricaoEstadual || prev.inscricaoEstadual,
      cidadeUf: d.cidade ? `${d.cidade}/${d.estado}` : prev.cidadeUf
    }));
    setConsultaCnpj(null);
    setMensagemDoc({ tipo: 'info', texto: 'Dados da Receita aplicados ao cadastro.' });
  };

  // Handlers
  const handleOpenSolicitacao = (s?: SolicitacaoCompra) => {
        if (!canWrite) { blockWriteAction(); return; }
if (s) {
      setEditingSolicitacao(s);
      setSolicitacaoForm({
        departamentoSolicitante: s.departamentoSolicitante || 'LOGISTICA_E_EMBALAGEM',
        itemDescricao: s.itemDescricao || '',
        quantidade: s.quantidade || 100,
        unidadeMedida: s.unidadeMedida || 'UN',
        prioridade: s.prioridade || 'MEDIA',
        valorEstimado: s.valorEstimado || 0,
        justificativa: s.justificativa || ''
      });
      setSolicitacaoItens(s.itens?.length ? s.itens : [{ descricao: s.itemDescricao || '', quantidade: s.quantidade || 1, unidade: s.unidadeMedida || 'UN' }]);
    } else {
      setEditingSolicitacao(null);
      setSolicitacaoForm({
        departamentoSolicitante: 'LOGISTICA_E_EMBALAGEM',
        itemDescricao: '',
        quantidade: 100,
        unidadeMedida: 'UN',
        prioridade: 'MEDIA',
        valorEstimado: 2500,
        justificativa: 'Aquisição preventiva para operações do PAA/PNAE'
      });
      setSolicitacaoItens([{ descricao: '', quantidade: 1, unidade: 'UN' }]);
      setSolicitacaoItens([{ descricao: '', quantidade: 1, unidade: 'UN' }]);
    }
    setShowSolicitacaoModal(true);
  };

  const handleSaveSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    const itens = solicitacaoItens.filter(i => i.descricao.trim() && i.quantidade > 0);
    if (!itens.length) return;
    const primeiro = itens[0];
    if (editingSolicitacao) {
      updateSolicitacaoCompra(editingSolicitacao.id, { ...solicitacaoForm, itemDescricao: primeiro.descricao, quantidade: primeiro.quantidade, unidadeMedida: primeiro.unidade, itens });
    } else {
      addSolicitacaoCompra({
        ...solicitacaoForm,
        itemDescricao: primeiro.descricao,
        quantidade: primeiro.quantidade,
        unidadeMedida: primeiro.unidade,
        itens,
        dataSolicitacao: new Date().toISOString().split('T')[0],
        status: 'ABERTA'
      });
    }
    setShowSolicitacaoModal(false);
  };

  const handleOpenOrdem = (o?: any) => {
        if (!canWrite) { blockWriteAction(); return; }
if (o) {
      setEditingOrdem(o);
      const firstItem = (o.itens && o.itens.length > 0) ? o.itens[0] : null;
      setOrdemForm({
        ...OC_PAGTO_PADRAO(),
        numeroOrdem: o.numeroOrdem,
        tipoCompra: o.tipoCompra || 'INSUMOS',
        formaPagamento: o.formaPagamento || 'PIX',
        numeroParcelas: o.numeroParcelas || 1,
        intervaloDias: o.intervaloDias || 30,
        primeiroVencimento: o.primeiroVencimento || o.dataPrevisaoEntrega || o.dataEmissao,
        solicitacaoId: o.solicitacaoId || '',
        fornecedorId: o.fornecedorId,
        fornecedorNome: o.fornecedorNome,
        itemDescricao: firstItem?.descricao || firstItem?.descricaoItem || o.observacoes || 'Insumos Agrícolas / Embalagens',
        quantidade: firstItem?.quantidade || 100,
        unidadeMedida: firstItem?.unidade || 'UN',
        dataEmissao: o.dataEmissao,
        dataPrevisaoEntrega: o.dataPrevisaoEntrega,
        valorTotal: o.valorTotal,
        condicoesPagamento: o.condicoesPagamento || o.condicaoPagamento || '30 Dias Fatura Boleto',
        observacoes: o.observacoes || ''
      });
      setOrdemItens(o.itens?.length ? o.itens : [{ descricao: firstItem?.descricao || '', quantidade: firstItem?.quantidade || 1, unidade: firstItem?.unidade || 'UN', precoUnitario: firstItem?.precoUnitario || 0, subtotal: firstItem?.subtotal || 0 }]);
    } else {
      setEditingOrdem(null);
      const fPadrao = fornecedores[0];
      setOrdemForm({
        ...OC_PAGTO_PADRAO(),
        numeroOrdem: `OC-${Date.now().toString().slice(-5)}`,
        solicitacaoId: '',
        fornecedorId: fPadrao?.id || 'f-1',
        fornecedorNome: fPadrao?.razaoSocial || 'Fornecedor Agro Insumos LTDA',
        itemDescricao: 'Caixas de Papelão PNAE 20kg',
        quantidade: 100,
        unidadeMedida: 'UN',
        dataEmissao: new Date().toISOString().split('T')[0],
        dataPrevisaoEntrega: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
        valorTotal: 3500,
        condicoesPagamento: '30 Dias Fatura Boleto',
        observacoes: 'Entregar no Galpão Central da Cooperativa em Caixas Identificadas.'
      });
      setOrdemItens([{ descricao: '', quantidade: 1, unidade: 'UN', precoUnitario: 0, subtotal: 0 }]);
    }
    setShowOrdemModal(true);
  };

  const handleConvertSolicitacaoToOrdem = (s: SolicitacaoCompra) => {
        if (!canWrite) { blockWriteAction(); return; }
const fPadrao = fornecedores[0];
    setEditingOrdem(null);
    setOrdemForm({
      ...OC_PAGTO_PADRAO(),
      numeroOrdem: `OC-${Date.now().toString().slice(-5)}`,
      solicitacaoId: s.id,
      fornecedorId: fPadrao?.id || 'f-1',
      fornecedorNome: fPadrao?.razaoSocial || 'Fornecedor Agro Insumos LTDA',
      itemDescricao: s.itemDescricao || 'Insumos Solicitados',
      quantidade: s.quantidade || 100,
      unidadeMedida: s.unidadeMedida || 'UN',
      dataEmissao: new Date().toISOString().split('T')[0],
      dataPrevisaoEntrega: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
      valorTotal: s.valorEstimado || 2500,
      condicoesPagamento: '30 Dias Fatura Boleto',
      observacoes: `Solicitação #${s.numeroSolicitacao || s.id} - ${s.justificativa || ''}`
    });
    setOrdemItens((s.itens?.length ? s.itens : [{ descricao: s.itemDescricao || 'Insumos Solicitados', quantidade: s.quantidade || 1, unidade: s.unidadeMedida || 'UN' }]).map(i => ({ ...i, precoUnitario: 0, subtotal: 0 })));
    updateSolicitacaoCompra(s.id, { status: 'EM_COTACAO' });
    setShowOrdemModal(true);
  };
  // Envia a ordem de compra ao fornecedor pelo WhatsApp (mensagem pronta).
  const enviarWhatsAposSalvar = useRef(false);
  const enviarOrdemWhatsApp = (o: any) => {
    const forn = fornecedores.find(f => f.id === o.fornecedorId) || fornecedores.find(f => f.razaoSocial === o.fornecedorNome);
    const texto = mensagemOrdemCompra({
      cooperativa: currentTenant?.name || currentTenant?.razaoSocial || 'Cooperativa',
      numeroOrdem: o.numeroOrdem,
      fornecedor: o.fornecedorNome,
      dataEmissao: o.dataEmissao,
      dataPrevisaoEntrega: o.dataPrevisaoEntrega,
      itens: (o.itens || []).map((i: any) => ({
        descricao: i.descricao,
        quantidade: Number(i.quantidade) || 0,
        unidade: i.unidade || 'UN',
        precoUnitario: Number(i.precoUnitario) || 0,
        subtotal: Number(i.subtotal) || (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0)
      })),
      valorTotal: Number(o.valorTotal) || 0,
      formaPagamento: o.formaPagamento,
      numeroParcelas: o.numeroParcelas,
      intervaloDias: o.intervaloDias,
      primeiroVencimento: o.primeiroVencimento,
      observacoes: o.observacoes
    });
    const tel = getTelefoneContato(forn);
    if (!tel && !confirm('Este fornecedor não tem telefone cadastrado. Abrir o WhatsApp para escolher o contato manualmente?')) return;
    abrirLinkExterno(tel ? montarLinkWhatsApp(tel, texto) : montarLinkWhatsAppGenerico(texto));
  };

  const descricaoPagamentoOC = (f: { formaPagamento?: string; numeroParcelas?: number; condicoesPagamento?: string }) =>
    `${rotuloFormaPagamento(f.formaPagamento)} ${(f.numeroParcelas || 1) > 1 ? `${f.numeroParcelas}x` : 'à vista'}${f.condicoesPagamento ? ` — ${f.condicoesPagamento}` : ''}`;

  const handleSaveOrdem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    const itens = ordemItens.filter(i => i.descricao.trim() && i.quantidade > 0).map(i => ({ ...i, subtotal: i.quantidade * i.precoUnitario }));
    if (!ordemForm.fornecedorNome || !itens.length) return;
    const valorTotal = itens.reduce((sum, i) => sum + i.subtotal, 0);
    if (editingOrdem) {
      updateOrdemCompra(editingOrdem.id, {
        ...ordemForm,
        valorTotal,
        itens
      });
    } else {
      addOrdemCompra({
        ...ordemForm,
        valorTotal,
        condicaoPagamento: descricaoPagamentoOC(ordemForm),
        status: 'APROVADA',
        itens
      });
    }
    if (enviarWhatsAposSalvar.current) enviarOrdemWhatsApp({ ...ordemForm, valorTotal, itens });
    enviarWhatsAposSalvar.current = false;
    setShowOrdemModal(false);
  };

  const handleOpenFornecedor = (f?: Fornecedor) => {
        if (!canWrite) { blockWriteAction(); return; }
if (f) {
      setEditingFornecedor(f);
      setFornecedorForm({
        razaoSocial: f.razaoSocial,
        nomeFantasia: f.nomeFantasia || f.razaoSocial,
        cnpj: f.cnpj,
        categoria: f.categoria,
        contatoNome: f.contatoNome || '',
        telefone: f.telefone || '',
        email: f.email || '',
        tipoPessoa: f.tipoPessoa || tipoPessoaDoDocumento(f.cnpj),
        inscricaoEstadual: f.inscricaoEstadual || '',
        cidadeUf: f.cidadeUf || ''
      });
    } else {
      setEditingFornecedor(null);
      setFornecedorForm({
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        categoria: 'EMBALAGENS',
        contatoNome: '',
        telefone: '(88) 98888-0000',
        email: '',
        tipoPessoa: 'PJ',
        inscricaoEstadual: '',
        cidadeUf: ''
      });
    }
    setMensagemDoc(null);
    setConsultaCnpj(null);
    setShowFornecedorModal(true);
  };

  const handleSaveFornecedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!fornecedorForm.razaoSocial || !fornecedorForm.cnpj) return;
    const docValido = fornecedorForm.tipoPessoa === 'PF'
      ? cpfValido(fornecedorForm.cnpj)
      : cnpjValido(fornecedorForm.cnpj);
    if (!docValido) {
      alert(`${fornecedorForm.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'} inválido. Confira os números digitados.`);
      return;
    }
    if (editingFornecedor) {
      updateFornecedor(editingFornecedor.id, fornecedorForm);
    } else {
      addFornecedor({
        ...fornecedorForm,
        statusHomologacao: 'HOMOLOGADO'
      });
    }
    setShowFornecedorModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <ShoppingCart className="w-3.5 h-3.5" /> Suprimentos & Insumos da Cooperativa
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Compras & Insumos Agrícolas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de pedidos de compra coletiva, sementes, defensivos, embalagens para escoamento da safra e homologação de fornecedores agropecuários.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'ordens' && (
            <button
              onClick={() => handleOpenOrdem()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Emissão de Ordem de Compra
            </button>
          )}
          {activeTab === 'fornecedores' && (
            <button
              onClick={() => handleOpenFornecedor()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Fornecedor Homologado
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ordens')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'ordens'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-emerald-600" /> Ordens de Compra OC ({ordensCompra.length})
        </button>
          <button
            onClick={() => setActiveTab('produtos')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'produtos'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" /> Produtos & Insumos ({estoque.length})
          </button>
        <button
          onClick={() => setActiveTab('fornecedores')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'fornecedores'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" /> Fornecedores Homologados ({fornecedores.length})
        </button>
      </div>

      {/* Tab Ordens de Compra */}
      {activeTab === 'ordens' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Ano</label>
              <select value={filtroOrdAno} onChange={e => setFiltroOrdAno(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {ordAnosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Mês</label>
              <select value={filtroOrdMes} onChange={e => setFiltroOrdMes(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {MESES_LABEL.map((nome, idx) => <option key={nome} value={String(idx + 1).padStart(2, '0')}>{nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Status</label>
              <select value={filtroOrdStatus} onChange={e => setFiltroOrdStatus(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                <option value="TODOS">Todos</option>
                {ordStatusDisponiveis.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Fornecedor</label>
              <select value={filtroOrdFornecedorId} onChange={e => setFiltroOrdFornecedorId(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white max-w-[220px]">
                <option value="TODOS">Todos</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nomeFantasia || f.razaoSocial}</option>)}
              </select>
            </div>
            <button onClick={limparFiltrosOrdens} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
            <span className="text-[11px] text-slate-400 font-semibold ml-auto">
              {ordensFiltradas.length} de {ordensCompra.length} registro(s)
            </span>
          </div>

          <DataGrid
              rows={ordensFiltradas}
              getRowId={o => o.id}
              pageSize={20}
              onRowDoubleClick={o => handleOpenOrdem(o)}
              panelTitle={o => `OC ${o.numeroOrdem}`}
              panelSubtitle={o => o.fornecedorNome}
              emptyMessage="Nenhuma ordem de compra encontrada para os filtros selecionados."
              columns={[
                {
                  key: 'status',
                  header: 'Status OC',
                  width: 130,
                  render: o => <GridStatus tone={/RECEB|CONCLU|ENTREG/i.test(String(o.status)) ? 'success' : /CANCEL/i.test(String(o.status)) ? 'danger' : 'warning'} label={o.status} />,
                },
                { key: 'numeroOrdem', header: 'Nº Ordem', width: 110 },
                { key: 'fornecedorNome', header: 'Fornecedor', width: 220 },
              { key: 'tipoCompra', header: 'Tipo', width: 100, value: o => (o.tipoCompra === 'REVENDA' ? 'Revenda' : 'Insumos') },
                { key: 'itens', header: 'Itens', width: 80, align: 'right', value: o => o.itens?.length || 0 },
                { key: 'origem', header: 'Origem', width: 150, value: o => (o.solicitacaoId ? 'Solicitação' : 'Compra avulsa') },
                { key: 'dataEmissao', header: 'Emissão', width: 110, value: o => o.dataEmissao, render: o => formatarData(o.dataEmissao) },
                { key: 'dataPrevisaoEntrega', header: 'Prev. Entrega', width: 120, value: o => o.dataPrevisaoEntrega, render: o => (o.dataPrevisaoEntrega ? formatarData(o.dataPrevisaoEntrega) : null) },
                { key: 'condicoesPagamento', header: 'Pagamento', width: 170, value: o => (o.formaPagamento ? descricaoPagamentoOC({ formaPagamento: o.formaPagamento, numeroParcelas: o.numeroParcelas }) : ((o as any).condicoesPagamento || o.condicaoPagamento || '')) },
                {
                  key: 'valorTotal',
                  header: 'Valor Total',
                  width: 130,
                  align: 'right',
                  value: o => o.valorTotal || 0,
                  render: o => (o.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                },
              ]}
              actions={[
                { label: 'Editar', icon: Pencil, onClick: o => handleOpenOrdem(o) },
                { label: 'Enviar ao fornecedor (WhatsApp)', icon: MessageCircle, onClick: o => enviarOrdemWhatsApp(o) },
                {
                  label: 'Excluir',
                  icon: Trash2,
                  tone: 'danger',
                  divider: true,
                  onClick: o => {
                    if (!canWrite) { blockWriteAction(); return; }
                    if (confirm(`Deseja excluir a ordem de compra ${o.numeroOrdem}?`)) deleteOrdemCompra(o.id);
                  },
                },
              ]}
            />
        </div>
      )}

      {/* Tab Produtos & Insumos */}

      {activeTab === 'produtos' && <ProdutosTab canWrite={canWrite} onBlocked={blockWriteAction} />}




      

      


      
{/* Tab Fornecedores */}
      {activeTab === 'fornecedores' && (
        <DataGrid
          rows={fornecedores}
          getRowId={f => f.id}
          onRowDoubleClick={f => handleOpenFornecedor(f)}
          panelTitle={f => f.razaoSocial}
          panelSubtitle={f => f.cnpj}
          emptyMessage="Nenhum fornecedor cadastrado."
          columns={[
            { key: 'razaoSocial', header: 'Razão Social', width: 260 },
            { key: 'nomeFantasia', header: 'Nome Fantasia', width: 200 },
            { key: 'tipoPessoa', header: 'PF/PJ', width: 80, value: (f: Fornecedor) => f.tipoPessoa || tipoPessoaDoDocumento(f.cnpj) },
              { key: 'cnpj', header: 'CPF/CNPJ', width: 160 },
              { key: 'inscricaoEstadual', header: 'Insc. Estadual', width: 140 },
            { key: 'categoria', header: 'Categoria', width: 150 },
            { key: 'contatoNome', header: 'Contato', width: 170 },
            { key: 'telefone', header: 'Telefone', width: 140 },
          ]}
          actions={[
            { label: 'Editar', icon: Pencil, onClick: f => handleOpenFornecedor(f) },
            {
              label: 'Excluir',
              icon: Trash2,
              tone: 'danger',
              divider: true,
              onClick: f => {
                if (!canWrite) { blockWriteAction(); return; }
                if (confirm(`Deseja excluir o fornecedor ${f.razaoSocial}?`)) deleteFornecedor(f.id);
              },
            },
          ]}
        />
      )}

      {/* Modal Ordem de Compra */}
      {showOrdemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                {editingOrdem ? 'Editar Ordem de Compra' : 'Emissão de Ordem de Compra (OC)'}
              </h2>
              <button onClick={() => setShowOrdemModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOrdem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nº da Ordem (OC) *</label>
                  <input
                    type="text"
                    required
                    value={ordemForm.numeroOrdem}
                    onChange={e => setOrdemForm({ ...ordemForm, numeroOrdem: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fornecedor *</label>
                  <select
                    value={ordemForm.fornecedorNome}
                    onChange={e => { const fSel = fornecedores.find(x => x.razaoSocial === e.target.value); setOrdemForm({ ...ordemForm, fornecedorNome: e.target.value, fornecedorId: fSel?.id || ordemForm.fornecedorId }); }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  >
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.razaoSocial}>
                        {f.razaoSocial} ({f.categoria})
                      </option>
                    ))}
                    {fornecedores.length === 0 && (
                      <option value="Fornecedor Agro Insumos LTDA">Fornecedor Agro Insumos LTDA</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between"><div><div className="text-xs font-extrabold text-slate-800">Itens da ordem de compra</div><div className="text-[10px] text-slate-500">Os produtos são sempre selecionados do SisEstoque.</div></div><button type="button" onClick={() => setOrdemItens([...ordemItens, { descricao: '', quantidade: 1, unidade: 'UN', precoUnitario: 0, subtotal: 0 }])} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold">+ Adicionar item</button></div>
                <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[620px] text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-2 py-2 text-left font-bold w-8">#</th>
                        <th className="px-2 py-2 text-left font-bold">Produto do estoque</th>
                        <th className="px-2 py-2 text-right font-bold w-20">Qtd.</th>
                        <th className="px-2 py-2 text-left font-bold w-16">Unid.</th>
                        <th className="px-2 py-2 text-right font-bold w-28">Preço unitário</th>
                        <th className="px-2 py-2 text-right font-bold w-28">Subtotal</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ordemItens.map((item, index) => (
                        <tr key={index}>
                          <td className="px-2 py-1.5 font-bold text-slate-400">{index + 1}</td>
                          <td className="px-2 py-1.5">
                            <select required value={item.estoqueItemId || ''} onChange={e => { const p = estoque.find(x => x.id === e.target.value); setOrdemItens(ordemItens.map((x, i) => i === index ? { ...x, estoqueItemId: p?.id, descricao: p?.nomeItem || '', unidade: p?.unidadeMedida || x.unidade } : x)); }} className="w-full p-1.5 border border-slate-200 rounded-lg bg-white">
                              <option value="">Selecione um produto</option>
                              {estoque.map(p => <option key={p.id} value={p.id}>{p.codigoSku || p.codigoItem || '—'} — {p.nomeItem}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="1" step="any" required value={item.quantidade} onChange={e => setOrdemItens(ordemItens.map((x, i) => i === index ? { ...x, quantidade: Number(e.target.value) || 0 } : x))} className="w-full p-1.5 border border-slate-200 rounded-lg text-right" />
                          </td>
                          <td className="px-2 py-1.5 text-slate-600 font-semibold">{item.unidade}</td>
                          <td className="px-2 py-1.5">
                            <input type="number" min="0" step="0.01" required value={item.precoUnitario} onChange={e => setOrdemItens(ordemItens.map((x, i) => i === index ? { ...x, precoUnitario: Number(e.target.value) || 0 } : x))} className="w-full p-1.5 border border-slate-200 rounded-lg text-right" />
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold text-slate-700 whitespace-nowrap">{formatarMoeda((Number(item.quantidade) || 0) * (Number(item.precoUnitario) || 0))}</td>
                          <td className="px-1 py-1.5 text-center">
                            <button type="button" title="Remover item" onClick={() => setOrdemItens(ordemItens.filter((_, i) => i !== index))} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50">×</button>
                          </td>
                        </tr>
                      ))}
                      {ordemItens.length === 0 && (
                        <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-400">Nenhum item. Clique em “+ Adicionar item”.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="text-right font-black text-emerald-700">Total calculado: R$ {totalOrdemItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data de Emissão *</label>
                  <input
                    type="date"
                    required
                    value={ordemForm.dataEmissao}
                    onChange={e => setOrdemForm({ ...ordemForm, dataEmissao: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Previsão de Entrega *</label>
                  <input
                    type="date"
                    required
                    value={ordemForm.dataPrevisaoEntrega}
                    onChange={e => setOrdemForm({ ...ordemForm, dataPrevisaoEntrega: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor Total (R$) — calculado pelos itens</label>
                  <input
                    type="text"
                    readOnly
                    value={formatarMoeda(totalOrdemItens)}
                    title="Calculado automaticamente: quantidade × preço unitário de cada item"
                    className="w-full p-2.5 border border-emerald-300 rounded-xl font-bold text-emerald-900 bg-emerald-50/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Condições de Pagamento</label>
                  <input
                    type="text"
                    value={ordemForm.condicoesPagamento}
                    onChange={e => setOrdemForm({ ...ordemForm, condicoesPagamento: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    placeholder="Ex: 30 Dias Fatura Boleto"
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="text-xs font-extrabold text-slate-800">Tipo de compra e pagamento</div>
                <div className="flex gap-2">
                  {([['INSUMOS', 'Insumos / uso próprio'], ['REVENDA', 'Produtos para revenda']] as const).map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setOrdemForm({ ...ordemForm, tipoCompra: valor })}
                      className={`flex-1 p-2.5 rounded-xl border font-bold transition-all ${ordemForm.tipoCompra === valor ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Forma de pagamento *</label>
                    <select value={ordemForm.formaPagamento} onChange={e => setOrdemForm({ ...ordemForm, formaPagamento: e.target.value as FormaPagamentoComercial })} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold">
                      {FORMAS_PAGAMENTO_COMERCIAL.map(f => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Parcelamento</label>
                    <select value={ordemForm.numeroParcelas} onChange={e => setOrdemForm({ ...ordemForm, numeroParcelas: Number(e.target.value) || 1 })} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n === 1 ? 'À vista (1x)' : `${n}x`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{ordemForm.numeroParcelas > 1 ? '1º vencimento' : 'Vencimento'}</label>
                    <input type="date" value={ordemForm.primeiroVencimento} onChange={e => setOrdemForm({ ...ordemForm, primeiroVencimento: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Intervalo (dias)</label>
                    <input type="number" min="0" disabled={ordemForm.numeroParcelas === 1} value={ordemForm.intervaloDias} onChange={e => setOrdemForm({ ...ordemForm, intervaloDias: Number(e.target.value) || 0 })} className="w-full p-2.5 border border-slate-200 rounded-xl disabled:bg-slate-100" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  {gerarParcelas(totalOrdemItens, ordemForm.numeroParcelas, ordemForm.primeiroVencimento, ordemForm.intervaloDias).map((p, _i, todas) => (
                    <div key={p.numero} className="flex justify-between border-t border-slate-100 pt-0.5">
                      <span>{todas.length > 1 ? `Parcela ${p.numero}/${todas.length}` : 'Parcela única'} — venc. {dataBR(p.vencimento)}</span>
                      <span className="font-bold">{formatarMoeda(p.valor)}</span>
                    </div>
                  ))}
                </div>
                {editingOrdem && (
                  <div className="text-[11px] text-amber-700">As parcelas do Contas a Pagar são geradas na emissão da ordem; alterar o pagamento aqui não refaz as parcelas já lançadas.</div>
                )}
              </div>

              
<div>
                <label className="block text-slate-700 font-bold mb-1">Observações de Logística / Destino</label>
                <input
                  type="text"
                  value={ordemForm.observacoes}
                  onChange={e => setOrdemForm({ ...ordemForm, observacoes: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Instruções de entrega e local de descarregamento"
                />
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                <div>✨ <strong>Integração Automática SisEstoque & SisFin:</strong></div>
                <ul className="list-disc list-inside text-emerald-700 space-y-0.5">
                  <li><strong>SisEstoque:</strong> Credita automaticamente <strong>{ordemItens.filter(i => i.estoqueItemId && i.quantidade > 0).map(i => `${i.quantidade} ${i.unidade} de ${i.descricao}`).join(', ') || 'os itens selecionados'}</strong> com registro de movimentação de entrada{editingOrdem ? ' (na edição, só a diferença de quantidade é ajustada)' : ''}.</li>
                  <li><strong>SisFin (Financeiro):</strong> Gera {ordemForm.numeroParcelas > 1 ? `${ordemForm.numeroParcelas} parcelas` : 'uma conta'} a pagar de <strong>{formatarMoeda(totalOrdemItens)}</strong> ({rotuloFormaPagamento(ordemForm.formaPagamento)}{ordemForm.tipoCompra === 'REVENDA' ? ', mercadorias para revenda' : ''}) para o fornecedor <i>{ordemForm.fornecedorNome}</i>.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOrdemModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={() => { enviarWhatsAposSalvar.current = true; }}
                  className="px-4 py-2 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 shadow-sm flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" /> Salvar e enviar ao fornecedor (WhatsApp)
                </button>
                <button
                  type="submit"
                  onClick={() => { enviarWhatsAposSalvar.current = false; }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-sm"
                >
                  Emitir e Enviar ao Financeiro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fornecedor */}
      {showFornecedorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor Homologado'}
              </h2>
              <button onClick={() => setShowFornecedorModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFornecedor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">{fornecedorForm.tipoPessoa === 'PF' ? 'Nome Completo *' : 'Razão Social *'}</label>
                <input
                  type="text"
                  required
                  value={fornecedorForm.razaoSocial}
                  onChange={e => setFornecedorForm({ ...fornecedorForm, razaoSocial: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Embalagens do Nordeste LTDA"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tipo de Pessoa *</label>
                <div className="flex gap-2">
                  {(['PJ', 'PF'] as const).map(tp => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => {
                        setMensagemDoc(null);
                        setFornecedorForm({ ...fornecedorForm, tipoPessoa: tp, cnpj: formatarDocumento(fornecedorForm.cnpj, tp) });
                      }}
                      className={`flex-1 p-2.5 rounded-xl border font-bold transition-all ${fornecedorForm.tipoPessoa === tp ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {tp === 'PJ' ? 'Pessoa Jurídica (CNPJ)' : 'Pessoa Física (CPF)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">{fornecedorForm.tipoPessoa === 'PF' ? 'CPF *' : 'CNPJ *'}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    value={fornecedorForm.cnpj}
                    onChange={e => {
                      setMensagemDoc(null);
                      setFornecedorForm({ ...fornecedorForm, cnpj: formatarDocumento(e.target.value, fornecedorForm.tipoPessoa) });
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    placeholder={fornecedorForm.tipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                  />
                  <button
                    type="button"
                    onClick={handleVerificarDocumento}
                    disabled={consultandoDoc}
                    className="shrink-0 flex items-center gap-1.5 px-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 disabled:opacity-60"
                    title="Verificar na Receita Federal"
                  >
                    <Search className="w-3.5 h-3.5" />
                    {consultandoDoc ? 'Consultando...' : 'Verificar na Receita'}
                  </button>
                </div>
                {mensagemDoc && (
                  <p className={`mt-1 ${mensagemDoc.tipo === 'erro' ? 'text-rose-600' : 'text-emerald-700'}`}>{mensagemDoc.texto}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Inscrição Estadual</label>
                <input
                  type="text"
                  value={fornecedorForm.inscricaoEstadual}
                  onChange={e => setFornecedorForm({ ...fornecedorForm, inscricaoEstadual: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Número da IE ou ISENTO"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pessoa de Contato</label>
                  <input
                    type="text"
                    value={fornecedorForm.contatoNome}
                    onChange={e => setFornecedorForm({ ...fornecedorForm, contatoNome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={fornecedorForm.telefone}
                    onChange={e => setFornecedorForm({ ...fornecedorForm, telefone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFornecedorModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Popup: dados do CNPJ na Receita Federal */}
      {consultaCnpj && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setConsultaCnpj(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Dados do CNPJ na Receita Federal</h3>
                <p className="text-xs text-slate-500">Fonte: {consultaCnpj.fonte || 'base pública da Receita'}</p>
              </div>
              <button type="button" onClick={() => setConsultaCnpj(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Situação cadastral:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${/ATIVA/i.test(consultaCnpj.situacaoCadastral) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {consultaCnpj.situacaoCadastral || 'Não informada'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['CNPJ', formatarDocumento(consultaCnpj.cnpj, 'PJ')],
                  ['Razão Social', consultaCnpj.razaoSocial],
                  ['Nome Fantasia', consultaCnpj.nomeFantasia],
                  ['Inscrição Estadual', consultaCnpj.inscricaoEstadual],
                  ['Telefone', consultaCnpj.telefone],
                  ['E-mail', consultaCnpj.email],
                  ['Endereço', [consultaCnpj.logradouro, consultaCnpj.numero, consultaCnpj.complemento].filter(Boolean).join(', ')],
                  ['Bairro', consultaCnpj.bairro],
                  ['Cidade/UF', consultaCnpj.cidade ? `${consultaCnpj.cidade}/${consultaCnpj.estado}` : ''],
                  ['CEP', consultaCnpj.cep]
                ] as [string, string][]).map(([rotulo, valor]) => (
                  <div key={rotulo} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{rotulo}</div>
                    <div className="text-slate-800 font-semibold break-words">{valor || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 p-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.open(URL_RECEITA_CNPJ, 'receitaCnpj', 'width=900,height=760')}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Comprovante no site da Receita
              </button>
              <button type="button" onClick={() => setConsultaCnpj(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50">
                Fechar
              </button>
              <button type="button" onClick={handleUsarDadosReceita} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                Usar estes dados no cadastro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
