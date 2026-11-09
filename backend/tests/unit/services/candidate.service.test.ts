jest.mock("../../../src/repositories/candidate.repository");

import { CandidateService } from "../../../src/services/candidate.service";
import { CandidateRepository } from "../../../src/repositories/candidate.repository";
import { candidateFixture } from "../../helpers/fixtures";

const repo = jest.mocked(CandidateRepository.prototype);
const candidate = candidateFixture() as any;

describe("CandidateService", () => {
  let service: CandidateService;

  beforeEach(() => {
    service = new CandidateService();
  });

  it("getAll délègue au repository", async () => {
    repo.findAll.mockResolvedValue({ items: [candidate], total: 1 });

    await expect(service.getAll(0, 20)).resolves.toEqual({ items: [candidate], total: 1 });
    expect(repo.findAll).toHaveBeenCalledWith(0, 20);
  });

  it("getAll utilise les valeurs par défaut", async () => {
    repo.findAll.mockResolvedValue({ items: [], total: 0 });

    await service.getAll();
    expect(repo.findAll).toHaveBeenCalledWith(0, 10);
  });

  it("getById retourne le candidat", async () => {
    repo.findById.mockResolvedValue(candidate);
    await expect(service.getById("candidate-1")).resolves.toBe(candidate);
  });

  it("getById lève une 404 si absent", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById("x")).rejects.toMatchObject({ statusCode: 404, message: "Candidat introuvable." });
  });

  it("create enregistre un nouveau candidat", async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockResolvedValue(candidate);
    const data = { fullName: "Mamadou Bah", email: "mamadou@example.com" };

    await expect(service.create(data)).resolves.toBe(candidate);
    expect(repo.findByEmail).toHaveBeenCalledWith("mamadou@example.com");
    expect(repo.create).toHaveBeenCalledWith(data);
  });

  it("create lève une 409 si l'email existe déjà", async () => {
    repo.findByEmail.mockResolvedValue(candidate);

    await expect(service.create({ fullName: "X", email: "mamadou@example.com" })).rejects.toMatchObject({
      statusCode: 409,
      message: "Un candidat avec cet email existe déjà.",
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("update vérifie l'existence puis met à jour", async () => {
    repo.findById.mockResolvedValue(candidate);
    repo.update.mockResolvedValue(candidate);

    await service.update("candidate-1", { phone: "+224000000" });
    expect(repo.update).toHaveBeenCalledWith("candidate-1", { phone: "+224000000" });
  });

  it("update lève une 404 si absent", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.update("x", {})).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("delete vérifie l'existence puis supprime", async () => {
    repo.findById.mockResolvedValue(candidate);
    repo.delete.mockResolvedValue(candidate);

    await expect(service.delete("candidate-1")).resolves.toBe(candidate);
  });

  it("delete lève une 404 si absent", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.delete("x")).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
