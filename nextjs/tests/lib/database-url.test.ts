import {
  DEFAULT_DATABASE_URL,
  resolveDatabaseUrl,
} from "@/lib/database-url";

describe("resolveDatabaseUrl", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterAll(() => {
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
  });

  it("uses the Prisma 7 path when the environment variable is missing", () => {
    delete process.env.DATABASE_URL;

    expect(resolveDatabaseUrl()).toBe(DEFAULT_DATABASE_URL);
  });

  it.each(["", "file:./dev.db"])(
    "uses the Prisma 7 path for %p",
    (databaseUrl) => {
      expect(resolveDatabaseUrl(databaseUrl)).toBe(DEFAULT_DATABASE_URL);
    },
  );

  it("preserves a custom database URL", () => {
    expect(resolveDatabaseUrl("file:/tmp/taskforge.db")).toBe(
      "file:/tmp/taskforge.db",
    );
  });

  it("preserves Prisma 5 semantics for a relative custom database", () => {
    expect(resolveDatabaseUrl("file:./custom.db")).toBe(
      "file:./prisma/custom.db",
    );
  });

  it("does not rebase an already-migrated relative database URL", () => {
    expect(resolveDatabaseUrl("file:./prisma/custom.db")).toBe(
      "file:./prisma/custom.db",
    );
  });

  it.each([
    ["file:../custom.db", "file:./custom.db"],
    ["file:../../custom.db", "file:../custom.db"],
  ])("rebases a parent-relative URL: %s", (databaseUrl, expected) => {
    expect(resolveDatabaseUrl(databaseUrl)).toBe(expected);
  });

  it("preserves a non-file URL", () => {
    expect(resolveDatabaseUrl("libsql://example.invalid/database")).toBe(
      "libsql://example.invalid/database",
    );
  });
});
