#!/usr/bin/env node
import { realpathSync } from "node:fs";
import prompts from "prompts";
import { version } from "../package.json";
import { runCommand } from "./command-runner.js";
import { detectProject } from "./detect-project.js";
import { setupCommitlint } from "./setup/commitlint.js";
import { findGitRoot, initializeGitRepository } from "./setup/git.js";
import { setupHusky } from "./setup/husky.js";
import { setupLintStaged } from "./setup/lint-staged.js";
import { findMigrationHints } from "./setup/migration-hints.js";
import { setupOxfmt } from "./setup/oxfmt.js";
import { setupOxlint } from "./setup/oxlint.js";
import { createSetupReport, type SetupContext, type SetupReport } from "./setup/setup-context.js";

type ToolName = "commitlint" | "lintStaged" | "oxfmt" | "oxlint";

class SetupCancelledError extends Error {
  constructor() {
    super("Setup cancelled");
    this.name = "SetupCancelledError";
  }
}

// prompts resolves with partial answers on Ctrl+C by default; throwing makes a
// cancel stop the run before any setup step has written files
//
async function ask<QuestionName extends string>(
  questions: prompts.PromptObject<QuestionName>[],
): Promise<prompts.Answers<QuestionName>> {
  return prompts(questions, {
    onCancel: () => {
      throw new SetupCancelledError();
    },
  });
}

// Hooks need a git repository, and husky expects it at the project root.
// Offers `git init` when there is no repository at all. Returns whether hooks
// can be installed and adds a notice when they cannot
//
async function prepareGitRepository(context: SetupContext): Promise<boolean> {
  let gitRoot = findGitRoot(context.projectDirectory);
  if (!gitRoot) {
    const gitAnswers = await ask([
      {
        initial: true,
        message: "This folder is not a git repository. Run `git init`?",
        name: "initializeGit",
        type: "confirm",
      },
    ]);
    if (gitAnswers.initializeGit !== true) {
      context.report.notices.push("Git hooks skipped: no git repository");
      return false;
    }
    initializeGitRepository(context);
    gitRoot = findGitRoot(context.projectDirectory);
  }

  // findGitRoot returns a real path, so resolve symlinks on our side too
  // (on macOS /var is a symlink to /private/var)
  //
  if (gitRoot !== realpathSync(context.projectDirectory)) {
    context.report.notices.push(
      `Git hooks skipped: the repository root is ${gitRoot}. ` +
        "See https://typicode.github.io/husky/how-to.html#project-not-in-git-root-directory",
    );
    return false;
  }
  return true;
}

async function askForTools(canInstallHooks: boolean): Promise<Record<ToolName, boolean>> {
  const toolQuestions: prompts.PromptObject<ToolName>[] = [
    { initial: true, message: "Set up oxlint (linting)?", name: "oxlint", type: "confirm" },
    { initial: true, message: "Set up oxfmt (formatting)?", name: "oxfmt", type: "confirm" },
  ];
  if (canInstallHooks) {
    toolQuestions.push(
      {
        initial: true,
        message: "Set up commitlint (conventional commit messages)?",
        name: "commitlint",
        type: "confirm",
      },
      {
        initial: true,
        message: "Lint and format staged files before each commit (lint-staged)?",
        name: "lintStaged",
        type: "confirm",
      },
    );
  }

  const toolAnswers = await ask(toolQuestions);
  return {
    commitlint: toolAnswers.commitlint === true,
    lintStaged: toolAnswers.lintStaged === true,
    oxfmt: toolAnswers.oxfmt === true,
    oxlint: toolAnswers.oxlint === true,
  };
}

function printSummary(report: SetupReport): void {
  const sections: Array<[string, string[]]> = [
    ["Created", report.created],
    ["Skipped", report.skipped],
    ["Notices", report.notices],
  ];
  for (const [sectionTitle, sectionLines] of sections) {
    if (sectionLines.length === 0) {
      continue;
    }
    console.log(`\n${sectionTitle}:`);
    for (const sectionLine of sectionLines) {
      console.log(`  - ${sectionLine}`);
    }
  }
  console.log("\nDone. Happy coding!");
}

async function main(): Promise<number> {
  // Version flag works anywhere, also outside a project folder
  //
  if (process.argv.includes("--version")) {
    console.log(version);
    return 0;
  }

  console.log(`SpringTree coding setup v${version}`);
  const projectDirectory = process.cwd();
  const detectedProject = detectProject(projectDirectory);
  if (!detectedProject) {
    console.error("No bun or node project found (missing package.json).");
    console.error(
      "Start new projects from one of the SpringTree template repositories, or run `bun init` first.",
    );
    return 1;
  }
  console.log(
    `Detected a ${detectedProject.runtime} project using ${detectedProject.packageManager}`,
  );

  const context: SetupContext = {
    isWorkspaceRoot: detectedProject.isWorkspaceRoot,
    packageManager: detectedProject.packageManager,
    projectDirectory,
    report: createSetupReport(),
    runCommand,
  };

  const canInstallHooks = await prepareGitRepository(context);
  const selectedTools = await askForTools(canInstallHooks);

  // Order matters: husky must be installed before hooks are written into .husky/
  //
  if (selectedTools.oxlint) {
    setupOxlint(context);
  }
  if (selectedTools.oxfmt) {
    setupOxfmt(context);
  }
  if (selectedTools.commitlint || selectedTools.lintStaged) {
    setupHusky(context);
  }
  if (selectedTools.commitlint) {
    setupCommitlint(context);
  }
  if (selectedTools.lintStaged) {
    setupLintStaged(context, { oxfmt: selectedTools.oxfmt, oxlint: selectedTools.oxlint });
  }

  context.report.notices.push(...findMigrationHints(projectDirectory));
  printSummary(context.report);
  return 0;
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((runError: unknown) => {
    console.error(runError instanceof Error ? runError.message : String(runError));
    process.exitCode = 1;
  });
