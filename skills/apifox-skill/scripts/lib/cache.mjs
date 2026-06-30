#!/usr/bin/env node

/**
 * Local cache for Apifox API docs.
 *
 * Stores downloaded OpenAPI specs under data/cache/ within the skill root.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import path from "node:path";
import { SKILL_ROOT } from "./config.mjs";

export const CACHE_ROOT = path.join(SKILL_ROOT, "data", "cache");

function projectDir(projectId) {
  return path.join(CACHE_ROOT, "projects", String(projectId));
}

export function originalPath(projectId) {
  return path.join(projectDir(projectId), "original.json");
}

export function indexPath(projectId) {
  return path.join(projectDir(projectId), "index.json");
}

export function metadataPath(projectId) {
  return path.join(projectDir(projectId), "metadata.json");
}

/**
 * Ensure cache directory exists.
 * @param {string} projectId
 */
export function ensureProjectDir(projectId) {
  mkdirSync(projectDir(projectId), { recursive: true });
}

/**
 * Write spec data to cache.
 * @param {string} projectId
 * @param {object} spec
 * @returns {{ original: string, index: string, metadata: object }}
 */
export function writeProjectCache(projectId, spec) {
  ensureProjectDir(projectId);
  const original = originalPath(projectId);
  const index = indexPath(projectId);
  const metadata = metadataPath(projectId);

  const meta = {
    projectId,
    fetchedAt: new Date().toISOString(),
    title: spec.info?.title || "",
    version: spec.info?.version || "",
    pathCount: Object.keys(spec.paths || {}).length,
  };

  writeFileSync(original, `${JSON.stringify(spec, null, 2)}\n`);
  writeFileSync(index, `${JSON.stringify(buildIndex(spec), null, 2)}\n`);
  writeFileSync(metadata, `${JSON.stringify(meta, null, 2)}\n`);

  return { original, index, metadata: meta };
}

/**
 * Build a lightweight index of paths and schemas.
 * @param {object} spec
 */
function buildIndex(spec) {
  const paths = Object.entries(spec.paths || {}).map(([pathUrl, methods]) => ({
    path: pathUrl,
    methods: Object.entries(methods || {}).map(([method, op]) => ({
      method: method.toUpperCase(),
      operationId: op.operationId || "",
      summary: op.summary || "",
      description: op.description || "",
    })),
  }));

  const schemas = Object.keys(spec.components?.schemas || {});

  return {
    title: spec.info?.title || "",
    version: spec.info?.version || "",
    pathCount: paths.length,
    schemaCount: schemas.length,
    paths,
    schemas,
  };
}

/**
 * Read cached original spec.
 * @param {string} projectId
 * @returns {object}
 */
export function readProjectCache(projectId) {
  const p = originalPath(projectId);
  if (!existsSync(p)) {
    throw new Error(`项目 ${projectId} 的缓存不存在。请先运行 fetch-project 拉取文档。`);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

/**
 * Read cached index.
 * @param {string} projectId
 * @returns {object}
 */
export function readProjectIndex(projectId) {
  const p = indexPath(projectId);
  if (!existsSync(p)) {
    throw new Error(`项目 ${projectId} 的索引不存在。请先运行 fetch-project 拉取文档。`);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

/**
 * Check whether cache exists for a project.
 * @param {string} projectId
 */
export function hasProjectCache(projectId) {
  return existsSync(originalPath(projectId));
}

/**
 * Clear cache for a project.
 * @param {string} projectId
 */
export function clearProjectCache(projectId) {
  const dir = projectDir(projectId);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * List cached project ids.
 * @returns {string[]}
 */
export function listCachedProjects() {
  const dir = path.join(CACHE_ROOT, "projects");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((id) => hasProjectCache(id));
}
