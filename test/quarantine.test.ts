import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { readSettingValue, setupQuarantine } from "../src/setup/quarantine.js";
import { createTestContext } from "./helpers.js";

function readProjectFile(projectDirectory: string, relativePath: string): string {
  return readFileSync(path.join(projectDirectory, relativePath), "utf8");
}

describe("readSettingValue", () => {
  test("reads a key without sections, last assignment wins", () => {
    expect(
      readSettingValue("min-release-age=3\nmin-release-age = 9\n", "", "min-release-age"),
    ).toBe("9");
  });

  test("only reads the key inside the requested section", () => {
    const bunfigText = "[test]\nminimumReleaseAge = 1\n[install]\nminimumReleaseAge = 604800\n";

    expect(readSettingValue(bunfigText, "install", "minimumReleaseAge")).toBe("604800");
    expect(
      readSettingValue("[test]\nminimumReleaseAge = 1\n", "install", "minimumReleaseAge"),
    ).toBe(undefined);
  });

  test("strips comments and quotes", () => {
    expect(
      readSettingValue(
        '[install]\nminimumReleaseAge = "604800" # a week\n',
        "install",
        "minimumReleaseAge",
      ),
    ).toBe("604800");
  });
});

describe("setupQuarantine", () => {
  test("creates both config files when missing", () => {
    const { context } = createTestContext();

    setupQuarantine(context);

    const npmrcText = readProjectFile(context.projectDirectory, ".npmrc");
    const bunfigText = readProjectFile(context.projectDirectory, "bunfig.toml");
    expect(readSettingValue(npmrcText, "", "min-release-age")).toBe("7");
    expect(readSettingValue(bunfigText, "install", "minimumReleaseAge")).toBe("604800");
    expect(context.report.created).toEqual([".npmrc", "bunfig.toml"]);
  });

  test("adds the setting to an existing .npmrc and keeps its other lines", () => {
    const { context } = createTestContext({ ".npmrc": "engine-strict=true" });

    setupQuarantine(context);

    const npmrcText = readProjectFile(context.projectDirectory, ".npmrc");
    expect(npmrcText).toBe("engine-strict=true\nmin-release-age=7\n");
    expect(context.report.created).toContain('.npmrc setting "min-release-age"');
  });

  test("keeps an .npmrc window that is already long enough", () => {
    const { context } = createTestContext({ ".npmrc": "min-release-age=14\n" });

    setupQuarantine(context);

    expect(readProjectFile(context.projectDirectory, ".npmrc")).toBe("min-release-age=14\n");
    expect(context.report.skipped).toContain(".npmrc min-release-age (already 14)");
  });

  test("reports a window below 7 days without changing it", () => {
    const { context } = createTestContext({ ".npmrc": "min-release-age=2\n" });

    setupQuarantine(context);

    expect(readProjectFile(context.projectDirectory, ".npmrc")).toBe("min-release-age=2\n");
    expect(context.report.notices.join("\n")).toContain(".npmrc sets min-release-age to 2");
  });

  test("adds the setting under an existing [install] section", () => {
    const { context } = createTestContext({
      "bunfig.toml": '[install]\nlinker = "hoisted"\n\n[test]\ncoverage = true\n',
    });

    setupQuarantine(context);

    const bunfigText = readProjectFile(context.projectDirectory, "bunfig.toml");
    expect(bunfigText).toBe(
      '[install]\nminimumReleaseAge = 604800\nlinker = "hoisted"\n\n[test]\ncoverage = true\n',
    );
  });

  test("adds an [install] section when the file has none", () => {
    const { context } = createTestContext({
      "bunfig.toml": "[test]\nminimumReleaseAge = 1\n",
    });

    setupQuarantine(context);

    const bunfigText = readProjectFile(context.projectDirectory, "bunfig.toml");
    expect(readSettingValue(bunfigText, "install", "minimumReleaseAge")).toBe("604800");
    expect(bunfigText.startsWith("[test]\nminimumReleaseAge = 1\n")).toBe(true);
  });

  test("tells pnpm users that neither file applies to them", () => {
    const { context } = createTestContext({}, "pnpm");

    setupQuarantine(context);

    expect(context.report.notices.join("\n")).toContain("pnpm");
  });
});
