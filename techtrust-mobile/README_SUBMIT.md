Android submission (EAS) — instruções rápidas

Passos para submissão automática ao Google Play (script preparado):

1) Coloque o JSON da Service Account do Google Cloud no caminho:

   /workspaces/techtrust-system/techtrust-mobile/service-account.json

   - Crie uma Service Account no Google Cloud e baixe a chave JSON.
   - No Play Console → Settings → API access, associe a Service Account e dê permissão (ex: Release manager).

2) Verifique login no Expo/EAS:

   cd /workspaces/techtrust-system/techtrust-mobile
   npx eas-cli whoami

3) Rodar o script de submissão (interativo):

   cd /workspaces/techtrust-system/techtrust-mobile
   bash scripts/submit-android.sh

   - O script verifica se o arquivo `service-account.json` existe e, ao confirmar, executa
     `npx eas-cli submit --platform android --profile production`.
   - Você será solicitado a confirmar opções (track: internal/closed/production etc.).

4) Limpeza (recomendado por segurança):

   - Após finalizar, remova o JSON do workspace e/ou revogue a chave no Google Cloud Console.

Notas importantes
- O AAB já foi gerado e está disponível em: https://expo.dev/artifacts/eas/5FaqzQCzyUNpdUFzPz7p2q.aab
- Não executei a submissão — o script foi adicionado para você rodar quando estiver confortável.
