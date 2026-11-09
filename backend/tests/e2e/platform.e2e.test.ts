/**
 * Exploitation et sécurité de la plateforme, sur l'API réelle.
 */
import { ADMIN_CREDENTIALS, login, prisma, resetDatabase, startServer, stopServer } from "../helpers/e2e";

type Client = Awaited<ReturnType<typeof startServer>>;

describe("E2E — exploitation et sécurité", () => {
  let client: Client;
  let admin: string;

  beforeAll(async () => {
    client = await startServer();
    await resetDatabase();
    admin = (await login(client, ADMIN_CREDENTIALS)).authorization;
  });

  afterAll(stopServer);

  it("les sondes health / ready / info répondent avec une vraie base connectée", async () => {
    await client.get("/v1/health").expect(200);
    const ready = await client.get("/v1/ready").expect(200);
    const info = await client.get("/v1/info").expect(200);

    expect(ready.body.data).toMatchObject({ status: "READY", database: "CONNECTED" });
    expect(info.body.data.name).toBe("SouverainRecrut API");
  });

  it("refuse les identifiants invalides et les accès non authentifiés", async () => {
    await client.post("/v1/auth/login").send({ ...ADMIN_CREDENTIALS, password: "wrong" }).expect(401);
    await client.get("/v1/candidates").expect(401);
    await client.get("/v1/candidates").set("Authorization", "Bearer not.a.jwt").expect(401);
  });

  it("empêche les doublons de candidats, y compris à la casse près (409)", async () => {
    await client
      .post("/v1/candidates")
      .set("Authorization", admin)
      .send({ fullName: "Fatou Sylla", email: "fatou@example.com" })
      .expect(201);

    await client
      .post("/v1/candidates")
      .set("Authorization", admin)
      .send({ fullName: "Fatou Sylla", email: "FATOU@example.com" })
      .expect(409);
  });

  it("pagine les résultats réels, du plus récent au plus ancien", async () => {
    for (const n of [1, 2, 3]) {
      await client
        .post("/v1/candidates")
        .set("Authorization", admin)
        .send({ fullName: `Candidat ${n}`, email: `candidat${n}@example.com` })
        .expect(201);
    }

    const page1 = await client.get("/v1/candidates?page=1&limit=2").set("Authorization", admin).expect(200);
    const page2 = await client.get("/v1/candidates?page=2&limit=2").set("Authorization", admin).expect(200);

    expect(page1.body.pagination).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect(page1.body.data.map((c: any) => c.fullName)).toEqual(["Candidat 3", "Candidat 2"]);
    expect(page2.body.data.map((c: any) => c.fullName)).toEqual(["Candidat 1", "Fatou Sylla"]);
  });

  // --- Non-régression des anomalies corrigées (cf. RAPPORT.md §2).

  /** Crée un recruteur, une offre, un candidat et une candidature directement en base. */
  const seedApplication = async (suffix: string) => {
    const recruiter = await prisma.user.create({
      data: { firstName: "Rec", lastName: suffix, email: `rec-${suffix}@x.com`, password: "x" },
    });
    const job = await prisma.job.create({
      data: { title: "Poste", description: "Description du poste", location: "Conakry", company: "ACME", recruiterId: recruiter.id },
    });
    const candidate = await prisma.candidate.create({
      data: { fullName: `Cand ${suffix}`, email: `cand-${suffix}@x.com` },
    });
    const application = await prisma.application.create({ data: { candidateId: candidate.id, jobId: job.id } });
    return { recruiter, job, candidate, application };
  };

  it("supprimer un candidat supprime ses candidatures en cascade", async () => {
    const { candidate, application } = await seedApplication("cascade-candidate");

    await client.delete(`/v1/candidates/${candidate.id}`).set("Authorization", admin).expect(200);
    expect(await prisma.application.findUnique({ where: { id: application.id } })).toBeNull();
  });

  it("supprimer un recruteur supprime ses offres en cascade", async () => {
    const { recruiter, job } = await seedApplication("cascade-recruiter");

    await client.delete(`/v1/users/${recruiter.id}`).set("Authorization", admin).expect(200);
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toBeNull();
  });

  it("une double candidature au même poste est refusée (409)", async () => {
    const candidate = await client
      .post("/v1/candidates")
      .set("Authorization", admin)
      .send({ fullName: "Ibrahima Barry", email: "ibrahima@example.com" });
    const me = await client.get("/v1/auth/me").set("Authorization", admin);
    const job = await client.post("/v1/jobs").set("Authorization", admin).send({
      title: "Data Engineer",
      description: "Pipelines de données et PostgreSQL",
      location: "Conakry",
      company: "SouverainTech",
      recruiterId: me.body.data.id,
    });
    const body = { candidateId: candidate.body.data.id, jobId: job.body.data.id };

    await client.post("/v1/applications").set("Authorization", admin).send(body).expect(201);
    await client.post("/v1/applications").set("Authorization", admin).send(body).expect(409);
  });

  it("une offre liée à un recruteur inexistant est refusée (400)", async () => {
    const res = await client.post("/v1/jobs").set("Authorization", admin).send({
      title: "Fantôme",
      description: "Offre rattachée à un recruteur inexistant",
      location: "Conakry",
      company: "Ghost Inc",
      recruiterId: "does-not-exist",
    });

    expect(res.status).toBe(400);
  });

  it("un login sans corps est refusé (400)", async () => {
    await client.post("/v1/auth/login").send({}).expect(400);
  });

  it("un changement de mot de passe est haché et permet de se reconnecter", async () => {
    const created = await client
      .post("/v1/users")
      .set("Authorization", admin)
      .send({ firstName: "Kadiatou", lastName: "Sow", email: "kadiatou@x.com", password: "OldPassword1" })
      .expect(201);
    expect(created.body.data).not.toHaveProperty("password");

    await client
      .put(`/v1/users/${created.body.data.id}`)
      .set("Authorization", admin)
      .send({ password: "NewPassword1" })
      .expect(200);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: created.body.data.id } });
    expect(stored.password).not.toBe("NewPassword1");
    await client.post("/v1/auth/login").send({ email: "kadiatou@x.com", password: "OldPassword1" }).expect(401);
    await login(client, { email: "kadiatou@x.com", password: "NewPassword1" });
  });

  it("aucune réponse /users n'expose de mot de passe", async () => {
    const res = await client.get("/v1/users?limit=100").set("Authorization", admin).expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((user: object) => expect(user).not.toHaveProperty("password"));
  });
});
