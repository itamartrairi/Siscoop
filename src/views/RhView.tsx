import React, { useState } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  UserCheck,
  Plus,
  Users,
  FileSpreadsheet,
  Pencil,
  Trash2,
  X,
  FileDown,
  Printer
} from 'lucide-react';
import { FuncionarioRH, FolhaPagamento } from '../types';
import { playActionCompleteSound } from '../utils/actionSound';
import { calcularDescontosFolha } from '../utils/folhaPagamentoHelpers';
import jsPDF from 'jspdf';

export const RhView: React.FC = () => {
  const {
    funcionariosRH,
    addFuncionarioRH,
    updateFuncionarioRH,
    deleteFuncionarioRH,
    folhaPagamento,
    addFolhaPagamento,
    updateFolhaPagamento,
    deleteFolhaPagamento,
    canWriteModule,
    config
  } = useCoop();

  const canWrite = canWriteModule('rh');
  const blockWriteAction = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  const [activeTab, setActiveTab] = useState<'funcionarios' | 'folha'>('funcionarios');

  // Filtros da aba Folha de Pagamento
  const [filterFuncionarioId, setFilterFuncionarioId] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterAno, setFilterAno] = useState('');

  const MESES_FILTRO = [
    { valor: '01', label: 'Janeiro' }, { valor: '02', label: 'Fevereiro' }, { valor: '03', label: 'Março' },
    { valor: '04', label: 'Abril' }, { valor: '05', label: 'Maio' }, { valor: '06', label: 'Junho' },
    { valor: '07', label: 'Julho' }, { valor: '08', label: 'Agosto' }, { valor: '09', label: 'Setembro' },
    { valor: '10', label: 'Outubro' }, { valor: '11', label: 'Novembro' }, { valor: '12', label: 'Dezembro' }
  ];

  // Editing state
  const [editingFunc, setEditingFunc] = useState<FuncionarioRH | null>(null);
  const [editingFolha, setEditingFolha] = useState<FolhaPagamento | null>(null);

  // Modals
  const [showFuncModal, setShowFuncModal] = useState(false);
  const [showFolhaModal, setShowFolhaModal] = useState(false);
  const [showFolhaMensalModal, setShowFolhaMensalModal] = useState(false);

  // Forms
  const [funcForm, setFuncForm] = useState({
    nome: '',
    cpf: '',
    cargo: 'Técnico Agrícola',
    departamento: 'TECNICO',
    salarioBase: 3800.00,
    dataAdmissao: new Date().toISOString().split('T')[0],
    status: 'ATIVO' as any
  });

  const [folhaForm, setFolhaForm] = useState({
    funcionarioId: '',
    funcionarioNome: '',
    competencia: '08/2026',
    totalProventos: 25000,
    inss: 0,
    irpf: 0,
    outrosDescontos: 0,
    fgts: 0,
    totalDescontos: 3500,
    status: 'FECHADA' as any
  });

  const [folhaMensalCompetencia, setFolhaMensalCompetencia] = useState('08/2026');
  // Ajustes por funcionário antes de gerar a folha do mês — chave é o
  // funcionarioId, valor é {proventos, descontos}. Começa vazio; se o
  // usuário não editar uma linha, usa o salário base do cadastro como
  // provento padrão e desconto 0.
  const [folhaMensalAjustes, setFolhaMensalAjustes] = useState<Record<string, { proventos: number; descontos: number }>>({});

  // Handlers
  const handleOpenFunc = (f?: FuncionarioRH) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (f) {
      setEditingFunc(f);
      setFuncForm({
        nome: f.nome,
        cpf: f.cpf,
        cargo: f.cargo,
        departamento: f.departamento,
        salarioBase: f.salarioBase || 0,
        dataAdmissao: f.dataAdmissao || new Date().toISOString().split('T')[0],
        status: f.status
      });
    } else {
      setEditingFunc(null);
      setFuncForm({
        nome: '',
        cpf: '',
        cargo: 'Técnico Agrícola',
        departamento: 'TECNICO',
        salarioBase: 3800.00,
        dataAdmissao: new Date().toISOString().split('T')[0],
        status: 'ATIVO'
      });
    }
    setShowFuncModal(true);
  };

  const handleSaveFunc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!funcForm.nome || !funcForm.cpf) return;
    if (editingFunc) {
      updateFuncionarioRH(editingFunc.id, funcForm);
    } else {
      addFuncionarioRH(funcForm);
    }
    setShowFuncModal(false);
  };

  const handleOpenFolha = (folha?: FolhaPagamento) => {
    if (!canWrite) { blockWriteAction(); return; }
    if (folha) {
      setEditingFolha(folha);
      setFolhaForm({
        funcionarioId: folha.funcionarioId || '',
        funcionarioNome: folha.funcionarioNome || '',
        competencia: folha.competencia,
        totalProventos: folha.totalProventos,
        inss: folha.inss ?? 0,
        irpf: folha.irpf ?? 0,
        outrosDescontos: folha.outrosDescontos ?? 0,
        fgts: folha.fgts ?? 0,
        totalDescontos: folha.totalDescontos,
        status: folha.status
      });
    } else {
      setEditingFolha(null);
      const proventosPadrao = funcionariosRH[0]?.salarioBase || 3000;
      const { inss, irpf, fgts } = calcularDescontosFolha(proventosPadrao);
      setFolhaForm({
        funcionarioId: funcionariosRH[0]?.id || '',
        funcionarioNome: funcionariosRH[0]?.nome || '',
        competencia: '08/2026',
        totalProventos: proventosPadrao,
        inss,
        irpf,
        outrosDescontos: 0,
        fgts,
        totalDescontos: inss + irpf,
        status: 'FECHADA'
      });
    }
    setShowFolhaModal(true);
  };

  // Recalcula INSS/IRPF/FGTS a partir do total de proventos atual
  const handleRecalcularDescontos = () => {
    const { inss, irpf, fgts } = calcularDescontosFolha(folhaForm.totalProventos);
    setFolhaForm(prev => ({ ...prev, inss, irpf, fgts, totalDescontos: inss + irpf + prev.outrosDescontos }));
  };

  const handleSaveFolha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { blockWriteAction(); return; }
    if (!folhaForm.funcionarioId) {
      alert('Selecione o funcionário desta folha de pagamento.');
      return;
    }
    // O FGTS não entra no total de descontos — é encargo do empregador, não
    // é deduzido do valor líquido pago ao funcionário.
    const totalDescontos = folhaForm.inss + folhaForm.irpf + folhaForm.outrosDescontos;
    const liquido = folhaForm.totalProventos - totalDescontos;
    const payload = { ...folhaForm, totalDescontos };
    if (editingFolha) {
      updateFolhaPagamento(editingFolha.id, {
        ...payload,
        totalLiquido: liquido
      });
    } else {
      addFolhaPagamento({
        ...payload,
        totalLiquido: liquido,
        dataPagamento: new Date().toISOString().split('T')[0]
      });
    }
    setShowFolhaModal(false);
    playActionCompleteSound();
  };

  const handleOpenFolhaMensal = () => {
    if (!canWrite) { blockWriteAction(); return; }
    setFolhaMensalAjustes({});
    setShowFolhaMensalModal(true);
  };

  // Gera a folha de pagamento do mês para TODOS os colaboradores com status
  // ATIVO de uma vez
  const handleGerarFolhaMensal = () => {
    if (!canWrite) { blockWriteAction(); return; }
    if (!folhaMensalCompetencia.trim()) {
      alert('Informe a competência (mês/ano) da folha.');
      return;
    }
    const ativos = funcionariosRH.filter(f => f.status === 'ATIVO');
    if (ativos.length === 0) {
      alert('Não há colaboradores com status ATIVO cadastrados.');
      return;
    }

    const jaGerados = new Set(
      folhaPagamento
        .filter(f => (f.competencia || f.competenciaMesAno) === folhaMensalCompetencia)
        .map(f => f.funcionarioId)
    );

    let geradas = 0;
    let puladas = 0;
    ativos.forEach(func => {
      if (jaGerados.has(func.id)) { puladas++; return; }
      const ajuste = folhaMensalAjustes[func.id];
      const proventos = ajuste?.proventos ?? func.salarioBase ?? 0;
      const { inss, irpf, fgts } = calcularDescontosFolha(proventos);
      const descontos = ajuste?.descontos ?? (inss + irpf);
      addFolhaPagamento({
        funcionarioId: func.id,
        funcionarioNome: func.nome,
        competencia: folhaMensalCompetencia,
        totalProventos: proventos,
        inss,
        irpf,
        fgts,
        outrosDescontos: 0,
        totalDescontos: descontos,
        totalLiquido: proventos - descontos,
        status: 'FECHADA',
        dataPagamento: new Date().toISOString().split('T')[0]
      });
      geradas++;
    });

    setShowFolhaMensalModal(false);
    playActionCompleteSound();
    if (puladas > 0) {
      alert(`Folha de ${folhaMensalCompetencia} gerada para ${geradas} colaborador(es). ${puladas} já tinham folha lançada nesta competência e foram ignorados.`);
    }
  };

  // Extrai mês/ano de "competencia" no formato "MM/AAAA"
  const getMesAnoCompetencia = (competencia?: string): [string, string] => {
    if (!competencia) return ['', ''];
    const partes = competencia.split('/');
    return partes.length === 2 ? [partes[0].padStart(2, '0'), partes[1]] : ['', ''];
  };

  const anosDisponiveis = Array.from(new Set(
    folhaPagamento.map(f => getMesAnoCompetencia(f.competencia || f.competenciaMesAno)[1]).filter(Boolean)
  )).sort().reverse();

  const filteredFolhaPagamento = folhaPagamento.filter(f => {
    if (filterFuncionarioId && f.funcionarioId !== filterFuncionarioId) return false;
    const [mes, ano] = getMesAnoCompetencia(f.competencia || f.competenciaMesAno);
    if (filterMes && mes !== filterMes) return false;
    if (filterAno && ano !== filterAno) return false;
    return true;
  });

  // Totais consolidados da listagem atual
  const totalProventosGeral = filteredFolhaPagamento.reduce((acc, curr) => acc + (curr.totalProventos || 0), 0);
  const totalInssGeral = filteredFolhaPagamento.reduce((acc, curr) => acc + (curr.inss || 0), 0);
  const totalIrpfGeral = filteredFolhaPagamento.reduce((acc, curr) => acc + (curr.irpf || 0), 0);
  const totalOutrosDescontosGeral = filteredFolhaPagamento.reduce((acc, curr) => acc + (curr.outrosDescontos || 0), 0);
  const totalDescontosGeral = filteredFolhaPagamento.reduce((acc, curr) => acc + (curr.totalDescontos || 0), 0);
  const totalLiquidoGeral = filteredFolhaPagamento.reduce((acc, curr) => acc + (curr.totalLiquido || 0), 0);
  const totalFgtsGeral = filteredFolhaPagamento.reduce((acc, curr) => acc + (curr.fgts || 0), 0);

  // Exportação para PDF em Modo Paisagem (A4 Landscape)
  const handleExportarPDFPaisagem = () => {
    if (filteredFolhaPagamento.length === 0) {
      alert('Nenhum registro de folha de pagamento para exportar com os filtros selecionados.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const marginLeft = 14;
    const marginRight = 14;
    const contentWidth = pageWidth - marginLeft - marginRight; // 269mm
    let currentY = 16;
    let pageNumber = 1;

    const printHeader = () => {
      // Faixa Superior / Marca
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(marginLeft, currentY, contentWidth, 2, 'F');
      currentY += 7;

      // Nome da Cooperativa e Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      const coopNome = (config?.nomeCooperativa || 'SICOOP - COOPERATIVA AGROPECUÁRIA').toUpperCase();
      doc.text(coopNome, marginLeft, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      const cnpjTexto = config?.cnpj ? `CNPJ: ${config.cnpj}` : '';
      if (cnpjTexto) {
        doc.text(cnpjTexto, pageWidth - marginRight, currentY, { align: 'right' });
      }
      currentY += 6;

      // Subtítulo do Relatório
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text('RELATÓRIO GERAL DE FOLHA DE PAGAMENTO (SisRH)', marginLeft, currentY);

      // Data e Hora de Emissão
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const dataEmissao = `Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(dataEmissao, pageWidth - marginRight, currentY, { align: 'right' });
      currentY += 5.5;

      // Metadados / Filtros Aplicados
      let filtroDesc = 'Filtros: ';
      if (filterFuncionarioId) {
        const funcSel = funcionariosRH.find(f => f.id === filterFuncionarioId);
        filtroDesc += `Colaborador: ${funcSel?.nome || 'Selecionado'} | `;
      } else {
        filtroDesc += 'Colaborador: Todos | ';
      }
      if (filterMes) {
        const mesObj = MESES_FILTRO.find(m => m.valor === filterMes);
        filtroDesc += `Mês: ${mesObj?.label || filterMes} | `;
      } else {
        filtroDesc += 'Mês: Todos | ';
      }
      if (filterAno) {
        filtroDesc += `Ano: ${filterAno}`;
      } else {
        filtroDesc += 'Ano: Todos';
      }
      filtroDesc += ` (Total: ${filteredFolhaPagamento.length} registro(s))`;

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(filtroDesc, marginLeft, currentY);
      currentY += 5;

      // Linha divisória
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
      currentY += 4;

      // Cabeçalho da Tabela
      const colWidths = [56, 40, 20, 24, 20, 20, 20, 23, 26, 20];
      const headers = [
        'Colaborador',
        'Cargo / Função',
        'Comp.',
        'Bruto (R$)',
        'INSS (R$)',
        'IRPF (R$)',
        'Outros (R$)',
        'Tot. Desc.',
        'Líquido (R$)',
        'FGTS (R$)'
      ];

      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85); // slate-700

      let colX = marginLeft;
      headers.forEach((h, idx) => {
        const w = colWidths[idx];
        const isRightAlign = idx >= 3;
        if (isRightAlign) {
          doc.text(h, colX + w - 2, currentY + 4.8, { align: 'right' });
        } else {
          doc.text(h, colX + 2, currentY + 4.8);
        }
        colX += w;
      });

      currentY += 7.5;
    };

    const printFooter = () => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Siscoop Platform — Sistema Integrado de Gestão de Cooperativas', marginLeft, pageHeight - 7);
      doc.text(`Página ${pageNumber}`, pageWidth - marginRight, pageHeight - 7, { align: 'right' });
    };

    printHeader();

    const colWidths = [56, 40, 20, 24, 20, 20, 20, 23, 26, 20];

    filteredFolhaPagamento.forEach((folha, idx) => {
      // Verifica se precisa quebrar página
      if (currentY > pageHeight - 26) {
        printFooter();
        doc.addPage('a4', 'landscape');
        pageNumber++;
        currentY = 16;
        printHeader();
      }

      // Fundo zebrado
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginLeft, currentY - 0.8, contentWidth, 6.2, 'F');
      }

      const funcObj = funcionariosRH.find(f => f.id === folha.funcionarioId);
      const cargoDepto = funcObj?.cargo || 'Colaborador';

      const colaboradorNome = (folha.funcionarioNome || funcObj?.nome || '—').slice(0, 32);
      const cargoTexto = cargoDepto.slice(0, 24);
      const compTexto = folha.competencia || folha.competenciaMesAno || '—';
      const brutoFormatado = (folha.totalProventos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const inssFormatado = (folha.inss || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const irpfFormatado = (folha.irpf || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const outrosFormatado = (folha.outrosDescontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const descontosFormatado = (folha.totalDescontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const liquidoFormatado = (folha.totalLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const fgtsFormatado = (folha.fgts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59); // slate-800

      let colX = marginLeft;
      // Colaborador
      doc.setFont('helvetica', 'bold');
      doc.text(colaboradorNome, colX + 2, currentY + 3.5);
      colX += colWidths[0];

      // Cargo
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(cargoTexto, colX + 2, currentY + 3.5);
      colX += colWidths[1];

      // Comp
      doc.setTextColor(71, 85, 105);
      doc.text(compTexto, colX + 2, currentY + 3.5);
      colX += colWidths[2];

      // Bruto
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(brutoFormatado, colX + colWidths[3] - 2, currentY + 3.5, { align: 'right' });
      colX += colWidths[3];

      // INSS
      doc.setTextColor(185, 28, 28);
      doc.text(inssFormatado, colX + colWidths[4] - 2, currentY + 3.5, { align: 'right' });
      colX += colWidths[4];

      // IRPF
      doc.setTextColor(185, 28, 28);
      doc.text(irpfFormatado, colX + colWidths[5] - 2, currentY + 3.5, { align: 'right' });
      colX += colWidths[5];

      // Outros
      doc.setTextColor(185, 28, 28);
      doc.text(outrosFormatado, colX + colWidths[6] - 2, currentY + 3.5, { align: 'right' });
      colX += colWidths[6];

      // Total Desc
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text(descontosFormatado, colX + colWidths[7] - 2, currentY + 3.5, { align: 'right' });
      colX += colWidths[7];

      // Líquido
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text(liquidoFormatado, colX + colWidths[8] - 2, currentY + 3.5, { align: 'right' });
      colX += colWidths[8];

      // FGTS
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(fgtsFormatado, colX + colWidths[9] - 2, currentY + 3.5, { align: 'right' });

      currentY += 6.2;
    });

    // Bloco de Totais Consolidados no Rodapé da Tabela
    if (currentY > pageHeight - 32) {
      printFooter();
      doc.addPage('a4', 'landscape');
      pageNumber++;
      currentY = 16;
      printHeader();
    }

    currentY += 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
    currentY += 1.5;

    doc.setFillColor(241, 245, 249);
    doc.rect(marginLeft, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    let totX = marginLeft;
    doc.text(`TOTAIS CONSOLIDADOS (${filteredFolhaPagamento.length} reg.):`, totX + 2, currentY + 4.8);
    totX += colWidths[0] + colWidths[1] + colWidths[2];

    // Total Bruto
    doc.text(totalProventosGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totX + colWidths[3] - 2, currentY + 4.8, { align: 'right' });
    totX += colWidths[3];

    // Total INSS
    doc.setTextColor(185, 28, 28);
    doc.text(totalInssGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totX + colWidths[4] - 2, currentY + 4.8, { align: 'right' });
    totX += colWidths[4];

    // Total IRPF
    doc.text(totalIrpfGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totX + colWidths[5] - 2, currentY + 4.8, { align: 'right' });
    totX += colWidths[5];

    // Total Outros
    doc.text(totalOutrosDescontosGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totX + colWidths[6] - 2, currentY + 4.8, { align: 'right' });
    totX += colWidths[6];

    // Total Geral Descontos
    doc.text(totalDescontosGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totX + colWidths[7] - 2, currentY + 4.8, { align: 'right' });
    totX += colWidths[7];

    // Total Líquido Geral
    doc.setTextColor(4, 120, 87);
    doc.text(totalLiquidoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totX + colWidths[8] - 2, currentY + 4.8, { align: 'right' });
    totX += colWidths[8];

    // Total FGTS Geral
    doc.setTextColor(71, 85, 105);
    doc.text(totalFgtsGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), totX + colWidths[9] - 2, currentY + 4.8, { align: 'right' });

    printFooter();

    const competenciaNome = filterMes && filterAno ? `-${filterMes}-${filterAno}` : (filterAno ? `-${filterAno}` : '');
    doc.save(`folha-pagamento-sisrh${competenciaNome}.pdf`);
    playActionCompleteSound();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200 mb-2">
            <UserCheck className="w-3.5 h-3.5" /> Módulo SisRH
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SisRH - Recursos Humanos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão do quadro de colaboradores, motoristas de logística, agrônomos, contadores e folha de pagamento.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'funcionarios' && (
            <button
              onClick={() => handleOpenFunc()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Colaborador
            </button>
          )}
          {activeTab === 'folha' && (
            <>
              <button
                onClick={handleExportarPDFPaisagem}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                title="Exportar listagem filtrada para relatório PDF em orientação Paisagem (A4)"
              >
                <FileDown className="w-4 h-4 text-emerald-400" /> Exportar PDF (Paisagem)
              </button>
              <button
                onClick={handleOpenFolhaMensal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Gerar Folha do Mês
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('funcionarios')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'funcionarios'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Colaboradores Registrados ({funcionariosRH.length})
        </button>
        <button
          onClick={() => setActiveTab('folha')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'folha'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Folha de Pagamento ({folhaPagamento.length})
        </button>
      </div>

      {/* Tab Funcionarios */}
      {activeTab === 'funcionarios' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="p-3">Nome Completo</th>
                  <th className="p-3">CPF</th>
                  <th className="p-3">Cargo / Função</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Salário Base</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funcionariosRH.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-900">{f.nome}</td>
                    <td className="p-3 font-mono text-slate-600">{f.cpf}</td>
                    <td className="p-3 font-semibold text-slate-800">{f.cargo}</td>
                    <td className="p-3 text-slate-600">{f.departamento}</td>
                    <td className="p-3 font-bold text-emerald-700">R$ {(f.salarioBase || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        {f.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenFunc(f)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canWrite) { blockWriteAction(); return; }
                            if (confirm(`Deseja excluir o colaborador ${f.nome}?`)) deleteFuncionarioRH(f.id);
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Folha de Pagamento */}
      {activeTab === 'folha' && (
        <div className="space-y-4">
          {/* Filtros e Barra de Ações */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 font-bold text-[10px] uppercase mb-1">Funcionário</label>
              <select
                value={filterFuncionarioId}
                onChange={e => setFilterFuncionarioId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="">Todos os Funcionários</option>
                {funcionariosRH.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-bold text-[10px] uppercase mb-1">Mês</label>
              <select
                value={filterMes}
                onChange={e => setFilterMes(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="">Todos os Meses</option>
                {MESES_FILTRO.map(m => (
                  <option key={m.valor} value={m.valor}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-bold text-[10px] uppercase mb-1">Ano</label>
              <select
                value={filterAno}
                onChange={e => setFilterAno(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="">Todos os Anos</option>
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span><strong>{filteredFolhaPagamento.length}</strong> de {folhaPagamento.length} folha(s) exibida(s)</span>
                {(filterFuncionarioId || filterMes || filterAno) && (
                  <button
                    type="button"
                    onClick={() => { setFilterFuncionarioId(''); setFilterMes(''); setFilterAno(''); }}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenFolha()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Lançamento Avulso
                </button>
              </div>
            </div>
          </div>

          {/* Tabela da Folha de Pagamento */}
          {filteredFolhaPagamento.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs text-center text-slate-400 italic text-sm">
              Nenhuma folha de pagamento encontrada com os filtros selecionados.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[11px]">
                      <th className="p-3.5">Colaborador</th>
                      <th className="p-3.5">Competência</th>
                      <th className="p-3.5 text-right">Salário Bruto</th>
                      <th className="p-3.5 text-right">INSS</th>
                      <th className="p-3.5 text-right">IRPF</th>
                      <th className="p-3.5 text-right">Outros Desc.</th>
                      <th className="p-3.5 text-right">Total Descontos</th>
                      <th className="p-3.5 text-right font-black text-emerald-800">Líquido a Pagar</th>
                      <th className="p-3.5 text-right text-slate-400">FGTS (Encargo)</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFolhaPagamento.map(folha => {
                      const func = funcionariosRH.find(f => f.id === folha.funcionarioId);
                      return (
                        <tr key={folha.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="font-extrabold text-slate-900 block">{folha.funcionarioNome || func?.nome || 'Funcionário não vinculado'}</span>
                            <span className="text-[10px] text-slate-500">{func?.cargo || 'Colaborador'}</span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-700 whitespace-nowrap">
                            {folha.competencia || folha.competenciaMesAno || '—'}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            R$ {(folha.totalProventos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-medium text-rose-600 whitespace-nowrap">
                            - R$ {(folha.inss || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-medium text-rose-600 whitespace-nowrap">
                            - R$ {(folha.irpf || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-medium text-rose-600 whitespace-nowrap">
                            - R$ {(folha.outrosDescontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-bold text-rose-700 whitespace-nowrap">
                            - R$ {(folha.totalDescontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-black text-emerald-700 bg-emerald-50/30 whitespace-nowrap text-[13px]">
                            R$ {(folha.totalLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right text-slate-500 whitespace-nowrap" title="FGTS (Encargo do empregador - informativo)">
                            R$ {(folha.fgts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                              folha.status === 'PAGA' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {folha.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenFolha(folha)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-emerald-700 transition-colors"
                                title="Editar lançamento"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (!canWrite) { blockWriteAction(); return; }
                                  if (confirm(`Deseja excluir a folha de ${folha.competencia}?`)) deleteFolhaPagamento(folha.id);
                                }}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                title="Excluir lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-300">
                      <td className="p-3.5 uppercase text-[11px]" colSpan={2}>
                        Total Consolidado ({filteredFolhaPagamento.length} itens)
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        R$ {totalProventosGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-rose-700 whitespace-nowrap">
                        - R$ {totalInssGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-rose-700 whitespace-nowrap">
                        - R$ {totalIrpfGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-rose-700 whitespace-nowrap">
                        - R$ {totalOutrosDescontosGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-rose-800 whitespace-nowrap">
                        - R$ {totalDescontosGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-emerald-800 bg-emerald-100/50 whitespace-nowrap text-sm">
                        R$ {totalLiquidoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-slate-600 whitespace-nowrap">
                        R$ {totalFgtsGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Funcionário */}
      {showFuncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">
                {editingFunc ? 'Editar Colaborador' : 'Cadastrar Novo Colaborador'}
              </h2>
              <button onClick={() => setShowFuncModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFunc} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={funcForm.nome}
                  onChange={e => setFuncForm({ ...funcForm, nome: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="Ex: Carlos Eduardo"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">CPF *</label>
                <input
                  type="text"
                  required
                  value={funcForm.cpf}
                  onChange={e => setFuncForm({ ...funcForm, cpf: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cargo</label>
                  <input
                    type="text"
                    value={funcForm.cargo}
                    onChange={e => setFuncForm({ ...funcForm, cargo: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Salário Base (R$)</label>
                  <input
                    type="number"
                    value={funcForm.salarioBase}
                    onChange={e => setFuncForm({ ...funcForm, salarioBase: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFuncModal(false)}
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

      {/* Modal Folha */}
      {showFolhaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingFolha ? 'Editar Folha de Pagamento' : 'Lançamento Individual de Folha'}
              </h2>
              <button onClick={() => setShowFolhaModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {!editingFolha && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                Use isto só para um lançamento avulso (ex.: bônus, correção). Para gerar a folha do mês de todos os colaboradores de uma vez, use o botão "Gerar Folha do Mês".
              </p>
            )}
            <form onSubmit={handleSaveFolha} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Funcionário *</label>
                <select
                  required
                  value={folhaForm.funcionarioId}
                  onChange={e => {
                    const func = funcionariosRH.find(f => f.id === e.target.value);
                    const proventos = func?.salarioBase || folhaForm.totalProventos;
                    const { inss, irpf, fgts } = calcularDescontosFolha(proventos);
                    setFolhaForm({
                      ...folhaForm,
                      funcionarioId: e.target.value,
                      funcionarioNome: func?.nome || '',
                      totalProventos: proventos,
                      inss, irpf, fgts,
                      totalDescontos: inss + irpf + folhaForm.outrosDescontos
                    });
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="">Selecione o funcionário...</option>
                  {funcionariosRH.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}{f.cargo ? ` — ${f.cargo}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Competência (Mês/Ano) *</label>
                <input
                  type="text"
                  required
                  value={folhaForm.competencia}
                  onChange={e => setFolhaForm({ ...folhaForm, competencia: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                  placeholder="08/2026"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Total Proventos / Salário Bruto (R$)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={folhaForm.totalProventos}
                    onChange={e => setFolhaForm({ ...folhaForm, totalProventos: parseFloat(e.target.value) || 0 })}
                    className="flex-1 p-2.5 border border-slate-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleRecalcularDescontos}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] whitespace-nowrap"
                    title="Recalcular INSS/IRPF/FGTS a partir do valor bruto acima"
                  >
                    Recalcular Descontos
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">INSS (R$)</label>
                  <input
                    type="number"
                    value={folhaForm.inss}
                    onChange={e => setFolhaForm({ ...folhaForm, inss: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">IRPF (R$)</label>
                  <input
                    type="number"
                    value={folhaForm.irpf}
                    onChange={e => setFolhaForm({ ...folhaForm, irpf: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Outros Descontos (R$)</label>
                  <input
                    type="number"
                    value={folhaForm.outrosDescontos}
                    onChange={e => setFolhaForm({ ...folhaForm, outrosDescontos: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                    title="Vale-transporte, adiantamentos, faltas, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">FGTS — Encargo do Empregador (R$)</label>
                <input
                  type="number"
                  value={folhaForm.fgts}
                  onChange={e => setFolhaForm({ ...folhaForm, fgts: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                />
                <p className="text-[10px] text-slate-400 mt-1">Informativo — 8% sobre o bruto. Não é descontado do funcionário, é custo da cooperativa.</p>
              </div>

              <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                INSS e IRPF são estimados por faixas aproximadas e servem de ponto de partida — confira com o contador antes de fechar a folha oficial.
              </p>

              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs font-bold flex justify-between">
                <span>Líq. Calculado a Pagar:</span>
                <span>R$ {((folhaForm.totalProventos || 0) - (folhaForm.inss || 0) - (folhaForm.irpf || 0) - (folhaForm.outrosDescontos || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFolhaModal(false)}
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

      {/* Modal: Gerar Folha do Mês para Todos os Colaboradores */}
      {showFolhaMensalModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Gerar Folha do Mês</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cria uma folha de pagamento para cada colaborador ativo. Ajuste os valores individualmente se algum for diferente do salário base cadastrado.
                </p>
              </div>
              <button onClick={() => setShowFolhaMensalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">Competência (Mês/Ano) *</label>
              <input
                type="text"
                value={folhaMensalCompetencia}
                onChange={e => setFolhaMensalCompetencia(e.target.value)}
                className="w-full max-w-[160px] p-2.5 border border-slate-200 rounded-xl text-xs"
                placeholder="08/2026"
              />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Cargo</th>
                    <th className="p-3 text-right">Proventos (R$)</th>
                    <th className="p-3 text-right">Descontos INSS+IRPF (R$)</th>
                    <th className="p-3 text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {funcionariosRH.filter(f => f.status === 'ATIVO').map(f => {
                    const ajuste = folhaMensalAjustes[f.id];
                    const proventos = ajuste?.proventos ?? f.salarioBase ?? 0;
                    const { inss, irpf } = calcularDescontosFolha(proventos);
                    const descontos = ajuste?.descontos ?? Number((inss + irpf).toFixed(2));
                    const jaTemFolha = folhaPagamento.some(fp => fp.funcionarioId === f.id && (fp.competencia || fp.competenciaMesAno) === folhaMensalCompetencia);
                    return (
                      <tr key={f.id} className={jaTemFolha ? 'opacity-40' : ''}>
                        <td className="p-3 font-bold text-slate-900">
                          {f.nome}
                          {jaTemFolha && <span className="block text-[10px] text-amber-600 font-bold">Já tem folha nesta competência</span>}
                        </td>
                        <td className="p-3 text-slate-600">{f.cargo}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            disabled={jaTemFolha}
                            value={proventos}
                            onChange={e => {
                              const novoProventos = parseFloat(e.target.value) || 0;
                              const { inss: novoInss, irpf: novoIrpf } = calcularDescontosFolha(novoProventos);
                              setFolhaMensalAjustes(prev => ({ ...prev, [f.id]: { proventos: novoProventos, descontos: Number((novoInss + novoIrpf).toFixed(2)) } }));
                            }}
                            className="w-24 p-1.5 border border-slate-200 rounded-lg text-right disabled:bg-slate-100"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            disabled={jaTemFolha}
                            value={descontos}
                            onChange={e => setFolhaMensalAjustes(prev => ({ ...prev, [f.id]: { proventos, descontos: parseFloat(e.target.value) || 0 } }))}
                            className="w-24 p-1.5 border border-slate-200 rounded-lg text-right disabled:bg-slate-100"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          R$ {(proventos - descontos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {funcionariosRH.filter(f => f.status === 'ATIVO').length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">Nenhum colaborador com status ATIVO cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFolhaMensalModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGerarFolhaMensal}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 text-xs"
              >
                Gerar Folha do Mês
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
