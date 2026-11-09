import { AppError } from "../../../src/errors/app.error";

describe("AppError", () => {
  it("conserve le message et le code HTTP fournis", () => {
    const error = new AppError("Introuvable", 404);

    expect(error.message).toBe("Introuvable");
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it("utilise 500 comme code HTTP par défaut", () => {
    expect(new AppError("Boom").statusCode).toBe(500);
  });

  it("est une instance d'Error avec une stack trace", () => {
    const error = new AppError("Boom");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.stack).toContain("Boom");
  });
});
