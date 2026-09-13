import { Cooperado } from '../types';
import { INITIAL_COOPERADOS } from '../data/mockInitialData';

// Map for quick lookup of reference names by CPF or Matrícula
const referenceMapByCpf = new Map<string, Cooperado>();
const referenceMapByMatricula = new Map<string, Cooperado>();

INITIAL_COOPERADOS.forEach(c => {
  if (c.cpf) {
    const clean = c.cpf.replace(/\D/g, '');
    if (clean) referenceMapByCpf.set(clean, c);
  }
  if (c.matricula) {
    referenceMapByMatricula.set(c.matricula.trim().toLowerCase(), c);
  }
});

export const isCpfPattern = (val: string): boolean => {
  if (!val) return false;
  const clean = val.replace(/\D/g, '');
  return clean.length === 11 || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val.trim());
};

export const isRgPattern = (val: string): boolean => {
  if (!val) return false;
  const upper = val.toUpperCase();
  return (
    upper.includes('SSP') ||
    upper.includes('SESP') ||
    upper.includes('DETRAN') ||
    upper.includes('SEJUSP') ||
    /^\d{6,10}\s*[A-Z]{2,5}(-[A-Z]{2})?$/.test(val.trim())
  );
};

export const isMatriculaPattern = (val: string): boolean => {
  if (!val) return false;
  const trimmed = val.trim();
  if (/^\d{1,6}$/.test(trimmed)) return true;
  if (/^(COOP|IMP|MAT|COP|P)-\d+/i.test(trimmed)) return true;
  return false;
};

export const isNamePattern = (val: string): boolean => {
  if (!val) return false;
  const trimmed = val.trim();
  // Contains at least 2 letters, no RG keywords, no CPF syntax
  if (/^\d+$/.test(trimmed)) return false;
  if (isCpfPattern(trimmed) || isRgPattern(trimmed)) return false;
  return /[a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,}/.test(trimmed);
};

/**
 * Sanitizes and auto-aligns swapped or misplaced fields in a Cooperado object or CSV row.
 */
