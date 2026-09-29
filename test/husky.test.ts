import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { setupHusky, writeHuskyHook } from "../src/setup/husky.js";
import { createTestContext } from "./helpers.js";

function readScripts(projectDirectory: string): Record<string, string> {
  return JSON.parse(readFileSync(path.join(projectDirectory, "package.json"), "utf8")).scripts;
}

describe("setupHusky", () => {
  test("installs husky, adds prepare script and activates hooks", () => {
    const { commands, context } = createTestContext({}, "pnpm");

    setupHusky(context);

    expect(commands).toEqual([
      ["pnpm", "add", "--save-dev", "husky"],
      ["pnpm", "exec", "husky"],
    ]);
    expect(readScripts(context.projectDirectory).prepare).toBe("husky");
  });

  test("keeps an existing prepare script and tells the user to append husky", () => {
    const { context } = createTestContext({
      "package.json": '{ "scripts": { "prepare": "tsc" } }',
    });

    setupHusky(context);

    expect(readScripts(context.projectDirectory).prepare).toBe("tsc");
    expect(context.report.notices.join("\n")).toContain('"prepare": "tsc && husky"');
  });
});

describe("writeHuskyHook", () => {
  test("writes an executable hook file", () => {
    const { context } = createTestContext();

    writeHuskyHook(context, "commit-msg", ["bunx", "--bun", "commitlint", "--edit", '"$1"']);

    const hookPath = path.join(context.projectDirectory, ".husky/commit-msg");
    expect(readFileSync(hookPath, "utf8")).toBe('bunx --bun commitlint --edit "$1"\n');
    expect(statSync(hookPath).mode & 0o111).not.toBe(0);
  });
});
