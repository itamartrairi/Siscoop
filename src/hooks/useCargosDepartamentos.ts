import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useCoop } from '../context/CoopContext';
import {
  Cargo,
  ColecaoCadastroRH,
  Departamento,
  MapaUsoCadastrosRH,
  chaveUso,
  excluirCadastroRHNoFirestore,
  gerarIdCadastro,
  gravarCadastroRHNoFirestore,
  gravarCadastrosRHLocais,
  lerCadastrosRHLocais,
  normalizarNome,
  ordenarPorNome,
  ouvirCadastrosRH,
  ouvirUsoCadastrosRH,
  registrarUsoCadastroRH,
  traduzirErroFirestore
} from '../services/cargosDepartamentosService';

export type StatusSincronizacao = 'carregando' | 'firestore' | 'local' | 'erro';

export interface ResultadoOperacao {
  ok: boolean;
  erro?: string;
}

/** Onde um cargo/departamento está em uso. */
export interface UsoCadastroRH {
  /** Usuários + colaboradores desta cooperativa. */
  nestaCooperativa: number;
  /** Usuários + colaboradores das demais cooperativas (registro de uso no Firestore). */
  outrasCooperativas: number;
  /** Quantas outras cooperativas usam. */
  qtdOutrasCooperativas: number;
  /** Só departamentos: cargos vinculados a ele. */
  cargosVinculados: number;
  total: number;
}

/**
 * Lista e mantém os Cargos e Departamentos — lista COMUM a todas as
 * cooperativas.
 *
 * Com sessão no Firebase Auth, lê e grava no Firestore em tempo real
 * (onSnapshot) e guarda uma cópia em localStorage como cache. Sem sessão,
 * trabalha só com a cópia local.
 *
 * Também publica, para cada item, quantos usuários/colaboradores desta
 * cooperativa o usam (coleção usoCadastrosRH). Assim nenhuma cooperativa
 * consegue excluir um item que outra está usando.
 */
