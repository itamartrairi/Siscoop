import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useCoop } from '../context/CoopContext';
import {
  Cargo,
  ColecaoCadastroRH,
  Departamento,
  excluirCadastroRHNoFirestore,
  gerarIdCadastro,
  gravarCadastroRHNoFirestore,
  gravarCadastrosRHLocais,
  lerCadastrosRHLocais,
  normalizarNome,
  ordenarPorNome,
  ouvirCadastrosRH,
  traduzirErroFirestore
} from '../services/cargosDepartamentosService';

export type StatusSincronizacao = 'carregando' | 'firestore' | 'local' | 'erro';

export interface ResultadoOperacao {
  ok: boolean;
  erro?: string;
}

/**
 * Lista e mantém os Cargos e Departamentos da cooperativa atual.
 *
 * Com sessão no Firebase Auth, lê e grava no Firestore em tempo real
 * (onSnapshot) e guarda uma cópia em localStorage como cache. Sem sessão,
 * trabalha só com a cópia local.
 */
export function useCargosDepartamentos() {
  const { currentTenant } = useCoop();
  const tenantId = currentTenant?.id || '';

  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid || null);
  useEffect(() => onAuthStateChanged(auth, u => setUid(u?.uid || null)), []);
  const usaFirestore = !!uid && !!tenantId;

  const [departamentos, setDepartamentos] = useState<Departamento[]>(() => lerCadastrosRHLocais<Departamento>('departamentos', tenantId));
  const [cargos, setCargos] = useState<Cargo[]>(() => lerCadastrosRHLocais<Cargo>('cargos', tenantId));
  const [status, setStatus] = useState<StatusSincronizacao>(usaFirestore ? 'carregando' : 'local');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setDepartamentos(lerCadastrosRHLocais<Departamento>('departamentos', tenantId));
    setCargos(lerCadastrosRHLocais<Cargo>('cargos', tenantId));
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

    const pararDep = ouvirCadastrosRH<Departamento>('departamentos', tenantId, lista => {
      setDepartamentos(lista);
      gravarCadastrosRHLocais('departamentos', tenantId, lista);
      marcarRecebido();
    }, falhou);
    const pararCargos = ouvirCadastrosRH<Cargo>('cargos', tenantId, lista => {
      setCargos(lista);
      gravarCadastrosRHLocais('cargos', tenantId, lista);
      marcarRecebido();
    }, falhou);

    return () => {
      pararDep();
      pararCargos();
    };
  }, [tenantId, usaFirestore]);

  const salvarGenerico = useCallback(
    async <T extends Departamento | Cargo>(
      colecao: ColecaoCadastroRH,
      item: T,
      setLista: Dispatch<SetStateAction<T[]>>
    ): Promise<ResultadoOperacao> => {
      if (!tenantId) return { ok: false, erro: 'Nenhuma cooperativa selecionada.' };
      const registro = { ...item, tenantId, nome: item.nome.trim() } as T;
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
        gravarCadastrosRHLocais(colecao, tenantId, proxima);
        return proxima;
      });
      return { ok: true };
    },
    [tenantId, usaFirestore]
  );

  const excluirGenerico = useCallback(
    async <T extends Departamento | Cargo>(
      colecao: ColecaoCadastroRH,
      id: string,
      setLista: Dispatch<SetStateAction<T[]>>
    ): Promise<ResultadoOperacao> => {
      if (usaFirestore) {
        try {
          await excluirCadastroRHNoFirestore(colecao, id);
          return { ok: true };
        } catch (e) {
          console.error(`Erro ao excluir ${colecao} no Firestore`, e);
          return { ok: false, erro: traduzirErroFirestore(e) };
        }
      }
      setLista(prev => {
        const proxima = prev.filter(p => p.id !== id);
        gravarCadastrosRHLocais(colecao, tenantId, proxima);
        return proxima;
      });
      return { ok: true };
    },
    [tenantId, usaFirestore]
  );

  const salvarDepartamento = (d: Omit<Departamento, 'id' | 'tenantId'> & { id?: string }) => {
    const duplicado = departamentos.find(x => normalizarNome(x.nome) === normalizarNome(d.nome) && x.id !== d.id);
    if (duplicado) return Promise.resolve<ResultadoOperacao>({ ok: false, erro: `Já existe o departamento "${duplicado.nome}".` });
    return salvarGenerico<Departamento>('departamentos', { ...d, id: d.id || gerarIdCadastro('dep'), tenantId }, setDepartamentos);
  };

  const salvarCargo = (c: Omit<Cargo, 'id' | 'tenantId'> & { id?: string }) => {
    const duplicado = cargos.find(
      x => normalizarNome(x.nome) === normalizarNome(c.nome) && (x.departamentoId || '') === (c.departamentoId || '') && x.id !== c.id
    );
    if (duplicado) return Promise.resolve<ResultadoOperacao>({ ok: false, erro: `Já existe o cargo "${duplicado.nome}" neste departamento.` });
    return salvarGenerico<Cargo>('cargos', { ...c, id: c.id || gerarIdCadastro('cargo'), tenantId }, setCargos);
  };

  const excluirDepartamento = (id: string) => excluirGenerico<Departamento>('departamentos', id, setDepartamentos);
  const excluirCargo = (id: string) => excluirGenerico<Cargo>('cargos', id, setCargos);

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
    nomeDoDepartamento
  };
}
