jest.mock("../../src/config/prisma", () => ({
  prisma: require("../helpers/prisma-mock").createPrismaMock(),
}));

import { Prisma } from "@prisma/client";

import { api, db } from "../helpers/integration";
import { bearer } from "../helpers/auth";
import { jobFixture } from "../helpers/fixtures";

const ADMIN = bearer("ADMIN");
const RECRUITER = bearer("RECRUITER");
const job = jobFixture();
const { id, createdAt, updatedAt, ...newJob } = job;

describe("Offres d'emploi — /v1/jobs", () => {
  it("rejette un en-tête Authorization mal formé (401)", async () => {
    await api().get("/v1/jobs").set("Authorization", "Token abc").expect(401);
  });

  it("GET / borne la limite de pagination à 100", async () => {
    db.job.findMany.mockResolvedValue([]);
    db.job.count.mockResolvedValue(0);

    const res = await api().get("/v1/jobs?limit=1000").set("Authorization", RECRUITER).expect(200);

    expect(db.job.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    expect(res.body.pagination.limit).toBe(100);
  });

  it("GET / ignore des paramètres de pagination non numériques", async () => {
    db.job.findMany.mockResolvedValue([]);
    db.job.count.mockResolvedValue(0);

    const res = await api().get("/v1/jobs?page=abc&limit=xyz").set("Authorization", RECRUITER).expect(200);

    expect(db.job.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
  });

  it("POST / renvoie 400 si le recruteur référencé n'existe pas (clé étrangère)", async () => {
    db.job.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003", clientVersion: "test" })
    );

    const res = await api().post("/v1/jobs").set("Authorization", RECRUITER).send(newJob).expect(400);
    expect(res.body.error.message).toBe("Une ressource liée est introuvable.");
  });

  it("GET /:id renvoie l'offre", async () => {
    db.job.findUnique.mockResolvedValue(job);

    const res = await api().get("/v1/jobs/job-1").set("Authorization", RECRUITER).expect(200);
    expect(res.body.data).toMatchObject({ id: "job-1", title: job.title });
  });

  it("POST / crée une offre", async () => {
    db.job.create.mockResolvedValue(job);

    await api().post("/v1/jobs").set("Authorization", RECRUITER).send(newJob).expect(201);
    expect(db.job.create).toHaveBeenCalledWith({ data: newJob });
  });

  it("POST / valide le corps de la requête (400)", async () => {
    const res = await api()
      .post("/v1/jobs")
      .set("Authorization", RECRUITER)
      .send({ title: "Dev" })
      .expect(400);

    expect(res.body.error.details.map((d: any) => d.field)).toEqual(
      expect.arrayContaining(["description", "location", "company", "recruiterId"])
    );
  });

  it("PUT /:id renvoie 404 si l'offre n'existe pas", async () => {
    db.job.findUnique.mockResolvedValue(null);

    await api().put("/v1/jobs/missing").set("Authorization", RECRUITER).send({ title: "Nouveau titre" }).expect(404);
    expect(db.job.update).not.toHaveBeenCalled();
  });

  it("PUT /:id met à jour l'offre", async () => {
    db.job.findUnique.mockResolvedValue(job);
    db.job.update.mockResolvedValue({ ...job, location: "Kindia" });

    const res = await api().put("/v1/jobs/job-1").set("Authorization", ADMIN).send({ location: "Kindia" }).expect(200);
    expect(res.body.data.location).toBe("Kindia");
  });

  it("DELETE /:id est réservé à l'ADMIN", async () => {
    db.job.findUnique.mockResolvedValue(job);
    db.job.delete.mockResolvedValue(job);

    await api().delete("/v1/jobs/job-1").set("Authorization", RECRUITER).expect(403);
    await api().delete("/v1/jobs/job-1").set("Authorization", ADMIN).expect(200);
    expect(db.job.delete).toHaveBeenCalledTimes(1);
  });
});
