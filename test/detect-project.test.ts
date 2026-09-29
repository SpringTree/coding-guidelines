import { describe, expect, test } from "bun:test";
import { detectProject } from "../src/detect-project.js";
import { createTemporaryProject } from "./helpers.js";

const packageJson = '{ "name": "fixture" }';

describe("detectProject", () => {
  test("returns undefined without package.json", () => {
    expect(detectProject(createTemporaryProject())).toBeUndefined();
  });

  test("returns undefined for a bunfig.toml without package.json", () => {
    expect(detectProject(createTemporaryProject({ "bunfig.toml": "" }))).toBeUndefined();
  });

  test.each(["bun.lock", "bun.lockb", "bunfig.toml"])("detects bun from %s", (markerFile) => {
    const projectDirectory = createTemporaryProject({
      "package.json": packageJson,
      [markerFile]: "",
    });

    expect(detectProject(projectDirectory)).toEqual({ packageManager: "bun", runtime: "bun" });
  });

  test("prefers bun when a node lockfile is also present", () => {
    const projectDirectory = createTemporaryProject({
      "bun.lock": "",
      "package-lock.json": "{}",
      "package.json": packageJson,
    });

    expect(detectProject(projectDirectory)?.runtime).toBe("bun");
  });

  test.each([
    ["package-lock.json", "npm"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
  ] as const)("detects node with %s as %s", (lockfile, packageManager) => {
    const projectDirectory = createTemporaryProject({
      "package.json": packageJson,
      [lockfile]: "",
    });

    expect(detectProject(projectDirectory)).toEqual({ packageManager, runtime: "node" });
  });

  test("falls back to npm when package.json has no lockfile", () => {
    const projectDirectory = createTemporaryProject({ "package.json": packageJson });

    expect(detectProject(projectDirectory)).toEqual({ packageManager: "npm", runtime: "node" });
  });
});
