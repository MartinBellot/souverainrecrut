jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({ __mock: true })),
}));

import { PrismaClient } from "@prisma/client";
import { prisma } from "../../../src/config/prisma";

// Capturé au chargement, avant que clearMocks ne remette les compteurs à zéro.
const constructorCalls = (PrismaClient as unknown as jest.Mock).mock.calls.length;

describe("config/prisma", () => {
  it("expose une instance de PrismaClient", () => {
    expect(prisma).toEqual({ __mock: true });
  });

  it("ne crée qu'une seule instance (singleton) même si le module est réimporté", () => {
    const again = require("../../../src/config/prisma").prisma;

    expect(again).toBe(prisma);
    expect(constructorCalls).toBe(1);
    expect(PrismaClient).not.toHaveBeenCalled();
  });
});
