/**
 * Les contrôleurs CRUD (users, candidates, jobs, applications) partagent
 * exactement le même contrat : ils sont donc testés avec une seule suite paramétrée.
 */
jest.mock("../../../src/config/prisma", () => ({
  prisma: require("../../helpers/prisma-mock").createPrismaMock(),
}));

import { userController } from "../../../src/controllers/user.controller";
import { candidateController } from "../../../src/controllers/candidate.controller";
import { jobController } from "../../../src/controllers/job.controller";
import { applicationController } from "../../../src/controllers/application.controller";
import { UserService } from "../../../src/services/user.service";
import { CandidateService } from "../../../src/services/candidate.service";
import { JobService } from "../../../src/services/job.service";
import { ApplicationService } from "../../../src/services/application.service";
import { AppError } from "../../../src/errors/app.error";
import { mockRequest, run } from "../../helpers/http";

const cases = [
  { name: "UserController", controller: userController, Service: UserService },
  { name: "CandidateController", controller: candidateController, Service: CandidateService },
  { name: "JobController", controller: jobController, Service: JobService },
  { name: "ApplicationController", controller: applicationController, Service: ApplicationService },
] as const;

describe.each(cases)("$name", ({ controller, Service }) => {
  const proto = Service.prototype as any;
  const entity = { id: "42", label: "entity" };

  describe("getAll", () => {
    it("renvoie 200 avec les données et la pagination calculée", async () => {
      const spy = jest.spyOn(proto, "getAll").mockResolvedValue({ items: [entity], total: 25 });

      const { res } = await run(controller.getAll, mockRequest({ query: { page: "2", limit: "10" } }));

      expect(spy).toHaveBeenCalledWith(10, 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [entity],
        pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
      });
    });

    it("applique la pagination par défaut sans query string", async () => {
      const spy = jest.spyOn(proto, "getAll").mockResolvedValue({ items: [], total: 0 });

      const { res } = await run(controller.getAll, mockRequest());

      expect(spy).toHaveBeenCalledWith(0, 10);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })
      );
    });
  });

  it("getById renvoie 200 et l'entité", async () => {
    const spy = jest.spyOn(proto, "getById").mockResolvedValue(entity);

    const { res } = await run(controller.getById, mockRequest({ params: { id: "42" } }));

    expect(spy).toHaveBeenCalledWith("42");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: entity });
  });

  it("getById transmet l'erreur du service à next()", async () => {
    const error = new AppError("Introuvable", 404);
    jest.spyOn(proto, "getById").mockRejectedValue(error);

    const { res, next } = await run(controller.getById, mockRequest({ params: { id: "x" } }));

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("create renvoie 201 et l'entité créée", async () => {
    const body = { foo: "bar" };
    const spy = jest.spyOn(proto, "create").mockResolvedValue(entity);

    const { res } = await run(controller.create, mockRequest({ body }));

    expect(spy).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: entity });
  });

  it("update renvoie 200 et l'entité mise à jour", async () => {
    const body = { foo: "baz" };
    const spy = jest.spyOn(proto, "update").mockResolvedValue(entity);

    const { res } = await run(controller.update, mockRequest({ params: { id: "42" }, body }));

    expect(spy).toHaveBeenCalledWith("42", body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: entity });
  });

  it("delete renvoie 200 et l'entité supprimée", async () => {
    const spy = jest.spyOn(proto, "delete").mockResolvedValue(entity);

    const { res } = await run(controller.delete, mockRequest({ params: { id: "42" } }));

    expect(spy).toHaveBeenCalledWith("42");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: entity });
  });
});
