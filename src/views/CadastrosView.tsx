import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { sanitizeCooperado } from '../utils/cooperadoSanitizer';
import {
  FolderTree,
  Plus,
  Search,
  Sprout,
  Users,
  Package,
  Layers,
  Building,
  Pencil,
  Trash2,
  X,
  Check,
  GraduationCap,
  UserPlus,
  Edit2,
  AlertTriangle,
  Clock,
  AlertCircle,
  Calendar,
  ShieldAlert,
  FileText,
  CheckCircle2,
  Filter,
  Bell,
  Copy,
  ExternalLink,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Truck,
  Phone,
  Mail,
  PackageCheck
} from 'lucide-react';
import {
  Cooperado,
  ProdutorRural,
  ProdutoAgro,
  ProgramaGovernamental,
  EscolaPnae,
  Motorista
} from '../types';
import { GeoLocationPicker } from '../components/GeoLocationPicker';
import { buscarCodigosFiscais } from '../utils/produtoCodigosFiscais';
import { POLOS_PADRAO } from '../utils/poloHelpers';
import { PortalShareBanner } from '../components/PortalShareBanner';
import {
  baixarModeloPlanilhaProdutos,
  parsePlanilhaProdutos,
  LinhaProdutoImportado,
  baixarModeloPlanilhaEscolas,
  parsePlanilhaEscolas,
  LinhaEscolaImportada
} from '../utils/produtosEscolasExcel';

