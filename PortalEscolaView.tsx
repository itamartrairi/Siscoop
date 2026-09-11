import React, { useState, useRef, useEffect } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  GraduationCap,
  CheckCircle2,
  Lock,
  Mail,
  LogOut,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Plus,
  X
} from 'lucide-react';

// Pequeno seletor de nota por estrelas (1 a 5), usado na avaliação de
// qualidade dos produtos recebidos.
const SeletorEstrelas: React.FC<{ valor: number; onChange: (v: number) => void; label: string }> = ({ valor, onChange, label }) => (
  <div>
    <label className="block text-slate-700 dark:text-slate-300 font-bold text-xs mb-1">{label}</label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl leading-none transition-all ${n <= valor ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
          aria-label={`${n} estrela(s)`}
        >
          ★
        </button>
      ))}
    </div>
  </div>
);

export const PortalEscolaView: React.FC = () => {
  const { escolasPnae, entregasEscola, pedidosProdutorPAA, confirmarEntregaEscola } = useCoop();
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);

  // Acesso simplificado — somente por e-mail, sem senha. O cadastro da
  // escola é feito só pela administração (Cadastros → Escolas); este portal
  // é exclusivamente de login/consulta.
  const [authEmail, setAuthEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Escola matching strictly the logged-in email
  const escolaAtual = escolasPnae.find(
    e => e.email && authEmail.trim() && e.email.toLowerCase().trim() === authEmail.toLowerCase().trim()
  );

  // Pedidos que têm essa escola como destino de entrega — usados para
  // pré-preencher os produtos esperados no Comprovante de Entrega.
  const pedidosDaEscola = escolaAtual
    ? pedidosProdutorPAA.filter(p =>
        p.escolaId === escolaAtual.id ||
        (p.escolasIds || []).includes(escolaAtual.id) ||
        (p.itens || []).some(it => it.escolaId === escolaAtual.id)
      )
    : [];

  const [comprovanteForm, setComprovanteForm] = useState({
    pedidoId: '',
    motoristaNome: '',
    placaVeiculo: '',
    assinadoPor: '',
    statusConfirmacao: 'RECEBIDO_OK' as 'RECEBIDO_OK' | 'RECEBIDO_COM_RESTRICAO',
    observacaoRestricao: '',
    itensRecebidos: [] as { produto: string; qtdEsperada: number; qtdRecebida: number }[],
    avaliacao: {
      aparenciaVisual: 5,
      qualidadeGeral: 5,
      higieneEmbalagem: 5,
      pontualidadeEntrega: 5,
      quantidadeCorreta: true,
      comentarios: ''
    }
  });
  const [fotoComprovanteBase64, setFotoComprovanteBase64] = useState('');
  const canvasAssinaturaRef = useRef<HTMLCanvasElement | null>(null);
  const desenhandoRef = useRef(false);
  const [assinaturaVazia, setAssinaturaVazia] = useState(true);

  const handleOpenComprovante = () => {
    setComprovanteForm({
      pedidoId: '',
      motoristaNome: '',
      placaVeiculo: '',
      assinadoPor: '',
      statusConfirmacao: 'RECEBIDO_OK',
      observacaoRestricao: '',
      itensRecebidos: [],
      avaliacao: { aparenciaVisual: 5, qualidadeGeral: 5, higieneEmbalagem: 5, pontualidadeEntrega: 5, quantidadeCorreta: true, comentarios: '' }
    });
    setFotoComprovanteBase64('');
    setAssinaturaVazia(true);
    setShowComprovanteModal(true);
  };

  const handleSelecionarPedidoComprovante = (pedidoId: string) => {
    const pedido = pedidosProdutorPAA.find(p => p.id === pedidoId);
    const itensParaEscola = pedido && escolaAtual
      ? (pedido.itens || [])
          .filter(it => it.escolaId === escolaAtual.id || (!it.escolaId && (pedido.escolaId === escolaAtual.id || (pedido.escolasIds || []).includes(escolaAtual.id))))
          .map(it => ({ produto: it.produtoNome, qtdEsperada: Number(it.quantidadePedida) || 0, qtdRecebida: Number(it.quantidadePedida) || 0 }))
      : [];
    setComprovanteForm(prev => ({
      ...prev,
      pedidoId,
      itensRecebidos: itensParaEscola.length > 0 ? itensParaEscola : [{ produto: '', qtdEsperada: 0, qtdRecebida: 0 }]
    }));
  };

  const handleAdicionarItemComprovante = () => {
    setComprovanteForm(prev => ({ ...prev, itensRecebidos: [...prev.itensRecebidos, { produto: '', qtdEsperada: 0, qtdRecebida: 0 }] }));
  };

  const handleRemoverItemComprovante = (idx: number) => {
    setComprovanteForm(prev => ({ ...prev, itensRecebidos: prev.itensRecebidos.filter((_, i) => i !== idx) }));
  };

  const handleFotoComprovanteChange = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('A foto deve ter no máximo 3MB. Escolha um arquivo menor.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFotoComprovanteBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ===== Assinatura digital (canvas) =====
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasAssinaturaRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const handleAssinaturaStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    desenhandoRef.current = true;
    const ctx = canvasAssinaturaRef.current?.getContext('2d');
    const { x, y } = getCanvasPos(e);
    if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
  };

  const handleAssinaturaMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!desenhandoRef.current) return;
    e.preventDefault();
    const ctx = canvasAssinaturaRef.current?.getContext('2d');
    const { x, y } = getCanvasPos(e);
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    setAssinaturaVazia(false);
  };

  const handleAssinaturaEnd = () => { desenhandoRef.current = false; };

  const handleLimparAssinatura = () => {
    const canvas = canvasAssinaturaRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaVazia(true);
  };

  const handleSalvarComprovante = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaAtual) return;
    if (!comprovanteForm.assinadoPor.trim()) {
      alert('Informe o nome de quem está assinando o recebimento.');
      return;
    }
    if (assinaturaVazia) {
      alert('É necessário assinar no campo de assinatura antes de salvar.');
      return;
    }
    if (!fotoComprovanteBase64) {
      alert('É necessário anexar uma foto da entrega antes de salvar.');
      return;
    }
    if (comprovanteForm.itensRecebidos.length === 0 || comprovanteForm.itensRecebidos.every(it => !it.produto.trim())) {
      alert('Adicione ao menos um produto recebido.');
      return;
    }

    const { aparenciaVisual, qualidadeGeral, higieneEmbalagem, pontualidadeEntrega } = comprovanteForm.avaliacao;
    const notaMedia = Number(((aparenciaVisual + qualidadeGeral + higieneEmbalagem + pontualidadeEntrega) / 4).toFixed(1));
    const assinaturaUrl = canvasAssinaturaRef.current?.toDataURL('image/png') || '';
    const pedidoSelecionado = pedidosProdutorPAA.find(p => p.id === comprovanteForm.pedidoId);

    confirmarEntregaEscola({
      escolaId: escolaAtual.id,
      escolaNome: escolaAtual.nomeEscola,
      escolaEmail: escolaAtual.email,
      pedidoId: comprovanteForm.pedidoId || undefined,
      pedidoNumero: pedidoSelecionado?.numeroPedido,
      dataHoraEntrega: new Date().toISOString(),
      motoristaNome: comprovanteForm.motoristaNome || 'Não informado',
      placaVeiculo: comprovanteForm.placaVeiculo || 'Não informado',
      statusConfirmacao: comprovanteForm.statusConfirmacao,
      assinadoPor: comprovanteForm.assinadoPor,
      assinaturaUrl,
      fotoComprovanteUrl: fotoComprovanteBase64,
      itensRecebidos: comprovanteForm.itensRecebidos.filter(it => it.produto.trim()),
      observacaoRestricao: comprovanteForm.statusConfirmacao === 'RECEBIDO_COM_RESTRICAO' ? comprovanteForm.observacaoRestricao : undefined,
      avaliacaoQualidade: {
        ...comprovanteForm.avaliacao,
        notaMedia
      }
    });

    setShowComprovanteModal(false);
    alert('Comprovante de entrega registrado com sucesso!');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!authEmail.trim()) {
      setLoginError('Por favor, informe seu e-mail institucional.');
      return;
    }

    const found = escolasPnae.find(
      e => e.email && e.email.toLowerCase().trim() === authEmail.toLowerCase().trim()
    );

    if (!found) {
      setLoginError(`Nenhuma escola encontrada com o e-mail "${authEmail}". Utilize a aba "Cadastrar Escola" para cadastrar sua unidade.`);
      return;
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthEmail('');
    setLoginError(null);
  };

  const handleAprovar = (entrega: any) => {
    alert(`Recebimento verificado e assinado digitalmente para a ${entrega.escolaNome}! Termo de Aceite registrado.`);
  };

  // IF NOT LOGGED IN: Render Portal Login Card
  if (!isLoggedIn || !escolaAtual) {
    return (
      <div className="max-w-2xl mx-auto my-6 space-y-6">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-xs">
              <GraduationCap className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Portal da Escola (PNAE)</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acesse com o e-mail da sua unidade escolar para conferir o recebimento de merenda e assinar termos de aceite.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                E-mail Institucional da Escola
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="escola@educacao.gov.br"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                Sua escola já deve estar cadastrada pela cooperativa (Cadastros → Escolas). Se ainda não tiver acesso, fale com a administração.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Entrar no Portal da Escola
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ISOLATED DATA FOR LOGGED-IN SCHOOL
  const minhasEntregas = entregasEscola.filter(
    ent => (ent.escolaEmail && ent.escolaEmail.toLowerCase() === escolaAtual.email?.toLowerCase()) ||
           ent.escolaNome.toLowerCase() === escolaAtual.nomeEscola.toLowerCase() ||
           ent.escolaId === escolaAtual.id
  );

  return (
    <div className="space-y-6">
      {/* Top Banner with Active Session */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full w-fit border border-indigo-200 dark:border-indigo-800 mb-2">
            <GraduationCap className="w-3.5 h-3.5" /> Escola Autenticada: {escolaAtual.email}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{escolaAtual.nomeEscola}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Direção / Responsável: <strong className="text-slate-800 dark:text-slate-200">{escolaAtual.diretorResponsavel}</strong> | Alunos Atendidos: <strong>{escolaAtual.alunosAtendidos}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenComprovante}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            title="Comprovante com assinatura, foto e avaliação de qualidade dos produtos"
          >
            <ShieldCheck className="w-4 h-4" /> Comprovante de Entrega
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </div>

      {/* Entregas Exclusivas desta Escola */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {minhasEntregas.length === 0 ? (
          <div className="col-span-2 p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-xs font-medium">
            Nenhuma entrega de merenda registrada até o momento para {escolaAtual.nomeEscola} ({escolaAtual.email}).
          </div>
        ) : (
          minhasEntregas.map(ent => (
            <div key={ent.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{ent.escolaNome}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  ent.statusAprovacao === 'ENTREGUE_E_ASSINADO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {ent.statusAprovacao === 'ENTREGUE_E_ASSINADO' ? 'Conferido OK' : 'Pendente Aceite'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Data da Entrega:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{ent.dataEntrega || ent.dataHoraEntrega}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Itens:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{ent.itensDescricao || 'Hortifrúti PNAE'}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Volume Recebido:</span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-400">{ent.quantidadeKg} Kg</span>
                </div>
              </div>

              {ent.statusAprovacao !== 'ENTREGUE_E_ASSINADO' ? (
                <button
                  onClick={() => handleAprovar(ent)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Assinar Digitalmente Aceite de Merenda
                </button>
              ) : (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Assinado por {ent.responsavelRecebimento || ent.assinadoPor}
                </div>
              )}

              {/* Comprovante completo (assinatura, foto e avaliação de qualidade) */}
              {ent.avaliacaoQualidade && (
                <div className="p-3 bg-amber-50/70 dark:bg-slate-900/40 border border-amber-200 dark:border-slate-700 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 dark:text-amber-300 text-[11px]">Avaliação de Qualidade</span>
                    <span className="font-black text-amber-700 dark:text-amber-400">{'★'.repeat(Math.round(ent.avaliacaoQualidade.notaMedia))}{'☆'.repeat(5 - Math.round(ent.avaliacaoQualidade.notaMedia))} ({ent.avaliacaoQualidade.notaMedia})</span>
                  </div>
                  {ent.avaliacaoQualidade.comentarios && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">"{ent.avaliacaoQualidade.comentarios}"</p>
                  )}
                  {!ent.avaliacaoQualidade.quantidadeCorreta && (
                    <p className="text-[11px] text-rose-600 font-bold">⚠ Quantidade divergente do esperado</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    {ent.fotoComprovanteUrl && (
                      <a href={ent.fotoComprovanteUrl} target="_blank" rel="noreferrer" className="block">
                        <img src={ent.fotoComprovanteUrl} alt="Foto da entrega" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                      </a>
                    )}
                    {ent.assinaturaUrl && (
                      <img src={ent.assinaturaUrl} alt="Assinatura" className="h-12 border border-slate-200 rounded-lg bg-white" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Comprovante de Entrega — assinatura, foto e avaliação */}
      {showComprovanteModal && escolaAtual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-100 dark:border-slate-700 my-4 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Comprovante de Entrega — {escolaAtual.nomeEscola}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confira os produtos, avalie a qualidade e assine para confirmar o recebimento.</p>
              </div>
              <button onClick={() => setShowComprovanteModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarComprovante} className="space-y-5 text-xs">
              {/* Vínculo com pedido (opcional) */}
              {pedidosDaEscola.length > 0 && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Vincular a um Pedido (opcional)</label>
                  <select
                    value={comprovanteForm.pedidoId}
                    onChange={e => handleSelecionarPedidoComprovante(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl"
                  >
                    <option value="">Preencher produtos manualmente</option>
                    {pedidosDaEscola.map(p => (
                      <option key={p.id} value={p.id}>Pedido {p.numeroPedido} — {p.programaNome || p.programa}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Motorista</label>
                  <input
                    type="text"
                    value={comprovanteForm.motoristaNome}
                    onChange={e => setComprovanteForm({ ...comprovanteForm, motoristaNome: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl"
                    placeholder="Nome do motorista"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Placa do Veículo</label>
                  <input
                    type="text"
                    value={comprovanteForm.placaVeiculo}
                    onChange={e => setComprovanteForm({ ...comprovanteForm, placaVeiculo: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl font-mono"
                    placeholder="ABC-1234"
                  />
                </div>
              </div>

              {/* Produtos recebidos */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold">Produtos Recebidos *</label>
                  <button type="button" onClick={handleAdicionarItemComprovante} className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Adicionar item
                  </button>
                </div>
                <div className="space-y-2">
                  {comprovanteForm.itensRecebidos.length === 0 && (
                    <p className="text-slate-400 italic text-[11px]">Nenhum item adicionado ainda — clique em "Adicionar item" ou selecione um pedido acima.</p>
                  )}
                  {comprovanteForm.itensRecebidos.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.produto}
                        onChange={e => setComprovanteForm(prev => ({ ...prev, itensRecebidos: prev.itensRecebidos.map((it, i) => i === idx ? { ...it, produto: e.target.value } : it) }))}
                        placeholder="Nome do produto"
                        className="flex-1 p-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg"
                      />
                      <input
                        type="number"
                        value={item.qtdEsperada}
                        onChange={e => setComprovanteForm(prev => ({ ...prev, itensRecebidos: prev.itensRecebidos.map((it, i) => i === idx ? { ...it, qtdEsperada: parseFloat(e.target.value) || 0 } : it) }))}
                        placeholder="Qtd. esperada"
                        title="Quantidade esperada (KG)"
                        className="w-24 p-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg text-right"
                      />
                      <input
                        type="number"
                        value={item.qtdRecebida}
                        onChange={e => setComprovanteForm(prev => ({ ...prev, itensRecebidos: prev.itensRecebidos.map((it, i) => i === idx ? { ...it, qtdRecebida: parseFloat(e.target.value) || 0 } : it) }))}
                        placeholder="Qtd. recebida"
                        title="Quantidade recebida (KG)"
                        className="w-24 p-2 border border-emerald-200 bg-emerald-50 dark:bg-slate-900 dark:text-white rounded-lg text-right font-bold"
                      />
                      <button type="button" onClick={() => handleRemoverItemComprovante(idx)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avaliação de qualidade */}
              <div className="p-4 bg-amber-50/70 dark:bg-slate-900/40 border border-amber-200 dark:border-slate-700 rounded-xl space-y-3">
                <h3 className="font-black text-amber-900 dark:text-amber-300 text-sm">Avaliação de Qualidade dos Produtos</h3>
                <div className="grid grid-cols-2 gap-4">
                  <SeletorEstrelas
                    label="Aparência Visual"
                    valor={comprovanteForm.avaliacao.aparenciaVisual}
                    onChange={v => setComprovanteForm(prev => ({ ...prev, avaliacao: { ...prev.avaliacao, aparenciaVisual: v } }))}
                  />
                  <SeletorEstrelas
                    label="Qualidade Geral"
                    valor={comprovanteForm.avaliacao.qualidadeGeral}
                    onChange={v => setComprovanteForm(prev => ({ ...prev, avaliacao: { ...prev.avaliacao, qualidadeGeral: v } }))}
                  />
                  <SeletorEstrelas
                    label="Higiene da Embalagem"
                    valor={comprovanteForm.avaliacao.higieneEmbalagem}
                    onChange={v => setComprovanteForm(prev => ({ ...prev, avaliacao: { ...prev.avaliacao, higieneEmbalagem: v } }))}
                  />
                  <SeletorEstrelas
                    label="Pontualidade da Entrega"
                    valor={comprovanteForm.avaliacao.pontualidadeEntrega}
                    onChange={v => setComprovanteForm(prev => ({ ...prev, avaliacao: { ...prev.avaliacao, pontualidadeEntrega: v } }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={comprovanteForm.avaliacao.quantidadeCorreta}
                    onChange={e => setComprovanteForm(prev => ({ ...prev, avaliacao: { ...prev.avaliacao, quantidadeCorreta: e.target.checked } }))}
                    className="rounded"
                  />
                  A quantidade entregue está de acordo com o esperado
                </label>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Comentários sobre a Qualidade (opcional)</label>
                  <textarea
                    value={comprovanteForm.avaliacao.comentarios}
                    onChange={e => setComprovanteForm(prev => ({ ...prev, avaliacao: { ...prev.avaliacao, comentarios: e.target.value } }))}
                    rows={2}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl"
                    placeholder="Ex: Produtos frescos, entrega dentro do prazo..."
                  />
                </div>
              </div>

              {/* Status e observação de restrição */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Status do Recebimento</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setComprovanteForm({ ...comprovanteForm, statusConfirmacao: 'RECEBIDO_OK' })}
                    className={`flex-1 py-2 rounded-xl font-bold border-2 transition-all ${comprovanteForm.statusConfirmacao === 'RECEBIDO_OK' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                  >
                    Recebido OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setComprovanteForm({ ...comprovanteForm, statusConfirmacao: 'RECEBIDO_COM_RESTRICAO' })}
                    className={`flex-1 py-2 rounded-xl font-bold border-2 transition-all ${comprovanteForm.statusConfirmacao === 'RECEBIDO_COM_RESTRICAO' ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                  >
                    Recebido com Restrição
                  </button>
                </div>
                {comprovanteForm.statusConfirmacao === 'RECEBIDO_COM_RESTRICAO' && (
                  <textarea
                    value={comprovanteForm.observacaoRestricao}
                    onChange={e => setComprovanteForm({ ...comprovanteForm, observacaoRestricao: e.target.value })}
                    rows={2}
                    className="w-full mt-2 p-2.5 border border-amber-300 rounded-xl"
                    placeholder="Descreva a restrição (ex.: quantidade divergente, produto avariado)..."
                  />
                )}
              </div>

              {/* Foto da entrega */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Foto da Entrega *</label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-emerald-400 transition-all">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">{fotoComprovanteBase64 ? 'Trocar foto anexada' : 'Clique para anexar uma foto da entrega'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => handleFotoComprovanteChange(e.target.files?.[0])}
                  />
                </label>
                {fotoComprovanteBase64 && (
                  <img src={fotoComprovanteBase64} alt="Prévia da foto da entrega" className="mt-2 max-h-48 rounded-xl border border-slate-200 dark:border-slate-600" />
                )}
              </div>

              {/* Assinatura digital */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold">Assinatura do Responsável pelo Recebimento *</label>
                  <button type="button" onClick={handleLimparAssinatura} className="text-rose-600 font-bold hover:underline text-[11px]">Limpar</button>
                </div>
                <input
                  type="text"
                  required
                  value={comprovanteForm.assinadoPor}
                  onChange={e => setComprovanteForm({ ...comprovanteForm, assinadoPor: e.target.value })}
                  placeholder="Nome completo de quem está assinando"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl mb-2"
                />
                <canvas
                  ref={canvasAssinaturaRef}
                  width={640}
                  height={160}
                  className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-white cursor-crosshair touch-none"
                  onMouseDown={handleAssinaturaStart}
                  onMouseMove={handleAssinaturaMove}
                  onMouseUp={handleAssinaturaEnd}
                  onMouseLeave={handleAssinaturaEnd}
                  onTouchStart={handleAssinaturaStart}
                  onTouchMove={handleAssinaturaMove}
                  onTouchEnd={handleAssinaturaEnd}
                />
                <p className="text-[10px] text-slate-400 mt-1">Assine com o mouse ou o dedo (em telas touch) dentro da área acima.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowComprovanteModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Salvar Comprovante Assinado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
