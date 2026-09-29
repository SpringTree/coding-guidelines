import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  addScripts,
  installDevDependencies,
  writeFileIfMissing,
} from "../src/setup/setup-context.js";
import { createTestContext } from "./helpers.js";

describe("writeFileIfMissing", () => {
  test("creates the file and parent folders", () => {
    const { context } = createTestContext();

    const written = writeFileIfMissing(context, ".husky/pre-commit", "lint-staged\n", 0o755);

    const filePath = path.join(context.projectDirectory, ".husky/pre-commit");
    expect(written).toBe(true);
    expect(readFileSync(filePath, "utf8")).toBe("lint-staged\n");
    expect(statSync(filePath).mode & 0o777).toBe(0o755);
    expect(context.report.created).toEqual([".husky/pre-commit"]);
  });

  test("never overwrites an existing file", () => {
    const { context } = createTestContext({ ".commitlintrc.json": "custom" });

    const written = writeFileIfMissing(context, ".commitlintrc.json", "new");

    expect(written).toBe(false);
    expect(readFileSync(path.join(context.projectDirectory, ".commitlintrc.json"), "utf8")).toBe(
      "custom",
    );
    expect(context.report.skipped).toEqual([".commitlintrc.json (already exists)"]);
  });
});

describe("addScripts", () => {
  test("reports added and skipped scripts", () => {
    const { context } = createTestContext({
      "package.json": '{ "scripts": { "lint": "eslint ." } }',
    });

    addScripts(context, { lint: "oxlint", "lint:fix": "oxlint --fix" });

    expect(context.report.created).toEqual(['package.json script "lint:fix"']);
    expect(context.report.skipped).toEqual(['package.json script "lint" (already exists)']);
  });
});

describe("installDevDependencies", () => {
  test("runs the package manager add command in the project folder", () => {
    const { commands, context } = createTestContext({}, "pnpm");

    installDevDependencies(context, ["oxfmt"]);

    expect(commands).toEqual([["pnpm", "add", "--save-dev", "oxfmt"]]);
  });
});
