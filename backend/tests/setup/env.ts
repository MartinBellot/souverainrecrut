/**
 * Variables d'environnement communes à tous les tests.
 * Exécuté AVANT le chargement des modules testés, ce qui garantit
 * que src/config/env.ts lit ces valeurs.
 */
process.env.DOTENV_CONFIG_QUIET = "true";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.API_VERSION = "v1";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://test:test@localhost:5433/souverainrecrut_test";
