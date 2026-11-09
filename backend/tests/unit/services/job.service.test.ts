jest.mock("../../../src/repositories/job.repository");

import { JobService } from "../../../src/services/job.service";
import { JobRepository } from "../../../src/repositories/job.repository";
import { jobFixture } from "../../helpers/fixtures";

const repo = jest.mocked(JobRepository.prototype);
const job = jobFixture() as any;

describe("JobService", () => {
  let service: JobService;

  beforeEach(() => {
    service = new JobService();
  });

  it("getAll délègue au repository", async () => {
    repo.findAll.mockResolvedValue({ items: [job], total: 1 });

    await expect(service.getAll(10, 10)).resolves.toEqual({ items: [job], total: 1 });
    expect(repo.findAll).toHaveBeenCalledWith(10, 10);
  });

  it("getAll utilise les valeurs par défaut", async () => {
    repo.findAll.mockResolvedValue({ items: [], total: 0 });

    await service.getAll();
    expect(repo.findAll).toHaveBeenCalledWith(0, 10);
  });

  it("getById retourne l'offre", async () => {
    repo.findById.mockResolvedValue(job);
    await expect(service.getById("job-1")).resolves.toBe(job);
  });

  it("getById lève une 404 si absente", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById("x")).rejects.toMatchObject({ statusCode: 404, message: "Offre introuvable." });
  });

  it("create délègue au repository", async () => {
    repo.create.mockResolvedValue(job);
    const data = { ...job } as any;

    await expect(service.create(data)).resolves.toBe(job);
    expect(repo.create).toHaveBeenCalledWith(data);
  });

  it("update vérifie l'existence puis met à jour", async () => {
    repo.findById.mockResolvedValue(job);
    repo.update.mockResolvedValue({ ...job, title: "Nouveau" });

    await expect(service.update("job-1", { title: "Nouveau" })).resolves.toMatchObject({ title: "Nouveau" });
  });

  it("update lève une 404 si absente", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.update("x", {})).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("delete vérifie l'existence puis supprime", async () => {
    repo.findById.mockResolvedValue(job);
    repo.delete.mockResolvedValue(job);

    await expect(service.delete("job-1")).resolves.toBe(job);
    expect(repo.delete).toHaveBeenCalledWith("job-1");
  });

  it("delete lève une 404 si absente", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.delete("x")).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
