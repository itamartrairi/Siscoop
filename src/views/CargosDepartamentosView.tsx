import React, { useMemo, useState } from 'react';
import { useCoop } from '../context/CoopContext';
import { useCargosDepartamentos, type UsoCadastroRH } from '../hooks/useCargosDepartamentos';
import { Cargo, Departamento, normalizarNome } from '../services/cargosDepartamentosService';
import {
  Briefcase,
  Building2,
  CloudOff,
  Database,
  Download,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from 'lucide-react';

type Aba = 'departamentos' | 'cargos';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none';

const DEP_VAZIO = { nome: '', sigla: '', responsavel: '', descricao: '', ativo: true };
const CARGO_VAZIO = { nome: '', departamentoId: '', cbo: '', descricao: '', ativo: true };

/** "3" ou "3 (+5 em outras cooperativas)". */
const textoUso = (u: UsoCadastroRH) =>
  u.outrasCooperativas ? `${u.nestaCooperativa} (+${u.outrasCooperativas} em outras)` : String(u.nestaCooperativa);

/**
 * Tela de cadastro de Departamentos e Cargos (gravados no Firestore).
 * Esses cadastros alimentam as listas de seleção de Cargo/Função e
 * Departamento/Setor do cadastro de usuários (Configurações) e dos
 * colaboradores do RH.
 */
export const CargosDepartamentosView: React.FC = () => {
  const { canWriteModule, users, funcionariosRH, addAuditLog } = useCoop();
  const canWrite = canWriteModule('rh') || canWriteModule('configuracoes');

  const {
    departamentos,
    cargos,
    status,
    erro,
    usaFirestore,
    salvarDepartamento,
    salvarCargo,
    excluirDepartamento,
    excluirCargo,
    nomeDoDepartamento,
    usoDoItem
  } = useCargosDepartamentos();

  const [aba, setAba] = useState<Aba>('departamentos');
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [depEditando, setDepEditando] = useState<Departamento | null>(null);
  const [depForm, setDepForm] = useState(DEP_VAZIO);
  const [cargoEditando, setCargoEditando] = useState<Cargo | null>(null);
  const [cargoForm, setCargoForm] = useState(CARGO_VAZIO);
  const [modalAberto, setModalAberto] = useState<Aba | null>(null);

  const bloquear = () => {
    alert('Seu perfil de acesso tem permissão apenas de leitura neste módulo. Fale com um administrador para solicitar permissão de edição.');
  };

  // Uso de cada item: usuários/colaboradores desta e das outras cooperativas
  // (a lista é comum a todas) e, para departamentos, cargos vinculados.
  const usoDepartamento = (d: Departamento) => usoDoItem('departamentos', d);
  const usoCargo = (c: Cargo) => usoDoItem('cargos', c);

  const termo = normalizarNome(busca);
  const depsFiltrados = useMemo(
    () =>
      departamentos.filter(
        d => !termo || normalizarNome(`${d.nome} ${d.sigla || ''} ${d.responsavel || ''}`).includes(termo)
      ),
    [departamentos, termo]
  );
  const cargosFiltrados = useMemo(
    () =>
      cargos.filter(
        c => !termo || normalizarNome(`${c.nome} ${c.cbo || ''} ${nomeDoDepartamento(c.departamentoId) || ''}`).includes(termo)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cargos, departamentos, termo]
  );

  // ---------------------------------------------------------------- Departamento
  const abrirDepartamento = (d?: Departamento) => {
    if (!canWrite) return bloquear();
    setDepEditando(d || null);
    setDepForm(
      d
        ? { nome: d.nome, sigla: d.sigla || '', responsavel: d.responsavel || '', descricao: d.descricao || '', ativo: d.ativo !== false }
        : DEP_VAZIO
    );
    setModalAberto('departamentos');
  };

  const salvarDep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return bloquear();
    setSalvando(true);
    const r = await salvarDepartamento({
      id: depEditando?.id,
      nome: depForm.nome,
      sigla: depForm.sigla.trim() || undefined,
      responsavel: depForm.responsavel.trim() || undefined,
      descricao: depForm.descricao.trim() || undefined,
      ativo: depForm.ativo,
      criadoEm: depEditando?.criadoEm
    });
    setSalvando(false);
    if (!r.ok) {
      setMsg({ tipo: 'erro', texto: r.erro || 'Não foi possível salvar o departamento.' });
      return;
    }
    addAuditLog('RH', depEditando ? 'ALTERACAO' : 'INCLUSAO', `Departamento ${depForm.nome.trim()} ${depEditando ? 'atualizado' : 'cadastrado'}`);
    setMsg({ tipo: 'ok', texto: `Departamento "${depForm.nome.trim()}" salvo${usaFirestore ? ' no Firestore' : ' localmente'}.` });
    setModalAberto(null);
  };

  const apagarDep = async (d: Departamento) => {
    if (!canWrite) return bloquear();
    // Em uso: o hook recusa e devolve a explicação (sem perguntar antes).
    if (
      usoDepartamento(d).total === 0 &&
      !window.confirm(`Excluir o departamento "${d.nome}"?\n\nA lista é comum a todas as cooperativas: ele deixa de existir para todas.`)
    )
      return;
    const r = await excluirDepartamento(d);
    if (!r.ok) {
      setMsg({ tipo: 'erro', texto: r.erro || 'Não foi possível excluir.' });
      return;
    }
    addAuditLog('RH', 'EXCLUSAO', `Departamento ${d.nome} excluído`);
    setMsg({ tipo: 'ok', texto: `Departamento "${d.nome}" excluído.` });
  };

  // ---------------------------------------------------------------- Cargo
  const abrirCargo = (c?: Cargo) => {
    if (!canWrite) return bloquear();
    setCargoEditando(c || null);
    setCargoForm(
      c
        ? { nome: c.nome, departamentoId: c.departamentoId || '', cbo: c.cbo || '', descricao: c.descricao || '', ativo: c.ativo !== false }
        : CARGO_VAZIO
    );
    setModalAberto('cargos');
  };

  const salvarCrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return bloquear();
    setSalvando(true);
    const r = await salvarCargo({
      id: cargoEditando?.id,
      nome: cargoForm.nome,
      departamentoId: cargoForm.departamentoId || undefined,
      cbo: cargoForm.cbo.trim() || undefined,
      descricao: cargoForm.descricao.trim() || undefined,
      ativo: cargoForm.ativo,
      criadoEm: cargoEditando?.criadoEm
    });
    setSalvando(false);
    if (!r.ok) {
      setMsg({ tipo: 'erro', texto: r.erro || 'Não foi possível salvar o cargo.' });
      return;
    }
    addAuditLog('RH', cargoEditando ? 'ALTERACAO' : 'INCLUSAO', `Cargo ${cargoForm.nome.trim()} ${cargoEditando ? 'atualizado' : 'cadastrado'}`);
    setMsg({ tipo: 'ok', texto: `Cargo "${cargoForm.nome.trim()}" salvo${usaFirestore ? ' no Firestore' : ' localmente'}.` });
    setModalAberto(null);
  };

  const apagarCargo = async (c: Cargo) => {
    if (!canWrite) return bloquear();
    if (
      usoCargo(c).total === 0 &&
      !window.confirm(`Excluir o cargo "${c.nome}"?\n\nA lista é comum a todas as cooperativas: ele deixa de existir para todas.`)
    )
      return;
    const r = await excluirCargo(c);
    if (!r.ok) {
      setMsg({ tipo: 'erro', texto: r.erro || 'Não foi possível excluir.' });
      return;
    }
    addAuditLog('RH', 'EXCLUSAO', `Cargo ${c.nome} excluído`);
    setMsg({ tipo: 'ok', texto: `Cargo "${c.nome}" excluído.` });
  };

  // ------------------------------------------------- Importar valores já usados
  const importarExistentes = async () => {
    if (!canWrite) return bloquear();
    const nomesDep = new Map<string, string>();
    [...users.map(u => u.departamento), ...funcionariosRH.map(f => f.departamento)].forEach(n => {
      const t = (n || '').trim();
      if (t && !departamentos.some(d => normalizarNome(d.nome) === normalizarNome(t))) nomesDep.set(normalizarNome(t), t);
    });
    const nomesCargo = new Map<string, string>();
    [...users.map(u => u.cargo), ...funcionariosRH.map(f => f.cargo)].forEach(n => {
      const t = (n || '').trim();
      if (t && !cargos.some(c => normalizarNome(c.nome) === normalizarNome(t))) nomesCargo.set(normalizarNome(t), t);
    });

    if (nomesDep.size === 0 && nomesCargo.size === 0) {
      setMsg({ tipo: 'ok', texto: 'Todos os cargos e departamentos usados nos cadastros já estão nesta lista.' });
      return;
    }
    if (!window.confirm(`Importar ${nomesDep.size} departamento(s) e ${nomesCargo.size} cargo(s) usados hoje nos cadastros de usuários e colaboradores?`)) return;

    setSalvando(true);
    const falhas: string[] = [];
    for (const nome of nomesDep.values()) {
      const r = await salvarDepartamento({ nome, ativo: true });
      if (!r.ok) falhas.push(`${nome}: ${r.erro}`);
    }
    for (const nome of nomesCargo.values()) {
      const r = await salvarCargo({ nome, ativo: true });
      if (!r.ok) falhas.push(`${nome}: ${r.erro}`);
    }
    setSalvando(false);
    addAuditLog('RH', 'INCLUSAO', `Importação de ${nomesDep.size} departamento(s) e ${nomesCargo.size} cargo(s) dos cadastros existentes`);
    setMsg(
      falhas.length
        ? { tipo: 'erro', texto: `Importação com ${falhas.length} falha(s): ${falhas.slice(0, 3).join(' | ')}` }
        : { tipo: 'ok', texto: `Importados ${nomesDep.size} departamento(s) e ${nomesCargo.size} cargo(s).` }
    );
  };

  // ---------------------------------------------------------------- UI
  const SeloStatus = () => {
    if (status === 'carregando')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando ao Firestore…
        </span>
      );
    if (status === 'firestore')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
          <Database className="w-3.5 h-3.5" /> Gravando no Firestore
        </span>
      );
    if (status === 'erro')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
          <CloudOff className="w-3.5 h-3.5" /> Erro no Firestore
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold" title="Entre com Google ou e-mail/senha do Firebase para gravar no banco.">
        <CloudOff className="w-3.5 h-3.5" /> Modo local (sem sessão no Firebase)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-emerald-600" /> Cargos & Departamentos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Lista comum a todas as cooperativas que usam o sistema: o que for cadastrado ou alterado aqui vale para todas. Ela aparece como lista de seleção no cadastro de usuários e de colaboradores do RH. Itens em uso não podem ser excluídos — marque como inativo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeloStatus />
          <button
            type="button"
            onClick={importarExistentes}
            disabled={salvando}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            title="Cria departamentos e cargos a partir dos textos já usados nos cadastros"
          >
            <Download className="w-4 h-4" /> Importar dos cadastros
          </button>
          <button
            type="button"
            onClick={() => (aba === 'departamentos' ? abrirDepartamento() : abrirCargo())}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {aba === 'departamentos' ? 'Novo Departamento' : 'Novo Cargo'}
          </button>
        </div>
      </div>

      {erro && <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">{erro}</div>}
      {msg && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-start justify-between gap-2 ${
            msg.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <span>{msg.texto}</span>
          <button type="button" onClick={() => setMsg(null)} className="opacity-60 hover:opacity-100" aria-label="Fechar aviso">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-200">
        {(
          [
            ['departamentos', `Departamentos / Setores (${departamentos.length})`, Building2],
            ['cargos', `Cargos / Funções (${cargos.length})`, Briefcase]
          ] as const
        ).map(([id, label, Icone]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              aba === id ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icone className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder={aba === 'departamentos' ? 'Buscar departamento, sigla ou responsável…' : 'Buscar cargo, CBO ou departamento…'}
            className={`${inputCls} pl-9 text-xs`}
          />
        </div>

        <div className="overflow-x-auto">
          {aba === 'departamentos' ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="p-3">Departamento / Setor</th>
                  <th className="p-3">Sigla</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3 text-center">Cargos</th>
                  <th className="p-3 text-center">Em uso</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {depsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      Nenhum departamento cadastrado{busca ? ' para essa busca' : ''}.
                    </td>
                  </tr>
                )}
                {depsFiltrados.map(d => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60" onDoubleClick={() => abrirDepartamento(d)}>
                    <td className="p-3 font-bold text-slate-800">
                      {d.nome}
                      {d.descricao && <span className="block text-[10px] font-normal text-slate-400">{d.descricao}</span>}
                    </td>
                    <td className="p-3 text-slate-600">{d.sigla || '—'}</td>
                    <td className="p-3 text-slate-600">{d.responsavel || '—'}</td>
                    <td className="p-3 text-center text-slate-600">{cargos.filter(c => c.departamentoId === d.id).length}</td>
                    <td className="p-3 text-center text-slate-600">{textoUso(usoDepartamento(d))}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${d.ativo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        {d.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => abrirDepartamento(d)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => apagarDep(d)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="p-3">Cargo / Função</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">CBO</th>
                  <th className="p-3 text-center">Em uso</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cargosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Nenhum cargo cadastrado{busca ? ' para essa busca' : ''}.
                    </td>
                  </tr>
                )}
                {cargosFiltrados.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60" onDoubleClick={() => abrirCargo(c)}>
                    <td className="p-3 font-bold text-slate-800">
                      {c.nome}
                      {c.descricao && <span className="block text-[10px] font-normal text-slate-400">{c.descricao}</span>}
                    </td>
                    <td className="p-3 text-slate-600">{nomeDoDepartamento(c.departamentoId) || 'Todos os setores'}</td>
                    <td className="p-3 text-slate-600 font-mono">{c.cbo || '—'}</td>
                    <td className="p-3 text-center text-slate-600">{textoUso(usoCargo(c))}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${c.ativo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        {c.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => abrirCargo(c)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => apagarCargo(c)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Departamento */}
      {modalAberto === 'departamentos' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={salvarDep} className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" /> {depEditando ? `Editar Departamento: ${depEditando.nome}` : 'Novo Departamento / Setor'}
              </h2>
              <button type="button" onClick={() => setModalAberto(null)} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nome *</label>
                <input required autoFocus value={depForm.nome} onChange={e => setDepForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Financeiro" className={inputCls} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sigla</label>
                <input value={depForm.sigla} maxLength={12} onChange={e => setDepForm(p => ({ ...p, sigla: e.target.value.toUpperCase() }))} placeholder="Ex: FIN" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Responsável</label>
              <input value={depForm.responsavel} onChange={e => setDepForm(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do gestor do setor" className={inputCls} />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Descrição</label>
              <textarea rows={2} value={depForm.descricao} onChange={e => setDepForm(p => ({ ...p, descricao: e.target.value }))} className={inputCls} />
            </div>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={depForm.ativo} onChange={e => setDepForm(p => ({ ...p, ativo: e.target.checked }))} className="w-4 h-4" />
              Ativo (aparece nas listas de seleção)
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setModalAberto(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Cargo */}
      {modalAberto === 'cargos' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={salvarCrg} className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" /> {cargoEditando ? `Editar Cargo: ${cargoEditando.nome}` : 'Novo Cargo / Função'}
              </h2>
              <button type="button" onClick={() => setModalAberto(null)} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nome do cargo *</label>
              <input required autoFocus value={cargoForm.nome} onChange={e => setCargoForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Técnico Agrícola" className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Departamento</label>
                <select value={cargoForm.departamentoId} onChange={e => setCargoForm(p => ({ ...p, departamentoId: e.target.value }))} className={inputCls}>
                  <option value="">Todos os setores</option>
                  {departamentos
                    .filter(d => d.ativo !== false || d.id === cargoForm.departamentoId)
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.nome}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">CBO</label>
                <input value={cargoForm.cbo} onChange={e => setCargoForm(p => ({ ...p, cbo: e.target.value }))} placeholder="Ex: 3211-05" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Descrição / atribuições</label>
              <textarea rows={2} value={cargoForm.descricao} onChange={e => setCargoForm(p => ({ ...p, descricao: e.target.value }))} className={inputCls} />
            </div>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={cargoForm.ativo} onChange={e => setCargoForm(p => ({ ...p, ativo: e.target.checked }))} className="w-4 h-4" />
              Ativo (aparece nas listas de seleção)
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setModalAberto(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
