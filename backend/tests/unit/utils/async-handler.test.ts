import { asyncHandler } from "../../../src/utils/async-handler";
import { mockRequest, mockResponse, flushPromises } from "../../helpers/http";

describe("asyncHandler", () => {
  it("exécute la fonction asynchrone avec req, res et next", async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    asyncHandler(fn)(req, res, next);
    await flushPromises();

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("transmet les erreurs asynchrones à next()", async () => {
    const error = new Error("async failure");
    const next = jest.fn();

    asyncHandler(jest.fn().mockRejectedValue(error))(mockRequest(), mockResponse(), next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });
});
