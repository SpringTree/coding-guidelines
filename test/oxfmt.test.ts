import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { setupOxfmt } from "../src/setup/oxfmt.js";
import { createTestContext } from "./helpers.js";

describe("setupOxfmt", () => {
  test("installs, initialises and adds scripts", () => {
    const { commands, context } = createTestContext({}, "yarn");

    setupOxfmt(context);

    expect(commands).toEqual([
      ["yarn", "add", "--dev", "oxfmt"],
      ["yarn", "oxfmt", "--init"],
    ]);
    const manifest = JSON.parse(
      readFileSync(path.join(context.projectDirectory, "package.json"), "utf8"),
    );
    expect(manifest.scripts).toEqual({ fmt: "oxfmt --check", "fmt:fix": "oxfmt" });
  });

  test("skips init when a config exists", () => {
    const { commands, context } = createTestContext({ ".oxfmtrc.json": "{}" });

    setupOxfmt(context);

    expect(commands).toEqual([["bun", "add", "--dev", "oxfmt"]]);
    expect(context.report.skipped).toContain(".oxfmtrc.json (already exists)");
  });
});
