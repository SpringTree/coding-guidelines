import { buildExecuteCommand } from "../package-manager.js";
import { writeHuskyHook } from "./husky.js";
import { installDevDependencies, type SetupContext, writeFileIfMissing } from "./setup-context.js";

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
  writeFileIfMissing(
    context,
    ".lintstagedrc.json",
    `${JSON.stringify(lintStagedConfig, null, 2)}\n`,
  );
  writeHuskyHook(
    context,
    "pre-commit",
    buildExecuteCommand(context.packageManager, "lint-staged", ["--concurrent", "false"]),
  );
}
