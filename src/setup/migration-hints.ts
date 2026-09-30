import { existsSync } from "node:fs";
import path from "node:path";
import { readPackageManifest } from "../package-json.js";

interface MigrationSource {
  configFileNames: string[];
  guideUrl: string;
  packageJsonKey: string;
  toolName: string;
}

// Existing ESLint / Prettier setups are left alone; we only point to the official
// oxc migration guides so the project can switch over deliberately
//
const migrationSources: MigrationSource[] = [
  {
    configFileNames: [
      ".eslintrc",
      ".eslintrc.cjs",
      ".eslintrc.js",
      ".eslintrc.json",
      ".eslintrc.yaml",
      ".eslintrc.yml",
      "eslint.config.cjs",
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.ts",
    ],
    guideUrl: "https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint",
    packageJsonKey: "eslintConfig",
    toolName: "ESLint",
  },
  {
    configFileNames: [
      ".prettierrc",
      ".prettierrc.cjs",
      ".prettierrc.js",
      ".prettierrc.json",
      ".prettierrc.mjs",
      ".prettierrc.toml",
      ".prettierrc.yaml",
      ".prettierrc.yml",
      "prettier.config.cjs",
      "prettier.config.js",
      "prettier.config.mjs",
      "prettier.config.ts",
    ],
    guideUrl: "https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier",
    packageJsonKey: "prettier",
    toolName: "Prettier",
  },
];

export function findMigrationHints(projectDirectory: string): string[] {
  const manifest = readPackageManifest(projectDirectory);
  const hasConfigFile = (fileName: string) => existsSync(path.join(projectDirectory, fileName));

  return migrationSources
    .filter(
      (migrationSource) =>
        migrationSource.packageJsonKey in manifest ||
        migrationSource.configFileNames.some(hasConfigFile),
    )
    .map(
      (migrationSource) =>
        `${migrationSource.toolName} configuration found. Migration guide: ${migrationSource.guideUrl}`,
    );
}
