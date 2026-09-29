import { readPackageManifest } from "../package-json.js";
import { buildExecuteCommand } from "../package-manager.js";
import { writeHuskyHook } from "./husky.js";
import {
  findExistingFile,
  installDevDependencies,
  type SetupContext,
  writeFileIfMissing,
} from "./setup-context.js";

// Config file names commitlint loads (https://commitlint.js.org/reference/configuration).
// Adding .commitlintrc.json next to any of these would give two competing configs
//
const commitlintConfigFileNames = [
  ".commitlintrc",
  ".commitlintrc.cjs",
  ".commitlintrc.js",
  ".commitlintrc.json",
  ".commitlintrc.mjs",
  ".commitlintrc.ts",
  ".commitlintrc.yaml",
  ".commitlintrc.yml",
  "commitlint.config.cjs",
  "commitlint.config.js",
  "commitlint.config.mjs",
  "commitlint.config.ts",
];

// Enforces the Conventional Commits format (https://www.conventionalcommits.org)
// on every commit message through the husky commit-msg hook.
// `"$1"` is the path git passes to the hook for the message file
//
export function setupCommitlint(context: SetupContext): void {
  installDevDependencies(context, ["@commitlint/cli", "@commitlint/config-conventional"]);

  const existingConfigFileName = findExistingFile(context, commitlintConfigFileNames);
  if (existingConfigFileName) {
    context.report.skipped.push(`commitlint config (${existingConfigFileName} already exists)`);
  } else if ("commitlint" in readPackageManifest(context.projectDirectory)) {
    context.report.skipped.push("commitlint config (package.json commitlint key already exists)");
  } else {
    writeFileIfMissing(
      context,
      ".commitlintrc.json",
      `${JSON.stringify({ extends: ["@commitlint/config-conventional"] }, null, 2)}\n`,
    );
  }

  writeHuskyHook(
    context,
    "commit-msg",
    buildExecuteCommand(context.packageManager, "commitlint", ["--edit", '"$1"']),
  );
}
