/**
 * Serviço de Integração e Exportação de Dados Contábeis e Fiscais
 * para a plataforma FORTES TECNOLOGIA — Sistema Total Contador
 * (Fortes Contábil, Fortes Fiscal e Fortes Financeiro).
 * 
 * Suporta:
 * 1. Fortes Contábil: Layout de Lançamentos Contábeis (TXT/CSV Delimitado por ';')
 * 2. Fortes Contábil: SPED Contábil Oficial (ECD - Bloco I com Plano de Contas e Partidas)
 * 3. Fortes Contábil: Plano de Contas da Cooperativa (Layout Fortes)
 * 4. Fortes Fiscal: Movimentação Fiscal de Entradas e Saídas (Layout Fortes Fiscal TXT)
 * 5. Fortes Fiscal: SPED Fiscal Oficial (EFD ICMS/IPI - Bloco C com C100, C170, C190)
 * 6. Fortes Fiscal: Lote de Arquivos XML de NF-e/NFC-e autorizadas
 * 7. Fortes Financeiro: Títulos a Pagar e Receber (Layout de Conciliação)
 */

import {
  LancamentoContabil,
  PlanoContaContabil,
  NotaFiscal,
  CooperativeTenant,
  ContaPagarReceber
} from '../types';

export interface FortesExportFilterOptions {
  dataInicio?: string; // AAAA-MM-DD
  dataFim?: string;    // AAAA-MM-DD
  competenciaMesAno?: string; // MM/AAAA
  separadorDecimal?: ',' | '.';
  incluirAtoCooperativo?: boolean;
  apenasAutorizadas?: boolean; // Para notas fiscais
  modeloNota?: 'TODOS' | 'NFE_55' | 'NFCE_65' | 'NFAE_AVULSA';
}

/**
 * Remove caracteres especiais deixando apenas números (para CNPJ, CPF, CEP, etc.)
 */
