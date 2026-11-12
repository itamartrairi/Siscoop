import { ProdutoAgro } from '../types';

/** Unidade do item de estoque correspondente à unidade do produto agropecuário. */
export const unidadeEstoqueDoProduto = (p?: Pick<ProdutoAgro, 'unidadeMedida'>): string => {
  const MAPA: Record<string, string> = { LITRO: 'L', CAIXA: 'CX', SACAS: 'SC', MACO: 'MAÇO' };
  const u = p?.unidadeMedida || 'UN';
  return MAPA[u] || u;
};

/** Categoria do item de estoque correspondente à categoria do produto agropecuário. */
export const categoriaEstoqueDoProduto = (p?: Pick<ProdutoAgro, 'categoria'>): string => {
  const MAPA: Record<string, string> = {
    HORTIFRUTI: 'Hortifruti', GRAOS: 'Grãos', LATICINIOS: 'Laticínios',
    PROCESSADOS: 'Processados', CARNES: 'Carnes', OUTROS: 'Produtos Agropecuários',
  };
  return (p?.categoria && MAPA[p.categoria]) || 'Produtos Agropecuários';
};
