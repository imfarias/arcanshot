#!/usr/bin/env bash
# Gera (na VPS) o kubeconfig do usuário arcanshot-deployer para o secret KUBE_CONFIG do GitHub Actions.
#   uso: bash make-kubeconfig.sh [saida]   (padrão: /root/arcanshot-deployer.kubeconfig)
# O token não é exibido; o arquivo é criado com permissão 600.
set -euo pipefail

OUT="${1:-/root/arcanshot-deployer.kubeconfig}"
SERVER="${KUBE_SERVER:-https://31.97.248.137:6443}"
NS=arcanshot
SECRET=arcanshot-deployer-token

for i in $(seq 1 20); do
  TOKEN=$(kubectl -n "$NS" get secret "$SECRET" -o jsonpath='{.data.token}' 2>/dev/null | base64 -d || true)
  [ -n "$TOKEN" ] && break
  sleep 1
done
[ -n "$TOKEN" ] || { echo "token do $SECRET ainda não foi emitido"; exit 1; }
CA=$(kubectl -n "$NS" get secret "$SECRET" -o jsonpath='{.data.ca\.crt}')

umask 077
cat > "$OUT" <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: vf-k3s
    cluster:
      server: ${SERVER}
      certificate-authority-data: ${CA}
users:
  - name: arcanshot-deployer
    user:
      token: ${TOKEN}
contexts:
  - name: arcanshot-deployer@vf-k3s
    context:
      cluster: vf-k3s
      user: arcanshot-deployer
      namespace: ${NS}
current-context: arcanshot-deployer@vf-k3s
EOF
echo "kubeconfig gerado em $OUT"
