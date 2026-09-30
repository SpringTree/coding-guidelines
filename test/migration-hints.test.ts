import { describe, expect, test } from "bun:test";
import { findMigrationHints } from "../src/setup/migration-hints.js";
import { createTemporaryProject } from "./helpers.js";

describe("findMigrationHints", () => {
  test("no hints for a clean project", () => {
    expect(findMigrationHints(createTemporaryProject({ "package.json": "{}" }))).toEqual([]);
  });

  test("ESLint flat config", () => {
    const hints = findMigrationHints(
      createTemporaryProject({ "eslint.config.mjs": "", "package.json": "{}" }),
    );

    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain("https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint");
  });

  test("Prettier key in package.json", () => {
    const hints = findMigrationHints(
      createTemporaryProject({ "package.json": '{ "prettier": {} }' }),
    );

    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain("https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier");
  });

  test("both tools", () => {
    const hints = findMigrationHints(
      createTemporaryProject({ ".eslintrc.json": "{}", ".prettierrc": "{}", "package.json": "{}" }),
    );

    expect(hints).toHaveLength(2);
  });
});
