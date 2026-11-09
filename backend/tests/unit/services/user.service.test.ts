jest.mock("../../../src/repositories/user.repository");
jest.mock("bcrypt", () => ({ hash: jest.fn() }));

import bcrypt from "bcrypt";

import { UserService } from "../../../src/services/user.service";
import { UserRepository } from "../../../src/repositories/user.repository";
import { AppError } from "../../../src/errors/app.error";
import { userFixture } from "../../helpers/fixtures";

const repo = jest.mocked(UserRepository.prototype);
const hash = bcrypt.hash as unknown as jest.Mock;
const user = userFixture() as any;

describe("UserService", () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it("getAll délègue la pagination au repository", async () => {
    repo.findAll.mockResolvedValue({ items: [user], total: 1 });

    await expect(service.getAll(10, 5)).resolves.toEqual({ items: [user], total: 1 });
    expect(repo.findAll).toHaveBeenCalledWith(10, 5);
  });

  it("getAll utilise les valeurs par défaut", async () => {
    repo.findAll.mockResolvedValue({ items: [], total: 0 });

    await service.getAll();
    expect(repo.findAll).toHaveBeenCalledWith(0, 10);
  });

  describe("getById", () => {
    it("retourne l'utilisateur trouvé", async () => {
      repo.findById.mockResolvedValue(user);
      await expect(service.getById("user-1")).resolves.toBe(user);
    });

    it("lève une 404 si l'utilisateur n'existe pas", async () => {
      repo.findById.mockResolvedValue(null);

      const promise = service.getById("missing");
      await expect(promise).rejects.toBeInstanceOf(AppError);
      await expect(promise).rejects.toMatchObject({ statusCode: 404, message: "Utilisateur introuvable." });
    });
  });

  describe("getProfile", () => {
    it("retourne le profil sans mot de passe", async () => {
      const { password, ...profile } = user;
      repo.findProfile.mockResolvedValue(profile);

      await expect(service.getProfile("user-1")).resolves.toEqual(profile);
      expect(repo.findProfile).toHaveBeenCalledWith("user-1");
    });

    it("lève une 404 si le profil n'existe pas", async () => {
      repo.findProfile.mockResolvedValue(null);
      await expect(service.getProfile("missing")).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("create", () => {
    const input = { firstName: "Bob", lastName: "Camara", email: "bob@x.com", password: "password123" };

    it("hache le mot de passe (coût 10) avant l'enregistrement", async () => {
      repo.findByEmail.mockResolvedValue(null);
      hash.mockResolvedValue("hashed!");
      repo.create.mockResolvedValue(user);

      await expect(service.create(input)).resolves.toBe(user);
      expect(hash).toHaveBeenCalledWith("password123", 10);
      expect(repo.create).toHaveBeenCalledWith({ ...input, password: "hashed!" });
    });

    it("lève une 409 si l'email est déjà utilisé", async () => {
      repo.findByEmail.mockResolvedValue(user);

      await expect(service.create(input)).rejects.toMatchObject({
        statusCode: 409,
        message: "Cet email est déjà utilisé.",
      });
      expect(hash).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("vérifie l'existence puis met à jour", async () => {
      repo.findById.mockResolvedValue(user);
      repo.update.mockResolvedValue({ ...user, firstName: "Bob" });

      await expect(service.update("user-1", { firstName: "Bob" })).resolves.toMatchObject({ firstName: "Bob" });
      expect(repo.update).toHaveBeenCalledWith("user-1", { firstName: "Bob" });
    });

    it("ne met pas à jour un utilisateur inexistant", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update("missing", {})).rejects.toMatchObject({ statusCode: 404 });
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe("update — sécurité", () => {
    beforeEach(() => repo.findById.mockResolvedValue(user));

    it("hache un nouveau mot de passe avant l'enregistrement", async () => {
      hash.mockResolvedValue("new-hash");
      repo.update.mockResolvedValue(user);

      await service.update("user-1", { password: "NewPassword1" });

      expect(hash).toHaveBeenCalledWith("NewPassword1", 10);
      expect(repo.update).toHaveBeenCalledWith("user-1", { password: "new-hash" });
    });

    it("refuse un email déjà utilisé par un autre utilisateur (409)", async () => {
      repo.findByEmail.mockResolvedValue(userFixture({ id: "other" }) as any);

      await expect(service.update("user-1", { email: "taken@x.com" })).rejects.toMatchObject({ statusCode: 409 });
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("accepte de conserver son propre email", async () => {
      repo.findByEmail.mockResolvedValue(user);
      repo.update.mockResolvedValue(user);

      await service.update("user-1", { email: user.email });
      expect(repo.update).toHaveBeenCalledWith("user-1", { email: user.email });
    });

    it("ne vérifie ni ne hache rien pour une mise à jour sans email ni mot de passe", async () => {
      repo.update.mockResolvedValue(user);

      await service.update("user-1", { role: "ADMIN" });
      expect(repo.findByEmail).not.toHaveBeenCalled();
      expect(hash).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("vérifie l'existence puis supprime", async () => {
      repo.findById.mockResolvedValue(user);
      repo.delete.mockResolvedValue(user);

      await expect(service.delete("user-1")).resolves.toBe(user);
      expect(repo.delete).toHaveBeenCalledWith("user-1");
    });

    it("ne supprime pas un utilisateur inexistant", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete("missing")).rejects.toMatchObject({ statusCode: 404 });
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
