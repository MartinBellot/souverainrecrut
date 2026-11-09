import { infoController } from "../../../src/controllers/info.controller";
import { InfoService } from "../../../src/services/info.service";
import { mockRequest, run } from "../../helpers/http";

describe("InfoController", () => {
  it("getInfo renvoie 200 et les informations de l'API", async () => {
    const info = { name: "SouverainRecrut API" } as any;
    jest.spyOn(InfoService.prototype, "getInfo").mockReturnValue(info);

    const { res } = await run(infoController.getInfo, mockRequest());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: info });
  });
});
