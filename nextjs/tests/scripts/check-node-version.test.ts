import {
  assertSupportedNodeVersion,
  isDirectExecution,
  isSupportedNodeVersion,
  startNodeVersionCheckIfDirect,
} from "../../scripts/check-node-version.js";

describe("Node version check", () => {
  it.each(["24.0.0", "24.99.0", "v24.2.0"])(
    "accepts %s",
    (version) => {
      expect(isSupportedNodeVersion(version)).toBe(true);
      expect(() => assertSupportedNodeVersion(version)).not.toThrow();
    },
  );

  it.each(["22.99.0", "23.9.0", "25.0.0", "invalid"])(
    "rejects %s",
    (version) => {
      expect(isSupportedNodeVersion(version)).toBe(false);
      expect(() => assertSupportedNodeVersion(version)).toThrow(
        "TaskForge requires Node.js 24.x.",
      );
    },
  );

  it("distinguishes direct execution from an imported module", () => {
    expect(isDirectExecution("file:///workspace/check.js", undefined)).toBe(false);
    expect(isDirectExecution(
      "file:///workspace/check.js",
      "/workspace/other.js",
    )).toBe(false);
    expect(isDirectExecution(
      "file:///workspace/check.js",
      "/workspace/check.js",
    )).toBe(true);
  });

  it("runs the check only for direct execution", () => {
    expect(startNodeVersionCheckIfDirect(
      "file:///workspace/check.js",
      "/workspace/other.js",
      "23.0.0",
    )).toBe(false);
    expect(startNodeVersionCheckIfDirect(
      "file:///workspace/check.js",
      "/workspace/check.js",
      "24.0.0",
    )).toBe(true);
    expect(() => startNodeVersionCheckIfDirect(
      "file:///workspace/check.js",
      "/workspace/check.js",
      "23.0.0",
    )).toThrow("TaskForge requires Node.js");
  });
});
