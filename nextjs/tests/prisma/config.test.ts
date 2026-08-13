export {};

type PrismaConfig = {
  schema?: string;
  migrations?: { path?: string; seed?: string };
  datasource?: { url?: string };
};

const originalDatabaseUrl = process.env.DATABASE_URL;

async function importConfig(databaseUrl?: string) {
  jest.resetModules();
  if (databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = databaseUrl;
  return (await import("@/prisma.config")).default as PrismaConfig;
}

describe("Prisma configuration", () => {
  afterAll(() => {
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
  });

  it("defines the schema, migration, and seed locations", async () => {
    const config = await importConfig();

    expect(config.schema).toBe("prisma/schema.prisma");
    expect(config.migrations).toEqual({
      path: "prisma/migrations",
      seed: "tsx prisma/seed.ts",
    });
  });

  it("uses the default database without an environment file", async () => {
    const config = await importConfig();

    expect(config.datasource).toEqual({ url: "file:./prisma/dev.db" });
  });

  it("preserves legacy relative path semantics", async () => {
    const config = await importConfig("file:./custom.db");

    expect(config.datasource).toEqual({ url: "file:./prisma/custom.db" });
  });

  it("preserves an absolute database path", async () => {
    const config = await importConfig("file:/tmp/taskforge.db");

    expect(config.datasource).toEqual({ url: "file:/tmp/taskforge.db" });
  });
});
