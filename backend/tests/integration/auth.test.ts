jest.mock("../../src/config/prisma", () => ({
  prisma: require("../helpers/prisma-mock").createPrismaMock(),
}));

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { api, db } from "../helpers/integration";
import { bearer } from "../helpers/auth";
import { userFixture } from "../helpers/fixtures";

const password = "password123";
const user = userFixture({ password: bcrypt.hashSync(password, 4) });

describe("Authentification — /v1/auth", () => {
  describe("POST /login", () => {
    it("connecte un utilisateur et renvoie un JWT exploitable", async () => {
      db.user.findUnique.mockResolvedValue(user);

      const res = await api().post("/v1/auth/login").send({ email: user.email, password }).expect(200);

      expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: user.email } });
      expect(res.body.data.user).toMatchObject({ id: user.id, email: user.email, role: "RECRUITER" });
      expect(res.body.data.user).not.toHaveProperty("password");
      expect(jwt.verify(res.body.data.token, process.env.JWT_SECRET as string)).toMatchObject({
        id: user.id,
        role: "RECRUITER",
      });
    });

    it("refuse un mot de passe incorrect (401)", async () => {
      db.user.findUnique.mockResolvedValue(user);

      const res = await api().post("/v1/auth/login").send({ email: user.email, password: "wrong-pass" }).expect(401);
      expect(res.body.error.message).toBe("Email ou mot de passe invalide.");
    });

    it("valide le corps de la requête (400) sans interroger la base", async () => {
      const res = await api().post("/v1/auth/login").send({}).expect(400);

      expect(res.body.error.details.map((d: any) => d.field)).toEqual(["email", "password"]);
      expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it("refuse un email inconnu avec le même message (401)", async () => {
      db.user.findUnique.mockResolvedValue(null);

      const res = await api().post("/v1/auth/login").send({ email: "ghost@x.com", password }).expect(401);
      expect(res.body.error.message).toBe("Email ou mot de passe invalide.");
    });
  });

  describe("GET /me", () => {
    it("exige un token (401)", async () => {
      await api().get("/v1/auth/me").expect(401);
    });

    it("rejette un token falsifié (401)", async () => {
      const forged = jwt.sign({ id: "x", role: "ADMIN" }, "attacker-secret");

      const res = await api().get("/v1/auth/me").set("Authorization", `Bearer ${forged}`).expect(401);
      expect(res.body.error.message).toBe("Token invalide ou expiré.");
    });

    it("renvoie le profil de l'utilisateur du token, sans mot de passe", async () => {
      const { password: _, ...profile } = user;
      db.user.findUnique.mockResolvedValue(profile);

      const res = await api().get("/v1/auth/me").set("Authorization", bearer("RECRUITER", "user-1")).expect(200);

      expect(db.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "user-1" }, select: expect.any(Object) })
      );
      expect(res.body.data).toMatchObject({ id: "user-1", email: user.email });
      expect(res.body.data).not.toHaveProperty("password");
    });

    it("renvoie 404 si l'utilisateur du token n'existe plus", async () => {
      db.user.findUnique.mockResolvedValue(null);

      await api().get("/v1/auth/me").set("Authorization", bearer("ADMIN")).expect(404);
    });
  });
});
