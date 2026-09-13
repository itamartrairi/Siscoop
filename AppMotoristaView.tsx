import React, { useState, useRef } from 'react';
import { useCoop } from '../context/CoopContext';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Camera,
  PenLine,
  Mail,
  LogOut,
  ShieldCheck,
  AlertCircle,
  ClipboardList,
  Image as ImageIcon
} from 'lucide-react';

// Assinatura digital simples, desenhada com o dedo/mouse num canvas.
// Exporta a assinatura como PNG (data URL) sempre que o traço termina.
const SignaturePad: React.FC<{ value: string; onChange: (dataUrl: string) => void }> = ({ value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const getCtx = () => canvasRef.current?.getContext('2d') || null;

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (canvasRef.current) onChange(canvasRef.current.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        className="w-full bg-white rounded-xl border-2 border-dashed border-slate-300 touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-slate-400">Peça para quem recebeu assinar aqui com o dedo</span>
        <button type="button" onClick={handleClear} className="text-[10px] text-rose-500 font-bold cursor-pointer">
          Limpar
        </button>
      </div>
    </div>
  );
};

export const AppMotoristaView: React.FC = () => {
  const { motoristas, programacoesEntrega, updateProgramacaoEntrega } = useCoop();

  // Acesso simplificado — somente por e-mail, sem senha. O cadastro do
  // motorista é feito só pela administração (Cadastros → Motoristas); este
  // portal é exclusivamente de login/acesso às rotas.
  const [authEmail, setAuthEmail] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Driver matching strictly the logged-in email — motoristas agora vem do
  // Context (persistido e isolado por cooperativa), não mais de um estado
  // local que se perdia ao recarregar a página.
  const motoristaAtual = motoristas.find(
    m => m.email && authEmail.trim() && m.email.toLowerCase().trim() === authEmail.toLowerCase().trim()
  );

  // Comprovante de entrega sendo preenchido no momento: qual parada
  // (rotaId + índice da parada) e os dados capturados (quem recebeu, foto, assinatura).
  const [entregaAtiva, setEntregaAtiva] = useState<{ rotaId: string; paradaIdx: number } | null>(null);
  const [comprovanteForm, setComprovanteForm] = useState({ recebidoPor: '', fotoDataUrl: '', assinaturaDataUrl: '' });
  const [comprovanteErro, setComprovanteErro] = useState<string | null>(null);

  // Navegação em duas etapas: o motorista primeiro escolhe o Pedido (que pode
  // ter várias entregas/remessas no cronograma) e só depois vê a lista de
  // entregas daquele pedido para registrar e assinar.
  const [pedidoSelecionadoKey, setPedidoSelecionadoKey] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!authEmail.trim()) {
      setLoginError('Por favor, informe seu e-mail de motorista.');
      return;
    }

    const found = motoristas.find(
      m => m.email && m.email.toLowerCase().trim() === authEmail.toLowerCase().trim()
    );

    if (!found) {
      setLoginError(`Nenhum motorista encontrado com o e-mail "${authEmail}". Peça para a cooperativa cadastrar seu acesso em Cadastros → Motoristas.`);
      return;
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthEmail('');
    setLoginError(null);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setComprovanteForm(prev => ({ ...prev, fotoDataUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const handleAbrirComprovante = (rotaId: string, paradaIdx: number) => {
    setEntregaAtiva({ rotaId, paradaIdx });
    setComprovanteForm({ recebidoPor: '', fotoDataUrl: '', assinaturaDataUrl: '' });
    setComprovanteErro(null);
  };

  const handleConfirmarEntrega = (rota: (typeof programacoesEntrega)[number]) => {
    if (!entregaAtiva) return;
    if (!comprovanteForm.recebidoPor.trim()) {
      setComprovanteErro('Informe o nome de quem recebeu a entrega.');
      return;
    }
    if (!comprovanteForm.assinaturaDataUrl) {
      setComprovanteErro('É necessário colher a assinatura de quem recebeu.');
      return;
    }

    const paradasAtuais = rota.paradasEntrega && rota.paradasEntrega.length > 0
      ? [...rota.paradasEntrega]
      : [{
          escolaId: rota.escolaId || '',
          escolaNome: rota.escolaNome || rota.escolaOrgaoDestino,
          distanciaKm: 0,
          quantidadeKg: rota.quantidadeTotalKg,
          statusEntrega: 'PENDENTE' as const
        }];

    paradasAtuais[entregaAtiva.paradaIdx] = {
      ...paradasAtuais[entregaAtiva.paradaIdx],
      statusEntrega: 'ENTREGUE',
      recebidoPor: comprovanteForm.recebidoPor,
      dataHoraEntregaRealizada: new Date().toISOString(),
      fotoComprovanteUrl: comprovanteForm.fotoDataUrl,
      assinaturaDataUrl: comprovanteForm.assinaturaDataUrl
    };

    const todasEntregues = paradasAtuais.every(p => p.statusEntrega === 'ENTREGUE');
    const algumaEntregue = paradasAtuais.some(p => p.statusEntrega === 'ENTREGUE');

    updateProgramacaoEntrega(rota.id, {
      paradasEntrega: paradasAtuais,
      status: todasEntregues ? 'ENTREGUE' : algumaEntregue ? 'PARCIAL' : rota.status
    });

    setEntregaAtiva(null);
    setComprovanteErro(null);
  };

  // IF NOT LOGGED IN: Render App Login Card
  if (!isLoggedIn || !motoristaAtual) {
    return (
      <div className="max-w-xl mx-auto my-6 space-y-6">
        <div className="max-w-md mx-auto bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-300 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-xs border border-amber-500/30">
              <Truck className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">App do Motorista & Logística</h1>
            <p className="text-xs text-slate-400">
              Acesse com seu e-mail de motorista para visualizar suas rotas de entrega PNAE/PAA geradas pela cooperativa.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                E-mail do Motorista
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="motorista@logistica.coop.br"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Seu e-mail de motorista já deve estar cadastrado pela cooperativa (Cadastros → Motoristas). Se ainda não tiver acesso, fale com a administração.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Entrar no App do Motorista
            </button>
          </form>
        </div>
      </div>
    );
  }

  // DATA ISOLATION FOR LOGGED-IN DRIVER — rotas geradas pela administração
  // em SisGepa → Programação de Entregas, vinculadas pelo nome do motorista
  // selecionado naquele cadastro.
  // Rotas geradas pela cooperativa, mostrando ao motorista apenas as que
  // ainda têm entregas pendentes de assinatura (rotas já totalmente
  // ENTREGUES ou CANCELADAS saem da lista de ação do motorista).
  const minhasRotas = programacoesEntrega.filter(
    p => p.motoristaNome && p.motoristaNome.toLowerCase().trim() === motoristaAtual.nome.toLowerCase().trim()
      && p.status !== 'ENTREGUE' && p.status !== 'CANCELADA'
  );

  // Agrupa as rotas/programações por Pedido — um mesmo pedido pode ter várias
  // remessas/parcelas de entrega no cronograma. O motorista primeiro escolhe
  // o Pedido e só depois vê a lista de entregas daquele pedido.
  const chavePedido = (rota: (typeof minhasRotas)[number]) =>
    rota.pedidoId || rota.pedidoNumero || rota.chamadaPublicaEdital || rota.id;

  type PedidoAgrupado = { key: string; pedidoNumero: string; programaNome?: string; chamadaPublicaEdital?: string; rotas: typeof minhasRotas };

  const gruposPorPedido = minhasRotas.reduce((acc, rota) => {
    const key = chavePedido(rota);
    if (!acc[key]) {
      acc[key] = {
        key,
        pedidoNumero: rota.pedidoNumero || rota.chamadaPublicaEdital || 'Pedido sem número',
        programaNome: rota.programaNome,
        chamadaPublicaEdital: rota.chamadaPublicaEdital,
        rotas: []
      };
    }
    acc[key].rotas.push(rota);
    return acc;
  }, {} as Record<string, PedidoAgrupado>);

  const pedidosAgrupados: PedidoAgrupado[] = Object.keys(gruposPorPedido).map(k => gruposPorPedido[k]);

  const pedidoSelecionado = pedidosAgrupados.find(p => p.key === pedidoSelecionadoKey) || null;
  const rotasDoPedidoSelecionado = pedidoSelecionado?.rotas || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full w-fit border border-emerald-200 dark:border-emerald-800 mb-2">
            <Truck className="w-3.5 h-3.5" /> Motorista: {motoristaAtual.email}
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{motoristaAtual.nome}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Veículo Atribuído: <strong className="text-slate-800 dark:text-slate-200">{motoristaAtual.veiculoPadrao}</strong>
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-1 transition-all cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </div>

      {/* ETAPA 1: Seleção do Pedido */}
      {!pedidoSelecionado && (
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-600" /> Selecione o Pedido
          </h2>
          {pedidosAgrupados.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-xs font-medium">
              Nenhum pedido com entregas atribuídas a {motoristaAtual.nome} ({motoristaAtual.email}) no momento. As rotas são criadas pela cooperativa em SisGepa → Programação de Entregas.
            </div>
          ) : (
            pedidosAgrupados.map(pg => {
              const totalParadasPendentes = pg.rotas.reduce((sum, rota) => {
                const paradas = rota.paradasEntrega && rota.paradasEntrega.length > 0 ? rota.paradasEntrega : [{ statusEntrega: 'PENDENTE' as const }];
                return sum + paradas.filter(p => p.statusEntrega !== 'ENTREGUE').length;
              }, 0);
              return (
                <button
                  key={pg.key}
                  type="button"
                  onClick={() => setPedidoSelecionadoKey(pg.key)}
                  className="w-full text-left p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div>
                    <div className="font-mono font-black text-sm text-slate-900 dark:text-white">{pg.pedidoNumero}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {pg.programaNome && <span>{pg.programaNome} · </span>}
                      {pg.rotas.length} {pg.rotas.length === 1 ? 'entrega' : 'entregas'} no cronograma
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-bold shrink-0">
                    {totalParadasPendentes} pendente(s)
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ETAPA 2: Entregas do Pedido selecionado */}
      {pedidoSelecionado && (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => { setPedidoSelecionadoKey(null); setEntregaAtiva(null); setComprovanteErro(null); }}
          className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
        >
          ← Voltar aos pedidos
        </button>
        <h2 className="text-sm font-black text-slate-900 dark:text-white">
          Entregas do Pedido <span className="font-mono">{pedidoSelecionado.pedidoNumero}</span>
        </h2>
        {rotasDoPedidoSelecionado.map(rota => {
            const paradas = rota.paradasEntrega && rota.paradasEntrega.length > 0
              ? rota.paradasEntrega
              : [{
                  escolaId: rota.escolaId || '',
                  escolaNome: rota.escolaNome || rota.escolaOrgaoDestino,
                  distanciaKm: 0,
                  quantidadeKg: rota.quantidadeTotalKg,
                  statusEntrega: 'PENDENTE' as const
                }];

            return (
              <div key={rota.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-800 dark:text-slate-200">
                    {rota.pedidoNumero || rota.chamadaPublicaEdital || 'Rota de Entrega'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    rota.status === 'ENTREGUE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    rota.status === 'PARCIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    rota.status === 'CANCELADA' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {rota.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <MapPin className="w-4 h-4 text-emerald-600" /> {rota.programaNome} — Saída prevista: {rota.dataPrevista} {rota.horarioSaidaPrevisto}
                  </div>
                  {rota.veiculoPlaca && (
                    <div className="text-slate-600 dark:text-slate-400">Veículo: <span className="font-bold text-slate-800 dark:text-slate-200">{rota.veiculoPlaca} {rota.veiculoModelo}</span></div>
                  )}
                  {rota.quantidadeTotalKg != null && (
                    <div className="text-slate-600 dark:text-slate-400">Carga Total: <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{rota.quantidadeTotalKg} Kg</span></div>
                  )}
                </div>

                {/* Paradas / Escolas desta rota */}
                <div className="space-y-2.5">
                  {paradas.map((parada, idx) => {
                    const jaEntregue = parada.statusEntrega === 'ENTREGUE';
                    const formAberto = entregaAtiva?.rotaId === rota.id && entregaAtiva?.paradaIdx === idx;
                    return (
                      <div key={parada.id || idx} className={`p-3.5 rounded-2xl border text-xs ${
                        jaEntregue ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{parada.escolaNome}</div>
                            {parada.endereco && <div className="text-[10px] text-slate-500">{parada.endereco}</div>}
                            {parada.quantidadeKg != null && (
                              <div className="text-[10px] text-slate-500">Carga desta parada: <span className="font-bold">{parada.quantidadeKg} Kg</span></div>
                            )}
                          </div>
                          {jaEntregue ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 rounded-full font-bold text-[10px] shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Entregue
                            </span>
                          ) : (
                            !formAberto && (
                              <button
                                onClick={() => handleAbrirComprovante(rota.id, idx)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Registrar Entrega
                              </button>
                            )
                          )}
                        </div>

                        {jaEntregue && (
                          <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-[11px] text-emerald-800 dark:text-emerald-300">
                            <span>Recebido por <strong>{parada.recebidoPor}</strong></span>
                            {parada.fotoComprovanteUrl && (
                              <a href={parada.fotoComprovanteUrl} target="_blank" rel="noreferrer" className="underline flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5" /> Ver foto
                              </a>
                            )}
                          </div>
                        )}

                        {/* Formulário de comprovante de entrega (foto + assinatura) */}
                        {formAberto && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                            {comprovanteErro && (
                              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {comprovanteErro}
                              </div>
                            )}

                            <div>
                              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Nome de quem recebeu *</label>
                              <input
                                type="text"
                                value={comprovanteForm.recebidoPor}
                                onChange={e => setComprovanteForm(prev => ({ ...prev, recebidoPor: e.target.value }))}
                                placeholder="Ex: Merendeira Maria José"
                                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5" /> Foto da entrega
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFotoChange}
                                className="w-full text-[11px] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 file:font-bold text-slate-500 dark:text-slate-400"
                              />
                              {comprovanteForm.fotoDataUrl && (
                                <img src={comprovanteForm.fotoDataUrl} alt="Foto da entrega" className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 max-h-40 object-cover" />
                              )}
                            </div>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                                <PenLine className="w-3.5 h-3.5" /> Assinatura de quem recebeu *
                              </label>
                              <SignaturePad
                                value={comprovanteForm.assinaturaDataUrl}
                                onChange={dataUrl => setComprovanteForm(prev => ({ ...prev, assinaturaDataUrl: dataUrl }))}
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => { setEntregaAtiva(null); setComprovanteErro(null); }}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-[11px] cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmarEntrega(rota)}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Confirmar Entrega
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
      )}
    </div>
  );
};
