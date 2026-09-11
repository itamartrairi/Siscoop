import { NotaFiscal, NotaFiscalItem, PedidoProdutorPAA, ProgramacaoEntregaPAA, ProdutorRural, EscolaPnae, SistemaTributarioNFe } from '../types';

export interface CronogramaReformaTributaria {
  ano: number;
  fase: string;
  descricao: string;
  aliquotaTesteCBS: number;
  aliquotaTesteIBS: number;
  vigente: boolean;
  status: 'EM_VIGOR' | 'PROXIMA_FASE' | 'FUTURA';
}

export const CRONOGRAMA_REFORMA_TRIBUTARIA: CronogramaReformaTributaria[] = [
  {
    ano: 2026,
    fase: 'Ano de Teste & Calibração Operacional',
    descricao: 'Início da cobrança teste da CBS (0,9%) e do IBS (0,1%), totalizando 1,0%, totalmente compensáveis com as contribuições ao PIS e à COFINS. Não há aumento da carga tributária.',
    aliquotaTesteCBS: 0.9,
    aliquotaTesteIBS: 0.1,
    vigente: true,
    status: 'EM_VIGOR'
  },
  {
    ano: 2027,
    fase: 'Extinção do PIS/COFINS & CBS Federal Plena',
    descricao: 'Extinção definitiva de PIS e COFINS. Entrada em vigor integral da CBS (Contribuição sobre Bens e Serviços) e do Imposto Seletivo (IS). Redução de 100% (alíquota zero) para Cesta Básica Nacional e isenção para a alimentação escolar da agricultura familiar.',
    aliquotaTesteCBS: 8.8,
    aliquotaTesteIBS: 0.1,
    vigente: false,
    status: 'PROXIMA_FASE'
  },
  {
    ano: 2029,
    fase: 'Início da Transição Gradual ICMS/ISS para o IBS (2029 a 2032)',
    descricao: 'Início da redução progressiva de 1/10 ao ano das alíquotas do ICMS estadual e ISS municipal, com incremento proporcional do IBS dos Estados e Municípios (2029: 90% ICMS/ISS e 10% IBS; 2030: 80%/20%; 2031: 70%/30%; 2032: 60%/40%).',
    aliquotaTesteCBS: 8.8,
    aliquotaTesteIBS: 17.7,
    vigente: false,
    status: 'FUTURA'
  },
  {
    ano: 2033,
    fase: 'Vigência Plena e Definitiva do Novo Sistema Tributário Unificado',
    descricao: 'Extinção completa e definitiva do ICMS e ISS. Vigência plena do IBS e da CBS (IVA Dual), com total simplificação, princípio do destino, não-cumulatividade plena e crédito presumido para cooperativas agropecuárias.',
    aliquotaTesteCBS: 8.8,
    aliquotaTesteIBS: 17.7,
    vigente: false,
    status: 'FUTURA'
  }
];

export const ALERTA_CRONOGRAMA_TEXTO = `⚠️ ALERTA OFICIAL - TRANSIÇÃO DA REFORMA TRIBUTÁRIA (EC 132/2023 & LC 68/2024):
• 2026 (Ano de Teste): Alíquotas de teste CBS 0,9% e IBS 0,1% compensáveis com PIS/COFINS.
• 2027: Extinção definitiva do PIS e COFINS; Implementação plena da CBS Federal e Imposto Seletivo.
• 2029-2032: Redução gradual de ICMS/ISS e transição para o IBS dos Estados/Municípios.
• 2033: Vigência plena e unificada do Novo Sistema Tributário (IVA Dual IBS + CBS).
• BENEFÍCIOS COOPERATIVOS: Alíquota Zero (0%) para alimentos da Cesta Básica Nacional, Regime do Ato Cooperativo e Crédito Presumido na aquisição de produtores rurais familiares.`;

/**
 * Calcula impostos tradicionais e do novo sistema tributário para um item
 */
