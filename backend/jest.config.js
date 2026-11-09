/**
 * Configuration Jest — pyramide de tests SouverainRecrut.
 *
 *   unit         : une unité isolée, toutes ses dépendances sont mockées.
 *   integration  : l'application Express complète (routes → middlewares →
 *                  contrôleurs → services → repositories) testée via HTTP,
 *                  seule la base de données (Prisma) est simulée.
 *   e2e          : l'API réelle démarrée sur un port, branchée sur un vrai
 *                  PostgreSQL (docker-compose.test.yml).
 */
const tsJest = {
  "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
};

const base = {
  testEnvironment: "node",
  transform: tsJest,
  moduleFileExtensions: ["ts", "js", "json"],
  setupFiles: ["<rootDir>/tests/setup/env.ts"],
  clearMocks: true,
  restoreMocks: true,
};

module.exports = {
  projects: [
    {
      ...base,
      displayName: "unit",
      testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
    },
    {
      ...base,
      displayName: "integration",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      setupFiles: [...base.setupFiles, "<rootDir>/tests/setup/silence-http-logs.ts"],
    },
    {
      ...base,
      displayName: "e2e",
      testMatch: ["<rootDir>/tests/e2e/**/*.test.ts"],
      setupFiles: [...base.setupFiles, "<rootDir>/tests/setup/silence-http-logs.ts"],
      globalSetup: "<rootDir>/tests/setup/e2e.global-setup.ts",
    },
  ],

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "html"],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
  },
};
