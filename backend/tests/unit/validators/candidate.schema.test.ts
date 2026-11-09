import { createCandidateSchema, updateCandidateSchema } from "../../../src/validators/candidate.schema";

const valid = { fullName: "Mamadou Bah", email: "mamadou@example.com", phone: "+224620000001" };

describe("createCandidateSchema", () => {
  it("accepte un candidat valide", () => {
    expect(createCandidateSchema.parse(valid)).toEqual(valid);
  });

  it("normalise : trim du nom/téléphone et email en minuscules", () => {
    expect(
      createCandidateSchema.parse({
        fullName: "  Mamadou Bah  ",
        email: "Mamadou@Example.COM",
        phone: "  +224620000001 ",
      })
    ).toEqual(valid);
  });

  it("accepte un candidat sans téléphone", () => {
    const { phone, ...withoutPhone } = valid;
    expect(createCandidateSchema.parse(withoutPhone)).toEqual(withoutPhone);
  });

  it.each([
    ["fullName", "Al", "Le nom complet doit contenir au moins 3 caractères."],
    ["fullName", "   Al   ", "Le nom complet doit contenir au moins 3 caractères."],
    ["fullName", "A".repeat(101), "Le nom complet ne peut pas dépasser 100 caractères."],
    ["email", "invalid", "Adresse email invalide."],
    ["phone", "1234567", "Le numéro de téléphone est trop court."],
    ["phone", "1".repeat(21), "Le numéro de téléphone est trop long."],
  ])("rejette %s = %p", (field, value, message) => {
    const result = createCandidateSchema.safeParse({ ...valid, [field]: value });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: [field], message });
  });
});

describe("updateCandidateSchema", () => {
  it("accepte une mise à jour partielle", () => {
    expect(updateCandidateSchema.parse({ phone: "+224620000002" })).toEqual({ phone: "+224620000002" });
  });

  it("applique les mêmes règles que la création", () => {
    expect(updateCandidateSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
