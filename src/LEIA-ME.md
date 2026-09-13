# SISCOOP — pacote de correções

Cinco commits sobre o estado atual de `main`. Testei o pacote num clone limpo:
aplica sem conflito, o typecheck fecha em **0 erros** (eram 1.316) e o build passa.

## Conteúdo

| Arquivo | O que é |
|---|---|
| `00-remover-arquivos.sh` | Apaga os 8 arquivos com dados pessoais/artefatos e as 52 cópias duplicadas da raiz |
| `01-alteracoes-de-codigo.patch` | Os 5 commits com as alterações de código (92 KB) |

As remoções vêm num script em vez de dentro do patch por um motivo específico:
um diff de remoção **carrega o conteúdo removido**. Colocar
`imported_cooperados.json` no patch seria reempacotar os dados das 1.718 pessoas
num arquivo novo. O script só lista nomes.

## Antes de qualquer coisa

Torne o repositório privado. É o único item que piora a cada hora.
`Settings > General > Danger Zone > Change repository visibility`.

## Como aplicar

```bash
cd SISCOOP
git checkout -b hardening

cp /caminho/para/00-remover-arquivos.sh .
cp /caminho/para/01-alteracoes-de-codigo.patch .

bash 00-remover-arquivos.sh
git commit -m "Remove dados pessoais e duplicados da raiz"

git am 01-alteracoes-de-codigo.patch
rm 00-remover-arquivos.sh 01-alteracoes-de-codigo.patch

npm install                                    # instala firebase-admin, regenera o lock
node scripts/gerar-cooperados-sinteticos.mjs 60 # dados de demonstração fictícios
npm run typecheck                              # deve dar 0
npm run build
```

## Depois de aplicar

### 1. Limpar o histórico do Git

Apagar os arquivos num commit novo não resolve — eles seguem recuperáveis nos 70
commits anteriores. O script `scripts/purgar-dados-pessoais-do-historico.sh`
(vem no patch) faz a reescrita com `git filter-repo`. Ele exige confirmação
explícita e um backup `--mirror` antes.

Depois do force-push, abra um ticket em support.github.com pedindo a limpeza dos
objetos órfãos — sem isso os commits antigos continuam acessíveis por URL direta
por algum tempo.

E trate o vazamento como consumado. Sob a LGPD (art. 48), incidente com risco
relevante aos titulares deve ser comunicado à ANPD e aos próprios cooperados.
Avalie com apoio jurídico; o prazo conta de quando você tomou conhecimento.

### 2. Configurar as variáveis de ambiente

O `.env.example` foi reescrito com o que cada variável faz. As três que
importam:

```bash
KIWIFY_WEBHOOK_SECRET   # sem isso o servidor rejeita TODOS os webhooks
ADMIN_API_TOKEN         # openssl rand -hex 32
FIREBASE_SERVICE_ACCOUNT # JSON da chave de serviço, em uma linha
```

O comportamento é fail-closed de propósito: sem `KIWIFY_WEBHOOK_SECRET` nenhum
webhook passa, e sem `ADMIN_API_TOKEN` os endpoints de diagnóstico respondem 503
em vez de expor dados de clientes.

### 3. Publicar as regras do Firestore

```bash
firebase deploy --only firestore:rules
```

Teste antes com o simulador do console. Se hoje existe alguém que dependia do
admin por e-mail (`itamartrairi@gmail.com` ou `admin@siscoope.com.br`), crie o
documento `/admins/{uid}` correspondente **antes** do deploy, ou essa pessoa
perde o acesso administrativo.

### 4. Resolver o descompasso de deploy

O `netlify.toml` publica só o front estático. O Express de `server.ts` não roda
lá, então hoje `/api/license/validate` e `/api/subscription/status` retornam 404
em produção — o que significa que **nenhuma licença valida**.

Duas saídas, ambas documentadas em comentário no `netlify.toml`:

- **(a)** hospedar o app inteiro no Cloud Run / Render / Fly rodando `npm start`;
- **(b)** manter o front no Netlify e apontar `/api/*` para o backend via proxy
  (há um bloco `[[redirects]]` pronto, comentado).

Enquanto isso não estiver resolvido, o controle de licença não funciona.

## Resumo das mudanças

**Dados pessoais.** Dataset real substituído por 60 registros fictícios
(2 MB → 94 KB), com CPFs de dígito verificador válido mas inventados. Confirmei
que nenhum registro real sobrevive no bundle. O `.gitignore` passa a barrar csv,
zip e exports de cooperados.

**Duplicados.** 52 arquivos mortos removidos da raiz. Eram a origem de 100% dos
erros de lint; `src/` já estava limpo.

**Endpoints.** `/api/webhooks/kiwify` e `.../history` exigem token de admin;
`rawPayload` não é mais persistido. `/api/subscription/status` identifica o
usuário pelo ID token do Firebase — sumiu o e-mail na URL, então não há mais
como consultar assinatura alheia nem listar todas.

**Licença.** Novo `POST /api/license/validate`; `activateLicense` virou async e
delega ao servidor. Chaves passaram a ser aleatórias em vez de derivadas do
`order_id`. Webhook rejeita HMAC ausente sempre. Status desconhecido não vira
mais `ACTIVE`. Reembolso agora revoga acesso — antes a sincronização só sabia
ativar. Assinaturas persistem no Firestore via `firebase-admin`.

**Firestore.** Admins por e-mail hardcoded removidos, `/admins` deixou de ser
listável, `tenantId` não pode ser reescrito pelo próprio usuário, criação de
tenants limitada, `/test` virou somente leitura.

**Performance.** 22 views em `React.lazy`. As 18 leituras do `localStorage`
viraram uma leitura em cache. Gravação com debounce de 800 ms e tratamento de
`QuotaExceededError` que descarta coleções pesadas com aviso, em vez de falhar
em silêncio.

| | antes | depois |
|---|---|---|
| chunk principal | 2.970 kB | 371 kB |
| carga inicial (gzip) | ~867 kB | 311 kB |
| erros de typecheck | 1.316 | 0 |

## O que continua pendente

**A divisão do `CoopContext`.** Segue com 4.415 linhas, 47 `useState` e um
objeto `value` de ~200 chaves recriado a cada render — qualquer mudança de
estado ainda re-renderiza o app inteiro. Envolver isso num `useMemo` com 200
dependências seria pior que o problema. A correção é separar em contextos por
domínio (auth/tenant, cooperados, financeiro, SisGepa), e é trabalho para fazer
com o app rodando na frente, um domínio por vez.

**Roteamento.** A navegação continua por `useState` + cadeia de
`activeModule === '...'`. Sem URL por módulo, sem deep link, sem botão voltar.

**Testes e CI.** Não há nenhum. Com a validação de licença agora no servidor,
`server/assinaturas.ts` é o primeiro candidato óbvio a teste.
