jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { prisma } from "../../../src/config/prisma";
import { DashboardRepository } from "../../../src/repositories/dashboard.repository";
import { PrismaMock } from "../../helpers/prisma-mock";

const db = prisma as unknown as PrismaMock;

describe("DashboardRepository", () => {
  it("agrège les compteurs de chaque entité et des candidatures en attente", async () => {
    db.user.count.mockResolvedValue(3);
    db.candidate.count.mockResolvedValue(10);
    db.job.count.mockResolvedValue(4);
    db.application.count.mockResolvedValueOnce(12).mockResolvedValueOnce(5);

    await expect(new DashboardRepository().getStatistics()).resolves.toEqual({
      users: 3,
      candidates: 10,
      jobs: 4,
      applications: 12,
      pendingApplications: 5,
    });
    expect(db.application.count).toHaveBeenNthCalledWith(1);
    expect(db.application.count).toHaveBeenNthCalledWith(2, { where: { status: "PENDING" } });
  });
});
