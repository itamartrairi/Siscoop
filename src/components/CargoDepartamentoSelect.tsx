import React from 'react';
import { Cargo, Departamento, normalizarNome } from '../services/cargosDepartamentosService';

/**
 * Listas de seleção de Departamento/Setor e Cargo/Função ligadas aos
 * cadastros do Firestore (tela "Cargos & Departamentos").
 *
 * O valor gravado continua sendo o NOME (texto), igual aos campos antigos,
 * para não quebrar os registros já existentes. Se o registro tiver um valor
 * que não está no cadastro, ele aparece na lista como "(não cadastrado)"
 * para não ser perdido ao salvar.
 */

interface BaseProps {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  placeholder?: string;
}

const AvisoListaVazia: React.FC<{ texto: string }> = ({ texto }) => (
  <p className="text-[10px] text-amber-600 mt-1">{texto}</p>
);

export const DepartamentoSelect: React.FC<BaseProps & { departamentos: Departamento[] }> = ({
  value,
  onChange,
  departamentos,
  className,
  disabled,
  required,
  id,
  placeholder = 'Selecione o departamento…'
}) => {
  const ativos = departamentos.filter(d => d.ativo !== false || d.nome === value);
  const valorForaDoCadastro = !!value && !ativos.some(d => d.nome === value);

  return (
    <>
      <select
        id={id}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={className}
        disabled={disabled}
        required={required}
      >
        <option value="">{placeholder}</option>
        {valorForaDoCadastro && <option value={value}>{value} (não cadastrado)</option>}
        {ativos.map(d => (
          <option key={d.id} value={d.nome}>
            {d.sigla ? `${d.nome} (${d.sigla})` : d.nome}
          </option>
        ))}
      </select>
      {departamentos.length === 0 && (
        <AvisoListaVazia texto="Nenhum departamento cadastrado. Cadastre em Finanças → Cargos & Departamentos." />
      )}
    </>
  );
};

/** Encontra o id do departamento a partir do nome gravado no formulário. */
const idDoDepartamento = (departamentos: Departamento[], nome?: string) =>
  nome ? departamentos.find(d => normalizarNome(d.nome) === normalizarNome(nome))?.id : undefined;

/** Remove nomes repetidos (mesmo cargo cadastrado mais de uma vez). */
const unicosPorNome = (lista: Cargo[]) =>
  Array.from(new Map(lista.map(c => [normalizarNome(c.nome), c])).values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );

export const CargoSelect: React.FC<
  BaseProps & {
    cargos: Cargo[];
    departamentos: Departamento[];
    /**
     * Nome do departamento escolhido. A lista mostra os cargos vinculados a ele
     * e, num grupo separado, os cargos marcados como "Todos os setores".
     * Sem departamento escolhido, o campo fica bloqueado.
     */
    departamentoSelecionado?: string;
  }
> = ({
  value,
  onChange,
  cargos,
  departamentos,
  departamentoSelecionado,
  className,
  disabled,
  required,
  id,
  placeholder = 'Selecione o cargo…'
}) => {
  const filtrarPorDepartamento = departamentoSelecionado !== undefined;
  const depId = idDoDepartamento(departamentos, departamentoSelecionado);
  const ativos = cargos.filter(c => c.ativo !== false);

  const doDepartamento = filtrarPorDepartamento
    ? unicosPorNome(ativos.filter(c => !!depId && c.departamentoId === depId))
    : unicosPorNome(ativos);
  const doDepNomes = new Set(doDepartamento.map(c => normalizarNome(c.nome)));
  const gerais = filtrarPorDepartamento
    ? unicosPorNome(ativos.filter(c => !c.departamentoId && !doDepNomes.has(normalizarNome(c.nome))))
    : [];

  const semDepartamento = filtrarPorDepartamento && !departamentoSelecionado;
  const valorNaLista = !!value && [...doDepartamento, ...gerais].some(c => normalizarNome(c.nome) === normalizarNome(value));
  const valorForaDaLista = !!value && !valorNaLista;

  // Ao trocar o departamento, limpa o cargo se ele não pertence ao novo setor.
  // (Não roda na abertura do formulário, para não apagar cadastros antigos.)
  const depAnterior = React.useRef(departamentoSelecionado);
  React.useEffect(() => {
    if (!filtrarPorDepartamento) return;
    if (depAnterior.current === departamentoSelecionado) return;
    depAnterior.current = departamentoSelecionado;
    if (value && !valorNaLista) onChange('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departamentoSelecionado]);

  const nadaParaEscolher = filtrarPorDepartamento && !semDepartamento && doDepartamento.length === 0 && gerais.length === 0;

  return (
    <>
      <select
        id={id}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={className}
        disabled={disabled || (semDepartamento && !value)}
        required={required}
      >
        <option value="">{semDepartamento ? 'Selecione primeiro o departamento…' : placeholder}</option>
        {valorForaDaLista && (
          <option value={value}>
            {value} ({cargos.some(c => normalizarNome(c.nome) === normalizarNome(value)) ? 'outro departamento' : 'não cadastrado'})
          </option>
        )}
        {gerais.length > 0 ? (
          <>
            {doDepartamento.length > 0 && (
              <optgroup label={`Cargos de ${departamentoSelecionado}`}>
                {doDepartamento.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Comuns a todos os setores">
              {gerais.map(c => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </optgroup>
          </>
        ) : (
          doDepartamento.map(c => (
            <option key={c.id} value={c.nome}>{c.nome}</option>
          ))
        )}
      </select>
      {cargos.length === 0 ? (
        <AvisoListaVazia texto="Nenhum cargo cadastrado. Cadastre em Finanças → Cargos & Departamentos." />
      ) : nadaParaEscolher ? (
        <AvisoListaVazia texto="Nenhum cargo vinculado a este departamento. Vincule em Finanças → Cargos & Departamentos." />
      ) : null}
    </>
  );
};
