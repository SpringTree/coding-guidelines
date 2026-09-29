import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { addPackageScripts } from "../src/package-json.js";
import { createTemporaryProject } from "./helpers.js";

function readManifestText(projectDirectory: string): string {
  return readFileSync(path.join(projectDirectory, "package.json"), "utf8");
}

describe("addPackageScripts", () => {
  test("adds missing scripts and keeps existing ones", () => {
    const projectDirectory = createTemporaryProject({
      "package.json": JSON.stringify({ name: "fixture", scripts: { lint: "eslint ." } }, null, 2),
    });

    const result = addPackageScripts(projectDirectory, {
      lint: "oxlint",
      "lint:fix": "oxlint --fix",
    });

    expect(result).toEqual({ added: ["lint:fix"], skipped: ["lint"] });
    expect(JSON.parse(readManifestText(projectDirectory)).scripts).toEqual({
      lint: "eslint .",
      "lint:fix": "oxlint --fix",
    });
  });

  test("creates the scripts section when missing", () => {
    const projectDirectory = createTemporaryProject({ "package.json": '{ "name": "fixture" }' });

    addPackageScripts(projectDirectory, { fmt: "oxfmt --check" });

    expect(JSON.parse(readManifestText(projectDirectory)).scripts).toEqual({
      fmt: "oxfmt --check",
    });
  });

  test("keeps tab indentation and ends with a newline", () => {
    const projectDirectory = createTemporaryProject({
      "package.json": '{\n\t"name": "fixture"\n}\n',
    });

    addPackageScripts(projectDirectory, { lint: "oxlint" });

    const manifestText = readManifestText(projectDirectory);
    expect(manifestText).toContain('\n\t"name"');
    expect(manifestText.endsWith("}\n")).toBe(true);
  });

  test("does not rewrite the file when nothing is added", () => {
    const originalText = '{"name":"fixture","scripts":{"lint":"eslint ."}}';
    const projectDirectory = createTemporaryProject({ "package.json": originalText });

    addPackageScripts(projectDirectory, { lint: "oxlint" });

    expect(readManifestText(projectDirectory)).toBe(originalText);
  });
});
