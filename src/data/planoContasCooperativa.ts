/**
 * Plano de Contas da cooperativa (baseado no balancete da Cooperativa
 * Agropecuária do Trairi Ltda.), com a conversão dos códigos do plano anterior.
 *
 * - Contas sintéticas totalizam; lançamentos só nas analíticas.
 * - 1 Ativo · 21/22 Passivo · 24 Patrimônio Líquido · 3 Resultado
 *   (31 ato cooperativo, 35 ato não cooperativo).
 * - Contas marcadas como "incluída pelo Siscoop" não estavam na planilha e
 *   foram criadas para manter os lançamentos automáticos do sistema.
 */
import { PlanoContaContabil } from '../types';

type LinhaPlano = [codigo: string, nome: string];

const CONTAS_PLANILHA: LinhaPlano[] = [
  ['1', "ATIVO"],
  ['11', "ATIVO CIRCULANTE"],
  ['111', "DISPONIBILIDADES"],
  ['11101', "CAIXA"],
  ['11101.0001', "Caixa Matriz"],
  ['11102', "BANCOS CONTA MOVIMENTO"],
  ['11102.0001', "Banco Bradesco – conta corrente"],
  ['11102.0005', "Banco do Nordeste – conta corrente"],
  ['11102.0006', "Caixa Econômica Federal – conta corrente"],
  ['11102.0007', "Banco do Nordeste – conta corrente"],
  ['11102.0009', "Banco Cresol – conta corrente"],
  ['11103', "BANCOS C/ APLICAÇÃO FINANCEIRA"],
  ['11103.0001', "Aplicação financeira – Bradesco"],
  ['11103.0004', "Aplicação financeira – Banco do Brasil"],
  ['11103.0006', "Aplicação financeira – Caixa Econômica Federal"],
  ['11103.0007', "Aplicação financeira – Banco do Nordeste"],
  ['112', "CLIENTES"],
  ['11201', "DUPLICATAS A RECEBER"],
  ['11201.0002', "Prefeitura Municipal de Trairi"],
  ['11201.0005', "CONAB"],
  ['11201.9999', "Duplicatas a Receber Diversas"],
  ['113', "OUTROS CRÉDITOS"],
  ['11301', "OUTROS CRÉDITOS"],
  ['11301.0001', "Devedores Diversos – Cooperai"],
  ['11306', "ADIANTAMENTOS"],
  ['11306.0332', "Adiantamento de 13º Salário"],
  ['11306.0900', "Adiantamentos Diversos a Fornecedores"],
  ['11307', "OUTROS CRÉDITOS"],
  ['11307.0998', "Perdas a Compensar entre os Associados"],
  ['11309', "TRIBUTOS A RECUPERAR/COMPENSAR"],
  ['11309.0303', "IRPJ a Recuperar"],
  ['11309.0313', "IRRF a Recuperar"],
  ['115', "ESTOQUES"],
  ['11501', "MERCADORIAS, PRODUTOS E INSUMOS"],
  ['11501.0009', "Mercadorias e Produtos adquiridos de Cooperados"],
  ['11501.9999', "Mercadorias e Produtos adquiridos de Terceiros"],
  ['11504', "MERCADORIAS, PRODUTOS E INSUMOS – ATO NÃO COOPERATIVO"],
  ['11504.0099', "Mercadorias e Produtos de Terceiros – Ato Não Cooperativo"],
  ['12', "ATIVO NÃO CIRCULANTE"],
  ['123', "IMOBILIZADO"],
  ['12302', "MÁQUINAS, EQUIPAMENTOS E INSTALAÇÕES"],
  ['12302.0001', "Imóveis"],
  ['12302.0002', "Instalações Industriais"],
  ['12302.0003', "Veículos e Acessórios"],
  ['12302.0004', "Móveis e Equipamentos de Escritório"],
  ['12302.0005', "Máquinas e Equipamentos"],
  ['12302.0006', "Computadores, Periféricos e Software"],
  ['12302.0007', "Benfeitorias em Imóvel Próprio"],
  ['12309', "(-) DEPRECIAÇÕES E AMORTIZAÇÕES"],
  ['12309.0001', "(-) Depreciações e Amortizações Acumuladas"],
  ['124', "INVESTIMENTOS"],
  ['12401', "INVESTIMENTOS"],
  ['12401.0001', "Participação no Capital de Outras Sociedades"],
  ['2', "PASSIVO"],
  ['21', "PASSIVO CIRCULANTE"],
  ['210', "ASSOCIADAS – CONTA MOVIMENTO"],
  ['21001', "ASSOCIADAS – CONTA MOVIMENTO"],
  ['21001.0001', "Associadas – Conta Movimento"],
  ['21001.0002', "Créditos de Associados c/ Aquisição de Bens de Revenda"],
  ['21001.0003', "Outros Créditos com Associados"],
  ['211', "EMPRÉSTIMOS E FINANCIAMENTOS"],
  ['21101', "EMPRÉSTIMOS E FINANCIAMENTOS"],
  ['21101.0002', "Empréstimos à Diretoria"],
  ['21101.0003', "Capital de Giro – Bradesco"],
  ['213', "FORNECEDORES"],
  ['21301', "FORNECEDORES ASSOCIADOS (COOPERADOS)"],
  ['21301.9999', "Fornecedores Associados Diversos"],
  ['21302', "FORNECEDORES DIVERSOS – PJ"],
  ['21302.0006', "Valnorte Ind. de Polpas de Frutas Ltda."],
  ['21302.0007', "Katia Oliveira Barbosa Vieira – ME"],
  ['21302.0008', "Coop. Agrop. Agricult. Familiar da Região NE do Ceará"],
  ['21302.0012', "Minerva S/A"],
  ['21302.0900', "Fornecedores Diversos"],
  ['214', "OBRIGAÇÕES TRIBUTÁRIAS"],
  ['21401', "IMPOSTOS E CONTRIBUIÇÕES A RECOLHER"],
  ['21401.0019', "COFINS a Recolher"],
  ['21401.0025', "Funrural a Recolher"],
  ['21401.0309', "PIS a Recolher"],
  ['21401.0310', "PIS a Recolher – outra natureza"],
  ['21401.0313', "IRRF-PJ a Recolher"],
  ['21401.0314', "CSSLL a Recolher"],
  ['21401.0315', "ISS a Recolher"],
  ['215', "OBRIGAÇÕES TRABALHISTAS E PREVIDENCIÁRIAS"],
  ['21501', "OBRIGAÇÕES TRABALHISTAS E PREVIDENCIÁRIAS"],
  ['21501.0301', "INSS a Recolher"],
  ['21501.0305', "FGTS a Recolher"],
  ['21501.0309', "PIS a Recolher s/Folha"],
  ['21501.0313', "IRRF a Recolher – Folha"],
  ['216', "SALÁRIOS A PAGAR"],
  ['21601', "SALÁRIOS A PAGAR"],
  ['21601.0099', "Ordenados, Salários, Gratificações e Outras Remunerações"],
  ['218', "PROVISÕES E ENCARGOS A REALIZAR"],
  ['21801', "PROVISÕES E ENCARGOS A REALIZAR"],
  ['21801.0050', "Provisões Diversas"],
  ['21801.0305', "Provisão para FGTS"],
  ['21801.0321', "Provisão para Férias"],
  ['21801.0332', "Provisão para 13º Salário"],
  ['219', "OUTRAS OBRIGAÇÕES"],
  ['21901', "OUTRAS OBRIGAÇÕES"],
  ['21901.0001', "Outras Obrigações"],
  ['21901.0002', "Adiantamento com Terceiros"],
  ['22', "PASSIVO NÃO CIRCULANTE"],
  ['221', "EMPRÉSTIMOS E FINANCIAMENTOS"],
  ['22101', "EMPRÉSTIMOS E FINANCIAMENTOS"],
  ['22101.0101', "Operação Capital de Giro – Bradesco"],
  ['24', "PATRIMÔNIO LÍQUIDO"],
  ['241', "CAPITAL SOCIAL"],
  ['24101', "CAPITAL SUBSCRITO"],
  ['24101.0002', "Capital Social Subscrito Próprio"],
  ['24102', "(-) CAPITAL A INTEGRALIZAR"],
  ['24102.0001', "(-) Capital a Integralizar – Associados"],
  ['242', "RESERVAS"],
  ['24201', "RESERVA"],
  ['24201.1000', "Fundo de Reserva"],
  ['244', "FATES"],
  ['24401', "FATES"],
  ['24401.0001', "FATES"],
  ['245', "SOBRAS E PERDAS ACUMULADAS"],
  ['24501', "SOBRAS E PERDAS ACUMULADAS"],
  ['24501.0002', "(-) Perdas Acumuladas"],
  ['3', "RESULTADO"],
  ['31', "RESULTADO LÍQUIDO DO PERÍODO ANTES DO IRPJ E CSLL"],
  ['311', "INGRESSOS E RECEITAS OPERACIONAIS"],
  ['31101', "INGRESSOS DE VENDAS NO MERCADO INTERNO"],
  ['31101.0001', "Produtos: Hortifrutigranjeiros (Frutas e Verduras)"],
  ['31101.0002', "Produtos: Polpa de Frutas"],
  ['31101.0003', "Produtos: Carnes e Frangos"],
  ['31101.0004', "Produtos: Feijão e Féculas"],
  ['31101.0009', "Mercadorias e Produtos Diversos"],
  ['31103', "INGRESSOS E OUTRAS RECEITAS OPERACIONAIS"],
  ['31103.0999', "Receita de Taxa de Administração"],
  ['31103.1999', "Outras Receitas Operacionais"],
  ['316', "CUSTO DOS PRODUTOS VENDIDOS NO MERCADO INTERNO"],
  ['31601', "CUSTO DOS PRODUTOS VENDIDOS NO MERCADO INTERNO"],
  ['31601.0009', "Custo das Mercadorias Revendidas"],
  ['319', "DISPÊNDIOS E DESPESAS OPERACIONAIS"],
  ['31901', "DISPÊNDIOS E DESPESAS DE ADMINISTRAÇÃO"],
  ['31901.0001', "Ordenados, Salários, Gratificações e Outras Remunerações"],
  ['31901.0003', "Despesas de Viagens, Diárias e Ajuda de Custos"],
  ['31901.0004', "Serviços Prestados por Pessoa Física"],
  ['31901.0005', "Serviços Prestados por Pessoa Jurídica"],
  ['31901.0009', "Aluguel e/ou Arrendamento"],
  ['31901.0010', "Software"],
  ['31901.0011', "Material de Escritório"],
  ['31901.0012', "Energia Elétrica"],
  ['31901.0013', "Material de Uso e Consumo"],
  ['31901.0014', "Alimentação e Refeições"],
  ['31901.0015', "Telefone e Internet"],
  ['31901.0016', "Combustíveis"],
  ['31901.0017', "Consertos, Manutenções e Peças"],
  ['31901.0018', "Água e Esgoto"],
  ['31901.0019', "Despesas com Transporte/Fretes/Viagens"],
  ['31901.0021', "Publicações, Jornais e Revistas"],
  ['31901.0022', "Laboratório – Análises"],
  ['31901.0039', "Taxas e Multas"],
  ['31901.0040', "Correios, Cartório e Xerox"],
  ['31901.0055', "Limpeza e Higienização de Dependências Internas"],
  ['31901.0056', "Certificação / Certificado Digital"],
  ['31901.0057', "Materiais de Reforma e Construção"],
  ['31901.0301', "Encargos Sociais – INSS"],
  ['31901.0305', "Encargos Sociais – FGTS"],
  ['31901.0309', "Outros Encargos – PIS"],
  ['31901.0333', "Contribuição Social, Assistencial e Cooperativista"],
  ['31901.0335', "IPVA/Licenciamento"],
  ['31901.0336', "Balança – Manutenção e Assistência Técnica"],
  ['31901.0999', "Diversos"],
  ['31902', "DISPÊNDIOS E DESPESAS DE VENDAS"],
  ['31902.0020', "Publicidade, Propaganda e Patrocínio"],
  ['31902.0337', "Comemorações e Eventos"],
  ['31903', "DISPÊNDIOS E DESPESAS TRIBUTÁRIAS"],
  ['31903.0022', "IRRF"],
  ['31903.0315', "ISS"],
  ['35', "RESULTADO LÍQUIDO DO PERÍODO ANTES DO IRPJ E CSLL"],
  ['351', "RECEITAS OPERACIONAIS – ATO NÃO COOPERATIVO"],
  ['35101', "RECEITAS DE VENDAS NO MERCADO INTERNO – ATO NÃO COOPERATIVO"],
  ['35101.0003', "Produtos: Carnes e Frangos"],
  ['35103', "OUTRAS RECEITAS OPERACIONAIS"],
  ['35103.0001', "Outras Receitas Operacionais – Adubo orgânico"],
  ['353', "RECEITAS FINANCEIRAS – ATO NÃO COOPERATIVO"],
  ['35301', "RECEITAS FINANCEIRAS – ATO NÃO COOPERATIVO"],
  ['35301.0010', "Receitas Financeiras – Aplicação"],
  ['35301.0999', "Outras Receitas Financeiras"],
  ['356', "CUSTOS DOS PRODUTOS VENDIDOS NO MERCADO INTERNO – ATO NÃO COOPERATIVO"],
  ['35601', "CUSTOS DOS PRODUTOS VENDIDOS NO MERCADO INTERNO – ATO NÃO COOPERATIVO"],
  ['35601.0009', "Custos das Mercadorias Vendidas – Ato não cooperativo"],
  ['357', "DESPESAS NÃO OPERACIONAIS – ATO NÃO COOPERATIVO"],
  ['35701', "DESPESAS NÃO OPERACIONAIS – ATO NÃO COOPERATIVO"],
  ['35701.0001', "Outras Despesas Não Operacionais – Ato não cooperativo"],
  ['359', "DESPESAS OPERACIONAIS – ATO NÃO COOPERATIVO"],
  ['35901', "DESPESAS DE ADMINISTRAÇÃO – ATO NÃO COOPERATIVO"],
  ['35901.0019', "Despesas com Transporte/Fretes/Viagens"],
  ['35901.0047', "Assessoria Técnica – PAA/CONAB-CDS"],
  ['35901.0048', "Assessoria Ambiental"],
  ['35901.0052', "Assessoria Contábil"],
  ['35901.0053', "Assessoria Técnica – Perícia"],
  ['35901.0054', "Assessoria Administrativa"],
  ['35904', "DESPESAS FINANCEIRAS – ATO NÃO COOPERATIVO"],
  ['35904.0020', "Tarifas Bancárias – Ato não cooperativo"],
  ['35904.0021', "IOF / Aplicação – Ato não cooperativo"],
  ['35904.0025', "Juros Pagos e Incorridos"],
];

