import React, { useState, useEffect, useRef } from 'react';
import { useCoop } from '../context/CoopContext';
import { UserRole, PermissionLevel, SystemToolModule, User as UserType, WebhookEndpoint, WebhookEvent } from '../types';
import {
  executeFirebaseBackup,
  getBackupHistory,
  getLastBackupTimestamp,
  isWeeklyBackupEnabled,
  setWeeklyBackupEnabled,
  downloadCSVLocally,
  generateCooperadosCSV,
  generateSisFinTransacoesCSV,
  BackupHistoryItem,
  fetchFirestoreBackupHistory
} from '../services/firebaseBackupService';
import {
  checkFirestoreDatabaseConnection,
  syncEntireDatabaseToFirestore,
  migrateLegacyDocsToTenant,
  MigrationResult,
  FirestoreStatusResult
} from '../services/firebaseDbService';
import { GooglePickerButton } from '../components/GooglePickerButton';
import { PickedGoogleFile } from '../services/googlePickerService';
import {
  Settings,
  Users,
  User,
  UserCheck,
  UserPlus,
  Building,
  Sliders,
  Database,
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Save,
  RotateCcw,
  Plus,
  Key,
  CheckCircle2,
  Lock,
  Unlock,
  Upload,
  Image as ImageIcon,
  X,
  MapPin,
  Mail,
  Phone,
  Search,
  Webhook,
  Globe,
  Send,
  Copy,
  Check,
  Code,
  Trash2,
  Edit3,
  Play,
  RefreshCw,
  Zap,
  AlertCircle,
  Eye,
  EyeOff,
  Terminal,
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  FileSpreadsheet,
  Clock,
  Calendar,
  FileText,
  ExternalLink,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Layers,
  Info,
  HelpCircle,
  Filter
} from 'lucide-react';

interface Props {
  initialTab?: 'meu-perfil' | 'usuarios' | 'permissoes' | 'integracoes' | 'webhooks' | 'auditoria' | 'backup';
}

const SYSTEM_MODULES_LIST: { id: SystemToolModule; label: string; category: string; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard Central', category: 'Núcleo & Governança', description: 'Visão geral com KPIs, gráficos e atalhos estratégicos' },
  { id: 'cadastro-cooperativa', label: 'Cadastro da Cooperativa', category: 'Núcleo & Governança', description: 'Dados cadastrais, CNPJ, cota-parte e logo da sede' },
  { id: 'cadastros', label: 'Cadastros Unificados', category: 'Núcleo & Governança', description: 'Atribuição unificada e tabelas gerais do sistema' },
  { id: 'cooperados', label: 'Quadro Social (Cooperados)', category: 'Núcleo & Governança', description: 'Gestão do livro de sócios, documentos, DAP/CAF e endereço' },
  { id: 'capital', label: 'Capital Social', category: 'Núcleo & Governança', description: 'Subscrição, integralização, carnês e saldo de cotas-partes' },
  { id: 'assembleias', label: 'Assembleias & Votações', category: 'Núcleo & Governança', description: 'Convocatórias, ata eletrônica, presenças e votação com pautas' },
  { id: 'diretoria', label: 'Diretoria & Conselhos', category: 'Núcleo & Governança', description: 'Mandatos vigentes, conselhos de administração e fiscal' },

  { id: 'sisgepa', label: 'SisGepa (PAA / PNAE)', category: 'Sistemas Especializados', description: 'Mapeamento de chamadas públicas, propostas, cotas e entregas' },
  { id: 'fiscal', label: 'Notas Fiscais (SEFAZ)', category: 'Sistemas Especializados', description: 'Emissão, transmissão e consulta de NF-e/NFC-e Ceará' },
  { id: 'siscont', label: 'SisCont (Contabilidade)', category: 'Sistemas Especializados', description: 'Plano de contas, livro diário, razão e DRE cooperativo' },
  { id: 'sisfin', label: 'SisFin (Financeiro)', category: 'Sistemas Especializados', description: 'Contas a pagar/receber, conciliação bancária e fluxo de caixa' },
  { id: 'compras', label: 'SisCompras', category: 'Sistemas Especializados', description: 'Cotações de fornecedores, ordens de compra e aprovações' },
  { id: 'estoque', label: 'SisEstoque', category: 'Sistemas Especializados', description: 'Controle de almoxarifado, entradas, saídas e inventário' },
  { id: 'rh', label: 'SisRH (Recursos Humanos)', category: 'Sistemas Especializados', description: 'Ficha de colaboradores, folha de pagamento e holerites' },
  { id: 'bi', label: 'SisBI (Analytics)', category: 'Sistemas Especializados', description: 'Indicadores gerenciais, gráficos interativos e projeções' },

  { id: 'portal-cooperado', label: 'Portal do Cooperado', category: 'Portais & Aplicativos', description: 'Área do sócio para extrato de cotas e notas de entrega' },
  { id: 'portal-escola', label: 'Portal da Escola (PNAE)', category: 'Portais & Aplicativos', description: 'Recebimento de merenda, prestação de contas e cardápios' },
  { id: 'app-produtor', label: 'App do Produtor Rural', category: 'Portais & Aplicativos', description: 'Registro de colheita, estimativa de safra e chamados' },
  { id: 'app-motorista', label: 'App do Motorista', category: 'Portais & Aplicativos', description: 'Rotas de transporte, romaneio e comprovante de entrega' },

  { id: 'relatorios', label: 'Relatórios Gerenciais', category: 'Gerencial & Sistema', description: 'Exportação de relatórios em PDF, Excel e relatórios da junta' },
  { id: 'backup-sistema', label: 'Backup & Banco de Dados', category: 'Gerencial & Sistema', description: 'Cópia no Supabase, backups automáticos e restauração' },
  { id: 'configuracoes', label: 'Configurações Globais', category: 'Gerencial & Sistema', description: 'Integrações, webhooks, LGPD e gestão de usuários/permissões' }
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'
];

