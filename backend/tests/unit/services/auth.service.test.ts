jest.mock("../../../src/repositories/user.repository");
jest.mock("bcrypt", () => ({ compare: jest.fn() }));

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { AuthService } from "../../../src/services/auth.service";
import { UserRepository } from "../../../src/repositories/user.repository";
import { userFixture } from "../../helpers/fixtures";

const repo = jest.mocked(UserRepository.prototype);
const compare = bcrypt.compare as unknown as jest.Mock;
const user = userFixture() as any;

describe("AuthService.login", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  it("retourne un JWT valide (id + rôle, expiration 1 jour) et l'utilisateur sans mot de passe", async () => {
    repo.findByEmail.mockResolvedValue(user);
    compare.mockResolvedValue(true);

    const result = await service.login(user.email, "password123");

    expect(compare).toHaveBeenCalledWith("password123", user.password);
    expect(result.user).not.toHaveProperty("password");
    expect(result.user).toMatchObject({ id: user.id, email: user.email });

    const decoded = jwt.verify(result.token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    expect(decoded).toMatchObject({ id: user.id, role: user.role });
    expect(decoded.exp! - decoded.iat!).toBe(24 * 60 * 60);
  });

  it("lève une 401 générique si l'email est inconnu", async () => {
    repo.findByEmail.mockResolvedValue(null);

    await expect(service.login("ghost@x.com", "whatever")).rejects.toMatchObject({
      statusCode: 401,
      message: "Email ou mot de passe invalide.",
    });
    expect(compare).not.toHaveBeenCalled();
  });

  it("lève la même 401 générique si le mot de passe est faux (pas d'énumération)", async () => {
    repo.findByEmail.mockResolvedValue(user);
    compare.mockResolvedValue(false);

    await expect(service.login(user.email, "wrong")).rejects.toMatchObject({
      statusCode: 401,
      message: "Email ou mot de passe invalide.",
    });
  });
});
