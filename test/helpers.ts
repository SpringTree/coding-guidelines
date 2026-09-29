import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CommandRunner } from "../src/command-runner.js";

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
