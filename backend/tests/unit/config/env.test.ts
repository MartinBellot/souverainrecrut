describe("config/env", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  const loadEnv = (vars: Record<string, string | undefined>) => {
    process.env = { ...ORIGINAL_ENV, ...vars };
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key];
    }
    let env!: typeof import("../../../src/config/env").env;
    jest.isolateModules(() => {
      jest.doMock("dotenv", () => ({ config: jest.fn() }));
      env = require("../../../src/config/env").env;
    });
    return env;
  };

  it("lit les variables d'environnement fournies", () => {
    const env = loadEnv({
      PORT: "4000",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db",
      JWT_SECRET: "secret",
      API_VERSION: "v2",
      FRONTEND_URL: "https://app.example.com",
    });

    expect(env).toEqual({
      port: 4000,
      nodeEnv: "production",
      databaseUrl: "postgresql://db",
      jwtSecret: "secret",
      apiVersion: "v2",
      frontendUrl: "https://app.example.com",
    });
  });

  it("applique les valeurs par défaut quand les variables sont absentes", () => {
    const env = loadEnv({
      PORT: undefined,
      NODE_ENV: undefined,
      DATABASE_URL: undefined,
      JWT_SECRET: undefined,
      API_VERSION: undefined,
      FRONTEND_URL: undefined,
    });

    expect(env).toEqual({
      port: 4500,
      nodeEnv: "development",
      databaseUrl: "",
      jwtSecret: "",
      apiVersion: "v1",
      frontendUrl: "http://localhost:5173",
    });
  });

  it("signale les variables obligatoires manquantes", () => {
    let missing!: string[];
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    jest.isolateModules(() => {
      jest.doMock("dotenv", () => ({ config: jest.fn() }));
      missing = require("../../../src/config/env").getMissingRequiredEnv();
    });

    expect(missing).toEqual(["DATABASE_URL", "JWT_SECRET"]);
  });

  it("ne signale rien quand les variables obligatoires sont présentes", () => {
    const { getMissingRequiredEnv } = require("../../../src/config/env");
    expect(getMissingRequiredEnv()).toEqual([]);
  });

  it("retombe sur le port 4500 si PORT n'est pas numérique", () => {
    expect(loadEnv({ PORT: "abc" }).port).toBe(4500);
  });
});
