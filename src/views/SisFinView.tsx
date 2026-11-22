import { linhasDoFluxo, montarFluxoCaixa, tipoAtividadeCaixa, TIPOS_ENTRADA_CAIXA, TIPOS_SAIDA_CAIXA, type LinhaDemonstrativo } from '../data/fluxoCaixaCooperativa';
import { montarResultadoCooperativa } from '../data/rubricasCooperativa';
import { DemonstracoesContabeis, exportarPdf } from '../components/DemonstracoesContabeis';
import { listarCategoriasEstoque } from '../components/ProdutosTab';
import { NavegacaoSecoes } from '../components/ui/NavegacaoSecoes';
import { formatarData } from '../utils/dateHelpers';
import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { ContasBancariasTab, SelectContaBancaria, nomeContaBancaria } from '../components/ContasBancariasTab';
import { RelatoriosPdfTab } from '../components/RelatoriosPdfTab';
import {
  ChevronRight,
  CircleDollarSign,
  Plus,
  Landmark,
  BarChart3,
  FileText,
  Pencil,
  Trash2,
  X,
  TrendingUp,
  WalletCards,
  Scale,
  PieChart as PieChartIcon,
  Printer
} from 'lucide-react';
import type { ContaBancaria, ContaPagarReceber, ExtratoBancario } from '../types';
import { DataGrid, GridStatus } from '../components/ui/DataGrid';
import { CheckCircle2 } from 'lucide-react';
import { playActionCompleteSound } from '../utils/actionSound';
import jsPDF from 'jspdf';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