export const CadastrosView: React.FC = () => {
  const {
    cooperados,
    addCooperado,
    updateCooperado,
    deleteCooperado,
    produtores,
    addProdutor,
    updateProdutor,
    deleteProdutor,
    syncCooperadosWithProdutores,
    restaurarCooperadosBaseCompleta,
    produtos,
    addProduto,
    updateProduto,
    deleteProduto,
    programas,
    addPrograma,
    updatePrograma,
    deletePrograma,
    escolasPnae,
    addEscolaPnae,
    updateEscolaPnae,
    deleteEscolaPnae,
    motoristas,
    addMotorista,
    updateMotorista,
    deleteMotorista,
    romaneiosMotorista,
    canWriteModule,
    addAuditLog
  } = useCoop();

  // Nível de permissão do usuário logado para este módulo (Cadastros:
  // produtores, produtos, programas, escolas). Usuário com nível "Somente
  // Leitura" na Matriz de Permissões pode visualizar, mas não gravar/excluir.
  const canWrite = canWriteModule('cadastros');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'produtores' | 'produtos' | 'programas' | 'escolas' | 'motoristas'>('produtores');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state
  const [editingCooperado, setEditingCooperado] = useState<Cooperado | null>(null);
  const [editingProdutor, setEditingProdutor] = useState<ProdutorRural | null>(null);
  const [editingProduto, setEditingProduto] = useState<ProdutoAgro | null>(null);
  const [editingPrograma, setEditingPrograma] = useState<ProgramaGovernamental | null>(null);
  const [editingEscola, setEditingEscola] = useState<EscolaPnae | null>(null);
  const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(null);

  // Modal open flags
  const [showCooperadoModal, setShowCooperadoModal] = useState(false);
  const [showProdutorModal, setShowProdutorModal] = useState(false);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showProgramaModal, setShowProgramaModal] = useState(false);
  const [showEscolaModal, setShowEscolaModal] = useState(false);
  const [showMotoristaModal, setShowMotoristaModal] = useState(false);
  const [showEntregasMotoristaId, setShowEntregasMotoristaId] = useState<string | null>(null);

  const [motoristaForm, setMotoristaForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    veiculoPadrao: '',
    ativo: true
  });

  const handleOpenMotorista = (m?: Motorista) => {
    if (m) {
      setEditingMotorista(m);
      setMotoristaForm({
        nome: m.nome,
        telefone: m.telefone || '',
        email: m.email,
        veiculoPadrao: m.veiculoPadrao || '',
        ativo: m.ativo ?? true
      });
    } else {
      setEditingMotorista(null);
      setMotoristaForm({ nome: '', telefone: '', email: '', veiculoPadrao: '', ativo: true });
    }
    setShowMotoristaModal(true);
  };

  const handleSaveMotorista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!motoristaForm.nome.trim() || !motoristaForm.email.trim()) return;

    const emailNormalizado = motoristaForm.email.trim().toLowerCase();
    const duplicado = motoristas.some(
      m => m.email.toLowerCase() === emailNormalizado && m.id !== editingMotorista?.id
    );
    if (duplicado) {
      alert('Já existe um motorista cadastrado com este e-mail.');
      return;
    }

    const payload = { ...motoristaForm, email: emailNormalizado };
    if (editingMotorista) {
      updateMotorista(editingMotorista.id, payload);
    } else {
      addMotorista(payload);
    }
    setShowMotoristaModal(false);
  };

  // Entregas (romaneios) vinculadas a cada motorista — prioriza motoristaId
  // (vínculo direto) e cai para e-mail como compatibilidade com registros antigos.
  const getEntregasDoMotorista = (m: Motorista) => romaneiosMotorista.filter(
    r => r.motoristaId === m.id || (r.motoristaEmail && r.motoristaEmail.toLowerCase() === m.email.toLowerCase())
  );

  // Importação de planilha (.xlsx) — Produtos
  const [showImportProdutosModal, setShowImportProdutosModal] = useState(false);
  const [importProdutosPreview, setImportProdutosPreview] = useState<LinhaProdutoImportado[]>([]);
  const [importProdutosFileName, setImportProdutosFileName] = useState('');
  const [importProdutosLoading, setImportProdutosLoading] = useState(false);
  const [importProdutosFeedback, setImportProdutosFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Importação de planilha (.xlsx) — Escolas PNAE
  const [showImportEscolasModal, setShowImportEscolasModal] = useState(false);
  const [importEscolasPreview, setImportEscolasPreview] = useState<LinhaEscolaImportada[]>([]);
  const [importEscolasFileName, setImportEscolasFileName] = useState('');
  const [importEscolasLoading, setImportEscolasLoading] = useState(false);
  const [importEscolasFeedback, setImportEscolasFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleProdutosFileSelected = async (file: File) => {
    if (!canWrite) { blockWriteAction(); return; }
    setImportProdutosLoading(true);
    setImportProdutosFeedback(null);
    setImportProdutosFileName(file.name);
    try {
      const result = await parsePlanilhaProdutos(file);
      if (result.success) {
        setImportProdutosPreview(result.itens);
        setImportProdutosFeedback({ type: 'success', message: result.message });
      } else {
        setImportProdutosPreview([]);
        setImportProdutosFeedback({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setImportProdutosFeedback({ type: 'error', message: err?.message || 'Erro ao processar a planilha.' });
    } finally {
      setImportProdutosLoading(false);
    }
  };

  const handleConfirmImportProdutos = () => {
    if (!canWrite) { blockWriteAction(); return; }
    if (importProdutosPreview.length === 0) return;
    importProdutosPreview.forEach(item => {
      addProduto({
        codigo: `PDT-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`,
        nome: item.nome,
        categoria: item.categoria,
        unidadeMedida: item.unidadeMedida,
        precoReferencia: item.precoReferencia,
        codigoNcm: item.codigoNcm,
        codigoConab: item.codigoConab,
        pesoUnitario: item.pesoUnitario,
        tipoProcessamento: item.tipoProcessamento,
        descricao: item.descricao || 'Ano todo'
      } as any);
    });
    setImportProdutosFeedback({ type: 'success', message: `${importProdutosPreview.length} produto(s) importado(s) com sucesso!` });
    setImportProdutosPreview([]);
    setImportProdutosFileName('');
    setShowImportProdutosModal(false);
  };

  const handleEscolasFileSelected = async (file: File) => {
    if (!canWrite) { blockWriteAction(); return; }
    setImportEscolasLoading(true);
    setImportEscolasFeedback(null);
    setImportEscolasFileName(file.name);
    try {
      const result = await parsePlanilhaEscolas(file);
      if (result.success) {
        setImportEscolasPreview(result.itens);
        setImportEscolasFeedback({ type: 'success', message: result.message });
      } else {
        setImportEscolasPreview([]);
        setImportEscolasFeedback({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setImportEscolasFeedback({ type: 'error', message: err?.message || 'Erro ao processar a planilha.' });
    } finally {
      setImportEscolasLoading(false);
    }
  };

  const handleConfirmImportEscolas = () => {
    if (!canWrite) { blockWriteAction(); return; }
    if (importEscolasPreview.length === 0) return;
    importEscolasPreview.forEach(item => {
      addEscolaPnae(item as any);
    });
    setImportEscolasFeedback({ type: 'success', message: `${importEscolasPreview.length} escola(s) importada(s) com sucesso!` });
    setImportEscolasPreview([]);
    setImportEscolasFileName('');
    setShowImportEscolasModal(false);
  };

  // Forms
  const [cooperadoForm, setCooperadoForm] = useState({
    matricula: `COOP-${String(cooperados.length + 1).padStart(4, '0')}`,
    nome: '',
    cpf: '',
    rg: '12.345.678-9',
    dataNascimento: '1990-01-01',
    sexo: 'M' as 'M' | 'F' | 'OUTRO',
    estadoCivil: 'CASADO' as any,
    profissao: 'Agricultor(a) Rural',
    nacionalidade: 'Brasileira',
    situacao: 'ATIVO' as 'ATIVO' | 'INATIVO' | 'SUSPENSO' | 'DEMITIDO',
    categoria: 'SUDOESTE_AGRO' as any,
    dataFiliacao: new Date().toISOString().split('T')[0],
    logradouro: 'Comunidade Rural S/N',
    numero: 'S/N',
    complemento: '',
    bairro: 'Zona Rural',
    cidade: 'Trairi',
    estado: 'CE',
    cep: '62690-000',
    pais: 'Brasil',
    telefone: '(85) 3351-0000',
    celular: '(85) 99999-0000',
    whatsapp: '5585999990000',
    email: 'cooperado@email.com',
    contatoEmergencia: '',
    banco: 'Sicoob',
    agencia: '3001-2',
    conta: '12345-6',
    chavePix: 'cooperado@email.com',
    observacoes: 'Cadastrado no Módulo de Cadastros Unificados',
    documentos: []
  });
  const [filterCafStatus, setFilterCafStatus] = useState<'TODOS' | 'PRESTES_A_EXPIRAR' | 'EXPIRADO' | 'VALIDO'>('TODOS');
  const [showCafAlertModal, setShowCafAlertModal] = useState(false);
  const [copiedNotificationId, setCopiedNotificationId] = useState<string | null>(null);

  // CAF Expiration calculation helper
  const checkCafExpiry = (validadeStr?: string) => {
    if (!validadeStr) return { status: 'OK' as const, daysLeft: 999, label: 'Indefinida' };
    
    let dateObj: Date;
    if (validadeStr.includes('/')) {
      const parts = validadeStr.split('/');
      if (parts.length === 3) {
        dateObj = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      } else {
        dateObj = new Date(validadeStr);
      }
    } else {
      dateObj = new Date(validadeStr);
    }

    if (isNaN(dateObj.getTime())) {
      return { status: 'OK' as const, daysLeft: 999, label: 'Indefinida' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = dateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'EXPIRADO' as const, daysLeft: diffDays, label: `Expirou há ${Math.abs(diffDays)} dia(s)` };
    } else if (diffDays <= 30) {
      return { status: 'PRESTES_A_EXPIRAR' as const, daysLeft: diffDays, label: `Expira em ${diffDays} dia(s)` };
    } else {
      return { status: 'OK' as const, daysLeft: diffDays, label: `Válida (${diffDays} dias)` };
    }
  };

  const produtoresComCafInfo = produtores.map(p => {
    const info = checkCafExpiry(p.cafDapValidade);
    return { ...p, cafInfo: info };
  });

  const produtoresPrestesExpira = produtoresComCafInfo.filter(p => p.cafInfo.status === 'PRESTES_A_EXPIRAR');
  const produtoresExpirados = produtoresComCafInfo.filter(p => p.cafInfo.status === 'EXPIRADO');
  const totalAlertasCaf = produtoresPrestesExpira.length + produtoresExpirados.length;

  const [produtorForm, setProdutorForm] = useState({
    cooperadoId: '',
    nome: '',
    cpfCnpj: '',
    cafDapNum: '',
    cafDapValidade: '2028-12-31',
    nomePropriedade: '',
    municipio: 'Trairi',
    uf: 'CE',
    comunidade: '',
    polo: 'Sede',
    areaHectares: 15,
    certificacaoOrganica: false,
    telefone: '',
    situacao: 'ATIVO' as 'ATIVO' | 'INATIVO',
    latitude: -3.3768,
    longitude: -39.2689,
    pontoReferencia: ''
  });

  const [produtoForm, setProdutoForm] = useState({
    codigo: '',
    nome: '',
    categoria: 'HORTIFRUTI' as any,
    unidadeMedida: 'KG' as any,
    precoReferencia: 4.5,
    sazonalidade: 'Ano todo',
    codigoNcm: '',
    codigoConab: '',
    pesoUnitario: 0 as number,
    tipoProcessamento: 'IN_NATURA' as 'IN_NATURA' | 'BENEFICIADO'
  });
  // Indica se o NCM/CONAB atuais vieram do preenchimento automático (para
  // mostrar o aviso visual) ou foram digitados manualmente pelo usuário.
  const [codigosAutoPreenchidos, setCodigosAutoPreenchidos] = useState(false);

  // Atualiza automaticamente os códigos NCM (SEFAZ) e CONAB sempre que o
  // nome ou a categoria do produto mudarem, enquanto o usuário não tiver
  // editado os campos manualmente para este cadastro.
  const atualizarCodigosFiscaisAuto = (nome: string, categoria: string) => {
    const match = buscarCodigosFiscais(nome, categoria);
    if (match) {
      setProdutoForm(prev => ({ ...prev, codigoNcm: match.codigoNcm, codigoConab: match.codigoConab }));
      setCodigosAutoPreenchidos(true);
    }
  };

  const [programaForm, setProgramaForm] = useState({
    codigo: '',
    nome: '',
    tipo: 'PAA' as any,
    orgaoExecutor: 'Conab / FNDE',
    descricao: '',
    limiteAnualPorProdutor: 15000,
    orcamentoTotal: 100000,
    status: 'EM_ANDAMENTO' as any
  });

  const [escolaForm, setEscolaForm] = useState({
    nomeEscola: '',
    inepCodigo: '',
    localDeEntrega: '',
    cnae: '8512-1/00',
    razaoSocial: '',
    cnpj: '',
    logradouroNum: '',
    localidade: 'Trairi/CE',
    alunosAtendidos: 250,
    polo: 'Sede',
    representante: '',
    tipo: 'Municipal',
    cpf: '',
    rg: '',
    email: '',
    telefone: '',
    celular: '',
    diretorResponsavel: '',
    endereco: '',
    latitude: -3.3768,
    longitude: -39.2689,
    pontoReferencia: '',
    cep: '62690-000',
    bairro: 'Centro',
    municipio: 'Trairi',
    uf: 'CE'
  });

  // Open modals for add/edit
  const handleOpenCooperado = (c?: Cooperado) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (c) {
      const cleanC = sanitizeCooperado(c);
      setEditingCooperado(cleanC);
      setCooperadoForm({
        matricula: cleanC.matricula,
        nome: cleanC.nome,
        cpf: cleanC.cpf,
        rg: cleanC.rg || '',
        dataNascimento: cleanC.dataNascimento || '1990-01-01',
        sexo: cleanC.sexo || 'M',
        estadoCivil: cleanC.estadoCivil || 'CASADO',
        profissao: cleanC.profissao || 'Agricultor(a)',
        nacionalidade: cleanC.nacionalidade || 'Brasileira',
        situacao: cleanC.situacao || 'ATIVO',
        categoria: cleanC.categoria || 'SUDOESTE_AGRO',
        dataFiliacao: cleanC.dataFiliacao || new Date().toISOString().split('T')[0],
        logradouro: cleanC.logradouro || '',
        numero: cleanC.numero || '',
        complemento: cleanC.complemento || '',
        bairro: cleanC.bairro || '',
        cidade: cleanC.cidade || 'Trairi',
        estado: cleanC.estado || 'CE',
        cep: cleanC.cep || '62690-000',
        pais: cleanC.pais || 'Brasil',
        latitude: cleanC.latitude ?? -3.3768,
        longitude: cleanC.longitude ?? -39.2689,
        pontoReferencia: cleanC.pontoReferencia || '',
        telefone: cleanC.telefone || '',
        celular: cleanC.celular || '',
        whatsapp: cleanC.whatsapp || '',
        email: cleanC.email || '',
        contatoEmergencia: cleanC.contatoEmergencia || '',
        banco: cleanC.banco || 'Sicoob',
        agencia: cleanC.agencia || '',
        conta: cleanC.conta || '',
        chavePix: cleanC.chavePix || '',
        observacoes: (cleanC as any).observacoes || '',
        documentos: cleanC.documentos || []
      });
    } else {
      setEditingCooperado(null);
      setCooperadoForm({
        matricula: `COOP-${String(cooperados.length + 1).padStart(4, '0')}`,
        nome: '',
        cpf: '',
        rg: '12.345.678-9',
        dataNascimento: '1990-01-01',
        sexo: 'M',
        estadoCivil: 'CASADO',
        profissao: 'Agricultor(a) Rural',
        nacionalidade: 'Brasileira',
        situacao: 'ATIVO',
        categoria: 'SUDOESTE_AGRO',
        dataFiliacao: new Date().toISOString().split('T')[0],
        logradouro: 'Comunidade Rural S/N',
        numero: 'S/N',
        complemento: '',
        bairro: 'Zona Rural',
        cidade: 'Trairi',
        estado: 'CE',
        cep: '62690-000',
        pais: 'Brasil',
        latitude: -3.3768,
        longitude: -39.2689,
        pontoReferencia: '',
        telefone: '(85) 3351-0000',
        celular: '(85) 99999-0000',
        whatsapp: '5585999990000',
        email: 'cooperado@email.com',
        contatoEmergencia: '',
        banco: 'Sicoob',
        agencia: '3001-2',
        conta: '12345-6',
        chavePix: 'cooperado@email.com',
        observacoes: 'Cadastrado no Módulo de Cadastros Unificados',
        documentos: []
      });
    }
    setShowCooperadoModal(true);
  };

  const handleSaveCooperado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!cooperadoForm.nome || !cooperadoForm.cpf) {
      alert('Por favor, informe Nome e CPF do cooperado.');
      return;
    }
    if (editingCooperado) {
      updateCooperado(editingCooperado.id, cooperadoForm as any);
    } else {
      addCooperado(cooperadoForm as any);
    }
    setShowCooperadoModal(false);
  };

  // Exclusão em massa — ação destrutiva e irreversível. Exige confirmação
  // dupla (confirm() + digitar "EXCLUIR") para reduzir o risco de clique
  // acidental apagar toda a base de produtores ou escolas da cooperativa.
  const handleDeleteAllProdutores = () => {
    if (!canWrite) { blockWriteAction(); return; }
    if (produtores.length === 0) {
      alert('Não há produtores cadastrados para excluir.');
      return;
    }
    if (!confirm(`Isto vai excluir PERMANENTEMENTE todos os ${produtores.length} produtores rurais cadastrados nesta cooperativa. Esta ação não pode ser desfeita. Deseja continuar?`)) return;
    const confirmacao = prompt(`Para confirmar, digite EXCLUIR (em maiúsculas) para apagar os ${produtores.length} produtores:`);
    if (confirmacao !== 'EXCLUIR') {
      if (confirmacao !== null) alert('Confirmação incorreta. Nenhum produtor foi excluído.');
      return;
    }
    const total = produtores.length;
    produtores.forEach(p => deleteProdutor(p.id));
    addAuditLog('CADASTROS', 'EXCLUSAO', `Exclusão em massa: ${total} produtor(es) rural(is) removido(s) do cadastro.`);
    alert(`${total} produtor(es) excluído(s) com sucesso.`);
  };

  const handleDeleteAllEscolas = () => {
    if (!canWrite) { blockWriteAction(); return; }
    if (escolasPnae.length === 0) {
      alert('Não há escolas cadastradas para excluir.');
      return;
    }
    if (!confirm(`Isto vai excluir PERMANENTEMENTE todas as ${escolasPnae.length} escolas PNAE cadastradas nesta cooperativa. Esta ação não pode ser desfeita. Deseja continuar?`)) return;
    const confirmacao = prompt(`Para confirmar, digite EXCLUIR (em maiúsculas) para apagar as ${escolasPnae.length} escolas:`);
    if (confirmacao !== 'EXCLUIR') {
      if (confirmacao !== null) alert('Confirmação incorreta. Nenhuma escola foi excluída.');
      return;
    }
    const total = escolasPnae.length;
    escolasPnae.forEach(e => deleteEscolaPnae(e.id));
    addAuditLog('CADASTROS', 'EXCLUSAO', `Exclusão em massa: ${total} escola(s) PNAE removida(s) do cadastro.`);
    alert(`${total} escola(s) excluída(s) com sucesso.`);
  };

  const handleOpenProdutor = (p?: ProdutorRural) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (p) {
      setEditingProdutor(p);
      setProdutorForm({
        cooperadoId: p.cooperadoId || '',
        nome: p.nome,
        cpfCnpj: p.cpfCnpj,
        cafDapNum: p.cafDapNum,
        cafDapValidade: p.cafDapValidade || '2028-12-31',
        nomePropriedade: p.nomePropriedade || '',
        municipio: p.municipio || 'Trairi',
        uf: p.uf || 'CE',
        comunidade: p.comunidade || '',
        polo: p.polo || 'Sede',
        areaHectares: p.areaHectares || 15,
        certificacaoOrganica: p.certificacaoOrganica || false,
        telefone: p.telefone || '',
        situacao: p.situacao || 'ATIVO',
        latitude: p.latitude ?? -3.3768,
        longitude: p.longitude ?? -39.2689,
        pontoReferencia: p.pontoReferencia || ''
      });
    } else {
      setEditingProdutor(null);
      setProdutorForm({
        cooperadoId: '',
        nome: '',
        cpfCnpj: '',
        cafDapNum: '',
        cafDapValidade: '2028-12-31',
        nomePropriedade: '',
        municipio: 'Trairi',
        uf: 'CE',
        comunidade: '',
        polo: 'Sede',
        areaHectares: 15,
        certificacaoOrganica: false,
        telefone: '',
        situacao: 'ATIVO',
        latitude: -3.3768,
        longitude: -39.2689,
        pontoReferencia: ''
      });
    }
    setShowProdutorModal(true);
  };

  const handleSaveProdutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!produtorForm.nome || !produtorForm.cpfCnpj) return;
    if (editingProdutor) {
      updateProdutor(editingProdutor.id, produtorForm as any);
    } else {
      addProdutor({
        ...produtorForm,
        situacao: 'ATIVO'
      } as any);
    }
    setShowProdutorModal(false);
  };

  const handleOpenProduto = (p?: ProdutoAgro) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (p) {
      setEditingProduto(p);
      setProdutoForm({
        codigo: p.codigo || '',
        nome: p.nome,
        categoria: p.categoria,
        unidadeMedida: p.unidadeMedida,
        precoReferencia: p.precoReferencia || (p as any).precoReferenciaPaa || 0,
        sazonalidade: p.descricao || 'Ano todo',
        codigoNcm: p.codigoNcm || '',
        codigoConab: p.codigoConab || '',
        pesoUnitario: p.pesoUnitario || 0,
        tipoProcessamento: p.tipoProcessamento || 'IN_NATURA'
      });
      setCodigosAutoPreenchidos(false);
    } else {
      setEditingProduto(null);
      const codigoInicial = { codigoNcm: '', codigoConab: '' };
      setProdutoForm({
        codigo: `PDT-${Date.now().toString().slice(-4)}`,
        nome: '',
        categoria: 'HORTIFRUTI',
        unidadeMedida: 'KG',
        precoReferencia: 4.5,
        sazonalidade: 'Ano todo',
        pesoUnitario: 0,
        tipoProcessamento: 'IN_NATURA',
        ...codigoInicial
      });
      setCodigosAutoPreenchidos(false);
    }
    setShowProdutoModal(true);
  };

  const handleSaveProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!produtoForm.nome) return;
    // Garante que o produto nunca seja salvo sem código fiscal: se o campo
    // ainda estiver vazio no momento de salvar (usuário não editou e nenhum
    // termo bateu antes), tenta preencher pela categoria como último recurso.
    let payload = { ...produtoForm };
    if (!payload.codigoNcm || !payload.codigoConab) {
      const match = buscarCodigosFiscais(payload.nome, payload.categoria);
      if (match) {
        payload = {
          ...payload,
          codigoNcm: payload.codigoNcm || match.codigoNcm,
          codigoConab: payload.codigoConab || match.codigoConab
        };
      }
    }
    if (editingProduto) {
      updateProduto(editingProduto.id, payload as any);
    } else {
      addProduto(payload as any);
    }
    setShowProdutoModal(false);
  };

  const handleOpenPrograma = (p?: ProgramaGovernamental) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (p) {
      setEditingPrograma(p);
      setProgramaForm({
        codigo: p.codigo || '',
        nome: p.nome,
        tipo: p.tipo,
        orgaoExecutor: p.orgaoFinanciador || (p as any).orgaoExecutor || 'MDS / FNDE',
        descricao: (p as any).descricao || '',
        limiteAnualPorProdutor: p.limitePorProdutorAno || (p as any).limiteAnualPorProdutor || 15000,
        orcamentoTotal: p.orcamentoTotal || 100000,
        status: p.status || 'EM_ANDAMENTO'
      });
    } else {
      setEditingPrograma(null);
      setProgramaForm({
        codigo: `PROG-${Date.now().toString().slice(-4)}`,
        nome: '',
        tipo: 'PAA',
        orgaoExecutor: 'MDS / FNDE',
        descricao: '',
        limiteAnualPorProdutor: 15000,
        orcamentoTotal: 100000,
        status: 'EM_ANDAMENTO'
      });
    }
    setShowProgramaModal(true);
  };

  const handleSavePrograma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!programaForm.nome) return;
    if (editingPrograma) {
      updatePrograma(editingPrograma.id, {
        ...programaForm,
        orgaoFinanciador: programaForm.orgaoExecutor,
        limitePorProdutorAno: programaForm.limiteAnualPorProdutor
      } as any);
    } else {
      addPrograma({
        ...programaForm,
        orgaoFinanciador: programaForm.orgaoExecutor,
        limitePorProdutorAno: programaForm.limiteAnualPorProdutor,
        orcamentoExecutado: 0,
        dataInicio: new Date().toISOString().split('T')[0],
        dataFim: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
      } as any);
    }
    setShowProgramaModal(false);
  };

  const handleOpenEscola = (eItem?: EscolaPnae) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (eItem) {
      setEditingEscola(eItem);
      setEscolaForm({
        nomeEscola: eItem.nomeEscola || '',
        inepCodigo: eItem.inepCodigo || '',
        localDeEntrega: eItem.localDeEntrega || eItem.nomeEscola || '',
        cnae: eItem.cnae || '8512-1/00',
        razaoSocial: eItem.razaoSocial || eItem.nomeEscola || '',
        cnpj: eItem.cnpj || '',
        logradouroNum: eItem.logradouroNum || eItem.endereco || '',
        localidade: eItem.localidade || 'Trairi/CE',
        alunosAtendidos: eItem.alunosAtendidos || 200,
        polo: eItem.polo || 'Sede',
        representante: eItem.representante || eItem.diretorResponsavel || '',
        tipo: eItem.tipo || 'Municipal',
        cpf: eItem.cpf || '',
        rg: eItem.rg || '',
        email: eItem.email || '',
        telefone: eItem.telefone || '',
        celular: eItem.celular || '',
        diretorResponsavel: eItem.diretorResponsavel || '',
        endereco: eItem.endereco || '',
        latitude: eItem.latitude ?? -3.3768,
        longitude: eItem.longitude ?? -39.2689,
        pontoReferencia: eItem.pontoReferencia || '',
        cep: eItem.cep || '62690-000',
        bairro: eItem.bairro || 'Centro',
        municipio: eItem.municipio || 'Trairi',
        uf: eItem.uf || 'CE'
      });
    } else {
      setEditingEscola(null);
      setEscolaForm({
        nomeEscola: '',
        inepCodigo: `${Math.floor(10000000 + Math.random() * 90000000)}`,
        localDeEntrega: '',
        cnae: '8512-1/00',
        razaoSocial: '',
        cnpj: '',
        logradouroNum: '',
        localidade: 'Trairi/CE',
        alunosAtendidos: 250,
        polo: 'Sede',
        representante: '',
        tipo: 'Municipal',
        cpf: '',
        rg: '',
        email: 'escola@trairi.ce.gov.br',
        telefone: '(85) 3351-8800',
        celular: '(85) 99888-1234',
        diretorResponsavel: '',
        endereco: '',
        latitude: -3.3768,
        longitude: -39.2689,
        pontoReferencia: '',
        cep: '62690-000',
        bairro: 'Centro',
        municipio: 'Trairi',
        uf: 'CE'
      });
    }
    setShowEscolaModal(true);
  };

  const handleSaveEscola = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    const nome = escolaForm.nomeEscola || escolaForm.localDeEntrega || escolaForm.razaoSocial || 'Escola PNAE';
    const payload = {
      ...escolaForm,
      nomeEscola: nome,
      diretorResponsavel: escolaForm.diretorResponsavel || escolaForm.representante,
      endereco: escolaForm.endereco || `${escolaForm.logradouroNum || ''} - ${escolaForm.localidade || ''}`
    };
    if (editingEscola) {
      updateEscolaPnae(editingEscola.id, payload);
    } else {
      addEscolaPnae(payload);
    }
    setShowEscolaModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <FolderTree className="w-3.5 h-3.5" /> Módulo de Cadastros Base
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cadastros Unificados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie produtores rurais, produtos agrícolas, registros de produção, programas institucionais e escolas atendidas pelo PNAE.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'produtores' && (
            <>
              <button
                onClick={handleDeleteAllProdutores}
                className="px-4 py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir Tudo
              </button>
              <button
                onClick={() => handleOpenProdutor()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Novo Produtor / Programa
              </button>
            </>
          )}
          {activeTab === 'produtos' && (
            <>
              <button
                onClick={() => { if (!canWrite) { blockWriteAction(); return; } setImportProdutosFeedback(null); setImportProdutosPreview([]); setImportProdutosFileName(''); setShowImportProdutosModal(true); }}
                className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Importar Planilha (.xlsx)
              </button>
              <button
                onClick={() => handleOpenProduto()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Novo Produto Agrícola
              </button>
            </>
          )}
          {activeTab === 'programas' && (
            <button
              onClick={() => handleOpenPrograma()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Programa
            </button>
          )}
          {activeTab === 'escolas' && (
            <>
              <button
                onClick={() => { if (!canWrite) { blockWriteAction(); return; } setImportEscolasFeedback(null); setImportEscolasPreview([]); setImportEscolasFileName(''); setShowImportEscolasModal(true); }}
                className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Importar Planilha (.xlsx)
              </button>
              <button
                onClick={handleDeleteAllEscolas}
                className="px-4 py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir Tudo
              </button>
              <button
                onClick={() => handleOpenEscola()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nova Escola PNAE
              </button>
            </>
          )}
          {activeTab === 'motoristas' && (
            <button
              onClick={() => handleOpenMotorista()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Motorista
            </button>
          )}
        </div>
      </div>

      {/* Alerta Visual de Validade de CAF/DAP */}
      {totalAlertasCaf > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 animate-bounce">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                  Alerta de Validade CAF / DAP (Próximos 30 dias)
                </h3>
                {produtoresPrestesExpira.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-full font-bold">
                    ⚠️ {produtoresPrestesExpira.length} a vencer em ≤ 30 dias
                  </span>
                )}
                {produtoresExpirados.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 rounded-full font-bold">
                    ⛔ {produtoresExpirados.length} já expirada(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Existem <strong>{totalAlertasCaf} produtor(es)</strong> com documentação CAF/DAP necessitando de atenção para manutenção das entregas PAA/PNAE.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                setActiveTab('produtores');
                setFilterCafStatus('PRESTES_A_EXPIRAR');
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" /> Filtrar Tabela
            </button>
            <button
              onClick={() => setShowCafAlertModal(true)}
              className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" /> Lista de Notificações ({totalAlertasCaf})
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('produtores')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'produtores'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Produtor / Programa ({produtores.length})
          {totalAlertasCaf > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse inline-flex items-center gap-1 shadow-xs ml-1" title={`${totalAlertasCaf} produtores com CAF vencendo em breve ou vencidas`}>
              <AlertTriangle className="w-3 h-3" /> {totalAlertasCaf}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('produtos')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'produtos'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" /> Produtos Agropecuários ({produtos.length})
        </button>
        <button
          onClick={() => setActiveTab('programas')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'programas'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" /> Programas Governamentais ({programas.length})
        </button>
        <button
          onClick={() => setActiveTab('escolas')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'escolas'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Escolas Cadastradas ({escolasPnae.length})
        </button>
        <button
          onClick={() => setActiveTab('motoristas')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'motoristas'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" /> Motoristas ({motoristas.length})
        </button>
      </div>

      {/* Tab 1: Produtores Rurais */}
      {activeTab === 'produtores' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF/CNPJ ou CAF/DAP..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => {
                  syncCooperadosWithProdutores();
                  alert('Produtores rurais sincronizados com sucesso a partir do cadastro de cooperados!');
                }}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Sincronizar produtores a partir do cadastro do quadro social de cooperados"
              >
                <Users className="w-3.5 h-3.5" /> Sincronizar Cooperados
              </button>
              <button
                onClick={() => handleOpenProdutor()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Produtor
              </button>
            </div>
          </div>

          {/* Filtros Rápidos de Status CAF/DAP */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Status da CAF / DAP:
            </span>
            <button
              onClick={() => setFilterCafStatus('TODOS')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCafStatus === 'TODOS'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({produtoresComCafInfo.length})
            </button>
            <button
              onClick={() => setFilterCafStatus('PRESTES_A_EXPIRAR')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterCafStatus === 'PRESTES_A_EXPIRAR'
                  ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              ⚠️ Expira em ≤ 30 dias ({produtoresPrestesExpira.length})
            </button>
            <button
              onClick={() => setFilterCafStatus('EXPIRADO')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterCafStatus === 'EXPIRADO'
                  ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              ⛔ CAF Expirada ({produtoresExpirados.length})
            </button>
            <button
              onClick={() => setFilterCafStatus('VALIDO')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterCafStatus === 'VALIDO'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              ✓ CAF Válida ({produtoresComCafInfo.length - totalAlertasCaf})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3">Produtor / Propriedade</th>
                  <th className="p-3">CPF / CNPJ</th>
                  <th className="p-3">Nº CAF / DAP</th>
                  <th className="p-3">Localização</th>
                  <th className="p-3">Área (ha)</th>
                  <th className="p-3">Orgânico</th>
                  <th className="p-3">Validade / Status CAF</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtoresComCafInfo
                  .filter(p => {
                    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (p.cafDapNum && p.cafDapNum.toLowerCase().includes(searchTerm.toLowerCase())) || 
                      (p.cpfCnpj && p.cpfCnpj.includes(searchTerm));
                    const matchesCafFilter =
                      filterCafStatus === 'TODOS' ? true :
                      filterCafStatus === 'PRESTES_A_EXPIRAR' ? p.cafInfo.status === 'PRESTES_A_EXPIRAR' :
                      filterCafStatus === 'EXPIRADO' ? p.cafInfo.status === 'EXPIRADO' :
                      filterCafStatus === 'VALIDO' ? p.cafInfo.status === 'OK' : true;
                    return matchesSearch && matchesCafFilter;
                  })
                  .map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        {p.nome}
                        <div className="text-[10px] text-slate-500 font-normal">{p.nomePropriedade}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{p.cpfCnpj}</td>
                      <td className="p-3">
                        <div className="font-mono text-slate-800 font-bold">{p.cafDapNum || 'Sem Nº'}</div>
                        <div className="text-[10px] text-slate-500">Validade: {p.cafDapValidade || '2028-12-31'}</div>
                      </td>
                      <td className="p-3 text-slate-600">{p.municipio} / {p.uf}</td>
                      <td className="p-3 text-slate-700 font-medium">{p.areaHectares} ha</td>
                      <td className="p-3">
                        {p.certificacaoOrganica ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            Sim (Orgânico)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                            Convencional
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {p.cafInfo.status === 'EXPIRADO' ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[10px] inline-flex items-center gap-1 border border-rose-300">
                              <AlertCircle className="w-3 h-3" /> Expirada
                            </span>
                            <div className="text-[10px] text-rose-600 font-bold">{p.cafInfo.label}</div>
                          </div>
                        ) : p.cafInfo.status === 'PRESTES_A_EXPIRAR' ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[10px] inline-flex items-center gap-1 border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Vence em breve
                            </span>
                            <div className="text-[10px] text-amber-800 font-extrabold">{p.cafInfo.label}</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Válida
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono">{p.cafInfo.label}</div>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenProdutor(p)}
                            title="Editar Produtor"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-emerald-700 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!canWrite) { blockWriteAction(); return; }
                              if (confirm(`Deseja excluir o produtor ${p.nome}?`)) deleteProdutor(p.id);
                            }}
                            title="Excluir Produtor"
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Produtos Agropecuários */}
      {activeTab === 'produtos' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {produtos.map(p => (
              <div key={p.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                    {p.categoria}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">Un: {p.unidadeMedida}</span>
                    <button
                      onClick={() => handleOpenProduto(p)}
                      title="Editar Produto"
                      className="p-1 hover:bg-white rounded text-slate-600 hover:text-emerald-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (!canWrite) { blockWriteAction(); return; }
                        if (confirm(`Excluir o produto ${p.nome}?`)) deleteProduto(p.id);
                      }}
                      title="Excluir Produto"
                      className="p-1 hover:bg-white rounded text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">{p.nome}</h3>
                <div className="text-xs text-slate-600 flex justify-between pt-2 border-t border-slate-200">
                  <span>Preço PAA Ref:</span>
                  <span className="font-bold text-emerald-700">R$ {((p.precoReferencia ?? (p as any).precoReferenciaPaa) || 0).toFixed(2)}</span>
                </div>
                {!!p.pesoUnitario && (
                  <div className="text-xs text-slate-600 flex justify-between">
                    <span>Peso Unit.:</span>
                    <span className="font-bold text-slate-800">{p.pesoUnitario} KG</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-500">Sazonalidade: {p.descricao || 'Ano todo'}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${p.tipoProcessamento === 'BENEFICIADO' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {p.tipoProcessamento === 'BENEFICIADO' ? 'Beneficiado' : 'In Natura'}
                  </span>
                  {p.codigoNcm && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded">
                      NCM: {p.codigoNcm}
                    </span>
                  )}
                  {p.codigoConab && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                      CONAB: {p.codigoConab}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Programas Governamentais */}
      {activeTab === 'programas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programas.map(prog => (
            <div key={prog.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                  {prog.tipo}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">{prog.orgaoFinanciador || (prog as any).orgaoExecutor}</span>
                  <button
                    onClick={() => handleOpenPrograma(prog)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (!canWrite) { blockWriteAction(); return; }
                      if (confirm(`Deseja excluir o programa ${prog.nome}?`)) deletePrograma(prog.id);
                    }}
                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-base font-extrabold text-slate-900">{prog.nome}</h3>
              <p className="text-xs text-slate-600">{(prog as any).descricao || 'Programa governamental para aquisição de alimentos e merenda escolar.'}</p>
              <div className="pt-3 border-t border-slate-100 flex justify-between text-xs">
                <span className="text-slate-500">Teto por Produtor/Ano:</span>
                <span className="font-bold text-emerald-700">
                  R$ {(prog.limitePorProdutorAno || (prog as any).limiteAnualPorProdutor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Escolas PNAE */}
      {activeTab === 'escolas' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Escola / INEP</th>
                  <th className="p-3">Diretor Responsável</th>
                  <th className="p-3">Endereço / Contato</th>
                  <th className="p-3">Alunos Atendidos</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {escolasPnae.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-900">
                      {e.nomeEscola}
                      <div className="text-[10px] text-slate-500 font-mono font-normal">INEP: {e.inepCodigo}</div>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{e.diretorResponsavel}</td>
                    <td className="p-3 text-slate-600">
                      <div className="font-medium text-slate-800">{e.endereco}</div>
                      {e.pontoReferencia && (
                        <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                          Ref: {e.pontoReferencia}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-2 mt-1">
                        {e.latitude && e.longitude ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold hover:bg-rose-100 transition-colors"
                            title="Abrir localização no Google Maps"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            GPS: {Number(e.latitude).toFixed(4)}, {Number(e.longitude).toFixed(4)}
                          </a>
                        ) : null}
                        {e.telefone && <span>Tel: {e.telefone}</span>}
                        {e.celular && <span className="text-emerald-700 font-semibold">Cel/WA: {e.celular}</span>}
                        {e.email && <span className="text-slate-600">Email: {e.email}</span>}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-emerald-700">{e.alunosAtendidos} alunos</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEscola(e)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canWrite) { blockWriteAction(); return; }
                            if (confirm(`Deseja excluir a escola ${e.nomeEscola}?`)) deleteEscolaPnae(e.id);
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Motoristas */}
      {activeTab === 'motoristas' && (
        <div className="space-y-4">
          <PortalShareBanner
            portalId="app-motorista"
            customTitle="App do Motorista & Logística"
            customSubtitle="Compartilhe este link com os motoristas cadastrados abaixo para que acessem as rotas e romaneios de entrega pelo celular."
          />

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="p-3">Nome</th>
                    <th className="p-3">Telefone</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Veículo Padrão</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Entregas Vinculadas</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {motoristas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Nenhum motorista cadastrado. Clique em "Novo Motorista" ou compartilhe o link do App do Motorista acima para que ele se cadastre.
                      </td>
                    </tr>
                  ) : motoristas.map(m => {
                    const entregas = getEntregasDoMotorista(m);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900">{m.nome}</td>
                        <td className="p-3 text-slate-700">
                          {m.telefone ? (
                            <span className="inline-flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {m.telefone}</span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="p-3 text-slate-700">
                          <span className="inline-flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /> {m.email}</span>
                        </td>
                        <td className="p-3 text-slate-600">{m.veiculoPadrao || <span className="text-slate-300">—</span>}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            m.ativo === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {m.ativo === false ? 'Inativo' : 'Ativo'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setShowEntregasMotoristaId(m.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg font-bold text-[11px] border border-purple-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={entregas.length === 0}
                            title={entregas.length === 0 ? 'Nenhuma entrega vinculada ainda' : 'Ver romaneios/entregas deste motorista'}
                          >
                            <PackageCheck className="w-3.5 h-3.5" /> {entregas.length}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenMotorista(m)}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (!canWrite) { blockWriteAction(); return; }
                                if (entregas.length > 0) {
                                  alert(`Não é possível excluir: existem ${entregas.length} entrega(s)/romaneio(s) vinculados a este motorista.`);
                                  return;
                                }
                                if (confirm(`Deseja excluir o motorista ${m.nome}?`)) deleteMotorista(m.id);
                              }}
                              className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Produtor */}
      {showProdutorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-6xl w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-100 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingProdutor ? 'Editar Produtor Rural' : 'Novo Produtor Rural'}
              </h2>
              <button onClick={() => setShowProdutorModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProdutor} className="space-y-3 text-xs">
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80 mb-2">
                <label className="block text-emerald-900 font-bold mb-1">Vincular a Cooperado (Quadro Social)</label>
                <select
                  value={produtorForm.cooperadoId}
                  onChange={e => {
                    const coopId = e.target.value;
                    const c = cooperados.find(coop => coop.id === coopId);
                    if (c) {
                      const end = c.endereco || {};
                      const acc = (c as any).dadosAcessorios || {};
                      setProdutorForm({
                        ...produtorForm,
                        cooperadoId: c.id,
                        nome: c.nome,
                        cpfCnpj: c.cpf,
                        telefone: c.celular || c.telefone || produtorForm.telefone || '(85) 99888-0000',
                        municipio: end.cidade || (c as any).cidade || 'Trairi',
                        uf: end.uf || (c as any).estado || 'CE',
                        comunidade: end.bairro || end.logradouro || (c as any).bairro || 'Zona Rural',
                        nomePropriedade: acc.nomePropriedade || `Sítio / Propriedade ${c.nome.split(' ')[0]}`,
                        cafDapNum: acc.cafDap || acc.dap || `CAF-${c.id.slice(-4)}-2026`,
                        areaHectares: acc.areaHectares || 15
                      });
                    } else {
                      setProdutorForm({ ...produtorForm, cooperadoId: '' });
                    }
                  }}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Produtor não vinculado / Cadastrar manualmente --</option>
                  {cooperados.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.matricula} - {c.nome} (CPF: {c.cpf})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-emerald-700 mt-1">
                  Ao selecionar um cooperado, o cadastro de produtor é vinculado e preenchido automaticamente com dados do quadro social.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nome Completo do Produtor *</label>
                  <input
                    type="text"
                    required
                    value={produtorForm.nome}
                    onChange={e => setProdutorForm({ ...produtorForm, nome: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nome da Propriedade Rural</label>
                  <input
                    type="text"
                    value={produtorForm.nomePropriedade}
                    onChange={e => setProdutorForm({ ...produtorForm, nomePropriedade: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                    placeholder="Sítio Boa Vista"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">CPF / CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={produtorForm.cpfCnpj}
                    onChange={e => setProdutorForm({ ...produtorForm, cpfCnpj: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl text-xs font-mono"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nº CAF / DAP *</label>
                  <input
                    type="text"
                    required
                    value={produtorForm.cafDapNum}
                    onChange={e => setProdutorForm({ ...produtorForm, cafDapNum: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl text-xs font-mono"
                    placeholder="DAP-SC-123456"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Validade CAF / DAP *</label>
                  <input
                    type="date"
                    required
                    value={produtorForm.cafDapValidade}
                    onChange={e => setProdutorForm({ ...produtorForm, cafDapValidade: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Município / UF</label>
                  <input
                    type="text"
                    value={produtorForm.municipio}
                    onChange={e => setProdutorForm({ ...produtorForm, municipio: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Polo (Escola / Região) *</label>
                  <select
                    value={produtorForm.polo}
                    onChange={e => setProdutorForm({ ...produtorForm, polo: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    {POLOS_PADRAO.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Área (Hectares)</label>
                  <input
                    type="number"
                    value={produtorForm.areaHectares}
                    onChange={e => setProdutorForm({ ...produtorForm, areaHectares: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="org"
                  checked={produtorForm.certificacaoOrganica}
                  onChange={e => setProdutorForm({ ...produtorForm, certificacaoOrganica: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="org" className="text-slate-700 font-semibold">Possui Certificação de Produção Orgânica</label>
              </div>

              {/* Localização Geográfica da Propriedade Rural */}
              <div className="pt-1">
                <GeoLocationPicker
                  latitude={produtorForm.latitude}
                  longitude={produtorForm.longitude}
                  pontoReferencia={produtorForm.pontoReferencia}
                  addressQuery={`${produtorForm.nomePropriedade ? produtorForm.nomePropriedade + ', ' : ''}${produtorForm.comunidade || ''} ${produtorForm.municipio || 'Trairi'} - ${produtorForm.uf || 'CE'}`}
                  onChange={(geo) => {
                    setProdutorForm(prev => ({
                      ...prev,
                      latitude: geo.latitude,
                      longitude: geo.longitude,
                      pontoReferencia: geo.pontoReferencia ?? prev.pontoReferencia
                    }));
                  }}
                  themeColor="emerald"
                  title="Localização Geográfica e Coordenadas GPS da Propriedade Rural"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProdutorModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Salvar Produtor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Produto */}
      {showProdutoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingProduto ? 'Editar Produto Agropecuário' : 'Novo Produto Agropecuário'}
              </h2>
              <button onClick={() => setShowProdutoModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProduto} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={produtoForm.nome}
                  onChange={e => {
                    const novoNome = e.target.value;
                    setProdutoForm(prev => ({ ...prev, nome: novoNome }));
                    atualizarCodigosFiscaisAuto(novoNome, produtoForm.categoria);
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Alface Crespa Orgânica"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Categoria</label>
                  <select
                    value={produtoForm.categoria}
                    onChange={e => {
                      const novaCategoria = e.target.value;
                      setProdutoForm(prev => ({ ...prev, categoria: novaCategoria as any }));
                      atualizarCodigosFiscaisAuto(produtoForm.nome, novaCategoria);
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  >
                    <option value="HORTIFRUTI">Hortifruti</option>
                    <option value="GRAOS">Grãos</option>
                    <option value="LATICINIOS">Laticínios</option>
                    <option value="PROCESSADOS">Processados</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unidade</label>
                  <select
                    value={produtoForm.unidadeMedida}
                    onChange={e => setProdutoForm({ ...produtoForm, unidadeMedida: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  >
                    <option value="KG">Quilograma (KG)</option>
                    <option value="DUZIA">Dúzia</option>
                    <option value="MACO">Maço</option>
                    <option value="CAIXA">Caixa</option>
                    <option value="LITRO">Litro</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">Códigos Fiscais (NCM / CONAB)</label>
                  {codigosAutoPreenchidos && (produtoForm.codigoNcm || produtoForm.codigoConab) && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Preenchido automaticamente
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold mb-1">Código NCM (SEFAZ)</label>
                    <input
                      type="text"
                      value={produtoForm.codigoNcm}
                      onChange={e => { setProdutoForm({ ...produtoForm, codigoNcm: e.target.value }); setCodigosAutoPreenchidos(false); }}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                      placeholder="0000.00.00"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold mb-1">Código CONAB</label>
                    <input
                      type="text"
                      value={produtoForm.codigoConab}
                      onChange={e => { setProdutoForm({ ...produtoForm, codigoConab: e.target.value }); setCodigosAutoPreenchidos(false); }}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                      placeholder="0000000"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Sugeridos automaticamente a partir do nome/categoria do produto. Ajuste manualmente se necessário — a alteração manual desativa o preenchimento automático até o nome ou categoria mudarem de novo.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Preço PAA Referência (R$)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={produtoForm.precoReferencia}
                    onChange={e => setProdutoForm({ ...produtoForm, precoReferencia: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Peso Unit. (KG)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={produtoForm.pesoUnitario}
                    onChange={e => setProdutoForm({ ...produtoForm, pesoUnitario: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    placeholder="Ex: 0.5"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Peso médio de 1 unidade — útil quando a unidade não é KG.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProdutoForm({ ...produtoForm, tipoProcessamento: 'IN_NATURA' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      produtoForm.tipoProcessamento === 'IN_NATURA'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    In Natura
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdutoForm({ ...produtoForm, tipoProcessamento: 'BENEFICIADO' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      produtoForm.tipoProcessamento === 'BENEFICIADO'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Beneficiado
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProdutoModal(false)}
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

      {/* Modal Programa */}
      {showProgramaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingPrograma ? 'Editar Programa Governamental' : 'Novo Programa Governamental'}
              </h2>
              <button onClick={() => setShowProgramaModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePrograma} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nome do Programa *</label>
                <input
                  type="text"
                  required
                  value={programaForm.nome}
                  onChange={e => setProgramaForm({ ...programaForm, nome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: PAA Doação Simultânea"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tipo</label>
                  <select
                    value={programaForm.tipo}
                    onChange={e => setProgramaForm({ ...programaForm, tipo: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  >
                    <option value="PAA">PAA</option>
                    <option value="PAA-PMT">PAA-PMT</option>
                    <option value="PAA-CONAB">PAA-CONAB</option>
                    <option value="PAA-SDA">PAA-SDA</option>
                    <option value="PNAE">PNAE</option>
                    <option value="PGPM">PGPM</option>
                    <option value="MERCADO_LIVRE">Mercado Livre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Órgão Executor</label>
                  <input
                    type="text"
                    value={programaForm.orgaoExecutor}
                    onChange={e => setProgramaForm({ ...programaForm, orgaoExecutor: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Teto Anual por Produtor (R$)</label>
                <input
                  type="number"
                  value={programaForm.limiteAnualPorProdutor}
                  onChange={e => setProgramaForm({ ...programaForm, limiteAnualPorProdutor: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProgramaModal(false)}
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

      {/* Modal Importar Planilha de Produtos (.xlsx) */}
      {showImportProdutosModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
                Importar Produtos via Planilha (.xlsx)
              </h2>
              <button onClick={() => setShowImportProdutosModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-600">
                Baixe o modelo, preencha uma linha por produto e importe de volta. Os códigos NCM (SEFAZ) e CONAB são
                preenchidos automaticamente para as linhas em que a planilha não os informar.
              </p>
              <button
                type="button"
                onClick={() => baixarModeloPlanilhaProdutos()}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Modelo
              </button>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl p-8 cursor-pointer transition-all text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleProdutosFileSelected(file);
                  e.target.value = '';
                }}
              />
              {importProdutosLoading ? (
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400" />
              )}
              <span className="text-sm font-bold text-slate-700">
                {importProdutosFileName || 'Clique para selecionar a planilha (.xlsx, .xls ou .csv)'}
              </span>
            </label>

            {importProdutosFeedback && (
              <div className={`p-3 rounded-xl text-xs font-medium border ${importProdutosFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {importProdutosFeedback.message}
              </div>
            )}

            {importProdutosPreview.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="p-2 font-bold text-slate-600">Nome</th>
                        <th className="p-2 font-bold text-slate-600">Categoria</th>
                        <th className="p-2 font-bold text-slate-600">Tipo</th>
                        <th className="p-2 font-bold text-slate-600 text-right">Peso Unit.</th>
                        <th className="p-2 font-bold text-slate-600">NCM</th>
                        <th className="p-2 font-bold text-slate-600">CONAB</th>
                        <th className="p-2 font-bold text-slate-600 text-right">Preço Ref.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importProdutosPreview.map((item, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="p-2 font-semibold text-slate-800">{item.nome}</td>
                          <td className="p-2 text-slate-600">{item.categoria}</td>
                          <td className="p-2 text-slate-600">{item.tipoProcessamento === 'BENEFICIADO' ? 'Beneficiado' : 'In Natura'}</td>
                          <td className="p-2 text-right text-slate-600">{item.pesoUnitario ? `${item.pesoUnitario} KG` : '—'}</td>
                          <td className="p-2 font-mono text-sky-700">
                            {item.codigoNcm}
                            {item.codigoAutoPreenchido && <Sparkles className="w-3 h-3 inline ml-1 text-emerald-600" />}
                          </td>
                          <td className="p-2 font-mono text-amber-700">{item.codigoConab}</td>
                          <td className="p-2 text-right text-slate-700">R$ {item.precoReferencia.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportProdutosModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importProdutosPreview.length === 0}
                onClick={handleConfirmImportProdutos}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Importar {importProdutosPreview.length > 0 ? `${importProdutosPreview.length} Produto(s)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Escola */}
      {showEscolaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-200 border-2 border-slate-300 rounded-3xl max-w-6xl w-full p-6 sm:p-8 shadow-2xl space-y-4 my-8 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-rose-800" />
                {editingEscola ? 'Editar Cadastro da Escola PNAE' : 'Novo Cadastro de Escola PNAE'}
              </h2>
              <button onClick={() => setShowEscolaModal(false)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-300 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEscola} className="space-y-3 text-xs">
              {/* Row 1: Local de Entrega & CNAE */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex-1 flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40">
                  Local de Entrega
                </div>
                <input
                  type="text"
                  required
                  value={escolaForm.localDeEntrega || escolaForm.nomeEscola}
                  onChange={e => setEscolaForm({ ...escolaForm, localDeEntrega: e.target.value, nomeEscola: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="Nome / Local de Entrega da Escola"
                />
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-20 justify-center">
                  CNAE
                </div>
                <input
                  type="text"
                  value={escolaForm.cnae}
                  onChange={e => setEscolaForm({ ...escolaForm, cnae: e.target.value })}
                  className="w-full sm:w-36 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="8512-1/00"
                />
              </div>

              {/* Row 2: RazaoSocial */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  RazaoSocial
                </div>
                <input
                  type="text"
                  required
                  value={escolaForm.razaoSocial}
                  onChange={e => setEscolaForm({ ...escolaForm, razaoSocial: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="Prefeitura Municipal / Razão Social"
                />
              </div>

              {/* Row 3: CNPJ & Logradouro_num */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  CNPJ
                </div>
                <input
                  type="text"
                  value={escolaForm.cnpj}
                  onChange={e => setEscolaForm({ ...escolaForm, cnpj: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="00.000.000/0001-00"
                />
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  Logradouro_num
                </div>
                <input
                  type="text"
                  value={escolaForm.logradouroNum}
                  onChange={e => setEscolaForm({ ...escolaForm, logradouroNum: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="Rua, Número"
                />
              </div>

              {/* Row 4: Localidade */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  Localidade:
                </div>
                <input
                  type="text"
                  value={escolaForm.localidade}
                  onChange={e => setEscolaForm({ ...escolaForm, localidade: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="Distrito / Município - CE"
                />
              </div>

              {/* Row 5: Nº Aluno & Polo */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  № Aluno
                </div>
                <input
                  type="number"
                  value={escolaForm.alunosAtendidos}
                  onChange={e => setEscolaForm({ ...escolaForm, alunosAtendidos: parseInt(e.target.value) || 0 })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner font-bold"
                />
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  Polo
                </div>
                <select
                  value={escolaForm.polo}
                  onChange={e => setEscolaForm({ ...escolaForm, polo: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner font-bold"
                >
                  {POLOS_PADRAO.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Row 6: Representante & TIPO */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  Representante:
                </div>
                <input
                  type="text"
                  value={escolaForm.representante}
                  onChange={e => setEscolaForm({ ...escolaForm, representante: e.target.value, diretorResponsavel: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="Nome do Diretor / Representante"
                />
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-24 justify-center">
                  TIPO
                </div>
                <input
                  type="text"
                  value={escolaForm.tipo}
                  onChange={e => setEscolaForm({ ...escolaForm, tipo: e.target.value })}
                  className="w-full sm:w-36 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="Municipal"
                />
              </div>

              {/* Row 7: CPF & RG */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  CPF:
                </div>
                <input
                  type="text"
                  value={escolaForm.cpf}
                  onChange={e => setEscolaForm({ ...escolaForm, cpf: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="000.000.000-00"
                />
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-24 justify-center">
                  RG
                </div>
                <input
                  type="text"
                  value={escolaForm.rg}
                  onChange={e => setEscolaForm({ ...escolaForm, rg: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="Registro Geral / Órgão"
                />
              </div>

              {/* Row 8: E-mail */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  E-mail
                </div>
                <input
                  type="email"
                  value={escolaForm.email}
                  onChange={e => setEscolaForm({ ...escolaForm, email: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="escola@trairi.ce.gov.br"
                />
              </div>

              {/* Row 9: Fone Escola & Fone Diretor */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-40 justify-center">
                  Fone Escola
                </div>
                <input
                  type="text"
                  value={escolaForm.telefone}
                  onChange={e => setEscolaForm({ ...escolaForm, telefone: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner"
                  placeholder="(85) 3351-0000"
                />
                <div className="flex items-center bg-rose-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-xs shrink-0 sm:w-32 justify-center">
                  Fone Diretor
                </div>
                <input
                  type="text"
                  value={escolaForm.celular}
                  onChange={e => setEscolaForm({ ...escolaForm, celular: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 shadow-inner font-bold text-emerald-900"
                  placeholder="(85) 99888-0000"
                />
              </div>

              {/* Localização Geográfica / Coordenadas GPS */}
              <div className="pt-2">
                <GeoLocationPicker
                  latitude={escolaForm.latitude}
                  longitude={escolaForm.longitude}
                  pontoReferencia={escolaForm.pontoReferencia}
                  addressQuery={`${escolaForm.nomeEscola ? escolaForm.nomeEscola + ', ' : ''}${escolaForm.logradouroNum || ''} ${escolaForm.localidade || 'Trairi - CE'}`}
                  onChange={(geo) => {
                    setEscolaForm(prev => ({
                      ...prev,
                      latitude: geo.latitude,
                      longitude: geo.longitude,
                      pontoReferencia: geo.pontoReferencia ?? prev.pontoReferencia
                    }));
                  }}
                  themeColor="rose"
                  title="Localização Geográfica e Coordenadas GPS da Escola / Local de Entrega"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-300">
                <button
                  type="button"
                  onClick={() => setShowEscolaModal(false)}
                  className="px-5 py-2.5 bg-slate-300 border border-slate-400 text-slate-700 rounded-xl font-bold hover:bg-slate-400 transition-all shadow-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-800 text-white rounded-xl font-extrabold hover:bg-rose-900 transition-all shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Salvar Escola
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Planilha de Escolas (.xlsx) */}
      {showImportEscolasModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-rose-800" />
                Importar Escolas PNAE via Planilha (.xlsx)
              </h2>
              <button onClick={() => setShowImportEscolasModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-600">
                Baixe o modelo, preencha uma linha por escola e importe de volta.
              </p>
              <button
                type="button"
                onClick={() => baixarModeloPlanilhaEscolas()}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Modelo
              </button>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-2xl p-8 cursor-pointer transition-all text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleEscolasFileSelected(file);
                  e.target.value = '';
                }}
              />
              {importEscolasLoading ? (
                <Loader2 className="w-8 h-8 text-rose-700 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400" />
              )}
              <span className="text-sm font-bold text-slate-700">
                {importEscolasFileName || 'Clique para selecionar a planilha (.xlsx, .xls ou .csv)'}
              </span>
            </label>

            {importEscolasFeedback && (
              <div className={`p-3 rounded-xl text-xs font-medium border ${importEscolasFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {importEscolasFeedback.message}
              </div>
            )}

            {importEscolasPreview.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="p-2 font-bold text-slate-600">Escola</th>
                        <th className="p-2 font-bold text-slate-600">INEP</th>
                        <th className="p-2 font-bold text-slate-600">Polo</th>
                        <th className="p-2 font-bold text-slate-600 text-right">Alunos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importEscolasPreview.map((item, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="p-2 font-semibold text-slate-800">{item.nomeEscola}</td>
                          <td className="p-2 text-slate-600 font-mono">{item.inepCodigo}</td>
                          <td className="p-2 text-slate-600">{item.polo}</td>
                          <td className="p-2 text-right text-slate-700">{item.alunosAtendidos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportEscolasModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importEscolasPreview.length === 0}
                onClick={handleConfirmImportEscolas}
                className="px-4 py-2 bg-rose-800 text-white rounded-xl font-bold hover:bg-rose-900 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Importar {importEscolasPreview.length > 0 ? `${importEscolasPreview.length} Escola(s)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cooperado */}
      {showCooperadoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingCooperado ? 'Editar Cadastro do Cooperado' : 'Novo Cooperado'}
              </h2>
              <button onClick={() => setShowCooperadoModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCooperado} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Matrícula *</label>
                  <input
                    type="text"
                    required
                    value={cooperadoForm.matricula}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, matricula: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={cooperadoForm.nome}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, nome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                    placeholder="Ex: João da Silva"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">CPF *</label>
                  <input
                    type="text"
                    required
                    value={cooperadoForm.cpf}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, cpf: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">RG</label>
                  <input
                    type="text"
                    value={cooperadoForm.rg}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, rg: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Situação Cadastral</label>
                  <select
                    value={cooperadoForm.situacao}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, situacao: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                    <option value="SUSPENSO">Suspenso</option>
                    <option value="DEMITIDO">Demitido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Celular / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={cooperadoForm.celular}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, celular: e.target.value, whatsapp: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-emerald-900"
                    placeholder="(85) 99999-0000"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={cooperadoForm.email}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    placeholder="cooperado@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cidade</label>
                  <input
                    type="text"
                    value={cooperadoForm.cidade}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, cidade: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">UF</label>
                  <input
                    type="text"
                    value={cooperadoForm.estado}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, estado: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">CEP</label>
                  <input
                    type="text"
                    value={cooperadoForm.cep}
                    onChange={e => setCooperadoForm({ ...cooperadoForm, cep: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Localização Geográfica do Cooperado */}
              <div className="pt-2">
                <GeoLocationPicker
                  latitude={cooperadoForm.latitude}
                  longitude={cooperadoForm.longitude}
                  pontoReferencia={cooperadoForm.pontoReferencia}
                  addressQuery={`${cooperadoForm.logradouro || ''} ${cooperadoForm.numero || ''}, ${cooperadoForm.bairro || ''}, ${cooperadoForm.cidade || 'Trairi'} - ${cooperadoForm.estado || 'CE'}, ${cooperadoForm.cep || ''}`}
                  onChange={(geo) => {
                    setCooperadoForm(prev => ({
                      ...prev,
                      latitude: geo.latitude,
                      longitude: geo.longitude,
                      pontoReferencia: geo.pontoReferencia ?? prev.pontoReferencia
                    }));
                  }}
                  themeColor="emerald"
                  title="Localização Geográfica e Coordenadas GPS da Propriedade / Residência do Cooperado"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCooperadoModal(false)}
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

      {/* Modal de Notificação Visual de Validade CAF/DAP */}
      {showCafAlertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
                  <Bell className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Notificações e Alertas de Validade CAF / DAP</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Produtores com CAF/DAP vencendo em até 30 dias ou com prazo de validade já expirado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCafAlertModal(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo dos Alertas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-black text-amber-900">{produtoresPrestesExpira.length}</div>
                  <div className="text-[11px] font-bold text-amber-800">A vencer em ≤ 30 dias</div>
                </div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-rose-600 text-white rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-black text-rose-900">{produtoresExpirados.length}</div>
                  <div className="text-[11px] font-bold text-rose-800">CAF Expiradas</div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-slate-700 text-white rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">{totalAlertasCaf}</div>
                  <div className="text-[11px] font-bold text-slate-600">Total de Alertas</div>
                </div>
              </div>
            </div>

            {/* Lista de Alertas */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Relação de Produtores que Requerem Renovação ({totalAlertasCaf})
              </h4>

              {totalAlertasCaf === 0 ? (
                <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-bold text-emerald-900 text-sm">Nenhum produtor com CAF em risco de expiração nos próximos 30 dias!</p>
                  <p className="text-xs text-emerald-700">Todas as CAFs/DAPs estão atualizadas e dentro do prazo regular.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...produtoresExpirados, ...produtoresPrestesExpira].map(p => {
                    const messageText = `Olá, ${p.nome}! Lembramos que a validade da sua CAF/DAP nº ${p.cafDapNum || 'S/N'} vence em ${p.cafDapValidade || 'breve'} (${p.cafInfo.label}). Favor providenciar a renovação junto à Cooperativa para manter seu cadastro apto para o PAA/PNAE.`;
                    const isCopied = copiedNotificationId === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          p.cafInfo.status === 'EXPIRADO'
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-amber-50/50 border-amber-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm">{p.nome}</span>
                              {p.cafInfo.status === 'EXPIRADO' ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-[10px] inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Expirou há {Math.abs(p.cafInfo.daysLeft)} dia(s)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-extrabold text-[10px] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Expira em {p.cafInfo.daysLeft} dia(s)
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 font-medium flex flex-wrap gap-x-4 gap-y-1">
                              <span><strong>Propriedade:</strong> {p.nomePropriedade || 'Não informada'}</span>
                              <span><strong>CPF:</strong> {p.cpfCnpj}</span>
                              <span><strong>Nº CAF:</strong> <span className="font-mono">{p.cafDapNum || 'S/N'}</span></span>
                              <span><strong>Validade:</strong> <span className="font-bold">{p.cafDapValidade || 'S/D'}</span></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(messageText);
                                setCopiedNotificationId(p.id);
                                setTimeout(() => setCopiedNotificationId(null), 2500);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                              title="Copiar mensagem formatada para enviar via WhatsApp ou Email ao produtor"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Mensagem Copiada!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> Copiar Aviso WA
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setShowCafAlertModal(false);
                                handleOpenProdutor(p);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCafAlertModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar Notificações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Motorista */}
      {showMotoristaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingMotorista ? 'Editar Motorista' : 'Novo Motorista'}
              </h2>
              <button onClick={() => setShowMotoristaModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMotorista} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={motoristaForm.nome}
                  onChange={e => setMotoristaForm({ ...motoristaForm, nome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Reginaldo de Castro"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={motoristaForm.telefone}
                    onChange={e => setMotoristaForm({ ...motoristaForm, telefone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    placeholder="(85) 99999-0000"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={motoristaForm.email}
                    onChange={e => setMotoristaForm({ ...motoristaForm, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    placeholder="motorista@cooperativa.com.br"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Usado pelo motorista para acessar o App do Motorista.</p>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Veículo Padrão</label>
                <input
                  type="text"
                  value={motoristaForm.veiculoPadrao}
                  onChange={e => setMotoristaForm({ ...motoristaForm, veiculoPadrao: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: PMN-4A92 (Caminhão Baú)"
                />
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={motoristaForm.ativo}
                  onChange={e => setMotoristaForm({ ...motoristaForm, ativo: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="font-semibold text-slate-700">Motorista ativo</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMotoristaModal(false)}
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

      {/* Modal Entregas Vinculadas ao Motorista */}
      {showEntregasMotoristaId && (() => {
        const motorista = motoristas.find(m => m.id === showEntregasMotoristaId);
        if (!motorista) return null;
        const entregas = getEntregasDoMotorista(motorista);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Entregas de {motorista.nome}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Romaneios de carga e rotas vinculados a este motorista.</p>
                </div>
                <button onClick={() => setShowEntregasMotoristaId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {entregas.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-6">Nenhuma entrega vinculada.</p>
                ) : entregas.map(r => (
                  <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{r.numeroRomaneio}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        r.statusRota === 'ENTREGUE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.statusRota}
                      </span>
                    </div>
                    <div className="text-slate-600">Rota: <span className="font-semibold text-slate-800">{r.rotaNome}</span></div>
                    <div className="text-slate-600">Veículo: <span className="font-semibold text-slate-800">{r.veiculoPlaca}</span> · Carga: <span className="font-semibold text-emerald-700">{r.totalCargaKg} Kg</span></div>
                    <div className="text-slate-500 text-[11px]">{r.paradas.length} parada(s) — {r.paradas.filter(p => p.concluido).length} concluída(s)</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEntregasMotoristaId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
