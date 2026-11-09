jest.mock("../../src/config/prisma", () => ({
  prisma: require("../helpers/prisma-mock").createPrismaMock(),
}));

import { api, db } from "../helpers/integration";

describe("Application Express — routes transverses", () => {
  it("GET / renvoie le message de bienvenue", async () => {
    const res = await api().get("/").expect(200);

    expect(res.body).toEqual({
      success: true,
      message: "Bienvenue sur l'API SouverainRecrut 🚀",
      version: "1.0.0",
      api: "/v1",
      documentation: "/api-docs",
    });
  });

  it("ne divulgue pas le framework via l'en-tête X-Powered-By", async () => {
    const res = await api().get("/").expect(200);

    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("GET /api-docs/ sert l'interface Swagger UI", async () => {
    const res = await api().get("/api-docs/").expect(200);

    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("swagger-ui");
  });

  it("renvoie une 404 JSON pour une route inconnue", async () => {
    const res = await api().get("/v1/does-not-exist").expect(404);

    expect(res.body).toEqual({
      success: false,
      error: { status: 404, message: "Route /v1/does-not-exist introuvable." },
    });
  });

  it("applique la politique CORS du frontend", async () => {
    const res = await api().get("/").set("Origin", "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("répond aux requêtes preflight OPTIONS", async () => {
    const res = await api()
      .options("/v1/jobs")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .expect(204);

    expect(res.headers["access-control-allow-methods"]).toContain("POST");
  });

  it("GET /v1/info renvoie les métadonnées de l'API", async () => {
    const res = await api().get("/v1/info").expect(200);

    expect(res.body.data).toMatchObject({ name: "SouverainRecrut API", health: "/v1/health" });
  });

  it("GET /v1/health renvoie UP sans authentification", async () => {
    const res = await api().get("/v1/health").expect(200);

    expect(res.body).toMatchObject({ success: true, data: { status: "UP" } });
  });

  it("GET /v1/ready renvoie 200 quand la base répond", async () => {
    db.$queryRaw.mockResolvedValue([1]);

    const res = await api().get("/v1/ready").expect(200);
    expect(res.body).toMatchObject({ success: true, data: { status: "READY", database: "CONNECTED" } });
  });

  it("GET /v1/ready renvoie 503 quand la base est indisponible", async () => {
    db.$queryRaw.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await api().get("/v1/ready").expect(503);
    expect(res.body).toMatchObject({ success: false, data: { status: "NOT_READY" } });
  });

  it("masque une erreur base de données inattendue derrière une 500 générique", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    db.$queryRaw.mockResolvedValue([1]);
    db.user.count.mockRejectedValue(new Error("connection reset"));
    db.candidate.count.mockResolvedValue(0);
    db.job.count.mockResolvedValue(0);
    db.application.count.mockResolvedValue(0);
    const { bearer } = require("../helpers/auth");

    const res = await api().get("/v1/dashboard/stats").set("Authorization", bearer("ADMIN")).expect(500);

    expect(res.body).toEqual({ success: false, error: { status: 500, message: "Erreur interne du serveur." } });
    expect(JSON.stringify(res.body)).not.toContain("connection reset");
  });

  it("renvoie 400 pour un corps JSON mal formé", async () => {
    const res = await api()
      .post("/v1/auth/login")
      .set("Content-Type", "application/json")
      .send("{ not json")
      .expect(400);

    expect(res.body.error.message).toBe("Le corps de la requête n'est pas un JSON valide.");
  });

  it("renvoie 413 pour un corps de requête trop volumineux", async () => {
    await api()
      .post("/v1/auth/login")
      .send({ email: "a@b.c", password: "x".repeat(200 * 1024) })
      .expect(413);
  });
});
