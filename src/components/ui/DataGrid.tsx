import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  LucideIcon,
} from 'lucide-react';

/**
 * Grade padrão do Siscoop (layout limpo).
 * - filtro por coluna, ordenação ao clicar no cabeçalho
 * - linha selecionada destacada + painel lateral de ações
 * - paginação "1 - 10 de N registros"
 */

export interface DataGridColumn<T> {
  key: string;
  header: string;
  /** Valor usado para filtrar/ordenar. Padrão: row[key]. */
  value?: (row: T) => string | number | null | undefined;
  /** Conteúdo exibido na célula. Padrão: value. */
  render?: (row: T) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  filterable?: boolean;
}

export interface DataGridAction<T> {
  label: string;
  icon: LucideIcon;
  onClick: (row: T) => void;
  tone?: 'default' | 'danger';
  /** Separador antes deste item */
  divider?: boolean;
  hidden?: (row: T) => boolean;
}

interface DataGridProps<T> {
  rows: T[];
  columns: DataGridColumn<T>[];
  getRowId: (row: T) => string;
  /** Título e subtítulo mostrados no painel lateral */
  panelTitle?: (row: T) => React.ReactNode;
  panelSubtitle?: (row: T) => React.ReactNode;
  actions?: DataGridAction<T>[];
  onRowDoubleClick?: (row: T) => void;
  pageSize?: number;
  emptyMessage?: string;
  /** Linha de totais/resumo exibida acima da paginação */
  summary?: React.ReactNode;
}

const EMPTY = '<não informado>';

function readValue<T>(row: T, col: DataGridColumn<T>) {
  if (col.value) return col.value(row);
  return (row as Record<string, unknown>)[col.key] as string | number | null | undefined;
}

export function GridEmpty() {
  return <span className="ui-empty">{EMPTY}</span>;
}

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';
const TONE_DOT: Record<StatusTone, string> = {
  success: 'bg-green-600',
  warning: 'bg-amber-500',
  danger: 'bg-rose-600',
  neutral: 'bg-zinc-400',
};

