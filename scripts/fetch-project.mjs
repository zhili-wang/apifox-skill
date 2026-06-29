#!/usr/bin/env node

/**
 * Fetch Apifox project API docs and cache them locally.
 *
 * Usage:
 *   node fetch-project.mjs --project-id=123456
 *   node fetch-project.mjs --project-name=orders
 *   node fetch-project.mjs --project-id=123456 --refresh
 *
 * Reads token from config.json.
 */

import { readConfig, findProject } from "./lib/config.mjs";
import { exportProjectOpenAPI } from "./lib/apifox.mjs";
import { hasProjectCache, clearProjectCache, writeProjectCache } from "./lib/cache.mjs";

function parseArgs(argv) {
  const out = { projectId: "", projectName: "", refresh: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project-id") {
      const v = argv[++i];
      if (!v || v.startsWith("-")) throw new Error("--project-id 缺少值");
      out.projectId = v;
    } else if (a.startsWith("--project-id=")) out.projectId = a.slice(13);
    else if (a === "--project-name") {
      const v = argv[++i];
      if (!v || v.startsWith("-")) throw new Error("--project-name 缺少值");
      out.projectName = v;
    } else if (a.startsWith("--project-name=")) out.projectName = a.slice(15);
    else if (a === "--refresh") out.refresh = true;
    else if (a === "-h" || a === "--help") out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`Fetch Apifox project API docs and cache locally.

Usage:
  node fetch-project.mjs --project-id=123456
  node fetch-project.mjs --project-name=orders
  node fetch-project.mjs --project-id=123456 --refresh

Options:
  --project-id=<id>     Apifox project id (pure digits)
  --project-name=<name>  Find project by name from config.json
  --refresh            Force re-fetch even if cache exists
  -h, --help           Show this help`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const cfg = readConfig();

  let project;
  if (args.projectId) {
    project = findProject(cfg, args.projectId);
  } else if (args.projectName) {
    project = findProject(cfg, args.projectName);
  } else {
    project = cfg.projects[0];
  }

  if (args.refresh && hasProjectCache(project.id)) {
    clearProjectCache(project.id);
  }

  console.log(`正在拉取项目 ${project.name}(${project.id}) 的接口文档...`);
  const spec = await exportProjectOpenAPI({ projectId: project.id, token: cfg.token });
  const { original, index, metadata } = writeProjectCache(project.id, spec);

  console.log("✅ 拉取完成");
  console.log(`  标题：${metadata.title || "(无)"}`);
  console.log(`  版本：${metadata.version || "(无)"}`);
  console.log(`  接口数：${metadata.pathCount}`);
  console.log(`  缓存文件：`);
  console.log(`    - ${original}`);
  console.log(`    - ${index}`);
}

main().catch((e) => {
  console.error(`✗ 拉取失败：${e.message}`);
  process.exit(1);
});
