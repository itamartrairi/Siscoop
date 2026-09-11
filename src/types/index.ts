export type UserRole = 
  | 'ADMIN' 
  | 'PRESIDENTE' 
  | 'DIRETOR_FINANCEIRO' 
  | 'CONTADOR' 
  | 'TECNICO' 
  | 'COOPERADO' 
  | 'MOTORISTA' 
  | 'ESCOLA' 
  | 'FORNECEDOR' 
  | 'CONSULTA'
  | 'GERENTE'
  | 'SECRETARIA'
  | 'FINANCEIRO'
  | 'AUDITORIA';

export type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'ADMIN';

export type SystemToolModule =
  | 'dashboard'
  | 'cadastro-cooperativa'
  | 'cadastros'
  | 'cooperados'
  | 'capital'
  | 'assembleias'
  | 'diretoria'
  | 'sisgepa'
  | 'fiscal'
  | 'siscont'
  | 'sisfin'
  | 'compras'
  | 'estoque'
  | 'rh'
  | 'bi'
  | 'portal-cooperado'
  | 'portal-escola'
  | 'app-produtor'
  | 'app-motorista'
  | 'relatorios'
  | 'backup-sistema'
  | 'configuracoes';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  tenantId: string;
  active: boolean;
  lastLogin?: string;
  phone?: string;
  cpf?: string;
  cargo?: string;
  departamento?: string;
  bio?: string;
  password?: string;
  customPermissions?: Partial<Record<SystemToolModule, PermissionLevel>>;
}

export type RolePermissionsMap = Record<UserRole, Record<SystemToolModule, PermissionLevel>>;

export interface CooperativeTenant {
  id: string;
  name: string;
  razaoSocial: string;
  cnpj: string;
  logoUrl?: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  cotaParteValor: number;
  cotaParteMinima: number;
}

export type Tenant = CooperativeTenant;

export type SituacaoCooperado = 'ATIVO' | 'INATIVO' | 'DEMITIDO' | 'EXCLUIDO' | 'FALECIDO';
export type CategoriaCooperado = 'FUNDADOR' | 'EFETIVO' | 'SUPLENTE' | 'HONORARIO';

export interface CooperadoHistorico {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  detalhes: string;
  ip?: string;
}

export interface CooperadoDocumento {
  id: string;
  nome: string;
  tipo: 'RG' | 'CPF' | 'CNH' | 'TITULO' | 'RESERVISTA' | 'COMPROVANTE_RESIDENCIA' | 'CONTRATO' | 'OUTROS';
  url: string;
  dataUpload: string;
  status: 'VALIDO' | 'PENDENTE' | 'EXPIRADO';
  dataValidade?: string;
}

export interface Cooperado {
  id: string;
  tenantId: string;
  matricula: string;
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  sexo: 'M' | 'F' | 'OUTRO';
  estadoCivil: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL';
  profissao: string;
  escolaridade: string;
  naturalidade: string;
  nacionalidade: string;
  situacao: SituacaoCooperado;
  dataFiliacao: string;
  categoria: CategoriaCooperado;
  fotoUrl?: string;
  assinaturaDigitalUrl?: string;

  // Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  latitude?: number;
  longitude?: number;
  pontoReferencia?: string;
  geolocalizacao?: string;

  // Contatos
  telefone: string;
  celular: string;
  whatsapp: string;
  email: string;
  contatoEmergencia: string;

  // Documentos
  documentos: CooperadoDocumento[];

  // Dados Bancários
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: 'CORRENTE' | 'POUPANCA';
  chavePix: string;

  // Histórico auditado
  historico: CooperadoHistorico[];

  // Saldos calculados
  capitalSubscrito: number;
  capitalIntegralizado: number;

  // Planilha Importada / Atributos adicionais
  dapCaf?: string;
  cafDapValidade?: string;
  aptoPaa?: boolean;
  localidadeComunidade?: string;
  nomeUsual?: string;
  aptoAVotar?: boolean;
  falecido?: boolean;
}

export type TipoTransacaoCapital = 
  | 'SUBSCRICAO' 
  | 'INTEGRALIZACAO' 
  | 'AUMENTO' 
  | 'TRANSFERENCIA' 
  | 'DEVOLUCAO' 
  | 'BAIXA' 
  | 'CORRECAO';

export type FormaPagamento = 'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'DINHEIRO' | 'DESCONTO_FOLHA';

export interface ParcelaCapital {
  id: string;
  transacaoId: string;
  cooperadoId: string;
  numeroParcela: number;
  totalParcelas: number;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
  formaPagamento?: FormaPagamento;
  reciboNum?: string;
  comprovanteUrl?: string;
}

export interface TransacaoCapital {
  id: string;
  tenantId: string;
  cooperadoId: string;
  cooperadoNome: string;
  cooperadoMatricula: string;
  tipo: TipoTransacaoCapital;
  valor: number;
  data: string;
  formaPagamento: FormaPagamento;
  numeroDocumento: string;
  status: 'CONCLUIDO' | 'PENDENTE' | 'CANCELADO';
  observacao?: string;
  anexoUrl?: string;
  usuario: string;
  cooperadoDestinoId?: string; // para transferência
  cooperadoDestinoNome?: string;
  parcelas?: ParcelaCapital[];
}

