import { 
  Cooperado, 
  TransacaoCapital, 
  Assembleia, 
  Mandato, 
  AuditoriaLog, 
  SistemaConfig, 
  CooperativeTenant, 
  User, 
  WebhookEndpoint,
  ProdutorRural,
  ProdutoAgro,
  RegistroProducao,
  ProgramaGovernamental,
  ChamadaPublica,
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
  OrdemCompra
} from '../types';


export const INITIAL_TENANTS: CooperativeTenant[] = [
  {
    id: 'coop-01',
    name: 'Cooperai',
    razaoSocial: 'Cooperativa Interativa Agro & Soluções Cooperai Ltda.',
    cnpj: '06.591.085/0001-06',
    logoUrl: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&auto=format&fit=crop&q=80',
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
    telefone: '(11) 3456-7890',
    email: 'contato@cooperai.coop.br',
    cotaParteValor: 100.00,
    cotaParteMinima: 10,
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-01',
    name: 'Roberto Andrade Silva',
    email: 'admin@siscoope.com.br',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    tenantId: 'coop-01',
    active: true,
    lastLogin: '2026-08-02 08:30',
  },
  {
    id: 'usr-02',
    name: 'Mariana Costa Ferreira',
    email: 'financeiro@siscoope.com.br',
    role: 'FINANCEIRO',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    tenantId: 'coop-01',
    active: true,
    lastLogin: '2026-08-01 16:45',
  },
  {
    id: 'usr-03',
    name: 'Carlos Eduardo Santos',
    email: 'secretaria@siscoope.com.br',
    role: 'SECRETARIA',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    tenantId: 'coop-01',
    active: true,
    lastLogin: '2026-08-02 07:15',
  },
  {
    id: 'usr-04',
    name: 'Juliana Paes de Oliveira',
    email: 'gerente@siscoope.com.br',
    role: 'GERENTE',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    tenantId: 'coop-01',
    active: true,
    lastLogin: '2026-07-31 11:20',
  },
  {
    id: 'usr-05',
    name: 'Dr. Fernando Mello',
    email: 'auditoria@siscoope.com.br',
    role: 'AUDITORIA',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    tenantId: 'coop-01',
    active: true,
    lastLogin: '2026-07-28 14:00',
  }
];

export const INITIAL_COOPERADOS: Cooperado[] = [];

export const INITIAL_TRANSACAO_CAPITAL: TransacaoCapital[] = [
  {
    id: 'cap-001',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1001',
    cooperadoNome: 'João Batista de Oliveira',
    cooperadoMatricula: 'COOP-0001',
    tipo: 'SUBSCRICAO',
    valor: 25000.00,
    data: '2018-03-15',
    formaPagamento: 'TRANSFERENCIA',
    numeroDocumento: 'SUB-2018/001',
    status: 'CONCLUIDO',
    observacao: 'Subscrição inicial no ato da constituição da cooperativa',
    usuario: 'Roberto Andrade'
  },
  {
    id: 'cap-002',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1001',
    cooperadoNome: 'João Batista de Oliveira',
    cooperadoMatricula: 'COOP-0001',
    tipo: 'INTEGRALIZACAO',
    valor: 25000.00,
    data: '2018-03-15',
    formaPagamento: 'PIX',
    numeroDocumento: 'REC-2018/001',
    status: 'CONCLUIDO',
    observacao: 'Quitação total das cotas-partes subscritas',
    usuario: 'Roberto Andrade'
  },
  {
    id: 'cap-003',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1002',
    cooperadoNome: 'Maria Helena Siqueira',
    cooperadoMatricula: 'COOP-0002',
    tipo: 'SUBSCRICAO',
    valor: 15000.00,
    data: '2019-06-20',
    formaPagamento: 'BOLETO',
    numeroDocumento: 'SUB-2019/042',
    status: 'CONCLUIDO',
    observacao: 'Subscrição de 150 cotas-partes',
    usuario: 'Mariana Costa'
  },
  {
    id: 'cap-004',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1002',
    cooperadoNome: 'Maria Helena Siqueira',
    cooperadoMatricula: 'COOP-0002',
    tipo: 'INTEGRALIZACAO',
    valor: 12000.00,
    data: '2026-07-10',
    formaPagamento: 'PIX',
    numeroDocumento: 'REC-2026/102',
    status: 'CONCLUIDO',
    observacao: 'Integralização parcial via PIX',
    usuario: 'Mariana Costa',
    parcelas: [
      { id: 'p1', transacaoId: 'cap-004', cooperadoId: 'cop-1002', numeroParcela: 1, totalParcelas: 3, valor: 4000.00, dataVencimento: '2026-05-10', dataPagamento: '2026-05-09', status: 'PAGO', formaPagamento: 'PIX', reciboNum: 'REC-101' },
      { id: 'p2', transacaoId: 'cap-004', cooperadoId: 'cop-1002', numeroParcela: 2, totalParcelas: 3, valor: 4000.00, dataVencimento: '2026-06-10', dataPagamento: '2026-06-10', status: 'PAGO', formaPagamento: 'PIX', reciboNum: 'REC-102' },
      { id: 'p3', transacaoId: 'cap-004', cooperadoId: 'cop-1002', numeroParcela: 3, totalParcelas: 3, valor: 4000.00, dataVencimento: '2026-07-10', dataPagamento: '2026-07-10', status: 'PAGO', formaPagamento: 'PIX', reciboNum: 'REC-103' },
    ]
  },
  {
    id: 'cap-005',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1004',
    cooperadoNome: 'Fernanda Lima Rocha',
    cooperadoMatricula: 'COOP-0004',
    tipo: 'INTEGRALIZACAO',
    valor: 2000.00,
    data: '2026-08-01',
    formaPagamento: 'DESCONTO_FOLHA',
    numeroDocumento: 'PARC-2026/08',
    status: 'PENDENTE',
    observacao: 'Parcela em aberto - Vencimento 15/08/2026',
    usuario: 'Mariana Costa',
    parcelas: [
      { id: 'p4', transacaoId: 'cap-005', cooperadoId: 'cop-1004', numeroParcela: 1, totalParcelas: 2, valor: 1000.00, dataVencimento: '2026-08-15', status: 'PENDENTE' },
      { id: 'p5', transacaoId: 'cap-005', cooperadoId: 'cop-1004', numeroParcela: 2, totalParcelas: 2, valor: 1000.00, dataVencimento: '2026-09-15', status: 'PENDENTE' },
    ]
  }
];

export const INITIAL_ASSEMBLEIAS: Assembleia[] = [
  {
    id: 'ass-2026-01',
    tenantId: 'coop-01',
    titulo: '6ª Assembleia Geral Ordinária (AGO 2026)',
    tipo: 'AGO',
    dataHora: '2026-08-20T19:00',
    local: 'Auditório Central CoopBrasil - Araraquara/SP',
    convocatoriaTexto: 'Ficam convocados os Senhores Cooperados da CoopBrasil para a 6ª AGO a ser realizada em 20 de Agosto de 2026 para deliberar sobre a Aprovação de Contas e Eleição da Nova Diretoria.',
    status: 'AGENDADA',
    quorumMinimoPercent: 50,
    pautas: [
      { id: 'pt-1', titulo: 'Aprovação do Balanço Patrimonial e Demonstração do Exercício', descricao: 'Apreciação do relatório da diretoria, parecer do conselho fiscal e demonstração de sobras ou perdas.', encerrada: false, votosSim: 0, votosNao: 0, abstencoes: 0, tipoQuorum: 'SIMPLES' },
      { id: 'pt-2', titulo: 'Destinação das Sobras Líquidas apuradas', descricao: 'Proposta de retenção em Fundo de Reserva e distribuição proporcional aos cooperados.', encerrada: false, votosSim: 0, votosNao: 0, abstencoes: 0, tipoQuorum: 'SIMPLES' },
      { id: 'pt-3', titulo: 'Fixação do valor dos Honorários da Diretoria e Cédula de Presença', descricao: 'Definição dos pro-labore do Presidente, Vice e Conselheiros.', encerrada: false, votosSim: 0, votosNao: 0, abstencoes: 0, tipoQuorum: 'ABSOLUTA' },
    ],
    participantes: [
      { id: 'par-1', assembleiaId: 'ass-2026-01', cooperadoId: 'cop-1001', cooperadoNome: 'João Batista de Oliveira', cooperadoMatricula: 'COOP-0001', presente: true, tipoCheckin: 'QRCODE', dataPresenca: '2026-08-20 18:45' },
      { id: 'par-2', assembleiaId: 'ass-2026-01', cooperadoId: 'cop-1002', cooperadoNome: 'Maria Helena Siqueira', cooperadoMatricula: 'COOP-0002', presente: true, tipoCheckin: 'CPF', dataPresenca: '2026-08-20 18:50' },
      { id: 'par-3', assembleiaId: 'ass-2026-01', cooperadoId: 'cop-1003', cooperadoNome: 'Carlos Alberto Mendes', cooperadoMatricula: 'COOP-0003', presente: false },
      { id: 'par-4', assembleiaId: 'ass-2026-01', cooperadoId: 'cop-1004', cooperadoNome: 'Fernanda Lima Rocha', cooperadoMatricula: 'COOP-0004', presente: false },
      { id: 'par-5', assembleiaId: 'ass-2026-01', cooperadoId: 'cop-1005', cooperadoNome: 'Gerson Fonseca Martins', cooperadoMatricula: 'COOP-0005', presente: true, tipoCheckin: 'MANUAL', dataPresenca: '2026-08-20 18:55' },
    ],
    ataTexto: 'Aos vinte dias do mês de agosto do ano de dois mil e vinte e seis, reuniram-se ordinariamente os cooperados em primeira convocação...'
  },
  {
    id: 'ass-2025-02',
    tenantId: 'coop-01',
    titulo: 'Assembleia Geral Extraordinária - Reforma do Estatuto (AGE)',
    tipo: 'AGE',
    dataHora: '2025-11-15T14:00',
    local: 'Centro de Convenções Sindicato Rural',
    convocatoriaTexto: 'Convocação para alteração estatutária para adequação às novas normas do Banco Central.',
    status: 'CONCLUIDA',
    quorumMinimoPercent: 66,
    quorumAtingidoPercent: 83.3,
    pautas: [
      { id: 'pt-201', titulo: 'Adequação Estatutária do Artigo 14 (Condições de Admissão)', descricao: 'Atualização do capital mínimo exigido para novos aderentes', encerrada: true, votosSim: 18, votosNao: 2, abstencoes: 1, tipoQuorum: 'QUALIFICADO', resultado: 'APROVADO' }
    ],
    participantes: [],
    ataTexto: 'Aos quinze dias de novembro de 2025 realizada AGE com quórum qualificado, sendo aprovada a alteração por unanimidade...'
  }
];

