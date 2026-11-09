import { z } from "zod";

import { validate } from "../../../src/middlewares/validate.middleware";
import { mockRequest, mockResponse } from "../../helpers/http";

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court."),
  address: z.object({ city: z.string({ error: "Ville requise." }) }),
});

describe("validate", () => {
  it("remplace req.body par les données validées puis appelle next()", () => {
    const req = mockRequest({ body: { name: "  Alice  ", address: { city: "Conakry" }, extra: 1 } });
    const next = jest.fn();

    validate(schema)(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Alice", address: { city: "Conakry" } });
  });

  it("renvoie 400 avec le détail des champs invalides (chemins imbriqués)", () => {
    const res = mockResponse();
    const next = jest.fn();

    validate(schema)(mockRequest({ body: { name: "A", address: {} } }), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        status: 400,
        message: "Erreur de validation.",
        details: [
          { field: "name", message: "Nom trop court." },
          { field: "address.city", message: "Ville requise." },
        ],
      },
    });
  });
});
