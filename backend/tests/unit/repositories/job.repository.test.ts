jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { prisma } from "../../../src/config/prisma";
import { JobRepository } from "../../../src/repositories/job.repository";
import { PrismaMock } from "../../helpers/prisma-mock";
import { jobFixture } from "../../helpers/fixtures";

const db = prisma as unknown as PrismaMock;
const repository = new JobRepository();
const job = jobFixture();

describe("JobRepository", () => {
  it("findAll pagine et compte le total", async () => {
    db.job.findMany.mockResolvedValue([job]);
    db.job.count.mockResolvedValue(3);

    await expect(repository.findAll(0, 1)).resolves.toEqual({ items: [job], total: 3 });
    expect(db.job.findMany).toHaveBeenCalledWith({ skip: 0, take: 1, orderBy: { createdAt: "desc" } });
  });

  it("findAll utilise les valeurs par défaut", async () => {
    db.job.findMany.mockResolvedValue([]);
    db.job.count.mockResolvedValue(0);

    await repository.findAll();
    expect(db.job.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });

  it("findById", async () => {
    db.job.findUnique.mockResolvedValue(job);

    await expect(repository.findById("job-1")).resolves.toBe(job);
    expect(db.job.findUnique).toHaveBeenCalledWith({ where: { id: "job-1" } });
  });

  it("create", async () => {
    db.job.create.mockResolvedValue(job);
    const data = { title: "T", description: "D", location: "L", company: "C", recruiter: { connect: { id: "u" } } };

    await expect(repository.create(data)).resolves.toBe(job);
    expect(db.job.create).toHaveBeenCalledWith({ data });
  });

  it("update", async () => {
    db.job.update.mockResolvedValue(job);

    await repository.update("job-1", { title: "Nouveau" });
    expect(db.job.update).toHaveBeenCalledWith({ where: { id: "job-1" }, data: { title: "Nouveau" } });
  });

  it("delete", async () => {
    db.job.delete.mockResolvedValue(job);

    await repository.delete("job-1");
    expect(db.job.delete).toHaveBeenCalledWith({ where: { id: "job-1" } });
  });
});
