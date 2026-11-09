jest.mock("../../../src/repositories/dashboard.repository");

import { DashboardService } from "../../../src/services/dashboard.service";
import { DashboardRepository } from "../../../src/repositories/dashboard.repository";

const repo = jest.mocked(DashboardRepository.prototype);

describe("DashboardService", () => {
  it("retourne les statistiques du repository", async () => {
    const stats = { users: 1, candidates: 2, jobs: 3, applications: 4, pendingApplications: 1 };
    repo.getStatistics.mockResolvedValue(stats);

    await expect(new DashboardService().getStatistics()).resolves.toEqual(stats);
  });
});
