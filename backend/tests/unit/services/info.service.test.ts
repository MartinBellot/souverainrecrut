import { InfoService } from "../../../src/services/info.service";

describe("InfoService", () => {
  it("retourne les métadonnées de l'API construites depuis la configuration", () => {
    const info = new InfoService().getInfo();

    expect(info).toMatchObject({
      name: "SouverainRecrut API",
      version: "1.0.0",
      environment: "test",
      apiVersion: "v1",
      documentation: "/api-docs",
      health: "/v1/health",
      readiness: "/v1/ready",
      node: process.version,
    });
    expect(new Date(info.timestamp).toISOString()).toBe(info.timestamp);
  });
});
