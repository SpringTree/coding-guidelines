import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { setupCommitlint } from "../src/setup/commitlint.js";
import { createTestContext } from "./helpers.js";

describe("setupCommitlint", () => {
  test("installs commitlint, writes config and commit-msg hook", () => {
    const { commands, context } = createTestContext({}, "npm");

    setupCommitlint(context);

    expect(commands).toEqual([
      ["npm", "install", "--save-dev", "@commitlint/cli", "@commitlint/config-conventional"],
    ]);
    const commitlintConfig = readFileSync(
      path.join(context.projectDirectory, ".commitlintrc.json"),
      "utf8",
    );
    expect(JSON.parse(commitlintConfig)).toEqual({ extends: ["@commitlint/config-conventional"] });
    const hookText = readFileSync(path.join(context.projectDirectory, ".husky/commit-msg"), "utf8");
    expect(hookText).toBe('npx --no -- commitlint --edit "$1"\n');
  });

  test.each(["commitlint.config.js", ".commitlintrc.yml", "commitlint.config.ts"])(
    "does not add a second config next to %s",
    (existingConfigFile) => {
      const { context } = createTestContext({ [existingConfigFile]: "" });

      setupCommitlint(context);

      expect(existsSync(path.join(context.projectDirectory, ".commitlintrc.json"))).toBe(false);
      expect(context.report.skipped).toContain(
        `commitlint config (${existingConfigFile} already exists)`,
      );
    },
  );

  test("respects a commitlint key in package.json", () => {
    const { context } = createTestContext({
      "package.json": '{ "commitlint": { "extends": ["@commitlint/config-angular"] } }',
    });

    setupCommitlint(context);

    expect(existsSync(path.join(context.projectDirectory, ".commitlintrc.json"))).toBe(false);
  });
});
