import { loginSchema } from "../../../src/validators/auth.schema";

describe("loginSchema", () => {
  it("accepte des identifiants valides", () => {
    const body = { email: "alice@souverainrecrut.com", password: "secret" };
    expect(loginSchema.parse(body)).toEqual(body);
  });

  it.each([
    [{}, "email", "L'email est obligatoire."],
    [{ email: "alice@x.com" }, "password", "Le mot de passe est obligatoire."],
    [{ email: "nope", password: "x" }, "email", "Adresse email invalide."],
    [{ email: "alice@x.com", password: "" }, "password", "Le mot de passe est obligatoire."],
  ])("rejette %p", (body, field, message) => {
    const result = loginSchema.safeParse(body);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: [field], message });
  });
});
