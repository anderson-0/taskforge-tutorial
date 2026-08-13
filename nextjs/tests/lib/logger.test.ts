const pinoFactory = jest.fn((options: unknown) => {
  void options;
  return { error: jest.fn() };
});

jest.mock("pino", () => ({
  __esModule: true,
  default: (options: unknown) => pinoFactory(options),
}));

let createLogger: typeof import("@/lib/logger").createLogger;
let logger: typeof import("@/lib/logger").logger;

describe("logger", () => {
  beforeAll(async () => {
    ({ createLogger, logger } = await import("@/lib/logger"));
  });

  beforeEach(() => {
    pinoFactory.mockClear();
  });

  it.each([
    ["production", "info"],
    ["test", "debug"],
  ])("uses the expected level in %s", (nodeEnv, level) => {
    createLogger(nodeEnv);

    expect(pinoFactory).toHaveBeenCalledWith({
      level,
      browser: { asObject: true },
      redact: ["password", "token", "authorization"],
    });
  });

  it("exports the configured application logger", () => {
    expect(logger).toEqual({ error: expect.any(Function) });
  });
});
