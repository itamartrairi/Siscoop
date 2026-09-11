import { RegistroProducao } from '../types';

export interface ItemHistoricoProducao {
  produtoId: string;
  produtoNome: string;
  unidadeMedida: string;
  quantidadeKg: number;
}

/**
 * Expande os registros de produção de um produtor em uma lista "achatada"
 * de itens (um por produto), considerando que UM registro de produção pode
 * conter VÁRIOS produtos (campo `itens`, preenchido no formulário "Itens da
 * Produção" do Cadastro de Produção).
 *
 * Antes, os lugares que liam o histórico de produção para preencher a
 * Proposta de Oferta PAA/PNAE usavam apenas os campos legados de produto
 * único do registro (`produtoId`/`quantidadeEstimada`), que só guardam o
 * PRIMEIRO produto do registro — por isso um registro com 3 produtos
 * aparecia como apenas 1 item na proposta de oferta.
 *
 * Para registros antigos, sem o campo `itens` (só produto único), cai no
 * fallback dos campos legados normalmente.
 */
export function expandirItensHistoricoProducao(registros: RegistroProducao[]): ItemHistoricoProducao[] {
  const itens: ItemHistoricoProducao[] = [];

  for (const reg of registros) {
    if (reg.itens && reg.itens.length > 0) {
      for (const item of reg.itens) {
        if (!item.produtoId) continue;
        itens.push({
          produtoId: item.produtoId,
          produtoNome: item.produtoNome || 'Produto',
          unidadeMedida: item.unidadeMedida || 'KG',
          quantidadeKg: item.quantidadeEstimadaKg || 0
        });
      }
    } else if (reg.produtoId) {
      itens.push({
        produtoId: reg.produtoId,
        produtoNome: reg.produtoNome || 'Produto',
        unidadeMedida: reg.unidadeMedida || 'KG',
        quantidadeKg: reg.quantidadeEstimada || reg.quantidadeEstimadaKg || 0
      });
    }
  }

  return itens;
}
