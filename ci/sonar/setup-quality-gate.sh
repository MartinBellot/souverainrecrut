#!/usr/bin/env bash
# ======================================================
# Configure SonarQube pour SouverainRecrut (idempotent) :
#   - projet souverainrecrut-backend
#   - Quality Gate "SouverainRecrut" assigné au projet
#   - webhook vers Jenkins (nécessaire à waitForQualityGate)
#
# Usage : SONAR_HOST_URL=http://localhost:9000 SONAR_ADMIN_TOKEN=xxx ./setup-quality-gate.sh
# Le token n'est jamais versionné : il est passé par variable d'environnement.
# ======================================================
set -euo pipefail

: "${SONAR_HOST_URL:?SONAR_HOST_URL requis}"
: "${SONAR_ADMIN_TOKEN:?SONAR_ADMIN_TOKEN requis}"
JENKINS_WEBHOOK_URL="${JENKINS_WEBHOOK_URL:-http://jenkins:8080/sonarqube-webhook/}"

PROJECT_KEY="souverainrecrut-backend"
GATE="SouverainRecrut"

api() { curl -sS --fail-with-body -u "${SONAR_ADMIN_TOKEN}:" -X POST "${SONAR_HOST_URL}/api/$1" "${@:2}"; }

echo "▶ Projet ${PROJECT_KEY}"
api projects/create --data-urlencode "project=${PROJECT_KEY}" \
  --data-urlencode "name=SouverainRecrut - Backend" >/dev/null || true

echo "▶ Quality Gate ${GATE} (recréé à l'identique)"
api qualitygates/destroy --data-urlencode "name=${GATE}" >/dev/null 2>&1 || true
api qualitygates/create --data-urlencode "name=${GATE}" >/dev/null

# SonarQube ≥ 10 pré-remplit un nouveau gate : on repart d'une liste vide.
for id in $(curl -sS --fail-with-body -u "${SONAR_ADMIN_TOKEN}:" -G "${SONAR_HOST_URL}/api/qualitygates/show" \
    --data-urlencode "name=${GATE}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do
  api qualitygates/delete_condition --data-urlencode "id=${id}" >/dev/null
done

# metric:operator:seuil  (GT = échoue si supérieur, LT = échoue si inférieur)
CONDITIONS=(
  # --- Nouveau code (Clean as You Code)
  "new_reliability_rating:GT:1"          # aucun nouveau bug        (note A)
  "new_security_rating:GT:1"             # aucune nouvelle vulnérabilité (note A)
  "new_maintainability_rating:GT:1"      # dette technique maîtrisée (note A)
  "new_security_hotspots_reviewed:LT:100" # 100 % des hotspots revus
  "new_coverage:LT:80"                   # couverture ≥ 80 %
  "new_duplicated_lines_density:GT:3"    # duplication ≤ 3 %
  # --- Code global
  "reliability_rating:GT:1"
  "security_rating:GT:1"
  "security_hotspots_reviewed:LT:100"
  "coverage:LT:80"
  "duplicated_lines_density:GT:3"
)

for condition in "${CONDITIONS[@]}"; do
  IFS=: read -r metric op error <<<"${condition}"
  api qualitygates/create_condition --data-urlencode "gateName=${GATE}" \
    --data-urlencode "metric=${metric}" --data-urlencode "op=${op}" \
    --data-urlencode "error=${error}" >/dev/null
  echo "  ✓ ${metric} ${op} ${error}"
done

api qualitygates/select --data-urlencode "gateName=${GATE}" \
  --data-urlencode "projectKey=${PROJECT_KEY}" >/dev/null

echo "▶ Webhook Jenkins → ${JENKINS_WEBHOOK_URL}"
if ! curl -sS -u "${SONAR_ADMIN_TOKEN}:" "${SONAR_HOST_URL}/api/webhooks/list?project=${PROJECT_KEY}" | grep -q '"name":"jenkins"'; then
  api webhooks/create --data-urlencode "name=jenkins" --data-urlencode "project=${PROJECT_KEY}" \
    --data-urlencode "url=${JENKINS_WEBHOOK_URL}" >/dev/null
fi

echo "✅ SonarQube configuré."
