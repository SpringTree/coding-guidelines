import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileExists, type SetupContext, writeFileIfMissing } from "./setup-context.js";

// Package quarantine: package managers refuse versions published less than this
// many days ago, so a freshly published malicious release is caught by waiting.
// Must match `min-release-age-days` of the supply-chain `quarantine` gate
// (https://github.com/SpringTree/springtree-ci-workflows), which fails a
// repository whose committed config is missing or below this window
//
export const quarantineDays = 7;

// bun states the window in seconds, npm in days. Deriving one from the other
// keeps the two files from drifting apart
//
const quarantineSeconds = quarantineDays * 86400;

// Reads one key from an ini (.npmrc) or TOML (bunfig.toml) style file, the same way
// the quarantine gate does:
// - a `[section]` header switches the section for every following key
// - `#` and `;` start a comment, surrounding quotes are dropped
// - the last assignment wins, as in both package managers
// Use "" as section for files without sections
//
export function readSettingValue(
  fileText: string,
  sectionName: string,
  settingKey: string,
): string | undefined {
  let currentSection = "";
  let foundValue: string | undefined;
  for (const rawLine of fileText.split("\n")) {
    const sectionMatch = /^\s*\[([^\]]*)\]/.exec(rawLine);
    if (sectionMatch) {
      currentSection = (sectionMatch[1] ?? "").trim();
      continue;
    }
    const line = rawLine.replace(/[#;].*$/, "");
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1 || currentSection !== sectionName) {
      continue;
    }
    if (line.slice(0, separatorIndex).trim() === settingKey) {
      foundValue = line
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^"|"$/g, "");
    }
  }
  return foundValue;
}

// Writes both config files next to package.json whatever the package manager:
// the quarantine gate requires both, and a file for an unused manager costs nothing.
// Runs before any other setup step so the tools installed by the CLI already
// respect the window
//
export function setupQuarantine(context: SetupContext): void {
  setupNpmrc(context);
  setupBunfig(context);

  if (context.packageManager === "pnpm" || context.packageManager === "yarn") {
    context.report.notices.push(
      `${context.packageManager} reads neither .npmrc min-release-age nor bunfig.toml; configure its own minimum release age setting as well`,
    );
  }
}

function setupNpmrc(context: SetupContext): void {
  const settingLine = `min-release-age=${quarantineDays}`;
  if (!fileExists(context, ".npmrc")) {
    writeFileIfMissing(
      context,
      ".npmrc",
      `# Package quarantine: refuse versions published less than ${quarantineDays} days ago\n${settingLine}\n`,
    );
    return;
  }

  const npmrcPath = path.join(context.projectDirectory, ".npmrc");
  const npmrcText = readFileSync(npmrcPath, "utf8");
  const existingValue = readSettingValue(npmrcText, "", "min-release-age");
  if (existingValue === undefined) {
    writeFileSync(npmrcPath, `${withTrailingNewline(npmrcText)}${settingLine}\n`);
    context.report.created.push('.npmrc setting "min-release-age"');
    return;
  }
  reportExistingWindow(
    context,
    ".npmrc",
    "min-release-age",
    existingValue,
    quarantineDays,
    " days",
  );
}

function setupBunfig(context: SetupContext): void {
  const settingLine = `minimumReleaseAge = ${quarantineSeconds}`;
  if (!fileExists(context, "bunfig.toml")) {
    writeFileIfMissing(
      context,
      "bunfig.toml",
      `# Package quarantine: refuse versions published less than ${quarantineDays} days ago (in seconds)\n[install]\n${settingLine}\n`,
    );
    return;
  }

  const bunfigPath = path.join(context.projectDirectory, "bunfig.toml");
  const bunfigText = readFileSync(bunfigPath, "utf8");
  const existingValue = readSettingValue(bunfigText, "install", "minimumReleaseAge");
  if (existingValue !== undefined) {
    reportExistingWindow(
      context,
      "bunfig.toml",
      "minimumReleaseAge",
      existingValue,
      quarantineSeconds,
      "s",
    );
    return;
  }

  // Matches the `[install]` header line, allowing surrounding whitespace, so the
  // setting lands in the existing section instead of a duplicate one
  //
  const installHeaderPattern = /^[ \t]*\[install\][ \t]*$/m;
  const updatedText = installHeaderPattern.test(bunfigText)
    ? bunfigText.replace(installHeaderPattern, (headerLine) => `${headerLine}\n${settingLine}`)
    : `${withTrailingNewline(bunfigText)}\n[install]\n${settingLine}\n`;
  writeFileSync(bunfigPath, updatedText);
  context.report.created.push('bunfig.toml setting "minimumReleaseAge"');
}

// An existing value is the project's own decision and is never lowered or raised
// by the CLI; a value below the window is reported so a person raises it
//
function reportExistingWindow(
  context: SetupContext,
  fileName: string,
  settingKey: string,
  existingValue: string,
  requiredValue: number,
  unit: string,
): void {
  const numericValue = /^\d+$/.test(existingValue) ? Number(existingValue) : Number.NaN;
  if (numericValue >= requiredValue) {
    context.report.skipped.push(`${fileName} ${settingKey} (already ${existingValue})`);
    return;
  }
  context.report.notices.push(
    `${fileName} sets ${settingKey} to ${existingValue}${unit}, below the required ${requiredValue}${unit}; raise it to pass the quarantine gate`,
  );
}

function withTrailingNewline(fileText: string): string {
  return fileText === "" || fileText.endsWith("\n") ? fileText : `${fileText}\n`;
}
