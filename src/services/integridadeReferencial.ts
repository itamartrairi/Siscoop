/**
 * Integridade referencial do sistema.
 *
 * Regra: nenhum registro que esteja sendo usado por outra tabela pode ser
 * excluído. Antes de excluir, o CoopContext chama `encontrarVinculos` com
 * todas as listas carregadas; se houver qualquer referência ao registro
 * (campo `<entidade>Id` ou lista `<entidade>Ids`, em qualquer nível dos
 * objetos — inclusive itens de pedidos, notas etc.), a exclusão é bloqueada
 * e o usuário vê onde o registro está em uso.
 *
 * Para deixar de usar um registro sem perder o histórico, marque-o como
 * inativo em vez de excluir.
 */

export type EntidadeVinculavel =
  | 'cooperado'
  | 'produtor'
  | 'produto'
  | 'programa'
  | 'chamadaPublica'
  | 'prestacaoContas'
  | 'ordemCompra'
  | 'planoConta'
  | 'lancamentoContabil'
  | 'contaPagarReceber'
  | 'solicitacaoCompra'
  | 'fornecedor'
  | 'itemEstoque'
  | 'funcionario'
  | 'escola'
  | 'motorista'
  | 'contaBancaria'
  | 'maquina'
  | 'webhook';

/** Campos que, em qualquer outra tabela, apontam para a entidade. */
const CAMPOS_DE_VINCULO: Record<EntidadeVinculavel, string[]> = {
  cooperado: ['cooperadoId', 'cooperadoDestinoId'],
  produtor: ['produtorId', 'produtoresIds'],
  produto: ['produtoId', 'produtosIds'],
  programa: ['programaId'],
  chamadaPublica: ['chamadaPublicaId'],
  prestacaoContas: ['prestacaoContasId'],
  ordemCompra: ['comprasOrdemId', 'ordemCompraId'],
  planoConta: ['contaPaiId', 'planoContaId'],
  lancamentoContabil: ['contabilLancamentoId', 'lancamentoContabilId'],
  contaPagarReceber: ['financeiroLancamentoId', 'funruralContaPagarId', 'taxaAdministrativaContaReceberId', 'contaPagarReceberId'],
  solicitacaoCompra: ['solicitacaoId', 'solicitacaoCompraId'],
  fornecedor: ['fornecedorId'],
  itemEstoque: ['estoqueItemId', 'itemEstoqueId'],
  funcionario: ['funcionarioId'],
  escola: ['escolaId', 'escolasIds'],
  motorista: ['motoristaId'],
  contaBancaria: ['contaBancariaId'],
  maquina: ['maquinaId'],
  webhook: ['webhookId']
};

/**
 * Listas que não contam como "uso" de uma entidade.
 * - cooperado × produtores: o produtor rural é um espelho gerado a partir do
 *   cooperado (syncCooperadosWithProdutores); quem verifica o uso do produtor
 *   é o próprio CoopContext, separadamente.
 * - chamada pública × rateios: o rateio é parte da própria chamada
 *   (configuração dela), não um cadastro que a utiliza.
 */
const LISTAS_IGNORADAS: Partial<Record<EntidadeVinculavel, string[]>> = {
  cooperado: ['produtores'],
  chamadaPublica: ['rateiosChamadas']
};

