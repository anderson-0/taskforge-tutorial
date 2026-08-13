const mockPrismaClient = jest.fn<object, []>();

jest.mock("@prisma/client", () => ({
  PrismaClient: function MockPrismaClient() {
    return mockPrismaClient();
  },
}));

type PrismaGlobal = typeof globalThis & { prisma?: object };

const prismaGlobal = globalThis as PrismaGlobal;
const originalNodeEnv = process.env.NODE_ENV;

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
  });

  afterAll(() => {
    jest.replaceProperty(process.env, "NODE_ENV", originalNodeEnv);
    delete prismaGlobal.prisma;
  });

  it("creates and caches a client outside production", async () => {
    const { prisma } = await importDb("test");

    expect(prisma).toEqual({ source: "new" });
    expect(prismaGlobal.prisma).toBe(prisma);
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
