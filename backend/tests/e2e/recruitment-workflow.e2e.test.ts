/**
 * Parcours métier complet, de bout en bout, sur une vraie base PostgreSQL :
 * un admin crée un recruteur, qui publie une offre, enregistre un candidat,
 * suit sa candidature jusqu'à l'acceptation ; l'admin fait ensuite le ménage.
 *
 * Les étapes sont volontairement séquentielles (état partagé).
 */
import { ADMIN_CREDENTIALS, login, prisma, resetDatabase, startServer, stopServer } from "../helpers/e2e";

type Client = Awaited<ReturnType<typeof startServer>>;

describe("E2E — parcours de recrutement complet", () => {
  let client: Client;
  let admin: string;
  let recruiter: string;
  let recruiterId: string;
  let jobId: string;
  let candidateId: string;
  let applicationId: string;

  beforeAll(async () => {
    client = await startServer();
    await resetDatabase();
  });

  afterAll(stopServer);

  it("1. l'administrateur se connecte et crée un compte recruteur", async () => {
    admin = (await login(client, ADMIN_CREDENTIALS)).authorization;

    const res = await client
      .post("/v1/users")
      .set("Authorization", admin)
      .send({ firstName: "Alice", lastName: "Diallo", email: "alice@souverainrecrut.com", password: "Recruit123!" })
      .expect(201);

    recruiterId = res.body.data.id;
    expect(res.body.data.role).toBe("RECRUITER");

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: recruiterId } });
    expect(stored.password).not.toBe("Recruit123!");
  });

  it("2. le recruteur se connecte et consulte son profil", async () => {
    ({ authorization: recruiter } = await login(client, {
      email: "alice@souverainrecrut.com",
      password: "Recruit123!",
    }));

    const res = await client.get("/v1/auth/me").set("Authorization", recruiter).expect(200);
    expect(res.body.data).toMatchObject({ id: recruiterId, role: "RECRUITER" });
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("3. le recruteur publie une offre d'emploi", async () => {
    const res = await client
      .post("/v1/jobs")
      .set("Authorization", recruiter)
      .send({
        title: "Ingénieur DevOps",
        description: "CI/CD, Docker, Terraform, Ansible",
        location: "Conakry",
        company: "SouverainTech",
        recruiterId,
      })
      .expect(201);

    jobId = res.body.data.id;
    expect(res.body.data.recruiterId).toBe(recruiterId);
  });

  it("4. le recruteur enregistre un candidat (email normalisé)", async () => {
    const res = await client
      .post("/v1/candidates")
      .set("Authorization", recruiter)
      .send({ fullName: "  Mamadou Bah ", email: "Mamadou@Example.com", phone: "+224620000001" })
      .expect(201);

    candidateId = res.body.data.id;
    expect(res.body.data).toMatchObject({ fullName: "Mamadou Bah", email: "mamadou@example.com" });
  });

  it("5. le candidat postule à l'offre (statut PENDING par défaut)", async () => {
    const res = await client
      .post("/v1/applications")
      .set("Authorization", recruiter)
      .send({ candidateId, jobId })
      .expect(201);

    applicationId = res.body.data.id;
    expect(res.body.data).toMatchObject({
      status: "PENDING",
      candidate: { id: candidateId },
      job: { id: jobId },
    });
  });

  it("6. le tableau de bord reflète l'activité", async () => {
    const res = await client.get("/v1/dashboard/stats").set("Authorization", recruiter).expect(200);

    expect(res.body.data).toEqual({ users: 2, candidates: 1, jobs: 1, applications: 1, pendingApplications: 1 });
  });

  it("7. le recruteur fait avancer la candidature jusqu'à ACCEPTED", async () => {
    for (const status of ["REVIEWED", "ACCEPTED"]) {
      const res = await client
        .put(`/v1/applications/${applicationId}`)
        .set("Authorization", recruiter)
        .send({ status })
        .expect(200);
      expect(res.body.data.status).toBe(status);
    }

    const stats = await client.get("/v1/dashboard/stats").set("Authorization", recruiter).expect(200);
    expect(stats.body.data.pendingApplications).toBe(0);
  });

  it("8. le recruteur ne peut pas supprimer de données (403)", async () => {
    await client.delete(`/v1/candidates/${candidateId}`).set("Authorization", recruiter).expect(403);
    await client.delete(`/v1/jobs/${jobId}`).set("Authorization", recruiter).expect(403);
    expect(await prisma.candidate.count()).toBe(1);
  });

  it("9. l'admin archive le dossier : candidature, candidat, offre puis recruteur", async () => {
    await client.delete(`/v1/applications/${applicationId}`).set("Authorization", admin).expect(200);
    await client.delete(`/v1/candidates/${candidateId}`).set("Authorization", admin).expect(200);
    await client.delete(`/v1/jobs/${jobId}`).set("Authorization", admin).expect(200);
    await client.delete(`/v1/users/${recruiterId}`).set("Authorization", admin).expect(200);

    await client.get(`/v1/jobs/${jobId}`).set("Authorization", admin).expect(404);
  });

  it("10. le tableau de bord revient à l'état initial", async () => {
    const stats = await client.get("/v1/dashboard/stats").set("Authorization", admin).expect(200);
    expect(stats.body.data).toEqual({ users: 1, candidates: 0, jobs: 0, applications: 0, pendingApplications: 0 });
  });

  it("11. le token du recruteur supprimé ne donne plus accès à son profil", async () => {
    await client.get("/v1/auth/me").set("Authorization", recruiter).expect(404);
  });
});
