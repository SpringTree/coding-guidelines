import { describe, expect, test } from "bun:test";
import { buildAddDevDependenciesCommand, buildExecuteCommand } from "../src/package-manager.js";

describe("buildAddDevDependenciesCommand", () => {
  test.each([
    ["bun", ["bun", "add", "--dev", "oxlint", "oxfmt"]],
    ["npm", ["npm", "install", "--save-dev", "oxlint", "oxfmt"]],
    ["pnpm", ["pnpm", "add", "--save-dev", "oxlint", "oxfmt"]],
    ["yarn", ["yarn", "add", "--dev", "oxlint", "oxfmt"]],
  ] as const)("%s", (packageManager, expectedCommand) => {
    expect(buildAddDevDependenciesCommand(packageManager, ["oxlint", "oxfmt"])).toEqual([
      ...expectedCommand,
    ]);
  });
});

describe("buildExecuteCommand", () => {
  test.each([
    ["bun", ["bunx", "--bun", "oxlint", "--init"]],
    ["npm", ["npx", "--no", "--", "oxlint", "--init"]],
    ["pnpm", ["pnpm", "exec", "oxlint", "--init"]],
    ["yarn", ["yarn", "oxlint", "--init"]],
  ] as const)("%s", (packageManager, expectedCommand) => {
    expect(buildExecuteCommand(packageManager, "oxlint", ["--init"])).toEqual([...expectedCommand]);
  });

  test("works without arguments", () => {
    expect(buildExecuteCommand("pnpm", "husky")).toEqual(["pnpm", "exec", "husky"]);
  });
});
