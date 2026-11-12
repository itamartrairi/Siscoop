import React from 'react';
import { ItemEstoque, ProdutoAgro } from '../types';

/**
 * Lista de produtos usada nos formulários de Compras e de Vendas.
 *
 * Os produtos vêm de Cadastros Agropecuários → Produtos Agropecuários. O
 * valor do campo continua sendo o id do ITEM DE ESTOQUE (é ele que recebe a
 * entrada da compra e a baixa da venda); o item é criado/ligado
 * automaticamente pelo `garantirItemEstoqueDoProduto` do contexto.
 */
interface Props {
  /** Id do item de estoque gravado no item da compra/venda. */
  value?: string;
  produtos: ProdutoAgro[];
  estoque: ItemEstoque[];
  /** Recebe o produto escolhido (ou undefined ao limpar). */
  onSelect: (produto: ProdutoAgro | undefined) => void;
  className?: string;
  required?: boolean;
  /** Texto extra de cada opção (ex.: saldo e preço na venda). */
  detalhe?: (produto: ProdutoAgro, item?: ItemEstoque) => string;
}

export const ProdutoAgroSelect: React.FC<Props> = ({ value, produtos, estoque, onSelect, className, required, detalhe }) => {
  const itemAtual = value ? estoque.find(e => e.id === value) : undefined;
  const produtoAtualId = itemAtual?.produtoAgroId || '';
  // Compras/vendas antigas apontam para itens de estoque sem produto ligado:
  // continuam aparecendo para não perder o dado ao editar.
  const itemSemProduto = !!value && !produtoAtualId;

  return (
    <select
      required={required}
      value={itemSemProduto ? `estoque:${value}` : produtoAtualId}
      onChange={e => {
        const v = e.target.value;
        if (v.startsWith('estoque:')) return;
        onSelect(produtos.find(p => p.id === v));
      }}
      className={className}
    >
      <option value="">{produtos.length ? 'Selecione um produto' : 'Nenhum produto em Cadastros Agropecuários'}</option>
      {itemSemProduto && (
        <option value={`estoque:${value}`}>{itemAtual?.nomeItem || 'Item do estoque'} (cadastro antigo)</option>
      )}
      {produtos.map(p => {
        const item = estoque.find(e => e.produtoAgroId === p.id);
        const extra = detalhe ? detalhe(p, item) : '';
        return (
          <option key={p.id} value={p.id}>
            {p.codigo ? `${p.codigo} — ` : ''}{p.nome}{extra ? ` — ${extra}` : ''}
          </option>
        );
      })}
    </select>
  );
};
