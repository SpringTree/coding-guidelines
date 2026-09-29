import { describe, expect, test } from "bun:test";
import path from "node:path";
import { version } from "../package.json";
import { createTemporaryProject } from "./helpers.js";

// Runs the CLI source as a child process, the same way a user would start it
//
const cliEntry = path.resolve(import.meta.dir, "../src/cli.ts");

describe("cli", () => {
  test("prints the package version with --version", () => {
    const result = Bun.spawnSync(["bun", cliEntry, "--version"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString().trim()).toBe(version);
  });

  test("exits with code 1 and a hint outside a project", () => {
    const result = Bun.spawnSync(["bun", cliEntry], { cwd: createTemporaryProject() });

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("No bun or node project found");
    expect(result.stderr.toString()).toContain("bun init");
  });
});
