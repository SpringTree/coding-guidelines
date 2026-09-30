import { describe, expect, test } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { setupHusky, writeHuskyHook } from "../src/setup/husky.js";
import { createTestContext } from "./helpers.js";

function readScripts(projectDirectory: string): Record<string, string> {
  const manifestText = readFileSync(path.join(projectDirectory, "package.json"), "utf8");
  const manifest = JSON.parse(manifestText) as { scripts?: Record<string, string> };
  return manifest.scripts ?? {};
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

  test.each(["husky", "tsc && husky", "cd .. && husky frontend/.husky"])(
    "gives no prepare advice when the script already runs husky: %s",
    (existingPrepareScript) => {
      const { context } = createTestContext({
        "package.json": JSON.stringify({ scripts: { prepare: existingPrepareScript } }),
      });

      setupHusky(context);

      expect(readScripts(context.projectDirectory).prepare).toBe(existingPrepareScript);
      expect(context.report.notices).toEqual([]);
    },
  );

  test.each(["husky install", "tsc && husky install"])(
    "advises replacing the husky 8 command in: %s",
    (existingPrepareScript) => {
      const { context } = createTestContext({
        "package.json": JSON.stringify({ scripts: { prepare: existingPrepareScript } }),
      });

      setupHusky(context);

      expect(readScripts(context.projectDirectory).prepare).toBe(existingPrepareScript);
      const noticeText = context.report.notices.join("\n");
      expect(noticeText).toContain('replace "husky install" with "husky"');
      expect(noticeText).not.toContain('&& husky"');
    },
  );
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
