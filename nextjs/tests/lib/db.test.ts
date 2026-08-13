export {};

type AdapterOptions = { url: string };
type TimestampOptions = { timestampFormat: "unixepoch-ms" };

const mockPrismaClient = jest.fn<object, [object?]>();
const mockAdapter = jest.fn<object, [AdapterOptions, TimestampOptions]>();

jest.mock(
  "../../generated/prisma/client",
  () => ({
    PrismaClient: function MockPrismaClient(options?: object) {
      return mockPrismaClient(options);
    },
  }),
  { virtual: true },
);

jest.mock(
  "@prisma/adapter-better-sqlite3",
  () => ({
    PrismaBetterSqlite3: function MockAdapter(
      options: AdapterOptions,
      timestampOptions: TimestampOptions,
    ) {
      return mockAdapter(options, timestampOptions);
    },
  }),
  { virtual: true },
);

type PrismaGlobal = typeof globalThis & { prisma?: object };

const prismaGlobal = globalThis as PrismaGlobal;
const originalNodeEnv = process.env.NODE_ENV;
const originalDatabaseUrl = process.env.DATABASE_URL;

type NodeEnvironment = "development" | "production" | "test";

async function importDb(nodeEnv: NodeEnvironment, cached?: object) {
  jest.resetModules();
  jest.replaceProperty(process.env, "NODE_ENV", nodeEnv);
  if (cached) prismaGlobal.prisma = cached;
  else delete prismaGlobal.prisma;
  return import("@/lib/db");
}

describe("Prisma client initialization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.mockReturnValue({ source: "new" });
    mockAdapter.mockReturnValue({ source: "adapter" });
    process.env.DATABASE_URL = "file:./dev.db";
  });

  afterAll(() => {
    jest.replaceProperty(process.env, "NODE_ENV", originalNodeEnv);
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
    delete prismaGlobal.prisma;
  });

  it("creates and caches a client outside production", async () => {
    const { prisma } = await importDb("test");

    expect(prisma).toEqual({ source: "new" });
    expect(prismaGlobal.prisma).toBe(prisma);
    expect(mockAdapter).toHaveBeenCalledWith(
      { url: "file:./prisma/dev.db" },
      { timestampFormat: "unixepoch-ms" },
    );
    expect(mockPrismaClient).toHaveBeenCalledWith({
      adapter: { source: "adapter" },
    });
    expect(mockPrismaClient).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing global client", async () => {
    const cached = { source: "cached" };

    const { prisma } = await importDb("development", cached);

    expect(prisma).toBe(cached);
    expect(mockPrismaClient).not.toHaveBeenCalled();
  });

  it("does not cache a newly-created production client", async () => {
    const { prisma } = await importDb("production");

    expect(prisma).toEqual({ source: "new" });
    expect(prismaGlobal.prisma).toBeUndefined();
    expect(mockPrismaClient).toHaveBeenCalledTimes(1);
  });
});
