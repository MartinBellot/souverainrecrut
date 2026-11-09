import { createUserSchema, updateUserSchema } from "../../../src/validators/user.schema";

const valid = {
  firstName: "Alice",
  lastName: "Diallo",
  email: "alice@souverainrecrut.com",
  password: "password123",
};

const firstError = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.error?.issues[0];

describe("createUserSchema", () => {
  it("accepte un utilisateur valide sans rôle", () => {
    expect(createUserSchema.parse(valid)).toEqual(valid);
  });

  it.each(["ADMIN", "RECRUITER"])("accepte le rôle %s", (role) => {
    expect(createUserSchema.parse({ ...valid, role }).role).toBe(role);
  });

  it.each([
    ["firstName", "A", "Le prénom doit contenir au moins 2 caractères."],
    ["firstName", "A".repeat(101), "Le prénom est trop long."],
    ["lastName", "D", "Le nom doit contenir au moins 2 caractères."],
    ["lastName", "D".repeat(101), "Le nom est trop long."],
    ["email", "not-an-email", "Adresse email invalide."],
    ["password", "short", "Le mot de passe doit contenir au moins 8 caractères."],
  ])("rejette %s = %p", (field, value, message) => {
    const issue = firstError(createUserSchema.safeParse({ ...valid, [field]: value }));

    expect(issue).toMatchObject({ path: [field], message });
  });

  it("rejette un rôle inconnu", () => {
    expect(createUserSchema.safeParse({ ...valid, role: "SUPERUSER" }).success).toBe(false);
  });

  it("rejette un objet vide (tous les champs obligatoires)", () => {
    const result = createUserSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(
      expect.arrayContaining(["firstName", "lastName", "email", "password"])
    );
  });
});

describe("updateUserSchema", () => {
  it("accepte un objet vide (tous les champs optionnels)", () => {
    expect(updateUserSchema.parse({})).toEqual({});
  });

  it("accepte une mise à jour partielle", () => {
    expect(updateUserSchema.parse({ role: "ADMIN", firstName: "Bob" })).toEqual({
      role: "ADMIN",
      firstName: "Bob",
    });
  });

  it.each([
    ["firstName", "A"],
    ["firstName", "A".repeat(101)],
    ["lastName", "D"],
    ["lastName", "D".repeat(101)],
    ["email", "bad"],
    ["password", "short"],
    ["role", "ROOT"],
  ])("rejette %s = %p", (field, value) => {
    expect(updateUserSchema.safeParse({ [field]: value }).success).toBe(false);
  });
});
