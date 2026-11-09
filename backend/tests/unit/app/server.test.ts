describe("server", () => {
  const boot = (missing: string[]) => {
    const listen = jest.fn((_port: number, callback: () => void) => callback());
    const exit = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);

    jest.isolateModules(() => {
      jest.doMock("../../../src/app", () => ({ __esModule: true, default: { listen } }));
      jest.doMock("../../../src/config/env", () => ({
        env: { port: 4999, nodeEnv: "test", apiVersion: "v1" },
        getMissingRequiredEnv: () => missing,
      }));
      require("../../../src/server");
    });

    return { listen, exit, log, error };
  };

  it("démarre l'application sur le port configuré et affiche la bannière", () => {
    const { listen, exit, log } = boot([]);

    expect(exit).not.toHaveBeenCalled();
    expect(listen).toHaveBeenCalledWith(4999, expect.any(Function));
    const output = log.mock.calls.flat().join("\n");
    expect(output).toContain("http://localhost:4999");
    expect(output).toContain("Environment : test");
    expect(output).toContain("API Version : v1");
  });

  it("refuse de démarrer si des variables obligatoires manquent", () => {
    const { exit, error } = boot(["JWT_SECRET"]);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("JWT_SECRET"));
    expect(exit).toHaveBeenCalledWith(1);
  });
});
