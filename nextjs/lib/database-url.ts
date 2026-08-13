import path from "node:path";

export const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

const FILE_URL_PREFIX = "file:";
const PRISMA_DIRECTORY_PREFIX = "./prisma/";

function rebaseLegacyRelativeUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith(FILE_URL_PREFIX)) return databaseUrl;

  const filePath = databaseUrl.slice(FILE_URL_PREFIX.length);
  const isRelative = filePath.startsWith("./") || filePath.startsWith("../");

  if (!isRelative || filePath.startsWith(PRISMA_DIRECTORY_PREFIX)) {
    return databaseUrl;
  }

  const rebasedPath = path.posix.normalize(path.posix.join("prisma", filePath));
  const relativePath = rebasedPath.startsWith("../")
    ? rebasedPath
    : `./${rebasedPath}`;

  return `${FILE_URL_PREFIX}${relativePath}`;
}

export function resolveDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return DEFAULT_DATABASE_URL;

  return rebaseLegacyRelativeUrl(databaseUrl);
}