/** Contas incluídas pelo Siscoop (não constavam na planilha). */
const CONTAS_INCLUIDAS: LinhaPlano[] = [
  ['11301.0099', 'Despesas do Exercício Seguinte'],
  ['11309.9999', 'Outros Tributos a Recuperar'],
  ['21401.9999', 'Outros Impostos a Recolher'],
  ['24501.0001', 'Sobras Acumuladas'],
  ['31901.0060', 'Depreciações e Amortizações'],
  ['35101.0009', 'Mercadorias e Produtos Diversos – Ato Não Cooperativo'],
  ['35103.0999', 'Outras Receitas Operacionais – Ato Não Cooperativo'],
  ['21401.0320', 'ICMS a Recolher'],
  ['21401.0321', 'Simples Nacional (DAS) a Recolher'],
  ['21401.0322', 'IRPJ a Recolher'],
  ['35903', 'DESPESAS TRIBUTÁRIAS – ATO NÃO COOPERATIVO'],
  ['35903.0001', 'ICMS sobre Vendas – Ato Não Cooperativo'],
  ['35903.0002', 'PIS sobre Vendas – Ato Não Cooperativo'],
  ['35903.0003', 'COFINS sobre Vendas – Ato Não Cooperativo'],
  ['35903.0004', 'Simples Nacional (DAS) – Ato Não Cooperativo'],
  ['35903.0005', 'IRPJ – Ato Não Cooperativo'],
  ['35903.0006', 'CSLL – Ato Não Cooperativo'],
];

