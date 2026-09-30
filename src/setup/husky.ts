import { readPackageManifest } from "../package-json.js";
import { buildExecuteCommand } from "../package-manager.js";
import {
  addScripts,
  installDevDependencies,
  type SetupContext,
  writeFileIfMissing,
} from "./setup-context.js";

// husky 9 (https://typicode.github.io/husky):
// - running `husky` points git's core.hooksPath at .husky/_
// - the `prepare` script re-runs it on every install, so fresh clones get hooks too
// - hooks are plain shell files in .husky/, e.g. .husky/pre-commit
//
export function setupHusky(context: SetupContext): void {
  installDevDependencies(context, ["husky"]);

  const scriptResult = addScripts(context, { prepare: "husky" });
  if (scriptResult.skipped.includes("prepare")) {
    const existingPrepareScript =
      readPackageManifest(context.projectDirectory).scripts?.prepare ?? "";
    const prepareAdvice = describePrepareAdvice(existingPrepareScript);
    if (prepareAdvice) {
      context.report.notices.push(prepareAdvice);
    }
  }

  context.runCommand(
    buildExecuteCommand(context.packageManager, "husky"),
    context.projectDirectory,
  );
}

// The CLI never edits an existing prepare script, it only advises:
// - already runs husky 9 (`husky` not followed by `install`): nothing to do
// - runs the husky 8 command `husky install`: deprecated in husky 9, replace it
// - anything else: append husky so fresh clones get the hooks
//
function describePrepareAdvice(existingPrepareScript: string): string | undefined {
  // `husky install` as a command, with any whitespace between the two words
  //
  if (/\bhusky\s+install\b/.test(existingPrepareScript)) {
    return `Your prepare script runs the husky 8 command; replace "husky install" with "husky": "prepare": "${existingPrepareScript}"`;
  }
  // `husky` as a whole word, so a name like `husky-init` does not count
  //
  if (/(^|[\s;&|])husky(\s|$)/.test(existingPrepareScript)) {
    return undefined;
  }
  return `Append husky to your prepare script so hooks install on fresh clones: "prepare": "${existingPrepareScript} && husky"`;
}

export function writeHuskyHook(
  context: SetupContext,
  hookName: string,
  hookCommand: string[],
): void {
  writeFileIfMissing(context, `.husky/${hookName}`, `${hookCommand.join(" ")}\n`, 0o755);
}
