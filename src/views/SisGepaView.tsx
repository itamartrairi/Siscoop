import { formatarData } from '../utils/dateHelpers';
import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from '@e965/xlsx';
import { useCoop } from '../context/CoopContext';
import {
  Landmark,
  Plus,
  FileCheck,
  Truck,
  FileSpreadsheet,
  Building,
  Building2,
  Pencil,
  Trash2,
  X,
  ShoppingBag,
  Users,
  CheckSquare,
  Square,
  ArrowRight,
  Sparkles,
  PackageCheck,
  Search,
  Filter,
  GraduationCap,
  Sprout,
  FileText,
  Link as LinkIcon,
  Receipt,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  Check,
  Info,
  Fuel,
  Gauge,
  MapPin,
  Navigation,
  Clock,
  Coins,
  Printer,
  Calculator,
  Route,
  ChevronRight,
  CalendarRange,
  Split,
  CalendarDays,
  Download,
  UploadCloud,
  FileUp,
  Layers,
  Table,
  CheckCircle,
  Eye,
  BookOpen,
  Save,
  Maximize2,
  Minimize2,
  Bell,
  RefreshCw
} from 'lucide-react';
import {
  ChamadaPublica,
  ItemChamadaPublica,
  EscolaContempladaChamada,
  PropostaOfertaPAA,
  ProgramacaoEntregaPAA,
  ParadaEntregaEscola,
  PrestacaoContasPAA,
  PedidoProdutorPAA,
  ItemPedidoProdutor,
  NotaFiscal,
  SistemaTributarioNFe,
  RateioChamadaPublica,
  RateioProduto,
  RateioProdutor
} from '../types';
import { ALERTA_CRONOGRAMA_TEXTO, calcularImpostosItem } from '../utils/tributacaoReforma';
import { expandirItensHistoricoProducao } from '../utils/registroProducaoHelpers';
import { playActionCompleteSound } from '../utils/actionSound';
import { poloEquivale } from '../utils/poloHelpers';
import { abrirLinkExterno, montarLinkWhatsApp } from '../utils/whatsappHelpers';
import {
  baixarModeloPlanilhaChamadaPublica,
  parsePlanilhaChamadaPublica,
  ParsePlanilhaResult
} from '../utils/chamadaPublicaExcel';

const FONTES_RECURSOS_OPTIONS = [
  'FNDE / PNAE Federal',
  'MDS / PAA Doação Simultânea',
  'MDS / PAA Compra Direta',
  'Governo Estadual / SEDUC',
  'Tesouro Municipal / Recursos Próprios',
  'Creche',
  'Pré-Escola',
  'E. Fundamental',
  'A. Ed. Especial',
  'Ensino Médio',
  '+ Educação',
  'CONAB',
  'Governo do Estado/SDA',
  'Geral',
  'Tempo Integral'
];

// Nem toda fonte de recursos faz sentido para todo programa:
// - PAA-CONAB: exclusivamente via CONAB.
// - PAA-SDA: exclusivamente via Governo do Estado/SDA (Secretaria de
//   Desenvolvimento Agrário).
// - PNAE: repassado pelo Governo Estadual / SEDUC.
// - PAA-PMT: segmentado por modalidade de ensino (Creche, Pré-Escola,
//   Fundamental, Médio etc.), assim como o PNAE tradicional é repassado por
//   modalidade pelo FNDE.
// - PGPM (Garantia de Preços Mínimos): exclusivamente via CONAB.
// - PAA genérico (sem subtipo definido) não tem lista própria — mostra
//   todas as fontes, já que não há como saber qual das três modalidades
//   (PMT/CONAB/SDA) se aplica sem essa informação.
const FONTES_POR_PROGRAMA: Record<string, string[]> = {
  'PAA-CONAB': [
    'CONAB'
  ],
  'PAA-SDA': [
    'Governo do Estado/SDA'
  ],
  PNAE: [
    'Governo Estadual / SEDUC'
  ],
  'PAA-PMT': [
    'Creche',
    'Pré-Escola',
    'E. Fundamental',
    'A. Ed. Especial',
    'Ensino Médio',
    '+ Educação',
    'Tempo Integral'
  ],
  PGPM: [
    'CONAB'
  ],
  MERCADO_LIVRE: [
    'Tesouro Municipal / Recursos Próprios',
    'Geral'
  ],
  // Programa não classificado: não restringe, mostra todas as fontes.
  OUTRO: FONTES_RECURSOS_OPTIONS
};

function getFontesRecursosParaPrograma(tipoPrograma?: string, nomePrograma?: string): string[] {
  // Reforço: se o campo Tipo do programa ainda estiver salvo como "PAA"
  // genérico (cadastrado antes de existirem os subtipos PAA-PMT/PAA-CONAB/
  // PAA-SDA), usa o NOME do programa para inferir o subtipo correto.
  if (tipoPrograma === 'PAA' && nomePrograma) {
    if (/pmt/i.test(nomePrograma)) return FONTES_POR_PROGRAMA['PAA-PMT'];
    if (/conab/i.test(nomePrograma)) return FONTES_POR_PROGRAMA['PAA-CONAB'];
    if (/sda/i.test(nomePrograma)) return FONTES_POR_PROGRAMA['PAA-SDA'];
  }
  if (!tipoPrograma) return FONTES_RECURSOS_OPTIONS;
  return FONTES_POR_PROGRAMA[tipoPrograma] || FONTES_RECURSOS_OPTIONS;
}

