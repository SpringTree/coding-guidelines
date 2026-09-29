import { defineConfig } from "bunup";

// Single CLI bundle for Node so the package works with both `npx` and `bunx`.
// - dependencies (prompts) stay external and are installed by the package manager
// - no type declarations: this package has no importable API
//
export default defineConfig({
  dts: false,
  entry: "src/cli.ts",
  format: "esm",
  target: "node",
});
