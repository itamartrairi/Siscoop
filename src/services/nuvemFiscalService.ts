/**
 * Serviço de Integração com a API da Nuvem Fiscal (NF-e / SEFAZ)
 * Documentação: https://dev.nuvemfiscal.com.br
 */

import { NotaFiscal, SefazCeConfig } from '../types';

export interface NuvemFiscalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface NuvemFiscalNfeResponse {
  id: string;
  status: 'processando' | 'autorizada' | 'rejeitada' | 'cancelada' | 'erro';
  motivo_status?: string;
  ambiente: 'homologacao' | 'producao';
  chave?: string;
  data_evento?: string;
  numero?: number;
  serie?: string;
  autorizacao?: {
    protocolo?: string;
    data_recebimento?: string;
    motivo_status?: string;
    numero_protocolo?: string;
  };
  danfe_url?: string;
  xml_url?: string;
  mensagens?: Array<{ codigo: string; mensagem: string }>;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtém o Bearer Token via OAuth 2.0 (Client Credentials) na Nuvem Fiscal
 */
export async function obterTokenNuvemFiscal(config: SefazCeConfig): Promise<string> {
  const clientId = config.nuvemFiscalClientId?.trim();
  const clientSecret = config.nuvemFiscalClientSecret?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('Client ID ou Client Secret da Nuvem Fiscal não configurados.');
  }

  // Se o token ainda for válido (com 60s de folga), reutiliza
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'nfe cnpj');

  const response = await fetch('https://auth.nuvemfiscal.com.br/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na autenticação com a Nuvem Fiscal (${response.status}): ${errorText}`);
  }

  const data: NuvemFiscalTokenResponse = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return data.access_token;
}

/**
 * Converte a Nota Fiscal interna do Siscoop no schema JSON da Nuvem Fiscal
 */
export function converterParaPayloadNuvemFiscal(nf: NotaFiscal, config: SefazCeConfig) {
  const ambiente = (config.ambiente === 'PRODUCAO' ? 'producao' : 'homologacao');
  const cnpjClean = (nf.emitenteCnpjCpf || config.cnpjEmitente).replace(/\D/g, '');
  const destDocClean = (nf.destinatarioCnpjCpf || '').replace(/\D/g, '');
  const isCnpj = destDocClean.length > 11;

  return {
    ambiente,
    infNFe: {
      ide: {
        cUF: 23, // Ceará
        natOp: nf.naturezaOperacao || 'VENDA DE PRODUÇÃO DO ESTABELECIMENTO',
        mod: nf.modelo === 'NFCE_65' ? 65 : 55,
        serie: parseInt(nf.serie || '1', 10),
        nNF: parseInt(nf.numeroNota || '1', 10),
        dhEmi: new Date().toISOString(),
        tpNF: nf.tipoOperacao === 'ENTRADA_PRODUTOR' ? 0 : 1,
        idDest: 1, // Interna (dentro do estado)
        cMunFG: 2313501, // Trairi - CE
        tpImp: 1, // Retrato
        tpEmis: 1, // Normal
        tpAmb: ambiente === 'producao' ? 1 : 2,
        finNFe: 1, // Normal
        indFinal: 1, // Consumidor final
        indPres: 1, // Operação presencial
        procEmi: 0,
        verProc: 'SISCOOP-CE-1.0'
      },
      emit: {
        CNPJ: cnpjClean,
        xNome: nf.emitenteRazaoSocial || config.razaoSocialEmitente,
        IE: (nf.emitenteInscricaoEstadual || config.inscricaoEstadual || '').replace(/\D/g, ''),
        CRT: config.regimeTributario === 'REGIME_NORMAL' ? 3 : 1,
        enderEmit: {
          xLgr: nf.emitenteEndereco || 'Centro',
          nro: 'S/N',
          xBairro: nf.emitenteBairro || 'Centro',
          cMun: 2313501,
          xMun: nf.emitenteMunicipio || 'Trairi',
          UF: nf.emitenteUf || 'CE',
          CEP: (nf.emitenteCep || '62690000').replace(/\D/g, ''),
          cPais: 1058,
          xPais: 'Brasil'
        }
      },
      dest: {
        ...(isCnpj ? { CNPJ: destDocClean } : { CPF: destDocClean }),
        xNome: nf.destinatarioNome || 'Consumidor',
        indIEDest: nf.destinatarioInscricaoEstadual && nf.destinatarioInscricaoEstadual !== 'ISENTO' ? 1 : 9,
        ...(nf.destinatarioInscricaoEstadual && nf.destinatarioInscricaoEstadual !== 'ISENTO'
          ? { IE: nf.destinatarioInscricaoEstadual.replace(/\D/g, '') }
          : {}),
        enderDest: {
          xLgr: nf.destinatarioEndereco || 'Rua Principal',
          nro: 'S/N',
          xBairro: nf.destinatarioBairro || 'Centro',
          cMun: 2313501,
          xMun: nf.destinatarioMunicipio || 'Trairi',
          UF: nf.destinatarioUf || 'CE',
          CEP: (nf.destinatarioCep || '62690000').replace(/\D/g, ''),
          cPais: 1058,
          xPais: 'Brasil'
        }
      },
      det: (nf.itens || []).map((item, index) => ({
        nItem: index + 1,
        prod: {
          cProd: item.codigoProduto || `PROD-${index + 1}`,
          cEAN: 'SEM GTIN',
          xProd: item.descricao,
          NCM: (item.ncm || '08013100').replace(/\D/g, ''),
          CFOP: (item.cfop || '5101').replace(/\D/g, ''),
          uCom: item.unidade || 'UN',
          qCom: item.quantidade,
          vUnCom: item.valorUnitario,
          vProd: Number((item.quantidade * item.valorUnitario).toFixed(2)),
          cEANTrib: 'SEM GTIN',
          uTrib: item.unidade || 'UN',
          qTrib: item.quantidade,
          vUnTrib: item.valorUnitario,
          indTot: 1
        },
        imposto: {
          ICMS: {
            ICMSSN102: {
              orig: 0,
              CSOSN: '102' // Tributada pelo Simples Nacional sem permissão de crédito
            }
          },
          PIS: {
            PISNT: {
              CST: '07' // Operação Isenta da Contribuição
            }
          },
          COFINS: {
            COFINSNT: {
              CST: '07' // Operação Isenta da Contribuição
            }
          }
        }
      })),
      total: {
        ICMSTot: {
          vBC: 0,
          vICMS: 0,
          vICMSDeson: 0,
          vFCPUFDest: 0,
          vICMSUFDest: 0,
          vICMSUFRemet: 0,
          vFCP: 0,
          vBCST: 0,
          vST: 0,
          vFCPST: 0,
          vFCPSTRet: 0,
          vProd: Number(nf.valorProdutos.toFixed(2)),
          vFrete: Number((nf.valorFrete || 0).toFixed(2)),
          vSeg: 0,
          vDesc: Number((nf.valorDesconto || 0).toFixed(2)),
          vII: 0,
          vIPI: 0,
          vIPIDevol: 0,
          vPIS: 0,
          vCOFINS: 0,
          vOutro: 0,
          vNF: Number(nf.valorTotalNota.toFixed(2))
        }
      },
      transp: {
        modFrete: 9 // Sem ocorrência de transporte
      },
      pag: {
        detPag: [
          {
            tPag: '99', // Outros / A prazo
            vPag: Number(nf.valorTotalNota.toFixed(2))
          }
        ]
      },
      infAdic: {
        infCpl: nf.observacoesFiscais || 'Documento emitido por ME ou EPP optante pelo Simples Nacional. PNAE/PAA desoneração fiscal.'
      }
    }
  };
}

