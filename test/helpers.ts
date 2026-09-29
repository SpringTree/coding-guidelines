import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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
