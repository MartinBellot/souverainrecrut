# SouverainRecrut — Déploiement

Projet GitLab dédié au **déploiement** de l'API SouverainRecrut sur le serveur de production.

- Code source, tests, Jenkins, Terraform et Ansible : [github.com/MartinBellot/souverainrecrut](https://github.com/MartinBellot/souverainrecrut/tree/Dev) (branche `Dev`)
- Image déployée : [hub.docker.com/r/martinbellot/souverainrecrut-backend](https://hub.docker.com/r/martinbellot/souverainrecrut-backend)
- API en production : http://148.230.115.48:4000/v1/info

Ce dépôt est **généré** depuis le dossier `deployment/` du dépôt GitHub (`gitlab-deploy/sync.sh`) : ne pas le modifier ici.

## Pipeline

```
validate:tag ┐
             ├─► deploy:production (approbation manuelle) ─► verify:containers ┐
validate:compose ┘                                        └─► verify:api ────────┘
rollback:production (manuel, à tout moment)
```

| Étape | Rôle |
|---|---|
| `validate:tag` | Variables présentes, tag au format `<version>-<commit>`, publié sur Docker Hub en `linux/amd64` |
| `validate:compose` | `docker compose config` et syntaxe des scripts |
| `deploy:production` | **Manuel.** Transmet `deployment/` et le `.env` (généré depuis les variables), `docker login`, `./deploy.sh <tag>` (sauvegarde, pull, migrations, démarrage, contrôle de santé, retour automatique si échec) |
| `verify:containers` | API et PostgreSQL `healthy`, API sur le bon tag |
| `verify:api` | `/health`, `/ready` (base connectée), `/info`, `/api-docs`, 401 sans token, 400 sur login invalide |
| `rollback:production` | **Manuel.** `./deploy.sh --rollback` : retour à la version précédente |

## Déployer une version

**Build → Pipelines → Run pipeline**, variable `IMAGE_TAG` = tag publié par Jenkins (ex. `1.0.0-727aaad`), puis ▶ sur `deploy:production`.

## Variables CI/CD (toutes *Protected*)

| Variable | Type |
|---|---|
| `DOCKERHUB_USERNAME`, `DEPLOY_HOST`, `DEPLOY_USER`, `IMAGE_TAG` | Variable |
| `DOCKERHUB_TOKEN`, `POSTGRES_PASSWORD`, `JWT_SECRET` | Variable — *Masked and hidden* |
| `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS` | File |