/** Nome amigável de cada lista do CoopContext, para a mensagem ao usuário. */
const ROTULO_DA_LISTA: Record<string, string> = {
  users: 'usuário(s)',
  cooperados: 'cooperado(s)',
  transacoesCapital: 'transação(ões) de capital',
  assembleias: 'assembleia(s)',
  mandatos: 'mandato(s) da diretoria',
  produtores: 'produtor(es)',
  produtos: 'produto(s)',
  registrosProducao: 'registro(s) de produção',
  programas: 'programa(s) governamental(is)',
  chamadasPublicas: 'chamada(s) pública(s)',
  rateiosChamadas: 'rateio(s) de chamada pública',
  ofertasPAA: 'proposta(s) de oferta',
  programacoesEntrega: 'programação(ões) de entrega',
  prestacoesContas: 'prestação(ões) de contas',
  pedidosProdutorPAA: 'pedido(s) do produtor',
  ordensCompra: 'ordem(ns) de compra',
  planoContas: 'conta(s) do plano de contas',
  lancamentosContabeis: 'lançamento(s) contábil(eis)',
  patrimonio: 'item(ns) de patrimônio',
  contasPagarReceber: 'conta(s) a pagar/receber',
  solicitacoesCompra: 'solicitação(ões) de compra',
  fornecedores: 'fornecedor(es)',
  estoque: 'item(ns) de estoque',
  movimentacoesEstoque: 'movimentação(ões) de estoque',
  funcionariosRH: 'colaborador(es) do RH',
  folhaPagamento: 'folha(s) de pagamento',
  escolasPnae: 'escola(s)',
  motoristas: 'motorista(s)',
  contasBancarias: 'conta(s) bancária(s)',
  maquinas: 'máquina(s)',
  locacoesMaquinas: 'locação(ões) de máquina',
  entregasEscola: 'entrega(s) para escola',
  romaneiosMotorista: 'romaneio(s) de motorista',
  notasFiscais: 'nota(s) fiscal(is)',
  webhooks: 'webhook(s)',
  extratoBancario: 'extrato bancário'
};

export interface Vinculo {
  lista: string;
  rotulo: string;
  quantidade: number;
}

/** Referência extra por valor (ex.: lançamentos contábeis apontam a conta pelo código). */
export interface ReferenciaPorValor {
  campos: string[];
  valor: string | undefined | null;
}

const PROFUNDIDADE_MAXIMA = 6;

const apontaPara = (valor: unknown, alvo: string): boolean =>
  valor === alvo || (Array.isArray(valor) && valor.includes(alvo));

function contemReferencia(no: unknown, campos: Set<string>, alvo: string, extras: ReferenciaPorValor[], nivel = 0): boolean {
  if (!no || typeof no !== 'object' || nivel > PROFUNDIDADE_MAXIMA) return false;
  if (Array.isArray(no)) return no.some(item => contemReferencia(item, campos, alvo, extras, nivel + 1));

  for (const [chave, valor] of Object.entries(no as Record<string, unknown>)) {
    if (campos.has(chave) && apontaPara(valor, alvo)) return true;
    for (const extra of extras) {
      if (extra.valor && extra.campos.includes(chave) && valor === extra.valor) return true;
    }
    if (valor && typeof valor === 'object' && contemReferencia(valor, campos, alvo, extras, nivel + 1)) return true;
  }
  return false;
}

/**
 * Procura, em todas as listas informadas, registros que usam a entidade `id`.
 * O próprio registro (mesmo `id`) é desconsiderado.
 */
export function encontrarVinculos(
  entidade: EntidadeVinculavel,
  id: string,
  listas: Record<string, unknown>,
  extras: ReferenciaPorValor[] = []
): Vinculo[] {
  if (!id) return [];
  const campos = new Set(CAMPOS_DE_VINCULO[entidade]);
  const ignoradas = new Set(LISTAS_IGNORADAS[entidade] || []);
  const extrasValidos = extras.filter(e => !!e.valor);
  const vinculos: Vinculo[] = [];

  for (const [lista, conteudo] of Object.entries(listas)) {
    if (ignoradas.has(lista)) continue;
    const registros = Array.isArray(conteudo) ? conteudo : conteudo ? [conteudo] : [];
    const quantidade = registros.filter(registro => {
      if (!registro || typeof registro !== 'object') return false;
      if ((registro as { id?: unknown }).id === id) return false;
      return contemReferencia(registro, campos, id, extrasValidos);
    }).length;
    if (quantidade > 0) vinculos.push({ lista, rotulo: ROTULO_DA_LISTA[lista] || lista, quantidade });
  }
  return vinculos;
}

export const descreverVinculos = (vinculos: Vinculo[]): string =>
  vinculos.map(v => `• ${v.quantidade} ${v.rotulo}`).join('\n');

export const mensagemExclusaoBloqueada = (descricao: string, vinculos: Vinculo[]): string =>
  `Não é possível excluir ${descricao}: está em uso em outros cadastros.\n\n${descreverVinculos(vinculos)}\n\n` +
  'Remova ou altere esses registros antes de excluir. Se não for mais usar, marque o cadastro como inativo.';
