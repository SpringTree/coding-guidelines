import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

export type PackageManagerName = "bun" | "npm" | "pnpm" | "yarn";
export type ProjectRuntime = "bun" | "node";

export interface DetectedProject {
  isWorkspaceRoot: boolean;
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
  if (!existsSync(path.join(projectDirectory, "package.json"))) {
    return undefined;
  }

  // Workspace packages in a monorepo have no lockfile of their own, the package
  // manager is decided by the lockfile at the monorepo root
  //
  for (const candidateDirectory of listLockfileDirectories(projectDirectory)) {
    const hasFile = (fileName: string) => existsSync(path.join(candidateDirectory, fileName));
    if (bunMarkerFiles.some(hasFile)) {
      return createDetectedProject(projectDirectory, "bun", "bun");
    }
    const lockfile = nodeLockfiles.find((candidate) => hasFile(candidate.fileName));
    if (lockfile) {
      return createDetectedProject(projectDirectory, lockfile.packageManager, "node");
    }
  }
  return createDetectedProject(projectDirectory, "npm", "node");
}

// The project folder and its parents up to and including the git repository root.
// Without a repository only the project folder itself is searched, so a stray
// lockfile somewhere in the home folder never decides the package manager
//
function listLockfileDirectories(projectDirectory: string): string[] {
  const directories: string[] = [];
  let currentDirectory = realpathSync(projectDirectory);
  while (true) {
    directories.push(currentDirectory);
    if (existsSync(path.join(currentDirectory, ".git"))) {
      return directories;
    }
    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return [directories[0] ?? projectDirectory];
    }
    currentDirectory = parentDirectory;
  }
}

function createDetectedProject(
  projectDirectory: string,
  packageManager: PackageManagerName,
  runtime: ProjectRuntime,
): DetectedProject {
  return {
    isWorkspaceRoot: requiresWorkspaceRootFlag(projectDirectory, packageManager),
    packageManager,
    runtime,
  };
}

// pnpm and yarn classic refuse to add dependencies to a workspace root without an
// explicit flag. bun, npm and yarn berry (recognised by .yarnrc.yml) do not need one
//
function requiresWorkspaceRootFlag(
  projectDirectory: string,
  packageManager: PackageManagerName,
): boolean {
  const hasFile = (fileName: string) => existsSync(path.join(projectDirectory, fileName));
  if (packageManager === "pnpm") {
    return hasFile("pnpm-workspace.yaml");
  }
  if (packageManager === "yarn" && !hasFile(".yarnrc.yml")) {
    const manifestText = readFileSync(path.join(projectDirectory, "package.json"), "utf8");
    return "workspaces" in (JSON.parse(manifestText) as Record<string, unknown>);
  }
  return false;
}
