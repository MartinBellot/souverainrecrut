import {
  createApplicationSchema,
  updateApplicationSchema,
} from "../../../src/validators/application.schema";

describe("createApplicationSchema", () => {
  it("accepte une candidature sans statut", () => {
    expect(createApplicationSchema.parse({ candidateId: "c1", jobId: "j1" })).toEqual({
      candidateId: "c1",
      jobId: "j1",
    });
  });

  it.each(["PENDING", "REVIEWED", "ACCEPTED", "REJECTED"])("accepte le statut %s", (status) => {
    expect(createApplicationSchema.parse({ candidateId: "c1", jobId: "j1", status }).status).toBe(status);
  });

  it.each([
    [{ candidateId: "", jobId: "j1" }, "candidateId", "Le candidat est obligatoire."],
    [{ candidateId: "c1", jobId: "" }, "jobId", "L'offre est obligatoire."],
  ])("rejette %p", (body, field, message) => {
    const result = createApplicationSchema.safeParse(body);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: [field], message });
  });

  it("rejette un statut inconnu", () => {
    expect(
      createApplicationSchema.safeParse({ candidateId: "c1", jobId: "j1", status: "HIRED" }).success
    ).toBe(false);
  });
});

describe("updateApplicationSchema", () => {
  it("exige un statut", () => {
    expect(updateApplicationSchema.safeParse({}).success).toBe(false);
  });

  it("accepte un statut valide", () => {
    expect(updateApplicationSchema.parse({ status: "ACCEPTED" })).toEqual({ status: "ACCEPTED" });
  });
});