const ALL_ROLES_LIST: { role: UserRole; label: string; description: string; badgeColor: string }[] = [
  { role: 'ADMIN', label: 'Administrador / Criador', description: 'Acesso total e irrestrito a todas as ferramentas e configurações do sistema', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { role: 'PRESIDENTE', label: 'Presidente da Cooperativa', description: 'Gestão estratégica, relatórios gerenciais, atas e convocações de assembleias', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { role: 'DIRETOR_FINANCEIRO', label: 'Diretor Financeiro', description: 'Controle de capital social, fluxo de caixa, contas e contabilidade', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  { role: 'GERENTE', label: 'Gerente Geral / Operacional', description: 'Supervisão de operações, compras, estoque, quadro social e RH', badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  { role: 'SECRETARIA', label: 'Secretaria & Atendimento', description: 'Atendimento aos sócios, atas, documentos e cadastro de cooperados', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { role: 'FINANCEIRO', label: 'Analista Financeiro / Tesouraria', description: 'Lançamentos de caixa, pagamentos, recebimentos e emissão de notas', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
  { role: 'CONTADOR', label: 'Contador / Contabilidade', description: 'Plano de contas, DRE, balancetes, livros contábeis e notas fiscais', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
  { role: 'TECNICO', label: 'Técnico Agrícola / PAA', description: 'Gestão de projetos PAA/PNAE, visitas técnicas e chamadas públicas', badgeColor: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300' },
  { role: 'AUDITORIA', label: 'Auditoria & Conselho Fiscal', description: 'Acesso de fiscalização, relatórios de auditoria e logs de alterações', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  { role: 'COOPERADO', label: 'Cooperado / Produtor Sócio', description: 'Acesso restrito ao Portal do Cooperado e App do Produtor Rural', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  { role: 'MOTORISTA', label: 'Motorista de Logística', description: 'Acesso restrito ao App do Motorista para romaneios de entrega', badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  { role: 'ESCOLA', label: 'Gestor Escolar (PNAE)', description: 'Acesso restrito ao Portal da Escola para conferência de merenda', badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' },
  { role: 'FORNECEDOR', label: 'Fornecedor Externo', description: 'Consulta de ordens de compra e cotações de insumos', badgeColor: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300' },
  { role: 'CONSULTA', label: 'Perfil de Leitura / Consulta', description: 'Visualização geral dos módulos sem permissão para edições', badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
];

export const ConfiguracoesView: React.FC<Props> = ({ initialTab = 'meu-perfil' }) => {
  const {
    config,
    updateConfig,
    auditoriaLogs,
    addAuditLog,
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    updateCurrentUserProfile,
    rolePermissions,
    updateRolePermission,
    resetDefaultPermissions,
    getEffectivePermission,
    restoreDefaultData,
    exportBackupJson,
    importBackupJson,
    currentTenant,
    updateTenant,
    fetchAddressByCep,
    webhooks,
    addWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    cooperados,
    contasPagarReceber,
    canWriteModule
  } = useCoop();

  const isSystemCreator = currentUser?.role === 'ADMIN';
  // Nível de permissão do usuário logado para o módulo Configurações.
  // Sem essa checagem, qualquer usuário com acesso de leitura à página (só
  // para VISUALIZAR) conseguia mesmo assim editar cargo/permissões de
  // outros usuários, cadastrar webhooks e alterar configurações do sistema
  // — a página só verificava se o menu estava visível, nunca se a ação de
  // escrita era permitida.
  const canWrite = canWriteModule('configuracoes');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'meu-perfil' | 'usuarios' | 'permissoes' | 'integracoes' | 'webhooks' | 'auditoria' | 'backup'>(() => {
    return initialTab || 'meu-perfil';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Meu Perfil State & Form
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '(85) 98877-6655',
    cpf: currentUser?.cpf || '123.456.789-00',
    cargo: currentUser?.cargo || 'Gestor Operacional',
    departamento: currentUser?.departamento || 'Administração Central',
    bio: currentUser?.bio || 'Responsável pela gestão técnica e administrativa da cooperativa.',
    avatar: currentUser?.avatar || PRESET_AVATARS[0]
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '(85) 98877-6655',
        cpf: currentUser.cpf || '123.456.789-00',
        cargo: currentUser.cargo || 'Gestor Operacional',
        departamento: currentUser.departamento || 'Administração Central',
        bio: currentUser.bio || 'Responsável pela gestão técnica e administrativa da cooperativa.',
        avatar: currentUser.avatar || PRESET_AVATARS[0]
      });
    }
  }, [currentUser]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      cpf: profileForm.cpf,
      cargo: profileForm.cargo,
      departamento: profileForm.departamento,
      bio: profileForm.bio,
      avatar: profileForm.avatar
    });
    setProfileMsg({ type: 'success', text: 'Seu perfil de usuário foi salvo com sucesso!' });
    setTimeout(() => setProfileMsg(null), 4000);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'A nova senha deve possuir pelo menos 6 caracteres.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPassMsg({ type: 'error', text: 'A confirmação de senha não corresponde à nova senha.' });
      return;
    }
    updateCurrentUserProfile({
      password: passwordForm.newPassword
    });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPassMsg({ type: 'success', text: 'Sua senha foi alterada com sucesso!' });
    setTimeout(() => setPassMsg(null), 4000);
  };

  // User Management State
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'TODOS' | UserRole>('TODOS');
  const [userStatusFilter, setUserStatusFilter] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userModalTab, setUserModalTab] = useState<'dados' | 'permissoes'>('dados');

  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: UserRole;
    cargo: string;
    departamento: string;
    phone: string;
    cpf: string;
    active: boolean;
    password: string;
    avatar: string;
    customPermissions: Partial<Record<SystemToolModule, PermissionLevel>>;
  }>({
    name: '',
    email: '',
    role: 'SECRETARIA',
    cargo: '',
    departamento: '',
    phone: '',
    cpf: '',
    active: true,
    password: '',
    avatar: PRESET_AVATARS[0],
    customPermissions: {}
  });

  const handleOpenAddUserModal = () => {
    setEditingUser(null);
    setUserModalTab('dados');
    setUserForm({
      name: '',
      email: '',
      role: 'SECRETARIA',
      cargo: 'Atendente da Secretaria',
      departamento: 'Atendimento e Sócios',
      phone: '',
      cpf: '',
      active: true,
      password: '123',
      avatar: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
      customPermissions: {}
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (u: UserType) => {
    setEditingUser(u);
    setUserModalTab('dados');
    setUserForm({
      name: u.name || '',
      email: u.email || '',
      role: u.role,
      cargo: u.cargo || '',
      departamento: u.departamento || '',
      phone: u.phone || '',
      cpf: u.cpf || '',
      active: u.active ?? true,
      password: u.password || '',
      avatar: u.avatar || PRESET_AVATARS[0],
      customPermissions: u.customPermissions || {}
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUserModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!userForm.name.trim() || !userForm.email.trim()) {
      alert('Nome e E-mail são campos obrigatórios.');
      return;
    }
    if (editingUser) {
      updateUser(editingUser.id, {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        cargo: userForm.cargo,
        departamento: userForm.departamento,
        phone: userForm.phone,
        cpf: userForm.cpf,
        active: userForm.active,
        password: userForm.password,
        avatar: userForm.avatar,
        customPermissions: userForm.customPermissions
      });
    } else {
      addUser({
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        cargo: userForm.cargo,
        departamento: userForm.departamento,
        phone: userForm.phone,
        cpf: userForm.cpf,
        active: userForm.active,
        password: userForm.password || '123456',
        avatar: userForm.avatar,
        customPermissions: userForm.customPermissions
      });
    }
    setIsUserModalOpen(false);
  };

  const filteredUsersList = users.filter(u => {
    const searchLower = userSearchTerm.toLowerCase();
    const matchesSearch = !userSearchTerm || 
      (u.name && u.name.toLowerCase().includes(searchLower)) ||
      (u.email && u.email.toLowerCase().includes(searchLower)) ||
      (u.cargo && u.cargo.toLowerCase().includes(searchLower)) ||
      (u.cpf && u.cpf.includes(searchLower));
    
    const matchesRole = userRoleFilter === 'TODOS' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'TODOS' || 
      (userStatusFilter === 'ATIVOS' && u.active !== false) ||
      (userStatusFilter === 'INATIVOS' && u.active === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Matrix RBAC State
  const [matrixRole, setMatrixRole] = useState<UserRole>('GERENTE');
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>('TODAS');

  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [backupStatusMessage, setBackupStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Supabase Backup State
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(isWeeklyBackupEnabled());
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>(getBackupHistory());
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(getLastBackupTimestamp());

  // Kiwify Webhook State & Handler
  const [kiwifyLogs, setKiwifyLogs] = useState<any[]>([]);
  const [activeSubs, setActiveSubs] = useState<any[]>([]);
  const [isLoadingKiwifyLogs, setIsLoadingKiwifyLogs] = useState(false);
  const [kiwifyTestMsg, setKiwifyTestMsg] = useState<string | null>(null);

  // Google Workspace & Picker State
  const [pickedDriveFiles, setPickedDriveFiles] = useState<PickedGoogleFile[]>([]);
  const [drivePickerSuccessMsg, setDrivePickerSuccessMsg] = useState<string | null>(null);

  const handleDriveFilesSelected = (files: PickedGoogleFile[]) => {
    if (files && files.length > 0) {
      setPickedDriveFiles(prev => [...files, ...prev]);
      setDrivePickerSuccessMsg(`${files.length} arquivo(s) selecionado(s) com sucesso via Google Picker!`);
      setTimeout(() => setDrivePickerSuccessMsg(null), 5000);
    }
  };

  const handleFetchKiwifyWebhookLogs = async () => {
    setIsLoadingKiwifyLogs(true);
    try {
      const res = await fetch('/api/webhooks/kiwify/history');
      if (res.ok) {
        const data = await res.json();
        setKiwifyLogs(data.logs || []);
        setActiveSubs(data.activeSubscriptions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingKiwifyLogs(false);
    }
  };

  useEffect(() => {
    handleFetchKiwifyWebhookLogs();
  }, []);

  const handleSimulateKiwifyWebhookInSettings = async () => {
    setKiwifyTestMsg('Enviando webhook de teste para Kiwify Listener...');
    try {
      const res = await fetch('/api/webhooks/kiwify/test-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: config.emailOficial || currentTenant?.email || 'diretoria@cooperativa.com.br',
          clientName: config.nomeCooperativa || currentTenant?.name || 'Cooperativa Central Agro',
          planType: 'ANUAL',
          transactionId: `KW-CONF-${Math.floor(100000 + Math.random() * 900000)}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setKiwifyTestMsg(`Sucesso! Webhook Kiwify processado e licença ${data.subscription.plan} ativada no Firebase Firestore.`);
        handleFetchKiwifyWebhookLogs();
      } else {
        setKiwifyTestMsg(`Erro: ${data.message}`);
      }
    } catch (err: any) {
      setKiwifyTestMsg(`Erro ao simular: ${err.message}`);
    }
  };

  const handleToggleAutoBackup = (enabled: boolean) => {
    setWeeklyBackupEnabled(enabled);
    setAutoBackupEnabled(enabled);
  };

  const handleExecuteFirebaseBackupNow = async () => {
    setIsBackupRunning(true);
    const result = await executeFirebaseBackup({
      cooperados,
      contasPagarReceber,
      tipo: 'MANUAL'
    });
    setIsBackupRunning(false);
    setBackupHistory(getBackupHistory());
    setLastBackupTime(getLastBackupTimestamp());

    if (result.success) {
      setBackupStatusMessage({ type: 'success', text: result.message });
    } else {
      setBackupStatusMessage({ type: 'error', text: result.message });
    }
  };

  // Webhooks State
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [webhookForm, setWebhookForm] = useState<{
    name: string;
    url: string;
    secretToken: string;
    events: WebhookEvent[];
    active: boolean;
  }>({
    name: '',
    url: '',
    secretToken: '',
    events: ['cooperado.created', 'capital.transaction'],
    active: true
  });

  const [expandedLogWebhookId, setExpandedLogWebhookId] = useState<string | null>(null);
  const [selectedTestEvent, setSelectedTestEvent] = useState<Record<string, WebhookEvent>>({});
  const [testRunning, setTestRunning] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string; statusCode: number }>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [copiedToken, setCopiedToken] = useState<Record<string, boolean>>({});
  const [showDocPayload, setShowDocPayload] = useState(false);


  const [coopForm, setCoopForm] = useState({
    nomeCooperativa: currentTenant?.name || config.nomeCooperativa || config.cooperativaNome || 'Cooperai',
    razaoSocial: currentTenant?.razaoSocial || config.razaoSocial || currentTenant?.name || 'Cooperativa Interativa Agro & Soluções Cooperai Ltda.',
    cnpj: currentTenant?.cnpj || config.cnpj || config.cooperativaCnpj || '06.591.085/0001-06',
    logoUrl: currentTenant?.logoUrl || config.logoUrl || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&auto=format&fit=crop&q=80',
    email: currentTenant?.email || config.emailOficial || 'contato@cooperai.coop.br',
    telefone: currentTenant?.telefone || config.telefoneOficial || '(11) 3456-7890',
    cep: currentTenant?.cep || config.enderecoSede?.cep || '01310-100',
    logradouro: currentTenant?.logradouro || config.enderecoSede?.logradouro || 'Avenida Paulista',
    numero: currentTenant?.numero || config.enderecoSede?.numero || '1000',
    bairro: currentTenant?.bairro || config.enderecoSede?.bairro || 'Bela Vista',
    cidade: currentTenant?.cidade || config.enderecoSede?.cidade || 'São Paulo',
    estado: currentTenant?.estado || config.enderecoSede?.estado || 'SP',
    cotaParteValor: currentTenant?.cotaParteValor ?? config.cotaParteValor ?? 100,
    cotaParteMinima: currentTenant?.cotaParteMinima ?? config.cotaParteMinima ?? 10,
    correcaoAnualPercent: config.correcaoAnualPercent || 4.5
  });

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreStatusResult | null>(null);
  const [isTestingFirestore, setIsTestingFirestore] = useState(false);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [syncFirestoreMessage, setSyncFirestoreMessage] = useState<{ success: boolean; message: string } | null>(null);

  const [isMigratingLegacy, setIsMigratingLegacy] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[] | null>(null);
  const [migrationMessage, setMigrationMessage] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestFirestore = async () => {
    setIsTestingFirestore(true);
    setSyncFirestoreMessage(null);
    const result = await checkFirestoreDatabaseConnection();
    setFirestoreStatus(result);
    setIsTestingFirestore(false);
  };

  const handleMigrateLegacyData = async () => {
    if (!currentTenant?.id) return;
    const confirmMsg = `Isto vai atribuir a cooperativa "${currentTenant.name}" (tenantId: ${currentTenant.id}) a TODOS os registros do Firestore que ainda não pertencem a nenhuma cooperativa (cooperados, transações de capital, contas financeiras, assembleias e backups "legados"). Esta ação altera dados diretamente no banco e não pode ser desfeita automaticamente. Deseja continuar?`;
    if (!window.confirm(confirmMsg)) return;

    setIsMigratingLegacy(true);
    setMigrationMessage(null);
    setMigrationResults(null);
    try {
      const result = await migrateLegacyDocsToTenant(currentTenant.id);
      setMigrationMessage({ success: result.success, message: result.message });
      setMigrationResults(result.results);
      addAuditLog('CONFIGURACOES', 'ALTERACAO', `Migração de dados legados do Firestore executada para a cooperativa ${currentTenant.name}. Resultado: ${result.message}`);
    } catch (e: any) {
      setMigrationMessage({ success: false, message: e?.message || 'Erro inesperado ao migrar dados legados.' });
    } finally {
      setIsMigratingLegacy(false);
    }
  };

  const handleSyncEntireDatabaseToFirestore = async () => {
    setIsSyncingFirestore(true);
    setSyncFirestoreMessage(null);
    const result = await syncEntireDatabaseToFirestore({
      cooperados,
      contasPagarReceber,
      transacoesCapital: [],
      assembleias: [],
      currentTenant: currentTenant || undefined
    });
    setSyncFirestoreMessage(result);
    setIsSyncingFirestore(false);
    // Refresh connection status counts
    const statusRes = await checkFirestoreDatabaseConnection();
    setFirestoreStatus(statusRes);
  };

  const presetLogos = [
    { label: 'Agronegócio', url: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120' },
    { label: 'Crédito', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120' },
    { label: 'Saúde / Médica', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=120' },
    { label: 'Transporte', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120' },
    { label: 'Trabalho / Geral', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120' },
  ];

  useEffect(() => {
    if (currentTenant) {
      setCoopForm({
        nomeCooperativa: currentTenant.name || config.nomeCooperativa || config.cooperativaNome || 'Cooperai',
        razaoSocial: currentTenant.razaoSocial || config.razaoSocial || currentTenant.name || 'Cooperativa Interativa Agro & Soluções Cooperai Ltda.',
        cnpj: currentTenant.cnpj || config.cnpj || config.cooperativaCnpj || '06.591.085/0001-06',
        logoUrl: currentTenant.logoUrl || config.logoUrl || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&auto=format&fit=crop&q=80',
        email: currentTenant.email || config.emailOficial || 'contato@cooperai.coop.br',
        telefone: currentTenant.telefone || config.telefoneOficial || '(11) 3456-7890',
        cep: currentTenant.cep || config.enderecoSede?.cep || '01310-100',
        logradouro: currentTenant.logradouro || config.enderecoSede?.logradouro || 'Avenida Paulista',
        numero: currentTenant.numero || config.enderecoSede?.numero || '1000',
        bairro: currentTenant.bairro || config.enderecoSede?.bairro || 'Bela Vista',
        cidade: currentTenant.cidade || config.enderecoSede?.cidade || 'São Paulo',
        estado: currentTenant.estado || config.enderecoSede?.estado || 'SP',
        cotaParteValor: currentTenant.cotaParteValor ?? config.cotaParteValor ?? 100,
        cotaParteMinima: currentTenant.cotaParteMinima ?? config.cotaParteMinima ?? 10,
        correcaoAnualPercent: config.correcaoAnualPercent || 4.5
      });
    }
  }, [currentTenant, config]);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP, SVG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('O tamanho máximo do arquivo de imagem é de 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCoopForm(prev => ({ ...prev, logoUrl: e.target?.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCepSearch = async () => {
    if (!coopForm.cep) return;
    setIsSearchingCep(true);
    const addr = await fetchAddressByCep(coopForm.cep);
    setIsSearchingCep(false);
    if (addr) {
      setCoopForm(prev => ({
        ...prev,
        logradouro: addr.logradouro || prev.logradouro,
        bairro: addr.bairro || prev.bairro,
        cidade: addr.cidade || prev.cidade,
        estado: addr.estado || prev.estado
      }));
    } else {
      alert('CEP não localizado.');
    }
  };

  const availableWebhookEvents: { id: WebhookEvent; label: string; desc: string }[] = [
    { id: 'cooperado.created', label: 'cooperado.created', desc: 'Novo cooperado cadastrado no SisCoope' },
    { id: 'cooperado.updated', label: 'cooperado.updated', desc: 'Alteração em dados de cooperado existente' },
    { id: 'capital.transaction', label: 'capital.transaction', desc: 'Subscrição, integralização ou devolução de capital' },
    { id: 'assembleia.created', label: 'assembleia.created', desc: 'Convocação ou criação de nova assembleia' },
    { id: 'diretoria.updated', label: 'diretoria.updated', desc: 'Posse ou alteração nos membros do mandato/diretoria' }
  ];

  const handleOpenNewWebhookModal = () => {
    setEditingWebhookId(null);
    setWebhookForm({
      name: '',
      url: '',
      secretToken: 'whsec_' + Math.random().toString(36).substring(2, 12) + Date.now().toString().slice(-4),
      events: ['cooperado.created', 'capital.transaction'],
      active: true
    });
    setIsWebhookModalOpen(true);
  };

  const handleOpenEditWebhookModal = (wh: WebhookEndpoint) => {
    setEditingWebhookId(wh.id);
    setWebhookForm({
      name: wh.name,
      url: wh.url,
      secretToken: wh.secretToken,
      events: wh.events,
      active: wh.active
    });
    setIsWebhookModalOpen(true);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
      alert('Informe o nome e a URL de destino do Webhook.');
      return;
    }

    if (editingWebhookId) {
      updateWebhook(editingWebhookId, webhookForm);
    } else {
      addWebhook(webhookForm);
    }

    setIsWebhookModalOpen(false);
  };

  const handleToggleEventInForm = (event: WebhookEvent) => {
    setWebhookForm(prev => {
      const exists = prev.events.includes(event);
      return {
        ...prev,
        events: exists ? prev.events.filter(e => e !== event) : [...prev.events, event]
      };
    });
  };

  const handleRunTestWebhook = async (webhookId: string) => {
    const eventToTest = selectedTestEvent[webhookId] || webhooks.find(w => w.id === webhookId)?.events[0] || 'cooperado.created';
    setTestRunning(prev => ({ ...prev, [webhookId]: true }));

    const result = await testWebhook(webhookId, eventToTest);

    setTestRunning(prev => ({ ...prev, [webhookId]: false }));
    setTestResult(prev => ({ ...prev, [webhookId]: result }));
  };

  const handleCopyToken = (webhookId: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(prev => ({ ...prev, [webhookId]: true }));
    setTimeout(() => {
      setCopiedToken(prev => ({ ...prev, [webhookId]: false }));
    }, 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    updateConfig({
      ...coopForm,
      nomeCooperativa: coopForm.nomeCooperativa,
      cooperativaNome: coopForm.nomeCooperativa,
      razaoSocial: coopForm.razaoSocial,
      cnpj: coopForm.cnpj,
      cooperativaCnpj: coopForm.cnpj,
      emailOficial: coopForm.email,
      telefoneOficial: coopForm.telefone,
      logoUrl: coopForm.logoUrl,
      cotaParteValor: Number(coopForm.cotaParteValor) || 100,
      cotaParteMinima: Number(coopForm.cotaParteMinima) || 10,
      enderecoSede: {
        cep: coopForm.cep,
        logradouro: coopForm.logradouro,
        numero: coopForm.numero,
        bairro: coopForm.bairro,
        cidade: coopForm.cidade,
        estado: coopForm.estado
      }
    });
    if (currentTenant?.id) {
      updateTenant(currentTenant.id, {
        name: coopForm.nomeCooperativa,
        razaoSocial: coopForm.razaoSocial,
        cnpj: coopForm.cnpj,
        email: coopForm.email,
        telefone: coopForm.telefone,
        cep: coopForm.cep,
        logradouro: coopForm.logradouro,
        numero: coopForm.numero,
        bairro: coopForm.bairro,
        cidade: coopForm.cidade,
        estado: coopForm.estado,
        cotaParteValor: Number(coopForm.cotaParteValor) || 100,
        cotaParteMinima: Number(coopForm.cotaParteMinima) || 10,
        logoUrl: coopForm.logoUrl
      });
    }
    alert('Dados da Cooperativa atualizados com sucesso!');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isSystemCreator ? 'Configurações do Sistema' : 'Backup & Gestão do Sistema'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isSystemCreator
              ? 'Integrações & APIs, Webhooks, trilha de auditoria LGPD e backup do sistema'
              : 'Cópias de segurança em nuvem (Supabase), exportação/importação JSON e downloads CSV'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-1 rounded-xl text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('meu-perfil')}
          className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'meu-perfil' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-500'
          }`}
        >
          <User className="w-4 h-4 text-emerald-600" /> Meu Perfil
        </button>

        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'usuarios' ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-500'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" /> Usuários ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('permissoes')}
          className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'permissoes' ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs' : 'text-slate-500'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-600" /> Permissões & RBAC
        </button>

        {isSystemCreator && (
          <>
            <button
              onClick={() => setActiveTab('integracoes')}
              className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'integracoes' ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Key className="w-4 h-4 text-purple-600" /> Integrações & APIs
            </button>

            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'webhooks' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Webhook className="w-4 h-4 text-indigo-600" /> Webhooks ({webhooks.length})
            </button>

            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'auditoria' ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Activity className="w-4 h-4 text-rose-600" /> Auditoria ({auditoriaLogs.length})
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 font-bold rounded-lg flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'backup' ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs' : 'text-slate-500'
          }`}
        >
          <Database className="w-4 h-4 text-amber-600" /> Backup & Sistema
        </button>
      </div>

      {/* TAB 1: MEU PERFIL */}
      {activeTab === 'meu-perfil' && (
        <div className="space-y-6 text-xs">
          {/* Card de Identificação */}
          <div className="p-6 bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <img
                src={profileForm.avatar}
                alt={currentUser.name}
                className="w-24 h-24 rounded-full border-4 border-white/20 object-cover shadow-md"
              />
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-400 border-2 border-emerald-900 rounded-full" title="Online no Sistema"></span>
            </div>

            <div className="space-y-2 text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h3 className="text-xl font-bold text-white">{currentUser.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-emerald-100/80 font-medium">{currentUser.email}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-emerald-200/70 text-[11px]">
                <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {profileForm.departamento}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {profileForm.phone}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {currentUser.lastLogin || 'Sessão Ativa'}</span>
              </div>
            </div>
          </div>

          {/* Form de Edição Pessoal & Foto */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" /> Informações Pessoais e Profissionais
                </h4>
                {profileMsg && (
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-md flex items-center gap-1.5 ${
                    profileMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> {profileMsg.text}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail de Acesso</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(85) 98877-6655"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CPF</label>
                    <input
                      type="text"
                      value={profileForm.cpf}
                      onChange={e => setProfileForm(p => ({ ...p, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cargo / Função Técnica</label>
                    <input
                      type="text"
                      value={profileForm.cargo}
                      onChange={e => setProfileForm(p => ({ ...p, cargo: e.target.value }))}
                      placeholder="Ex: Gerente Operacional / Diretor"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Departamento / Setor</label>
                    <input
                      type="text"
                      value={profileForm.departamento}
                      onChange={e => setProfileForm(p => ({ ...p, departamento: e.target.value }))}
                      placeholder="Ex: Diretoria / Atendimento"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Foto de Perfil</label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Preenchida automaticamente com a foto da sua conta do Google no login (quando disponível). Você também pode enviar uma foto do seu computador/celular, ou colar o link de uma imagem.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-all">
                      <Upload className="w-3.5 h-3.5" /> Enviar Foto do Dispositivo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            alert('A imagem deve ter no máximo 2MB. Escolha um arquivo menor.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setProfileForm(p => ({ ...p, avatar: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={profileForm.avatar}
                      onChange={e => setProfileForm(p => ({ ...p, avatar: e.target.value }))}
                      placeholder="ou cole aqui o link de uma foto (https://...)"
                      className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Avatar Presets */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">Escolher Avatar Pré-definido</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProfileForm(p => ({ ...p, avatar: url }))}
                        className={`p-0.5 rounded-full border-2 transition-all hover:scale-105 ${
                          profileForm.avatar === url ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Avatar ${idx}`} className="w-9 h-9 rounded-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Biografia / Observações</label>
                  <textarea
                    rows={2}
                    value={profileForm.bio}
                    onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Salvar Perfil
                  </button>
                </div>
              </form>
            </div>

            {/* Form de Alteração de Senha */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3 mb-3">
                  <Lock className="w-4 h-4 text-indigo-600" /> Alterar Senha de Acesso
                </h4>

                {passMsg && (
                  <div className={`p-3 rounded-lg text-[11px] font-bold mb-3 flex items-center gap-2 ${
                    passMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {passMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{passMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSavePassword} className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirmar Nova Senha</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Repita a nova senha"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4" /> Atualizar Minha Senha
                  </button>
                </form>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Dica de Segurança
                </span>
                <p>Sua senha criptografada protege todas as movimentações fiscais, bancárias e dados de sócios da cooperativa.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USUÁRIOS DO SISTEMA */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4 text-xs">
          {/* Header & Controls */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar usuário, e-mail ou cargo..."
                  value={userSearchTerm}
                  onChange={e => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="TODOS">Todos os Perfis</option>
                {ALL_ROLES_LIST.map(r => (
                  <option key={r.role} value={r.role}>{r.label}</option>
                ))}
              </select>

              <select
                value={userStatusFilter}
                onChange={e => setUserStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="TODOS">Status: Todos</option>
                <option value="ATIVOS">Apenas Ativos</option>
                <option value="INATIVOS">Apenas Inativos</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddUserModal}
              className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Cadastrar Usuário
            </button>
          </div>

          {/* Users List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsersList.map(u => {
              const roleInfo = ALL_ROLES_LIST.find(r => r.role === u.role) || {
                label: u.role,
                badgeColor: 'bg-slate-100 text-slate-800'
              };
              const isCurrentUser = u.id === currentUser.id;

              return (
                <div
                  key={u.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-white dark:bg-slate-800 ${
                    u.active === false
                      ? 'border-slate-200/50 dark:border-slate-700/50 opacity-60'
                      : 'border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar || PRESET_AVATARS[0]}
                        alt={u.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                          {u.name}
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                              Você
                            </span>
                          )}
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{u.email}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      u.active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {u.active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Perfil RBAC:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${roleInfo.badgeColor}`}>
                        {roleInfo.label}
                      </span>
                    </div>

                    {u.cargo && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Cargo / Função:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{u.cargo}</span>
                      </div>
                    )}

                    {u.departamento && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Setor:</span>
                        <span className="text-slate-600 dark:text-slate-400">{u.departamento}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Último Acesso:</span>
                      <span className="text-slate-500 dark:text-slate-400">{u.lastLogin || 'Não registrado'}</span>
                    </div>

                    {u.customPermissions && Object.keys(u.customPermissions).length > 0 && (
                      <div className="pt-1 flex items-center gap-1 text-amber-600 font-semibold text-[10px]">
                        <Sliders className="w-3 h-3" /> Possui {Object.keys(u.customPermissions).length} permissões personalizadas
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditUserModal(u)}
                      className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Editar & Permissões
                    </button>

                    <button
                      onClick={() => updateUser(u.id, { active: u.active === false ? true : false })}
                      title={u.active === false ? 'Ativar Conta' : 'Desativar Conta'}
                      className={`p-1.5 rounded-lg border transition-all ${
                        u.active === false ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50' : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {u.active === false ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>

                    {!isCurrentUser && (
                      <button
                        onClick={() => {
                          if (!canWrite) { blockWriteAction(); return; }
                          if (confirm(`Tem certeza que deseja excluir o usuário ${u.name}?`)) {
                            deleteUser(u.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MATRIZ DE PERMISSÕES (RBAC) */}
      {activeTab === 'permissoes' && (
        <div className="space-y-4 text-xs">
          {/* Controls Bar */}
          <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-500" /> Matriz de Controle de Acesso por Perfil (RBAC)
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  Defina os níveis de permissão padrão para cada cargo/perfil de usuário em todos os 22 módulos do SisCoope.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!isSystemCreator) { alert('Somente administradores podem restaurar a matriz de permissões.'); return; }
                  if (confirm('Deseja restaurar a matriz de permissões para os padrões do sistema SisCoope?')) {
                    resetDefaultPermissions();
                  }
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" /> Restaurar Padrões SisCoope
              </button>
            </div>

            {/* Role Picker Pills */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                Selecione o Perfil de Usuário para Visualizar / Configurar:
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES_LIST.map(r => {
                  const isSelected = matrixRole === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => setMatrixRole(r.role)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-102'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 pt-2 text-[11px]">
              <span className="font-bold text-slate-500">Filtrar por Categoria:</span>
              {['TODAS', 'Núcleo & Governança', 'Sistemas Especializados', 'Portais & Aplicativos', 'Gerencial & Sistema'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setMatrixCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    matrixCategoryFilter === cat ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Permissões do Perfil: <span className="text-amber-600 font-extrabold">{ALL_ROLES_LIST.find(r => r.role === matrixRole)?.label}</span>
              </h4>
              <span className="text-slate-500 text-[11px]">
                {ALL_ROLES_LIST.find(r => r.role === matrixRole)?.description}
              </span>
            </div>

            <div className="space-y-3">
              {SYSTEM_MODULES_LIST
                .filter(m => matrixCategoryFilter === 'TODAS' || m.category === matrixCategoryFilter)
                .map(m => {
                  const currentLevel = rolePermissions[matrixRole]?.[m.id] || 'READ';

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{m.label}</span>
                          <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-slate-200/70 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {m.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.description}</p>
                      </div>

                      {/* Permission Radio Segment Buttons */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                        <button
                          type="button"
                          onClick={() => { if (!isSystemCreator) { alert('Somente administradores podem alterar a matriz de permissões.'); return; } updateRolePermission(matrixRole, m.id, 'NONE'); }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 ${
                            currentLevel === 'NONE'
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-rose-600'
                          }`}
                        >
                          Sem Acesso
                        </button>

                        <button
                          type="button"
                          onClick={() => { if (!isSystemCreator) { alert('Somente administradores podem alterar a matriz de permissões.'); return; } updateRolePermission(matrixRole, m.id, 'READ'); }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 ${
                            currentLevel === 'READ'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-amber-600'
                          }`}
                        >
                          Visualizar
                        </button>

                        <button
                          type="button"
                          onClick={() => { if (!isSystemCreator) { alert('Somente administradores podem alterar a matriz de permissões.'); return; } updateRolePermission(matrixRole, m.id, 'WRITE'); }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 ${
                            currentLevel === 'WRITE'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-blue-600'
                          }`}
                        >
                          Editar & Gravar
                        </button>

                        <button
                          type="button"
                          onClick={() => { if (!isSystemCreator) { alert('Somente administradores podem alterar a matriz de permissões.'); return; } updateRolePermission(matrixRole, m.id, 'ADMIN'); }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 ${
                            currentLevel === 'ADMIN'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-purple-600'
                          }`}
                        >
                          Controle Total
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* USER CADASTRO/EDIÇÃO MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                {editingUser ? `Editar Usuário: ${editingUser.name}` : 'Cadastrar Novo Usuário do Sistema'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setUserModalTab('dados')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  userModalTab === 'dados' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                1. Dados Cadastrais
              </button>
              <button
                type="button"
                onClick={() => setUserModalTab('permissoes')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  userModalTab === 'permissoes' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                2. Permissões Especiais (Overrides)
              </button>
            </div>

            <form onSubmit={handleSaveUserModal} className="space-y-4 text-xs">
              {userModalTab === 'dados' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        value={userForm.name}
                        onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Carlos Eduardo Silva"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail de Acesso *</label>
                      <input
                        type="email"
                        value={userForm.email}
                        onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="usuario@cooperativa.com.br"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Perfil RBAC *</label>
                      <select
                        value={userForm.role}
                        onChange={e => setUserForm(p => ({ ...p, role: e.target.value as UserRole }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      >
                        {ALL_ROLES_LIST.map(r => (
                          <option key={r.role} value={r.role}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Senha de Acesso</label>
                      <input
                        type="text"
                        value={userForm.password}
                        onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Definir ou redefinir senha"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cargo / Função</label>
                      <input
                        type="text"
                        value={userForm.cargo}
                        onChange={e => setUserForm(p => ({ ...p, cargo: e.target.value }))}
                        placeholder="Ex: Atendente / Técnico"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Departamento / Setor</label>
                      <input
                        type="text"
                        value={userForm.departamento}
                        onChange={e => setUserForm(p => ({ ...p, departamento: e.target.value }))}
                        placeholder="Ex: Financeiro / Recepção"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={userForm.phone}
                        onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="(85) 99988-7766"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CPF</label>
                      <input
                        type="text"
                        value={userForm.cpf}
                        onChange={e => setUserForm(p => ({ ...p, cpf: e.target.value }))}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Foto de Perfil</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-all">
                        <Upload className="w-3.5 h-3.5" /> Enviar Foto
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              alert('A imagem deve ter no máximo 2MB. Escolha um arquivo menor.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              setUserForm(p => ({ ...p, avatar: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={userForm.avatar}
                        onChange={e => setUserForm(p => ({ ...p, avatar: e.target.value }))}
                        placeholder="ou cole aqui o link de uma foto"
                        className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Se o usuário fizer login com o Google, a foto da conta Google é usada automaticamente.</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="userActiveCheck"
                      checked={userForm.active}
                      onChange={e => setUserForm(p => ({ ...p, active: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="userActiveCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Conta Ativa e Habilitada no Sistema
                    </label>
                  </div>
                </div>
              )}

              {userModalTab === 'permissoes' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 text-amber-800 dark:text-amber-300 text-[11px] space-y-1">
                    <span className="font-bold flex items-center gap-1"><Info className="w-4 h-4" /> Sobre as Permissões Customizadas</span>
                    <p>
                      Por padrão, este usuário herdará as permissões do perfil <span className="font-bold">{userForm.role}</span>.
                      Se você alterar o nível de algum módulo abaixo, essa exceção personalizada terá prioridade sobre o perfil global.
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {SYSTEM_MODULES_LIST.map(m => {
                      const currentCustom = userForm.customPermissions[m.id];

                      return (
                        <div key={m.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{m.label}</span>
                            <span className="text-[10px] text-slate-400 block">{m.category}</span>
                          </div>

                          <select
                            value={currentCustom || 'DEFAULT'}
                            onChange={e => {
                              const val = e.target.value;
                              setUserForm(p => {
                                const nextCP = { ...p.customPermissions };
                                if (val === 'DEFAULT') {
                                  delete nextCP[m.id];
                                } else {
                                  nextCP[m.id] = val as PermissionLevel;
                                }
                                return { ...p, customPermissions: nextCP };
                              });
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-[10px] font-bold bg-white dark:bg-slate-900"
                          >
                            <option value="DEFAULT">Padrão do Perfil ({rolePermissions[userForm.role]?.[m.id] || 'READ'})</option>
                            <option value="NONE">Sem Acesso (NONE)</option>
                            <option value="READ">Visualização (READ)</option>
                            <option value="WRITE">Edição (WRITE)</option>
                            <option value="ADMIN">Controle Total (ADMIN)</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}





      {/* Tab 3: Integrações */}
      {activeTab === 'integracoes' && (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Credenciais de Serviços Externos & APIs</h3>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">ViaCEP - Busca Automática de Endereços</div>
                <div className="text-[11px] text-slate-400">API gratuita ativada para autopreenchimento de CEP</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 font-bold">Ativo</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">WhatsApp Business Disparador API</div>
                <div className="text-[11px] text-slate-400">Instância: {config.whatsAppInstance}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 font-bold">Conectado</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Servidor E-mail SMTP</div>
                <div className="text-[11px] text-slate-400">{config.emailSmtpServer}:{config.emailSmtpPort}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 font-bold">Conectado</span>
            </div>

            {/* Firebase Cloud Firestore Database Integration Card */}
            <div className="p-5 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 text-white rounded-2xl border border-amber-500/40 space-y-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-800/40 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-white text-sm">Google Cloud Firebase Firestore (Banco de Dados em Nuvem)</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Banco de dados NoSQL corporativo provisionado no Google Cloud com regras de segurança ativas.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Firebase Firestore Ativo
                  </span>
                </div>
              </div>

              {/* Firestore Info Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950/70 rounded-xl border border-amber-900/40">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5">Project ID (Google Cloud)</span>
                  <div className="font-mono text-slate-200 text-xs truncate" title="gen-lang-client-0260568271">
                    gen-lang-client-0260568271
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-xl border border-amber-900/40">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5">Database ID</span>
                  <div className="font-mono text-slate-200 text-xs truncate" title="ai-studio-sicoopplatformsi-fd2e62a0-6b42-478c-a7c9-08d3051c6676">
                    ai-studio-sicoopplatformsi-...
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 rounded-xl border border-amber-900/40">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5">Região da Nuvem</span>
                  <div className="font-mono text-slate-200 text-xs flex items-center gap-1">
                    <span>us-west2 (Oregon, EUA)</span>
                  </div>
                </div>
              </div>

              {firestoreStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${firestoreStatus.connected ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300' : 'bg-rose-950/80 border-rose-600/60 text-rose-300'}`}>
                  <div className="font-bold">{firestoreStatus.message}</div>
                  {firestoreStatus.collectionsStatus.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-emerald-800/40">
                      {firestoreStatus.collectionsStatus.map((col) => (
                        <span key={col.name} className="px-2 py-0.5 bg-slate-900/80 text-emerald-300 rounded font-mono text-[10px] border border-emerald-700/50">
                          {col.name}: <strong>{col.count} docs</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {syncFirestoreMessage && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${syncFirestoreMessage.success ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300' : 'bg-rose-950/80 border-rose-600/60 text-rose-300'}`}>
                  {syncFirestoreMessage.message}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[10px] text-slate-400">
                  🔐 <strong>Autenticação &amp; Regras:</strong> Firebase Auth integrado com RBAC para administradores e cooperados.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestFirestore}
                    disabled={isTestingFirestore}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl border border-amber-500/40 text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirestore ? 'animate-spin' : ''}`} />
                    <span>{isTestingFirestore ? 'Testando...' : 'Testar Conexão Firebase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncEntireDatabaseToFirestore}
                    disabled={isSyncingFirestore}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className={`w-3.5 h-3.5 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
                    <span>{isSyncingFirestore ? 'Sincronizando Base...' : 'Sincronizar Dados no Firestore'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Migração de dados legados (sem cooperativa/tenantId) — somente ADMIN */}
            {currentUser?.role === 'ADMIN' && (
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl border border-rose-500/30 space-y-3 shadow-lg">
                <div className="flex items-center gap-3 border-b border-slate-700/60 pb-3">
                  <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Migrar Dados Legados para esta Cooperativa</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Atribui a cooperativa atual (<strong className="text-slate-200">{currentTenant?.name}</strong>) a
                      registros do Firestore gravados antes do isolamento por cooperativa e que ainda estão sem
                      <code className="mx-1 px-1 py-0.5 bg-slate-950 rounded text-rose-300">tenantId</code>
                      (cooperados, transações de capital, contas financeiras, assembleias e backups).
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-amber-300/90 bg-amber-950/40 border border-amber-700/40 rounded-xl p-2.5">
                  ⚠️ Requer que as novas <code className="px-1 bg-slate-950 rounded">firestore.rules</code> já
                  estejam publicadas e que este usuário seja reconhecido como admin pelas regras (e-mail cadastrado
                  em <code className="px-1 bg-slate-950 rounded">firestore.rules</code> ou documento em{' '}
                  <code className="px-1 bg-slate-950 rounded">admins/{'{uid}'}</code>). Rode apenas uma vez por
                  cooperativa nova; rodar de novo não duplica nada, mas não desfaz sozinho — confira o resultado
                  antes de repetir.
                </div>

                {migrationMessage && (
                  <div className={`p-3 rounded-xl text-xs font-medium border ${migrationMessage.success ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300' : 'bg-rose-950/80 border-rose-600/60 text-rose-300'}`}>
                    {migrationMessage.message}
                  </div>
                )}

                {migrationResults && (
                  <div className="flex flex-wrap gap-2">
                    {migrationResults.map(r => (
                      <span
                        key={r.collection}
                        className={`px-2 py-0.5 rounded font-mono text-[10px] border ${r.error ? 'bg-rose-950/80 text-rose-300 border-rose-700/50' : 'bg-slate-900/80 text-emerald-300 border-emerald-700/50'}`}
                        title={r.error || ''}
                      >
                        {r.collection}: {r.error ? 'erro' : `${r.migrated}/${r.found} migrado(s)`}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleMigrateLegacyData}
                    disabled={isMigratingLegacy}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isMigratingLegacy ? 'animate-spin' : ''}`} />
                    <span>{isMigratingLegacy ? 'Migrando...' : `Migrar Dados Legados para "${currentTenant?.name || 'esta cooperativa'}"`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Google Workspace & Drive Picker Integration Card */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl border border-blue-500/30 space-y-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Google Workspace & Google Drive Picker</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        OAuth 2.0 Ativo
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Widget oficial do Google Picker para importação e seleção segura de planilhas e documentos.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <GooglePickerButton
                    onFilesSelected={handleDriveFilesSelected}
                    viewType="ALL"
                    buttonText="Abrir Google Picker"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Scopes & info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-700/50 space-y-1">
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Escopos OAuth Ativos:</span>
                  <div className="space-y-1 font-mono text-[11px] text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>drive.file (Acesso a arquivos selecionados)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>drive.metadata.readonly (Leitura de metadados)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-700/50 space-y-1">
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Módulos Conectados:</span>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Importação de Cooperados (.CSV, .XLSX, Google Sheets)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Seleção de Documentos & Atas de Assembleias</span>
                    </div>
                  </div>
                </div>
              </div>

              {drivePickerSuccessMsg && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{drivePickerSuccessMsg}</span>
                </div>
              )}

              {/* Picked Files List */}
              {pickedDriveFiles.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-700/60">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Arquivos Selecionados no Google Drive ({pickedDriveFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickedDriveFiles([])}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Limpar lista
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {pickedDriveFiles.map((f, i) => (
                      <div key={`${f.id}-${i}`} className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {f.iconUrl ? (
                            <img src={f.iconUrl} alt="icon" className="w-4 h-4 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <div className="font-bold text-white truncate">{f.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{f.mimeType}</div>
                          </div>
                        </div>

                        {f.url && (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" /> Abrir no Drive
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab Webhooks: Configuração de Webhooks e Eventos */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6 text-xs">
          {/* KIWIFY AUTOMATIC PAYMENTS WEBHOOK LISTENER CARD */}
          <div className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-500/30 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold text-[10px] rounded-full border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    Ativo & Escutando
                  </span>
                  <span className="text-xs text-indigo-300 font-mono">POST /api/webhooks/kiwify</span>
                </div>
                <h3 className="font-extrabold text-white text-base">Escuta Automática de Webhooks Kiwify (Supabase Sync)</h3>
                <p className="text-slate-300 text-[11px] max-w-3xl leading-relaxed">
                  Quando um pagamento é confirmado no Kiwify (R$ 197,90 Mensal ou R$ 1.997,90 Anual), este webhook recebe o evento instantaneamente, atualiza o status no Supabase PostgreSQL e libera o acesso total ao sistema sem intervenção manual.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSimulateKiwifyWebhookInSettings}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  Simular Disparo Kiwify
                </button>

                <button
                  type="button"
                  onClick={handleFetchKiwifyWebhookLogs}
                  disabled={isLoadingKiwifyLogs}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKiwifyLogs ? 'animate-spin' : ''}`} />
                  Atualizar Logs
                </button>
              </div>
            </div>

            {/* Webhook URL Endpoint Box */}
            <div className="p-4 bg-slate-950/70 rounded-xl border border-indigo-500/20 space-y-2">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                URL do Webhook para cadastrar no Painel Kiwify:
              </div>
              <div className="flex items-center justify-between gap-3 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 font-mono text-xs text-emerald-400">
                <span className="truncate">{window.location.origin}/api/webhooks/kiwify</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/kiwify`);
                    alert('URL do Webhook Kiwify copiada com sucesso!');
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-md text-[10px] shrink-0 flex items-center gap-1 transition-all"
                >
                  <Copy className="w-3 h-3" />
                  Copiar URL
                </button>
              </div>
            </div>

            {kiwifyTestMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold">
                {kiwifyTestMsg}
              </div>
            )}

            {/* Kiwify Webhook History Logs Table */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Histórico de Webhooks Recebidos da Kiwify ({kiwifyLogs.length})
                </span>
                <span className="text-[10px] text-slate-400">Sincronização com Supabase: Ativa</span>
              </div>

              {kiwifyLogs.length === 0 ? (
                <div className="p-4 bg-slate-950/40 rounded-xl border border-dashed border-indigo-500/20 text-center text-slate-400 text-xs">
                  Nenhum webhook recebido da Kiwify até o momento. Clique em "Simular Disparo Kiwify" para testar em tempo real.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {kiwifyLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-950/80 rounded-xl border border-indigo-500/20 flex items-center justify-between gap-3 text-[11px]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.customerName}</span>
                          <span className="text-slate-400 font-mono">&lt;{log.customerEmail}&gt;</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] rounded-md">
                            {log.licenseKey}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Produto: {log.productName} • Transação: {log.orderId} • Data: {new Date(log.receivedAt).toLocaleString('pt-BR')}
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-[10px] rounded-full shrink-0">
                        PAGO &amp; ATIVADO
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Header & Action */}
          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Webhook className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Módulo de Configuração de Webhooks</h3>
              </div>
              <p className="text-slate-500 max-w-2xl text-[11px] leading-relaxed">
                Configure endpoints HTTP POST para notificar sistemas externos (ERPs, CRMs, plataformas contábeis ou bots) em tempo real sobre eventos críticos da cooperativa, como inclusão de cooperados ou movimentações financeiras.
              </p>
            </div>

            <button
              onClick={handleOpenNewWebhookModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar Novo Webhook
            </button>
          </div>

          {/* Webhooks Endpoints List */}
          {webhooks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <Globe className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Nenhum Webhook cadastrado ainda</p>
              <p className="text-slate-400 text-[11px] max-w-md mx-auto">
                Adicione seu primeiro endpoint para começar a receber dados em tempo real sobre novos cooperados e capital.
              </p>
              <button
                onClick={handleOpenNewWebhookModal}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Cadastrar Endpoint
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map(wh => {
                const isLogExpanded = expandedLogWebhookId === wh.id;
                const isRunning = testRunning[wh.id];
                const res = testResult[wh.id];

                return (
                  <div
                    key={wh.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all ${
                      wh.active
                        ? 'border-slate-200/90 dark:border-slate-700 shadow-xs'
                        : 'border-slate-200/50 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    {/* Endpoint Main Bar */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{wh.name}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                                wh.active
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${wh.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              {wh.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 break-all">
                            <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{wh.url}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(wh.url);
                                alert('URL copiada para a área de transferência!');
                              }}
                              className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                              title="Copiar URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateWebhook(wh.id, { active: !wh.active })}
                            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] border transition-all ${
                              wh.active
                                ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                          >
                            {wh.active ? 'Pausar Webhook' : 'Ativar Webhook'}
                          </button>

                          <button
                            onClick={() => handleOpenEditWebhookModal(wh)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded-lg"
                            title="Editar Webhook"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (!canWrite) { blockWriteAction(); return; }
                              if (confirm(`Tem certeza que deseja excluir o Webhook "${wh.name}"?`)) {
                                deleteWebhook(wh.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-lg"
                            title="Excluir Webhook"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Secret Token & Subscribed Events */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        {/* Token Secret */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Segredo da Assinatura (HMAC Secret)</span>
                          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                            <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-slate-700 dark:text-slate-300">
                              {showSecret[wh.id] ? wh.secretToken : '••••••••••••••••••••••••'}
                            </span>
                            <button
                              onClick={() => setShowSecret(prev => ({ ...prev, [wh.id]: !prev[wh.id] }))}
                              className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title={showSecret[wh.id] ? 'Ocultar Segredo' : 'Exibir Segredo'}
                            >
                              {showSecret[wh.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopyToken(wh.id, wh.secretToken)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="Copiar Token Segredo"
                            >
                              {copiedToken[wh.id] ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Event Tags */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eventos Inscritos ({wh.events.length})</span>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {wh.events.map(ev => (
                              <span
                                key={ev}
                                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                  ev === 'cooperado.created'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : ev === 'capital.transaction'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : ev === 'assembleia.created'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {ev}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Test Trigger Control Bar */}
                      <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Testar Disparo em Tempo Real:</span>
                          <select
                            value={selectedTestEvent[wh.id] || wh.events[0] || 'cooperado.created'}
                            onChange={e => setSelectedTestEvent(prev => ({ ...prev, [wh.id]: e.target.value as WebhookEvent }))}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-mono"
                          >
                            {wh.events.map(ev => (
                              <option key={ev} value={ev}>
                                Evento: {ev}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          {wh.lastTriggeredAt && (
                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                              Último envio: {wh.lastTriggeredAt}
                            </span>
                          )}

                          <button
                            onClick={() => handleRunTestWebhook(wh.id)}
                            disabled={isRunning}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all text-[11px] cursor-pointer"
                          >
                            {isRunning ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando POST...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" /> Disparar Teste
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Live Test Feedback Banner */}
                      {res && (
                        <div
                          className={`p-3.5 rounded-xl border text-[11px] flex items-start gap-2.5 ${
                            res.success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
                          }`}
                        >
                          {res.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                          <div className="space-y-0.5 flex-1">
                            <div className="font-bold flex items-center gap-2">
                              <span>{res.message}</span>
                              <span className="font-mono bg-white/80 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                HTTP {res.statusCode}
                              </span>
                            </div>
                            <p className="text-[10px] opacity-80">
                              O payload do evento <code className="font-mono font-bold">{selectedTestEvent[wh.id] || wh.events[0]}</code> foi transmitido com a assinatura HTTP no cabeçalho <code className="font-mono">X-SisCoope-Signature</code>.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Expand Logs Button */}
                      <div className="flex justify-between items-center pt-1 text-[11px]">
                        <button
                          onClick={() => setExpandedLogWebhookId(isLogExpanded ? null : wh.id)}
                          className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          {isLogExpanded ? 'Ocultar Histórico de Envios' : `Ver Histórico de Logs (${wh.logs?.length || 0})`}
                          {isLogExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Logs History Sub-Table */}
                    {isLogExpanded && (
                      <div className="p-4 bg-slate-900 text-slate-100 rounded-b-2xl border-t border-slate-700 font-mono text-[11px] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Logs de Execução HTTP POST ({wh.name})
                          </span>
                          <span className="text-[10px] text-slate-400">Exibindo os últimos 20 disparos</span>
                        </div>

                        {(!wh.logs || wh.logs.length === 0) ? (
                          <div className="p-4 text-center text-slate-500 italic">Nenhum log registrado até o momento.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                                  <th className="p-2">Data/Hora</th>
                                  <th className="p-2">Evento</th>
                                  <th className="p-2">Status</th>
                                  <th className="p-2">Resposta do Servidor Receptor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                {wh.logs.map(log => (
                                  <tr key={log.id} className="hover:bg-slate-800/60 transition-colors">
                                    <td className="p-2 text-slate-400">{log.timestamp}</td>
                                    <td className="p-2 text-indigo-300 font-bold">{log.event}</td>
                                    <td className="p-2">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          log.success ? 'bg-emerald-900/80 text-emerald-300' : 'bg-rose-900/80 text-rose-300'
                                        }`}
                                      >
                                        HTTP {log.statusCode}
                                      </span>
                                    </td>
                                    <td className="p-2 text-slate-300 max-w-md truncate" title={log.responseBody}>
                                      {log.responseBody}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Developer Documentation Collapsible Box */}
          <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
            <div
              onClick={() => setShowDocPayload(!showDocPayload)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  Documentação Técnica & Exemplo de Payload JSON para Desenvolvedores
                </span>
              </div>
              <button className="text-slate-400 p-1">
                {showDocPayload ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showDocPayload && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3 text-[11px] text-slate-600 dark:text-slate-300">
                <p>
                  As requisições Webhook do SisCoope são enviadas via método <strong>HTTP POST</strong> no formato <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">application/json</code>.
                </p>
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Cabeçalhos HTTP Enviados:</span>
                  <ul className="list-disc list-inside font-mono text-[10px] space-y-0.5 text-slate-500 dark:text-slate-400 pl-2">
                    <li>Content-Type: application/json</li>
                    <li>X-SisCoope-Event: cooperado.created | capital.transaction</li>
                    <li>X-SisCoope-Signature: sha256=HEX_HMAC_SHA256_SIGNATURE</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Exemplo do Estrutura de Payload JSON:</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed">
{`{
  "event": "cooperado.created",
  "timestamp": "${new Date().toISOString()}",
  "tenant": {
    "id": "${currentTenant?.id || 'tenant-1'}",
    "cnpj": "${currentTenant?.cnpj || '12.345.678/0001-90'}",
    "name": "${currentTenant?.name || 'Cooperativa Agrotech'}"
  },
  "data": {
    "matricula": "COP-1042",
    "nome": "Mariana Souza Alcantara",
    "cpfCnpj": "123.456.789-00",
    "situacao": "ATIVO",
    "capitalSubscrito": 1500.00,
    "capitalIntegralizado": 500.00
  }
}`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhook Modal Form (Create / Edit) */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl lg:max-w-4xl w-full p-6 sm:p-8 space-y-5 border border-slate-200 dark:border-slate-700 shadow-2xl text-xs my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Webhook className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {editingWebhookId ? 'Editar Endpoint de Webhook' : 'Cadastrar Novo Webhook'}
                </h3>
              </div>
              <button
                onClick={() => setIsWebhookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWebhook} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Sistema / Identificador <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ERP Contábil, Discord da Diretoria, CRM Cobranças"
                  value={webhookForm.name}
                  onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL de Destino (Endpoint HTTP POST) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.suaempresa.com.br/webhooks/siscoope"
                  value={webhookForm.url}
                  onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Segredo de Assinatura (HMAC Token)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setWebhookForm({
                        ...webhookForm,
                        secretToken: 'whsec_' + Math.random().toString(36).substring(2, 12) + Date.now().toString().slice(-4)
                      })
                    }
                    className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Gerar Novo
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={webhookForm.secretToken}
                  onChange={e => setWebhookForm({ ...webhookForm, secretToken: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Eventos para Inscrição de Disparo:
                </label>
                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {availableWebhookEvents.map(ev => {
                    const isChecked = webhookForm.events.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className="flex items-start gap-2.5 p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEventInForm(ev.id)}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">{ev.label}</div>
                          <div className="text-slate-400 text-[10px]">{ev.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={webhookForm.active}
                  onChange={e => setWebhookForm({ ...webhookForm, active: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="activeCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Manter Webhook Ativo e habilitado para disparos
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWebhookModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Salvar Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Tab 4: Trilha de Auditoria */}
      {activeTab === 'auditoria' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-xs">
            Trilha de Auditoria LGPD e Segurança
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Data / Hora</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Perfil</th>
                  <th className="p-4">Módulo</th>
                  <th className="p-4">Ação</th>
                  <th className="p-4">Detalhes</th>
                  <th className="p-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {auditoriaLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-mono text-slate-500">{log.dataHora}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{log.usuarioNome}</td>
                    <td className="p-4 font-mono">{log.usuarioPerfil}</td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{log.modulo}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[10px] font-bold">
                        {log.acao}
                      </span>
                    </td>
                    <td className="p-4 text-slate-800 dark:text-slate-200">{log.detalhes}</td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Backup & Restoration */}
      {activeTab === 'backup' && (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Armazenamento de Dados & Cópias de Segurança</h3>
            <p className="text-slate-500 leading-relaxed">
              Gerencie backups locais da cooperativa e configure a <strong>rotina de backup automático semanal</strong> com envio e gravação estruturada no Google Cloud Firebase Firestore.
            </p>
          </div>

          {backupStatusMessage && (
            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
              backupStatusMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' 
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
            }`}>
              <span>{backupStatusMessage.text}</span>
              <button onClick={() => setBackupStatusMessage(null)} className="p-1 hover:opacity-75">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Section 1: Weekly Automatic Firebase CSV Backup */}
          <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Rotina de Backup Automático Semanal (Firebase Firestore)</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Gera e salva automaticamente arquivos <strong>CSV</strong> com o cadastro dos cooperados e movimentações financeiras na coleção de backups do Firebase.
                  </p>
                </div>
              </div>

              {/* Auto Backup Toggle */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900 shrink-0">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  Backup Semanal:
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBackupEnabled}
                    onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                  autoBackupEnabled 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {autoBackupEnabled ? 'ATIVADO' : 'DESATIVADO'}
                </span>
              </div>
            </div>

            {/* Backup Status Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
              <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> ÚLTIMO BACKUP REALIZADO
                </div>
                <div className="font-bold font-mono text-slate-900 dark:text-white text-xs">
                  {lastBackupTime ? new Date(lastBackupTime).toLocaleString('pt-BR') : 'Nenhum backup recente'}
                </div>
              </div>

              <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium mb-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" /> PRÓXIMO AGENDAMENTO
                </div>
                <div className="font-bold font-mono text-slate-900 dark:text-white text-xs">
                  {autoBackupEnabled 
                    ? (lastBackupTime 
                        ? new Date(new Date(lastBackupTime).getTime() + 7 * 86400000).toLocaleDateString('pt-BR') 
                        : 'Agendado para hoje')
                    : 'Pausado (Backup desativado)'}
                </div>
              </div>

              <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium mb-1">
                  <Database className="w-3.5 h-3.5 text-amber-500" /> STATUS DO FIREBASE
                </div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Firebase Firestore Ativo
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Firebase CSV Backup */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={handleExecuteFirebaseBackupNow}
                disabled={isBackupRunning}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                {isBackupRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Gravando no Firebase Firestore...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" /> Executar Backup Semanal no Firebase (CSV)
                  </>
                )}
              </button>

              <button
                onClick={() => downloadCSVLocally(generateCooperadosCSV(cooperados), `backup_cooperados_${new Date().toISOString().slice(0,10)}.csv`)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Baixar CSV Cooperados
              </button>

              <button
                onClick={() => downloadCSVLocally(generateSisFinTransacoesCSV(contasPagarReceber), `backup_sisfin_transacoes_${new Date().toISOString().slice(0,10)}.csv`)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Baixar CSV Transações SisFin
              </button>
            </div>
          </div>

          {/* Section 2: Local JSON Backup & Restore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Export JSON */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">Exportar Backup Completo (JSON)</h4>
                <p className="text-slate-500 text-[11px]">
                  Gere um arquivo <code className="font-mono">.json</code> contendo todos os dados da cooperativa para salvaguarda externa ou transferência de máquina.
                </p>
              </div>

              <button
                onClick={() => {
                  try {
                    const jsonContent = exportBackupJson();
                    const blob = new Blob([jsonContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const dlAnchorElem = document.createElement('a');
                    dlAnchorElem.setAttribute("href", url);
                    dlAnchorElem.setAttribute("download", `Backup_SisCoope_${currentTenant?.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.json`);
                    dlAnchorElem.click();
                    URL.revokeObjectURL(url);
                    setBackupStatusMessage({ type: 'success', text: 'Backup em arquivo JSON baixado com sucesso!' });
                  } catch (e: any) {
                    setBackupStatusMessage({ type: 'error', text: 'Erro ao gerar arquivo de backup: ' + e.message });
                  }
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" /> Download do Banco de Dados (.JSON)
              </button>
            </div>

            {/* Card 2: Import / Restore JSON */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">Restaurar Cópia de Segurança</h4>
                <p className="text-slate-500 text-[11px]">
                  Selecione um arquivo de backup <code className="font-mono">.json</code> gerado anteriormente para recarregar todas as informações do sistema.
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={backupFileInputRef}
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const content = event.target?.result as string;
                      if (content) {
                        const res = importBackupJson(content);
                        if (res.success) {
                          setBackupStatusMessage({ type: 'success', text: res.message });
                        } else {
                          setBackupStatusMessage({ type: 'error', text: res.message });
                        }
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />

                <button
                  onClick={() => backupFileInputRef.current?.click()}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Upload className="w-4 h-4" /> Importar e Restaurar Backup JSON
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Firebase Firestore Backup History Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                <Clock className="w-4 h-4 text-indigo-500" /> Histórico de Backups Semanais & Armazenamento Firebase Firestore
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {backupHistory.length} registros
              </span>
            </div>

            {backupHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium text-xs">Nenhum histórico de backup gravado ainda.</p>
                <p className="text-[11px] text-slate-500 mt-1">Execute um backup para gerar registros gravados no Firebase Firestore.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Arquivos / Tamanho</th>
                      <th className="p-3">Detalhes / Mensagem</th>
                      <th className="p-3 text-right">Links Storage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {backupHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                          {new Date(item.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            item.tipo === 'AUTOMATICO_SEMANAL'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {item.tipo === 'AUTOMATICO_SEMANAL' ? 'SEMANAL' : 'MANUAL'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'SUCESSO'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {item.arquivosCount} CSVs ({Math.round(item.tamanhoTotalBytes / 1024)} KB)
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={item.menssagem}>
                          {item.menssagem}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.files.map((file, idx) => (
                              file.publicUrl ? (
                                <a
                                  key={idx}
                                  href={file.publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-[10px] font-bold rounded flex items-center gap-1"
                                  title={`Baixar ${file.name} do Supabase Storage`}
                                >
                                  <FileText className="w-3 h-3" /> {file.name.split('_')[1] || 'CSV'}
                                </a>
                              ) : null
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Deseja reiniciar a base de demonstração inicial?</span>
            <button
              onClick={() => {
                if (confirm('Atenção: Todos os dados salvos localmente serão substituídos pela base de teste original. Deseja continuar?')) {
                  restoreDefaultData();
                  setBackupStatusMessage({ type: 'success', text: 'Dados originais da demonstração restaurados com sucesso!' });
                }
              }}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors text-[11px]"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Resetar Dados Demo Inicial
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