export type TipoAssembleia = 'AGO' | 'AGE' | 'REUNIAO';
export type StatusAssembleia = 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface PautaItem {
  id: string;
  titulo: string;
  descricao: string;
  encerrada: boolean;
  votosSim: number;
  votosNao: number;
  abstencoes: number;
  tipoQuorum: 'SIMPLES' | 'ABSOLUTA' | 'QUALIFICADO';
  resultado?: 'APROVADO' | 'REJEITADO' | 'EMPATE';
}

export interface ParticipanteAssembleia {
  id: string;
  assembleiaId: string;
  cooperadoId: string;
  cooperadoNome: string;
  cooperadoMatricula: string;
  dataPresenca?: string;
  tipoCheckin?: 'QRCODE' | 'MANUAL' | 'CPF' | 'BIOMETRIA';
  presente: boolean;
}

export interface Assembleia {
  id: string;
  tenantId: string;
  titulo: string;
  tipo: TipoAssembleia;
  dataHora: string;
  local: string;
  convocatoriaTexto: string;
  status: StatusAssembleia;
  quorumMinimoPercent: number;
  quorumAtingidoPercent?: number;
  pautas: PautaItem[];
  participantes: ParticipanteAssembleia[];
  ataTexto?: string;
  ataAssinadaUrl?: string;
  anexos?: string[];
}

export type CargoDiretoria = 
  | 'PRESIDENTE' 
  | 'VICE_PRESIDENTE' 
  | 'TESOUREIRO' 
  | 'SECRETARIO' 
  | 'CONSELHEIRO_ADMIN' 
  | 'CONSELHEIRO_FISCAL';

export interface MembroDiretoria {
  id: string;
  cooperadoId: string;
  cooperadoNome: string;
  cooperadoCpf: string;
  cooperadoFotoUrl?: string;
  cargo: CargoDiretoria;
  dataPosse: string;
  dataFimMandato: string;
  status: 'ATIVO' | 'CONCLUIDO' | 'AFASTADO';
  observacoes?: string;
}

export interface Mandato {
  id: string;
  tenantId: string;
  gestaoTitulo: string;
  periodoInicio: string;
  periodoFim: string;
  status: 'VIGENTE' | 'ENCERRADO' | 'FUTURO';
  membros: MembroDiretoria[];
}

export interface AuditoriaLog {
  id: string;
  tenantId: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioPerfil: UserRole;
  dataHora: string;
  modulo: 'COOPERADOS' | 'CAPITAL' | 'ASSEMBLEIAS' | 'DIRETORIA' | 'RELATORIOS' | 'CONFIGURACOES' | 'AUTH' | 'CADASTROS' | 'SISGEPA' | 'SISFIN' | 'SISCONT' | 'COMPRAS' | 'ESTOQUE' | 'RH' | 'PATRIMONIO' | 'FISCAL';
  acao: 'LOGIN' | 'LOGOUT' | 'INCLUSAO' | 'ALTERACAO' | 'EXCLUSAO' | 'EXPORTACAO' | 'VOTACAO' | 'CONVOCACAO';
  ip: string;
  detalhes: string;
  entidadeId?: string;
  antesObj?: string;
  depoisObj?: string;
}

export interface SistemaConfig {
  nomeCooperativa: string;
  cooperativaNome?: string;
  razaoSocial: string;
  cnpj: string;
  cooperativaCnpj?: string;
  emailOficial?: string;
  telefoneOficial?: string;
  enderecoSede?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };
  cotaParteValor: number;
  cotaParteMinima: number;
  correcaoAnualPercent: number;
  emailSmtpServer: string;
  emailSmtpPort: number;
  emailSmtpUser: string;
  whatsAppApiKey: string;
  whatsAppInstance: string;
  logoUrl: string;
  themeMode: 'light' | 'dark';
}

export interface SystemNotification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'ALERTA' | 'INFO' | 'SUCESSO' | 'ERRO';
  data: string;
  lida: boolean;
  linkModulo?: string;
}

export type LicenseStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED';
export type LicensePlanType = 'MENSAL' | 'ANUAL';

export interface LicenseInfo {
  status: LicenseStatus;
  trialStartDate: string;
  trialDaysTotal: number;
  licenseKey?: string;
  plan?: LicensePlanType | null;
  activatedAt?: string;
  /** Data de expiração calculada pelo servidor. Não confie no valor local. */
  expiresAt?: string;
  kiwifyCheckoutUrlMensal: string;
  kiwifyCheckoutUrlAnual: string;
}

export type WebhookEvent = 
  | 'cooperado.created'
  | 'cooperado.updated'
  | 'capital.transaction'
  | 'assembleia.created'
  | 'diretoria.updated'
  | 'gepa.oferta_created'
  | 'financeiro.pagamento'
  | 'estoque.movimentacao'
  | 'rh.folha_gerada';

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  timestamp: string;
  statusCode: number;
  success: boolean;
  responseBody: string;
}

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  secretToken: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  logs?: WebhookLog[];
}

// ==========================================
// SICOOP PLATFORM - PRODUTORES & PRODUÇÃO
// ==========================================

