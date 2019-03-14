#!/usr/bin/env node
const program = require( 'commander' );
const childProcess = require( 'child_process' );
const fs = require( 'fs' );
const jsonfile = require( 'jsonfile' );
const path = require( 'path' );

// Determine script location
//
const appRoot = path.resolve( __dirname );

// Load package.json
//
const selfPkg = jsonfile.readFileSync( path.resolve( appRoot, 'package.json' ) );

// Collect command-line options and arguments
//
program
  .version( selfPkg.version )
  .usage( '[options]' )

  .option( '--linter', 'Setup linting and git commit for the current folder' )
  .option( '--gitcommit', 'Setup husky and commitlint' )

  .option( '--init', 'Setup all of the above' )

  .parse( process.argv );

// Check if any options was specified
//
if ( !program.linter && !program.gitignore && !program.gitcommit && !program.init ) {
  program.help();
}

// Setup linter
//
if ( program.linter || program.init ) {
  console.log( 'Installing linter dependencies...' );
  const packagesToInstall = [
    'eslint',
    'eslint-config-airbnb',
    'eslint-plugin-import',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react',
    'tslint',
    'tslint-config-airbnb',
    'tslint-eslint-rules',
    'typescript',
  ];
  childProcess.execSync( `npm i -D ${packagesToInstall.join( ' ' )}` );

  console.log( 'Writing linter config files...' );
  const templateEslintrc = fs.readFileSync( path.resolve( appRoot, '.eslintrc.json' ) );
  fs.writeFileSync( path.resolve( './.eslintrc.json' ), templateEslintrc );
  const templateTslintrc = fs.readFileSync( path.resolve( appRoot, 'tslint.json' ) );
  fs.writeFileSync( path.resolve( './tslint.json' ), templateTslintrc );

  // Add npm run scripts for linting
  //
  // * tslint - run project linting
  // * tslint-fix - fix project issues
  //
  const packageJsonFile = path.resolve( './package.json' );
  const packageJson = jsonfile.readFileSync( packageJsonFile );
  if ( !packageJson.scripts ) {
    packageJson.scripts = {};
  }
  packageJson.scripts.tslint = 'tslint -p tsconfig.json';
  packageJson.scripts['tslint-fix'] = 'tslint -p tsconfig,json --fix';
  jsonfile.writeFileSync( packageJsonFile, packageJson, { spaces: 2 } );
}

// Setup git commit hook
//
if ( program.gitcommit || program.init ) {
  console.log( 'Installing git commit dependencies...' );
  childProcess.execSync( 'npm i -D husky @commitlint/cli @commitlint/config-angular' );

  console.log( 'Adding git commit hook to package.json...' );
  const packageJsonFile = path.resolve( './package.json' );
  const packageJson = jsonfile.readFileSync( packageJsonFile );

  // Add husky hoop to package.json
  //
  if ( !packageJson.husky ) {
    packageJson.husky = {};
  }
  if ( !packageJson.husky.hooks ) {
    packageJson.husky.hooks = {};
  }
  packageJson.husky.hooks['commit-msg'] = 'commitlint -E HUSKY_GIT_PARAMS';
  jsonfile.writeFileSync( packageJsonFile, packageJson, { spaces: 2 } );

  console.log( 'Writing commitlint config...' );
  const templateCommitlintConfig = fs.readFileSync( path.resolve( appRoot, 'commitlint.config.js' ) );
  fs.writeFileSync( path.resolve( './commitlint.config.js' ), templateCommitlintConfig );
}

console.log( 'Done. Happy coding!' );
