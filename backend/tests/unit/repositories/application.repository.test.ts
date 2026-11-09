jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { prisma } from "../../../src/config/prisma";
import { ApplicationRepository } from "../../../src/repositories/application.repository";
import { PrismaMock } from "../../helpers/prisma-mock";
import { applicationFixture } from "../../helpers/fixtures";

const db = prisma as unknown as PrismaMock;
const repository = new ApplicationRepository();
const application = applicationFixture();
const include = { candidate: true, job: true };

describe("ApplicationRepository", () => {
  it("findAll pagine, inclut candidat et offre, et compte le total", async () => {
    db.application.findMany.mockResolvedValue([application]);
    db.application.count.mockResolvedValue(7);

    await expect(repository.findAll(10, 5)).resolves.toEqual({ items: [application], total: 7 });
    expect(db.application.findMany).toHaveBeenCalledWith({
      skip: 10,
      take: 5,
      orderBy: { createdAt: "desc" },
      include,
    });
  });

  it("findAll utilise les valeurs par défaut", async () => {
    db.application.findMany.mockResolvedValue([]);
    db.application.count.mockResolvedValue(0);

    await repository.findAll();
    expect(db.application.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });

  it("findById inclut les relations", async () => {
    db.application.findUnique.mockResolvedValue(application);

    await expect(repository.findById("application-1")).resolves.toBe(application);
    expect(db.application.findUnique).toHaveBeenCalledWith({ where: { id: "application-1" }, include });
  });

  it("create inclut les relations", async () => {
    db.application.create.mockResolvedValue(application);
    const data = { candidate: { connect: { id: "c" } }, job: { connect: { id: "j" } } };

    await repository.create(data);
    expect(db.application.create).toHaveBeenCalledWith({ data, include });
  });

  it("update inclut les relations", async () => {
    db.application.update.mockResolvedValue(application);

    await repository.update("application-1", { status: "REVIEWED" });
    expect(db.application.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { status: "REVIEWED" },
      include,
    });
  });

  it("updateStatus ne modifie que le statut", async () => {
    db.application.update.mockResolvedValue(application);

    await repository.updateStatus("application-1", "ACCEPTED");
    expect(db.application.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { status: "ACCEPTED" },
      include,
    });
  });

  it("delete", async () => {
    db.application.delete.mockResolvedValue(application);

    await repository.delete("application-1");
    expect(db.application.delete).toHaveBeenCalledWith({ where: { id: "application-1" } });
  });
});
