import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  Assinatura,
  LogWebhook,
  PlanoLicenca,
  buscarAssinatura,
  gerarChaveLicenca,
  listarLogs,
  registrarLog,
  salvarAssinatura,
  validarLicenca,
} from './server/assinaturas.js';
import { RequisicaoAutenticada, exigirAdmin, exigirUsuario } from './server/auth.js';

const EM_PRODUCAO = process.env.NODE_ENV === 'production';

// Segredo do webhook da Kiwify. Configure em "Kiwify > Configurações > Webhooks"
// e defina a mesma string na variável de ambiente KIWIFY_WEBHOOK_SECRET.
const KIWIFY_WEBHOOK_SECRET = process.env.KIWIFY_WEBHOOK_SECRET || '';

// Endpoints de simulação nunca ficam ativos em produção, nem por engano.
const TEST_ENDPOINTS_ENABLED = !EM_PRODUCAO && process.env.ENABLE_TEST_ENDPOINTS === 'true';

/**
 * Valida a assinatura HMAC-SHA1 que a Kiwify envia junto do webhook.
 *
 * Antes, quando KIWIFY_WEBHOOK_SECRET não estava definido, a função liberava
 * a requisição fora de produção. Agora ela recusa sempre: um webhook não
 * verificado ativa licença de graça, e "fora de produção" é fácil de forjar
 * com NODE_ENV.
 */
