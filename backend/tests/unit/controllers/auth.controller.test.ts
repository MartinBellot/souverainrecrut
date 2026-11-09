jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { authController } from "../../../src/controllers/auth.controller";
import { AuthService } from "../../../src/services/auth.service";
import { UserService } from "../../../src/services/user.service";
import { AppError } from "../../../src/errors/app.error";
import { mockRequest, run } from "../../helpers/http";

describe("AuthController", () => {
  it("login renvoie 200 avec le token et l'utilisateur", async () => {
    const result = { user: { id: "1" }, token: "jwt" } as any;
    const spy = jest.spyOn(AuthService.prototype, "login").mockResolvedValue(result);

    const { res } = await run(
      authController.login,
      mockRequest({ body: { email: "a@b.c", password: "secret123" } })
    );

    expect(spy).toHaveBeenCalledWith("a@b.c", "secret123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
  });

  it("login transmet l'erreur d'authentification à next()", async () => {
    const error = new AppError("Email ou mot de passe invalide.", 401);
    jest.spyOn(AuthService.prototype, "login").mockRejectedValue(error);

    const { next } = await run(authController.login, mockRequest({ body: {} }));

    expect(next).toHaveBeenCalledWith(error);
  });

  it("me renvoie le profil de l'utilisateur authentifié", async () => {
    const profile = { id: "user-1", email: "a@b.c" } as any;
    const spy = jest.spyOn(UserService.prototype, "getProfile").mockResolvedValue(profile);

    const { res } = await run(
      authController.me,
      mockRequest({ user: { id: "user-1", role: "ADMIN" } } as any)
    );

    expect(spy).toHaveBeenCalledWith("user-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: profile });
  });
});
