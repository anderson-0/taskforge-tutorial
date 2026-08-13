import { pathToFileURL } from "node:url";

const REQUIREMENT_MESSAGE =
  "TaskForge requires Node.js 22.12-22.x or Node.js 24+.";

/** @param {string} version */
export function isSupportedNodeVersion(version) {
  const [majorText, minorText] = version.replace(/^v/, "").split(".");
  const major = Number(majorText);
  const minor = Number(minorText);

  return (major === 22 && minor >= 12) || major >= 24;
}

/** @param {string} version */
export function assertSupportedNodeVersion(version) {
  if (!isSupportedNodeVersion(version)) {
    throw new Error(REQUIREMENT_MESSAGE);
  }
}

/**
 * @param {string} moduleUrl
 * @param {string | undefined} scriptPath
 */
export function isDirectExecution(moduleUrl, scriptPath) {
  return Boolean(scriptPath && pathToFileURL(scriptPath).href === moduleUrl);
}

/**
 * @param {string} moduleUrl
 * @param {string | undefined} scriptPath
 * @param {string} version
 */
export function startNodeVersionCheckIfDirect(
  moduleUrl,
  scriptPath,
  version,
) {
  if (!isDirectExecution(moduleUrl, scriptPath)) return false;
  assertSupportedNodeVersion(version);
  return true;
}

void startNodeVersionCheckIfDirect(
  import.meta.url,
  process.argv[1],
  process.versions.node,
);