function assinaturaKiwifyValida(rawBody: Buffer | undefined, recebida: string | undefined): boolean {
  if (!KIWIFY_WEBHOOK_SECRET || !rawBody || !recebida) return false;

  const esperada = crypto
    .createHmac('sha1', KIWIFY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const bufEsperada = Buffer.from(esperada, 'utf8');
  const bufRecebida = Buffer.from(recebida, 'utf8');
  if (bufEsperada.length !== bufRecebida.length) return false;
  return crypto.timingSafeEqual(bufEsperada, bufRecebida);
}

const STATUS_PAGO = [
  'paid',
  'approved',
  'completed',
  'order_approved',
  'order_paid',
  'subscription_active',
  'subscription_renewed',
];
const STATUS_CANCELADO = [
  'refunded',
  'chargedback',
  'canceled',
  'subscription_canceled',
  'order_refunded',
];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  /* ---------------------------------------------------------------- */
  /* Público                                                           */
  /* ---------------------------------------------------------------- */

  // Health check enxuto de propósito: não expõe contadores de clientes.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  /* ---------------------------------------------------------------- */
  /* Diagnóstico — somente admin                                       */
  /* ---------------------------------------------------------------- */

  app.get('/api/webhooks/kiwify', exigirAdmin, async (req, res) => {
    res.json({
      status: 'online',
      webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/kiwify`,
      segredoConfigurado: Boolean(KIWIFY_WEBHOOK_SECRET),
      instructions:
        'Configure esta URL em "Kiwify > Configurações > Webhooks" e selecione os eventos de Pedido Pago e Assinatura Ativada.',
    });
  });

  app.get('/api/webhooks/kiwify/history', exigirAdmin, async (_req, res) => {
    try {
      res.json({ success: true, logs: await listarLogs(50) });
    } catch (error) {
      console.error('[Webhook History]', error);
      res.status(500).json({ success: false, message: 'Erro ao consultar histórico.' });
    }
  });

  /* ---------------------------------------------------------------- */
  /* Assinatura do próprio usuário                                     */
  /* ---------------------------------------------------------------- */

  // O e-mail vem do ID token verificado, não da query string. Não há mais como
  // listar todas as assinaturas nem consultar a de outra pessoa.
  app.get('/api/subscription/status', exigirUsuario, async (req: RequisicaoAutenticada, res) => {
    try {
      const assinatura = await buscarAssinatura(req.usuario!.email);
      if (!assinatura) {
        return res.json({ success: true, hasActiveSubscription: false, subscription: null });
      }
      const expirada = new Date(assinatura.expiresAt).getTime() < Date.now();
      res.json({
        success: true,
        hasActiveSubscription: assinatura.status === 'ACTIVE' && !expirada,
        subscription: {
          plan: assinatura.plan,
          status: expirada ? 'EXPIRED' : assinatura.status,
          expiresAt: assinatura.expiresAt,
          activatedAt: assinatura.activatedAt,
        },
      });
    } catch (error) {
      console.error('[Subscription Status]', error);
      res.status(500).json({ success: false, message: 'Erro ao consultar assinatura.' });
    }
  });

  /**
   * Validação de licença no servidor.
   *
   * Antes, o cliente aceitava qualquer string com 4 caracteres como chave
   * válida e guardava o resultado no localStorage — bastava editar o
   * localStorage pelo DevTools para liberar o sistema. Agora a decisão é
   * tomada aqui, contra o registro no Firestore.
   */
  app.post('/api/license/validate', exigirUsuario, async (req: RequisicaoAutenticada, res) => {
    const chave = String(req.body?.licenseKey || '');
    if (!chave.trim()) {
      return res.status(400).json({ success: false, message: 'Informe a chave de licença.' });
    }
    try {
      const resultado = await validarLicenca(req.usuario!.email, chave);
      if (!resultado.valida) {
        const mensagens: Record<string, string> = {
          NAO_ENCONTRADA: 'Nenhuma compra encontrada para este e-mail.',
          CHAVE_INCORRETA: 'Chave de licença inválida para este e-mail.',
          INATIVA: 'Esta licença foi cancelada ou reembolsada.',
          EXPIRADA: 'Esta licença expirou. Renove a assinatura para continuar.',
        };
        return res.status(403).json({
          success: false,
          motivo: resultado.motivo,
          message: mensagens[resultado.motivo ?? ''] ?? 'Licença inválida.',
        });
      }
      res.json({
        success: true,
        plan: resultado.plan,
        expiresAt: resultado.expiresAt,
        message: 'Licença validada com sucesso.',
      });
    } catch (error) {
      console.error('[License Validate]', error);
      res.status(500).json({ success: false, message: 'Erro ao validar licença.' });
    }
  });

  /* ---------------------------------------------------------------- */
  /* Webhook Kiwify                                                    */
  /* ---------------------------------------------------------------- */

  app.post('/api/webhooks/kiwify', async (req: any, res) => {
    const assinaturaHmac =
      (req.query.signature as string) || (req.headers['x-kiwify-signature'] as string);
    if (!assinaturaKiwifyValida(req.rawBody, assinaturaHmac)) {
      console.warn('[Kiwify Webhook] Assinatura inválida ou ausente — rejeitado.');
      return res.status(401).json({ success: false, message: 'Assinatura inválida.' });
    }

    try {
      const body = req.body || {};
      const receivedAt = new Date().toISOString();

      const orderId = String(body.order_id || body.order_ref || body.id || `KW-${Date.now()}`);
      const event = String(body.event || body.webhook_event_type || 'order_approved');
      const orderStatus = String(body.order_status || body.status || '').toLowerCase();

      const customerEmail = String(body.Customer?.email || body.customer?.email || body.email || '')
        .toLowerCase()
        .trim();

      // Sem e-mail não há a quem vincular a licença — melhor devolver erro
      // do que criar uma assinatura órfã num endereço fictício.
      if (!customerEmail) {
        return res.status(400).json({ success: false, message: 'Payload sem e-mail do cliente.' });
      }

      const customerName = String(
        body.Customer?.full_name ||
          body.Customer?.name ||
          body.customer?.name ||
          customerEmail.split('@')[0],
      );
      const productName = String(
        body.Product?.product_name || body.product?.name || 'SisCoope Gestão Cooperativista',
      );
      const amount = Number(body.Commissions?.charge_amount || body.price || body.amount || 0);

      const pago = STATUS_PAGO.includes(orderStatus) || STATUS_PAGO.includes(event.toLowerCase());
      const cancelado =
        STATUS_CANCELADO.includes(orderStatus) || STATUS_CANCELADO.includes(event.toLowerCase());

      const plan: PlanoLicenca = productName.toLowerCase().includes('anual') ? 'ANUAL' : 'MENSAL';

      // Renovação reaproveita a chave já emitida; compra nova gera uma chave.
      const existente = await buscarAssinatura(customerEmail);
      const licenseKey = existente?.licenseKey ?? gerarChaveLicenca(plan);

      // Status desconhecido não vira acesso liberado. Antes, o ternário
      // devolvia 'ACTIVE' para qualquer evento não reconhecido.
      const status = pago ? 'ACTIVE' : cancelado ? 'INACTIVE' : (existente?.status ?? 'INACTIVE');

      const validade = plan === 'ANUAL' ? 365 : 30;
      const base = pago ? Date.now() : new Date(existente?.expiresAt ?? Date.now()).getTime();

      const registro: Assinatura = {
        id: `sub-${orderId}`,
        clientEmail: customerEmail,
        clientName: customerName,
        plan,
        status,
        licenseKey,
        orderId,
        activatedAt: existente?.activatedAt ?? receivedAt,
        expiresAt: new Date(base + validade * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: receivedAt,
      };

      await salvarAssinatura(registro);

      // O payload cru não é mais persistido: continha dados de pagamento que
      // não precisamos guardar e vazavam pelo endpoint de histórico.
      const log: LogWebhook = {
        id: `wh-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        receivedAt,
        orderId,
        event,
        orderStatus,
        customerEmail,
        customerName,
        productName,
        amount,
        licenseKey,
        statusActivated: pago,
      };
      await registrarLog(log);

      console.log(`[Kiwify] pedido=${orderId} status=${orderStatus} ativado=${pago}`);

      // A resposta não devolve a chave de licença — a Kiwify não precisa dela,
      // e a chave chega ao cliente pelo e-mail da própria plataforma.
      return res.status(200).json({ success: true, received: true });
    } catch (error) {
      console.error('[Kiwify Webhook Error]', error);
      return res.status(500).json({ success: false, message: 'Erro ao processar webhook.' });
    }
  });

  if (TEST_ENDPOINTS_ENABLED) {
    app.post('/api/webhooks/kiwify/test-simulate', async (req, res) => {
      const { clientEmail, clientName, planType } = req.body || {};
      const email = String(clientEmail || '').toLowerCase().trim();
      if (!email) return res.status(400).json({ success: false, message: 'Informe clientEmail.' });

      const plan: PlanoLicenca = planType === 'ANUAL' ? 'ANUAL' : 'MENSAL';
      const agora = new Date().toISOString();
      const registro: Assinatura = {
        id: `sub-SIM-${Date.now()}`,
        clientEmail: email,
        clientName: clientName || 'Cooperativa Teste',
        plan,
        status: 'ACTIVE',
        licenseKey: gerarChaveLicenca(plan),
        orderId: `KW-SIM-${Date.now()}`,
        activatedAt: agora,
        expiresAt: new Date(
          Date.now() + (plan === 'ANUAL' ? 365 : 30) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updatedAt: agora,
      };
      await salvarAssinatura(registro);
      res.json({ success: true, subscription: registro });
    });
    console.warn('[Servidor] Endpoint de simulação ATIVO. Nunca habilite em produção.');
  }

  /* ---------------------------------------------------------------- */
  /* SPA                                                               */
  /* ---------------------------------------------------------------- */

  if (!EM_PRODUCAO) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SisCoope] servidor na porta ${PORT}`);
    if (EM_PRODUCAO && !KIWIFY_WEBHOOK_SECRET) {
      console.error('[SisCoope] KIWIFY_WEBHOOK_SECRET ausente — todos os webhooks serão rejeitados.');
    }
    if (EM_PRODUCAO && !process.env.ADMIN_API_TOKEN) {
      console.error('[SisCoope] ADMIN_API_TOKEN ausente — endpoints de diagnóstico bloqueados.');
    }
  });
}

startServer();