export function sanitizeCooperado<T extends Record<string, any>>(record: T): T {
  if (!record) return record;

  let rawMatricula = (record.matricula || record.Matricula || record['Matrícula'] || record['Matricula'] || record['Nº'] || record['Nº Sócio'] || '').toString().trim();
  let rawNome = (record.nome || record.nomeCompleto || record['Nome Completo'] || record['Nome'] || record['NOME'] || record.cooperado || record['Cooperado'] || '').toString().trim();
  let rawCpf = (record.cpf || record.CPF || record['cpf'] || record['CPF/CNPJ'] || '').toString().trim();
  let rawRg = (record.rg || record.RG || record['RG'] || record['RG/Órgão'] || record['Identidade'] || '').toString().trim();

  const candidateValues = [rawMatricula, rawNome, rawCpf, rawRg].filter(v => v.length > 0);

  // 1. Resolve CPF
  let resolvedCpf = '';
  if (isCpfPattern(rawCpf)) {
    resolvedCpf = rawCpf;
  } else {
    const foundCpf = candidateValues.find(isCpfPattern);
    if (foundCpf) resolvedCpf = foundCpf;
  }

  // 2. Resolve RG
  let resolvedRg = '';
  if (isRgPattern(rawRg)) {
    resolvedRg = rawRg;
  } else {
    const foundRg = candidateValues.find(v => isRgPattern(v) && v !== resolvedCpf);
    if (foundRg) resolvedRg = foundRg;
  }

  // 3. Resolve Matrícula
  let resolvedMatricula = '';
  if (isMatriculaPattern(rawMatricula) && !isRgPattern(rawMatricula) && !isCpfPattern(rawMatricula)) {
    resolvedMatricula = rawMatricula;
  } else if (isMatriculaPattern(rawNome) && (isRgPattern(rawMatricula) || isCpfPattern(rawMatricula))) {
    // Swapped! Nome held the numeric matricula ("700") and matricula held the RG ("1234567 SSP-CE")
    resolvedMatricula = rawNome;
  } else {
    const foundMat = candidateValues.find(v => isMatriculaPattern(v) && v !== resolvedCpf && v !== resolvedRg);
    if (foundMat) resolvedMatricula = foundMat;
  }

  // 4. Resolve Nome
  let resolvedNome = '';
  if (isNamePattern(rawNome) && !isCpfPattern(rawNome) && !isRgPattern(rawNome) && !/^\d+$/.test(rawNome)) {
    resolvedNome = rawNome;
  } else if (isNamePattern(rawMatricula) && rawMatricula !== resolvedRg && rawMatricula !== resolvedCpf) {
    resolvedNome = rawMatricula;
  } else {
    const foundName = candidateValues.find(v => isNamePattern(v) && v !== resolvedCpf && v !== resolvedRg && v !== resolvedMatricula);
    if (foundName) resolvedNome = foundName;
  }

  // If name is still missing or pure number, try reference lookup
  if (!resolvedNome || /^\d+$/.test(resolvedNome)) {
    const cleanCpf = resolvedCpf.replace(/\D/g, '');
    const refByCpf = cleanCpf ? referenceMapByCpf.get(cleanCpf) : undefined;
    const refByMat = resolvedMatricula ? referenceMapByMatricula.get(resolvedMatricula.toLowerCase()) : undefined;
    const ref = refByCpf || refByMat;

    if (ref && ref.nome) {
      resolvedNome = ref.nome;
      if (!resolvedCpf && ref.cpf) resolvedCpf = ref.cpf;
      if (!resolvedRg && ref.rg) resolvedRg = ref.rg;
      if (!resolvedMatricula && ref.matricula) resolvedMatricula = ref.matricula;
    }
  }

  return {
    ...record,
    id: record.id || `cop-gen-${Math.random().toString(36).substring(2, 9)}`,
    tenantId: record.tenantId || 'coop-01',
    matricula: resolvedMatricula || rawMatricula || 'S/N',
    nome: resolvedNome ? resolvedNome.toUpperCase() : (rawNome || 'COOPERADO SEM NOME').toUpperCase(),
    cpf: resolvedCpf || rawCpf || '000.000.000-00',
    rg: resolvedRg || (rawRg !== resolvedMatricula ? rawRg : '') || '1234567 SSP-CE',
    dataNascimento: record.dataNascimento || '1980-01-01',
    sexo: (record.sexo || 'M').toString().toUpperCase().startsWith('F') ? 'F' : 'M',
    estadoCivil: record.estadoCivil || 'CASADO',
    profissao: record.profissao || 'AGRICULTOR',
    escolaridade: record.escolaridade || 'Ensino Fundamental',
    naturalidade: record.naturalidade || 'TRAIRI',
    nacionalidade: record.nacionalidade || 'BRASILEIRO',
    situacao: record.situacao || 'ATIVO',
    dataFiliacao: record.dataFiliacao || '2020-01-01',
    categoria: record.categoria || 'EFETIVO',
    fotoUrl: record.fotoUrl || '',
    cep: record.cep || '62.690-000',
    logradouro: record.logradouro || 'ZONA RURAL',
    numero: record.numero || 'S/N',
    complemento: record.complemento || '',
    bairro: record.bairro || record.localidadeComunidade || 'ZONA RURAL',
    cidade: record.cidade || 'Trairi',
    estado: record.estado || 'CE',
    pais: record.pais || 'Brasil',
    telefone: record.telefone || '(85) 99900-0000',
    celular: record.celular || '(85) 99900-0000',
    whatsapp: record.whatsapp || '85999000000',
    email: record.email || '',
    contatoEmergencia: record.contatoEmergencia || '',
    documentos: Array.isArray(record.documentos) ? record.documentos : [],
    banco: record.banco || 'Banco do Brasil',
    agencia: record.agencia || '0001',
    conta: record.conta || '10000-1',
    tipoConta: record.tipoConta || 'CORRENTE',
    chavePix: record.chavePix || '',
    historico: Array.isArray(record.historico) ? record.historico : [],
    capitalSubscrito: typeof record.capitalSubscrito === 'number' ? record.capitalSubscrito : (Number(record.capitalSubscrito) || 1000),
    capitalIntegralizado: typeof record.capitalIntegralizado === 'number' ? record.capitalIntegralizado : (Number(record.capitalIntegralizado) || 0),
    dapCaf: record.dapCaf || 'DAP-TRAIRI-2026',
    cafDapValidade: record.cafDapValidade || '2028-12-31',
    aptoPaa: record.aptoPaa !== false
  };
}
