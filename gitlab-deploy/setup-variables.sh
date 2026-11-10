#!/bin/sh
# ======================================================
# Crée (ou recrée) les variables CI/CD protégées du projet GitLab de déploiement.
#
# Usage (depuis la racine du dépôt) : ./gitlab-deploy/setup-variables.sh <IMAGE_TAG>
#
# Sources des valeurs (aucune n'est versionnée ni affichée) :
#   ci/.env                        GITLAB_TOKEN, DOCKERHUB_USERNAME, DOCKERHUB_TOKEN
#   terraform/.secrets/            clé privée de déploiement (générée par Terraform)
#   ssh-keyscan                    empreinte SSH du serveur
#   serveur (/opt/.../.env)        POSTGRES_PASSWORD et JWT_SECRET en service : les
#                                  reprendre évite de casser l'accès à la base existante
# Les valeurs transitent par des fichiers temporaires 0600 (jamais en argument).
# ======================================================
set -eu
cd "$(dirname "$0")/.."

IMAGE_TAG="${1:?Usage : setup-variables.sh <IMAGE_TAG>}"
GITLAB_PROJECT_ID="${GITLAB_PROJECT_ID:-88750285}"
DEPLOY_HOST="${DEPLOY_HOST:-148.230.115.48}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_DIR="/opt/souverainrecrut"
API="https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/variables"

env_value() { sed -n "s/^$1=//p" ci/.env; }
GITLAB_TOKEN="$(env_value GITLAB_TOKEN)"

umask 077
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

# --- Valeurs
env_value DOCKERHUB_USERNAME > "${TMP}/DOCKERHUB_USERNAME"
env_value DOCKERHUB_TOKEN > "${TMP}/DOCKERHUB_TOKEN"
printf '%s' "${DEPLOY_HOST}" > "${TMP}/DEPLOY_HOST"
printf '%s' "${DEPLOY_USER}" > "${TMP}/DEPLOY_USER"
printf '%s' "${IMAGE_TAG}" > "${TMP}/IMAGE_TAG"
cp terraform/.secrets/deploy_ed25519 "${TMP}/SSH_PRIVATE_KEY"
ssh-keyscan -t ed25519 "${DEPLOY_HOST}" 2>/dev/null > "${TMP}/SSH_KNOWN_HOSTS"
ssh root@"${DEPLOY_HOST}" "sed -n 's/^POSTGRES_PASSWORD=//p' ${DEPLOY_DIR}/.env" > "${TMP}/POSTGRES_PASSWORD"
ssh root@"${DEPLOY_HOST}" "sed -n 's/^JWT_SECRET=//p' ${DEPLOY_DIR}/.env" > "${TMP}/JWT_SECRET"

# Valeurs à une ligne : retirer le saut de ligne final.
for f in DOCKERHUB_USERNAME DOCKERHUB_TOKEN POSTGRES_PASSWORD JWT_SECRET; do
  printf '%s' "$(cat "${TMP}/${f}")" > "${TMP}/${f}.v" && mv "${TMP}/${f}.v" "${TMP}/${f}"
  [ -s "${TMP}/${f}" ] || { echo "❌ Valeur vide : ${f}"; exit 1; }
done

# --- Création : <clé> <type env_var|file> <masquée et cachée true|false>
create() {
  curl -fsS -o /dev/null -X DELETE -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" "${API}/$1" 2>/dev/null || true
  curl -fsS -o /dev/null -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" "${API}" \
    --data-urlencode "key=$1" \
    --data-urlencode "value@${TMP}/$1" \
    --data-urlencode "variable_type=$2" \
    --data-urlencode "protected=true" \
    --data-urlencode "masked_and_hidden=$3" \
    --data-urlencode "masked=$3" \
    --data-urlencode "raw=true"
  echo "  ✓ $1 ($2$([ "$3" = true ] && echo ", masquée et cachée"))"
}

echo "▶ Variables CI/CD du projet GitLab ${GITLAB_PROJECT_ID}"
create DOCKERHUB_USERNAME env_var false
create DOCKERHUB_TOKEN    env_var true
create DEPLOY_HOST        env_var false
create DEPLOY_USER        env_var false
create SSH_PRIVATE_KEY    file    false
create SSH_KNOWN_HOSTS    file    false
create POSTGRES_PASSWORD  env_var true
create JWT_SECRET         env_var true
create IMAGE_TAG          env_var false
echo "✅ Variables configurées."
