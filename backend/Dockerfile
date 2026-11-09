# ======================================================
# Image Backend SouverainRecrut
#   - reproductible : image de base figée (version + digest), npm ci sur lockfile
#   - minimale     : dépendances de production uniquement, .dockerignore strict
#   - sûre         : exécution sans root, aucun secret embarqué (fournis au run)
# ======================================================
ARG NODE_IMAGE=node:22.23.4-alpine3.24@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202

# Étape 1 : Construction
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
# OpenSSL est requis par le moteur Prisma sur Alpine
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
# Génère le client Prisma, compile, puis retire les dépendances de dev :
# les node_modules de production sont réutilisés tels quels (un seul téléchargement).
# NB : npm conserve la CLI Prisma (peer optionnel de @prisma/client) ; voir .trivyignore.yaml.
RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# Étape 2 : Production
FROM ${NODE_IMAGE} AS runner

# Traçabilité (renseignés par la CI : version applicative + commit)
ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="souverainrecrut-backend" \
      org.opencontainers.image.description="API REST SouverainRecrut (Express, Prisma, PostgreSQL)" \
      org.opencontainers.image.source="https://github.com/MartinBellot/souverainrecrut" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000
# openssl pour Prisma ; npm/npx/corepack retirés : inutiles à l'exécution
# et sources de vulnérabilités (dépendances embarquées de npm).
RUN apk add --no-cache openssl \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn* \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Exécution sans privilèges root
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/v1/health" >/dev/null || exit 1

CMD ["node", "dist/server.js"]
