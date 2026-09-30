import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type PackageManifest = Record<string, unknown> & { scripts?: Record<string, string> };

export interface ScriptMergeResult {
  added: string[];
  skipped: string[];
}

export function readPackageManifest(projectDirectory: string): PackageManifest {
  const manifestText = readFileSync(path.join(projectDirectory, "package.json"), "utf8");
  return JSON.parse(manifestText) as PackageManifest;
}

// Adds scripts that do not exist yet. Existing scripts are the project's own
// decision and are never replaced, only reported back as skipped
//
export function addPackageScripts(
  projectDirectory: string,
  scripts: Record<string, string>,
): ScriptMergeResult {
  const manifestPath = path.join(projectDirectory, "package.json");
  const manifestText = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText) as PackageManifest;
  const projectScripts = manifest.scripts ?? {};
  const result: ScriptMergeResult = { added: [], skipped: [] };

  for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
    if (scriptName in projectScripts) {
      result.skipped.push(scriptName);
      continue;
    }
    projectScripts[scriptName] = scriptCommand;
    result.added.push(scriptName);
  }

  if (result.added.length > 0) {
    manifest.scripts = projectScripts;
    const indentation = detectIndentation(manifestText);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, indentation)}\n`);
  }
  return result;
}

// Keep the project's own indentation so the diff only shows the added scripts.
// Captures the whitespace in front of the first indented key: `\t"name"` → tab
//
function detectIndentation(jsonText: string): string {
  return /^([ \t]+)"/m.exec(jsonText)?.[1] ?? "  ";
}
