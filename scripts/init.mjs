#!/usr/bin/env node

/**
 * Apifox skill initializer.
 *
 * Writes a single config.json at the skill root containing the account-level
 * APIFOX_ACCESS_TOKEN and a list of Apifox project IDs.
 *
 * Run:
 *   node init.mjs --token=afs-xxx --project-id=123 --project-id=456
 *   node init.mjs --token=afs-xxx --project-id=123 --project-name=orders \
 *                 --project-id=456 --project-name=payments
 *
 * Node >= 18. Zero dependencies.
 */

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { writeConfig, readTemplate, CONFIG_PATH } from "./lib/config.mjs";

const log = (...a) => console.log(...a);
const warn = (...a) => console.error(...a);

function nextValue(argv, i, flag) {
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("-")) {
    throw new Error(`参数 ${flag} 缺少值`);
  }
  return v;
}

function parseArgs(argv) {
  const out = { token: "", projectIds: [], projectNames: [], yes: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--token") out.token = nextValue(argv, i++, "--token");
    else if (a.startsWith("--token=")) out.token = a.slice(8);
    else if (a === "--project-id") out.projectIds.push(nextValue(argv, i++, "--project-id"));
    else if (a.startsWith("--project-id=")) out.projectIds.push(a.slice(13));
    else if (a === "--project-name") out.projectNames.push(nextValue(argv, i++, "--project-name"));
    else if (a.startsWith("--project-name=")) out.projectNames.push(a.slice(15));
    else if (a === "-y" || a === "--yes") out.yes = true;
    else if (a === "-h" || a === "--help") out.help = true;
  }
  return out;
}

function printHelp() {
  log(`Apifox skill initializer

Usage:
  node init.mjs --token=afs-xxx --project-id=123 --project-id=456
  node init.mjs --token=afs-xxx --project-id=123 --project-name=orders \
                --project-id=456 --project-name=payments

Options:
  --token=<t>          Apifox access token
  --project-id=<id>     Apifox project id (digits, repeatable)
  --project-name=<n>    Optional human-readable name for the preceding project id (repeatable)
  -y, --yes            Skip confirmation prompt
  -h, --help           Show this help

Config will be written to: ${CONFIG_PATH}`);
}

function maskToken(t) {
  if (!t || t.length < 10) return "(too short)";
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function buildProjects(ids, names) {
  return ids.map((id, idx) => ({
    id,
    name: names[idx] || `project-${id}`,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    // 1. token
    let token = args.token || process.env.APIFOX_ACCESS_TOKEN;
    if (!token) {
      log("Apifox API 访问令牌获取：Apifox 头像 → 账号设置 → API 访问令牌 → 新建");
      log("(介意输入可见？改用：APIFOX_ACCESS_TOKEN=xxx node init.mjs --project-id=123)");
      token = (await rl.question("\n请输入 APIFOX_ACCESS_TOKEN: ")).trim();
    }
    if (!token) {
      warn("\n✗ 未提供有效的 token，已取消。");
      process.exit(1);
    }

    // 2. project ids
    const projectIds = [...args.projectIds];
    while (projectIds.length === 0) {
      const input = (await rl.question("请输入 Apifox 项目 ID（项目设置→基本设置，纯数字，多个用逗号分隔）: ")).trim();
      const ids = input.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.every((id) => /^\d+$/.test(id))) {
        projectIds.push(...ids);
      } else {
        warn(`✗ project-id 必须为纯数字，请重新输入。`);
      }
    }

    const invalidId = projectIds.find((id) => !/^\d+$/.test(id));
    if (invalidId) {
      warn(`\n✗ project-id 必须为纯数字，收到：${invalidId}。已取消。`);
      process.exit(1);
    }

    // 3. project names (optional)
    const projects = buildProjects(projectIds, args.projectNames);
    for (let i = args.projectNames.length; i < projects.length; i++) {
      const defaultName = `project-${projects[i].id}`;
      const name = (await rl.question(`项目 ${projects[i].id} 的名称（回车使用 ${defaultName}）: `)).trim();
      projects[i].name = name || defaultName;
    }

    // 4. confirm
    if (!args.yes) {
      log("\n即将写入以下配置：");
      log(`  token: ${maskToken(token)}`);
      log(`  projects:`);
      for (const p of projects) log(`    - ${p.id}: ${p.name}`);
      log(`  路径: ${CONFIG_PATH}`);
      const confirm = (await rl.question("\n继续？[Y/n] ")).trim().toLowerCase();
      if (confirm && confirm !== "y" && confirm !== "yes") {
        log("已取消。");
        return;
      }
    }

    // 5. write
    writeConfig({ token, projects });

    log("\n✅ config.json 已写入。");
    log(`路径：${CONFIG_PATH}`);
    log("\n配置模板参考：");
    log(readTemplate());
    log("\n下一步：");
    log("  1. 确保 config.json 不会被提交到 Git（已加入 .gitignore）");
    log(`  2. 拉取接口文档：node scripts/fetch-project.mjs --project-name=${projects[0].name}`);
    log(`  3. 读取文档索引：node scripts/read-project.mjs --project-name=${projects[0].name} --index`);
    log("  4. Apifox 内文档更新后，运行 scripts/refresh-project.mjs 刷新缓存");
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  warn(`\n✗ 初始化失败：${e.message}`);
  process.exit(1);
});