export const INITIAL_MANDATOS: Mandato[] = [
  {
    id: 'mand-2024-2026',
    tenantId: 'coop-01',
    gestaoTitulo: 'Gestão Inovação & União (2024-2026)',
    periodoInicio: '2024-04-01',
    periodoFim: '2026-09-30', // Vence em breve! Triggering warning alert
    status: 'VIGENTE',
    membros: [
      { id: 'm1', cooperadoId: 'cop-1001', cooperadoNome: 'João Batista de Oliveira', cooperadoCpf: '123.456.789-00', cooperadoFotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', cargo: 'PRESIDENTE', dataPosse: '2024-04-01', dataFimMandato: '2026-09-30', status: 'ATIVO' },
      { id: 'm2', cooperadoId: 'cop-1002', cooperadoNome: 'Maria Helena Siqueira', cooperadoCpf: '234.567.890-11', cooperadoFotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', cargo: 'VICE_PRESIDENTE', dataPosse: '2024-04-01', dataFimMandato: '2026-09-30', status: 'ATIVO' },
      { id: 'm3', cooperadoId: 'cop-1003', cooperadoNome: 'Carlos Alberto Mendes', cooperadoCpf: '345.678.901-22', cooperadoFotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', cargo: 'TESOUREIRO', dataPosse: '2024-04-01', dataFimMandato: '2026-09-30', status: 'ATIVO' },
      { id: 'm4', cooperadoId: 'cop-1004', cooperadoNome: 'Fernanda Lima Rocha', cooperadoCpf: '456.789.012-33', cooperadoFotoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', cargo: 'SECRETARIO', dataPosse: '2024-04-01', dataFimMandato: '2026-09-30', status: 'ATIVO' },
      { id: 'm5', cooperadoId: 'cop-1005', cooperadoNome: 'Gerson Fonseca Martins', cooperadoCpf: '567.890.123-44', cooperadoFotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', cargo: 'CONSELHEIRO_FISCAL', dataPosse: '2024-04-01', dataFimMandato: '2026-09-30', status: 'ATIVO' },
    ]
  }
];

export const INITIAL_AUDITORIA_LOGS: AuditoriaLog[] = [
  {
    id: 'aud-001',
    tenantId: 'coop-01',
    usuarioId: 'usr-01',
    usuarioNome: 'Roberto Andrade Silva',
    usuarioPerfil: 'ADMIN',
    dataHora: '2026-08-02 08:30:12',
    modulo: 'AUTH',
    acao: 'LOGIN',
    ip: '187.56.12.90',
    detalhes: 'Autenticação com sucesso no SisCoope Web Admin'
  },
  {
    id: 'aud-002',
    tenantId: 'coop-01',
    usuarioId: 'usr-02',
    usuarioNome: 'Mariana Costa Ferreira',
    usuarioPerfil: 'FINANCEIRO',
    dataHora: '2026-08-01 16:45:00',
    modulo: 'CAPITAL',
    acao: 'INCLUSAO',
    ip: '187.56.12.91',
    detalhes: 'Lançamento de Integralização de Capital R$ 12.000,00 para Maria Helena Siqueira (COOP-0002)'
  },
  {
    id: 'aud-003',
    tenantId: 'coop-01',
    usuarioId: 'usr-03',
    usuarioNome: 'Carlos Eduardo Santos',
    usuarioPerfil: 'SECRETARIA',
    dataHora: '2026-08-02 07:15:30',
    modulo: 'ASSEMBLEIAS',
    acao: 'CONVOCACAO',
    ip: '187.56.12.95',
    detalhes: 'Disparo de convocações por WhatsApp e E-mail para a 6ª AGO 2026'
  }
];

export const INITIAL_CONFIG: SistemaConfig = {
  nomeCooperativa: 'Cooperai',
  cooperativaNome: 'Cooperai',
  razaoSocial: 'Cooperativa Interativa Agro & Soluções Cooperai Ltda.',
  cnpj: '06.591.085/0001-06',
  cooperativaCnpj: '06.591.085/0001-06',
  emailOficial: 'contato@cooperai.coop.br',
  telefoneOficial: '(11) 3456-7890',
  enderecoSede: {
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP'
  },
  cotaParteValor: 100.00,
  cotaParteMinima: 10,
  correcaoAnualPercent: 4.5,
  emailSmtpServer: 'smtp.cooperai.coop.br',
  emailSmtpPort: 587,
  emailSmtpUser: 'notificacoes@cooperai.coop.br',
  whatsAppApiKey: 'WAPI-8923-SECURE-KEY-SISCOOPE',
  whatsAppInstance: 'cooperai_prod',
  logoUrl: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&auto=format&fit=crop&q=80',
  themeMode: 'light'
};

export const INITIAL_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: 'wh-001',
    tenantId: 'coop-01',
    name: 'Integrador ERP Contábil',
    url: 'https://api.erpcontabil.com.br/v1/webhooks/siscoope',
    secretToken: 'whsec_7893abc981234567890def',
    events: ['cooperado.created', 'capital.transaction'],
    active: true,
    createdAt: '2026-06-15 10:30:00',
    lastTriggeredAt: '2026-08-01 16:45:12',
    logs: [
      {
        id: 'log-101',
        webhookId: 'wh-001',
        event: 'capital.transaction',
        timestamp: '2026-08-01 16:45:12',
        statusCode: 200,
        success: true,
        responseBody: '{"status": "received", "transaction_id": "cap-2002"}'
      },
      {
        id: 'log-100',
        webhookId: 'wh-001',
        event: 'cooperado.created',
        timestamp: '2026-07-28 11:20:05',
        statusCode: 200,
        success: true,
        responseBody: '{"status": "ok", "member_id": "cop-1003"}'
      }
    ]
  },
  {
    id: 'wh-002',
    tenantId: 'coop-01',
    name: 'Notificador Discord / Slack Diretoria',
    url: 'https://discord.com/api/webhooks/123456789/siscoope-events',
    secretToken: 'whsec_discord_key_998123',
    events: ['assembleia.created', 'diretoria.updated'],
    active: true,
    createdAt: '2026-07-01 14:00:00',
    lastTriggeredAt: '2026-07-29 09:15:00',
    logs: [
      {
        id: 'log-102',
        webhookId: 'wh-002',
        event: 'assembleia.created',
        timestamp: '2026-07-29 09:15:00',
        statusCode: 204,
        success: true,
        responseBody: 'No Content (HTTP 204 Success)'
      }
    ]
  }
];

// ==========================================
// INITIAL DATASETS - SICOOP PLATFORM
// ==========================================

export const INITIAL_PRODUTORES: ProdutorRural[] = [
  {
    id: 'prod-01',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1001',
    nome: 'João Batista de Oliveira',
    cpfCnpj: '123.456.789-00',
    cafDapNum: 'CAF-8829102-SP',
    cafDapValidade: '2028-12-31',
    statusDap: 'ATIVO',
    nomePropriedade: 'Sítio Boa Vista',
    areaHectares: 14.5,
    municipio: 'Campinas',
    uf: 'SP',
    comunidade: 'Distrito de Barão Geraldo',
    telefone: '(19) 99876-5432',
    certificacaoOrganica: true,
    situacao: 'ATIVO'
  },
  {
    id: 'prod-02',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1002',
    nome: 'Maria Aparecida Santos',
    cpfCnpj: '987.654.321-11',
    cafDapNum: 'DAP-B-9982310-CE',
    cafDapValidade: '2027-10-15',
    statusDap: 'ATIVO',
    nomePropriedade: 'Fazenda Terra Santa',
    areaHectares: 28.0,
    municipio: 'Trairi',
    uf: 'CE',
    comunidade: 'Gualdrapas',
    telefone: '(85) 98888-1122',
    certificacaoOrganica: true,
    situacao: 'ATIVO'
  },
  {
    id: 'prod-03',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1003',
    nome: 'Antônio Carlos da Silva',
    cpfCnpj: '456.789.123-22',
    cafDapNum: 'CAF-1029384-CE',
    cafDapValidade: '2026-11-20',
    statusDap: 'ATIVO',
    nomePropriedade: 'Chácara Voo das Garças',
    areaHectares: 8.2,
    municipio: 'Trairi',
    uf: 'CE',
    comunidade: 'Flecheiras',
    telefone: '(85) 99123-4567',
    certificacaoOrganica: false,
    situacao: 'ATIVO'
  },
  {
    id: 'prod-04',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1004',
    nome: 'Francisco José de Sousa',
    cpfCnpj: '234.567.890-33',
    cafDapNum: 'CAF-7718293-CE',
    cafDapValidade: '2026-08-28',
    statusDap: 'ATIVO',
    nomePropriedade: 'Sítio Riacho Doce',
    areaHectares: 11.0,
    municipio: 'Trairi',
    uf: 'CE',
    comunidade: 'Córrego Fundo',
    telefone: '(85) 99777-2233',
    certificacaoOrganica: true,
    situacao: 'ATIVO'
  },
  {
    id: 'prod-05',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1005',
    nome: 'Raimundo Nonato do Nascimento',
    cpfCnpj: '345.678.901-44',
    cafDapNum: 'DAP-B-449102-CE',
    cafDapValidade: '2026-09-05',
    statusDap: 'ATIVO',
    nomePropriedade: 'Fazenda Mangabeiras',
    areaHectares: 18.5,
    municipio: 'Trairi',
    uf: 'CE',
    comunidade: 'Canaã',
    telefone: '(85) 99888-5566',
    certificacaoOrganica: false,
    situacao: 'ATIVO'
  },
  {
    id: 'prod-06',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1006',
    nome: 'Severina Maria da Conceição',
    cpfCnpj: '567.890.123-55',
    cafDapNum: 'CAF-1029481-CE',
    cafDapValidade: '2026-08-01',
    statusDap: 'EXPIRADA',
    nomePropriedade: 'Sítio Primavera',
    areaHectares: 6.0,
    municipio: 'Trairi',
    uf: 'CE',
    comunidade: 'Sede',
    telefone: '(85) 99666-4411',
    certificacaoOrganica: true,
    situacao: 'INATIVO'
  }
];

export const INITIAL_PRODUTOS: ProdutoAgro[] = [
  {
    id: 'pdt-01',
    tenantId: 'coop-01',
    codigo: 'PNAE-001',
    nome: 'Mandioca In Natura Organica',
    categoria: 'HORTIFRUTI',
    unidadeMedida: 'KG',
    precoReferencia: 4.80,
    codigoNcm: '0714.10.00',
    descricao: 'Mandioca mesa descascada e embalada a vácuo',
    estoqueMinimo: 500
  },
  {
    id: 'pdt-02',
    tenantId: 'coop-01',
    codigo: 'PNAE-002',
    nome: 'Banana Prata Agroecológica',
    categoria: 'HORTIFRUTI',
    unidadeMedida: 'KG',
    precoReferencia: 5.20,
    codigoNcm: '0803.90.00',
    descricao: 'Banana de primeira qualidade para merenda escolar',
    estoqueMinimo: 800
  },
  {
    id: 'pdt-03',
    tenantId: 'coop-01',
    codigo: 'PAA-003',
    nome: 'Polpa de Acerola Congelada',
    categoria: 'PROCESSADOS',
    unidadeMedida: 'KG',
    precoReferencia: 12.50,
    codigoNcm: '2008.99.00',
    descricao: 'Polpa de fruta pura sem conservantes 1kg',
    estoqueMinimo: 300
  },
  {
    id: 'pdt-04',
    tenantId: 'coop-01',
    codigo: 'PAA-004',
    nome: 'Mel de Abelha Silvestre 500g',
    categoria: 'PROCESSADOS',
    unidadeMedida: 'UN',
    precoReferencia: 22.00,
    codigoNcm: '0409.00.00',
    descricao: 'Mel puro com inspeção sanitária SIE/SPO',
    estoqueMinimo: 100
  },
  {
    id: 'pdt-05',
    tenantId: 'coop-01',
    codigo: 'PROD-005',
    nome: 'Feijão Caupi Macassar',
    categoria: 'GRAOS',
    unidadeMedida: 'KG',
    precoReferencia: 8.50,
    codigoNcm: '0713.35.00',
    descricao: 'Feijão de corda novo beneficiado e ensacado',
    estoqueMinimo: 1000
  }
];

export const INITIAL_REGISTROS_PRODUCAO: RegistroProducao[] = [
  {
    id: 'reg-01',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1001',
    cooperadoNome: 'João Batista de Oliveira',
    produtorId: 'prod-01',
    produtorNome: 'João Batista de Oliveira',
    produtoId: 'pdt-01',
    produtoNome: 'Mandioca In Natura Organica',
    unidadeMedida: 'KG',
    quantidadeEstimada: 2500,
    quantidadeEstimadaKg: 2500,
    quantidadeColhidaKg: 2100,
    dataColheitaPrevista: '2026-08-15',
    dataLancamento: '2026-08-01',
    statusAprovacao: 'APROVADO',
    safraAno: '2026/1',
    status: 'COMPROMETIDO',
    observacoes: 'Destinado ao edital PNAE Trairi Chamada 01/2026'
  },
  {
    id: 'reg-02',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1002',
    cooperadoNome: 'Maria Helena Siqueira',
    produtorId: 'prod-02',
    produtorNome: 'Maria Aparecida Santos',
    produtoId: 'pdt-02',
    produtoNome: 'Banana Prata Agroecológica',
    unidadeMedida: 'KG',
    quantidadeEstimada: 4000,
    quantidadeEstimadaKg: 4000,
    quantidadeColhidaKg: 3800,
    dataColheitaPrevista: '2026-08-20',
    dataLancamento: '2026-08-02',
    statusAprovacao: 'APROVADO',
    safraAno: '2026/1',
    status: 'DISPONIVEL',
    observacoes: 'Produção irrigada de excelente padrão'
  },
  {
    id: 'reg-03',
    tenantId: 'coop-01',
    cooperadoId: 'cop-1003',
    cooperadoNome: 'Carlos Alberto Mendes',
    produtorId: 'prod-03',
    produtorNome: 'Antônio Carlos da Silva',
    produtoId: 'pdt-03',
    produtoNome: 'Polpa de Acerola Congelada',
    unidadeMedida: 'KG',
    quantidadeEstimada: 1200,
    quantidadeEstimadaKg: 1200,
    quantidadeColhidaKg: 1200,
    dataColheitaPrevista: '2026-07-28',
    dataLancamento: '2026-07-25',
    statusAprovacao: 'APROVADO',
    safraAno: '2026/1',
    status: 'ENTREGUE',
    observacoes: 'Entregue no galpão central'
  }
];

export const INITIAL_PROGRAMAS: ProgramaGovernamental[] = [
  {
    id: 'prg-01',
    tenantId: 'coop-01',
    codigo: 'PAA-DS-2026',
    nome: 'PAA - Doação Simultânea MDS',
    tipo: 'PAA',
    orgaoFinanciador: 'Ministério do Desenvolvimento e Assistência Social',
    orcamentoTotal: 450000.00,
    orcamentoExecutado: 185000.00,
    dataInicio: '2026-01-01',
    dataFim: '2026-12-31',
    status: 'EM_ANDAMENTO',
    limitePorProdutorAno: 15000.00
  },
  {
    id: 'prg-02',
    tenantId: 'coop-01',
    codigo: 'PNAE-MUN-2026',
    nome: 'PNAE - Programa Nacional de Alimentação Escolar',
    tipo: 'PNAE',
    orgaoFinanciador: 'FNDE / Secretaria Municipal de Educação',
    orcamentoTotal: 680000.00,
    orcamentoExecutado: 320000.00,
    dataInicio: '2026-02-01',
    dataFim: '2026-12-15',
    status: 'EM_ANDAMENTO',
    limitePorProdutorAno: 40000.00
  },
  {
    id: 'prg-03',
    tenantId: 'coop-01',
    codigo: 'PAA-CONAB-2026',
    nome: 'PAA - Modalidade CONAB',
    tipo: 'PAA-CONAB',
    orgaoFinanciador: 'CONAB - Companhia Nacional de Abastecimento',
    orcamentoTotal: 300000.00,
    orcamentoExecutado: 0,
    dataInicio: '2026-01-01',
    dataFim: '2026-12-31',
    status: 'EM_ANDAMENTO',
    limitePorProdutorAno: 15000.00
  },
  {
    id: 'prg-04',
    tenantId: 'coop-01',
    codigo: 'PAA-SDA-2026',
    nome: 'PAA - Modalidade Governo do Estado/SDA',
    tipo: 'PAA-SDA',
    orgaoFinanciador: 'Secretaria de Desenvolvimento Agrário do Ceará',
    orcamentoTotal: 250000.00,
    orcamentoExecutado: 0,
    dataInicio: '2026-01-01',
    dataFim: '2026-12-31',
    status: 'EM_ANDAMENTO',
    limitePorProdutorAno: 15000.00
  },
  {
    id: 'prg-05',
    tenantId: 'coop-01',
    codigo: 'PAA-PMT-2026',
    nome: 'PAA-PMT - Programa Municipal de Alimentação Escolar',
    tipo: 'PAA-PMT',
    orgaoFinanciador: 'Prefeitura Municipal de Trairi',
    orcamentoTotal: 200000.00,
    orcamentoExecutado: 0,
    dataInicio: '2026-01-01',
    dataFim: '2026-12-31',
    status: 'EM_ANDAMENTO',
    limitePorProdutorAno: 12000.00
  }
];

export const INITIAL_CHAMADAS_PUBLICAS: ChamadaPublica[] = [
  {
    id: 'chm-01',
    tenantId: 'coop-01',
    numeroEdital: 'Chamada Pública PNAE 001/2026',
    orgaoComprador: 'Secretaria Municipal de Educação de Trairi',
    programaId: 'prg-02',
    programaNome: 'PNAE - Programa Nacional de Alimentação Escolar',
    programa: 'PNAE',
    fonteRecurso: 'FNDE / PNAE Federal',
    fonteRecursos: 'FNDE / PNAE Federal',
    escolaId: 'esc-01',
    escolaNome: 'EMEIF Francisca das Chagas - Sede',
    escolasIds: ['esc-01', 'esc-02'],
    escolasNomes: ['EMEIF Francisca das Chagas - Sede', 'EEIEF Manoel Joaquim de Santana'],
    escolasContempladas: [
      { id: 'esc-01', nomeEscola: 'EMEIF Francisca das Chagas - Sede', polo: 'Sede', codigoInep: '23091022', endereco: 'Rua Coronel José de Castro, 120 - Centro', alunosAtendidos: 650 },
      { id: 'esc-02', nomeEscola: 'EEIEF Manoel Joaquim de Santana', polo: 'Flecheiras', codigoInep: '23091045', endereco: 'Avenida Beira Mar, S/N - Flecheiras', alunosAtendidos: 420 }
    ],
    dataAbertura: '2026-07-01',
    dataEncerramento: '2026-08-30',
    valorTotalEdital: 176000.00,
    status: 'EM_EXECUCAO',
    observacoes: 'Aquisição de gêneros alimentícios da Agricultura Familiar para alimentação escolar de Trairi/CE.',
    itensSolicitados: [
      { produtoId: 'pdt-01', produtoNome: 'Mandioca In Natura Organica', unidade: 'KG', quantidadeTotal: 15000, precoMaximoUnitario: 4.80, valorTotalItem: 72000.00 },
      { produtoId: 'pdt-02', produtoNome: 'Banana Prata Agroecológica', unidade: 'KG', quantidadeTotal: 20000, precoMaximoUnitario: 5.20, valorTotalItem: 104000.00 }
    ]
  },
  {
    id: 'chm-02',
    tenantId: 'coop-01',
    numeroEdital: 'Edital PAA Conab 004/2026',
    orgaoComprador: 'MDS / Conab - Doação Simultânea',
    programaId: 'prg-01',
    programaNome: 'PAA - Doação Simultânea MDS',
    programa: 'PAA',
    fonteRecurso: 'MDS / PAA Doação Simultânea',
    fonteRecursos: 'MDS / PAA Doação Simultânea',
    escolaId: 'esc-02',
    escolaNome: 'EEIEF Manoel Joaquim de Santana',
    escolasIds: ['esc-02'],
    escolasNomes: ['EEIEF Manoel Joaquim de Santana'],
    escolasContempladas: [
      { id: 'esc-02', nomeEscola: 'EEIEF Manoel Joaquim de Santana', polo: 'Flecheiras', codigoInep: '23091045', endereco: 'Avenida Beira Mar, S/N - Flecheiras', alunosAtendidos: 420 }
    ],
    dataAbertura: '2026-06-15',
    dataEncerramento: '2026-11-30',
    valorTotalEdital: 77500.00,
    status: 'ABERTA',
    observacoes: 'Programa de Aquisição de Alimentos - Modalidade Doação Simultânea.',
    itensSolicitados: [
      { produtoId: 'pdt-03', produtoNome: 'Polpa de Acerola Congelada', unidade: 'KG', quantidadeTotal: 5000, precoMaximoUnitario: 8.50, valorTotalItem: 42500.00 },
      { produtoId: 'pdt-04', produtoNome: 'Milho Verde In Natura', unidade: 'KG', quantidadeTotal: 10000, precoMaximoUnitario: 3.50, valorTotalItem: 35000.00 }
    ]
  }
];

export const INITIAL_OFERTAS_PAA: PropostaOfertaPAA[] = [
  {
    id: 'oft-01',
    tenantId: 'coop-01',
    chamadaPublicaId: 'chm-01',
    chamadaPublicaEdital: 'Chamada Pública PNAE 001/2026',
    programaId: 'prg-02',
    programaNome: 'PNAE - Programa Nacional de Alimentação Escolar',
    escolaId: 'esc-01',
    escolaNome: 'EMEIF Francisca das Chagas - Sede',
    escolasIds: ['esc-01', 'esc-02'],
    escolasNomes: ['EMEIF Francisca das Chagas - Sede', 'EEIEF Manoel Joaquim de Santana'],
    produtorId: 'prod-01',
    produtorNome: 'João Batista de Oliveira',
    produtoId: 'pdt-01',
    produtoNome: 'Mandioca In Natura Organica',
    unidadeMedida: 'KG',
    quantidadeOfertada: 2500,
    quantidadeKg: 2500,
    valorUnitario: 4.80,
    precoUnitario: 4.80,
    valorTotal: 12000.00,
    status: 'ACEITA',
    dataEnvio: '2026-07-10',
    itens: [
      { produtoId: 'pdt-01', produtoNome: 'Mandioca In Natura Organica', unidadeMedida: 'KG', quantidadeKg: 2500, quantidadeOfertada: 2500, precoUnitario: 4.80, valorTotal: 12000.00 }
    ]
  },
  {
    id: 'oft-02',
    tenantId: 'coop-01',
    chamadaPublicaId: 'chm-01',
    chamadaPublicaEdital: 'Chamada Pública PNAE 001/2026',
    programaId: 'prg-02',
    programaNome: 'PNAE - Programa Nacional de Alimentação Escolar',
    escolaId: 'esc-02',
    escolaNome: 'EEIEF Manoel Joaquim de Santana',
    escolasIds: ['esc-01', 'esc-02'],
    escolasNomes: ['EMEIF Francisca das Chagas - Sede', 'EEIEF Manoel Joaquim de Santana'],
    produtorId: 'prod-02',
    produtorNome: 'Maria Aparecida Santos',
    produtoId: 'pdt-02',
    produtoNome: 'Banana Prata Agroecológica',
    unidadeMedida: 'KG',
    quantidadeOfertada: 4000,
    quantidadeKg: 4000,
    valorUnitario: 5.20,
    precoUnitario: 5.20,
    valorTotal: 20800.00,
    status: 'ACEITA',
    dataEnvio: '2026-07-12',
    itens: [
      { produtoId: 'pdt-02', produtoNome: 'Banana Prata Agroecológica', unidadeMedida: 'KG', quantidadeKg: 4000, quantidadeOfertada: 4000, precoUnitario: 5.20, valorTotal: 20800.00 }
    ]
  },
  {
    id: 'oft-03',
    tenantId: 'coop-01',
    chamadaPublicaId: 'chm-02',
    chamadaPublicaEdital: 'Edital PAA Conab 004/2026',
    programaId: 'prg-01',
    programaNome: 'PAA - Doação Simultânea MDS',
    escolaId: 'esc-02',
    escolaNome: 'EEIEF Manoel Joaquim de Santana',
    escolasIds: ['esc-02'],
    escolasNomes: ['EEIEF Manoel Joaquim de Santana'],
    produtorId: 'prod-03',
    produtorNome: 'Francisco Antônio dos Santos',
    produtoId: 'pdt-03',
    produtoNome: 'Polpa de Acerola Congelada',
    unidadeMedida: 'KG',
    quantidadeOfertada: 1200,
    quantidadeKg: 1200,
    valorUnitario: 8.50,
    precoUnitario: 8.50,
    valorTotal: 10200.00,
    status: 'ACEITA',
    dataEnvio: '2026-07-15',
    itens: [
      { produtoId: 'pdt-03', produtoNome: 'Polpa de Acerola Congelada', unidadeMedida: 'KG', quantidadeKg: 1200, quantidadeOfertada: 1200, precoUnitario: 8.50, valorTotal: 10200.00 }
    ]
  }
];

export const INITIAL_PROGRAMACOES_ENTREGA: ProgramacaoEntregaPAA[] = [
  {
    id: 'prog-01',
    tenantId: 'coop-01',
    chamadaPublicaId: 'chm-01',
    chamadaPublicaEdital: 'Chamada Pública PNAE 001/2026',
    programaId: 'prg-02',
    programaNome: 'PNAE - Programa Nacional de Alimentação Escolar',
    pedidoId: 'ped-prod-01',
    pedidoNumero: 'PED-PAA-2026-001',
    numeroEntrega: 1,
    totalEntregas: 2,
    parcelaRotulo: 'Entrega 1 de 2 (50%)',
    cronogramaGrupoId: 'cron-ped-001',
    escolaId: 'esc-01',
    escolaNome: 'EMEIF Francisca das Chagas - Sede, EEIEF Manoel Joaquim de Santana',
    escolasIds: ['esc-01', 'esc-02'],
    escolasNomes: ['EMEIF Francisca das Chagas - Sede', 'EEIEF Manoel Joaquim de Santana'],
    escolaOrgaoDestino: 'Escolas do Polo Sede e Litoral Flecheiras',
    localEntrega: 'Entrega direta nas Unidades Escolares Municipais',
    dataPrevista: '2026-08-05',
    horarioSaidaPrevisto: '07:30',
    motoristaNome: 'Francisco Reginaldo (Seu Chico)',
    motoristaTelefone: '(85) 99822-4411',
    veiculoPlaca: 'PMN-4A92',
    veiculoModelo: 'Mercedes-Benz Accelo 815 (Baú Refrigerado)',
    quantidadeTotalKg: 750,
    status: 'ENTREGUE',
    distanciaTotalKm: 56.0,
    autonomiaKmL: 8.0,
    consumoCombustivelLitros: 7.0,
    precoLitroCombustivel: 6.29,
    despesaCombustivel: 44.03,
    despesaDiariaMotorista: 80.00,
    despesaManutencao: 25.00,
    outrasDespesas: 15.00,
    totalDespesasEntrega: 164.03,
    observacoesRota: '1ª Quinzena - Rota cobrindo a escola sede e o anexo em Flecheiras com produtos hortifrúti.',
    paradasEntrega: [
      {
        id: 'stop-01',
        ordem: 1,
        escolaId: 'esc-01',
        escolaNome: 'EMEIF Francisca das Chagas - Sede',
        endereco: 'Rua Coronel José de Castro, 120 - Centro',
        polo: 'Sede',
        distanciaKm: 18.0,
        quantidadeKg: 350,
        statusEntrega: 'ENTREGUE',
        observacoes: 'Recebido pela Nutricionista e Coordenação da Merenda.',
        recebidoPor: 'Maria do Carmo (Nutricionista PNAE)'
      },
      {
        id: 'stop-02',
        ordem: 2,
        escolaId: 'esc-02',
        escolaNome: 'EEIEF Manoel Joaquim de Santana',
        endereco: 'Av. Beira Mar, S/N - Distrito de Flecheiras',
        polo: 'Flecheiras',
        distanciaKm: 38.0,
        quantidadeKg: 400,
        statusEntrega: 'ENTREGUE',
        observacoes: 'Recebimento conferido sem avarias.'
      }
    ],
    itens: [
      { produtorId: 'prod-01', produtorNome: 'João Batista de Oliveira', produtoId: 'pdt-01', produtoNome: 'Mandioca In Natura Organica', quantidadePrevista: 300, unidade: 'KG' },
      { produtorId: 'prod-02', produtorNome: 'Maria Aparecida Santos', produtoId: 'pdt-02', produtoNome: 'Banana Prata Agroecológica', quantidadePrevista: 450, unidade: 'KG' }
    ],
    assinadoDigitalmente: true
  },
  {
    id: 'prog-02',
    tenantId: 'coop-01',
    chamadaPublicaId: 'chm-01',
    chamadaPublicaEdital: 'Chamada Pública PNAE 001/2026',
    programaId: 'prg-02',
    programaNome: 'PNAE - Programa Nacional de Alimentação Escolar',
    pedidoId: 'ped-prod-01',
    pedidoNumero: 'PED-PAA-2026-001',
    numeroEntrega: 2,
    totalEntregas: 2,
    parcelaRotulo: 'Entrega 2 de 2 (50%)',
    cronogramaGrupoId: 'cron-ped-001',
    escolaId: 'esc-01',
    escolaNome: 'EMEIF Francisca das Chagas - Sede, EEIEF Manoel Joaquim de Santana',
    escolasIds: ['esc-01', 'esc-02'],
    escolasNomes: ['EMEIF Francisca das Chagas - Sede', 'EEIEF Manoel Joaquim de Santana'],
    escolaOrgaoDestino: 'Escolas do Polo Sede e Litoral Flecheiras',
    localEntrega: 'Entrega direta nas Unidades Escolares Municipais',
    dataPrevista: '2026-08-19',
    horarioSaidaPrevisto: '07:30',
    motoristaNome: 'Francisco Reginaldo (Seu Chico)',
    motoristaTelefone: '(85) 99822-4411',
    veiculoPlaca: 'PMN-4A92',
    veiculoModelo: 'Mercedes-Benz Accelo 815 (Baú Refrigerado)',
    quantidadeTotalKg: 750,
    status: 'AGENDADA',
    distanciaTotalKm: 56.0,
    autonomiaKmL: 8.0,
    consumoCombustivelLitros: 7.0,
    precoLitroCombustivel: 6.29,
    despesaCombustivel: 44.03,
    despesaDiariaMotorista: 80.00,
    despesaManutencao: 25.00,
    outrasDespesas: 15.00,
    totalDespesasEntrega: 164.03,
    observacoesRota: '2ª Quinzena - Segunda remessa quinzenal do pedido PED-PAA-2026-001.',
    paradasEntrega: [
      {
        id: 'stop-03',
        ordem: 1,
        escolaId: 'esc-01',
        escolaNome: 'EMEIF Francisca das Chagas - Sede',
        endereco: 'Rua Coronel José de Castro, 120 - Centro',
        polo: 'Sede',
        distanciaKm: 18.0,
        quantidadeKg: 350,
        statusEntrega: 'PENDENTE',
        observacoes: 'Entrega agendada para o turno matutino.'
      },
      {
        id: 'stop-04',
        ordem: 2,
        escolaId: 'esc-02',
        escolaNome: 'EEIEF Manoel Joaquim de Santana',
        endereco: 'Av. Beira Mar, S/N - Distrito de Flecheiras',
        polo: 'Flecheiras',
        distanciaKm: 38.0,
        quantidadeKg: 400,
        statusEntrega: 'PENDENTE',
        observacoes: 'Descarga prevista para às 10:30.'
      }
    ],
    itens: [
      { produtorId: 'prod-01', produtorNome: 'João Batista de Oliveira', produtoId: 'pdt-01', produtoNome: 'Mandioca In Natura Organica', quantidadePrevista: 300, unidade: 'KG' },
      { produtorId: 'prod-02', produtorNome: 'Maria Aparecida Santos', produtoId: 'pdt-02', produtoNome: 'Banana Prata Agroecológica', quantidadePrevista: 450, unidade: 'KG' }
    ],
    assinadoDigitalmente: false
  }
];

export const INITIAL_PRESTACOES_CONTAS: PrestacaoContasPAA[] = [
  {
    id: 'prest-01',
    tenantId: 'coop-01',
    numeroTermo: 'TERMO-EXEC-PAA-004/2026',
    numeroLote: 'LOTE-PAA-07/2026',
    programaId: 'prog-gov-01',
    programaNome: 'PAA - Compra com Doação Simultânea',
    programa: 'PAA',
    chamadaPublicaId: 'chm-02',
    chamadaPublicaEdital: 'Edital PAA Conab 004/2026',
    escolaId: 'esc-01',
    escolaNome: 'EMEIF Francisca das Chagas - Sede',
    periodoMesAno: '07/2026',
    periodoInicio: '2026-07-01',
    periodoFim: '2026-07-31',
    totalKgEntregues: 18400,
    totalEntregueKg: 18400,
    valorTotalExecutado: 88320.00,
    valorTotalRepasse: 88320.00,
    produtoresBeneficiadosCount: 24,
    produtoresIds: ['prod-01', 'prod-02', 'prod-03'],
    produtosIds: ['pdt-01', 'pdt-02', 'pdt-03'],
    statusAprovacao: 'APROVADO_FNDE',
    statusAprovacaoOrgao: 'APROVADO_FNDE',
    nfEmitidaNum: 'NF-e 004521',
    dataGeracao: '2026-07-31'
  }
];

export const INITIAL_PLANO_CONTAS: PlanoContaContabil[] = [
  { id: '1', codigo: '1', nome: 'ATIVO', contaPaiId: undefined, tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 1, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 1 },
  { id: '1.1', codigo: '1.1', nome: 'ATIVO CIRCULANTE', contaPaiId: '1', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 2 },
  { id: '1.1.01', codigo: '1.1.01', nome: 'DISPONIBILIDADES', contaPaiId: '1.1', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 3 },
  { id: '1.1.01.001', codigo: '1.1.01.001', nome: 'Caixa', contaPaiId: '1.1.01', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 4 },
  { id: '1.1.01.002', codigo: '1.1.01.002', nome: 'Bancos Conta Movimento', contaPaiId: '1.1.01', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 5 },
  { id: '1.1.01.003', codigo: '1.1.01.003', nome: 'Aplicações Financeiras', contaPaiId: '1.1.01', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 6 },
  { id: '1.1.02', codigo: '1.1.02', nome: 'CRÉDITOS A RECEBER', contaPaiId: '1.1', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 7 },
  { id: '1.1.02.001', codigo: '1.1.02.001', nome: 'Clientes', contaPaiId: '1.1.02', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 8 },
  { id: '1.1.02.002', codigo: '1.1.02.002', nome: 'Cooperados - Contas a Receber', contaPaiId: '1.1.02', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 9 },
  { id: '1.1.02.003', codigo: '1.1.02.003', nome: 'Adiantamentos a Cooperados', contaPaiId: '1.1.02', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 10 },
  { id: '1.1.02.004', codigo: '1.1.02.004', nome: 'Adiantamentos a Fornecedores', contaPaiId: '1.1.02', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 11 },
  { id: '1.1.02.005', codigo: '1.1.02.005', nome: 'Outros Créditos', contaPaiId: '1.1.02', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 12 },
  { id: '1.1.03', codigo: '1.1.03', nome: 'TRIBUTOS A RECUPERAR', contaPaiId: '1.1', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 13 },
  { id: '1.1.03.001', codigo: '1.1.03.001', nome: 'ICMS a Recuperar', contaPaiId: '1.1.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 14 },
  { id: '1.1.03.002', codigo: '1.1.03.002', nome: 'PIS a Recuperar', contaPaiId: '1.1.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 15 },
  { id: '1.1.03.003', codigo: '1.1.03.003', nome: 'COFINS a Recuperar', contaPaiId: '1.1.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 16 },
  { id: '1.1.03.004', codigo: '1.1.03.004', nome: 'Outros Tributos a Recuperar', contaPaiId: '1.1.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 17 },
  { id: '1.1.04', codigo: '1.1.04', nome: 'ESTOQUES', contaPaiId: '1.1', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 18 },
  { id: '1.1.04.001', codigo: '1.1.04.001', nome: 'Produtos Agropecuários dos Cooperados', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 19 },
  { id: '1.1.04.002', codigo: '1.1.04.002', nome: 'Produtos Agropecuários de Terceiros', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 20 },
  { id: '1.1.04.003', codigo: '1.1.04.003', nome: 'Insumos Agrícolas', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 21 },
  { id: '1.1.04.004', codigo: '1.1.04.004', nome: 'Rações', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 22 },
  { id: '1.1.04.005', codigo: '1.1.04.005', nome: 'Sementes e Mudas', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 23 },
  { id: '1.1.04.006', codigo: '1.1.04.006', nome: 'Fertilizantes', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 24 },
  { id: '1.1.04.007', codigo: '1.1.04.007', nome: 'Defensivos Agrícolas', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 25 },
  { id: '1.1.04.008', codigo: '1.1.04.008', nome: 'Embalagens', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 26 },
  { id: '1.1.04.009', codigo: '1.1.04.009', nome: 'Almoxarifado', contaPaiId: '1.1.04', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 27 },
  { id: '1.1.05', codigo: '1.1.05', nome: 'DESPESAS ANTECIPADAS', contaPaiId: '1.1', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 28 },
  { id: '1.1.05.001', codigo: '1.1.05.001', nome: 'Seguros a Apropriar', contaPaiId: '1.1.05', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 29 },
  { id: '1.1.05.002', codigo: '1.1.05.002', nome: 'Aluguéis Antecipados', contaPaiId: '1.1.05', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 30 },
  { id: '1.1.05.003', codigo: '1.1.05.003', nome: 'Outras Despesas Antecipadas', contaPaiId: '1.1.05', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 31 },
  { id: '1.2', codigo: '1.2', nome: 'ATIVO NÃO CIRCULANTE', contaPaiId: '1', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 32 },
  { id: '1.2.01', codigo: '1.2.01', nome: 'REALIZÁVEL A LONGO PRAZO', contaPaiId: '1.2', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 33 },
  { id: '1.2.01.001', codigo: '1.2.01.001', nome: 'Créditos de Longo Prazo', contaPaiId: '1.2.01', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 34 },
  { id: '1.2.01.002', codigo: '1.2.01.002', nome: 'Empréstimos a Cooperados', contaPaiId: '1.2.01', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 35 },
  { id: '1.2.02', codigo: '1.2.02', nome: 'INVESTIMENTOS', contaPaiId: '1.2', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 36 },
  { id: '1.2.02.001', codigo: '1.2.02.001', nome: 'Participações em Cooperativas', contaPaiId: '1.2.02', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 37 },
  { id: '1.2.02.002', codigo: '1.2.02.002', nome: 'Outros Investimentos', contaPaiId: '1.2.02', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 38 },
  { id: '1.2.03', codigo: '1.2.03', nome: 'IMOBILIZADO', contaPaiId: '1.2', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 39 },
  { id: '1.2.03.001', codigo: '1.2.03.001', nome: 'Terrenos', contaPaiId: '1.2.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 40 },
  { id: '1.2.03.002', codigo: '1.2.03.002', nome: 'Edificações', contaPaiId: '1.2.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 41 },
  { id: '1.2.03.003', codigo: '1.2.03.003', nome: 'Máquinas e Equipamentos', contaPaiId: '1.2.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 42 },
  { id: '1.2.03.004', codigo: '1.2.03.004', nome: 'Veículos', contaPaiId: '1.2.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 43 },
  { id: '1.2.03.005', codigo: '1.2.03.005', nome: 'Móveis e Utensílios', contaPaiId: '1.2.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 44 },
  { id: '1.2.03.006', codigo: '1.2.03.006', nome: 'Computadores e Periféricos', contaPaiId: '1.2.03', tipo: 'ATIVO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 45 },
  { id: '1.2.04', codigo: '1.2.04', nome: 'DEPRECIAÇÃO ACUMULADA', contaPaiId: '1.2', tipo: 'ATIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 46 },
  { id: '1.2.04.001', codigo: '1.2.04.001', nome: '(-) Depreciação de Edificações', contaPaiId: '1.2.04', tipo: 'ATIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 47 },
  { id: '1.2.04.002', codigo: '1.2.04.002', nome: '(-) Depreciação de Máquinas e Equipamentos', contaPaiId: '1.2.04', tipo: 'ATIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 48 },
  { id: '1.2.04.003', codigo: '1.2.04.003', nome: '(-) Depreciação de Veículos', contaPaiId: '1.2.04', tipo: 'ATIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 49 },
  { id: '1.2.04.004', codigo: '1.2.04.004', nome: '(-) Depreciação de Móveis e Utensílios', contaPaiId: '1.2.04', tipo: 'ATIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 50 },
  { id: '1.2.04.005', codigo: '1.2.04.005', nome: '(-) Depreciação de Computadores', contaPaiId: '1.2.04', tipo: 'ATIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 51 },
  { id: '2', codigo: '2', nome: 'PASSIVO', contaPaiId: undefined, tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 1, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 52 },
  { id: '2.1', codigo: '2.1', nome: 'PASSIVO CIRCULANTE', contaPaiId: '2', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 53 },
  { id: '2.1.01', codigo: '2.1.01', nome: 'FORNECEDORES', contaPaiId: '2.1', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 54 },
  { id: '2.1.01.001', codigo: '2.1.01.001', nome: 'Fornecedores de Mercadorias', contaPaiId: '2.1.01', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 55 },
  { id: '2.1.01.002', codigo: '2.1.01.002', nome: 'Fornecedores de Insumos', contaPaiId: '2.1.01', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 56 },
  { id: '2.1.01.003', codigo: '2.1.01.003', nome: 'Fornecedores - Cooperados', contaPaiId: '2.1.01', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 57 },
  { id: '2.1.02', codigo: '2.1.02', nome: 'OBRIGAÇÕES TRABALHISTAS', contaPaiId: '2.1', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 58 },
  { id: '2.1.02.001', codigo: '2.1.02.001', nome: 'Salários a Pagar', contaPaiId: '2.1.02', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 59 },
  { id: '2.1.02.002', codigo: '2.1.02.002', nome: 'INSS a Recolher', contaPaiId: '2.1.02', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 60 },
  { id: '2.1.02.003', codigo: '2.1.02.003', nome: 'FGTS a Recolher', contaPaiId: '2.1.02', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 61 },
  { id: '2.1.02.004', codigo: '2.1.02.004', nome: 'Férias a Pagar', contaPaiId: '2.1.02', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 62 },
  { id: '2.1.02.005', codigo: '2.1.02.005', nome: '13º Salário a Pagar', contaPaiId: '2.1.02', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 63 },
  { id: '2.1.03', codigo: '2.1.03', nome: 'OBRIGAÇÕES TRIBUTÁRIAS', contaPaiId: '2.1', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 64 },
  { id: '2.1.03.001', codigo: '2.1.03.001', nome: 'ICMS a Recolher', contaPaiId: '2.1.03', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 65 },
  { id: '2.1.03.002', codigo: '2.1.03.002', nome: 'PIS a Recolher', contaPaiId: '2.1.03', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 66 },
  { id: '2.1.03.003', codigo: '2.1.03.003', nome: 'COFINS a Recolher', contaPaiId: '2.1.03', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 67 },
  { id: '2.1.03.004', codigo: '2.1.03.004', nome: 'IRRF a Recolher', contaPaiId: '2.1.03', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 68 },
  { id: '2.1.03.005', codigo: '2.1.03.005', nome: 'Outros Tributos a Recolher', contaPaiId: '2.1.03', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 69 },
  { id: '2.1.04', codigo: '2.1.04', nome: 'OBRIGAÇÕES COM COOPERADOS', contaPaiId: '2.1', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 70 },
  { id: '2.1.04.001', codigo: '2.1.04.001', nome: 'Produção a Pagar aos Cooperados', contaPaiId: '2.1.04', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 71 },
  { id: '2.1.04.002', codigo: '2.1.04.002', nome: 'Sobras a Pagar aos Cooperados', contaPaiId: '2.1.04', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 72 },
  { id: '2.1.04.003', codigo: '2.1.04.003', nome: 'Capital a Restituir aos Cooperados', contaPaiId: '2.1.04', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 73 },
  { id: '2.1.05', codigo: '2.1.05', nome: 'EMPRÉSTIMOS E FINANCIAMENTOS', contaPaiId: '2.1', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 74 },
  { id: '2.1.05.001', codigo: '2.1.05.001', nome: 'Empréstimos Bancários', contaPaiId: '2.1.05', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 75 },
  { id: '2.1.05.002', codigo: '2.1.05.002', nome: 'Financiamentos', contaPaiId: '2.1.05', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 76 },
  { id: '2.1.06', codigo: '2.1.06', nome: 'OUTRAS OBRIGAÇÕES', contaPaiId: '2.1', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 77 },
  { id: '2.1.06.001', codigo: '2.1.06.001', nome: 'Contas a Pagar', contaPaiId: '2.1.06', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 78 },
  { id: '2.1.06.002', codigo: '2.1.06.002', nome: 'Adiantamento de Clientes', contaPaiId: '2.1.06', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 79 },
  { id: '2.2', codigo: '2.2', nome: 'PASSIVO NÃO CIRCULANTE', contaPaiId: '2', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 80 },
  { id: '2.2.01', codigo: '2.2.01', nome: 'EMPRÉSTIMOS E FINANCIAMENTOS', contaPaiId: '2.2', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 81 },
  { id: '2.2.01.001', codigo: '2.2.01.001', nome: 'Empréstimos de Longo Prazo', contaPaiId: '2.2.01', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 82 },
  { id: '2.2.01.002', codigo: '2.2.01.002', nome: 'Financiamentos de Longo Prazo', contaPaiId: '2.2.01', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 83 },
  { id: '2.2.02', codigo: '2.2.02', nome: 'PARCELAMENTOS', contaPaiId: '2.2', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 84 },
  { id: '2.2.02.001', codigo: '2.2.02.001', nome: 'Parcelamentos Tributários', contaPaiId: '2.2.02', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 85 },
  { id: '2.2.02.002', codigo: '2.2.02.002', nome: 'Outros Parcelamentos', contaPaiId: '2.2.02', tipo: 'PASSIVO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 86 },
  { id: '3', codigo: '3', nome: 'PATRIMÔNIO LÍQUIDO', contaPaiId: undefined, tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 1, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 87 },
  { id: '3.1', codigo: '3.1', nome: 'CAPITAL SOCIAL', contaPaiId: '3', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 88 },
  { id: '3.1.01', codigo: '3.1.01', nome: 'CAPITAL DOS COOPERADOS', contaPaiId: '3.1', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 89 },
  { id: '3.1.01.001', codigo: '3.1.01.001', nome: 'Capital Subscrito', contaPaiId: '3.1.01', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 90 },
  { id: '3.1.01.002', codigo: '3.1.01.002', nome: 'Capital Integralizado', contaPaiId: '3.1.01', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 91 },
  { id: '3.1.01.003', codigo: '3.1.01.003', nome: 'Capital a Integralizar', contaPaiId: '3.1.01', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 92 },
  { id: '3.2', codigo: '3.2', nome: 'RESERVAS', contaPaiId: '3', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 93 },
  { id: '3.2.01', codigo: '3.2.01', nome: 'RESERVA LEGAL', contaPaiId: '3.2', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 94 },
  { id: '3.2.01.001', codigo: '3.2.01.001', nome: 'Reserva Legal', contaPaiId: '3.2.01', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 95 },
  { id: '3.2.02', codigo: '3.2.02', nome: 'FATES', contaPaiId: '3.2', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 96 },
  { id: '3.2.02.001', codigo: '3.2.02.001', nome: 'FATES', contaPaiId: '3.2.02', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 97 },
  { id: '3.2.03', codigo: '3.2.03', nome: 'OUTRAS RESERVAS', contaPaiId: '3.2', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 98 },
  { id: '3.2.03.001', codigo: '3.2.03.001', nome: 'Outras Reservas', contaPaiId: '3.2.03', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 99 },
  { id: '3.3', codigo: '3.3', nome: 'SOBRAS OU PERDAS', contaPaiId: '3', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 100 },
  { id: '3.3.01', codigo: '3.3.01', nome: 'SOBRAS', contaPaiId: '3.3', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 101 },
  { id: '3.3.01.001', codigo: '3.3.01.001', nome: 'Sobras do Exercício', contaPaiId: '3.3.01', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 102 },
  { id: '3.3.02', codigo: '3.3.02', nome: 'PERDAS', contaPaiId: '3.3', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 103 },
  { id: '3.3.02.001', codigo: '3.3.02.001', nome: 'Perdas do Exercício', contaPaiId: '3.3.02', tipo: 'PATRIMONIO_LIQUIDO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 104 },
  { id: '4', codigo: '4', nome: 'RECEITAS', contaPaiId: undefined, tipo: 'RECEITA', natureza: 'CREDORA', nivel: 1, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 105 },
  { id: '4.1', codigo: '4.1', nome: 'RECEITAS DE ATOS COOPERATIVOS', contaPaiId: '4', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 106 },
  { id: '4.1.01', codigo: '4.1.01', nome: 'COMERCIALIZAÇÃO DA PRODUÇÃO', contaPaiId: '4.1', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 107 },
  { id: '4.1.01.001', codigo: '4.1.01.001', nome: 'Venda da Produção dos Cooperados', contaPaiId: '4.1.01', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 108 },
  { id: '4.1.01.002', codigo: '4.1.01.002', nome: 'Venda de Produtos Agropecuários', contaPaiId: '4.1.01', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 109 },
  { id: '4.1.02', codigo: '4.1.02', nome: 'VENDA DE INSUMOS', contaPaiId: '4.1', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 110 },
  { id: '4.1.02.001', codigo: '4.1.02.001', nome: 'Venda de Insumos aos Cooperados', contaPaiId: '4.1.02', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 111 },
  { id: '4.1.03', codigo: '4.1.03', nome: 'PRESTAÇÃO DE SERVIÇOS', contaPaiId: '4.1', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 112 },
  { id: '4.1.03.001', codigo: '4.1.03.001', nome: 'Serviços Prestados aos Cooperados', contaPaiId: '4.1.03', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 113 },
  { id: '4.1.04', codigo: '4.1.04', nome: 'OUTRAS RECEITAS COOPERATIVAS', contaPaiId: '4.1', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 114 },
  { id: '4.1.04.001', codigo: '4.1.04.001', nome: 'Outras Receitas de Atos Cooperativos', contaPaiId: '4.1.04', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 115 },
  { id: '4.2', codigo: '4.2', nome: 'RECEITAS DE ATOS NÃO COOPERATIVOS', contaPaiId: '4', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 116 },
  { id: '4.2.01', codigo: '4.2.01', nome: 'COMERCIALIZAÇÃO', contaPaiId: '4.2', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 117 },
  { id: '4.2.01.001', codigo: '4.2.01.001', nome: 'Venda a Não Cooperados', contaPaiId: '4.2.01', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 118 },
  { id: '4.2.01.002', codigo: '4.2.01.002', nome: 'Venda de Produtos de Terceiros', contaPaiId: '4.2.01', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 119 },
  { id: '4.2.02', codigo: '4.2.02', nome: 'PRESTAÇÃO DE SERVIÇOS', contaPaiId: '4.2', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 120 },
  { id: '4.2.02.001', codigo: '4.2.02.001', nome: 'Serviços Prestados a Terceiros', contaPaiId: '4.2.02', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 121 },
  { id: '4.3', codigo: '4.3', nome: 'RECEITAS FINANCEIRAS', contaPaiId: '4', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 122 },
  { id: '4.3.01', codigo: '4.3.01', nome: 'RECEITAS FINANCEIRAS', contaPaiId: '4.3', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 123 },
  { id: '4.3.01.001', codigo: '4.3.01.001', nome: 'Juros Recebidos', contaPaiId: '4.3.01', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 124 },
  { id: '4.3.01.002', codigo: '4.3.01.002', nome: 'Rendimentos de Aplicações', contaPaiId: '4.3.01', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 125 },
  { id: '4.3.01.003', codigo: '4.3.01.003', nome: 'Descontos Obtidos', contaPaiId: '4.3.01', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 126 },
  { id: '4.3.02', codigo: '4.3.02', nome: 'OUTRAS RECEITAS', contaPaiId: '4.3', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 127 },
  { id: '4.3.02.001', codigo: '4.3.02.001', nome: 'Outras Receitas Operacionais', contaPaiId: '4.3.02', tipo: 'RECEITA', natureza: 'CREDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 128 },
  { id: '5', codigo: '5', nome: 'CUSTOS', contaPaiId: undefined, tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 1, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 129 },
  { id: '5.1', codigo: '5.1', nome: 'CUSTOS DE ATOS COOPERATIVOS', contaPaiId: '5', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 130 },
  { id: '5.1.01', codigo: '5.1.01', nome: 'AQUISIÇÃO DA PRODUÇÃO', contaPaiId: '5.1', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 131 },
  { id: '5.1.01.001', codigo: '5.1.01.001', nome: 'Aquisição da Produção dos Cooperados', contaPaiId: '5.1.01', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 132 },
  { id: '5.1.01.002', codigo: '5.1.01.002', nome: 'Fretes sobre Compras', contaPaiId: '5.1.01', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 133 },
  { id: '5.1.01.003', codigo: '5.1.01.003', nome: 'Beneficiamento da Produção', contaPaiId: '5.1.01', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 134 },
  { id: '5.1.01.004', codigo: '5.1.01.004', nome: 'Armazenagem', contaPaiId: '5.1.01', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 135 },
  { id: '5.1.01.005', codigo: '5.1.01.005', nome: 'Embalagens', contaPaiId: '5.1.01', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 136 },
  { id: '5.1.02', codigo: '5.1.02', nome: 'OUTROS CUSTOS COOPERATIVOS', contaPaiId: '5.1', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 137 },
  { id: '5.1.02.001', codigo: '5.1.02.001', nome: 'Custos de Comercialização', contaPaiId: '5.1.02', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 138 },
  { id: '5.1.02.002', codigo: '5.1.02.002', nome: 'Perdas de Estoques', contaPaiId: '5.1.02', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'COOPERATIVO', ativo: true, ordemExibicao: 139 },
  { id: '5.2', codigo: '5.2', nome: 'CUSTOS DE ATOS NÃO COOPERATIVOS', contaPaiId: '5', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 140 },
  { id: '5.2.01', codigo: '5.2.01', nome: 'AQUISIÇÃO DE PRODUTOS', contaPaiId: '5.2', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 141 },
  { id: '5.2.01.001', codigo: '5.2.01.001', nome: 'Aquisição de Produtos de Terceiros', contaPaiId: '5.2.01', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 142 },
  { id: '5.2.01.002', codigo: '5.2.01.002', nome: 'Fretes sobre Compras', contaPaiId: '5.2.01', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 143 },
  { id: '5.2.01.003', codigo: '5.2.01.003', nome: 'Armazenagem', contaPaiId: '5.2.01', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 144 },
  { id: '5.2.02', codigo: '5.2.02', nome: 'OUTROS CUSTOS', contaPaiId: '5.2', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 145 },
  { id: '5.2.02.001', codigo: '5.2.02.001', nome: 'Custos de Comercialização', contaPaiId: '5.2.02', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 146 },
  { id: '5.2.02.002', codigo: '5.2.02.002', nome: 'Perdas de Estoques', contaPaiId: '5.2.02', tipo: 'CUSTO', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'NAO_COOPERATIVO', ativo: true, ordemExibicao: 147 },
  { id: '6', codigo: '6', nome: 'DESPESAS', contaPaiId: undefined, tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 1, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 148 },
  { id: '6.1', codigo: '6.1', nome: 'DESPESAS ADMINISTRATIVAS', contaPaiId: '6', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 149 },
  { id: '6.1.01', codigo: '6.1.01', nome: 'PESSOAL', contaPaiId: '6.1', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 150 },
  { id: '6.1.01.001', codigo: '6.1.01.001', nome: 'Salários', contaPaiId: '6.1.01', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 151 },
  { id: '6.1.01.002', codigo: '6.1.01.002', nome: 'Encargos Sociais', contaPaiId: '6.1.01', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 152 },
  { id: '6.1.01.003', codigo: '6.1.01.003', nome: 'Férias', contaPaiId: '6.1.01', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 153 },
  { id: '6.1.01.004', codigo: '6.1.01.004', nome: '13º Salário', contaPaiId: '6.1.01', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 154 },
  { id: '6.1.01.005', codigo: '6.1.01.005', nome: 'Benefícios aos Funcionários', contaPaiId: '6.1.01', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 155 },
  { id: '6.1.02', codigo: '6.1.02', nome: 'DESPESAS GERAIS', contaPaiId: '6.1', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 156 },
  { id: '6.1.02.001', codigo: '6.1.02.001', nome: 'Energia Elétrica', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 157 },
  { id: '6.1.02.002', codigo: '6.1.02.002', nome: 'Água e Esgoto', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 158 },
  { id: '6.1.02.003', codigo: '6.1.02.003', nome: 'Telefone e Internet', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 159 },
  { id: '6.1.02.004', codigo: '6.1.02.004', nome: 'Material de Expediente', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 160 },
  { id: '6.1.02.005', codigo: '6.1.02.005', nome: 'Material de Limpeza', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 161 },
  { id: '6.1.02.006', codigo: '6.1.02.006', nome: 'Serviços Contábeis', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 162 },
  { id: '6.1.02.007', codigo: '6.1.02.007', nome: 'Serviços de Terceiros', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 163 },
  { id: '6.1.02.008', codigo: '6.1.02.008', nome: 'Aluguéis', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 164 },
  { id: '6.1.02.009', codigo: '6.1.02.009', nome: 'Seguros', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 165 },
  { id: '6.1.02.010', codigo: '6.1.02.010', nome: 'Manutenção e Conservação', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 166 },
  { id: '6.1.02.011', codigo: '6.1.02.011', nome: 'Depreciação', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 167 },
  { id: '6.1.02.012', codigo: '6.1.02.012', nome: 'Despesas com Viagens', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 168 },
  { id: '6.1.02.013', codigo: '6.1.02.013', nome: 'Combustíveis', contaPaiId: '6.1.02', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 169 },
  { id: '6.2', codigo: '6.2', nome: 'DESPESAS COMERCIAIS', contaPaiId: '6', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 2, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 170 },
  { id: '6.2.01', codigo: '6.2.01', nome: 'VENDAS', contaPaiId: '6.2', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 3, tipoConta: 'SINTETICA', aceitaLancamento: false, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 171 },
  { id: '6.2.01.001', codigo: '6.2.01.001', nome: 'Fretes sobre Vendas', contaPaiId: '6.2.01', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 172 },
  { id: '6.2.01.002', codigo: '6.2.01.002', nome: 'Comissões', contaPaiId: '6.2.01', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 173 },
  { id: '6.2.01.003', codigo: '6.2.01.003', nome: 'Propaganda e Publicidade', contaPaiId: '6.2.01', tipo: 'DESPESA', natureza: 'DEVEDORA', nivel: 4, tipoConta: 'ANALITICA', aceitaLancamento: true, atoCooperativo: 'AMBOS', ativo: true, ordemExibicao: 174 },
];

export const INITIAL_LANCAMENTOS_CONTABEIS: LancamentoContabil[] = [
  {
    id: 'lanc-01',
    tenantId: 'coop-01',
    numeroLancamento: 1001,
    data: '2026-08-01',
    contaDebitoCodigo: '1.1.01.002',
    contaDebitoNome: 'Bancos Conta Movimento',
    contaCreditoCodigo: '3.1.01.002',
    contaCreditoNome: 'Capital Integralizado',
    valor: 500.00,
    historico: 'Integralização de Cota-Parte Capital referente ao cooperado João Batista',
    moduloOrigem: 'CAPITAL',
    usuario: 'Mariana Costa'
  },
  {
    id: 'lanc-02',
    tenantId: 'coop-01',
    numeroLancamento: 1002,
    data: '2026-08-02',
    contaDebitoCodigo: '1.1.01.002',
    contaDebitoNome: 'Bancos Conta Movimento',
    contaCreditoCodigo: '4.1.01.001',
    contaCreditoNome: 'Venda da Produção dos Cooperados',
    valor: 14500.00,
    historico: 'Recebimento referente à medição de entregas PNAE Prefeitura',
    moduloOrigem: 'FINANCEIRO',
    usuario: 'Mariana Costa'
  }
];

export const INITIAL_PATRIMONIO: ItemPatrimonio[] = [
  {
    id: 'pat-01',
    tenantId: 'coop-01',
    codigoTombo: 'TB-2024-001',
    descricao: 'Caminhão Baú Refrigerado Ford Cargo 816',
    categoria: 'VEICULO',
    dataAquisicao: '2024-05-10',
    valorAquisicao: 185000.00,
    depreciacaoAcumulada: 22000.00,
    valorAtual: 163000.00,
    localizacao: 'Garagem Central Cooperai'
  },
  {
    id: 'pat-02',
    tenantId: 'coop-01',
    codigoTombo: 'TB-2025-002',
    descricao: 'Câmara Fria Industrial 40m³ para Polpa e Frutas',
    categoria: 'MAQUINARIO',
    dataAquisicao: '2025-02-18',
    valorAquisicao: 65000.00,
    depreciacaoAcumulada: 6500.00,
    valorAtual: 58500.00,
    localizacao: 'Galpão de Processamento Agroindustrial'
  }
];

export const INITIAL_CONTAS_PAGAR_RECEBER: ContaPagarReceber[] = [
  {
    id: 'fin-01',
    tenantId: 'coop-01',
    tipo: 'RECEBER',
    descricao: 'Ordem de Pagamento PNAE Lote 04 - Prefeitura Municipal',
    pessoaNome: 'Prefeitura Municipal de Trairi',
    categoria: 'RECEITA_PROGRAMAS',
    valor: 32400.00,
    dataEmissao: '2026-07-25',
    dataVencimento: '2026-08-10',
    status: 'PENDENTE',
    centroCusto: 'Mód. PNAE'
  },
  {
    id: 'fin-02',
    tenantId: 'coop-01',
    tipo: 'PAGAR',
    descricao: 'Repasse da Produção de Mandioca aos Produtores',
    pessoaNome: 'Cooperados do Grupo Agroecológico',
    categoria: 'REPASSE_PRODUCAO',
    valor: 22100.00,
    dataEmissao: '2026-07-28',
    dataVencimento: '2026-08-05',
    status: 'PENDENTE',
    centroCusto: 'Mód. PAA/PNAE'
  }
];

export const INITIAL_EXTRATO_BANCARIO: ExtratoBancario = {
  id: 'ext-01',
  tenantId: 'coop-01',
  bancoNome: 'Banco do Brasil - Agência Trairi',
  agenciaConta: 'Ag. 1204-5 / C/C 10293-8',
  saldoInicial: 84500.00,
  saldoAtual: 112400.00,
  entradasMes: 48900.00,
  saidasMes: 21000.00,
  lancamentos: [
    { id: 'ext-l1', data: '2026-08-01', historico: 'Depósito PIX Cota Parte Capital - João Batista', tipo: 'CREDITO', valor: 500.00 },
    { id: 'ext-l2', data: '2026-08-02', historico: 'Ordem Bancária FNDE/PNAE Repasse', tipo: 'CREDITO', valor: 28400.00 },
    { id: 'ext-l3', data: '2026-08-02', historico: 'Pagamento Concessionária Energia Galpão', tipo: 'DEBITO', valor: 1850.00 }
  ],
  ultimosLancamentos: [
    { id: 'ext-l1', data: '2026-08-01', descricao: 'Depósito PIX Cota Parte Capital - João Batista', tipo: 'ENTRADA', valor: 500.00, conciliado: true },
    { id: 'ext-l2', data: '2026-08-02', descricao: 'Ordem Bancária FNDE/PNAE Repasse', tipo: 'ENTRADA', valor: 28400.00, conciliado: true },
    { id: 'ext-l3', data: '2026-08-02', descricao: 'Pagamento Concessionária Energia Galpão', tipo: 'SAIDA', valor: 1850.00, conciliado: true }
  ]
};

export const INITIAL_SOLICITACOES_COMPRA: SolicitacaoCompra[] = [
  {
    id: 'sol-01',
    tenantId: 'coop-01',
    numeroSolicitacao: 'SOL-2026-042',
    solicitante: 'Carlos Eduardo (Secretaria/Logística)',
    departamento: 'Logística de Distribuição',
    dataSolicitacao: '2026-08-01',
    status: 'EM_COTACAO',
    itens: [
      { descricao: 'Caixas Plásticas Vazadas para Frutas 50L', quantidade: 200, unidade: 'UN' },
      { descricao: 'Sacos de Ráfia Milho/Feijão 50kg', quantidade: 500, unidade: 'UN' }
    ]
  }
];

export const INITIAL_FORNECEDORES: Fornecedor[] = [
  {
    id: 'forn-01',
    tenantId: 'coop-01',
    razaoSocial: 'AgroPlast Embalagens Industriais Ltda',
    nomeFantasia: 'AgroPlast Embalagens',
    cnpj: '18.920.102/0001-44',
    telefone: '(85) 3210-9988',
    email: 'vendas@agroplast.com.br',
    cidadeUf: 'Fortaleza - CE',
    categoriaServico: 'Embalagens e Insumos',
    avaliacaoScore: 4.8
  },
  {
    id: 'forn-02',
    tenantId: 'coop-01',
    razaoSocial: 'Posto e Transportadora Sol Nascente Ltda',
    nomeFantasia: 'Posto Sol Nascente',
    cnpj: '04.102.938/0001-99',
    telefone: '(85) 3351-1200',
    email: 'faturamento@solnascente.com.br',
    cidadeUf: 'Trairi - CE',
    categoriaServico: 'Combustíveis e Lubrificantes',
    avaliacaoScore: 4.9
  }
];

export const INITIAL_ESTOQUE: ItemEstoque[] = [
  {
    id: 'est-01',
    tenantId: 'coop-01',
    codigoSku: 'SKU-EMB-001',
    nomeItem: 'Sacos Plásticos Termoencolhíveis 1kg Vácuo',
    categoria: 'Embalagens',
    unidadeMedida: 'UN',
    quantidadeAtual: 12500,
    quantidadeMinima: 3000,
    valorUnitarioMedio: 0.35,
    localizacaoAlmoxarifado: 'Prateleira A2 - Setor Embalagens',
    lotes: [
      { numeroLote: 'LT-2026-08', quantidade: 12500, dataValidade: '2028-08-01' }
    ]
  },
  {
    id: 'est-02',
    tenantId: 'coop-01',
    codigoSku: 'SKU-INS-002',
    nomeItem: 'Adubo Orgânico Compostado BioAgro 25kg',
    categoria: 'Insumos Agrícolas',
    unidadeMedida: 'SACAS',
    quantidadeAtual: 240,
    quantidadeMinima: 50,
    valorUnitarioMedio: 38.00,
    localizacaoAlmoxarifado: 'Galpão B - Insumos',
    lotes: [
      { numeroLote: 'LT-ORG-019', quantidade: 240, dataValidade: '2027-01-15' }
    ]
  }
];

export const INITIAL_MOVIMENTACOES_ESTOQUE: MovimentacaoEstoque[] = [
  {
    id: 'mov-01',
    tenantId: 'coop-01',
    itemEstoqueId: 'est-01',
    itemNome: 'Sacos Plásticos Termoencolhíveis 1kg Vácuo',
    tipoMovimento: 'ENTRADA',
    quantidade: 5000,
    motivoHist: 'Compra via Ordem OC-2026-088 para processamento de mandioca',
    dataHora: '2026-08-01 10:15',
    usuarioResponsavel: 'Carlos Eduardo'
  }
];

export const INITIAL_FUNCIONARIOS_RH: FuncionarioRH[] = [
  {
    id: 'func-01',
    tenantId: 'coop-01',
    matricula: 'FUNC-001',
    nome: 'Reginaldo de Castro',
    cpf: '332.112.445-88',
    cargo: 'Motorista Entregador Senior',
    departamento: 'Logística',
    salarioBase: 3200.00,
    dataAdmissao: '2022-04-01',
    status: 'ATIVO',
    chavePix: '332.112.445-88'
  },
  {
    id: 'func-02',
    tenantId: 'coop-01',
    matricula: 'FUNC-002',
    nome: 'Ana Cláudia Fontes',
    cpf: '887.665.443-11',
    cargo: 'Técnica Agrícola e Qualidade',
    departamento: 'Assistência Técnica',
    salarioBase: 4100.00,
    dataAdmissao: '2023-01-15',
    status: 'ATIVO',
    chavePix: 'ana.fontes@gmail.com'
  }
];

export const INITIAL_FOLHA_PAGAMENTO: FolhaPagamento[] = [
  {
    id: 'folha-01',
    tenantId: 'coop-01',
    competenciaMesAno: '07/2026',
    funcionarioId: 'func-01',
    funcionarioNome: 'Reginaldo de Castro',
    salarioBruto: 3200.00,
    descontosInssInrf: 352.00,
    proventosAdicionais: 250.00,
    salarioLiquido: 3098.00,
    status: 'PAGO'
  }
];

export const INITIAL_MOTORISTAS: Motorista[] = [
  { id: 'mot-01', tenantId: 'coop-01', nome: 'Reginaldo de Castro', email: 'reginaldo.castro@logistica.coop.br', veiculoPadrao: 'PMN-4A92 (Caminhão Baú)', ativo: true },
  { id: 'mot-02', tenantId: 'coop-01', nome: 'Carlos Eduardo', email: 'carlos.motorista@cooperai.coop.br', veiculoPadrao: 'ABC-4E21 (Furgão Refrigerado)', ativo: true },
  { id: 'mot-03', tenantId: 'coop-01', nome: 'Antônio Rocha', email: 'antonio.motorista@cooperai.coop.br', veiculoPadrao: 'XYZ-9012 (Caminhão Toco)', ativo: true }
];

export const INITIAL_ESCOLAS_PNAE: EscolaPnae[] = [
  {
    id: 'esc-01',
    tenantId: 'coop-01',
    nomeEscola: 'EMEIF Francisca das Chagas - Sede',
    inepCodigo: '23091022',
    localDeEntrega: 'Almoxarifado Central / Escola Sede',
    cnae: '8512-1/00',
    razaoSocial: 'Prefeitura Municipal de Trairi - EMEIF Francisca das Chagas',
    cnpj: '07.594.902/0001-30',
    logradouroNum: 'Rua Coronel José de Castro, 120',
    localidade: 'Centro - Trairi/CE',
    alunosAtendidos: 650,
    polo: 'Sede',
    representante: 'Maria das Graças Alencar',
    tipo: 'Municipal',
    cpf: '123.456.789-00',
    rg: '2001012345678 SSP/CE',
    diretorResponsavel: 'Profa. Maria das Graças Alencar',
    telefone: '(85) 3351-8811',
    celular: '(85) 99812-3456',
    email: 'emeif.chagas@trairi.ce.gov.br',
    endereco: 'Rua Coronel José de Castro, 120 - Centro, Trairi - CE'
  },
  {
    id: 'esc-02',
    tenantId: 'coop-01',
    nomeEscola: 'EEIEF Manoel Joaquim de Santana',
    inepCodigo: '23091045',
    localDeEntrega: 'Escola EEIEF Manoel Joaquim',
    cnae: '8512-1/00',
    razaoSocial: 'Prefeitura Municipal de Trairi - EEIEF Manoel Joaquim',
    cnpj: '07.594.902/0002-11',
    logradouroNum: 'Avenida Beira Mar, S/N',
    localidade: 'Distrito de Flecheiras - Trairi/CE',
    alunosAtendidos: 420,
    polo: 'Flecheiras',
    representante: 'Francisco das Chagas Viana',
    tipo: 'Municipal',
    cpf: '987.654.321-99',
    rg: '2002098765432 SSP/CE',
    diretorResponsavel: 'Prof. Francisco das Chagas Viana',
    telefone: '(85) 3351-9922',
    celular: '(85) 99765-4321',
    email: 'eeief.santana@trairi.ce.gov.br',
    endereco: 'Distrito de Flecheiras, Trairi - CE'
  }
];

export const INITIAL_ENTREGAS_ESCOLA: EntregaEscolaPnae[] = [
  {
    id: 'ent-esc-01',
    tenantId: 'coop-01',
    escolaId: 'esc-01',
    escolaNome: 'EMEIF Francisca das Chagas - Sede',
    escolaEmail: 'emeif.chagas@trairi.ce.gov.br',
    dataHoraEntrega: '2026-08-01 08:30',
    motoristaNome: 'Reginaldo de Castro',
    placaVeiculo: 'PMN-4A92',
    statusConfirmacao: 'RECEBIDO_OK',
    assinadoPor: 'Maria das Graças Alencar (Diretora)',
    itensRecebidos: [
      { produto: 'Mandioca In Natura Organica', qtdEsperada: 150, qtdRecebida: 150 },
      { produto: 'Banana Prata Agroecológica', qtdEsperada: 200, qtdRecebida: 200 }
    ]
  }
];

export const INITIAL_ROMANEIOS_MOTORISTA: RomaneioMotorista[] = [
  {
    id: 'rom-01',
    tenantId: 'coop-01',
    numeroRomaneio: 'ROM-2026-0801',
    motoristaId: 'mot-01',
    motoristaNome: 'Reginaldo de Castro',
    motoristaEmail: 'reginaldo.castro@logistica.coop.br',
    veiculoPlaca: 'PMN-4A92',
    rotaNome: 'Rota Litoral (Flecheiras / Sede)',
    statusRota: 'EM_TRANSITO',
    totalCargaKg: 380,
    paradas: [
      { pontoId: '1', nomeLocal: 'EMEIF Francisca das Chagas - Sede', tipoPonto: 'ESCOLA', concluido: true },
      { pontoId: '2', nomeLocal: 'EEIEF Manoel Joaquim de Santana - Flecheiras', tipoPonto: 'ESCOLA', concluido: false }
    ]
  }
];

export const INITIAL_PEDIDOS_PRODUTOR: PedidoProdutorPAA[] = [
  {
    id: 'ped-prod-01',
    tenantId: 'coop-01',
    numeroPedido: 'PED-PAA-2026-001',
    programa: 'PNAE',
    chamadaPublicaId: 'chm-01',
    chamadaPublicaEdital: 'Chamada Pública PNAE 001/2026',
    escolaId: 'esc-01',
    escolaNome: 'EMEIF Francisca das Chagas - Sede, EEIEF Manoel Joaquim de Santana',
    escolasIds: ['esc-01', 'esc-02'],
    escolasNomes: ['EMEIF Francisca das Chagas - Sede', 'EEIEF Manoel Joaquim de Santana'],
    fonteRecursos: 'FNDE / PNAE Federal',
    dataPedido: '2026-08-01',
    dataPrevistaEntrega: '2026-08-05',
    status: 'CONFIRMADO',
    qtdeEntregas: 2,
    cronogramaEntregas: [
      {
        numero: 1,
        rotulo: 'Entrega 1 de 2 (50%)',
        dataPrevista: '2026-08-05',
        horarioSaida: '07:30',
        percentual: 50,
        quantidadeKg: 650,
        valorPrevisto: 3280.00,
        observacao: '1ª Quinzena - 250kg Mandioca + 400kg Banana'
      },
      {
        numero: 2,
        rotulo: 'Entrega 2 de 2 (50%)',
        dataPrevista: '2026-08-19',
        horarioSaida: '07:30',
        percentual: 50,
        quantidadeKg: 650,
        valorPrevisto: 3280.00,
        observacao: '2ª Quinzena - 250kg Mandioca + 400kg Banana'
      }
    ],
    produtoresParticipantes: ['prod-01', 'prod-02'],
    itens: [
      {
        produtorId: 'prod-01',
        produtorNome: 'João Batista de Oliveira',
        produtoId: 'pdt-01',
        produtoNome: 'Mandioca In Natura Organica',
        unidadeMedida: 'KG',
        quantidadeOfertada: 2500,
        quantidadePedida: 500,
        precoUnitario: 4.80,
        valorTotalItem: 2400.00,
        escolasIds: ['esc-01'],
        escolasNomes: ['EMEIF Francisca das Chagas - Sede']
      },
      {
        produtorId: 'prod-02',
        produtorNome: 'Maria Aparecida Santos',
        produtoId: 'pdt-02',
        produtoNome: 'Banana Prata Agroecológica',
        unidadeMedida: 'KG',
        quantidadeOfertada: 4000,
        quantidadePedida: 800,
        precoUnitario: 5.20,
        valorTotalItem: 4160.00,
        escolasIds: ['esc-02'],
        escolasNomes: ['EEIEF Manoel Joaquim de Santana']
      }
    ],
    valorTotalPedido: 6560.00,
    observacoes: 'Coleta quinzenal (2 entregas) para abastecer as escolas polo da Sede e Flecheiras.'
  }
];

export const INITIAL_ORDENS_COMPRA: OrdemCompra[] = [
  {
    id: 'oc-01',
    tenantId: 'coop-01',
    numeroOrdem: 'OC-2026-0088',
    solicitacaoId: 'sol-01',
    fornecedorId: 'forn-01',
    fornecedorNome: 'AgroPlast Embalagens Industriais Ltda',
    dataEmissao: '2026-08-01',
    dataPrevisaoEntrega: '2026-08-05',
    valorTotal: 1450.00,
    status: 'APROVADA',
    itens: [
      { descricao: 'Caixas Plásticas Vazadas para Frutas 50L', quantidade: 50, unidade: 'UN', precoUnitario: 25.00, subtotal: 1250.00 },
      { descricao: 'Sacos de Ráfia Milho/Feijão 50kg', quantidade: 100, unidade: 'UN', precoUnitario: 2.00, subtotal: 200.00 }
    ],
    condicaoPagamento: 'Faturado 30 dias',
    observacoes: 'Aprovado pelo Diretor Financeiro.'
  }
];


