import React, { useState, useRef, useEffect } from 'react';
import { useCoop } from '../context/CoopContext';
import { Building2, MapPin, DollarSign, Mail, Phone, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, HelpCircle, Upload, Image as ImageIcon, X, Search, Loader2, AlertTriangle } from 'lucide-react';
import { consultarCnpjReceita } from '../services/cnpjService';

interface Props {
  onComplete?: () => void;
}

export const CadastroCooperativaView: React.FC<Props> = ({ onComplete }) => {
  const { currentTenant, updateTenant, addTenant, updateConfig, fetchAddressByCep, currentUser, setCurrentUser } = useCoop();

  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  // Admin Profile Fields
  const [adminName, setAdminName] = useState(currentUser?.name || 'Administrador Responsável');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || 'admin@cooperativa.com.br');

  // Form Fields initialized from currentTenant
  const [name, setName] = useState(currentTenant?.name || 'Cooperai');
  const [razaoSocial, setRazaoSocial] = useState(currentTenant?.razaoSocial || 'Cooperativa Interativa Agro & Soluções Cooperai Ltda.');
  const [cnpj, setCnpj] = useState(currentTenant?.cnpj || '06.591.085/0001-06');
  const [email, setEmail] = useState(currentTenant?.email || 'contato@cooperai.coop.br');
  const [telefone, setTelefone] = useState(currentTenant?.telefone || '(11) 3456-7890');
  const [inscricaoEstadual, setInscricaoEstadual] = useState(currentTenant?.inscricaoEstadual || '');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState(currentTenant?.inscricaoMunicipal || '');

  // Consulta do CNPJ na base pública da Receita Federal
  const [isConsultandoCnpj, setIsConsultandoCnpj] = useState(false);
  const [cnpjConsulta, setCnpjConsulta] = useState<{ tipo: 'ok' | 'aviso' | 'erro'; mensagem: string } | null>(null);

  // Endereço
  const [cep, setCep] = useState(currentTenant?.cep || '01310-100');
  const [logradouro, setLogradouro] = useState(currentTenant?.logradouro || 'Avenida Paulista');
  const [numero, setNumero] = useState(currentTenant?.numero || '1000');
  const [bairro, setBairro] = useState(currentTenant?.bairro || 'Bela Vista');
  const [cidade, setCidade] = useState(currentTenant?.cidade || 'São Paulo');
  const [estado, setEstado] = useState(currentTenant?.estado || 'SP');

  // Capital Social
  const [cotaParteValor, setCotaParteValor] = useState<number>(currentTenant?.cotaParteValor ?? 100.00);
  const [cotaParteMinima, setCotaParteMinima] = useState<number>(currentTenant?.cotaParteMinima ?? 10);
  
  // Logotipo Upload & Presets
  const [logoUrl, setLogoUrl] = useState(currentTenant?.logoUrl || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&auto=format&fit=crop&q=80');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if currentTenant changes
  useEffect(() => {
    if (currentTenant) {
      setName(currentTenant.name || 'Cooperai');
      setRazaoSocial(currentTenant.razaoSocial || 'Cooperativa Interativa Agro & Soluções Cooperai Ltda.');
      setCnpj(currentTenant.cnpj || '06.591.085/0001-06');
      setEmail(currentTenant.email || 'contato@cooperai.coop.br');
      setTelefone(currentTenant.telefone || '(11) 3456-7890');
      setInscricaoEstadual(currentTenant.inscricaoEstadual || '');
      setInscricaoMunicipal(currentTenant.inscricaoMunicipal || '');
      setCep(currentTenant.cep || '01310-100');
      setLogradouro(currentTenant.logradouro || 'Avenida Paulista');
      setNumero(currentTenant.numero || '1000');
      setBairro(currentTenant.bairro || 'Bela Vista');
      setCidade(currentTenant.cidade || 'São Paulo');
      setEstado(currentTenant.estado || 'SP');
      setCotaParteValor(currentTenant.cotaParteValor ?? 100.00);
      setCotaParteMinima(currentTenant.cotaParteMinima ?? 10);
      setLogoUrl(currentTenant.logoUrl || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&auto=format&fit=crop&q=80');
    }
  }, [currentTenant]);

  // Busca o CNPJ na base pública da Receita e atualiza os campos do formulário
  const handleConsultarCnpj = async () => {
    setIsConsultandoCnpj(true);
    setCnpjConsulta(null);
    try {
      const dados = await consultarCnpjReceita(cnpj);
      const atualizados: string[] = [];
      const aplicar = (valor: string, setter: (v: string) => void, rotulo: string) => {
        if (valor) {
          setter(valor);
          atualizados.push(rotulo);
        }
      };
      aplicar(dados.razaoSocial, setRazaoSocial, 'razão social');
      aplicar(dados.nomeFantasia, setName, 'nome fantasia');
      aplicar(dados.email, setEmail, 'e-mail');
      aplicar(dados.telefone, setTelefone, 'telefone');
      aplicar(dados.inscricaoEstadual, setInscricaoEstadual, 'inscrição estadual');
      aplicar(dados.cep, setCep, 'CEP');
      aplicar(dados.logradouro, setLogradouro, 'logradouro');
      aplicar(dados.numero, setNumero, 'número');
      aplicar(dados.bairro, setBairro, 'bairro');
      aplicar(dados.cidade, setCidade, 'cidade');
      aplicar(dados.estado, setEstado, 'UF');

      const situacao = (dados.situacaoCadastral || '').toUpperCase();
      const ativa = !situacao || situacao === 'ATIVA';
      const cabecalho = ativa
        ? 'CNPJ ativo na Receita Federal.'
        : `Atenção: situação cadastral na Receita é ${situacao}.`;
      setCnpjConsulta({
        tipo: ativa ? 'ok' : 'aviso',
        mensagem: `${cabecalho} Atualizado: ${atualizados.join(', ') || 'nenhum campo'}. Confira e clique em salvar. (Fonte: ${dados.fonte})`,
      });
    } catch (err: any) {
      setCnpjConsulta({ tipo: 'erro', mensagem: err?.message || 'Falha ao consultar o CNPJ.' });
    } finally {
      setIsConsultandoCnpj(false);
    }
  };

  const presetLogos = [
    { label: 'Agronegócio (Cooperai)', url: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&auto=format&fit=crop&q=80' },
    { label: 'Crédito', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120' },
    { label: 'Saúde / Médica', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=120' },
    { label: 'Transporte', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120' },
    { label: 'Trabalho / Geral', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120' },
  ];

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP, SVG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('O tamanho máximo do arquivo de imagem é de 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Auto mask formatting for CNPJ
  const handleCnpjChange = (val: string) => {
    let clean = val.replace(/\D/g, '').substring(0, 14);
    if (clean.length > 12) {
      clean = clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else if (clean.length > 8) {
      clean = clean.replace(/^(\d{2})(\d{3})(\d{3})/, '$1.$2.$3/');
    } else if (clean.length > 5) {
      clean = clean.replace(/^(\d{2})(\d{3})/, '$1.$2.');
    } else if (clean.length > 2) {
      clean = clean.replace(/^(\d{2})/, '$1.');
    }
    setCnpj(clean);
  };

  // CEP lookup
  const handleCepSearch = async () => {
    if (!cep) return;
    setIsSearchingCep(true);
    const addr = await fetchAddressByCep(cep);
    setIsSearchingCep(false);
    if (addr) {
      setLogradouro(addr.logradouro || logradouro);
      setBairro(addr.bairro || bairro);
      setCidade(addr.cidade || cidade);
      setEstado(addr.estado || estado);
    } else {
      alert('CEP não localizado.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cnpj) {
      alert('Por favor, informe ao menos o Nome Fantasia e o CNPJ da Cooperativa.');
      return;
    }

    setIsLoading(true);

    // Update currentUser name and email if provided
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        name: adminName || currentUser.name,
        email: adminEmail || currentUser.email
      });
    }

    setTimeout(() => {
      const payload = {
        name,
        razaoSocial: razaoSocial || name,
        cnpj,
        email: email || 'contato@cooperai.coop.br',
        telefone: telefone || '(11) 3456-7890',
        inscricaoEstadual: inscricaoEstadual.trim(),
        inscricaoMunicipal: inscricaoMunicipal.trim(),
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        cotaParteValor: Number(cotaParteValor) || 100,
        cotaParteMinima: Number(cotaParteMinima) || 10,
        logoUrl: logoUrl || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=120&auto=format&fit=crop&q=80'
      };

      if (currentTenant?.id) {
        updateTenant(currentTenant.id, payload);
      } else {
        addTenant(payload);
      }

      updateConfig({
        nomeCooperativa: name,
        cooperativaNome: name,
        razaoSocial: razaoSocial || name,
        cnpj,
        cooperativaCnpj: cnpj,
        emailOficial: email,
        telefoneOficial: telefone,
        inscricaoEstadual: inscricaoEstadual.trim(),
        inscricaoMunicipal: inscricaoMunicipal.trim(),
        logoUrl,
        cotaParteValor: Number(cotaParteValor) || 100,
        cotaParteMinima: Number(cotaParteMinima) || 10,
        enderecoSede: {
          cep,
          logradouro,
          numero,
          bairro,
          cidade,
          estado
        }
      });

      setIsLoading(false);
      setSuccessBanner(true);

      setTimeout(() => {
        if (onComplete) onComplete();
      }, 900);
    }, 600);
  };

  const ufs = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Onboarding / Management Header */}
      <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-emerald-400" />
              <span>Cadastro da Cooperativa</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Configure os dados oficiais da sua cooperativa (Razão Social, CNPJ, Sede, Logotipo e Regras do Capital Social).
            </p>
          </div>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 bg-emerald-950 border border-emerald-600/60 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Os dados da cooperativa foram gravados com sucesso no SisCoope! Redirecionando...</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Dados da Instituição */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Building2 className="w-4 h-4 text-emerald-400" />
              1. Identificação Geral da Cooperativa
            </div>
            <span className="text-[10px] text-slate-400 font-mono">CNPJ Obrigatório</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nome Fantasia <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Cooperai"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={razaoSocial}
                onChange={e => setRazaoSocial(e.target.value)}
                placeholder="Ex: Cooperativa Interativa Agro Ltda"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                CNPJ da Cooperativa <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={cnpj}
                  onChange={e => {
                    handleCnpjChange(e.target.value);
                    setCnpjConsulta(null);
                  }}
                  placeholder="00.000.000/0001-00"
                  className="flex-1 min-w-0 w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleConsultarCnpj}
                  disabled={isConsultandoCnpj || cnpj.replace(/\D/g, '').length !== 14}
                  title="Buscar e atualizar os dados na base pública da Receita Federal"
                  className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  {isConsultandoCnpj ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  {isConsultandoCnpj ? 'Consultando...' : 'Consultar Receita'}
                </button>
              </div>
              {cnpjConsulta && (
                <p
                  className={`mt-1.5 text-[11px] flex items-start gap-1 ${
                    cnpjConsulta.tipo === 'ok' ? 'text-emerald-400' : cnpjConsulta.tipo === 'aviso' ? 'text-amber-300' : 'text-rose-400'
                  }`}
                >
                  {cnpjConsulta.tipo === 'ok' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                  )}
                  <span>{cnpjConsulta.mensagem}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                E-mail Oficial Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contato@cooperai.coop.br"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Telefone Oficial / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  placeholder="(11) 3456-7890"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Inscrição Estadual
              </label>
              <input
                type="text"
                value={inscricaoEstadual}
                onChange={e => setInscricaoEstadual(e.target.value.toUpperCase().replace(/[^0-9A-Z./-]/g, ''))}
                placeholder="Ex: 06.123456-7 ou ISENTO"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="mt-1 text-[10px] text-slate-500">Preenchida pela consulta ao CNPJ quando constar no cadastro público. Use ISENTO se a cooperativa não tiver.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Inscrição Municipal
              </label>
              <input
                type="text"
                value={inscricaoMunicipal}
                onChange={e => setInscricaoMunicipal(e.target.value.toUpperCase().replace(/[^0-9A-Z./-]/g, ''))}
                placeholder="Ex: 123456"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="mt-1 text-[10px] text-slate-500">Não consta na base da Receita: consulte o cadastro da prefeitura. Necessária para emitir NFS-e.</p>
            </div>
          </div>

          {/* Logotipo / Brasão Upload */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Logotipo / Brasão da Cooperativa
              </label>
              <span className="text-[10px] text-slate-400 font-mono">JPG, PNG, WEBP, SVG • Máx. 5MB</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Logo Preview Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-2 relative group min-h-[120px]">
                {logoUrl ? (
                  <>
                    <img
                      src={logoUrl}
                      alt="Preview do Logotipo"
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 object-cover rounded-xl border border-slate-700/80 shadow-md bg-slate-900"
                    />
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Logo Selecionado
                    </span>
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-slate-800/90 hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 rounded-lg transition-colors text-xs"
                      title="Remover logotipo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-[9px] mt-1 text-slate-500 font-mono">Sem Logo</span>
                  </div>
                )}
              </div>

              {/* Drag & Drop Upload Zone */}
              <div className="md:col-span-2 space-y-3">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/80 hover:bg-slate-950 text-slate-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 group-hover:border-emerald-500/50 flex items-center justify-center text-emerald-400 transition-colors shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      Arraste e solte o logotipo da cooperativa aqui, ou <span className="text-emerald-400 underline font-semibold">clique para buscar</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Envie um arquivo para personalizar relatórios, carteirinhas e cabeçalhos.
                    </p>
                  </div>
                </div>

                {/* Preset Logotypes Bar */}
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">
                    Ou selecione um modelo predefinido:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetLogos.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLogoUrl(preset.url)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                          logoUrl === preset.url
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600/60 shadow-xs'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <img src={preset.url} alt="" referrerPolicy="no-referrer" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Endereço da Sede */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800/80 pb-3">
            <MapPin className="w-4 h-4 text-emerald-400" />
            2. Endereço da Sede Administrativa
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                CEP
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cep}
                  onChange={e => setCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCepSearch}
                  disabled={isSearchingCep}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium shrink-0 transition-colors"
                >
                  {isSearchingCep ? '...' : 'Buscar CEP'}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Logradouro / Rua
              </label>
              <input
                type="text"
                value={logradouro}
                onChange={e => setLogradouro(e.target.value)}
                placeholder="Ex: Av. Central do Cooperativismo"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Número
              </label>
              <input
                type="text"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="Ex: 1000"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Bairro
              </label>
              <input
                type="text"
                value={bairro}
                onChange={e => setBairro(e.target.value)}
                placeholder="Ex: Bela Vista"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={cidade}
                  onChange={e => setCidade(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  UF
                </label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value)}
                  className="w-full px-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {ufs.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Regras de Capital Social Inicial */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800/80 pb-3">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            3. Regras de Cota-Parte e Capital Social
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Valor da Cota-Parte (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={cotaParteValor}
                onChange={e => setCotaParteValor(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Valor nominal unitário definido no Estatuto Social.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Cota-Parte Mínima Exigida por Cooperado
              </label>
              <input
                type="number"
                min="1"
                value={cotaParteMinima}
                onChange={e => setCotaParteMinima(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Quantidade mínima de cotas para admissão do cooperado.
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Capital Mínimo Inicial por Novo Cooperado:</span>
            </div>
            <div className="text-base font-black text-emerald-400 font-mono">
              R$ {((cotaParteValor || 0) * (cotaParteMinima || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-xl shadow-emerald-950 flex items-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <span>{isLoading ? 'Salvando Cooperativa...' : 'Concluir & Salvar Cadastro da Cooperativa'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
