jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { prisma } from "../../../src/config/prisma";
import { CandidateRepository } from "../../../src/repositories/candidate.repository";
import { PrismaMock } from "../../helpers/prisma-mock";
import { candidateFixture } from "../../helpers/fixtures";

const db = prisma as unknown as PrismaMock;
const repository = new CandidateRepository();
const candidate = candidateFixture();

describe("CandidateRepository", () => {
  it("findAll pagine et compte le total", async () => {
    db.candidate.findMany.mockResolvedValue([candidate]);
    db.candidate.count.mockResolvedValue(1);

    await expect(repository.findAll(5, 5)).resolves.toEqual({ items: [candidate], total: 1 });
    expect(db.candidate.findMany).toHaveBeenCalledWith({ skip: 5, take: 5, orderBy: { createdAt: "desc" } });
  });

  it("findAll utilise les valeurs par défaut", async () => {
    db.candidate.findMany.mockResolvedValue([]);
    db.candidate.count.mockResolvedValue(0);

    await repository.findAll();
    expect(db.candidate.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });

  it("findById", async () => {
    db.candidate.findUnique.mockResolvedValue(candidate);

    await expect(repository.findById("candidate-1")).resolves.toBe(candidate);
    expect(db.candidate.findUnique).toHaveBeenCalledWith({ where: { id: "candidate-1" } });
  });

  it("findByEmail", async () => {
    db.candidate.findUnique.mockResolvedValue(candidate);

    await repository.findByEmail("mamadou@example.com");
    expect(db.candidate.findUnique).toHaveBeenCalledWith({ where: { email: "mamadou@example.com" } });
  });

  it("create", async () => {
    db.candidate.create.mockResolvedValue(candidate);
    const data = { fullName: "X Y Z", email: "x@y.z" };

    await expect(repository.create(data)).resolves.toBe(candidate);
    expect(db.candidate.create).toHaveBeenCalledWith({ data });
  });

  it("update", async () => {
    db.candidate.update.mockResolvedValue(candidate);

    await repository.update("candidate-1", { phone: "123456789" });
    expect(db.candidate.update).toHaveBeenCalledWith({ where: { id: "candidate-1" }, data: { phone: "123456789" } });
  });

  it("delete", async () => {
    db.candidate.delete.mockResolvedValue(candidate);

    await repository.delete("candidate-1");
    expect(db.candidate.delete).toHaveBeenCalledWith({ where: { id: "candidate-1" } });
  });
});
