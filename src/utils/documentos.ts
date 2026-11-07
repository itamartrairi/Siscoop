// Máscaras e validações de documentos (CPF/CNPJ), CEP e telefone.

export const somenteDigitos = (v: string | undefined | null): string => String(v || '').replace(/\D/g, '');

/** Valida os dígitos verificadores do CPF. */
export const cpfValido = (valor: string): boolean => {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string) => {
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(cpf.slice(0, 9));
  const d2 = dv(cpf.slice(0, 9) + d1);
  return cpf.endsWith(`${d1}${d2}`);
};

/** Valida os dígitos verificadores do CNPJ. */
export const cnpjDigitosValidos = (valor: string): boolean => {
  const cnpj = somenteDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, ...p1];
  const d1 = calc(cnpj.slice(0, 12), p1);
  const d2 = calc(cnpj.slice(0, 12) + d1, p2);
  return cnpj.endsWith(`${d1}${d2}`);
};

/** Aplica a máscara de CPF ou CNPJ enquanto o usuário digita. */
export const formatarDocumento = (valor: string, tipo: 'PF' | 'PJ'): string => {
  const d = somenteDigitos(valor).slice(0, tipo === 'PF' ? 11 : 14);
  if (tipo === 'PF') {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const tipoPessoaDoDocumento = (doc: string): 'PF' | 'PJ' => (somenteDigitos(doc).length === 11 ? 'PF' : 'PJ');

export const formatarCep = (valor: string): string => {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export const formatarTelefone = (valor: string): string => {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** Consulta o endereço de um CEP na BrasilAPI (dados dos Correios). */
export const consultarCep = async (cep: string): Promise<EnderecoCep> => {
  const d = somenteDigitos(cep);
  if (d.length !== 8) throw new Error('CEP deve ter 8 dígitos.');
  const resp = await fetch(`https://brasilapi.com.br/api/cep/v1/${d}`);
  if (!resp.ok) throw new Error('CEP não encontrado.');
  const j = await resp.json();
  return {
    logradouro: String(j.street || ''),
    bairro: String(j.neighborhood || ''),
    cidade: String(j.city || ''),
    uf: String(j.state || ''),
  };
};
