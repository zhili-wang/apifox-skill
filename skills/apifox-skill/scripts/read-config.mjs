#!/usr/bin/env node

/**
 * Apifox skill config reader.
 *
 * Reads and validates config.json at the skill root, then prints a JSON
 * summary suitable for SKILL.md consumption.
 *
 * Output: single JSON object on stdout.
 * Exit 0 = ready, 1 = not ready.
 */

import { checkConfig, CONFIG_PATH } from "./lib/config.mjs";

const result = checkConfig();

if (!result.ok) {
  console.log(JSON.stringify({
    status: "not_ready",
    configPath: CONFIG_PATH,
    error: result.error,
    nextStep: "运行 /apifox-skill 或 node scripts/init.mjs 完成初始化。",
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ready",
  configPath: CONFIG_PATH,
  tokenPreview: `${result.config.token.slice(0, 6)}…${result.config.token.slice(-4)}`,
  projectCount: result.config.projects.length,
  projects: result.config.projects,
}, null, 2));
process.exit(0);