export function calcularImpostosItem(
  valorTotalItem: number,
  tipoOperacao: 'ENTRADA_PRODUTOR' | 'SAIDA_PNAE_PAA' | 'SAIDA_VENDA' | string,
  sistema: SistemaTributarioNFe = 'TRADICIONAL_ATUAL',
  isentoCestaBasica: boolean = true
) {
  if (sistema === 'NOVO_SISTEMA_REFORMA_2026') {
    if (isentoCestaBasica || tipoOperacao === 'SAIDA_PNAE_PAA' || tipoOperacao === 'ENTRADA_PRODUTOR') {
      // Cesta Básica Nacional / PNAE / PAA / Ato Cooperativo: Alíquota 0% de CBS e IBS
      const creditoPresumido = tipoOperacao === 'ENTRADA_PRODUTOR' ? Number((valorTotalItem * 0.05).toFixed(2)) : 0;
      return {
        icmsAliquota: 0,
        icmsBaseCalculo: 0,
        icmsValor: 0,
        icmsCstCsosn: '400',
        pisAliquota: 0,
        pisValor: 0,
        cofinsAliquota: 0,
        cofinsValor: 0,
        funruralAliquota: tipoOperacao === 'ENTRADA_PRODUTOR' ? 1.5 : 0,
        funruralValor: tipoOperacao === 'ENTRADA_PRODUTOR' ? Number((valorTotalItem * 0.015).toFixed(2)) : 0,
        
        // Novo Sistema
        cbsAliquota: 0, // Alíquota Zero Cesta Básica / PNAE
        cbsValor: 0,
        ibsAliquota: 0, // Alíquota Zero Cesta Básica / PNAE
        ibsValor: 0,
        isAliquota: 0,
        isValor: 0,
        creditoPresumidoValor: creditoPresumido
      };
    } else {
      // Operação Comercial Comum sob a Reforma (Ano de Teste 2026)
      const cbsValor = Number((valorTotalItem * 0.009).toFixed(2)); // 0.9% teste
      const ibsValor = Number((valorTotalItem * 0.001).toFixed(2)); // 0.1% teste
      return {
        icmsAliquota: 18.0,
        icmsBaseCalculo: valorTotalItem,
        icmsValor: Number((valorTotalItem * 0.18).toFixed(2)),
        icmsCstCsosn: '102',
        pisAliquota: 0.65,
        pisValor: Number((valorTotalItem * 0.0065).toFixed(2)),
        cofinsAliquota: 3.0,
        cofinsValor: Number((valorTotalItem * 0.03).toFixed(2)),
        funruralAliquota: 0,
        funruralValor: 0,
        
        // Novo Sistema (2026 Teste)
        cbsAliquota: 0.9,
        cbsValor: cbsValor,
        ibsAliquota: 0.1,
        ibsValor: ibsValor,
        isAliquota: 0,
        isValor: 0,
        creditoPresumidoValor: 0
      };
    }
  }

  // Sistema Tradicional Atual
  if (tipoOperacao === 'SAIDA_PNAE_PAA') {
    // Isenção Estadual PNAE/PAA no Ceará
    return {
      icmsAliquota: 0,
      icmsBaseCalculo: 0,
      icmsValor: 0,
      icmsCstCsosn: '400', // Não Tributada
      pisAliquota: 0,
      pisValor: 0,
      cofinsAliquota: 0,
      cofinsValor: 0,
      funruralAliquota: 0,
      funruralValor: 0,
      cbsAliquota: 0,
      cbsValor: 0,
      ibsAliquota: 0,
      ibsValor: 0,
      isAliquota: 0,
      isValor: 0,
      creditoPresumidoValor: 0
    };
  } else if (tipoOperacao === 'ENTRADA_PRODUTOR') {
    // Entrada por Produtor (Compra de Produção Rural)
    const funrural = Number((valorTotalItem * 0.015).toFixed(2)); // 1.5% FUNRURAL/Senar
    return {
      icmsAliquota: 0,
      icmsBaseCalculo: 0,
      icmsValor: 0,
      icmsCstCsosn: '400',
      pisAliquota: 0,
      pisValor: 0,
      cofinsAliquota: 0,
      cofinsValor: 0,
      funruralAliquota: 1.5,
      funruralValor: funrural,
      cbsAliquota: 0,
      cbsValor: 0,
      ibsAliquota: 0,
      ibsValor: 0,
      isAliquota: 0,
      isValor: 0,
      creditoPresumidoValor: 0
    };
  } else {
    // Saída Venda Normal
    return {
      icmsAliquota: 18.0,
      icmsBaseCalculo: valorTotalItem,
      icmsValor: Number((valorTotalItem * 0.18).toFixed(2)),
      icmsCstCsosn: '102',
      pisAliquota: 0.65,
      pisValor: Number((valorTotalItem * 0.0065).toFixed(2)),
      cofinsAliquota: 3.0,
      cofinsValor: Number((valorTotalItem * 0.03).toFixed(2)),
      funruralAliquota: 0,
      funruralValor: 0,
      cbsAliquota: 0,
      cbsValor: 0,
      ibsAliquota: 0,
      ibsValor: 0,
      isAliquota: 0,
      isValor: 0,
      creditoPresumidoValor: 0
    };
  }
}
