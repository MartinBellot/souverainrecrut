#!/bin/sh
# Génère RAPPORT.pdf depuis RAPPORT.md (Docker requis) : ./docs/pdf/build.sh
set -eu
cd "$(dirname "$0")/../.."

python3 docs/pdf/build.py extract

for mmd in docs/pdf/build/diagram-*.mmd; do
  docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/data" minlag/mermaid-cli:11.4.0 \
    -i "/data/${mmd}" -o "/data/${mmd%.mmd}.png" \
    -c /data/docs/pdf/mermaid.json -b white -s 3 -q
done

docker run --rm -v "$PWD:/work" -w /work mcr.microsoft.com/playwright/python:v1.49.1-jammy \
  sh -c "pip install -q --disable-pip-version-check markdown==3.7 pypdf==5.1.0 reportlab==4.2.5 playwright==1.49.1 2>/dev/null \
         && python docs/pdf/build.py render"