export const CODIGOS_INCLUIDOS_PELO_SISTEMA = new Set(CONTAS_INCLUIDAS.map(([c]) => c));

/** Conta analítica de banco usada quando a conta bancária não tem conta contábil definida. */
export const CODIGO_BANCO_PADRAO = '11102.0001';

/** Conta pai: '11101.0001' → '11101' → '111' → '11' → '1'. */
export function codigoPai(codigo: string): string | undefined {
  if (codigo.includes('.')) return codigo.split('.')[0];
  if (codigo.length === 5) return codigo.slice(0, 3);
  if (codigo.length === 3) return codigo.slice(0, 2);
  if (codigo.length === 2) return codigo.slice(0, 1);
  return undefined;
}

function nivelDe(codigo: string): number {
  if (codigo.includes('.')) return 5;
  return codigo.length === 5 ? 4 : codigo.length;
}

function tipoDe(codigo: string): PlanoContaContabil['tipo'] {
  if (codigo.startsWith('1')) return 'ATIVO';
  if (codigo.startsWith('24')) return 'PATRIMONIO_LIQUIDO';
  if (codigo.startsWith('2')) return 'PASSIVO';
  if (/^3[15]6/.test(codigo)) return 'CUSTO';
  if (/^3(19|57|59)/.test(codigo)) return 'DESPESA';
  return 'RECEITA';
}

