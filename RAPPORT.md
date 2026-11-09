# Rapport de travail — SouverainRecrut

## 1. Tests du backend — consigne 3.2 (09/11/2026)

**Demande** : écrire les tests unitaires, d'intégration et E2E (en pyramide), avec une couverture proche de 100 %.

**Outils** : Jest 29 + ts-jest, Supertest, PostgreSQL 16 sous Docker pour les E2E.

| Niveau | Tests | Part | Périmètre |
|---|---|---|---|
| Unitaires | 244 | 74 % | Une classe ou une fonction isolée, dépendances simulées (mocks) |
| Intégration | 63 | 19 % | App Express complète via HTTP, seul Prisma est simulé |
| E2E | 22 | 7 % | Serveur réel + vrai PostgreSQL : parcours de recrutement complet, sécurité |

**Couverture : 100 %** (instructions, branches, fonctions, lignes), atteinte sans base de données. La CI échoue si elle passe sous 95 %.

**Rapports produits pour la CI** (`npm run test:ci`) : `coverage/lcov.info` (couverture, SonarQube), `coverage/sonar-report.xml` (exécution des tests, SonarQube), `reports/junit.xml` (Jenkins).

**Commandes** (depuis `backend/`) :
- `npm test` : tests unitaires et d'intégration
- `npm run test:ci` : mêmes tests, avec tous les rapports pour la CI
- `npm run test:coverage` : mêmes tests, avec le rapport de couverture
- `npm run test:db:up` puis `npm run test:e2e` : tests E2E
- `npm run typecheck` : vérification des types TypeScript

**Organisation** : `tests/unit` (même arborescence que `src/`), `tests/integration` (un fichier par ressource), `tests/e2e`, `tests/helpers`. Les E2E refusent de tourner sur une base dont le nom ne finit pas par `_test`.

## 2. Correction des défauts (09/11/2026)

**Demande** : corriger les problèmes du code.

