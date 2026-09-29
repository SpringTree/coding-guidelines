import { describe, expect, test } from "bun:test";
import path from "node:path";
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

    expect(detectProject(projectDirectory)).toEqual({
      isWorkspaceRoot: false,
      packageManager: "bun",
      runtime: "bun",
    });
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

    expect(detectProject(projectDirectory)).toEqual({
      isWorkspaceRoot: false,
      packageManager,
      runtime: "node",
    });
  });

  test("falls back to npm when package.json has no lockfile", () => {
    const projectDirectory = createTemporaryProject({ "package.json": packageJson });

    expect(detectProject(projectDirectory)).toEqual({
      isWorkspaceRoot: false,
      packageManager: "npm",
      runtime: "node",
    });
  });

  test("uses the lockfile of a monorepo root for a workspace package", () => {
    const repositoryDirectory = createTemporaryProject({
      ".git/HEAD": "",
      "bun.lock": "",
      "package.json": packageJson,
      "packages/api/package.json": packageJson,
    });

    expect(detectProject(path.join(repositoryDirectory, "packages/api"))).toMatchObject({
      packageManager: "bun",
      runtime: "bun",
    });
  });

  test("uses a pnpm lockfile of a monorepo root for a workspace package", () => {
    const repositoryDirectory = createTemporaryProject({
      ".git/HEAD": "",
      "package.json": packageJson,
      "packages/api/package.json": packageJson,
      "pnpm-lock.yaml": "",
    });

    expect(detectProject(path.join(repositoryDirectory, "packages/api"))?.packageManager).toBe(
      "pnpm",
    );
  });

  test("does not look for lockfiles above the repository root", () => {
    const outerDirectory = createTemporaryProject({
      "bun.lock": "",
      "project/.git/HEAD": "",
      "project/package.json": packageJson,
    });

    expect(detectProject(path.join(outerDirectory, "project"))).toMatchObject({
      packageManager: "npm",
      runtime: "node",
    });
  });

  test("marks a pnpm workspace root", () => {
    const projectDirectory = createTemporaryProject({
      "package.json": packageJson,
      "pnpm-lock.yaml": "",
      "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
    });

    expect(detectProject(projectDirectory)?.isWorkspaceRoot).toBe(true);
  });

  test("marks a yarn classic workspace root", () => {
    const projectDirectory = createTemporaryProject({
      "package.json": '{ "workspaces": ["packages/*"] }',
      "yarn.lock": "",
    });

    expect(detectProject(projectDirectory)?.isWorkspaceRoot).toBe(true);
  });

  test("does not mark a yarn berry workspace root, berry adds to the root without a flag", () => {
    const projectDirectory = createTemporaryProject({
      ".yarnrc.yml": "",
      "package.json": '{ "workspaces": ["packages/*"] }',
      "yarn.lock": "",
    });

    expect(detectProject(projectDirectory)?.isWorkspaceRoot).toBe(false);
  });

  test("does not mark a plain project as workspace root", () => {
    const projectDirectory = createTemporaryProject({ "package.json": packageJson });

    expect(detectProject(projectDirectory)?.isWorkspaceRoot).toBe(false);
  });
});
