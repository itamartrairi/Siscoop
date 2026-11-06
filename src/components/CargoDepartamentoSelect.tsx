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

export const CargoSelect: React.FC<
  BaseProps & {
    cargos: Cargo[];
    departamentos: Departamento[];
    /** Nome do departamento escolhido: mostra só os cargos dele (e os gerais). */
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
  const depId = departamentoSelecionado
    ? departamentos.find(d => normalizarNome(d.nome) === normalizarNome(departamentoSelecionado))?.id
    : undefined;

  const visiveis = cargos.filter(c => {
    if (c.ativo === false && c.nome !== value) return false;
    if (!depId) return true;
    return !c.departamentoId || c.departamentoId === depId || c.nome === value;
  });

  // Mesmo nome em departamentos diferentes aparece uma vez só.
  const nomesUnicos = Array.from(new Map(visiveis.map(c => [normalizarNome(c.nome), c])).values());
  const valorForaDoCadastro = !!value && !nomesUnicos.some(c => c.nome === value);

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
        {nomesUnicos.map(c => (
          <option key={c.id} value={c.nome}>
            {c.nome}
          </option>
        ))}
      </select>
      {cargos.length === 0 && (
        <AvisoListaVazia texto="Nenhum cargo cadastrado. Cadastre em Finanças → Cargos & Departamentos." />
      )}
    </>
  );
};
