#!/usr/bin/env node

/**
 * Read cached Apifox project API docs.
 *
 * Usage:
 *   node read-project.mjs --project-id=123456
 *   node read-project.mjs --project-name=orders
 *   node read-project.mjs --project-id=123456 --index        # only output index
 *   node read-project.mjs --project-id=123456 --path=/users  # only output one path
 */

import { readConfig, findProject } from "./lib/config.mjs";
import { readProjectCache, readProjectIndex, hasProjectCache } from "./lib/cache.mjs";

function parseArgs(argv) {
  const out = { projectId: "", projectName: "", index: false, path: "", help: false };
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
    else if (a === "--path") {
      const v = argv[++i];
      if (!v || v.startsWith("-")) throw new Error("--path 缺少值");
      out.path = v;
    } else if (a.startsWith("--path=")) out.path = a.slice(7);
    else if (a === "--index") out.index = true;
    else if (a === "-h" || a === "--help") out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`Read cached Apifox project API docs.

Usage:
  node read-project.mjs --project-id=123456
  node read-project.mjs --project-name=orders
  node read-project.mjs --project-id=123456 --index
  node read-project.mjs --project-id=123456 --path=/users

Options:
  --project-id=<id>     Apifox project id
  --project-name=<name>  Find project by name from config.json
  --index              Output lightweight index instead of full spec
  --path=<path>        Output only the specified path from the spec
  -h, --help           Show this help`);
}

function getPathSpec(spec, pathUrl) {
  const normalized = pathUrl.startsWith("/") ? pathUrl : `/${pathUrl}`;
  const methods = spec.paths?.[normalized];
  if (!methods) {
    throw new Error(`路径 ${normalized} 不存在于缓存中。可用路径：${Object.keys(spec.paths || {}).join(", ")}`);
  }
  return { path: normalized, methods };
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

  if (!hasProjectCache(project.id)) {
    console.error(`✗ 项目 ${project.name}(${project.id}) 的缓存不存在。请先运行：`);
    console.error(`  node scripts/fetch-project.mjs --project-id=${project.id}`);
    process.exit(1);
  }

  let output;
  if (args.index) {
    output = readProjectIndex(project.id);
  } else if (args.path) {
    output = getPathSpec(readProjectCache(project.id), args.path);
  } else {
    output = readProjectCache(project.id);
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error(`✗ 读取失败：${e.message}`);
  process.exit(1);
});