/** Contas redutoras ("contra") têm natureza invertida em relação ao grupo. */
function naturezaDe(codigo: string, tipo: PlanoContaContabil['tipo']): PlanoContaContabil['natureza'] {
  if (codigo.startsWith('12309')) return 'CREDORA'; // (-) Depreciações
  if (codigo.startsWith('24102') || codigo === '24501.0002') return 'DEVEDORA'; // (-) Capital a integralizar, (-) Perdas
  return tipo === 'ATIVO' || tipo === 'CUSTO' || tipo === 'DESPESA' ? 'DEVEDORA' : 'CREDORA';
}

function atoDe(codigo: string): PlanoContaContabil['atoCooperativo'] {
  if (codigo.startsWith('35') || codigo.startsWith('11504')) return 'NAO_COOPERATIVO' as PlanoContaContabil['atoCooperativo'];
  if (codigo.startsWith('31')) return 'COOPERATIVO' as PlanoContaContabil['atoCooperativo'];
  return 'AMBOS' as PlanoContaContabil['atoCooperativo'];
}

const ordenar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const PLANO_CONTAS_COOPERATIVA: PlanoContaContabil[] = [...CONTAS_PLANILHA, ...CONTAS_INCLUIDAS]
  .sort((a, b) => ordenar(a[0], b[0]))
  .map(([codigo, nome], i) => {
    const tipo = tipoDe(codigo);
    const analitica = codigo.includes('.');
    return {
      id: codigo,
      codigo,
      nome,
      contaPaiId: codigoPai(codigo),
      tipo,
      natureza: naturezaDe(codigo, tipo),
      nivel: nivelDe(codigo),
      tipoConta: analitica ? 'ANALITICA' : 'SINTETICA',
      aceitaLancamento: analitica,
      atoCooperativo: atoDe(codigo),
      ativo: true,
      ordemExibicao: i + 1,
      ...(CODIGOS_INCLUIDOS_PELO_SISTEMA.has(codigo) ? { observacao: 'Incluída pelo Siscoop para manter os lançamentos automáticos' } : {}),
    } as PlanoContaContabil;
  });

