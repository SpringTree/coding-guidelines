import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
import { CommandFailedError, runCommand } from "../src/command-runner.js";
import { createTemporaryProject } from "./helpers.js";

describe("runCommand", () => {
  test("runs in the given working directory", () => {
    const projectDirectory = createTemporaryProject();

    runCommand(["sh", "-c", "touch marker"], projectDirectory);

    expect(existsSync(path.join(projectDirectory, "marker"))).toBe(true);
  });

  test("throws CommandFailedError with the exit code on failure", () => {
    const failingCommand = ["sh", "-c", "exit 3"];

    try {
      runCommand(failingCommand, createTemporaryProject());
      throw new Error("expected runCommand to throw");
    } catch (commandError) {
      expect(commandError).toBeInstanceOf(CommandFailedError);
      expect((commandError as CommandFailedError).exitCode).toBe(3);
      expect((commandError as CommandFailedError).command).toEqual(failingCommand);
    }
  });

  test("throws when the executable does not exist", () => {
    expect(() => runCommand(["springtree-missing-binary"], createTemporaryProject())).toThrow();
  });

  test("throws on an empty command", () => {
    expect(() => runCommand([], createTemporaryProject())).toThrow("empty command");
  });
});
