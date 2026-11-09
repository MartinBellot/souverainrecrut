describe("loggerMiddleware", () => {
  const load = (nodeEnv: string) => {
    const morgan = jest.fn((format: string) => `morgan:${format}`);
    let middleware: unknown;
    jest.isolateModules(() => {
      jest.doMock("morgan", () => morgan);
      jest.doMock("../../../src/config/env", () => ({ env: { nodeEnv } }));
      middleware = require("../../../src/middlewares/logger.middleware").loggerMiddleware;
    });
    return { middleware, morgan };
  };

  it("utilise le format 'combined' en production", () => {
    const { middleware, morgan } = load("production");

    expect(morgan).toHaveBeenCalledWith("combined");
    expect(middleware).toBe("morgan:combined");
  });

  it.each(["development", "test"])("utilise le format 'dev' en %s", (nodeEnv) => {
    const { middleware, morgan } = load(nodeEnv);

    expect(morgan).toHaveBeenCalledWith("dev");
    expect(middleware).toBe("morgan:dev");
  });
});
