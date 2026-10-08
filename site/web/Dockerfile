# Site arcanshot.vfconsultoria.dev — build estático do Astro servido por nginx sem root.
# Contexto do build = raiz do repositório (ver .dockerignore): precisa de site/promo e resources/icon.png.
#   docker build -f site/web/Dockerfile -t arcanshot-site .
FROM node:22-alpine AS build
WORKDIR /app
COPY resources/icon.png resources/icon.png
COPY site/promo site/promo
COPY site/web/package.json site/web/package-lock.json site/web/
RUN cd site/web && npm ci --no-audit --no-fund
COPY site/web site/web
# Muda a cada execução do workflow: sem isso o cache do Docker reaproveita o build e
# a lista de releases (lida no build) fica velha quando só saiu uma versão nova.
ARG CACHE_BUST=0
# Token opcional só p/ evitar limite da API do GitHub ao listar releases (não fica na imagem)
RUN --mount=type=secret,id=github_token,required=false \
    cd site/web && GITHUB_TOKEN="$(cat /run/secrets/github_token 2>/dev/null || true)" npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY site/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/site/web/dist /usr/share/nginx/html
EXPOSE 8080
