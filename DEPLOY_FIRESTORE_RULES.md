# Publicar as regras do Firestore

O projeto utiliza o banco Firestore padrão (`(default)`) do projeto Firebase **`sicoopplatform`**.

---

## Opção A — Console do Firebase (mais rápida, ~1 minuto, sem instalar nada)

1. Acesse: https://console.firebase.google.com/project/sicoopplatform/firestore/rules
2. Clique na aba **Regras** (Rules).
3. Cole o conteúdo do arquivo `firestore.rules` deste projeto.
4. Clique em **Publicar** (Publish).

Pronto — as novas regras (isolamento por cooperativa / multi-tenant) já valem imediatamente.

---

## Opção B — Firebase CLI

Este projeto já inclui `firebase.json` e `.firebaserc` configurados com o projeto `sicoopplatform`:

```bash
npm install -g firebase-tools   # se ainda não tiver
firebase login
firebase deploy --only firestore:rules
```

O `firebase.json` está configurado para o banco padrão:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

---

## Depois de publicar: teste os dois cenários

1. **Usuário comum, logado, tenant certo** → consegue ler/gravar normalmente os dados da própria cooperativa.
2. **Sem login / usuário anônimo** → recebe `PERMISSION_DENIED` caso tente burlar as coleções protegidas.

Se algo passar a acusar permissão negada, o motivo mais comum é o documento `users/{uid}` ainda não ter sido criado — ele é gravado automaticamente pelo app no primeiro login (função `saveUserTenantMappingToFirestore` em `src/context/CoopContext.tsx`). Basta deslogar e logar novamente uma vez.

## Atualização: equipe, Cargos/Departamentos e diagnóstico

As regras agora também cobrem:

- `tenantMembers/{email}` — vínculo de cada usuário cadastrado em
  **Configurações → Usuários** com a cooperativa. O dono (ou um membro com
  perfil ADMIN/PRESIDENTE/DIRETOR_FINANCEIRO) grava; o próprio usuário lê o
  seu. É o que permite a pessoa entrar com **Google** ou com **e-mail e senha**
  em qualquer computador e ser vinculada à cooperativa (`users/{uid}`).
- `departamentos` e `cargos` — cadastros da tela **Cargos & Departamentos**,
  **comuns a todas as cooperativas**: qualquer cooperativa vinculada lê e
  edita a mesma lista (`tenantId` só registra quem cadastrou). A exclusão é
  negada enquanto o item estiver em uso.
- `usoCadastrosRH/{colecao}__{itemId}` — quantos usuários/colaboradores de
  cada cooperativa usam um cargo/departamento (mapa `tenants`). Cada
  cooperativa só altera a própria chave; é o que impede uma cooperativa de
  excluir um item que outra está usando.
- `diagnostico/{uid}` — documento usado pelo teste de conexão para provar que
  o app consegue **gravar** e ler de volta no Firestore.

Depois de publicar (`firebase deploy --only firestore:rules`), confira no
console do Firebase em **Authentication → Sign-in method** que os provedores
**Google** e **E-mail/senha** estão ativados, e que o domínio do app está em
**Authentication → Settings → Authorized domains**.