// Presets de Categoria/Subcategoria de despesas e receitas, cada um já
// classificado como Fixa (se repete todo mês com valor estável) ou
// Variável (depende do volume de produção/vendas do mês). Selecionar um
// preset preenche os três campos de uma vez, mas a classificação continua
// editável manualmente se o caso for atípico.
const CATEGORIAS_FINANCEIRAS: { categoria: string; subcategoria: string; classificacao: 'FIXA' | 'VARIAVEL' }[] = [
  { categoria: 'Fornecedores e Insumos', subcategoria: 'Produtores Rurais (Pagamento por Produção)', classificacao: 'VARIAVEL' },
  { categoria: 'Fornecedores e Insumos', subcategoria: 'Compras de Insumos e Materiais', classificacao: 'VARIAVEL' },
  { categoria: 'Pessoal', subcategoria: 'Salários e Encargos', classificacao: 'FIXA' },
  { categoria: 'Pessoal', subcategoria: 'Vale Transporte / Alimentação', classificacao: 'FIXA' },
  { categoria: 'Impostos e Contribuições', subcategoria: 'FUNRURAL', classificacao: 'VARIAVEL' },
  { categoria: 'Impostos e Contribuições', subcategoria: 'Impostos Federais/Estaduais', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Aluguel', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Água / Energia / Internet', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Software e Assinaturas', classificacao: 'FIXA' },
  { categoria: 'Logística', subcategoria: 'Combustível', classificacao: 'VARIAVEL' },
  { categoria: 'Logística', subcategoria: 'Manutenção de Veículos', classificacao: 'VARIAVEL' },
  { categoria: 'Logística', subcategoria: 'Frete e Transporte', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Venda PNAE/PAA', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Venda comercial', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Insumos e embalagens vendidos aos cooperados', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Serviços técnicos e beneficiamento', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Serviços a não cooperados', classificacao: 'VARIAVEL' },
  { categoria: 'Beneficiamento', subcategoria: 'Custos diretos de beneficiamento', classificacao: 'VARIAVEL' },
  { categoria: 'Administrativo', subcategoria: 'Assistência técnica (ATER)', classificacao: 'VARIAVEL' },
  { categoria: 'Pessoal', subcategoria: 'Pró-labore e gestão', classificacao: 'FIXA' },
  { categoria: 'Receitas', subcategoria: 'Taxa Administrativa', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Capital Social', classificacao: 'FIXA' },
  { categoria: 'Receitas', subcategoria: 'Venda de Mercadorias a Terceiros', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Rendimentos de Aplicações Financeiras', classificacao: 'VARIAVEL' },
  { categoria: 'Receitas', subcategoria: 'Juros Recebidos de Cooperados', classificacao: 'VARIAVEL' },
  { categoria: 'Administrativo', subcategoria: 'Despesas Administrativas Comuns', classificacao: 'FIXA' },
  { categoria: 'Pessoal', subcategoria: 'Pessoal Administrativo Comum', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Energia, Água e Telecomunicações Comuns', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Contabilidade, Auditoria e Jurídico Comuns', classificacao: 'FIXA' },
  { categoria: 'Administrativo', subcategoria: 'Assembleias e Conselhos', classificacao: 'VARIAVEL' },
  { categoria: 'Logística', subcategoria: 'Comissões sobre Vendas a Terceiros', classificacao: 'VARIAVEL' },
  { categoria: 'Outros', subcategoria: 'Diversos', classificacao: 'VARIAVEL' }
];

const MOEDA_FLUXO = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MES_FLUXO = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const rotuloMesFluxo = (periodo: string) => MES_FLUXO.format(new Date(`${periodo}-01T00:00:00Z`));
const formatarValor = (valor: number) => valor < 0
  ? `(${MOEDA_FLUXO.format(-valor)})` : MOEDA_FLUXO.format(valor);
const valorFluxo = (valor: number) => (
  <span className={valor < 0 ? 'text-rose-700' : 'text-slate-900'}>{formatarValor(valor)}</span>
);

function linhaFluxo(nome: string, valores: number[], detalhe = false, chave = nome) {
  return (
    <tr key={chave} className={detalhe ? 'bg-white' : 'bg-slate-50 font-semibold'}>
      <th scope="row" className={`sticky left-0 z-10 text-left ${detalhe ? 'bg-white !pl-6 font-normal' : 'bg-slate-50'}`}>{nome}</th>
      {valores.map((valor, indice) => <td key={indice} className="whitespace-nowrap text-right tabular-nums">{valorFluxo(valor)}</td>)}
    </tr>
  );
}

function LinhaExpansivel({ linha, nivel = 0 }: {
  linha: LinhaDemonstrativo;
  nivel?: number;
}) {
  const [aberta, setAberta] = useState(nivel === 0 && /^1\.[12]/.test(linha.nome));
  const filhos = linha.filhos ?? [];

  return (
    <>
      <tr className={nivel ? 'bg-white' : 'bg-slate-50 font-semibold'}>
        <th scope="row" className={`sticky left-0 z-10 text-left ${nivel ? 'bg-white font-normal' : 'bg-slate-50'}`}>
          <div style={{ marginInlineStart: `${nivel * 1.15}rem` }}>
            {filhos.length > 0 ? (
              <button type="button" aria-expanded={aberta} onClick={() => setAberta(valor => !valor)}
                className="inline-flex items-center gap-2 rounded px-1 py-1 text-left font-inherit hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-700">
                <ChevronRight className={`h-4 w-4 shrink-0 ${aberta ? 'rotate-90' : ''}`} aria-hidden="true" />
                {linha.nome}
              </button>
            ) : <span className="inline-block py-1 pl-6">{linha.nome}</span>}
          </div>
        </th>
        {linha.valores.map((valor, indice) => <td key={indice} className="whitespace-nowrap text-right tabular-nums">{valorFluxo(valor || 0)}</td>)}
      </tr>
      {aberta && filhos.map(filho => (
        <LinhaExpansivel key={filho.id ?? filho.nome} linha={filho} nivel={nivel + 1} />
      ))}
    </>
  );
}

type MovimentoConciliacao = { data: string; centavos: number; historico: string };
type ArquivoConciliacao = { nome: string; inicio: string; fim: string; movimentos: MovimentoConciliacao[] };

function lerExtratoOfx(conteudo: string, nome: string): ArquivoConciliacao {
  const listas = [...conteudo.matchAll(/<BANKTRANLIST\s*>([\s\S]*?)<\/BANKTRANLIST\s*>/gi)];
  if (listas.length !== 1) throw new Error('Selecione um arquivo OFX com o extrato de uma única conta.');
  const secao = listas[0][1];
  const campo = (texto: string, tag: string) => texto.match(new RegExp(`<${tag}\\s*>([^<\\r\\n]*)`, 'i'))?.[1].trim();
  const moedaArquivo = campo(conteudo, 'CURDEF');
  if (moedaArquivo && moedaArquivo.toUpperCase() !== 'BRL') throw new Error('Importe um extrato em reais (BRL).');
  const lerData = (valor?: string) => {
    const partes = valor?.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!partes) throw new Error('O arquivo OFX contém uma data ausente ou inválida.');
    const iso = `${partes[1]}-${partes[2]}-${partes[3]}`;
    const data = new Date(`${iso}T00:00:00Z`);
    if (!Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== iso) {
      throw new Error('O arquivo OFX contém uma data inválida.');
    }
    return iso;
  };
  const lancamentos = secao.split(/<STMTTRN\s*>/i).slice(1);
  const vistos = new Set<string>();
  const movimentos = lancamentos.map(texto => {
    const id = campo(texto, 'FITID');
    if (id && vistos.has(id)) throw new Error('O arquivo OFX contém identificadores de lançamento repetidos.');
    if (id) vistos.add(id);
    const valor = campo(texto, 'TRNAMT')?.replace(',', '.');
    const centavos = valor && /^[+-]?\d+(?:\.\d{1,2})?$/.test(valor) ? Math.round(Number(valor) * 100) : NaN;
    if (!Number.isSafeInteger(centavos) || centavos === 0) throw new Error('O arquivo OFX contém um valor de transação inválido.');
    return { data: lerData(campo(texto, 'DTPOSTED')), centavos, historico: campo(texto, 'MEMO') || campo(texto, 'NAME') || '—' };
  }).sort((a, b) => a.data.localeCompare(b.data));
  const inicio = campo(secao, 'DTSTART') ? lerData(campo(secao, 'DTSTART')) : movimentos[0]?.data;
  const fim = campo(secao, 'DTEND') ? lerData(campo(secao, 'DTEND')) : movimentos.at(-1)?.data;
  if (!inicio || !fim || inicio > fim || movimentos.some(movimento => movimento.data < inicio || movimento.data > fim)) {
    throw new Error('O período do arquivo OFX não corresponde às datas dos lançamentos.');
  }
  return { nome, inicio, fim, movimentos };
}

function compararExtratos(banco: MovimentoConciliacao[], sistema: MovimentoConciliacao[]) {
  const chave = ({ data, centavos }: MovimentoConciliacao) => `${data}|${centavos}`;
  const pendentes = new Map<string, MovimentoConciliacao[]>();
  for (const movimento of sistema) {
    const id = chave(movimento);
    const grupo = pendentes.get(id);
    if (grupo) grupo.push(movimento);
    else pendentes.set(id, [movimento]);
  }
  const soBanco = banco.filter(movimento => {
    const grupo = pendentes.get(chave(movimento));
    return !grupo?.pop();
  });
  return { iguais: banco.length - soBanco.length, soBanco, soSistema: [...pendentes.values()].flat() };
}

function ComparacaoExtratoBancario({ contas, lancamentos, contaInicial }: {
  contas: ContaBancaria[];
  lancamentos: NonNullable<ExtratoBancario['lancamentos']>;
  contaInicial: string;
}) {
  const [contaId, setContaId] = useState(contas.some(item => item.id === contaInicial) ? contaInicial : '');
  const [arquivo, setArquivo] = useState<ArquivoConciliacao | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const conta = contas.find(item => item.id === contaId);
  const sistema = arquivo && conta ? lancamentos
    .filter(item => item.contaBancariaId === conta.id && item.data?.slice(0, 10) >= arquivo.inicio && item.data?.slice(0, 10) <= arquivo.fim)
    .map(item => ({ data: item.data.slice(0, 10), centavos: Math.round(Math.abs(item.valor) * 100) * (item.tipo === 'CREDITO' ? 1 : -1), historico: item.historico }))
    : [];
  const resultado = arquivo && conta ? compararExtratos(arquivo.movimentos, sistema) : null;
  const bate = resultado && resultado.soBanco.length === 0 && resultado.soSistema.length === 0;
  const assinatura = bate ? JSON.stringify([contaId, sistema]) : null;
  const total = (movimentos: MovimentoConciliacao[]) => formatarValor(movimentos.reduce((soma, movimento) => soma + movimento.centavos, 0) / 100);

  const importar = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivoSelecionado = evento.currentTarget.files?.[0];
    evento.currentTarget.value = '';
    if (!arquivoSelecionado) return;
    setCarregando(true);
    setArquivo(null);
    setErro('');
    setConfirmacao(null);
    try {
      if (!/\.ofx$/i.test(arquivoSelecionado.name) || arquivoSelecionado.size > 5 * 1024 * 1024) {
        throw new Error('Selecione um arquivo OFX de até 5 MB.');
      }
      const dados = await arquivoSelecionado.arrayBuffer();
      const utf8 = new TextDecoder().decode(dados);
      const conteudo = utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(dados) : utf8;
      setArquivo(lerExtratoOfx(conteudo, arquivoSelecionado.name));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível ler o extrato.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <section aria-label="Comparação de extratos" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <fieldset disabled={carregando} className="flex min-w-0 flex-wrap items-end gap-3 text-xs">
        <label className="min-w-0 space-y-1 font-bold text-slate-700">
          <span className="block">Conta para conciliar</span>
          <SelectContaBancaria value={contaId} onChange={id => { setContaId(id); setArquivo(null); setErro(''); setConfirmacao(null); }}
            className="block w-full max-w-full rounded-lg border border-slate-200 p-2" contas={contas} vazioLabel="Selecione a conta bancária" />
        </label>
        <label className="space-y-1 font-bold text-slate-700">
          <span className="block">Importar extrato bancário (OFX)</span>
          <input type="file" accept=".ofx" disabled={!conta || carregando} onChange={importar}
            className="block w-full max-w-72 rounded-lg border border-slate-200 p-2 disabled:opacity-50" />
        </label>
      </fieldset>
      {carregando && <p role="status" className="text-xs">Lendo o extrato…</p>}
      {erro && <p role="alert" className="text-xs text-rose-700">{erro}</p>}
      {arquivo && resultado && (
        <>
          <p className="break-words text-xs text-slate-600">
            {arquivo.nome} · {formatarData(arquivo.inicio)} a {formatarData(arquivo.fim)} · Comparação por data, crédito ou débito e valor.
          </p>
          <p role="status" className={`text-sm font-semibold ${bate ? 'text-emerald-800' : 'text-amber-800'}`}>
            {bate ? 'Os lançamentos conferem.' : 'Há divergências nos lançamentos.'} {resultado.iguais} correspondências ·
            Banco {total(arquivo.movimentos)} · SISCOOP {total(sistema)}
          </p>
          {bate ? (
            <button type="button" disabled={confirmacao === assinatura}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-70"
              onClick={() => setConfirmacao(assinatura)}>
              {confirmacao === assinatura ? 'Conciliação confirmada nesta sessão' : 'Confirmar conciliação'}
            </button>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {([{ nome: 'Somente no banco', movimentos: resultado.soBanco }, { nome: 'Somente no SISCOOP', movimentos: resultado.soSistema }]).map(grupo => (
                <details key={grupo.nome} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-xs" open>
                  <summary className="cursor-pointer font-semibold">{grupo.nome} ({grupo.movimentos.length})</summary>
                  <ul className="mt-2 max-h-60 space-y-2 overflow-y-auto">
                    {grupo.movimentos.map((movimento, indice) => (
                      <li key={indice} className="flex flex-wrap gap-x-2 border-t border-slate-100 pt-2">
                        <span>{formatarData(movimento.data)}</span>
                        <strong>{formatarValor(movimento.centavos / 100)}</strong>
                        <span className="min-w-0 break-words">{movimento.historico}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export const SisFinView: React.FC = () => {
  const {
    contasPagarReceber,
    addContaPagarReceber,
    updateContaPagarReceber,
    deleteContaPagarReceber,
    pagarReceberConta,
    extratoBancario,
    registrarMovimentoManual,
    estoque,
    movimentacoesEstoque,
    lancamentosContabeis,
    planoContas,
    canWriteModule
  } = useCoop();
  // Contas bancárias (aba Contas Bancárias) usadas nos títulos e no extrato.
  const { contasBancarias } = useCoop();
  const contasBancariasAtivas = contasBancarias.filter(b => b.ativa !== false);
  const contaPadraoId = (contasBancariasAtivas.find(b => b.padrao) || contasBancariasAtivas[0])?.id || '';
  const nomeConta = (id?: string) => nomeContaBancaria(contasBancarias, id);

  const canWrite = canWriteModule('sisfin');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'dre' | 'fluxo' | 'conciliacao' | 'contas' | 'estoque' | 'custos' | 'extrato' | 'balanco' | 'bancos' | 'relatorios' | null>(null);
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [categoriaEstoque, setCategoriaEstoque] = useState('TODAS');
  const [filtroConta, setFiltroConta] = useState('TODAS');
  const [filtroBanco, setFiltroBanco] = useState('TODAS');
  const [mesExtrato, setMesExtrato] = useState('TODOS');
  const [anoExtrato, setAnoExtrato] = useState('TODOS');
  const [mesVencimento, setMesVencimento] = useState('TODOS');
  const [anoVencimento, setAnoVencimento] = useState('TODOS');
  // Contas a Pagar e Receber: filtros de tipo e situação (em aberto / pago)
  const [filtroSituacao, setFiltroSituacao] = useState<'TODAS' | 'ABERTO' | 'VENCIDO' | 'PAGO' | 'CANCELADO'>('TODAS');
  const [filtroTipoConta, setFiltroTipoConta] = useState<'TODOS' | 'PAGAR' | 'RECEBER'>('TODOS');
  const hojeContas = new Date().toISOString().split('T')[0];
  const situacaoConta = (c: ContaPagarReceber): 'ABERTO' | 'VENCIDO' | 'PAGO' | 'CANCELADO' =>
    c.status === 'PAGO' ? 'PAGO' : c.status === 'CANCELADO' ? 'CANCELADO' : (c.dataVencimento && c.dataVencimento < hojeContas ? 'VENCIDO' : 'ABERTO');
  const rotuloSituacao = (c: ContaPagarReceber) => {
    const s = situacaoConta(c);
    return s === 'PAGO' ? (c.tipo === 'RECEBER' ? 'Recebido' : 'Pago') : s === 'VENCIDO' ? 'Vencido' : s === 'CANCELADO' ? 'Cancelado' : 'Em aberto';
  };
  const contasListaFiltradas = contasPagarReceber.filter(c =>
    (mesVencimento === 'TODOS' || c.dataVencimento?.slice(5, 7) === mesVencimento) &&
    (anoVencimento === 'TODOS' || c.dataVencimento?.slice(0, 4) === anoVencimento) &&
    (filtroBanco === 'TODAS' || (c.contaBancariaId || '') === filtroBanco) &&
    (filtroTipoConta === 'TODOS' || c.tipo === filtroTipoConta) &&
    (filtroSituacao === 'TODAS' || situacaoConta(c) === filtroSituacao || (filtroSituacao === 'ABERTO' && situacaoConta(c) === 'VENCIDO'))
  );
  const somaContas = (tipo: 'PAGAR' | 'RECEBER', aberto: boolean) => contasListaFiltradas
    .filter(c => c.tipo === tipo && (aberto ? (c.status !== 'PAGO' && c.status !== 'CANCELADO') : c.status === 'PAGO'))
    .reduce((s, c) => s + (Number(c.valor) || 0), 0);
  // O fluxo permite consultar uma conta bancária ou a tesouraria consolidada.
  const noBanco = (id?: string) => filtroBanco === 'TODAS' || (id || '') === filtroBanco;
  const [mesFluxo, setMesFluxo] = useState(() => new Date().getMonth() < 6 ? 'S1' : 'S2');
  const [fluxoProjetado, setFluxoProjetado] = useState(false);
  const [anoFluxo, setAnoFluxo] = useState(String(new Date().getFullYear()));
  const fluxo = activeTab === 'fluxo' || activeTab === 'conciliacao'
    ? montarFluxoCaixa(extratoBancario, contasBancarias, anoFluxo, mesFluxo,
      activeTab === 'conciliacao' ? 'TODAS' : filtroBanco, contasPagarReceber, fluxoProjetado)
    : null;
  const linhasFluxo = fluxo ? linhasDoFluxo(fluxo) : [];

  // Modals & Editing
  const [showModal, setShowModal] = useState(false);
  const [showExtratoModal, setShowExtratoModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagarReceber | null>(null);

  const extratoVazio = () => ({
    data: new Date().toISOString().split('T')[0],
    historico: '',
    documento: '',
    tipo: 'CREDITO' as 'CREDITO' | 'DEBITO',
    valor: 0,
    categoria: '',
    contrapartidaContabil: '',
    contaBancariaId: contaPadraoId as string
  });

  const [extratoForm, setExtratoForm] = useState(extratoVazio);

  const [contaForm, setContaForm] = useState({
    tipo: 'PAGAR' as 'PAGAR' | 'RECEBER',
    descricao: '',
    pessoaNome: '',
    valor: 0,
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    categoria: 'FORNECEDOR' as any,
    subcategoria: '',
    classificacaoDespesa: 'VARIAVEL' as 'FIXA' | 'VARIAVEL',
    status: 'PENDENTE' as any,
    contaBancariaId: contaPadraoId as string
  });

  const handleOpenModal = (c?: ContaPagarReceber) => {
        if (!canWrite) { blockWriteAction(); return; }
if (c) {
      setEditingConta(c);
      setContaForm({
        tipo: c.tipo,
        dataEmissao: c.dataEmissao || c.dataVencimento,
        descricao: c.descricao,
        pessoaNome: c.pessoaNome,
        valor: c.valor,
        dataVencimento: c.dataVencimento,
        categoria: c.categoria,
        subcategoria: c.subcategoria || '',
        classificacaoDespesa: c.classificacaoDespesa || 'VARIAVEL',
        status: c.status,
        contaBancariaId: c.contaBancariaId || ''
      });
    } else {
      setEditingConta(null);
      setContaForm({
        tipo: 'PAGAR',
        descricao: '',
        pessoaNome: '',
        valor: 0,
        dataEmissao: new Date().toISOString().split('T')[0],
        dataVencimento: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        categoria: 'FORNECEDOR',
        subcategoria: '',
        classificacaoDespesa: 'VARIAVEL',
        status: 'PENDENTE',
        contaBancariaId: contaPadraoId
      });
    }
    setShowModal(true);
  };

  const handleSaveConta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!contaForm.descricao || !contaForm.valor) return;
    if (editingConta) {
      updateContaPagarReceber(editingConta.id, contaForm);
    } else {
      addContaPagarReceber(contaForm);
    }
    setShowModal(false);
    playActionCompleteSound();
  };

  const abrirNovoExtrato = () => {
    if (!canWrite) { blockWriteAction(); return; }
    setExtratoForm(extratoVazio());
    setShowExtratoModal(true);
  };

  const handleSaveExtrato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!extratoForm.historico || !extratoForm.valor || !extratoForm.categoria) return;
    const { contrapartidaContabil, ...movimento } = extratoForm;
    if (registrarMovimentoManual(movimento, contrapartidaContabil) === false) return;
    setShowExtratoModal(false);
  };

  const dataNoPeriodo = (data?: string) => {
    if (!data) return false;
    const anoOk = filtroAno === 'TODAS' || data.startsWith(filtroAno);
    const mesOk = filtroMes === 'TODOS' || data.slice(5, 7) === filtroMes;
    return anoOk && mesOk;
  };
  const contasDoPeriodo = contasPagarReceber.filter(c => dataNoPeriodo(c.dataEmissao || c.dataVencimento) && noBanco(c.contaBancariaId));
  const extratoDoPeriodo = (extratoBancario?.lancamentos || []).filter(l => dataNoPeriodo(l.data) && noBanco((l as any).contaBancariaId));
  const periodoPagar = contasDoPeriodo.filter(c => c.tipo === 'PAGAR').reduce((sum, c) => sum + (c.valor || 0), 0);
  const periodoReceber = contasDoPeriodo.filter(c => c.tipo === 'RECEBER').reduce((sum, c) => sum + (c.valor || 0), 0);
  const periodoPago = contasDoPeriodo.filter(c => c.tipo === 'PAGAR' && c.status === 'PAGO').reduce((sum, c) => sum + (c.valor || 0), 0);
  const periodoRecebido = contasDoPeriodo.filter(c => c.tipo === 'RECEBER' && c.status === 'PAGO').reduce((sum, c) => sum + (c.valor || 0), 0);
  const periodoEntradas = extratoDoPeriodo.filter(l => l.tipo === 'CREDITO').reduce((sum, l) => sum + (l.valor || 0), 0);
  const periodoSaidas = extratoDoPeriodo.filter(l => l.tipo === 'DEBITO').reduce((sum, l) => sum + (l.valor || 0), 0);
  const categoriasFinanceiras = [...new Set([
    ...CATEGORIAS_FINANCEIRAS.map(item => item.categoria),
    ...contasPagarReceber.flatMap(conta => conta.categoria ? [conta.categoria] : []),
  ])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const contasFinanceiras = Array.from(new Set(contasPagarReceber.map(c => c.centroCusto || c.categoria).filter(Boolean))) as string[];
  const contasFiltradas = contasDoPeriodo.filter(c =>
    (filtroCategoria === 'TODAS' || c.categoria === filtroCategoria) &&
    (filtroConta === 'TODAS' || (c.centroCusto || c.categoria) === filtroConta)
  );

    const receitasDre = contasFiltradas.filter(c => c.tipo === 'RECEBER' && c.status !== 'CANCELADO').reduce((sum, c) => sum + c.valor, 0);
  const despesasDre = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.status !== 'CANCELADO').reduce((sum, c) => sum + c.valor, 0);
  const custosFixos = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.classificacaoDespesa === 'FIXA').reduce((sum, c) => sum + c.valor, 0);
  const custosVariaveis = contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.classificacaoDespesa !== 'FIXA').reduce((sum, c) => sum + c.valor, 0);
  const estoqueFinanceiro = categoriaEstoque === 'TODAS' ? estoque : estoque.filter(item => item.categoria === categoriaEstoque);
  const valorEstoqueFinanceiro = estoqueFinanceiro.reduce((total, item) => total + (item.quantidadeAtual || 0) * (item.valorUnitarioMedio || 0), 0);
  const valorEstoque = estoque.reduce((sum, item) => sum + (item.quantidadeAtual || 0) * (item.valorUnitarioMedio || 0), 0);
  const itensEstoqueBaixo = estoque.filter(item => item.quantidadeAtual <= (item.quantidadeMinima ?? item.estoqueMinimo ?? 0));

  const mesesAno = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
  const fluxoAnual = mesesAno.map(mes => {
    const contasMes = contasPagarReceber.filter(c => {
      const data = c.dataEmissao || c.dataVencimento || '';
      return (filtroAno === 'TODAS' || data.startsWith(filtroAno)) && data.slice(5, 7) === mes && noBanco(c.contaBancariaId);
    });
    const extratoMes = (extratoBancario?.lancamentos || []).filter(l => (filtroAno === 'TODAS' || l.data.startsWith(filtroAno)) && l.data.slice(5, 7) === mes && noBanco((l as any).contaBancariaId));
    return {
      mes: `${mes}/${filtroAno === 'TODAS' ? 'Todos' : filtroAno.slice(-2)}`,
      entradas: extratoMes.filter(l => l.tipo === 'CREDITO').reduce((s, l) => s + l.valor, 0),
      saidas: extratoMes.filter(l => l.tipo === 'DEBITO').reduce((s, l) => s + l.valor, 0),
      receber: contasMes.filter(c => c.tipo === 'RECEBER' && c.status !== 'CANCELADO').reduce((s, c) => s + c.valor, 0),
      pagar: contasMes.filter(c => c.tipo === 'PAGAR' && c.status !== 'CANCELADO').reduce((s, c) => s + c.valor, 0)
    };
  });
  const lancamentosContabeisPeriodo = lancamentosContabeis.filter(l => dataNoPeriodo(l.data));
  const balanceteContas = planoContas.filter(conta => conta.ativo !== false).map(conta => {
    const movimentos = lancamentosContabeisPeriodo.filter(l => l.contaDebitoCodigo === conta.codigo || l.contaCreditoCodigo === conta.codigo);
    const debitos = movimentos.filter(l => l.contaDebitoCodigo === conta.codigo).reduce((s, l) => s + l.valor, 0);
    const creditos = movimentos.filter(l => l.contaCreditoCodigo === conta.codigo).reduce((s, l) => s + l.valor, 0);
    const saldo = conta.natureza === 'DEVEDORA' ? debitos - creditos : creditos - debitos;
    return { ...conta, debitos, creditos, saldoDevedor: saldo > 0 && conta.natureza === 'DEVEDORA' ? saldo : 0, saldoCredor: saldo > 0 && conta.natureza === 'CREDORA' ? saldo : 0 };
  }).filter(conta => conta.debitos || conta.creditos || conta.tipoConta === 'SINTETICA');
  const totalBalanceteDebitos = balanceteContas.reduce((s, c) => s + c.debitos, 0);
  const totalBalanceteCreditos = balanceteContas.reduce((s, c) => s + c.creditos, 0);
  const contasFluxo = Array.from(new Set([
    'Caixa', 'Bancos – Conta Movimento', 'Aplicações Financeiras', 'Contas a Receber de Cooperados', 'Contas a Receber de Terceiros', 'Fornecedores', 'Obrigações com Cooperados', 'Salários e Encargos a Pagar', 'Impostos e Contribuições a Recolher', 'Empréstimos e Financiamentos', 'Receita de Vendas', 'Receita de Serviços', 'Receita de Operações com Cooperados', 'Receita de Operações com Não Cooperados', 'Compras de Mercadorias', 'Custo dos Produtos Vendidos', 'Despesas Administrativas', 'Despesas com Pessoal', 'Despesas Financeiras', 'Despesas Operacionais', ...categoriasFinanceiras
  ]));
  const anosDisponiveis = Array.from(new Set([
    String(new Date().getFullYear()),
    ...contasPagarReceber.map(c => (c.dataEmissao || c.dataVencimento || '').slice(0, 4)),
    ...lancamentosContabeis.map(l => l.data?.slice(0, 4) ?? ''),
    ...(extratoBancario?.lancamentos || []).map(l => l.data.slice(0, 4))
  ])).filter(Boolean).sort().reverse();

  const lancamentosExtrato = extratoBancario?.lancamentos ?? [];
  const listarAnos = (datas: (string | undefined)[]) => [...new Set([
    String(new Date().getFullYear()),
    ...datas.map(data => data?.slice(0, 4) ?? '')
  ].filter(ano => /^\d{4}$/.test(ano)))].sort().reverse();

  const filtrosPeriodo = (mes: string, ano: string, mudarMes: (valor: string) => void, mudarAno: (valor: string) => void, anos: string[], permiteTodosAnos = true, semestres = false) => (
    <>
      <label className="flex items-center gap-2 font-bold text-slate-600">
        Mês
        <select value={mes} onChange={e => mudarMes(e.target.value)} className="rounded-xl border border-slate-200 p-2 font-normal">
          <option value="TODOS">Todos os meses</option>
          {semestres && <><option value="S1">1º semestre</option><option value="S2">2º semestre</option></>}
          {mesesAno.map((numero, indice) => (
            <option key={numero} value={numero}>{new Date(2000, indice, 1).toLocaleDateString('pt-BR', { month: 'long' })}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 font-bold text-slate-600">
        Ano
        <select value={ano} onChange={e => mudarAno(e.target.value)} className="rounded-xl border border-slate-200 p-2 font-normal">
          {permiteTodosAnos && <option value="TODOS">Todos os anos</option>}
          {anos.map(opcao => <option key={opcao} value={opcao}>{opcao}</option>)}
        </select>
      </label>
    </>
  );

  const aplicarFiltros = () => {
    setFiltroCategoria('TODAS');
    setFiltroConta('TODAS');
  };

  const gerarRelatorioGerencialPdf = (tipo: 'PAGAR_RECEBER' | 'ESTOQUE' | 'CUSTOS' | 'BALANCETE') => {
    const doc = new jsPDF();
    const dinheiro = (valor: number) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const titulos = { PAGAR_RECEBER: 'Contas a Pagar e Receber', ESTOQUE: 'Posição Financeira do Estoque', CUSTOS: 'Custos Fixos e Variáveis', BALANCETE: 'Balancete de Verificação' };
    doc.setFillColor(4, 120, 87); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(17); doc.text('SICOOP', 14, 13); doc.setFontSize(10); doc.text(titulos[tipo], 14, 22);
    const titulosDoPdf = tipo === 'PAGAR_RECEBER' ? contasListaFiltradas : contasFiltradas;
    const mesPdf = tipo === 'PAGAR_RECEBER' ? mesVencimento : filtroMes;
    const anoPdf = tipo === 'PAGAR_RECEBER' ? anoVencimento : filtroAno;
    doc.setTextColor(30, 41, 59); doc.setFontSize(10);
    if (tipo === 'PAGAR_RECEBER') {
      doc.text(`Vencimento: ${mesPdf === 'TODOS' ? 'todos os meses' : mesPdf} / ${anoPdf === 'TODOS' ? 'todos os anos' : anoPdf}`, 14, 42);
    } else if (tipo === 'ESTOQUE') {
      doc.text(`Categoria: ${categoriaEstoque === 'TODAS' ? 'Todas as categorias' : categoriaEstoque}`, 14, 42);
    } else {
      doc.text(`Período: ${mesPdf}/${anoPdf}`, 14, 42);
      doc.text(`Categoria: ${filtroCategoria} | Conta: ${filtroConta}`, 14, 49);
    }
    let y = 65; doc.setFont('helvetica', 'bold');
    const linhas: [string, string][] = tipo === 'CUSTOS' ? [['Custos fixos', dinheiro(custosFixos)], ['Custos variáveis', dinheiro(custosVariaveis)], ['Custos totais', dinheiro(custosFixos + custosVariaveis)]]
      : tipo === 'ESTOQUE' ? [['Valor total em estoque', dinheiro(valorEstoqueFinanceiro)], ['Itens cadastrados', String(estoqueFinanceiro.length)], ['Itens abaixo do mínimo', String(itensEstoqueBaixo.filter(item => categoriaEstoque === 'TODAS' || item.categoria === categoriaEstoque).length)]]
      : tipo === 'BALANCETE' ? [['Total de débitos', dinheiro(totalBalanceteDebitos)], ['Total de créditos', dinheiro(totalBalanceteCreditos)], ['Diferença', dinheiro(Math.abs(totalBalanceteDebitos - totalBalanceteCreditos))]]
      : [['Contas a receber', dinheiro(titulosDoPdf.filter(c => c.tipo === 'RECEBER').reduce((s, c) => s + c.valor, 0))], ['Contas a pagar', dinheiro(titulosDoPdf.filter(c => c.tipo === 'PAGAR').reduce((s, c) => s + c.valor, 0))], ['Títulos no período', String(titulosDoPdf.length)]];
    linhas.forEach(([label, valor]) => { doc.setFont('helvetica', 'normal'); doc.text(label, 16, y); doc.text(valor, 145, y); y += 10; });
    y += 7; doc.setFont('helvetica', 'bold'); doc.text('Detalhamento', 14, y); y += 9; doc.setFont('helvetica', 'normal');
    if (tipo === 'ESTOQUE') estoqueFinanceiro.slice(0, 24).forEach(item => { doc.text(`${item.nomeItem} | ${item.quantidadeAtual} ${item.unidadeMedida} | ${dinheiro((item.quantidadeAtual || 0) * (item.valorUnitarioMedio || 0))}`.substring(0, 115), 14, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    else if (tipo === 'BALANCETE') balanceteContas.slice(0, 24).forEach(c => { doc.text(`${c.codigo} | ${c.nome} | D: ${dinheiro(c.debitos)} | C: ${dinheiro(c.creditos)}`.substring(0, 115), 14, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    else titulosDoPdf.slice(0, 24).forEach(c => { doc.text(`${c.tipo} | ${c.descricao} | ${c.categoria || '-'} | ${dinheiro(c.valor)}`.substring(0, 115), 14, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Relatório gerencial gerado pelo SisFin — SICOOP', 14, 289); doc.save(`${tipo.toLowerCase()}-${anoPdf}-${mesPdf}.pdf`);
  };

  const exportarFluxo = () => {
    if (!fluxo) return;
    const expandirRubricas = (linhas: LinhaDemonstrativo[]) => linhas.flatMap(linha => [
      { cels: [linha.nome, ...linha.valores.map(formatarValor)], negrito: true },
      ...['1.1', '1.2'].some(prefixo => linha.nome.startsWith(prefixo))
        ? (linha.filhos ?? []).map(filha => ({ cels: [filha.nome, ...filha.valores.map(formatarValor)], recuo: 1 }))
        : [],
    ]);
    const linhas = expandirRubricas(linhasFluxo);
    exportarPdf('Fluxo de Caixa', `${fluxoProjetado ? 'Projetado (realizado + títulos em aberto por vencimento)' : 'Realizado'} | ${anoFluxo} | ${filtroBanco === 'TODAS' ? 'Todas as contas' : nomeConta(filtroBanco)}`,
      ['Movimentação Financeira', ...fluxo.meses.map(mes => rotuloMesFluxo(mes.periodo)), 'Acumulado'],
      [fluxo.meses.length > 6 ? 82 : 117, ...fluxo.meses.map(() => fluxo.meses.length > 6 ? 13 : 21), 30],
      linhas, `fluxo-de-caixa-${anoFluxo}-${mesFluxo}.pdf`, undefined, 0);
  };

  const fecharMes = (periodo: string) => {
    const [ano, mes] = periodo.split('-').map(Number);
    return `${periodo}-${new Date(Date.UTC(ano, mes, 0)).getUTCDate()}`;
  };
  const abrirDre = (inicio: string, fim: string) =>
    montarResultadoCooperativa(planoContas, lancamentosContabeis, contasPagarReceber, inicio, fim, 'competencia');
  const resultadoDashboard = activeTab === 'dashboard'
    ? montarResultadoCooperativa(planoContas, lancamentosContabeis.filter(lancamento => dataNoPeriodo(lancamento.data)),
      contasPagarReceber, '0001-01-01', '9999-12-31', 'competencia').resultado
    : 0;
  const conciliacao = fluxo && activeTab === 'conciliacao'
    ? abrirDre(`${fluxo.meses[0].periodo}-01`, fecharMes(fluxo.meses[fluxo.meses.length - 1].periodo))
    : null;
  const valorAcumulado = (prefixo: string) => linhasFluxo.find(linha => linha.nome.startsWith(prefixo))?.valores.at(-1) ?? 0;
  const metricasCaixa = fluxo ? {
    minimo: Math.min(...fluxo.meses.map(mes => mes.final)),
    maximo: Math.max(...fluxo.meses.map(mes => mes.final)),
    operacionalMedio: fluxo.total.operacional / fluxo.meses.length,
    variacaoPercentual: fluxo.total.inicial > 0 ? (fluxo.total.final - fluxo.total.inicial) / fluxo.total.inicial * 100 : null,
  } : null;
  const sinteseCaixa = fluxo ? [
    { nome: 'Saldo inicial de caixa e bancos', entradas: null, saidas: null, liquido: fluxo.total.inicial },
    { nome: 'Atividades operacionais', entradas: valorAcumulado('1.1'), saidas: -valorAcumulado('1.2'),
      liquido: fluxo.total.operacional },
    ...['Investimento', 'Financiamento'].map(atividade => {
      const grupo = tipoAtividadeCaixa(fluxo, atividade === 'Investimento' ? 'investimento' : 'financiamento');
      return { nome: `Atividades de ${atividade.toLowerCase()}`, ...grupo };
    }),
    { nome: 'Variação líquida de caixa', entradas: fluxo.total.entradas, saidas: fluxo.total.saidas,
      liquido: fluxo.total.entradas - fluxo.total.saidas },
    { nome: 'Saldo final de caixa e bancos', entradas: null, saidas: null, liquido: fluxo.total.final },
  ] : [];
  const quadroConciliacao: [string, number, number, string][] = conciliacao && fluxo ? [
    ['Receitas de produção e serviços', conciliacao.receitaBruta, valorAcumulado('1.1'),
      'Vendas por competência, recebimentos de vendas a prazo e outras entradas operacionais.'],
    ['Custos e despesas operacionais', conciliacao.custosDespesas, -valorAcumulado('1.2'),
      'Prazos de fornecedores e repasses, estoques, tributos e despesas sem desembolso.'],
    ['Depreciação e amortização', conciliacao.depreciacao, 0, 'Encargo reconhecido por competência.'],
    ['Sobras ou perdas líquidas × geração operacional de caixa', conciliacao.resultado, fluxo.total.operacional,
      'Diferença entre resultado, capital de giro e itens operacionais com efeitos em períodos distintos.'],
    ['Saldo mínimo de caixa no período', 0, metricasCaixa?.minimo ?? 0, 'Menor saldo de fechamento mensal.'],
    ['Destinações para Fundo de Reserva e FATES', conciliacao.reservas, 0, 'Destinações patrimoniais do resultado.'],
  ] : [];

  const exportarConciliacao = () => {
    exportarPdf('Resumo e Conciliação Econômico-Financeira',
      `${mesFluxo} / ${anoFluxo} | Fluxo ${fluxoProjetado ? 'projetado' : 'realizado'}`,
      ['Rubrica', 'Competência', 'Caixa', 'Diferença'],
      [154, 40, 40, 43], quadroConciliacao.flatMap(([nome, competencia, caixa, fator]) => [
        { cels: [nome, formatarValor(competencia), formatarValor(caixa), formatarValor(caixa - competencia)], negrito: true },
        { cels: [fator], recuo: 1 },
      ]), `conciliacao-${anoFluxo}-${mesFluxo}.pdf`, undefined, 0);
  };

  const gerarRelatorioFinanceiroPdf = () => {
    const doc = new jsPDF();
    const dinheiro = (valor: number) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    doc.setFillColor(4, 120, 87); doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text('SICOOP', 14, 13);
    doc.setFontSize(10); doc.text('Balanço Financeiro Mensal', 14, 22);
    doc.setTextColor(30, 41, 59); doc.setFontSize(11);
    doc.text(`Período: ${filtroMes}/${filtroAno}`, 14, 42);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 140, 42);
    let y = 58;
    const linhas = [['Contas a receber previstas', periodoReceber], ['Contas a pagar previstas', periodoPagar], ['Recebimentos realizados', periodoRecebido], ['Pagamentos realizados', periodoPago], ['Entradas conciliadas', periodoEntradas], ['Saídas conciliadas', periodoSaidas], ['Resultado previsto', periodoReceber - periodoPagar], ['Resultado realizado', periodoRecebido - periodoPago + periodoEntradas - periodoSaidas]] as [string, number][];
    doc.setFillColor(241, 245, 249); doc.rect(12, y - 8, 186, 10, 'F'); doc.setFont('helvetica', 'bold'); doc.text('Indicador', 16, y - 1); doc.text('Valor', 145, y - 1); y += 10; doc.setFont('helvetica', 'normal');
    linhas.forEach(([label, valor], index) => { if (index % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(12, y - 7, 186, 9, 'F'); } doc.text(label, 16, y); doc.text(dinheiro(valor), 145, y); y += 10; });
    y += 8; doc.setFont('helvetica', 'bold'); doc.text('Detalhamento de títulos do período', 14, y); y += 9; doc.setFont('helvetica', 'normal');
    contasDoPeriodo.slice(0, 18).forEach(c => { doc.text(`${c.tipo} | ${c.descricao} | ${c.status} | ${dinheiro(c.valor)}`.substring(0, 115), 14, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Relatório gerado pelo SisFin — SICOOP', 14, 289);
    doc.save(`balanco-financeiro-${filtroAno}-${filtroMes}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-100 p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <CircleDollarSign className="w-3.5 h-3.5" /> Tesouraria & Repasses aos Cooperados
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financeiro da Cooperativa & Repasses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Contas a Pagar, Contas a Receber (vendas PAA/PNAE e mercado aberto), Repasses da Produção aos Cooperados, Fluxo de Caixa e Sobras/Perdas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'extrato' ? (
            <button
              onClick={abrirNovoExtrato}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Lançar Entrada / Saída Extrato
            </button>
          ) : activeTab === 'balanco' ? (
            <button onClick={gerarRelatorioFinanceiroPdf} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Exportar balanço PDF</button>
          ) : (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nova Conta (Pagar / Receber)
            </button>
          )}
        </div>
      </div>

      <NavegacaoSecoes selecionada={activeTab !== null} voltar={() => setActiveTab(null)} secoes={[
        { titulo: <>Contas a Pagar e Receber ({contasPagarReceber.length})</>, descricao: "Acompanhe pagamentos e recebimentos.", icone: CircleDollarSign, abrir: () => setActiveTab('contas') },
        { titulo: <>Relatórios PDF</>, descricao: "Consulte e exporte relatórios em PDF.", icone: FileText, abrir: () => setActiveTab('relatorios') },
        { titulo: 'Conciliação bancária', descricao: '', icone: Landmark, abrir: () => setActiveTab('extrato') },
        { titulo: <>Contas Bancárias</>, descricao: "Gerencie as contas bancárias.", icone: Landmark, abrir: () => setActiveTab('bancos') },
        { titulo: <>Balanço Financeiro</>, descricao: "Consulte a posição patrimonial e financeira.", icone: BarChart3, abrir: () => setActiveTab('balanco') },
        { titulo: 'Dashboard', descricao: 'Acompanhe os indicadores financeiros.', icone: BarChart3, abrir: () => setActiveTab('dashboard') },
        { titulo: 'Demonstração de Sobras ou Perdas', descricao: 'Consulte o resultado do exercício.', icone: BarChart3, abrir: () => setActiveTab('dre') },
        { titulo: 'Resumo e Conciliação', descricao: 'Compare competência e caixa no mesmo período.', icone: Scale, abrir: () => setActiveTab('conciliacao') },
        { titulo: 'Fluxo de Caixa', descricao: 'Acompanhe as entradas e saídas de caixa.', icone: BarChart3, abrir: () => setActiveTab('fluxo') },
        { titulo: 'Estoque', descricao: 'Consulte os saldos de estoque.', icone: BarChart3, abrir: () => setActiveTab('estoque') },
        { titulo: 'Custos', descricao: 'Analise os custos da operação.', icone: BarChart3, abrir: () => setActiveTab('custos') }
      ]} />

      {(activeTab === 'dashboard' || activeTab === 'dre' || activeTab === 'fluxo' || activeTab === 'conciliacao' || activeTab === 'estoque' || activeTab === 'custos') && (
        <div className="space-y-5">
          {(activeTab === 'fluxo' || activeTab === 'conciliacao') ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
              {filtrosPeriodo(mesFluxo, anoFluxo, setMesFluxo, setAnoFluxo, listarAnos([
                ...lancamentosExtrato.map(l => l.data),
                ...contasBancarias.map(banco => banco.dataSaldoInicial),
              ]), false, true)}
              <label className="flex items-center gap-2 font-bold text-slate-600">
                Visão do fluxo
                <select value={fluxoProjetado ? 'projetado' : 'realizado'} onChange={e => setFluxoProjetado(e.target.value === 'projetado')} className="rounded-xl border border-slate-200 p-2 font-normal">
                  <option value="realizado">Caixa realizado</option><option value="projetado">Caixa projetado</option>
                </select>
              </label>
              {activeTab === 'fluxo' && <><span className="font-bold text-slate-600">Conta bancária</span>
              <SelectContaBancaria value={filtroBanco} onChange={setFiltroBanco} contas={contasBancarias} todasLabel="Todas as contas" className="rounded-xl border border-slate-200 p-2" /></>}
            </div>
          ) : activeTab === 'dre' ? null : activeTab === 'estoque' ? (
            <label className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
              Categoria
              <select value={categoriaEstoque} onChange={e => setCategoriaEstoque(e.target.value)} className="rounded-xl border border-slate-200 p-2">
                <option value="TODAS">Todas as categorias</option>
                {listarCategoriasEstoque(estoque).map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
              </select>
            </label>
          ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col xl:flex-row xl:items-end gap-3">
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Mês</label><select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm"><option value="TODOS">Todos</option><option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option><option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option><option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option></select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Ano</label><select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm w-28"><option value="TODAS">Todos</option>{anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Categoria</label><select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm"><option value="TODAS">Todas as categorias</option>{categoriasFinanceiras.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Conta / centro de custo</label><select value={filtroConta} onChange={e => setFiltroConta(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm"><option value="TODAS">Todas as contas</option>{contasFluxo.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Conta bancária</label><SelectContaBancaria value={filtroBanco} onChange={setFiltroBanco} contas={contasBancarias} todasLabel="Todas as contas bancárias" className="p-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <button onClick={aplicarFiltros} className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Limpar filtros</button>
          </div>
          )}


          {activeTab === 'dashboard' && <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                ['Sobras ou perdas por competência', resultadoDashboard, resultadoDashboard >= 0 ? 'text-emerald-700' : 'text-rose-700', resultadoDashboard >= 0 ? 'bg-emerald-50' : 'bg-rose-50'],
                ['Saldo de caixa', (extratoBancario?.saldoInicial || 0) + periodoEntradas - periodoSaidas, 'text-blue-700', 'bg-blue-50'],
                ['Contas a pagar', contasFiltradas.filter(c => c.tipo === 'PAGAR' && c.status !== 'CANCELADO').reduce((s, c) => s + c.valor, 0), 'text-rose-700', 'bg-rose-50/80'],
                ['Contas a receber', contasFiltradas.filter(c => c.tipo === 'RECEBER' && c.status !== 'CANCELADO').reduce((s, c) => s + c.valor, 0), 'text-emerald-700', 'bg-emerald-50/80'],
                ['Valor do estoque', valorEstoque, 'text-indigo-700', 'bg-indigo-50']
              ].map(([label, value, color, bg]) => (
                <div key={String(label)} className={`p-5 rounded-2xl border border-slate-200/80 shadow-xs ${bg}`}>
                  <div className="text-xs font-bold text-slate-600">{label}</div>
                  <div className={`text-xl font-black mt-2 ${color}`}>
                    R$ {Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><div className="bg-white rounded-2xl border border-slate-200 p-6"><h2 className="font-black text-slate-900">Desempenho do período</h2><div className="space-y-4 mt-5"><div><div className="flex justify-between text-xs"><span>Títulos a receber</span><strong className="text-emerald-700">R$ {receitasDre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="h-2 bg-slate-100 rounded-full mt-2"><div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, receitasDre ? (receitasDre / Math.max(receitasDre, despesasDre)) * 100 : 0)}%` }} /></div></div><div><div className="flex justify-between text-xs"><span>Títulos a pagar</span><strong className="text-rose-700">R$ {despesasDre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="h-2 bg-slate-100 rounded-full mt-2"><div className="h-2 bg-rose-500 rounded-full" style={{ width: `${Math.min(100, despesasDre ? (despesasDre / Math.max(receitasDre, despesasDre)) * 100 : 0)}%` }} /></div></div></div></div><div className="bg-white rounded-2xl border border-slate-200 p-6"><h2 className="font-black text-slate-900">Acompanhamento gerencial</h2><div className="grid grid-cols-2 gap-3 mt-5"><div className="p-3 rounded-xl bg-indigo-50"><span className="text-[11px] text-indigo-700">Custos fixos</span><strong className="block text-lg text-indigo-900">R$ {custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="p-3 rounded-xl bg-amber-50"><span className="text-[11px] text-amber-700">Custos variáveis</span><strong className="block text-lg text-amber-900">R$ {custosVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="p-3 rounded-xl bg-rose-50"><span className="text-[11px] text-rose-700">Estoque mínimo</span><strong className="block text-lg text-rose-900">{itensEstoqueBaixo.length} item(ns)</strong></div><div className="p-3 rounded-xl bg-slate-50"><span className="text-[11px] text-slate-500">Títulos filtrados</span><strong className="block text-lg text-slate-900">{contasFiltradas.length}</strong></div></div></div></div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Fluxo anual</h2><span className="text-[10px] text-slate-500">Entradas x saídas</span></div><ResponsiveContainer width="100%" height={270}><AreaChart data={fluxoAnual}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="mes" fontSize={10} /><YAxis fontSize={10} tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`} /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /><Area type="monotone" dataKey="entradas" name="Entradas" stroke="#059669" fill="#a7f3d0" strokeWidth={2} /><Area type="monotone" dataKey="saidas" name="Saídas" stroke="#e11d48" fill="#fecdd3" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-900 flex items-center gap-2"><WalletCards className="w-4 h-4 text-blue-600" /> Previsão mensal</h2><span className="text-[10px] text-slate-500">A pagar x receber</span></div><ResponsiveContainer width="100%" height={270}><BarChart data={fluxoAnual}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="mes" fontSize={10} /><YAxis fontSize={10} tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`} /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /><Bar dataKey="receber" name="A receber" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="pagar" name="A pagar" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><div className="bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-slate-900 mb-4 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-indigo-600" /> Composição dos custos</h2><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={[{ name: 'Fixos', value: custosFixos }, { name: 'Variáveis', value: custosVariaveis }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} label>{["#6366f1", "#f59e0b"].map(color => <Cell key={color} fill={color} />)}</Pie><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /></PieChart></ResponsiveContainer></div><div className="bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Scale className="w-4 h-4 text-cyan-600" /> Equilíbrio contábil</h2><ResponsiveContainer width="100%" height={250}><BarChart data={[{ nome: 'Débitos x créditos', debitos: totalBalanceteDebitos, creditos: totalBalanceteCreditos }]}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="nome" fontSize={10} /><YAxis fontSize={10} /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /><Bar dataKey="debitos" name="Débitos" fill="#0ea5e9" /><Bar dataKey="creditos" name="Créditos" fill="#8b5cf6" /></BarChart></ResponsiveContainer></div></div>
          </>}

          {activeTab === 'dre' && <DemonstracoesContabeis modo="dsp" />}

          {activeTab === 'fluxo' && fluxo && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Fluxo de Caixa Realizado</h2>
                  <p className="text-sm text-slate-500">Movimentações do extrato por mês, categoria e conta bancária.</p>
                </div>
                <button type="button" onClick={exportarFluxo} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Exportar PDF</button>
              </div>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                {([
                  ['Entradas', fluxo.total.entradas, 'border-l-teal-500'],
                  ['Saídas', -fluxo.total.saidas, 'border-l-rose-500'],
                  ['Saldo final', fluxo.total.final, 'border-l-sky-700'],
                  ['Geração de caixa operacional', fluxo.total.operacional, 'border-l-cyan-600'],
                  ['Geração de caixa total', fluxo.total.entradas - fluxo.total.saidas, 'border-l-cyan-600'],
                ] as const).map(([titulo, valor, cor]) => (
                  <div key={titulo} className={`min-w-0 rounded-xl border border-slate-200 border-l-4 bg-white px-3 py-3 shadow-sm ${cor}`}>
                    <p className="text-xs font-medium text-slate-600">{titulo}</p>
                    <div className="mt-1 text-base font-bold tabular-nums sm:text-xl">{valorFluxo(valor)}</div>
                  </div>
                ))}
              </div>

              {metricasCaixa && (
                <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Saldo mínimo mensal', formatarValor(metricasCaixa.minimo)],
                    ['Saldo máximo mensal', formatarValor(metricasCaixa.maximo)],
                    ['Geração operacional mensal média', formatarValor(metricasCaixa.operacionalMedio)],
                    ['Variação do saldo de caixa', metricasCaixa.variacaoPercentual === null ? '—'
                      : `${metricasCaixa.variacaoPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`],
                  ].map(([nome, valor]) => <div key={nome} className="rounded-lg border border-slate-200 bg-white p-3">{nome} <strong className="mt-1 block">{valor}</strong></div>)}
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white" tabIndex={0} aria-label="Demonstrativo mensal do fluxo de caixa">
                <table className="w-full text-xs [&_thead_th]:!bg-cyan-800 [&_thead_th]:!text-white">
                  <thead>
                    <tr>
                      <th scope="col" className="sticky left-0 z-10 min-w-48 text-left">Movimentação Financeira (Entradas e Saídas)</th>
                      {fluxo.meses.map(m => <th key={m.periodo} scope="col" className="text-right">{rotuloMesFluxo(m.periodo)}</th>)}
                      <th scope="col" className="text-right">Acumulado (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasFluxo.map(linha => <LinhaExpansivel key={linha.nome} linha={linha} />)}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white" tabIndex={0} aria-label="Fluxo por conta bancária">
                <table className="w-full text-xs [&_thead_th]:!bg-cyan-800 [&_thead_th]:!text-white">
                  <thead><tr>
                    <th scope="col" className="sticky left-0 z-10 min-w-40 text-left">Conta bancária</th>
                    {['Saldo inicial', 'Entradas', 'Saídas', 'Saldo do período', 'Saldo final'].map(nome => <th key={nome} scope="col" className="text-right">{nome}</th>)}
                  </tr></thead>
                  <tbody>
                    {fluxo.contas.map(conta => linhaFluxo(conta.nome, [conta.inicial, conta.entradas, -conta.saidas, conta.entradas - conta.saidas, conta.final], false, conta.id))}
                    {fluxo.contas.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500">Nenhuma conta ou movimentação no período.</td></tr>}
                    {linhaFluxo('Total', [fluxo.total.inicial, fluxo.total.entradas, -fluxo.total.saidas, fluxo.total.entradas - fluxo.total.saidas, fluxo.total.final])}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">{fluxoProjetado ? 'A projeção soma os movimentos realizados e os títulos em aberto pelo vencimento. ' : ''}O fluxo usa as datas dos recebimentos e dos pagamentos. O acumulado mostra o saldo de abertura do primeiro mês, a soma das movimentações e o saldo de fechamento do último mês.</p>
            </section>
          )}

          {conciliacao && fluxo && (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Resumo e Conciliação Econômico-Financeira</h2>
                <button type="button" onClick={exportarConciliacao} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Exportar PDF</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ['Sobras ou perdas líquidas', formatarValor(conciliacao.resultado)],
                  ['Margem líquida', `${(conciliacao.receitaLiquida > 0 ? conciliacao.resultado / conciliacao.receitaLiquida * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`],
                  ['Geração de caixa operacional', formatarValor(fluxo.total.operacional)],
                  ['Fundo de Reserva', formatarValor(conciliacao.reserva)],
                  ['FATES', formatarValor(conciliacao.fates)],
                  ['Saldo final de caixa e bancos', formatarValor(fluxo.total.final)],
                ]).map(([nome, valor]) => (
                  <div key={nome} className="rounded-xl bg-slate-50 p-3 text-xs"><p>{nome}</p><strong className="mt-1 block text-base">{valor}</strong></div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr>{['Demonstração de Sobras ou Perdas', 'Ato Cooperativo', 'Ato Não Cooperativo', 'Consolidado'].map(nome => <th key={nome}>{nome}</th>)}</tr></thead>
                  <tbody>{conciliacao.linhas.filter(linha => !linha.detalhe).map(linha => (
                    <tr key={linha.rotulo}><th scope="row" className="text-left">{linha.rotulo}</th>
                      {linha.valores.map((valor, indice) => <td key={indice} className="whitespace-nowrap text-right">{valor === null ? '—' : formatarValor(valor)}</td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr>{['Síntese do fluxo de caixa', 'Entradas (R$)', 'Saídas (R$)', 'Resultado Líquido (R$)', '% Sobre Entradas'].map(nome => <th key={nome}>{nome}</th>)}</tr></thead>
                  <tbody>{sinteseCaixa.map(linha => (
                    <tr key={linha.nome}><th scope="row" className="text-left">{linha.nome}</th>
                      {[linha.entradas, linha.saidas, linha.liquido].map((valor, indice) => <td key={indice} className="whitespace-nowrap text-right">{valor === null ? '—' : formatarValor(valor)}</td>)}
                      <td className="whitespace-nowrap text-right">{linha.entradas && linha.entradas > 0
                        ? `${(linha.liquido / linha.entradas * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-xs">
                  <thead><tr>{['Rubrica de conciliação', 'Competência (R$)', 'Caixa (R$)', 'Diferença (R$)', 'Fator contábil'].map(nome => <th key={nome}>{nome}</th>)}</tr></thead>
                  <tbody>{quadroConciliacao.map(([nome, competencia, caixa, fator]) => (
                    <tr key={nome}><th scope="row" className="text-left">{nome}</th>
                      {[competencia, caixa, caixa - competencia].map((valor, indice) => <td key={indice} className="whitespace-nowrap text-right">{formatarValor(valor)}</td>)}
                      <td>{fator}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'estoque' && <div className="bg-white rounded-2xl border border-slate-200 p-6"><div className="flex justify-between"><div><h2 className="text-lg font-black text-slate-900">Estoque — visão financeira</h2><p className="text-xs text-slate-500 mt-1">Valor do inventário e itens abaixo do estoque mínimo.</p></div><button onClick={() => gerarRelatorioGerencialPdf('ESTOQUE')} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Exportar PDF</button></div><div className="mt-5 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left border-b"><th className="p-3">Produto</th><th className="p-3">Quantidade</th><th className="p-3">Valor unitário</th><th className="p-3 text-right">Valor total</th></tr></thead><tbody className="divide-y">{estoqueFinanceiro.map(item => <tr key={item.id}><td className="p-3 font-bold">{item.nomeItem}</td><td className="p-3">{item.quantidadeAtual} {item.unidadeMedida}</td><td className="p-3">R$ {(item.valorUnitarioMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="p-3 text-right font-bold">R$ {((item.quantidadeAtual || 0) * (item.valorUnitarioMedio || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>)}{estoqueFinanceiro.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-slate-500">Nenhum item para a categoria selecionada.</td></tr>}</tbody></table></div></div>}

          {activeTab === 'custos' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Gestão de Custos da Cooperativa</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Acompanhamento integrado de Custos Totais, Fixos e Variáveis com proporção percentual.
                    </p>
                  </div>
                  <button
                    onClick={() => gerarRelatorioGerencialPdf('CUSTOS')}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" /> Exportar PDF de Custos
                  </button>
                </div>

                {/* Cards de Custos com Custo Total */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                  {/* Card Custo Total */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md border border-slate-700/50 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Custos Totais</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-mono font-bold">100%</span>
                    </div>
                    <strong className="block text-3xl font-black text-white mt-3">
                      R$ {(custosFixos + custosVariaveis).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Soma total dos custos fixos e variáveis do período selecionado.
                    </p>
                  </div>

                  {/* Card Custos Fixos */}
                  <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Custos Fixos</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-200 text-indigo-900 text-[10px] font-mono font-bold">
                        {(custosFixos + custosVariaveis) > 0 ? (((custosFixos) / (custosFixos + custosVariaveis)) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <strong className="block text-3xl font-black text-indigo-950 mt-3">
                      R$ {custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <p className="text-[11px] text-indigo-600/80 mt-2">
                      Salários, aluguéis, contabilidade, softwares e infraestrutura.
                    </p>
                  </div>

                  {/* Card Custos Variáveis */}
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Custos Variáveis</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">
                        {(custosFixos + custosVariaveis) > 0 ? (((custosVariaveis) / (custosFixos + custosVariaveis)) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <strong className="block text-3xl font-black text-amber-950 mt-3">
                      R$ {custosVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                    <p className="text-[11px] text-amber-700/80 mt-2">
                      Insumos, combustíveis, embalagens, fretes e pagamentos a produtores.
                    </p>
                  </div>
                </div>

                {/* Gráfico de Rosca com Percentual */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 items-center bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-emerald-600" />
                      Composição Proporcional dos Custos (Gráfico de Rosca)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Visualização percentual de impacto na estrutura de despesas da cooperativa.
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-md bg-[#6366f1]" />
                          <span className="text-xs font-bold text-slate-700">Custos Fixos</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-slate-900">
                            {(custosFixos + custosVariaveis) > 0 ? (((custosFixos) / (custosFixos + custosVariaveis)) * 100).toFixed(1) : '0.0'}%
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            R$ {custosFixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-md bg-[#f59e0b]" />
                          <span className="text-xs font-bold text-slate-700">Custos Variáveis</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-slate-900">
                            {(custosFixos + custosVariaveis) > 0 ? (((custosVariaveis) / (custosFixos + custosVariaveis)) * 100).toFixed(1) : '0.0'}%
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            R$ {custosVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[280px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Custos Fixos', value: custosFixos || 0.001 },
                            { name: 'Custos Variáveis', value: custosVariaveis || 0.001 }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={98}
                          paddingAngle={3}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          <Cell fill="#6366f1" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip
                          formatter={(val: number) => [
                            `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${(custosFixos + custosVariaveis) > 0 ? ((val / (custosFixos + custosVariaveis)) * 100).toFixed(1) : 0}%)`,
                            'Valor'
                          ]}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                      <span className="text-xs font-black text-slate-800">
                        R$ {(custosFixos + custosVariaveis).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'balanco' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-end gap-3">
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Mês</label><select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm"><option value="TODOS">Todos</option><option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option><option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option><option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option></select></div>
            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Ano</label><select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="p-2.5 rounded-xl border border-slate-200 text-sm w-28"><option value="TODAS">Todos</option>{anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></div>
            <div className="flex-1 text-xs text-slate-500 pb-2">Filtros aplicados a títulos e lançamentos conciliados do período selecionado.</div>
            <button onClick={gerarRelatorioFinanceiroPdf} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Exportar PDF</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[['Receitas previstas', periodoReceber, 'text-emerald-700', 'bg-emerald-50'], ['Despesas previstas', periodoPagar, 'text-rose-700', 'bg-rose-50'], ['Entradas conciliadas', periodoEntradas, 'text-blue-700', 'bg-blue-50'], ['Saídas conciliadas', periodoSaidas, 'text-amber-700', 'bg-amber-50']].map(([label, valor, color, bg]) => <div key={String(label)} className={`p-5 rounded-2xl border border-slate-200 ${bg}`}><div className="text-xs font-bold text-slate-600">{label}</div><div className={`text-xl font-black mt-2 ${color}`}>R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></div>)}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm"><h2 className="font-black text-slate-900">Resumo do balanço — {filtroMes}/{filtroAno}</h2><div className="grid md:grid-cols-2 gap-4 mt-4"><div className="p-4 rounded-xl bg-slate-50"><span className="text-xs text-slate-500">Resultado previsto</span><strong className={`block text-2xl mt-1 ${periodoReceber - periodoPagar >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>R$ {(periodoReceber - periodoPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="p-4 rounded-xl bg-slate-50"><span className="text-xs text-slate-500">Resultado realizado</span><strong className={`block text-2xl mt-1 ${periodoRecebido - periodoPago + periodoEntradas - periodoSaidas >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>R$ {(periodoRecebido - periodoPago + periodoEntradas - periodoSaidas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div></div></div>
        </div>
      )}

      {/* Tab Contas */}
      {activeTab === 'bancos' && <ContasBancariasTab canWrite={canWrite} onBlocked={blockWriteAction} />}

      {activeTab === 'contas' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Contas a Pagar e Receber</h2><p className="text-xs text-slate-500 mt-1">Compras, vendas, chamadas públicas e demais títulos. Use o filtro de situação para ver o que está em aberto ou pago.</p></div><button onClick={() => gerarRelatorioGerencialPdf('PAGAR_RECEBER')} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Exportar PDF</button></div>
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
              <span className="font-bold text-slate-600">Conta bancária:</span>
              <SelectContaBancaria value={filtroBanco} onChange={setFiltroBanco} contas={contasBancarias} todasLabel="Todas as contas" className="p-2 border border-slate-200 rounded-xl" />
              <span className="font-bold text-slate-600 ml-2">Tipo:</span>
              <select value={filtroTipoConta} onChange={e => setFiltroTipoConta(e.target.value as 'TODOS' | 'PAGAR' | 'RECEBER')} className="p-2 border border-slate-200 rounded-xl bg-white">
                <option value="TODOS">Pagar e Receber</option>
                <option value="PAGAR">A Pagar</option>
                <option value="RECEBER">A Receber</option>
              </select>
              <span className="font-bold text-slate-600 ml-2">Situação:</span>
              <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value as 'TODAS' | 'ABERTO' | 'VENCIDO' | 'PAGO' | 'CANCELADO')} className="p-2 border border-slate-200 rounded-xl bg-white">
                <option value="TODAS">Todas</option>
                <option value="ABERTO">Em aberto</option>
                <option value="VENCIDO">Vencidas</option>
                <option value="PAGO">Pagas / Recebidas</option>
                <option value="CANCELADO">Canceladas</option>
              </select>
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="font-bold text-slate-600">Vencimento</legend>
                {filtrosPeriodo(mesVencimento, anoVencimento, setMesVencimento, setAnoVencimento, listarAnos(contasPagarReceber.map(c => c.dataVencimento)))}
              </fieldset>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
              {([
                ['A pagar em aberto', somaContas('PAGAR', true), 'text-rose-700'],
                ['A receber em aberto', somaContas('RECEBER', true), 'text-emerald-700'],
                ['Pago', somaContas('PAGAR', false), 'text-slate-700'],
                ['Recebido', somaContas('RECEBER', false), 'text-slate-700']
              ] as [string, number, string][]).map(([rotulo, valor, cor]) => (
                <div key={rotulo} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">{rotulo}</div>
                  <div className={`text-sm font-black ${cor}`}>{valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>
              ))}
            </div>
          <DataGrid
              rows={contasListaFiltradas}
              getRowId={c => c.id}
              pageSize={20}
              onRowDoubleClick={c => handleOpenModal(c)}
              panelTitle={c => c.descricao}
              panelSubtitle={c => `${c.tipo === 'RECEBER' ? 'A receber' : 'A pagar'} · ${(c.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
              emptyMessage="Nenhum título financeiro encontrado."
              columns={[
                {
                  key: 'status',
                  header: 'Status',
                  width: 110,
                  value: c => rotuloSituacao(c),
                render: c => {
                  const s = situacaoConta(c);
                  return <GridStatus tone={s === 'PAGO' ? 'success' : s === 'VENCIDO' ? 'danger' : s === 'CANCELADO' ? 'neutral' : 'warning'} label={rotuloSituacao(c)} />;
                },
                },
                {
                  key: 'tipo',
                  header: 'Tipo',
                  width: 100,
                  value: c => (c.tipo === 'RECEBER' ? 'Receber' : 'Pagar'),
                  render: c => <span className={c.tipo === 'RECEBER' ? 'text-green-700' : 'text-rose-700'}>{c.tipo === 'RECEBER' ? 'Receber' : 'Pagar'}</span>,
                },
                { key: 'descricao', header: 'Descrição', width: 240 },
                { key: 'categoria', header: 'Categoria', width: 200, value: c => [c.categoria, c.subcategoria].filter(Boolean).join(' — ') },
                {
                  key: 'classificacaoDespesa',
                  header: 'Classificação',
                  width: 110,
                  value: c => (c.tipo === 'PAGAR' && c.classificacaoDespesa ? (c.classificacaoDespesa === 'FIXA' ? 'Fixa' : 'Variável') : null),
                },
                { key: 'pessoaNome', header: 'Pessoa / Favorecido', width: 200 },
                { key: 'dataVencimento', header: 'Vencimento', width: 110, value: c => c.dataVencimento, render: c => formatarData(c.dataVencimento) },
              { key: 'dataPagamento', header: 'Pago/Recebido em', width: 130, value: c => c.dataPagamento || '', render: c => (c.dataPagamento ? formatarData(c.dataPagamento) : null) },
                { key: 'conta', header: 'Conta Bancária', width: 170, value: c => nomeConta(c.contaBancariaId) },
                {
                  key: 'valor',
                  header: 'Valor',
                  width: 130,
                  align: 'right',
                  value: c => c.valor || 0,
                  render: c => (c.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                },
              ]}
              actions={[
                {
                  label: 'Dar baixa (marcar como pago/recebido)',
                  icon: CheckCircle2,
                  hidden: c => c.status === 'PAGO' || c.status === 'CANCELADO',
                  onClick: c => { if (!canWrite) { blockWriteAction(); return; } pagarReceberConta(c.id); },
                },
                { label: 'Editar', icon: Pencil, onClick: c => handleOpenModal(c) },
                {
                  label: 'Excluir',
                  icon: Trash2,
                  tone: 'danger',
                  divider: true,
                  onClick: c => {
                    if (!canWrite) { blockWriteAction(); return; }
                    if (confirm('Deseja excluir este lançamento financeiro?')) deleteContaPagarReceber(c.id);
                  },
                },
              ]}
            />
        </div>
      )}

      {activeTab === 'relatorios' && <RelatoriosPdfTab tipoInicial="CONTAS" />}


      {/* Tab Extrato */}
      {activeTab === 'extrato' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <ComparacaoExtratoBancario contas={contasBancarias} lancamentos={lancamentosExtrato} contaInicial={filtroBanco} />

          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Conta bancária:</span>
              <SelectContaBancaria value={filtroBanco} onChange={setFiltroBanco} contas={contasBancarias} todasLabel="Todas as contas" className="p-2 border border-slate-200 rounded-xl" />
            </div>
            {filtrosPeriodo(mesExtrato, anoExtrato, setMesExtrato, setAnoExtrato, listarAnos(lancamentosExtrato.map(l => l.data)))}
          </div>
          <DataGrid
              rows={lancamentosExtrato.filter(lancamento =>
                noBanco(lancamento.contaBancariaId) &&
                (mesExtrato === 'TODOS' || lancamento.data?.slice(5, 7) === mesExtrato) &&
                (anoExtrato === 'TODOS' || lancamento.data?.slice(0, 4) === anoExtrato)
              )}
              getRowId={l => l.id}
              pageSize={25}
              emptyMessage="Nenhum lançamento no extrato."
              columns={[
                {
                  key: 'tipo',
                  header: 'Tipo',
                  width: 110,
                  value: l => (l.tipo === 'CREDITO' ? 'Crédito' : 'Débito'),
                  render: l => <GridStatus tone={l.tipo === 'CREDITO' ? 'success' : 'danger'} label={l.tipo === 'CREDITO' ? 'Crédito' : 'Débito'} />,
                },
                { key: 'data', header: 'Data', width: 110, value: l => l.data, render: l => formatarData(l.data) },
                { key: 'historico', header: 'Histórico / Lançamento', width: 320 },
                { key: 'conta', header: 'Conta Bancária', width: 180, value: l => nomeConta((l as any).contaBancariaId) },
                {
                  key: 'valor',
                  header: 'Valor',
                  width: 140,
                  align: 'right',
                  value: l => (l.tipo === 'CREDITO' ? 1 : -1) * (l.valor || 0),
                  render: l => (
                    <span className={l.tipo === 'CREDITO' ? 'text-green-700' : 'text-rose-700'}>
                      {l.tipo === 'CREDITO' ? '+ ' : '- '}
                      {(l.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  ),
                },
              ]}
            />
        </div>
      )}

      {/* Modal Lançamento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingConta ? 'Editar Conta' : 'Nova Conta Pagar/Receber'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveConta} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tipo de Título</label>
                  <select
                    value={contaForm.tipo}
                    onChange={e => setContaForm({ ...contaForm, tipo: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="PAGAR">Conta a Pagar</option>
                    <option value="RECEBER">Conta a Receber</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    required
                    value={contaForm.valor || ''}
                    onChange={e => setContaForm({ ...contaForm, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Descrição do Título *</label>
                <input
                  type="text"
                  required
                  value={contaForm.descricao}
                  onChange={e => setContaForm({ ...contaForm, descricao: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Aquisição de caixas para PNAE"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Pessoa / Favorecido</label>
                <input
                  type="text"
                  value={contaForm.pessoaNome}
                  onChange={e => setContaForm({ ...contaForm, pessoaNome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Nome do cooperado ou fornecedor"
                />
              </div>

              <label className="block font-bold text-slate-700">
                Data de emissão / competência
                <input type="date" required value={contaForm.dataEmissao}
                  onChange={e => setContaForm({ ...contaForm, dataEmissao: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5" />
              </label>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={contaForm.dataVencimento}
                  onChange={e => setContaForm({ ...contaForm, dataVencimento: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Conta Bancária</label>
                <SelectContaBancaria
                  value={(contaForm as any).contaBancariaId || ''}
                  onChange={id => setContaForm({ ...contaForm, contaBancariaId: id })}
                  contas={contasBancarias}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Categoria / Subcategoria</label>
                <select
                  value={contaForm.subcategoria ? `${contaForm.categoria}|${contaForm.subcategoria}` : ''}
                  onChange={e => {
                    const [categoria, subcategoria] = e.target.value.split('|');
                    const preset = CATEGORIAS_FINANCEIRAS.find(c => c.categoria === categoria && c.subcategoria === subcategoria);
                    setContaForm({
                      ...contaForm,
                      categoria: categoria || contaForm.categoria,
                      subcategoria: subcategoria || '',
                      classificacaoDespesa: preset?.classificacao || contaForm.classificacaoDespesa
                    });
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="">Selecione a categoria...</option>
                  {CATEGORIAS_FINANCEIRAS.map(c => (
                    <option key={`${c.categoria}|${c.subcategoria}`} value={`${c.categoria}|${c.subcategoria}`}>
                      {c.categoria} — {c.subcategoria}
                    </option>
                  ))}
                </select>
              </div>

              {contaForm.tipo === 'PAGAR' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Classificação</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setContaForm({ ...contaForm, classificacaoDespesa: 'FIXA' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        contaForm.classificacaoDespesa === 'FIXA'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      Fixa
                    </button>
                    <button
                      type="button"
                      onClick={() => setContaForm({ ...contaForm, classificacaoDespesa: 'VARIAVEL' })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        contaForm.classificacaoDespesa === 'VARIAVEL'
                          ? 'bg-amber-600 border-amber-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                      }`}
                    >
                      Variável
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Fixa: valor estável, se repete todo mês (aluguel, salários). Variável: depende do volume do mês (insumos, combustível).</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Lançar Extrato Bancário */}
      {showExtratoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">Lançamento no Extrato Bancário</h2>
              <button onClick={() => setShowExtratoModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveExtrato} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tipo Movimentação</label>
                  <select
                    value={extratoForm.tipo}
                    onChange={e => setExtratoForm({ ...extratoForm, tipo: e.target.value as 'CREDITO' | 'DEBITO', categoria: '' })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                  >
                    <option value="CREDITO">CRÉDITO (Entrada)</option>
                    <option value="DEBITO">DÉBITO (Saída)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    required
                    value={extratoForm.valor || ''}
                    onChange={e => setExtratoForm({ ...extratoForm, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <label className="block font-bold text-slate-700">
                Rubrica do fluxo
                <select required value={extratoForm.categoria}
                  onChange={e => setExtratoForm({ ...extratoForm, categoria: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal">
                  <option value="">Selecione uma rubrica</option>
                  {(extratoForm.tipo === 'CREDITO' ? TIPOS_ENTRADA_CAIXA : TIPOS_SAIDA_CAIXA).map(rubrica => (
                    <option key={rubrica.nome} value={rubrica.nome}>{rubrica.nome}</option>
                  ))}
                </select>
              </label>
              <label className="block font-bold text-slate-700">
                Contrapartida contábil
                <select value={extratoForm.contrapartidaContabil}
                  onChange={e => setExtratoForm({ ...extratoForm, contrapartidaContabil: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-normal">
                  <option value="">Somente registrar no extrato</option>
                  {planoContas.filter(conta => conta.aceitaLancamento && conta.ativo !== false).map(conta => (
                    <option key={conta.codigo} value={conta.codigo}>{conta.codigo} · {conta.nome}</option>
                  ))}
                </select>
              </label>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Histórico / Descrição *</label>
                <input
                  type="text"
                  required
                  value={extratoForm.historico}
                  onChange={e => setExtratoForm({ ...extratoForm, historico: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                  placeholder="Ex: Recebimento de Ordem de Pagamento PNAE"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={extratoForm.data}
                    onChange={e => setExtratoForm({ ...extratoForm, data: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nº Documento / PIX</label>
                  <input
                    type="text"
                    value={extratoForm.documento}
                    onChange={e => setExtratoForm({ ...extratoForm, documento: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Conta Bancária</label>
                  <SelectContaBancaria
                    value={(extratoForm as any).contaBancariaId || ''}
                    onChange={id => setExtratoForm({ ...extratoForm, contaBancariaId: id })}
                    contas={contasBancarias}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExtratoModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