export interface ProdutorRural {
  id: string;
  tenantId: string;
  cooperadoId?: string;
  nome: string;
  cpfCnpj: string;
  // E-mail e CPF usados para o login no App do Produtor (portal externo).
  // Quando o produtor está vinculado a um cooperado (cooperadoId), o
  // e-mail do cooperado é usado como fonte da verdade para o login — ver
  // resolverEmailProdutor em AppProdutorView.tsx — então este campo serve
  // principalmente para produtores autocadastrados sem vínculo de cooperado.
  email?: string;
  cpf?: string;
  cafDapNum: string;
  cafDapValidade: string;
  statusDap?: string;
  nomePropriedade: string;
  areaHectares: number;
  municipio: string;
  uf: string;
  comunidade: string;
  polo?: string;
  telefone: string;
  certificacaoOrganica: boolean;
  situacao: 'ATIVO' | 'INATIVO';
  latitude?: number;
  longitude?: number;
  pontoReferencia?: string;
  endereco?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
}

export interface ProdutoAgro {
  id: string;
  tenantId: string;
  codigo: string;
  nome: string;
  categoria: 'HORTIFRUTI' | 'GRAOS' | 'LATICINIOS' | 'PROCESSADOS' | 'CARNES' | 'OUTROS';
  unidadeMedida: 'KG' | 'UN' | 'MACO' | 'LITRO' | 'CAIXA' | 'SACAS';
  precoReferencia: number;
  codigoNcm?: string;
  // Código do produto conforme a tabela de Grupos/Produtos da CONAB
  // (Companhia Nacional de Abastecimento), usado nas referências de preço
  // do PAA. Preenchido automaticamente a partir do nome/categoria do
  // produto ao cadastrar (ver src/utils/produtoCodigosFiscais.ts), mas pode
  // ser ajustado manualmente.
  codigoConab?: string;
  // Peso médio de uma unidade do produto, em KG — útil quando a unidade de
  // medida não é KG (ex.: "UN", "MAÇO", "CAIXA") para permitir conversões.
  pesoUnitario?: number;
  // Classifica se o produto é vendido/entregue in natura (fresco, sem
  // processamento) ou beneficiado (industrializado/processado pela
  // cooperativa ou pelo produtor: polpa, farinha, doce, queijo etc.).
  tipoProcessamento?: 'IN_NATURA' | 'BENEFICIADO';
  descricao?: string;
  estoqueMinimo?: number;
}

export interface RegistroProducaoItem {
  produtoId: string;
  produtoNome: string;
  unidadeMedida: string;
  quantidadeEstimadaKg: number;
  quantidadeColhidaKg?: number;
}

export interface RegistroProducao {
  id: string;
  tenantId: string;
  cooperadoId?: string;
  cooperadoNome?: string;
  produtorId: string;
  produtorNome: string;
  produtoId?: string;
  produtoNome?: string;
  unidadeMedida?: string;
  quantidadeEstimada?: number;
  quantidadeEstimadaKg?: number;
  quantidadeColhidaKg?: number;
  dataColheitaPrevista: string;
  dataLancamento?: string;
  safraAno: string;
  status: 'DISPONIVEL' | 'COMPROMETIDO' | 'ENTREGUE' | 'CANCELADO';
  statusAprovacao?: string;
  observacoes?: string;
  itens?: RegistroProducaoItem[];
}

export interface ProgramaGovernamental {
  id: string;
  tenantId: string;
  codigo: string;
  nome: string;
  tipo: 'PAA' | 'PAA-PMT' | 'PAA-CONAB' | 'PAA-SDA' | 'PNAE' | 'PGPM' | 'MERCADO_LIVRE' | 'OUTRO';
  orgaoFinanciador: string;
  orcamentoTotal: number;
  orcamentoExecutado: number;
  dataInicio: string;
  dataFim: string;
  status: 'EM_ANDAMENTO' | 'PLANEJADO' | 'CONCLUIDO';
  limitePorProdutorAno: number;
}

// ==========================================
// SISGEPA - PAA / PNAE
// ==========================================

export interface ItemChamadaPublica {
  produtoId?: string;
  produtoNome: string;
  unidade: string;
  quantidadeTotal: number;
  precoMaximoUnitario: number;
  valorTotalItem?: number; // Calculado: quantidadeTotal * precoMaximoUnitario
  categoria?: string;
  especificacao?: string;
}

export interface EscolaContempladaChamada {
  id?: string;
  nomeEscola: string;
  polo?: string;
  codigoInep?: string;
  endereco?: string;
  alunosAtendidos?: number;
  responsavel?: string;
  telefone?: string;
}

export interface ChamadaPublica {
  id: string;
  tenantId: string;
  numeroEdital: string;
  orgaoComprador: string;
  programaId?: string;
  programaNome?: string;
  programa: 'PAA' | 'PNAE' | string;
  fonteRecurso?: string; // FNDE / PNAE Federal, MDS / PAA, Governo Estadual / SEDUC, Tesouro Municipal, etc.
  fonteRecursos?: string;
  escolaId?: string;
  escolaNome?: string;
  escolasIds?: string[];
  escolasNomes?: string[];
  escolasContempladas?: EscolaContempladaChamada[];
  dataAbertura: string;
  dataEncerramento: string;
  valorTotalEdital: number;
  status: 'ABERTA' | 'EM_EXECUCAO' | 'ENCERRADA';
  observacoes?: string;
  arquivoEditalNome?: string;
  itensSolicitados: ItemChamadaPublica[];
}

