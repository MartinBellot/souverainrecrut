import { createJobSchema, updateJobSchema } from "../../../src/validators/job.schema";

const valid = {
  title: "Développeur Full Stack",
  description: "Node.js / React / PostgreSQL",
  location: "Conakry",
  company: "SouverainTech",
  recruiterId: "user-1",
};

describe("createJobSchema", () => {
  it("accepte une offre valide", () => {
    expect(createJobSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ["title", "Dé", "Le titre doit contenir au moins 3 caractères."],
    ["title", "T".repeat(151), "Le titre est trop long."],
    ["description", "Court", "La description doit contenir au moins 10 caractères."],
    ["location", "C", "Le lieu est obligatoire."],
    ["company", "S", "Le nom de l'entreprise est obligatoire."],
    ["recruiterId", "", "Le recruteur est obligatoire."],
  ])("rejette %s = %p", (field, value, message) => {
    const result = createJobSchema.safeParse({ ...valid, [field]: value });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: [field], message });
  });
});

describe("updateJobSchema", () => {
  it("accepte une mise à jour partielle", () => {
    expect(updateJobSchema.parse({ location: "Kindia" })).toEqual({ location: "Kindia" });
  });

  it("rejette un titre trop court", () => {
    expect(updateJobSchema.safeParse({ title: "AB" }).success).toBe(false);
  });
});
