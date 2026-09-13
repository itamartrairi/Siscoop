import React, { useState, useMemo } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  CheckCircle,
  Users,
  Wallet,
  Calendar,
  Award,
  Activity,
  Gift,
  Search,
  Truck,
  PackageCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from '@e965/xlsx';

export const RelatoriosView: React.FC = () => {
  const {
    cooperados,
    transacoesCapital,
    assembleias,
    mandatos,
    auditoriaLogs,
    pedidosProdutorPAA,
    produtores,
    config
  } = useCoop();

  const [selectedReportType, setSelectedReportType] = useState<
    'COOPERADOS' | 'CAPITAL' | 'INTEGRALIZACOES' | 'INADIMPLENCIA' | 'ASSEMBLEIAS' | 'MANDATOS' | 'ANIVERSARIANTES' | 'AUDITORIA' | 'PEDIDOS_ENTREGAS'
  >('COOPERADOS');

  const [filterSituacao, setFilterSituacao] = useState('TODOS');
  const [filterCategoria, setFilterCategoria] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Unique lists for Pedidos e Entregas dropdowns
  const optionsProdutores = useMemo(() => {
    const setNames = new Set<string>();
    produtores.forEach(p => setNames.add(p.nome));
    pedidosProdutorPAA.forEach(ped => {
      ped.itens?.forEach(it => {
        if (it.produtorNome) setNames.add(it.produtorNome);
      });
    });
    return Array.from(setNames).sort();
  }, [produtores, pedidosProdutorPAA]);

  // Filtered Data based on selectedReportType and filters
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();

    switch (selectedReportType) {
      case 'COOPERADOS':
        return cooperados.filter(c => {
          const matchSituacao = filterSituacao === 'TODOS' || c.situacao === filterSituacao;
          const matchCategoria = filterCategoria === 'TODOS' || c.categoria === filterCategoria;
          const matchSearch = !term || c.nome.toLowerCase().includes(term) || c.cpf.includes(term) || c.matricula.toLowerCase().includes(term);
          return matchSituacao && matchCategoria && matchSearch;
        });

      case 'CAPITAL':
      case 'INTEGRALIZACOES':
        return transacoesCapital.filter(tx => {
          const matchSearch = !term || tx.cooperadoNome.toLowerCase().includes(term) || tx.numeroDocumento.toLowerCase().includes(term) || tx.tipo.toLowerCase().includes(term);
          const matchType = selectedReportType === 'INTEGRALIZACOES' ? tx.tipo.includes('INTEGRALIZACAO') || tx.tipo.includes('Integralização') : true;
          return matchSearch && matchType;
        });

      case 'INADIMPLENCIA':
        return cooperados.filter(c => {
          const debito = c.capitalSubscrito - c.capitalIntegralizado;
          const matchSearch = !term || c.nome.toLowerCase().includes(term) || c.cpf.includes(term);
          const matchSituacao = filterSituacao === 'TODOS' || c.situacao === filterSituacao;
          return debito > 0 && matchSearch && matchSituacao;
        });

      case 'ASSEMBLEIAS':
        return assembleias.filter(a => {
          const matchSearch = !term || a.titulo.toLowerCase().includes(term) || a.local.toLowerCase().includes(term);
          const matchSituacao = filterSituacao === 'TODOS' || a.status === filterSituacao;
          return matchSearch && matchSituacao;
        });

      case 'MANDATOS':
        return mandatos.filter(m => {
          const matchSearch = !term || m.nome.toLowerCase().includes(term) || m.cargo.toLowerCase().includes(term);
          const matchSituacao = filterSituacao === 'TODOS' || m.status === filterSituacao;
          return matchSearch && matchSituacao;
        });

      case 'ANIVERSARIANTES':
        return cooperados.filter(c => {
          const matchSearch = !term || c.nome.toLowerCase().includes(term);
          const matchCat = filterCategoria === 'TODOS' || c.categoria === filterCategoria;
          return matchSearch && matchCat;
        });

      case 'AUDITORIA':
        return auditoriaLogs.filter(log => {
          const matchSearch = !term || log.acao.toLowerCase().includes(term) || log.usuario.toLowerCase().includes(term) || log.detalhes.toLowerCase().includes(term);
          return matchSearch;
        });

      case 'PEDIDOS_ENTREGAS':
        // Cada pedido tem vários itens (um por produtor/produto); a tabela mostra
        // uma linha por item, então "achatamos" pedidosProdutorPAA.itens aqui.
        return pedidosProdutorPAA.flatMap(p =>
          (p.itens || []).map((it, idx) => ({
            id: `${p.id}-${idx}`,
            numeroPedido: p.numeroPedido,
            programa: p.programa,
            chamadaPublica: p.chamadaPublicaEdital,
            escola: it.escolaNome || p.escolaNome || '—',
            produtor: it.produtorNome,
            produto: it.produtoNome,
            quantidade: it.quantidadePedida,
            unidade: it.unidadeMedida,
            valorTotal: it.valorTotalItem,
            status: p.status,
            data: p.dataPedido,
            ano: (p.dataPedido || '').substring(0, 4),
            mes: (p.dataPedido || '').substring(5, 7),
          }))
        ).filter(item => {
          const matchSearch = !term ||
            item.numeroPedido.toLowerCase().includes(term) ||
            (item.produtor || '').toLowerCase().includes(term) ||
            (item.produto || '').toLowerCase().includes(term) ||
            (item.escola || '').toLowerCase().includes(term);
          const matchSituacao = filterSituacao === 'TODOS' || item.status === filterSituacao;
          return matchSearch && matchSituacao;
        });

      default:
        return [];
    }
  }, [selectedReportType, cooperados, transacoesCapital, assembleias, mandatos, auditoriaLogs, pedidosProdutorPAA, filterSituacao, filterCategoria, searchTerm]);

  // Export as PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(config.nomeCooperativa || 'Sicoop Plataforma', 20, 20);
    doc.setFontSize(10);
    doc.text(`CNPJ: ${config.cnpj || '00.000.000/0001-00'}`, 20, 26);
    doc.text(`RELATÓRIO GERENCIAL: ${selectedReportType}`, 20, 36);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 20, 42);

    let y = 52;
    doc.setFontSize(8);

    filteredData.forEach((item: any, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      let lineText = '';
      if (selectedReportType === 'COOPERADOS' || selectedReportType === 'ANIVERSARIANTES') {
        lineText = `${item.matricula || '-'} | ${item.nome || ''} | CPF: ${item.cpf || ''} | Cat: ${item.categoria || ''} | Sit: ${item.situacao || ''}`;
      } else if (selectedReportType === 'CAPITAL' || selectedReportType === 'INTEGRALIZACOES') {
        lineText = `Doc: ${item.numeroDocumento} | ${item.cooperadoNome} | Tipo: ${item.tipo} | R$ ${item.valor}`;
      } else if (selectedReportType === 'INADIMPLENCIA') {
        lineText = `${item.matricula} | ${item.nome} | Subscrito: R$ ${item.capitalSubscrito} | Débito: R$ ${item.capitalSubscrito - item.capitalIntegralizado}`;
      } else if (selectedReportType === 'ASSEMBLEIAS') {
        lineText = `${item.data} | ${item.titulo} | Local: ${item.local} | Status: ${item.status}`;
      } else if (selectedReportType === 'MANDATOS') {
        lineText = `${item.cargo}: ${item.nome} (${item.inicioMandato} até ${item.fimMandato})`;
      } else if (selectedReportType === 'AUDITORIA') {
        lineText = `${item.data} | ${item.usuario} | ${item.acao} | ${item.detalhes}`;
      } else if (selectedReportType === 'PEDIDOS_ENTREGAS') {
        lineText = `Ped: ${item.numeroPedido} | Escola: ${item.escola} | Produtor: ${item.produtor} | Produto: ${item.produto} (${item.quantidade} ${item.unidade}) | R$ ${item.valorTotal}`;
      }

      doc.text(`${index + 1}. ${lineText}`, 20, y);
      y += 6;
    });

    doc.save(`Relatorio_${selectedReportType}_${Date.now()}.pdf`);
  };

  // Export as Excel XLSX
  const handleExportExcel = () => {
    let exportData: any[] = [];

    if (selectedReportType === 'COOPERADOS') {
      exportData = filteredData.map((c: any) => ({
        Matricula: c.matricula,
        Nome: c.nome,
        CPF: c.cpf,
        Situacao: c.situacao,
        Categoria: c.categoria,
        Cidade: c.cidade,
        UF: c.estado,
        Telefone: c.celular || c.telefone,
        CapitalSubscrito: c.capitalSubscrito,
        CapitalIntegralizado: c.capitalIntegralizado
      }));
    } else if (selectedReportType === 'CAPITAL' || selectedReportType === 'INTEGRALIZACOES') {
      exportData = filteredData.map((tx: any) => ({
        Documento: tx.numeroDocumento,
        Data: tx.data,
        Cooperado: tx.cooperadoNome,
        Matricula: tx.cooperadoMatricula,
        Tipo: tx.tipo,
        FormaPagamento: tx.formaPagamento,
        Valor: tx.valor,
        Usuario: tx.usuario
      }));
    } else if (selectedReportType === 'INADIMPLENCIA') {
      exportData = filteredData.map((c: any) => ({
        Matricula: c.matricula,
        Nome: c.nome,
        CPF: c.cpf,
        CapitalSubscrito: c.capitalSubscrito,
        CapitalIntegralizado: c.capitalIntegralizado,
        DebitoPendente: c.capitalSubscrito - c.capitalIntegralizado
      }));
    } else if (selectedReportType === 'ASSEMBLEIAS') {
      exportData = filteredData.map((a: any) => ({
        Titulo: a.titulo,
        Data: a.data,
        Local: a.local,
        Status: a.status,
        Tipo: a.tipo
      }));
    } else if (selectedReportType === 'MANDATOS') {
      exportData = filteredData.map((m: any) => ({
        Cargo: m.cargo,
        Nome: m.nome,
        Inicio: m.inicioMandato,
        Fim: m.fimMandato,
        Status: m.status
      }));
    } else if (selectedReportType === 'ANIVERSARIANTES') {
      exportData = filteredData.map((c: any) => ({
        Matricula: c.matricula,
        Nome: c.nome,
        Nascimento: c.dataNascimento || '01/01/1980',
        Telefone: c.celular
      }));
    } else if (selectedReportType === 'AUDITORIA') {
      exportData = filteredData.map((log: any) => ({
        Data: log.data,
        Modulo: log.modulo,
        Usuario: log.usuario,
        Acao: log.acao,
        Detalhes: log.detalhes
      }));
    } else if (selectedReportType === 'PEDIDOS_ENTREGAS') {
      exportData = filteredData.map((item: any) => ({
        NumeroPedido: item.numeroPedido,
        Programa: item.programa,
        ChamadaPublica: item.chamadaPublica,
        Escola: item.escola,
        Produtor: item.produtor,
        Produto: item.produto,
        Quantidade: item.quantidade,
        Unidade: item.unidade,
        ValorTotal: item.valorTotal,
        Data: item.data,
        Mes: item.mes,
        Ano: item.ano,
        Status: item.status
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedReportType);
    XLSX.writeFile(workbook, `SisCoope_${selectedReportType}_${Date.now()}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Central de Relatórios Gerenciais</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Geração de relatórios analíticos dinâmicos filtrados por categoria, situação e período
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Report Types Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2.5">
        {[
          { id: 'COOPERADOS', label: 'Cooperados', icon: Users, color: 'text-emerald-500' },
          { id: 'CAPITAL', label: 'Capital Social', icon: Wallet, color: 'text-blue-500' },
          { id: 'INTEGRALIZACOES', label: 'Integralizações', icon: CheckCircle, color: 'text-indigo-500' },
          { id: 'INADIMPLENCIA', label: 'Inadimplência', icon: Wallet, color: 'text-amber-500' },
          { id: 'ASSEMBLEIAS', label: 'Assembleias', icon: Calendar, color: 'text-purple-500' },
          { id: 'MANDATOS', label: 'Diretoria', icon: Award, color: 'text-amber-600' },
          { id: 'ANIVERSARIANTES', label: 'Aniversariantes', icon: Gift, color: 'text-pink-500' },
          { id: 'AUDITORIA', label: 'Auditoria', icon: Activity, color: 'text-rose-500' },
          { id: 'PEDIDOS_ENTREGAS', label: 'Pedidos e Entregas', icon: Truck, color: 'text-teal-600' },
        ].map(item => {
          const Icon = item.icon;
          const isSelected = selectedReportType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedReportType(item.id as typeof selectedReportType)}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-bold'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <span className="text-[10px] leading-tight truncate w-full">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Parameters */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Filtros Ativos ({selectedReportType})
            </span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Total de registros filtrados: <strong className="text-slate-900 dark:text-white font-mono">{filteredData.length}</strong>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap pt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Situação / Status:</span>
              <select
                value={filterSituacao}
                onChange={e => setFilterSituacao(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg outline-none font-bold"
              >
                <option value="TODOS">Todos</option>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="AGENDADA">Agendada</option>
                <option value="REALIZADA">Realizada</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Categoria:</span>
              <select
                value={filterCategoria}
                onChange={e => setFilterCategoria(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg outline-none font-bold"
              >
                <option value="TODOS">Todas</option>
                <option value="FUNDADOR">Fundador</option>
                <option value="EFETIVO">Efetivo</option>
                <option value="SUPLENTE">Suplente</option>
                <option value="HONORARIO">Honorário</option>
              </select>
            </div>

            <div className="flex items-center gap-2 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
              <input
                type="text"
                placeholder="Pesquisar no relatório..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-xs w-48 font-medium"
              />
            </div>
          </div>
      </div>

      {/* Preview Table Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
          <span>Pré-visualização do Relatório: {selectedReportType}</span>
          <span className="text-[10px] text-slate-400 font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-slate-500 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                {selectedReportType === 'COOPERADOS' && (
                  <>
                    <th className="p-4">Matrícula</th>
                    <th className="p-4">Nome do Cooperado</th>
                    <th className="p-4">CPF</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Cidade/UF</th>
                    <th className="p-4">Capital Subscrito</th>
                    <th className="p-4">Capital Integralizado</th>
                  </>
                )}
                {(selectedReportType === 'CAPITAL' || selectedReportType === 'INTEGRALIZACOES') && (
                  <>
                    <th className="p-4">Documento</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Cooperado</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Forma Pagto</th>
                    <th className="p-4 text-right">Valor (R$)</th>
                  </>
                )}
                {selectedReportType === 'INADIMPLENCIA' && (
                  <>
                    <th className="p-4">Matrícula</th>
                    <th className="p-4">Cooperado</th>
                    <th className="p-4">CPF</th>
                    <th className="p-4 text-right">Capital Subscrito</th>
                    <th className="p-4 text-right">Capital Integralizado</th>
                    <th className="p-4 text-right text-rose-600 dark:text-rose-400">Débito Pendente</th>
                  </>
                )}
                {selectedReportType === 'ASSEMBLEIAS' && (
                  <>
                    <th className="p-4">Título</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Local</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4 text-center">Status</th>
                  </>
                )}
                {selectedReportType === 'MANDATOS' && (
                  <>
                    <th className="p-4">Cargo</th>
                    <th className="p-4">Nome do Diretor</th>
                    <th className="p-4">Início</th>
                    <th className="p-4">Fim</th>
                    <th className="p-4 text-center">Status</th>
                  </>
                )}
                {selectedReportType === 'ANIVERSARIANTES' && (
                  <>
                    <th className="p-4">Matrícula</th>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Data de Nascimento</th>
                    <th className="p-4">Contato</th>
                  </>
                )}
                {selectedReportType === 'AUDITORIA' && (
                  <>
                    <th className="p-4">Data/Hora</th>
                    <th className="p-4">Módulo</th>
                    <th className="p-4">Usuário</th>
                    <th className="p-4">Ação</th>
                    <th className="p-4">Detalhes</th>
                  </>
                )}
                {selectedReportType === 'PEDIDOS_ENTREGAS' && (
                  <>
                    <th className="p-4">Nº Pedido</th>
                    <th className="p-4">Programa</th>
                    <th className="p-4">Chamada Pública</th>
                    <th className="p-4">Escola Destino</th>
                    <th className="p-4">Produtor Rural</th>
                    <th className="p-4">Produto</th>
                    <th className="p-4 text-right">Quantidade</th>
                    <th className="p-4 text-right">Valor Total (R$)</th>
                    <th className="p-4 text-center">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredData.map((item: any) => (
                  <tr key={item.id || Math.random()} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                    {selectedReportType === 'COOPERADOS' && (
                      <>
                        <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-300">{item.matricula}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.nome}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.cpf}</td>
                        <td className="p-4 dark:text-white">{item.categoria}</td>
                        <td className="p-4 dark:text-white">{item.cidade} / {item.estado}</td>
                        <td className="p-4 font-mono dark:text-white">R$ {item.capitalSubscrito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">R$ {item.capitalIntegralizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                    {(selectedReportType === 'CAPITAL' || selectedReportType === 'INTEGRALIZACOES') && (
                      <>
                        <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-300">{item.numeroDocumento}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.data}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.cooperadoNome}</td>
                        <td className="p-4 dark:text-white">{item.tipo}</td>
                        <td className="p-4 dark:text-white">{item.formaPagamento}</td>
                        <td className="p-4 font-mono text-right font-bold text-slate-900 dark:text-white">R$ {Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                    {selectedReportType === 'INADIMPLENCIA' && (
                      <>
                        <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-300">{item.matricula}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.nome}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.cpf}</td>
                        <td className="p-4 font-mono text-right text-slate-700 dark:text-white">R$ {item.capitalSubscrito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 font-mono text-right text-slate-700 dark:text-white">R$ {item.capitalIntegralizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 font-mono text-right font-bold text-rose-600 dark:text-rose-300">R$ {(item.capitalSubscrito - item.capitalIntegralizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </>
                    )}
                    {selectedReportType === 'ASSEMBLEIAS' && (
                      <>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.titulo}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.data}</td>
                        <td className="p-4 dark:text-white">{item.local}</td>
                        <td className="p-4 dark:text-white">{item.tipo}</td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold rounded-full text-[10px]">
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}
                    {selectedReportType === 'MANDATOS' && (
                      <>
                        <td className="p-4 font-bold text-slate-800 dark:text-white">{item.cargo}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.nome}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.inicioMandato}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.fimMandato}</td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold rounded-full text-[10px]">
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}
                    {selectedReportType === 'ANIVERSARIANTES' && (
                      <>
                        <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-300">{item.matricula}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.nome}</td>
                        <td className="p-4 dark:text-white">{item.categoria}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.dataNascimento || '15/05/1975'}</td>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.celular || item.telefone || '(16) 99999-9999'}</td>
                      </>
                    )}
                    {selectedReportType === 'AUDITORIA' && (
                      <>
                        <td className="p-4 font-mono text-slate-600 dark:text-white">{item.data}</td>
                        <td className="p-4 font-bold text-indigo-600 dark:text-indigo-300">{item.modulo}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.usuario}</td>
                        <td className="p-4 dark:text-white">{item.acao}</td>
                        <td className="p-4 text-slate-600 dark:text-white">{item.detalhes}</td>
                      </>
                    )}
                    {selectedReportType === 'PEDIDOS_ENTREGAS' && (
                      <>
                        <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-300">{item.numeroPedido}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-white">{item.programa}</td>
                        <td className="p-4 text-slate-600 dark:text-white">{item.chamadaPublica}</td>
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{item.escola}</td>
                        <td className="p-4 font-medium text-emerald-700 dark:text-emerald-300">{item.produtor}</td>
                        <td className="p-4 dark:text-white">{item.produto}</td>
                        <td className="p-4 font-mono text-right font-bold dark:text-white">{item.quantidade} {item.unidade}</td>
                        <td className="p-4 font-mono text-right font-bold text-slate-900 dark:text-white">R$ {Number(item.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold rounded-full text-[10px]">
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