export interface PropostaOfertaPAA {
  id: string;
  tenantId: string;
  chamadaPublicaId: string;
  chamadaPublicaEdital?: string;
  programaId?: string;
  programaNome?: string;
  escolaId?: string;
  escolaNome?: string;
  escolasIds?: string[];
  escolasNomes?: string[];
  produtorId: string;
  produtorNome: string;
  produtoId: string;
  produtoNome: string;
  unidadeMedida?: string;
  quantidadeOfertada: number;
  quantidadeKg?: number;
  valorUnitario: number;
  precoUnitario?: number;
  valorTotal: number;
  status: 'SUBMETIDA' | 'ACEITA' | 'RECUSADA';
  dataEnvio: string;
  itens?: {
    produtoId: string;
    produtoNome: string;
    unidadeMedida?: string;
    quantidadeKg: number;
    quantidadeOfertada?: number;
    precoUnitario: number;
    valorTotal: number;
  }[];
}

export interface ParadaEntregaEscola {
  id?: string;
  ordem?: number;
  escolaId: string;
  escolaNome: string;
  endereco?: string;
  polo?: string;
  distanciaKm: number;
  quantidadeKg?: number;
  statusEntrega?: 'PENDENTE' | 'EM_TRANSITO' | 'ENTREGUE' | 'CANCELADA';
  observacoes?: string;
  recebidoPor?: string;
  dataHoraEntregaRealizada?: string;
  // Comprovante de entrega capturado pelo motorista no App do Motorista:
  // foto do momento da entrega e assinatura digital de quem recebeu.
  fotoComprovanteUrl?: string;
  assinaturaDataUrl?: string;
  itens?: {
    produtorId?: string;
    produtorNome: string;
    produtoId?: string;
    produtoNome: string;
    quantidadePrevista: number;
    quantidadeEntregue?: number;
    unidade: string;
  }[];
}

export interface ProgramacaoEntregaPAA {
  id: string;
  tenantId: string;
  chamadaPublicaId: string;
  chamadaPublicaEdital?: string;
  programaId?: string;
  programaNome?: string;
  pedidoId?: string;
  pedidoNumero?: string;
  escolaId?: string;
  escolaNome?: string;
  escolasIds?: string[];
  escolasNomes?: string[];
  escolaOrgaoDestino: string;
  localEntrega?: string;
  dataPrevista: string;
  horarioSaidaPrevisto?: string;
  motoristaNome?: string;
  motoristaTelefone?: string;
  veiculoPlaca?: string;
  veiculoModelo?: string;
  quantidadeTotalKg?: number;
  status: 'AGENDADA' | 'EM_TRANSITO' | 'ENTREGUE' | 'PARCIAL' | 'CANCELADA' | string;
  itens: {
    produtorId?: string;
    produtorNome: string;
    produtoId?: string;
    produtoNome: string;
    quantidadePrevista: number;
    quantidadeEntregue?: number;
    unidade: string;
  }[];
  assinadoDigitalmente?: boolean;

  // Parcelamento e Cronograma de Entregas Múltiplas
  numeroEntrega?: number; // Ex: 1, 2, 3...
  totalEntregas?: number; // Ex: 4
  parcelaRotulo?: string; // Ex: "Remessa 1 de 4 (25%)"
  cronogramaGrupoId?: string; // Identificador do lote/cronograma de entregas

  // Escolas / Destinos da rota (permite entregar para todas as escolas do pedido e alterar)
  paradasEntrega?: ParadaEntregaEscola[];

  // Quilometragem e Combustível
  distanciaTotalKm?: number;
  autonomiaKmL?: number; // Ex: 8.5 km/l
  consumoCombustivelLitros?: number;
  precoLitroCombustivel?: number; // Ex: 6.29 (editável)

  // Despesas da Entrega
  despesaCombustivel?: number;
  despesaDiariaMotorista?: number;
  despesaManutencao?: number;
  outrasDespesas?: number;
  totalDespesasEntrega?: number; // Soma de todas as despesas

  observacoesRota?: string;
}

export interface PrestacaoContasPAA {
  id: string;
  tenantId: string;
  numeroTermo: string;
  numeroLote?: string;
  programaId?: string;
  programaNome?: string;
  programa: 'PAA' | 'PNAE' | string;
  chamadaPublicaId?: string;
  chamadaPublicaEdital?: string;
  escolaId?: string;
  escolaNome?: string;
  pedidoId?: string;
  periodoMesAno: string;
  periodoInicio?: string;
  periodoFim?: string;
  totalKgEntregues: number;
  totalEntregueKg?: number;
  valorTotalExecutado: number;
  valorTotalRepasse?: number;
  produtoresBeneficiadosCount: number;
  produtoresIds?: string[];
  produtosIds?: string[];
  statusAprovacao: 'EM_ELABORACAO' | 'ENVIADO' | 'APROVADO_FNDE' | 'PENDENCIA' | string;
  statusAprovacaoOrgao?: string;
  nfEmitidaNum?: string;
  dataGeracao: string;
}

// ==========================================
// NOTA FISCAL ELETRÔNICA & SEFAZ CEARÁ
// ==========================================

