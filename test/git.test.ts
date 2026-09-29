import { describe, expect, test } from "bun:test";
import { mkdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { findGitRoot, initializeGitRepository } from "../src/setup/git.js";
import { createTemporaryProject, createTestContext } from "./helpers.js";

describe("findGitRoot", () => {
  test("returns the folder containing .git", () => {
    const projectDirectory = createTemporaryProject({ ".git/HEAD": "ref: refs/heads/master\n" });

    expect(findGitRoot(projectDirectory)).toBe(realpathSync(projectDirectory));
  });

  test("finds the repository root from a monorepo package folder", () => {
    const repositoryDirectory = createTemporaryProject({
      ".git/HEAD": "ref: refs/heads/master\n",
    });
    const packageDirectory = path.join(repositoryDirectory, "packages", "api");
    mkdirSync(packageDirectory, { recursive: true });

    expect(findGitRoot(packageDirectory)).toBe(realpathSync(repositoryDirectory));
  });

  test("accepts a .git file as used by worktrees and submodules", () => {
    const projectDirectory = createTemporaryProject({ ".git": "gitdir: /elsewhere\n" });

    expect(findGitRoot(projectDirectory)).toBe(realpathSync(projectDirectory));
  });

  test("returns undefined outside a repository", () => {
    expect(findGitRoot(createTemporaryProject())).toBeUndefined();
  });
});

describe("initializeGitRepository", () => {
  test("runs git init in the project folder", () => {
    const { commands, context } = createTestContext();

    initializeGitRepository(context);

    expect(commands).toEqual([["git", "init"]]);
    expect(context.report.created).toEqual(["git repository"]);
  });
});
