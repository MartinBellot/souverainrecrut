import { swaggerSpec } from "../../../src/docs/swagger";

const spec = swaggerSpec as any;

describe("Spécification OpenAPI", () => {
  it("déclare OpenAPI 3.0.3 et les infos de l'API", () => {
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info).toMatchObject({ title: "SouverainRecrut API", version: "1.0.0" });
  });

  it("utilise une URL de serveur relative basée sur la version de l'API", () => {
    expect(spec.servers).toEqual([{ url: "/v1", description: "Serveur courant" }]);
  });

  it("déclare l'authentification Bearer JWT", () => {
    expect(spec.components.securitySchemes.bearerAuth).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
  });

  it("déclare tous les tags fonctionnels", () => {
    expect(spec.tags.map((t: { name: string }) => t.name)).toEqual([
      "Authentication",
      "Users",
      "Candidates",
      "Jobs",
      "Applications",
      "Dashboard",
      "Information",
      "Health",
    ]);
  });

  it.each([
    "/auth/login",
    "/auth/me",
    "/users",
    "/users/{id}",
    "/candidates",
    "/candidates/{id}",
    "/jobs",
    "/jobs/{id}",
    "/applications",
    "/applications/{id}",
    "/dashboard/stats",
    "/info",
    "/health",
    "/ready",
  ])("documente la route %s", (path) => {
    expect(spec.paths).toHaveProperty([path]);
  });

  it("n'utilise que des tags déclarés dans les opérations", () => {
    const declared = new Set(spec.tags.map((t: { name: string }) => t.name));
    const used = Object.values(spec.paths).flatMap((ops: any) =>
      Object.values(ops).flatMap((op: any) => op.tags ?? [])
    );

    expect(used.length).toBeGreaterThan(0);
    used.forEach((tag) => expect(declared).toContain(tag));
  });
});
