jest.mock("../../src/config/prisma", () => ({
  prisma: require("../helpers/prisma-mock").createPrismaMock(),
}));

import { api, db } from "../helpers/integration";
import { bearer } from "../helpers/auth";
import { applicationFixture, candidateFixture, jobFixture } from "../helpers/fixtures";

const ADMIN = bearer("ADMIN");
const RECRUITER = bearer("RECRUITER");
const application = { ...applicationFixture(), candidate: candidateFixture(), job: jobFixture() };
const include = { candidate: true, job: true };

describe("Candidatures — /v1/applications", () => {
  it("GET / liste les candidatures avec candidat et offre", async () => {
    db.application.findMany.mockResolvedValue([application]);
    db.application.count.mockResolvedValue(1);

    const res = await api().get("/v1/applications").set("Authorization", RECRUITER).expect(200);

    expect(db.application.findMany).toHaveBeenCalledWith(expect.objectContaining({ include }));
    expect(res.body.data[0]).toMatchObject({ candidate: { fullName: "Mamadou Bah" }, job: { company: "SouverainTech" } });
  });

  it("GET /:id renvoie 404 si la candidature n'existe pas", async () => {
    db.application.findUnique.mockResolvedValue(null);

    const res = await api().get("/v1/applications/missing").set("Authorization", RECRUITER).expect(404);
    expect(res.body.error.message).toBe("Candidature introuvable.");
  });

  it("POST / crée une candidature (statut optionnel)", async () => {
    db.application.create.mockResolvedValue(application);

    await api()
      .post("/v1/applications")
      .set("Authorization", RECRUITER)
      .send({ candidateId: "candidate-1", jobId: "job-1" })
      .expect(201);

    expect(db.application.create).toHaveBeenCalledWith({
      data: { candidateId: "candidate-1", jobId: "job-1" },
      include,
    });
  });

  it("POST / refuse un statut inconnu (400)", async () => {
    await api()
      .post("/v1/applications")
      .set("Authorization", RECRUITER)
      .send({ candidateId: "c", jobId: "j", status: "HIRED" })
      .expect(400);
  });

  it("PUT /:id exige un statut (400)", async () => {
    const res = await api().put("/v1/applications/application-1").set("Authorization", RECRUITER).send({}).expect(400);
    expect(res.body.error.details[0].field).toBe("status");
  });

  it("PUT /:id fait évoluer le statut de la candidature", async () => {
    db.application.findUnique.mockResolvedValue(application);
    db.application.update.mockResolvedValue({ ...application, status: "ACCEPTED" });

    const res = await api()
      .put("/v1/applications/application-1")
      .set("Authorization", RECRUITER)
      .send({ status: "ACCEPTED" })
      .expect(200);

    expect(db.application.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { status: "ACCEPTED" },
      include,
    });
    expect(res.body.data.status).toBe("ACCEPTED");
  });

  it("DELETE /:id est réservé à l'ADMIN", async () => {
    db.application.findUnique.mockResolvedValue(application);
    db.application.delete.mockResolvedValue(application);

    await api().delete("/v1/applications/application-1").set("Authorization", RECRUITER).expect(403);
    await api().delete("/v1/applications/application-1").set("Authorization", ADMIN).expect(200);
  });
});
