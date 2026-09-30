# SpringTree coding guidelines

[![npm version](https://badge.fury.io/js/%40springtree%2Fcoding.svg)](https://badge.fury.io/js/%40springtree%2Fcoding)

This repository contains information about our company rules and guidelines when it comes to writing software.
Our primary development language is JavaScript/TypeScript so those will be featured here prominently.
Starting a new project should be done with one of our (private) starter template repositories.

You can use `bunx` or `npx` to set up linting, formatting and git hooks in an existing project:

```bash
bunx @springtree/coding
# or
npx @springtree/coding
```

The tool detects whether the current folder is a [Bun](https://bun.sh) or Node project (npm, pnpm or yarn) and asks what to set up:

- a package quarantine: `.npmrc` and `bunfig.toml` refuse package versions published less than 7 days ago, as required by our [supply-chain gates](https://github.com/SpringTree/springtree-ci-workflows)
- [oxlint](https://oxc.rs/docs/guide/usage/linter) with its default rules, plus [type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware) when a `tsconfig.json` is present
- [oxfmt](https://oxc.rs/docs/guide/usage/formatter) with its default style
- [commitlint](https://commitlint.js.org) for commit messages
- [lint-staged](https://github.com/lint-staged/lint-staged) to lint and format staged files before each commit

Existing configuration files and `package.json` scripts are never overwritten.
Without a `package.json` the tool stops; start new projects from a template repository instead.

## Linting and formatting

We've standardized on using oxlint and oxfmt in their standard configuration.
Exceptions or adjustments to standard rules need a very good reason.

Coming from ESLint or Prettier? See the [ESLint migration guide](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint) and the [Prettier migration guide](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier).

## Human language

All code, variable names, code comments and documentation should be written in English.

## Project README

Every project needs to have a `README.md` (or equivalent) that must contain:

- the name and purpose of the project
- how to run the project
- how to build the project

Any additional information about how to run unit tests should be added if available.
We have a `README_TEMPLATE.md` available as a starting point.

## Git commit log format

We use the [Conventional Commits](https://www.conventionalcommits.org) format, enforced with [commitlint](https://commitlint.js.org) from a git hook managed by [husky](https://typicode.github.io/husky).
[lint-staged](https://github.com/lint-staged/lint-staged) runs oxlint and oxfmt on staged files in the same way.

Setup guides:

- [commitlint local setup](https://commitlint.js.org/guides/local-setup)
- [husky getting started](https://typicode.github.io/husky/get-started.html)

## Build using CI

All projects should be built using a CI and should not depend on the build chain of an individual developers laptop.
This should preferably be set up at project inception.

We use the following CI's at this time:

- [GitHub Actions](https://docs.github.com/en/actions)
- [CloudBuild](https://cloud.google.com/build/docs) (Google projects)
- [Bitrise.io](http://bitrise.io) (for mobile)

We recommend [release-please](https://github.com/googleapis/release-please-action) for versioning.
It derives the next version from the conventional commits, keeps a release pull request with the changelog up to date and creates the tag and GitHub release when that pull request is merged.
This works with protected branches because nothing is pushed to the main branch directly.

### Pull request validation with CI

We have organization wide enforced checks on our pull requests for ISO27001 related purposes.
Repositories call the shared [supply-chain gates](https://github.com/SpringTree/springtree-ci-workflows) (secrets, licences, code and package quarantine) from a `compliance.yml` workflow.
Projects should implement their own specific checks alongside these.

## Contributing

This repository uses [Bun](https://bun.sh).

```bash
bun install
bun test
bun run build
node dist/cli.js --version
```

Run the CLI from source in another project folder with `bun /path/to/coding-guidelines/src/cli.ts`.

### Releasing

Releases are fully handled by GitHub Actions; never publish from a laptop.

1. Merge pull requests with conventional commit messages into `master`
2. release-please opens or updates a release pull request with the version bump and changelog
3. Merging the release pull request creates the tag and GitHub release, and the release workflow runs `npm stage publish`
4. A maintainer approves the staged package with 2FA: `npm stage list @springtree/coding` and `npm stage approve <stage-id>`, or the Staged Packages tab on npmjs.com

See [staged publishing](https://docs.npmjs.com/staged-publishing) and [trusted publishing](https://docs.npmjs.com/trusted-publishers) for background.

One-time setup:

- npm: trusted publisher for this repository and `release.yml`, stage-only
- GitHub: an organization GitHub App with contents, pull requests and issues write access on this repository; its client id as the `RELEASE_APP_CLIENT_ID` repository variable and its private key as the `RELEASE_APP_PRIVATE_KEY` repository secret