| # | Défaut | Correction |
|---|---|---|
| 1 | 🔴 La migration ne correspond pas au schéma : les suppressions en cascade échouent (500) | Nouvelle migration `20261109120000_fix_cascade_and_unique_application` |
| 2 | 🔴 Un candidat peut postuler deux fois à la même offre (index unique absent) | Même migration. Les doublons renvoient maintenant 409. |
| 3 | 🔴 Les routes `/users` renvoient le hash du mot de passe | `publicUserSelect` : le champ `password` n'est jamais lu, sauf pour la connexion |
| 4 | 🔴 `PUT /users/:id` enregistre le mot de passe **en clair** | Le mot de passe est haché à la mise à jour, et l'email est vérifié contre les doublons (409) |
| 5 | 🟠 Erreurs Prisma renvoyées en 500 | Traduction dans `errorMiddleware` : P2002 → 409, P2003 → 400, P2025 → 404 |
| 6 | 🟠 `POST /auth/login` sans corps renvoie 500 | Validation Zod `loginSchema` (400) |
| 7 | 🟡 JSON mal formé ou corps trop gros renvoie 500 | Réponses 400 et 413 |
| 8 | 🟡 `?page=abc` produit `NaN`, puis une erreur 500 | La pagination revient aux valeurs par défaut |
| 9 | 🟡 Le serveur démarre sans `JWT_SECRET`, et toutes les connexions échouent | Arrêt au démarrage si `JWT_SECRET` ou `DATABASE_URL` manque |
| 10 | 🟡 Dockerfile en Node 20 alors que `engines` exige ≥ 22 ; pas de `.dockerignore` (le `.env` et les `node_modules` macOS étaient copiés dans l'image) | Node 22, OpenSSL pour Prisma, `--omit=dev`, ajout d'un `.dockerignore` |
| 11 | 🟡 Swagger pointe vers `localhost:4500` alors que l'API écoute sur le port 4000 | URL relative `/v1` |

**Vérification** : chaque défaut a maintenant un test de non-régression. 329 tests passent, la couverture reste à 100 %, et l'image Docker se construit et répond `READY` sur une vraie base.

**⚠️ Avant de déployer la migration** : supprimer les doubles candidatures déjà présentes en base, sinon la création de l'index unique échoue. C'est arrivé sur la base de test.

**Points non traités (choix métier à trancher)** :
- Un recruteur peut créer une offre au nom d'un autre recruteur (`recruiterId` vient du corps de la requête).
- Les emails des utilisateurs ne sont pas mis en minuscules, contrairement à ceux des candidats.
- Le JWT d'un utilisateur supprimé reste valide jusqu'à son expiration (24 h).

## 3. Qualité avec SonarQube — consigne 3.3 (09/11/2026)

**Configuration** : `backend/sonar-project.properties` (sources, tests, rapports lcov et d'exécution des tests). Le Quality Gate est créé par `ci/sonar/setup-quality-gate.sh` : script idempotent, token passé par variable d'environnement.

**Quality Gate « SouverainRecrut »** : notes A en fiabilité, sécurité et maintenabilité, 100 % des security hotspots revus, couverture ≥ 80 %, duplication ≤ 3 %. Ces seuils s'appliquent au nouveau code **et** au code global.

| Indicateur | 1ʳᵉ analyse | Après corrections |
|---|---|---|
| Bugs / Vulnérabilités | 0 / 0 | 0 / 0 |
| Code smells | 13 | **0** |
| Security hotspots | 1 (en-tête `X-Powered-By`) | **0** |
| Duplication / Couverture | 0 % / 100 % | 0 % / 100 % |
| Quality Gate | PASSED | **PASSED** |

**Corrections** : API Zod dépréciées (`nativeEnum`, `string().email()`, `ZodSchema`), lecture des variables d'environnement sans `||`, `app.disable("x-powered-by")`.

**Gate vérifié dans les deux sens** : une analyse sans rapport de couverture donne **FAILED** (couverture 0 %), et la pipeline s'arrête.

## 4. Jenkins et chaîne CI — consignes 3.4 et 3.5 (09/11/2026)

**Lancement** : `cp ci/.env.example ci/.env` (renseigner les secrets), puis `docker compose -f docker-compose.ci.yml up -d --build`. Ensuite `ci/sonar/setup-quality-gate.sh`. Jenkins : http://localhost:8080, SonarQube : http://localhost:9000.

| Élément | Mise en œuvre |
|---|---|
| Image Jenkins (`ci/jenkins/Dockerfile`) | Jenkins LTS + Node 22, CLI Docker, Trivy 0.76.1 (SHA-256 vérifié) |
| Plugins (`plugins.txt`) | Git, GitHub, Pipeline, SonarQube Scanner, Docker Pipeline, JCasC, Job DSL, JUnit, HTML Publisher |
| Configuration (`casc.yaml`, JCasC) | Admin, serveur SonarQube, SonarScanner, credentials et job créés automatiquement |
| Secrets | Lus depuis `ci/.env` (ignoré par git) : **aucun secret dans le dépôt** |
| Accès Docker | Socket de l'hôte, Jenkins **non root** (groupe 0) |
| Pipeline (`Jenkinsfile`, racine) | Checkout Dev → `npm ci` → Prisma generate → typecheck + tests → SonarQube → Quality Gate → build image → Trivy → publication Docker Hub |
| Publication | Uniquement si tout est vert ; tags `<sha>` et `dev` ; paramètre `PUBLISH` |

**Vérification** : pipeline exécutée sur ce Jenkins local avec le code actuel (via un dépôt git temporaire, sans push). Résultats : 308 tests publiés dans Jenkins, Quality Gate OK reçu par webhook, image construite. **Trivy a bloqué** la publication sur une CVE critique (`proxy-addr@2.0.7`, usurpation d'IP), corrigée par la mise à jour en 2.0.8.

**Dockerfile backend optimisé** : un seul `npm ci` (suivi de `npm prune --omit=dev`) au lieu de deux téléchargements, et exécution en utilisateur `node` (non root). Le premier build a été très lent (7 min de `npm ci`) parce que le réseau de Docker Desktop était dégradé ; le double téléchargement doublait cette attente.

**Points d'attention** :
- Avertissement Jest « A worker process has failed to exit gracefully » en CI : Jest lançait 13 workers (14 cœurs) qui se concurrençaient à l'arrêt. Corrigé avec `--maxWorkers=2` dans `test:ci`, ce qui accélère aussi les tests (5 s).
- Trivy 0.58 est introuvable : les releases 0.27 à 0.69.1 ont été retirées de GitHub après l'incident de sécurité de 2026. Il faut utiliser une version récente.
- Jenkins tourne en local : GitHub ne peut pas le joindre par webhook, donc le job scrute le dépôt toutes les 5 minutes.
- Les E2E (PostgreSQL) ne tournent pas dans la pipeline : la couverture à 100 % est atteinte sans eux.

## 5. Image Docker et publication — consigne 3.6 (09/11/2026)

**Dockerfile backend revu** :

| Exigence | Mise en œuvre |
|---|---|
| Reproductible | Image de base figée par version **et** digest (`node:22.23.4-alpine3.24@sha256:…`), `npm ci` sur le lockfile |
| Pas de fichiers inutiles | Build multi-étapes, dépendances de prod uniquement (`npm prune --omit=dev`), `.dockerignore` strict (tests, rapports, docs, config CI) |
| Pas de secrets | `.env` exclu et vérifié absent de l'image ; secrets fournis au lancement (`-e`) ; Trivy recherche les secrets |
| Sûre | Exécution en utilisateur `node` (non root), `HEALTHCHECK` sur `/v1/health` |
| Traçable | Labels OCI `version` et `revision` (commit complet) |

**Défaut corrigé** : l'image exposait le port 4000, mais l'application écoutait sur 4500 par défaut. Le `Dockerfile` fixe maintenant `PORT=4000`.

**Tags** : `<version>-<commit>` (ex. `1.0.0-d794c86`), immuable et traçable, et `dev`, qui pointe sur la dernière image validée de la branche Dev. La version est lue dans `package.json`.

**Seuils Trivy** :
- **Bloquant** : toute vulnérabilité HIGH ou CRITICAL disposant d'un correctif, et tout secret détecté.
- **Non bloquant** : MEDIUM, LOW et vulnérabilités sans correctif ; le rapport complet (JSON + tableau) est archivé dans Jenkins.
- **Exceptions** : `backend/.trivyignore.yaml`, chacune justifiée, limitée à un paquet et à une version, avec une **date d'expiration**.

**Résultat du durcissement** : le premier scan avec ces seuils a **bloqué** la pipeline sur 26 vulnérabilités HIGH.

| Origine | Traitement |
|---|---|
| `npm` embarqué dans l'image Node (`pacote`, `sigstore`, `ip-address`…) | `npm`, `npx` et `corepack` retirés de l'image finale (inutiles à l'exécution) |
| Dépendances transitives de l'app (`body-parser`, `fast-uri`, `js-yaml`, `brace-expansion`) | `npm update` dans les plages existantes, uniquement vers des versions publiées depuis au moins 2 semaines |
| `effect` (CLI Prisma) | Prisma 6.16.2 → **6.19.3** ; 308 tests et 22 E2E OK |
| `deepmerge-ts` (CLI Prisma) | Correctif seulement en 8.0 (non supporté par Prisma 6). La CVE n'est pas exploitable ici, car le paquet n'est chargé que par la CLI, jamais par l'API. **Exception jusqu'au 09/02/2027**, action : migrer vers Prisma 7 |

Résultat : **0 vulnérabilité HIGH ou CRITICAL bloquante, 0 secret**.

**Publication** : étape `Publish`, exécutée seulement si tous les contrôles sont verts (tests, Quality Gate, Trivy). Elle fait `docker login` avec le credential Jenkins, `docker push` des deux tags, puis `docker image ls`. Le paramètre `REGISTRY` permet de viser un autre registre (vide = Docker Hub).

**Publication réelle (build Jenkins n°7, SUCCESS)** : commit `e34613f` de `origin/Dev` → 308 tests → Quality Gate OK → Trivy sans blocage → image publiée sur Docker Hub : **`martinbellot/souverainrecrut-backend:1.0.0-e34613f`** et `:dev` (même digest `sha256:8af86895b221…`). Le token Docker Hub est un access token stocké dans `ci/.env`, et Jenkins masque l'identifiant dans les logs.

Commandes manuelles équivalentes (depuis `backend/`) :
```
docker build --build-arg VERSION=1.0.0 --build-arg REVISION=$(git rev-parse HEAD) -t VOTRE_COMPTE/souverainrecrut-backend:1.0.0-$(git rev-parse --short HEAD) .
docker image ls
docker push VOTRE_COMPTE/souverainrecrut-backend:1.0.0-$(git rev-parse --short HEAD)
```
