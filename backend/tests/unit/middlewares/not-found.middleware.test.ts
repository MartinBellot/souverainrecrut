import { notFoundMiddleware } from "../../../src/middlewares/not-found.middleware";
import { mockRequest, mockResponse } from "../../helpers/http";

describe("notFoundMiddleware", () => {
  it("renvoie une 404 mentionnant l'URL demandée", () => {
    const res = mockResponse();

    notFoundMiddleware(mockRequest({ originalUrl: "/v1/unknown" }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { status: 404, message: "Route /v1/unknown introuvable." },
    });
  });
});
