# Publicar as regras corrigidas do Firestore

⚠️ **Ponto crítico:** seu projeto usa um banco Firestore **nomeado**, não o
banco `(default)`:

```
ai-studio-sicoopplatformsi-fd2e62a0-6b42-478c-a7c9-08d3051c6676
```

(esse valor está em `firebase-applet-config.json`, campo `firestoreDatabaseId`).
Se você publicar as regras sem selecionar esse banco específico, elas caem no
banco `(default)` — que seu app nem usa — e as regras antigas (abertas)
continuam valendo no banco real. As duas opções abaixo já apontam para o
banco certo.

---

## Opção A — Console do Firebase (mais rápida, ~1 minuto, sem instalar nada)

1. Acesse: https://console.firebase.google.com/project/gen-lang-client-0260568271/firestore/databases
2. No seletor de banco de dados (canto superior, ao lado do nome do projeto),
   selecione **`ai-studio-sicoopplatformsi-fd2e62a0-6b42-478c-a7c9-08d3051c6676`**
   (não o `(default)`).
3. Clique na aba **Regras** (Rules).
4. Apague todo o conteúdo atual e cole o conteúdo do arquivo `firestore.rules`
   deste projeto.
5. Clique em **Publicar** (Publish).

Pronto — as novas regras (isolamento por cooperativa) já valem imediatamente.

---

## Opção B — Firebase CLI

Este projeto já inclui `firebase.json` e `.firebaserc` configurados com o
projeto e o banco corretos, então basta:

```bash
npm install -g firebase-tools   # se ainda não tiver
firebase login
cd sicoop-platform              # pasta deste projeto
firebase deploy --only firestore:rules
```

O `firebase.json` já está assim (apontando para o banco nomeado certo):

```json
{
  "firestore": [
    {
      "database": "ai-studio-sicoopplatformsi-fd2e62a0-6b42-478c-a7c9-08d3051c6676",
      "rules": "firestore.rules"
    }
  ]
}
```

---

## Depois de publicar: teste os dois cenários

1. **Usuário comum, logado, tenant certo** → deve conseguir ler/gravar
   normalmente os dados da própria cooperativa.
2. **Alguém sem estar logado** (ex.: abra o Console > Firestore > tente editar
   um documento como "usuário público", ou rode uma query sem auth) → deve
   receber `PERMISSION_DENIED`.

Se algo legítimo passar a falhar (usuário real não consegue mais acessar
dados da própria cooperativa), o motivo mais comum é o documento
`users/{uid}` ainda não ter sido criado — ele é gravado automaticamente pelo
app no primeiro login *depois* de aplicado este código (função
`saveUserTenantMappingToFirestore` em `src/context/CoopContext.tsx`). Basta a
pessoa deslogar e logar novamente uma vez.
