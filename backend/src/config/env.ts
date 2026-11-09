import dotenv from "dotenv";

dotenv.config();

/**
 * Lit une variable d'environnement.
 * Une variable absente OU vide prend la valeur par défaut.
 */
const readEnv = (name: string, fallback: string): string => {
  const value = process.env[name];

  return value === undefined || value === "" ? fallback : value;
};

const DEFAULT_PORT = 4500;

const parsedPort = Number.parseInt(readEnv("PORT", String(DEFAULT_PORT)), 10);

export const env = {
  port: Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort,

  nodeEnv: readEnv("NODE_ENV", "development"),

  databaseUrl: readEnv("DATABASE_URL", ""),

  jwtSecret: readEnv("JWT_SECRET", ""),

  apiVersion: readEnv("API_VERSION", "v1"),

  frontendUrl: readEnv("FRONTEND_URL", "http://localhost:5173"),
};

/**
 * Variables obligatoires au démarrage du serveur.
 * Sans JWT_SECRET, aucun token ne peut être signé ni vérifié.
 */
export const getMissingRequiredEnv = (): string[] =>
  Object.entries({
    DATABASE_URL: env.databaseUrl,
    JWT_SECRET: env.jwtSecret,
  })
    .filter(([, value]) => !value)
    .map(([name]) => name);