export function useCargosDepartamentos() {
  const { currentTenant, users, funcionariosRH } = useCoop();
  const tenantId = currentTenant?.id || '';

  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid || null);
  useEffect(() => onAuthStateChanged(auth, u => setUid(u?.uid || null)), []);
  const usaFirestore = !!uid && !!tenantId;

  const [departamentos, setDepartamentos] = useState<Departamento[]>(() => lerCadastrosRHLocais<Departamento>('departamentos'));
  const [cargos, setCargos] = useState<Cargo[]>(() => lerCadastrosRHLocais<Cargo>('cargos'));
  const [usoRegistrado, setUsoRegistrado] = useState<MapaUsoCadastrosRH | null>(null);
  const [status, setStatus] = useState<StatusSincronizacao>(usaFirestore ? 'carregando' : 'local');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setDepartamentos(lerCadastrosRHLocais<Departamento>('departamentos'));
    setCargos(lerCadastrosRHLocais<Cargo>('cargos'));
    setUsoRegistrado(null);
    setErro(null);

    if (!usaFirestore) {
      setStatus('local');
      return;
    }

    setStatus('carregando');
    let recebidos = 0;
    const marcarRecebido = () => {
      recebidos += 1;
      if (recebidos >= 2) setStatus('firestore');
    };
    const falhou = (e: unknown) => {
      console.warn('Cargos/Departamentos: falha ao ler do Firestore', e);
      setErro(traduzirErroFirestore(e));
      setStatus('erro');
    };

    const pararDep = ouvirCadastrosRH<Departamento>('departamentos', lista => {
      setDepartamentos(lista);
      gravarCadastrosRHLocais('departamentos', lista);
      marcarRecebido();
    }, falhou);
    const pararCargos = ouvirCadastrosRH<Cargo>('cargos', lista => {
      setCargos(lista);
      gravarCadastrosRHLocais('cargos', lista);
      marcarRecebido();
    }, falhou);
    const pararUso = ouvirUsoCadastrosRH(setUsoRegistrado, e => {
      // Sem o registro de uso a tela continua funcionando; só a checagem
      // entre cooperativas fica a cargo das regras do Firestore.
      console.warn('Cargos/Departamentos: falha ao ler o uso entre cooperativas', e);
      setUsoRegistrado({});
    });

    return () => {
      pararDep();
      pararCargos();
      pararUso();
    };
  }, [tenantId, usaFirestore]);

  // ------------------------------------------------------------ Uso
  // Quantos usuários/colaboradores DESTA cooperativa usam cada nome.
  const contagemLocal = useMemo(() => {
    const daCooperativa = <T extends { tenantId?: string }>(lista: T[]) =>
      lista.filter(x => !x.tenantId || x.tenantId === tenantId);
    const contar = (campo: 'cargo' | 'departamento') => {
      const mapa = new Map<string, number>();
      const somar = (valor?: string) => {
        const chave = normalizarNome(valor || '');
        if (chave) mapa.set(chave, (mapa.get(chave) || 0) + 1);
      };
      daCooperativa(users || []).forEach(u => somar(u[campo]));
      daCooperativa(funcionariosRH || []).forEach(f => somar(f[campo]));
      return mapa;
    };
    return { cargos: contar('cargo'), departamentos: contar('departamento') };
  }, [users, funcionariosRH, tenantId]);

  const usoLocalDe = useCallback(
    (colecao: ColecaoCadastroRH, nome: string) => contagemLocal[colecao].get(normalizarNome(nome)) || 0,
    [contagemLocal]
  );

  // Publica o uso desta cooperativa sempre que ele muda.
  useEffect(() => {
    if (!usaFirestore || !usoRegistrado || status !== 'firestore') return;
    const pendentes: Promise<void>[] = [];
    const sincronizar = (colecao: ColecaoCadastroRH, itens: { id: string; nome: string }[]) => {
      itens.forEach(item => {
        const atual = usoLocalDe(colecao, item.nome);
        const publicado = usoRegistrado[chaveUso(colecao, item.id)]?.[tenantId] || 0;
        if (atual !== publicado) {
          pendentes.push(
            registrarUsoCadastroRH(colecao, item.id, tenantId, atual).catch(e =>
              console.warn(`Cargos/Departamentos: falha ao registrar uso de ${colecao}/${item.id}`, e)
            )
          );
        }
      });
    };
    sincronizar('departamentos', departamentos);
    sincronizar('cargos', cargos);
    void Promise.all(pendentes);
  }, [usaFirestore, usoRegistrado, status, departamentos, cargos, usoLocalDe, tenantId]);

  const usoDoItem = useCallback(
    (colecao: ColecaoCadastroRH, item: { id: string; nome: string }): UsoCadastroRH => {
      const nestaCooperativa = usoLocalDe(colecao, item.nome);
      const outras = Object.entries(usoRegistrado?.[chaveUso(colecao, item.id)] || {}).filter(
        ([t, qtd]) => t !== tenantId && Number(qtd) > 0
      );
      const outrasCooperativas = outras.reduce((s, [, qtd]) => s + Number(qtd), 0);
      const cargosVinculados = colecao === 'departamentos' ? cargos.filter(c => c.departamentoId === item.id).length : 0;
      return {
        nestaCooperativa,
        outrasCooperativas,
        qtdOutrasCooperativas: outras.length,
        cargosVinculados,
        total: nestaCooperativa + outrasCooperativas + cargosVinculados
      };
    },
    [usoLocalDe, usoRegistrado, tenantId, cargos]
  );

  // ------------------------------------------------------------ Gravação
  const salvarGenerico = useCallback(
    async <T extends Departamento | Cargo>(
      colecao: ColecaoCadastroRH,
      item: T,
      setLista: Dispatch<SetStateAction<T[]>>
    ): Promise<ResultadoOperacao> => {
      if (!tenantId) return { ok: false, erro: 'Nenhuma cooperativa selecionada.' };
      // Mantém a cooperativa que cadastrou; itens novos ficam com a atual.
      const registro = { ...item, tenantId: item.tenantId || tenantId, nome: item.nome.trim() } as T;
      if (!registro.nome) return { ok: false, erro: 'Informe o nome.' };

      if (usaFirestore) {
        try {
          await gravarCadastroRHNoFirestore(colecao, registro);
          return { ok: true }; // a lista é atualizada pelo onSnapshot
        } catch (e) {
          console.error(`Erro ao gravar ${colecao} no Firestore`, e);
          return { ok: false, erro: traduzirErroFirestore(e) };
        }
      }

      const agora = new Date().toISOString();
      setLista(prev => {
        const existe = prev.some(p => p.id === registro.id);
        const proxima = ordenarPorNome(
          existe
            ? prev.map(p => (p.id === registro.id ? { ...p, ...registro, atualizadoEm: agora } : p))
            : [...prev, { ...registro, criadoEm: agora, atualizadoEm: agora }]
        );
        gravarCadastrosRHLocais(colecao, proxima);
        return proxima;
      });
      return { ok: true };
    },
    [tenantId, usaFirestore]
  );

  const excluirGenerico = useCallback(
    async <T extends Departamento | Cargo>(
      colecao: ColecaoCadastroRH,
      item: T,
      setLista: Dispatch<SetStateAction<T[]>>
    ): Promise<ResultadoOperacao> => {
      // Integridade: item em uso (aqui ou em outra cooperativa) não pode ser excluído.
      const uso = usoDoItem(colecao, item);
      if (uso.total > 0) {
        const partes = [
          uso.nestaCooperativa ? `${uso.nestaCooperativa} usuário(s)/colaborador(es) desta cooperativa` : '',
          uso.outrasCooperativas ? `${uso.outrasCooperativas} usuário(s)/colaborador(es) de ${uso.qtdOutrasCooperativas} outra(s) cooperativa(s)` : '',
          uso.cargosVinculados ? `${uso.cargosVinculados} cargo(s) vinculado(s) a este departamento` : ''
        ].filter(Boolean);
        return {
          ok: false,
          erro: `Não é possível excluir "${item.nome}": está em uso por ${partes.join(', ')}. Se não for mais usar, marque como inativo.`
        };
      }

      if (usaFirestore) {
        try {
          await excluirCadastroRHNoFirestore(colecao, item.id);
          return { ok: true };
        } catch (e) {
          console.error(`Erro ao excluir ${colecao} no Firestore`, e);
          return { ok: false, erro: traduzirErroFirestore(e) };
        }
      }
      setLista(prev => {
        const proxima = prev.filter(p => p.id !== item.id);
        gravarCadastrosRHLocais(colecao, proxima);
        return proxima;
      });
      return { ok: true };
    },
    [usaFirestore, usoDoItem]
  );

  const salvarDepartamento = (d: Omit<Departamento, 'id' | 'tenantId'> & { id?: string; tenantId?: string }) => {
    const duplicado = departamentos.find(x => normalizarNome(x.nome) === normalizarNome(d.nome) && x.id !== d.id);
    if (duplicado) return Promise.resolve<ResultadoOperacao>({ ok: false, erro: `Já existe o departamento "${duplicado.nome}".` });
    const existente = d.id ? departamentos.find(x => x.id === d.id) : undefined;
    return salvarGenerico<Departamento>(
      'departamentos',
      { ...d, id: d.id || gerarIdCadastro('dep'), tenantId: d.tenantId || existente?.tenantId || tenantId },
      setDepartamentos
    );
  };

  const salvarCargo = (c: Omit<Cargo, 'id' | 'tenantId'> & { id?: string; tenantId?: string }) => {
    const duplicado = cargos.find(
      x => normalizarNome(x.nome) === normalizarNome(c.nome) && (x.departamentoId || '') === (c.departamentoId || '') && x.id !== c.id
    );
    if (duplicado) return Promise.resolve<ResultadoOperacao>({ ok: false, erro: `Já existe o cargo "${duplicado.nome}" neste departamento.` });
    const existente = c.id ? cargos.find(x => x.id === c.id) : undefined;
    return salvarGenerico<Cargo>(
      'cargos',
      { ...c, id: c.id || gerarIdCadastro('cargo'), tenantId: c.tenantId || existente?.tenantId || tenantId },
      setCargos
    );
  };

  const excluirDepartamento = (d: Departamento) => excluirGenerico<Departamento>('departamentos', d, setDepartamentos);
  const excluirCargo = (c: Cargo) => excluirGenerico<Cargo>('cargos', c, setCargos);

  const nomeDoDepartamento = (id?: string) => (id ? departamentos.find(d => d.id === id)?.nome : undefined);

  return {
    tenantId,
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
  };
}
