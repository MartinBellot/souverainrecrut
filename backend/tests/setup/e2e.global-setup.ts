import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Prépare la base PostgreSQL de test avant la suite E2E :
 * applique les migrations Prisma (non destructif). Les données sont
 * ensuite vidées par chaque suite via resetDatabase() (tests/helpers/e2e.ts).
 */
export default async function globalSetup(): Promise<void> {
  const databaseUrl =
    process.env.E2E_DATABASE_URL ??
    "postgresql://test:test@localhost:5433/souverainrecrut_test";

  // Garde-fou : les suites E2E vident les tables, on refuse toute base non dédiée aux tests.
  if (!/_test(\?|$)/.test(databaseUrl)) {
    throw new Error(`E2E refusé : la base "${databaseUrl}" n'est pas une base de test (*_test).`);
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
}
