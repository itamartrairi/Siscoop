const tokenEndpoint = 'https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token';

export default async function (request) {
  const headers = { 'Cache-Control': 'no-store' };
  const reply = (status, error) => Response.json({ error }, { status, headers });

  if (request.method !== 'POST') return reply(405, 'Método não permitido.');
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return reply(403, 'Origem inválida.');

  const params = new URLSearchParams(await request.text());
  const clientId = params.get('client_id');
  const clientSecret = params.get('client_secret');
  const scope = params.get('scope');
  if (!clientId || !clientSecret || !['empresa', 'nfe'].includes(scope)) {
    return reply(400, 'Credenciais ou escopo inválidos.');
  }

  try {
    const upstream = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials', client_id: clientId,
        client_secret: clientSecret, scope,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch {
    return reply(502, 'O servidor não conseguiu acessar a autenticação da ACBr.');
  }
}
