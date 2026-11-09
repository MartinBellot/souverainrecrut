jest.mock("../../src/config/prisma", () => ({
  prisma: require("../helpers/prisma-mock").createPrismaMock(),
}));

import { api, db } from "../helpers/integration";
import { bearer } from "../helpers/auth";

describe("Tableau de bord — /v1/dashboard/stats", () => {
  it("exige une authentification (401)", async () => {
    await api().get("/v1/dashboard/stats").expect(401);
  });

  it.each(["ADMIN", "RECRUITER"] as const)("renvoie les statistiques agrégées pour un %s", async (role) => {
    db.user.count.mockResolvedValue(2);
    db.candidate.count.mockResolvedValue(8);
    db.job.count.mockResolvedValue(3);
    db.application.count.mockResolvedValueOnce(10).mockResolvedValueOnce(4);

    const res = await api().get("/v1/dashboard/stats").set("Authorization", bearer(role)).expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { users: 2, candidates: 8, jobs: 3, applications: 10, pendingApplications: 4 },
    });
  });
});
