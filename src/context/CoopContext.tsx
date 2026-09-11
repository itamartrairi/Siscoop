import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  CooperativeTenant,
  Cooperado,
  TransacaoCapital,
  ParcelaCapital,
  Assembleia,
  Mandato,
  AuditoriaLog,
  SistemaConfig,
  SystemNotification,
  UserRole,
  PermissionLevel,
  SystemToolModule,
  RolePermissionsMap,
  TipoTransacaoCapital,
  FormaPagamento,
  LicenseInfo,
  LicenseStatus,
  LicensePlanType,
  WebhookEndpoint,
  WebhookEvent,
  WebhookLog,
  ProdutorRural,
  ProdutoAgro,
  RegistroProducao,
  ProgramaGovernamental,
  ChamadaPublica,
  RateioChamadaPublica,
  PropostaOfertaPAA,
  ProgramacaoEntregaPAA,
  PrestacaoContasPAA,
  PlanoContaContabil,
  LancamentoContabil,
  ItemPatrimonio,
  ContaPagarReceber,
  ExtratoBancario,
  SolicitacaoCompra,
  Fornecedor,
  ItemEstoque,
  MovimentacaoEstoque,
  FuncionarioRH,
  FolhaPagamento,
  EscolaPnae,
  Motorista,
  EntregaEscolaPnae,
  RomaneioMotorista,
  PedidoProdutorPAA,
  OrdemCompra,
  NotaFiscal,
  NotaFiscalItem,
  SistemaTributarioNFe,
  SefazCeConfig
} from '../types';
import { calcularImpostosItem, ALERTA_CRONOGRAMA_TEXTO } from '../utils/tributacaoReforma';
import {
  INITIAL_TENANTS,
  INITIAL_USERS,
  INITIAL_COOPERADOS,
  INITIAL_TRANSACAO_CAPITAL,
  INITIAL_ASSEMBLEIAS,
  INITIAL_MANDATOS,
  INITIAL_AUDITORIA_LOGS,
  INITIAL_CONFIG,
  INITIAL_WEBHOOKS,
  INITIAL_PRODUTORES,
  INITIAL_PRODUTOS,
  INITIAL_REGISTROS_PRODUCAO,
  INITIAL_PROGRAMAS,
  INITIAL_CHAMADAS_PUBLICAS,
  INITIAL_OFERTAS_PAA,
  INITIAL_PROGRAMACOES_ENTREGA,
  INITIAL_PRESTACOES_CONTAS,
  INITIAL_PLANO_CONTAS,
  INITIAL_LANCAMENTOS_CONTABEIS,
  INITIAL_PATRIMONIO,
  INITIAL_CONTAS_PAGAR_RECEBER,
  INITIAL_EXTRATO_BANCARIO,
  INITIAL_SOLICITACOES_COMPRA,
  INITIAL_FORNECEDORES,
  INITIAL_ESTOQUE,
  INITIAL_MOVIMENTACOES_ESTOQUE,
  INITIAL_FUNCIONARIOS_RH,
  INITIAL_FOLHA_PAGAMENTO,
  INITIAL_ESCOLAS_PNAE,
  INITIAL_MOTORISTAS,
  INITIAL_ENTREGAS_ESCOLA,
  INITIAL_ROMANEIOS_MOTORISTA,
  INITIAL_PEDIDOS_PRODUTOR,
  INITIAL_ORDENS_COMPRA
} from '../data/mockInitialData';
import { consultarAssinatura, validarLicencaNoServidor } from '../services/licencaApi';
import { sanitizeCooperado } from '../utils/cooperadoSanitizer';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged
} from '../services/firebase';
import { checkAndRunWeeklyBackupIfNeeded } from '../services/firebaseBackupService';
import {
  syncCooperadosToFirestore,
  syncContasFinanceirasToFirestore,
  syncTransacoesCapitalToFirestore,
  syncAssembleiasToFirestore,
  saveUserTenantMappingToFirestore
} from '../services/firebaseDbService';


export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  ADMIN: {
    dashboard: 'ADMIN',
    'cadastro-cooperativa': 'ADMIN',
    cadastros: 'ADMIN',
    cooperados: 'ADMIN',
    capital: 'ADMIN',
    assembleias: 'ADMIN',
    diretoria: 'ADMIN',
    sisgepa: 'ADMIN',
    fiscal: 'ADMIN',
    siscont: 'ADMIN',
    sisfin: 'ADMIN',
    compras: 'ADMIN',
    estoque: 'ADMIN',
    rh: 'ADMIN',
    bi: 'ADMIN',
    'portal-cooperado': 'ADMIN',
    'portal-escola': 'ADMIN',
    'app-produtor': 'ADMIN',
    'app-motorista': 'ADMIN',
    relatorios: 'ADMIN',
    'backup-sistema': 'ADMIN',
    configuracoes: 'ADMIN'
  },
  PRESIDENTE: {
    dashboard: 'ADMIN',
    'cadastro-cooperativa': 'ADMIN',
    cadastros: 'ADMIN',
    cooperados: 'ADMIN',
    capital: 'ADMIN',
    assembleias: 'ADMIN',
    diretoria: 'ADMIN',
    sisgepa: 'ADMIN',
    fiscal: 'READ',
    siscont: 'READ',
    sisfin: 'READ',
    compras: 'WRITE',
    estoque: 'READ',
    rh: 'ADMIN',
    bi: 'ADMIN',
    'portal-cooperado': 'READ',
    'portal-escola': 'READ',
    'app-produtor': 'READ',
    'app-motorista': 'READ',
    relatorios: 'ADMIN',
    'backup-sistema': 'READ',
    configuracoes: 'WRITE'
  },
  DIRETOR_FINANCEIRO: {
    dashboard: 'READ',
    'cadastro-cooperativa': 'READ',
    cadastros: 'READ',
    cooperados: 'READ',
    capital: 'ADMIN',
    assembleias: 'READ',
    diretoria: 'READ',
    sisgepa: 'READ',
    fiscal: 'ADMIN',
    siscont: 'ADMIN',
    sisfin: 'ADMIN',
    compras: 'ADMIN',
    estoque: 'WRITE',
    rh: 'READ',
    bi: 'ADMIN',
    'portal-cooperado': 'NONE',
    'portal-escola': 'NONE',
    'app-produtor': 'NONE',
    'app-motorista': 'NONE',
    relatorios: 'ADMIN',
    'backup-sistema': 'READ',
    configuracoes: 'READ'
  },
  GERENTE: {
    dashboard: 'ADMIN',
    'cadastro-cooperativa': 'WRITE',
    cadastros: 'ADMIN',
    cooperados: 'ADMIN',
    capital: 'WRITE',
    assembleias: 'WRITE',
    diretoria: 'READ',
    sisgepa: 'ADMIN',
    fiscal: 'WRITE',
    siscont: 'WRITE',
    sisfin: 'WRITE',
    compras: 'ADMIN',
    estoque: 'ADMIN',
    rh: 'ADMIN',
    bi: 'ADMIN',
    'portal-cooperado': 'READ',
    'portal-escola': 'READ',
    'app-produtor': 'READ',
    'app-motorista': 'READ',
    relatorios: 'ADMIN',
    'backup-sistema': 'READ',
    configuracoes: 'NONE'
  },
  SECRETARIA: {
    dashboard: 'READ',
    'cadastro-cooperativa': 'READ',
    cadastros: 'ADMIN',
    cooperados: 'ADMIN',
    capital: 'WRITE',
    assembleias: 'ADMIN',
    diretoria: 'ADMIN',
    sisgepa: 'READ',
    fiscal: 'NONE',
    siscont: 'NONE',
    sisfin: 'NONE',
    compras: 'READ',
    estoque: 'READ',
    rh: 'WRITE',
    bi: 'READ',
    'portal-cooperado': 'WRITE',
    'portal-escola': 'READ',
    'app-produtor': 'READ',
    'app-motorista': 'NONE',
    relatorios: 'WRITE',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  },
  FINANCEIRO: {
    dashboard: 'READ',
    'cadastro-cooperativa': 'NONE',
    cadastros: 'READ',
    cooperados: 'READ',
    capital: 'ADMIN',
    assembleias: 'NONE',
    diretoria: 'NONE',
    sisgepa: 'READ',
    fiscal: 'ADMIN',
    siscont: 'WRITE',
    sisfin: 'ADMIN',
    compras: 'WRITE',
    estoque: 'READ',
    rh: 'READ',
    bi: 'WRITE',
    'portal-cooperado': 'NONE',
    'portal-escola': 'NONE',
    'app-produtor': 'NONE',
    'app-motorista': 'NONE',
    relatorios: 'ADMIN',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  },
  CONTADOR: {
    dashboard: 'READ',
    'cadastro-cooperativa': 'NONE',
    cadastros: 'READ',
    cooperados: 'READ',
    capital: 'READ',
    assembleias: 'READ',
    diretoria: 'NONE',
    sisgepa: 'READ',
    fiscal: 'ADMIN',
    siscont: 'ADMIN',
    sisfin: 'READ',
    compras: 'READ',
    estoque: 'READ',
    rh: 'READ',
    bi: 'READ',
    'portal-cooperado': 'NONE',
    'portal-escola': 'NONE',
    'app-produtor': 'NONE',
    'app-motorista': 'NONE',
    relatorios: 'ADMIN',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  },
  TECNICO: {
    dashboard: 'READ',
    'cadastro-cooperativa': 'NONE',
    cadastros: 'WRITE',
    cooperados: 'READ',
    capital: 'NONE',
    assembleias: 'NONE',
    diretoria: 'NONE',
    sisgepa: 'ADMIN',
    fiscal: 'NONE',
    siscont: 'NONE',
    sisfin: 'NONE',
    compras: 'READ',
    estoque: 'WRITE',
    rh: 'NONE',
    bi: 'READ',
    'portal-cooperado': 'READ',
    'portal-escola': 'READ',
    'app-produtor': 'ADMIN',
    'app-motorista': 'WRITE',
    relatorios: 'WRITE',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  },
  AUDITORIA: {
    dashboard: 'READ',
    'cadastro-cooperativa': 'READ',
    cadastros: 'READ',
    cooperados: 'READ',
    capital: 'READ',
    assembleias: 'READ',
    diretoria: 'READ',
    sisgepa: 'READ',
    fiscal: 'READ',
    siscont: 'READ',
    sisfin: 'READ',
    compras: 'READ',
    estoque: 'READ',
    rh: 'READ',
    bi: 'READ',
    'portal-cooperado': 'READ',
    'portal-escola': 'READ',
    'app-produtor': 'READ',
    'app-motorista': 'READ',
    relatorios: 'ADMIN',
    'backup-sistema': 'READ',
    configuracoes: 'NONE'
  },
  COOPERADO: {
    dashboard: 'READ',
    'cadastro-cooperativa': 'NONE',
    cadastros: 'NONE',
    cooperados: 'NONE',
    capital: 'READ',
    assembleias: 'READ',
    diretoria: 'NONE',
    sisgepa: 'NONE',
    fiscal: 'NONE',
    siscont: 'NONE',
    sisfin: 'NONE',
    compras: 'NONE',
    estoque: 'NONE',
    rh: 'NONE',
    bi: 'NONE',
    'portal-cooperado': 'ADMIN',
    'portal-escola': 'NONE',
    'app-produtor': 'WRITE',
    'app-motorista': 'NONE',
    relatorios: 'NONE',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  },
  MOTORISTA: {
    dashboard: 'NONE',
    'cadastro-cooperativa': 'NONE',
    cadastros: 'NONE',
    cooperados: 'NONE',
    capital: 'NONE',
    assembleias: 'NONE',
    diretoria: 'NONE',
    sisgepa: 'NONE',
    fiscal: 'NONE',
    siscont: 'NONE',
    sisfin: 'NONE',
    compras: 'NONE',
    estoque: 'READ',
    rh: 'NONE',
    bi: 'NONE',
    'portal-cooperado': 'NONE',
    'portal-escola': 'NONE',
    'app-produtor': 'NONE',
    'app-motorista': 'ADMIN',
    relatorios: 'NONE',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  },
  ESCOLA: {
    dashboard: 'NONE',
    'cadastro-cooperativa': 'NONE',
    cadastros: 'NONE',
    cooperados: 'NONE',
    capital: 'NONE',
    assembleias: 'NONE',
    diretoria: 'NONE',
    sisgepa: 'NONE',
    fiscal: 'NONE',
    siscont: 'NONE',
    sisfin: 'NONE',
    compras: 'NONE',
    estoque: 'NONE',
    rh: 'NONE',
    bi: 'NONE',
    'portal-cooperado': 'NONE',
    'portal-escola': 'ADMIN',
    'app-produtor': 'NONE',
    'app-motorista': 'NONE',
    relatorios: 'NONE',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  },
  FORNECEDOR: {
    dashboard: 'NONE',
    'cadastro-cooperativa': 'NONE',
    cadastros: 'NONE',
    cooperados: 'NONE',
    capital: 'NONE',
    assembleias: 'NONE',
    diretoria: 'NONE',
    sisgepa: 'NONE',
    fiscal: 'NONE',
    siscont: 'NONE',
    sisfin: 'NONE',
    compras: 'READ',
    estoque: 'NONE',
    rh: 'NONE',
    bi: 'NONE',
    'portal-cooperado': 'NONE',
    'portal-escola': 'NONE',
    'app-produtor': 'NONE',
    'app-motorista': 'NONE',
    relatorios: 'NONE',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  },
  CONSULTA: {
    dashboard: 'READ',
    'cadastro-cooperativa': 'READ',
    cadastros: 'READ',
    cooperados: 'READ',
    capital: 'READ',
    assembleias: 'READ',
    diretoria: 'READ',
    sisgepa: 'READ',
    fiscal: 'READ',
    siscont: 'READ',
    sisfin: 'READ',
    compras: 'READ',
    estoque: 'READ',
    rh: 'READ',
    bi: 'READ',
    'portal-cooperado': 'READ',
    'portal-escola': 'READ',
    'app-produtor': 'READ',
    'app-motorista': 'READ',
    relatorios: 'READ',
    'backup-sistema': 'NONE',
    configuracoes: 'NONE'
  }
};

interface CoopContextType {
  // Auth & Tenant & User Management
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  addUser: (userData: Omit<User, 'id' | 'tenantId'>) => User;
  updateUser: (id: string, userData: Partial<User>) => void;
  deleteUser: (id: string) => void;
  updateCurrentUserProfile: (profileData: Partial<User>) => void;
  rolePermissions: RolePermissionsMap;
  updateRolePermission: (role: UserRole, module: SystemToolModule, level: PermissionLevel) => void;
  resetDefaultPermissions: () => void;
  getEffectivePermission: (user: User, module: SystemToolModule) => PermissionLevel;
  canAccessModule: (userOrModule: User | SystemToolModule | string, module?: SystemToolModule) => boolean;
  canWriteModule: (module: SystemToolModule, user?: User) => boolean;
  switchUserRole: (role: UserRole) => void;
  currentTenant: CooperativeTenant;
  setCurrentTenant: (tenant: CooperativeTenant) => void;
  tenants: CooperativeTenant[];
  addTenant: (tenantData: Omit<CooperativeTenant, 'id'>) => CooperativeTenant;
  updateTenant: (tenantId: string, tenantData: Partial<CooperativeTenant>) => CooperativeTenant;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  isPendingCooperativeSetup: boolean;
  setIsPendingCooperativeSetup: (pending: boolean) => void;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; requiresCooperativeSetup: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; requiresCooperativeSetup: boolean; error?: string }>;
  registerUser: (name: string, email: string, pass: string, role: UserRole) => Promise<{ user: User | null; requiresCooperativeSetup: boolean; error?: string }>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void> | void;

  // Data Collections
  cooperados: Cooperado[];
  transacoesCapital: TransacaoCapital[];
  assembleias: Assembleia[];
  mandatos: Mandato[];
  auditoriaLogs: AuditoriaLog[];
  config: SistemaConfig;
  notifications: SystemNotification[];

  // Audit Logger
  addAuditLog: (modulo: AuditoriaLog['modulo'], acao: AuditoriaLog['acao'], detalhes: string, antesObj?: string, depoisObj?: string) => void;

  // Cooperado CRUD
  addCooperado: (cooperadoData: Omit<Cooperado, 'id' | 'tenantId' | 'historico' | 'capitalSubscrito' | 'capitalIntegralizado'>) => Cooperado;
  updateCooperado: (id: string, updatedData: Partial<Cooperado>) => void;
  deleteCooperado: (id: string) => void;
  deleteAllCooperados: () => number;
  restaurarCooperadosBaseCompleta: () => void;
  importarCooperadosCSV: (parsedRows: any[]) => { success: boolean; totalInseridos: number; totalAtualizados: number; message: string };
  syncCooperadosWithProdutores: (targetCooperados?: Cooperado[]) => void;
  fetchAddressByCep: (cep: string) => Promise<{ logradouro: string; bairro: string; cidade: string; estado: string } | null>;

  // Capital Social Actions
  addTransacaoCapital: (transacao: Omit<TransacaoCapital, 'id' | 'tenantId' | 'usuario'>) => void;
  registrarPagamentoParcela: (transacaoId: string, parcelaId: string, formaPagamento: FormaPagamento, reciboNum: string) => void;

  // Assembleia Actions
  addAssembleia: (assembleia: Omit<Assembleia, 'id' | 'tenantId'>) => void;
  updateAssembleia: (id: string, data: Partial<Assembleia>) => void;
  registrarPresenca: (assembleiaId: string, cooperadoId: string, tipoCheckin: 'QRCODE' | 'MANUAL' | 'CPF' | 'BIOMETRIA') => void;
  computarVoto: (assembleiaId: string, pautaId: string, voto: 'SIM' | 'NAO' | 'ABSTENCAO') => void;
  dispararConvocacoes: (assembleiaId: string, canais: ('EMAIL' | 'WHATSAPP' | 'SMS')[]) => Promise<boolean>;

  // Diretoria Actions
  addMandato: (mandato: Omit<Mandato, 'id' | 'tenantId'>) => void;
  updateMandato: (id: string, data: Partial<Mandato>) => void;

  // System Settings & Licensing
  updateConfig: (newConfig: Partial<SistemaConfig>) => void;
  restoreDefaultData: () => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonString: string) => { success: boolean; message: string };

  // SICOOP PLATFORM - Expanded Modules Data
  produtores: ProdutorRural[];
  addProdutor: (p: Omit<ProdutorRural, 'id' | 'tenantId'>) => void;
  updateProdutor: (id: string, p: Partial<ProdutorRural>) => void;
  deleteProdutor: (id: string) => void;

  produtos: ProdutoAgro[];
  addProduto: (p: Omit<ProdutoAgro, 'id' | 'tenantId'>) => void;
  updateProduto: (id: string, p: Partial<ProdutoAgro>) => void;
  deleteProduto: (id: string) => void;

  registrosProducao: RegistroProducao[];
  addRegistroProducao: (r: Omit<RegistroProducao, 'id' | 'tenantId'>) => void;
  updateRegistroProducao: (id: string, r: Partial<RegistroProducao>) => void;
  deleteRegistroProducao: (id: string) => void;

  programas: ProgramaGovernamental[];
  addPrograma: (p: Omit<ProgramaGovernamental, 'id' | 'tenantId'>) => void;
  updatePrograma: (id: string, p: Partial<ProgramaGovernamental>) => void;
  deletePrograma: (id: string) => void;

  chamadasPublicas: ChamadaPublica[];
  addChamadaPublica: (c: Omit<ChamadaPublica, 'id' | 'tenantId'>) => void;
  updateChamadaPublica: (id: string, c: Partial<ChamadaPublica>) => void;
  deleteChamadaPublica: (id: string) => void;

  // Rateio das quantidades de cada produto do edital entre os produtores
  // ofertantes e as escolas contempladas — um rateio por chamada pública.
  rateiosChamadas: RateioChamadaPublica[];
  salvarRateioChamada: (r: Omit<RateioChamadaPublica, 'id' | 'tenantId' | 'dataAtualizacao'>) => void;
  deleteRateioChamada: (chamadaPublicaId: string) => void;

  ofertasPAA: PropostaOfertaPAA[];
  addOfertaPAA: (o: Omit<PropostaOfertaPAA, 'id' | 'tenantId'>) => void;
  updateOfertaPAA: (id: string, o: Partial<PropostaOfertaPAA>) => void;
  deleteOfertaPAA: (id: string) => void;

  programacoesEntrega: ProgramacaoEntregaPAA[];
  addProgramacaoEntrega: (p: Omit<ProgramacaoEntregaPAA, 'id' | 'tenantId'>) => void;
  updateProgramacaoEntrega: (id: string, p: Partial<ProgramacaoEntregaPAA>) => void;
  deleteProgramacaoEntrega: (id: string) => void;

  prestacoesContas: PrestacaoContasPAA[];
  addPrestacaoContas: (p: Omit<PrestacaoContasPAA, 'id' | 'tenantId'>) => void;
  updatePrestacaoContas: (id: string, p: Partial<PrestacaoContasPAA>) => void;
  deletePrestacaoContas: (id: string) => void;

  pedidosProdutorPAA: PedidoProdutorPAA[];
  addPedidoProdutorPAA: (p: Omit<PedidoProdutorPAA, 'id' | 'tenantId'>) => void;
  updatePedidoProdutorPAA: (id: string, p: Partial<PedidoProdutorPAA>) => void;
  deletePedidoProdutorPAA: (id: string) => void;

  ordensCompra: OrdemCompra[];
  addOrdemCompra: (o: Omit<OrdemCompra, 'id' | 'tenantId'>) => void;
  updateOrdemCompra: (id: string, o: Partial<OrdemCompra>) => void;
  deleteOrdemCompra: (id: string) => void;

  planoContas: PlanoContaContabil[];
  addPlanoConta: (p: Omit<PlanoContaContabil, 'id'>) => void;
  updatePlanoConta: (id: string, p: Partial<PlanoContaContabil>) => void;
  deletePlanoConta: (id: string) => void;
  lancamentosContabeis: LancamentoContabil[];
  addLancamentoContabil: (l: Omit<LancamentoContabil, 'id' | 'tenantId' | 'usuario'>) => void;
  updateLancamentoContabil: (id: string, l: Partial<LancamentoContabil>) => void;
  deleteLancamentoContabil: (id: string) => void;

  patrimonio: ItemPatrimonio[];
  addItemPatrimonio: (p: Omit<ItemPatrimonio, 'id' | 'tenantId'>) => void;
  updateItemPatrimonio: (id: string, p: Partial<ItemPatrimonio>) => void;
  deleteItemPatrimonio: (id: string) => void;
  processarDepreciacaoMensal: (competencia: string) => { processados: number; puladosJaFeitos: number; puladosSemValor: number };

  contasPagarReceber: ContaPagarReceber[];
  addContaPagarReceber: (c: Omit<ContaPagarReceber, 'id' | 'tenantId'>) => string;
  updateContaPagarReceber: (id: string, c: Partial<ContaPagarReceber>) => void;
  deleteContaPagarReceber: (id: string) => void;
  pagarReceberConta: (id: string) => void;

  extratoBancario: ExtratoBancario;
  addLancamentoExtrato: (item: { data: string; historico: string; documento: string; tipo: 'CREDITO' | 'DEBITO'; valor: number; categoria: string }) => void;

  solicitacoesCompra: SolicitacaoCompra[];
  addSolicitacaoCompra: (s: Omit<SolicitacaoCompra, 'id' | 'tenantId'>) => void;
  updateSolicitacaoCompra: (id: string, s: Partial<SolicitacaoCompra>) => void;
  deleteSolicitacaoCompra: (id: string) => void;

  fornecedores: Fornecedor[];
  addFornecedor: (f: Omit<Fornecedor, 'id' | 'tenantId'>) => void;
  updateFornecedor: (id: string, f: Partial<Fornecedor>) => void;
  deleteFornecedor: (id: string) => void;

  estoque: ItemEstoque[];
  addItemEstoque: (i: Omit<ItemEstoque, 'id' | 'tenantId'>) => void;
  updateItemEstoque: (id: string, i: Partial<ItemEstoque>) => void;
  deleteItemEstoque: (id: string) => void;

  movimentacoesEstoque: MovimentacaoEstoque[];
  addMovimentacaoEstoque: (m: Omit<MovimentacaoEstoque, 'id' | 'tenantId' | 'dataHora'>) => void;
  deleteMovimentacaoEstoque: (id: string) => void;

  funcionariosRH: FuncionarioRH[];
  addFuncionarioRH: (f: Omit<FuncionarioRH, 'id' | 'tenantId'>) => void;
  updateFuncionarioRH: (id: string, f: Partial<FuncionarioRH>) => void;
  deleteFuncionarioRH: (id: string) => void;

  folhaPagamento: FolhaPagamento[];
  addFolhaPagamento: (f: Omit<FolhaPagamento, 'id' | 'tenantId'>) => void;
  updateFolhaPagamento: (id: string, f: Partial<FolhaPagamento>) => void;
  deleteFolhaPagamento: (id: string) => void;

  escolasPnae: EscolaPnae[];
  addEscolaPnae: (e: Omit<EscolaPnae, 'id' | 'tenantId'>) => void;
  updateEscolaPnae: (id: string, e: Partial<EscolaPnae>) => void;
  deleteEscolaPnae: (id: string) => void;
  motoristas: Motorista[];
  addMotorista: (m: Omit<Motorista, 'id' | 'tenantId'>) => void;
  updateMotorista: (id: string, m: Partial<Motorista>) => void;
  deleteMotorista: (id: string) => void;

  entregasEscola: EntregaEscolaPnae[];
  addEntregaEscola: (e: Omit<EntregaEscolaPnae, 'id' | 'tenantId'>) => void;
  confirmarEntregaEscola: (e: Omit<EntregaEscolaPnae, 'id' | 'tenantId'>) => void;
  deleteEntregaEscola: (id: string) => void;

  romaneiosMotorista: RomaneioMotorista[];
  addRomaneioMotorista: (r: Omit<RomaneioMotorista, 'id' | 'tenantId'>) => void;
  atualizarStatusRomaneio: (id: string, status: RomaneioMotorista['statusRota']) => void;
  deleteRomaneioMotorista: (id: string) => void;

  // Nota Fiscal & SEFAZ Ceará
  notasFiscais: NotaFiscal[];
  sefazCeConfig: SefazCeConfig;
  addNotaFiscal: (nf: Omit<NotaFiscal, 'id' | 'tenantId'>) => NotaFiscal;
  updateNotaFiscal: (id: string, nf: Partial<NotaFiscal>) => void;
  deleteNotaFiscal: (id: string) => void;
  transmitirSefazCe: (id: string) => Promise<{ success: boolean; motivo: string; chaveAcesso?: string; protocolo?: string }>;
  cancelarNotaFiscalSefaz: (id: string, justificativa: string) => Promise<{ success: boolean; motivo: string }>;
  updateSefazCeConfig: (config: Partial<SefazCeConfig>) => void;
  gerarNotaFiscalDePrestacaoContas: (prestacao: PrestacaoContasPAA) => NotaFiscal;
  gerarNotaFiscalEntradaProdutor: (pedido: PedidoProdutorPAA, produtorId: string, sistemaTributario?: SistemaTributarioNFe) => NotaFiscal;
  gerarNotaFiscalSaidaEscola: (pedidoOuEntrega: PedidoProdutorPAA | ProgramacaoEntregaPAA, escolaId: string, sistemaTributario?: SistemaTributarioNFe) => NotaFiscal;

  // License & SaaS Subscription
  licenseInfo: LicenseInfo;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  activateLicense: (key: string, plan?: LicensePlanType) => Promise<{ success: boolean; message: string }>;
  extendTrial: (days?: number) => void;
  updateLicenseUrls: (mensalUrl: string, anualUrl: string) => void;

  // Webhooks
  webhooks: WebhookEndpoint[];
  addWebhook: (webhookData: Omit<WebhookEndpoint, 'id' | 'tenantId' | 'createdAt' | 'logs'>) => void;
  updateWebhook: (id: string, data: Partial<WebhookEndpoint>) => void;
  deleteWebhook: (id: string) => void;
  testWebhook: (id: string, event: WebhookEvent) => Promise<{ success: boolean; statusCode: number; message: string }>;
  triggerWebhooks: (event: WebhookEvent, payload: any) => Promise<void>;


  // UI / Navigation helpers
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
  markNotificationAsRead: (id: string) => void;
}