export type ModeloNFe = 'NFE_55' | 'NFCE_65' | 'NFAE_AVULSA' | 'NFSE_SERVICOS';
export type StatusNFe = 'RASCUNHO' | 'TRANSMITINDO' | 'AUTORIZADA' | 'REJEITADA' | 'CANCELADA' | 'INUTILIZADA';
export type TipoOperacaoNFe = 'SAIDA_VENDA' | 'SAIDA_PNAE_PAA' | 'ENTRADA_COMPRA' | 'ENTRADA_PRODUTOR' | 'ENTRADA_DEVOLUCAO' | 'TRANSFERENCIA';
export type SistemaTributarioNFe = 'TRADICIONAL_ATUAL' | 'NOVO_SISTEMA_REFORMA_2026';

export interface ImpostosNovoSistema {
  cbsAliquota: number; // CBS Federal (ex: 0.9% em 2026 teste, 8.8% pleno ou 0% cesta básica)
  cbsValor: number;
  ibsAliquota: number; // IBS Estadual/Municipal (ex: 0.1% em 2026 teste, 17.7% pleno ou 0% cesta básica)
  ibsValor: number;
  isAliquota: number; // Imposto Seletivo (0% para alimentos básicos)
  isValor: number;
  creditoPresumidoAliquota?: number; // Crédito presumido para cooperativas na compra de produtor rural PF
  creditoPresumidoValor?: number;
  isencaoCestaBasica: boolean;
  regimeAtoCooperativo: boolean;
  faseTransicaoAno?: number; // 2026, 2027, 2029-2032, 2033
}

export interface NotaFiscalItem {
  id: string;
  produtoId?: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  
  // Impostos Tradicionais
  icmsAliquota?: number;
  icmsBaseCalculo?: number;
  icmsValor?: number;
  icmsCstCsosn?: string;
  pisAliquota?: number;
  pisValor?: number;
  cofinsAliquota?: number;
  cofinsValor?: number;
  funruralAliquota?: number;
  funruralValor?: number;

  // Novo Sistema Tributário (Reforma Tributária)
  cbsAliquota?: number;
  cbsValor?: number;
  ibsAliquota?: number;
  ibsValor?: number;
  isAliquota?: number;
  isValor?: number;
  creditoPresumidoValor?: number;
}

export interface NotaFiscal {
  id: string;
  tenantId: string;
  numeroNota: string;
  serie: string;
  modelo: ModeloNFe;
  tipoOperacao: TipoOperacaoNFe;
  sistemaTributario?: SistemaTributarioNFe;
  
  // Dados do Emitente (Cooperativa/Produtor)
  emitenteRazaoSocial: string;
  emitenteCnpjCpf: string;
  emitenteInscricaoEstadual: string;
  emitenteMunicipio: string;
  emitenteUf: 'CE' | string;
  emitenteEndereco?: string;
  emitenteBairro?: string;
  emitenteCep?: string;

  // Dados do Destinatário (Escola/Órgão Público/Cooperativa/Comprador)
  destinatarioNome: string;
  destinatarioCnpjCpf: string;
  destinatarioInscricaoEstadual?: string;
  destinatarioEndereco: string;
  destinatarioBairro?: string;
  destinatarioCep?: string;
  destinatarioMunicipio: string;
  destinatarioUf: string;
  destinatarioEmail?: string;
  destinatarioTelefone?: string;

  // Dados do Produtor Rural (quando aplicável: NF-e de Entrada ou origem da produção)
  produtorId?: string;
  produtorNome?: string;
  produtorCpf?: string;
  produtorCafDap?: string;
  produtorPropriedade?: string;
  produtorMunicipio?: string;
  produtorUf?: string;

  // Dados da Escola / Órgão Público (quando aplicável: NF-e de Saída PNAE/PAA)
  escolaId?: string;
  escolaNome?: string;
  escolaInep?: string;
  escolaCnpj?: string;
  escolaEnderecoCompleto?: string;
  escolaMunicipio?: string;
  escolaResponsavel?: string;

  // Datas e Valores Totais
  dataEmissao: string;
  dataSaidaEntrada?: string;
  valorProdutos: number;
  valorFrete: number;
  valorDesconto: number;
  valorIcms: number;
  valorPis?: number;
  valorCofins?: number;
  valorFunrural?: number;
  
  // Totais Reforma Tributária
  valorCbs?: number;
  valorIbs?: number;
  valorImpostoSeletivo?: number;
  valorCreditoPresumido?: number;
  
  valorTotalNota: number;

  // Itens
  itens: NotaFiscalItem[];

  // Informações Fiscais & SEFAZ Ceará
  naturezaOperacao: string;
  statusSefaz: StatusNFe;
  ambienteSefaz: 'HOMOLOGACAO' | 'PRODUCAO';
  chaveAcesso44?: string;
  protocoloAutorizacao?: string;
  dataHoraAutorizacao?: string;
  motivoStatusSefaz?: string;
  xmlUrl?: string;
  danfePdfUrl?: string;
  qrCodeSefazUrl?: string;
  observacoesFiscais?: string;
  alertaReformaTributaria?: string;

  // Vínculos com o Sistema
  prestacaoContasId?: string;
  pedidoId?: string;
  pedidoNumero?: string;
  chamadaPublicaEdital?: string;
  programaNome?: string;
  comprasOrdemId?: string;
  usuarioEmissor?: string;
}

