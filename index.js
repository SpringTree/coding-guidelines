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

  .option( '--skip-ts', 'Disable adding typescript related features' )

  .option( '--gitflow', 'Setup husky to ensure git flow branch naming is enforced' )

  .option( '--init', 'Setup linting and commitlog' )

  .parse( process.argv );

// Check if any options was specified
//
if ( !program.linter && !program.gitignore && !program.gitcommit && !program.gitflow && !program.init ) {
  program.help();
}

if ( program.skipTs ) {
  console.log( 'Skipping TypeScript support' );
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
  ];

  if ( !program.skipTs ) {
    packagesToInstall.push( 'tslint' );
    packagesToInstall.push( 'tslint-config-airbnb' );
    packagesToInstall.push( 'tslint-eslint-rules' );
    packagesToInstall.push( 'typescript' );
  }

  childProcess.execSync( `npm i -D ${packagesToInstall.join( ' ' )}` );

  console.log( 'Writing linter config files...' );
  const templateEslintrc = fs.readFileSync( path.resolve( appRoot, '.eslintrc.json' ) );
  fs.writeFileSync( path.resolve( './.eslintrc.json' ), templateEslintrc );

  // Open the target project package.json
  // We have to keep re-opening this file or the changes from the npm installs
  // above will be overwritten
  //
  const packageJsonFile = path.resolve( './package.json' );
  const packageJson = jsonfile.readFileSync( packageJsonFile );

  // Add tslint based run scripts
  //
  if ( !program.skipTs ) {
    const templateTslintrc = fs.readFileSync( path.resolve( appRoot, 'tslint.json' ) );
    fs.writeFileSync( path.resolve( './tslint.json' ), templateTslintrc );

    // Add npm run scripts for tslint based linting
    //
    // * tslint - run project linting
    // * tslint:fix - fix project issues
    //
    if ( !packageJson.scripts ) {
      packageJson.scripts = {};
    }
    packageJson.scripts.tslint = 'tslint -p tsconfig.json';
    packageJson.scripts['tslint:fix'] = 'tslint -p tsconfig.json --fix';
  }

  // Update the package.json file
  //
  console.log( 'Updating package.json...' );
  jsonfile.writeFileSync( packageJsonFile, packageJson, { spaces: 2 } );
}

// Setup git commitlog check hook
//
if ( program.gitcommit || program.init ) {
  console.log( 'Installing git commit dependencies...' );
  childProcess.execSync( 'npm i -D husky @commitlint/cli @commitlint/config-conventional' );

  console.log( 'Adding git commit hook to package.json...' );

  // Open the target project package.json
  // We have to keep re-opening this file or the changes from the npm installs
  // above will be overwritten
  //
  const packageJsonFile = path.resolve( './package.json' );
  const packageJson = jsonfile.readFileSync( packageJsonFile );

  // Add husky entry to package.json if missing
  //
  if ( !packageJson.husky ) {
    packageJson.husky = {};
  }
  if ( !packageJson.husky.hooks ) {
    packageJson.husky.hooks = {};
  }
  packageJson.husky.hooks['commit-msg'] = 'commitlint -E HUSKY_GIT_PARAMS';
  jsonfile.writeFileSync( packageJsonFile, packageJson, { spaces: 2 } );

  // Update the package.json file
  //
  console.log( 'Updating package.json...' );
  jsonfile.writeFileSync( packageJsonFile, packageJson, { spaces: 2 } );

  console.log( 'Writing commitlint config...' );
  const templateCommitlintConfig = fs.readFileSync( path.resolve( appRoot, 'commitlint.config.js' ) );
  fs.writeFileSync( path.resolve( './commitlint.config.js' ), templateCommitlintConfig );
}

// Setup gitflow branch naming check hook
//
if ( program.gitflow ) {
  console.log( 'Installing gitflow dependencies...' );
  childProcess.execSync( 'npm i -D husky enforce-gitflow-branches' );

  console.log( 'Adding gitflow pre-push hook to package.json...' );

  // Open the target project package.json
  // We have to keep re-opening this file or the changes from the npm installs
  // above will be overwritten
  //
  const packageJsonFile = path.resolve( './package.json' );
  const packageJson = jsonfile.readFileSync( packageJsonFile );

  // Add husky entry to package.json if missing
  //
  if ( !packageJson.husky ) {
    packageJson.husky = {};
  }
  if ( !packageJson.husky.hooks ) {
    packageJson.husky.hooks = {};
  }
  packageJson.husky.hooks['pre-push'] = 'enforce-gitflow-branches';

  // Update the package.json file
  //
  console.log( 'Updating package.json...' );
  jsonfile.writeFileSync( packageJsonFile, packageJson, { spaces: 2 } );
}

// Sanity check for basic files
//
if ( program.init ) {
  // Check if an gitignore file exists
  //
  const gitignoreFile = path.resolve( './.gitignore' );
  if ( !fs.existsSync( gitignoreFile ) ) {
    console.log( 'Adding gitignore file...' );
    fs.writeFileSync( gitignoreFile, 'node_modules' );
  }

  // Check if an nvmrc file exists
  //
  const nvmrcFile = path.resolve( './.nvmrc' );
  if ( !fs.existsSync( nvmrcFile ) ) {
    console.log( 'Adding nvmrc file...' );
    fs.writeFileSync( nvmrcFile, 'v8' );
  }

  // Check if a tsconfig.json file is present
  // Use the config from this project as a baseline if missing
  //
  if ( !program.skipTs ) {
    const tsconfigFile = path.resolve( './tsconfig.json' );
    if ( !fs.existsSync( tsconfigFile ) ) {
      const templateTsConfig = fs.readFileSync( path.resolve( appRoot, 'tsconfig.json' ) );
      console.log( 'Adding tsconfig.json file...' );
      fs.writeFileSync( tsconfigFile, templateTsConfig );
    }
  }
}

console.log( 'Done. Happy coding!' );