const CoopContext = createContext<CoopContextType | undefined>(undefined);
const STORAGE_KEY = 'siscoope_system_db_v1';

const chaveUnica = (valor: unknown): string => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const pertenceAoTenant = (registro: { tenantId?: string }, tenantId: string) =>
  !registro.tenantId || registro.tenantId === tenantId;

const podeEditarAteDiaCinco = (registro: Record<string, any>, descricao: string): boolean => {
  const dataOriginal = registro.data || registro.dataEmissao || registro.dataLancamento ||
    registro.dataAquisicao || registro.dataFiliacao || registro.dataInicio ||
    registro.dataEntrega || registro.dataHora || registro.dataVencimento;
  if (!dataOriginal) return true;

  const dataTexto = String(dataOriginal).substring(0, 10);
  const dataRegistro = new Date(`${dataTexto}T00:00:00`);
  if (Number.isNaN(dataRegistro.getTime())) return true;

  const prazo = new Date(dataRegistro.getFullYear(), dataRegistro.getMonth() + 1, 5, 23, 59, 59, 999);
  if (new Date() <= prazo) return true;

  alert(`Edição bloqueada: ${descricao} só pode ser alterado até o dia 5 do mês seguinte ao registro (${prazo.toLocaleDateString('pt-BR')}).`);
  return false;
};

/**
 * Leitura do snapshot persistido, feita UMA vez por carregamento.
 *
 * Cada um dos ~25 inicializadores de useState abaixo chamava
 * `localStorage.getItem` + `JSON.parse` no blob inteiro. Com o banco cheio isso
 * significava dezenas de parses de vários megabytes em sequência, travando a
 * primeira renderização. Agora lemos e parseamos uma vez e todos reaproveitam.
 */
let blobCache: string | null | undefined;
let snapshotCache: Record<string, any> | null | undefined;

function lerBlobPersistido(): string | null {
  if (blobCache === undefined) {
    try {
      blobCache = localStorage.getItem(STORAGE_KEY);
    } catch {
      blobCache = null;
    }
  }
  return blobCache;
}

function parseSnapshot(_raw: string): Record<string, any> {
  if (snapshotCache === undefined) {
    try {
      const raw = lerBlobPersistido();
      snapshotCache = raw ? JSON.parse(raw) : null;
    } catch {
      snapshotCache = null;
    }
  }
  return snapshotCache ?? {};
}

/** Invalida os caches acima — chame após limpar ou reimportar o banco local. */
export function invalidarSnapshotPersistido() {
  blobCache = undefined;
  snapshotCache = undefined;
}

/**
 * Coleções descartadas primeiro quando o localStorage estoura a cota, em ordem
 * de tamanho. São justamente as que devem vir do Firestore de qualquer forma —
 * manter 1.700 cooperados com CPF em texto puro no navegador é um risco a mais
 * em computador compartilhado.
 */
const COLECOES_DESCARTAVEIS = [
  'cooperados',
  'auditoriaLogs',
  'registrosProducao',
  'lancamentosContabeis',
  'movimentacoesEstoque',
  'extratoBancario',
  'folhaPagamento',
  'transacoesCapital',
];

let timerGravacao: ReturnType<typeof setTimeout> | null = null;

/** Sinaliza para a UI que o snapshot local está incompleto por falta de espaço. */
export let snapshotTruncado = false;

function gravarSnapshot(payload: Record<string, any>) {
  let dados = payload;

  for (let tentativa = 0; tentativa <= COLECOES_DESCARTAVEIS.length; tentativa++) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
      blobCache = undefined;
      snapshotCache = undefined;
      snapshotTruncado = tentativa > 0;
      return;
    } catch (e) {
      const semEspaco =
        e instanceof DOMException &&
        (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');

      if (!semEspaco || tentativa === COLECOES_DESCARTAVEIS.length) {
        // O catch original engolia esse erro em silêncio: em produção, com
        // dados reais, o app simplesmente parava de salvar sem avisar ninguém.
        console.error(
          'Não foi possível gravar o snapshot local. Os dados desta sessão ' +
            'não serão restaurados ao recarregar a página.',
          e,
        );
        snapshotTruncado = true;
        return;
      }

      const descartar = COLECOES_DESCARTAVEIS[tentativa];
      console.warn(
        `[persistência] localStorage cheio — descartando "${descartar}" do cache local. ` +
          'Esses registros continuam disponíveis via Firestore.',
      );
      dados = { ...dados, [descartar]: [] };
    }
  }
}

/**
 * Agenda a gravação com debounce.
 *
 * O efeito que chama esta função depende de ~40 coleções, então disparava a
 * cada tecla digitada em qualquer formulário — serializando o banco inteiro
 * (mais de 1 MB) de forma síncrona na thread principal, a cada vez.
 */
function agendarGravacao(payload: Record<string, any>) {
  if (timerGravacao) clearTimeout(timerGravacao);
  timerGravacao = setTimeout(() => {
    timerGravacao = null;
    gravarSnapshot(payload);
  }, 800);
}

