import { corsMiddleware } from "../../../src/middlewares/cors.middleware";

describe("corsMiddleware", () => {
  it("autorise l'origine du frontend avec les credentials", (done) => {
    const headers: Record<string, string> = {};
    const req: any = { method: "GET", headers: { origin: "http://localhost:5173" } };
    const res: any = {
      setHeader: (key: string, value: string) => (headers[key.toLowerCase()] = value),
      getHeader: (key: string) => headers[key.toLowerCase()],
    };

    corsMiddleware(req, res, () => {
      expect(headers["access-control-allow-origin"]).toBe("http://localhost:5173");
      expect(headers["access-control-allow-credentials"]).toBe("true");
      done();
    });
  });
});
