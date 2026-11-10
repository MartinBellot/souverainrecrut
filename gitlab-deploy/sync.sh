#!/bin/sh
# ======================================================
# Synchronise le projet GitLab de déploiement depuis ce dépôt (source unique) :
#   gitlab-deploy/.gitlab-ci.yml + gitlab-deploy/README.md + deployment/
#
# Usage (depuis la racine du dépôt) : ./gitlab-deploy/sync.sh
# Le token GitLab est lu dans ci/.env (GITLAB_TOKEN, non versionné) et transmis
# par en-tête HTTP : il n'est écrit ni dans une URL ni dans une config git.
# ======================================================
set -eu
cd "$(dirname "$0")/.."

GITLAB_PROJECT="${GITLAB_PROJECT:-martin.bellot.off/souverainrecrut}"
GITLAB_TOKEN="$(sed -n 's/^GITLAB_TOKEN=//p' ci/.env)"
[ -n "${GITLAB_TOKEN}" ] || { echo "GITLAB_TOKEN absent de ci/.env"; exit 1; }
AUTH="Authorization: Basic $(printf 'oauth2:%s' "${GITLAB_TOKEN}" | base64 | tr -d '\n')"

SOURCE_SHA="$(git rev-parse --short HEAD)"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

git -c "http.extraHeader=${AUTH}" clone -q "https://gitlab.com/${GITLAB_PROJECT}.git" "${WORK}/repo"

# Remplace le contenu suivi par la version courante des fichiers de déploiement.
git -C "${WORK}/repo" rm -rq --ignore-unmatch .
mkdir -p "${WORK}/repo/deployment"
cp gitlab-deploy/.gitlab-ci.yml gitlab-deploy/README.md "${WORK}/repo/"
cp deployment/docker-compose.yml deployment/.env.example deployment/deploy.sh deployment/restore.sh "${WORK}/repo/deployment/"

git -C "${WORK}/repo" add -A
if git -C "${WORK}/repo" diff --cached --quiet; then
  echo "GitLab déjà à jour (source ${SOURCE_SHA})."
  exit 0
fi

git -C "${WORK}/repo" \
  -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
  commit -q -m "Synchronisation des fichiers de déploiement (GitHub ${SOURCE_SHA})"
git -C "${WORK}/repo" -c "http.extraHeader=${AUTH}" push -q origin HEAD
echo "✅ GitLab synchronisé : $(git -C "${WORK}/repo" rev-parse --short HEAD) (source GitHub ${SOURCE_SHA})"