export interface SefazCeConfig {
  ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  uf: 'CE';
  inscricaoEstadual: string;
  cnpjEmitente: string;
  razaoSocialEmitente: string;
  certificadoCadastrado: boolean;
  certificadoNomeArquivo?: string;
  certificadoDataValidade?: string;
  senhaCertificado?: string;
  tokenCscId?: string;
  tokenCscCodigo?: string;
  serieNFe: string;
  proximoNumeroNFe: number;
  serieNFCe: string;
  proximoNumeroNFCe: number;
  regimeTributario: 'SIMPLES_NACIONAL' | 'SIMPLES_EXCESSO' | 'REGIME_NORMAL';
  isencaoIcmsPnaeCeara: boolean;
}

// ==========================================
// SISCONT - CONTABILIDADE
// ==========================================

export interface PlanoContaContabil {
  id: string;
  // Opcional: contas padrão do sistema (sem tenantId) ficam visíveis para
  // todas as cooperativas; contas criadas por uma cooperativa específica
  // levam o tenantId e ficam isoladas para ela.
  tenantId?: string;
  codigo: string;
  nome: string;
  contaPaiId?: string;
  tipo: 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO' | 'RECEITA' | 'CUSTO' | 'DESPESA';
  // Natureza contábil explícita (não é sempre igual ao padrão do grupo —
  // contas "contra" como Depreciação Acumulada, Capital a Integralizar e
  // Perdas do Exercício têm natureza invertida em relação ao seu grupo).
  natureza: 'DEVEDORA' | 'CREDORA';
  nivel: number;
  tipoConta: 'SINTETICA' | 'ANALITICA';
  aceitaLancamento: boolean;
  // Identifica se a conta é usada para registrar atos cooperativos (ex.:
  // operações entre a cooperativa e seus cooperados), atos não
  // cooperativos (operações com terceiros/mercado) ou ambos.
  atoCooperativo?: 'COOPERATIVO' | 'NAO_COOPERATIVO' | 'AMBOS';
  ativo?: boolean;
  ordemExibicao?: number;
  observacao?: string;
}

export interface LancamentoContabil {
  id: string;
  tenantId: string;
  numeroLancamento: number | string;
  data: string;
  contaDebitoCodigo?: string;
  contaDebitoNome?: string;
  contaDebito?: string;
  contaCreditoCodigo?: string;
  contaCreditoNome?: string;
  contaCredito?: string;
  valor: number;
  historico: string;
  documentoRef?: string;
  moduloOrigem?: 'FINANCEIRO' | 'CAPITAL' | 'COMPRAS' | 'ESTOQUE' | 'RH' | 'SISGEPA' | 'FISCAL' | 'PATRIMONIO' | 'MANUAL';
  // Espelha a classificação Fixa/Variável da conta a pagar/receber que deu
  // origem a este lançamento — mantém o SisCont e o SisBI sincronizados com
  // a categorização feita no SisFin, sem precisar reclassificar de novo.
  classificacaoDespesa?: 'FIXA' | 'VARIAVEL';
  usuario?: string;
}

export interface ItemBalancete {
  codigoConta: string;
  nomeConta: string;
  saldoAnterior: number;
  debitos: number;
  creditos: number;
  saldoAtual: number;
  tipo: 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO' | 'RECEITA' | 'DESPESA';
}

export interface ItemPatrimonio {
  id: string;
  tenantId: string;
  codigoTombo?: string;
  tombamentoNum?: string;
  descricao: string;
  categoria?: 'VEICULO' | 'MAQUINARIO' | 'IMOVEL' | 'EQUIPAMENTO' | 'MOVEIS' | string;
  dataAquisicao: string;
  valorAquisicao: number;
  depreciacaoAcumulada: number;
  valorAtual?: number;
  localizacao?: string;
  // Vida útil em anos, usada para calcular a depreciação mensal. Se não
  // informado, usa uma taxa padrão por categoria (ex.: veículo = 5 anos).
  vidaUtilAnos?: number;
  ultimaDepreciacaoCompetencia?: string; // "MM/AAAA" do último mês já processado
}

// ==========================================
// SISFIN - FINANCEIRO
// ==========================================

export interface ContaPagarReceber {
  id: string;
  tenantId: string;
  tipo: 'PAGAR' | 'RECEBER';
  descricao: string;
  pessoaNome: string;
  categoria?: string;
  // Classificação de despesas/receitas fixas (se repetem todo mês, valor
  // estável — aluguel, salários) vs. variáveis (dependem do volume de
  // produção/vendas do mês — insumos, combustível, comissões). Usado nos
  // relatórios de fluxo de caixa e no SisBI para separar custo fixo de
  // custo variável.
  subcategoria?: string;
  classificacaoDespesa?: 'FIXA' | 'VARIAVEL';
  valor: number;
  dataEmissao?: string;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
  formaPagamento?: FormaPagamento;
  comprovanteUrl?: string;
  centroCusto?: string;
}

export interface ExtratoBancario {
  id: string;
  tenantId: string;
  bancoNome: string;
  agenciaConta: string;
  saldoInicial: number;
  saldoAtual: number;
  entradasMes: number;
  saidasMes: number;
  lancamentos?: {
    id: string;
    data: string;
    historico: string;
    tipo: 'CREDITO' | 'DEBITO';
    valor: number;
  }[];
  ultimosLancamentos?: {
    id: string;
    data: string;
    descricao: string;
    tipo: 'ENTRADA' | 'SAIDA';
    valor: number;
    conciliado: boolean;
  }[];
}

