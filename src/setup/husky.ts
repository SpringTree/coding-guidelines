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
    context.report.notices.push(
      `Append husky to your prepare script so hooks install on fresh clones: "prepare": "${existingPrepareScript} && husky"`,
    );
  }

  context.runCommand(
    buildExecuteCommand(context.packageManager, "husky"),
    context.projectDirectory,
  );
}

export function writeHuskyHook(
  context: SetupContext,
  hookName: string,
  hookCommand: string[],
): void {
  writeFileIfMissing(context, `.husky/${hookName}`, `${hookCommand.join(" ")}\n`, 0o755);
}
