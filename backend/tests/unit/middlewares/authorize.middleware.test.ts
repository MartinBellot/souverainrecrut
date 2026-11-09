import { authorize } from "../../../src/middlewares/authorize.middleware";
import { AppError } from "../../../src/errors/app.error";
import { mockRequest, mockResponse } from "../../helpers/http";

describe("authorize", () => {
  const call = (user: any, ...roles: any[]) => {
    const next = jest.fn();
    authorize(...roles)(mockRequest({ user } as any), mockResponse(), next);
    return next.mock.calls[0][0] as AppError | undefined;
  };

  it("renvoie 401 si aucun utilisateur n'est authentifié", () => {
    expect(call(undefined, "ADMIN")).toMatchObject({ statusCode: 401 });
  });

  it("renvoie 403 si le rôle n'est pas autorisé", () => {
    const error = call({ id: "1", role: "RECRUITER" }, "ADMIN");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      statusCode: 403,
      message: "Accès refusé. Permissions insuffisantes.",
    });
  });

  it("laisse passer un rôle autorisé", () => {
    expect(call({ id: "1", role: "RECRUITER" }, "ADMIN", "RECRUITER")).toBeUndefined();
  });
});
