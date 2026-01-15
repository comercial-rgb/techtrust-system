#!/usr/bin/env bash
set -euo pipefail

# Script para submeter o AAB gerado ao Google Play via EAS (interativo)
# NÃO executa automaticamente — rode manualmente quando estiver pronto.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_ACCOUNT_PATH="${SERVICE_ACCOUNT_PATH:-$ROOT_DIR/service-account.json}"

if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
  echo "Service account JSON não encontrado em: $SERVICE_ACCOUNT_PATH"
  echo "Coloque o arquivo JSON da Service Account neste caminho e execute novamente este script."
  exit 1
fi

echo "Service account encontrado em: $SERVICE_ACCOUNT_PATH"
echo "Certifique-se de que você está logado no EAS (npx eas-cli whoami)."
echo "Quando confirmado, este script executará:"
echo "  npx eas-cli submit --platform android --profile production"
echo
read -p "Pressione ENTER para prosseguir (Ctrl+C para cancelar) ... "

# O eas-cli irá pedir interativamente para você indicar o arquivo de service account
npx eas-cli submit --platform android --profile production
