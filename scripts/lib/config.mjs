#!/usr/bin/env node

/**
 * Apifox skill configuration helpers.
 *
 * Reads/writes a single config.json at the skill root. Supports multiple
 * Apifox projects under one account-level access token.
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve skill root: prefer CLAUDE_SKILL_DIR, fall back to script parent.
export const SKILL_ROOT = process.env.CLAUDE_SKILL_DIR || path.resolve(__dirname, "../..");

export const CONFIG_PATH = path.join(SKILL_ROOT, "config.json");
export const TEMPLATE_PATH = path.join(SKILL_ROOT, "config.template.json");

const PLACEHOLDERS = new Set([
  "<access-token>",
  "<your-token>",
  "your_apifox_token_here",
  "YOUR_APIFOX_ACCESS_TOKEN",
  "afs-xxxxxxxxxxxxxxxxxxxx",
]);

/**
 * Validate a single project entry.
 * @param {unknown} p
 * @param {number} idx
 */
function validateProject(p, idx) {
  if (!p || typeof p !== "object") {
    throw new Error(`projects[${idx}] 必须是对象`);
  }
  const { id, name } = p;
  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    throw new Error(`projects[${idx}].id 必须是纯数字字符串，收到：${id}`);
  }
  if (name !== undefined && typeof name !== "string") {
    throw new Error(`projects[${idx}].name 必须是字符串`);
  }
}

/**
 * Validate the full config object.
 * @param {unknown} cfg
 */
export function validateConfig(cfg) {
  if (!cfg || typeof cfg !== "object") {
    throw new Error("config.json 必须是 JSON 对象");
  }
  const { token, projects } = cfg;

  if (typeof token !== "string" || token.trim() === "") {
    throw new Error("config.json 缺少 token 或 token 为空");
  }
  if (PLACEHOLDERS.has(token) || token.includes("<")) {
    throw new Error("config.json 中的 token 仍是占位符，请先运行初始化");
  }
  if (!/^(afs-|afxp_)/.test(token)) {
    throw new Error("token 格式无效：Apifox 访问令牌应以 afs- 或 afxp_ 开头");
  }

  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error("config.json 必须包含至少一个 project");
  }

  projects.forEach(validateProject);

  return {
    token,
    projects: projects.map((p) => ({
      id: String(p.id),
      name: typeof p.name === "string" && p.name.trim() !== "" ? p.name.trim() : `project-${p.id}`,
    })),
  };
}

/**
 * Read and validate config.json.
 * @returns {{ token: string, projects: Array<{id: string, name: string}> }}
 */
export function readConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`config.json 不存在：${CONFIG_PATH}\n请先运行 /apifox-skill 初始化配置。`);
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) {
    throw new Error(`config.json 解析失败：${e.message}`);
  }
  return validateConfig(raw);
}

/**
 * Check whether config.json exists and is valid.
 * @returns {{ ok: boolean, config?: object, error?: string }}
 */
export function checkConfig() {
  try {
    const cfg = readConfig();
    return { ok: true, config: cfg };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Write config.json atomically with backup.
 * @param {{ token: string, projects: Array<{id: string, name?: string}> }} cfg
 */
export function writeConfig(cfg) {
  const normalized = validateConfig(cfg);

  if (existsSync(CONFIG_PATH)) {
    copyFileSync(CONFIG_PATH, `${CONFIG_PATH}.bak`);
  }

  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

/**
 * Find a project by id or name (case-insensitive exact or unambiguous prefix match).
 * @param {{ token: string, projects: Array<{id: string, name: string}> }} cfg
 * @param {string} idOrName
 */
export function findProject(cfg, idOrName) {
  const term = String(idOrName || "").trim().toLowerCase();
  if (!term) return cfg.projects[0];

  // Exact match by project id
  const byId = cfg.projects.find((p) => p.id === term);
  if (byId) return byId;

  // Exact match by project name
  const byName = cfg.projects.find((p) => p.name.toLowerCase() === term);
  if (byName) return byName;

  // Prefix match only when it resolves to a single project
  const prefixMatches = cfg.projects.filter((p) => p.name.toLowerCase().startsWith(term));
  if (prefixMatches.length === 1) return prefixMatches[0];
  if (prefixMatches.length > 1) {
    throw new Error(
      `项目名 "${idOrName}" 匹配到多个项目：${prefixMatches.map((p) => `${p.name}(${p.id})`).join(", ")}。请使用完整项目名或项目 ID。`
    );
  }

  throw new Error(`未找到项目：${idOrName}。可用项目：${cfg.projects.map((p) => `${p.name}(${p.id})`).join(", ")}`);
}

/**
 * Return the config template content for documentation/init prompts.
 * @returns {string}
 */
export function readTemplate() {
  if (!existsSync(TEMPLATE_PATH)) {
    return JSON.stringify({ token: "", projects: [{ id: "", name: "" }] }, null, 2);
  }
  return readFileSync(TEMPLATE_PATH, "utf8");
}
