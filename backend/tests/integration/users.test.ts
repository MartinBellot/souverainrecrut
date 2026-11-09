jest.mock("../../src/config/prisma", () => ({
  prisma: require("../helpers/prisma-mock").createPrismaMock(),
}));

import bcrypt from "bcrypt";

import { api, db } from "../helpers/integration";
import { bearer } from "../helpers/auth";
import { userFixture } from "../helpers/fixtures";

const ADMIN = bearer("ADMIN");
const RECRUITER = bearer("RECRUITER");
const user = userFixture();
const newUser = { firstName: "Bob", lastName: "Camara", email: "bob@x.com", password: "password123" };

describe("Utilisateurs — /v1/users (réservé ADMIN)", () => {
  it.each([
    ["get", "/v1/users"],
    ["get", "/v1/users/user-1"],
    ["post", "/v1/users"],
    ["put", "/v1/users/user-1"],
    ["delete", "/v1/users/user-1"],
  ] as const)("%s %s est interdit à un RECRUITER (403)", async (method, url) => {
    await api()[method](url).set("Authorization", RECRUITER).send({}).expect(403);
  });

  it("GET / liste les utilisateurs avec pagination", async () => {
    db.user.findMany.mockResolvedValue([user]);
    db.user.count.mockResolvedValue(11);

    const res = await api().get("/v1/users?page=2&limit=5").set("Authorization", ADMIN).expect(200);

    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
    expect(res.body.pagination).toEqual({ page: 2, limit: 5, total: 11, totalPages: 3 });
    expect(res.body.data).toHaveLength(1);
  });

  it("POST / crée un utilisateur avec un mot de passe haché", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockImplementation(async ({ data }: any) => ({ ...user, ...data }));

    await api().post("/v1/users").set("Authorization", ADMIN).send(newUser).expect(201);

    const stored = db.user.create.mock.calls[0][0].data;
    expect(stored.password).not.toBe(newUser.password);
    expect(await bcrypt.compare(newUser.password, stored.password)).toBe(true);
  });

  it("POST / refuse un email déjà utilisé (409)", async () => {
    db.user.findUnique.mockResolvedValue(user);

    await api().post("/v1/users").set("Authorization", ADMIN).send(newUser).expect(409);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("POST / valide le corps de la requête (400)", async () => {
    const res = await api()
      .post("/v1/users")
      .set("Authorization", ADMIN)
      .send({ ...newUser, email: "bad", password: "123" })
      .expect(400);

    expect(res.body.error.details.map((d: any) => d.field)).toEqual(["email", "password"]);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("PUT /:id met à jour un utilisateur existant", async () => {
    db.user.findUnique.mockResolvedValue(user);
    db.user.update.mockResolvedValue({ ...user, role: "ADMIN" });

    const res = await api().put("/v1/users/user-1").set("Authorization", ADMIN).send({ role: "ADMIN" }).expect(200);

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" }, data: { role: "ADMIN" } })
    );
    expect(res.body.data.role).toBe("ADMIN");
  });

  it("DELETE /:id renvoie 404 pour un utilisateur inexistant", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await api().delete("/v1/users/missing").set("Authorization", ADMIN).expect(404);
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it("PUT /:id hache le nouveau mot de passe avant l'enregistrement", async () => {
    db.user.findUnique.mockResolvedValue(user);
    db.user.update.mockResolvedValue(user);

    await api().put("/v1/users/user-1").set("Authorization", ADMIN).send({ password: "NewPassword1" }).expect(200);

    const stored = db.user.update.mock.calls[0][0].data.password;
    expect(stored).not.toBe("NewPassword1");
    expect(await bcrypt.compare("NewPassword1", stored)).toBe(true);
  });

  it("PUT /:id refuse un email déjà pris par un autre utilisateur (409)", async () => {
    db.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(userFixture({ id: "other-user" }));

    await api().put("/v1/users/user-1").set("Authorization", ADMIN).send({ email: "taken@x.com" }).expect(409);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("ne demande jamais le mot de passe à la base sur les routes /users", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);
    db.user.findUnique.mockResolvedValue(null);

    await api().get("/v1/users").set("Authorization", ADMIN);
    await api().get("/v1/users/user-1").set("Authorization", ADMIN);

    for (const [args] of [...db.user.findMany.mock.calls, ...db.user.findUnique.mock.calls]) {
      expect(args.select).toBeDefined();
      expect(args.select.password).toBeUndefined();
    }
  });
});
