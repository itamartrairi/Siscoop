import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Key,
  ExternalLink,
  CreditCard,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Award,
  Lock,
  ArrowRight,
  RefreshCw,
  Building,
  Check,
  Mail,
  Send,
  Copy,
  FileText,
  Inbox
} from 'lucide-react';
import { useCoop } from '../context/CoopContext';

export const LicencaView: React.FC = () => {
  const {
    licenseInfo,
    trialDaysRemaining,
    isTrialExpired,
    activateLicense,
    extendTrial,
    addAuditLog,
    currentTenant,
    currentUser
  } = useCoop();

  const [inputKey, setInputKey] = useState('');
  const [selectedPlanType, setSelectedPlanType] = useState<'MENSAL' | 'ANUAL'>('ANUAL');
  const [activationMessage, setActivationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Email Generator State for Kiwify Key
  const [emailForm, setEmailForm] = useState({
    clientName: currentTenant?.name || 'Cooperativa Central Agro',
    clientEmail: currentUser?.email || 'diretoria@cooperativa.com.br',
    planType: 'ANUAL' as 'MENSAL' | 'ANUAL',
    transactionId: `KW-${Math.floor(100000 + Math.random() * 900000)}`
  });

  const [generatedEmailPayload, setGeneratedEmailPayload] = useState<{
    key: string;
    clientName: string;
    clientEmail: string;
    planType: 'MENSAL' | 'ANUAL';
    priceText: string;
    transactionId: string;
    sentAt: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEmailText, setCopiedEmailText] = useState(false);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsActivating(true);
    setActivationMessage(null);

    setTimeout(() => {
      const result = activateLicense(inputKey, selectedPlanType);
      if (result.success) {
        setActivationMessage({ type: 'success', text: result.message });
        setInputKey('');
      } else {
        setActivationMessage({ type: 'error', text: result.message });
      }
      setIsActivating(false);
    }, 400);
  };

  const handleSimulateQuickActivation = (plan: 'MENSAL' | 'ANUAL') => {
    const randomKey = `SISCOOPE-KW-${Math.floor(1000 + Math.random() * 9000)}-2026`;
    const res = activateLicense(randomKey, plan);
    setActivationMessage({ type: 'success', text: `Licença simulada com sucesso! (${res.message})` });
  };

  const handleOpenKiwifyCheckout = (planUrl: string) => {
    addAuditLog('CONFIGURACOES', 'EXPORTACAO', 'Usuário clicou para contratar licença via Kiwify');
    window.open(planUrl, '_blank');
  };

  const handleGenerateKiwifyEmailKey = (e: React.FormEvent) => {
    e.preventDefault();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newKey = `SISCOOPE-KW-${randomCode}-2026`;
    const priceText = emailForm.planType === 'MENSAL' ? 'R$ 197,90 / mês' : 'R$ 1.997,90 / ano';

    const payload = {
      key: newKey,
      clientName: emailForm.clientName,
      clientEmail: emailForm.clientEmail,
      planType: emailForm.planType,
      priceText,
      transactionId: emailForm.transactionId,
      sentAt: new Date().toLocaleString('pt-BR')
    };

    setGeneratedEmailPayload(payload);
    addAuditLog('CONFIGURACOES', 'INCLUSAO', `Gerada chave de ativação Kiwify (${newKey}) para ${emailForm.clientEmail}`);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyFullEmailText = () => {
    if (!generatedEmailPayload) return;
    const fullText = `
Assunto: [SisCoope] Sua Chave de Ativação do Sistema foi Gerada com Sucesso!

Prezado(a) ${generatedEmailPayload.clientName},

Obrigado por adquirir a licença do SisCoope via Kiwify!

DADOS DA COMPRA:
- Plano: ${generatedEmailPayload.planType === 'MENSAL' ? 'Mensal (R$ 197,90)' : 'Anual (R$ 1.997,90)'}
- Transação Kiwify: ${generatedEmailPayload.transactionId}
- E-mail do Cliente: ${generatedEmailPayload.clientEmail}

SUA CHAVE DE ATIVAÇÃO:
${generatedEmailPayload.key}

PASSO A PASSO PARA ATIVAÇÃO:
1. Acesse o sistema SisCoope na sua cooperativa.
2. Vá no menu "Licença & Planos".
3. Digite a chave acima na seção "Ativação de Chave" e clique em "Ativar Licença Agora".

Atenciosamente,
Equipe SisCoope / Kiwify Suporte
`.trim();

    navigator.clipboard.writeText(fullText);
    setCopiedEmailText(true);
    setTimeout(() => setCopiedEmailText(false), 2500);
  };

  const handleApplyGeneratedKeyDirectly = (key: string, plan: 'MENSAL' | 'ANUAL') => {
    const res = activateLicense(key, plan);
    setActivationMessage({ type: 'success', text: `Licença do e-mail ativada com sucesso! (${res.message})` });
  };

  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [webhookSimResult, setWebhookSimResult] = useState<{ success: boolean; message: string; licenseKey?: string } | null>(null);

  const handleTriggerKiwifyWebhookToSupabase = async () => {
    setIsSimulatingWebhook(true);
    setWebhookSimResult(null);
    try {
      const res = await fetch('/api/webhooks/kiwify/test-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: emailForm.clientEmail,
          clientName: emailForm.clientName,
          planType: emailForm.planType,
          transactionId: emailForm.transactionId
        })
      });

      const data = await res.json();
      if (data.success && data.subscription) {
        activateLicense(data.subscription.licenseKey, data.subscription.plan);
        setWebhookSimResult({
          success: true,
          message: `Webhook da Kiwify recebido! Status da assinatura atualizado e ativado no Supabase (Chave: ${data.subscription.licenseKey}).`,
          licenseKey: data.subscription.licenseKey
        });
        setActivationMessage({
          type: 'success',
          text: `Webhook Kiwify confirmado com sucesso! Licença ${data.subscription.plan} ativa e sincronizada no Supabase.`
        });
      } else {
        setWebhookSimResult({
          success: false,
          message: data.message || 'Erro ao processar Webhook da Kiwify.'
        });
      }
    } catch (err: any) {
      setWebhookSimResult({
        success: false,
        message: 'Erro na chamada do Webhook: ' + (err.message || 'Erro de rede')
      });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" /> Gestão Comercial & Licenciamento
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Licença e Assinatura do Sistema
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Plano de uso, contratação via Kiwify, chave de ativação e e-mail automático pós-pagamento.
          </p>
        </div>

        {/* Current Status Badge */}
        <div className="shrink-0">
          {licenseInfo.status === 'ACTIVE' ? (
            <div className="px-4 py-2 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-2xl flex items-center gap-2.5 font-bold text-xs shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div>Licença Ativa ({licenseInfo.plan || 'Anual'})</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  {licenseInfo.licenseKey || 'SISCOOPE-KW-2026'}
                </div>
              </div>
            </div>
          ) : isTrialExpired ? (
            <div className="px-4 py-2 bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700 rounded-2xl flex items-center gap-2.5 font-bold text-xs shadow-xs animate-pulse">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <div>Período de Teste Expirado</div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                  Contrate o plano para liberar
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-center gap-2.5 font-bold text-xs shadow-xs">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div>Teste Grátis Ativo ({trialDaysRemaining} dias)</div>
                <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                  30 dias de uso completo
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trial Status Notice Banner */}
      {licenseInfo.status !== 'ACTIVE' && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
          isTrialExpired
            ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
            : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl text-white shrink-0 shadow-xs ${
              isTrialExpired ? 'bg-rose-600' : 'bg-amber-500'
            }`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isTrialExpired
                  ? 'O período de avaliação gratuita de 30 dias terminou!'
                  : `Você possui ${trialDaysRemaining} dias de teste gratuito restantes!`}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {isTrialExpired
                  ? 'Escolha o plano Mensal (R$ 197,90) ou Anual (R$ 1.997,90) no Kiwify para liberar o acesso total.'
                  : 'Aproveite para cadastrar seus cooperados, cotas-partes e assembleias. Você pode assinar a qualquer momento via Kiwify sem perder dados.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => extendTrial(30)}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
              Renovar +30 Dias (Avaliação)
            </button>
          </div>
        </div>
      )}

      {/* Plans & Pricing Cards Grid */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-700 uppercase tracking-wider">
            Planos Oficiais SisCoope
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            Escolha o Plano Ideal para a Sua Cooperativa
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Pagamento 100% seguro processado via <strong>Kiwify</strong> com emissão de nota fiscal, parcelamento no cartão e chave enviada por e-mail.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Plano Mensal */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-sm hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                  Plano Mensal
                </span>
                <span className="text-xs text-slate-500 font-medium">Recorrência Mensal</span>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Assinatura Mensal + Implantação</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Flexibilidade total com cancelamento a qualquer momento sem fidelidade.
              </p>

              {/* Price Breakdown */}
              <div className="my-6 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">R$ 197,90</span>
                  <span className="text-sm font-semibold text-slate-500">/ mês</span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-medium">Taxa de Implantação e Treinamento:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">R$ 1.500,00 <span className="text-[10px] text-slate-400 font-normal">(única)</span></span>
                </div>
              </div>

              {/* Features list */}
              <ul className="space-y-3 mb-8">
                {[
                  'Acesso a todos os módulos (Cooperados, Capital, Assembleias, Diretoria)',
                  'Suporte técnico por e-mail e WhatsApp',
                  'Atendimento e parametrização com taxa de implantação de R$ 1.500,00',
                  'Auditoria contínua e conformidade com Lei das Cooperativas (5.764/71)',
                  'Backup em nuvem automático diário',
                  'Cancelamento sem multa ou carência'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleOpenKiwifyCheckout(licenseInfo.kiwifyCheckoutUrlMensal)}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-bold rounded-2xl text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>Contratar Mensal na Kiwify (R$ 197,90)</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSimulateQuickActivation('MENSAL')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Simular Ativação Rápida (Mensal)
              </button>
            </div>
          </div>

          {/* Plano Anual - HIGHLIGHTED */}
          <div className="bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-xl border-2 border-emerald-500/80">
            {/* Top Badge */}
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Economize R$ 376,90/ano
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/40">
                  Plano Anual — Melhor Custo-Benefício
                </span>
                <span className="text-xs text-emerald-400 font-semibold">Maior Economia</span>
              </div>

              <h3 className="text-xl font-extrabold text-white">Assinatura Anual (Desconto Especial)</h3>
              <p className="text-xs text-slate-300 mt-1">
                Melhor custo-benefício para cooperativas com garantia de preço fixo.
              </p>

              {/* Price Breakdown */}
              <div className="my-6 p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 line-through">R$ 2.374,80/ano</span>
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-extrabold text-[10px] rounded-md">ECONOMIZE R$ 376,90</span>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">R$ 1.997,90</span>
                  <span className="text-sm font-semibold text-emerald-300">/ ano</span>
                </div>

                <div className="text-xs text-emerald-300 mt-1 font-medium">
                  Equivalente a R$ 166,49/mês (ou parcelado em até 12x no cartão via Kiwify)
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-200">
                  <span className="font-medium">Taxa de Implantação e Treinamento:</span>
                  <span className="font-extrabold text-amber-300">R$ 1.500,00 <span className="text-[10px] text-slate-300 font-normal">(parcelável)</span></span>
                </div>
              </div>

              {/* Features list */}
              <ul className="space-y-3 mb-8">
                {[
                  'Economia de R$ 376,90 ao ano em comparação à mensalidade padrão',
                  'Parcelamento da contratação + taxa de implantação no cartão de crédito via Kiwify',
                  'Sessão de treinamento ao vivo dedicada para a diretoria e conselheiros',
                  'Acesso ilimitado a todos os módulos atuais e futuros',
                  'Suporte prioritário via WhatsApp com gerente de contas',
                  'Adequação total à legislação cooperativista e governança'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleOpenKiwifyCheckout(licenseInfo.kiwifyCheckoutUrlAnual)}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <span>Contratar Anual na Kiwify (R$ 1.997,90)</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSimulateQuickActivation('ANUAL')}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/10"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Simular Ativação Rápida (Anual)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KIWIFY EMAIL & ACTIVATION KEY DISPATCH SIMULATOR */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
              <Mail className="w-4 h-4 text-indigo-400" /> Webhook Kiwify & Envio de E-mail
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Chave de Ativação Enviada por E-mail Pós-Pagamento
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Assim que o cliente efetua o pagamento no Kiwify (R$ 197,90 Mensal ou R$ 1.997,90 Anual), o sistema gera automaticamente a chave de ativação e envia o e-mail abaixo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Generator Form */}
          <form onSubmit={handleGenerateKiwifyEmailKey} className="lg:col-span-5 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-indigo-500/20">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Gerar Nova Chave & Simular E-mail
            </h4>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Nome do Cliente / Cooperativa</label>
              <input
                type="text"
                required
                value={emailForm.clientName}
                onChange={e => setEmailForm({ ...emailForm, clientName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">E-mail do Destinatário</label>
              <input
                type="email"
                required
                value={emailForm.clientEmail}
                onChange={e => setEmailForm({ ...emailForm, clientEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Plano Adquirido</label>
                <select
                  value={emailForm.planType}
                  onChange={e => setEmailForm({ ...emailForm, planType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="ANUAL">Anual (R$ 1.997,90)</option>
                  <option value="MENSAL">Mensal (R$ 197,90)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">ID da Transação Kiwify</label>
                <input
                  type="text"
                  value={emailForm.transactionId}
                  onChange={e => setEmailForm({ ...emailForm, transactionId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Mail className="w-4 h-4" />
                <span>Gerar Chave & Simular E-mail Kiwify</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerKiwifyWebhookToSupabase}
                disabled={isSimulatingWebhook}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 text-amber-300 ${isSimulatingWebhook ? 'animate-spin' : ''}`} />
                <span>{isSimulatingWebhook ? 'Processando Webhook...' : 'Simular Webhook Kiwify -> Supabase (Ativação Direta)'}</span>
              </button>
            </div>

            {webhookSimResult && (
              <div className={`p-3 rounded-xl text-[11px] font-medium border ${
                webhookSimResult.success
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
              }`}>
                {webhookSimResult.message}
              </div>
            )}
          </form>

          {/* Email Preview Container */}
          <div className="lg:col-span-7">
            {generatedEmailPayload ? (
              <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 text-xs space-y-4 relative">
                {/* Email Header */}
                <div className="border-b border-slate-200 pb-3 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">De:</span> Kiwify Pagamentos &lt;notificacoes@kiwify.com.br&gt;
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Para:</span> {generatedEmailPayload.clientEmail}
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 mt-1">
                      Assunto: [SisCoope] Sua Chave de Ativação do Sistema foi Gerada com Sucesso!
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold rounded-full shrink-0">
                    E-mail Enviado
                  </span>
                </div>

                {/* Email Body */}
                <div className="space-y-3 text-slate-700 leading-relaxed">
                  <p>Olá, <strong>{generatedEmailPayload.clientName}</strong>!</p>
                  <p>
                    Parabéns! Confirmamos o recebimento da sua assinatura no Kiwify referente ao <strong>SisCoope - Sistema de Gestão Cooperativista</strong>.
                  </p>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-slate-500">Plano Contratado:</span> <strong className="block text-slate-900">{generatedEmailPayload.planType === 'MENSAL' ? 'Mensal (R$ 197,90/mês)' : 'Anual (R$ 1.997,90/ano)'}</strong></div>
                    <div><span className="text-slate-500">Transação Kiwify:</span> <strong className="block font-mono text-slate-900">{generatedEmailPayload.transactionId}</strong></div>
                  </div>

                  <div className="p-4 bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-2xl text-center space-y-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                      Sua Chave Oficial de Ativação:
                    </span>
                    <div className="text-lg font-mono font-black text-emerald-950 tracking-wider selection:bg-emerald-200">
                      {generatedEmailPayload.key}
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyKey(generatedEmailPayload.key)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition-all"
                      >
                        {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey ? 'Chave Copiada!' : 'Copiar Chave'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyGeneratedKeyDirectly(generatedEmailPayload.key, generatedEmailPayload.planType)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Ativar com 1-Clique
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 bg-amber-50/80 p-3 rounded-xl border border-amber-200/80">
                    <strong className="text-amber-900 block font-bold">Como Ativar no SisCoope:</strong>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                      <li>Acesse o menu <strong>Licença & Planos</strong>.</li>
                      <li>Cole a chave <strong>{generatedEmailPayload.key}</strong> no campo de ativação.</li>
                      <li>Clique em <strong>Ativar Licença Agora</strong>.</li>
                    </ol>
                  </div>
                </div>

                {/* Email Footer Actions */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">Simulação em tempo real</span>
                  <button
                    type="button"
                    onClick={handleCopyFullEmailText}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    {copiedEmailText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    {copiedEmailText ? 'Texto do E-mail Copiado!' : 'Copiar Texto do E-mail'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/40 rounded-2xl p-8 border border-dashed border-indigo-500/20 text-center flex flex-col items-center justify-center min-h-[260px] text-slate-400 space-y-2">
                <Inbox className="w-10 h-10 text-indigo-400/50" />
                <p className="text-xs font-semibold text-slate-300">Nenhum e-mail de ativação gerado ainda.</p>
                <p className="text-[11px] max-w-sm text-slate-400">
                  Preencha os dados do cliente e clique no botão para visualizar e testar o e-mail automático com a chave de ativação Kiwify.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual License Key Activation Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Key className="w-4 h-4" /> Ativação de Chave
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Já realizou a compra na Kiwify? Ative sua chave
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Após concluir o pagamento na plataforma Kiwify, você receberá a chave de ativação no e-mail cadastrado. Digite o código abaixo para liberar o acesso ilimitado.
            </p>
          </div>

          <form onSubmit={handleActivate} className="w-full md:w-auto flex-1 max-w-md space-y-3">
            {activationMessage && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                activationMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-200'
              }`}>
                {activationMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{activationMessage.text}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Ex: SISCOOPE-KW-9842-2026"
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={selectedPlanType}
                  onChange={(e) => setSelectedPlanType(e.target.value as any)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ANUAL">Anual</option>
                  <option value="MENSAL">Mensal</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isActivating || !inputKey.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Key className="w-4 h-4" />
                <span>{isActivating ? 'Verificando Chave...' : 'Ativar Licença Agora'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Kiwify Guarantee & Platform FAQ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-sm mb-2">
            <Lock className="w-4 h-4 text-emerald-600" /> Pagamento 100% Seguro
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Processado pela <strong>Kiwify</strong> com suporte a Pix instantâneo, Cartão de Crédito em até 12 vezes e Boleto Bancário com total segurança criptografada.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-sm mb-2">
            <Building className="w-4 h-4 text-emerald-600" /> Implantação e Suporte
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            A taxa de implantação inclui parametrização do Estatuto Social, apoio na migração de cooperados e treinamento prático para a diretoria.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-sm mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Garantia e Conformidade
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Sistema em constante conformidade com a Lei das Cooperativas (5.764/71), normas do OCB e LGPD, sem risco de perda de dados.
          </p>
        </div>
      </div>
    </div>
  );
};

