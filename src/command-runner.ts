import { spawnSync } from "node:child_process";

// All process spawning goes through this type so setup steps can be tested
// with a recording fake instead of installing real packages
//
export type CommandRunner = (command: string[], workingDirectory: string) => void;

export class CommandFailedError extends Error {
  constructor(
    public readonly command: string[],
    public readonly exitCode: number | null,
  ) {
    super(`Command failed with exit code ${exitCode ?? "unknown"}: ${command.join(" ")}`);
    this.name = "CommandFailedError";
  }
}

// Output is inherited so users see package manager progress and prompts.
// Windows needs a shell to resolve `.cmd` shims like `npm.cmd` and `npx.cmd`
//
export const runCommand: CommandRunner = (command, workingDirectory) => {
  const [executable, ...executableArguments] = command;
  if (!executable) {
    throw new Error("Cannot run an empty command");
  }

  const result = spawnSync(executable, executableArguments, {
    cwd: workingDirectory,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new CommandFailedError(command, result.status);
  }
};
