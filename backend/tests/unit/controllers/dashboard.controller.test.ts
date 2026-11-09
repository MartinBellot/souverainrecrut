jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { dashboardController } from "../../../src/controllers/dashboard.controller";
import { DashboardService } from "../../../src/services/dashboard.service";
import { mockRequest, run } from "../../helpers/http";

describe("DashboardController", () => {
  it("getStatistics renvoie 200 et les statistiques", async () => {
    const stats = { users: 1, candidates: 2, jobs: 3, applications: 4, pendingApplications: 0 };
    jest.spyOn(DashboardService.prototype, "getStatistics").mockResolvedValue(stats);

    const { res } = await run(dashboardController.getStatistics, mockRequest());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: stats });
  });
});
