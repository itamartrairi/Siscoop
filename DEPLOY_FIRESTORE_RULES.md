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