export const SisGepaView: React.FC = () => {
  const {
    chamadasPublicas,
    addChamadaPublica,
    updateChamadaPublica,
    deleteChamadaPublica,
    rateiosChamadas,
    salvarRateioChamada,
    deleteRateioChamada,
    ofertasPAA,
    addOfertaPAA,
    updateOfertaPAA,
    deleteOfertaPAA,
    pedidosProdutorPAA,
    addPedidoProdutorPAA,
    updatePedidoProdutorPAA,
    deletePedidoProdutorPAA,
    programacoesEntrega,
    addProgramacaoEntrega,
    updateProgramacaoEntrega,
    deleteProgramacaoEntrega,
    produtores,
    cooperados,
    produtos,
    registrosProducao,
    programas,
    escolasPnae,
    motoristas,
    gerarNotaFiscalEntradaProdutor,
    gerarNotaFiscalSaidaEscola,
    transmitirSefazCe,
    notasFiscais,
    sefazCeConfig,
    config,
    canWriteModule,
    addContaPagarReceber,
    updateContaPagarReceber
  } = useCoop();

  // Nível de permissão do usuário logado para este módulo (SisGepa: PAA/PNAE).
  // Usuários com nível "Somente Leitura" (READ) na Matriz de Permissões
  // continuam vendo tudo, mas não podem criar, editar ou excluir nada aqui.
  const canWrite = canWriteModule('sisgepa');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'chamadas' | 'ofertas' | 'rateio' | 'pedidos' | 'entregas' | 'relatorios'>('chamadas');
  const [relatorioSubTab, setRelatorioSubTab] = useState<'pedidos' | 'entregas'>('pedidos');

  // Specific filters for Relatórios de Pedidos e Entregas
  const [relFilterProdutor, setRelFilterProdutor] = useState('TODOS');
  const [relFilterEscola, setRelFilterEscola] = useState('TODOS');
  const [relFilterProduto, setRelFilterProduto] = useState('TODOS');
  const [relFilterMes, setRelFilterMes] = useState('TODOS');
  const [relFilterAno, setRelFilterAno] = useState('TODOS');
  const [relFilterPrograma, setRelFilterPrograma] = useState('TODOS');
  const [relFilterChamada, setRelFilterChamada] = useState('TODOS');
  const [relFilterPedidoNum, setRelFilterPedidoNum] = useState('TODOS');

  // Unified Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgramaId, setFilterProgramaId] = useState('');
  const [filterProdutorId, setFilterProdutorId] = useState('');
  const [filterEscolaId, setFilterEscolaId] = useState('');
  const [filterProdutoId, setFilterProdutoId] = useState('');
  const [filterDataPedido, setFilterDataPedido] = useState('');

  // Editing state
  const [editingChamada, setEditingChamada] = useState<ChamadaPublica | null>(null);
  const [editingOferta, setEditingOferta] = useState<PropostaOfertaPAA | null>(null);
  const [editingPedido, setEditingPedido] = useState<PedidoProdutorPAA | null>(null);
  const [editingEntrega, setEditingEntrega] = useState<ProgramacaoEntregaPAA | null>(null);

  // Modals
  const [showChamadaModal, setShowChamadaModal] = useState(false);
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [isMaximizedPedidoModal, setIsMaximizedPedidoModal] = useState(false);
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Modal Importação XLS / XLSX Chamada Pública
  const [showImportChamadaModal, setShowImportChamadaModal] = useState(false);
  const [planilhaFile, setPlanilhaFile] = useState<File | null>(null);
  const [isUploadingPlanilha, setIsUploadingPlanilha] = useState(false);
  const [planilhaResult, setPlanilhaResult] = useState<ParsePlanilhaResult | null>(null);

  // Modal Detalhes Chamada Pública
  const [viewingChamadaDetalhada, setViewingChamadaDetalhada] = useState<ChamadaPublica | null>(null);

  // Modal Cronograma de Entregas do Pedido
  const [viewingCronogramaPedido, setViewingCronogramaPedido] = useState<PedidoProdutorPAA | null>(null);

  // Modal Envio de Pedidos em PDF & WhatsApp aos Produtores
  const [viewingEnvioProdutoresPedido, setViewingEnvioProdutoresPedido] = useState<PedidoProdutorPAA | null>(null);

  // Modal Gerar NF-e (Entrada Produtor ou Saída Escola)
  const [showNFeModal, setShowNFeModal] = useState(false);
  const [nfeModalTarget, setNfeModalTarget] = useState<PedidoProdutorPAA | ProgramacaoEntregaPAA | null>(null);
  const [nfeTipoOperacao, setNfeTipoOperacao] = useState<'ENTRADA_PRODUTOR' | 'SAIDA_ESCOLA'>('ENTRADA_PRODUTOR');
  const [nfeSelectedProdutorId, setNfeSelectedProdutorId] = useState<string>('');
  const [nfeSelectedEscolaId, setNfeSelectedEscolaId] = useState<string>('');
  const [nfeSistemaTrib, setNfeSistemaTrib] = useState<SistemaTributarioNFe>('NOVO_SISTEMA_REFORMA_2026');
  const [nfeTransmitedDirectly, setNfeTransmitedDirectly] = useState<boolean>(true);
  const [nfeSuccessResult, setNfeSuccessResult] = useState<{ nf: NotaFiscal; statusTransmissao?: string } | null>(null);
  const [isGeneratingNfe, setIsGeneratingNfe] = useState(false);

  // Form Chamada Pública
  const [chamadaForm, setChamadaForm] = useState({
    numeroEdital: '',
    orgaoComprador: '',
    programaId: '',
    programaNome: '',
    programa: 'PNAE' as 'PAA' | 'PNAE' | string,
    fonteRecurso: 'FNDE / PNAE Federal',
    fonteRecursos: 'FNDE / PNAE Federal',
    escolaId: '',
    escolaNome: '',
    escolasIds: [] as string[],
    escolasNomes: [] as string[],
    escolasContempladas: [] as EscolaContempladaChamada[],
    dataAbertura: new Date().toISOString().split('T')[0],
    dataEncerramento: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    valorTotalEdital: 150000,
    status: 'ABERTA' as 'ABERTA' | 'EM_EXECUCAO' | 'ENCERRADA',
    observacoes: '',
    itensSolicitados: [] as ItemChamadaPublica[]
  });

  // State para adicionar nova escola avulsa no modal da chamada
  const [customEscolaNome, setCustomEscolaNome] = useState('');
  const [customEscolaPolo, setCustomEscolaPolo] = useState('Sede');
  const [customEscolaInep, setCustomEscolaInep] = useState('');
  const [customEscolaAlunos, setCustomEscolaAlunos] = useState(250);

  // Form Proposta de Oferta
  const [ofertaForm, setOfertaForm] = useState({
    chamadaPublicaId: '',
    chamadaPublicaEdital: '',
    programaId: '',
    programaNome: '',
    produtorId: '',
    produtorNome: '',
    apto: 'SIM',
    ano: '2026',
    produtoId: '',
    produtoNome: '',
    unidadeMedida: 'KG',
    quantidadeOfertada: 100,
    quantidadeKg: 100,
    precoUnitario: 5.50,
    status: 'SUBMETIDA' as any,
    itens: [] as {
      produtoId: string;
      produtoNome: string;
      unidadeMedida: string;
      quantidadeKg: number;
      precoUnitario: number;
    }[]
  });

  // Form Pedido
  const [pedidoForm, setPedidoForm] = useState({
    numeroPedido: '', // placeholder — o número real (PED-01/2026) é gerado ao abrir o formulário, em handleOpenPedido
    programaId: '',
    programaNome: '',
    programa: 'PAA' as 'PAA' | 'PNAE' | 'MERCADO_LIVRE' | string,
    produtoId: '',
    produtoNome: '',
    nucleo: 'Sede',
    qtdeEntregas: 1,
    intervaloFrequencia: 'SEMANAL' as 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'CUSTOM',
    cronogramaEntregas: [] as Array<{
      numero: number;
      rotulo: string;
      dataPrevista: string;
      horarioSaida?: string;
      percentual: number;
      quantidadeKg: number;
      valorPrevisto?: number;
      observacao?: string;
    }>,
    autoGerarRotasLogistica: true,
    chamadaPublicaId: '',
    chamadaPublicaEdital: '',
    escolaId: '',
    escolaNome: '',
    escolasIds: [] as string[],
    escolasNomes: [] as string[],
    fonteRecursos: 'E. Fundamental',
    dataPedido: new Date().toISOString().split('T')[0],
    dataPrevistaEntrega: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
    observacoes: 'Coleta agendada na propriedade dos produtores cadastrados para entrega nas escolas.',
    status: 'PENDENTE' as any,
    funruralAtivo: false,
    funruralAliquota: 1.5,
    taxaAdministrativaAtiva: false,
    taxaAdministrativaPercentual: 5
  });

  // Form Entrega
  const [viewingRomaneio, setViewingRomaneio] = useState<ProgramacaoEntregaPAA | null>(null);
  const [entregaForm, setEntregaForm] = useState({
    programaId: '',
    programaNome: '',
    chamadaPublicaId: '',
    chamadaPublicaEdital: '',
    pedidoId: '',
    pedidoNumero: '',
    escolaId: '',
    escolaNome: '',
    escolaOrgaoDestino: '',
    localEntrega: '',
    dataPrevista: new Date().toISOString().split('T')[0],
    horarioSaidaPrevisto: '07:30',
    motoristaNome: 'Francisco Reginaldo (Seu Chico)',
    motoristaTelefone: '(85) 99822-4411',
    veiculoPlaca: 'PMN-4A92',
    veiculoModelo: 'Mercedes-Benz Accelo 815 (Baú)',
    quantidadeTotalKg: 500,
    status: 'AGENDADA' as any,
    itens: [] as { produtorId?: string; produtorNome: string; produtoId?: string; produtoNome: string; quantidadePrevista: number; unidade: string }[],
    paradasEntrega: [] as ParadaEntregaEscola[],
    distanciaTotalKm: 0,
    autonomiaKmL: 8.0,
    consumoCombustivelLitros: 0,
    precoLitroCombustivel: 6.29,
    despesaCombustivel: 0,
    despesaDiariaMotorista: 80.00,
    despesaManutencao: 25.00,
    outrasDespesas: 15.00,
    totalDespesasEntrega: 0,
    observacoesRota: '',
    // Multi-entregas & Cronograma
    numeroEntregas: 1,
    intervaloFrequencia: 'SEMANAL' as 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'CUSTOM',
    cronogramaParcelas: [] as {
      numero: number;
      rotulo: string;
      dataPrevista: string;
      horarioSaida: string;
      percentual: number;
      quantidadeKg: number;
      observacao?: string;
    }[],
    numeroEntrega: 1,
    totalEntregas: 1,
    parcelaRotulo: '',
    cronogramaGrupoId: ''
  });

  const [selectedProdutoresIds, setSelectedProdutoresIds] = useState<string[]>([]);
  const [pedidoItens, setPedidoItens] = useState<ItemPedidoProdutor[]>([]);

  // --- Rateio de Produtores (aba "Rateio de Produtores") ---
  // Distribui a quantidade de cada produto do edital entre os produtores
  // que o ofertaram e, dentro de cada produtor, entre as escolas
  // contempladas na chamada pública. O resultado fica disponível para
  // popular o Pedido diretamente (ver handleCarregarRateioNoPedido).
  const [rateioChamadaId, setRateioChamadaId] = useState('');
  const [rateioEmEdicao, setRateioEmEdicao] = useState<RateioChamadaPublica | null>(null);

  // Open Handlers
  const handleOpenChamada = (cp?: ChamadaPublica) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (cp) {
      setEditingChamada(cp);
      const initialEscolasIds = cp.escolasIds && cp.escolasIds.length > 0
        ? cp.escolasIds
        : (cp.escolaId ? [cp.escolaId] : (escolasPnae.length > 0 ? [escolasPnae[0].id] : []));
      const initialEscolasNomes = cp.escolasNomes && cp.escolasNomes.length > 0
        ? cp.escolasNomes
        : (cp.escolaNome ? [cp.escolaNome] : (escolasPnae.length > 0 ? [escolasPnae[0].nomeEscola] : []));

      const initialEscolasContempladas: EscolaContempladaChamada[] = (cp.escolasContempladas && cp.escolasContempladas.length > 0)
        ? cp.escolasContempladas
        : initialEscolasIds.map(id => {
            const esc = escolasPnae.find(e => e.id === id);
            return {
              id,
              nomeEscola: esc?.nomeEscola || 'Escola',
              polo: esc?.polo || 'Sede',
              codigoInep: esc?.codigoInep || '',
              endereco: esc?.endereco || '',
              alunosAtendidos: esc?.alunosAtendidos || 250
            };
          });

      const initialItens: ItemChamadaPublica[] = (cp.itensSolicitados && cp.itensSolicitados.length > 0)
        ? cp.itensSolicitados.map(it => ({
            ...it,
            valorTotalItem: it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario)
          }))
        : produtos.slice(0, 2).map(p => ({
            produtoId: p.id,
            produtoNome: p.nome,
            unidade: p.unidadeMedida,
            quantidadeTotal: 1000,
            precoMaximoUnitario: p.precoReferencia,
            valorTotalItem: 1000 * p.precoReferencia
          }));

      const totalEditalCalc = initialItens.reduce((s, it) => s + (it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario)), 0);

      setChamadaForm({
        numeroEdital: cp.numeroEdital,
        orgaoComprador: cp.orgaoComprador,
        programaId: cp.programaId || '',
        programaNome: cp.programaNome || '',
        programa: cp.programa || 'PNAE',
        fonteRecurso: cp.fonteRecurso || cp.fonteRecursos || 'FNDE / PNAE Federal',
        fonteRecursos: cp.fonteRecurso || cp.fonteRecursos || 'FNDE / PNAE Federal',
        escolaId: cp.escolaId || (initialEscolasIds[0] || ''),
        escolaNome: cp.escolaNome || initialEscolasNomes.join(', '),
        escolasIds: initialEscolasIds,
        escolasNomes: initialEscolasNomes,
        escolasContempladas: initialEscolasContempladas,
        dataAbertura: cp.dataAbertura,
        dataEncerramento: cp.dataEncerramento,
        valorTotalEdital: cp.valorTotalEdital || totalEditalCalc,
        status: (cp.status as any) || 'ABERTA',
        observacoes: cp.observacoes || '',
        itensSolicitados: initialItens
      });
    } else {
      const defaultProg = programas.find(p => p.tipo === 'PNAE') || programas[0];
      const allEscolasIds = escolasPnae.map(e => e.id);
      const allEscolasNomes = escolasPnae.map(e => e.nomeEscola);
      const allEscolasContempladas: EscolaContempladaChamada[] = escolasPnae.map(e => ({
        id: e.id,
        nomeEscola: e.nomeEscola,
        polo: e.polo || 'Polo Sede',
        codigoInep: e.codigoInep || '',
        endereco: e.endereco || '',
        alunosAtendidos: e.alunosAtendidos || 250
      }));

      const initialItens: ItemChamadaPublica[] = produtos.slice(0, 3).map(p => ({
        produtoId: p.id,
        produtoNome: p.nome,
        unidade: p.unidadeMedida,
        quantidadeTotal: 5000,
        precoMaximoUnitario: p.precoReferencia,
        valorTotalItem: 5000 * p.precoReferencia
      }));

      const totalEditalCalc = initialItens.reduce((s, it) => s + (it.valorTotalItem || 0), 0);

      setEditingChamada(null);
      setChamadaForm({
        numeroEdital: `Chamada Pública PNAE 00${chamadasPublicas.length + 1}/2026`,
        orgaoComprador: 'Secretaria Municipal de Educação de Trairi / Prefeitura Municipal',
        programaId: defaultProg?.id || '',
        programaNome: defaultProg?.nome || 'PNAE - Programa Nacional de Alimentação Escolar',
        programa: defaultProg?.tipo || 'PNAE',
        fonteRecurso: 'FNDE / PNAE Federal',
        fonteRecursos: 'FNDE / PNAE Federal',
        escolaId: escolasPnae[0]?.id || '',
        escolaNome: allEscolasNomes.join(', '),
        escolasIds: allEscolasIds,
        escolasNomes: allEscolasNomes,
        escolasContempladas: allEscolasContempladas,
        dataAbertura: new Date().toISOString().split('T')[0],
        dataEncerramento: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        valorTotalEdital: totalEditalCalc > 0 ? totalEditalCalc : 150000,
        status: 'ABERTA',
        observacoes: 'Aquisição de gêneros alimentícios da Agricultura Familiar para atendimento da alimentação escolar.',
        itensSolicitados: initialItens
      });
    }
    setShowChamadaModal(true);
  };

  const handleAddChamadaItem = () => {
    const defaultProd = produtos[0];
    const initialQtd = 1000;
    const initialPreco = defaultProd?.precoReferencia || 5.00;
    setChamadaForm(prev => {
      const novosItens = [
        ...prev.itensSolicitados,
        {
          produtoId: defaultProd?.id || `pdt-custom-${Date.now()}`,
          produtoNome: defaultProd?.nome || 'Novo Gênero Alimentício',
          unidade: defaultProd?.unidadeMedida || 'KG',
          quantidadeTotal: initialQtd,
          precoMaximoUnitario: initialPreco,
          valorTotalItem: initialQtd * initialPreco
        }
      ];
      const novoTotal = novosItens.reduce((sum, it) => sum + (it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario)), 0);
      return {
        ...prev,
        itensSolicitados: novosItens,
        valorTotalEdital: novoTotal
      };
    });
  };

  const handleRemoveChamadaItem = (idx: number) => {
    setChamadaForm(prev => {
      const novosItens = prev.itensSolicitados.filter((_, i) => i !== idx);
      const novoTotal = novosItens.reduce((sum, it) => sum + (it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario)), 0);
      return {
        ...prev,
        itensSolicitados: novosItens,
        valorTotalEdital: novoTotal
      };
    });
  };

  const handleUpdateChamadaItem = (idx: number, field: keyof ItemChamadaPublica, value: any) => {
    setChamadaForm(prev => {
      const novosItens = prev.itensSolicitados.map((item, i) => {
        if (i === idx) {
          let updated = { ...item, [field]: value };
          if (field === 'produtoId') {
            const pObj = produtos.find(p => p.id === value);
            if (pObj) {
              updated.produtoNome = pObj.nome;
              updated.unidade = pObj.unidadeMedida;
              updated.precoMaximoUnitario = pObj.precoReferencia || updated.precoMaximoUnitario;
            }
          }
          const qtd = field === 'quantidadeTotal' ? (parseFloat(value) || 0) : updated.quantidadeTotal;
          const preco = field === 'precoMaximoUnitario' ? (parseFloat(value) || 0) : (field === 'produtoId' ? (produtos.find(p => p.id === value)?.precoReferencia || updated.precoMaximoUnitario) : updated.precoMaximoUnitario);
          updated.valorTotalItem = Number((qtd * preco).toFixed(2));
          return updated;
        }
        return item;
      });
      const novoTotal = novosItens.reduce((sum, it) => sum + (it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario)), 0);
      return {
        ...prev,
        itensSolicitados: novosItens,
        valorTotalEdital: novoTotal
      };
    });
  };

  const handleToggleEscolaChamada = (escolaId: string) => {
    const escObj = escolasPnae.find(e => e.id === escolaId);
    setChamadaForm(prev => {
      const isSelected = prev.escolasIds.includes(escolaId);
      const newIds = isSelected ? prev.escolasIds.filter(id => id !== escolaId) : [...prev.escolasIds, escolaId];
      const newNomes = newIds.map(id => escolasPnae.find(e => e.id === id)?.nomeEscola || id);
      
      let newContempladas = prev.escolasContempladas || [];
      if (isSelected) {
        newContempladas = newContempladas.filter(e => e.id !== escolaId && e.nomeEscola !== escObj?.nomeEscola);
      } else if (escObj) {
        newContempladas = [
          ...newContempladas,
          {
            id: escObj.id,
            nomeEscola: escObj.nomeEscola,
            polo: escObj.polo || 'Polo Sede',
            codigoInep: escObj.codigoInep || '',
            endereco: escObj.endereco || '',
            alunosAtendidos: escObj.alunosAtendidos || 250
          }
        ];
      }

      return {
        ...prev,
        escolasIds: newIds,
        escolasNomes: newNomes,
        escolasContempladas: newContempladas,
        escolaId: newIds[0] || '',
        escolaNome: newNomes.join(', ')
      };
    });
  };

  const handleSelectAllEscolasChamada = () => {
    const allIds = escolasPnae.map(e => e.id);
    const allNomes = escolasPnae.map(e => e.nomeEscola);
    const allContempladas: EscolaContempladaChamada[] = escolasPnae.map(e => ({
      id: e.id,
      nomeEscola: e.nomeEscola,
      polo: e.polo || 'Polo Sede',
      codigoInep: e.codigoInep || '',
      endereco: e.endereco || '',
      alunosAtendidos: e.alunosAtendidos || 250
    }));

    setChamadaForm(prev => ({
      ...prev,
      escolasIds: allIds,
      escolasNomes: allNomes,
      escolasContempladas: allContempladas,
      escolaId: allIds[0] || '',
      escolaNome: allNomes.join(', ')
    }));
  };

  const handleClearEscolasChamada = () => {
    setChamadaForm(prev => ({
      ...prev,
      escolasIds: [],
      escolasNomes: [],
      escolasContempladas: [],
      escolaId: '',
      escolaNome: ''
    }));
  };

  const handleAddCustomEscolaChamada = () => {
    if (!customEscolaNome.trim()) return;
    const newId = `esc-custom-${Date.now()}`;
    const novaEscola: EscolaContempladaChamada = {
      id: newId,
      nomeEscola: customEscolaNome.trim(),
      polo: customEscolaPolo || 'Sede',
      codigoInep: customEscolaInep.trim() || undefined,
      alunosAtendidos: Number(customEscolaAlunos) || 200
    };

    setChamadaForm(prev => ({
      ...prev,
      escolasIds: [...prev.escolasIds, newId],
      escolasNomes: [...prev.escolasNomes, novaEscola.nomeEscola],
      escolasContempladas: [...(prev.escolasContempladas || []), novaEscola],
      escolaNome: [...prev.escolasNomes, novaEscola.nomeEscola].join(', ')
    }));

    setCustomEscolaNome('');
    setCustomEscolaInep('');
  };

  const handleUploadPlanilhaFile = async (file: File) => {
    setPlanilhaFile(file);
    setIsUploadingPlanilha(true);
    try {
      const res = await parsePlanilhaChamadaPublica(file);
      setPlanilhaResult(res);
    } catch (err) {
      console.error(err);
      alert('Erro ao ler a planilha enviada.');
    } finally {
      setIsUploadingPlanilha(false);
    }
  };

  const handleConfirmarImportacaoPlanilha = () => {
    if (!planilhaResult || !planilhaResult.chamada) return;
    const chm = planilhaResult.chamada as ChamadaPublica;
    addChamadaPublica(chm);
    setShowImportChamadaModal(false);
    setPlanilhaFile(null);
    setPlanilhaResult(null);
    alert(`Chamada Pública "${chm.numeroEdital}" importada com sucesso com ${chm.itensSolicitados.length} produtos e ${chm.escolasContempladas?.length || 0} escolas!`);
  };

  const handleSaveChamada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!chamadaForm.numeroEdital || !chamadaForm.orgaoComprador) {
      alert('Por favor, informe o Número do Edital e o Órgão Comprador.');
      return;
    }

    if (chamadaForm.itensSolicitados.length === 0) {
      alert('Por favor, inclua ao menos um produto/item solicitado na Chamada Pública.');
      return;
    }

    const totalEdital = chamadaForm.itensSolicitados.reduce(
      (sum, it) => sum + (it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario)),
      0
    );

    const payload = {
      ...chamadaForm,
      valorTotalEdital: totalEdital > 0 ? totalEdital : chamadaForm.valorTotalEdital,
      fonteRecursos: chamadaForm.fonteRecurso,
      escolaNome: chamadaForm.escolasNomes.join(', ') || chamadaForm.escolaNome || 'Rede de Escolas'
    };

    if (editingChamada) {
      updateChamadaPublica(editingChamada.id, payload);
    } else {
      addChamadaPublica(payload);
    }
    setShowChamadaModal(false);
    playActionCompleteSound();
  };

  const handleAddOfertaItem = () => {
    const defaultProd = produtos[0];
    setOfertaForm(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          produtoId: defaultProd?.id || '',
          produtoNome: defaultProd?.nome || 'Produto',
          unidadeMedida: defaultProd?.unidadeMedida || 'KG',
          quantidadeKg: 100,
          precoUnitario: defaultProd?.precoReferencia || 5.00
        }
      ]
    }));
  };

  const handleRemoveOfertaItem = (idx: number) => {
    setOfertaForm(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateOfertaItem = (idx: number, field: string, value: any) => {
    setOfertaForm(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => {
        if (i === idx) {
          if (field === 'produtoId') {
            const pObj = produtos.find(p => p.id === value);
            return {
              ...item,
              produtoId: value,
              produtoNome: pObj?.nome || item.produtoNome,
              unidadeMedida: pObj?.unidadeMedida || item.unidadeMedida,
              precoUnitario: pObj?.precoReferencia || item.precoUnitario
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleOpenOferta = (o?: PropostaOfertaPAA) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (o) {
      setEditingOferta(o);

      // Ordem de prioridade ao reabrir uma proposta para edição:
      // 1) itens já salvos na proposta; 2) produto único legado (compatibilidade);
      // 3) histórico de produção do produtor vinculado (garante que a
      // proposta sempre reflita o que o produtor efetivamente produz).
      const historicoDoProdutor = o.produtorId
        ? registrosProducao.filter(r => r.produtorId === o.produtorId)
        : [];

      const initialItens = o.itens && o.itens.length > 0
        ? o.itens.map(it => ({
            produtoId: it.produtoId,
            produtoNome: it.produtoNome,
            unidadeMedida: it.unidadeMedida || 'KG',
            quantidadeKg: it.quantidadeKg,
            precoUnitario: it.precoUnitario
          }))
        : (o.produtoId ? [{
            produtoId: o.produtoId,
            produtoNome: o.produtoNome || 'Produto',
            unidadeMedida: o.unidadeMedida || 'KG',
            quantidadeKg: o.quantidadeKg || o.quantidadeOfertada || 100,
            precoUnitario: o.precoUnitario || o.valorUnitario || 5.50
          }] : expandirItensHistoricoProducao(historicoDoProdutor).map(item => {
            const pObj = produtos.find(p => p.id === item.produtoId);
            return {
              produtoId: item.produtoId,
              produtoNome: item.produtoNome || pObj?.nome || 'Produto',
              unidadeMedida: item.unidadeMedida || pObj?.unidadeMedida || 'KG',
              quantidadeKg: item.quantidadeKg || 100,
              precoUnitario: pObj?.precoReferencia || 5.00
            };
          }));

      setOfertaForm({
        chamadaPublicaId: o.chamadaPublicaId || '',
        chamadaPublicaEdital: o.chamadaPublicaEdital || '',
        programaId: o.programaId || '',
        programaNome: o.programaNome || '',
        produtorId: o.produtorId || '',
        produtorNome: o.produtorNome || '',
        produtoId: o.produtoId || '',
        produtoNome: o.produtoNome || '',
        unidadeMedida: o.unidadeMedida || 'KG',
        quantidadeOfertada: o.quantidadeOfertada || o.quantidadeKg || 100,
        quantidadeKg: o.quantidadeKg || o.quantidadeOfertada || 100,
        precoUnitario: o.precoUnitario || o.valorUnitario || 5.50,
        status: o.status,
        itens: initialItens
      });
    } else {
      const defaultChamada = chamadasPublicas[0];
      const defaultProdutor = produtores[0];
      const defaultPrograma = programas[0];

      const prodHistorico = defaultProdutor ? registrosProducao.filter(r => r.produtorId === defaultProdutor.id) : [];
      const itensHistoricoExpandidos = expandirItensHistoricoProducao(prodHistorico);
      const defaultItens = itensHistoricoExpandidos.length > 0
        ? itensHistoricoExpandidos.map(item => {
            const pObj = produtos.find(p => p.id === item.produtoId);
            return {
              produtoId: item.produtoId,
              produtoNome: item.produtoNome || pObj?.nome || 'Produto',
              unidadeMedida: item.unidadeMedida || pObj?.unidadeMedida || 'KG',
              quantidadeKg: item.quantidadeKg || 100,
              precoUnitario: pObj?.precoReferencia || 5.50
            };
          })
        : (produtos[0] ? [{
            produtoId: produtos[0].id,
            produtoNome: produtos[0].nome,
            unidadeMedida: produtos[0].unidadeMedida || 'KG',
            quantidadeKg: 100,
            precoUnitario: produtos[0].precoReferencia || 5.50
          }] : []);

      setEditingOferta(null);
      setOfertaForm({
        chamadaPublicaId: defaultChamada?.id || '',
        chamadaPublicaEdital: defaultChamada?.numeroEdital || '',
        programaId: defaultPrograma?.id || '',
        programaNome: defaultPrograma?.nome || 'PAA',
        produtorId: defaultProdutor?.id || '',
        produtorNome: defaultProdutor?.nome || '',
        produtoId: defaultItens[0]?.produtoId || '',
        produtoNome: defaultItens[0]?.produtoNome || '',
        unidadeMedida: defaultItens[0]?.unidadeMedida || 'KG',
        quantidadeOfertada: defaultItens[0]?.quantidadeKg || 100,
        quantidadeKg: defaultItens[0]?.quantidadeKg || 100,
        precoUnitario: defaultItens[0]?.precoUnitario || 5.50,
        status: 'SUBMETIDA',
        itens: defaultItens
      });
    }
    setShowOfertaModal(true);
  };

  const handleSaveOferta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!ofertaForm.itens || ofertaForm.itens.length === 0) {
      alert('Por favor, inclua ao menos um produto na proposta de oferta.');
      return;
    }

    const totalGeral = ofertaForm.itens.reduce((sum, item) => sum + (item.quantidadeKg * item.precoUnitario), 0);
    const primeiroItem = ofertaForm.itens[0];
    
    // Find linked names
    const selectedProd = produtores.find(p => p.id === ofertaForm.produtorId);
    const selectedChm = chamadasPublicas.find(c => c.id === ofertaForm.chamadaPublicaId);
    const selectedProg = programas.find(p => p.id === ofertaForm.programaId);

    const itensPayload = ofertaForm.itens.map(item => ({
      ...item,
      valorTotal: item.quantidadeKg * item.precoUnitario
    }));

    const payload = {
      ...ofertaForm,
      produtorNome: selectedProd ? selectedProd.nome : ofertaForm.produtorNome,
      produtoId: primeiroItem.produtoId,
      produtoNome: primeiroItem.produtoNome,
      unidadeMedida: primeiroItem.unidadeMedida,
      quantidadeKg: primeiroItem.quantidadeKg,
      quantidadeOfertada: primeiroItem.quantidadeKg,
      precoUnitario: primeiroItem.precoUnitario,
      valorUnitario: primeiroItem.precoUnitario,
      chamadaPublicaEdital: selectedChm ? selectedChm.numeroEdital : ofertaForm.chamadaPublicaEdital,
      // A escola de destino não faz mais parte da Proposta de Oferta — ela é
      // escolhida diretamente no Pedido (ver "Escola de Destino do Pedido"
      // no formulário de Pedido aos Produtores).
      programaNome: selectedProg ? selectedProg.nome : ofertaForm.programaNome,
      valorTotal: totalGeral,
      itens: itensPayload
    };

    if (editingOferta) {
      updateOfertaPAA(editingOferta.id, payload);
    } else {
      addOfertaPAA(payload);
    }
    setShowOfertaModal(false);
    playActionCompleteSound();
  };

  const generateCronogramaParaPedido = (
    qtdEntregas: number,
    dataInicial: string,
    frequencia: 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'CUSTOM',
    totalKg: number,
    totalValor: number,
    existingParcelas?: Array<{
      numero: number;
      rotulo: string;
      dataPrevista: string;
      horarioSaida?: string;
      percentual: number;
      quantidadeKg: number;
      valorPrevisto?: number;
      observacao?: string;
      quantidadeManual?: boolean;
      valorManual?: boolean;
    }>
  ) => {
    const count = Math.max(1, Math.min(24, Math.floor(qtdEntregas) || 1));
    const daysInterval = frequencia === 'SEMANAL' ? 7 : frequencia === 'QUINZENAL' ? 14 : frequencia === 'MENSAL' ? 30 : 7;
    const baseDate = dataInicial ? new Date(dataInicial + 'T12:00:00') : new Date();

    return Array.from({ length: count }, (_, idx) => {
      const num = idx + 1;
      const existing = existingParcelas?.find(p => p.numero === num);
      let dateStr = existing?.dataPrevista;
      if (!dateStr) {
        const targetDate = new Date(baseDate);
        targetDate.setDate(targetDate.getDate() + idx * daysInterval);
        dateStr = targetDate.toISOString().split('T')[0];
      }
      const pct = Number((100 / count).toFixed(1));
      const parcelaKg = Number((totalKg / count).toFixed(1));
      const parcelaValor = Number((totalValor / count).toFixed(2));
      // A "Divisão Automática" só deixa de recalcular a quantidade/valor de
      // uma parcela quando o usuário editou aquele campo manualmente na
      // tabela (quantidadeManual/valorManual). Sem essa marcação explícita,
      // qualquer parcela pré-existente recalcula para a nova divisão
      // igualitária sempre que a quantidade de entregas, o total do pedido
      // ou a frequência mudarem — evitando parcelas "grudadas" com valores
      // de uma divisão anterior (ex.: 200KG de quando eram 2 entregas,
      // aparecendo ainda depois de mudar para 4 entregas).
      const usarQtdExistente = existing?.quantidadeManual === true;
      const usarValorExistente = existing?.valorManual === true;
      return {
        numero: num,
        rotulo: count > 1 ? `Entrega ${num} de ${count} (${pct}%)` : 'Entrega Única (100%)',
        dataPrevista: dateStr,
        horarioSaida: existing?.horarioSaida || '07:30',
        percentual: pct,
        quantidadeKg: usarQtdExistente ? existing!.quantidadeKg : parcelaKg,
        valorPrevisto: usarValorExistente ? existing!.valorPrevisto : parcelaValor,
        observacao: existing?.observacao || `Remessa ${num}/${count}`,
        quantidadeManual: usarQtdExistente,
        valorManual: usarValorExistente
      };
    });
  };

  const handleUpdatePedidoQtdeEntregas = (newQtde: number) => {
    const safeQtde = Math.max(1, Math.min(24, Number(newQtde) || 1));
    const totalKgCalc = pedidoItens.reduce((sum, it) => sum + (Number(it.quantidadePedida) || 0), 0);
    const totalValorCalc = pedidoItens.reduce((sum, it) => sum + (Number(it.valorTotalItem) || 0), 0);

    const novoCronograma = generateCronogramaParaPedido(
      safeQtde,
      pedidoForm.dataPrevistaEntrega,
      pedidoForm.intervaloFrequencia,
      totalKgCalc,
      totalValorCalc,
      pedidoForm.cronogramaEntregas
    );

    setPedidoForm(prev => ({
      ...prev,
      qtdeEntregas: safeQtde,
      cronogramaEntregas: novoCronograma
    }));
  };

  const handleUpdatePedidoFrequencia = (freq: 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'CUSTOM') => {
    const totalKgCalc = pedidoItens.reduce((sum, it) => sum + (Number(it.quantidadePedida) || 0), 0);
    const totalValorCalc = pedidoItens.reduce((sum, it) => sum + (Number(it.valorTotalItem) || 0), 0);
    const daysInterval = freq === 'SEMANAL' ? 7 : freq === 'QUINZENAL' ? 14 : freq === 'MENSAL' ? 30 : 7;
    const baseDate = pedidoForm.dataPrevistaEntrega ? new Date(pedidoForm.dataPrevistaEntrega + 'T12:00:00') : new Date();

    const novoCronograma = (pedidoForm.cronogramaEntregas || []).map((parc, idx) => {
      if (freq === 'CUSTOM') return parc;
      const targetDate = new Date(baseDate);
      targetDate.setDate(targetDate.getDate() + idx * daysInterval);
      return {
        ...parc,
        dataPrevista: targetDate.toISOString().split('T')[0]
      };
    });

    setPedidoForm(prev => ({
      ...prev,
      intervaloFrequencia: freq,
      cronogramaEntregas: novoCronograma.length > 0 ? novoCronograma : generateCronogramaParaPedido(prev.qtdeEntregas, prev.dataPrevistaEntrega, freq, totalKgCalc, totalValorCalc)
    }));
  };

  const handleUpdateParcelaData = (numeroParcela: number, novaData: string) => {
    setPedidoForm(prev => {
      const updated = (prev.cronogramaEntregas || []).map(p => {
        if (p.numero === numeroParcela) {
          return { ...p, dataPrevista: novaData };
        }
        return p;
      });
      return {
        ...prev,
        dataPrevistaEntrega: numeroParcela === 1 ? novaData : prev.dataPrevistaEntrega,
        cronogramaEntregas: updated
      };
    });
  };

  const handleUpdateParcelaField = (numeroParcela: number, field: string, val: any) => {
    setPedidoForm(prev => ({
      ...prev,
      cronogramaEntregas: (prev.cronogramaEntregas || []).map(p => {
        if (p.numero === numeroParcela) {
          const atualizado = { ...p, [field]: val };
          // Editar a quantidade/valor manualmente na tabela marca essa
          // parcela como "override manual" — a partir daí, a Divisão
          // Automática não sobrescreve mais esse campo específico ao mudar
          // a quantidade de entregas, a data base ou a frequência.
          if (field === 'quantidadeKg') atualizado.quantidadeManual = true;
          if (field === 'valorPrevisto') atualizado.valorManual = true;
          return atualizado;
        }
        return p;
      })
    }));
  };

  // Confirma (ou desfaz a confirmação de) a entrega de uma parcela/remessa
  // de um pedido já salvo, e recalcula automaticamente o status geral do
  // pedido a partir de quantas parcelas já foram entregues:
  // - nenhuma parcela entregue ainda        → PENDENTE
  // - algumas parcelas entregues (parcial)  → CONFIRMADO
  // - todas as parcelas entregues           → RECEBIDO
  // Pedidos CANCELADOS nunca têm o status alterado por esta função.
  const handleConfirmarEntregaParcela = (pedido: PedidoProdutorPAA, numeroParcela: number) => {
    if (!canWrite) { blockWriteAction(); return; }
    const cronogramaAtual = pedido.cronogramaEntregas || [];
    if (cronogramaAtual.length === 0) return;

    const novoCronograma = cronogramaAtual.map(p => {
      if (p.numero !== numeroParcela) return p;
      const novoEstado = !p.entregueConfirmada;
      return {
        ...p,
        entregueConfirmada: novoEstado,
        dataConfirmacaoEntrega: novoEstado ? new Date().toISOString().split('T')[0] : undefined
      };
    });

    const totalParcelas = novoCronograma.length;
    const parcelasEntregues = novoCronograma.filter(p => p.entregueConfirmada).length;

    let novoStatus = pedido.status;
    if (pedido.status !== 'CANCELADO') {
      if (parcelasEntregues === 0) novoStatus = 'PENDENTE';
      else if (parcelasEntregues < totalParcelas) novoStatus = 'CONFIRMADO';
      else novoStatus = 'RECEBIDO';
    }

    updatePedidoProdutorPAA(pedido.id, { cronogramaEntregas: novoCronograma, status: novoStatus });

    // Mantém o modal de cronograma que está aberto na tela sincronizado
    // imediatamente, sem esperar o próximo ciclo de dados do contexto.
    setViewingCronogramaPedido(prev => prev && prev.id === pedido.id
      ? { ...prev, cronogramaEntregas: novoCronograma, status: novoStatus }
      : prev
    );
    playActionCompleteSound();
  };

  const exportPedidoProdutorPDF = (pedido: PedidoProdutorPAA, produtorId: string) => {
    const prodObj = produtores.find(p => p.id === produtorId);
    const itensProd = (pedido.itens || []).filter(i => i.produtorId === produtorId);
    const prodNome = (prodObj?.nome || itensProd[0]?.produtorNome || 'Produtor Rural').toUpperCase();
    const prodPolo = prodObj?.polo || itensProd[0]?.polo || 'Sede';

    // Código do produtor: usa a matrícula do cooperado vinculado (só os
    // dígitos) quando existir; senão, deriva um código estável de 3
    // dígitos a partir do próprio ID do produtor, só para exibição.
    const cooperadoVinculado = prodObj?.cooperadoId ? cooperados.find(c => c.id === prodObj.cooperadoId) : null;
    const digitosMatricula = cooperadoVinculado?.matricula?.replace(/\D/g, '');
    const codigoProdutor = digitosMatricula && digitosMatricula.length > 0
      ? digitosMatricula.slice(-3)
      : String(Math.abs((prodObj?.id || produtorId).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000, 0))).padStart(3, '0');

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 10;
    const rightX = pageW - marginX;
    let y = 18;

    // Cabeçalho: nome da cooperativa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text((config.nomeCooperativa || config.cooperativaNome || 'COOPERATIVA').toUpperCase(), pageW / 2, y, { align: 'center' });
    y += 9;

    doc.setFontSize(12);
    doc.text('NOTA DE PEDIDO', pageW / 2, y, { align: 'center' });
    y += 9;

    // Caixa: comprovante de entrega
    doc.setDrawColor(20, 20, 20);
    doc.rect(marginX + 40, y - 5, pageW - 2 * (marginX + 40), 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Comprovante de Entrega dos Produtos na Cooperativa', pageW / 2, y, { align: 'center' });
    y += 12;

    // Linha: Nº Pedido | Núcleo | Programa
    doc.setFontSize(9);
    doc.text(`Nº Pedido: `, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pedido.numeroPedido}`, marginX + 18, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`Núcleo:`, marginX + 65, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${prodPolo}`, marginX + 80, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`Programa:`, marginX + 125, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${(pedido.programaNome || pedido.programa || 'PAA/PNAE')}`, marginX + 145, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text(`Chamada/Edital:`, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pedido.chamadaPublicaEdital || 'Chamada Geral'}`, marginX + 26, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`Fonte:`, marginX + 125, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pedido.fonteRecursos || '—'}`, marginX + 138, y);
    y += 9;

    // Linha do produtor (código + nome), com sublinhado como no modelo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${codigoProdutor}   ${prodNome}`, marginX, y);
    doc.setLineWidth(0.3);
    doc.line(marginX, y + 1.5, rightX, y + 1.5);
    y += 8;

    // Tabela de itens — larguras somam 190mm (igual à largura útil da página)
    const cols = [
      { label: 'Produto', w: 46 },
      { label: 'Qtde Entregar', w: 22 },
      { label: 'Vr.Unit', w: 18 },
      { label: 'QtdeRec 1', w: 16 },
      { label: 'QtdeRec 2', w: 16 },
      { label: 'Unid', w: 14 },
      { label: 'Data Entrega', w: 20 },
      { label: 'Data Receb.', w: 22 },
      { label: 'Assinatura Recebedor', w: 16 }
    ];
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const rowH = 8;

    // Cabeçalho da tabela
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7);
    let cx = marginX;
    cols.forEach(c => {
      // A cor de preenchimento precisa ser reafirmada a cada célula — em
      // alguns navegadores/versões do jsPDF, chamadas de doc.text() entre
      // um rect() e outro "resetam" o fill state, fazendo as células
      // seguintes saírem pretas (escondendo o texto do cabeçalho).
      doc.setFillColor(230, 230, 230);
      doc.rect(cx, y, c.w, rowH, 'FD');
      const lines = doc.splitTextToSize(c.label, c.w - 2);
      doc.text(lines, cx + c.w / 2, y + (rowH / 2) - (lines.length - 1) * 1.3, { align: 'center' });
      cx += c.w;
    });
    y += rowH;

    // Linhas de itens
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let somaTotal = 0;
    const dataEntregaFmt = pedido.dataPrevistaEntrega
      ? new Date(pedido.dataPrevistaEntrega + 'T12:00:00').toLocaleDateString('pt-BR')
      : '—';

    itensProd.forEach(it => {
      const qtd = Number(it.quantidadePedida) || 0;
      const preco = Number(it.precoUnitario) || 0;
      somaTotal += it.valorTotalItem || (qtd * preco);

      cx = marginX;
      const values = [
        it.produtoNome || 'Produto',
        qtd.toLocaleString('pt-BR'),
        preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        '',
        '',
        it.unidadeMedida || 'KG',
        dataEntregaFmt,
        '',
        ''
      ];
      cols.forEach((c, idx) => {
        doc.rect(cx, y, c.w, rowH);
        const align = idx === 0 ? 'left' : 'center';
        const tx = align === 'left' ? cx + 2 : cx + c.w / 2;
        const lines = doc.splitTextToSize(values[idx], c.w - 2);
        doc.text(lines, tx, y + (rowH / 2) + 1.3, { align });
        cx += c.w;
      });
      y += rowH;
    });

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Valor Total do Pedido: R$ ${somaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, rightX, y, { align: 'right' });
    y += 10;

    // Caixa de Observações
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9);
    doc.rect(marginX, y - 5, 55, 7);
    doc.text('OBSERVAÇÕES:', marginX + 27.5, y, { align: 'center' });
    y += 8;

    const obsEsquerda = [
      '1- Os produtos deste pedido deverão ser entregues no galpão da',
      '   Cooperativa, conforme horário combinado com a coordenação.',
      '',
      '3- Produtos que exigem refrigeração (ex.: polpas e carnes) não',
      '   serão recebidos se não estiverem devidamente congelados.'
    ];
    const obsDireita = [
      '2- Os produtos deste pedido deverão estar etiquetados, com',
      '   indicação legível do produtor e do produto (inclusive o sabor,',
      '   no caso de polpas).',
      '',
      '4- Avisar a Cooperativa com antecedência mínima de 48 horas',
      '   caso não tenha o produto para entregar.'
    ];
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    const obsColW = (tableW - 6) / 2;
    obsEsquerda.forEach((line, idx) => doc.text(line, marginX, y + idx * 4.2));
    obsDireita.forEach((line, idx) => doc.text(line, marginX + obsColW + 6, y + idx * 4.2));
    y += obsEsquerda.length * 4.2 + 14;

    // Assinatura do Produtor
    const assinX1 = pageW / 2 - 35;
    const assinX2 = pageW / 2 + 35;
    doc.setDrawColor(20, 20, 20);
    doc.line(assinX1, y, assinX2, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(pageW / 2 - 32, y - 4.5, 64, 7);
    doc.text('Assinatura do Produtor', pageW / 2, y, { align: 'center' });

    // Rodapé
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(
      new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      marginX,
      pageH - 12
    );
    doc.text('Página 1 de 1', rightX, pageH - 12, { align: 'right' });

    doc.save(`Pedido_${pedido.numeroPedido}_${prodNome.replace(/\s+/g, '_')}.pdf`);
  };

  // Relatório de Entrega — modelo "1.09.2-NP", agrupado por escola de
  // destino (cada produtor pode entregar o mesmo pedido em várias escolas;
  // cada bloco mostra o endereço da escola e os itens destinados a ela).
  const exportEntregaEscolaProdutorPDF = (pedido: PedidoProdutorPAA, produtorId: string) => {
    const prodObj = produtores.find(p => p.id === produtorId);
    const itensProd = (pedido.itens || []).filter(i => i.produtorId === produtorId);
    const prodNome = (prodObj?.nome || itensProd[0]?.produtorNome || 'Produtor Rural').toUpperCase();

    const cooperadoVinculado = prodObj?.cooperadoId ? cooperados.find(c => c.id === prodObj.cooperadoId) : null;
    const digitosMatricula = cooperadoVinculado?.matricula?.replace(/\D/g, '');
    const codigoProdutor = digitosMatricula && digitosMatricula.length > 0
      ? digitosMatricula.slice(-3)
      : String(Math.abs((prodObj?.id || produtorId).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000, 0))).padStart(3, '0');

    // Agrupa os itens do produtor por escola de destino
    const grupos = new Map<string, { escolaNome: string; itens: typeof itensProd }>();
    itensProd.forEach(it => {
      const chave = it.escolaId || it.escolaNome || 'sem-escola';
      if (!grupos.has(chave)) grupos.set(chave, { escolaNome: it.escolaNome || 'Escola não definida', itens: [] });
      grupos.get(chave)!.itens.push(it);
    });

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 10;
    const rightX = pageW - marginX;
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text((config.nomeCooperativa || config.cooperativaNome || 'COOPERATIVA').toUpperCase(), pageW / 2, y, { align: 'center' });
    y += 9;

    doc.setFontSize(12);
    doc.text('NOTA DE ENTREGA', pageW / 2, y, { align: 'center' });
    y += 9;

    doc.setDrawColor(20, 20, 20);
    doc.rect(marginX + 35, y - 5, pageW - 2 * (marginX + 35), 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Comprovante de Entrega dos Produtos na Escola', pageW / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(9);
    doc.text('Nº Pedido:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pedido.numeroPedido}`, marginX + 20, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Programa:', marginX + 70, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pedido.programaNome || pedido.programa || 'PAA/PNAE'}`, marginX + 92, y);
    y += 9;

    doc.setDrawColor(20, 20, 20);
    doc.rect(marginX, y - 6, pageW - 2 * marginX, 9);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Núm. Entregas:', marginX + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pedido.qtdeEntregas || 1}`, marginX + 32, y);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Escolas Atendidas:', marginX + 90, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${grupos.size}`, marginX + 122, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${codigoProdutor}   ${prodNome}`, marginX, y);
    doc.setLineWidth(0.3);
    doc.line(marginX, y + 1.5, rightX, y + 1.5);
    y += 8;

    const cols = [
      { label: 'Produto', w: 40 },
      { label: 'Qtde Entrega', w: 20 },
      { label: 'Vr.Unit', w: 16 },
      { label: 'QtdeRec 1', w: 15 },
      { label: 'QtdeRec 2', w: 15 },
      { label: 'Unid', w: 12 },
      { label: 'Data Entrega', w: 18 },
      { label: 'Assinatura do Recebedor', w: 36 },
      { label: 'Data Receb.', w: 18 }
    ];

    const dataEntregaFmt = pedido.dataPrevistaEntrega
      ? new Date(pedido.dataPrevistaEntrega + 'T12:00:00').toLocaleDateString('pt-BR')
      : '—';

    Array.from(grupos.values()).forEach((grupo, gIdx) => {
      // Quebra de página se não houver espaço para mais um bloco de escola
      if (y > pageH - 60) {
        doc.addPage();
        y = 18;
      }

      const escInfo = escolasPnae.find(e => e.nomeEscola === grupo.escolaNome) ||
        escolasPnae.find(e => grupo.itens[0]?.escolaId && e.id === grupo.itens[0].escolaId);
      const endereco = escInfo?.endereco || [escInfo?.logradouroNum, escInfo?.localidade].filter(Boolean).join(', ') || 'Endereço não cadastrado';
      const bairro = escInfo?.bairro || escInfo?.municipio || '—';

      // Linha: nome da escola | endereço | bairro/distrito
      // Trunca cada texto para caber em uma única linha na largura da
      // célula (em vez de deixar o jsPDF quebrar em várias linhas e
      // estourar a altura fixa da caixa, como acontecia antes).
      const truncarParaCaber = (texto: string, maxW: number): string => {
        if (doc.getTextWidth(texto) <= maxW) return texto;
        let t = texto;
        while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) {
          t = t.slice(0, -1);
        }
        return t + '…';
      };

      const wEscola = 65, wEnd = 70, wBairroLabel = 25, wBairro = pageW - 2 * marginX - wEscola - wEnd - wBairroLabel;
      let bx = marginX;
      doc.setDrawColor(20, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.rect(bx, y, wEscola, 8); doc.text(truncarParaCaber(grupo.escolaNome.toUpperCase(), wEscola - 4), bx + 2, y + 5.5); bx += wEscola;
      doc.rect(bx, y, wEnd, 8); doc.text(truncarParaCaber(endereco.toUpperCase(), wEnd - 4), bx + 2, y + 5.5); bx += wEnd;
      doc.text('Bairro/Distrito:', bx, y + 5.5); bx += wBairroLabel;
      doc.rect(bx, y, wBairro, 8); doc.text(truncarParaCaber(bairro.toUpperCase(), wBairro - 4), bx + 2, y + 5.5);
      y += 10;

      // Cabeçalho da tabela de itens
      let cx = marginX;
      cols.forEach(c => {
        doc.setFillColor(230, 230, 230);
        doc.rect(cx, y, c.w, 8, 'FD');
        const lines = doc.splitTextToSize(c.label, c.w - 2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(lines, cx + c.w / 2, y + 4 - (lines.length - 1) * 1.3, { align: 'center' });
        cx += c.w;
      });
      y += 8;

      // Linhas de itens da escola
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      grupo.itens.forEach(it => {
        cx = marginX;
        const values = [
          it.produtoNome || 'Produto',
          (Number(it.quantidadePedida) || 0).toLocaleString('pt-BR'),
          (Number(it.precoUnitario) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          '', '',
          it.unidadeMedida || 'KG',
          dataEntregaFmt,
          '', ''
        ];
        cols.forEach((c, idx) => {
          doc.rect(cx, y, c.w, 8);
          const align = idx === 0 ? 'left' : 'center';
          const tx = align === 'left' ? cx + 2 : cx + c.w / 2;
          doc.text(values[idx], tx, y + 5, { align });
          cx += c.w;
        });
        y += 8;
      });

      // Divisória grossa entre blocos de escola
      y += 2;
      doc.setLineWidth(1.2);
      doc.line(marginX, y, rightX, y);
      doc.setLineWidth(0.2);
      y += 8;
    });

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9);
    doc.text('Obs.: Avisar com antecedência de 48 horas se não tiver o produto pra entregar.', pageW / 2, y, { align: 'center' });
    y += 16;

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9);
    doc.text('Assinatura do produtor:', marginX, y);
    doc.setLineWidth(0.3);
    doc.line(marginX + 40, y, marginX + 115, y);
    doc.text(`Trairi-CE, ____/____/______`, marginX + 125, y);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(
      new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      marginX,
      pageH - 12
    );
    doc.text(`Página 1 de ${doc.internal.pages.length - 1}`, rightX, pageH - 12, { align: 'right' });

    doc.save(`Entrega_${pedido.numeroPedido}_${prodNome.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSendPedidoProdutorWhatsApp = (pedido: PedidoProdutorPAA, produtorId: string) => {
    const prodObj = produtores.find(p => p.id === produtorId);
    const itensProd = (pedido.itens || []).filter(i => i.produtorId === produtorId);
    const prodNome = prodObj?.nome || itensProd[0]?.produtorNome || 'Produtor Rural';
    const phone = prodObj?.whatsapp || prodObj?.celular || prodObj?.telefone || '';
    
    const cleanPhone = phone.replace(/\D/g, '');
    const somaTotal = itensProd.reduce((sum, it) => sum + (it.valorTotalItem || (it.quantidadePedida || 0) * (it.precoUnitario || 0)), 0);

    let itensText = itensProd.map(it => `• *${it.produtoNome}*: ${it.quantidadePedida} ${it.unidadeMedida || 'KG'} (R$ ${(it.precoUnitario || 0).toFixed(2)} un = R$ ${(it.valorTotalItem || (it.quantidadePedida || 0) * (it.precoUnitario || 0)).toFixed(2)})`).join('\n');

    const msg = `*PEDIDO DE FORNECIMENTO — SISGEPA / PNAE / PAA*
Olá *${prodNome}*, você possui um novo pedido de fornecimento cadastrado!

📋 *Pedido Nº:* ${pedido.numeroPedido}
🌱 *Programa:* ${pedido.programaNome || pedido.programa || 'PAA/PNAE'}
🏫 *Escola/Destino:* ${pedido.escolaNome || 'Escolas Cadastradas'}
📅 *Data Prevista de Entrega:* ${pedido.dataPrevistaEntrega || 'A definir'}

*Itens Solicitados:*
${itensText}

💰 *Valor Total do Pedido:* R$ ${somaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

Por favor, confirme o recebimento desta mensagem e prepare os produtos conforme o cronograma. Obrigado!`;

    if (cleanPhone) {
      abrirLinkExterno(montarLinkWhatsApp(cleanPhone, msg));
    } else {
      const manualPhone = prompt(`Informe o número de WhatsApp (com DDD) para enviar o pedido para ${prodNome}:`, '85');
      if (manualPhone) {
        abrirLinkExterno(montarLinkWhatsApp(manualPhone, msg));
      }
    }
  };

  // Gera o próximo número sequencial de pedido no formato PED-01/2026 —
  // sigla + sequencial de 2 dígitos (ou mais, se passar de 99) + ano corrente.
  // A numeração reinicia a cada ano civil, contando apenas os pedidos já
  // registrados naquele ano.
  const gerarProximoNumeroPedido = (): string => {
    const anoAtual = new Date().getFullYear();
    const regex = /^PED-(\d+)\/(\d{4})$/;
    const maiorSequencialDoAno = pedidosProdutorPAA.reduce((maior, p) => {
      const match = regex.exec(p.numeroPedido || '');
      if (match && Number(match[2]) === anoAtual) {
        return Math.max(maior, Number(match[1]));
      }
      return maior;
    }, 0);
    const proximoSequencial = String(maiorSequencialDoAno + 1).padStart(2, '0');
    return `PED-${proximoSequencial}/${anoAtual}`;
  };

  // Garante que pedidos da mesma Chamada Pública / Edital compartilhem o mesmo
  // número de pedido, independentemente da fonte de recursos utilizada.
  const getNumeroPedidoParaChamada = (chamadaId?: string, numeroEdital?: string): string => {
    if (chamadaId || numeroEdital) {
      const pedidoExistente = pedidosProdutorPAA.find(p =>
        (chamadaId && p.chamadaPublicaId === chamadaId) ||
        (numeroEdital && p.chamadaPublicaEdital === numeroEdital)
      );
      if (pedidoExistente?.numeroPedido) {
        return pedidoExistente.numeroPedido;
      }
    }
    return gerarProximoNumeroPedido();
  };

  const handleOpenPedido = (p?: PedidoProdutorPAA) => {
    if (p) {
      setEditingPedido(p);
      const initialEscolasIds = p.escolasIds && p.escolasIds.length > 0
        ? p.escolasIds
        : (p.escolaId ? [p.escolaId] : (escolasPnae.length > 0 ? [escolasPnae[0].id] : []));
      const initialEscolasNomes = p.escolasNomes && p.escolasNomes.length > 0
        ? p.escolasNomes
        : (p.escolaNome ? [p.escolaNome] : (escolasPnae.length > 0 ? [escolasPnae[0].nomeEscola] : []));

      const initialQtdEntregas = p.qtdeEntregas || (p.cronogramaEntregas && p.cronogramaEntregas.length) || 1;
      const totalKgCalc = (p.itens || []).reduce((s, it) => s + (it.quantidadePedida || 0), 0);
      const totalValorCalc = p.valorTotalPedido || (p.itens || []).reduce((s, it) => s + (it.valorTotalItem || 0), 0);
      const initialCronograma = p.cronogramaEntregas && p.cronogramaEntregas.length > 0
        ? p.cronogramaEntregas
        : generateCronogramaParaPedido(initialQtdEntregas, p.dataPrevistaEntrega, 'SEMANAL', totalKgCalc, totalValorCalc);

      setPedidoForm({
        numeroPedido: p.numeroPedido,
        programaId: p.programaId || '',
        programaNome: p.programaNome || p.programa || 'PAA',
        programa: p.programa as any,
        produtoId: (p.itens && p.itens[0]?.produtoId) || produtos[0]?.id || '',
        produtoNome: (p.itens && p.itens[0]?.produtoNome) || produtos[0]?.nome || '',
        nucleo: 'Sede',
        qtdeEntregas: initialQtdEntregas,
        intervaloFrequencia: 'SEMANAL',
        cronogramaEntregas: initialCronograma,
        autoGerarRotasLogistica: true,
        chamadaPublicaId: p.chamadaPublicaId || '',
        chamadaPublicaEdital: p.chamadaPublicaEdital || '',
        escolaId: p.escolaId || '',
        escolaNome: p.escolaNome || '',
        escolasIds: initialEscolasIds,
        escolasNomes: initialEscolasNomes,
        fonteRecursos: p.fonteRecursos,
        dataPedido: p.dataPedido,
        dataPrevistaEntrega: p.dataPrevistaEntrega,
        observacoes: p.observacoes || '',
        status: p.status,
        funruralAtivo: p.funruralAtivo || false,
        funruralAliquota: p.funruralAliquota ?? 1.5,
        taxaAdministrativaAtiva: p.taxaAdministrativaAtiva || false,
        taxaAdministrativaPercentual: p.taxaAdministrativaPercentual ?? 5
      });
      setPedidoItens(p.itens || []);
      const uniqueProdIds = Array.from(new Set((p.itens || []).map(it => it.produtorId)));
      setSelectedProdutoresIds(uniqueProdIds);
    } else {
      const defaultProg = programas[0];
      const defaultChm = chamadasPublicas[0];
      const defaultDataPrevista = new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];

      setEditingPedido(null);
      setPedidoForm({
        numeroPedido: defaultChm ? getNumeroPedidoParaChamada(defaultChm.id, defaultChm.numeroEdital) : gerarProximoNumeroPedido(),
        programaId: defaultProg?.id || '',
        programaNome: defaultProg?.nome || 'PAA',
        programa: defaultProg?.tipo || 'PAA',
        produtoId: produtos[0]?.id || '',
        produtoNome: produtos[0]?.nome || '',
        nucleo: 'Sede',
        // Nenhuma entrega é pré-criada ao abrir um pedido novo. O cronograma
        // só é gerado quando o usuário definir a quantidade de entregas
        // (campo "Quantas Entregas Serão Feitas?" ou um dos botões 1x/2x/...).
        qtdeEntregas: 0,
        intervaloFrequencia: 'SEMANAL',
        cronogramaEntregas: [],
        autoGerarRotasLogistica: true,
        chamadaPublicaId: defaultChm?.id || '',
        chamadaPublicaEdital: defaultChm?.numeroEdital || '',
        escolaId: '',
        escolaNome: '',
        // Nenhuma escola é pré-selecionada ao abrir um pedido novo. A escola
        // de destino é definida automaticamente a partir da(s) proposta(s)
        // de oferta carregada(s) para o produtor (handleLoadOfertasToPedido)
        // — antes, o pedido nascia com TODAS as escolas cadastradas
        // marcadas como destino, mesmo sem nenhum produto carregado ainda.
        escolasIds: [],
        escolasNomes: [],
        fonteRecursos: 'E. Fundamental',
        dataPedido: new Date().toISOString().split('T')[0],
        dataPrevistaEntrega: defaultDataPrevista,
        observacoes: 'Coleta agendada na propriedade dos produtores cadastrados para entrega nas escolas.',
        status: 'PENDENTE',
        funruralAtivo: false,
        funruralAliquota: 1.5,
        taxaAdministrativaAtiva: false,
        taxaAdministrativaPercentual: 5
      });
      setSelectedProdutoresIds([]);
      setPedidoItens([]);
    }
    setShowPedidoModal(true);
  };

  // Ofertas vinculadas ao programa / chamada pública selecionada no pedido
  // Ofertas filtradas estritamente pelo Programa/Edital vinculados ao
  // pedido. Antes, um casamento de texto "contém" (bidirecional) permitia
  // que qualquer proposta de um programa como "PAA-CONAB" ou "PAA-PMT"
  // aparecesse ao filtrar por "PAA" (e vice-versa), porque todos esses
  // nomes contêm a substring "PAA" — por isso o pedido mostrava propostas
  // de todos os programas em vez de só o selecionado. Agora usa apenas os
  // vínculos exatos (ID do programa e/ou ID da chamada pública).
  const ofertasDoProgramaSelecionado = useMemo(() => {
    if (!pedidoForm.programaId && !pedidoForm.chamadaPublicaId) return ofertasPAA;
    return ofertasPAA.filter(o => {
      if (pedidoForm.programaId && o.programaId === pedidoForm.programaId) return true;
      if (pedidoForm.chamadaPublicaId && o.chamadaPublicaId === pedidoForm.chamadaPublicaId) return true;
      return false;
    });
  }, [ofertasPAA, pedidoForm.programaId, pedidoForm.chamadaPublicaId]);

  const getItensFromOferta = (o: PropostaOfertaPAA) => {
    if (o.itens && o.itens.length > 0) {
      return o.itens.map(it => {
        const qtd = it.quantidadeOfertada ?? it.quantidadeKg ?? 0;
        const preco = it.precoUnitario ?? 0;
        return {
          produtoId: it.produtoId,
          produtoNome: it.produtoNome,
          unidadeMedida: it.unidadeMedida || 'KG',
          quantidadeOfertada: qtd,
          precoUnitario: preco,
          valorTotal: it.valorTotal || (qtd * preco)
        };
      });
    }
    const singleQtd = o.quantidadeOfertada ?? o.quantidadeKg ?? 0;
    const singlePreco = o.precoUnitario ?? o.valorUnitario ?? 0;
    return [{
      produtoId: o.produtoId,
      produtoNome: o.produtoNome,
      unidadeMedida: o.unidadeMedida || 'KG',
      quantidadeOfertada: singleQtd,
      precoUnitario: singlePreco,
      valorTotal: o.valorTotal || (singleQtd * singlePreco)
    }];
  };

  // Ofertas filtradas pelo produto selecionado no pedido (Vínculo estrito)
  const ofertasDoProdutoSelecionado = useMemo(() => {
    if (!pedidoForm.produtoId) return ofertasDoProgramaSelecionado;
    return ofertasDoProgramaSelecionado.filter(o => {
      const itens = getItensFromOferta(o);
      return itens.some(it => 
        it.produtoId === pedidoForm.produtoId || 
        (pedidoForm.produtoNome && it.produtoNome && it.produtoNome.toLowerCase() === pedidoForm.produtoNome.toLowerCase())
      );
    });
  }, [ofertasDoProgramaSelecionado, pedidoForm.produtoId, pedidoForm.produtoNome]);

  // Produtores que efetivamente ofertaram o produto selecionado no programa
  const produtoresComOfertaDoProduto = useMemo(() => {
    const prodIds = new Set<string>();
    ofertasDoProdutoSelecionado.forEach(o => {
      if (o.produtorId) prodIds.add(o.produtorId);
    });
    return produtores.filter(p => prodIds.has(p.id));
  }, [produtores, ofertasDoProdutoSelecionado]);

  const handleAddPedidoItem = () => {
    const defaultProd = produtos.find(p => p.id === pedidoForm.produtoId) || produtos[0];
    const matchingProds = produtoresComOfertaDoProduto.length > 0 ? produtoresComOfertaDoProduto : produtores;
    const defaultProdutor = matchingProds[0] || produtores[0];
    const prodPolo = defaultProdutor?.polo || pedidoForm.nucleo || 'Sede';
    const escMatch = escolasPnae.find(e => poloEquivale(e.polo, prodPolo)) || escolasPnae[0];
    
    // Procura oferta do produtor para herdar preço e quantidade ofertada da proposta
    const ofertaDoProd = ofertasDoProgramaSelecionado.find(o => o.produtorId === defaultProdutor?.id);
    let precoRef = defaultProd?.precoReferencia || 5.00;
    let qtdOfertada = 100;
    if (ofertaDoProd) {
      const its = getItensFromOferta(ofertaDoProd);
      const itMatch = its.find(i => i.produtoId === defaultProd?.id || i.produtoNome?.toLowerCase() === defaultProd?.nome?.toLowerCase());
      if (itMatch) {
        precoRef = itMatch.precoUnitario || precoRef;
        qtdOfertada = itMatch.quantidadeOfertada || qtdOfertada;
      }
    }

    setPedidoItens(prev => [
      ...prev,
      {
        produtorId: defaultProdutor?.id || '',
        produtorNome: defaultProdutor?.nome || 'Produtor',
        produtoId: defaultProd?.id || '',
        produtoNome: defaultProd?.nome || 'Produto',
        unidadeMedida: defaultProd?.unidadeMedida || 'KG',
        quantidadeOfertada: qtdOfertada,
        quantidadePedida: Math.min(50, qtdOfertada),
        precoUnitario: precoRef,
        valorTotalItem: Math.min(50, qtdOfertada) * precoRef,
        polo: prodPolo,
        escolaId: escMatch?.id || '',
        escolaNome: escMatch?.nomeEscola || '',
        localEntrega: escMatch?.localDeEntrega || escMatch?.nomeEscola || 'Sede',
        escolasIds: pedidoForm.escolasIds,
        escolasNomes: pedidoForm.escolasNomes
      }
    ]);
  };

  // Sincroniza a(s) escola(s) de destino do PEDIDO (usadas na coluna
  // "Chamada / Escola Destino" da listagem, no WhatsApp e no PDF) com as
  // escolas realmente selecionadas linha a linha na tabela de itens — a
  // escola de cada item é escolhida na própria tabela (coluna "Local de
  // Entrega / Escola"), nunca mais em um campo único e separado do pedido.
  const sincronizarEscolasDoPedidoComItens = (itens: ItemPedidoProdutor[]) => {
    const idsUnicos = Array.from(new Set(itens.map(it => it.escolaId).filter(Boolean))) as string[];
    const nomesUnicos = idsUnicos.map(id =>
      escolasPnae.find(e => e.id === id)?.nomeEscola || itens.find(it => it.escolaId === id)?.escolaNome || ''
    ).filter(Boolean);
    setPedidoForm(prev => ({
      ...prev,
      escolasIds: idsUnicos,
      escolasNomes: nomesUnicos,
      escolaId: idsUnicos[0] || '',
      escolaNome: nomesUnicos[0] || ''
    }));
  };

  // ===== Vínculo Pedido ↔ Chamada Pública: preço e saldo por produto =====

  // Retorna o item da Chamada Pública correspondente a um produto (por id
  // ou, na falta, por nome), usado tanto para travar o preço unitário
  // quanto para calcular o saldo/limite de quantidade disponível.
  const getItemChamadaPorProduto = (chamada: ChamadaPublica | undefined | null, produtoId: string, produtoNome?: string) => {
    if (!chamada || !chamada.itensSolicitados) return null;
    return chamada.itensSolicitados.find(it =>
      (produtoId && it.produtoId === produtoId) ||
      (produtoNome && it.produtoNome && it.produtoNome.toLowerCase() === produtoNome.toLowerCase())
    ) || null;
  };

  // Quantidade do produto já comprometida em OUTROS pedidos vinculados à
  // mesma Chamada Pública (exclui o próprio pedido em edição, para não
  // contar a quantidade dele mesmo como "já usada").
  const getQuantidadeJaUsadaNaChamada = (chamadaId: string, produtoId: string, produtoNome: string): number => {
    return pedidosProdutorPAA
      .filter(p => p.chamadaPublicaId === chamadaId && p.id !== editingPedido?.id)
      .flatMap(p => p.itens || [])
      .filter(it => (produtoId && it.produtoId === produtoId) || (!produtoId && it.produtoNome?.toLowerCase() === produtoNome?.toLowerCase()))
      .reduce((sum, it) => sum + (Number(it.quantidadePedida) || 0), 0);
  };

  // Saldo ainda disponível de um produto na Chamada Pública vinculada ao
  // pedido, considerando o que outros pedidos já reservaram. Retorna null
  // quando não há Chamada Pública vinculada ou o produto não faz parte
  // dela (nesse caso não há limite imposto pela chamada).
  const getSaldoDisponivelChamada = (produtoId: string, produtoNome: string): number | null => {
    const chamada = chamadasPublicas.find(c => c.id === pedidoForm.chamadaPublicaId);
    const itemChamada = getItemChamadaPorProduto(chamada, produtoId, produtoNome);
    if (!chamada || !itemChamada) return null;
    const jaUsado = getQuantidadeJaUsadaNaChamada(chamada.id, produtoId, produtoNome);
    return Number((itemChamada.quantidadeTotal - jaUsado).toFixed(2));
  };

  const handleRemovePedidoItem = (idx: number) => {
    setPedidoItens(prev => {
      const atualizado = prev.filter((_, i) => i !== idx);
      sincronizarEscolasDoPedidoComItens(atualizado);
      return atualizado;
    });
  };

  const handleUpdatePedidoItem = (idx: number, field: string, value: any) => {
    setPedidoItens(prev => {
      const atualizado = prev.map((item, i) => {
      if (i === idx) {
        let updated = { ...item, [field]: value };
        if (field === 'produtoId') {
          const pObj = produtos.find(p => p.id === value);
          updated.produtoId = value;
          updated.produtoNome = pObj?.nome || item.produtoNome;
          updated.unidadeMedida = pObj?.unidadeMedida || item.unidadeMedida;
          updated.precoUnitario = pObj?.precoReferencia || item.precoUnitario;
        } else if (field === 'produtorId') {
          const prodObj = produtores.find(p => p.id === value);
          const pPolo = prodObj?.polo || 'Sede';
          const escMatch = escolasPnae.find(e => poloEquivale(e.polo, pPolo)) || escolasPnae[0];
          updated.produtorId = value;
          updated.produtorNome = prodObj?.nome || item.produtorNome;
          updated.polo = pPolo;
          updated.escolaId = escMatch?.id || item.escolaId;
          updated.escolaNome = escMatch?.nomeEscola || item.escolaNome;
          updated.localEntrega = escMatch?.localDeEntrega || escMatch?.nomeEscola || item.localEntrega;

          // Sincroniza preço e oferta da proposta do produtor selecionado
          const ofertaDoProd = ofertasDoProgramaSelecionado.find(o => o.produtorId === value);
          if (ofertaDoProd) {
            const its = getItensFromOferta(ofertaDoProd);
            const itMatch = its.find(it => 
              it.produtoId === item.produtoId || 
              (it.produtoNome && item.produtoNome && it.produtoNome.toLowerCase() === item.produtoNome.toLowerCase())
            );
            if (itMatch) {
              updated.precoUnitario = itMatch.precoUnitario || updated.precoUnitario;
              updated.quantidadeOfertada = itMatch.quantidadeOfertada || updated.quantidadeOfertada;
              if (!updated.quantidadePedida || updated.quantidadePedida === 0) {
                updated.quantidadePedida = itMatch.quantidadeOfertada || 50;
              }
              updated.valorTotalItem = (updated.quantidadePedida || 0) * updated.precoUnitario;
            }
          }
        } else if (field === 'escolaId') {
          const escObj = escolasPnae.find(e => e.id === value);
          updated.escolaId = value;
          updated.escolaNome = escObj?.nomeEscola || item.escolaNome;
          updated.localEntrega = escObj?.localDeEntrega || escObj?.nomeEscola || item.localEntrega;
        }
        // Se o pedido estiver vinculado a uma Chamada Pública e o produto do
        // item constar nela, o preço unitário é travado no valor máximo do
        // edital — sobrepõe qualquer preço de catálogo ou de proposta de
        // oferta, garantindo que o pedido sempre reflita o preço contratado.
        const chamadaVinculada = chamadasPublicas.find(c => c.id === pedidoForm.chamadaPublicaId);
        const itemDaChamada = getItemChamadaPorProduto(chamadaVinculada, updated.produtoId, updated.produtoNome);
        if (itemDaChamada) {
          updated.precoUnitario = itemDaChamada.precoMaximoUnitario;
        } else if (field === 'precoUnitario') {
          updated.precoUnitario = parseFloat(value) || 0;
        }
        const qtdFinal = field === 'quantidadePedida' ? (parseFloat(value) || 0) : (updated.quantidadePedida || 0);
        updated.quantidadePedida = qtdFinal;
        updated.valorTotalItem = qtdFinal * (updated.precoUnitario || 0);
        return updated;
      }
      return item;
      });
      if (field === 'escolaId' || field === 'produtorId') {
        sincronizarEscolasDoPedidoComItens(atualizado);
      }
      return atualizado;
    });
  };

  // --- Helpers do Rateio de Produtores ---

  // Ofertas SUBMETIDAs ou ACEITAs de um produto específico dentro de uma
  // chamada. IMPORTANTE: uma proposta de oferta pode reunir vários produtos
  // em `itens[]` (o cadastro só grava produtoId/produtoNome/quantidadeOfertada
  // no nível raiz para o PRIMEIRO produto da lista — ver handleSaveOferta).
  // Por isso é preciso procurar o produto tanto no nível raiz quanto dentro
  // de `itens[]`; senão o rateio só enxerga o primeiro produto de cada
  // proposta com múltiplos itens e "perde" os demais.
  const getOfertasParaProdutoChamada = (
    chamadaId: string,
    produtoNome: string,
    produtoId?: string
  ): { produtorId: string; produtorNome: string; quantidadeOfertada: number }[] => {
    const bate = (nome?: string, id?: string) =>
      (!!produtoId && !!id && id === produtoId) ||
      (!!nome && !!produtoNome && nome.trim().toLowerCase() === produtoNome.trim().toLowerCase());

    const resolvidas: { produtorId: string; produtorNome: string; quantidadeOfertada: number }[] = [];

    ofertasPAA.forEach(o => {
      if (o.chamadaPublicaId !== chamadaId || o.status === 'RECUSADA') return;

      if (o.itens && o.itens.length > 0) {
        // Proposta com um ou mais produtos detalhados em itens[] — procura o
        // item deste produto especificamente (pode não ser o primeiro).
        const item = o.itens.find(it => bate(it.produtoNome, it.produtoId));
        if (item) {
          resolvidas.push({
            produtorId: o.produtorId,
            produtorNome: o.produtorNome,
            quantidadeOfertada: Number(item.quantidadeOfertada ?? item.quantidadeKg) || 0
          });
        }
        return;
      }

      // Proposta antiga / de produto único, sem itens[] detalhado.
      if (bate(o.produtoNome, o.produtoId)) {
        resolvidas.push({
          produtorId: o.produtorId,
          produtorNome: o.produtorNome,
          quantidadeOfertada: Number(o.quantidadeOfertada ?? o.quantidadeKg) || 0
        });
      }
    });

    return resolvidas;
  };

  // Distribui `total` entre `pesos` (mesma ordem), proporcionalmente,
  // arredondando para 2 casas e ajustando a sobra no último item para que a
  // soma bata exatamente com `total`.
  const distribuirProporcional = (total: number, pesos: number[]): number[] => {
    const somaPesos = pesos.reduce((s, p) => s + p, 0);
    if (somaPesos <= 0 || total <= 0) return pesos.map(() => 0);
    const valores = pesos.map(p => Math.round((p / somaPesos) * total * 100) / 100);
    const somaAtual = valores.reduce((s, v) => s + v, 0);
    const diferenca = Math.round((total - somaAtual) * 100) / 100;
    if (valores.length > 0) valores[valores.length - 1] = Math.round((valores[valores.length - 1] + diferenca) * 100) / 100;
    return valores;
  };

  // Gera automaticamente um rateio sugerido para uma chamada pública: para
  // cada produto do edital, reparte a quantidade solicitada entre os
  // produtores que a ofertaram (proporcional à quantidade ofertada por
  // cada um, sem nunca superar o total do edital) e, dentro de cada
  // produtor, reparte entre as escolas contempladas (proporcional ao nº de
  // alunos atendidos; igualmente se não houver essa informação).
  const gerarRateioAutomatico = (chamada: ChamadaPublica): RateioChamadaPublica => {
    const escolasEdital = chamada.escolasContempladas && chamada.escolasContempladas.length > 0
      ? chamada.escolasContempladas
      : [];

    const itens: RateioProduto[] = (chamada.itensSolicitados || []).map(item => {
      const ofertas = getOfertasParaProdutoChamada(chamada.id, item.produtoNome, item.produtoId);
      const pesosProdutores = ofertas.map(o => Number(o.quantidadeOfertada) || 0);
      const alocacoes = distribuirProporcional(item.quantidadeTotal, pesosProdutores);

      const produtores: RateioProdutor[] = ofertas.map((o, idx) => {
        const quantidadeAlocada = alocacoes[idx] || 0;
        const pesosEscolas = escolasEdital.map(e => Number(e.alunosAtendidos) || 1);
        const qtdsEscolas = distribuirProporcional(quantidadeAlocada, pesosEscolas.length > 0 ? pesosEscolas : [1]);
        return {
          produtorId: o.produtorId,
          produtorNome: o.produtorNome,
          quantidadeOfertada: Number(o.quantidadeOfertada) || 0,
          quantidadeAlocada,
          escolas: escolasEdital.length > 0
            ? escolasEdital.map((e, eIdx) => ({
                escolaId: e.id || e.nomeEscola,
                escolaNome: e.nomeEscola,
                quantidade: qtdsEscolas[eIdx] || 0
              }))
            : []
        };
      });

      return {
        produtoId: item.produtoId,
        produtoNome: item.produtoNome,
        unidade: item.unidade,
        quantidadeTotalChamada: item.quantidadeTotal,
        precoMaximoUnitario: item.precoMaximoUnitario,
        produtores
      };
    });

    return {
      id: '',
      tenantId: '',
      chamadaPublicaId: chamada.id,
      chamadaPublicaEdital: chamada.numeroEdital,
      programaId: chamada.programaId,
      programaNome: chamada.programaNome,
      fonteRecursos: chamada.fonteRecurso || chamada.fonteRecursos,
      itens,
      dataAtualizacao: ''
    };
  };

  const handleSelecionarChamadaRateio = (chamadaId: string) => {
    setRateioChamadaId(chamadaId);
    if (!chamadaId) { setRateioEmEdicao(null); return; }
    const salvo = rateiosChamadas.find(r => r.chamadaPublicaId === chamadaId);
    const chamada = chamadasPublicas.find(c => c.id === chamadaId);
    if (salvo) {
      setRateioEmEdicao(salvo);
    } else if (chamada) {
      setRateioEmEdicao(gerarRateioAutomatico(chamada));
    } else {
      setRateioEmEdicao(null);
    }
  };

  const handleRegerarRateioAutomatico = () => {
    const chamada = chamadasPublicas.find(c => c.id === rateioChamadaId);
    if (!chamada) return;
    if (!confirm('Isso vai substituir os ajustes manuais feitos neste rateio pela sugestão automática. Deseja continuar?')) return;
    setRateioEmEdicao(gerarRateioAutomatico(chamada));
  };

  const handleQuantidadeProdutorRateio = (produtoIdx: number, produtorIdx: number, novaQtd: number) => {
    setRateioEmEdicao(prev => {
      if (!prev) return prev;
      const itens = prev.itens.map((item, iIdx) => {
        if (iIdx !== produtoIdx) return item;
        const produtores = item.produtores.map((p, pIdx) => {
          if (pIdx !== produtorIdx) return p;
          // Redistribui a nova quantidade entre as escolas mantendo as
          // proporções já usadas (ou igualmente, se ainda não havia rateio).
          const pesos = p.escolas.length > 0 ? p.escolas.map(e => e.quantidade || 1) : [1];
          const novasQtdsEscolas = distribuirProporcional(novaQtd, pesos);
          return {
            ...p,
            quantidadeAlocada: novaQtd,
            escolas: p.escolas.map((e, eIdx) => ({ ...e, quantidade: novasQtdsEscolas[eIdx] || 0 }))
          };
        });
        return { ...item, produtores };
      });
      return { ...prev, itens };
    });
  };

  const handleQuantidadeEscolaRateio = (produtoIdx: number, produtorIdx: number, escolaIdx: number, novaQtd: number) => {
    setRateioEmEdicao(prev => {
      if (!prev) return prev;
      const itens = prev.itens.map((item, iIdx) => {
        if (iIdx !== produtoIdx) return item;
        const produtores = item.produtores.map((p, pIdx) => {
          if (pIdx !== produtorIdx) return p;
          const escolas = p.escolas.map((e, eIdx) => eIdx === escolaIdx ? { ...e, quantidade: novaQtd } : e);
          return { ...p, escolas };
        });
        return { ...item, produtores };
      });
      return { ...prev, itens };
    });
  };

  const handleSalvarRateioAtual = () => {
    if (!canWrite) { blockWriteAction(); return; }
    if (!rateioEmEdicao) return;
    salvarRateioChamada({
      chamadaPublicaId: rateioEmEdicao.chamadaPublicaId,
      chamadaPublicaEdital: rateioEmEdicao.chamadaPublicaEdital,
      programaId: rateioEmEdicao.programaId,
      programaNome: rateioEmEdicao.programaNome,
      fonteRecursos: rateioEmEdicao.fonteRecursos,
      itens: rateioEmEdicao.itens,
      observacoes: rateioEmEdicao.observacoes
    });
    alert('Rateio salvo com sucesso! Ele já pode ser carregado ao registrar o Pedido desta chamada pública.');
  };

  // Converte o rateio salvo de uma chamada em itens de pedido — um item por
  // combinação (produtor, escola), já com a quantidade definida no rateio.
  // É isso que faz o Pedido "nascer" com os dados do rateio.
  const handleCarregarRateioNoPedido = (chamadaIdOverride?: string, opts?: { silencioso?: boolean }) => {
    const chamadaAlvoId = chamadaIdOverride || pedidoForm.chamadaPublicaId;
    const rateio = rateiosChamadas.find(r => r.chamadaPublicaId === chamadaAlvoId);
    if (!rateio) {
      if (!opts?.silencioso) alert('Esta chamada pública ainda não tem um rateio salvo. Acesse a aba "Rateio de Produtores" para criá-lo.');
      return;
    }

    // O Pedido deve ficar na MESMA fonte de recurso do rateio (herdada da
    // Chamada Pública). Se o usuário trocou manualmente a fonte no Pedido
    // depois de selecionar a chamada, avisa antes de prosseguir.
    if (!opts?.silencioso && rateio.fonteRecursos && pedidoForm.fonteRecursos && rateio.fonteRecursos !== pedidoForm.fonteRecursos) {
      const prosseguir = confirm(
        `Atenção: o rateio desta chamada foi feito na fonte de recurso "${rateio.fonteRecursos}", mas o Pedido está com a fonte "${pedidoForm.fonteRecursos}". Deseja ajustar o Pedido para "${rateio.fonteRecursos}" e continuar?`
      );
      if (!prosseguir) return;
      setPedidoForm(prev => ({ ...prev, fonteRecursos: rateio.fonteRecursos! }));
    } else if (rateio.fonteRecursos) {
      setPedidoForm(prev => ({ ...prev, fonteRecursos: prev.fonteRecursos || rateio.fonteRecursos! }));
    }

    const itensFiltrados = pedidoForm.produtoId || pedidoForm.produtoNome
      ? rateio.itens.filter(it =>
          (pedidoForm.produtoId && it.produtoId === pedidoForm.produtoId) ||
          (pedidoForm.produtoNome && it.produtoNome.toLowerCase() === pedidoForm.produtoNome.toLowerCase())
        )
      : rateio.itens;

    if (itensFiltrados.length === 0) {
      if (!opts?.silencioso) {
        alert(pedidoForm.produtoNome
          ? `Nenhum item do rateio corresponde ao produto "${pedidoForm.produtoNome}".`
          : 'Este rateio ainda não tem produtos com produtores rateados. Acesse a aba "Rateio de Produtores" para completá-lo.'
        );
      }
      return;
    }

    const novosItens: ItemPedidoProdutor[] = [];
    itensFiltrados.forEach(item => {
      item.produtores.filter(p => (p.quantidadeAlocada || 0) > 0).forEach(p => {
        const prodObj = produtores.find(pr => pr.id === p.produtorId);
        const escolasComQtd = p.escolas.filter(e => (e.quantidade || 0) > 0);
        const linhasEscola = escolasComQtd.length > 0 ? escolasComQtd : [{ escolaId: '', escolaNome: '', quantidade: p.quantidadeAlocada }];
        linhasEscola.forEach(e => {
          novosItens.push({
            produtorId: p.produtorId,
            produtorNome: p.produtorNome,
            produtoId: item.produtoId || '',
            produtoNome: item.produtoNome,
            unidadeMedida: item.unidade,
            quantidadeOfertada: p.quantidadeOfertada,
            quantidadePedida: e.quantidade,
            precoUnitario: item.precoMaximoUnitario,
            valorTotalItem: e.quantidade * item.precoMaximoUnitario,
            polo: prodObj?.polo || 'Sede',
            escolaId: e.escolaId,
            escolaNome: e.escolaNome,
            localEntrega: e.escolaNome || 'Sede',
            escolasIds: e.escolaId ? [e.escolaId] : [],
            escolasNomes: e.escolaNome ? [e.escolaNome] : []
          });
        });
      });
    });

    setPedidoItens(novosItens);
    sincronizarEscolasDoPedidoComItens(novosItens);
    setSelectedProdutoresIds(Array.from(new Set(novosItens.map(it => it.produtorId))));

    const totalProdutores = new Set(novosItens.map(it => it.produtorId)).size;
    const totalProdutos = new Set(novosItens.map(it => it.produtoId || it.produtoNome)).size;
    const totalEscolas = new Set(novosItens.map(it => it.escolaId).filter(Boolean)).size;
    if (!opts?.silencioso) {
      alert(`Rateio carregado: ${novosItens.length} itens (${totalProdutos} produto(s), ${totalProdutores} produtor(es), ${totalEscolas} escola(s)).`);
    }
  };

  const handleLoadOfertasToPedido = (prodId?: string) => {
    const ofertasAlvo = prodId 
      ? ofertasDoProgramaSelecionado.filter(o => o.produtorId === prodId)
      : (pedidoForm.produtoId ? ofertasDoProdutoSelecionado : ofertasDoProgramaSelecionado);

    if (ofertasAlvo.length === 0) {
      alert(`Nenhuma proposta de oferta encontrada para ${prodId ? 'este produtor' : 'os produtores'} ${pedidoForm.produtoNome ? `com o produto "${pedidoForm.produtoNome}"` : ''} no programa ${pedidoForm.programaNome || pedidoForm.programa}. Cadastre uma proposta de oferta antes de carregar.`);
      return;
    }

    const novosItens: ItemPedidoProdutor[] = [];
    const prodIdsAdicionados: string[] = [];
    const chamadaVinculada = chamadasPublicas.find(c => c.id === pedidoForm.chamadaPublicaId);

    ofertasAlvo.forEach(o => {
      const prodObj = produtores.find(p => p.id === o.produtorId);
      const prodPolo = prodObj?.polo || 'Sede';
      // Sugestão automática da escola pelo polo do produtor — o usuário pode
      // trocar livremente na coluna "Local de Entrega / Escola" da tabela de
      // itens do pedido (é lá que a escola de cada item é escolhida de fato).
      const escMatch = escolasPnae.find(e => poloEquivale(e.polo, prodPolo)) || escolasPnae[0];

      let itensOferta = getItensFromOferta(o);
      if (pedidoForm.produtoId) {
        itensOferta = itensOferta.filter(it => 
          it.produtoId === pedidoForm.produtoId || 
          (pedidoForm.produtoNome && it.produtoNome && it.produtoNome.toLowerCase() === pedidoForm.produtoNome.toLowerCase())
        );
      }
      
      itensOferta.forEach(it => {
        const qtd = it.quantidadeOfertada || 50;
        // Se o pedido estiver vinculado a uma Chamada Pública e o produto
        // constar nela, o preço unitário do item é travado no valor máximo
        // definido no edital — não usa mais o preço da proposta de oferta
        // do produtor nesse caso.
        const itemChamada = getItemChamadaPorProduto(chamadaVinculada, it.produtoId || pedidoForm.produtoId, it.produtoNome || pedidoForm.produtoNome);
        const preco = itemChamada ? itemChamada.precoMaximoUnitario : (it.precoUnitario || 5.00);
        novosItens.push({
          produtorId: o.produtorId,
          produtorNome: o.produtorNome || prodObj?.nome || 'Produtor',
          produtoId: it.produtoId || pedidoForm.produtoId,
          produtoNome: it.produtoNome || pedidoForm.produtoNome,
          unidadeMedida: it.unidadeMedida || 'KG',
          quantidadeOfertada: it.quantidadeOfertada || qtd,
          quantidadePedida: qtd,
          precoUnitario: preco,
          valorTotalItem: qtd * preco,
          polo: prodPolo,
          escolaId: escMatch?.id || '',
          escolaNome: escMatch?.nomeEscola || '',
          localEntrega: escMatch?.localDeEntrega || escMatch?.nomeEscola || 'Sede',
          escolasIds: escMatch ? [escMatch.id] : [],
          escolasNomes: escMatch ? [escMatch.nomeEscola] : []
        });
      });
      prodIdsAdicionados.push(o.produtorId);
    });

    if (prodId) {
      setPedidoItens(prev => {
        const semProdutorAtual = prev.filter(it => it.produtorId !== prodId);
        const todosItens = [...semProdutorAtual, ...novosItens];
        sincronizarEscolasDoPedidoComItens(todosItens);
        return todosItens;
      });
      setSelectedProdutoresIds(prev => Array.from(new Set([...prev, prodId])));
    } else {
      setPedidoItens(novosItens);
      sincronizarEscolasDoPedidoComItens(novosItens);
      setSelectedProdutoresIds(Array.from(new Set(prodIdsAdicionados)));
    }
  };

  const handleSavePedido = (e: React.FormEvent) => {
    e.preventDefault();
    if (pedidoItens.length === 0) {
      alert('Atenção: Por favor, selecione a Chamada Pública e clique em "Carregar Rateio desta Chamada" para gerar os itens do pedido.');
      return;
    }
    if (!pedidoForm.escolasIds || pedidoForm.escolasIds.length === 0) {
      alert('Por favor, selecione ao menos uma escola recebedora para este pedido.');
      return;
    }

    // Valida que nenhum produto do pedido ultrapasse o saldo ainda
    // disponível na Chamada Pública vinculada (quantidade do edital menos o
    // que já foi reservado por outros pedidos). Agrupa por produto porque o
    // mesmo produto pode aparecer em itens de vários produtores no pedido.
    if (pedidoForm.chamadaPublicaId) {
      const totaisPorProduto = new Map<string, { nome: string; qtd: number; unidade: string }>();
      pedidoItens.forEach(it => {
        const chave = it.produtoId || it.produtoNome;
        const atual = totaisPorProduto.get(chave) || { nome: it.produtoNome, qtd: 0, unidade: it.unidadeMedida };
        atual.qtd += Number(it.quantidadePedida) || 0;
        totaisPorProduto.set(chave, atual);
      });
      const excedentes: string[] = [];
      totaisPorProduto.forEach((info, produtoId) => {
        const saldo = getSaldoDisponivelChamada(produtoId, info.nome);
        if (saldo !== null && info.qtd > saldo) {
          excedentes.push(`${info.nome}: pedido tem ${info.qtd} ${info.unidade}, mas o saldo disponível na chamada é de apenas ${saldo} ${info.unidade}`);
        }
      });
      if (excedentes.length > 0) {
        alert(`Não é possível salvar: este pedido ultrapassa a quantidade disponível na Chamada Pública para ${excedentes.length} produto(s):\n\n${excedentes.join('\n')}\n\nAjuste as quantidades na tabela de itens antes de salvar.`);
        return;
      }
    }

    const totalGeral = pedidoItens.reduce((sum, item) => sum + (item.valorTotalItem || 0), 0);
    const totalKgCalculado = pedidoItens.reduce((sum, item) => sum + (Number(item.quantidadePedida) || 0), 0);
    const selectedChm = chamadasPublicas.find(c => c.id === pedidoForm.chamadaPublicaId);
    const selectedProg = programas.find(p => p.id === pedidoForm.programaId);
    const selectedEscolasList = escolasPnae.filter(e => pedidoForm.escolasIds.includes(e.id));
    const selectedEscolasNomes = selectedEscolasList.map(e => e.nomeEscola);

    // FUNRURAL: contribuição previdenciária rural retida do produtor sobre
    // o valor bruto do pedido, quando a opção estiver ativa no formulário.
    const funruralAliquotaFinal = pedidoForm.funruralAtivo ? (Number(pedidoForm.funruralAliquota) || 0) : 0;
    const funruralValorTotal = Number((totalGeral * (funruralAliquotaFinal / 100)).toFixed(2));

    // Taxa administrativa da cooperativa: retida do produtor sobre o valor
    // bruto do pedido, calculada sobre o mesmo valor bruto (não sobre o
    // líquido pós-FUNRURAL), quando a opção estiver ativa.
    const taxaAdmPercentualFinal = pedidoForm.taxaAdministrativaAtiva ? (Number(pedidoForm.taxaAdministrativaPercentual) || 0) : 0;
    const taxaAdmValorTotal = Number((totalGeral * (taxaAdmPercentualFinal / 100)).toFixed(2));

    const safeQtdeEntregas = Math.max(1, Math.min(24, Number(pedidoForm.qtdeEntregas) || 1));
    const cronogramaFinal = generateCronogramaParaPedido(
      safeQtdeEntregas,
      pedidoForm.dataPrevistaEntrega,
      pedidoForm.intervaloFrequencia,
      totalKgCalculado,
      totalGeral,
      pedidoForm.cronogramaEntregas
    );

    const dataPrimeiraEntrega = cronogramaFinal[0]?.dataPrevista || pedidoForm.dataPrevistaEntrega;

    const payload = {
      ...pedidoForm,
      qtdeEntregas: safeQtdeEntregas,
      cronogramaEntregas: cronogramaFinal,
      dataPrevistaEntrega: dataPrimeiraEntrega,
      escolaId: pedidoForm.escolasIds[0] || '',
      escolaNome: selectedEscolasNomes.join(', '),
      escolasIds: pedidoForm.escolasIds,
      escolasNomes: selectedEscolasNomes,
      chamadaPublicaEdital: selectedChm ? selectedChm.numeroEdital : pedidoForm.chamadaPublicaEdital,
      programaNome: selectedProg ? selectedProg.nome : pedidoForm.programaNome,
      produtoresParticipantes: selectedProdutoresIds,
      itens: pedidoItens,
      valorTotalPedido: totalGeral,
      funruralAtivo: pedidoForm.funruralAtivo,
      funruralAliquota: funruralAliquotaFinal,
      funruralValorTotal,
      funruralContaPagarId: editingPedido?.funruralContaPagarId,
      taxaAdministrativaAtiva: pedidoForm.taxaAdministrativaAtiva,
      taxaAdministrativaPercentual: taxaAdmPercentualFinal,
      taxaAdministrativaValorTotal: taxaAdmValorTotal,
      taxaAdministrativaContaReceberId: editingPedido?.taxaAdministrativaContaReceberId
    };

    const targetPedidoId = editingPedido ? editingPedido.id : `ped-prod-${Date.now().toString().slice(-6)}`;

    // Garante que todos os pedidos vinculados à mesma chamada pública / edital compartilhem o mesmo número de pedido para todas as fontes de recursos
    if (payload.chamadaPublicaId || payload.chamadaPublicaEdital) {
      const outrosPedidosDaMesmaChamada = pedidosProdutorPAA.filter(p =>
        p.id !== targetPedidoId &&
        ((payload.chamadaPublicaId && p.chamadaPublicaId === payload.chamadaPublicaId) ||
         (payload.chamadaPublicaEdital && p.chamadaPublicaEdital === payload.chamadaPublicaEdital)) &&
        p.numeroPedido !== payload.numeroPedido
      );
      outrosPedidosDaMesmaChamada.forEach(outro => {
        updatePedidoProdutorPAA(outro.id, { numeroPedido: payload.numeroPedido });
      });
    }

    // Registra (ou atualiza) o FUNRURAL retido como conta a pagar no módulo
    // financeiro (SisFin) — é a cooperativa quem recolhe essa contribuição
    // em nome dos produtores e repassa ao INSS/Receita Federal, então
    // precisa constar como obrigação a pagar, não como valor a receber do
    // produtor. Funciona tanto ao criar quanto ao editar um pedido já
    // existente: se já existir um lançamento vinculado (funruralContaPagarId),
    // ele é atualizado em vez de duplicado.
    const nomesProdutoresEnvolvidos = Array.from(new Set(pedidoItens.map(it => it.produtorNome))).join(', ');

    if (pedidoForm.funruralAtivo && funruralValorTotal > 0) {
      const dataVencimentoFunrural = (() => {
        const d = new Date(dataPrimeiraEntrega + 'T12:00:00');
        d.setMonth(d.getMonth() + 1, 20); // vencimento padrão: dia 20 do mês seguinte
        return d.toISOString().split('T')[0];
      })();
      const descricaoFunrural = `FUNRURAL retido — Pedido ${payload.numeroPedido} (${nomesProdutoresEnvolvidos})`;

      if (payload.funruralContaPagarId) {
        updateContaPagarReceber(payload.funruralContaPagarId, {
          descricao: descricaoFunrural,
          valor: funruralValorTotal,
          dataVencimento: dataVencimentoFunrural,
          centroCusto: payload.programaNome || payload.programa
        });
      } else {
        const novoId = addContaPagarReceber({
          tipo: 'PAGAR',
          descricao: descricaoFunrural,
          pessoaNome: 'INSS / Receita Federal (FUNRURAL)',
          categoria: 'Impostos e Retenções',
          valor: funruralValorTotal,
          dataEmissao: pedidoForm.dataPedido,
          dataVencimento: dataVencimentoFunrural,
          status: 'PENDENTE',
          centroCusto: payload.programaNome || payload.programa
        });
        payload.funruralContaPagarId = novoId;
      }
    }

    // Registra (ou atualiza) a taxa administrativa retida como conta a
    // RECEBER no SisFin — diferente do FUNRURAL, essa taxa é receita
    // própria da cooperativa (custeio da gestão do PAA/PNAE), não um
    // repasse a terceiros. Mesma lógica de criar/atualizar sem duplicar.
    if (pedidoForm.taxaAdministrativaAtiva && taxaAdmValorTotal > 0) {
      const descricaoTaxaAdm = `Taxa administrativa (${taxaAdmPercentualFinal}%) — Pedido ${payload.numeroPedido} (${nomesProdutoresEnvolvidos})`;

      if (payload.taxaAdministrativaContaReceberId) {
        updateContaPagarReceber(payload.taxaAdministrativaContaReceberId, {
          descricao: descricaoTaxaAdm,
          valor: taxaAdmValorTotal,
          dataVencimento: dataPrimeiraEntrega,
          centroCusto: payload.programaNome || payload.programa
        });
      } else {
        const novoId = addContaPagarReceber({
          tipo: 'RECEBER',
          descricao: descricaoTaxaAdm,
          pessoaNome: 'Cooperativa (receita própria)',
          categoria: 'Taxa Administrativa PAA/PNAE',
          valor: taxaAdmValorTotal,
          dataEmissao: pedidoForm.dataPedido,
          dataVencimento: dataPrimeiraEntrega,
          status: 'PENDENTE',
          centroCusto: payload.programaNome || payload.programa
        });
        payload.taxaAdministrativaContaReceberId = novoId;
      }
    }

    if (editingPedido) {
      updatePedidoProdutorPAA(editingPedido.id, payload);
    } else {
      addPedidoProdutorPAA({ ...payload, id: targetPedidoId });
    }

    // Sincronizar automaticamente as entregas no módulo de logística
    if (pedidoForm.autoGerarRotasLogistica && cronogramaFinal.length > 0) {
      // Remove entregas antigas vinculadas a este pedido para recriar sincronizado
      if (editingPedido) {
        const existingEntregas = programacoesEntrega.filter(pe => pe.pedidoId === editingPedido.id || pe.pedidoNumero === editingPedido.numeroPedido);
        existingEntregas.forEach(pe => deleteProgramacaoEntrega(pe.id));
      }

      const cronoGrupoId = `cron-ped-${Date.now().toString().slice(-6)}`;

      cronogramaFinal.forEach((parc) => {
        const fraction = 1 / safeQtdeEntregas;
        const itensDaParcela = pedidoItens.map(it => ({
          produtorId: it.produtorId,
          produtorNome: it.produtorNome,
          produtoId: it.produtoId,
          produtoNome: it.produtoNome,
          quantidadePrevista: Number(((it.quantidadePedida || 0) * fraction).toFixed(1)),
          unidade: it.unidadeMedida || 'KG'
        }));

        const rawIds: string[] = payload.escolasIds.length > 0 ? payload.escolasIds : (escolasPnae.length > 0 ? [escolasPnae[0].id] : ['esc-01']);
        const kgPorEscola = Number((parc.quantidadeKg / (rawIds.length || 1)).toFixed(1));

        const paradasDaParcela: ParadaEntregaEscola[] = rawIds.map((id, idx) => {
          const esc = escolasPnae.find(e => e.id === id);
          const nome = esc?.nomeEscola || (payload.escolasNomes && payload.escolasNomes[idx]) || payload.escolaNome || `Escola Destino ${idx + 1}`;
          const end = esc?.endereco || esc?.localDeEntrega || 'Sede da Unidade Escolar';
          const polo = esc?.polo || 'Polo Municipal';
          const dist = getEstimativaDistanciaEscola(nome, polo);

          const itensEscola = itensDaParcela.map(it => ({
            ...it,
            quantidadePrevista: Number((it.quantidadePrevista / (rawIds.length || 1)).toFixed(1))
          }));

          return {
            id: `stop-${Date.now()}-${parc.numero}-${idx}`,
            ordem: idx + 1,
            escolaId: id,
            escolaNome: nome,
            endereco: end,
            polo: polo,
            distanciaKm: dist,
            quantidadeKg: kgPorEscola,
            statusEntrega: 'PENDENTE' as const,
            observacoes: `Entrega ${parc.numero}/${safeQtdeEntregas}`,
            itens: itensEscola
          };
        });

        const totals = calcEntregaTotals(
          paradasDaParcela,
          8.0,
          6.29,
          80.00,
          25.00,
          15.00
        );

        const novaEntregaPayload = {
          chamadaPublicaId: payload.chamadaPublicaId,
          chamadaPublicaEdital: payload.chamadaPublicaEdital,
          programaId: payload.programaId,
          programaNome: payload.programaNome,
          pedidoId: targetPedidoId,
          pedidoNumero: payload.numeroPedido,
          escolaId: payload.escolaId,
          escolaNome: payload.escolaNome,
          escolasIds: payload.escolasIds,
          escolasNomes: payload.escolasNomes,
          escolaOrgaoDestino: payload.escolaNome || 'Escolas Municipais Contempladas',
          localEntrega: 'Entrega direta nas Unidades Escolares',
          dataPrevista: parc.dataPrevista,
          horarioSaidaPrevisto: parc.horarioSaida || '07:30',
          motoristaNome: 'Francisco Reginaldo (Seu Chico)',
          motoristaTelefone: '(85) 99822-4411',
          veiculoPlaca: 'PMN-4A92',
          veiculoModelo: 'Mercedes-Benz Accelo 815 (Baú Refrigerado)',
          quantidadeTotalKg: parc.quantidadeKg,
          status: 'AGENDADA' as const,
          itens: itensDaParcela,
          paradasEntrega: paradasDaParcela,
          numeroEntrega: parc.numero,
          totalEntregas: safeQtdeEntregas,
          parcelaRotulo: parc.rotulo,
          cronogramaGrupoId: cronoGrupoId,
          distanciaTotalKm: totals.distanciaTotalKm,
          autonomiaKmL: 8.0,
          consumoCombustivelLitros: totals.consumoCombustivelLitros,
          precoLitroCombustivel: 6.29,
          despesaCombustivel: totals.despesaCombustivel,
          despesaDiariaMotorista: 80.00,
          despesaManutencao: 25.00,
          outrasDespesas: 15.00,
          totalDespesasEntrega: totals.totalDespesasEntrega,
          observacoesRota: `${parc.rotulo} - ${parc.observacao || 'Remessa programada do pedido'} ${payload.numeroPedido}`
        };

        addProgramacaoEntrega(novaEntregaPayload as any);
      });
    }

    // Encerramento automático da Chamada Pública: se, depois de salvar este
    // pedido, todos os produtos do edital já estiverem totalmente cobertos
    // pela soma de todos os pedidos vinculados a ela, a chamada é encerrada
    // automaticamente e some da lista de chamadas disponíveis para novos
    // pedidos (o seletor já filtra chamadas com status 'ENCERRADA').
    if (pedidoForm.chamadaPublicaId) {
      const chamadaVinculada = chamadasPublicas.find(c => c.id === pedidoForm.chamadaPublicaId);
      if (chamadaVinculada && chamadaVinculada.status !== 'ENCERRADA' && chamadaVinculada.itensSolicitados && chamadaVinculada.itensSolicitados.length > 0) {
        const outrosPedidosItens = pedidosProdutorPAA
          .filter(p => p.chamadaPublicaId === chamadaVinculada.id && p.id !== targetPedidoId)
          .flatMap(p => p.itens || []);
        const todosItensAposEsteSalvamento = [...outrosPedidosItens, ...pedidoItens];

        const totalmenteCoberto = chamadaVinculada.itensSolicitados.every(itemEdital => {
          const totalPedido = todosItensAposEsteSalvamento
            .filter(it =>
              (itemEdital.produtoId && it.produtoId === itemEdital.produtoId) ||
              (!itemEdital.produtoId && it.produtoNome?.toLowerCase() === itemEdital.produtoNome.toLowerCase())
            )
            .reduce((sum, it) => sum + (Number(it.quantidadePedida) || 0), 0);
          return totalPedido >= itemEdital.quantidadeTotal - 0.01; // tolerância de arredondamento
        });

        if (totalmenteCoberto) {
          updateChamadaPublica(chamadaVinculada.id, { status: 'ENCERRADA' });
          alert(`Todos os produtos da Chamada Pública (Edital ${chamadaVinculada.numeroEdital}) já foram totalmente registrados em pedidos. O status dela foi alterado automaticamente para ENCERRADA e ela não aparecerá mais para novos pedidos.`);
        }
      }
    }

    setShowPedidoModal(false);
    playActionCompleteSound();
  };

  const getEstimativaDistanciaEscola = (escolaNomeOrId: string, polo?: string): number => {
    const nomeLower = (escolaNomeOrId || '').toLowerCase();
    const poloLower = (polo || '').toLowerCase();
    if (nomeLower.includes('flecheiras') || poloLower.includes('flecheiras') || poloLower.includes('litoral')) return 28.5;
    if (nomeLower.includes('mundaú') || nomeLower.includes('mundau') || poloLower.includes('mundaú')) return 35.0;
    if (nomeLower.includes('canaã') || nomeLower.includes('canaa') || poloLower.includes('canaã')) return 22.0;
    if (nomeLower.includes('guajiru') || poloLower.includes('guajiru')) return 32.0;
    if (nomeLower.includes('sede') || poloLower.includes('sede') || poloLower.includes('centro')) return 12.0;
    return 18.0;
  };

  const calcEntregaTotals = (
    paradas: ParadaEntregaEscola[],
    autonomia: number,
    precoLitro: number,
    diaria: number,
    manutencao: number,
    outras: number
  ) => {
    const distTotal = paradas.reduce((s, p) => s + (Number(p.distanciaKm) || 0), 0);
    const aut = Number(autonomia) > 0 ? Number(autonomia) : 8.0;
    const preco = Number(precoLitro) > 0 ? Number(precoLitro) : 6.29;
    const consumoL = Number((distTotal / aut).toFixed(2));
    const gastoComb = Number((consumoL * preco).toFixed(2));
    const totalDesp = Number((gastoComb + (Number(diaria) || 0) + (Number(manutencao) || 0) + (Number(outras) || 0)).toFixed(2));
    const totalKg = paradas.reduce((s, p) => s + (Number(p.quantidadeKg) || 0), 0);

    return {
      distanciaTotalKm: Number(distTotal.toFixed(1)),
      consumoCombustivelLitros: consumoL,
      despesaCombustivel: gastoComb,
      totalDespesasEntrega: totalDesp,
      quantidadeTotalKg: totalKg > 0 ? totalKg : 500
    };
  };

  const buildParadasFromPedido = (ped: PedidoProdutorPAA): ParadaEntregaEscola[] => {
    const rawIds: string[] = [];
    if (ped.escolasIds && ped.escolasIds.length > 0) {
      rawIds.push(...ped.escolasIds);
    } else if (ped.escolaId) {
      rawIds.push(ped.escolaId);
    }
    (ped.itens || []).forEach(it => {
      if (it.escolasIds) {
        it.escolasIds.forEach(id => {
          if (!rawIds.includes(id)) rawIds.push(id);
        });
      }
    });
    const uniqueIds = Array.from(new Set(rawIds.filter(Boolean)));
    const targetIds = uniqueIds.length > 0 ? uniqueIds : (escolasPnae.length > 0 ? [escolasPnae[0].id] : ['esc-01']);

    const totalPedidoKg = ped.itens?.reduce((s, it) => s + (it.quantidadePedida || 0), 0) || 500;
    const kgPorEscola = Math.round(totalPedidoKg / targetIds.length);

    return targetIds.map((id, idx) => {
      const esc = escolasPnae.find(e => e.id === id);
      const nome = esc?.nomeEscola || (ped.escolasNomes && ped.escolasNomes[idx]) || ped.escolaNome || `Escola Destino ${idx + 1}`;
      const end = esc?.endereco || esc?.localDeEntrega || 'Sede da Unidade Escolar';
      const polo = esc?.polo || 'Polo Municipal';
      const dist = getEstimativaDistanciaEscola(nome, polo);

      const itensEscola = (ped.itens || [])
        .filter(it => !it.escolasIds || it.escolasIds.length === 0 || it.escolasIds.includes(id))
        .map(it => ({
          produtorId: it.produtorId,
          produtorNome: it.produtorNome,
          produtoId: it.produtoId,
          produtoNome: it.produtoNome,
          quantidadePrevista: Math.round((it.quantidadePedida || 0) / (targetIds.length || 1)),
          unidade: it.unidadeMedida || 'KG'
        }));

      return {
        id: `stop-${Date.now()}-${idx}`,
        ordem: idx + 1,
        escolaId: id,
        escolaNome: nome,
        endereco: end,
        polo: polo,
        distanciaKm: dist,
        quantidadeKg: kgPorEscola,
        statusEntrega: 'PENDENTE' as const,
        observacoes: '',
        itens: itensEscola
      };
    });
  };

  const generateCronogramaParcelas = (
    qtdEntregas: number,
    dataInicial: string,
    frequencia: 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'CUSTOM',
    totalKg: number,
    existingParcelas?: Array<{
      numero: number;
      rotulo: string;
      dataPrevista: string;
      horarioSaida: string;
      percentual: number;
      quantidadeKg: number;
      observacao?: string;
    }>
  ) => {
    const count = Math.max(1, Math.min(24, Math.floor(qtdEntregas) || 1));
    const daysInterval = frequencia === 'SEMANAL' ? 7 : frequencia === 'QUINZENAL' ? 14 : frequencia === 'MENSAL' ? 30 : 7;
    const baseDate = dataInicial ? new Date(dataInicial + 'T12:00:00') : new Date();

    return Array.from({ length: count }, (_, idx) => {
      const num = idx + 1;
      const existing = existingParcelas?.find(p => p.numero === num);
      let dateStr = existing?.dataPrevista;
      if (!dateStr) {
        const targetDate = new Date(baseDate);
        targetDate.setDate(targetDate.getDate() + idx * daysInterval);
        dateStr = targetDate.toISOString().split('T')[0];
      }
      const pct = Number((100 / count).toFixed(1));
      const parcelaKg = Number((totalKg / count).toFixed(1));
      return {
        numero: num,
        rotulo: count > 1 ? `Entrega ${num} de ${count} (${pct}%)` : 'Entrega Única (100%)',
        dataPrevista: dateStr,
        horarioSaida: existing?.horarioSaida || '07:30',
        percentual: pct,
        quantidadeKg: parcelaKg,
        observacao: existing?.observacao || `Remessa ${num}/${count}`
      };
    });
  };

  const getDiaSemanaTexto = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T12:00:00');
      const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      return dias[d.getDay()] || '';
    } catch {
      return '';
    }
  };

  const handleOpenEntrega = (eItem?: ProgramacaoEntregaPAA, pedOrigin?: PedidoProdutorPAA) => {
    if (eItem) {
      setEditingEntrega(eItem);
      const initialParadas: ParadaEntregaEscola[] = (eItem.paradasEntrega && eItem.paradasEntrega.length > 0)
        ? eItem.paradasEntrega
        : (() => {
            const rawIds = eItem.escolasIds && eItem.escolasIds.length > 0
              ? eItem.escolasIds
              : (eItem.escolaId ? [eItem.escolaId] : (escolasPnae.length > 0 ? [escolasPnae[0].id] : ['esc-01']));
            return rawIds.map((eid, idx) => {
              const esc = escolasPnae.find(e => e.id === eid);
              return {
                id: `stop-${Date.now()}-${idx}`,
                ordem: idx + 1,
                escolaId: eid,
                escolaNome: esc?.nomeEscola || eItem.escolaNome || `Escola Destino ${idx + 1}`,
                endereco: esc?.endereco || eItem.localEntrega || 'Sede da Unidade Escolar',
                polo: esc?.polo || 'Polo Sede',
                distanciaKm: getEstimativaDistanciaEscola(esc?.nomeEscola || eid, esc?.polo),
                quantidadeKg: Math.round((eItem.quantidadeTotalKg || 500) / rawIds.length),
                statusEntrega: (eItem.status === 'ENTREGUE' ? 'ENTREGUE' : 'PENDENTE') as any,
                observacoes: ''
              };
            });
          })();

      const dist = eItem.distanciaTotalKm ?? initialParadas.reduce((s, p) => s + (p.distanciaKm || 0), 0);
      const aut = eItem.autonomiaKmL ?? 8.0;
      const precoL = eItem.precoLitroCombustivel ?? 6.29;
      const consumoL = eItem.consumoCombustivelLitros ?? Number((dist / aut).toFixed(2));
      const despComb = eItem.despesaCombustivel ?? Number((consumoL * precoL).toFixed(2));
      const diaria = eItem.despesaDiariaMotorista ?? 80.00;
      const manut = eItem.despesaManutencao ?? 25.00;
      const outras = eItem.outrasDespesas ?? 15.00;
      const totalDesp = eItem.totalDespesasEntrega ?? Number((despComb + diaria + manut + outras).toFixed(2));

      setEntregaForm({
        programaId: eItem.programaId || '',
        programaNome: eItem.programaNome || '',
        chamadaPublicaId: eItem.chamadaPublicaId || '',
        chamadaPublicaEdital: eItem.chamadaPublicaEdital || '',
        pedidoId: eItem.pedidoId || '',
        pedidoNumero: eItem.pedidoNumero || '',
        escolaId: eItem.escolaId || '',
        escolaNome: eItem.escolaNome || '',
        escolaOrgaoDestino: eItem.escolaOrgaoDestino || '',
        localEntrega: eItem.localEntrega || '',
        dataPrevista: eItem.dataPrevista || '',
        horarioSaidaPrevisto: eItem.horarioSaidaPrevisto || '07:30',
        motoristaNome: eItem.motoristaNome || 'Francisco Reginaldo (Seu Chico)',
        motoristaTelefone: eItem.motoristaTelefone || '(85) 99822-4411',
        veiculoPlaca: eItem.veiculoPlaca || 'PMN-4A92',
        veiculoModelo: eItem.veiculoModelo || 'Mercedes-Benz Accelo 815 (Baú)',
        quantidadeTotalKg: eItem.quantidadeTotalKg || 500,
        status: eItem.status || 'AGENDADA',
        itens: eItem.itens || [],
        paradasEntrega: initialParadas,
        distanciaTotalKm: dist,
        autonomiaKmL: aut,
        consumoCombustivelLitros: consumoL,
        precoLitroCombustivel: precoL,
        despesaCombustivel: despComb,
        despesaDiariaMotorista: diaria,
        despesaManutencao: manut,
        outrasDespesas: outras,
        totalDespesasEntrega: totalDesp,
        observacoesRota: eItem.observacoesRota || '',
        numeroEntregas: 1,
        intervaloFrequencia: 'SEMANAL',
        cronogramaParcelas: [],
        numeroEntrega: eItem.numeroEntrega || 1,
        totalEntregas: eItem.totalEntregas || 1,
        parcelaRotulo: eItem.parcelaRotulo || '',
        cronogramaGrupoId: eItem.cronogramaGrupoId || ''
      });
    } else if (pedOrigin) {
      setEditingEntrega(null);
      const paradas = buildParadasFromPedido(pedOrigin);
      const dist = paradas.reduce((s, p) => s + (p.distanciaKm || 0), 0);
      const aut = 8.0;
      const precoL = 6.29;
      const consumoL = Number((dist / aut).toFixed(2));
      const despComb = Number((consumoL * precoL).toFixed(2));
      const diaria = 80.00;
      const manut = 25.00;
      const outras = 15.00;
      const totalDesp = Number((despComb + diaria + manut + outras).toFixed(2));

      const linkedEscolasNomes = paradas.map(p => p.escolaNome);
      const linkedEscolasIds = paradas.map(p => p.escolaId);
      const totalPedidoKg = pedOrigin.itens?.reduce((s, i) => s + (i.quantidadePedida || 0), 0) || 500;
      const baseDate = pedOrigin.dataPrevistaEntrega || new Date().toISOString().split('T')[0];
      const initialParcelas = generateCronogramaParcelas(1, baseDate, 'SEMANAL', totalPedidoKg);

      setEntregaForm({
        programaId: pedOrigin.programaId || programas[0]?.id || '',
        programaNome: pedOrigin.programaNome || pedOrigin.programa || 'PNAE',
        chamadaPublicaId: pedOrigin.chamadaPublicaId || '',
        chamadaPublicaEdital: pedOrigin.chamadaPublicaEdital || '',
        pedidoId: pedOrigin.id,
        pedidoNumero: pedOrigin.numeroPedido,
        escolaId: linkedEscolasIds[0] || escolasPnae[0]?.id || '',
        escolaNome: linkedEscolasNomes.join(', ') || escolasPnae[0]?.nomeEscola || '',
        escolaOrgaoDestino: `Roteiro (${paradas.length} Escolas: ${linkedEscolasNomes.join(', ')})`,
        localEntrega: 'Entrega direta nas Unidades Escolares do Pedido',
        dataPrevista: baseDate,
        horarioSaidaPrevisto: '07:30',
        motoristaNome: 'Francisco Reginaldo (Seu Chico)',
        motoristaTelefone: '(85) 99822-4411',
        veiculoPlaca: 'PMN-4A92',
        veiculoModelo: 'Mercedes-Benz Accelo 815 (Baú)',
        quantidadeTotalKg: totalPedidoKg,
        status: 'AGENDADA',
        itens: (pedOrigin.itens || []).map(i => ({
          produtorId: i.produtorId,
          produtorNome: i.produtorNome,
          produtoId: i.produtoId,
          produtoNome: i.produtoNome,
          quantidadePrevista: i.quantidadePedida,
          unidade: i.unidadeMedida
        })),
        paradasEntrega: paradas,
        distanciaTotalKm: dist,
        autonomiaKmL: aut,
        consumoCombustivelLitros: consumoL,
        precoLitroCombustivel: precoL,
        despesaCombustivel: despComb,
        despesaDiariaMotorista: diaria,
        despesaManutencao: manut,
        outrasDespesas: outras,
        totalDespesasEntrega: totalDesp,
        observacoesRota: `Rota gerada automaticamente para atender todas as escolas do pedido ${pedOrigin.numeroPedido}.`,
        numeroEntregas: 1,
        intervaloFrequencia: 'SEMANAL',
        cronogramaParcelas: initialParcelas,
        numeroEntrega: 1,
        totalEntregas: 1,
        parcelaRotulo: 'Entrega Única (100%)',
        cronogramaGrupoId: ''
      });
    } else {
      const defaultPedido = pedidosProdutorPAA[0];
      const defaultProg = programas[0];
      const defaultChm = chamadasPublicas[0];

      setEditingEntrega(null);
      const paradas = defaultPedido ? buildParadasFromPedido(defaultPedido) : (escolasPnae.slice(0, 3).map((esc, idx) => ({
        id: `stop-${Date.now()}-${idx}`,
        ordem: idx + 1,
        escolaId: esc.id,
        escolaNome: esc.nomeEscola,
        endereco: esc.endereco || 'Sede da Unidade Escolar',
        polo: esc.polo || 'Polo Sede',
        distanciaKm: getEstimativaDistanciaEscola(esc.nomeEscola, esc.polo),
        quantidadeKg: 180,
        statusEntrega: 'PENDENTE' as const,
        observacoes: ''
      })));

      const dist = paradas.reduce((s, p) => s + (p.distanciaKm || 0), 0);
      const aut = 8.0;
      const precoL = 6.29;
      const consumoL = Number((dist / aut).toFixed(2));
      const despComb = Number((consumoL * precoL).toFixed(2));
      const diaria = 80.00;
      const manut = 25.00;
      const outras = 15.00;
      const totalDesp = Number((despComb + diaria + manut + outras).toFixed(2));

      const linkedEscolasNomes = paradas.map(p => p.escolaNome);
      const linkedEscolasIds = paradas.map(p => p.escolaId);
      const totalPedidoKg = defaultPedido?.itens?.reduce((s, i) => s + (i.quantidadePedida || 0), 0) || paradas.reduce((s, p) => s + (p.quantidadeKg || 0), 0);
      const baseDate = new Date().toISOString().split('T')[0];
      const initialParcelas = generateCronogramaParcelas(1, baseDate, 'SEMANAL', totalPedidoKg);

      setEntregaForm({
        programaId: defaultPedido?.programaId || defaultProg?.id || '',
        programaNome: defaultPedido?.programaNome || defaultPedido?.programa || defaultProg?.nome || 'PNAE',
        chamadaPublicaId: defaultPedido?.chamadaPublicaId || defaultChm?.id || '',
        chamadaPublicaEdital: defaultPedido?.chamadaPublicaEdital || defaultChm?.numeroEdital || '',
        pedidoId: defaultPedido?.id || '',
        pedidoNumero: defaultPedido?.numeroPedido || '',
        escolaId: linkedEscolasIds[0] || '',
        escolaNome: linkedEscolasNomes.join(', ') || '',
        escolaOrgaoDestino: `Roteiro (${paradas.length} Escolas: ${linkedEscolasNomes.join(', ')})`,
        localEntrega: 'Entrega direta nas Unidades Escolares',
        dataPrevista: baseDate,
        horarioSaidaPrevisto: '07:30',
        motoristaNome: 'Francisco Reginaldo (Seu Chico)',
        motoristaTelefone: '(85) 99822-4411',
        veiculoPlaca: 'PMN-4A92',
        veiculoModelo: 'Mercedes-Benz Accelo 815 (Baú)',
        quantidadeTotalKg: totalPedidoKg,
        status: 'AGENDADA',
        itens: (defaultPedido?.itens || []).map(i => ({
          produtorId: i.produtorId,
          produtorNome: i.produtorNome,
          produtoId: i.produtoId,
          produtoNome: i.produtoNome,
          quantidadePrevista: i.quantidadePedida,
          unidade: i.unidadeMedida
        })),
        paradasEntrega: paradas,
        distanciaTotalKm: dist,
        autonomiaKmL: aut,
        consumoCombustivelLitros: consumoL,
        precoLitroCombustivel: precoL,
        despesaCombustivel: despComb,
        despesaDiariaMotorista: diaria,
        despesaManutencao: manut,
        outrasDespesas: outras,
        totalDespesasEntrega: totalDesp,
        observacoesRota: 'Roteiro de entregas programado para atendimento de todas as escolas do pedido.',
        numeroEntregas: 1,
        intervaloFrequencia: 'SEMANAL',
        cronogramaParcelas: initialParcelas,
        numeroEntrega: 1,
        totalEntregas: 1,
        parcelaRotulo: 'Entrega Única (100%)',
        cronogramaGrupoId: ''
      });
    }
    setShowEntregaModal(true);
  };

  const handleSaveEntrega = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedChm = chamadasPublicas.find(c => c.id === entregaForm.chamadaPublicaId);
    const selectedProg = programas.find(p => p.id === entregaForm.programaId);
    const selectedPedido = pedidosProdutorPAA.find(p => p.id === entregaForm.pedidoId);

    const nomesEscolas = entregaForm.paradasEntrega.map(p => p.escolaNome);
    const idsEscolas = entregaForm.paradasEntrega.map(p => p.escolaId);

    // Se estiver editando uma entrega já existente individualmente
    if (editingEntrega) {
      const calculated = calcEntregaTotals(
        entregaForm.paradasEntrega,
        entregaForm.autonomiaKmL,
        entregaForm.precoLitroCombustivel,
        entregaForm.despesaDiariaMotorista,
        entregaForm.despesaManutencao,
        entregaForm.outrasDespesas
      );

      const payload: Omit<ProgramacaoEntregaPAA, 'id' | 'tenantId'> = {
        ...entregaForm,
        ...calculated,
        escolasIds: idsEscolas,
        escolasNomes: nomesEscolas,
        escolaId: idsEscolas[0] || entregaForm.escolaId,
        escolaNome: nomesEscolas.join(', ') || entregaForm.escolaNome,
        escolaOrgaoDestino: nomesEscolas.length > 1 ? `Roteiro (${nomesEscolas.length} Escolas): ${nomesEscolas.join(', ')}` : (nomesEscolas[0] || entregaForm.escolaOrgaoDestino),
        pedidoNumero: selectedPedido ? selectedPedido.numeroPedido : entregaForm.pedidoNumero,
        chamadaPublicaEdital: selectedChm ? selectedChm.numeroEdital : entregaForm.chamadaPublicaEdital,
        programaNome: selectedProg ? selectedProg.nome : entregaForm.programaNome
      };

      updateProgramacaoEntrega(editingEntrega.id, payload);
    } else if (entregaForm.numeroEntregas > 1 && entregaForm.cronogramaParcelas.length > 1) {
      // Criação de Múltiplas Entregas Parceladas com divisão automática de quantidades
      const grupoId = `cron-${Date.now()}`;
      const totalCount = entregaForm.numeroEntregas;
      const sourceItens = selectedPedido?.itens && selectedPedido.itens.length > 0 ? selectedPedido.itens : entregaForm.itens;

      entregaForm.cronogramaParcelas.forEach((parcela, pIdx) => {
        // Quantidade de cada produto dividida pelo número de entregas
        const itensDivididos = sourceItens.map(i => {
          const qtdTotal = Number((i as any).quantidadePedida ?? i.quantidadePrevista) || 0;
          const qtdParcela = Number((qtdTotal / totalCount).toFixed(2));
          return {
            produtorId: i.produtorId,
            produtorNome: i.produtorNome,
            produtoId: i.produtoId,
            produtoNome: i.produtoNome,
            quantidadePrevista: qtdParcela,
            unidade: (i as any).unidadeMedida || i.unidade || 'KG'
          };
        });

        // Carga de cada escola dividida pelo número de entregas
        const paradasDivididas = entregaForm.paradasEntrega.map(p => ({
          ...p,
          id: `stop-${Date.now()}-${parcela.numero}-${p.ordem}`,
          quantidadeKg: Number(((Number(p.quantidadeKg) || 0) / totalCount).toFixed(1)),
          statusEntrega: 'PENDENTE' as const
        }));

        const calculated = calcEntregaTotals(
          paradasDivididas,
          entregaForm.autonomiaKmL,
          entregaForm.precoLitroCombustivel,
          entregaForm.despesaDiariaMotorista,
          entregaForm.despesaManutencao,
          entregaForm.outrasDespesas
        );

        const parcelaPayload: Omit<ProgramacaoEntregaPAA, 'id' | 'tenantId'> = {
          ...entregaForm,
          ...calculated,
          numeroEntrega: parcela.numero,
          totalEntregas: totalCount,
          parcelaRotulo: parcela.rotulo,
          cronogramaGrupoId: grupoId,
          dataPrevista: parcela.dataPrevista,
          horarioSaidaPrevisto: parcela.horarioSaida || entregaForm.horarioSaidaPrevisto,
          quantidadeTotalKg: parcela.quantidadeKg,
          itens: itensDivididos,
          paradasEntrega: paradasDivididas,
          escolasIds: idsEscolas,
          escolasNomes: nomesEscolas,
          escolaId: idsEscolas[0] || entregaForm.escolaId,
          escolaNome: nomesEscolas.join(', ') || entregaForm.escolaNome,
          escolaOrgaoDestino: nomesEscolas.length > 1 ? `Roteiro (${nomesEscolas.length} Escolas): ${nomesEscolas.join(', ')}` : (nomesEscolas[0] || entregaForm.escolaOrgaoDestino),
          pedidoNumero: selectedPedido ? selectedPedido.numeroPedido : entregaForm.pedidoNumero,
          chamadaPublicaEdital: selectedChm ? selectedChm.numeroEdital : entregaForm.chamadaPublicaEdital,
          programaNome: selectedProg ? selectedProg.nome : entregaForm.programaNome,
          observacoesRota: `${parcela.rotulo} - ${entregaForm.observacoesRota || 'Cronograma de entrega programado para este pedido.'}`
        };

        addProgramacaoEntrega(parcelaPayload);
      });
    } else {
      // Entrega Única
      const calculated = calcEntregaTotals(
        entregaForm.paradasEntrega,
        entregaForm.autonomiaKmL,
        entregaForm.precoLitroCombustivel,
        entregaForm.despesaDiariaMotorista,
        entregaForm.despesaManutencao,
        entregaForm.outrasDespesas
      );

      const payload: Omit<ProgramacaoEntregaPAA, 'id' | 'tenantId'> = {
        ...entregaForm,
        ...calculated,
        numeroEntrega: 1,
        totalEntregas: 1,
        parcelaRotulo: 'Entrega Única (100%)',
        escolasIds: idsEscolas,
        escolasNomes: nomesEscolas,
        escolaId: idsEscolas[0] || entregaForm.escolaId,
        escolaNome: nomesEscolas.join(', ') || entregaForm.escolaNome,
        escolaOrgaoDestino: nomesEscolas.length > 1 ? `Roteiro (${nomesEscolas.length} Escolas): ${nomesEscolas.join(', ')}` : (nomesEscolas[0] || entregaForm.escolaOrgaoDestino),
        pedidoNumero: selectedPedido ? selectedPedido.numeroPedido : entregaForm.pedidoNumero,
        chamadaPublicaEdital: selectedChm ? selectedChm.numeroEdital : entregaForm.chamadaPublicaEdital,
        programaNome: selectedProg ? selectedProg.nome : entregaForm.programaNome
      };

      addProgramacaoEntrega(payload);
    }

    setShowEntregaModal(false);
  };

  // Funções de Geração de Nota Fiscal de Entrada / Saída
  const handleOpenGerarNFe = (
    target: PedidoProdutorPAA | ProgramacaoEntregaPAA,
    tipo: 'ENTRADA_PRODUTOR' | 'SAIDA_ESCOLA',
    preselectProdId?: string,
    preselectEscId?: string
  ) => {
    setNfeModalTarget(target);
    setNfeTipoOperacao(tipo);
    setNfeSuccessResult(null);

    if (tipo === 'ENTRADA_PRODUTOR') {
      const prodId =
        preselectProdId ||
        (target as any).itens?.[0]?.produtorId ||
        (target as any).produtoresParticipantes?.[0] ||
        produtores[0]?.id ||
        '';
      setNfeSelectedProdutorId(prodId);
    } else {
      const escId =
        preselectEscId ||
        (target as any).escolasIds?.[0] ||
        (target as any).escolaId ||
        escolasPnae[0]?.id ||
        '';
      setNfeSelectedEscolaId(escId);
    }
    setShowNFeModal(true);
  };

  const handleExecuteGerarNFe = async () => {
    if (!nfeModalTarget) return;

    // Trava de segurança: nunca emite uma 2ª NF-e do mesmo tipo para o
    // mesmo pedido, mesmo que o botão da lista tenha sido contornado.
    const pedidoIdAlvo = (nfeModalTarget as any).id;
    const tipoNfBuscado = nfeTipoOperacao === 'ENTRADA_PRODUTOR' ? 'ENTRADA_PRODUTOR' : 'SAIDA_PNAE_PAA';
    const jaEmitida = notasFiscais.find(nf => nf.pedidoId === pedidoIdAlvo && nf.tipoOperacao === tipoNfBuscado);
    if (jaEmitida) {
      alert(`Já existe uma NF-e de ${nfeTipoOperacao === 'ENTRADA_PRODUTOR' ? 'Entrada' : 'Saída'} emitida para este pedido (Nº ${jaEmitida.numeroNota}). A emissão é permitida apenas uma vez por pedido.`);
      setShowNFeModal(false);
      return;
    }

    setIsGeneratingNfe(true);
    try {
      let novaNota: NotaFiscal;
      if (nfeTipoOperacao === 'ENTRADA_PRODUTOR') {
        novaNota = gerarNotaFiscalEntradaProdutor(
          nfeModalTarget as PedidoProdutorPAA,
          nfeSelectedProdutorId,
          nfeSistemaTrib
        );
      } else {
        novaNota = gerarNotaFiscalSaidaEscola(
          nfeModalTarget,
          nfeSelectedEscolaId,
          nfeSistemaTrib
        );
      }

      let statusMsg = 'Salva e Pronta na SEFAZ-CE';
      if (nfeTransmitedDirectly && novaNota.id) {
        const res = await transmitirSefazCe(novaNota.id);
        if (res.success) {
          statusMsg = `Transmitida e Autorizada na SEFAZ-CE (Protocolo: ${res.protocolo || 'AUTORIZADO'})`;
        } else {
          statusMsg = `Salva no sistema. Retorno da SEFAZ: ${res.motivo}`;
        }
      }

      setNfeSuccessResult({ nf: novaNota, statusTransmissao: statusMsg });
      playActionCompleteSound();
    } catch (err: any) {
      alert('Erro ao gerar Nota Fiscal: ' + (err.message || err));
    } finally {
      setIsGeneratingNfe(false);
    }
  };

  // Filter Helper Logic across modules
  const matchQuery = (str?: string) => {
    if (!searchTerm.trim()) return true;
    return (str || '').toLowerCase().includes(searchTerm.toLowerCase());
  };

  const filteredChamadas = chamadasPublicas.filter(cp => {
    if (filterProgramaId && cp.programaId !== filterProgramaId && cp.programa !== filterProgramaId) return false;
    if (filterEscolaId && cp.escolaId !== filterEscolaId && !cp.orgaoComprador.includes(filterEscolaId)) return false;
    if (filterProdutoId && !cp.itensSolicitados?.some(it => it.produtoId === filterProdutoId)) return false;
    
    return matchQuery(cp.numeroEdital) || matchQuery(cp.orgaoComprador) || matchQuery(cp.programa) || matchQuery(cp.escolaNome);
  });

  const filteredOfertas = ofertasPAA.filter(o => {
    if (filterProgramaId && o.programaId !== filterProgramaId) return false;
    if (filterProdutorId && o.produtorId !== filterProdutorId && o.produtorNome !== filterProdutorId) return false;
    if (filterEscolaId && o.escolaId !== filterEscolaId) return false;
    if (filterProdutoId && o.produtoId !== filterProdutoId) return false;

    return matchQuery(o.produtorNome) || matchQuery(o.produtoNome) || matchQuery(o.chamadaPublicaEdital) || matchQuery(o.escolaNome);
  });

  const filteredPedidos = pedidosProdutorPAA.filter(p => {
    if (filterProgramaId && p.programaId !== filterProgramaId && p.programa !== filterProgramaId) return false;
    if (filterProdutorId && !p.produtoresParticipantes?.includes(filterProdutorId) && !p.itens?.some(i => i.produtorId === filterProdutorId)) return false;
    if (filterEscolaId && p.escolaId !== filterEscolaId) return false;
    if (filterProdutoId && !p.itens?.some(i => i.produtoId === filterProdutoId)) return false;
    if (filterDataPedido && p.dataPrevistaEntrega !== filterDataPedido) return false;

    return matchQuery(p.numeroPedido) || matchQuery(p.fonteRecursos) || matchQuery(p.programa) || matchQuery(p.escolaNome) || p.itens?.some(i => matchQuery(i.produtorNome) || matchQuery(i.produtoNome));
  });

  const filteredEntregas = programacoesEntrega.filter(pe => {
    if (filterProgramaId && pe.programaId !== filterProgramaId) return false;
    if (filterProdutorId && !pe.itens?.some(i => i.produtorId === filterProdutorId || i.produtorNome === filterProdutorId)) return false;
    if (filterEscolaId && pe.escolaId !== filterEscolaId && !pe.escolaOrgaoDestino.includes(filterEscolaId)) return false;
    if (filterProdutoId && !pe.itens?.some(i => i.produtoId === filterProdutoId || i.produtoNome === filterProdutoId)) return false;

    return matchQuery(pe.escolaOrgaoDestino) || matchQuery(pe.localEntrega) || matchQuery(pe.motoristaNome) || matchQuery(pe.chamadaPublicaEdital);
  });

  const pendingPedidosCount = useMemo(() => {
    return pedidosProdutorPAA.filter(p => p.status === 'PENDENTE').length;
  }, [pedidosProdutorPAA]);

  // Options for Relatórios de Pedidos e Entregas (agregando pedidos e programações de entrega)
  const relOptionsProdutores = useMemo(() => {
    const setNames = new Set<string>();
    produtores.forEach(p => p.nome && setNames.add(p.nome));
    pedidosProdutorPAA.forEach(ped => ped.itens?.forEach(it => it.produtorNome && setNames.add(it.produtorNome)));
    programacoesEntrega.forEach(ent => ent.itens?.forEach(it => it.produtorNome && setNames.add(it.produtorNome)));
    return Array.from(setNames).sort();
  }, [produtores, pedidosProdutorPAA, programacoesEntrega]);

  const relOptionsEscolas = useMemo(() => {
    const setEscolas = new Set<string>();
    escolasPnae.forEach(e => e.nome && setEscolas.add(e.nome));
    pedidosProdutorPAA.forEach(ped => {
      if (ped.escolaNome) {
        ped.escolaNome.split(',').forEach(s => s.trim() && setEscolas.add(s.trim()));
      }
      ped.escolasNomes?.forEach(e => e && setEscolas.add(e.trim()));
    });
    programacoesEntrega.forEach(ent => {
      if (ent.escolaNome) {
        ent.escolaNome.split(',').forEach(s => s.trim() && setEscolas.add(s.trim()));
      }
      ent.escolasNomes?.forEach(e => e && setEscolas.add(e.trim()));
      ent.paradasEntrega?.forEach(p => p.escolaNome && setEscolas.add(p.escolaNome.trim()));
    });
    return Array.from(setEscolas).sort();
  }, [escolasPnae, pedidosProdutorPAA, programacoesEntrega]);

  const relOptionsProdutos = useMemo(() => {
    const setProds = new Set<string>();
    produtos.forEach(p => p.nome && setProds.add(p.nome));
    pedidosProdutorPAA.forEach(ped => ped.itens?.forEach(it => it.produtoNome && setProds.add(it.produtoNome)));
    programacoesEntrega.forEach(ent => ent.itens?.forEach(it => it.produtoNome && setProds.add(it.produtoNome)));
    return Array.from(setProds).sort();
  }, [produtos, pedidosProdutorPAA, programacoesEntrega]);

  const relOptionsProgramas = useMemo(() => {
    const setProg = new Set<string>();
    programas.forEach(p => p.nome && setProg.add(p.nome));
    pedidosProdutorPAA.forEach(ped => {
      const p = ped.programaNome || ped.programa;
      if (p) setProg.add(p);
    });
    programacoesEntrega.forEach(ent => {
      if (ent.programaNome) setProg.add(ent.programaNome);
    });
    return Array.from(setProg).sort();
  }, [programas, pedidosProdutorPAA, programacoesEntrega]);

  const relOptionsChamadas = useMemo(() => {
    const setChamadas = new Set<string>();
    pedidosProdutorPAA.forEach(ped => ped.chamadaPublicaEdital && setChamadas.add(ped.chamadaPublicaEdital));
    programacoesEntrega.forEach(ent => ent.chamadaPublicaEdital && setChamadas.add(ent.chamadaPublicaEdital));
    return Array.from(setChamadas).sort();
  }, [pedidosProdutorPAA, programacoesEntrega]);

  const relOptionsPedidosNum = useMemo(() => {
    const setNums = new Set<string>();
    pedidosProdutorPAA.forEach(ped => ped.numeroPedido && setNums.add(ped.numeroPedido));
    programacoesEntrega.forEach(ent => ent.pedidoNumero && setNums.add(ent.pedidoNumero));
    return Array.from(setNums).sort();
  }, [pedidosProdutorPAA, programacoesEntrega]);

  const handleClearRelFilters = () => {
    setRelFilterProdutor('TODOS');
    setRelFilterEscola('TODOS');
    setRelFilterProduto('TODOS');
    setRelFilterMes('TODOS');
    setRelFilterAno('TODOS');
    setRelFilterPrograma('TODOS');
    setRelFilterChamada('TODOS');
    setRelFilterPedidoNum('TODOS');
    setSearchTerm('');
  };

  const filteredRelPedidos = useMemo(() => {
    let rows: any[] = [];
    pedidosProdutorPAA.forEach(ped => {
      const progName = ped.programaNome || ped.programa || '';
      const chamada = ped.chamadaPublicaEdital || '';
      const numPed = ped.numeroPedido || '';
      const escolaPed = ped.escolaNome || '';
      const dataPed = ped.dataPedido || '';

      let ano = '';
      let mes = '';
      if (dataPed.includes('-')) {
        const parts = dataPed.split('-');
        ano = parts[0];
        mes = parts[1];
      } else if (dataPed.includes('/')) {
        const parts = dataPed.split('/');
        if (parts.length === 3) {
          ano = parts[2];
          mes = parts[1];
        }
      }

      if (ped.itens && ped.itens.length > 0) {
        ped.itens.forEach(it => {
          rows.push({
            id: ped.id + '-' + (it.produtoNome || ''),
            numeroPedido: numPed,
            programa: progName,
            chamadaPublica: chamada,
            escola: escolaPed,
            produtor: it.produtorNome || 'Diversos',
            produto: it.produtoNome || '',
            quantidade: it.quantidadePedida || 0,
            unidade: it.unidade || 'kg',
            valorTotal: it.valorTotalItem || 0,
            data: dataPed,
            mes: mes || '01',
            ano: ano || '2026',
            status: ped.status || 'CONFIRMADO'
          });
        });
      } else {
        rows.push({
          id: ped.id,
          numeroPedido: numPed,
          programa: progName,
          chamadaPublica: chamada,
          escola: escolaPed,
          produtor: 'Diversos',
          produto: 'Diversos',
          quantidade: 0,
          unidade: 'kg',
          valorTotal: ped.valorTotalPedido || 0,
          data: dataPed,
          mes: mes || '01',
          ano: ano || '2026',
          status: ped.status || 'CONFIRMADO'
        });
      }
    });

    return rows.filter(r => {
      const matchProdutor = relFilterProdutor === 'TODOS' || r.produtor === relFilterProdutor;
      const matchEscola = relFilterEscola === 'TODOS' || r.escola === relFilterEscola;
      const matchProduto = relFilterProduto === 'TODOS' || r.produto === relFilterProduto;
      const matchMes = relFilterMes === 'TODOS' || r.mes === relFilterMes;
      const matchAno = relFilterAno === 'TODOS' || r.ano === relFilterAno;
      const matchPrograma = relFilterPrograma === 'TODOS' || r.programa === relFilterPrograma;
      const matchChamada = relFilterChamada === 'TODOS' || r.chamadaPublica === relFilterChamada;
      const matchPedido = relFilterPedidoNum === 'TODOS' || r.numeroPedido === relFilterPedidoNum;
      const matchSearch = !searchTerm || r.numeroPedido.toLowerCase().includes(searchTerm.toLowerCase()) || r.escola.toLowerCase().includes(searchTerm.toLowerCase()) || r.produtor.toLowerCase().includes(searchTerm.toLowerCase()) || r.produto.toLowerCase().includes(searchTerm.toLowerCase());

      return matchProdutor && matchEscola && matchProduto && matchMes && matchAno && matchPrograma && matchChamada && matchPedido && matchSearch;
    });
  }, [pedidosProdutorPAA, relFilterProdutor, relFilterEscola, relFilterProduto, relFilterMes, relFilterAno, relFilterPrograma, relFilterChamada, relFilterPedidoNum, searchTerm]);

  const filteredRelEntregas = useMemo(() => {
    let rows: any[] = [];
    const entregaIdsMapped = new Set<string>();

    programacoesEntrega.forEach(ent => {
      entregaIdsMapped.add(ent.id);
      if (ent.pedidoId) entregaIdsMapped.add(ent.pedidoId);
      if (ent.pedidoNumero) entregaIdsMapped.add(ent.pedidoNumero);

      const progName = ent.programaNome || '';
      const chamada = ent.chamadaPublicaEdital || '';
      // Garantir que pega o número do pedido vinculado se não tiver explícito
      let numPed = ent.pedidoNumero || '';
      if (!numPed && ent.pedidoId) {
        const pedRel = pedidosProdutorPAA.find(p => p.id === ent.pedidoId);
        if (pedRel) numPed = pedRel.numeroPedido;
      }
      const escolaPed = ent.escolaNome || ent.escolaOrgaoDestino || '';
      const dataEnt = ent.dataPrevista || '';

      let ano = '';
      let mes = '';
      if (dataEnt.includes('-')) {
        const parts = dataEnt.split('-');
        ano = parts[0];
        mes = String(parseInt(parts[1] || '1', 10)).padStart(2, '0');
      } else if (dataEnt.includes('/')) {
        const parts = dataEnt.split('/');
        if (parts.length === 3) {
          ano = parts[2];
          mes = String(parseInt(parts[1] || '1', 10)).padStart(2, '0');
        }
      }

      if (ent.itens && ent.itens.length > 0) {
        ent.itens.forEach((it, idx) => {
          rows.push({
            id: `${ent.id}-${it.produtoNome || ''}-${it.produtorNome || ''}-${idx}`,
            numeroPedido: numPed || 'N/A',
            entregaId: ent.id,
            programa: progName,
            chamadaPublica: chamada,
            escola: escolaPed,
            produtor: it.produtorNome || 'Diversos',
            produto: it.produtoNome || '',
            quantidadePrevista: it.quantidadePrevista || 0,
            quantidadeEntregue: it.quantidadeEntregue || it.quantidadePrevista || 0,
            unidade: it.unidade || 'kg',
            data: dataEnt,
            mes: mes || '01',
            ano: ano || '2026',
            motorista: ent.motoristaNome || 'Não atribuído',
            veiculo: ent.veiculoPlaca || '',
            status: ent.status || 'AGENDADA'
          });
        });
      } else {
        rows.push({
          id: ent.id,
          numeroPedido: numPed || 'N/A',
          entregaId: ent.id,
          programa: progName,
          chamadaPublica: chamada,
          escola: escolaPed,
          produtor: 'Diversos',
          produto: 'Diversos',
          quantidadePrevista: ent.quantidadeTotalKg || 0,
          quantidadeEntregue: ent.quantidadeTotalKg || 0,
          unidade: 'kg',
          data: dataEnt,
          mes: mes || '01',
          ano: ano || '2026',
          motorista: ent.motoristaNome || 'Não atribuído',
          veiculo: ent.veiculoPlaca || '',
          status: ent.status || 'AGENDADA'
        });
      }
    });

    // Também incluir remessas de pedidos que têm cronograma mas não estavam em programacoesEntrega
    pedidosProdutorPAA.forEach(ped => {
      if (entregaIdsMapped.has(ped.id) || entregaIdsMapped.has(ped.numeroPedido)) return;

      const progName = ped.programaNome || ped.programa || '';
      const chamada = ped.chamadaPublicaEdital || '';
      const numPed = ped.numeroPedido || '';
      const escolaPed = ped.escolaNome || '';

      if (ped.cronogramaEntregas && ped.cronogramaEntregas.length > 0) {
        ped.cronogramaEntregas.forEach((parc, pIdx) => {
          const dataEnt = parc.dataPrevista || ped.dataPrevistaEntrega || '';
          let ano = '';
          let mes = '';
          if (dataEnt.includes('-')) {
            const parts = dataEnt.split('-');
            ano = parts[0];
            mes = String(parseInt(parts[1] || '1', 10)).padStart(2, '0');
          } else if (dataEnt.includes('/')) {
            const parts = dataEnt.split('/');
            if (parts.length === 3) {
              ano = parts[2];
              mes = String(parseInt(parts[1] || '1', 10)).padStart(2, '0');
            }
          }

          if (ped.itens && ped.itens.length > 0) {
            ped.itens.forEach((it, itIdx) => {
              const qtdPrev = Math.round(((it.quantidadePedida || 0) * (parc.percentual || 50)) / 100);
              rows.push({
                id: `ped-${ped.id}-rem-${pIdx}-${it.produtoNome || ''}-${itIdx}`,
                numeroPedido: numPed,
                entregaId: `rem-${ped.id}-${parc.numero}`,
                programa: progName,
                chamadaPublica: chamada,
                escola: escolaPed,
                produtor: it.produtorNome || 'Diversos',
                produto: it.produtoNome || '',
                quantidadePrevista: qtdPrev,
                quantidadeEntregue: qtdPrev,
                unidade: it.unidade || 'kg',
                data: dataEnt,
                mes: mes || '01',
                ano: ano || '2026',
                motorista: 'Equipe de Logística',
                veiculo: 'Frotas da Cooperativa',
                status: parc.entregueConfirmada ? 'ENTREGUE' : (ped.status === 'CONFIRMADO' ? 'EM_TRANSITO' : 'AGENDADA')
              });
            });
          }
        });
      }
    });

    return rows.filter(r => {
      const matchProdutor = relFilterProdutor === 'TODOS' || r.produtor === relFilterProdutor ||
        (r.produtor && relFilterProdutor && r.produtor.toLowerCase().includes(relFilterProdutor.toLowerCase()));

      const matchEscola = relFilterEscola === 'TODOS' || r.escola === relFilterEscola ||
        (r.escola && relFilterEscola && (
          r.escola.toLowerCase().includes(relFilterEscola.toLowerCase()) ||
          relFilterEscola.toLowerCase().includes(r.escola.toLowerCase())
        ));

      const matchProduto = relFilterProduto === 'TODOS' || r.produto === relFilterProduto ||
        (r.produto && relFilterProduto && (
          r.produto.toLowerCase().includes(relFilterProduto.toLowerCase()) ||
          relFilterProduto.toLowerCase().includes(r.produto.toLowerCase())
        ));

      const matchMes = relFilterMes === 'TODOS' || r.mes === relFilterMes || String(parseInt(r.mes || '0', 10)).padStart(2, '0') === relFilterMes;
      const matchAno = relFilterAno === 'TODOS' || r.ano === relFilterAno;

      const matchPrograma = relFilterPrograma === 'TODOS' || r.programa === relFilterPrograma ||
        (r.programa && relFilterPrograma && (
          r.programa.toLowerCase().includes(relFilterPrograma.toLowerCase()) ||
          relFilterPrograma.toLowerCase().includes(r.programa.toLowerCase())
        ));

      const matchChamada = relFilterChamada === 'TODOS' || r.chamadaPublica === relFilterChamada ||
        (r.chamadaPublica && relFilterChamada && (
          r.chamadaPublica.toLowerCase().includes(relFilterChamada.toLowerCase()) ||
          relFilterChamada.toLowerCase().includes(r.chamadaPublica.toLowerCase())
        ));

      const matchPedido = relFilterPedidoNum === 'TODOS' || r.numeroPedido === relFilterPedidoNum ||
        (r.numeroPedido && relFilterPedidoNum && (
          r.numeroPedido.toLowerCase().includes(relFilterPedidoNum.toLowerCase()) ||
          relFilterPedidoNum.toLowerCase().includes(r.numeroPedido.toLowerCase())
        ));

      const st = (searchTerm || '').trim().toLowerCase();
      const matchSearch = !st ||
        (r.numeroPedido || '').toLowerCase().includes(st) ||
        (r.escola || '').toLowerCase().includes(st) ||
        (r.produtor || '').toLowerCase().includes(st) ||
        (r.produto || '').toLowerCase().includes(st) ||
        (r.programa || '').toLowerCase().includes(st) ||
        (r.motorista || '').toLowerCase().includes(st);

      return matchProdutor && matchEscola && matchProduto && matchMes && matchAno && matchPrograma && matchChamada && matchPedido && matchSearch;
    });
  }, [programacoesEntrega, pedidosProdutorPAA, relFilterProdutor, relFilterEscola, relFilterProduto, relFilterMes, relFilterAno, relFilterPrograma, relFilterChamada, relFilterPedidoNum, searchTerm]);

  const handleExportRelExcel = () => {
    const dataToExport = relatorioSubTab === 'pedidos' ? filteredRelPedidos : filteredRelEntregas;
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, relatorioSubTab === 'pedidos' ? 'Relatorio_Pedidos' : 'Relatorio_Entregas');
    XLSX.writeFile(workbook, `SisGepa_${relatorioSubTab === 'pedidos' ? 'Pedidos' : 'Entregas'}_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Alerta Visual (Badge) no Header para Pedidos Pendentes de Envio aos Produtores Rurais */}
      {pendingPedidosCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-5 py-3.5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-amber-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black shrink-0">
              <Bell className="w-5 h-5 text-slate-950 animate-bounce" />
            </div>
            <div>
              <h4 className="font-black text-sm">Alerta de Gestão: Novos Pedidos Pendentes de Envio</h4>
              <p className="text-xs font-medium text-slate-900/90">
                Existem <strong className="underline">{pendingPedidosCount} pedido(s)</strong> aguardando envio, emissão de relatórios PDF ou notificação via WhatsApp aos produtores rurais.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('pedidos')}
            className="px-4 py-2 bg-slate-950 text-white font-extrabold rounded-xl text-xs hover:bg-slate-900 transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>Ver Pedidos Pendentes</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 to-teal-900 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-200 bg-emerald-800/60 px-3 py-1 rounded-full w-fit border border-emerald-700/50 mb-2">
            <Landmark className="w-3.5 h-3.5" /> Módulo SisGepa & Vincular Entidades
          </div>
          <h1 className="text-2xl font-black tracking-tight">SisGepa - PAA & PNAE</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Gestão vinculada de Programas Governamentais, Produtores Rurais, Escolas Consumidoras e Produtos Agrícolas com Chamadas Públicas, Propostas, Pedidos e Entregas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'chamadas' && (
            <button
              onClick={() => handleOpenChamada()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Chamada Pública
            </button>
          )}
          {activeTab === 'ofertas' && (
            <button
              onClick={() => handleOpenOferta()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Registrar Proposta PAA
            </button>
          )}
          {activeTab === 'pedidos' && (
            <button
              onClick={() => handleOpenPedido()}
              className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 shrink-0 animate-pulse"
            >
              <ShoppingBag className="w-4 h-4" /> Fazer Pedido aos Produtores
            </button>
          )}
          {activeTab === 'entregas' && (
            <button
              onClick={() => handleOpenEntrega()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Rota de Entrega
            </button>
          )}
        </div>
      </div>

      {/* Cross-entity Relationship Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            Filtros Integrados de Cruzamento (Programa, Produtor, Escola, Produto)
          </span>
          {(searchTerm || filterProgramaId || filterProdutorId || filterEscolaId || filterProdutoId || filterDataPedido) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterProgramaId('');
                setFilterProdutorId('');
                setFilterEscolaId('');
                setFilterProdutoId('');
                setFilterDataPedido('');
              }}
              className="text-[11px] text-emerald-700 hover:underline font-bold"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
          {/* Search Term */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, edital ou nome..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Programa */}
          <div>
            <select
              value={filterProgramaId}
              onChange={e => setFilterProgramaId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white"
            >
              <option value="">Todos os Programas</option>
              {programas.map(p => (
                <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>
              ))}
            </select>
          </div>

          {/* Filter Data Prevista / Entrega */}
          <div>
            <input
              type="date"
              value={filterDataPedido}
              onChange={e => setFilterDataPedido(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white text-slate-700"
              title="Filtrar por Data Prevista de Entrega"
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b-2 border-slate-200 gap-3 overflow-x-auto pb-1.5 scrollbar-thin">
        <button
          onClick={() => setActiveTab('chamadas')}
          className={`px-5 py-3 text-sm font-extrabold rounded-2xl flex items-center gap-2.5 transition-all whitespace-nowrap shadow-xs cursor-pointer ${
            activeTab === 'chamadas'
              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-600'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className={`w-4 h-4 ${activeTab === 'chamadas' ? 'text-emerald-200' : 'text-emerald-700'}`} />
          <span>Chamadas Públicas</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'chamadas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {filteredChamadas.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ofertas')}
          className={`px-5 py-3 text-sm font-extrabold rounded-2xl flex items-center gap-2.5 transition-all whitespace-nowrap shadow-xs cursor-pointer ${
            activeTab === 'ofertas'
              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-600'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCheck className={`w-4 h-4 ${activeTab === 'ofertas' ? 'text-emerald-200' : 'text-emerald-700'}`} />
          <span>Propostas de Oferta</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'ofertas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {filteredOfertas.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('rateio')}
          className={`px-5 py-3 text-sm font-extrabold rounded-2xl flex items-center gap-2.5 transition-all whitespace-nowrap shadow-xs cursor-pointer ${
            activeTab === 'rateio'
              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-600'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scale className={`w-4 h-4 ${activeTab === 'rateio' ? 'text-emerald-200' : 'text-emerald-700'}`} />
          <span>Rateio de Produtores</span>
        </button>
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`px-5 py-3 text-sm font-black rounded-2xl flex items-center gap-2.5 transition-all whitespace-nowrap shadow-xs cursor-pointer relative ${
            activeTab === 'pedidos'
              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-600'
              : 'bg-white text-slate-800 hover:bg-slate-100 border-2 border-emerald-300'
          }`}
        >
          <ShoppingBag className={`w-4 h-4 ${activeTab === 'pedidos' ? 'text-emerald-200' : 'text-emerald-600'}`} />
          <span>Pedidos aos Produtores</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'pedidos' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
            {filteredPedidos.length}
          </span>
          {pendingPedidosCount > 0 && (
            <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black shadow-lg animate-bounce" title={`${pendingPedidosCount} pedidos pendentes`}>
              {pendingPedidosCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('entregas')}
          className={`px-5 py-3 text-sm font-extrabold rounded-2xl flex items-center gap-2.5 transition-all whitespace-nowrap shadow-xs cursor-pointer ${
            activeTab === 'entregas'
              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-600'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className={`w-4 h-4 ${activeTab === 'entregas' ? 'text-emerald-200' : 'text-emerald-700'}`} />
          <span>Programação de Entregas</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'entregas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {filteredEntregas.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('relatorios')}
          className={`px-5 py-3 text-sm font-extrabold rounded-2xl flex items-center gap-2.5 transition-all whitespace-nowrap shadow-xs cursor-pointer ${
            activeTab === 'relatorios'
              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-600'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'relatorios' ? 'text-emerald-200' : 'text-emerald-700'}`} />
          <span>Relatórios de Pedidos e Entregas</span>
        </button>
      </div>

      {/* Tab Chamadas Públicas */}
      {activeTab === 'chamadas' && (
        <div className="space-y-4">
          {/* Top Actions Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-700" />
                Chamadas Públicas e Editais de Compra Institucional
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gerencie os editais do PNAE e PAA com escolas contempladas, produtos, preços máximos, fontes de recursos e importação de planilhas XLS.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => baixarModeloPlanilhaChamadaPublica()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer"
                title="Baixar modelo em Excel para preenchimento da Chamada Pública"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Baixar Modelo (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImportChamadaModal(true)}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-emerald-300 shadow-xs cursor-pointer"
                title="Fazer upload de planilha XLS/XLSX com dados do edital"
              >
                <UploadCloud className="w-4 h-4 text-emerald-700" />
                <span>Importar Planilha Edital</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenChamada()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Chamada Pública</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredChamadas.length === 0 ? (
              <div className="lg:col-span-2 p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-3">
                <Building className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-600 text-sm">Nenhuma Chamada Pública encontrada.</p>
                <p className="text-slate-400 max-w-md mx-auto">
                  Crie uma nova chamada pública manualmente ou importe uma planilha (.xlsx) com o modelo fornecido.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => baixarModeloPlanilhaChamadaPublica()}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs"
                  >
                    Baixar Modelo XLS
                  </button>
                  <button
                    onClick={() => handleOpenChamada()}
                    className="px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-lg text-xs"
                  >
                    + Criar Chamada
                  </button>
                </div>
              </div>
            ) : (
              filteredChamadas.map(cp => {
                const totalCalculado = cp.itensSolicitados?.reduce((s, it) => s + (it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario)), 0) || cp.valorTotalEdital || 0;
                const totalEscolas = cp.escolasContempladas?.length || (cp.escolasIds?.length || (cp.escolaNome ? cp.escolaNome.split(',').length : 1));
                const totalAlunos = cp.escolasContempladas?.reduce((s, e) => s + (e.alunosAtendidos || 0), 0);

                return (
                  <div key={cp.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 relative hover:border-emerald-400 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-lg text-xs flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-emerald-700" />
                            {cp.programaNome || cp.programa}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-mono font-bold rounded text-[11px]">
                            {cp.numeroEdital}
                          </span>
                          {(cp.fonteRecurso || cp.fonteRecursos) && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-[10px] font-black flex items-center gap-1">
                              <Coins className="w-3 h-3 text-indigo-600" />
                              {cp.fonteRecurso || cp.fonteRecursos}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 font-black rounded text-[10px] ${
                            cp.status === 'ABERTA' ? 'bg-emerald-100 text-emerald-800' :
                            cp.status === 'EM_EXECUCAO' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {cp.status}
                          </span>
                          <button
                            onClick={() => handleOpenChamada(cp)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-emerald-700 transition-all"
                            title="Editar Edital"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!canWrite) { blockWriteAction(); return; }
                              if (confirm(`Deseja excluir o edital ${cp.numeroEdital}?`)) deleteChamadaPublica(cp.id);
                            }}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                            title="Excluir Edital"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Órgão Comprador */}
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{cp.orgaoComprador}</h3>
                        {cp.observacoes && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{cp.observacoes}</p>
                        )}
                      </div>

                      {/* Escolas Contempladas Section */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                            Escolas Contempladas ({totalEscolas}):
                          </span>
                          {totalAlunos && totalAlunos > 0 ? (
                            <span className="text-[10px] text-slate-500 font-semibold">{totalAlunos} alunos atendidos</span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {cp.escolasContempladas && cp.escolasContempladas.length > 0 ? (
                            cp.escolasContempladas.map((esc, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-white text-blue-900 border border-blue-200/80 rounded-md text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
                                <Building2 className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                <span>{esc.nomeEscola}</span>
                                {esc.polo && <span className="text-slate-400 text-[9px]">({esc.polo})</span>}
                              </span>
                            ))
                          ) : cp.escolaNome ? (
                            cp.escolaNome.split(',').map((nome, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-white text-blue-900 border border-blue-200/80 rounded-md text-[10px] font-semibold flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                <span>{nome.trim()}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Rede municipal / Todas as escolas</span>
                          )}
                        </div>
                      </div>

                      {/* Produtos e Valores Solicitados Section */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                            Produtos e Gêneros Solicitados ({cp.itensSolicitados?.length || 0}):
                          </span>
                        </div>
                        <div className="bg-slate-50/70 rounded-xl border border-slate-200/70 overflow-hidden">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <th className="p-2">Produto</th>
                                <th className="p-2 text-right">Qtd. Solicitada</th>
                                <th className="p-2 text-right">Preço Unit. Máx.</th>
                                <th className="p-2 text-right">Total Item</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(!cp.itensSolicitados || cp.itensSolicitados.length === 0) ? (
                                <tr>
                                  <td colSpan={4} className="p-2 text-center text-slate-400 italic">Nenhum item listado.</td>
                                </tr>
                              ) : (
                                cp.itensSolicitados.slice(0, 4).map((it, idx) => {
                                  const totalItem = it.valorTotalItem || (it.quantidadeTotal * it.precoMaximoUnitario);
                                  return (
                                    <tr key={idx} className="hover:bg-slate-100/50">
                                      <td className="p-2 font-bold text-slate-900">{it.produtoNome}</td>
                                      <td className="p-2 text-right text-slate-700 font-semibold">{it.quantidadeTotal.toLocaleString('pt-BR')} {it.unidade}</td>
                                      <td className="p-2 text-right text-slate-600">R$ {it.precoMaximoUnitario.toFixed(2)}</td>
                                      <td className="p-2 text-right font-bold text-emerald-800">R$ {totalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  );
                                })
                              )}
                              {cp.itensSolicitados && cp.itensSolicitados.length > 4 && (
                                <tr>
                                  <td colSpan={4} className="p-1.5 text-center text-emerald-700 font-bold bg-emerald-50/50 text-[10px]">
                                    + {cp.itensSolicitados.length - 4} outro(s) produto(s) no edital...
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] font-semibold">Valor Total do Edital:</span>
                          <span className="font-extrabold text-emerald-800 text-sm">
                            R$ {totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-[10px] font-semibold">Prazo de Vigência:</span>
                          <span className="font-bold text-slate-800 text-[11px]">{formatarData(cp.dataAbertura)} até {formatarData(cp.dataEncerramento)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setViewingChamadaDetalhada(cp)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>Ver Detalhes</span>
                        </button>

                        {cp.status !== 'ENCERRADA' && (
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenPedido();
                            // Vincula diretamente este edital ao novo pedido
                            const escIds = cp.escolasIds || (cp.escolaId ? [cp.escolaId] : []);
                            const escNomes = cp.escolasNomes || (cp.escolaNome ? [cp.escolaNome] : []);
                            setPedidoForm(prev => ({
                              ...prev,
                              chamadaPublicaId: cp.id,
                              chamadaPublicaEdital: cp.numeroEdital,
                              programaId: cp.programaId || prev.programaId,
                              programaNome: cp.programaNome || prev.programaNome,
                              programa: (cp.programa as any) || prev.programa,
                              fonteRecursos: cp.fonteRecurso || cp.fonteRecursos || prev.fonteRecursos,
                              escolasIds: escIds,
                              escolasNomes: escNomes,
                              escolaId: escIds[0] || prev.escolaId,
                              escolaNome: escNomes.join(', ') || prev.escolaNome
                            }));
                            // Pré-popula com o rateio já salvo desta chamada (produtor
                            // + escola + quantidade). Sem rateio salvo, o pedido abre
                            // vazio — o rateio precisa ser feito antes na aba "Rateio
                            // de Produtores".
                            if (rateiosChamadas.some(r => r.chamadaPublicaId === cp.id)) {
                              setTimeout(() => {
                                handleCarregarRateioNoPedido(cp.id, { silencioso: true });
                              }, 100);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Gerar Pedido Vinculado</span>
                        </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab Propostas de Oferta */}
      {activeTab === 'ofertas' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Produtor Vinc.</th>
                  <th className="p-3">Produto Vinc.</th>
                  <th className="p-3">Programa / Chamada Pública</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOfertas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Nenhuma proposta de oferta registrada ou compatível com os filtros.
                    </td>
                  </tr>
                ) : (
                  filteredOfertas.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {o.produtorNome || o.produtorId}
                      </td>
                      <td className="p-3 text-emerald-900 font-bold">
                        <div className="space-y-0.5">
                          {o.itens && o.itens.length > 0 ? (
                            o.itens.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-[11px]">
                                <Sprout className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{it.produtoNome} ({it.quantidadeKg} {it.unidadeMedida || 'KG'})</span>
                              </div>
                            ))
                          ) : (
                            <span className="flex items-center gap-1">
                              <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              {o.produtoNome || o.produtoId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700">
                        <div className="font-semibold text-slate-900">{o.programaNome || 'PAA/PNAE'}</div>
                        <div className="text-[10px] text-slate-500">{o.chamadaPublicaEdital || o.chamadaPublicaId || 'Edital Geral'}</div>
                      </td>
                      <td className="p-3 font-extrabold text-emerald-700">R$ {(o.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3">
                        <select
                          value={o.status}
                          onChange={e => {
                            if (!canWrite) { blockWriteAction(); return; }
                            updateOfertaPAA(o.id, { status: e.target.value as PropostaOfertaPAA['status'] });
                          }}
                          className={`px-2 py-1 rounded-md font-bold text-[10px] border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                            o.status === 'ACEITA' ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'RECUSADA' ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <option value="SUBMETIDA">SUBMETIDA</option>
                          <option value="ACEITA">ACEITA</option>
                          <option value="RECUSADA">RECUSADA</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenOferta(o)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!canWrite) { blockWriteAction(); return; }
                              if (confirm('Deseja excluir esta proposta de oferta?')) deleteOfertaPAA(o.id);
                            }}
                            className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Tab Rateio de Produtores */}
      {activeTab === 'rateio' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-700" />
              Rateio das Quantidades por Produtor e Escola
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Toda Chamada Pública nova precisa de um rateio antes de gerar os Pedidos: escolha o edital para dividir a quantidade de cada produto entre os produtores que o ofertaram e, dentro de cada produtor, entre as escolas contempladas. O rateio salvo aqui pode ser carregado diretamente ao registrar o Pedido daquela chamada.
            </p>

            {/* Chamadas ainda sem rateio — chamada de atenção para o fluxo
                "sempre que inserir uma chamada, é preciso ratear". */}
            {(() => {
              const chamadasSemRateio = chamadasPublicas.filter(cp =>
                (cp.itensSolicitados || []).length > 0 &&
                !rateiosChamadas.some(r => r.chamadaPublicaId === cp.id)
              );
              if (chamadasSemRateio.length === 0) return null;
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                  <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> {chamadasSemRateio.length} chamada(s) pública(s) ainda sem rateio:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {chamadasSemRateio.map(cp => (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => handleSelecionarChamadaRateio(cp.id)}
                        className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3" /> Novo Rateio: Edital {cp.numeroEdital}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <select
                value={rateioChamadaId}
                onChange={e => handleSelecionarChamadaRateio(e.target.value)}
                className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-emerald-800 text-xs"
              >
                <option value="">Selecione a Chamada Pública / Edital...</option>
                {chamadasPublicas.map(cp => {
                  const temRateio = rateiosChamadas.some(r => r.chamadaPublicaId === cp.id);
                  return (
                    <option key={cp.id} value={cp.id}>
                      {temRateio ? '✓' : '○'} Edital {cp.numeroEdital} - {cp.orgaoComprador} {cp.status === 'ENCERRADA' ? '[ENCERRADA]' : ''} {!temRateio ? '(sem rateio ainda)' : ''}
                    </option>
                  );
                })}
              </select>
              {rateioEmEdicao && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelecionarChamadaRateio('')}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                    title="Fechar este rateio e escolher outra chamada"
                  >
                    <X className="w-3.5 h-3.5" /> Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleRegerarRateioAutomatico}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Sugerir Automaticamente
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvarRateioAtual}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar Rateio
                  </button>
                </div>
              )}
            </div>
          </div>

          {rateioEmEdicao && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-slate-500">
              <span>Edital: <strong className="text-slate-700">{rateioEmEdicao.chamadaPublicaEdital}</strong></span>
              {rateioEmEdicao.programaNome && <span>Programa: <strong className="text-slate-700">{rateioEmEdicao.programaNome}</strong></span>}
              {rateioEmEdicao.fonteRecursos && <span>Fonte de Recurso: <strong className="text-emerald-700">{rateioEmEdicao.fonteRecursos}</strong></span>}
            </div>
          )}

          {!rateioEmEdicao ? (
            <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs font-medium">
              Selecione uma Chamada Pública acima para montar o rateio.
            </div>
          ) : rateioEmEdicao.itens.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs font-medium">
              Esta chamada pública não tem produtos cadastrados no edital. Cadastre os itens solicitados na aba "Chamadas Públicas" antes de ratear.
            </div>
          ) : (
            rateioEmEdicao.itens.map((item, produtoIdx) => {
              const totalAlocado = item.produtores.reduce((s, p) => s + (p.quantidadeAlocada || 0), 0);
              const diffTotal = Math.round((item.quantidadeTotalChamada - totalAlocado) * 100) / 100;
              return (
                <div key={produtoIdx} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-4 bg-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-emerald-300" /> {item.produtoNome}
                      </h4>
                      <p className="text-[11px] text-emerald-200 font-mono mt-0.5">
                        Edital: {item.quantidadeTotalChamada} {item.unidade} a R$ {item.precoMaximoUnitario.toFixed(2)}/{item.unidade}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${
                      diffTotal === 0 ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                      : diffTotal > 0 ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                      : 'bg-rose-500/20 text-rose-200 border border-rose-400/50'
                    }`}>
                      {diffTotal === 0 ? 'Rateio completo ✓' : diffTotal > 0 ? `Faltam ${diffTotal} ${item.unidade}` : `Excede em ${Math.abs(diffTotal)} ${item.unidade}`}
                    </span>
                  </div>

                  {item.produtores.length === 0 ? (
                    <div className="p-5 text-xs text-slate-500 italic">
                      Nenhum produtor ofertou este produto para esta chamada ainda. Cadastre propostas de oferta na aba "Propostas de Oferta".
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {item.produtores.map((p, produtorIdx) => {
                        const somaEscolas = p.escolas.reduce((s, e) => s + (e.quantidade || 0), 0);
                        const diffEscolas = Math.round((p.quantidadeAlocada - somaEscolas) * 100) / 100;
                        return (
                          <div key={produtorIdx} className="p-4 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                                <span className="font-bold text-slate-900 text-xs truncate">{p.produtorNome}</span>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">(ofertou {p.quantidadeOfertada} {item.unidade})</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <label className="text-[11px] font-bold text-slate-500">Quantidade alocada:</label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={p.quantidadeAlocada}
                                  onChange={e => handleQuantidadeProdutorRateio(produtoIdx, produtorIdx, Number(e.target.value) || 0)}
                                  className="w-32 p-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-800 text-right"
                                />
                                <span className="text-[11px] text-slate-500">{item.unidade}</span>
                              </div>
                            </div>

                            {p.escolas.length > 0 && (
                              <div className="pl-6 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3" /> Rateio entre as escolas do edital
                                  </span>
                                  <span className={`text-[10px] font-bold ${diffEscolas === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {diffEscolas === 0 ? 'Confere com o total do produtor ✓' : `Diferença de ${diffEscolas} ${item.unidade} em relação ao alocado`}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {p.escolas.map((esc, escolaIdx) => (
                                    <div key={escolaIdx} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                      <span className="text-[11px] text-slate-700 truncate">{esc.escolaNome}</span>
                                      <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={esc.quantidade}
                                        onChange={e => handleQuantidadeEscolaRateio(produtoIdx, produtorIdx, escolaIdx, Number(e.target.value) || 0)}
                                        className="w-28 p-1.5 border border-slate-200 rounded text-xs font-mono font-bold text-emerald-800 text-right shrink-0"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Pedidos aos Produtores */}
      {activeTab === 'pedidos' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Pedidos de Produtos aos Produtores Rurais</h3>
              <p className="text-xs text-slate-500">
                Gere pedidos consolidados vinculando Programa, Edital, Escola e múltiplos Produtores e Produtos com ajuste de quantidade.
              </p>
            </div>
            <button
              onClick={() => handleOpenPedido()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Novo Pedido aos Produtores
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Nº Pedido</th>
                  <th className="p-3">Programa / Fonte</th>
                  <th className="p-3">Chamada / Escola Destino</th>
                  <th className="p-3">Produtores & Produtos Vinculados</th>
                  <th className="p-3">Prev. Coleta</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPedidos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Nenhum pedido de produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredPedidos.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-extrabold text-slate-900">
                        <div>{p.numeroPedido}</div>
                        {programacoesEntrega.some(pe => pe.pedidoId === p.id || pe.pedidoNumero === p.numeroPedido) && (
                          <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">
                            <Truck className="w-2.5 h-2.5" /> Entrega Agendada
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px] mr-1.5">
                          {p.programaNome || p.programa}
                        </span>
                        <div className="text-slate-600 text-[11px] font-medium">{p.fonteRecursos}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1">{p.chamadaPublicaEdital || 'Chamada Aberta'}</div>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(p.escolasNomes && p.escolasNomes.length > 0
                            ? p.escolasNomes
                            : (p.escolaNome ? p.escolaNome.split(', ') : ['Escolas Cadastradas'])
                          ).map((nomeEsc, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200/60 rounded text-[10px] font-bold flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-blue-600 shrink-0" /> {nomeEsc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-slate-900 font-bold">
                            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{Array.from(new Set(p.itens?.map(i => i.produtorNome))).join(', ') || 'Vários Produtores'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold">
                            <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{p.itens?.length || 0} produto(s): {p.itens?.slice(0, 2).map(i => `${i.produtoNome} (${i.quantidadePedida}${i.unidadeMedida})`).join(', ')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {p.qtdeEntregas && p.qtdeEntregas > 1 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-extrabold text-[10px] flex items-center gap-1 border border-indigo-200">
                                <Truck className="w-2.5 h-2.5 text-indigo-600" />
                                {p.qtdeEntregas}x Entregas Programadas
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(p.cronogramaEntregas || []).map(cr => (
                                <span
                                  key={cr.numero}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-900 text-[9px] font-bold transition-colors cursor-pointer"
                                  onClick={() => setViewingCronogramaPedido(p)}
                                  title={`${cr.rotulo}: ${cr.dataPrevista} (${cr.quantidadeKg} KG - ${cr.percentual}%)`}
                                >
                                  {cr.numero}ª: {cr.dataPrevista?.split('-').reverse().slice(0, 2).join('/')} ({cr.quantidadeKg}kg)
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formatarData(p.dataPrevistaEntrega)}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Entrega Única</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-extrabold text-emerald-700 text-sm">
                        R$ {(p.valorTotalPedido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px]">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => setViewingCronogramaPedido(p)}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                            title="Ver Cronograma Detalhado das Entregas Programadas e Datas"
                          >
                            <Calendar className="w-3 h-3" /> Cronograma ({p.qtdeEntregas || 1}x)
                          </button>
                          <button
                            onClick={() => setViewingEnvioProdutoresPedido(p)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                            title="Relatório PDF e Envio de Pedidos aos Produtores via WhatsApp"
                          >
                            <FileText className="w-3 h-3" /> WhatsApp / PDF
                          </button>
                          {(() => {
                            const nfEntradaExistente = notasFiscais.find(nf => nf.pedidoId === p.id && nf.tipoOperacao === 'ENTRADA_PRODUTOR');
                            const nfSaidaExistente = notasFiscais.find(nf => nf.pedidoId === p.id && nf.tipoOperacao === 'SAIDA_PNAE_PAA');
                            return (
                              <>
                                <button
                                  onClick={() => {
                                    if (nfEntradaExistente) return;
                                    handleOpenGerarNFe(p, 'ENTRADA_PRODUTOR');
                                  }}
                                  disabled={!!nfEntradaExistente}
                                  className={`px-2 py-1 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-xs ${
                                    nfEntradaExistente
                                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                      : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                                  }`}
                                  title={nfEntradaExistente
                                    ? `NF-e de Entrada já emitida (Nº ${nfEntradaExistente.numeroNota}) — emissão permitida apenas uma vez por pedido`
                                    : 'Gerar Nota Fiscal de Entrada por Produtor (Compra de Produção Rural c/ FUNRURAL e Reforma 2026)'}
                                >
                                  {nfEntradaExistente ? <CheckCircle2 className="w-3 h-3" /> : <Receipt className="w-3 h-3" />}
                                  {nfEntradaExistente ? `NF-e Entrada Nº ${nfEntradaExistente.numeroNota}` : 'NF-e Entrada'}
                                </button>
                                <button
                                  onClick={() => {
                                    if (nfSaidaExistente) return;
                                    handleOpenGerarNFe(p, 'SAIDA_ESCOLA');
                                  }}
                                  disabled={!!nfSaidaExistente}
                                  className={`px-2 py-1 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-xs ${
                                    nfSaidaExistente
                                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                  }`}
                                  title={nfSaidaExistente
                                    ? `NF-e de Saída já emitida (Nº ${nfSaidaExistente.numeroNota}) — emissão permitida apenas uma vez por pedido`
                                    : 'Gerar Nota Fiscal de Saída por Escola (Fornecimento Alimentação Escolar PNAE)'}
                                >
                                  {nfSaidaExistente ? <CheckCircle2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                  {nfSaidaExistente ? `NF-e Saída Nº ${nfSaidaExistente.numeroNota}` : 'NF-e Saída'}
                                </button>
                              </>
                            );
                          })()}
                          <button
                            onClick={() => {
                              if (p.status === 'RECEBIDO') return;
                              handleOpenPedido(p);
                            }}
                            disabled={p.status === 'RECEBIDO'}
                            className={`p-1.5 rounded ${p.status === 'RECEBIDO' ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-600 hover:text-emerald-700'}`}
                            title={p.status === 'RECEBIDO' ? 'Pedido já entregue (concluído) — não pode mais ser editado' : 'Editar Pedido'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (p.status === 'RECEBIDO') return;
                              if (!canWrite) { blockWriteAction(); return; }
                              if (confirm(`Deseja excluir o pedido ${p.numeroPedido}?`)) { deletePedidoProdutorPAA(p.id); playActionCompleteSound(); }
                            }}
                            disabled={p.status === 'RECEBIDO'}
                            className={`p-1.5 rounded ${p.status === 'RECEBIDO' ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'}`}
                            title={p.status === 'RECEBIDO' ? 'Pedido já entregue (concluído) — não pode mais ser excluído' : 'Excluir'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Tab Programação de Entregas */}
      {activeTab === 'entregas' && (
        <div className="space-y-4">
          {/* Header & KPI Summary Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" /> Programação de Entregas & Roteirização de Escolas
                </h3>
                <p className="text-xs text-slate-500">
                  Gerenciamento de rotas com múltiplas escolas do pedido, cálculo automático de quilometragem, consumo de combustível e totalização de despesas.
                </p>
              </div>
              <button
                onClick={() => handleOpenEntrega()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Nova Rota de Entrega
              </button>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
                  <span>Rotas Agendadas</span>
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {filteredEntregas.length} <span className="text-xs font-normal text-slate-500">viagens</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
                  <span>Quilometragem Total</span>
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {filteredEntregas.reduce((s, p) => s + (p.distanciaTotalKm || p.paradasEntrega?.reduce((acc, sp) => acc + (sp.distanciaKm || 0), 0) || 0), 0).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-500">Km</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
                  <span>Consumo de Combustível</span>
                  <Fuel className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {filteredEntregas.reduce((s, p) => s + (p.consumoCombustivelLitros || 0), 0).toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-500">L</span>
                </div>
                <div className="text-[10px] font-medium text-slate-500">
                  R$ {filteredEntregas.reduce((s, p) => s + (p.despesaCombustivel || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold">
                  <span>Soma Total Despesas</span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div className="text-lg font-black text-emerald-900 mt-1">
                  R$ {filteredEntregas.reduce((s, p) => s + (p.totalDespesasEntrega || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] font-medium text-emerald-700">
                  Combustível + Diárias + Manutenção
                </div>
              </div>
            </div>
          </div>

          {/* Table of Deliveries */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="p-3">Data / Horário</th>
                    <th className="p-3">Programa / Pedido</th>
                    <th className="p-3">Roteiro de Escolas do Pedido</th>
                    <th className="p-3">Distância & Combustível</th>
                    <th className="p-3">Despesas da Rota</th>
                    <th className="p-3">Motorista & Veículo</th>
                    <th className="p-3">Carga (Kg)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntregas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Nenhuma programação de entrega cadastrada.
                      </td>
                    </tr>
                  ) : (
                    filteredEntregas.map(pe => {
                      const paradas = pe.paradasEntrega && pe.paradasEntrega.length > 0
                        ? pe.paradasEntrega
                        : [{
                            id: 'p-1',
                            ordem: 1,
                            escolaId: pe.escolaId || '',
                            escolaNome: pe.escolaNome || pe.escolaOrgaoDestino || 'Escola Destino',
                            endereco: pe.localEntrega || 'Sede da Unidade Escolar',
                            distanciaKm: pe.distanciaTotalKm || 18,
                            quantidadeKg: pe.quantidadeTotalKg || 500,
                            statusEntrega: 'PENDENTE' as const
                          }];
                      const distTotal = pe.distanciaTotalKm ?? paradas.reduce((s, p) => s + (p.distanciaKm || 0), 0);
                      const consumoL = pe.consumoCombustivelLitros ?? Number((distTotal / (pe.autonomiaKmL || 8.0)).toFixed(2));
                      const precoL = pe.precoLitroCombustivel ?? 6.29;
                      const despComb = pe.despesaCombustivel ?? Number((consumoL * precoL).toFixed(2));
                      const totalDesp = pe.totalDespesasEntrega ?? Number((despComb + (pe.despesaDiariaMotorista || 80) + (pe.despesaManutencao || 25) + (pe.outrasDespesas || 15)).toFixed(2));

                      return (
                        <tr key={pe.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatarData(pe.dataPrevista)}</span>
                            </div>
                            {pe.horarioSaidaPrevisto && (
                              <div className="text-[10px] text-slate-500 font-normal flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-400" /> Saída: {pe.horarioSaidaPrevisto}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{pe.programaNome || 'PNAE/PAA'}</span>
                              {pe.totalEntregas && pe.totalEntregas > 1 && (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-full font-black text-[9px] flex items-center gap-0.5">
                                  <Split className="w-2.5 h-2.5 text-purple-600" /> Remessa {pe.numeroEntrega}/{pe.totalEntregas}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-emerald-800 font-bold">{pe.pedidoNumero || 'Pedido Vinculado'}</div>
                            {pe.parcelaRotulo && (
                              <div className="text-[10px] text-purple-700 font-semibold">{pe.parcelaRotulo}</div>
                            )}
                            {pe.chamadaPublicaEdital && (
                              <div className="text-[10px] text-slate-400">{pe.chamadaPublicaEdital}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1 max-w-sm">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{paradas.length} Escola(s) no Roteiro:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {paradas.map((parada, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200/70 rounded-md text-[10px] font-semibold"
                                    title={`${parada.endereco || ''} - Carga: ${parada.quantidadeKg || 0} kg`}
                                  >
                                    <span className="font-black text-blue-700">#{parada.ordem || pIdx + 1}</span>
                                    <span>{parada.escolaNome}</span>
                                    <span className="text-[9px] text-slate-500 font-mono">({parada.distanciaKm || 0} km)</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                                <span>{distTotal} km</span>
                              </div>
                              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                                <Fuel className="w-3 h-3 text-rose-600" />
                                <span>{consumoL} L</span>
                                <span className="text-[10px] text-slate-400">(@ R$ {precoL.toFixed(2)}/L)</span>
                              </div>
                              <div className="text-[10px] font-semibold text-rose-700">
                                Comb: R$ {despComb.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <div className="font-black text-emerald-800 text-sm">
                                R$ {totalDesp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[9px] text-slate-500">
                                Diária: R$ {pe.despesaDiariaMotorista || 80} | Outros: R$ {((pe.despesaManutencao || 25) + (pe.outrasDespesas || 15))}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">
                            <div className="font-semibold text-slate-900">{pe.motoristaNome || 'Motorista'}</div>
                            <div className="text-[10px] font-mono text-slate-500">{pe.veiculoPlaca || 'PMN-4A92'}</div>
                            {pe.veiculoModelo && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{pe.veiculoModelo}</div>
                            )}
                          </td>
                          <td className="p-3 font-extrabold text-emerald-700 text-sm">
                            {pe.quantidadeTotalKg || paradas.reduce((s, p) => s + (p.quantidadeKg || 0), 0)} kg
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              pe.status === 'ENTREGUE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pe.status === 'EM_TRANSITO'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {pe.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              <button
                                onClick={() => setViewingRomaneio(pe)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-xs border border-slate-200"
                                title="Visualizar Romaneio / Ficha de Rota e Despesas"
                              >
                                <FileSpreadsheet className="w-3 h-3 text-emerald-600" /> Romaneio
                              </button>
                              <button
                                onClick={() => handleOpenGerarNFe(pe, 'SAIDA_ESCOLA')}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-xs"
                                title="Gerar NF-e de Saída para as Escolas da Rota"
                              >
                                <FileText className="w-3 h-3" /> NF-e Saída
                              </button>
                              <button
                                onClick={() => handleOpenEntrega(pe)}
                                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                                title="Editar Rota & Despesas"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (!canWrite) { blockWriteAction(); return; }
                                  if (confirm('Deseja excluir esta programação de entrega?')) deleteProgramacaoEntrega(pe.id);
                                }}
                                className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                                title="Excluir Rota"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* Tab Relatórios de Pedidos e Entregas */}
      {activeTab === 'relatorios' && (
        <div className="space-y-5">
          {/* Sub-tabs & Filter Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRelatorioSubTab('pedidos')}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    relatorioSubTab === 'pedidos'
                      ? 'bg-emerald-700 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Relatório de Pedidos</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-[10px]">
                    {filteredRelPedidos.length}
                  </span>
                </button>
                <button
                  onClick={() => setRelatorioSubTab('entregas')}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    relatorioSubTab === 'entregas'
                      ? 'bg-emerald-700 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Relatório de Entregas</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-[10px]">
                    {filteredRelEntregas.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearRelFilters}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Limpar Filtros
                </button>
                <button
                  onClick={handleExportRelExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                </button>
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" /> Imprimir / PDF
                </button>
              </div>
            </div>

            {/* Filter grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Produtor</label>
                <select
                  value={relFilterProdutor}
                  onChange={e => setRelFilterProdutor(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                >
                  <option value="TODOS">Todos os Produtores</option>
                  {relOptionsProdutores.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Escola</label>
                <select
                  value={relFilterEscola}
                  onChange={e => setRelFilterEscola(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                >
                  <option value="TODOS">Todas as Escolas</option>
                  {relOptionsEscolas.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Produto</label>
                <select
                  value={relFilterProduto}
                  onChange={e => setRelFilterProduto(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                >
                  <option value="TODOS">Todos os Produtos</option>
                  {relOptionsProdutos.map(prod => (
                    <option key={prod} value={prod}>{prod}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Mês</label>
                <select
                  value={relFilterMes}
                  onChange={e => setRelFilterMes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                >
                  <option value="TODOS">Todos os Meses</option>
                  <option value="01">Janeiro</option>
                  <option value="02">Fevereiro</option>
                  <option value="03">Março</option>
                  <option value="04">Abril</option>
                  <option value="05">Maio</option>
                  <option value="06">Junho</option>
                  <option value="07">Julho</option>
                  <option value="08">Agosto</option>
                  <option value="09">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Ano</label>
                <select
                  value={relFilterAno}
                  onChange={e => setRelFilterAno(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                >
                  <option value="TODOS">Todos os Anos</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Programa</label>
                <select
                  value={relFilterPrograma}
                  onChange={e => setRelFilterPrograma(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                >
                  <option value="TODOS">Todos os Programas</option>
                  {relOptionsProgramas.map(prog => (
                    <option key={prog} value={prog}>{prog}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Chamada Pública</label>
                <select
                  value={relFilterChamada}
                  onChange={e => setRelFilterChamada(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                >
                  <option value="TODOS">Todas as Chamadas</option>
                  {relOptionsChamadas.map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Nº Pedido</label>
                <select
                  value={relFilterPedidoNum}
                  onChange={e => setRelFilterPedidoNum(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                >
                  <option value="TODOS">Todos os Pedidos</option>
                  {relOptionsPedidosNum.map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table display */}
          {relatorioSubTab === 'pedidos' ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-slate-700">
                  Exibindo <strong className="text-emerald-700">{filteredRelPedidos.length}</strong> registro(s) de Pedidos
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="p-3">Nº Pedido</th>
                      <th className="p-3">Edital / Chamada</th>
                      <th className="p-3">Escola Destino</th>
                      <th className="p-3">Produtor Rural</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-right">Qtd Pedida</th>
                      <th className="p-3 text-right">Valor Total</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRelPedidos.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                          Nenhum pedido encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredRelPedidos.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{row.numeroPedido || 'N/A'}</td>
                          <td className="p-3 text-slate-600 truncate max-w-[150px]">{row.chamadaPublica || 'N/A'}</td>
                          <td className="p-3 font-medium text-slate-900">{row.escola || 'N/A'}</td>
                          <td className="p-3 font-bold text-emerald-900">{row.produtor}</td>
                          <td className="p-3 text-slate-700 font-medium">{row.produto}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{row.quantidade} {row.unidade}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">R$ {row.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-slate-500">{formatarData(row.data)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-slate-700">
                  Exibindo <strong className="text-emerald-700">{filteredRelEntregas.length}</strong> registro(s) de Entregas
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="p-3">Nº Pedido</th>
                      <th className="p-3">Escola Destino</th>
                      <th className="p-3">Produtor Rural</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-right">Qtd Prevista</th>
                      <th className="p-3 text-right">Qtd Entregue</th>
                      <th className="p-3">Motorista / Veículo</th>
                      <th className="p-3">Data Prevista</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRelEntregas.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                          Nenhuma entrega encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredRelEntregas.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{row.numeroPedido || 'N/A'}</td>
                          <td className="p-3 font-medium text-slate-900">{row.escola || 'N/A'}</td>
                          <td className="p-3 font-bold text-emerald-900">{row.produtor}</td>
                          <td className="p-3 text-slate-700 font-medium">{row.produto}</td>
                          <td className="p-3 text-right font-mono text-slate-700">{row.quantidadePrevista} {row.unidade}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">{row.quantidadeEntregue} {row.unidade}</td>
                          <td className="p-3 text-slate-600">{row.motorista} ({row.veiculo || 'N/A'})</td>
                          <td className="p-3 text-slate-500">{formatarData(row.data)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print / PDF Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-[96vw] max-w-[1200px] p-6 sm:p-8 shadow-2xl space-y-6 my-4 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-700" />
                  Visualização de Impressão / Relatório Oficial ({relatorioSubTab === 'pedidos' ? 'Pedidos' : 'Entregas'})
                </h2>
                <p className="text-xs text-slate-500">Documento formatado para visualização, salvamento em PDF ou impressão direta.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Printable Report Document */}
            <div className="p-6 bg-white border border-slate-300 rounded-2xl space-y-6 text-xs text-slate-800 shadow-xs">
              <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                <h3 className="text-base font-black uppercase text-slate-900">{config?.nomeCooperativa || 'Cooperativa da Agricultura Familiar'}</h3>
                <p className="text-[11px] text-slate-600">CNPJ: {config?.cnpj || '00.000.000/0001-00'} • Sistema SisGepa PAA & PNAE</p>
                <h4 className="text-sm font-bold text-emerald-800 uppercase pt-1">
                  {relatorioSubTab === 'pedidos' ? 'Relatório Oficial de Pedidos aos Produtores' : 'Relatório de Entregas'}
                </h4>
                {relatorioSubTab === 'pedidos' ? (
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-700 pt-1">
                    <span><strong>Nº do Pedido:</strong> {relFilterPedidoNum !== 'TODOS' ? relFilterPedidoNum : (Array.from(new Set(filteredRelPedidos.map(r => r.numeroPedido).filter(Boolean))).join(', ') || 'Todos')}</span>
                    <span className="text-slate-300">•</span>
                    <span><strong>Programa:</strong> {relFilterPrograma !== 'TODOS' ? relFilterPrograma : (Array.from(new Set(filteredRelPedidos.map(r => r.programa).filter(Boolean))).join(', ') || 'Todos')}</span>
                    <span className="text-slate-300">•</span>
                    <span><strong>Data:</strong> {Array.from(new Set(filteredRelPedidos.map(r => formatarData(r.data)).filter(Boolean))).join(', ') || 'Todas'}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-700 pt-1">
                    <span><strong>Nº do Pedido:</strong> {relFilterPedidoNum !== 'TODOS' ? relFilterPedidoNum : (Array.from(new Set(filteredRelEntregas.map(r => r.numeroPedido).filter(Boolean))).join(', ') || 'Todos')}</span>
                    <span className="text-slate-300">•</span>
                    <span><strong>Programa:</strong> {relFilterPrograma !== 'TODOS' ? relFilterPrograma : (Array.from(new Set(filteredRelEntregas.map(r => r.programa).filter(Boolean))).join(', ') || 'Todos')}</span>
                    <span className="text-slate-300">•</span>
                    <span><strong>Data:</strong> {Array.from(new Set(filteredRelEntregas.map(r => formatarData(r.data)).filter(Boolean))).join(', ') || 'Todas'}</span>
                  </div>
                )}
                <p className="text-[10px] text-slate-400">Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
              </div>

              {/* Applied filters summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div><strong>Produtor:</strong> {relFilterProdutor}</div>
                <div><strong>Escola:</strong> {relFilterEscola}</div>
                <div><strong>Produto:</strong> {relFilterProduto}</div>
                <div><strong>Programa:</strong> {relFilterPrograma}</div>
                <div><strong>Mês:</strong> {relFilterMes}</div>
                <div><strong>Ano:</strong> {relFilterAno}</div>
                <div><strong>Chamada:</strong> {relFilterChamada}</div>
                <div><strong>Pedido:</strong> {relFilterPedidoNum}</div>
              </div>

              {/* Table in Print Preview */}
              {relatorioSubTab === 'pedidos' ? (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-black border-b border-slate-300">
                      <th className="p-2">Escola Destino</th>
                      <th className="p-2">Produtor Rural</th>
                      <th className="p-2">Produto</th>
                      <th className="p-2 text-right">Qtd</th>
                      <th className="p-2 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRelPedidos.map(row => (
                      <tr key={row.id}>
                        <td className="p-2">{row.escola}</td>
                        <td className="p-2 font-bold">{row.produtor}</td>
                        <td className="p-2">{row.produto}</td>
                        <td className="p-2 text-right font-mono">{row.quantidade} {row.unidade}</td>
                        <td className="p-2 text-right font-mono font-bold">R$ {row.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 font-black border-b border-slate-300">
                      <th className="p-2">Escola Destino</th>
                      <th className="p-2">Produtor Rural</th>
                      <th className="p-2">Produto</th>
                      <th className="p-2 text-right">Qtd Entregue</th>
                      <th className="p-2">Motorista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRelEntregas.map(row => (
                      <tr key={row.id}>
                        <td className="p-2">{row.escola}</td>
                        <td className="p-2 font-bold">{row.produtor}</td>
                        <td className="p-2">{row.produto}</td>
                        <td className="p-2 text-right font-mono font-bold">{row.quantidadeEntregue} {row.unidade}</td>
                        <td className="p-2">{row.motorista}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold">Responsável pela Emissão</p>
                  <p className="text-slate-500 text-[10px]">Cooperativa / SisGepa</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold">Diretoria / Gestão</p>
                  <p className="text-slate-500 text-[10px]">Assinatura / Visto</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modais com Seleção de Vínculo */}
      {/* Modal Chamada Pública */}
      {showChamadaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-[96vw] max-w-[1600px] p-6 sm:p-8 lg:p-10 shadow-2xl space-y-5 border border-slate-100 my-4 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Building className="w-6 h-6 text-emerald-700" />
                  {editingChamada ? 'Editar Chamada Pública / Edital' : 'Nova Chamada Pública / Edital'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure as escolas contempladas, gêneros alimentícios solicitados, preços máximos unitários e a fonte de recurso.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => baixarModeloPlanilhaChamadaPublica()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-300"
                  title="Baixar modelo em Excel para preencher"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">Modelo XLS</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowChamadaModal(false);
                    setShowImportChamadaModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-300"
                  title="Importar dados de planilha XLS"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">Importar XLS</span>
                </button>

                <button onClick={() => setShowChamadaModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveChamada} className="space-y-5 text-xs">
              {/* Row 1: Edital, Programa, Fonte de Recurso */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nº do Edital / Chamada *</label>
                  <input
                    type="text"
                    required
                    value={chamadaForm.numeroEdital}
                    onChange={e => setChamadaForm({ ...chamadaForm, numeroEdital: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    placeholder="Ex: EDITAL CP-001/2026"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Programa Governamental *</label>
                  <select
                    value={chamadaForm.programaId}
                    onChange={e => {
                      const prog = programas.find(p => p.id === e.target.value);
                      const novasFontes = getFontesRecursosParaPrograma(prog?.tipo, prog?.nome);
                      setChamadaForm(prev => ({
                        ...prev,
                        programaId: e.target.value,
                        programaNome: prog?.nome || '',
                        programa: prog?.tipo || 'PNAE',
                        fonteRecurso: novasFontes.includes(prev.fonteRecurso || '') ? prev.fonteRecurso : '',
                        fonteRecursos: novasFontes.includes(prev.fonteRecurso || '') ? prev.fonteRecursos : ''
                      }));
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-emerald-900"
                  >
                    <option value="">Selecione o Programa...</option>
                    {programas.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.tipo}) - Limite: R$ {p.limitePorProdutorAno}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fonte de Recursos *</label>
                  <select
                    value={chamadaForm.fonteRecurso || ''}
                    onChange={e => setChamadaForm({ ...chamadaForm, fonteRecurso: e.target.value, fonteRecursos: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-indigo-900"
                  >
                    <option value="">Selecione a Fonte de Recursos...</option>
                    {getFontesRecursosParaPrograma(chamadaForm.programa, chamadaForm.programaNome).map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Órgão Comprador & Status & Prazos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">Órgão Comprador / Proponente *</label>
                  <input
                    type="text"
                    required
                    value={chamadaForm.orgaoComprador}
                    onChange={e => setChamadaForm({ ...chamadaForm, orgaoComprador: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                    placeholder="Prefeitura Municipal / Secretaria de Educação"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Período de Vigência / Entrega</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={chamadaForm.dataAbertura}
                      onChange={e => setChamadaForm({ ...chamadaForm, dataAbertura: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      title="Data de Abertura"
                    />
                    <input
                      type="date"
                      value={chamadaForm.dataEncerramento}
                      onChange={e => setChamadaForm({ ...chamadaForm, dataEncerramento: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      title="Data de Encerramento"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status do Edital</label>
                  <select
                    value={chamadaForm.status}
                    onChange={e => setChamadaForm({ ...chamadaForm, status: e.target.value as any })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ABERTA">ABERTA</option>
                    <option value="EM_EXECUCAO">EM EXECUÇÃO</option>
                    <option value="ENCERRADA">ENCERRADA</option>
                  </select>
                </div>
              </div>

              {/* SEÇÃO: Escolas Contempladas no Edital */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-blue-950 flex items-center gap-2 text-xs">
                      <GraduationCap className="w-4 h-4 text-blue-700" />
                      Escolas e Unidades Receptoras Contempladas ({chamadaForm.escolasContempladas?.length || 0})
                    </h3>
                    <p className="text-[11px] text-blue-800">
                      Marque as escolas municipais e estaduais que serão atendidas por este edital de compra.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllEscolasChamada()}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-2xs"
                    >
                      Selecionar Todas ({escolasPnae.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearEscolasChamada()}
                      className="px-2.5 py-1 bg-white border border-blue-300 text-blue-800 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Grid com as Escolas Cadastradas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded-xl border border-blue-200">
                  {escolasPnae.map(esc => {
                    const isSelected = (chamadaForm.escolasContempladas || []).some(e => e.id === esc.id || e.nomeEscola === esc.nomeEscola);
                    return (
                      <button
                        key={esc.id}
                        type="button"
                        onClick={() => handleToggleEscolaChamada(esc.id)}
                        className={`p-2 rounded-lg text-left text-xs transition-all border flex items-start justify-between gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-xs'
                            : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold line-clamp-1">{esc.nomeEscola}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {esc.polo || 'Sede'} • {esc.alunosAtendidos || 0} alunos
                          </div>
                        </div>
                        <span className="text-xs shrink-0 mt-0.5">{isSelected ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SEÇÃO: Produtos e Gêneros Alimentícios Solicitados */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-emerald-950 flex items-center gap-2 text-xs">
                      <Sprout className="w-4 h-4 text-emerald-700" />
                      Gêneros Alimentícios e Produtos Solicitados ({chamadaForm.itensSolicitados?.length || 0})
                    </h3>
                    <p className="text-[11px] text-emerald-800">
                      Informe os produtos, quantidades totais solicitadas e o preço unitário máximo de referência.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddChamadaItem}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Adicionar Produto</span>
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="w-10 p-2.5 text-center">Ação</th>
                          <th className="p-2.5">Gênero / Produto Solicitado *</th>
                          <th className="w-24 p-2.5">Unidade</th>
                          <th className="w-36 p-2.5 text-right">Qtd. Solicitada *</th>
                          <th className="w-36 p-2.5 text-right">Preço Unit. Máx (R$) *</th>
                          <th className="w-36 p-2.5 text-right">Valor Total Item</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(!chamadaForm.itensSolicitados || chamadaForm.itensSolicitados.length === 0) ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                              Nenhum produto adicionado ao edital. Clique no botão acima "+ Adicionar Produto" ou importe uma planilha.
                            </td>
                          </tr>
                        ) : (
                          chamadaForm.itensSolicitados.map((item, idx) => {
                            const totalItem = item.valorTotalItem || (item.quantidadeTotal * item.precoMaximoUnitario);
                            return (
                              <tr key={idx} className="hover:bg-emerald-50/30">
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveChamadaItem(idx)}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Remover produto do edital"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>

                                <td className="p-2">
                                  <select
                                    value={item.produtoId || (produtos.find(p => p.nome === item.produtoNome)?.id || '')}
                                    onChange={e => {
                                      const pObj = produtos.find(p => p.id === e.target.value);
                                      if (pObj) {
                                        handleUpdateChamadaItem(idx, 'produtoId', pObj.id);
                                        handleUpdateChamadaItem(idx, 'produtoNome', pObj.nome);
                                        handleUpdateChamadaItem(idx, 'unidade', pObj.unidadeMedida || 'KG');
                                        if (pObj.precoReferencia) {
                                          handleUpdateChamadaItem(idx, 'precoMaximoUnitario', pObj.precoReferencia);
                                        }
                                      } else {
                                        handleUpdateChamadaItem(idx, 'produtoId', e.target.value);
                                      }
                                    }}
                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-emerald-500"
                                  >
                                    <option value="">Selecione o Gênero / Produto...</option>
                                    {produtos.map(p => (
                                      <option key={p.id} value={p.id}>{p.nome} ({p.unidadeMedida})</option>
                                    ))}
                                    {item.produtoNome && !produtos.some(p => p.id === item.produtoId || p.nome === item.produtoNome) && (
                                      <option value={item.produtoId || item.produtoNome}>{item.produtoNome} ({item.unidade || 'KG'})</option>
                                    )}
                                  </select>
                                </td>

                                <td className="p-2">
                                  <select
                                    value={item.unidade}
                                    onChange={e => handleUpdateChamadaItem(idx, 'unidade', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                                  >
                                    <option value="KG">KG</option>
                                    <option value="UN">UN</option>
                                    <option value="MAÇO">MAÇO</option>
                                    <option value="CX">CX</option>
                                    <option value="L">L</option>
                                    <option value="PACOTE">PACOTE</option>
                                    <option value="DÚZIA">DÚZIA</option>
                                  </select>
                                </td>

                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    min="0.1"
                                    step="any"
                                    value={item.quantidadeTotal}
                                    onChange={e => handleUpdateChamadaItem(idx, 'quantidadeTotal', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-sky-50 text-sky-950 border border-sky-300 rounded-lg p-1.5 text-right font-black text-xs"
                                    placeholder="1000"
                                  />
                                </td>

                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={item.precoMaximoUnitario}
                                    onChange={e => handleUpdateChamadaItem(idx, 'precoMaximoUnitario', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-lg p-1.5 text-right font-black text-xs"
                                    placeholder="5.50"
                                  />
                                </td>

                                <td className="p-2 text-right font-black text-emerald-800">
                                  R$ {totalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Totalizador Geral e Observações */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Observações do Edital</label>
                  <textarea
                    rows={2}
                    value={chamadaForm.observacoes || ''}
                    onChange={e => setChamadaForm({ ...chamadaForm, observacoes: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                    placeholder="Informações adicionais sobre prazos, regras de entrega, prioridade para orgânicos..."
                  />
                </div>

                <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1 shadow-md">
                  <div className="text-slate-400 text-xs font-semibold">Valor Total Calculado do Edital:</div>
                  <div className="text-2xl font-black text-emerald-400">
                    R$ {(chamadaForm.valorTotalEdital || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800">
                    <span>{chamadaForm.itensSolicitados?.length || 0} produto(s) solicitados</span>
                    <span>{chamadaForm.escolasContempladas?.length || 0} escola(s) contempladas</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChamadaModal(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Chamada Pública</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Proposta de Oferta */}
      {showOfertaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-slate-200 border-2 border-slate-300 rounded-3xl w-[96vw] max-w-[1600px] p-6 sm:p-8 lg:p-10 shadow-2xl space-y-4 my-4 font-sans max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-rose-800" />
                {editingOferta ? 'Editar Proposta de Oferta PAA/PNAE' : 'Nova Proposta de Oferta'}
              </h2>
              <button onClick={() => setShowOfertaModal(false)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-300 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOferta} className="space-y-3 text-xs">
              {/* Row 1: Programa */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-32 justify-center">
                  Programa
                </div>
                <select
                  value={ofertaForm.programaId}
                  onChange={e => {
                    const prog = programas.find(p => p.id === e.target.value);
                    setOfertaForm({
                      ...ofertaForm,
                      programaId: e.target.value,
                      programaNome: prog?.nome || ''
                    });
                  }}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner font-bold"
                >
                  <option value="">Selecione o Programa...</option>
                  {programas.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} - {p.descricao || ''}</option>
                  ))}
                </select>
              </div>

              {/* Row 2: Produtor */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-32 justify-center">
                  Produtor
                </div>
                <select
                  value={ofertaForm.produtorId}
                  onChange={e => {
                    const prodId = e.target.value;
                    const prod = produtores.find(p => p.id === prodId);
                    const prodHistorico = registrosProducao.filter(r => r.produtorId === prodId);
                    const itensExpandidos = expandirItensHistoricoProducao(prodHistorico);
                    const newItens = itensExpandidos.length > 0
                      ? itensExpandidos.map(item => {
                          const pObj = produtos.find(p => p.id === item.produtoId);
                          return {
                            produtoId: item.produtoId,
                            produtoNome: item.produtoNome || pObj?.nome || 'Produto',
                            unidadeMedida: item.unidadeMedida || pObj?.unidadeMedida || 'KG',
                            quantidadeKg: item.quantidadeKg || 100,
                            precoUnitario: pObj?.precoReferencia || 5.00
                          };
                        })
                      : ofertaForm.itens;

                    setOfertaForm({
                      ...ofertaForm,
                      produtorId: prodId,
                      produtorNome: prod?.nome || '',
                      itens: newItens
                    });
                  }}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner font-bold text-emerald-950"
                >
                  <option value="">Selecione o Produtor Rural...</option>
                  {produtores.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} (Polo: {p.polo || 'Geral'} | CAF: {p.cafDapNum || p.cafDap || 'Ativo'})</option>
                  ))}
                </select>
              </div>

              {/* Row 3: Apto & Ano */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-32 justify-center">
                  Apto
                </div>
                <select
                  value={ofertaForm.apto}
                  onChange={e => setOfertaForm({ ...ofertaForm, apto: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner font-bold"
                >
                  <option value="SIM">SIM (Apto para Comercialização)</option>
                  <option value="NAO">NÃO</option>
                </select>
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-24 justify-center">
                  Ano
                </div>
                <select
                  value={ofertaForm.ano}
                  onChange={e => setOfertaForm({ ...ofertaForm, ano: e.target.value })}
                  className="w-full sm:w-36 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner font-bold"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              {/* Datasheet Grid para Produtos da Oferta (Múltiplos Produtos com Excluir e Alterar Quantidade) */}
              <div className="bg-white border-2 border-slate-400 rounded-lg overflow-hidden shadow-inner mt-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-800 text-white text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sprout className="w-4 h-4 text-emerald-400" /> Itens da Proposta de Oferta (Inclua, exclua ou altere quantidades)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOfertaItem}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all"
                  >
                    + Adicionar Produto
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="w-12 p-2 text-center border-r border-slate-300">Ação</th>
                        <th className="p-2.5 border-r border-slate-300">Produto</th>
                        <th className="w-40 p-2.5 text-right border-r border-slate-300">Quantidade (KG)</th>
                        <th className="w-32 p-2.5 text-right border-r border-slate-300">Valor Unit. (R$)</th>
                        <th className="w-36 p-2.5 text-right">Valor Total (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ofertaForm.itens.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                            Nenhum produto incluído. Utilize os botões do histórico acima ou clique em "+ Adicionar Produto".
                          </td>
                        </tr>
                      ) : (
                        ofertaForm.itens.map((item, idx) => {
                          const totalItem = (item.quantidadeKg || 0) * (item.precoUnitario || 0);
                          return (
                            <tr key={idx} className="border-b border-slate-200 bg-sky-50/30 hover:bg-sky-50">
                              <td className="p-2 border-r border-slate-300 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOfertaItem(idx)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                  title="Excluir produto da proposta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                              <td className="p-2 border-r border-slate-300">
                                <select
                                  value={item.produtoId}
                                  onChange={e => handleUpdateOfertaItem(idx, 'produtoId', e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-900"
                                >
                                  <option value="">Selecione o Produto...</option>
                                  {produtos.map(p => (
                                    <option key={p.id} value={p.id}>{p.nome} (Ref: R$ {p.precoReferencia?.toFixed(2)}/{p.unidadeMedida})</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 border-r border-slate-300 text-right">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantidadeKg}
                                  onChange={e => handleUpdateOfertaItem(idx, 'quantidadeKg', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-sky-100 text-sky-950 border border-sky-300 rounded p-1.5 text-right font-black text-xs"
                                  placeholder="100"
                                />
                              </td>
                              <td className="p-2 border-r border-slate-300 text-right font-bold text-emerald-800">
                                R$ {(item.precoUnitario || 5.00).toFixed(2)}
                              </td>
                              <td className="p-2 text-right font-black text-emerald-950 bg-emerald-50/40">
                                R$ {totalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-slate-700 font-bold">
                  Valor Total Estimado da Proposta: <span className="text-emerald-800 font-black text-sm">R$ {ofertaForm.itens.reduce((sum, item) => sum + (item.quantidadeKg * item.precoUnitario), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOfertaModal(false)}
                    className="px-4 py-2 bg-slate-300 border border-slate-400 text-slate-700 rounded-xl font-bold hover:bg-slate-400 transition-all shadow-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-800 text-white rounded-xl font-extrabold hover:bg-rose-900 transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Salvar Proposta
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pedido de Produtos aos Produtores */}
      {showPedidoModal && (
        <div className={`fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center ${isMaximizedPedidoModal ? 'p-0' : 'p-2 sm:p-4 lg:p-6'} z-50 overflow-y-auto`}>
          <div className={`bg-white shadow-2xl transition-all border border-slate-100 overflow-y-auto flex flex-col ${
            isMaximizedPedidoModal
              ? 'w-full h-full rounded-none p-6 sm:p-10'
              : 'rounded-3xl w-[98vw] max-w-[1780px] p-6 sm:p-8 lg:p-10 my-2 sm:my-4 max-h-[96vh]'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    {editingPedido ? 'Editar Pedido de Produtos aos Produtores' : 'Novo Pedido de Produtos aos Produtores Rurais'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Vincule Programa, Chamada Pública, Escola e selecione os Produtores Rurais, Produtos e Programação de Entregas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMaximizedPedidoModal(!isMaximizedPedidoModal)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer shadow-2xs"
                  title={isMaximizedPedidoModal ? 'Restaurar Tamanho Normal' : 'Maximizar / Modo Expandido'}
                >
                  {isMaximizedPedidoModal ? (
                    <>
                      <Minimize2 className="w-4 h-4 text-slate-600" />
                      <span className="hidden sm:inline">Restaurar</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4 text-slate-600" />
                      <span className="hidden sm:inline">Expandir Tela Cheia</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPedidoModal(false);
                    setIsMaximizedPedidoModal(false);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  title="Fechar Janela"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

                          <form onSubmit={handleSavePedido} className="space-y-4 text-xs">
                {/* Header do Pedido - Cadastro do Produto vem primeiro */}
                {/* Header do Pedido - Vínculo com Chamada Pública e Programa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80">
                  {/* Campo Chamada Pública */}
                  <div className="lg:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-900">
                        <Building className="w-4 h-4 text-emerald-700" />
                        Chamada Pública / Edital Vinculado *
                      </span>
                      {pedidoForm.chamadaPublicaId && (
                        <span className="text-[10px] text-emerald-700 font-bold">Edital Vinculado ✓</span>
                      )}
                    </label>
                    <select
                      value={pedidoForm.chamadaPublicaId || ''}
                      onChange={e => {
                        const chmId = e.target.value;
                        const chm = chamadasPublicas.find(c => c.id === chmId);
                        if (chm) {
                          const chmEscolasIds = chm.escolasContempladas?.map(esc => esc.escolaId).filter(Boolean) || chm.escolasIds || (chm.escolaId ? [chm.escolaId] : []);
                          const chmEscolasNomes = chm.escolasContempladas?.map(esc => esc.nomeEscola) || chm.escolasNomes || (chm.escolaNome ? chm.escolaNome.split(', ') : []);
                          const numPedidoDaChamada = getNumeroPedidoParaChamada(chm.id, chm.numeroEdital);

                          setPedidoForm(prev => ({
                            ...prev,
                            chamadaPublicaId: chm.id,
                            chamadaPublicaEdital: chm.numeroEdital,
                            numeroPedido: numPedidoDaChamada,
                            programaId: chm.programaId || prev.programaId,
                            programaNome: chm.programaNome || prev.programaNome,
                            programa: (chm.programa as any) || prev.programa,
                            fonteRecursos: chm.fonteRecurso || chm.fonteRecursos || prev.fonteRecursos,
                            escolasIds: chmEscolasIds.length > 0 ? chmEscolasIds : prev.escolasIds,
                            escolasNomes: chmEscolasNomes.length > 0 ? chmEscolasNomes : prev.escolasNomes,
                            escolaId: chmEscolasIds[0] || prev.escolaId,
                            escolaNome: chmEscolasNomes.join(', ') || prev.escolaNome
                          }));
                        } else {
                          setPedidoForm(prev => ({
                            ...prev,
                            chamadaPublicaId: '',
                            chamadaPublicaEdital: ''
                          }));
                        }
                      }}
                      className="w-full p-2.5 bg-white border-2 border-emerald-400 rounded-xl font-black text-emerald-950 shadow-xs"
                    >
                      <option value="">Selecione a Chamada Pública / Edital...</option>
                      {chamadasPublicas
                        .filter(cp => cp.status !== 'ENCERRADA' || cp.id === pedidoForm.chamadaPublicaId)
                        .map(cp => (
                        <option key={cp.id} value={cp.id}>
                          Edital {cp.numeroEdital} - {cp.orgaoComprador} ({cp.programaNome || cp.programa} | R$ {(cp.valorTotalEdital || 0).toLocaleString('pt-BR')})
                          {cp.status === 'ENCERRADA' ? ' [ENCERRADA]' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Somente chamadas públicas ainda não encerradas ficam disponíveis para novos pedidos.</p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nº do Pedido *</label>
                    <input
                      type="text"
                      required
                      value={pedidoForm.numeroPedido}
                      onChange={e => setPedidoForm({ ...pedidoForm, numeroPedido: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                      placeholder="PED-001/2026"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Fonte de Recursos *</label>
                    <select
                      required
                      value={pedidoForm.fonteRecursos}
                      onChange={e => setPedidoForm({ ...pedidoForm, fonteRecursos: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-indigo-900"
                    >
                      <option value="">Selecione a Fonte...</option>
                      {getFontesRecursosParaPrograma(pedidoForm.programa, pedidoForm.programaNome).map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    {!pedidoForm.programaId && (
                      <p className="text-[10px] text-slate-400 mt-1">Selecione a Chamada Pública acima para ver as fontes de recursos compatíveis.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Data do Pedido *</label>
                    <input
                      type="date"
                      required
                      value={pedidoForm.dataPedido}
                      onChange={e => setPedidoForm({ ...pedidoForm, dataPedido: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-emerald-950 font-black mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Sprout className="w-4 h-4 text-emerald-700" />
                        Produto Selecionado / Vinculado ao Pedido *
                      </span>
                      {pedidoForm.produtoId && (
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-extrabold">
                          {produtoresComOfertaDoProduto.length} produtor(es) com proposta
                        </span>
                      )}
                    </label>
                    <select
                      value={pedidoForm.produtoId}
                      onChange={e => {
                        const pId = e.target.value;
                        const pObj = produtos.find(p => p.id === pId);
                        setPedidoForm(prev => ({
                          ...prev,
                          produtoId: pId,
                          produtoNome: pObj?.nome || ''
                        }));
                      }}
                      className="w-full p-2.5 bg-emerald-50/60 border-2 border-emerald-500 rounded-xl font-black text-emerald-950 shadow-xs focus:ring-2 focus:ring-emerald-400 text-xs"
                    >
                      <option value="">Selecione o Produto para vincular os Produtores com Proposta de Oferta...</option>
                      {produtos.map(p => {
                        const offersForP = ofertasDoProgramaSelecionado.filter(o => {
                          const its = getItensFromOferta(o);
                          return its.some(it => it.produtoId === p.id || it.produtoNome?.toLowerCase() === p.nome?.toLowerCase());
                        });
                        const prodsCount = new Set(offersForP.map(o => o.produtorId)).size;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.unidadeMedida}) {prodsCount > 0 ? `— [${prodsCount} produtor(es) com oferta no programa]` : '— [Sem propostas cadastradas]'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Banner de Dados da Chamada Pública Vinculada ao Pedido */}
                {pedidoForm.chamadaPublicaId && (() => {
                  const chm = chamadasPublicas.find(c => c.id === pedidoForm.chamadaPublicaId);
                  if (!chm) return null;
                  const totalItensChm = chm.itensSolicitados?.length || 0;
                  const totalEscolasChm = chm.escolasContempladas?.length || chm.escolasIds?.length || 1;

                  return (
                    <div className="bg-emerald-900 text-white p-4 rounded-2xl space-y-3 shadow-md border border-emerald-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 bg-emerald-700 text-emerald-100 rounded text-[10px] font-black uppercase tracking-wider">
                            Chamada Pública Vinculada ao Pedido
                          </span>
                          <h4 className="text-sm font-extrabold text-white mt-1">
                            Edital {chm.numeroEdital} — {chm.orgaoComprador}
                          </h4>
                          <p className="text-[11px] text-emerald-200 mt-0.5">
                            Fonte: <strong>{chm.fonteRecurso || chm.fonteRecursos || pedidoForm.fonteRecursos}</strong> • Valor Edital: <strong>R$ {(chm.valorTotalEdital || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Resumo de Escolas e Produtos do Edital */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-800/80">
                        <div className="space-y-1">
                          <span className="text-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                            <GraduationCap className="w-3 h-3" /> Escolas Contempladas no Edital ({totalEscolasChm}):
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {chm.escolasContempladas && chm.escolasContempladas.length > 0 ? (
                              chm.escolasContempladas.map((esc, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-emerald-800/80 text-emerald-100 rounded text-[10px]">
                                  {esc.nomeEscola}
                                </span>
                              ))
                            ) : (
                              <span className="text-emerald-300 italic text-[10px]">{chm.escolaNome || 'Todas as escolas'}</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                            <Sprout className="w-3 h-3" /> Produtos Cadastrados no Edital ({totalItensChm}):
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {chm.itensSolicitados && chm.itensSolicitados.length > 0 ? (
                              chm.itensSolicitados.map((it, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-emerald-800/80 text-emerald-100 rounded text-[10px]">
                                  {it.produtoNome} ({it.quantidadeTotal} {it.unidade} a R$ {it.precoMaximoUnitario.toFixed(2)})
                                </span>
                              ))
                            ) : (
                              <span className="text-emerald-300 italic text-[10px]">Nenhum produto cadastrado no edital.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Carregar Rateio salvo da Chamada — preenche o pedido já com as
                    quantidades definidas por produtor e por escola na aba "Rateio de Produtores". */}
                {pedidoForm.chamadaPublicaId && rateiosChamadas.some(r => r.chamadaPublicaId === pedidoForm.chamadaPublicaId) && (
                  <div className="bg-emerald-900 p-3.5 rounded-xl border border-emerald-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-emerald-300 shrink-0" />
                      Esta chamada pública já tem um rateio salvo entre produtores e escolas.
                      {pedidoForm.produtoNome && (
                        <span className="text-emerald-300 font-normal">— filtrando por "{pedidoForm.produtoNome}"</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCarregarRateioNoPedido()}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-lg font-black text-[11px] shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      title={pedidoForm.produtoNome
                        ? `Preencher os itens do pedido com os dados do rateio somente para "${pedidoForm.produtoNome}" (produtor + escola + quantidade)`
                        : 'Preencher os itens do pedido com os dados do rateio de TODOS os produtos (produtor + escola + quantidade). Selecione um produto acima para filtrar.'}
                    >
                      <PackageCheck className="w-3.5 h-3.5" /> Carregar Rateio {pedidoForm.produtoNome ? 'deste Produto' : 'desta Chamada'}
                    </button>
                  </div>
                )}

                {/* Proposta de Oferta / Inclusão Rápida no Pedido Vinculada ao Programa e Produto */}
                <div className="bg-emerald-50/90 p-3.5 rounded-xl border border-emerald-300 space-y-2.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      {pedidoForm.produtoNome ? (
                        <>Propostas de Oferta vinculadas ao produto <strong className="text-emerald-800 underline">"{pedidoForm.produtoNome}"</strong> no Programa ({pedidoForm.programaNome || pedidoForm.programa}):</>
                      ) : (
                        <>Carregar Produtos da Proposta de Oferta do Programa ({pedidoForm.programaNome || pedidoForm.programa}):</>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white/70 rounded-lg border border-emerald-200">
                    {ofertasDoProdutoSelecionado.length === 0 ? (
                      <div className="p-2 text-slate-600 italic text-[11px] flex items-center gap-1.5">
                        <span>
                          {pedidoForm.produtoNome 
                            ? `Nenhuma proposta de oferta cadastrada com o produto "${pedidoForm.produtoNome}" no programa ${pedidoForm.programaNome || pedidoForm.programa}.`
                            : `Nenhuma proposta de oferta cadastrada para o programa ${pedidoForm.programaNome || pedidoForm.programa}.`}
                        </span>
                      </div>
                    ) : (
                      // Lista botões rápidos por produtor que ofertou para o programa/produto
                      Array.from(new Set<string>(ofertasDoProdutoSelecionado.map(o => o.produtorId))).map((prodId: string) => {
                        const prod = produtores.find(p => p.id === prodId);
                        const ofertasDoProd = ofertasDoProdutoSelecionado.filter(o => o.produtorId === prodId);
                        const totalItens = ofertasDoProd.reduce((acc, o) => acc + (o.itens?.length || 1), 0);
                        const prodNome = prod?.nome || ofertasDoProd[0]?.produtorNome || 'Produtor';
                        const itensNomes = ofertasDoProd.map(o => o.itens?.map(i => i.produtoNome).join(', ') || o.produtoNome).filter(Boolean).join(', ');

                        return (
                          <button
                            key={prodId}
                            type="button"
                            onClick={() => handleLoadOfertasToPedido(prodId)}
                            className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all flex items-center gap-1.5 text-left cursor-pointer"
                            title={`Carregar produtos ofertados por ${prodNome}: ${itensNomes}`}
                          >
                            <Sprout className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                            <span>+ {prodNome} ({totalItens} oferta{totalItens > 1 ? 's' : ''})</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Seleção de Múltiplos Produtores com Proposta de Oferta para este Programa */}
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-emerald-950 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-700" />
                        1. Produtores com Proposta de Oferta {pedidoForm.produtoNome ? `para "${pedidoForm.produtoNome}"` : ''} ({pedidoForm.programaNome || pedidoForm.programa})
                      </h3>
                      <p className="text-[11px] text-emerald-800">
                        {pedidoForm.produtoNome 
                          ? `Apenas agricultores que cadastraram proposta contendo "${pedidoForm.produtoNome}" são exibidos.`
                          : 'Apenas agricultores que cadastraram propostas de oferta para o programa selecionado são listados.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const ids: string[] = Array.from(new Set(ofertasDoProdutoSelecionado.map(o => o.produtorId)));
                          setSelectedProdutoresIds(ids);
                          handleLoadOfertasToPedido();
                        }}
                        className="px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-extrabold hover:bg-emerald-300 transition-all cursor-pointer"
                      >
                        Selecionar Todos ({produtoresComOfertaDoProduto.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProdutoresIds([]);
                          setPedidoItens([]);
                        }}
                        className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-all cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-white rounded-xl border border-emerald-200">
                    {(() => {
                      const produtoresExibidos = produtoresComOfertaDoProduto.length > 0 ? produtoresComOfertaDoProduto : [];

                      if (produtoresExibidos.length === 0) {
                        return (
                          <div className="col-span-full p-4 text-center text-slate-500 italic text-xs">
                            {ofertasDoProgramaSelecionado.length === 0
                              ? `Nenhum produtor cadastrou proposta de oferta para o programa "${pedidoForm.programaNome || pedidoForm.programa}". Acesse a aba "Propostas de Oferta" para registrar as ofertas dos agricultores.`
                              : `Nenhum produtor ofertou o produto "${pedidoForm.produtoNome || 'selecionado'}" no programa "${pedidoForm.programaNome || pedidoForm.programa}". Selecione outro produto ou cadastre uma proposta para este gênero.`}
                          </div>
                        );
                      }

                      return produtoresExibidos.map(p => {
                        const isChecked = selectedProdutoresIds.includes(p.id);
                        const ofertasDoProd = ofertasDoProdutoSelecionado.filter(o => o.produtorId === p.id);
                        const itens = ofertasDoProd.flatMap(o => getItensFromOferta(o));
                        const itensFiltrados = pedidoForm.produtoId 
                          ? itens.filter(i => i.produtoId === pedidoForm.produtoId || (i.produtoNome && pedidoForm.produtoNome && i.produtoNome.toLowerCase() === pedidoForm.produtoNome.toLowerCase()))
                          : itens;
                        const resumoItens = (itensFiltrados.length > 0 ? itensFiltrados : itens).map(i => `${i.produtoNome}: ${i.quantidadeOfertada} ${i.unidadeMedida} a R$ ${(i.precoUnitario || 0).toFixed(2)}`).join(' | ');

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedProdutoresIds(prev => prev.filter(id => id !== p.id));
                                setPedidoItens(prev => prev.filter(it => it.produtorId !== p.id));
                              } else {
                                setSelectedProdutoresIds(prev => [...prev, p.id]);
                                handleLoadOfertasToPedido(p.id);
                              }
                            }}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2 ${
                              isChecked
                                ? 'bg-emerald-100/90 border-emerald-500 font-bold text-emerald-950 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <div className="truncate flex-1">
                              <p className="truncate text-xs font-bold text-slate-900">{p.nome}</p>
                              <p className="text-[10px] text-emerald-800 font-bold truncate" title={resumoItens}>
                                Oferta: {resumoItens || 'Sim'}
                              </p>
                              <p className="text-[9px] text-slate-500 font-medium">
                                Polo: {p.polo || 'Sede'}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Tabela Dinâmica de Produtos e Anexo (A Tabela Vinculada com Polo e Local de Entrega) */}
                <div className="bg-white border-2 border-slate-400 rounded-lg overflow-hidden shadow-inner mt-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-800 text-white text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-emerald-400" /> 2. Tabela Vinculada (Produtores com Oferta, Polo, Local de Entrega e Escola conforme Polo)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddPedidoItem}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      + Incluir Item
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                          <th className="w-12 p-2 text-center border-r border-slate-300">Ação</th>
                          <th className="p-2.5 border-r border-slate-300">Produtor com Oferta</th>
                          <th className="w-32 p-2.5 border-r border-slate-300">Polo</th>
                          <th className="p-2.5 border-r border-slate-300">Local de Entrega / Escola (Vinculada por Polo)</th>
                          <th className="w-28 p-2.5 text-center border-r border-slate-300">Qtd Pedida</th>
                          <th className="w-24 p-2.5 text-right border-r border-slate-300">Preço Unit.</th>
                          <th className="w-28 p-2.5 text-right">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidoItens.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                              Nenhum item incluído. Selecione os produtores acima ou clique em "+ Incluir Item".
                            </td>
                          </tr>
                        ) : (
                          pedidoItens.map((it, idx) => {
                            const prodObj = produtores.find(p => p.id === it.produtorId);
                            const prodPolo = prodObj?.polo || it.polo || 'Sede';
                            const escolasFiltradas = escolasPnae.filter(e => !e.polo || poloEquivale(e.polo, prodPolo));
                            // O rateio pode atribuir uma escola de outro polo a este
                            // produtor (é uma decisão explícita do rateio, não do
                            // cadastro do produtor) — garante que ela sempre apareça
                            // no seletor mesmo fora do filtro por polo, senão o campo
                            // fica "vazio" mesmo com a escola corretamente vinculada.
                            const escolaJaAtribuida = it.escolaId ? escolasPnae.find(e => e.id === it.escolaId) : undefined;
                            const listaEscolasBase = escolasFiltradas.length > 0 ? escolasFiltradas : escolasPnae;
                            const listaEscolas = escolaJaAtribuida && !listaEscolasBase.some(e => e.id === escolaJaAtribuida.id)
                              ? [escolaJaAtribuida, ...listaEscolasBase]
                              : listaEscolasBase;
                            const listaProdutoresOpcoes = produtoresComOfertaDoProduto.length > 0 ? produtoresComOfertaDoProduto : produtores;

                            return (
                              <tr key={idx} className="border-b border-slate-200 bg-sky-50/30 hover:bg-sky-50">
                                <td className="p-2 border-r border-slate-300 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePedidoItem(idx)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                    title="Excluir item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                                <td className="p-2 border-r border-slate-300">
                                  <select
                                    value={it.produtorId}
                                    onChange={e => handleUpdatePedidoItem(idx, 'produtorId', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-900"
                                  >
                                    <option value="">Selecione o Produtor...</option>
                                    {listaProdutoresOpcoes.map(p => (
                                      <option key={p.id} value={p.id}>{p.nome} ({p.polo || 'Geral'})</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2 border-r border-slate-300 font-bold text-emerald-900 bg-emerald-50/50">
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-extrabold inline-block">
                                    {prodPolo}
                                  </span>
                                </td>
                                <td className="p-2 border-r border-slate-300">
                                  <select
                                    value={it.escolaId || ''}
                                    onChange={e => handleUpdatePedidoItem(idx, 'escolaId', e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-medium text-slate-800"
                                  >
                                    <option value="">Selecione a Escola (Destino no Polo)...</option>
                                    {listaEscolas.map(esc => (
                                      <option key={esc.id} value={esc.id}>{esc.nomeEscola} — {esc.localDeEntrega || 'Sede'}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2 border-r border-slate-300 text-right">
                                  {(() => {
                                    const saldo = getSaldoDisponivelChamada(it.produtoId, it.produtoNome);
                                    const excedeSaldo = saldo !== null && (it.quantidadePedida || 0) > saldo;
                                    return (
                                      <div>
                                        <input
                                          type="number"
                                          min="1"
                                          value={it.quantidadePedida}
                                          onChange={e => handleUpdatePedidoItem(idx, 'quantidadePedida', parseFloat(e.target.value) || 0)}
                                          className={`w-full border rounded p-1.5 text-right font-black text-xs ${excedeSaldo ? 'bg-rose-100 text-rose-900 border-rose-400' : 'bg-sky-100 text-sky-950 border-sky-300'}`}
                                        />
                                        {saldo !== null && (
                                          <div className={`text-[10px] font-bold mt-0.5 ${excedeSaldo ? 'text-rose-600' : 'text-slate-500'}`}>
                                            Saldo na chamada: {saldo} {it.unidadeMedida}
                                            {excedeSaldo && ' — EXCEDE!'}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="p-2 border-r border-slate-300 text-right font-medium text-slate-700">
                                  R$ {(it.precoUnitario || 0).toFixed(2)}
                                  {getItemChamadaPorProduto(chamadasPublicas.find(c => c.id === pedidoForm.chamadaPublicaId), it.produtoId, it.produtoNome) && (
                                    <div className="text-[10px] font-bold text-indigo-600 mt-0.5">Preço do edital</div>
                                  )}
                                </td>
                                <td className="p-2 text-right font-extrabold text-emerald-700">
                                  R$ {(it.valorTotalItem || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-300">
                        <tr>
                          <td colSpan={4} className="p-2.5 text-right uppercase text-xs">
                            Resumo Consolidado — Qtde Produtores: <span className="text-emerald-700 font-black">{new Set(pedidoItens.map(i => i.produtorId)).size}</span> | Qtde Produtos: <span className="text-emerald-700 font-black">{pedidoItens.reduce((sum, i) => sum + (i.quantidadePedida || 0), 0)}</span>
                          </td>
                          <td colSpan={3} className="p-2.5 text-right text-sm font-black text-emerald-800">
                            Valor Total: R$ {pedidoItens.reduce((sum, i) => sum + (i.valorTotalItem || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 2.5 FUNRURAL & Taxa Administrativa — Retenções sobre o valor do pedido */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <input
                        id="funrural-toggle"
                        type="checkbox"
                        checked={pedidoForm.funruralAtivo}
                        onChange={e => setPedidoForm({ ...pedidoForm, funruralAtivo: e.target.checked })}
                        className="w-4 h-4 accent-amber-700 cursor-pointer"
                      />
                      <label htmlFor="funrural-toggle" className="font-black text-amber-900 text-sm cursor-pointer flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Descontar FUNRURAL do(s) produtor(es)
                      </label>
                    </div>
                    {pedidoForm.funruralAtivo && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-amber-800">Alíquota (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={pedidoForm.funruralAliquota}
                          onChange={e => setPedidoForm({ ...pedidoForm, funruralAliquota: parseFloat(e.target.value) || 0 })}
                          className="w-20 p-1.5 border border-amber-300 rounded-lg font-bold text-amber-900 text-center bg-white"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-700">
                    FUNRURAL é a contribuição previdenciária rural que a cooperativa retém do produtor no momento da compra
                    e repassa ao INSS/Receita Federal. Quando ativado, o valor retido é lançado automaticamente como
                    conta a pagar no módulo Financeiro (SisFin) ao salvar o pedido. Alíquota padrão: 1,5%.
                  </p>

                  <div className="flex items-start justify-between gap-3 flex-wrap pt-3 border-t border-amber-200">
                    <div className="flex items-center gap-2">
                      <input
                        id="taxaadm-toggle"
                        type="checkbox"
                        checked={pedidoForm.taxaAdministrativaAtiva}
                        onChange={e => setPedidoForm({ ...pedidoForm, taxaAdministrativaAtiva: e.target.checked })}
                        className="w-4 h-4 accent-indigo-700 cursor-pointer"
                      />
                      <label htmlFor="taxaadm-toggle" className="font-black text-indigo-900 text-sm cursor-pointer flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> Descontar Taxa Administrativa da Cooperativa
                      </label>
                    </div>
                    {pedidoForm.taxaAdministrativaAtiva && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-indigo-800">Percentual (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={pedidoForm.taxaAdministrativaPercentual}
                          onChange={e => setPedidoForm({ ...pedidoForm, taxaAdministrativaPercentual: parseFloat(e.target.value) || 0 })}
                          className="w-20 p-1.5 border border-indigo-300 rounded-lg font-bold text-indigo-900 text-center bg-white"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    Taxa que a cooperativa cobra para custear a gestão do processo (emissão de notas, logística,
                    administração do PAA/PNAE). É receita própria da cooperativa — quando ativada, o valor é lançado
                    automaticamente como conta a RECEBER no SisFin ao salvar o pedido. Percentual padrão: 5%.
                  </p>

                  {(pedidoForm.funruralAtivo || pedidoForm.taxaAdministrativaAtiva) && pedidoItens.length > 0 && (() => {
                    const valorBruto = pedidoItens.reduce((sum, i) => sum + (i.valorTotalItem || 0), 0);
                    const valorFunrural = pedidoForm.funruralAtivo ? Number((valorBruto * ((pedidoForm.funruralAliquota || 0) / 100)).toFixed(2)) : 0;
                    const valorTaxaAdm = pedidoForm.taxaAdministrativaAtiva ? Number((valorBruto * ((pedidoForm.taxaAdministrativaPercentual || 0) / 100)).toFixed(2)) : 0;
                    const valorLiquido = valorBruto - valorFunrural - valorTaxaAdm;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200">
                        <div className="bg-white rounded-xl p-2.5 text-center border border-amber-100">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Valor Bruto</div>
                          <div className="text-sm font-black text-slate-800">R$ {valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 text-center border border-amber-100">
                          <div className="text-[10px] font-bold text-amber-600 uppercase">FUNRURAL</div>
                          <div className="text-sm font-black text-amber-700">- R$ {valorFunrural.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 text-center border border-indigo-100">
                          <div className="text-[10px] font-bold text-indigo-600 uppercase">Taxa Adm.</div>
                          <div className="text-sm font-black text-indigo-700">- R$ {valorTaxaAdm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 text-center border border-emerald-200">
                          <div className="text-[10px] font-bold text-emerald-600 uppercase">Líquido aos Produtores</div>
                          <div className="text-sm font-black text-emerald-700">R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. Programação de Entregas & Divisão Automática de Quantidades */}
                <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-emerald-50/60 p-5 rounded-2xl border border-indigo-200/90 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">3</span>
                        <h3 className="font-black text-indigo-950 text-base flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-indigo-600" />
                          Programação de Entregas & Divisão das Quantidades
                        </h3>
                      </div>
                      <p className="text-xs text-indigo-800 font-medium mt-0.5">
                        Defina quantas entregas serão realizadas para este pedido. A quantidade total em KG e o valor serão divididos automaticamente pelo número de entregas, com datas programáveis individualmente.
                      </p>
                    </div>

                    {/* Badge resumo */}
                    <div className="px-3.5 py-1.5 bg-white border border-indigo-200 rounded-xl shadow-xs text-right">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total a Dividir</div>
                      <div className="text-sm font-black text-indigo-900">
                        {pedidoItens.reduce((sum, i) => sum + (i.quantidadePedida || 0), 0)} KG • R$ {pedidoItens.reduce((sum, i) => sum + (i.valorTotalItem || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Controles de Configuração da Quantidade de Entregas e Frequência */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-white/90 p-4 rounded-xl border border-indigo-100 shadow-xs">
                    {/* Seletor de Quantidade de Entregas */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Quantas Entregas Serão Feitas?
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={pedidoForm.qtdeEntregas === 0 ? '' : pedidoForm.qtdeEntregas}
                          placeholder="Ex: 2"
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') { setPedidoForm(prev => ({ ...prev, qtdeEntregas: 0, cronogramaEntregas: [] })); return; }
                            handleUpdatePedidoQtdeEntregas(parseInt(val) || 1);
                          }}
                          className="w-20 p-2 border-2 border-indigo-400 focus:border-indigo-600 rounded-xl font-black text-indigo-950 text-center text-base bg-indigo-50/50"
                        />
                        <div className="flex flex-wrap gap-1 flex-1">
                          {[1, 2, 3, 4, 6, 8].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => handleUpdatePedidoQtdeEntregas(n)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                pedidoForm.qtdeEntregas === n
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {n === 1 ? '1x (Única)' : `${n}x`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Frequência Sugerida para Cálculo de Datas */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Intervalo / Frequência Sugerida
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'SEMANAL', label: 'Semanal (7d)' },
                          { id: 'QUINZENAL', label: 'Quinzenal (14d)' },
                          { id: 'MENSAL', label: 'Mensal (30d)' },
                          { id: 'CUSTOM', label: 'Personalizado' }
                        ].map(freq => (
                          <button
                            key={freq.id}
                            type="button"
                            onClick={() => handleUpdatePedidoFrequencia(freq.id as any)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              pedidoForm.intervaloFrequencia === freq.id
                                ? 'bg-indigo-600 text-white font-black shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {freq.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Data Inicial e Sincronização Logística */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        Data da 1ª Entrega (Base)
                      </label>
                      <input
                        type="date"
                        value={pedidoForm.dataPrevistaEntrega}
                        onChange={e => handleUpdateParcelaData(1, e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white"
                      />
                      <label className="flex items-center gap-2 cursor-pointer mt-1 pt-1">
                        <input
                          type="checkbox"
                          checked={pedidoForm.autoGerarRotasLogistica}
                          onChange={e => setPedidoForm(prev => ({ ...prev, autoGerarRotasLogistica: e.target.checked }))}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-indigo-950">
                          Gerar rotas no Módulo Logística
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Banner de Demonstração da Divisão por Entrega */}
                  {pedidoForm.qtdeEntregas > 1 && (
                    <div className="p-3 bg-indigo-100/70 border border-indigo-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-indigo-900 font-semibold">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          <strong>Divisão Automática das Quantidades:</strong> Cada uma das <strong>{pedidoForm.qtdeEntregas} entregas</strong> receberá{' '}
                          <span className="text-indigo-950 font-black">
                            {Number(((pedidoItens.reduce((sum, i) => sum + (i.quantidadePedida || 0), 0)) / pedidoForm.qtdeEntregas).toFixed(1))} KG
                          </span>{' '}
                          (exatamente {(100 / pedidoForm.qtdeEntregas).toFixed(1)}% do total) com valor estimado de{' '}
                          <span className="text-emerald-800 font-black">
                            R$ {Number(((pedidoItens.reduce((sum, i) => sum + (i.valorTotalItem || 0), 0)) / pedidoForm.qtdeEntregas).toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdatePedidoQtdeEntregas(pedidoForm.qtdeEntregas)}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 font-extrabold rounded-lg text-[10px] shrink-0 transition-all cursor-pointer"
                      >
                        Recalcular Divisão
                      </button>
                    </div>
                  )}

                  {/* Tabela do Cronograma de Entregas com Datas Editáveis */}
                  <div className="overflow-x-auto border border-indigo-200/80 rounded-xl bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-indigo-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-2.5 border-r border-indigo-800 w-24">Entrega</th>
                          <th className="p-2.5 border-r border-indigo-800 min-w-[140px]">Data Programada</th>
                          <th className="p-2.5 border-r border-indigo-800 w-28">Horário Saída</th>
                          <th className="p-2.5 border-r border-indigo-800 text-right w-28">Qtd. Dividida (KG)</th>
                          <th className="p-2.5 border-r border-indigo-800 text-right w-20">% Parcela</th>
                          <th className="p-2.5 border-r border-indigo-800 text-right w-28">Valor Previsto</th>
                          <th className="p-2.5">Observação / Rota da Remessa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {(pedidoForm.cronogramaEntregas || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                              Nenhuma entrega definida ainda. Escolha a quantidade de entregas acima
                              ("Quantas Entregas Serão Feitas?") para gerar o cronograma automaticamente.
                            </td>
                          </tr>
                        ) : (pedidoForm.cronogramaEntregas || []).map((parc) => {
                          const dateObj = parc.dataPrevista ? new Date(parc.dataPrevista + 'T12:00:00') : null;
                          const diaSemana = dateObj ? ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][dateObj.getDay()] : '';
                          return (
                            <tr key={parc.numero} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="p-2.5 border-r border-slate-200 font-black text-indigo-950">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-[11px] font-black">
                                  <Truck className="w-3 h-3 text-indigo-600" />
                                  {parc.numero}ª Entrega
                                </span>
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="date"
                                    value={parc.dataPrevista}
                                    onChange={e => handleUpdateParcelaData(parc.numero, e.target.value)}
                                    className="p-1.5 border border-indigo-300 focus:border-indigo-600 rounded-lg text-xs font-bold text-slate-800 bg-indigo-50/30 w-full"
                                  />
                                  {diaSemana && (
                                    <span className="px-1.5 py-1 bg-slate-100 text-slate-700 rounded text-[9px] font-black shrink-0 border border-slate-200">
                                      {diaSemana}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-200">
                                <input
                                  type="time"
                                  value={parc.horarioSaida || '07:30'}
                                  onChange={e => handleUpdateParcelaField(parc.numero, 'horarioSaida', e.target.value)}
                                  className="p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 w-full text-center bg-white"
                                />
                              </td>
                              <td className="p-2 border-r border-slate-200 text-right font-black text-indigo-950">
                                <div className="flex items-center justify-end gap-1">
                                  <span>{parc.quantidadeKg}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">KG</span>
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-200 text-right font-black text-indigo-700">
                                {parc.percentual}%
                              </td>
                              <td className="p-2 border-r border-slate-200 text-right font-black text-emerald-700">
                                R$ {(parc.valorPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  placeholder={`Ex: Remessa ${parc.numero}/${pedidoForm.qtdeEntregas} - abastecimento quinzenal`}
                                  value={parc.observacao || ''}
                                  onChange={e => handleUpdateParcelaField(parc.numero, 'observacao', e.target.value)}
                                  className="p-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 w-full bg-white placeholder:text-slate-400"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPedidoModal(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-extrabold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Confirmar e Gerar Pedido Vinculado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerar Nota Fiscal Eletrônica (Entrada Produtor / Saída Escola) */}
      {showNFeModal && nfeModalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                  nfeTipoOperacao === 'ENTRADA_PRODUTOR' ? 'bg-amber-600' : 'bg-blue-600'
                }`}>
                  {nfeTipoOperacao === 'ENTRADA_PRODUTOR' ? <Receipt className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      {nfeTipoOperacao === 'ENTRADA_PRODUTOR'
                        ? 'Emitir NF-e de Entrada por Produtor'
                        : 'Emitir NF-e de Saída por Escola (PNAE/PAA)'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      SEFAZ-CE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {nfeTipoOperacao === 'ENTRADA_PRODUTOR'
                      ? 'Emissão de Nota Fiscal de Entrada para compra de produtos da Agricultura Familiar c/ FUNRURAL e Reforma 2026.'
                      : 'Emissão de Nota Fiscal de Saída para órgãos de Alimentação Escolar c/ dados completos e isenção de ICMS.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNFeModal(false);
                  setNfeSuccessResult(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {nfeSuccessResult ? (
              /* Success Screen */
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-950">Nota Fiscal Gerada com Sucesso!</h3>
                  <p className="text-xs text-emerald-800 mt-1">{nfeSuccessResult.statusTransmissao}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-200 max-w-xl mx-auto text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Número da Nota:</span>
                    <span className="font-mono font-bold text-slate-900">{nfeSuccessResult.nf.numero} (Série {nfeSuccessResult.nf.serie})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Tipo de Operação:</span>
                    <span className="font-bold text-slate-800">{nfeSuccessResult.nf.tipoOperacao}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Destinatário:</span>
                    <span className="font-bold text-slate-800">{nfeSuccessResult.nf.destinatarioRazaoSocial}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Valor Total:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      R$ {nfeSuccessResult.nf.valorTotalNota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chave de Acesso:</span>
                    <span className="font-mono font-bold text-slate-700 text-[10px] truncate max-w-xs">{nfeSuccessResult.nf.chaveAcesso}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowNFeModal(false);
                      setNfeSuccessResult(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              /* Generation Form */
              <div className="space-y-4 text-xs">
                {/* Alerta de Transição Reforma Tributária */}
                <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-300 rounded-2xl flex items-start gap-3">
                  <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-amber-950 text-xs block">
                      Cronograma Reforma Tributária (EC 132/2023) - Ano Teste 2026
                    </span>
                    <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">
                      {ALERTA_CRONOGRAMA_TEXTO}
                    </p>
                  </div>
                </div>

                {/* Tipo de Operação Tabs */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNfeTipoOperacao('ENTRADA_PRODUTOR')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      nfeTipoOperacao === 'ENTRADA_PRODUTOR'
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Receipt className={`w-5 h-5 ${nfeTipoOperacao === 'ENTRADA_PRODUTOR' ? 'text-amber-700' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">1. NF-e Entrada (Produtor)</div>
                      <div className="text-[10px] text-slate-500">Compra de produção do agricultor familiar</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNfeTipoOperacao('SAIDA_ESCOLA')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      nfeTipoOperacao === 'SAIDA_ESCOLA'
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className={`w-5 h-5 ${nfeTipoOperacao === 'SAIDA_ESCOLA' ? 'text-blue-700' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">2. NF-e Saída (Escola PNAE)</div>
                      <div className="text-[10px] text-slate-500">Fornecimento à escola / órgão recebedor</div>
                    </div>
                  </button>
                </div>

                {/* Seleção do Produtor ou da Escola */}
                {nfeTipoOperacao === 'ENTRADA_PRODUTOR' ? (
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2">
                    <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-700" /> Selecionar Produtor Rural Fornecedor *
                    </label>
                    <select
                      value={nfeSelectedProdutorId}
                      onChange={e => setNfeSelectedProdutorId(e.target.value)}
                      className="w-full p-2.5 border border-amber-300 rounded-xl font-bold bg-white text-slate-900"
                    >
                      <option value="">-- Selecione o Produtor Rural --</option>
                      {produtores.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} - CPF: {p.cpfCnpj || (p as any).cpf} ({p.comunidade || p.municipio || 'Trairi/CE'}) - DAP/CAF: {p.cafDapNum || 'Ativo'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2">
                    <label className="block font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-blue-700" /> Selecionar Escola / Unidade Recebedora *
                    </label>
                    <select
                      value={nfeSelectedEscolaId}
                      onChange={e => setNfeSelectedEscolaId(e.target.value)}
                      className="w-full p-2.5 border border-blue-300 rounded-xl font-bold bg-white text-slate-900"
                    >
                      <option value="">-- Selecione a Escola PNAE --</option>
                      {escolasPnae.map(esc => (
                        <option key={esc.id} value={esc.id}>
                          {esc.nomeEscola} ({esc.municipio || 'Trairi/CE'}) - CNPJ: {esc.cnpj || 'SME / Prefeitura'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sistema Tributário Selector */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" /> Regime Tributário da Emissão
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      onClick={() => setNfeSistemaTrib('NOVO_SISTEMA_REFORMA_2026')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        nfeSistemaTrib === 'NOVO_SISTEMA_REFORMA_2026'
                          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="sistemaTrib"
                          checked={nfeSistemaTrib === 'NOVO_SISTEMA_REFORMA_2026'}
                          onChange={() => setNfeSistemaTrib('NOVO_SISTEMA_REFORMA_2026')}
                          className="text-emerald-600"
                        />
                        <span className="font-extrabold text-slate-900">Reforma Tributária 2026 (CBS / IBS)</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1 pl-6">
                        Alíquota zero (0%) para alimentos da agricultura familiar e alimentação escolar + Crédito Presumido 5% para a cooperativa.
                      </p>
                    </label>

                    <label
                      onClick={() => setNfeSistemaTrib('TRADICIONAL_ATUAL')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        nfeSistemaTrib === 'TRADICIONAL_ATUAL'
                          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="sistemaTrib"
                          checked={nfeSistemaTrib === 'TRADICIONAL_ATUAL'}
                          onChange={() => setNfeSistemaTrib('TRADICIONAL_ATUAL')}
                          className="text-emerald-600"
                        />
                        <span className="font-extrabold text-slate-900">Sistema Tradicional Vigente</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1 pl-6">
                        Isenção de ICMS no Ceará (Decreto PNAE/PAA) + PIS/COFINS alíquota zero + Retenção FUNRURAL (1,5%).
                      </p>
                    </label>
                  </div>
                </div>

                {/* Itens e Cálculo de Impostos */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Sprout className="w-4 h-4 text-emerald-600" /> Itens e Discriminação Tributária
                    </span>
                    <span className="text-[11px] text-slate-500">
                      CFOP: {nfeTipoOperacao === 'ENTRADA_PRODUTOR' ? '1131 (Entrada de Produtor)' : '5101 (Saída PNAE)'}
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 text-[10px]">
                        <tr>
                          <th className="p-2">Item / Descrição</th>
                          <th className="p-2">NCM</th>
                          <th className="p-2">Qtd</th>
                          <th className="p-2">Unitário</th>
                          <th className="p-2">Subtotal</th>
                          <th className="p-2 text-center">CBS / IBS</th>
                          <th className="p-2 text-center">ICMS</th>
                          <th className="p-2 text-right">Retenção</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {((nfeModalTarget as any).itens || []).map((it: any, idx: number) => {
                          const val = it.valorTotalItem || (it.quantidadePedida || it.quantidadePrevista || 1) * (it.precoUnitario || 5.0);
                          const imp = calcularImpostosItem(val, nfeTipoOperacao, nfeSistemaTrib);
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-slate-900">{it.produtoNome}</td>
                              <td className="p-2 font-mono text-[10px] text-slate-500">0713.35.00</td>
                              <td className="p-2 font-medium">{it.quantidadePedida || it.quantidadePrevista || 10} {it.unidadeMedida || it.unidade || 'KG'}</td>
                              <td className="p-2 text-slate-600 font-medium">R$ {(it.precoUnitario || 5.0).toFixed(2)}</td>
                              <td className="p-2 font-extrabold text-emerald-700">R$ {val.toFixed(2)}</td>
                              <td className="p-2 text-center">
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                  {imp.cbsAliquota}% / {imp.ibsAliquota}%
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                                  ISENTO
                                </span>
                              </td>
                              <td className="p-2 text-right font-semibold text-rose-700">
                                {imp.funruralValor > 0 ? `R$ ${imp.funruralValor.toFixed(2)}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Transmissão Imediata Checkbox */}
                <div className="flex items-center gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="transmitirSefazDirect"
                    checked={nfeTransmitedDirectly}
                    onChange={e => setNfeTransmitedDirectly(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="transmitirSefazDirect" className="text-xs font-bold text-emerald-950 cursor-pointer">
                    Transmitir e autorizar imediatamente na SEFAZ-CE após a geração
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNFeModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteGerarNFe}
                    disabled={isGeneratingNfe}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isGeneratingNfe ? (
                      <>Processando...</>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {nfeTipoOperacao === 'ENTRADA_PRODUTOR' ? 'Emitir NF-e de Entrada' : 'Emitir NF-e de Saída'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Programação de Entrega */}
      {showEntregaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-[96vw] max-w-[1650px] p-6 sm:p-8 lg:p-10 shadow-2xl space-y-6 border border-slate-100 my-4 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  {editingEntrega ? 'Editar Rota de Entrega & Despesas' : 'Nova Programação de Entrega'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Roteiro de entrega para todas as escolas do pedido com cálculo de quilometragem, consumo de combustível e totalização de despesas.
                </p>
              </div>
              <button
                onClick={() => setShowEntregaModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntrega} className="space-y-6 text-xs">
              {/* 1. Dados Básicos do Pedido & Veículo */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" /> Vínculo do Pedido & Identificação do Transporte
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Vincular Pedido aos Produtores *</label>
                    <select
                      value={entregaForm.pedidoId}
                      onChange={e => {
                        const ped = pedidosProdutorPAA.find(p => p.id === e.target.value);
                        if (ped) {
                          const paradas = buildParadasFromPedido(ped);
                          const calculated = calcEntregaTotals(
                            paradas,
                            entregaForm.autonomiaKmL,
                            entregaForm.precoLitroCombustivel,
                            entregaForm.despesaDiariaMotorista,
                            entregaForm.despesaManutencao,
                            entregaForm.outrasDespesas
                          );
                          const linkedEscolasNomes = paradas.map(p => p.escolaNome);
                          const linkedEscolasIds = paradas.map(p => p.escolaId);
                          const totalPedidoKg = ped.itens?.reduce((s, i) => s + (i.quantidadePedida || 0), 0) || paradas.reduce((s, p) => s + (p.quantidadeKg || 0), 0) || 500;
                          const newParcelas = generateCronogramaParcelas(
                            entregaForm.numeroEntregas || 1,
                            ped.dataPrevistaEntrega || entregaForm.dataPrevista,
                            entregaForm.intervaloFrequencia || 'SEMANAL',
                            totalPedidoKg
                          );

                          setEntregaForm({
                            ...entregaForm,
                            pedidoId: ped.id,
                            pedidoNumero: ped.numeroPedido,
                            programaId: ped.programaId || entregaForm.programaId,
                            programaNome: ped.programaNome || ped.programa || entregaForm.programaNome,
                            chamadaPublicaId: ped.chamadaPublicaId || entregaForm.chamadaPublicaId,
                            chamadaPublicaEdital: ped.chamadaPublicaEdital || entregaForm.chamadaPublicaEdital,
                            escolaId: linkedEscolasIds[0] || '',
                            escolaNome: linkedEscolasNomes.join(', ') || '',
                            escolaOrgaoDestino: `Roteiro (${paradas.length} Escolas: ${linkedEscolasNomes.join(', ')})`,
                            dataPrevista: ped.dataPrevistaEntrega || entregaForm.dataPrevista,
                            quantidadeTotalKg: totalPedidoKg,
                            cronogramaParcelas: newParcelas,
                            itens: ped.itens?.map(i => ({
                              produtorId: i.produtorId,
                              produtorNome: i.produtorNome,
                              produtoId: i.produtoId,
                              produtoNome: i.produtoNome,
                              quantidadePrevista: i.quantidadePedida,
                              unidade: i.unidadeMedida
                            })) || [],
                            paradasEntrega: paradas,
                            ...calculated,
                            observacoesRota: `Rota configurada para atender as ${paradas.length} escolas do pedido ${ped.numeroPedido}.`
                          });
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="">Selecione o Pedido de Origem...</option>
                      {pedidosProdutorPAA.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.numeroPedido} - {p.programaNome || p.programa} ({p.escolasNomes?.join(', ') || p.escolaNome || 'Escolas do Pedido'}) - R$ {(p.valorTotalPedido || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Programa / Edital</label>
                      <input
                        type="text"
                        disabled
                        value={`${entregaForm.programaNome || 'PNAE/PAA'} - ${entregaForm.chamadaPublicaEdital || 'Chamada Geral'}`}
                        className="w-full p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl font-medium text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Status da Rota</label>
                      <select
                        value={entregaForm.status}
                        onChange={e => setEntregaForm({ ...entregaForm, status: e.target.value as any })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        <option value="AGENDADA">Agendada</option>
                        <option value="EM_TRANSITO">Em Trânsito</option>
                        <option value="ENTREGUE">Entregue (Concluída)</option>
                        <option value="PARCIAL">Entrega Parcial</option>
                        <option value="CANCELADA">Cancelada</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Data da 1ª Entrega *</label>
                    <input
                      type="date"
                      required
                      value={entregaForm.dataPrevista}
                      onChange={e => {
                        const newDate = e.target.value;
                        const totalKg = entregaForm.quantidadeTotalKg || 500;
                        const regenerated = generateCronogramaParcelas(
                          entregaForm.numeroEntregas,
                          newDate,
                          entregaForm.intervaloFrequencia,
                          totalKg
                        );
                        setEntregaForm({
                          ...entregaForm,
                          dataPrevista: newDate,
                          cronogramaParcelas: regenerated
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Horário de Saída</label>
                    <input
                      type="time"
                      value={entregaForm.horarioSaidaPrevisto}
                      onChange={e => setEntregaForm({ ...entregaForm, horarioSaidaPrevisto: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Motorista Responsável</label>
                    <select
                      value={motoristas.some(m => m.nome === entregaForm.motoristaNome) ? entregaForm.motoristaNome : '__OUTRO__'}
                      onChange={e => {
                        if (e.target.value === '__OUTRO__') {
                          setEntregaForm({ ...entregaForm, motoristaNome: '' });
                          return;
                        }
                        const m = motoristas.find(mm => mm.nome === e.target.value);
                        setEntregaForm({
                          ...entregaForm,
                          motoristaNome: e.target.value,
                          motoristaTelefone: m?.telefone || entregaForm.motoristaTelefone,
                          veiculoPlaca: m?.veiculoPadrao || entregaForm.veiculoPlaca
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="__OUTRO__">— Digitar manualmente —</option>
                      {motoristas.filter(m => m.ativo !== false).map(m => (
                        <option key={m.id} value={m.nome}>{m.nome}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Lista vinda do Cadastro de Motoristas (Cadastros → Motoristas). Selecionar um motorista preenche telefone e veículo automaticamente.
                    </p>
                    {!motoristas.some(m => m.nome === entregaForm.motoristaNome) && (
                      <input
                        type="text"
                        value={entregaForm.motoristaNome}
                        onChange={e => setEntregaForm({ ...entregaForm, motoristaNome: e.target.value })}
                        className="w-full p-2.5 mt-1.5 bg-white border border-slate-200 rounded-xl font-medium"
                        placeholder="Nome do motorista (sem cadastro)"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Veículo / Placa</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={entregaForm.veiculoPlaca}
                        onChange={e => setEntregaForm({ ...entregaForm, veiculoPlaca: e.target.value })}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono uppercase font-bold text-center"
                        placeholder="Placa"
                      />
                      <input
                        type="text"
                        value={entregaForm.veiculoModelo}
                        onChange={e => setEntregaForm({ ...entregaForm, veiculoModelo: e.target.value })}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 truncate"
                        placeholder="Modelo"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Programação de Parcelamento & Cronograma de Múltiplas Entregas */}
              <div className="bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-slate-50 p-5 rounded-2xl border border-purple-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200/70 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
                        <CalendarRange className="w-4 h-4" />
                      </span>
                      <h3 className="font-extrabold text-purple-950 text-sm">
                        Programação & Parcelamento de Entregas do Pedido
                      </h3>
                      {entregaForm.numeroEntregas > 1 && (
                        <span className="px-2.5 py-0.5 bg-purple-200 text-purple-900 rounded-full font-black text-[10px]">
                          {entregaForm.numeroEntregas} Remessas Programadas
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">
                      Defina quantas entregas serão feitas para este pedido. As quantidades totais dos produtos serão automaticamente divididas pelo número de entregas com datas agendadas individualmente.
                    </p>
                  </div>
                </div>

                {!editingEntrega ? (
                  <div className="space-y-4">
                    {/* Seletor de Quantidade de Entregas & Frequência */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-white p-4 rounded-xl border border-purple-100 shadow-2xs">
                      <div className="sm:col-span-4 space-y-1.5">
                        <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                          <Split className="w-3.5 h-3.5 text-purple-600" />
                          Quantidade de Entregas / Remessas:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={entregaForm.numeroEntregas}
                            onChange={e => {
                              const count = Math.max(1, Math.min(24, parseInt(e.target.value) || 1));
                              const totalKg = entregaForm.quantidadeTotalKg || 500;
                              const newParcelas = generateCronogramaParcelas(
                                count,
                                entregaForm.dataPrevista,
                                entregaForm.intervaloFrequencia,
                                totalKg,
                                entregaForm.cronogramaParcelas
                              );
                              setEntregaForm({
                                ...entregaForm,
                                numeroEntregas: count,
                                cronogramaParcelas: newParcelas
                              });
                            }}
                            className="w-24 p-2 bg-purple-50 border border-purple-300 rounded-xl font-black text-center text-purple-950 text-base"
                          />
                          <span className="text-xs font-bold text-purple-900">
                            {entregaForm.numeroEntregas === 1 ? 'entrega única' : `entregas programadas`}
                          </span>
                        </div>
                      </div>

                      <div className="sm:col-span-4 space-y-1.5">
                        <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                          Intervalo Sugerido entre Datas:
                        </label>
                        <select
                          value={entregaForm.intervaloFrequencia}
                          onChange={e => {
                            const freq = e.target.value as any;
                            const totalKg = entregaForm.quantidadeTotalKg || 500;
                            const regenerated = generateCronogramaParcelas(
                              entregaForm.numeroEntregas,
                              entregaForm.dataPrevista,
                              freq,
                              totalKg
                            );
                            setEntregaForm({
                              ...entregaForm,
                              intervaloFrequencia: freq,
                              cronogramaParcelas: regenerated
                            });
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        >
                          <option value="SEMANAL">Semanal (a cada 7 dias)</option>
                          <option value="QUINZENAL">Quinzenal (a cada 14 dias)</option>
                          <option value="MENSAL">Mensal (a cada 30 dias)</option>
                          <option value="CUSTOM">Personalizado / Manual</option>
                        </select>
                      </div>

                      {/* Botões Rápidos de Parcelamento */}
                      <div className="sm:col-span-4 flex flex-wrap gap-1.5">
                        {[
                          { count: 1, label: '1x (100%)' },
                          { count: 2, label: '2x (50%)' },
                          { count: 3, label: '3x (33%)' },
                          { count: 4, label: '4x (25%)' },
                          { count: 8, label: '8x (12,5%)' }
                        ].map(opt => (
                          <button
                            key={opt.count}
                            type="button"
                            onClick={() => {
                              const totalKg = entregaForm.quantidadeTotalKg || 500;
                              const newParcelas = generateCronogramaParcelas(
                                opt.count,
                                entregaForm.dataPrevista,
                                entregaForm.intervaloFrequencia,
                                totalKg
                              );
                              setEntregaForm({
                                ...entregaForm,
                                numeroEntregas: opt.count,
                                cronogramaParcelas: newParcelas
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                              entregaForm.numeroEntregas === opt.count
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-purple-100 text-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Resumo da Divisão de Quantidade do Pedido */}
                    {entregaForm.numeroEntregas > 1 && (
                      <div className="p-3.5 bg-purple-100/70 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-purple-950 font-bold text-xs">
                        <div className="flex items-center gap-2">
                          <Split className="w-4 h-4 text-purple-700 shrink-0" />
                          <span>
                            Carga Total do Pedido: <strong className="text-purple-900">{entregaForm.quantidadeTotalKg} kg</strong> ÷ {entregaForm.numeroEntregas} entregas = <span className="text-emerald-800 font-black text-sm">{Number((entregaForm.quantidadeTotalKg / entregaForm.numeroEntregas).toFixed(1))} kg por remessa</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-purple-800 font-medium">
                          Distribuição equitativa dos itens do pedido em {entregaForm.numeroEntregas} datas
                        </div>
                      </div>
                    )}

                    {/* Grade de Programação das Datas de Cada Entrega */}
                    {entregaForm.numeroEntregas > 1 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            Programação das Datas de Cada Entrega ({entregaForm.cronogramaParcelas.length} Remessas):
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const totalKg = entregaForm.quantidadeTotalKg || 500;
                              const reg = generateCronogramaParcelas(
                                entregaForm.numeroEntregas,
                                entregaForm.dataPrevista,
                                entregaForm.intervaloFrequencia,
                                totalKg
                              );
                              setEntregaForm({ ...entregaForm, cronogramaParcelas: reg });
                            }}
                            className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline"
                          >
                            Recalcular datas pelo intervalo ({entregaForm.intervaloFrequencia})
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {entregaForm.cronogramaParcelas.map((parc, pIdx) => {
                            const diaSem = getDiaSemanaTexto(parc.dataPrevista);
                            return (
                              <div
                                key={parc.numero}
                                className="bg-white p-3.5 rounded-xl border border-purple-200/80 shadow-2xs space-y-2.5 relative hover:border-purple-400 transition-all"
                              >
                                <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                                  <span className="font-black text-purple-950 text-xs flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                                      #{parc.numero}
                                    </span>
                                    Remessa {parc.numero} de {entregaForm.numeroEntregas}
                                  </span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold rounded-md text-[10px]">
                                    {parc.quantidadeKg} kg ({parc.percentual}%)
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-slate-600 font-bold text-[10px] mb-1">
                                      Data Programada da Entrega #{parc.numero} *
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="date"
                                        required
                                        value={parc.dataPrevista}
                                        onChange={e => {
                                          const val = e.target.value;
                                          const updated = entregaForm.cronogramaParcelas.map(p =>
                                            p.numero === parc.numero ? { ...p, dataPrevista: val } : p
                                          );
                                          setEntregaForm({ ...entregaForm, cronogramaParcelas: updated });
                                        }}
                                        className="w-full p-1.5 bg-purple-50/50 border border-purple-300 rounded-lg font-bold text-slate-900 text-xs"
                                      />
                                      {diaSem && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-900 rounded font-black text-[10px] shrink-0">
                                          {diaSem}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-slate-600 font-bold text-[10px] mb-0.5">
                                        Horário Saída
                                      </label>
                                      <input
                                        type="time"
                                        value={parc.horarioSaida}
                                        onChange={e => {
                                          const val = e.target.value;
                                          const updated = entregaForm.cronogramaParcelas.map(p =>
                                            p.numero === parc.numero ? { ...p, horarioSaida: val } : p
                                          );
                                          setEntregaForm({ ...entregaForm, cronogramaParcelas: updated });
                                        }}
                                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-600 font-bold text-[10px] mb-0.5">
                                        Status Previsto
                                      </label>
                                      <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-amber-800 text-center">
                                        Agendada
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tabela de Detalhamento da Divisão dos Produtos do Pedido */}
                    {entregaForm.numeroEntregas > 1 && entregaForm.itens && entregaForm.itens.length > 0 && (
                      <div className="bg-white p-3.5 rounded-xl border border-purple-100 space-y-2">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
                          <span>📦 Divisão das Quantidades por Produto ({entregaForm.numeroEntregas} Entregas)</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            Calculado automaticamente dividindo o total do pedido por {entregaForm.numeroEntregas}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-purple-50 text-purple-950 font-bold text-[10px] uppercase">
                              <tr>
                                <th className="p-2">Produto</th>
                                <th className="p-2">Produtor</th>
                                <th className="p-2 text-right">Qtd Total Pedido</th>
                                <th className="p-2 text-right bg-purple-100 font-black">Qtd em Cada Entrega ({entregaForm.numeroEntregas}x)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-50">
                              {entregaForm.itens.map((it, iIdx) => {
                                const qtdTotal = Number((it as any).quantidadePedida ?? it.quantidadePrevista) || 0;
                                const qtdParcela = Number((qtdTotal / entregaForm.numeroEntregas).toFixed(2));
                                return (
                                  <tr key={iIdx} className="hover:bg-purple-50/40">
                                    <td className="p-2 font-bold text-slate-900">{it.produtoNome}</td>
                                    <td className="p-2 text-slate-600">{it.produtorNome}</td>
                                    <td className="p-2 text-right font-semibold text-slate-700">
                                      {qtdTotal} {(it as any).unidadeMedida || it.unidade || 'KG'}
                                    </td>
                                    <td className="p-2 text-right font-black text-purple-900 bg-purple-50/70">
                                      {qtdParcela} {(it as any).unidadeMedida || it.unidade || 'KG'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Modo Edição de Entrega Existente */
                  <div className="p-3 bg-white rounded-xl border border-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg font-black text-xs">
                        Remessa {entregaForm.numeroEntrega || 1} de {entregaForm.totalEntregas || 1}
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        {entregaForm.parcelaRotulo || 'Programação de Entrega'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-800">
                      Carga desta remessa: {entregaForm.quantidadeTotalKg} kg
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Roteiro de Entregas nas Escolas do Pedido (Multi-Paradas) */}
              <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-blue-950 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Roteiro de Entregas nas Escolas do Pedido ({entregaForm.paradasEntrega.length} Escolas)
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      O motorista realizará entregas para todas as escolas deste pedido. Você pode adicionar, remover ou ajustar a distância e carga de cada parada.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEscola = escolasPnae.find(e => !entregaForm.paradasEntrega.some(p => p.escolaId === e.id)) || escolasPnae[0];
                      const newStop: ParadaEntregaEscola = {
                        id: `stop-${Date.now()}-${entregaForm.paradasEntrega.length}`,
                        ordem: entregaForm.paradasEntrega.length + 1,
                        escolaId: nextEscola?.id || `esc-${Date.now()}`,
                        escolaNome: nextEscola?.nomeEscola || 'Nova Unidade Escolar',
                        endereco: nextEscola?.endereco || 'Sede da Unidade Escolar',
                        polo: nextEscola?.polo || 'Polo Sede',
                        distanciaKm: nextEscola ? getEstimativaDistanciaEscola(nextEscola.nomeEscola, nextEscola.polo) : 15,
                        quantidadeKg: 150,
                        statusEntrega: 'PENDENTE'
                      };
                      const updatedParadas = [...entregaForm.paradasEntrega, newStop];
                      const calc = calcEntregaTotals(
                        updatedParadas,
                        entregaForm.autonomiaKmL,
                        entregaForm.precoLitroCombustivel,
                        entregaForm.despesaDiariaMotorista,
                        entregaForm.despesaManutencao,
                        entregaForm.outrasDespesas
                      );
                      setEntregaForm({
                        ...entregaForm,
                        paradasEntrega: updatedParadas,
                        ...calc
                      });
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Outra Escola ao Roteiro
                  </button>
                </div>

                {/* Tabela de Paradas */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200 text-[10px]">
                        <th className="p-2.5 w-12 text-center">Ordem</th>
                        <th className="p-2.5">Escola Destino</th>
                        <th className="p-2.5">Endereço / Polo</th>
                        <th className="p-2.5 w-28">Distância (Km)</th>
                        <th className="p-2.5 w-24">Carga (Kg)</th>
                        <th className="p-2.5 w-32">Status Entrega</th>
                        <th className="p-2.5 w-12 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entregaForm.paradasEntrega.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400">
                            Nenhuma escola vinculada a esta rota. Clique no botão acima para adicionar.
                          </td>
                        </tr>
                      ) : (
                        entregaForm.paradasEntrega.map((parada, idx) => (
                          <tr key={parada.id || idx} className="hover:bg-blue-50/40 transition-colors">
                            <td className="p-2.5 text-center font-black text-blue-900 bg-slate-50/50">
                              #{idx + 1}
                            </td>
                            <td className="p-2.5">
                              <select
                                value={parada.escolaId}
                                onChange={e => {
                                  const selectedEsc = escolasPnae.find(esc => esc.id === e.target.value);
                                  const updated = entregaForm.paradasEntrega.map((p, i) => {
                                    if (i === idx) {
                                      return {
                                        ...p,
                                        escolaId: e.target.value,
                                        escolaNome: selectedEsc?.nomeEscola || p.escolaNome,
                                        endereco: selectedEsc?.endereco || p.endereco,
                                        polo: selectedEsc?.polo || p.polo,
                                        distanciaKm: selectedEsc ? getEstimativaDistanciaEscola(selectedEsc.nomeEscola, selectedEsc.polo) : p.distanciaKm
                                      };
                                    }
                                    return p;
                                  });
                                  const calc = calcEntregaTotals(
                                    updated,
                                    entregaForm.autonomiaKmL,
                                    entregaForm.precoLitroCombustivel,
                                    entregaForm.despesaDiariaMotorista,
                                    entregaForm.despesaManutencao,
                                    entregaForm.outrasDespesas
                                  );
                                  setEntregaForm({
                                    ...entregaForm,
                                    paradasEntrega: updated,
                                    ...calc
                                  });
                                }}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                              >
                                {escolasPnae.map(esc => (
                                  <option key={esc.id} value={esc.id}>
                                    {esc.nomeEscola} ({esc.polo || 'Polo Sede'})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2.5 text-slate-500 font-medium truncate max-w-[180px]">
                              {parada.endereco || 'Sede da Unidade Escolar'}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={parada.distanciaKm}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = entregaForm.paradasEntrega.map((p, i) =>
                                      i === idx ? { ...p, distanciaKm: val } : p
                                    );
                                    const calc = calcEntregaTotals(
                                      updated,
                                      entregaForm.autonomiaKmL,
                                      entregaForm.precoLitroCombustivel,
                                      entregaForm.despesaDiariaMotorista,
                                      entregaForm.despesaManutencao,
                                      entregaForm.outrasDespesas
                                    );
                                    setEntregaForm({
                                      ...entregaForm,
                                      paradasEntrega: updated,
                                      ...calc
                                    });
                                  }}
                                  className="w-20 p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-right text-slate-900 focus:border-blue-500"
                                />
                                <span className="font-semibold text-slate-500 text-[11px]">km</span>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={parada.quantidadeKg}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = entregaForm.paradasEntrega.map((p, i) =>
                                      i === idx ? { ...p, quantidadeKg: val } : p
                                    );
                                    const calc = calcEntregaTotals(
                                      updated,
                                      entregaForm.autonomiaKmL,
                                      entregaForm.precoLitroCombustivel,
                                      entregaForm.despesaDiariaMotorista,
                                      entregaForm.despesaManutencao,
                                      entregaForm.outrasDespesas
                                    );
                                    setEntregaForm({
                                      ...entregaForm,
                                      paradasEntrega: updated,
                                      ...calc
                                    });
                                  }}
                                  className="w-16 p-1.5 bg-white border border-slate-200 rounded-lg font-bold text-right text-slate-900"
                                />
                                <span className="font-semibold text-slate-500 text-[11px]">kg</span>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <select
                                value={parada.statusEntrega || 'PENDENTE'}
                                onChange={e => {
                                  const updated = entregaForm.paradasEntrega.map((p, i) =>
                                    i === idx ? { ...p, statusEntrega: e.target.value as any } : p
                                  );
                                  setEntregaForm({ ...entregaForm, paradasEntrega: updated });
                                }}
                                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 text-[11px]"
                              >
                                <option value="PENDENTE">⏳ Pendente</option>
                                <option value="EM_TRANSITO">🚚 Em Trânsito</option>
                                <option value="ENTREGUE">✅ Entregue</option>
                              </select>
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = entregaForm.paradasEntrega.filter((_, i) => i !== idx);
                                  const calc = calcEntregaTotals(
                                    updated,
                                    entregaForm.autonomiaKmL,
                                    entregaForm.precoLitroCombustivel,
                                    entregaForm.despesaDiariaMotorista,
                                    entregaForm.despesaManutencao,
                                    entregaForm.outrasDespesas
                                  );
                                  setEntregaForm({
                                    ...entregaForm,
                                    paradasEntrega: updated,
                                    ...calc
                                  });
                                }}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                title="Remover escola desta rota"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal do Roteiro */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl font-bold text-blue-900 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Total de Escolas Atendidas: {entregaForm.paradasEntrega.length}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      Carga Total: <span className="font-extrabold text-emerald-800">{entregaForm.quantidadeTotalKg} kg</span>
                    </div>
                    <div>
                      Distância Total Acumulada da Rota:{' '}
                      <span className="font-black text-amber-700 text-sm">{entregaForm.distanciaTotalKm} Km</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Cálculo de Consumo de Combustível (Quantidade & Valor do Litro Editável) */}
              <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <div className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-amber-700" />
                    Cálculo de Consumo de Combustível da Viagem
                  </div>
                  <div className="text-[11px] font-semibold text-amber-800">
                    Fórmula: (Distância Total ÷ Autonomia) × Preço/Litro
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-amber-200/70 shadow-2xs">
                    <label className="block text-slate-600 font-bold mb-1 text-[11px]">Distância Total da Rota</label>
                    <div className="text-base font-black text-slate-900 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>{entregaForm.distanciaTotalKm} Km</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Soma das {entregaForm.paradasEntrega.length} escolas</div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200/70 shadow-2xs">
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">Autonomia do Veículo (Km/L)</label>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-blue-600" />
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={entregaForm.autonomiaKmL}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 8.0;
                          const calc = calcEntregaTotals(
                            entregaForm.paradasEntrega,
                            val,
                            entregaForm.precoLitroCombustivel,
                            entregaForm.despesaDiariaMotorista,
                            entregaForm.despesaManutencao,
                            entregaForm.outrasDespesas
                          );
                          setEntregaForm({
                            ...entregaForm,
                            autonomiaKmL: val,
                            ...calc
                          });
                        }}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200/70 shadow-2xs">
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">Preço do Litro Combustível (R$/L) *</label>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-rose-600" />
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={entregaForm.precoLitroCombustivel}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 6.29;
                          const calc = calcEntregaTotals(
                            entregaForm.paradasEntrega,
                            entregaForm.autonomiaKmL,
                            val,
                            entregaForm.despesaDiariaMotorista,
                            entregaForm.despesaManutencao,
                            entregaForm.outrasDespesas
                          );
                          setEntregaForm({
                            ...entregaForm,
                            precoLitroCombustivel: val,
                            ...calc
                          });
                        }}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-rose-700 text-sm"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Preço editável pelo usuário</div>
                  </div>

                  <div className="bg-amber-100/80 p-3 rounded-xl border border-amber-300 shadow-2xs">
                    <label className="block text-amber-900 font-bold mb-1 text-[11px]">Consumo & Custo Combustível</label>
                    <div className="text-sm font-black text-rose-800">
                      {entregaForm.consumoCombustivelLitros} Litros
                    </div>
                    <div className="text-xs font-black text-emerald-800 mt-0.5">
                      R$ {entregaForm.despesaCombustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Composição e Soma das Despesas da Entrega */}
              <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200/90 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <div className="font-black text-emerald-950 text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-700" />
                    Composição & Soma das Despesas da Entrega
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-800">
                    Totalização financeira das despesas operacionais da rota
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200/70">
                    <label className="block text-slate-600 font-bold mb-1 text-[11px]">⛽ Combustível (R$)</label>
                    <input
                      type="number"
                      disabled
                      value={entregaForm.despesaCombustivel}
                      className="w-full p-1.5 bg-slate-100/70 border border-slate-200 rounded-lg font-black text-slate-800 text-sm"
                    />
                    <div className="text-[10px] text-slate-400 mt-0.5">{entregaForm.consumoCombustivelLitros} L @ R$ {entregaForm.precoLitroCombustivel.toFixed(2)}</div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200/70">
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">👨‍✈️ Diária / Alim. (R$)</label>
                    <input
                      type="number"
                      step="1.00"
                      min="0"
                      value={entregaForm.despesaDiariaMotorista}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const calc = calcEntregaTotals(
                          entregaForm.paradasEntrega,
                          entregaForm.autonomiaKmL,
                          entregaForm.precoLitroCombustivel,
                          val,
                          entregaForm.despesaManutencao,
                          entregaForm.outrasDespesas
                        );
                        setEntregaForm({
                          ...entregaForm,
                          despesaDiariaMotorista: val,
                          ...calc
                        });
                      }}
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-sm"
                    />
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200/70">
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">🔧 Manutenção (R$)</label>
                    <input
                      type="number"
                      step="1.00"
                      min="0"
                      value={entregaForm.despesaManutencao}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const calc = calcEntregaTotals(
                          entregaForm.paradasEntrega,
                          entregaForm.autonomiaKmL,
                          entregaForm.precoLitroCombustivel,
                          entregaForm.despesaDiariaMotorista,
                          val,
                          entregaForm.outrasDespesas
                        );
                        setEntregaForm({
                          ...entregaForm,
                          despesaManutencao: val,
                          ...calc
                        });
                      }}
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-sm"
                    />
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200/70">
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">📦 Outras Desp. (R$)</label>
                    <input
                      type="number"
                      step="1.00"
                      min="0"
                      value={entregaForm.outrasDespesas}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const calc = calcEntregaTotals(
                          entregaForm.paradasEntrega,
                          entregaForm.autonomiaKmL,
                          entregaForm.precoLitroCombustivel,
                          entregaForm.despesaDiariaMotorista,
                          entregaForm.despesaManutencao,
                          val
                        );
                        setEntregaForm({
                          ...entregaForm,
                          outrasDespesas: val,
                          ...calc
                        });
                      }}
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-sm"
                    />
                  </div>
                </div>

                {/* SOMA TOTAL DAS DESPESAS HIGHLIGHT */}
                <div className="p-4 bg-emerald-800 text-white rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold">
                      Soma Total das Despesas de Entrega
                    </div>
                    <div className="text-2xl font-black mt-0.5">
                      R$ {entregaForm.totalDespesasEntrega.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2.5 py-1 bg-emerald-900/80 rounded-lg border border-emerald-700 font-semibold">
                      Custo/Km: R${' '}
                      {(entregaForm.totalDespesasEntrega / (entregaForm.distanciaTotalKm || 1)).toFixed(2)}
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-900/80 rounded-lg border border-emerald-700 font-semibold">
                      Custo/Escola: R${' '}
                      {(entregaForm.totalDespesasEntrega / (entregaForm.paradasEntrega.length || 1)).toFixed(2)}
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-900/80 rounded-lg border border-emerald-700 font-semibold">
                      Custo/Kg: R${' '}
                      {(entregaForm.totalDespesasEntrega / (entregaForm.quantidadeTotalKg || 1)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Observações da Rota */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Observações da Rota & Instruções ao Motorista</label>
                <textarea
                  rows={2}
                  value={entregaForm.observacoesRota}
                  onChange={e => setEntregaForm({ ...entregaForm, observacoesRota: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800"
                  placeholder="Instruções de horário escolar, contatos dos diretores, pontos de referência..."
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEntregaModal(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Salvar Rota de Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Romaneio / Ficha de Rota e Despesas */}
      {viewingRomaneio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-[96vw] max-w-[1600px] p-6 sm:p-8 lg:p-10 shadow-2xl space-y-6 border border-slate-100 my-4 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                  Documento Operacional de Transporte Escolar
                </div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Romaneio de Entrega & Demonstrativo de Despesas
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Romaneio
                </button>
                <button
                  onClick={() => setViewingRomaneio(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Ficha Imprimível */}
            <div className="space-y-5 text-xs">
              {/* Header Cooperativa e Pedido */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Nº do Pedido / Remessa</div>
                  <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>{viewingRomaneio.pedidoNumero || 'PED-PNAE'}</span>
                    {viewingRomaneio.totalEntregas && viewingRomaneio.totalEntregas > 1 && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-md font-black text-[9px]">
                        Remessa {viewingRomaneio.numeroEntrega}/{viewingRomaneio.totalEntregas}
                      </span>
                    )}
                  </div>
                  {viewingRomaneio.parcelaRotulo && (
                    <div className="text-[10px] text-purple-700 font-semibold">{viewingRomaneio.parcelaRotulo}</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Programa / Edital</div>
                  <div className="text-xs font-bold text-slate-800">
                    {viewingRomaneio.programaNome || 'PNAE'} ({viewingRomaneio.chamadaPublicaEdital || 'Edital 01/2026'})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Data & Saída</div>
                  <div className="text-xs font-bold text-slate-800">
                    {viewingRomaneio.dataPrevista} às {viewingRomaneio.horarioSaidaPrevisto || '07:30'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Motorista & Veículo</div>
                  <div className="text-xs font-bold text-slate-800">
                    {viewingRomaneio.motoristaNome || 'Motorista'} ({viewingRomaneio.veiculoPlaca || 'PMN-4A92'})
                  </div>
                </div>
              </div>

              {/* Roteiro de Escolas */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-blue-900 text-white px-4 py-2.5 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Roteiro de Escolas & Comprovante de Recebimento
                  </span>
                  <span className="text-[11px] font-normal">
                    {viewingRomaneio.paradasEntrega?.length || 1} Escolas Atendidas
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-2.5 text-center w-12">#</th>
                      <th className="p-2.5">Escola Destino</th>
                      <th className="p-2.5">Endereço / Polo</th>
                      <th className="p-2.5 w-24 text-right">Distância</th>
                      <th className="p-2.5 w-24 text-right">Carga (Kg)</th>
                      <th className="p-2.5 w-40">Assinatura / Carimbo Recebedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewingRomaneio.paradasEntrega && viewingRomaneio.paradasEntrega.length > 0
                      ? viewingRomaneio.paradasEntrega
                      : [{
                          id: 'p-1',
                          ordem: 1,
                          escolaId: viewingRomaneio.escolaId || '',
                          escolaNome: viewingRomaneio.escolaNome || viewingRomaneio.escolaOrgaoDestino || 'Escola Destino',
                          endereco: viewingRomaneio.localEntrega || 'Sede da Unidade Escolar',
                          distanciaKm: viewingRomaneio.distanciaTotalKm || 18,
                          quantidadeKg: viewingRomaneio.quantidadeTotalKg || 500,
                          statusEntrega: 'PENDENTE' as const
                        }]
                    ).map((parada, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2.5 text-center font-black text-blue-900">#{parada.ordem || idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{parada.escolaNome}</td>
                        <td className="p-2.5 text-slate-500">{parada.endereco}</td>
                        <td className="p-2.5 text-right font-bold text-slate-800">{parada.distanciaKm || 0} km</td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-700">{parada.quantidadeKg || 0} kg</td>
                        <td className="p-2.5 border-l border-slate-100">
                          <div className="h-8 border-b border-dashed border-slate-300 flex items-end">
                            <span className="text-[9px] text-slate-400">Assinatura / Data</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Demonstrativo de Consumo e Despesas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quadro de Combustível */}
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-2">
                  <div className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-amber-700" /> Cálculo do Combustível da Rota
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <span>Quilometragem Total da Rota:</span>
                      <span className="font-bold text-slate-900">{viewingRomaneio.distanciaTotalKm || 0} Km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Autonomia Média do Veículo:</span>
                      <span className="font-bold text-slate-900">{viewingRomaneio.autonomiaKmL || 8.0} Km/Litro</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consumo Estimado de Combustível:</span>
                      <span className="font-black text-rose-700">{viewingRomaneio.consumoCombustivelLitros || 0} Litros</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preço do Litro do Combustível:</span>
                      <span className="font-bold text-slate-900">R$ {(viewingRomaneio.precoLitroCombustivel || 6.29).toFixed(2)} / L</span>
                    </div>
                    <div className="flex justify-between border-t border-amber-200/80 pt-1 text-sm font-black text-amber-950">
                      <span>Gasto Total com Combustível:</span>
                      <span>R$ {(viewingRomaneio.despesaCombustivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Quadro Demonstrativo de Despesas */}
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-700" /> Demonstrativo de Despesas da Viagem
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <span>⛽ Combustível:</span>
                      <span className="font-semibold text-slate-900">
                        R$ {(viewingRomaneio.despesaCombustivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>👨‍✈️ Diária / Alimentação Motorista:</span>
                      <span className="font-semibold text-slate-900">
                        R$ {(viewingRomaneio.despesaDiariaMotorista || 80).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>🔧 Manutenção / Desgaste:</span>
                      <span className="font-semibold text-slate-900">
                        R$ {(viewingRomaneio.despesaManutencao || 25).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>📦 Outras Despesas:</span>
                      <span className="font-semibold text-slate-900">
                        R$ {(viewingRomaneio.outrasDespesas || 15).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200/80 pt-1 text-sm font-black text-emerald-950">
                      <span>SOMA TOTAL DAS DESPESAS:</span>
                      <span>R$ {(viewingRomaneio.totalDespesasEntrega || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {viewingRomaneio.observacoesRota && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                  <span className="font-bold">Observações da Rota:</span> {viewingRomaneio.observacoesRota}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingRomaneio(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualização Detalhada do Cronograma de Entregas do Pedido */}
      {viewingCronogramaPedido && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-[96vw] max-w-[1600px] p-6 sm:p-8 lg:p-10 shadow-2xl space-y-6 border border-slate-100 my-4 max-h-[94vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      Cronograma de Entregas Programadas
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black uppercase tracking-wider">
                      {viewingCronogramaPedido.qtdeEntregas || viewingCronogramaPedido.cronogramaEntregas?.length || 1}x Entregas
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Pedido <strong className="text-slate-800">{viewingCronogramaPedido.numeroPedido}</strong> • Chamada Pública Edital <strong className="text-emerald-700">{viewingCronogramaPedido.chamadaPublicaEdital || 'PAA/PNAE'}</strong> • Programa <strong className="text-slate-800">{viewingCronogramaPedido.programaNome || viewingCronogramaPedido.programa}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Cronograma
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCronogramaPedido(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {(() => {
              const totalKg = viewingCronogramaPedido.itens?.reduce((s, it) => s + (it.quantidadePedida || 0), 0) || 0;
              const totalVal = viewingCronogramaPedido.valorTotalPedido || 0;
              const numEntregas = viewingCronogramaPedido.qtdeEntregas || viewingCronogramaPedido.cronogramaEntregas?.length || 1;
              const kgPorEntrega = (totalKg / numEntregas).toFixed(1);
              const valPorEntrega = (totalVal / numEntregas).toFixed(2);

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">Total de Entregas</span>
                    <div className="text-2xl font-black text-indigo-950 mt-1">{numEntregas} Remessa{numEntregas > 1 ? 's' : ''}</div>
                    <span className="text-[11px] text-indigo-600 font-medium">Divisão programada</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Total Pedido (KG)</span>
                    <div className="text-2xl font-black text-emerald-950 mt-1">{totalKg.toLocaleString('pt-BR')} KG</div>
                    <span className="text-[11px] text-emerald-700 font-semibold">{kgPorEntrega} KG / entrega</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                    <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Valor Global</span>
                    <div className="text-2xl font-black text-amber-950 mt-1">R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <span className="text-[11px] text-amber-700 font-semibold">R$ {parseFloat(valPorEntrega).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / entrega</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                    <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Escolas Destino</span>
                    <div className="text-2xl font-black text-blue-950 mt-1">{viewingCronogramaPedido.escolasIds?.length || 1} Unidade{((viewingCronogramaPedido.escolasIds?.length || 1) > 1) ? 's' : ''}</div>
                    <span className="text-[11px] text-blue-700 font-medium truncate block">{viewingCronogramaPedido.escolaNome || 'Escolas PNAE'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Escolas e Produtores Envolvidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider block mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Escolas Recebedoras Contempladas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(viewingCronogramaPedido.escolasNomes && viewingCronogramaPedido.escolasNomes.length > 0
                    ? viewingCronogramaPedido.escolasNomes
                    : (viewingCronogramaPedido.escolaNome ? viewingCronogramaPedido.escolaNome.split(', ') : ['Escolas Cadastradas'])
                  ).map((nomeEsc, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-blue-200 text-blue-900 rounded-lg font-bold text-[11px] shadow-xs">
                      {nomeEsc}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider block mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  Produtores Fornecedores
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(viewingCronogramaPedido.itens?.map(i => i.produtorNome))).map((nomeProd, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-900 rounded-lg font-bold text-[11px] shadow-xs">
                      {nomeProd}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Linha do Tempo e Cards das Entregas Programadas */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                Remessas Programadas e Detalhamento da Divisão
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(viewingCronogramaPedido.cronogramaEntregas || [
                  {
                    numero: 1,
                    rotulo: '1ª Entrega',
                    dataPrevista: viewingCronogramaPedido.dataPrevistaEntrega,
                    horarioSaida: '07:30',
                    quantidadeKg: viewingCronogramaPedido.itens?.reduce((s, it) => s + (it.quantidadePedida || 0), 0) || 500,
                    percentual: 100,
                    valorPrevisto: viewingCronogramaPedido.valorTotalPedido || 0,
                    status: 'AGENDADA' as const,
                    observacao: 'Remessa única do pedido'
                  }
                ]).map((parc) => {
                  const dateObj = parc.dataPrevista ? new Date(parc.dataPrevista + 'T12:00:00') : null;
                  const diaSemana = dateObj ? ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dateObj.getDay()] : '';
                  const fraction = 1 / (viewingCronogramaPedido.qtdeEntregas || 1);

                  return (
                    <div key={parc.numero} className={`bg-white rounded-2xl border-2 p-4 shadow-xs space-y-3 transition-all ${parc.entregueConfirmada ? 'border-emerald-300 bg-emerald-50/30' : 'border-indigo-100 hover:border-indigo-300'}`}>
                      <div className="flex items-start justify-between gap-2 border-b border-indigo-50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                            {parc.numero}ª
                          </span>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">{parc.rotulo}</h4>
                            <span className="text-[11px] font-bold text-indigo-700">
                              {diaSemana ? `${diaSemana}, ` : ''}{parc.dataPrevista?.split('-').reverse().join('/')} às {parc.horarioSaida || '07:30'}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wide">
                          {parc.percentual}% do Total
                        </span>
                      </div>

                      {/* Métricas da Parcela */}
                      <div className="grid grid-cols-2 gap-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Carga da Remessa</span>
                          <span className="font-black text-indigo-950 text-base">{parc.quantidadeKg} KG</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Valor da Parcela</span>
                          <span className="font-black text-emerald-800 text-base">R$ {(parc.valorPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* Produtos e Quantidades Desta Parcela */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">
                          Produtos Fracionados Desta Entrega:
                        </span>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                          {(viewingCronogramaPedido.itens || []).map((it, iIdx) => {
                            const qtdParcela = (Number(it.quantidadePedida || 0) * fraction).toFixed(1);
                            const valParcela = (Number(it.valorTotalItem || 0) * fraction).toFixed(2);
                            return (
                              <div key={iIdx} className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 font-medium">
                                <span className="truncate text-slate-800 font-semibold">
                                  {it.produtoNome} ({it.produtorNome})
                                </span>
                                <span className="text-indigo-900 font-extrabold shrink-0 ml-2">
                                  {qtdParcela} {it.unidadeMedida || 'KG'} • R$ {parseFloat(valParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {parc.observacao && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg italic border border-slate-200/60">
                          <strong>Obs:</strong> {parc.observacao}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleConfirmarEntregaParcela(viewingCronogramaPedido, parc.numero)}
                        className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          parc.entregueConfirmada
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {parc.entregueConfirmada
                          ? `Entregue em ${parc.dataConfirmacaoEntrega?.split('-').reverse().join('/') || ''} — Desfazer`
                          : 'Marcar como Entregue'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setViewingCronogramaPedido(null);
                  setActiveTab('logistica');
                }}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-indigo-200 transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4 text-indigo-600" />
                Ver no Módulo de Logística & Frotas
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ped = viewingCronogramaPedido;
                    setViewingCronogramaPedido(null);
                    handleOpenPedido(ped);
                  }}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar Pedido & Cronograma
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCronogramaPedido(null)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all cursor-pointer text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Envio de Pedidos em PDF & WhatsApp aos Produtores */}
      {viewingEnvioProdutoresPedido && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-[96vw] max-w-[1000px] p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100 my-4 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Relatórios em PDF & Envio de Pedidos via WhatsApp
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Pedido Nº <strong className="text-slate-800">{viewingEnvioProdutoresPedido.numeroPedido}</strong> • Programa <strong className="text-emerald-700">{viewingEnvioProdutoresPedido.programaNome || viewingEnvioProdutoresPedido.programa}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prodIds = Array.from(new Set(viewingEnvioProdutoresPedido.itens?.map(i => i.produtorId as string).filter(Boolean)));
                    prodIds.forEach((id: string) => exportPedidoProdutorPDF(viewingEnvioProdutoresPedido, id));
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> Baixar Todos os PDFs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prodIds = Array.from(new Set(viewingEnvioProdutoresPedido.itens?.map(i => i.produtorId as string).filter(Boolean)));
                    prodIds.forEach((id: string, idx) => {
                      setTimeout(() => {
                        handleSendPedidoProdutorWhatsApp(viewingEnvioProdutoresPedido, id);
                      }, idx * 800);
                    });
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span>📱 Enviar para Todos via WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingEnvioProdutoresPedido(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Abaixo estão listados todos os produtores vinculados a este pedido. Você pode baixar o relatório individual em PDF de cada produtor ou abrir o WhatsApp para envio direto da mensagem com os itens solicitados.
              </p>

              <div className="space-y-2.5">
                {Array.from(new Set(viewingEnvioProdutoresPedido.itens?.map(i => i.produtorId as string).filter(Boolean))).map((prodId: string) => {
                  const prodObj = produtores.find(p => p.id === prodId);
                  const itensProd = (viewingEnvioProdutoresPedido.itens || []).filter(i => i.produtorId === prodId);
                  const prodNome = prodObj?.nome || itensProd[0]?.produtorNome || 'Produtor Rural';
                  const prodTel = prodObj?.whatsapp || prodObj?.celular || prodObj?.telefone || 'Sem telefone cad.';
                  const totalProd = itensProd.reduce((sum, it) => sum + (it.valorTotalItem || (it.quantidadePedida || 0) * (it.precoUnitario || 0)), 0);

                  return (
                    <div key={prodId} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-extrabold text-slate-900 text-sm">{prodNome}</h4>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {prodTel}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-2">
                          <span>{itensProd.length} produto(s):</span>
                          <strong className="text-slate-800">{itensProd.map(i => `${i.produtoNome} (${i.quantidadePedida}${i.unidadeMedida || 'KG'})`).join(', ')}</strong>
                        </div>
                        <div className="text-xs font-black text-emerald-700">
                          Total: R$ {totalProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => exportPedidoProdutorPDF(viewingEnvioProdutoresPedido, prodId)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-700" /> Baixar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => exportEntregaEscolaProdutorPDF(viewingEnvioProdutoresPedido, prodId)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          title="Relatório de Entrega, agrupado por escola de destino"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-700" /> Relatório de Entrega
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendPedidoProdutorWhatsApp(viewingEnvioProdutoresPedido, prodId)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <span>📱 WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingEnvioProdutoresPedido(null)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all cursor-pointer text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
