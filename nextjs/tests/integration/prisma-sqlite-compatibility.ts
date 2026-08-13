import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";

const LEGACY_TIMESTAMP = new Date("2025-10-15T12:00:00.000Z");
const PRISMA_7_TIMESTAMP = new Date("2026-08-13T17:00:00.000Z");

function createPrisma5Database(databasePath: string) {
  const database = new Database(databasePath);
  database.exec(`
    CREATE TABLE "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'MEMBER',
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  database.prepare(`
    INSERT INTO "User"
      ("id", "email", "password", "name", "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    "legacy-user",
    "legacy@example.com",
    "unused",
    "Legacy learner",
    LEGACY_TIMESTAMP.valueOf(),
    LEGACY_TIMESTAMP.valueOf(),
  );
  database.close();
}

function createPrisma7Client(databasePath: string) {
  const adapter = new PrismaBetterSqlite3(
    { url: `file:${databasePath}` },
    { timestampFormat: "unixepoch-ms" },
  );
  return new PrismaClient({ adapter });
}

async function verifyTimestampCompatibility(databasePath: string) {
  const prisma = createPrisma7Client(databasePath);
  const legacyUser = await prisma.user.findUniqueOrThrow({
    where: { id: "legacy-user" },
  });
  assert.deepEqual(legacyUser.createdAt, LEGACY_TIMESTAMP);

  const newUser = await prisma.user.create({
    data: {
      id: "prisma-7-user",
      email: "prisma7@example.com",
      password: "unused",
      name: "Prisma 7 learner",
      createdAt: PRISMA_7_TIMESTAMP,
    },
  });
  assert.deepEqual(newUser.createdAt, PRISMA_7_TIMESTAMP);
  await prisma.$disconnect();
}

function verifyIntegerStorage(databasePath: string) {
  const database = new Database(databasePath, { readonly: true });
  const stored = database.prepare(
    `SELECT typeof("createdAt") AS storageType FROM "User" WHERE "id" = ?`,
  ).get("prisma-7-user") as { storageType: string };
  assert.equal(stored.storageType, "integer");
  database.close();
}

async function main() {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "taskforge-prisma-"),
  );
  const databasePath = path.join(temporaryDirectory, "legacy.db");

  try {
    createPrisma5Database(databasePath);
    await verifyTimestampCompatibility(databasePath);
    verifyIntegerStorage(databasePath);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
