import React, { useMemo, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { useCoop } from '../context/CoopContext';
import type { Cooperado } from '../types';

/**
 * Ficha de Matrícula do cooperado, no mesmo layout da ficha em papel da
 * cooperativa: cabeçalho com logo e dados da sede, dados do cooperado,
 * Declaração - Compromisso Estatutário (assinaturas do sócio e do presidente)
 * e Termo de Demissão, Exclusão ou Eliminação.
 *
 * O documento é montado em HTML próprio e impresso por um iframe, assim o
 * usuário pode imprimir ou "Salvar como PDF" pelo navegador com o layout A4.
 */

const ESTADO_CIVIL: Record<string, string> = {
  SOLTEIRO: 'SOLTEIRO(A)',
  CASADO: 'CASADO(A)',
  DIVORCIADO: 'DIVORCIADO(A)',
  VIUVO: 'VIÚVO(A)',
  UNIAO_ESTAVEL: 'UNIÃO ESTÁVEL',
};

const SITUACOES_DESLIGADO = ['DEMITIDO', 'EXCLUIDO', 'FALECIDO'];

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const up = (v: unknown) => esc(String(v ?? '').trim().toUpperCase());

function data(v?: string) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : esc(v);
}

export function montarHtml(c: Cooperado, coop: {
  nome: string; endereco: string; cep: string; email: string; telefone: string; cnpj: string; logo: string; presidente: string;
}) {
  const campo = (rotulo: string, valor: string, flex = 1, curto = false) =>
    `<div class="campo" style="flex:${flex}"><span class="rot${curto ? ' curto' : ''}">${rotulo}</span><span class="val">${valor}</span></div>`;
  const linha = (...campos: string[]) => `<div class="linha">${campos.join('')}</div>`;

  const endereco = [c.logradouro, c.numero].filter(Boolean).join(', ');
  const cidadeUf = [c.cidade, c.estado].filter(Boolean).join('/');
  const fone = c.celular || c.telefone || c.whatsapp || '';
  const tipoConta = c.conta ? (c.tipoConta === 'POUPANCA' ? 'POUPANÇA' : 'CORRENTE') : '';

  // Se o cooperado já foi desligado, o termo vem preenchido com a data e o
  // motivo registrados no histórico; senão fica em branco para preencher à mão.
  const desligado = SITUACOES_DESLIGADO.includes(String(c.situacao));
  const evento = desligado
    ? [...(c.historico || [])].reverse().find(h => /demiss|exclus|elimina|deslig|falec/i.test(`${h.acao} ${h.detalhes}`))
    : undefined;
  const dataDeslig = evento ? data(evento.data) : '';
  const motivo = desligado ? up(evento?.detalhes || evento?.acao || c.situacao) : '';

  const linhasEmBranco = (n: number) => Array.from({ length: n }, () => '<div class="pauta"></div>').join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Ficha de Matrícula - ${esc(c.matricula)} - ${esc(c.nome)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; background: #fff; }
  .folha { width: 186mm; margin: 0 auto; padding: 4mm 0; }
  .topo { display: flex; align-items: center; gap: 14px; padding: 8px 14px; border-radius: 4px;
    background: linear-gradient(100deg, #8cc63f 0%, #4f9a35 45%, #2e6f2c 100%); color: #fff; }
  .topo img { height: 78px; width: auto; max-width: 120px; object-fit: contain; background: #fff; border-radius: 8px; padding: 4px; }
  .topo .logo-vazio { height: 64px; width: 64px; border-radius: 50%; background: #fff; color: #2f7d32;
    display:flex; align-items:center; justify-content:center; font-weight: 800; font-size: 20px; }
  .topo .nome { font-size: 17px; font-weight: 800; letter-spacing: .3px; text-shadow: 0 1px 1px rgba(0,0,0,.25); }
  .topo .info { font-size: 11.5px; font-weight: 700; line-height: 1.45; text-shadow: 0 1px 1px rgba(0,0,0,.25); }
  h1 { text-align: center; font-size: 15px; margin: 14px 0 10px; letter-spacing: .5px; }
  h2 { text-align: center; font-size: 12.5px; margin: 22px 0 10px; }
  .linha { display: flex; gap: 10px; margin: 9px 0; align-items: flex-end; }
  .campo { display: flex; align-items: flex-end; gap: 6px; min-width: 0; }
  .rot { background: #a6a6a6; color: #111; font-size: 9px; font-weight: 700; padding: 2px 6px; white-space: nowrap;
    min-width: 92px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rot.curto { min-width: 0; }
  .val { flex: 1; border-bottom: 1px solid #999; font-size: 10.5px; min-height: 14px; padding: 0 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .declaracao { text-align: justify; line-height: 1.45; margin: 6px 0 0; }
  .assinaturas { display: flex; justify-content: space-between; gap: 30px; margin-top: 14px; text-align: center; }
  .assinaturas > div { flex: 1; }
  .assinaturas .titulo { margin-bottom: 34px; }
  .assinaturas .traco { border-top: 1px solid #111; padding-top: 3px; font-size: 9.5px; }
  .pauta { border-bottom: 1px solid #111; height: 26px; }
  .topo, .rot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body><div class="folha">
  <div class="topo">
    ${coop.logo ? `<img src="${esc(coop.logo)}" alt="">` : `<div class="logo-vazio">${up(coop.nome).slice(0, 1)}</div>`}
    <div>
      <div class="nome">${up(coop.nome)}</div>
      <div class="info">${esc(coop.endereco)}</div>
      <div class="info">${coop.cep ? `CEP ${esc(coop.cep)}` : ''}${coop.cep && coop.email ? ' &nbsp;-&nbsp; ' : ''}${coop.email ? `E-mail: ${esc(coop.email)}` : ''}</div>
    </div>
  </div>

  <h1>FICHA DE MATRÍCULA</h1>

  ${linha(campo('MATRÍCULA', esc(c.matricula), 1), campo('NOME', up(c.nome), 2.6))}
  ${linha(campo('DATA DA ADMISSÃO', data(c.dataFiliacao)), campo('RG', esc(c.rg)), campo('ÓRGÃO EMISSOR', up(c.orgaoEmissor)))}
  ${linha(campo('CPF', esc(c.cpf)), campo('DAP/CAF', esc(c.dapCaf)), campo('D. NASCIMENTO', data(c.dataNascimento)))}
  ${linha(campo('ESTADO CIVIL', esc(ESTADO_CIVIL[c.estadoCivil] || '')), campo('REGIME DE BENS', up(c.regimeBens)))}
  ${linha(campo('PAI', up(c.nomePai)), campo('MÃE', up(c.nomeMae)))}
  ${linha(campo('NATURALIDADE', up(c.naturalidade)), campo('NACIONALIDADE', up(c.nacionalidade)))}
  ${linha(campo('ENDEREÇO', up(endereco)))}
  ${linha(campo('COMPLEMENTO', up(c.complemento)), campo('BAIRRO', up(c.bairro)))}
  ${linha(campo('CIDADE/UF', up(cidadeUf)), campo('CEP', esc(c.cep)))}
  ${linha(campo('FONE', esc(fone)), campo('E-MAIL', esc((c.email || '').toLowerCase())))}
  ${linha(campo('BANCO', up(c.banco), 1.3), campo('AGÊNCIA', esc(c.agencia), 0.9, true), campo('CONTA', esc(c.conta), 0.9, true), campo('TIPO', tipoConta, 1, true))}
  ${linha(campo('BANCO', '', 1.3), campo('AGÊNCIA', '', 0.9, true), campo('CONTA', '', 0.9, true), campo('TIPO', '', 1, true))}

  <h2>DECLARAÇÃO - COMPROMISSO ESTATUTÁRIO</h2>
  <p class="declaracao">O cooperado acima qualificado declara a quem possa interessar, por meio da presente declaração, para que esta
  produza todos os fins de direito, que recebeu cópia, conhece e aceita o estatuto social da ${esc(coop.nome)}, pelo que se
  compromete, a partir desta data, a cumprir todas as determinações contidas na mencionada norma social, sob pena das sanções
  estatutárias e legais.</p>
  <div class="assinaturas">
    <div><div class="titulo">Assinatura do sócio</div><div class="traco">${up(c.nome)}</div></div>
    <div><div class="titulo">Assinatura do presidente</div><div class="traco">${up(coop.presidente) || '&nbsp;'}</div></div>
  </div>

  <h2>TERMO DE DEMISSÃO, EXCLUSÃO OU ELIMINAÇÃO</h2>
  ${linha(campo('D. DESLIGAMENTO', dataDeslig || '____/____/________', 0.5), '<div style="flex:1"></div>')}
  ${linha(campo('MOTIVAÇÃO', motivo))}
  ${linhasEmBranco(2)}
  <div class="linha" style="margin-top:12px">${campo('OBSERVAÇÕES', '')}</div>
  ${linhasEmBranco(3)}
</div></body></html>`;
}

interface Props {
  cooperado: Cooperado;
  onClose: () => void;
}

export const FichaMatriculaModal: React.FC<Props> = ({ cooperado, onClose }) => {
  const { config, currentTenant, mandatos } = useCoop();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const html = useMemo(() => {
    const sede: NonNullable<typeof config.enderecoSede> = config?.enderecoSede || {};
    const logradouro = sede.logradouro || currentTenant?.logradouro || '';
    const numero = sede.numero || currentTenant?.numero || '';
    const bairro = sede.bairro || currentTenant?.bairro || '';
    const cidade = sede.cidade || currentTenant?.cidade || '';
    const uf = sede.estado || currentTenant?.estado || '';
    const endereco = [
      [logradouro, numero].filter(Boolean).join(', '),
      bairro,
      [cidade, uf].filter(Boolean).join(' - '),
    ].filter(Boolean).join(' - ');

    // Presidente: membro ativo com cargo PRESIDENTE no mandato vigente.
    const lista = Array.isArray(mandatos) ? mandatos : [];
    const vigente = lista.find(m => m.status === 'VIGENTE') || lista[0];
    const presidente = (vigente?.membros || []).find(m => m.cargo === 'PRESIDENTE' && m.status !== 'CONCLUIDO')?.cooperadoNome || '';

    return montarHtml(cooperado, {
      nome: config?.razaoSocial || currentTenant?.razaoSocial || config?.nomeCooperativa || currentTenant?.name || 'Cooperativa',
      endereco,
      cep: sede.cep || currentTenant?.cep || '',
      email: config?.emailOficial || currentTenant?.email || '',
      telefone: config?.telefoneOficial || currentTenant?.telefone || '',
      cnpj: config?.cnpj || currentTenant?.cnpj || '',
      logo: currentTenant?.logoUrl || config?.logoUrl || '',
      presidente,
    });
  }, [cooperado, config, currentTenant, mandatos]);

  const imprimir = () => {
    const w = frameRef.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ficha de Matrícula</h3>
            <p className="text-xs text-slate-400">
              {cooperado.nome} • Matrícula {cooperado.matricula}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={imprimir}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / Salvar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-4 overflow-hidden">
          <iframe
            ref={frameRef}
            title="Ficha de Matrícula"
            srcDoc={html}
            className="w-full h-full bg-white rounded-lg shadow border border-slate-200"
          />
        </div>
      </div>
    </div>
  );
};
