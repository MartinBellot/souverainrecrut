jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { prisma } from "../../../src/config/prisma";
import { HealthService } from "../../../src/services/health.service";
import { PrismaMock } from "../../helpers/prisma-mock";

const db = prisma as unknown as PrismaMock;
const service = new HealthService();

describe("HealthService", () => {
  it("health retourne UP avec uptime, timestamp ISO et environnement", async () => {
    const result = await service.health();

    expect(result).toMatchObject({ status: "UP", environment: "test" });
    expect(typeof result.uptime).toBe("number");
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it("readiness retourne READY quand la base répond", async () => {
    db.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    await expect(service.readiness()).resolves.toMatchObject({ status: "READY", database: "CONNECTED" });
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("readiness retourne NOT_READY quand la base est injoignable", async () => {
    db.$queryRaw.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(service.readiness()).resolves.toMatchObject({
      status: "NOT_READY",
      database: "DISCONNECTED",
    });
  });
});
