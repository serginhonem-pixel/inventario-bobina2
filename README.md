# QtdApp

## Firebase

O frontend deste projeto usa o Firebase definido nas variáveis `VITE_FIREBASE_*`.

Hoje o ambiente do app aponta para:

- projeto Firebase: `qtdapp-4e93b`

O arquivo `.firebaserc` foi alinhado com esse mesmo projeto para evitar deploy de regras no projeto errado.

Se o CLI retornar erro `403` ao rodar `firebase deploy`, a conta autenticada no Firebase CLI não tem permissão suficiente nesse projeto. Nesse caso:

```powershell
firebase login
firebase use qtdapp-4e93b
firebase deploy --only firestore:rules
```
