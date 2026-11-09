jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { healthController } from "../../../src/controllers/health.controller";
import { HealthService } from "../../../src/services/health.service";
import { mockRequest, run } from "../../helpers/http";

describe("HealthController", () => {
  it("health renvoie 200", async () => {
    const payload = { status: "UP" } as any;
    jest.spyOn(HealthService.prototype, "health").mockResolvedValue(payload);

    const { res } = await run(healthController.health, mockRequest());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: payload });
  });

  it("readiness renvoie 200 quand l'application est prête", async () => {
    const payload = { status: "READY", database: "CONNECTED", timestamp: "t" };
    jest.spyOn(HealthService.prototype, "readiness").mockResolvedValue(payload);

    const { res } = await run(healthController.readiness, mockRequest());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: payload });
  });

  it("readiness renvoie 503 quand la base est indisponible", async () => {
    const payload = { status: "NOT_READY", database: "DISCONNECTED", timestamp: "t" };
    jest.spyOn(HealthService.prototype, "readiness").mockResolvedValue(payload);

    const { res } = await run(healthController.readiness, mockRequest());

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ success: false, data: payload });
  });
});
