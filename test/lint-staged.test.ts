import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildLintStagedConfig, setupLintStaged } from "../src/setup/lint-staged.js";
import { createTestContext } from "./helpers.js";

describe("buildLintStagedConfig", () => {
  test("both tools", () => {
    expect(buildLintStagedConfig({ oxfmt: true, oxlint: true })).toEqual({
      "*": "oxfmt --no-error-on-unmatched-pattern",
      "*.{cjs,js,jsx,mjs,ts,tsx}": "oxlint --fix",
    });
  });

  test("oxlint only", () => {
    expect(buildLintStagedConfig({ oxfmt: false, oxlint: true })).toEqual({
      "*.{cjs,js,jsx,mjs,ts,tsx}": "oxlint --fix",
    });
  });

  test("oxfmt only", () => {
    expect(buildLintStagedConfig({ oxfmt: true, oxlint: false })).toEqual({
      "*": "oxfmt --no-error-on-unmatched-pattern",
    });
  });

  test("no tools", () => {
    expect(buildLintStagedConfig({ oxfmt: false, oxlint: false })).toBeUndefined();
  });
});

describe("setupLintStaged", () => {
  test("installs lint-staged, writes config and a sequential pre-commit hook", () => {
    const { commands, context } = createTestContext();

    setupLintStaged(context, { oxfmt: true, oxlint: true });

    expect(commands).toEqual([["bun", "add", "--dev", "lint-staged"]]);
    const hookText = readFileSync(path.join(context.projectDirectory, ".husky/pre-commit"), "utf8");
    expect(hookText).toBe("bunx --bun lint-staged --concurrent false\n");
    const lintStagedConfig = JSON.parse(
      readFileSync(path.join(context.projectDirectory, ".lintstagedrc.json"), "utf8"),
    );
    expect(Object.keys(lintStagedConfig)).toHaveLength(2);
  });

  test("does nothing when neither tool is selected", () => {
    const { commands, context } = createTestContext();

    setupLintStaged(context, { oxfmt: false, oxlint: false });

    expect(commands).toEqual([]);
    expect(context.report.skipped).toEqual(["lint-staged (neither oxlint nor oxfmt selected)"]);
  });

  test.each([
    [".lintstagedrc.yml", { ".lintstagedrc.yml": "'*': eslint" }],
    ["lint-staged.config.js", { "lint-staged.config.js": "export default {}" }],
    ["package.json lint-staged key", { "package.json": '{ "lint-staged": { "*": "eslint" } }' }],
  ])("keeps an existing config in %s and still adds the hook", (_description, files) => {
    const { context } = createTestContext(files);

    setupLintStaged(context, { oxfmt: true, oxlint: true });

    expect(existsSync(path.join(context.projectDirectory, ".lintstagedrc.json"))).toBe(false);
    expect(context.report.skipped.join("\n")).toContain("lint-staged config");
    expect(context.report.notices.join("\n")).toContain("oxlint --fix");
    expect(existsSync(path.join(context.projectDirectory, ".husky/pre-commit"))).toBe(true);
  });
});