const PLANO_POR_CODIGO = new Map(PLANO_CONTAS_COOPERATIVA.map(c => [c.codigo, c]));

export const contaDoPlano = (codigo?: string) => (codigo ? PLANO_POR_CODIGO.get(codigo) : undefined);

/** Código do plano anterior → código do plano novo (contas analíticas). */
export const MAPA_CODIGOS_ANTERIORES: Record<string, string> = {
  '1.1.01.001': '11101.0001',
  '1.1.01.002': '11102.0001',
  '1.1.01.003': '11103.0001',
  '1.1.02.001': '11201.9999',
  '1.1.02.002': '11301.0001',
  '1.1.02.003': '11306.0900',
  '1.1.02.004': '11306.0900',
  '1.1.02.005': '11301.0001',
  '1.1.03.001': '11309.9999',
  '1.1.03.002': '11309.9999',
  '1.1.03.003': '11309.9999',
  '1.1.03.004': '11309.9999',
  '1.1.04.001': '11501.0009',
  '1.1.04.002': '11501.9999',
  '1.1.04.003': '11501.9999',
  '1.1.04.004': '11501.9999',
  '1.1.04.005': '11501.9999',
  '1.1.04.006': '11501.9999',
  '1.1.04.007': '11501.9999',
  '1.1.04.008': '11501.9999',
  '1.1.04.009': '11501.9999',
  '1.1.05.001': '11301.0099',
  '1.1.05.002': '11301.0099',
  '1.1.05.003': '11301.0099',
  '1.2.01.001': '11301.0001',
  '1.2.01.002': '11301.0001',
  '1.2.02.001': '12401.0001',
  '1.2.02.002': '12401.0001',
  '1.2.03.001': '12302.0001',
  '1.2.03.002': '12302.0001',
  '1.2.03.003': '12302.0005',
  '1.2.03.004': '12302.0003',
  '1.2.03.005': '12302.0004',
  '1.2.03.006': '12302.0006',
  '1.2.04.001': '12309.0001',
  '1.2.04.002': '12309.0001',
  '1.2.04.003': '12309.0001',
  '1.2.04.004': '12309.0001',
  '1.2.04.005': '12309.0001',
  '2.1.01.001': '21302.0900',
  '2.1.01.002': '21302.0900',
  '2.1.01.003': '21301.9999',
  '2.1.02.001': '21601.0099',
  '2.1.02.002': '21501.0301',
  '2.1.02.003': '21501.0305',
  '2.1.02.004': '21801.0321',
  '2.1.02.005': '21801.0332',
  '2.1.03.001': '21401.9999',
  '2.1.03.002': '21401.0309',
  '2.1.03.003': '21401.0019',
  '2.1.03.004': '21401.0313',
  '2.1.03.005': '21401.0025',
  '2.1.04.001': '21001.0001',
  '2.1.04.002': '21001.0003',
  '2.1.04.003': '21001.0003',
  '2.1.05.001': '21101.0003',
  '2.1.05.002': '21101.0003',
  '2.1.06.001': '21901.0001',
  '2.1.06.002': '21901.0002',
  '2.2.01.001': '22101.0101',
  '2.2.01.002': '22101.0101',
  '2.2.02.001': '22101.0101',
  '2.2.02.002': '22101.0101',
  '3.1.01.001': '24101.0002',
  '3.1.01.002': '24101.0002',
  '3.1.01.003': '24102.0001',
  '3.2.01.001': '24201.1000',
  '3.2.02.001': '24401.0001',
  '3.2.03.001': '24201.1000',
  '3.3.01.001': '24501.0001',
  '3.3.02.001': '24501.0002',
  '4.1.01.001': '31101.0009',
  '4.1.01.002': '31101.0009',
  '4.1.02.001': '31101.0009',
  '4.1.03.001': '31103.1999',
  '4.1.04.001': '31103.0999',
  '4.2.01.001': '35101.0009',
  '4.2.01.002': '35101.0009',
  '4.2.02.001': '35103.0999',
  '4.3.01.001': '35301.0999',
  '4.3.01.002': '35301.0010',
  '4.3.01.003': '35301.0999',
  '4.3.02.001': '31103.1999',
  '5.1.01.001': '31601.0009',
  '5.1.01.002': '31601.0009',
  '5.1.01.003': '31601.0009',
  '5.1.01.004': '31601.0009',
  '5.1.01.005': '31601.0009',
  '5.1.02.001': '31601.0009',
  '5.1.02.002': '31601.0009',
  '5.2.01.001': '35601.0009',
  '5.2.01.002': '35601.0009',
  '5.2.01.003': '35601.0009',
  '5.2.02.001': '35601.0009',
  '5.2.02.002': '35601.0009',
  '6.1.01.001': '31901.0001',
  '6.1.01.002': '31901.0301',
  '6.1.01.003': '31901.0001',
  '6.1.01.004': '31901.0001',
  '6.1.01.005': '31901.0999',
  '6.1.02.001': '31901.0012',
  '6.1.02.002': '31901.0018',
  '6.1.02.003': '31901.0015',
  '6.1.02.004': '31901.0011',
  '6.1.02.005': '31901.0055',
  '6.1.02.006': '35901.0052',
  '6.1.02.007': '31901.0005',
  '6.1.02.008': '31901.0009',
  '6.1.02.009': '31901.0999',
  '6.1.02.010': '31901.0017',
  '6.1.02.011': '31901.0060',
  '6.1.02.012': '31901.0003',
  '6.1.02.013': '31901.0016',
  '6.2.01.001': '31901.0019',
  '6.2.01.002': '31901.0999',
  '6.2.01.003': '31902.0020'
};

