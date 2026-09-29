import { existsSync } from "node:fs";
import path from "node:path";

export type PackageManagerName = "bun" | "npm" | "pnpm" | "yarn";
export type ProjectRuntime = "bun" | "node";

export interface DetectedProject {
  packageManager: PackageManagerName;
  runtime: ProjectRuntime;
}

// Files that mark a bun project. `bun.lockb` is the legacy binary lockfile and
// `bunfig.toml` can exist before the first install created a lockfile
//
const bunMarkerFiles = ["bun.lock", "bun.lockb", "bunfig.toml"];

// Node lockfiles in order of precedence; without any lockfile we assume npm
//
const nodeLockfiles: Array<{ fileName: string; packageManager: PackageManagerName }> = [
  { fileName: "pnpm-lock.yaml", packageManager: "pnpm" },
  { fileName: "yarn.lock", packageManager: "yarn" },
  { fileName: "package-lock.json", packageManager: "npm" },
];

// Every setup step edits package.json, so a folder without one is never a project
// we can work with, even when bun marker files are present
//
export function detectProject(projectDirectory: string): DetectedProject | undefined {
  const hasFile = (fileName: string) => existsSync(path.join(projectDirectory, fileName));

  if (!hasFile("package.json")) {
    return undefined;
  }
  if (bunMarkerFiles.some(hasFile)) {
    return { packageManager: "bun", runtime: "bun" };
  }
  const lockfile = nodeLockfiles.find((candidate) => hasFile(candidate.fileName));
  return { packageManager: lockfile?.packageManager ?? "npm", runtime: "node" };
}