/**
 * Transmite a NF-e para a Nuvem Fiscal
 */
export async function transmitirParaNuvemFiscal(
  nf: NotaFiscal,
  config: SefazCeConfig
): Promise<{
  success: boolean;
  motivo: string;
  chaveAcesso?: string;
  protocolo?: string;
  danfePdfUrl?: string;
  xmlUrl?: string;
  nuvemFiscalId?: string;
}> {
  try {
    const token = await obterTokenNuvemFiscal(config);
    const payload = converterParaPayloadNuvemFiscal(nf, config);

    const response = await fetch('https://api.nuvemfiscal.com.br/nfe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const resJson: NuvemFiscalNfeResponse = await response.json();

    if (!response.ok) {
      const msgErro = resJson.mensagens?.map(m => m.mensagem).join(' | ') || resJson.motivo_status || 'Erro na requisição para Nuvem Fiscal';
      return {
        success: false,
        motivo: msgErro,
      };
    }

    if (resJson.status === 'autorizada') {
      return {
        success: true,
        motivo: resJson.motivo_status || 'Autorizado o uso da NF-e',
        chaveAcesso: resJson.chave,
        protocolo: resJson.autorizacao?.numero_protocolo || resJson.autorizacao?.protocolo,
        danfePdfUrl: resJson.danfe_url || `https://api.nuvemfiscal.com.br/nfe/${resJson.id}/pdf`,
        xmlUrl: resJson.xml_url || `https://api.nuvemfiscal.com.br/nfe/${resJson.id}/xml`,
        nuvemFiscalId: resJson.id,
      };
    }

    return {
      success: false,
      motivo: `Status Nuvem Fiscal: ${resJson.status} - ${resJson.motivo_status || 'Aguardando processamento'}`,
      nuvemFiscalId: resJson.id,
    };
  } catch (error: any) {
    return {
      success: false,
      motivo: error.message || 'Falha de conexão com a Nuvem Fiscal',
    };
  }
}