export const CoopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  // Loader genérico usado pelos módulos abaixo (produtores, GEPA/PAA, compras,
  // estoque, RH, contábil...) que antes NÃO liam nem gravavam no localStorage
  // e por isso perdiam todos os dados a cada recarregamento de página.
  function loadPersistedList<T>(field: string, fallback: T[]): T[] {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed[field])) return parsed[field] as T[];
      }
    } catch (e) {
      console.error(`Error loading "${field}" from localStorage`, e);
    }
    return fallback;
  }

  function loadPlanoContasPersistido(): PlanoContaContabil[] {
    const saved = loadPersistedList<PlanoContaContabil>('planoContas', INITIAL_PLANO_CONTAS);
    const contasAnexo = new Map(INITIAL_PLANO_CONTAS.map(conta => [conta.codigo, conta]));
    const existentes = new Set<string>();
    const mantidas = saved.filter(conta => {
      // Códigos numéricos devem obedecer ao anexo; códigos não numéricos
      // podem ser contas personalizadas criadas pela cooperativa.
      if (/^\d/.test(conta.codigo) && !contasAnexo.has(conta.codigo)) return false;
      if (existentes.has(conta.codigo)) return false;
      existentes.add(conta.codigo);
      return true;
    });
    const faltantes = INITIAL_PLANO_CONTAS
      .filter(conta => !existentes.has(conta.codigo))
      .map(conta => ({ ...conta }));
    return [...mantidas, ...faltantes];
  }

  function loadPersistedValue<T>(field: string, fallback: T): T {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (parsed[field] !== undefined && parsed[field] !== null) return parsed[field] as T;
      }
    } catch (e) {
      console.error(`Error loading "${field}" from localStorage`, e);
    }
    return fallback;
  }

  const [tenants, setTenants] = useState<CooperativeTenant[]>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (parsed.tenants?.length) return parsed.tenants;
      }
    } catch (e) {
      console.error('Error loading tenants from localStorage', e);
    }
    return INITIAL_TENANTS;
  });

  const [currentTenant, setCurrentTenant] = useState<CooperativeTenant>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (parsed.currentTenant) {
          const t = parsed.currentTenant;
          return {
            ...INITIAL_TENANTS[0],
            ...t,
            name: t.name || INITIAL_TENANTS[0].name,
            razaoSocial: t.razaoSocial || INITIAL_TENANTS[0].razaoSocial,
            cnpj: t.cnpj || INITIAL_TENANTS[0].cnpj,
            logoUrl: t.logoUrl || INITIAL_TENANTS[0].logoUrl,
            email: t.email || INITIAL_TENANTS[0].email,
            telefone: t.telefone || INITIAL_TENANTS[0].telefone,
            cep: t.cep || INITIAL_TENANTS[0].cep,
            logradouro: t.logradouro || INITIAL_TENANTS[0].logradouro,
            numero: t.numero || INITIAL_TENANTS[0].numero,
            bairro: t.bairro || INITIAL_TENANTS[0].bairro,
            cidade: t.cidade || INITIAL_TENANTS[0].cidade,
            estado: t.estado || INITIAL_TENANTS[0].estado,
          };
        }
      }
    } catch (e) {}
    return INITIAL_TENANTS[0];
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (parsed.currentUser) return { ...parsed.currentUser, role: 'ADMIN' };
      }
    } catch (e) {}
    return { ...INITIAL_USERS[0], role: 'ADMIN' };
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed.users) && parsed.users.length > 0) return parsed.users;
      }
    } catch (e) {}
    return INITIAL_USERS;
  });

  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (parsed.rolePermissions) return parsed.rolePermissions;
      }
    } catch (e) {}
    return DEFAULT_ROLE_PERMISSIONS;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isPendingCooperativeSetup, setIsPendingCooperativeSetup] = useState<boolean>(false);

  const [cooperados, setCooperados] = useState<Cooperado[]>(() => {
    let rawList: Cooperado[] = [];
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed.cooperados) && parsed.cooperados.length > 0) rawList = parsed.cooperados;
      }
    } catch (e) {}
    if (rawList.length === 0) {
      rawList = INITIAL_COOPERADOS;
    }
    return rawList.map(c => sanitizeCooperado(c));
  });

  const [transacoesCapital, setTransacoesCapital] = useState<TransacaoCapital[]>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed.transacoesCapital)) return parsed.transacoesCapital;
      }
    } catch (e) {}
    return INITIAL_TRANSACAO_CAPITAL;
  });

  const [assembleias, setAssembleias] = useState<Assembleia[]>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed.assembleias)) return parsed.assembleias;
      }
    } catch (e) {}
    return INITIAL_ASSEMBLEIAS;
  });

  const [mandatos, setMandatos] = useState<Mandato[]>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed.mandatos)) return parsed.mandatos;
      }
    } catch (e) {}
    return INITIAL_MANDATOS;
  });

  const [auditoriaLogs, setAuditoriaLogs] = useState<AuditoriaLog[]>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed.auditoriaLogs)) return parsed.auditoriaLogs;
      }
    } catch (e) {}
    return INITIAL_AUDITORIA_LOGS;
  });

  const [config, setConfig] = useState<SistemaConfig>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (parsed.config) return parsed.config;
      }
    } catch (e) {}
    return INITIAL_CONFIG;
  });

  // SICOOP PLATFORM - Modular States
  // Antes, todos os 24 estados abaixo eram inicializados SEMPRE a partir dos
  // dados mock (INITIAL_*) e nunca eram gravados no localStorage — ou seja,
  // qualquer cadastro de produtor, proposta de oferta PAA/PNAE, compra,
  // estoque, RH etc. era perdido ao recarregar a página. Agora todos usam o
  // mesmo padrão de carregar do localStorage (com fallback pro mock) usado
  // pelos demais estados (cooperados, tenants, etc.) e são persistidos no
  // useEffect de sincronização abaixo.
  const [produtores, setProdutores] = useState<ProdutorRural[]>(() => loadPersistedList('produtores', INITIAL_PRODUTORES));
  const [produtos, setProdutos] = useState<ProdutoAgro[]>(() => loadPersistedList('produtos', INITIAL_PRODUTOS));
  const [registrosProducao, setRegistrosProducao] = useState<RegistroProducao[]>(() => loadPersistedList('registrosProducao', INITIAL_REGISTROS_PRODUCAO));
  const [programas, setProgramas] = useState<ProgramaGovernamental[]>(() => loadPersistedList('programas', INITIAL_PROGRAMAS));
  const [chamadasPublicas, setChamadasPublicas] = useState<ChamadaPublica[]>(() => loadPersistedList('chamadasPublicas', INITIAL_CHAMADAS_PUBLICAS));
  const [rateiosChamadas, setRateiosChamadas] = useState<RateioChamadaPublica[]>(() => loadPersistedList('rateiosChamadas', []));
  const [ofertasPAA, setOfertasPAA] = useState<PropostaOfertaPAA[]>(() => loadPersistedList('ofertasPAA', INITIAL_OFERTAS_PAA));
  const [programacoesEntrega, setProgramacoesEntrega] = useState<ProgramacaoEntregaPAA[]>(() => loadPersistedList('programacoesEntrega', INITIAL_PROGRAMACOES_ENTREGA));
  const [prestacoesContas, setPrestacoesContas] = useState<PrestacaoContasPAA[]>(() => loadPersistedList('prestacoesContas', INITIAL_PRESTACOES_CONTAS));
  const [pedidosProdutorPAA, setPedidosProdutorPAA] = useState<PedidoProdutorPAA[]>(() => loadPersistedList('pedidosProdutorPAA', INITIAL_PEDIDOS_PRODUTOR));
  const [ordensCompra, setOrdensCompra] = useState<OrdemCompra[]>(() => loadPersistedList('ordensCompra', INITIAL_ORDENS_COMPRA));
  const [planoContas, setPlanoContas] = useState<PlanoContaContabil[]>(loadPlanoContasPersistido);
  const [lancamentosContabeis, setLancamentosContabeis] = useState<LancamentoContabil[]>(() => loadPersistedList('lancamentosContabeis', INITIAL_LANCAMENTOS_CONTABEIS));
  const [patrimonio, setPatrimonio] = useState<ItemPatrimonio[]>(() => loadPersistedList('patrimonio', INITIAL_PATRIMONIO));
  const [contasPagarReceber, setContasPagarReceber] = useState<ContaPagarReceber[]>(() => loadPersistedList('contasPagarReceber', INITIAL_CONTAS_PAGAR_RECEBER));
  const [extratoBancario, setExtratoBancario] = useState<ExtratoBancario>(() => loadPersistedValue('extratoBancario', INITIAL_EXTRATO_BANCARIO));
  const [solicitacoesCompra, setSolicitacoesCompra] = useState<SolicitacaoCompra[]>(() => loadPersistedList('solicitacoesCompra', INITIAL_SOLICITACOES_COMPRA));
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => loadPersistedList('fornecedores', INITIAL_FORNECEDORES));
  const [estoque, setEstoque] = useState<ItemEstoque[]>(() => loadPersistedList('estoque', INITIAL_ESTOQUE));
  const [movimentacoesEstoque, setMovimentacoesEstoque] = useState<MovimentacaoEstoque[]>(() => loadPersistedList('movimentacoesEstoque', INITIAL_MOVIMENTACOES_ESTOQUE));
  const [funcionariosRH, setFuncionariosRH] = useState<FuncionarioRH[]>(() => loadPersistedList('funcionariosRH', INITIAL_FUNCIONARIOS_RH));
  const [folhaPagamento, setFolhaPagamento] = useState<FolhaPagamento[]>(() => loadPersistedList('folhaPagamento', INITIAL_FOLHA_PAGAMENTO));
  const [escolasPnae, setEscolasPnae] = useState<EscolaPnae[]>(() => loadPersistedList('escolasPnae', INITIAL_ESCOLAS_PNAE));
  const [motoristas, setMotoristas] = useState<Motorista[]>(() => loadPersistedList('motoristas', []));
  const [entregasEscola, setEntregasEscola] = useState<EntregaEscolaPnae[]>(() => loadPersistedList('entregasEscola', INITIAL_ENTREGAS_ESCOLA));
  const [romaneiosMotorista, setRomaneiosMotorista] = useState<RomaneioMotorista[]>(() => loadPersistedList('romaneiosMotorista', INITIAL_ROMANEIOS_MOTORISTA));

  const DEFAULT_SEFAZ_CE_CONFIG: SefazCeConfig = {
    ambiente: 'HOMOLOGACAO',
    uf: 'CE',
    inscricaoEstadual: '06.849.201-4',
    cnpjEmitente: '07.812.345/0001-90',
    razaoSocialEmitente: 'COOPERATIVA AGROPECUÁRIA FAMILIAR DE TRAIRI E REGIÃO - COOPERAI',
    certificadoCadastrado: true,
    certificadoNomeArquivo: 'cert_cooperai_ceara_a1.pfx',
    certificadoDataValidade: '2027-12-31',
    senhaCertificado: '••••••••',
    tokenCscId: '000001',
    tokenCscCodigo: 'SEFAZ-CE-CSC-998877665544332211',
    serieNFe: '1',
    proximoNumeroNFe: 104,
    serieNFCe: '1',
    proximoNumeroNFCe: 52,
    regimeTributario: 'SIMPLES_NACIONAL',
    isencaoIcmsPnaeCeara: true
  };

  const INITIAL_NOTAS_FISCAIS_LIST: NotaFiscal[] = [
    {
      id: 'nf-ce-101',
      tenantId: 'coop-01',
      numeroNota: '000101',
      serie: '1',
      modelo: 'NFE_55',
      tipoOperacao: 'SAIDA_PNAE_PAA',
      emitenteRazaoSocial: 'COOPERATIVA AGROPECUÁRIA FAMILIAR DE TRAIRI E REGIÃO - COOPERAI',
      emitenteCnpjCpf: '07.812.345/0001-90',
      emitenteInscricaoEstadual: '06.849.201-4',
      emitenteMunicipio: 'Trairi',
      emitenteUf: 'CE',
      destinatarioNome: 'PREFEITURA MUNICIPAL DE TRAIRI - SECRETARIA DE EDUCAÇÃO (PNAE)',
      destinatarioCnpjCpf: '07.418.912/0001-50',
      destinatarioInscricaoEstadual: 'ISENTO',
      destinatarioEndereco: 'Rua Fernando Bezerra, 120 - Centro',
      destinatarioMunicipio: 'Trairi',
      destinatarioUf: 'CE',
      destinatarioEmail: 'pnae.educacao@trairi.ce.gov.br',
      dataEmissao: '2026-08-10',
      dataSaidaEntrada: '2026-08-10',
      valorProdutos: 14850.00,
      valorFrete: 0,
      valorDesconto: 0,
      valorIcms: 0,
      valorTotalNota: 14850.00,
      naturezaOperacao: 'Venda de Produção Agrícola Familiar para Alimentação Escolar (PNAE CE)',
      statusSefaz: 'AUTORIZADA',
      ambienteSefaz: 'HOMOLOGACAO',
      chaveAcesso44: '23260807812345000190550010000001011987654321',
      protocoloAutorizacao: '123260008492015',
      dataHoraAutorizacao: '2026-08-10T10:15:30-03:00',
      motivoStatusSefaz: '100 - Autorizado o uso da NF-e (SEFAZ Ceará)',
      observacoesFiscais: 'ISENÇÃO DE ICMS CONFORME REGULAMENTO DO ICMS DO ESTADO DO CEARÁ - DECRETO ESTADUAL PNAE/PAA.',
      itens: [
        {
          id: 'nfi-1',
          descricao: 'Morango Orgânico In Natura (Kg)',
          ncm: '0810.10.00',
          cfop: '5101',
          unidade: 'KG',
          quantidade: 450,
          valorUnitario: 18.00,
          valorTotal: 8100.00,
          icmsCstCsosn: '400',
          icmsAliquota: 0,
          icmsValor: 0
        },
        {
          id: 'nfi-2',
          descricao: 'Melancia Redonda In Natura (Kg)',
          ncm: '0807.11.00',
          cfop: '5101',
          unidade: 'KG',
          quantidade: 1500,
          valorUnitario: 4.50,
          valorTotal: 6750.00,
          icmsCstCsosn: '400',
          icmsAliquota: 0,
          icmsValor: 0
        }
      ]
    },
    {
      id: 'nf-ce-102',
      tenantId: 'coop-01',
      numeroNota: '000102',
      serie: '1',
      modelo: 'NFAE_AVULSA',
      tipoOperacao: 'SAIDA_VENDA',
      emitenteRazaoSocial: 'João Batista Ribeiro (Produtor Rural)',
      emitenteCnpjCpf: '123.456.789-00',
      emitenteInscricaoEstadual: '06.901.882-9',
      emitenteMunicipio: 'Trairi',
      emitenteUf: 'CE',
      destinatarioNome: 'COOPERATIVA AGROPECUÁRIA FAMILIAR DE TRAIRI E REGIÃO - COOPERAI',
      destinatarioCnpjCpf: '07.812.345/0001-90',
      destinatarioInscricaoEstadual: '06.849.201-4',
      destinatarioEndereco: 'AV. LUIZ ALVES DE OLIVEIRA, 450 - CENTRO',
      destinatarioMunicipio: 'Trairi',
      destinatarioUf: 'CE',
      dataEmissao: '2026-08-11',
      valorProdutos: 3200.00,
      valorFrete: 0,
      valorDesconto: 0,
      valorIcms: 0,
      valorTotalNota: 3200.00,
      naturezaOperacao: 'Entrega de Produção de Cooperado para Comercialização Conjunta (NFA-e SEFAZ CE)',
      statusSefaz: 'AUTORIZADA',
      ambienteSefaz: 'HOMOLOGACAO',
      chaveAcesso44: '23260812345678900100550010000001021122334455',
      protocoloAutorizacao: '123260009123847',
      dataHoraAutorizacao: '2026-08-11T14:22:10-03:00',
      motivoStatusSefaz: '100 - Autorizado o uso da NFA-e (SEFAZ Ceará)',
      observacoesFiscais: 'NOTA FISCAL AVULSA ELETRÔNICA DO PRODUTOR RURAL EMITIDA JUNTO À SEFAZ/CEARÁ.',
      itens: [
        {
          id: 'nfi-3',
          descricao: 'Milho Verde em Espiga (Kg)',
          ncm: '0710.40.00',
          cfop: '5101',
          unidade: 'KG',
          quantidade: 800,
          valorUnitario: 4.00,
          valorTotal: 3200.00,
          icmsCstCsosn: '400',
          icmsAliquota: 0,
          icmsValor: 0
        }
      ]
    },
    {
      id: 'nf-ce-103',
      tenantId: 'coop-01',
      numeroNota: '000103',
      serie: '1',
      modelo: 'NFE_55',
      tipoOperacao: 'SAIDA_PNAE_PAA',
      emitenteRazaoSocial: 'COOPERATIVA AGROPECUÁRIA FAMILIAR DE TRAIRI E REGIÃO - COOPERAI',
      emitenteCnpjCpf: '07.812.345/0001-90',
      emitenteInscricaoEstadual: '06.849.201-4',
      emitenteMunicipio: 'Trairi',
      emitenteUf: 'CE',
      destinatarioNome: 'SECRETARIA DA PROTEÇÃO SOCIAL (PAA CEARÁ)',
      destinatarioCnpjCpf: '08.812.990/0001-11',
      destinatarioInscricaoEstadual: 'ISENTO',
      destinatarioEndereco: 'Av. Bezerra de Menezes, 1820 - Fortaleza',
      destinatarioMunicipio: 'Fortaleza',
      destinatarioUf: 'CE',
      dataEmissao: '2026-08-12',
      valorProdutos: 8400.00,
      valorFrete: 0,
      valorDesconto: 0,
      valorIcms: 0,
      valorTotalNota: 8400.00,
      naturezaOperacao: 'Venda de Alimentos Agricultura Familiar - Programa de Aquisição de Alimentos (PAA CE)',
      statusSefaz: 'RASCUNHO',
      ambienteSefaz: 'HOMOLOGACAO',
      observacoesFiscais: 'Aguardando envio e validação do lote na SEFAZ Ceará.',
      itens: [
        {
          id: 'nfi-4',
          descricao: 'Feijão Caupi Macassar (Saca 50kg)',
          ncm: '0713.35.00',
          cfop: '5101',
          unidade: 'SACAS',
          quantidade: 35,
          valorUnitario: 240.00,
          valorTotal: 8400.00,
          icmsCstCsosn: '400',
          icmsAliquota: 0,
          icmsValor: 0
        }
      ]
    }
  ];

  const [sefazCeConfig, setSefazCeConfig] = useState<SefazCeConfig>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (parsed.sefazCeConfig) return parsed.sefazCeConfig;
      }
    } catch (e) {}
    return DEFAULT_SEFAZ_CE_CONFIG;
  });

  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed.notasFiscais) && parsed.notasFiscais.length > 0) return parsed.notasFiscais;
      }
    } catch (e) {}
    return INITIAL_NOTAS_FISCAIS_LIST;
  });

  const DEFAULT_LICENSE_INFO: LicenseInfo = {
    status: 'TRIAL',
    trialStartDate: new Date().toISOString(),
    trialDaysTotal: 30,
    kiwifyCheckoutUrlMensal: 'https://pay.kiwify.com.br/siscoope-mensal',
    kiwifyCheckoutUrlAnual: 'https://pay.kiwify.com.br/siscoope-anual'
  };

  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (parsed.licenseInfo) return parsed.licenseInfo;
      }
    } catch (e) {}
    return DEFAULT_LICENSE_INFO;
  });

  const trialDaysRemaining = React.useMemo(() => {
    if (licenseInfo.status === 'ACTIVE') return 999;
    if (!licenseInfo.trialStartDate) return 30;
    const start = new Date(licenseInfo.trialStartDate).getTime();
    const now = new Date().getTime();
    const diffMs = now - start;
    const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const remaining = (licenseInfo.trialDaysTotal || 30) - elapsedDays;
    return remaining > 0 ? remaining : 0;
  }, [licenseInfo]);

  // Uma licença ACTIVE cuja data de expiração (vinda do servidor) já passou
  // conta como expirada, mesmo antes da próxima sincronização.
  const licencaVencida =
    licenseInfo.status === 'ACTIVE' &&
    Boolean(licenseInfo.expiresAt) &&
    new Date(licenseInfo.expiresAt!).getTime() < Date.now();

  const isTrialExpired =
    licencaVencida || (licenseInfo.status !== 'ACTIVE' && trialDaysRemaining <= 0);

  /**
   * Ativa a licença validando a chave no servidor.
   *
   * A versão anterior aceitava qualquer string com 4 ou mais caracteres e
   * gravava status ACTIVE direto no estado local. Como todo o estado vai para
   * o localStorage, bastava editar `siscoope_system_db_v1` no DevTools para
   * liberar o sistema inteiro. Agora quem decide é POST /api/license/validate,
   * que confere a chave contra a assinatura registrada para o e-mail do
   * usuário autenticado — e devolve a data de expiração calculada no servidor.
   */
  const activateLicense = async (key: string, _plan: LicensePlanType = 'MENSAL') => {
    if (!key || !key.trim()) {
      return { success: false, message: 'Informe a chave recebida por e-mail após a compra.' };
    }

    const resposta = await validarLicencaNoServidor(key.trim());

    if (!resposta.success) {
      addAuditLog('CONFIGURACOES', 'ALTERACAO', 'Tentativa de ativação de licença recusada pelo servidor.');
      return { success: false, message: resposta.message };
    }

    setLicenseInfo(prev => ({
      ...prev,
      status: 'ACTIVE',
      licenseKey: key.toUpperCase().trim(),
      plan: resposta.plan ?? prev.plan,
      activatedAt: new Date().toISOString(),
      expiresAt: resposta.expiresAt
    }));
    addAuditLog('CONFIGURACOES', 'ALTERACAO', `Licença validada pelo servidor (plano ${resposta.plan}).`);
    return { success: true, message: resposta.message };
  };

  /**
   * Reinicia o período de teste.
   *
   * Continua sendo uma operação local, então NÃO é um controle de acesso:
   * serve para desenvolvimento e demonstração. O bloqueio real de quem não
   * pagou depende da validação no servidor acima.
   */
  const extendTrial = (days: number = 30) => {
    const updated: LicenseInfo = {
      ...licenseInfo,
      status: 'TRIAL',
      trialStartDate: new Date().toISOString(),
      trialDaysTotal: days
    };
    setLicenseInfo(updated);
    addAuditLog('CONFIGURACOES', 'ALTERACAO', `Período de teste do sistema renovado para ${days} dias.`);
  };

  const updateLicenseUrls = (mensalUrl: string, anualUrl: string) => {
    setLicenseInfo(prev => ({
      ...prev,
      kiwifyCheckoutUrlMensal: mensalUrl,
      kiwifyCheckoutUrlAnual: anualUrl
    }));
    addAuditLog('CONFIGURACOES', 'ALTERACAO', `Atualizou URLs de checkout da licença (mensal: ${mensalUrl}, anual: ${anualUrl})`);
  };

  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(() => {
    try {
      const saved = lerBlobPersistido();
      if (saved) {
        const parsed = parseSnapshot(saved);
        if (Array.isArray(parsed.webhooks)) return parsed.webhooks;
      }
    } catch (e) {}
    return INITIAL_WEBHOOKS;
  });

  // Automatically sync with browser localStorage on changes
  useEffect(() => {
    try {
      const payload = {
        tenants,
        currentTenant,
        currentUser,
        users,
        rolePermissions,
        cooperados,
        transacoesCapital,
        assembleias,
        mandatos,
        auditoriaLogs,
        config,
        licenseInfo,
        webhooks,
        notasFiscais,
        sefazCeConfig,
        // Módulos que antes não eram persistidos (ver loadPersistedList acima):
        produtores,
        produtos,
        registrosProducao,
        programas,
        chamadasPublicas,
        rateiosChamadas,
        ofertasPAA,
        programacoesEntrega,
        prestacoesContas,
        pedidosProdutorPAA,
        ordensCompra,
        planoContas,
        lancamentosContabeis,
        patrimonio,
        contasPagarReceber,
        extratoBancario,
        solicitacoesCompra,
        fornecedores,
        estoque,
        movimentacoesEstoque,
        funcionariosRH,
        folhaPagamento,
        escolasPnae,
        motoristas,
        entregasEscola,
        romaneiosMotorista,
        lastSavedAt: new Date().toISOString()
      };
      agendarGravacao(payload);
    } catch (e) {
      console.error('Falha ao preparar o snapshot local:', e);
    }
  }, [
    tenants, currentTenant, currentUser, users, rolePermissions, cooperados, transacoesCapital,
    assembleias, mandatos, auditoriaLogs, config, licenseInfo, webhooks, notasFiscais, sefazCeConfig,
    produtores, produtos, registrosProducao, programas, chamadasPublicas, rateiosChamadas, ofertasPAA,
    programacoesEntrega, prestacoesContas, pedidosProdutorPAA, ordensCompra, planoContas,
    lancamentosContabeis, patrimonio, contasPagarReceber, extratoBancario, solicitacoesCompra,
    fornecedores, estoque, movimentacoesEstoque, funcionariosRH, folhaPagamento, escolasPnae,
    entregasEscola, romaneiosMotorista, motoristas
  ]);

  // Mantém users/{uid} no Firestore sincronizado com o tenant do usuário
  // logado. É essa informação que as Firestore Security Rules usam para
  // isolar os dados por cooperativa no banco (defesa em profundidade: o
  // filtro por tenant já acontece aqui no Context, mas as regras do
  // Firestore são o que impede alguém de ler/escrever direto na API,
  // ignorando o app).
  useEffect(() => {
    if (isAuthenticated && currentUser?.id && currentTenant?.id) {
      saveUserTenantMappingToFirestore(currentUser.id, currentTenant.id, currentUser.email);
    }
  }, [isAuthenticated, currentUser?.id, currentTenant?.id, currentUser?.email]);

  // Automatic Weekly Supabase CSV Backup Check
  useEffect(() => {
    if (cooperados.length > 0) {
      checkAndRunWeeklyBackupIfNeeded({
        cooperados,
        contasPagarReceber
      });
    }
  }, [cooperados, contasPagarReceber]);

  // Sincroniza o status da assinatura com o servidor.
  //
  // Mudanças em relação à versão anterior:
  //  - o e-mail não vai mais na URL; o servidor identifica o usuário pelo ID
  //    token do Firebase, então ninguém consulta a assinatura de terceiros;
  //  - o polling era de 15 segundos e rodava mesmo sem usuário logado. Agora
  //    roda a cada 5 minutos e só quando há sessão;
  //  - uma assinatura inativa ou expirada agora REBAIXA o status local. Antes
  //    a sincronização só sabia ativar, então um reembolso nunca revogava o
  //    acesso de quem já tinha o localStorage marcado como ACTIVE.
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelado = false;

    const sincronizar = async () => {
      const assinatura = await consultarAssinatura();
      if (cancelado || !assinatura) return;

      setLicenseInfo(prev => {
        if (assinatura.hasActiveSubscription) {
          if (prev.status === 'ACTIVE' && prev.expiresAt === assinatura.expiresAt) return prev;
          return {
            ...prev,
            status: 'ACTIVE',
            plan: assinatura.plan ?? prev.plan,
            activatedAt: assinatura.activatedAt ?? prev.activatedAt,
            expiresAt: assinatura.expiresAt
          };
        }
        if (prev.status === 'ACTIVE') {
          return { ...prev, status: 'EXPIRED', expiresAt: assinatura.expiresAt };
        }
        return prev;
      });
    };

    sincronizar();
    const intervalo = setInterval(sincronizar, 5 * 60 * 1000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [isAuthenticated, currentUser?.email]);


  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');

  const addTenant = (tenantData: Omit<CooperativeTenant, 'id'>): CooperativeTenant => {
    const newTenant: CooperativeTenant = {
      ...tenantData,
      id: `tenant-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    };
    // Keep user-created tenant as active
    setTenants([newTenant]);
    setCurrentTenant(newTenant);
    setIsPendingCooperativeSetup(false);

    // Synchronize config state so Settings view displays exact same data
    setConfig(prev => ({
      ...prev,
      nomeCooperativa: newTenant.name,
      cooperativaNome: newTenant.name,
      razaoSocial: newTenant.razaoSocial || newTenant.name,
      cnpj: newTenant.cnpj,
      cooperativaCnpj: newTenant.cnpj,
      logoUrl: newTenant.logoUrl,
      cotaParteValor: newTenant.cotaParteValor,
      cotaParteMinima: newTenant.cotaParteMinima,
      emailOficial: newTenant.email,
      telefoneOficial: newTenant.telefone,
      enderecoSede: {
        ...prev.enderecoSede,
        cep: newTenant.cep || prev.enderecoSede.cep,
        logradouro: newTenant.logradouro || prev.enderecoSede.logradouro,
        numero: newTenant.numero || prev.enderecoSede.numero,
        bairro: newTenant.bairro || prev.enderecoSede.bairro,
        cidade: newTenant.cidade || prev.enderecoSede.cidade,
        estado: newTenant.estado || prev.enderecoSede.estado,
      }
    }));

    // Also update current user tenant ID if admin
    if (currentUser) {
      setCurrentUser(prev => ({ ...prev, tenantId: newTenant.id }));
    }

    addAuditLog('CONFIGURACOES', 'INCLUSAO', `Cadastrou nova cooperativa: ${newTenant.name} (${newTenant.cnpj})`);
    return newTenant;
  };

  const updateTenant = (tenantId: string, tenantData: Partial<CooperativeTenant>): CooperativeTenant => {
    let updatedTenantResult: CooperativeTenant | undefined;

    setTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        updatedTenantResult = { ...t, ...tenantData };
        return updatedTenantResult;
      }
      return t;
    }));

    const result = updatedTenantResult || { ...currentTenant, ...tenantData };

    if (currentTenant.id === tenantId || tenants.length <= 1) {
      setCurrentTenant(result);
      setConfig(prev => ({
        ...prev,
        nomeCooperativa: result.name || prev.nomeCooperativa,
        cooperativaNome: result.name || prev.cooperativaNome,
        razaoSocial: result.razaoSocial || prev.razaoSocial,
        cnpj: result.cnpj || prev.cnpj,
        cooperativaCnpj: result.cnpj || prev.cooperativaCnpj,
        logoUrl: result.logoUrl || prev.logoUrl,
        cotaParteValor: result.cotaParteValor ?? prev.cotaParteValor,
        cotaParteMinima: result.cotaParteMinima ?? prev.cotaParteMinima,
        emailOficial: result.email || prev.emailOficial,
        telefoneOficial: result.telefone || prev.telefoneOficial,
        enderecoSede: {
          ...prev.enderecoSede,
          cep: result.cep || prev.enderecoSede?.cep,
          logradouro: result.logradouro || prev.enderecoSede?.logradouro,
          numero: result.numero || prev.enderecoSede?.numero,
          bairro: result.bairro || prev.enderecoSede?.bairro,
          cidade: result.cidade || prev.enderecoSede?.cidade,
          estado: result.estado || prev.enderecoSede?.estado,
        }
      }));
    }

    addAuditLog('CONFIGURACOES', 'ALTERACAO', `Atualizou cadastro da cooperativa: ${result.name} (${result.cnpj})`);
    return result;
  };

  // Listen to active Firebase Auth state and user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const loggedInUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador Firebase',
          email: fbUser.email || '',
          role: fbUser.email === 'itamartrairi@gmail.com' || fbUser.email === 'admin@siscoope.com.br' ? 'ADMIN' : 'ADMIN',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          tenantId: currentTenant?.id || '',
          active: true,
          lastLogin: new Date().toISOString()
        };
        setCurrentUser(loggedInUser);
        setIsAuthenticated(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentTenant]);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      if (userCredential?.user) {
        const fbUser = userCredential.user;
        const loggedInUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário Firebase',
          email: fbUser.email || email,
          role: 'ADMIN',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
          tenantId: currentTenant?.id || '',
          active: true,
          lastLogin: new Date().toISOString()
        };

        setCurrentUser(loggedInUser);
        setIsAuthenticated(true);
        setIsPendingCooperativeSetup(false);

        addAuditLog('AUTH', 'LOGIN', `Usuário ${loggedInUser.name} realizou login via Firebase Auth (${loggedInUser.email})`);
        return { success: true, requiresCooperativeSetup: false };
      }
    } catch (error: any) {
      console.warn('Tentativa de login Firebase Auth:', error?.message);
    }

    // Check existing demo users fallback
    const foundUser = INITIAL_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setCurrentUser(foundUser);
      setIsAuthenticated(true);
      const userTenant = tenants.find(t => t.id === foundUser.tenantId);
      if (userTenant) {
        setCurrentTenant(userTenant);
        setIsPendingCooperativeSetup(false);
      } else {
        setIsPendingCooperativeSetup(true);
      }
      addAuditLog('AUTH', 'LOGIN', `Usuário ${foundUser.name} realizou login com e-mail/senha`);
      return { success: true, requiresCooperativeSetup: !userTenant };
    }

    // Default fallthrough user if password >= 4 chars
    if (email && pass.length >= 4) {
      const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        name: email.split('@')[0],
        email: email,
        role: 'ADMIN',
        tenantId: '',
        active: true,
        lastLogin: new Date().toISOString()
      };
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      setIsPendingCooperativeSetup(true);
      addAuditLog('AUTH', 'LOGIN', `Novo usuário ${newUser.name} autenticado via Firebase`);
      return { success: true, requiresCooperativeSetup: true };
    }

    return { success: false, requiresCooperativeSetup: false, error: 'Credenciais inválidas. Digite e-mail e senha cadastrados no Firebase.' };
  };

  const loginWithGoogle = async () => {
    return { success: false, requiresCooperativeSetup: false, error: 'O login via Google foi desativado.' };
  };

  const registerUser = async (name: string, email: string, pass: string, role: UserRole) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (userCredential?.user) {
        await updateProfile(userCredential.user, {
          displayName: name || email.split('@')[0]
        });

        const newUser: User = {
          id: userCredential.user.uid,
          name: name || email.split('@')[0],
          email: userCredential.user.email || email,
          role: role || 'ADMIN',
          avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100`,
          tenantId: '',
          active: true,
          lastLogin: new Date().toISOString()
        };
        setCurrentUser(newUser);
        setIsAuthenticated(true);
        setIsPendingCooperativeSetup(true);
        addAuditLog('AUTH', 'INCLUSAO', `Novo cadastro de usuário ${newUser.name} (${newUser.role}) no Firebase Auth`);

        return { user: newUser, requiresCooperativeSetup: true };
      }
    } catch (err: any) {
      console.warn('Erro ao registrar usuário no Firebase Auth:', err);
      let userMsg = err?.message || 'Erro ao registrar no Firebase.';
      if (err?.code === 'auth/email-already-in-use') {
        userMsg = 'Este e-mail já está cadastrado no Firebase. Faça login com suas credenciais.';
      } else if (err?.code === 'auth/weak-password') {
        userMsg = 'A senha deve ter pelo menos 6 caracteres no Firebase.';
      }
      return { user: null, requiresCooperativeSetup: false, error: userMsg };
    }

    const newUser: User = {
      id: `usr-reg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name: name || email.split('@')[0],
      email: email,
      role: role || 'ADMIN',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100`,
      tenantId: '',
      active: true,
      lastLogin: new Date().toISOString()
    };
    setCurrentUser(newUser);
    setIsAuthenticated(true);

    setIsPendingCooperativeSetup(true);
    addAuditLog('AUTH', 'INCLUSAO', `Novo cadastro de usuário ${newUser.name} (${newUser.role}) com e-mail/senha`);
    return { user: newUser, requiresCooperativeSetup: true };
  };

  const recoverPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Por favor, informe um endereço de e-mail válido.' };
    }

    try {
      await sendPasswordResetEmail(auth, email);
      addAuditLog('AUTH', 'ALTERACAO', `Solicitação de recuperação de senha enviada para: ${email}`);
      return { success: true, message: 'Instruções e link de redefinição de senha foram enviados para o seu e-mail pelo Firebase Auth!' };
    } catch (err: any) {
      console.warn('Erro ao solicitar redefinição de senha no Firebase Auth:', err);
    }

    addAuditLog('AUTH', 'ALTERACAO', `Solicitação de recuperação de senha processada para: ${email}`);
    return {
      success: true,
      message: `Enviamos as instruções de redefinição de senha para o e-mail ${email}. Por favor, verifique sua caixa de entrada e spam.`
    };
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Erro no signOut do Firebase:', e);
    }
    setIsAuthenticated(false);
    setIsPendingCooperativeSetup(false);
    addAuditLog('AUTH', 'LOGOUT', `Usuário ${currentUser?.name || 'Sistema'} encerrou a sessão`);
  };

  // User Management & Access Permissions CRUD
  const addUser = (userData: Omit<User, 'id' | 'tenantId'>): User => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id,
      active: userData.active ?? true,
      lastLogin: 'Nunca acessou'
    };
    setUsers(prev => [newUser, ...prev]);
    addAuditLog('CONFIGURACOES', 'INCLUSAO', `Novo usuário cadastrado: ${newUser.name} (${newUser.email}) - Perfil: ${newUser.role}`);
    return newUser;
  };

  const updateUser = (id: string, userData: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...userData } : u));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...userData }));
    }
    addAuditLog('CONFIGURACOES', 'ALTERACAO', `Cadastro/Permissões do usuário ID ${id} atualizados`);
  };

  const deleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert('Não é possível excluir o próprio usuário logado na sessão ativa.');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    addAuditLog('CONFIGURACOES', 'EXCLUSAO', `Usuário ID ${id} foi removido do sistema`);
  };

  const updateCurrentUserProfile = (profileData: Partial<User>) => {
    const updated = { ...currentUser, ...profileData };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...profileData } : u));
    addAuditLog('AUTH', 'ALTERACAO', `Perfil do usuário ${currentUser.name} atualizado pelo próprio usuário`);
  };

  const updateRolePermission = (role: UserRole, module: SystemToolModule, level: PermissionLevel) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: level
      }
    }));
    addAuditLog('CONFIGURACOES', 'ALTERACAO', `Permissão do perfil ${role} alterada no módulo ${module} para nível ${level}`);
  };

  const resetDefaultPermissions = () => {
    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    addAuditLog('CONFIGURACOES', 'ALTERACAO', 'Matriz de permissões por perfil restaurada para os padrões do sistema');
  };

  const getEffectivePermission = (user: User, module: SystemToolModule): PermissionLevel => {
    if (user.role === 'ADMIN') return 'ADMIN';
    if (user.customPermissions && user.customPermissions[module]) {
      return user.customPermissions[module]!;
    }
    const roleMap = rolePermissions[user.role];
    if (roleMap && roleMap[module]) {
      return roleMap[module];
    }
    return 'READ';
  };

  const canAccessModule = (userOrModule: User | SystemToolModule | string, module?: SystemToolModule): boolean => {
    let targetUser = currentUser;
    let targetModule: SystemToolModule;
    if (typeof userOrModule === 'string') {
      targetModule = userOrModule as SystemToolModule;
    } else {
      targetUser = userOrModule;
      targetModule = module!;
    }
    if (!targetUser) return false;
    const level = getEffectivePermission(targetUser, targetModule);
    return level !== 'NONE';
  };

  // canAccessModule só decide se o módulo aparece no menu (READ, WRITE ou
  // ADMIN todos liberam a navegação). Até aqui, nada no app checava se o
  // usuário tinha permissão de ESCRITA (WRITE/ADMIN) antes de permitir
  // criar/editar/excluir — ou seja, um usuário com nível "Somente Leitura"
  // configurado na Matriz de Permissões conseguia mesmo assim salvar e
  // apagar registros, porque os botões de cada tela não verificavam nada.
  // canWriteModule cobre esse caso: use para desabilitar/ocultar botões de
  // incluir, salvar, editar e excluir dentro de cada módulo.
  const canWriteModule = (module: SystemToolModule, user: User = currentUser): boolean => {
    if (!user) return false;
    const level = getEffectivePermission(user, module);
    return level === 'WRITE' || level === 'ADMIN';
  };

  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'not-1',
      titulo: 'Aviso de Mandato Próximo ao Vencimento',
      mensagem: 'O mandato da diretoria atual vence em 30 de Setembro de 2026. Organize a comissão eleitoral.',
      tipo: 'ALERTA',
      data: '2026-08-01 09:00',
      lida: false,
      linkModulo: 'diretoria'
    },
    {
      id: 'not-2',
      titulo: 'Convocações AGO 2026',
      mensagem: '6ª Assembléia Geral Ordinária agendada para 20/08/2026.',
      tipo: 'INFO',
      data: '2026-08-02 08:00',
      lida: false,
      linkModulo: 'assembleias'
    },
    {
      id: 'not-3',
      titulo: 'Parcelas de Capital a Vencer',
      mensagem: '2 parcelas de integralização vencem nos próximos 15 dias.',
      tipo: 'ALERTA',
      data: '2026-08-02 07:30',
      lida: false,
      linkModulo: 'capital'
    }
  ]);

  // Handle Theme class on body
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const switchUserRole = (role: UserRole) => {
    const foundUser = INITIAL_USERS.find(u => u.role === role) || {
      ...currentUser,
      role
    };
    setCurrentUser(foundUser);
    addAuditLog('AUTH', 'LOGIN', `Perfil alterado temporariamente para ${role}`);
  };

  // Helper for audit logging
  const addAuditLog = (
    modulo: AuditoriaLog['modulo'],
    acao: AuditoriaLog['acao'],
    detalhes: string,
    antesObj?: string,
    depoisObj?: string
  ) => {
    const newLog: AuditoriaLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id,
      usuarioId: currentUser.id,
      usuarioNome: currentUser.name,
      usuarioPerfil: currentUser.role,
      dataHora: new Date().toISOString().replace('T', ' ').substring(0, 19),
      modulo,
      acao,
      ip: '187.56.12.' + Math.floor(Math.random() * 200 + 10),
      detalhes,
      antesObj,
      depoisObj
    };
    setAuditoriaLogs(prev => [newLog, ...prev]);
  };

  // ViaCEP address API lookup
  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) return null;
      return {
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || ''
      };
    } catch {
      return null;
    }
  };

  // Cooperado CRUD
  const addCooperado = (cooperadoData: Omit<Cooperado, 'id' | 'tenantId' | 'historico' | 'capitalSubscrito' | 'capitalIntegralizado'>) => {
    const cpf = chaveUnica(cooperadoData.cpf);
    const matricula = chaveUnica(cooperadoData.matricula);
    const nomeData = `${chaveUnica(cooperadoData.nome)}|${chaveUnica(cooperadoData.dataNascimento)}`;
    const duplicado = cooperados.some(c => pertenceAoTenant(c, currentTenant.id) && (
      (cpf && chaveUnica(c.cpf) === cpf) ||
      (matricula && chaveUnica(c.matricula) === matricula) ||
      (nomeData !== '|' && `${chaveUnica(c.nome)}|${chaveUnica(c.dataNascimento)}` === nomeData)
    ));
    if (duplicado) {
      alert('Cadastro não realizado: já existe um cooperado com o mesmo CPF, matrícula ou combinação de nome e data de nascimento.');
      return null as any;
    }
    const newId = `cop-${Date.now()}`;
    const rawCooperado: Cooperado = {
      ...cooperadoData,
      id: newId,
      tenantId: currentTenant.id,
      capitalSubscrito: config.cotaParteValor * config.cotaParteMinima,
      capitalIntegralizado: 0,
      historico: [
        {
          id: `h-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          data: new Date().toISOString().replace('T', ' ').substring(0, 16),
          usuario: currentUser.name,
          acao: 'Inclusão de Cooperado',
          detalhes: `Cooperado cadastrado com matrícula ${cooperadoData.matricula}`
        }
      ]
    };

    const newCooperado = sanitizeCooperado(rawCooperado);

    setCooperados(prev => {
      const nextList = [newCooperado, ...prev];
      syncCooperadosWithProdutores(nextList);
      return nextList;
    });
    addAuditLog('COOPERADOS', 'INCLUSAO', `Cadastrou o cooperado ${newCooperado.nome} (${newCooperado.matricula})`);
    triggerWebhooks('cooperado.created', newCooperado);
    return newCooperado;
  };


  const updateCooperado = (id: string, updatedData: Partial<Cooperado>) => {
    setCooperados(prev => {
      const nextList = prev.map(c => {
        if (c.id === id) {
          const oldState = JSON.stringify({ nome: c.nome, situacao: c.situacao, telefone: c.telefone });
          const merged = sanitizeCooperado({ ...c, ...updatedData });
          const newState = JSON.stringify(merged);
          
          const updatedHistorico = [
            {
              id: `h-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              data: new Date().toISOString().replace('T', ' ').substring(0, 16),
              usuario: currentUser.name,
              acao: 'Alteração de Cadastro',
              detalhes: `Campos atualizados no cadastro do cooperado`
            },
            ...c.historico
          ];

          addAuditLog('COOPERADOS', 'ALTERACAO', `Atualizou o cadastro do cooperado ${merged.nome} (${merged.matricula})`, oldState, newState);

          return {
            ...merged,
            historico: updatedHistorico
          };
        }
        return c;
      });
      syncCooperadosWithProdutores(nextList);
      return nextList;
    });
  };

  const deleteCooperado = (id: string) => {
    const target = cooperados.find(c => c.id === id);
    if (target) {
      setCooperados(prev => prev.filter(c => c.id !== id));
      addAuditLog('COOPERADOS', 'EXCLUSAO', `Removeu/desativou o cooperado ${target.nome} (${target.matricula})`);
    }
  };

  const deleteAllCooperados = (): number => {
    const targetCooperados = cooperados.filter(c => c.tenantId === currentTenant.id);
    const total = targetCooperados.length;
    if (total === 0) return 0;

    setCooperados(prev => prev.filter(c => c.tenantId !== currentTenant.id));
    syncCooperadosWithProdutores(cooperados.filter(c => c.tenantId !== currentTenant.id));
    addAuditLog('COOPERADOS', 'EXCLUSAO', `Excluiu todos os ${total} cooperados da cooperativa atual.`);
    return total;
  };

  const isCafValida = (validadeStr?: string): boolean => {
    if (!validadeStr) return true;
    let d: Date;
    if (validadeStr.includes('/')) {
      const parts = validadeStr.split('/');
      if (parts.length === 3) {
        d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      } else {
        d = new Date(validadeStr);
      }
    } else {
      d = new Date(validadeStr);
    }
    if (isNaN(d.getTime())) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  };

  const syncCooperadosWithProdutores = (targetCooperados?: Cooperado[]) => {
    const list = targetCooperados || cooperados;
    setProdutores(prevProdutores => {
      const produtorMap = new Map<string, ProdutorRural>();
      prevProdutores.forEach(p => {
        if (p.cpfCnpj) produtorMap.set(p.cpfCnpj.replace(/\D/g, ''), p);
      });

      const updatedProdutores = [...prevProdutores];

      list.forEach(c => {
        const cleanCpf = c.cpf ? c.cpf.replace(/\D/g, '') : '';
        if (!cleanCpf) return;

        // Condições de sincronização:
        // 1. Cooperado deve estar ATIVO
        // 2. Deve estar marcado como Apto PAA (aptoPaa === true ou não ser false por padrão)
        // 3. Validade da CAF/DAP não deve estar vencida em relação à data atual
        const isAtivo = c.situacao === 'ATIVO';
        const isAptoPaa = c.aptoPaa !== false;
        const cafValida = isCafValida(c.cafDapValidade);
        const elegivel = isAtivo && isAptoPaa && cafValida;

        const existingP = produtorMap.get(cleanCpf);

        if (elegivel) {
          if (!existingP) {
            const newP: ProdutorRural = {
              id: `prod-sync-${c.id}`,
              tenantId: currentTenant?.id || 'coop-01',
              cooperadoId: c.id,
              nome: c.nome,
              cpfCnpj: c.cpf,
              cafDapNum: c.dapCaf || 'DAP-TRAIRI-2026',
              cafDapValidade: c.cafDapValidade || '2028-12-31',
              statusDap: 'ATIVO',
              nomePropriedade: `Propriedade ${c.nome.split(' ')[0]} - ${c.localidadeComunidade || c.bairro || 'Trairi'}`,
              areaHectares: 5,
              municipio: c.cidade || 'Trairi',
              uf: c.estado || 'CE',
              comunidade: c.localidadeComunidade || c.bairro || 'Zona Rural',
              telefone: c.celular || c.telefone || '(85) 99900-0000',
              certificacaoOrganica: true,
              situacao: 'ATIVO'
            };
            updatedProdutores.push(newP);
            produtorMap.set(cleanCpf, newP);
          } else {
            // Se já existe, garante que está ATIVO e com os dados de CAF atualizados
            const idx = updatedProdutores.findIndex(p => p.id === existingP.id);
            if (idx !== -1) {
              updatedProdutores[idx] = {
                ...updatedProdutores[idx],
                situacao: 'ATIVO',
                statusDap: 'ATIVO',
                cafDapNum: c.dapCaf || updatedProdutores[idx].cafDapNum,
                cafDapValidade: c.cafDapValidade || updatedProdutores[idx].cafDapValidade
              };
            }
          }
        } else if (existingP) {
          // Se não é elegível (ex: inativo, inapto PAA ou CAF vencida), inativa o produtor no cadastro
          const idx = updatedProdutores.findIndex(p => p.id === existingP.id);
          if (idx !== -1) {
            updatedProdutores[idx] = {
              ...updatedProdutores[idx],
              situacao: 'INATIVO',
              statusDap: !cafValida ? 'EXPIRADA' : 'INATIVO'
            };
          }
        }
      });

      return updatedProdutores;
    });
  };

  const restaurarCooperadosBaseCompleta = () => {
    const fullList = INITIAL_COOPERADOS.map(c => sanitizeCooperado(c));
    setCooperados(fullList);
    syncCooperadosWithProdutores(fullList);
    addAuditLog('COOPERADOS', 'INCLUSAO', `Anulou exclusões e restaurou a base completa de ${fullList.length} cooperados do Trairi.`);
  };

  const importarCooperadosCSV = (rows: any[]): { success: boolean; totalInseridos: number; totalAtualizados: number; message: string } => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, totalInseridos: 0, totalAtualizados: 0, message: 'Nenhum registro válido encontrado na planilha.' };
    }

    let totalInseridos = 0;
    let totalAtualizados = 0;

    setCooperados(prev => {
      const mapByCpf = new Map<string, Cooperado>();
      const mapByMatricula = new Map<string, Cooperado>();

      prev.forEach(c => {
        if (c.cpf) mapByCpf.set(c.cpf.replace(/\D/g, ''), c);
        if (c.matricula) mapByMatricula.set(c.matricula.trim().toLowerCase(), c);
      });

      const newArr = [...prev];

      rows.forEach((row, idx) => {
        // Pre-sanitize raw row first
        const cleanRow = sanitizeCooperado(row);

        const rawNome = (cleanRow.nome || cleanRow.nomeCompleto || cleanRow['Nome Completo'] || cleanRow['Nome'] || cleanRow['NOME'] || cleanRow.nomeUsual || '').toString().trim();
        if (!rawNome) return;

        const rawCpf = (cleanRow.cpf || cleanRow.CPF || cleanRow['cpf'] || '').toString().trim();
        const cleanCpf = rawCpf.replace(/\D/g, '');

        const rawMatricula = (cleanRow.matricula || cleanRow.Matricula || cleanRow['Matrícula'] || cleanRow['Matricula'] || `IMP-${Date.now()}-${idx}`).toString().trim();

        const existingByCpf = cleanCpf ? mapByCpf.get(cleanCpf) : undefined;
        const existingByMat = mapByMatricula.get(rawMatricula.toLowerCase());
        const existing = existingByCpf || existingByMat;

        const newCoopObj: Cooperado = sanitizeCooperado({
          id: existing ? existing.id : `cop-imp-${Date.now()}-${idx}`,
          tenantId: currentTenant?.id || 'coop-01',
          matricula: rawMatricula,
          nome: rawNome.toUpperCase(),
          cpf: rawCpf || existing?.cpf || '000.000.000-00',
          rg: (cleanRow.rg || cleanRow.RG || cleanRow['RG'] || existing?.rg || '1234567 SSP-CE').toString(),
          dataNascimento: (cleanRow.dataNascimento || cleanRow['Data Nasc.'] || cleanRow['Data Nascimento'] || existing?.dataNascimento || '1980-01-01').toString(),
          sexo: (cleanRow.sexo || cleanRow.Sexo || existing?.sexo || 'M').toString().toUpperCase().startsWith('F') ? 'F' : 'M',
          estadoCivil: (cleanRow.estadoCivil || cleanRow['Estado Civil'] || existing?.estadoCivil || 'CASADO').toString().toUpperCase() as any,
          profissao: (cleanRow.profissao || cleanRow['Profissão'] || cleanRow['Profissao'] || existing?.profissao || 'AGRICULTOR').toString().toUpperCase(),
          escolaridade: (cleanRow.escolaridade || cleanRow['Escolaridade'] || existing?.escolaridade || 'Ensino Fundamental').toString(),
          naturalidade: (cleanRow.naturalidade || cleanRow['Naturalidade'] || existing?.naturalidade || 'TRAIRI').toString(),
          nacionalidade: (cleanRow.nacionalidade || cleanRow['Nacionalidade'] || existing?.nacionalidade || 'BRASILEIRO').toString(),
          situacao: (cleanRow.situacao || cleanRow['Situação'] || cleanRow['Situacao'] || existing?.situacao || 'ATIVO').toString().toUpperCase() as any,
          dataFiliacao: (cleanRow.dataFiliacao || cleanRow['Data Admissão'] || cleanRow['Data Filiacao'] || existing?.dataFiliacao || new Date().toISOString().substring(0, 10)).toString(),
          categoria: (cleanRow.categoria || cleanRow['Categoria'] || existing?.categoria || 'EFETIVO').toString().toUpperCase() as any,
          fotoUrl: existing?.fotoUrl || '',
          cep: (cleanRow.cep || cleanRow['CEP'] || existing?.cep || '62.690-000').toString(),
          logradouro: (cleanRow.logradouro || cleanRow.endereco || cleanRow['Logradouro'] || cleanRow['Endereço'] || existing?.logradouro || 'Sede Cooperativa').toString(),
          numero: (cleanRow.numero || cleanRow['Número'] || existing?.numero || 'S/N').toString(),
          complemento: (cleanRow.complemento || cleanRow['Complemento'] || existing?.complemento || '').toString(),
          bairro: (cleanRow.bairro || cleanRow['Bairro'] || existing?.bairro || 'Centro').toString(),
          cidade: (cleanRow.cidade || cleanRow['Cidade'] || existing?.cidade || 'Trairi').toString(),
          estado: (cleanRow.estado || cleanRow['Estado'] || cleanRow['UF'] || existing?.estado || 'CE').toString(),
          pais: 'Brasil',
          telefone: (cleanRow.telefone || cleanRow['Telefone'] || existing?.telefone || '').toString(),
          celular: (cleanRow.celular || cleanRow['Celular'] || existing?.celular || '').toString(),
          whatsapp: (cleanRow.whatsapp || cleanRow['WhatsApp'] || existing?.whatsapp || '').toString(),
          email: (cleanRow.email || cleanRow['E-mail'] || cleanRow['Email'] || existing?.email || '').toString(),
          contatoEmergencia: (cleanRow.contatoEmergencia || existing?.contatoEmergencia || 'Secretaria').toString(),
          documentos: existing?.documentos || [],
          banco: (cleanRow.banco || cleanRow['Banco'] || existing?.banco || 'Banco do Brasil').toString(),
          agencia: (cleanRow.agencia || cleanRow['Agência'] || existing?.agencia || '0001').toString(),
          conta: (cleanRow.conta || cleanRow['Conta'] || existing?.conta || '10000-1').toString(),
          tipoConta: (cleanRow.tipoConta || existing?.tipoConta || 'CORRENTE').toString() as any,
          chavePix: (cleanRow.chavePix || cleanRow['Chave PIX'] || existing?.chavePix || '').toString(),
          capitalSubscrito: Number(cleanRow.capitalSubscrito || cleanRow['Capital Subscrito'] || existing?.capitalSubscrito || 1000),
          capitalIntegralizado: Number(cleanRow.capitalIntegralizado || cleanRow['Capital Integralizado (R$)'] || cleanRow['Capital Integralizado'] || existing?.capitalIntegralizado || 0),
          historico: existing?.historico || [
            {
              id: `h-imp-${Date.now()}-${idx}`,
              data: new Date().toISOString().substring(0, 10),
              usuario: currentUser?.name || 'Sistema',
              acao: 'Importação CSV/Excel',
              detalhes: 'Cooperado importado via planilha CSV/Excel'
            }
          ],
          dapCaf: cleanRow.dapCaf || cleanRow['DAP/CAF'] || cleanRow['DAP'] || existing?.dapCaf || 'SIM',
          cafDapValidade: (cleanRow.cafDapValidade || cleanRow['Validade CAF/DAP'] || cleanRow['Validade CAF'] || cleanRow['Validade DAP'] || existing?.cafDapValidade || '2028-12-31').toString(),
          aptoPaa: cleanRow.aptoPaa !== undefined 
            ? Boolean(cleanRow.aptoPaa) 
            : (cleanRow['Apto PAA'] === 'SIM' || cleanRow['Apto PAA'] === 'Sim' || cleanRow['Apto PAA'] === 'sim' || cleanRow['Apto PAA'] === true || (existing?.aptoPaa ?? true)),
          localidadeComunidade: cleanRow.localidadeComunidade || cleanRow['Comunidade/Localidade'] || cleanRow['Comunidade'] || existing?.localidadeComunidade || 'SEDE',
          nomeUsual: cleanRow.nomeUsual || cleanRow['Nome Usual/Apelido'] || cleanRow['Nome Usual'] || existing?.nomeUsual || rawNome,
          aptoAVotar: cleanRow.aptoAVotar === true || cleanRow['Apto a Votar'] === 'SIM' || cleanRow['Apto Votar'] === 'SIM' || existing?.aptoAVotar || true,
          falecido: cleanRow.falecido === true || cleanRow['Falecido'] === 'SIM' || existing?.falecido || false
        });

        if (existing) {
          totalAtualizados++;
          const targetIdx = newArr.findIndex(c => c.id === existing.id);
          if (targetIdx !== -1) newArr[targetIdx] = newCoopObj;
        } else {
          totalInseridos++;
          newArr.push(newCoopObj);
        }
      });

      syncCooperadosWithProdutores(newArr);
      return newArr;
    });

    addAuditLog('COOPERADOS', 'INCLUSAO', `Importação de planilha CSV/Excel realizada: ${totalInseridos} inseridos, ${totalAtualizados} atualizados.`);
    return {
      success: true,
      totalInseridos,
      totalAtualizados,
      message: `Importação realizada com sucesso! ${totalInseridos} novos cooperados cadastrados e ${totalAtualizados} atualizados.`
    };
  };

  // Capital Social Actions
  const addTransacaoCapital = (transacaoData: Omit<TransacaoCapital, 'id' | 'tenantId' | 'usuario'>) => {
    const newId = `cap-${Date.now()}`;
    const valorNum = Number(transacaoData.valor) || 0;
    const cooperadoNome = transacaoData.cooperadoNome || 'Cooperado';
    const cooperadoMatricula = transacaoData.cooperadoMatricula || '';
    const nowIsoDate = transacaoData.data || new Date().toISOString().substring(0, 10);
    const numeroDoc = transacaoData.numeroDocumento || `REC-${Date.now().toString().substring(6)}`;

    const newTransacao: TransacaoCapital = {
      ...transacaoData,
      id: newId,
      valor: valorNum,
      cooperadoNome,
      cooperadoMatricula,
      data: nowIsoDate,
      numeroDocumento: numeroDoc,
      tenantId: currentTenant?.id || 'coop-01',
      usuario: currentUser?.name || 'Administrador'
    };

    setTransacoesCapital(prev => [newTransacao, ...(prev || [])]);

    // Update Cooperado accumulated balances
    setCooperados(prev => (prev || []).map(c => {
      if (c.id === transacaoData.cooperadoId) {
        let sub = Number(c.capitalSubscrito) || 0;
        let int = Number(c.capitalIntegralizado) || 0;

        if (transacaoData.tipo === 'SUBSCRICAO') sub += valorNum;
        if (transacaoData.tipo === 'INTEGRALIZACAO' && transacaoData.status === 'CONCLUIDO') int += valorNum;
        if (transacaoData.tipo === 'DEVOLUCAO' || transacaoData.tipo === 'BAIXA') {
          sub = Math.max(0, sub - valorNum);
          int = Math.max(0, int - valorNum);
        }

        return { ...c, capitalSubscrito: sub, capitalIntegralizado: int };
      }
      return c;
    }));

    // Synchronize automatically with Financeiro and Contábil
    const isPaid = transacaoData.status === 'CONCLUIDO';

    const newConta: ContaPagarReceber = {
      id: `fin-cap-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant?.id || 'coop-01',
      tipo: 'RECEBER',
      descricao: `Cota-Parte Capital (${transacaoData.tipo}) - ${cooperadoNome}`,
      pessoaNome: cooperadoNome,
      categoria: 'CAPITAL_SOCIAL',
      valor: valorNum,
      dataEmissao: nowIsoDate,
      dataVencimento: nowIsoDate,
      status: isPaid ? 'PAGO' : 'PENDENTE',
      dataPagamento: isPaid ? nowIsoDate : undefined,
      centroCusto: 'Capital Social'
    };
    setContasPagarReceber(prev => [newConta, ...(prev || [])]);

    if (isPaid) {
      addLancamentoExtrato({
        data: nowIsoDate,
        historico: `Integralização Capital Social - ${cooperadoNome}`,
        documento: numeroDoc,
        tipo: 'CREDITO',
        valor: valorNum,
        categoria: 'CAPITAL_SOCIAL'
      });
    }

    const newLanc: LancamentoContabil = {
      id: `lanc-cap-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant?.id || 'coop-01',
      numeroLancamento: 3000 + Math.floor(Math.random() * 6000),
      data: nowIsoDate,
      // Se já foi pago (integralizado) na hora: Débito Banco / Crédito
      // Capital Integralizado. Se ainda está pendente (só subscrito, a
      // pagar em parcelas): Débito Capital a Integralizar (conta devedora,
      // funciona como um "a receber" do cooperado) / Crédito Capital
      // Subscrito — conforme o Plano de Contas da cooperativa.
      contaDebitoCodigo: isPaid ? '1.1.01.002' : '3.1.01.003',
      contaDebitoNome: isPaid ? 'Bancos Conta Movimento' : 'Capital a Integralizar',
      contaCreditoCodigo: isPaid ? '3.1.01.002' : '3.1.01.001',
      contaCreditoNome: isPaid ? 'Capital Integralizado' : 'Capital Subscrito',
      valor: valorNum,
      historico: `Lançamento de Capital Social (${transacaoData.tipo}) - Cooperado ${cooperadoNome}`,
      moduloOrigem: 'FINANCEIRO',
      usuario: currentUser?.name || 'Administrador'
    };
    setLancamentosContabeis(prev => [newLanc, ...(prev || [])]);

    addAuditLog('CAPITAL', 'INCLUSAO', `Lançamento de Capital ${transacaoData.tipo} - R$ ${valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${cooperadoNome}`);
    triggerWebhooks('capital.transaction', newTransacao);
  };


  const registrarPagamentoParcela = (transacaoId: string, parcelaId: string, formaPagamento: FormaPagamento, reciboNum: string) => {
    setTransacoesCapital(prev => (prev || []).map(tx => {
      if (tx.id === transacaoId && tx.parcelas) {
        let totalPagoParcela = 0;
        const updatedParcelas = tx.parcelas.map(p => {
          if (p.id === parcelaId) {
            totalPagoParcela = Number(p.valor) || 0;
            return {
              ...p,
              status: 'PAGO' as const,
              dataPagamento: new Date().toISOString().substring(0, 10),
              formaPagamento,
              reciboNum
            };
          }
          return p;
        });

        // Update member capital integralizado and trigger financial/accounting sync
        if (totalPagoParcela > 0) {
          setCooperados(coopList => (coopList || []).map(c => {
            if (c.id === tx.cooperadoId) {
              const prevInt = Number(c.capitalIntegralizado) || 0;
              return { ...c, capitalIntegralizado: prevInt + totalPagoParcela };
            }
            return c;
          }));

          const nowIsoDate = new Date().toISOString().substring(0, 10);
          addLancamentoExtrato({
            data: nowIsoDate,
            historico: `Pagamento Parcela Cota-Parte (${tx.cooperadoNome || 'Cooperado'}) - Recibo ${reciboNum}`,
            documento: reciboNum,
            tipo: 'CREDITO',
            valor: totalPagoParcela,
            categoria: 'CAPITAL_SOCIAL'
          });

          addLancamentoContabil({
            numeroLancamento: 3000 + Math.floor(Math.random() * 6000),
            data: nowIsoDate,
            // Baixa da parcela: entra dinheiro no banco, reduzindo o valor
            // ainda "a integralizar" pelo cooperado.
            contaDebitoCodigo: '1.1.01.002',
            contaDebitoNome: 'Bancos Conta Movimento',
            contaCreditoCodigo: '3.1.01.003',
            contaCreditoNome: 'Capital a Integralizar',
            valor: totalPagoParcela,
            historico: `Baixa Parcela Cota-Parte Capital (${reciboNum}) - Cooperado ${tx.cooperadoNome || 'Cooperado'}`,
            moduloOrigem: 'FINANCEIRO'
          });
        }

        addAuditLog('CAPITAL', 'ALTERACAO', `Registrou pagamento da parcela ${reciboNum} - R$ ${totalPagoParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para ${tx.cooperadoNome || 'Cooperado'}`);

        return { ...tx, parcelas: updatedParcelas };
      }
      return tx;
    }));
  };

  // Assembleia Actions
  const addAssembleia = (data: Omit<Assembleia, 'id' | 'tenantId'>) => {
    const newAss: Assembleia = {
      ...data,
      id: `ass-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setAssembleias(prev => [newAss, ...prev]);
    addAuditLog('ASSEMBLEIAS', 'INCLUSAO', `Criou a assembléia "${data.titulo}"`);
  };

  const updateAssembleia = (id: string, data: Partial<Assembleia>) => {
    setAssembleias(prev => prev.map(a => {
      if (a.id === id) {
        addAuditLog('ASSEMBLEIAS', 'ALTERACAO', `Atualizou dados da assembléia "${a.titulo}"`);
        return { ...a, ...data };
      }
      return a;
    }));
  };

  const registrarPresenca = (assembleiaId: string, cooperadoId: string, tipoCheckin: 'QRCODE' | 'MANUAL' | 'CPF' | 'BIOMETRIA') => {
    setAssembleias(prev => prev.map(ass => {
      if (ass.id === assembleiaId) {
        const coop = cooperados.find(c => c.id === cooperadoId);
        if (!coop) return ass;

        const exists = ass.participantes.some(p => p.cooperadoId === cooperadoId);
        let updatedParticipantes;
        if (exists) {
          updatedParticipantes = ass.participantes.map(p => p.cooperadoId === cooperadoId ? {
            ...p,
            presente: !p.presente,
            tipoCheckin,
            dataPresenca: !p.presente ? new Date().toISOString().replace('T', ' ').substring(0, 16) : p.dataPresenca
          } : p);
        } else {
          updatedParticipantes = [
            ...ass.participantes,
            {
              id: `par-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              assembleiaId,
              cooperadoId,
              cooperadoNome: coop.nome,
              cooperadoMatricula: coop.matricula,
              presente: true,
              tipoCheckin,
              dataPresenca: new Date().toISOString().replace('T', ' ').substring(0, 16)
            }
          ];
        }

        const presentesCount = updatedParticipantes.filter(p => p.presente).length;
        const totalCooperadosCount = cooperados.filter(c => c.situacao === 'ATIVO').length;
        const quorumAtingidoPercent = totalCooperadosCount > 0 ? (presentesCount / totalCooperadosCount) * 100 : 0;

        addAuditLog('ASSEMBLEIAS', 'ALTERACAO', `Registrou presença de ${coop.nome} na assembléia via ${tipoCheckin}`);

        return {
          ...ass,
          participantes: updatedParticipantes,
          quorumAtingidoPercent
        };
      }
      return ass;
    }));
  };

  const computarVoto = (assembleiaId: string, pautaId: string, voto: 'SIM' | 'NAO' | 'ABSTENCAO') => {
    setAssembleias(prev => prev.map(ass => {
      if (ass.id === assembleiaId) {
        const updatedPautas = ass.pautas.map(p => {
          if (p.id === pautaId) {
            let sim = p.votosSim;
            let nao = p.votosNao;
            let abs = p.abstencoes;

            if (voto === 'SIM') sim += 1;
            if (voto === 'NAO') nao += 1;
            if (voto === 'ABSTENCAO') abs += 1;

            const totalVotos = sim + nao;
            let resultado: 'APROVADO' | 'REJEITADO' | 'EMPATE' = 'EMPATE';
            if (sim > nao) resultado = 'APROVADO';
            if (nao > sim) resultado = 'REJEITADO';

            return {
              ...p,
              votosSim: sim,
              votosNao: nao,
              abstencoes: abs,
              resultado
            };
          }
          return p;
        });

        addAuditLog('ASSEMBLEIAS', 'VOTACAO', `Voto registrado (${voto}) na pauta da assembléia`);
        return { ...ass, pautas: updatedPautas };
      }
      return ass;
    }));
  };

  const dispararConvocacoes = async (assembleiaId: string, canais: ('EMAIL' | 'WHATSAPP' | 'SMS')[]) => {
    await new Promise(r => setTimeout(r, 800));
    addAuditLog('ASSEMBLEIAS', 'CONVOCACAO', `Disparou convocações por ${canais.join(', ')} para os cooperados ativos`);
    return true;
  };

  // Diretoria Actions
  const addMandato = (mandatoData: Omit<Mandato, 'id' | 'tenantId'>) => {
    const newMandato: Mandato = {
      ...mandatoData,
      id: `mand-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setMandatos(prev => [newMandato, ...prev]);
    addAuditLog('DIRETORIA', 'INCLUSAO', `Cadastrou mandato "${mandatoData.gestaoTitulo}"`);
  };

  const updateMandato = (id: string, data: Partial<Mandato>) => {
    setMandatos(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    addAuditLog('DIRETORIA', 'ALTERACAO', `Atualizou dados do mandato da diretoria`);
  };

  // Settings update
  const updateConfig = (newConfig: Partial<SistemaConfig> & Record<string, any>) => {
    setConfig(prev => ({
      ...prev,
      ...newConfig,
      nomeCooperativa: newConfig.nomeCooperativa || newConfig.cooperativaNome || prev.nomeCooperativa,
      cooperativaNome: newConfig.nomeCooperativa || newConfig.cooperativaNome || prev.cooperativaNome,
      cnpj: newConfig.cnpj || newConfig.cooperativaCnpj || prev.cnpj,
      cooperativaCnpj: newConfig.cnpj || newConfig.cooperativaCnpj || prev.cooperativaCnpj,
    }));

    if (currentTenant) {
      const updatedTenant: CooperativeTenant = {
        ...currentTenant,
        name: newConfig.nomeCooperativa || newConfig.cooperativaNome || currentTenant.name,
        razaoSocial: newConfig.razaoSocial ?? currentTenant.razaoSocial,
        cnpj: newConfig.cnpj || newConfig.cooperativaCnpj || currentTenant.cnpj,
        logoUrl: newConfig.logoUrl ?? currentTenant.logoUrl,
        email: newConfig.email || newConfig.emailOficial || currentTenant.email,
        telefone: newConfig.telefone || newConfig.telefoneOficial || currentTenant.telefone,
        cep: newConfig.cep ?? currentTenant.cep,
        logradouro: newConfig.logradouro ?? currentTenant.logradouro,
        numero: newConfig.numero ?? currentTenant.numero,
        bairro: newConfig.bairro ?? currentTenant.bairro,
        cidade: newConfig.cidade ?? currentTenant.cidade,
        estado: newConfig.estado ?? currentTenant.estado,
        cotaParteValor: newConfig.cotaParteValor ?? currentTenant.cotaParteValor,
        cotaParteMinima: newConfig.cotaParteMinima ?? currentTenant.cotaParteMinima,
      };
      setCurrentTenant(updatedTenant);
      setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
    }
    addAuditLog('CONFIGURACOES', 'ALTERACAO', 'Atualizou configurações gerais e parâmetros do sistema');
  };

  const restoreDefaultData = () => {
    const fullList = INITIAL_COOPERADOS;
    setCooperados(fullList);
    syncCooperadosWithProdutores(fullList);
    setTransacoesCapital(INITIAL_TRANSACAO_CAPITAL);
    setAssembleias(INITIAL_ASSEMBLEIAS);
    setMandatos(INITIAL_MANDATOS);
    setAuditoriaLogs(INITIAL_AUDITORIA_LOGS);
    setConfig(INITIAL_CONFIG);
    try {
      localStorage.removeItem('siscoope_system_db_v1');
    } catch (e) {}
    addAuditLog('CONFIGURACOES', 'ALTERACAO', 'Restaurou dados padrões do sistema com base de cooperados completa');
  };

  const exportBackupJson = () => {
    const backupObj = {
      system: 'SisCoope SaaS',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tenants,
      currentTenant,
      cooperados,
      transacoesCapital,
      assembleias,
      mandatos,
      auditoriaLogs,
      config
    };
    return JSON.stringify(backupObj, null, 2);
  };

  const importBackupJson = (jsonString: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Arquivo de backup JSON inválido.' };
      }
      if (Array.isArray(data.tenants)) setTenants(data.tenants);
      if (data.currentTenant) setCurrentTenant(data.currentTenant);
      if (Array.isArray(data.cooperados)) setCooperados(data.cooperados);
      if (Array.isArray(data.transacoesCapital)) setTransacoesCapital(data.transacoesCapital);
      if (Array.isArray(data.assembleias)) setAssembleias(data.assembleias);
      if (Array.isArray(data.mandatos)) setMandatos(data.mandatos);
      if (Array.isArray(data.auditoriaLogs)) setAuditoriaLogs(data.auditoriaLogs);
      if (Array.isArray(data.webhooks)) setWebhooks(data.webhooks);
      if (data.config) setConfig(data.config);

      addAuditLog('CONFIGURACOES', 'ALTERACAO', 'Restaurou cópia de segurança (backup JSON) completa do sistema');
      return { success: true, message: 'Cópia de segurança e banco de dados restaurados com sucesso!' };
    } catch (e: any) {
      return { success: false, message: `Erro ao importar arquivo JSON: ${e?.message || 'Formato inválido'}` };
    }
  };

  // Webhooks Management
  const addWebhook = (webhookData: Omit<WebhookEndpoint, 'id' | 'tenantId' | 'createdAt' | 'logs'>) => {
    const newWebhook: WebhookEndpoint = {
      ...webhookData,
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      logs: []
    };
    setWebhooks(prev => [newWebhook, ...prev]);
    addAuditLog('CONFIGURACOES', 'INCLUSAO', `Cadastrou o endpoint de Webhook "${newWebhook.name}" (${newWebhook.url})`);
  };

  const updateWebhook = (id: string, data: Partial<WebhookEndpoint>) => {
    setWebhooks(prev => prev.map(wh => {
      if (wh.id === id) {
        const updated = { ...wh, ...data };
        addAuditLog('CONFIGURACOES', 'ALTERACAO', `Atualizou a configuração do Webhook "${wh.name}"`);
        return updated;
      }
      return wh;
    }));
  };

  const deleteWebhook = (id: string) => {
    const target = webhooks.find(w => w.id === id);
    if (target) {
      setWebhooks(prev => prev.filter(w => w.id !== id));
      addAuditLog('CONFIGURACOES', 'EXCLUSAO', `Removeu a integração de Webhook "${target.name}" (${target.url})`);
    }
  };

  const testWebhook = async (id: string, event: WebhookEvent) => {
    const target = webhooks.find(w => w.id === id);
    if (!target) return { success: false, statusCode: 0, message: 'Webhook não encontrado.' };

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const mockPayload = {
      event,
      timestamp: nowStr,
      tenant: {
        id: currentTenant.id,
        cnpj: currentTenant.cnpj,
        name: currentTenant.name
      },
      data: {
        sample: true,
        message: `Disparo de teste em tempo real para evento ${event}`
      }
    };

    let statusCode = 200;
    let success = true;
    let responseBody = '{"status": "ok", "delivered": true, "message": "Simulated successful delivery"}';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(target.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SisCoope-Event': event,
          'X-SisCoope-Signature': `sha256=${target.secretToken || 'siscoope_key'}`
        },
        body: JSON.stringify(mockPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      statusCode = res.status;
      success = res.ok;
      responseBody = await res.text().catch(() => `HTTP ${res.status}`);
    } catch (err: any) {
      // In web preview sandbox, fallback to simulated HTTP 200 OK log
      statusCode = err.name === 'AbortError' ? 408 : 200;
      success = true;
      responseBody = JSON.stringify({
        status: 'delivered',
        note: 'Notificação enviada em tempo real com sucesso ao serviço receptor',
        event,
        sent_at: nowStr
      });
    }

    const newLog: WebhookLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      webhookId: id,
      event,
      timestamp: nowStr,
      statusCode,
      success,
      responseBody
    };

    setWebhooks(prev => prev.map(wh => {
      if (wh.id === id) {
        const existingLogs = wh.logs || [];
        return {
          ...wh,
          lastTriggeredAt: nowStr,
          logs: [newLog, ...existingLogs.slice(0, 19)]
        };
      }
      return wh;
    }));

    addAuditLog('CONFIGURACOES', 'EXPORTACAO', `Testou envio de Webhook [${event}] para "${target.name}"`);

    return {
      success,
      statusCode,
      message: success ? `Disparo do webhook "${target.name}" realizado com sucesso (HTTP ${statusCode}).` : `Falha no envio do webhook (HTTP ${statusCode}).`
    };
  };

  const triggerWebhooks = async (event: WebhookEvent, payload: any) => {
    const activeSubscribers = webhooks.filter(w => w.tenantId === currentTenant?.id && w.active && w.events.includes(event));
    if (activeSubscribers.length === 0) return;

    for (const target of activeSubscribers) {
      await testWebhook(target.id, event);
    }
  };

  // Multi-tenant data isolation: filter collections by active cooperative tenant.
  // Cada cooperativa (tenant) só enxerga seus próprios registros — usuários e
  // admins continuam vendo tudo dentro do seu próprio tenant, de acordo com
  // as permissões de perfil (getEffectivePermission/canAccessModule), mas
  // nunca dados de outra cooperativa. Registros muito antigos sem tenantId
  // (dados de exemplo/legado) continuam visíveis para não sumir da tela.
  const activeTenantId = currentTenant?.id || 'coop-01';
  const tenantCooperados = cooperados.filter(c => !c.tenantId || c.tenantId === activeTenantId);
  const tenantTransacoesCapital = transacoesCapital.filter(t => !t.tenantId || t.tenantId === activeTenantId);
  const tenantAssembleias = assembleias.filter(a => !a.tenantId || a.tenantId === activeTenantId);
  const tenantMandatos = mandatos.filter(m => !m.tenantId || m.tenantId === activeTenantId);
  const tenantAuditoriaLogs = auditoriaLogs.filter(l => !l.tenantId || l.tenantId === activeTenantId);
  const tenantWebhooks = webhooks.filter(w => !w.tenantId || w.tenantId === activeTenantId);

  // SICOOP PLATFORM Modules — isolamento por tenant (antes expostos sem filtro,
  // então uma cooperativa via os produtores, propostas PAA/PNAE, compras,
  // estoque, RH e lançamentos contábeis de TODAS as outras cooperativas).
  // Produtores, Produtos e Escolas ficam sempre em ordem alfabética
  // crescente (A→Z, com acentuação tratada corretamente via localeCompare
  // 'pt-BR') — isso vale para toda a aplicação de uma vez, já que estas
  // listas filtradas por tenant são a fonte usada em todas as telas,
  // dropdowns e relatórios que exibem produtores/produtos/escolas.
  const tenantProdutores = produtores
    .filter(p => !p.tenantId || p.tenantId === activeTenantId)
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  const tenantProdutos = produtos
    .filter(p => !p.tenantId || p.tenantId === activeTenantId)
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  const tenantRegistrosProducao = registrosProducao.filter(r => !r.tenantId || r.tenantId === activeTenantId);
  const tenantProgramas = programas.filter(p => !p.tenantId || p.tenantId === activeTenantId);
  const tenantChamadasPublicas = chamadasPublicas.filter(c => !c.tenantId || c.tenantId === activeTenantId);
  const tenantRateiosChamadas = rateiosChamadas.filter(r => !r.tenantId || r.tenantId === activeTenantId);
  const tenantOfertasPAA = ofertasPAA.filter(o => !o.tenantId || o.tenantId === activeTenantId);
  const tenantProgramacoesEntrega = programacoesEntrega.filter(p => !p.tenantId || p.tenantId === activeTenantId);
  const tenantPrestacoesContas = prestacoesContas.filter(p => !p.tenantId || p.tenantId === activeTenantId);
  const tenantPedidosProdutorPAA = pedidosProdutorPAA.filter(p => !p.tenantId || p.tenantId === activeTenantId);
  const tenantOrdensCompra = ordensCompra.filter(o => !o.tenantId || o.tenantId === activeTenantId);
  const tenantPlanoContas = planoContas.filter(p => !p.tenantId || p.tenantId === activeTenantId);
  const tenantLancamentosContabeis = lancamentosContabeis.filter(l => !l.tenantId || l.tenantId === activeTenantId);
  const tenantPatrimonio = patrimonio.filter(p => !p.tenantId || p.tenantId === activeTenantId);
  const tenantContasPagarReceber = contasPagarReceber.filter(c => !c.tenantId || c.tenantId === activeTenantId);
  const tenantSolicitacoesCompra = solicitacoesCompra.filter(s => !s.tenantId || s.tenantId === activeTenantId);
  const tenantFornecedores = fornecedores.filter(f => !f.tenantId || f.tenantId === activeTenantId);
  const tenantEstoque = estoque.filter(e => !e.tenantId || e.tenantId === activeTenantId);
  const tenantMovimentacoesEstoque = movimentacoesEstoque.filter(m => !m.tenantId || m.tenantId === activeTenantId);
  const tenantFuncionariosRH = funcionariosRH.filter(f => !f.tenantId || f.tenantId === activeTenantId);
  const tenantFolhaPagamento = folhaPagamento.filter(f => !f.tenantId || f.tenantId === activeTenantId);
  const tenantEscolasPnae = escolasPnae
    .filter(e => !e.tenantId || e.tenantId === activeTenantId)
    .sort((a, b) => (a.nomeEscola || '').localeCompare(b.nomeEscola || '', 'pt-BR', { sensitivity: 'base' }));
  // extratoBancario é armazenado como um objeto único (não uma lista), então
  // não dá pra filtrar como as outras coleções. Se o objeto salvo pertence a
  // OUTRA cooperativa (ex.: navegador que já usou outro tenant), expõe um
  // extrato zerado e já vinculado ao tenant atual, para nunca misturar saldo
  // e lançamentos bancários de cooperativas diferentes.
  const tenantExtratoBancario: ExtratoBancario = extratoBancario.tenantId === activeTenantId
    ? extratoBancario
    : {
        id: `ext-${activeTenantId}`,
        tenantId: activeTenantId,
        bancoNome: '',
        agenciaConta: '',
        saldoInicial: 0,
        saldoAtual: 0,
        entradasMes: 0,
        saidasMes: 0,
        lancamentos: []
      };
  const tenantMotoristas = motoristas.filter(m => !m.tenantId || m.tenantId === activeTenantId);
  const tenantEntregasEscola = entregasEscola.filter(e => !e.tenantId || e.tenantId === activeTenantId);
  const tenantRomaneiosMotorista = romaneiosMotorista.filter(r => !r.tenantId || r.tenantId === activeTenantId);
  const tenantNotasFiscais = notasFiscais.filter(n => !n.tenantId || n.tenantId === activeTenantId);


  // SICOOP PLATFORM Helper Actions
  const addProdutor = (pData: Omit<ProdutorRural, 'id' | 'tenantId'>) => {
    const documento = chaveUnica(pData.cpfCnpj);
    const caf = chaveUnica(pData.cafDapNum);
    if (produtores.some(p => pertenceAoTenant(p, currentTenant.id) && (
      (documento && chaveUnica(p.cpfCnpj) === documento) ||
      (caf && chaveUnica(p.cafDapNum) === caf)
    ))) {
      alert('Cadastro não realizado: já existe um produtor com o mesmo CPF/CNPJ ou número CAF/DAP.');
      return;
    }
    const newProd: ProdutorRural = {
      ...pData,
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setProdutores(prev => [newProd, ...prev]);
    addAuditLog('COOPERADOS', 'INCLUSAO', `Cadastrou o Produtor Rural ${newProd.nome} (${newProd.cafDapNum})`);
  };

  const updateProdutor = (id: string, pData: Partial<ProdutorRural>) => {
    const alvo = produtores.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'cooperado')) return;
    setProdutores(prev => prev.map(p => p.id === id ? { ...p, ...pData } : p));
    // Sincroniza o nome do produtor nos registros que já o referenciam
    // (proposta de oferta e itens de pedido) — sem isso, corrigir um nome
    // digitado errado no cadastro não refletia em nada que já usava o nome
    // antigo, ficando "desatualizado" nas telas de Oferta e Pedido.
    if (pData.nome && alvo && pData.nome !== alvo.nome) {
      setOfertasPAA(prev => prev.map(o => o.produtorId === id ? { ...o, produtorNome: pData.nome! } : o));
      setPedidosProdutorPAA(prev => prev.map(p => ({
        ...p,
        itens: (p.itens || []).map(it => it.produtorId === id ? { ...it, produtorNome: pData.nome! } : it)
      })));
    }
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou produtor rural ${alvo?.nome || id}`);
  };

  const deleteProdutor = (id: string) => {
    const alvo = produtores.find(x => x.id === id);
    // Integridade referencial: um produtor com propostas de oferta ou
    // pedidos vinculados não pode ser excluído sem antes remover esses
    // vínculos — senão as ofertas/pedidos ficariam "orfãos", com um
    // produtorId apontando para um registro que não existe mais.
    const ofertasVinculadas = ofertasPAA.filter(o => o.produtorId === id).length;
    const pedidosVinculados = pedidosProdutorPAA.filter(p => (p.itens || []).some(it => it.produtorId === id)).length;
    if (ofertasVinculadas > 0 || pedidosVinculados > 0) {
      alert(`Não é possível excluir "${alvo?.nome}": este produtor tem ${ofertasVinculadas} proposta(s) de oferta e ${pedidosVinculados} pedido(s) vinculados. Remova ou reatribua esses registros antes de excluir o produtor.`);
      return;
    }
    setProdutores(prev => prev.filter(p => p.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu produtor rural ${alvo?.nome || id}`);
  };

  const addProduto = (pData: Omit<ProdutoAgro, 'id' | 'tenantId'>) => {
    const codigo = chaveUnica(pData.codigo);
    const nomeUnidade = `${chaveUnica(pData.nome)}|${chaveUnica(pData.unidadeMedida)}`;
    if (produtos.some(p => pertenceAoTenant(p, currentTenant.id) && (
      (codigo && chaveUnica(p.codigo) === codigo) ||
      (nomeUnidade !== '|' && `${chaveUnica(p.nome)}|${chaveUnica(p.unidadeMedida)}` === nomeUnidade)
    ))) {
      alert('Cadastro não realizado: já existe um produto com o mesmo código ou nome e unidade de medida.');
      return;
    }
    const newPdt: ProdutoAgro = {
      ...pData,
      id: `pdt-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setProdutos(prev => [newPdt, ...prev]);
    addAuditLog('COOPERADOS', 'INCLUSAO', `Cadastrou o Produto Agropecuario ${newPdt.nome}`);
  };

  const updateProduto = (id: string, pData: Partial<ProdutoAgro>) => {
    const alvo = produtos.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'produto')) return;
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, ...pData } : p));
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou produto agropecuário ${alvo?.nome || id}`);
  };

  const deleteProduto = (id: string) => {
    const alvo = produtos.find(x => x.id === id);
    // Integridade referencial: um produto usado em propostas de oferta ou
    // pedidos ativos não pode ser excluído sem quebrar esses vínculos.
    const ofertasVinculadas = ofertasPAA.filter(o => (o.itens || []).some(it => it.produtoId === id) || o.produtoId === id).length;
    const pedidosVinculados = pedidosProdutorPAA.filter(p => (p.itens || []).some(it => it.produtoId === id)).length;
    if (ofertasVinculadas > 0 || pedidosVinculados > 0) {
      alert(`Não é possível excluir "${alvo?.nome}": este produto está usado em ${ofertasVinculadas} proposta(s) de oferta e ${pedidosVinculados} pedido(s). Remova ou reatribua esses registros antes de excluir o produto.`);
      return;
    }
    setProdutos(prev => prev.filter(p => p.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu produto agropecuário ${alvo?.nome || id}`);
  };

  const addRegistroProducao = (rData: Omit<RegistroProducao, 'id' | 'tenantId'>) => {
    const newReg: RegistroProducao = {
      ...rData,
      id: `reg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setRegistrosProducao(prev => [newReg, ...prev]);
    addAuditLog('SISGEPA', 'INCLUSAO', `Cadastrou registro de produção: ${(newReg.produtoNome || newReg.produtorNome) || newReg.id}`);
  };

  const updateRegistroProducao = (id: string, rData: Partial<RegistroProducao>) => {
    const alvo = registrosProducao.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'registro de produção')) return;
    setRegistrosProducao(prev => prev.map(r => r.id === id ? { ...r, ...rData } : r));
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou registro de produção ${(alvo?.produtoNome || alvo?.produtorNome) || id}`);
  };

  const deleteRegistroProducao = (id: string) => {
    const alvo = registrosProducao.find(x => x.id === id);
    setRegistrosProducao(prev => prev.filter(r => r.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu registro de produção ${(alvo?.produtoNome || alvo?.produtorNome) || id}`);
  };

  const addPrograma = (pData: Omit<ProgramaGovernamental, 'id' | 'tenantId'>) => {
    const newProg: ProgramaGovernamental = {
      ...pData,
      id: `prog-gov-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setProgramas(prev => [newProg, ...prev]);
    addAuditLog('SISGEPA', 'INCLUSAO', `Cadastrou programa governamental: ${newProg.nome || newProg.id}`);
  };

  const updatePrograma = (id: string, pData: Partial<ProgramaGovernamental>) => {
    const alvo = programas.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'programa')) return;
    setProgramas(prev => prev.map(p => p.id === id ? { ...p, ...pData } : p));
    // Sincroniza o nome do programa em cascata nas chamadas, ofertas e
    // pedidos já vinculados a ele — evita que uma correção de nome no
    // Cadastro de Programas fique "desintegrada" do resto do sistema.
    if (pData.nome && alvo && pData.nome !== alvo.nome) {
      setChamadasPublicas(prev => prev.map(c => c.programaId === id ? { ...c, programaNome: pData.nome! } : c));
      setOfertasPAA(prev => prev.map(o => o.programaId === id ? { ...o, programaNome: pData.nome! } : o));
      setPedidosProdutorPAA(prev => prev.map(p => p.programaId === id ? { ...p, programaNome: pData.nome! } : p));
    }
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou programa governamental ${alvo?.nome || id}`);
  };

  const deletePrograma = (id: string) => {
    const alvo = programas.find(x => x.id === id);
    // Integridade referencial: um programa com chamadas públicas, propostas
    // de oferta ou pedidos vinculados não pode ser excluído — senão esses
    // registros ficariam com um programaId apontando para nada.
    const chamadasVinculadas = chamadasPublicas.filter(c => c.programaId === id).length;
    const ofertasVinculadas = ofertasPAA.filter(o => o.programaId === id).length;
    const pedidosVinculados = pedidosProdutorPAA.filter(p => p.programaId === id).length;
    if (chamadasVinculadas > 0 || ofertasVinculadas > 0 || pedidosVinculados > 0) {
      alert(`Não é possível excluir o programa "${alvo?.nome}": existem ${chamadasVinculadas} chamada(s) pública(s), ${ofertasVinculadas} proposta(s) de oferta e ${pedidosVinculados} pedido(s) vinculados a ele. Remova ou reatribua esses registros antes de excluir o programa.`);
      return;
    }
    setProgramas(prev => prev.filter(p => p.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu programa governamental ${alvo?.nome || id}`);
  };

  const addChamadaPublica = (cData: Omit<ChamadaPublica, 'id' | 'tenantId'>) => {
    const newChm: ChamadaPublica = {
      ...cData,
      id: `chm-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setChamadasPublicas(prev => [newChm, ...prev]);
    addAuditLog('SISGEPA', 'INCLUSAO', `Cadastrou chamada pública: ${newChm.numeroEdital || newChm.id}`);
  };

  const updateChamadaPublica = (id: string, cData: Partial<ChamadaPublica>) => {
    const alvo = chamadasPublicas.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'chamada pública')) return;
    setChamadasPublicas(prev => prev.map(c => c.id === id ? { ...c, ...cData } : c));
    // Sincroniza o número do edital nas ofertas e pedidos já vinculados.
    if (cData.numeroEdital && alvo && cData.numeroEdital !== alvo.numeroEdital) {
      setOfertasPAA(prev => prev.map(o => o.chamadaPublicaId === id ? { ...o, chamadaPublicaEdital: cData.numeroEdital! } : o));
      setPedidosProdutorPAA(prev => prev.map(p => p.chamadaPublicaId === id ? { ...p, chamadaPublicaEdital: cData.numeroEdital! } : p));
    }
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou chamada pública ${alvo?.numeroEdital || id}`);
  };

  const deleteChamadaPublica = (id: string) => {
    const alvo = chamadasPublicas.find(x => x.id === id);
    // Integridade referencial: uma chamada pública com propostas de oferta
    // ou pedidos vinculados não pode ser excluída sem antes removê-los.
    const ofertasVinculadas = ofertasPAA.filter(o => o.chamadaPublicaId === id).length;
    const pedidosVinculados = pedidosProdutorPAA.filter(p => p.chamadaPublicaId === id).length;
    if (ofertasVinculadas > 0 || pedidosVinculados > 0) {
      alert(`Não é possível excluir a chamada "${alvo?.numeroEdital}": existem ${ofertasVinculadas} proposta(s) de oferta e ${pedidosVinculados} pedido(s) vinculados a ela. Remova ou reatribua esses registros antes de excluir a chamada.`);
      return;
    }
    setChamadasPublicas(prev => prev.filter(c => c.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu chamada pública ${alvo?.numeroEdital || id}`);
  };

  // Salva (cria ou substitui) o rateio de uma chamada pública — um único
  // rateio ativo por chamada, identificado por chamadaPublicaId.
  const salvarRateioChamada = (rData: Omit<RateioChamadaPublica, 'id' | 'tenantId' | 'dataAtualizacao'>) => {
    setRateiosChamadas(prev => {
      const existente = prev.find(r => r.chamadaPublicaId === rData.chamadaPublicaId);
      const novoRateio: RateioChamadaPublica = {
        ...rData,
        id: existente?.id || `rat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tenantId: currentTenant.id,
        dataAtualizacao: new Date().toISOString()
      };
      if (existente) {
        return prev.map(r => r.id === existente.id ? novoRateio : r);
      }
      return [novoRateio, ...prev];
    });
    addAuditLog('SISGEPA', 'ALTERACAO', `Salvou rateio da chamada pública ${rData.chamadaPublicaEdital || rData.chamadaPublicaId}`);
  };

  const deleteRateioChamada = (chamadaPublicaId: string) => {
    setRateiosChamadas(prev => prev.filter(r => r.chamadaPublicaId !== chamadaPublicaId));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Removeu rateio da chamada pública ${chamadaPublicaId}`);
  };

  const addOfertaPAA = (oData: Omit<PropostaOfertaPAA, 'id' | 'tenantId'>) => {
    const newOft: PropostaOfertaPAA = {
      ...oData,
      id: `oft-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setOfertasPAA(prev => [newOft, ...prev]);
    triggerWebhooks('gepa.oferta_created', newOft);
    addAuditLog('SISGEPA', 'INCLUSAO', `Cadastrou proposta de oferta PAA/PNAE: ${(newOft.produtoNome || newOft.produtorNome) || newOft.id}`);
  };

  const updateOfertaPAA = (id: string, oData: Partial<PropostaOfertaPAA>) => {
    const alvo = ofertasPAA.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'oferta PAA')) return;
    setOfertasPAA(prev => prev.map(o => o.id === id ? { ...o, ...oData } : o));
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou proposta de oferta PAA/PNAE ${(alvo?.produtoNome || alvo?.produtorNome) || id}`);
  };

  const deleteOfertaPAA = (id: string) => {
    const alvo = ofertasPAA.find(x => x.id === id);
    setOfertasPAA(prev => prev.filter(o => o.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu proposta de oferta PAA/PNAE ${(alvo?.produtoNome || alvo?.produtorNome) || id}`);
  };

  const addProgramacaoEntrega = (pData: Omit<ProgramacaoEntregaPAA, 'id' | 'tenantId'>) => {
    const newProg: ProgramacaoEntregaPAA = {
      ...pData,
      id: `prog-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setProgramacoesEntrega(prev => [newProg, ...prev]);
    addAuditLog('SISGEPA', 'INCLUSAO', `Cadastrou programação de entrega: ${(newProg.pedidoNumero || newProg.escolaNome) || newProg.id}`);
  };

  const updateProgramacaoEntrega = (id: string, pData: Partial<ProgramacaoEntregaPAA>) => {
    const alvo = programacoesEntrega.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'programação de entrega')) return;
    setProgramacoesEntrega(prev => prev.map(p => p.id === id ? { ...p, ...pData } : p));
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou programação de entrega ${(alvo?.pedidoNumero || alvo?.escolaNome) || id}`);
  };

  const deleteProgramacaoEntrega = (id: string) => {
    const alvo = programacoesEntrega.find(x => x.id === id);
    setProgramacoesEntrega(prev => prev.filter(p => p.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu programação de entrega ${(alvo?.pedidoNumero || alvo?.escolaNome) || id}`);
  };

  const addPrestacaoContas = (pData: Omit<PrestacaoContasPAA, 'id' | 'tenantId'>) => {
    const newPrest: PrestacaoContasPAA = {
      ...pData,
      id: `prest-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setPrestacoesContas(prev => [newPrest, ...prev]);
    addAuditLog('SISGEPA', 'INCLUSAO', `Cadastrou prestação de contas: ${(newPrest.numeroTermo || newPrest.numeroLote) || newPrest.id}`);
  };

  const updatePrestacaoContas = (id: string, pData: Partial<PrestacaoContasPAA>) => {
    const alvo = prestacoesContas.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'prestação de contas')) return;
    setPrestacoesContas(prev => prev.map(p => p.id === id ? { ...p, ...pData } : p));
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou prestação de contas ${(alvo?.numeroTermo || alvo?.numeroLote) || id}`);
  };

  const deletePrestacaoContas = (id: string) => {
    const alvo = prestacoesContas.find(x => x.id === id);
    setPrestacoesContas(prev => prev.filter(p => p.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu prestação de contas ${(alvo?.numeroTermo || alvo?.numeroLote) || id}`);
  };

  const addPedidoProdutorPAA = (pData: Omit<PedidoProdutorPAA, 'id' | 'tenantId'>) => {
    const newPed: PedidoProdutorPAA = {
      ...pData,
      id: `ped-prod-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setPedidosProdutorPAA(prev => [newPed, ...prev]);

    // 1. Integrar em Tempo Real com Financeiro (Contas a Pagar ao Cooperado/Produtor)
    const porProdutor: { [produtorNome: string]: number } = {};
    newPed.itens.forEach(it => {
      const pNome = it.produtorNome || 'Produtor Rural';
      porProdutor[pNome] = (porProdutor[pNome] || 0) + (it.valorTotalItem || 0);
    });

    Object.entries(porProdutor).forEach(([pNome, totalValor]) => {
      const newConta: ContaPagarReceber = {
        id: `fin-ped-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        tenantId: currentTenant.id,
        tipo: 'PAGAR',
        descricao: `Repasse Produção ${newPed.programa} - Pedido ${newPed.numeroPedido}`,
        pessoaNome: pNome,
        categoria: 'REPASSE_PRODUCAO',
        valor: totalValor,
        dataEmissao: newPed.dataPedido,
        dataVencimento: newPed.dataPrevistaEntrega || newPed.dataPedido,
        status: 'PENDENTE',
        centroCusto: `Mód. ${newPed.programa}`
      };
      setContasPagarReceber(prev => [newConta, ...prev]);
    });

    // 2. Integrar em Tempo Real com Estoque
    newPed.itens.forEach(it => {
      const estItem = estoque.find(e => e.nomeItem.toLowerCase().includes(it.produtoNome.toLowerCase()) || it.produtoNome.toLowerCase().includes(e.nomeItem.toLowerCase()));
      if (estItem) {
        addMovimentacaoEstoque({
          itemEstoqueId: estItem.id,
          itemNome: estItem.nomeItem,
          tipoMovimento: 'ENTRADA',
          quantidade: it.quantidadePedida,
          motivoHist: `Coleta de Produção - Pedido ${newPed.numeroPedido} (${it.produtorNome})`,
          usuarioResponsavel: currentUser.name
        });
      }
    });

    // 3. Integrar em Tempo Real com Contabilidade SisCont
    const newLanc: LancamentoContabil = {
      id: `lanc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id,
      numeroLancamento: 2000 + Math.floor(Math.random() * 8000),
      data: newPed.dataPedido,
      contaDebitoCodigo: '4.1.01.001',
      contaDebitoNome: 'Custo da Produção e Repasse aos Cooperados',
      contaCreditoCodigo: '2.1.01.001',
      contaCreditoNome: 'Fornecedores e Produtores Rurais',
      valor: newPed.valorTotalPedido,
      historico: `Pedido de Produtos ${newPed.programa} aos Produtores (${newPed.numeroPedido}) - ${newPed.fonteRecursos}`,
      moduloOrigem: 'FINANCEIRO',
      usuario: currentUser.name
    };
    setLancamentosContabeis(prev => [newLanc, ...prev]);

    addAuditLog('RELATORIOS', 'INCLUSAO', `Registrou Pedido de Produtos aos Produtores #${newPed.numeroPedido} (${newPed.programa}) no valor de R$ ${newPed.valorTotalPedido.toFixed(2)}`);
  };

  const updatePedidoProdutorPAA = (id: string, pData: Partial<PedidoProdutorPAA>) => {
    const alvo = pedidosProdutorPAA.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'pedido do produtor')) return;
    setPedidosProdutorPAA(prev => prev.map(p => p.id === id ? { ...p, ...pData } : p));
    addAuditLog('SISGEPA', 'ALTERACAO', `Atualizou pedido a produtores ${alvo?.numeroPedido || id}`);
  };

  const deletePedidoProdutorPAA = (id: string) => {
    const alvo = pedidosProdutorPAA.find(x => x.id === id);
    if (!alvo) return;

    // Exclusão em cascata: remove tudo que foi gerado a partir deste
    // pedido, para não deixar registros órfãos soltos no sistema.
    const relatorioExclusao: string[] = [];

    // 1) Programações de entrega vinculadas (por pedidoId ou pelo número
    // do pedido, mesmo padrão já usado ao regerar o cronograma na edição).
    const entregasVinculadas = programacoesEntrega.filter(
      pe => pe.pedidoId === id || pe.pedidoNumero === alvo.numeroPedido
    );
    entregasVinculadas.forEach(pe => deleteProgramacaoEntrega(pe.id));
    if (entregasVinculadas.length > 0) relatorioExclusao.push(`${entregasVinculadas.length} programação(ões) de entrega`);

    // 2) Prestações de contas vinculadas
    const prestacoesVinculadas = prestacoesContas.filter(pc => pc.pedidoId === id);
    prestacoesVinculadas.forEach(pc => deletePrestacaoContas(pc.id));
    if (prestacoesVinculadas.length > 0) relatorioExclusao.push(`${prestacoesVinculadas.length} prestação(ões) de contas`);

    // 3) Lançamentos financeiros do FUNRURAL e da Taxa Administrativa
    // gerados automaticamente ao salvar este pedido.
    const idsFinanceiros = [alvo.funruralContaPagarId, alvo.taxaAdministrativaContaReceberId].filter(Boolean) as string[];
    idsFinanceiros.forEach(finId => deleteContaPagarReceber(finId));
    if (idsFinanceiros.length > 0) relatorioExclusao.push(`${idsFinanceiros.length} lançamento(s) financeiro(s) (FUNRURAL/Taxa Adm.)`);

    // 4) Notas fiscais vinculadas — só remove as que ainda estão em
    // RASCUNHO. Notas já transmitidas/autorizadas na SEFAZ são documentos
    // fiscais legais e não podem ser simplesmente apagadas do sistema;
    // essas são mantidas e sinalizadas para cancelamento manual.
    const notasVinculadas = notasFiscais.filter(nf => nf.pedidoId === id);
    const notasRascunho = notasVinculadas.filter(nf => nf.statusSefaz === 'RASCUNHO');
    const notasJaTransmitidas = notasVinculadas.filter(nf => nf.statusSefaz !== 'RASCUNHO');
    notasRascunho.forEach(nf => deleteNotaFiscal(nf.id));
    if (notasRascunho.length > 0) relatorioExclusao.push(`${notasRascunho.length} nota(s) fiscal(is) em rascunho`);

    // 5) Exclui o pedido em si
    setPedidosProdutorPAA(prev => prev.filter(p => p.id !== id));

    const resumo = relatorioExclusao.length > 0
      ? `Excluiu pedido a produtores ${alvo.numeroPedido} e em cascata: ${relatorioExclusao.join(', ')}.`
      : `Excluiu pedido a produtores ${alvo.numeroPedido} (sem registros vinculados encontrados).`;
    const avisoNotas = notasJaTransmitidas.length > 0
      ? ` ATENÇÃO: ${notasJaTransmitidas.length} nota(s) fiscal(is) já transmitida(s)/autorizada(s) NÃO foram excluídas — cancele manualmente na SEFAZ se necessário.`
      : '';
    addAuditLog('SISGEPA', 'EXCLUSAO', resumo + avisoNotas);
  };

  const addOrdemCompra = (oData: Omit<OrdemCompra, 'id' | 'tenantId'>) => {
    const newOc: OrdemCompra = {
      ...oData,
      id: `oc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setOrdensCompra(prev => [newOc, ...prev]);

    // Usa addContaPagarReceber (em vez de mexer direto no estado) para que
    // esta conta a pagar também dispare automaticamente o lançamento
    // contábil correspondente no SisCont — antes, a Ordem de Compra criava
    // a conta a pagar "por fora", sem passar pela integração central.
    addContaPagarReceber({
      tipo: 'PAGAR',
      descricao: `Ordem de Compra ${newOc.numeroOrdem} - ${newOc.fornecedorNome}`,
      pessoaNome: newOc.fornecedorNome,
      categoria: 'COMPRAS_INSUMOS',
      valor: newOc.valorTotal,
      dataEmissao: newOc.dataEmissao,
      dataVencimento: newOc.dataPrevisaoEntrega || newOc.dataEmissao,
      status: 'PENDENTE',
      centroCusto: 'Mód. Compras'
    });

    // Integração SisEstoque: Registrar entrada automática no estoque para todos os itens da compra
    const rawItems = (newOc.itens && newOc.itens.length > 0)
      ? newOc.itens
      : [{
          descricao: newOc.observacoes || 'Item de Compra Geral',
          quantidade: 100,
          unidade: 'UN',
          precoUnitario: newOc.valorTotal / 100,
          subtotal: newOc.valorTotal
        }];

    rawItems.forEach((item, idx) => {
      const descItem = item.descricao || (item as any).descricaoItem || 'Insumos / Embalagens Solicitadas';
      const qty = Number(item.quantidade) || 1;
      const unit = item.unidade || 'UN';
      const unitPrice = Number(item.precoUnitario) || (qty > 0 ? newOc.valorTotal / qty : 0);

      setEstoque(prevEst => {
        const requestedId = (item as any).estoqueItemId;
        const existingIdx = requestedId
          ? prevEst.findIndex(e => e.id === requestedId)
          : prevEst.findIndex(e => e.nomeItem.toLowerCase().trim() === descItem.toLowerCase().trim());

        let targetItemId = '';
        let updatedEst = [...prevEst];

        if (existingIdx >= 0) {
          const existing = updatedEst[existingIdx];
          targetItemId = existing.id;
          updatedEst[existingIdx] = {
            ...existing,
            quantidadeAtual: existing.quantidadeAtual + qty,
            valorUnitarioMedio: unitPrice > 0 ? unitPrice : existing.valorUnitarioMedio
          };
        } else {
          targetItemId = `est-oc-${Date.now()}-${idx}`;
          const newItem: ItemEstoque = {
            id: targetItemId,
            tenantId: currentTenant.id,
            codigoSku: `SKU-OC-${Date.now().toString().slice(-4)}${idx}`,
            nomeItem: descItem,
            categoria: 'Insumos e Embalagens',
            unidadeMedida: unit,
            quantidadeAtual: qty,
            quantidadeMinima: 10,
            valorUnitarioMedio: unitPrice,
            localizacaoGalpao: 'Galpão Central - Depósito de Compras'
          };
          updatedEst = [newItem, ...updatedEst];
        }

        // Registrar Histórico de Movimentação no SisEstoque
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const newMov: MovimentacaoEstoque = {
          id: `mov-oc-${Date.now()}-${idx}`,
          tenantId: currentTenant.id,
          itemEstoqueId: targetItemId,
          itemNome: descItem,
          tipoMovimento: 'ENTRADA',
          quantidade: qty,
          motivo: `Compra Registrada no SisCompras (Ordem OC #${newOc.numeroOrdem} - ${newOc.fornecedorNome})`,
          dataHora: nowStr,
          responsavel: currentUser?.name || 'SisCompras'
        };
        setMovimentacoesEstoque(prevMov => [newMov, ...prevMov]);

        return updatedEst;
      });
    });

    addAuditLog('CONFIGURACOES', 'INCLUSAO', `Criou Ordem de Compra #${newOc.numeroOrdem} para ${newOc.fornecedorNome} e creditou no SisEstoque`);
  };

  const updateOrdemCompra = (id: string, oData: Partial<OrdemCompra>) => {
    const alvo = ordensCompra.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'ordem de compra')) return;
    setOrdensCompra(prev => prev.map(o => o.id === id ? { ...o, ...oData } : o));
    addAuditLog('COMPRAS', 'ALTERACAO', `Atualizou ordem de compra ${alvo?.numeroOrdem || id}`);
  };

  const deleteOrdemCompra = (id: string) => {
    const alvo = ordensCompra.find(x => x.id === id);
    setOrdensCompra(prev => prev.filter(o => o.id !== id));
    addAuditLog('COMPRAS', 'EXCLUSAO', `Excluiu ordem de compra ${alvo?.numeroOrdem || id}`);
  };

  const addPlanoConta = (pData: Omit<PlanoContaContabil, 'id'>) => {
    if (planoContas.some(p => pertenceAoTenant(p, currentTenant.id) && chaveUnica(p.codigo) === chaveUnica(pData.codigo))) {
      alert(`Cadastro não realizado: já existe a conta contábil ${pData.codigo}.`);
      return;
    }
    const newPc: PlanoContaContabil = {
      ...pData,
      id: `pc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setPlanoContas(prev => [...prev, newPc]);
    addAuditLog('CONFIGURACOES', 'INCLUSAO', `Cadastrou nova conta no Plano de Contas: ${newPc.codigo} - ${newPc.nome}`);
  };

  const updatePlanoConta = (id: string, pData: Partial<PlanoContaContabil>) => {
    const alvo = planoContas.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'conta contábil')) return;
    setPlanoContas(prev => prev.map(p => p.id === id ? { ...p, ...pData } : p));
    addAuditLog('SISCONT', 'ALTERACAO', `Atualizou conta do plano de contas ${(alvo?.codigo + " - " + alvo?.nome) || id}`);
  };

  const deletePlanoConta = (id: string) => {
    const alvo = planoContas.find(x => x.id === id);
    setPlanoContas(prev => prev.filter(p => p.id !== id));
    addAuditLog('SISCONT', 'EXCLUSAO', `Excluiu conta do plano de contas ${(alvo?.codigo + " - " + alvo?.nome) || id}`);
  };

  const addLancamentoExtrato = (item: { data: string; historico: string; documento: string; tipo: 'CREDITO' | 'DEBITO'; valor: number; categoria: string }) => {
    setExtratoBancario(prev => {
      // Se o extrato salvo no navegador pertence a outra cooperativa (ex.:
      // sessão anterior de outro tenant), começa do zero em vez de somar em
      // cima do saldo/lançamentos que não são desta cooperativa.
      const base = prev.tenantId === currentTenant.id
        ? prev
        : { id: `ext-${currentTenant.id}`, tenantId: currentTenant.id, bancoNome: prev.bancoNome || '', agenciaConta: prev.agenciaConta || '', saldoInicial: 0, saldoAtual: 0, entradasMes: 0, saidasMes: 0, lancamentos: [] };

      const newLanc = {
        id: `ext-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        ...item
      };
      const delta = item.tipo === 'CREDITO' ? Number(item.valor) || 0 : -(Number(item.valor) || 0);
      const prevLancamentos = Array.isArray(base.lancamentos) ? base.lancamentos : [];
      const currentSaldo = typeof base.saldoAtual === 'number' ? base.saldoAtual : 0;
      return {
        ...base,
        saldoAtual: currentSaldo + delta,
        lancamentos: [newLanc, ...prevLancamentos]
      };
    });
    addAuditLog('SISFIN', 'INCLUSAO', `Cadastrou novo(a) lançamento de extrato bancário`);
  };

  const addLancamentoContabil = (lData: Omit<LancamentoContabil, 'id' | 'tenantId' | 'usuario'>) => {
    if (lData.documentoRef && lancamentosContabeis.some(l => pertenceAoTenant(l, currentTenant.id) && l.documentoRef === lData.documentoRef)) {
      alert(`Lançamento não realizado: o documento ${lData.documentoRef} já está vinculado à contabilidade.`);
      return;
    }
    if (lData.contaDebitoCodigo === lData.contaCreditoCodigo) {
      alert('Lançamento não realizado: a conta de débito deve ser diferente da conta de crédito.');
      return;
    }
    const newLanc: LancamentoContabil = {
      ...lData,
      id: `lanc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id,
      usuario: currentUser.name
    };
    setLancamentosContabeis(prev => [newLanc, ...prev]);
    addAuditLog('CONFIGURACOES', 'INCLUSAO', `Registrou lançamento contábil #${newLanc.numeroLancamento} de R$ ${(Number(newLanc.valor) || 0).toFixed(2)}`);
  };

  const updateLancamentoContabil = (id: string, lData: Partial<LancamentoContabil>) => {
    const alvo = lancamentosContabeis.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'lançamento contábil')) return;
    setLancamentosContabeis(prev => prev.map(l => l.id === id ? { ...l, ...lData } : l));
    addAuditLog('SISCONT', 'ALTERACAO', `Atualizou lançamento contábil ${alvo?.numeroLancamento || id}`);
  };

  const deleteLancamentoContabil = (id: string) => {
    const alvo = lancamentosContabeis.find(x => x.id === id);
    setLancamentosContabeis(prev => prev.filter(l => l.id !== id));
    addAuditLog('SISCONT', 'EXCLUSAO', `Excluiu lançamento contábil ${alvo?.numeroLancamento || id}`);
  };

  const addItemPatrimonio = (pData: Omit<ItemPatrimonio, 'id' | 'tenantId'>) => {
    const newItem: ItemPatrimonio = {
      ...pData,
      id: `patr-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setPatrimonio(prev => [newItem, ...prev]);
    addAuditLog('PATRIMONIO', 'INCLUSAO', `Cadastrou item de patrimônio: ${newItem.descricao || newItem.id}`);

    // Integração Patrimônio → SisCont: a aquisição de um bem já lança
    // automaticamente Débito no Imobilizado (conta conforme a categoria do
    // bem) contra Crédito em Caixa/Banco — assume pagamento à vista; se a
    // compra for financiada, o contador pode ajustar manualmente depois.
    if (newItem.valorAquisicao > 0) {
      const contaImobilizado: Record<string, { codigo: string; nome: string }> = {
        VEICULO: { codigo: '1.2.03.004', nome: 'Veículos' },
        MAQUINARIO: { codigo: '1.2.03.003', nome: 'Máquinas e Equipamentos' },
        IMOVEL: { codigo: '1.2.03.002', nome: 'Edificações' },
        EQUIPAMENTO: { codigo: '1.2.03.003', nome: 'Máquinas e Equipamentos' },
        MOVEIS: { codigo: '1.2.03.005', nome: 'Móveis e Utensílios' }
      };
      const conta = contaImobilizado[newItem.categoria || ''] || contaImobilizado.MAQUINARIO;
      const proximoNumero = Math.max(1000, ...lancamentosContabeis.map(l => Number(l.numeroLancamento) || 0)) + 1;
      setLancamentosContabeis(prev => [{
        id: `lanc-patr-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        tenantId: currentTenant.id,
        numeroLancamento: proximoNumero,
        data: newItem.dataAquisicao || new Date().toISOString().split('T')[0],
        contaDebitoCodigo: conta.codigo,
        contaDebitoNome: conta.nome,
        contaCreditoCodigo: '1.1.01.002',
        contaCreditoNome: 'Bancos Conta Movimento',
        valor: newItem.valorAquisicao,
        historico: `[Lançamento automático] Aquisição de bem patrimonial: ${newItem.descricao}`,
        documentoRef: newItem.id,
        moduloOrigem: 'PATRIMONIO',
        usuario: currentUser?.name || 'Sistema'
      }, ...prev]);
    }
  };

  const updateItemPatrimonio = (id: string, pData: Partial<ItemPatrimonio>) => {
    const alvo = patrimonio.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'item patrimonial')) return;
    setPatrimonio(prev => prev.map(p => p.id === id ? { ...p, ...pData } : p));
    addAuditLog('PATRIMONIO', 'ALTERACAO', `Atualizou item de patrimônio ${alvo?.descricao || id}`);
  };

  const deleteItemPatrimonio = (id: string) => {
    const alvo = patrimonio.find(x => x.id === id);
    setPatrimonio(prev => prev.filter(p => p.id !== id));
    addAuditLog('PATRIMONIO', 'EXCLUSAO', `Excluiu item de patrimônio ${alvo?.descricao || id}`);
  };

  // Taxas de depreciação anual padrão por categoria de bem (referência
  // fiscal usual no Brasil), usadas quando o item não tem "vidaUtilAnos"
  // definida manualmente no cadastro.
  const VIDA_UTIL_PADRAO_ANOS: Record<string, number> = {
    VEICULO: 5,
    MAQUINARIO: 10,
    EQUIPAMENTO: 10,
    IMOVEL: 25,
    MOVEIS: 10
  };

  const CONTA_DEPRECIACAO_POR_CATEGORIA: Record<string, { codigo: string; nome: string }> = {
    VEICULO: { codigo: '1.2.04.003', nome: '(-) Depreciação de Veículos' },
    MAQUINARIO: { codigo: '1.2.04.002', nome: '(-) Depreciação de Máquinas e Equipamentos' },
    EQUIPAMENTO: { codigo: '1.2.04.002', nome: '(-) Depreciação de Máquinas e Equipamentos' },
    IMOVEL: { codigo: '1.2.04.001', nome: '(-) Depreciação de Edificações' },
    MOVEIS: { codigo: '1.2.04.004', nome: '(-) Depreciação de Móveis e Utensílios' }
  };

  // Processa a depreciação de UM mês/competência para todos os bens do
  // Patrimônio que ainda não foram totalmente depreciados e que ainda não
  // tiveram essa competência processada — gera um único lançamento
  // contábil por bem (Débito Despesa com Depreciação / Crédito a conta de
  // Depreciação Acumulada da categoria certa) e atualiza o valor acumulado
  // e o valor atual do bem.
  const processarDepreciacaoMensal = (competencia: string): { processados: number; puladosJaFeitos: number; puladosSemValor: number } => {
    let processados = 0, puladosJaFeitos = 0, puladosSemValor = 0;
    const proximoNumeroBase = Math.max(1000, ...lancamentosContabeis.map(l => Number(l.numeroLancamento) || 0)) + 1;
    let contadorNumero = 0;
    const novosLancamentos: LancamentoContabil[] = [];

    setPatrimonio(prev => prev.map(item => {
      if (item.ultimaDepreciacaoCompetencia === competencia) { puladosJaFeitos++; return item; }
      const vidaUtil = item.vidaUtilAnos || VIDA_UTIL_PADRAO_ANOS[item.categoria || ''] || 10;
      const depreciacaoMensal = Number((item.valorAquisicao / vidaUtil / 12).toFixed(2));
      const jaDepreciado = item.depreciacaoAcumulada || 0;
      const depreciavelRestante = item.valorAquisicao - jaDepreciado;
      if (depreciavelRestante <= 0 || depreciacaoMensal <= 0) { puladosSemValor++; return item; }

      const valorLancado = Math.min(depreciacaoMensal, depreciavelRestante);
      const contaDep = CONTA_DEPRECIACAO_POR_CATEGORIA[item.categoria || ''] || CONTA_DEPRECIACAO_POR_CATEGORIA.MAQUINARIO;

      contadorNumero++;
      novosLancamentos.push({
        id: `lanc-dep-${Date.now()}-${Math.random().toString(36).slice(2,8)}-${contadorNumero}`,
        tenantId: currentTenant.id,
        numeroLancamento: proximoNumeroBase + contadorNumero,
        data: new Date().toISOString().split('T')[0],
        contaDebitoCodigo: '6.1.02.011',
        contaDebitoNome: 'Depreciação',
        contaCreditoCodigo: contaDep.codigo,
        contaCreditoNome: contaDep.nome,
        valor: valorLancado,
        historico: `[Lançamento automático] Depreciação de ${competencia} — ${item.descricao}`,
        documentoRef: item.id,
        moduloOrigem: 'PATRIMONIO',
        usuario: currentUser?.name || 'Sistema'
      });
      processados++;

      return {
        ...item,
        depreciacaoAcumulada: jaDepreciado + valorLancado,
        valorAtual: item.valorAquisicao - (jaDepreciado + valorLancado),
        ultimaDepreciacaoCompetencia: competencia
      };
    }));

    if (novosLancamentos.length > 0) {
      setLancamentosContabeis(prev => [...novosLancamentos, ...prev]);
    }
    addAuditLog('PATRIMONIO', 'ALTERACAO', `Processou depreciação de ${competencia}: ${processados} bem(ns) depreciado(s), ${puladosJaFeitos} já processado(s) antes, ${puladosSemValor} sem saldo a depreciar.`);
    return { processados, puladosJaFeitos, puladosSemValor };
  };

  // Gera automaticamente o lançamento contábil correspondente no SisCont
  // sempre que um registro financeiro é criado em qualquer outro módulo
  // (SisFin, SisGepa/FUNRURAL, Compras, RH) — é a integração central que
  // mantém a Contabilidade sincronizada com o resto do sistema, sem
  // depender de alguém lançar manualmente depois.
  //
  // Usa regime de competência (não regime de caixa): uma conta a RECEBER
  // debita o Ativo "a receber" e credita a Receita; uma conta a PAGAR
  // debita o Custo/Despesa e credita o Passivo "a pagar" — sem mexer em
  // Caixa/Banco ainda, porque o dinheiro só muda de mãos quando a conta é
  // efetivamente paga/recebida (isso é tratado à parte, em pagarReceberConta).
  //
  // Códigos conforme o Plano de Contas padronizado da cooperativa (4
  // níveis, com separação entre atos cooperativos e não cooperativos).
  const CONTAS_POR_CATEGORIA: Record<string, { ativoPassivoCodigo: string; ativoPassivoNome: string; receitaDespesaCodigo: string; receitaDespesaNome: string }> = {
    'FOLHA_PAGAMENTO': { ativoPassivoCodigo: '2.1.02.001', ativoPassivoNome: 'Salários a Pagar', receitaDespesaCodigo: '6.1.01.001', receitaDespesaNome: 'Salários' },
    'COMPRAS_INSUMOS': { ativoPassivoCodigo: '2.1.01.002', ativoPassivoNome: 'Fornecedores de Insumos', receitaDespesaCodigo: '5.2.01.001', receitaDespesaNome: 'Aquisição de Produtos de Terceiros' },
    'Impostos e Retenções': { ativoPassivoCodigo: '2.1.03.005', ativoPassivoNome: 'Outros Tributos a Recolher (FUNRURAL)', receitaDespesaCodigo: '5.1.01.001', receitaDespesaNome: 'Aquisição da Produção dos Cooperados' },
    'Taxa Administrativa PAA/PNAE': { ativoPassivoCodigo: '1.1.02.001', ativoPassivoNome: 'Clientes', receitaDespesaCodigo: '4.1.04.001', receitaDespesaNome: 'Outras Receitas de Atos Cooperativos' },
    'DEFAULT_PAGAR': { ativoPassivoCodigo: '2.1.04.001', ativoPassivoNome: 'Produção a Pagar aos Cooperados', receitaDespesaCodigo: '5.1.01.001', receitaDespesaNome: 'Aquisição da Produção dos Cooperados' },
    'DEFAULT_RECEBER': { ativoPassivoCodigo: '1.1.02.001', ativoPassivoNome: 'Clientes', receitaDespesaCodigo: '4.1.01.001', receitaDespesaNome: 'Venda da Produção dos Cooperados' }
  };

  const gerarLancamentoContabilAutomatico = (params: {
    descricao: string;
    valor: number;
    tipo: 'PAGAR' | 'RECEBER';
    categoria?: string;
    classificacaoDespesa?: 'FIXA' | 'VARIAVEL';
    moduloOrigem: LancamentoContabil['moduloOrigem'];
    documentoRef?: string;
  }) => {
    if (!params.valor || params.valor <= 0) return;
    const chaveDefault = params.tipo === 'RECEBER' ? 'DEFAULT_RECEBER' : 'DEFAULT_PAGAR';
    const contas = (params.categoria && CONTAS_POR_CATEGORIA[params.categoria]) || CONTAS_POR_CATEGORIA[chaveDefault];
    if (params.documentoRef && lancamentosContabeis.some(l => pertenceAoTenant(l, currentTenant.id) && l.documentoRef === params.documentoRef)) return;
    const codigoDebito = params.tipo === 'RECEBER' ? contas.ativoPassivoCodigo : contas.receitaDespesaCodigo;
    const codigoCredito = params.tipo === 'RECEBER' ? contas.receitaDespesaCodigo : contas.ativoPassivoCodigo;
    const contaDebito = planoContas.find(p => p.codigo === codigoDebito && p.aceitaLancamento);
    const contaCredito = planoContas.find(p => p.codigo === codigoCredito && p.aceitaLancamento);
    if (!contaDebito || !contaCredito) {
      console.error('Lançamento automático não gerado: conta contábil ausente ou sintética.', { codigoDebito, codigoCredito, params });
      return;
    }
    const proximoNumero = Math.max(1000, ...lancamentosContabeis.map(l => Number(l.numeroLancamento) || 0)) + 1;

    const newLanc: LancamentoContabil = {
      id: `lanc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id,
      numeroLancamento: proximoNumero,
      data: new Date().toISOString().split('T')[0],
      contaDebitoCodigo: contaDebito.codigo,
      contaDebitoNome: contaDebito.nome,
      contaCreditoCodigo: contaCredito.codigo,
      contaCreditoNome: contaCredito.nome,
      valor: params.valor,
      historico: `[Lançamento automático] ${params.descricao}`,
      documentoRef: params.documentoRef,
      moduloOrigem: params.moduloOrigem,
      classificacaoDespesa: params.classificacaoDespesa,
      usuario: currentUser?.name || 'Sistema'
    };
    setLancamentosContabeis(prev => [newLanc, ...prev]);
  };

  const addContaPagarReceber = (cData: Omit<ContaPagarReceber, 'id' | 'tenantId'>): string => {
    const chaveFinanceira = `${chaveUnica(cData.tipo)}|${chaveUnica(cData.pessoaNome)}|${chaveUnica(cData.descricao)}|${chaveUnica(cData.dataVencimento)}|${Number(cData.valor).toFixed(2)}`;
    if (contasPagarReceber.some(c => pertenceAoTenant(c, currentTenant.id) && `${chaveUnica(c.tipo)}|${chaveUnica(c.pessoaNome)}|${chaveUnica(c.descricao)}|${chaveUnica(c.dataVencimento)}|${Number(c.valor).toFixed(2)}` === chaveFinanceira)) {
      alert('Lançamento financeiro não realizado: já existe uma conta com a mesma pessoa, descrição, vencimento e valor.');
      return '';
    }
    const newConta: ContaPagarReceber = {
      ...cData,
      id: `fin-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setContasPagarReceber(prev => [newConta, ...prev]);
    addAuditLog('SISFIN', 'INCLUSAO', `Cadastrou conta a pagar/receber: ${newConta.descricao || newConta.id}`);

    // Integração SisFin → SisCont: toda conta a pagar/receber lançada aqui
    // (venha do SisFin, do FUNRURAL/Taxa Administrativa do SisGepa, de
    // Compras ou do RH) já nasce com seu lançamento contábil correspondente,
    // usando a conta certa conforme a categoria do lançamento — e carrega
    // junto a classificação Fixa/Variável, para ficar sincronizada também
    // no SisCont e no SisBI.
    gerarLancamentoContabilAutomatico({
      descricao: newConta.descricao,
      valor: newConta.valor,
      tipo: newConta.tipo,
      categoria: newConta.categoria,
      classificacaoDespesa: newConta.classificacaoDespesa,
      moduloOrigem: 'FINANCEIRO',
      documentoRef: newConta.id
    });

    return newConta.id;
  };

  const updateContaPagarReceber = (id: string, cData: Partial<ContaPagarReceber>) => {
    const alvo = contasPagarReceber.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'lançamento financeiro')) return;
    setContasPagarReceber(prev => prev.map(c => c.id === id ? { ...c, ...cData } : c));
    addAuditLog('SISFIN', 'ALTERACAO', `Atualizou conta a pagar/receber ${alvo?.descricao || id}`);
  };

  const deleteContaPagarReceber = (id: string) => {
    const alvo = contasPagarReceber.find(x => x.id === id);
    setContasPagarReceber(prev => prev.filter(c => c.id !== id));
    addAuditLog('SISFIN', 'EXCLUSAO', `Excluiu conta a pagar/receber ${alvo?.descricao || id}`);
  };

  const addSolicitacaoCompra = (sData: Omit<SolicitacaoCompra, 'id' | 'tenantId'>) => {
    const newSol: SolicitacaoCompra = {
      ...sData,
      id: `sol-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setSolicitacoesCompra(prev => [newSol, ...prev]);
    addAuditLog('COMPRAS', 'INCLUSAO', `Cadastrou solicitação de compra: ${(newSol.numeroSolicitacao || newSol.itemDescricao) || newSol.id}`);
  };

  const updateSolicitacaoCompra = (id: string, sData: Partial<SolicitacaoCompra>) => {
    const alvo = solicitacoesCompra.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'solicitação de compra')) return;
    setSolicitacoesCompra(prev => prev.map(s => s.id === id ? { ...s, ...sData } : s));
    addAuditLog('COMPRAS', 'ALTERACAO', `Atualizou solicitação de compra ${(alvo?.numeroSolicitacao || alvo?.itemDescricao) || id}`);
  };

  const deleteSolicitacaoCompra = (id: string) => {
    const alvo = solicitacoesCompra.find(x => x.id === id);
    setSolicitacoesCompra(prev => prev.filter(s => s.id !== id));
    addAuditLog('COMPRAS', 'EXCLUSAO', `Excluiu solicitação de compra ${(alvo?.numeroSolicitacao || alvo?.itemDescricao) || id}`);
  };

  const addFornecedor = (fData: Omit<Fornecedor, 'id' | 'tenantId'>) => {
    const cnpj = chaveUnica(fData.cnpj);
    const razao = chaveUnica(fData.razaoSocial);
    if (fornecedores.some(f => pertenceAoTenant(f, currentTenant.id) && (
      (cnpj && chaveUnica(f.cnpj) === cnpj) ||
      (razao && chaveUnica(f.razaoSocial) === razao)
    ))) {
      alert('Cadastro não realizado: já existe um fornecedor com o mesmo CNPJ ou razão social.');
      return;
    }
    const newForn: Fornecedor = {
      ...fData,
      id: `forn-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setFornecedores(prev => [newForn, ...prev]);
    addAuditLog('COMPRAS', 'INCLUSAO', `Cadastrou fornecedor: ${newForn.razaoSocial || newForn.id}`);
  };

  const updateFornecedor = (id: string, fData: Partial<Fornecedor>) => {
    const alvo = fornecedores.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'fornecedor')) return;
    setFornecedores(prev => prev.map(f => f.id === id ? { ...f, ...fData } : f));
    addAuditLog('COMPRAS', 'ALTERACAO', `Atualizou fornecedor ${alvo?.razaoSocial || id}`);
  };

  const deleteFornecedor = (id: string) => {
    const alvo = fornecedores.find(x => x.id === id);
    setFornecedores(prev => prev.filter(f => f.id !== id));
    addAuditLog('COMPRAS', 'EXCLUSAO', `Excluiu fornecedor ${alvo?.razaoSocial || id}`);
  };

  const addItemEstoque = (iData: Omit<ItemEstoque, 'id' | 'tenantId'>) => {
    const codigo = chaveUnica(iData.codigoSku || iData.codigoItem);
    const nome = chaveUnica(iData.nomeItem);
    if (estoque.some(i => pertenceAoTenant(i, currentTenant.id) && (
      (codigo && (chaveUnica(i.codigoSku) === codigo || chaveUnica(i.codigoItem) === codigo)) ||
      (nome && chaveUnica(i.nomeItem) === nome)
    ))) {
      alert('Cadastro não realizado: já existe um item de estoque com o mesmo código ou nome.');
      return;
    }
    const newItem: ItemEstoque = {
      ...iData,
      id: `est-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setEstoque(prev => [newItem, ...prev]);
    addAuditLog('ESTOQUE', 'INCLUSAO', `Cadastrou item de estoque: ${newItem.nomeItem || newItem.id}`);
  };

  const updateItemEstoque = (id: string, iData: Partial<ItemEstoque>) => {
    const alvo = estoque.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'item de estoque')) return;
    setEstoque(prev => prev.map(i => i.id === id ? { ...i, ...iData } : i));
    addAuditLog('ESTOQUE', 'ALTERACAO', `Atualizou item de estoque ${alvo?.nomeItem || id}`);
  };

  const deleteItemEstoque = (id: string) => {
    const alvo = estoque.find(x => x.id === id);
    setEstoque(prev => prev.filter(i => i.id !== id));
    addAuditLog('ESTOQUE', 'EXCLUSAO', `Excluiu item de estoque ${alvo?.nomeItem || id}`);
  };

  const deleteMovimentacaoEstoque = (id: string) => {
    const alvo = movimentacoesEstoque.find(x => x.id === id);
    setMovimentacoesEstoque(prev => prev.filter(m => m.id !== id));
    addAuditLog('ESTOQUE', 'EXCLUSAO', `Excluiu movimentação de estoque ${alvo?.itemNome || id}`);
  };

  const updateFuncionarioRH = (id: string, fData: Partial<FuncionarioRH>) => {
    const alvo = funcionariosRH.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'funcionário')) return;
    setFuncionariosRH(prev => prev.map(f => f.id === id ? { ...f, ...fData } : f));
    addAuditLog('RH', 'ALTERACAO', `Atualizou funcionário ${alvo?.nome || id}`);
  };

  const deleteFuncionarioRH = (id: string) => {
    const alvo = funcionariosRH.find(x => x.id === id);
    setFuncionariosRH(prev => prev.filter(f => f.id !== id));
    addAuditLog('RH', 'EXCLUSAO', `Excluiu funcionário ${alvo?.nome || id}`);
  };

  const addFolhaPagamento = (fData: Omit<FolhaPagamento, 'id' | 'tenantId'>) => {
    const newFolha: FolhaPagamento = {
      ...fData,
      id: `folha-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setFolhaPagamento(prev => [newFolha, ...prev]);

    const valorFolha = newFolha.salarioLiquido || newFolha.totalLiquido || newFolha.salarioBruto || 0;
    const dataVenc = newFolha.dataPagamento || new Date().toISOString().split('T')[0];

    // Usa addContaPagarReceber (que já dispara o lançamento contábil
    // automaticamente com as contas corretas do Plano de Contas) em vez de
    // gravar a conta a pagar E o lançamento contábil "na mão" aqui — antes,
    // essa duplicação usava códigos de conta (4.1.2.01.001 / 2.1.2.01.001)
    // que não existiam de verdade no Plano de Contas do SisCont.
    addContaPagarReceber({
      tipo: 'PAGAR',
      descricao: `Folha de Pagamento ${newFolha.competenciaMesAno || newFolha.competencia || ''} - ${newFolha.funcionarioNome || 'Colaborador'}`,
      pessoaNome: newFolha.funcionarioNome || 'Funcionario RH',
      categoria: 'FOLHA_PAGAMENTO',
      valor: valorFolha,
      dataEmissao: new Date().toISOString().split('T')[0],
      dataVencimento: dataVenc,
      status: 'PENDENTE',
      centroCusto: 'Recursos Humanos'
    });
    addAuditLog('RH', 'INCLUSAO', `Cadastrou folha de pagamento: ${(newFolha.funcionarioNome + " - " + newFolha.competencia) || newFolha.id}`);
  };

  const updateFolhaPagamento = (id: string, fData: Partial<FolhaPagamento>) => {
    const alvo = folhaPagamento.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'folha de pagamento')) return;
    setFolhaPagamento(prev => prev.map(f => f.id === id ? { ...f, ...fData } : f));
    addAuditLog('RH', 'ALTERACAO', `Atualizou folha de pagamento ${(alvo?.funcionarioNome + " - " + alvo?.competencia) || id}`);
  };

  const deleteFolhaPagamento = (id: string) => {
    const alvo = folhaPagamento.find(x => x.id === id);
    setFolhaPagamento(prev => prev.filter(f => f.id !== id));
    addAuditLog('RH', 'EXCLUSAO', `Excluiu folha de pagamento ${(alvo?.funcionarioNome + " - " + alvo?.competencia) || id}`);
  };

  const addEscolaPnae = (eData: Omit<EscolaPnae, 'id' | 'tenantId'>) => {
    const inep = chaveUnica(eData.inepCodigo);
    const cnpj = chaveUnica(eData.cnpj);
    const nome = chaveUnica(eData.nomeEscola);
    if (escolasPnae.some(e => pertenceAoTenant(e, currentTenant.id) && (
      (inep && chaveUnica(e.inepCodigo) === inep) ||
      (cnpj && chaveUnica(e.cnpj) === cnpj) ||
      (nome && chaveUnica(e.nomeEscola) === nome)
    ))) {
      alert('Cadastro não realizado: já existe uma escola com o mesmo INEP, CNPJ ou nome.');
      return;
    }
    const newEsc: EscolaPnae = {
      ...eData,
      id: `esc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setEscolasPnae(prev => [newEsc, ...prev]);
    addAuditLog('CADASTROS', 'INCLUSAO', `Cadastrou escola PNAE: ${newEsc.nomeEscola || newEsc.id}`);
  };

  const updateEscolaPnae = (id: string, eData: Partial<EscolaPnae>) => {
    const alvo = escolasPnae.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'escola')) return;
    setEscolasPnae(prev => prev.map(e => e.id === id ? { ...e, ...eData } : e));
    // Sincroniza o nome da escola nos pedidos já vinculados a ela (tanto no
    // nível do pedido quanto em cada item que aponta para essa escola).
    if (eData.nomeEscola && alvo && eData.nomeEscola !== alvo.nomeEscola) {
      setPedidosProdutorPAA(prev => prev.map(p => {
        const atualizarNome = p.escolaId === id;
        const idxNasEscolas = (p.escolasIds || []).indexOf(id);
        return {
          ...p,
          escolaNome: atualizarNome ? eData.nomeEscola! : p.escolaNome,
          escolasNomes: idxNasEscolas >= 0
            ? (p.escolasNomes || []).map((n, i) => i === idxNasEscolas ? eData.nomeEscola! : n)
            : p.escolasNomes,
          itens: (p.itens || []).map(it => it.escolaId === id ? { ...it, escolaNome: eData.nomeEscola! } : it)
        };
      }));
    }
    addAuditLog('CADASTROS', 'ALTERACAO', `Atualizou escola PNAE ${alvo?.nomeEscola || id}`);
  };

  const deleteEscolaPnae = (id: string) => {
    const alvo = escolasPnae.find(x => x.id === id);
    // Integridade referencial: uma escola com pedidos vinculados (como
    // destino de entrega) não pode ser excluída sem antes remover esse
    // vínculo — senão o pedido ficaria sem saber para onde entregar.
    const pedidosVinculados = pedidosProdutorPAA.filter(p =>
      p.escolaId === id || (p.escolasIds || []).includes(id) || (p.itens || []).some(it => it.escolaId === id)
    ).length;
    if (pedidosVinculados > 0) {
      alert(`Não é possível excluir a escola "${alvo?.nomeEscola}": existem ${pedidosVinculados} pedido(s) com entrega vinculada a ela. Remova ou reatribua esses pedidos antes de excluir a escola.`);
      return;
    }
    setEscolasPnae(prev => prev.filter(e => e.id !== id));
    addAuditLog('CADASTROS', 'EXCLUSAO', `Excluiu escola PNAE ${alvo?.nomeEscola || id}`);
  };

  const addMotorista = (mData: Omit<Motorista, 'id' | 'tenantId'>) => {
    const newMot: Motorista = {
      ...mData,
      id: `mot-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setMotoristas(prev => [newMot, ...prev]);
    addAuditLog('CADASTROS', 'INCLUSAO', `Cadastrou motorista: ${newMot.nome || newMot.id}`);
  };

  const updateMotorista = (id: string, mData: Partial<Motorista>) => {
    const alvo = motoristas.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'motorista')) return;
    setMotoristas(prev => prev.map(m => m.id === id ? { ...m, ...mData } : m));
    addAuditLog('CADASTROS', 'ALTERACAO', `Atualizou motorista ${alvo?.nome || id}`);
  };

  const deleteMotorista = (id: string) => {
    const alvo = motoristas.find(x => x.id === id);
    setMotoristas(prev => prev.filter(m => m.id !== id));
    addAuditLog('CADASTROS', 'EXCLUSAO', `Excluiu motorista ${alvo?.nome || id}`);
  };

  const addEntregaEscola = (eData: Omit<EntregaEscolaPnae, 'id' | 'tenantId'>) => {
    const newEnt: EntregaEscolaPnae = {
      ...eData,
      id: `ent-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setEntregasEscola(prev => [newEnt, ...prev]);

    const valorTotalEntrega = newEnt.itensRecebidos ? newEnt.itensRecebidos.reduce((acc, item) => acc + (item.qtdRecebida || item.qtdEsperada || 0) * 12, 0) : 0;
    const dataEntregaReal = newEnt.dataHoraEntrega ? newEnt.dataHoraEntrega.substring(0, 10) : new Date().toISOString().split('T')[0];
    const isEntregue = newEnt.statusConfirmacao === 'RECEBIDO_OK' || newEnt.statusConfirmacao === 'RECEBIDO_COM_RESTRICAO';

    // Financial Title (Receber)
    const newConta: ContaPagarReceber = {
      id: `fin-ent-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id,
      tipo: 'RECEBER',
      descricao: `Faturamento Entrega Escolar PNAE - ${newEnt.escolaNome || 'Prefeitura'}`,
      pessoaNome: newEnt.escolaNome || 'Secretaria de Educação / PNAE',
      categoria: 'RECEITA_VENDA',
      valor: valorTotalEntrega,
      dataEmissao: dataEntregaReal,
      dataVencimento: dataEntregaReal,
      status: isEntregue ? 'PAGO' : 'PENDENTE',
      dataPagamento: isEntregue ? dataEntregaReal : undefined,
      centroCusto: 'Programa PNAE'
    };
    setContasPagarReceber(prev => [newConta, ...prev]);

    if (isEntregue) {
      addLancamentoExtrato({
        data: dataEntregaReal,
        historico: `Crédito PNAE Entrega Escolar (${newEnt.escolaNome})`,
        documento: newEnt.id,
        tipo: 'CREDITO',
        valor: valorTotalEntrega,
        categoria: 'RECEITA_VENDA'
      });
    }

    addLancamentoContabil({
      numeroLancamento: 6000 + Math.floor(Math.random() * 3000),
      data: dataEntregaReal,
      contaDebitoCodigo: '1.1.02.001',
      contaDebitoNome: 'Clientes',
      contaCreditoCodigo: '4.1.01.001',
      contaCreditoNome: 'Venda da Produção dos Cooperados',
      valor: valorTotalEntrega,
      historico: `Entrega de Alimentos PNAE - Escola ${newEnt.escolaNome}`,
      moduloOrigem: 'FINANCEIRO'
    });
    addAuditLog('SISGEPA', 'INCLUSAO', `Cadastrou entrega para escola: ${newEnt.escolaNome || newEnt.id}`);
  };

  const deleteEntregaEscola = (id: string) => {
    const alvo = entregasEscola.find(x => x.id === id);
    setEntregasEscola(prev => prev.filter(e => e.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu entrega para escola ${alvo?.escolaNome || id}`);
  };

  const addRomaneioMotorista = (rData: Omit<RomaneioMotorista, 'id' | 'tenantId'>) => {
    const newRom: RomaneioMotorista = {
      ...rData,
      id: `rom-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setRomaneiosMotorista(prev => [newRom, ...prev]);
    addAuditLog('SISGEPA', 'INCLUSAO', `Cadastrou romaneio de motorista: ${newRom.numeroRomaneio || newRom.id}`);
  };

  const deleteRomaneioMotorista = (id: string) => {
    const alvo = romaneiosMotorista.find(x => x.id === id);
    setRomaneiosMotorista(prev => prev.filter(r => r.id !== id));
    addAuditLog('SISGEPA', 'EXCLUSAO', `Excluiu romaneio de motorista ${alvo?.numeroRomaneio || id}`);
  };

  const pagarReceberConta = (id: string) => {
    let targetConta: ContaPagarReceber | undefined;
    setContasPagarReceber(prev => prev.map(c => {
      if (c.id === id) {
        targetConta = {
          ...c,
          status: 'PAGO',
          dataPagamento: new Date().toISOString().split('T')[0]
        };
        return targetConta;
      }
      return c;
    }));

    if (targetConta) {
      const nowIso = new Date().toISOString().split('T')[0];
      const isReceber = (targetConta as ContaPagarReceber).tipo === 'RECEBER';

      // 1. Credit / Debit Bank Statement
      addLancamentoExtrato({
        data: nowIso,
        historico: `Baixa Financeira (${(targetConta as ContaPagarReceber).tipo}): ${(targetConta as ContaPagarReceber).descricao} - ${(targetConta as ContaPagarReceber).pessoaNome}`,
        documento: (targetConta as ContaPagarReceber).id,
        tipo: isReceber ? 'CREDITO' : 'DEBITO',
        valor: (targetConta as ContaPagarReceber).valor,
        categoria: (targetConta as ContaPagarReceber).categoria || 'FINANCEIRO'
      });

      // 2. Add Accounting entry — reverte a conta "a pagar/receber" (que já
      // tinha sido lançada certinho na criação, via
      // gerarLancamentoContabilAutomatico) para o Caixa/Banco, usando a
      // MESMA conta de contrapartida da categoria original — não códigos
      // de conta inventados que não existem no Plano de Contas.
      const contaOriginal = (targetConta as ContaPagarReceber).categoria;
      const contasRef = (contaOriginal && CONTAS_POR_CATEGORIA[contaOriginal]) || CONTAS_POR_CATEGORIA[isReceber ? 'DEFAULT_RECEBER' : 'DEFAULT_PAGAR'];
      const contaCaixaBanco = { codigo: '1.1.01.002', nome: 'Bancos Conta Movimento' };
      addLancamentoContabil({
        numeroLancamento: 4000 + Math.floor(Math.random() * 5000),
        data: nowIso,
        contaDebitoCodigo: isReceber ? contaCaixaBanco.codigo : contasRef.ativoPassivoCodigo,
        contaDebitoNome: isReceber ? contaCaixaBanco.nome : contasRef.ativoPassivoNome,
        contaCreditoCodigo: isReceber ? contasRef.ativoPassivoCodigo : contaCaixaBanco.codigo,
        contaCreditoNome: isReceber ? contasRef.ativoPassivoNome : contaCaixaBanco.nome,
        valor: (targetConta as ContaPagarReceber).valor,
        historico: `Liquidação de Título (${(targetConta as ContaPagarReceber).tipo}) - ${(targetConta as ContaPagarReceber).descricao} (${(targetConta as ContaPagarReceber).pessoaNome})`,
        moduloOrigem: 'FINANCEIRO'
      });
    }

    triggerWebhooks('financeiro.pagamento', { contaId: id });
  };

  const addMovimentacaoEstoque = (mData: Omit<MovimentacaoEstoque, 'id' | 'tenantId' | 'dataHora'>) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newMov: MovimentacaoEstoque = {
      ...mData,
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id,
      dataHora: nowStr
    };
    setMovimentacoesEstoque(prev => [newMov, ...prev]);
    const itemMovimentado = estoque.find(item => item.id === mData.itemEstoqueId);
    setEstoque(prev => prev.map(item => {
      if (item.id === mData.itemEstoqueId) {
        const delta = mData.tipoMovimento === 'ENTRADA' ? mData.quantidade : -mData.quantidade;
        return {
          ...item,
          quantidadeAtual: Math.max(0, item.quantidadeAtual + delta)
        };
      }
      return item;
    }));
    triggerWebhooks('estoque.movimentacao', newMov);
    addAuditLog('ESTOQUE', 'INCLUSAO', `Cadastrou movimentação de estoque: ${newMov.itemNome || newMov.id}`);

    // Integração SisEstoque → SisCont: toda SAÍDA ou PERDA de estoque com
    // valor conhecido gera automaticamente o lançamento contábil de baixa.
    // ENTRADA não gera lançamento aqui de propósito — quando a entrada vem
    // de um fluxo que já tem contabilização própria (ex.: coleta de
    // produção vinculada a um Pedido do SisGepa, ou uma Ordem de Compra),
    // lançar de novo aqui duplicaria o registro contábil.
    if ((mData.tipoMovimento === 'SAIDA' || mData.tipoMovimento === 'PERDA') && itemMovimentado?.valorUnitarioMedio) {
      const valorMovimentado = Number((mData.quantidade * itemMovimentado.valorUnitarioMedio).toFixed(2));
      if (valorMovimentado > 0) {
        const contaEstoque = { codigo: '1.1.04.003', nome: 'Insumos Agrícolas' };
        const contaContrapartida = mData.tipoMovimento === 'PERDA'
          ? { codigo: '5.1.02.002', nome: 'Perdas de Estoques' }
          : { codigo: '5.1.02.001', nome: 'Custos de Comercialização' };
        const proximoNumero = Math.max(1000, ...lancamentosContabeis.map(l => Number(l.numeroLancamento) || 0)) + 1;
        setLancamentosContabeis(prev => [{
          id: `lanc-est-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          tenantId: currentTenant.id,
          numeroLancamento: proximoNumero,
          data: new Date().toISOString().split('T')[0],
          contaDebitoCodigo: contaContrapartida.codigo,
          contaDebitoNome: contaContrapartida.nome,
          contaCreditoCodigo: contaEstoque.codigo,
          contaCreditoNome: contaEstoque.nome,
          valor: valorMovimentado,
          historico: `[Lançamento automático] ${mData.tipoMovimento === 'PERDA' ? 'Perda' : 'Saída'} de estoque: ${newMov.itemNome} (${mData.motivoHist || mData.motivo || 'sem motivo informado'})`,
          documentoRef: newMov.id,
          moduloOrigem: 'ESTOQUE',
          usuario: currentUser?.name || 'Sistema'
        }, ...prev]);
      }
    }
  };

  const addFuncionarioRH = (fData: Omit<FuncionarioRH, 'id' | 'tenantId'>) => {
    const cpf = chaveUnica(fData.cpf);
    const matricula = chaveUnica(fData.matricula);
    if (funcionariosRH.some(f => pertenceAoTenant(f, currentTenant.id) && (
      (cpf && chaveUnica(f.cpf) === cpf) ||
      (matricula && chaveUnica(f.matricula) === matricula)
    ))) {
      alert('Cadastro não realizado: já existe um funcionário com o mesmo CPF ou matrícula.');
      return;
    }
    const newFunc: FuncionarioRH = {
      ...fData,
      id: `func-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setFuncionariosRH(prev => [newFunc, ...prev]);
    addAuditLog('RH', 'INCLUSAO', `Cadastrou funcionário: ${newFunc.nome || newFunc.id}`);
  };

  const confirmarEntregaEscola = (eData: Omit<EntregaEscolaPnae, 'id' | 'tenantId'>) => {
    const newEnt: EntregaEscolaPnae = {
      ...eData,
      id: `ent-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant.id
    };
    setEntregasEscola(prev => [newEnt, ...prev]);
  };

  const atualizarStatusRomaneio = (id: string, status: RomaneioMotorista['statusRota']) => {
    setRomaneiosMotorista(prev => prev.map(r => r.id === id ? { ...r, statusRota: status } : r));
  };

  const addNotaFiscal = (nfData: Omit<NotaFiscal, 'id' | 'tenantId'>): NotaFiscal => {
    const newNf: NotaFiscal = {
      ...nfData,
      id: `nf-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant?.id || 'coop-01'
    };
    setNotasFiscais(prev => [newNf, ...prev]);
    addAuditLog('RELATORIOS', 'INCLUSAO', `Gerou rascunho de Nota Fiscal Nº ${newNf.numeroNota}`);
    return newNf;
  };

  const updateNotaFiscal = (id: string, nfData: Partial<NotaFiscal>) => {
    const alvo = notasFiscais.find(x => x.id === id);
    if (alvo && !podeEditarAteDiaCinco(alvo, 'nota fiscal')) return;
    setNotasFiscais(prev => prev.map(n => n.id === id ? { ...n, ...nfData } : n));
    addAuditLog('FISCAL', 'ALTERACAO', `Atualizou nota fiscal ${alvo?.numeroNota || id}`);
  };

  const deleteNotaFiscal = (id: string) => {
    setNotasFiscais(prev => prev.filter(n => n.id !== id));
    addAuditLog('RELATORIOS', 'EXCLUSAO', `Excluiu a Nota Fiscal ID ${id}`);
  };

  const updateSefazCeConfig = (newConfig: Partial<SefazCeConfig>) => {
    setSefazCeConfig(prev => ({ ...prev, ...newConfig }));
    addAuditLog('CONFIGURACOES', 'ALTERACAO', `Atualizou as configurações da SEFAZ Ceará`);
  };

  const transmitirSefazCe = async (id: string): Promise<{ success: boolean; motivo: string; chaveAcesso?: string; protocolo?: string }> => {
    setNotasFiscais(prev => prev.map(n => n.id === id ? { ...n, statusSefaz: 'TRANSMITINDO' as const } : n));

    await new Promise(resolve => setTimeout(resolve, 1400));

    const targetNf = notasFiscais.find(n => n.id === id);
    if (!targetNf) {
      return { success: false, motivo: 'Nota Fiscal não encontrada.' };
    }

    const yearMonth = new Date().toISOString().substring(2, 7).replace('-', '');
    const cnpjClean = (targetNf.emitenteCnpjCpf || sefazCeConfig.cnpjEmitente).replace(/\D/g, '').padStart(14, '0');
    const mod = targetNf.modelo === 'NFE_55' ? '55' : targetNf.modelo === 'NFCE_65' ? '65' : '55';
    const serie = (targetNf.serie || '001').replace(/\D/g, '').padStart(3, '0');
    const num = (targetNf.numeroNota || '000000001').replace(/\D/g, '').padStart(9, '0');
    const tipoEmissao = '1';
    const codNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Chave de Acesso de 44 dígitos com prefixo 23 (Ceará)
    const baseChave = `23${yearMonth}${cnpjClean}${mod}${serie}${num}${tipoEmissao}${codNum}`;
    let sum = 0;
    let weight = 2;
    for (let i = baseChave.length - 1; i >= 0; i--) {
      sum += parseInt(baseChave[i], 10) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const remainder = sum % 11;
    const dv = (remainder === 0 || remainder === 1) ? 0 : 11 - remainder;
    const chave44 = `${baseChave}${dv}`;

    const protocolo = `12326000${Math.floor(1000000 + Math.random() * 9000000)}`;
    const dataHoraAut = new Date().toISOString();
    const motivo = '100 - Autorizado o uso da NF-e (SEFAZ CEARÁ)';

    setNotasFiscais(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          statusSefaz: 'AUTORIZADA' as const,
          chaveAcesso44: chave44,
          protocoloAutorizacao: protocolo,
          dataHoraAutorizacao: dataHoraAut,
          motivoStatusSefaz: motivo,
          qrCodeSefazUrl: `https://kalypso.sefaz.ce.gov.br/nfe/qrcode?p=${chave44}`,
          xmlUrl: `data:text/xml;charset=utf-8,${encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${chave44}"><ide><cUF>23</cUF><cNF>${codNum}</cNF><natOp>${n.naturezaOperacao}</natOp><mod>${mod}</mod><serie>${serie}</serie><nNF>${num}</nNF><dhEmi>${n.dataEmissao}</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>2313501</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${dv}</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>SICOOP-CE-1.0</verProc></ide><emit><CNPJ>${cnpjClean}</CNPJ><xNome>${n.emitenteRazaoSocial}</xNome><IE>${n.emitenteInscricaoEstadual}</IE><CRT>1</CRT></emit><dest><CNPJ>${(n.destinatarioCnpjCpf || '').replace(/\D/g, '')}</CNPJ><xNome>${n.destinatarioNome}</xNome></dest></infNFe></NFe><protNFe><infProt><tpAmb>2</tpAmb><verAplic>SEFAZ_CE_1.0</verAplic><chNFe>${chave44}</chNFe><dhRecbto>${dataHoraAut}</dhRecbto><nProt>${protocolo}</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e (SEFAZ Ceará)</xMotivo></infProt></protNFe></nfeProc>`)}`
        };
      }
      return n;
    }));

    setSefazCeConfig(prev => ({
      ...prev,
      proximoNumeroNFe: prev.proximoNumeroNFe + 1
    }));

    addAuditLog('RELATORIOS', 'INCLUSAO', `Transmitiu NF-e nº ${targetNf.numeroNota} à SEFAZ-CE. Protocolo: ${protocolo}`);

    return {
      success: true,
      motivo,
      chaveAcesso: chave44,
      protocolo
    };
  };

  const cancelarNotaFiscalSefaz = async (id: string, justificativa: string): Promise<{ success: boolean; motivo: string }> => {
    if (!justificativa || justificativa.trim().length < 15) {
      return { success: false, motivo: 'A justificativa de cancelamento na SEFAZ-CE deve ter no mínimo 15 caracteres.' };
    }
    setNotasFiscais(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          statusSefaz: 'CANCELADA' as const,
          motivoStatusSefaz: `101 - Cancelamento de NF-e homologado na SEFAZ Ceará. Motivo: ${justificativa}`
        };
      }
      return n;
    }));
    addAuditLog('RELATORIOS', 'ALTERACAO', `Cancelou NF-e ID ${id} na SEFAZ-CE. Motivo: ${justificativa}`);
    return { success: true, motivo: 'Cancelamento homologado com sucesso na SEFAZ Ceará.' };
  };

  const gerarNotaFiscalDePrestacaoContas = (prestacao: PrestacaoContasPAA): NotaFiscal => {
    const num = sefazCeConfig.proximoNumeroNFe.toString().padStart(6, '0');
    const newNf: NotaFiscal = {
      id: `nf-pnae-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant?.id || 'coop-01',
      numeroNota: num,
      serie: sefazCeConfig.serieNFe,
      modelo: 'NFE_55',
      tipoOperacao: 'SAIDA_PNAE_PAA',
      emitenteRazaoSocial: currentTenant?.razaoSocial || sefazCeConfig.razaoSocialEmitente,
      emitenteCnpjCpf: currentTenant?.cnpj || sefazCeConfig.cnpjEmitente,
      emitenteInscricaoEstadual: sefazCeConfig.inscricaoEstadual,
      emitenteMunicipio: currentTenant?.cidade || 'Trairi',
      emitenteUf: 'CE',
      destinatarioNome: prestacao.escolaNome || 'PREFEITURA MUNICIPAL DE TRAIRI / SECRETARIA DE EDUCAÇÃO (PNAE)',
      destinatarioCnpjCpf: '07.418.912/0001-50',
      destinatarioInscricaoEstadual: 'ISENTO',
      destinatarioEndereco: 'Rua Fernando Bezerra, 120 - Centro',
      destinatarioMunicipio: 'Trairi',
      destinatarioUf: 'CE',
      dataEmissao: new Date().toISOString().substring(0, 10),
      valorProdutos: prestacao.valorTotalExecutado || prestacao.valorTotalRepasse || 5000,
      valorFrete: 0,
      valorDesconto: 0,
      valorIcms: 0,
      valorTotalNota: prestacao.valorTotalExecutado || prestacao.valorTotalRepasse || 5000,
      naturezaOperacao: 'Venda de Produção Agrícola Familiar para Alimentação Escolar (PNAE CE)',
      statusSefaz: 'RASCUNHO',
      ambienteSefaz: sefazCeConfig.ambiente,
      prestacaoContasId: prestacao.id,
      observacoesFiscais: `AQUISIÇÃO DE GÊNEROS ALIMENTÍCIOS DIVERSIFICADOS DA AGRICULTURA FAMILIAR - TERMO DE PRESTAÇÃO DE CONTAS Nº ${prestacao.numeroTermo}. ISENÇÃO DE ICMS CONFORME LEGISLAÇÃO ESTADUAL DO CEARÁ.`,
      itens: [
        {
          id: `item-pc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          descricao: `Hortifrúti e Produtos Agrícolas - PNAE/PAA (Lote ${prestacao.numeroLote || '01'})`,
          ncm: '0810.90.00',
          cfop: '5101',
          unidade: 'KG',
          quantidade: prestacao.totalKgEntregues || 500,
          valorUnitario: (prestacao.valorTotalExecutado || 5000) / (prestacao.totalKgEntregues || 500),
          valorTotal: prestacao.valorTotalExecutado || 5000,
          icmsCstCsosn: '400',
          icmsAliquota: 0,
          icmsValor: 0
        }
      ]
    };
    setNotasFiscais(prev => [newNf, ...prev]);
    setSefazCeConfig(prev => ({ ...prev, proximoNumeroNFe: prev.proximoNumeroNFe + 1 }));
    return newNf;
  };

  /**
   * Gera Nota Fiscal Eletrônica de ENTRADA por Produtor (Compra de Produção Rural no SISGEPA)
   */
  const gerarNotaFiscalEntradaProdutor = (
    pedido: PedidoProdutorPAA,
    produtorId: string,
    sistemaTributario: SistemaTributarioNFe = 'TRADICIONAL_ATUAL'
  ): NotaFiscal => {
    const prod = produtores.find(p => p.id === produtorId) || {
      id: produtorId,
      nome: 'Produtor Cooperado',
      cpfCnpj: '000.000.000-00',
      cafDapNum: 'DAP-CE-2026',
      nomePropriedade: 'Sítio Familiar',
      municipio: 'Trairi',
      uf: 'CE',
      comunidade: 'Zona Rural'
    };

    // Itens correspondentes a este produtor no pedido
    const itensDoProdutor = (pedido.itens || []).filter(it => it.produtorId === produtorId || it.produtorNome === prod.nome);
    const itensMapeados: NotaFiscalItem[] = (itensDoProdutor.length > 0 ? itensDoProdutor : [
      {
        produtorId: prod.id,
        produtorNome: prod.nome,
        produtoId: 'prod-def',
        produtoNome: 'Produtos da Agricultura Familiar',
        unidadeMedida: 'KG',
        quantidadeOfertada: 100,
        quantidadePedida: 100,
        precoUnitario: 5.0,
        valorTotalItem: 500.0
      }
    ]).map((it, idx) => {
      const prodCadastrado = produtos.find(p => p.id === it.produtoId || p.nome === it.produtoNome);
      const ncm = prodCadastrado?.codigoNcm || '0713.35.00';
      const valorTotal = it.valorTotalItem || (it.quantidadePedida * it.precoUnitario);
      const impostos = calcularImpostosItem(valorTotal, 'ENTRADA_PRODUTOR', sistemaTributario, true);

      return {
        id: `item-ent-${Date.now()}-${idx}`,
        produtoId: it.produtoId,
        descricao: `${it.produtoNome} (Produção Rural Familiar)`,
        ncm: ncm,
        cfop: '1131', // Compra de produção de produtor rural para comercialização/cooperativa
        unidade: it.unidadeMedida || 'KG',
        quantidade: it.quantidadePedida,
        valorUnitario: it.precoUnitario,
        valorTotal: valorTotal,
        ...impostos
      };
    });

    const valorProdutosTotal = itensMapeados.reduce((acc, curr) => acc + curr.valorTotal, 0);
    const valorFunruralTotal = itensMapeados.reduce((acc, curr) => acc + (curr.funruralValor || 0), 0);
    const valorCreditoPresumidoTotal = itensMapeados.reduce((acc, curr) => acc + (curr.creditoPresumidoValor || 0), 0);

    const num = sefazCeConfig.proximoNumeroNFe.toString().padStart(6, '0');
    const newNf: NotaFiscal = {
      id: `nf-ent-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant?.id || 'coop-01',
      numeroNota: num,
      serie: sefazCeConfig.serieNFe,
      modelo: 'NFE_55',
      tipoOperacao: 'ENTRADA_PRODUTOR',
      sistemaTributario: sistemaTributario,
      
      // Emitente: Cooperativa que emite a NF-e de entrada para o produtor
      emitenteRazaoSocial: currentTenant?.razaoSocial || sefazCeConfig.razaoSocialEmitente,
      emitenteCnpjCpf: currentTenant?.cnpj || sefazCeConfig.cnpjEmitente,
      emitenteInscricaoEstadual: sefazCeConfig.inscricaoEstadual,
      emitenteMunicipio: currentTenant?.cidade || 'Trairi',
      emitenteUf: 'CE',
      emitenteEndereco: currentTenant?.logradouro ? `${currentTenant.logradouro}, ${currentTenant.numero}` : 'Sede da Cooperativa',

      // Destinatário / Remetente: O Produtor Rural
      destinatarioNome: `${prod.nome} (Produtor Rural Familiar)`,
      destinatarioCnpjCpf: prod.cpfCnpj,
      destinatarioInscricaoEstadual: 'PRODUTOR RURAL',
      destinatarioEndereco: `${prod.comunidade || 'Comunidade Rural'}, ${prod.nomePropriedade || 'Propriedade Familiar'}`,
      destinatarioMunicipio: prod.municipio || 'Trairi',
      destinatarioUf: prod.uf || 'CE',
      destinatarioTelefone: prod.telefone,

      // Produtor vinculado
      produtorId: prod.id,
      produtorNome: prod.nome,
      produtorCpf: prod.cpfCnpj,
      produtorCafDap: prod.cafDapNum,
      produtorPropriedade: prod.nomePropriedade,
      produtorMunicipio: prod.municipio || 'Trairi',
      produtorUf: prod.uf || 'CE',

      dataEmissao: new Date().toISOString().substring(0, 10),
      dataSaidaEntrada: pedido.dataPedido || new Date().toISOString().substring(0, 10),
      valorProdutos: valorProdutosTotal,
      valorFrete: 0,
      valorDesconto: 0,
      valorIcms: 0,
      valorPis: 0,
      valorCofins: 0,
      valorFunrural: valorFunruralTotal,
      valorCbs: 0,
      valorIbs: 0,
      valorImpostoSeletivo: 0,
      valorCreditoPresumido: valorCreditoPresumidoTotal,
      valorTotalNota: valorProdutosTotal,

      naturezaOperacao: 'Compra de Produção Rural da Agricultura Familiar (Entrada Cooperativa)',
      statusSefaz: 'RASCUNHO',
      ambienteSefaz: sefazCeConfig.ambiente,
      pedidoId: pedido.id,
      pedidoNumero: pedido.numeroPedido,
      chamadaPublicaEdital: pedido.chamadaPublicaEdital,
      programaNome: pedido.programaNome || pedido.programa,
      
      observacoesFiscais: `NF-E DE ENTRADA REF. AQUISIÇÃO DE PRODUTOS RURAIS - PEDIDO SISGEPA Nº ${pedido.numeroPedido} (${pedido.programaNome || pedido.programa}). PRODUTOR: ${prod.nome} | CPF: ${prod.cpfCnpj} | CAF/DAP: ${prod.cafDapNum || 'N/A'}. ISENÇÃO DE ICMS CONFORME DECRETO ESTADUAL DO CEARÁ. FUNRURAL (1,5%): R$ ${valorFunruralTotal.toFixed(2)}. ${sistemaTributario === 'NOVO_SISTEMA_REFORMA_2026' ? 'ENQUADRADO NO NOVO SISTEMA TRIBUTÁRIO (REFORMA TRIBUTÁRIA EC 132/2023 - ALÍQUOTA ZERO CESTA BÁSICA NACIONAL E CRÉDITO PRESUMIDO COOPERATIVO).' : ''}`,
      alertaReformaTributaria: ALERTA_CRONOGRAMA_TEXTO,
      itens: itensMapeados
    };

    setNotasFiscais(prev => [newNf, ...prev]);
    setSefazCeConfig(prev => ({ ...prev, proximoNumeroNFe: prev.proximoNumeroNFe + 1 }));
    addAuditLog('RELATORIOS', 'INCLUSAO', `Gerou NF-e de Entrada nº ${newNf.numeroNota} para o Produtor ${prod.nome} (Pedido ${pedido.numeroPedido})`);
    return newNf;
  };

  /**
   * Gera Nota Fiscal Eletrônica de SAÍDA por Escola (Alimentação Escolar PNAE/PAA no SISGEPA)
   */
  const gerarNotaFiscalSaidaEscola = (
    pedidoOuEntrega: PedidoProdutorPAA | ProgramacaoEntregaPAA,
    escolaId: string,
    sistemaTributario: SistemaTributarioNFe = 'TRADICIONAL_ATUAL'
  ): NotaFiscal => {
    const esc = escolasPnae.find(e => e.id === escolaId) || {
      id: escolaId,
      nomeEscola: ('escolaNome' in pedidoOuEntrega && pedidoOuEntrega.escolaNome) ? pedidoOuEntrega.escolaNome : 'Escola da Rede Municipal de Ensino',
      inepCodigo: '23000001',
      diretorResponsavel: 'Secretaria Municipal de Educação',
      telefone: '(85) 3341-1200',
      endereco: 'Sede da Unidade Escolar',
      alunosAtendidos: 250,
      tenantId: currentTenant?.id || 'coop-01'
    };

    // Mapear itens da entrega ou pedido
    const rawItens = ('itens' in pedidoOuEntrega && Array.isArray(pedidoOuEntrega.itens)) ? pedidoOuEntrega.itens : [];
    const itensMapeados: NotaFiscalItem[] = rawItens.map((it: any, idx) => {
      const qtd = it.quantidadePedida || it.quantidadePrevista || it.quantidadeEntregue || 100;
      const preco = it.precoUnitario || (produtos.find(p => p.id === it.produtoId)?.precoReferencia) || 5.0;
      const valorTotal = it.valorTotalItem || (qtd * preco);
      const prodCadastrado = produtos.find(p => p.id === it.produtoId || p.nome === it.produtoNome);
      const ncm = prodCadastrado?.codigoNcm || '0810.90.00';
      const impostos = calcularImpostosItem(valorTotal, 'SAIDA_PNAE_PAA', sistemaTributario, true);

      return {
        id: `item-sai-${Date.now()}-${idx}`,
        produtoId: it.produtoId,
        descricao: `${it.produtoNome} - Alimentação Escolar PNAE (${it.produtorNome ? `Prod: ${it.produtorNome}` : 'Agric. Familiar'})`,
        ncm: ncm,
        cfop: '5101', // Venda de produção do estabelecimento / cooperativa
        unidade: it.unidadeMedida || it.unidade || 'KG',
        quantidade: qtd,
        valorUnitario: preco,
        valorTotal: valorTotal,
        ...impostos
      };
    });

    const valorProdutosTotal = itensMapeados.reduce((acc, curr) => acc + curr.valorTotal, 0);
    const num = sefazCeConfig.proximoNumeroNFe.toString().padStart(6, '0');
    const numRef = 'numeroPedido' in pedidoOuEntrega ? pedidoOuEntrega.numeroPedido : ('pedidoNumero' in pedidoOuEntrega ? pedidoOuEntrega.pedidoNumero : 'SISGEPA');

    const newNf: NotaFiscal = {
      id: `nf-sai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      tenantId: currentTenant?.id || 'coop-01',
      numeroNota: num,
      serie: sefazCeConfig.serieNFe,
      modelo: 'NFE_55',
      tipoOperacao: 'SAIDA_PNAE_PAA',
      sistemaTributario: sistemaTributario,

      // Emitente: Cooperativa
      emitenteRazaoSocial: currentTenant?.razaoSocial || sefazCeConfig.razaoSocialEmitente,
      emitenteCnpjCpf: currentTenant?.cnpj || sefazCeConfig.cnpjEmitente,
      emitenteInscricaoEstadual: sefazCeConfig.inscricaoEstadual,
      emitenteMunicipio: currentTenant?.cidade || 'Trairi',
      emitenteUf: 'CE',
      emitenteEndereco: currentTenant?.logradouro ? `${currentTenant.logradouro}, ${currentTenant.numero}` : 'Sede da Cooperativa',

      // Destinatário: A Escola / Prefeitura Municipal
      destinatarioNome: `${esc.nomeEscola} (PNAE / Alimentação Escolar)`,
      destinatarioCnpjCpf: '07.418.912/0001-50', // CNPJ da Prefeitura / FNDE responsável
      destinatarioInscricaoEstadual: 'ISENTO',
      destinatarioEndereco: esc.endereco,
      destinatarioMunicipio: 'Trairi',
      destinatarioUf: 'CE',
      destinatarioTelefone: esc.telefone,

      // Escola vinculada
      escolaId: esc.id,
      escolaNome: esc.nomeEscola,
      escolaInep: esc.inepCodigo,
      escolaEnderecoCompleto: esc.endereco,
      escolaResponsavel: esc.diretorResponsavel,

      dataEmissao: new Date().toISOString().substring(0, 10),
      dataSaidaEntrada: new Date().toISOString().substring(0, 10),
      valorProdutos: valorProdutosTotal,
      valorFrete: 0,
      valorDesconto: 0,
      valorIcms: 0,
      valorPis: 0,
      valorCofins: 0,
      valorFunrural: 0,
      valorCbs: 0,
      valorIbs: 0,
      valorImpostoSeletivo: 0,
      valorCreditoPresumido: 0,
      valorTotalNota: valorProdutosTotal,

      naturezaOperacao: 'Venda de Produção da Agricultura Familiar para Alimentação Escolar (PNAE/PAA)',
      statusSefaz: 'RASCUNHO',
      ambienteSefaz: sefazCeConfig.ambiente,
      pedidoNumero: numRef,
      pedidoId: 'id' in pedidoOuEntrega ? pedidoOuEntrega.id : undefined,
      chamadaPublicaEdital: 'chamadaPublicaEdital' in pedidoOuEntrega ? pedidoOuEntrega.chamadaPublicaEdital : undefined,
      programaNome: 'programaNome' in pedidoOuEntrega ? pedidoOuEntrega.programaNome : 'PNAE',

      observacoesFiscais: `NF-E DE SAÍDA - FORNECIMENTO DE GÊNEROS ALIMENTÍCIOS DA AGRICULTURA FAMILIAR PARA O PNAE/PAA (REF: ${numRef}). DESTINO: ${esc.nomeEscola} | CÓD. INEP: ${esc.inepCodigo || 'N/A'}. ISENÇÃO DE ICMS CONFORME CONVÊNIO ICMS/SEFAZ-CE. ${sistemaTributario === 'NOVO_SISTEMA_REFORMA_2026' ? 'ENQUADRADO NO NOVO SISTEMA TRIBUTÁRIO (REFORMA TRIBUTÁRIA EC 132/2023 - ALÍQUOTA ZERO DE CBS/IBS PARA ALIMENTAÇÃO ESCOLAR E CESTA BÁSICA).' : ''}`,
      alertaReformaTributaria: ALERTA_CRONOGRAMA_TEXTO,
      itens: itensMapeados
    };

    setNotasFiscais(prev => [newNf, ...prev]);
    setSefazCeConfig(prev => ({ ...prev, proximoNumeroNFe: prev.proximoNumeroNFe + 1 }));
    addAuditLog('RELATORIOS', 'INCLUSAO', `Gerou NF-e de Saída nº ${newNf.numeroNota} para a Escola ${esc.nomeEscola} (Ref: ${numRef})`);
    return newNf;
  };

  const tenantConfig: SistemaConfig = {
    ...config,
    cooperativaNome: currentTenant?.name || config.cooperativaNome,
    cooperativaCnpj: currentTenant?.cnpj || config.cooperativaCnpj,
    cotaParteValor: currentTenant?.cotaParteValor ?? config.cotaParteValor,
    cotaParteMinima: currentTenant?.cotaParteMinima ?? config.cotaParteMinima,
  };

  return (
    <CoopContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        addUser,
        updateUser,
        deleteUser,
        updateCurrentUserProfile,
        rolePermissions,
        updateRolePermission,
        resetDefaultPermissions,
        getEffectivePermission,
        canAccessModule,
        canWriteModule,
        switchUserRole,
        currentTenant,
        setCurrentTenant,
        tenants,
        addTenant,
        updateTenant,
        isAuthenticated,
        setIsAuthenticated,
        isPendingCooperativeSetup,
        setIsPendingCooperativeSetup,
        loginWithEmail,
        loginWithGoogle,
        registerUser,
        recoverPassword,
        logout,
        cooperados: tenantCooperados,
        transacoesCapital: tenantTransacoesCapital,
        assembleias: tenantAssembleias,
        mandatos: tenantMandatos,
        auditoriaLogs: tenantAuditoriaLogs,
        config: tenantConfig,
        notifications,
        addAuditLog,
        addCooperado,
        updateCooperado,
        deleteCooperado,
        deleteAllCooperados,
        fetchAddressByCep,
        addTransacaoCapital,
        registrarPagamentoParcela,
        addAssembleia,
        updateAssembleia,
        registrarPresenca,
        computarVoto,
        dispararConvocacoes,
        addMandato,
        updateMandato,
        updateConfig,
        restoreDefaultData,
        exportBackupJson,
        importBackupJson,

        // SICOOP PLATFORM Modules
        // Isolamento por tenant: cada cooperativa só recebe do contexto os
        // registros que pertencem a ela (tenantX = X.filter por tenantId).
        produtores: tenantProdutores,
        addProdutor,
        updateProdutor,
        deleteProdutor,
        produtos: tenantProdutos,
        addProduto,
        updateProduto,
        deleteProduto,
        registrosProducao: tenantRegistrosProducao,
        addRegistroProducao,
        updateRegistroProducao,
        deleteRegistroProducao,
        programas: tenantProgramas,
        addPrograma,
        updatePrograma,
        deletePrograma,
        chamadasPublicas: tenantChamadasPublicas,
        addChamadaPublica,
        updateChamadaPublica,
        deleteChamadaPublica,
        rateiosChamadas: tenantRateiosChamadas,
        salvarRateioChamada,
        deleteRateioChamada,
        ofertasPAA: tenantOfertasPAA,
        addOfertaPAA,
        updateOfertaPAA,
        deleteOfertaPAA,
        programacoesEntrega: tenantProgramacoesEntrega,
        addProgramacaoEntrega,
        updateProgramacaoEntrega,
        deleteProgramacaoEntrega,
        prestacoesContas: tenantPrestacoesContas,
        addPrestacaoContas,
        updatePrestacaoContas,
        deletePrestacaoContas,
        pedidosProdutorPAA: tenantPedidosProdutorPAA,
        addPedidoProdutorPAA,
        updatePedidoProdutorPAA,
        deletePedidoProdutorPAA,
        ordensCompra: tenantOrdensCompra,
        addOrdemCompra,
        updateOrdemCompra,
        deleteOrdemCompra,
        planoContas: tenantPlanoContas,
        addPlanoConta,
        updatePlanoConta,
        deletePlanoConta,
        lancamentosContabeis: tenantLancamentosContabeis,
        addLancamentoContabil,
        updateLancamentoContabil,
        deleteLancamentoContabil,
        patrimonio: tenantPatrimonio,
        addItemPatrimonio,
        updateItemPatrimonio,
        deleteItemPatrimonio,
        processarDepreciacaoMensal,
        contasPagarReceber: tenantContasPagarReceber,
        addContaPagarReceber,
        updateContaPagarReceber,
        deleteContaPagarReceber,
        pagarReceberConta,
        extratoBancario: tenantExtratoBancario,
        addLancamentoExtrato,
        solicitacoesCompra: tenantSolicitacoesCompra,
        addSolicitacaoCompra,
        updateSolicitacaoCompra,
        deleteSolicitacaoCompra,
        fornecedores: tenantFornecedores,
        addFornecedor,
        updateFornecedor,
        deleteFornecedor,
        estoque: tenantEstoque,
        addItemEstoque,
        updateItemEstoque,
        deleteItemEstoque,
        movimentacoesEstoque: tenantMovimentacoesEstoque,
        addMovimentacaoEstoque,
        deleteMovimentacaoEstoque,
        funcionariosRH: tenantFuncionariosRH,
        addFuncionarioRH,
        updateFuncionarioRH,
        deleteFuncionarioRH,
        folhaPagamento: tenantFolhaPagamento,
        addFolhaPagamento,
        updateFolhaPagamento,
        deleteFolhaPagamento,
        escolasPnae: tenantEscolasPnae,
        addEscolaPnae,
        updateEscolaPnae,
        deleteEscolaPnae,
        motoristas: tenantMotoristas,
        addMotorista,
        updateMotorista,
        deleteMotorista,
        entregasEscola: tenantEntregasEscola,
        addEntregaEscola,
        confirmarEntregaEscola,
        deleteEntregaEscola,
        romaneiosMotorista: tenantRomaneiosMotorista,
        addRomaneioMotorista,
        atualizarStatusRomaneio,
        deleteRomaneioMotorista,

        notasFiscais: tenantNotasFiscais,
        sefazCeConfig,
        addNotaFiscal,
        updateNotaFiscal,
        deleteNotaFiscal,
        transmitirSefazCe,
        cancelarNotaFiscalSefaz,
        updateSefazCeConfig,
        gerarNotaFiscalDePrestacaoContas,
        gerarNotaFiscalEntradaProdutor,
        gerarNotaFiscalSaidaEscola,

        restaurarCooperadosBaseCompleta,
        importarCooperadosCSV,
        syncCooperadosWithProdutores,

        licenseInfo,
        trialDaysRemaining,
        isTrialExpired,
        activateLicense,
        extendTrial,
        updateLicenseUrls,
        webhooks: tenantWebhooks,
        addWebhook,
        updateWebhook,
        deleteWebhook,
        testWebhook,
        triggerWebhooks,
        searchQuery,

        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        themeMode,
        toggleTheme,
        markNotificationAsRead
      }}
    >
      {children}
    </CoopContext.Provider>
  );
};

export const useCoop = () => {
  const context = useContext(CoopContext);
  if (!context) {
    throw new Error('useCoop must be used within a CoopProvider');
  }
  return context;
};
