import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CommandRunner } from "../src/command-runner.js";
import type { PackageManagerName } from "../src/detect-project.js";
import { createSetupReport, type SetupContext } from "../src/setup/setup-context.js";

// Creates an isolated project folder in the OS temp directory.
// Keys are paths relative to the project root, values the file contents.
//
export function createTemporaryProject(files: Record<string, string> = {}): string {
  const projectDirectory = mkdtempSync(path.join(tmpdir(), "springtree-coding-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(projectDirectory, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  return projectDirectory;
}

// Records commands instead of running them. `onCommand` lets a test simulate
// side effects, e.g. `oxlint --init` creating its config file
//
export function createRecordingRunner(
  onCommand?: (command: string[], workingDirectory: string) => void,
): { commands: string[][]; runner: CommandRunner } {
  const commands: string[][] = [];
  const runner: CommandRunner = (command, workingDirectory) => {
    commands.push(command);
    onCommand?.(command, workingDirectory);
  };
  return { commands, runner };
}

// Setup context on a temporary project with a recording runner.
// A minimal package.json is added unless the test provides its own
//
export function createTestContext(
  files: Record<string, string> = {},
  packageManager: PackageManagerName = "bun",
  onCommand?: (command: string[], workingDirectory: string) => void,
): { commands: string[][]; context: SetupContext } {
  const projectDirectory = createTemporaryProject({
    "package.json": '{ "name": "fixture" }',
    ...files,
  });
  const { commands, runner } = createRecordingRunner(onCommand);
  return {
    commands,
    context: {
      isWorkspaceRoot: false,
      packageManager,
      projectDirectory,
      report: createSetupReport(),
      runCommand: runner,
    },
  };
}
