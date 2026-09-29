import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import type { SetupContext } from "./setup-context.js";

// Walks up from the start folder to find the repository root.
// `.git` can be a folder (normal clone) or a file (worktree, submodule).
// Husky installs hooks relative to the repository root, so the CLI needs to know
// whether the project folder is that root or a package inside a monorepo
//
export function findGitRoot(startDirectory: string): string | undefined {
  let currentDirectory = realpathSync(startDirectory);
  while (true) {
    if (existsSync(path.join(currentDirectory, ".git"))) {
      return currentDirectory;
    }
    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return undefined;
    }
    currentDirectory = parentDirectory;
  }
}

export function initializeGitRepository(context: SetupContext): void {
  context.runCommand(["git", "init"], context.projectDirectory);
  context.report.created.push("git repository");
}
