#!/usr/bin/env bash
# Garante (de forma idempotente) que o gateway compartilhado istio-system/vf-shared-gateway tenha
# o servidor HTTPS do ArcanShot. Só ACRESCENTA uma entrada — nunca altera as dos outros apps.
set -euo pipefail

DOMAIN="${1:-arcanshot.vfconsultoria.dev}"
GATEWAY="vf-shared-gateway"
NS="istio-system"

if kubectl -n "$NS" get gateway "$GATEWAY" -o jsonpath='{.spec.servers[*].hosts[*]}' | tr ' ' '\n' | grep -qx "$DOMAIN"; then
  echo "gateway: $DOMAIN já configurado"
  exit 0
fi

kubectl -n "$NS" patch gateway "$GATEWAY" --type=json -p "[{
  \"op\": \"add\",
  \"path\": \"/spec/servers/-\",
  \"value\": {
    \"hosts\": [\"$DOMAIN\"],
    \"port\": {\"name\": \"https-arcanshot\", \"number\": 443, \"protocol\": \"HTTPS\"},
    \"tls\": {\"credentialName\": \"arcanshot-tls\", \"mode\": \"SIMPLE\"}
  }
}]"
echo "gateway: servidor HTTPS de $DOMAIN adicionado"
