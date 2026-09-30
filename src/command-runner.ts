import crossSpawn from "cross-spawn";

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
// cross-spawn instead of node's spawnSync because of Windows:
// - npm, npx, pnpm and yarn are `.cmd` shims there, which node only runs through a shell
// - `shell: true` passes arguments to cmd.exe unescaped (and the supply-chain `code`
//   gate refuses it); cross-spawn resolves the shim and escapes each argument itself
// On macOS and Linux it calls node's spawnSync unchanged
//
export const runCommand: CommandRunner = (command, workingDirectory) => {
  const [executable, ...executableArguments] = command;
  if (!executable) {
    throw new Error("Cannot run an empty command");
  }

  const result = crossSpawn.sync(executable, executableArguments, {
    cwd: workingDirectory,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new CommandFailedError(command, result.status);
  }
};
