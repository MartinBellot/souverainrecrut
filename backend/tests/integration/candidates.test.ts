jest.mock("../../src/config/prisma", () => ({
  prisma: require("../helpers/prisma-mock").createPrismaMock(),
}));

import { api, db } from "../helpers/integration";
import { bearer } from "../helpers/auth";
import { candidateFixture } from "../helpers/fixtures";

const ADMIN = bearer("ADMIN");
const RECRUITER = bearer("RECRUITER");
const candidate = candidateFixture();

describe("Candidats — /v1/candidates", () => {
  it("exige une authentification (401)", async () => {
    await api().get("/v1/candidates").expect(401);
  });

  it("GET / liste les candidats (RECRUITER autorisé)", async () => {
    db.candidate.findMany.mockResolvedValue([candidate]);
    db.candidate.count.mockResolvedValue(1);

    const res = await api().get("/v1/candidates").set("Authorization", RECRUITER).expect(200);

    expect(res.body).toMatchObject({ success: true, pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    expect(res.body.data[0].email).toBe(candidate.email);
  });

  it("GET /:id renvoie 404 si le candidat n'existe pas", async () => {
    db.candidate.findUnique.mockResolvedValue(null);

    const res = await api().get("/v1/candidates/missing").set("Authorization", RECRUITER).expect(404);
    expect(res.body.error.message).toBe("Candidat introuvable.");
  });

  it("POST / normalise les données (trim, email en minuscules) avant l'enregistrement", async () => {
    db.candidate.findUnique.mockResolvedValue(null);
    db.candidate.create.mockImplementation(async ({ data }: any) => ({ ...candidate, ...data }));

    await api()
      .post("/v1/candidates")
      .set("Authorization", RECRUITER)
      .send({ fullName: "  Fatou Sylla ", email: "Fatou@Example.com" })
      .expect(201);

    expect(db.candidate.findUnique).toHaveBeenCalledWith({ where: { email: "fatou@example.com" } });
    expect(db.candidate.create).toHaveBeenCalledWith({
      data: { fullName: "Fatou Sylla", email: "fatou@example.com" },
    });
  });

  it("POST / refuse un email déjà enregistré (409)", async () => {
    db.candidate.findUnique.mockResolvedValue(candidate);

    await api()
      .post("/v1/candidates")
      .set("Authorization", RECRUITER)
      .send({ fullName: "Mamadou Bah", email: candidate.email })
      .expect(409);
  });

  it("POST / valide le corps de la requête (400)", async () => {
    const res = await api()
      .post("/v1/candidates")
      .set("Authorization", RECRUITER)
      .send({ fullName: "Al", email: "nope", phone: "123" })
      .expect(400);

    expect(res.body.error.details).toHaveLength(3);
  });

  it("PUT /:id met à jour partiellement un candidat", async () => {
    db.candidate.findUnique.mockResolvedValue(candidate);
    db.candidate.update.mockResolvedValue({ ...candidate, phone: "+224699999999" });

    const res = await api()
      .put("/v1/candidates/candidate-1")
      .set("Authorization", RECRUITER)
      .send({ phone: "+224699999999" })
      .expect(200);

    expect(res.body.data.phone).toBe("+224699999999");
  });

  it("DELETE /:id est interdit à un RECRUITER (403)", async () => {
    await api().delete("/v1/candidates/candidate-1").set("Authorization", RECRUITER).expect(403);
    expect(db.candidate.delete).not.toHaveBeenCalled();
  });

  it("DELETE /:id supprime le candidat pour un ADMIN", async () => {
    db.candidate.findUnique.mockResolvedValue(candidate);
    db.candidate.delete.mockResolvedValue(candidate);

    await api().delete("/v1/candidates/candidate-1").set("Authorization", ADMIN).expect(200);
    expect(db.candidate.delete).toHaveBeenCalledWith({ where: { id: "candidate-1" } });
  });
});
