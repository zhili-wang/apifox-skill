#!/usr/bin/env node

/**
 * Refresh cached Apifox project API docs.
 *
 * Thin wrapper around fetch-project.mjs --refresh.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fetchScript = path.join(__dirname, "fetch-project.mjs");

const args = process.argv.slice(2);
if (!args.includes("--refresh")) args.push("--refresh");

const result = spawnSync("node", [fetchScript, ...args], {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 0);
