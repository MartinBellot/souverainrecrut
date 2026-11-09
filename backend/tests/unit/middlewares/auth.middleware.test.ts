import jwt from "jsonwebtoken";

import { authMiddleware } from "../../../src/middlewares/auth.middleware";
import { AppError } from "../../../src/errors/app.error";
import { mockRequest, mockResponse } from "../../helpers/http";
import { tokenFor } from "../../helpers/auth";

const callWith = (authorization?: string) => {
  const req = mockRequest({ headers: authorization ? { authorization } : {} });
  const next = jest.fn();
  authMiddleware(req, mockResponse(), next);
  return { req, error: next.mock.calls[0][0] as AppError | undefined };
};

describe("authMiddleware", () => {
  it("refuse une requête sans en-tête Authorization (401)", () => {
    const { error } = callWith();

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 401, message: "Authentification requise." });
  });

  it("refuse un schéma autre que Bearer", () => {
    expect(callWith("Basic abc").error).toMatchObject({ statusCode: 401, message: "Token invalide." });
  });

  it("refuse un Bearer sans token", () => {
    expect(callWith("Bearer").error).toMatchObject({ statusCode: 401, message: "Token invalide." });
  });

  it("refuse un token signé avec un autre secret", () => {
    const forged = jwt.sign({ id: "x", role: "ADMIN" }, "wrong-secret");

    expect(callWith(`Bearer ${forged}`).error).toMatchObject({
      statusCode: 401,
      message: "Token invalide ou expiré.",
    });
  });

  it("refuse un token expiré", () => {
    const expired = jwt.sign({ id: "x", role: "ADMIN" }, process.env.JWT_SECRET as string, {
      expiresIn: -10,
    });

    expect(callWith(`Bearer ${expired}`).error).toMatchObject({ statusCode: 401 });
  });

  it("accepte un token valide et attache l'utilisateur à la requête", () => {
    const { req, error } = callWith(`Bearer ${tokenFor("ADMIN", "admin-42")}`);

    expect(error).toBeUndefined();
    expect(req.user).toEqual({ id: "admin-42", role: "ADMIN" });
  });
});
