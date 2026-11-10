#!/bin/sh
# ======================================================
# Restauration de la base PostgreSQL depuis une sauvegarde de deploy.sh.
#
#   ./restore.sh                       liste les sauvegardes disponibles
#   ./restore.sh <fichier.dump> --yes  restaure (l'API est arrêtée pendant l'opération)
#
# À utiliser quand un rollback applicatif ne suffit pas : une migration a modifié
# le schéma ou les données de façon incompatible avec la version précédente.
# Toutes les données écrites après la sauvegarde sont perdues.
# ======================================================
set -eu
cd "$(dirname "$0")"

set -a; . ./.env; set +a
compose() { docker compose --env-file .env --env-file release.env "$@"; }

if [ $# -eq 0 ]; then
  echo "Sauvegardes disponibles (la plus récente en premier) :"
  ls -1t backups/*.dump 2>/dev/null || echo "  aucune"
  exit 0
fi

DUMP="$1"
[ -f "${DUMP}" ] || { echo "❌ Fichier introuvable : ${DUMP}"; exit 1; }
[ "${2:-}" = "--yes" ] || { echo "Ajouter --yes pour confirmer la restauration de ${DUMP}."; exit 1; }

echo "⏸  Arrêt de l'API"
compose stop api

echo "♻️  Restauration de ${DUMP}"
compose exec -T postgres pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  --clean --if-exists --no-owner --single-transaction < "${DUMP}"

echo "▶ Redémarrage de l'API"
compose up -d api
i=0
until curl -fsS "http://127.0.0.1:${API_PORT:-4000}/v1/ready" 2>/dev/null | grep -q '"status":"READY"'; do
  i=$((i + 1)); [ "$i" -lt 30 ] || { echo "❌ API non prête après restauration."; exit 1; }
  sleep 2
done
echo "✅ Base restaurée depuis ${DUMP}, API prête."
