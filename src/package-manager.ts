import type { PackageManagerName } from "./detect-project.js";

interface PackageManagerCommandPrefixes {
  addDevDependencies: string[];
  execute: string[];
}

// Command prefixes per package manager.
// - bun: `--bun` forces the bun runtime; plain bunx honours a `#!/usr/bin/env node`
//   shebang and fails when an outdated node is first on the PATH
// - npm: `--no` stops npx from silently downloading a package that is not installed
//   and `--` ends npx options so binary flags like `--init` are passed through
// - yarn: `yarn <binary>` runs local binaries in both yarn classic and berry
//
const commandPrefixes: Record<PackageManagerName, PackageManagerCommandPrefixes> = {
  bun: { addDevDependencies: ["bun", "add", "--dev"], execute: ["bunx", "--bun"] },
  npm: { addDevDependencies: ["npm", "install", "--save-dev"], execute: ["npx", "--no", "--"] },
  pnpm: { addDevDependencies: ["pnpm", "add", "--save-dev"], execute: ["pnpm", "exec"] },
  yarn: { addDevDependencies: ["yarn", "add", "--dev"], execute: ["yarn"] },
};

export function buildAddDevDependenciesCommand(
  packageManager: PackageManagerName,
  packageNames: string[],
): string[] {
  return [...commandPrefixes[packageManager].addDevDependencies, ...packageNames];
}

export function buildExecuteCommand(
  packageManager: PackageManagerName,
  binaryName: string,
  binaryArguments: string[] = [],
): string[] {
  return [...commandPrefixes[packageManager].execute, binaryName, ...binaryArguments];
}
