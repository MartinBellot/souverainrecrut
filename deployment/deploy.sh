#!/bin/sh
# ======================================================
# Déploiement de l'API SouverainRecrut sur le serveur.
#
#   ./deploy.sh <tag>        déploie martinbellot/souverainrecrut-backend:<tag>
#   ./deploy.sh --rollback   revient à la version déployée avec succès juste avant
#
# Étapes : sauvegarde PostgreSQL → pull → migrations + démarrage → contrôle de santé.
# En cas d'échec, retour automatique au tag précédent (sans toucher aux données).
# Utilisé par Ansible (installation) et GitLab CI (mises à jour).
# ======================================================
set -eu
cd "$(dirname "$0")"

[ -f .env ] || { echo "❌ .env absent (cf. .env.example)"; exit 1; }
set -a; . ./.env; set +a
API_PORT="${API_PORT:-4000}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"

compose() { docker compose --env-file .env --env-file release.env "$@"; }
set_release() { echo "IMAGE_TAG=$1" > release.env; }
current_tag() { sed -n 's/^IMAGE_TAG=//p' release.env 2>/dev/null || true; }

wait_ready() {
  i=0
  while [ "$i" -lt 30 ]; do
    if curl -fsS "http://127.0.0.1:${API_PORT}/v1/ready" 2>/dev/null | grep -q '"status":"READY"'; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

backup_database() {
  mkdir -p backups
  file="backups/$(date -u +%Y%m%dT%H%M%SZ)_${1}.dump"
  if compose exec -T postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc > "${file}"; then
    echo "💾 Sauvegarde : ${file} ($(du -h "${file}" | cut -f1))"
    # Rotation : on garde les BACKUP_KEEP sauvegardes les plus récentes.
    ls -1t backups/*.dump | tail -n +"$((BACKUP_KEEP + 1))" | xargs -r rm -f
  else
    rm -f "${file}"
    echo "❌ Sauvegarde impossible : déploiement annulé."
    exit 1
  fi
}

PREV_TAG="$(current_tag)"

# Historique des versions déployées avec succès (amorcé avec la version en place).
if [ ! -f release.history ] && [ -n "${PREV_TAG}" ]; then
  echo "- ${PREV_TAG}" > release.history
fi

# --- Cible : tag explicite ou version précédente (historique des déploiements réussis)
if [ "${1:-}" = "--rollback" ]; then
  NEW_TAG="$(awk -v cur="${PREV_TAG}" '$2 != cur {t=$2} END {print t}' release.history 2>/dev/null)"
  [ -n "${NEW_TAG}" ] || { echo "❌ Aucune version antérieure dans release.history."; exit 1; }
  echo "↩ Rollback demandé : ${PREV_TAG} → ${NEW_TAG}"
else
  NEW_TAG="${1:?Usage : deploy.sh <tag> | --rollback}"
fi

echo "▶ Déploiement de ${BACKEND_IMAGE}:${NEW_TAG} (actuel : ${PREV_TAG:-aucun})"

# 1. Sauvegarde de la base avant toute migration (sauf premier déploiement).
[ -n "${PREV_TAG}" ] && backup_database "${PREV_TAG}"

# 2. Téléchargement : en cas d'échec (tag inexistant…), rien ne change.
set_release "${NEW_TAG}"
if ! compose pull --quiet api migrate; then
  echo "❌ Image introuvable ou inaccessible : ${NEW_TAG}. Aucun changement."
  [ -n "${PREV_TAG}" ] && set_release "${PREV_TAG}"
  exit 1
fi

# 3. Migrations puis démarrage de l'API, et contrôle de santé.
if compose up -d --remove-orphans && wait_ready; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ${NEW_TAG}" >> release.history
  echo "✅ API prête : ${BACKEND_IMAGE}:${NEW_TAG}"
  compose ps --format "table {{.Service}}\t{{.Image}}\t{{.Status}}"
  exit 0
fi

# 4. Échec : journaux puis retour automatique au tag précédent.
echo "❌ L'API n'est pas prête avec ${NEW_TAG}."
compose logs --tail=30 migrate api || true
if [ -n "${PREV_TAG}" ] && [ "${PREV_TAG}" != "${NEW_TAG}" ]; then
  echo "↩ Retour automatique vers ${PREV_TAG}"
  set_release "${PREV_TAG}"
  if compose up -d --remove-orphans && wait_ready; then
    echo "↩ ${PREV_TAG} de nouveau en service."
  else
    echo "⚠️ Retour arrière en échec : intervention manuelle requise (cf. restore.sh)."
  fi
fi
exit 1