/**
 * Converte um código do plano anterior para o novo. Códigos sintéticos antigos
 * usam a primeira conta analítica convertida do mesmo grupo. Códigos que já são
 * do plano novo (ou personalizados) voltam sem alteração.
 */
export function converterCodigoContabil(codigo?: string): string | undefined {
  if (!codigo || !/^\d\.\d/.test(codigo)) return codigo;
  if (MAPA_CODIGOS_ANTERIORES[codigo]) return MAPA_CODIGOS_ANTERIORES[codigo];
  const filho = Object.keys(MAPA_CODIGOS_ANTERIORES).find(k => k.startsWith(codigo + '.'));
  return filho ? MAPA_CODIGOS_ANTERIORES[filho] : codigo;
}

/** Ajusta códigos e nomes de um lançamento para o plano novo (idempotente). */
export function migrarLancamentoContabil<T extends { contaDebitoCodigo?: string; contaCreditoCodigo?: string; contaDebitoNome?: string; contaCreditoNome?: string }>(l: T): T {
  const deb = converterCodigoContabil(l.contaDebitoCodigo);
  const cred = converterCodigoContabil(l.contaCreditoCodigo);
  const contaDeb = contaDoPlano(deb);
  const contaCred = contaDoPlano(cred);
  if (deb === l.contaDebitoCodigo && cred === l.contaCreditoCodigo && (!contaDeb || contaDeb.nome === l.contaDebitoNome) && (!contaCred || contaCred.nome === l.contaCreditoNome)) {
    return l;
  }
  return {
    ...l,
    contaDebitoCodigo: deb,
    contaDebitoNome: contaDeb ? contaDeb.nome : l.contaDebitoNome,
    contaCreditoCodigo: cred,
    contaCreditoNome: contaCred ? contaCred.nome : l.contaCreditoNome,
  };
}

export function migrarLancamentosContabeis<T extends { contaDebitoCodigo?: string; contaCreditoCodigo?: string }>(lista: T[]): T[] {
  let mudou = false;
  const nova = lista.map(l => {
    const m = migrarLancamentoContabil(l as any) as T;
    if (m !== l) mudou = true;
    return m;
  });
  return mudou ? nova : lista;
}
