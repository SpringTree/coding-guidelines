#!/usr/bin/env node
import * as childProcess from 'child_process';
import * as jsonfile from 'jsonfile';
import * as fs from 'fs';
import * as path from 'path';
import * as prompts from 'prompts';

// Determine location of package root so we can get our example files
//
const appRoot = path.resolve(__dirname, '..');

// Read our package.json file
//
const selfPkg = jsonfile.readFileSync(path.resolve(appRoot, 'package.json'));

console.log(`SpringTree coding tool version ${selfPkg.version}`);
console.log('This tool will setup linting, commit hooks and other standard best practices');
console.log('We use the AirBnB rules with TypeScript support');
console.log('Default source folder is assumed to be `src/`');
console.log('Setting up your current directory for SpringTree coding...');

// Prepare the prompt questions
//
const questions: prompts.PromptObject[] = [];

// First check if the current folder has a .git folder
//
const isGitRepository = fs.existsSync('.git');
if (!isGitRepository) {
  questions.push({
    type: 'confirm',
    name: 'git',
    message: 'Current folder is not a Git repository. Run `git init`?',
    initial: true,
  });
}

// Setup the main feature questions
//
questions.push({
  type: 'confirm',
  name: 'eslintReact',
  message: 'Setup eslint with React support?',
  initial: true,
});
questions.push({
  type: 'confirm',
  name: 'gitFlow',
  message: 'Setup git flow branch name checker?',
  initial: true,
});
questions.push({
  type: 'confirm',
  name: 'commitLint',
  message: 'Setup commit-lint?',
  initial: true,
});
questions.push({
  type: 'confirm',
  name: 'tsconfig',
  message: 'Create a tsconfig.json file?',
  initial: false,
});

// int main(void) with async support
//
(async () => {
  const responses = await prompts(questions);

  if (responses.git) {
    console.log('SCM: Initializing new Git repository...');
    childProcess.execSync('git init');

    // Check if an gitignore file exists
    //
    const gitignoreFile = path.resolve('./.gitignore');
    if (!fs.existsSync(gitignoreFile)) {
      console.log('SCM: Adding gitignore file...');
      fs.writeFileSync(gitignoreFile, 'node_modules');
    }
  }

  // Check if an editor-config file exists
  //
  const editorConfigFile = path.resolve('./.editorconfig');
  if (!fs.existsSync(editorConfigFile)) {
    const templateEditorConfig = fs.readFileSync(path.resolve(appRoot, '.editorconfig'));
    console.log('LINTER: Adding editorconfig file...');
    fs.writeFileSync(editorConfigFile, templateEditorConfig);
  }

  // We always install the linter and husky
  //
  const packagesToInstall: string[] = [
    'husky',
    'lint-staged',
    'eslint',
    'eslint-config-airbnb-typescript',
    'eslint-plugin-import@^2.22.0',
    '@typescript-eslint/eslint-plugin@^4.4.1',
  ];

  if (responses.eslintReact) {
    // Eslint with TypeScript support and React plugins
    //
    console.log('LINTER: Configuring ESLint with TypeScript and React support using AirBnB rules...');
    packagesToInstall.push('eslint-plugin-jsx-a11y@^6.3.1');
    packagesToInstall.push('eslint-plugin-react@^7.20.3');
    packagesToInstall.push('eslint-plugin-react-hooks@^4.0.8');
  } else {
    // Only basic eslint with TypeScript support
    //
    console.log('Configuring ESLint with TypeScript using AirBnB rules...');
  }
  childProcess.execSync(`npm i -D ${packagesToInstall.join(' ')}`);

  // The configuration file in this project is the template
  //
  console.log('LINTER: Setting up linter config file...');
  const templateEslintConfig = fs.readFileSync(path.resolve(appRoot, '.eslintrc.json'));
  fs.writeFileSync(path.resolve('./.eslintrc.json'), templateEslintConfig);
  console.log('HOOKS: Setting up linter commit check...');
  const templateLintStagedConfig = fs.readFileSync(path.resolve(appRoot, '.lintstagedrc.json'));
  fs.writeFileSync(path.resolve('./.lintstagedrc.json'), templateLintStagedConfig);

  // Prepare the husky configuration
  //
  const huskyConfig: any = {
    hooks: {
      'pre-commit': 'lint-staged',
    },
  };

  if (responses.commitLint) {
    console.log('HOOKS: Installing commit-lint...');
    childProcess.execSync('npm i -D @commitlint/cli @commitlint/config-conventional');
    huskyConfig.hooks['commit-msg'] = 'commitlint -E HUSKY_GIT_PARAMS';

    const templateCommitLintConfig = fs.readFileSync(path.resolve(appRoot, '.commitlintrc.json'));
    fs.writeFileSync(path.resolve('./.commitlintrc.json'), templateCommitLintConfig);
  }

  if (responses.gitFlow) {
    console.log('HOOKS: Installing git-flow branch check...');
    childProcess.execSync('npm i -D @springtree/check-git-branch-name');
    huskyConfig.hooks['pre-push'] = 'check-git-branch-name -e';
  }

  console.log('HOOKS: Configuring...');
  jsonfile.writeFileSync(path.resolve('./.huskyrc.json'), huskyConfig, { spaces: 2 });

  if (responses.tsconfig) {
    console.log('TSC: Setting up project config file...');
    const templateTSConfig = fs.readFileSync(path.resolve(appRoot, 'tsconfig.json'));
    fs.writeFileSync(path.resolve('./tsconfig.json'), templateTSConfig);
  }

  // Check if an nvmrc file exists
  //
  const nvmrcFile = path.resolve('./.nvmrc');
  if (!fs.existsSync(nvmrcFile)) {
    console.log('NVM: Adding nvmrc file for node v12...');
    fs.writeFileSync(nvmrcFile, 'v12');
  }

  console.log('DONE: Happy coding!');
})();