export function GridStatus({
  active,
  label,
  tone,
  hint,
}: {
  active?: boolean;
  label?: React.ReactNode;
  tone?: StatusTone;
  hint?: React.ReactNode;
}) {
  const t: StatusTone = tone ?? (active ? 'success' : 'neutral');
  return (
    <span className="inline-flex items-center gap-1.5" title={typeof hint === 'string' ? hint : undefined}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${TONE_DOT[t]}`} aria-hidden />
      <span className={t === 'neutral' ? 'text-zinc-500' : 'text-zinc-800'}>{label ?? (active ? 'Ativo' : 'Inativo')}</span>
      {hint && <span className="text-zinc-400 text-xs">{hint}</span>}
    </span>
  );
}

export function DataGrid<T>({
  rows,
  columns,
  getRowId,
  panelTitle,
  panelSubtitle,
  actions = [],
  onRowDoubleClick,
  pageSize = 15,
  emptyMessage = 'Nenhum registro encontrado.',
  summary,
}: DataGridProps<T>) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(true);

  const filtered = useMemo(() => {
    const active = Object.entries(filters).filter(([, v]) => v.trim() !== '');
    let out = rows;
    if (active.length) {
      out = rows.filter(row =>
        active.every(([key, term]) => {
          const col = columns.find(c => c.key === key);
          if (!col) return true;
          const v = readValue(row, col);
          return String(v ?? '').toLowerCase().includes(term.toLowerCase());
        }),
      );
    }
    if (sort) {
      const col = columns.find(c => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) => {
          const va = readValue(a, col);
          const vb = readValue(b, col);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          const cmp =
            typeof va === 'number' && typeof vb === 'number'
              ? va - vb
              : String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' });
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, columns, filters, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const selected = rows.find(r => getRowId(r) === selectedId) ?? null;
  const showPanel = actions.length > 0;

  const toggleSort = (key: string) =>
    setSort(prev => (prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  const allOnPageChecked = pageRows.length > 0 && pageRows.every(r => checked.has(getRowId(r)));
  const toggleAll = () =>
    setChecked(prev => {
      const next = new Set(prev);
      pageRows.forEach(r => (allOnPageChecked ? next.delete(getRowId(r)) : next.add(getRowId(r))));
      return next;
    });
  const toggleOne = (id: string) =>
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const from = filtered.length === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(filtered.length, (page + 1) * pageSize);

  return (
    <div className="flex gap-3 items-stretch min-h-[420px]">
      {/* Grade */}
      <div className="flex-1 min-w-0 flex flex-col bg-white border border-zinc-200 rounded-md overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10">
              <tr>
                <th style={{ width: 40 }} className="text-center">
                  <input type="checkbox" checked={allOnPageChecked} onChange={toggleAll} aria-label="Selecionar todos" />
                </th>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{ width: col.width, textAlign: col.align ?? 'left' }}
                    className="cursor-pointer select-none hover:bg-zinc-100"
                    onClick={() => toggleSort(col.key)}
                    aria-sort={sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {sort?.key === col.key &&
                        (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </span>
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ padding: '4px 6px' }} />
                {columns.map(col => (
                  <th key={col.key} style={{ padding: '4px 6px', fontWeight: 400 }}>
                    {col.filterable === false ? null : (
                      <div className="relative">
                        <Filter className="w-3 h-3 text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          value={filters[col.key] ?? ''}
                          onChange={e => {
                            setFilters(f => ({ ...f, [col.key]: e.target.value }));
                            setPage(0);
                          }}
                          aria-label={`Filtrar ${col.header}`}
                          className="w-full !min-h-0 h-7 pl-6 pr-2 text-xs bg-white border border-zinc-200 rounded"
                        />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(row => {
                const id = getRowId(row);
                const isSel = id === selectedId;
                return (
                  <tr
                    key={id}
                    aria-selected={isSel}
                    onClick={() => {
                      setSelectedId(id);
                      setPanelOpen(true);
                    }}
                    onDoubleClick={() => onRowDoubleClick?.(row)}
                    className="cursor-pointer"
                  >
                    <td className="text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked.has(id)}
                        onChange={() => toggleOne(id)}
                        aria-label="Selecionar linha"
                      />
                    </td>
                    {columns.map(col => {
                      const content = col.render ? col.render(row) : readValue(row, col);
                      const isEmpty = content === null || content === undefined || content === '';
                      return (
                        <td
                          key={col.key}
                          style={{ textAlign: col.align ?? 'left', maxWidth: col.width }}
                          className="truncate"
                        >
                          {isEmpty ? <GridEmpty /> : content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="text-center text-zinc-500 py-10">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

{summary && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 border-t border-zinc-300 bg-zinc-50 text-xs text-zinc-700">
            {summary}
          </div>
        )}

                {/* Rodapé / paginação */}
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-zinc-200 text-xs text-zinc-600 bg-white">
          <span>
            {from} - {to} de {filtered.length} registros
            {checked.size > 0 && <span className="ml-2 text-zinc-500">· {checked.size} marcado(s)</span>}
          </span>
          <div className="flex items-center gap-1">
            <PagerButton disabled={page === 0} onClick={() => setPage(0)} label="Primeira página">
              <ChevronsLeft className="w-3.5 h-3.5" />
            </PagerButton>
            <PagerButton disabled={page === 0} onClick={() => setPage(p => p - 1)} label="Página anterior">
              <ChevronLeft className="w-3.5 h-3.5" /> anterior
            </PagerButton>
            <span className="mx-1 inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              {page + 1}
            </span>
            <PagerButton disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)} label="Próxima página">
              próximo <ChevronRight className="w-3.5 h-3.5" />
            </PagerButton>
            <PagerButton disabled={page >= pageCount - 1} onClick={() => setPage(pageCount - 1)} label="Última página">
              <ChevronsRight className="w-3.5 h-3.5" />
            </PagerButton>
          </div>
        </div>
      </div>

      {/* Painel lateral de ações */}
      {showPanel && (
        <div className="relative hidden md:flex">
          <button
            type="button"
            onClick={() => setPanelOpen(o => !o)}
            aria-label={panelOpen ? 'Recolher painel' : 'Expandir painel'}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 !min-h-0 rounded-full bg-white border border-emerald-600 text-emerald-700 flex items-center justify-center shadow-sm hover:bg-emerald-50"
          >
            {panelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {panelOpen && (
            <aside className="w-60 bg-white border border-zinc-200 rounded-md flex flex-col">
              {selected ? (
                <>
                  <div className="px-5 py-4 border-b border-zinc-200">
                    <div className="text-[15px] leading-snug text-emerald-700" style={{ fontFamily: 'var(--ui-font-title)' }}>
                      {panelTitle ? panelTitle(selected) : getRowId(selected)}
                    </div>
                    {panelSubtitle && <div className="text-sm text-zinc-500 mt-0.5">{panelSubtitle(selected)}</div>}
                  </div>
                  <nav className="py-2">
                    {actions
                      .filter(a => !a.hidden?.(selected))
                      .map(a => (
                        <React.Fragment key={a.label}>
                          {a.divider && <div className="my-2 mx-5 border-t border-zinc-200" />}
                          <button
                            type="button"
                            onClick={() => a.onClick(selected)}
                            className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm text-left transition-colors hover:bg-zinc-50 ${
                              a.tone === 'danger' ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                            style={{ fontFamily: 'var(--ui-font-title)' }}
                          >
                            <a.icon className="w-4 h-4 shrink-0" />
                            {a.label}
                          </button>
                        </React.Fragment>
                      ))}
                  </nav>
                </>
              ) : (
                <div className="p-5 text-sm text-zinc-500">Selecione um registro na grade para ver as ações.</div>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1 h-6 !min-h-0 px-1.5 rounded text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export default DataGrid;
