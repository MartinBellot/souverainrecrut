import { Prisma } from "@prisma/client";

import { errorMiddleware } from "../../../src/middlewares/error.middleware";
import { AppError } from "../../../src/errors/app.error";
import { mockRequest, mockResponse } from "../../helpers/http";

describe("errorMiddleware", () => {
  it("formate une AppError avec son code HTTP", () => {
    const res = mockResponse();

    errorMiddleware(new AppError("Offre introuvable.", 404), mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { status: 404, message: "Offre introuvable." },
    });
  });

  it.each([
    ["P2002", 409, "Une ressource avec ces valeurs existe déjà."],
    ["P2003", 400, "Une ressource liée est introuvable."],
    ["P2025", 404, "Ressource introuvable."],
  ])("traduit l'erreur Prisma %s en HTTP %i", (code, status, message) => {
    const res = mockResponse();
    const error = new Prisma.PrismaClientKnownRequestError("db error", { code, clientVersion: "test" });

    errorMiddleware(error, mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { status, message } });
  });

  it("renvoie 500 pour une erreur Prisma non répertoriée", () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const res = mockResponse();
    const error = new Prisma.PrismaClientKnownRequestError("db error", { code: "P1001", clientVersion: "test" });

    errorMiddleware(error, mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it.each([
    ["entity.parse.failed", 400],
    ["entity.too.large", 413],
  ])("traduit l'erreur body-parser %s en HTTP %i", (type, status) => {
    const res = mockResponse();

    errorMiddleware(Object.assign(new Error("bp"), { type }), mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(status);
  });

  it("masque les erreurs inattendues derrière une 500 et les journalise", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const res = mockResponse();
    const error = new Error("database exploded");

    errorMiddleware(error, mockRequest(), res, jest.fn());

    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { status: 500, message: "Erreur interne du serveur." },
    });
  });
});
