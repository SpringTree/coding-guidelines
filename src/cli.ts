#!/usr/bin/env node
import { version } from "../package.json";

// Version flag is handled before anything else so it works outside of a project folder
//
if (process.argv.includes("--version")) {
  console.log(version);
}
