import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CommandRunner } from "../command-runner.js";
import type { PackageManagerName } from "../detect-project.js";
import { addPackageScripts, type ScriptMergeResult } from "../package-json.js";
import { buildAddDevDependenciesCommand } from "../package-manager.js";

// Collected per run and printed as the final summary
// - created: files and scripts this run added
// - skipped: things that already existed and were left alone
// - notices: follow-up actions for the user
//
export interface SetupReport {
  created: string[];
  notices: string[];
  skipped: string[];
}

export interface SetupContext {
  isWorkspaceRoot: boolean;
  packageManager: PackageManagerName;
  projectDirectory: string;
  report: SetupReport;
  runCommand: CommandRunner;
}

export function createSetupReport(): SetupReport {
  return { created: [], notices: [], skipped: [] };
}

export function fileExists(context: SetupContext, relativePath: string): boolean {
  return existsSync(path.join(context.projectDirectory, relativePath));
}

// Tools accept their config in several formats (.json, .jsonc, .ts, ...).
// Returns the first existing one so a setup step can leave it alone instead of
// adding a second, competing config file
//
export function findExistingFile(context: SetupContext, fileNames: string[]): string | undefined {
  return fileNames.find((fileName) => fileExists(context, fileName));
}

// The CLI retrofits existing projects, so any file that already exists wins
//
export function writeFileIfMissing(
  context: SetupContext,
  relativePath: string,
  content: string,
  fileMode?: number,
): boolean {
  if (fileExists(context, relativePath)) {
    context.report.skipped.push(`${relativePath} (already exists)`);
    return false;
  }
  const filePath = path.join(context.projectDirectory, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, { mode: fileMode });
  context.report.created.push(relativePath);
  return true;
}

export function addScripts(
  context: SetupContext,
  scripts: Record<string, string>,
): ScriptMergeResult {
  const result = addPackageScripts(context.projectDirectory, scripts);
  for (const scriptName of result.added) {
    context.report.created.push(`package.json script "${scriptName}"`);
  }
  for (const scriptName of result.skipped) {
    context.report.skipped.push(`package.json script "${scriptName}" (already exists)`);
  }
  return result;
}

export function installDevDependencies(context: SetupContext, packageNames: string[]): void {
  context.runCommand(
    buildAddDevDependenciesCommand(context.packageManager, packageNames, context.isWorkspaceRoot),
    context.projectDirectory,
  );
}
