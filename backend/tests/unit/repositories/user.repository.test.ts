jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { prisma } from "../../../src/config/prisma";
import { publicUserSelect, UserRepository } from "../../../src/repositories/user.repository";
import { PrismaMock } from "../../helpers/prisma-mock";
import { userFixture } from "../../helpers/fixtures";

const db = prisma as unknown as PrismaMock;
const repository = new UserRepository();
const user = userFixture();

describe("UserRepository", () => {
  it("findAll pagine, trie par date décroissante et compte le total", async () => {
    db.user.findMany.mockResolvedValue([user]);
    db.user.count.mockResolvedValue(42);

    await expect(repository.findAll(20, 10)).resolves.toEqual({ items: [user], total: 42 });
    expect(db.user.findMany).toHaveBeenCalledWith({
      skip: 20,
      take: 10,
      orderBy: { createdAt: "desc" },
      select: publicUserSelect,
    });
  });

  it("findAll utilise skip=0 / take=10 par défaut", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);

    await repository.findAll();

    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
  });

  it("findById recherche par identifiant", async () => {
    db.user.findUnique.mockResolvedValue(user);

    await expect(repository.findById("user-1")).resolves.toBe(user);
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-1" }, select: publicUserSelect });
  });

  it("findByEmail recherche par email", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(repository.findByEmail("a@b.c")).resolves.toBeNull();
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: "a@b.c" } });
  });

  it("findProfile ne sélectionne jamais le mot de passe", async () => {
    db.user.findUnique.mockResolvedValue(user);

    await repository.findProfile("user-1");

    const { select } = db.user.findUnique.mock.calls[0][0];
    expect(select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    });
    expect(select.password).toBeUndefined();
  });

  it("create transmet les données à Prisma", async () => {
    db.user.create.mockResolvedValue(user);
    const data = { firstName: "A", lastName: "B", email: "e", password: "p" };

    await expect(repository.create(data)).resolves.toBe(user);
    expect(db.user.create).toHaveBeenCalledWith({ data, select: publicUserSelect });
  });

  it("update met à jour par identifiant", async () => {
    db.user.update.mockResolvedValue(user);

    await repository.update("user-1", { firstName: "Bob" });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { firstName: "Bob" },
      select: publicUserSelect,
    });
  });

  it("delete supprime par identifiant", async () => {
    db.user.delete.mockResolvedValue(user);

    await repository.delete("user-1");
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" }, select: publicUserSelect });
  });

  it("publicUserSelect n'expose pas le mot de passe", () => {
    expect(publicUserSelect).not.toHaveProperty("password");
  });

  it("findByEmail est la seule méthode qui lit le hash (authentification)", async () => {
    db.user.findUnique.mockResolvedValue(user);

    await repository.findByEmail("a@b.c");
    expect(db.user.findUnique.mock.calls[0][0]).not.toHaveProperty("select");
  });
});
