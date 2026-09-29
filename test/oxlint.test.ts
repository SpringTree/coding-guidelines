import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setupOxlint } from "../src/setup/oxlint.js";
import { createTestContext } from "./helpers.js";

// Simulates `oxlint --init` writing its default config
//
function simulateOxlintInit(command: string[], workingDirectory: string): void {
  if (command.includes("oxlint") && command.includes("--init")) {
    writeFileSync(
      path.join(workingDirectory, ".oxlintrc.json"),
      '{ "plugins": null, "rules": {} }',
    );
  }
}

function readOxlintConfig(projectDirectory: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(projectDirectory, ".oxlintrc.json"), "utf8"));
}

describe("setupOxlint", () => {
  test("installs, initialises and adds scripts in a JavaScript project", () => {
    const { commands, context } = createTestContext({}, "bun", simulateOxlintInit);

    setupOxlint(context);

    expect(commands).toEqual([
      ["bun", "add", "--dev", "oxlint"],
      ["bunx", "--bun", "oxlint", "--init"],
    ]);
    expect(readOxlintConfig(context.projectDirectory).options).toBeUndefined();
    const manifest = JSON.parse(
      readFileSync(path.join(context.projectDirectory, "package.json"), "utf8"),
    );
    expect(manifest.scripts).toEqual({ lint: "oxlint", "lint:fix": "oxlint --fix" });
  });

  test("enables type-aware linting when tsconfig.json exists", () => {
    const { commands, context } = createTestContext(
      { "tsconfig.json": "{}" },
      "npm",
      simulateOxlintInit,
    );

    setupOxlint(context);

    expect(commands[0]).toEqual(["npm", "install", "--save-dev", "oxlint", "oxlint-tsgolint"]);
    expect(readOxlintConfig(context.projectDirectory).options).toEqual({
      typeAware: true,
      typeCheck: true,
    });
  });

  test("keeps an existing config untouched and does not run init", () => {
    const existingConfig = '{ "rules": { "no-console": "error" } }';
    const { commands, context } = createTestContext(
      { ".oxlintrc.json": existingConfig, "tsconfig.json": "{}" },
      "bun",
      simulateOxlintInit,
    );

    setupOxlint(context);

    expect(commands).toHaveLength(1);
    expect(readFileSync(path.join(context.projectDirectory, ".oxlintrc.json"), "utf8")).toBe(
      existingConfig,
    );
    expect(context.report.skipped).toContain(".oxlintrc.json (already exists)");
  });

  test("reports a notice when init did not create a config file", () => {
    const { context } = createTestContext({ "tsconfig.json": "{}" });

    setupOxlint(context);

    expect(context.report.notices.join("\n")).toContain("type-aware");
  });
});
