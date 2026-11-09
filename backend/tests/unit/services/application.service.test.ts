jest.mock("../../../src/repositories/application.repository");

import { ApplicationService } from "../../../src/services/application.service";
import { ApplicationRepository } from "../../../src/repositories/application.repository";
import { applicationFixture } from "../../helpers/fixtures";

const repo = jest.mocked(ApplicationRepository.prototype);
const application = applicationFixture() as any;

describe("ApplicationService", () => {
  let service: ApplicationService;

  beforeEach(() => {
    service = new ApplicationService();
  });

  it("getAll délègue au repository", async () => {
    repo.findAll.mockResolvedValue({ items: [application], total: 1 });

    await expect(service.getAll(0, 5)).resolves.toEqual({ items: [application], total: 1 });
    expect(repo.findAll).toHaveBeenCalledWith(0, 5);
  });

  it("getAll utilise les valeurs par défaut", async () => {
    repo.findAll.mockResolvedValue({ items: [], total: 0 });

    await service.getAll();
    expect(repo.findAll).toHaveBeenCalledWith(0, 10);
  });

  it("getById retourne la candidature", async () => {
    repo.findById.mockResolvedValue(application);
    await expect(service.getById("application-1")).resolves.toBe(application);
  });

  it("getById lève une 404 si absente", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById("x")).rejects.toMatchObject({
      statusCode: 404,
      message: "Candidature introuvable.",
    });
  });

  it("create délègue au repository", async () => {
    repo.create.mockResolvedValue(application);
    const data = { candidateId: "c", jobId: "j" } as any;

    await expect(service.create(data)).resolves.toBe(application);
    expect(repo.create).toHaveBeenCalledWith(data);
  });

  it("update vérifie l'existence puis met à jour", async () => {
    repo.findById.mockResolvedValue(application);
    repo.update.mockResolvedValue({ ...application, status: "REVIEWED" });

    await expect(service.update("application-1", { status: "REVIEWED" })).resolves.toMatchObject({
      status: "REVIEWED",
    });
  });

  it("update lève une 404 si absente", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.update("x", {})).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updateStatus vérifie l'existence puis met à jour le statut", async () => {
    repo.findById.mockResolvedValue(application);
    repo.updateStatus.mockResolvedValue({ ...application, status: "ACCEPTED" });

    await expect(service.updateStatus("application-1", "ACCEPTED")).resolves.toMatchObject({
      status: "ACCEPTED",
    });
    expect(repo.updateStatus).toHaveBeenCalledWith("application-1", "ACCEPTED");
  });

  it("updateStatus lève une 404 si absente", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.updateStatus("x", "REJECTED")).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it("delete vérifie l'existence puis supprime", async () => {
    repo.findById.mockResolvedValue(application);
    repo.delete.mockResolvedValue(application);

    await expect(service.delete("application-1")).resolves.toBe(application);
  });

  it("delete lève une 404 si absente", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.delete("x")).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