// ==========================================
// SISCOMPRAS - GESTÃO DE COMPRAS
// ==========================================

export interface SolicitacaoCompra {
  id: string;
  tenantId: string;
  numeroSolicitacao?: string;
  solicitante?: string;
  departamento?: string;
  departamentoSolicitante?: string;
  itemDescricao?: string;
  quantidade?: number;
  unidadeMedida?: string;
  prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA';
  valorEstimado?: number;
  justificativa?: string;
  dataSolicitacao: string;
  status: 'ABERTA' | 'RASCUNHO' | 'EM_COTACAO' | 'APROVADO' | 'FINALIZADO' | 'REJEITADO' | string;
  itens?: {
    estoqueItemId?: string;
    descricao: string;
    quantidade: number;
    unidade: string;
  }[];
}

export interface CotacaoCompra {
  id: string;
  tenantId: string;
  solicitacaoId: string;
  fornecedorNome: string;
  cnpj: string;
  valorTotalOfertado: number;
  prazoEntregaDias: number;
  vencedor: boolean;
  dataResposta: string;
}

export interface Fornecedor {
  id: string;
  tenantId: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  cidadeUf?: string;
  categoria?: string;
  categoriaServico?: string;
  contatoNome?: string;
  avaliacaoScore?: number;
  statusHomologacao?: string;
}

// ==========================================
// SISESTOQUE - ESTOQUE & ALMOXARIFADO
// ==========================================

export interface ItemEstoque {
  id: string;
  tenantId: string;
  codigoSku?: string;
  codigoItem?: string;
  nomeItem: string;
  categoria: string;
  unidadeMedida: string;
  quantidadeAtual: number;
  quantidadeMinima?: number;
  estoqueMinimo?: number;
  valorUnitarioMedio?: number;
  localizacaoAlmoxarifado?: string;
  localizacaoGalpao?: string;
  lotes?: {
    numeroLote: string;
    quantidade: number;
    dataValidade: string;
  }[];
}

export interface MovimentacaoEstoque {
  id: string;
  tenantId: string;
  itemEstoqueId: string;
  itemNome?: string;
  tipoMovimento: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'PERDA';
  quantidade: number;
  motivo?: string;
  motivoHist?: string;
  dataHora: string;
  responsavel?: string;
  usuarioResponsavel?: string;
}

// ==========================================
// SISRH - RECURSOS HUMANOS
// ==========================================

export interface FuncionarioRH {
  id: string;
  tenantId: string;
  matricula?: string;
  nome: string;
  cpf: string;
  cargo: string;
  departamento: string;
  salarioBase: number;
  dataAdmissao: string;
  status: 'ATIVO' | 'AFASTADO' | 'FERIAS' | 'DESLIGADO';
  chavePix?: string;
}

export interface FolhaPagamento {
  id: string;
  tenantId: string;
  competencia?: string;
  competenciaMesAno?: string;
  funcionarioId?: string;
  funcionarioNome?: string;
  salarioBruto?: number;
  totalProventos?: number;
  // Descontos discriminados (calculados automaticamente a partir do
  // provento, mas editáveis manualmente caso o valor real seja diferente).
  inss?: number;
  irpf?: number;
  outrosDescontos?: number;
  // FGTS não é descontado do funcionário — é encargo do empregador (8%
  // sobre o salário), mostrado apenas de forma informativa/contábil.
  fgts?: number;
  descontosInssInrf?: number;
  totalDescontos?: number;
  proventosAdicionais?: number;
  salarioLiquido?: number;
  totalLiquido?: number;
  dataPagamento?: string;
  status: 'CALCULADO' | 'FECHADA' | 'PAGO' | 'PENDENTE';
}

// ==========================================
// PORTAL ESCOLA & APP MOTORISTA
// ==========================================

export interface EscolaPnae {
  id: string;
  tenantId: string;
  nomeEscola: string;
  inepCodigo?: string;
  localDeEntrega?: string;
  cnae?: string;
  razaoSocial?: string;
  cnpj?: string;
  logradouroNum?: string;
  localidade?: string;
  alunosAtendidos: number;
  polo?: string;
  representante?: string;
  tipo?: string;
  cpf?: string;
  rg?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  diretorResponsavel?: string;
  endereco?: string;
  cep?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
  pontoReferencia?: string;
}

export interface Motorista {
  id: string;
  tenantId: string;
  nome: string;
  email: string;
  telefone?: string;
  veiculoPadrao?: string;
  ativo?: boolean;
}

export interface EntregaEscolaPnae {
  id: string;
  tenantId: string;
  escolaId: string;
  escolaNome: string;
  escolaEmail?: string;
  pedidoId?: string;
  pedidoNumero?: string;
  dataHoraEntrega: string;
  motoristaNome: string;
  placaVeiculo: string;
  statusConfirmacao: 'RECEBIDO_OK' | 'RECEBIDO_COM_RESTRICAO' | 'PENDENTE';
  assinadoPor: string;
  assinaturaUrl?: string;
  fotoComprovanteUrl?: string;
  itensRecebidos: {
    produto: string;
    qtdEsperada: number;
    qtdRecebida: number;
  }[];
  observacaoRestricao?: string;
  // Avaliação de qualidade dos produtos entregues, feita pela entidade
  // recebedora (escola) no momento da conferência.
  avaliacaoQualidade?: {
    aparenciaVisual: number; // 1 a 5
    qualidadeGeral: number; // 1 a 5
    quantidadeCorreta: boolean;
    higieneEmbalagem: number; // 1 a 5
    pontualidadeEntrega: number; // 1 a 5
    notaMedia: number; // calculada a partir dos critérios acima
    comentarios?: string;
  };
}