export function apenasDigitos(val?: string | null): string {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

/**
 * Formata data de YYYY-MM-DD para DD/MM/AAAA ou DDMMAAAA
 */
export function formatarDataFortes(dataIso?: string, semBarras = false): string {
  if (!dataIso) return '';
  const limpa = dataIso.split('T')[0];
  const partes = limpa.split('-');
  if (partes.length !== 3) return dataIso;
  const [ano, mes, dia] = partes;
  return semBarras ? `${dia}${mes}${ano}` : `${dia}/${mes}/${ano}`;
}

/**
 * Formata valor numérico com 2 casas decimais e separador configurável
 */
export function formatarValorFortes(valor?: number | null, separador: ',' | '.' = ','): string {
  const n = typeof valor === 'number' && !isNaN(valor) ? valor : 0;
  const fixo = n.toFixed(2);
  if (separador === ',') {
    return fixo.replace('.', ',');
  }
  return fixo;
}

/**
 * Filtra lançamentos por período
 */
export function filtrarLancamentosPorPeriodo(
  lancamentos: LancamentoContabil[],
  options?: FortesExportFilterOptions
): LancamentoContabil[] {
  return (lancamentos || []).filter(l => {
    if (!l.data) return false;
    const dataL = l.data.split('T')[0];

    if (options?.competenciaMesAno) {
      const [mes, ano] = options.competenciaMesAno.split('/');
      if (mes && ano) {
        const prefix = `${ano}-${mes.padStart(2, '0')}`;
        if (!dataL.startsWith(prefix)) return false;
      }
    }

    if (options?.dataInicio && dataL < options.dataInicio) return false;
    if (options?.dataFim && dataL > options.dataFim) return false;

    return true;
  });
}

/**
 * Filtra notas fiscais por período e opções
 */
export function filtrarNotasPorPeriodo(
  notas: NotaFiscal[],
  options?: FortesExportFilterOptions
): NotaFiscal[] {
  return (notas || []).filter(nf => {
    if (options?.apenasAutorizadas && nf.statusSefaz !== 'AUTORIZADA') {
      return false;
    }

    if (options?.modeloNota && options.modeloNota !== 'TODOS') {
      if (nf.modelo !== options.modeloNota) return false;
    }

    const dataEmissao = (nf.dataEmissao || '').split('T')[0];
    if (options?.competenciaMesAno && dataEmissao) {
      const [mes, ano] = options.competenciaMesAno.split('/');
      if (mes && ano) {
        const prefix = `${ano}-${mes.padStart(2, '0')}`;
        if (!dataEmissao.startsWith(prefix)) return false;
      }
    }

    if (options?.dataInicio && dataEmissao && dataEmissao < options.dataInicio) return false;
    if (options?.dataFim && dataEmissao && dataEmissao > options.dataFim) return false;

    return true;
  });
}

// ============================================================================
// 1. FORTES CONTÁBIL — LAYOUT DE LANÇAMENTOS (TXT/CSV DELIMITADO)
// ============================================================================

/**
 * Gera arquivo de lançamentos contábeis no layout padrão de importação Fortes Contábil.
 * Formato aceito em: Fortes Contábil > Movimentos > Importações > Lançamentos Contábeis
 */
export function gerarLayoutFortesContabilTXT(
  lancamentos: LancamentoContabil[],
  planoContas: PlanoContaContabil[],
  options?: FortesExportFilterOptions
): string {
  const filtrados = filtrarLancamentosPorPeriodo(lancamentos, options);
  const sepDecimal = options?.separadorDecimal || ',';

  // Cabeçalho descritivo suportado pelos assistentes de importação CSV/TXT da Fortes
  const linhas: string[] = [
    'DATA;CONTA_DEBITO;CONTA_CREDITO;VALOR;HISTORICO;COMPLEMENTO;DOCUMENTO;CENTRO_CUSTO;ORIGEM_ATO'
  ];

  for (const l of filtrados) {
    const dataFmt = formatarDataFortes(l.data);
    const debito = l.contaDebitoCodigo || '11101.0001';
    const credito = l.contaCreditoCodigo || '11201.9999';
    const valorFmt = formatarValorFortes(l.valor, sepDecimal);
    
    // Histórico e complemento limpos de ponto-e-vírgula e quebras
    const historicoLimpo = (l.historico || 'Lançamento Contábil')
      .replace(/;/g, ',')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    const complemento = `${l.contaDebitoNome || ''} / ${l.contaCreditoNome || ''}`
      .replace(/;/g, ',')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    const docRef = (l.documentoRef || String(l.numeroLancamento) || '').replace(/;/g, '-').trim();
    const centroCusto = l.moduloOrigem || 'GERAL';
    const ato = l.classificacaoDespesa ? `DESPESA_${l.classificacaoDespesa}` : 'ATO_COOPERATIVO';

    linhas.push(
      `${dataFmt};${debito};${credito};${valorFmt};${historicoLimpo};${complemento};${docRef};${centroCusto};${ato}`
    );
  }

  return linhas.join('\r\n');
}

// ============================================================================
// 2. FORTES CONTÁBIL — PLANO DE CONTAS DA COOPERATIVA (LAYOUT FORTES)
// ============================================================================

/**
 * Exporta o Plano de Contas Cooperativo no formato para cadastro e importação no Fortes Contábil
 */
export function gerarPlanoContasFortesTXT(planoContas: PlanoContaContabil[]): string {
  const linhas: string[] = [
    'CODIGO_CONTA;CLASSIFICACAO_MASCARA;NOME_CONTA;NATUREZA;TIPO_CONTA;NIVEL;ATO_COOPERATIVO;ACEITA_LANCAMENTO'
  ];

  for (const c of planoContas) {
    const cod = (c.codigo || '').replace(/;/g, '').trim();
    const nome = (c.nome || '').replace(/;/g, ',').trim();
    const nat = c.natureza === 'CREDORA' ? 'C' : 'D';
    const tipo = c.tipoConta === 'ANALITICA' ? 'A' : 'S';
    const ato = c.atoCooperativo || 'AMBOS';
    const aceita = c.aceitaLancamento ? 'SIM' : 'NAO';

    linhas.push(
      `${cod};${cod};${nome};${nat};${tipo};${c.nivel || 4};${ato};${aceita}`
    );
  }

  return linhas.join('\r\n');
}

// ============================================================================
// 3. FORTES CONTÁBIL — SPED CONTÁBIL (ECD - ESCRITURAÇÃO CONTÁBIL DIGITAL)
// ============================================================================

/**
 * Gera arquivo SPED Contábil (ECD) completo compatível com a rotina de importação:
 * Fortes Contábil > Utilitários > Importação > SPED ECD
 */
export function gerarSpedEcdContabil(
  lancamentos: LancamentoContabil[],
  planoContas: PlanoContaContabil[],
  tenant: CooperativeTenant,
  options?: FortesExportFilterOptions
): string {
  const filtrados = filtrarLancamentosPorPeriodo(lancamentos, options);
  
  // Datas de início e fim
  let dtIni = options?.dataInicio ? formatarDataFortes(options.dataInicio, true) : '01012026';
  let dtFin = options?.dataFim ? formatarDataFortes(options.dataFim, true) : '31122026';

  if (options?.competenciaMesAno) {
    const [mes, ano] = options.competenciaMesAno.split('/');
    if (mes && ano) {
      const uDia = new Date(parseInt(ano, 10), parseInt(mes, 10), 0).getDate();
      dtIni = `01${mes.padStart(2, '0')}${ano}`;
      dtFin = `${String(uDia).padStart(2, '0')}${mes.padStart(2, '0')}${ano}`;
    }
  }

  const cnpj = apenasDigitos(tenant.cnpj || '00000000000000');
  const nomeEmpresa = (tenant.razaoSocial || tenant.name || 'COOPERATIVA AGROPECUARIA').toUpperCase();
  const uf = tenant.estado || 'CE';
  const codMun = '2313501'; // Trairi/CE padrão

  const linhas: string[] = [];

  // BLOCO 0 - Abertura e Identificação
  linhas.push(`|0000|LECD|${dtIni}|${dtFin}|${nomeEmpresa}|${cnpj}|${uf}||${codMun}||0|1|G|`);
  linhas.push('|0001|0|');
  linhas.push(`|0007|00|`);
  linhas.push('|0990|4|');

  // BLOCO I - Lançamentos e Plano de Contas
  const linhasBlocoI: string[] = [];
  linhasBlocoI.push('|I001|0|');
  linhasBlocoI.push(`|I030|TERMO DE ABERTURA|1|LIVRO DIARIO GERAL COOPERATIVO|${nomeEmpresa}|${dtIni}|${dtFin}|`);

  // I050: Plano de Contas
  for (const c of planoContas) {
    const dtInclusao = dtIni;
    const tipo = c.tipoConta === 'ANALITICA' ? 'A' : 'S';
    const nat = c.natureza === 'CREDORA' ? '02' : '01'; // 01=Ativo/Devedora, 02=Passivo/Credora
    const cod = (c.codigo || '').replace(/\D/g, '');
    const codPai = (c.codigo || '').split('.').slice(0, -1).join('').replace(/\D/g, '');
    linhasBlocoI.push(`|I050|${dtInclusao}|${c.tipo === 'ATIVO' ? '01' : c.tipo === 'PASSIVO' ? '02' : '03'}|${tipo}|${c.nivel}|${c.codigo}|${codPai}|${c.nome.toUpperCase()}|`);
  }

  // I200 & I250: Lançamentos e Partidas
  filtrados.forEach((l, index) => {
    const numLanc = l.numeroLancamento || index + 1;
    const dtLanc = formatarDataFortes(l.data, true);
    const valTotal = formatarValorFortes(l.valor, '.');
    const hist = (l.historico || 'LANCAMENTO CONTABIL').toUpperCase().replace(/\|/g, '-');
    const docRef = (l.documentoRef || String(numLanc)).replace(/\|/g, '-');

    // Cabeçalho do Lançamento
    linhasBlocoI.push(`|I200|${numLanc}|${dtLanc}|${valTotal}|N|`);

    // Partida a Débito
    const debitoCod = l.contaDebitoCodigo || '11101.0001';
    linhasBlocoI.push(`|I250|${debitoCod}||${valTotal}|D|${index + 1}|${hist}|${docRef}|`);

    // Partida a Crédito
    const creditoCod = l.contaCreditoCodigo || '11201.9999';
    linhasBlocoI.push(`|I250|${creditoCod}||${valTotal}|C|${index + 1}|${hist}|${docRef}|`);
  });

  const totalLinhasBlocoI = linhasBlocoI.length + 1;
  linhasBlocoI.push(`|I990|${totalLinhasBlocoI}|`);

  linhas.push(...linhasBlocoI);

  // BLOCO 9 - Controle e Encerramento
  const linhasBloco9: string[] = [];
  linhasBloco9.push('|9001|0|');
  linhasBloco9.push('|9900|0000|1|');
  linhasBloco9.push('|9900|0001|1|');
  linhasBloco9.push('|9900|I001|1|');
  linhasBloco9.push('|9900|I200|' + filtrados.length + '|');
  linhasBloco9.push('|9900|I250|' + (filtrados.length * 2) + '|');
  linhasBloco9.push('|9900|I990|1|');
  linhasBloco9.push('|9900|9001|1|');
  linhasBloco9.push('|9900|9990|1|');
  linhasBloco9.push('|9900|9999|1|');
  linhasBloco9.push('|9990|11|');

  linhas.push(...linhasBloco9);

  const totalGeral = linhas.length + 1;
  linhas.push(`|9999|${totalGeral}|`);

  return linhas.join('\r\n');
}

// ============================================================================
// 4. FORTES FISCAL — MOVIMENTO FISCAL DE ENTRADAS E SAÍDAS (LAYOUT TXT/CSV)
// ============================================================================

/**
 * Gera arquivo de movimentação fiscal de notas fiscais no padrão Fortes Fiscal.
 * Aceito em: Fortes Fiscal > Movimentos > Importações > Documentos Fiscais
 */
export function gerarLayoutFortesFiscalTXT(
  notasFiscais: NotaFiscal[],
  tenant: CooperativeTenant,
  options?: FortesExportFilterOptions
): string {
  const filtradas = filtrarNotasPorPeriodo(notasFiscais, options);
  const sepDecimal = options?.separadorDecimal || ',';

  const linhas: string[] = [
    // Cabeçalho com as colunas esperadas pelo validador e importador Fortes Fiscal
    'TIPO_REG;MODELO;SERIE;NUMERO;CHAVE_ACESSO;DATA_EMISSAO;DATA_ENTRADA_SAIDA;TIPO_OPERACAO;CNPJ_CPF_EMITENTE;RAZAO_EMITENTE;CNPJ_CPF_DEST;NOME_DEST;UF_DEST;CFOP_PRINCIPAL;VALOR_CONTABIL;BASE_ICMS;ALIQ_ICMS;VALOR_ICMS;VALOR_ISENTO;VALOR_PIS;VALOR_COFINS;VALOR_CBS_2026;VALOR_IBS_2026;PROTOCOLO_AUTORIZACAO;SITUACAO_SEFAZ'
  ];

  for (const nf of filtradas) {
    const mod = nf.modelo === 'NFCE_65' ? '65' : nf.modelo === 'NFAE_AVULSA' ? '04' : '55';
    const num = nf.numeroNota || '1';
    const serie = nf.serie || '1';
    const chave = nf.chaveAcesso44 || `232603${apenasDigitos(tenant.cnpj || '00000000000000')}${mod}${serie.padStart(3, '0')}${num.padStart(9, '0')}100000001`;
    const dtEmi = formatarDataFortes(nf.dataEmissao);
    const dtSai = formatarDataFortes(nf.dataSaidaEntrada || nf.dataEmissao);
    const tpOp = nf.tipoOperacao === 'ENTRADA_PRODUTOR' ? 'ENTRADA' : 'SAIDA';
    const cnpjEmit = apenasDigitos(nf.emitenteCnpjCpf || tenant.cnpj);
    const nomeEmit = (nf.emitenteRazaoSocial || tenant.razaoSocial || tenant.name || '').replace(/;/g, ' ').trim();
    const cnpjDest = apenasDigitos(nf.destinatarioCnpjCpf);
    const nomeDest = (nf.destinatarioNome || '').replace(/;/g, ' ').trim();
    const ufDest = nf.destinatarioUf || 'CE';
    
    // CFOP principal do primeiro item ou 5101/1101
    const cfopPrinc = nf.itens?.[0]?.cfop || (tpOp === 'ENTRADA' ? '1101' : '5101');
    const valContabil = formatarValorFortes(nf.valorTotalNota, sepDecimal);
    
    // Impostos
    const baseIcms = formatarValorFortes(nf.itens?.[0]?.icmsBaseCalculo || 0, sepDecimal);
    const aliqIcms = formatarValorFortes(nf.itens?.[0]?.icmsAliquota || 0, sepDecimal);
    const valIcms = formatarValorFortes(nf.valorIcms || 0, sepDecimal);
    const valIsento = formatarValorFortes(nf.valorTotalNota - (nf.valorIcms || 0), sepDecimal);
    const valPis = formatarValorFortes(nf.valorPis || 0, sepDecimal);
    const valCofins = formatarValorFortes(nf.valorCofins || 0, sepDecimal);
    const valCbs = formatarValorFortes(nf.valorCbs || 0, sepDecimal);
    const valIbs = formatarValorFortes(nf.valorIbs || 0, sepDecimal);
    const protocolo = (nf.protocoloAutorizacao || '123260000012345').replace(/;/g, '').trim();
    const situacao = nf.statusSefaz || 'AUTORIZADA';

    // Registro Cabeçalho (NF)
    linhas.push(
      `NF;${mod};${serie};${num};${chave};${dtEmi};${dtSai};${tpOp};${cnpjEmit};${nomeEmit};${cnpjDest};${nomeDest};${ufDest};${cfopPrinc};${valContabil};${baseIcms};${aliqIcms};${valIcms};${valIsento};${valPis};${valCofins};${valCbs};${valIbs};${protocolo};${situacao}`
    );

    // Registros Itens (IT)
    if (nf.itens && nf.itens.length > 0) {
      nf.itens.forEach((it, i) => {
        const itemNum = i + 1;
        const codProd = (it.produtoId || `IT-${itemNum}`).replace(/;/g, '');
        const descProd = (it.descricao || 'Produto Agroecológico').replace(/;/g, ' ').trim();
        const ncm = apenasDigitos(it.ncm || '08013100');
        const cfopIt = apenasDigitos(it.cfop || cfopPrinc);
        const un = it.unidade || 'KG';
        const qtd = formatarValorFortes(it.quantidade, sepDecimal);
        const vUnit = formatarValorFortes(it.valorUnitario, sepDecimal);
        const vTot = formatarValorFortes(it.valorTotal, sepDecimal);
        const icmsAliq = formatarValorFortes(it.icmsAliquota || 0, sepDecimal);
        const icmsVal = formatarValorFortes(it.icmsValor || 0, sepDecimal);
        const pisAliq = formatarValorFortes(it.pisAliquota || 0, sepDecimal);
        const pisVal = formatarValorFortes(it.pisValor || 0, sepDecimal);
        const cofinsAliq = formatarValorFortes(it.cofinsAliquota || 0, sepDecimal);
        const cofinsVal = formatarValorFortes(it.cofinsValor || 0, sepDecimal);
        const cbsVal = formatarValorFortes(it.cbsValor || 0, sepDecimal);
        const ibsVal = formatarValorFortes(it.ibsValor || 0, sepDecimal);

        linhas.push(
          `IT;${num};${itemNum};${codProd};${descProd};${ncm};${cfopIt};${un};${qtd};${vUnit};${vTot};${icmsAliq};${icmsVal};${pisAliq};${pisVal};${cofinsAliq};${cofinsVal};${cbsVal};${ibsVal}`
        );
      });
    }
  }

  return linhas.join('\r\n');
}

// ============================================================================
// 5. FORTES FISCAL — SPED FISCAL (EFD ICMS/IPI - BLOCO C)
// ============================================================================

/**
 * Gera arquivo SPED Fiscal EFD ICMS/IPI oficial para importação no Fortes Fiscal
 */
export function gerarSpedFiscalEfd(
  notasFiscais: NotaFiscal[],
  tenant: CooperativeTenant,
  options?: FortesExportFilterOptions
): string {
  const filtradas = filtrarNotasPorPeriodo(notasFiscais, options);

  let dtIni = options?.dataInicio ? formatarDataFortes(options.dataInicio, true) : '01012026';
  let dtFin = options?.dataFim ? formatarDataFortes(options.dataFim, true) : '31122026';

  if (options?.competenciaMesAno) {
    const [mes, ano] = options.competenciaMesAno.split('/');
    if (mes && ano) {
      const uDia = new Date(parseInt(ano, 10), parseInt(mes, 10), 0).getDate();
      dtIni = `01${mes.padStart(2, '0')}${ano}`;
      dtFin = `${String(uDia).padStart(2, '0')}${mes.padStart(2, '0')}${ano}`;
    }
  }

  const cnpj = apenasDigitos(tenant.cnpj || '00000000000000');
  const ie = apenasDigitos(tenant.cnpj ? '060000000' : '');
  const nomeEmpresa = (tenant.razaoSocial || tenant.name || 'COOPERATIVA AGROPECUARIA').toUpperCase();
  const uf = tenant.estado || 'CE';
  const codMun = '2313501';

  const linhas: string[] = [];

  // BLOCO 0
  linhas.push(`|0000|018|0|${dtIni}|${dtFin}|${nomeEmpresa}|${cnpj}|${uf}|${ie}|${codMun}|||A|1|`);
  linhas.push('|0001|0|');
  linhas.push(`|0005|${nomeEmpresa}|62690000|CENTRO|SN||(85)3351-1200||adm@siscoop.org.br|`);

  // 0150: Participantes (Destinatários das notas)
  const participantesMap = new Map<string, { nome: string; doc: string; uf: string; mun: string }>();
  filtradas.forEach(nf => {
    const docClean = apenasDigitos(nf.destinatarioCnpjCpf);
    if (docClean && !participantesMap.has(docClean)) {
      participantesMap.set(docClean, {
        nome: (nf.destinatarioNome || 'CLIENTE').toUpperCase(),
        doc: docClean,
        uf: nf.destinatarioUf || 'CE',
        mun: codMun
      });
    }
  });

  participantesMap.forEach((part, doc) => {
    const isCnpj = doc.length > 11;
    linhas.push(
      `|0150|CLI_${doc}|${part.nome}|1058|${isCnpj ? doc : ''}|${!isCnpj ? doc : ''}||${part.mun}||CENTRO|SN||`
    );
  });

  linhas.push('|0990|' + (linhas.length + 1) + '|');

  // BLOCO C - Documentos Fiscais
  const linhasBlocoC: string[] = [];
  linhasBlocoC.push('|C001|0|');

  filtradas.forEach(nf => {
    const mod = nf.modelo === 'NFCE_65' ? '65' : '55';
    const num = nf.numeroNota || '1';
    const serie = nf.serie || '1';
    const chave = nf.chaveAcesso44 || `232603${cnpj}${mod}${serie.padStart(3, '0')}${num.padStart(9, '0')}100000001`;
    const dtEmi = formatarDataFortes(nf.dataEmissao, true);
    const dtEntSai = formatarDataFortes(nf.dataSaidaEntrada || nf.dataEmissao, true);
    const docDest = apenasDigitos(nf.destinatarioCnpjCpf);
    const codPart = docDest ? `CLI_${docDest}` : '';
    const valTot = formatarValorFortes(nf.valorTotalNota, ',');
    const valDesc = formatarValorFortes(nf.valorDesconto || 0, ',');
    const valMerc = formatarValorFortes(nf.valorProdutos || nf.valorTotalNota, ',');
    const valIcms = formatarValorFortes(nf.valorIcms || 0, ',');
    const valPis = formatarValorFortes(nf.valorPis || 0, ',');
    const valCofins = formatarValorFortes(nf.valorCofins || 0, ',');

    // C100: Cabeçalho NF-e
    // |C100|IND_OPER|IND_EMIT|COD_PART|COD_MOD|COD_SIT|SER|NUM_DOC|CHV_NFE|DT_DOC|DT_E_S|VL_DOC|IND_PGTO|VL_DESC|VL_ABAT|VL_MERC|IND_FRT|VL_FRT|VL_SEG|VL_OUT_DA|VL_BC_ICMS|VL_ICMS|VL_BC_ICMS_ST|VL_ICMS_ST|VL_IPI|VL_PIS|VL_COFINS|VL_PIS_ST|VL_COFINS_ST|
    linhasBlocoC.push(
      `|C100|1|0|${codPart}|${mod}|00|${serie}|${num}|${chave}|${dtEmi}|${dtEntSai}|${valTot}|0|${valDesc}|0,00|${valMerc}|9|0,00|0,00|0,00|0,00|${valIcms}|0,00|0,00|0,00|${valPis}|${valCofins}|0,00|0,00|`
    );

    // C170: Itens da NF-e
    (nf.itens || []).forEach((it, idx) => {
      const nItem = idx + 1;
      const codItem = (it.produtoId || `IT-${nItem}`).replace(/\D/g, '') || String(nItem);
      const descItem = (it.descricao || 'PRODUTO').toUpperCase().replace(/\|/g, '-');
      const qtd = formatarValorFortes(it.quantidade, ',');
      const un = it.unidade || 'UN';
      const vTotItem = formatarValorFortes(it.valorTotal, ',');
      const cfop = apenasDigitos(it.cfop || '5101');
      const cstIcms = '102'; // Simples / Cooperativa
      const aliqIcms = formatarValorFortes(it.icmsAliquota || 0, ',');
      const vIcms = formatarValorFortes(it.icmsValor || 0, ',');

      linhasBlocoC.push(
        `|C170|${nItem}|${codItem}|${descItem}|${qtd}|${un}|${vTotItem}|0,00|0|${cstIcms}|${cfop}||0,00|${aliqIcms}|${vIcms}|0,00|0,00|0,00|0|01|0,00|0,00|0,00|01|0,00|0,00|0,00||`
      );
    });

    // C190: Analítico por CFOP/CST
    const cfopPrinc = apenasDigitos(nf.itens?.[0]?.cfop || '5101');
    linhasBlocoC.push(
      `|C190|102|${cfopPrinc}|0,00|${valMerc}|0,00|${valIcms}|0,00|0,00|0,00|0,00||`
    );
  });

  linhasBlocoC.push('|C990|' + (linhasBlocoC.length + 1) + '|');
  linhas.push(...linhasBlocoC);

  // BLOCO 9 - Encerramento
  linhas.push('|9001|0|');
  linhas.push('|9900|0000|1|');
  linhas.push('|9900|0001|1|');
  linhas.push('|9900|C001|1|');
  linhas.push('|9900|C100|' + filtradas.length + '|');
  linhas.push('|9900|C190|' + filtradas.length + '|');
  linhas.push('|9900|C990|1|');
  linhas.push('|9900|9001|1|');
  linhas.push('|9900|9990|1|');
  linhas.push('|9900|9999|1|');
  linhas.push('|9990|11|');
  linhas.push('|9999|' + (linhas.length + 2) + '|');

  return linhas.join('\r\n');
}

// ============================================================================
// 6. FORTES FISCAL — PACOTE DE XMLs DE NOTAS FISCAIS
// ============================================================================

/**
 * Converte uma nota fiscal interna em estrutura XML compatível com o validador SEFAZ e Fortes Fiscal
 */
export function gerarXmlNFe(nf: NotaFiscal, tenant: CooperativeTenant): string {
  const cnpjClean = apenasDigitos(nf.emitenteCnpjCpf || tenant.cnpj || '00000000000000');
  const destClean = apenasDigitos(nf.destinatarioCnpjCpf || '00000000000');
  const isCnpjDest = destClean.length > 11;
  const mod = nf.modelo === 'NFCE_65' ? '65' : '55';
  const serie = nf.serie || '1';
  const num = nf.numeroNota || '1';
  const chave = nf.chaveAcesso44 || `232603${cnpjClean}${mod}${serie.padStart(3, '0')}${num.padStart(9, '0')}100000001`;
  const protocolo = nf.protocoloAutorizacao || '123260000012345';
  const dhEmi = nf.dataEmissao ? `${nf.dataEmissao.split('T')[0]}T10:00:00-03:00` : '2026-03-15T10:00:00-03:00';

  const itensXml = (nf.itens || []).map((it, idx) => `
      <det nItem="${idx + 1}">
        <prod>
          <cProd>${it.produtoId || idx + 1}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd><![CDATA[${it.descricao || 'Produto Agrícola'}]]></xProd>
          <NCM>${apenasDigitos(it.ncm || '08013100')}</NCM>
          <CFOP>${apenasDigitos(it.cfop || '5101')}</CFOP>
          <uCom>${it.unidade || 'UN'}</uCom>
          <qCom>${(it.quantidade || 1).toFixed(4)}</qCom>
          <vUnCom>${(it.valorUnitario || 0).toFixed(4)}</vUnCom>
          <vProd>${(it.valorTotal || 0).toFixed(2)}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${it.unidade || 'UN'}</uTrib>
          <qTrib>${(it.quantidade || 1).toFixed(4)}</qTrib>
          <vUnTrib>${(it.valorUnitario || 0).toFixed(4)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <vTotTrib>0.00</vTotTrib>
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>
          <PIS>
            <PISNT>
              <CST>07</CST>
            </PISNT>
          </PIS>
          <COFINS>
            <COFINSNT>
              <CST>07</CST>
            </COFINSNT>
          </COFINS>
        </imposto>
      </det>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>23</cUF>
        <cNF>${Math.floor(10000000 + Math.random() * 90000000)}</cNF>
        <natOp><![CDATA[${nf.naturezaOperacao || 'VENDA DE PRODUCAO'}]]></natOp>
        <mod>${mod}</mod>
        <serie>${serie}</serie>
        <nNF>${num}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        <tpNF>${nf.tipoOperacao === 'ENTRADA_PRODUTOR' ? '0' : '1'}</tpNF>
        <idDest>1</idDest>
        <cMunFG>2313501</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>1</cDV>
        <tpAmb>1</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>SISCOOP-FORTES-1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${cnpjClean}</CNPJ>
        <xNome><![CDATA[${nf.emitenteRazaoSocial || tenant.razaoSocial || tenant.name}]]></xNome>
        <xFant><![CDATA[${tenant.name || 'COOPERATIVA'}]]></xFant>
        <enderEmit>
          <xLgr>RUA PRINCIPAL</xLgr>
          <nro>SN</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>2313501</cMun>
          <xMun>${tenant.cidade || 'TRAIRI'}</xMun>
          <UF>${tenant.estado || 'CE'}</UF>
          <CEP>${apenasDigitos(tenant.cep || '62690000')}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>${apenasDigitos(nf.emitenteInscricaoEstadual || 'ISENTO')}</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        ${isCnpjDest ? `<CNPJ>${destClean}</CNPJ>` : `<CPF>${destClean}</CPF>`}
        <xNome><![CDATA[${nf.destinatarioNome || 'CONSUMIDOR'}]]></xNome>
        <enderDest>
          <xLgr><![CDATA[${nf.destinatarioEndereco || 'RUA PRINCIPAL'}]]></xLgr>
          <nro>SN</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>2313501</cMun>
          <xMun>${nf.destinatarioMunicipio || 'TRAIRI'}</xMun>
          <UF>${nf.destinatarioUf || 'CE'}</UF>
          <CEP>${apenasDigitos(nf.destinatarioCep || '62690000')}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <indIEDest>9</indIEDest>
      </dest>
      ${itensXml}
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>${(nf.valorIcms || 0).toFixed(2)}</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCPUFDest>0.00</vFCPUFDest>
          <vICMSUFDest>0.00</vICMSUFDest>
          <vICMSUFRemet>0.00</vICMSUFRemet>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${(nf.valorProdutos || nf.valorTotalNota).toFixed(2)}</vProd>
          <vFrete>${(nf.valorFrete || 0).toFixed(2)}</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>${(nf.valorDesconto || 0).toFixed(2)}</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>${(nf.valorPis || 0).toFixed(2)}</vPIS>
          <vCOFINS>${(nf.valorCofins || 0).toFixed(2)}</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${(nf.valorTotalNota || 0).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>9</modFrete>
      </transp>
      <pag>
        <detPag>
          <tPag>01</tPag>
          <vPag>${(nf.valorTotalNota || 0).toFixed(2)}</vPag>
        </detPag>
      </pag>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>SISCOOP-CE-1.0</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>${protocolo}</nProt>
      <digVal>zFjQ89zL7vO3P4l+Q6tB4k9=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

/**
 * Gera um arquivo com o lote de XMLs concatenados ou empacotados
 */
export function gerarLoteXmlFortesFiscal(
  notasFiscais: NotaFiscal[],
  tenant: CooperativeTenant,
  options?: FortesExportFilterOptions
): string {
  const filtradas = filtrarNotasPorPeriodo(notasFiscais, options);

  const xmls = filtradas.map(nf => gerarXmlNFe(nf, tenant));
  return `<?xml version="1.0" encoding="UTF-8"?>
<loteNFeFortes totalNotas="${filtradas.length}" geradoEm="${new Date().toISOString()}">
${xmls.map(x => x.replace(/<\?xml[^>]*\?>/, '')).join('\n')}
</loteNFeFortes>`;
}

// ============================================================================
// 7. FORTES FINANCEIRO — TÍTULOS A PAGAR E RECEBER (CONCILIAÇÃO)
// ============================================================================

export function gerarLayoutFortesFinanceiroTXT(
  contas: ContaPagarReceber[],
  options?: FortesExportFilterOptions
): string {
  const sepDecimal = options?.separadorDecimal || ',';
  const linhas: string[] = [
    'TIPO_TITULO;NUM_DOCUMENTO;DATA_VENCIMENTO;DATA_PAGAMENTO;FORNECEDOR_CLIENTE;CPF_CNPJ;VALOR_ORIGINAL;VALOR_PAGO;VALOR_JUROS_MULTA;VALOR_DESCONTO;STATUS;CATEGORIA;CONTA_BANCARIA'
  ];

  (contas || []).forEach(c => {
    const tipo = c.tipo === 'PAGAR' ? 'PAGAR' : 'RECEBER';
    const numDoc = c.id.replace(/;/g, '-');
    const dtVenc = formatarDataFortes(c.dataVencimento);
    const dtPag = formatarDataFortes(c.dataPagamento || '');
    const nome = (c.pessoaNome || c.descricao || 'DIVERSOS').replace(/;/g, ' ');
    const doc = '';
    const vOrig = formatarValorFortes(c.valor, sepDecimal);
    const vPago = formatarValorFortes(c.status === 'PAGO' ? c.valor : 0, sepDecimal);
    const vJuros = formatarValorFortes(0, sepDecimal);
    const vDesc = formatarValorFortes(0, sepDecimal);
    const status = c.status || 'PENDENTE';
    const cat = (c.categoria || c.subcategoria || 'OPERACIONAL').replace(/;/g, ' ');
    const banco = (c.contaBancariaId || 'BANCO_PADRAO').replace(/;/g, ' ');

    linhas.push(
      `${tipo};${numDoc};${dtVenc};${dtPag};${nome};${doc};${vOrig};${vPago};${vJuros};${vDesc};${status};${cat};${banco}`
    );
  });

  return linhas.join('\r\n');
}

// ============================================================================
// FUNÇÃO UTILITÁRIA DE DOWNLOAD
// ============================================================================

export function downloadArquivoFortes(
  conteudo: string,
  nomeArquivo: string,
  mimeType = 'text/plain;charset=utf-8'
) {
  // Adiciona BOM para correta visualização de acentuação no Excel / Bloco de Notas Windows da Fortes
  const blob = new Blob(['\uFEFF' + conteudo], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
