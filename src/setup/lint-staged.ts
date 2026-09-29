import { readPackageManifest } from "../package-json.js";
import { buildExecuteCommand } from "../package-manager.js";
import { writeHuskyHook } from "./husky.js";
import {
  findExistingFile,
  installDevDependencies,
  type SetupContext,
  writeFileIfMissing,
} from "./setup-context.js";

// Config files lint-staged loads besides the `lint-staged` key in package.json
// (CONFIG_FILE_NAMES in lint-staged/lib/configFiles.js). package.json is read first,
// so a new .lintstagedrc.json next to any of these would silently never be used
//
const lintStagedConfigFileNames = [
  ".lintstagedrc",
  ".lintstagedrc.cjs",
  ".lintstagedrc.cts",
  ".lintstagedrc.js",
  ".lintstagedrc.json",
  ".lintstagedrc.mjs",
  ".lintstagedrc.mts",
  ".lintstagedrc.ts",
  ".lintstagedrc.yaml",
  ".lintstagedrc.yml",
  "lint-staged.config.cjs",
  "lint-staged.config.cts",
  "lint-staged.config.js",
  "lint-staged.config.mjs",
  "lint-staged.config.mts",
  "lint-staged.config.ts",
  "package.yaml",
  "package.yml",
];

export interface LintStagedTools {
  oxfmt: boolean;
  oxlint: boolean;
}

// Glob keys follow lint-staged's micromatch syntax:
// - `*` matches every staged file; oxfmt skips types it does not support thanks to
//   --no-error-on-unmatched-pattern
// - `*.{cjs,js,jsx,mjs,ts,tsx}` matches the JavaScript and TypeScript files oxlint checks
//
export function buildLintStagedConfig(tools: LintStagedTools): Record<string, string> | undefined {
  const lintStagedConfig: Record<string, string> = {};
  if (tools.oxfmt) {
    lintStagedConfig["*"] = "oxfmt --no-error-on-unmatched-pattern";
  }
  if (tools.oxlint) {
    lintStagedConfig["*.{cjs,js,jsx,mjs,ts,tsx}"] = "oxlint --fix";
  }
  return Object.keys(lintStagedConfig).length > 0 ? lintStagedConfig : undefined;
}

// Runs the selected tools on staged files only, from the husky pre-commit hook.
// `--concurrent false` runs the globs one after another: a staged .ts file matches
// both globs and oxlint --fix and oxfmt must not write the same file at the same time
//
export function setupLintStaged(context: SetupContext, tools: LintStagedTools): void {
  const lintStagedConfig = buildLintStagedConfig(tools);
  if (!lintStagedConfig) {
    context.report.skipped.push("lint-staged (neither oxlint nor oxfmt selected)");
    return;
  }

  installDevDependencies(context, ["lint-staged"]);
  const existingConfigLocation = findExistingLintStagedConfig(context);
  if (existingConfigLocation) {
    context.report.skipped.push(`lint-staged config (${existingConfigLocation} already exists)`);
    context.report.notices.push(
      `Add these entries to your lint-staged config in ${existingConfigLocation}: ${JSON.stringify(lintStagedConfig)}`,
    );
  } else {
    writeFileIfMissing(
      context,
      ".lintstagedrc.json",
      `${JSON.stringify(lintStagedConfig, null, 2)}\n`,
    );
  }
  writeHuskyHook(
    context,
    "pre-commit",
    buildExecuteCommand(context.packageManager, "lint-staged", ["--concurrent", "false"]),
  );
}

function findExistingLintStagedConfig(context: SetupContext): string | undefined {
  if ("lint-staged" in readPackageManifest(context.projectDirectory)) {
    return "package.json";
  }
  return findExistingFile(context, lintStagedConfigFileNames);
}