export interface RomaneioMotorista {
  id: string;
  tenantId: string;
  numeroRomaneio: string;
  motoristaId?: string;
  motoristaNome: string;
  motoristaEmail?: string;
  veiculoPlaca: string;
  rotaNome: string;
  statusRota: 'PENDENTE' | 'COLETANDO' | 'EM_TRANSITO' | 'ENTREGUE';
  totalCargaKg: number;
  paradas: {
    pontoId: string;
    nomeLocal: string;
    tipoPonto: string;
    concluido: boolean;
  }[];
}

// ==========================================
// PEDIDO DE PRODUTOS AOS PRODUTORES (SISGEPA)
// ==========================================

export interface ItemPedidoProdutor {
  produtorId: string;
  produtorNome: string;
  produtoId: string;
  produtoNome: string;
  unidadeMedida: string;
  quantidadeOfertada: number;
  quantidadePedida: number;
  precoUnitario: number;
  valorTotalItem: number;
  polo?: string;
  escolaId?: string;
  escolaNome?: string;
  localEntrega?: string;
  escolasIds?: string[];
  escolasNomes?: string[];
}

export interface PedidoProdutorPAA {
  id: string;
  tenantId: string;
  numeroPedido: string;
  programaId?: string;
  programaNome?: string;
  programa: string; // 'PAA' | 'PNAE' | 'MERCADO_LIVRE' etc
  chamadaPublicaId: string;
  chamadaPublicaEdital: string;
  escolaId?: string;
  escolaNome?: string;
  escolasIds?: string[];
  escolasNomes?: string[];
  fonteRecursos: string; // FNDE, MDS, Tesouro Estadual, etc
  dataPedido: string;
  dataPrevistaEntrega: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'RECEBIDO' | 'CANCELADO';
  produtoresParticipantes: string[];
  itens: ItemPedidoProdutor[];
  valorTotalPedido: number;
  observacoes?: string;
  qtdeEntregas?: number;
  cronogramaEntregas?: Array<{
    numero: number;
    rotulo: string;
    dataPrevista: string;
    horarioSaida?: string;
    percentual: number;
    quantidadeKg: number;
    valorPrevisto?: number;
    observacao?: string;
    // Marca se o usuário editou manualmente a quantidade/valor desta
    // parcela na tabela. Só quando isso for true a Divisão Automática deixa
    // de recalcular a parcela ao mudar a quantidade de entregas — sem essa
    // marcação explícita, valores antigos de uma divisão anterior (ex.: de
    // quando eram 2 entregas) ficavam "grudados" mesmo depois de mudar para
    // 4 entregas, em vez de recalcular para a nova divisão igualitária.
    quantidadeManual?: boolean;
    valorManual?: boolean;
    // Marca se esta parcela/remessa já foi efetivamente entregue. Usado
    // para atualizar automaticamente o status geral do pedido conforme as
    // entregas vão acontecendo (PENDENTE → CONFIRMADO → RECEBIDO).
    entregueConfirmada?: boolean;
    dataConfirmacaoEntrega?: string;
  }>;
  // Retenção de FUNRURAL (contribuição previdenciária rural) sobre o valor
  // pago aos produtores. Quando ativa, o valor retido é automaticamente
  // lançado como conta a pagar no módulo financeiro (SisFin).
  funruralAtivo?: boolean;
  funruralAliquota?: number; // percentual, ex.: 1.5 = 1,5%
  funruralValorTotal?: number;
  funruralContaPagarId?: string;
  // Taxa administrativa da cooperativa retida do produtor sobre o valor do
  // pedido (custeio da gestão do PAA/PNAE pela cooperativa). Quando ativa,
  // o valor é lançado automaticamente como conta a RECEBER no SisFin —
  // diferente do FUNRURAL, que é repassado ao governo, a taxa
  // administrativa é receita própria da cooperativa.
  taxaAdministrativaAtiva?: boolean;
  taxaAdministrativaPercentual?: number;
  taxaAdministrativaValorTotal?: number;
  taxaAdministrativaContaReceberId?: string;
}

// ==========================================
// ORDEM DE COMPRA (SISCOMPRAS)
// ==========================================

export interface OrdemCompra {
  id: string;
  tenantId: string;
  numeroOrdem: string;
  solicitacaoId?: string;
  fornecedorId: string;
  fornecedorNome: string;
  dataEmissao: string;
  dataPrevisaoEntrega: string;
  valorTotal: number;
  status: 'EM_ABERTO' | 'APROVADA' | 'ENTREGUE' | 'CANCELADA';
  itens: {
    estoqueItemId?: string;
    descricao: string;
    quantidade: number;
    unidade: string;
    precoUnitario: number;
    subtotal: number;
  }[];
  condicaoPagamento: string;
  observacoes?: string;
}
