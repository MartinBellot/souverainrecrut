jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { prisma } from "../../../src/config/prisma";
import { BaseRepository } from "../../../src/repositories/base.repository";

class TestRepository extends BaseRepository {
  client() {
    return this.prisma;
  }
}

describe("BaseRepository", () => {
  it("partage l'instance Prisma singleton avec ses sous-classes", () => {
    expect(new TestRepository().client()).toBe(prisma);
  });
});
