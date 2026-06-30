#!/usr/bin/env node

/**
 * Minimal Apifox Open API client.
 *
 * Mirrors the core behavior of apifox-mcp-server without the MCP protocol
 * overhead. Fetches project/export-openapi and docs-sites/export-mcp-data.
 */

const API_VERSION = "2024-03-28";
const DEFAULT_TIMEOUT_MS = 60_000;

function defaultBaseUrl() {
  return process.env.APIFOX_API_BASE_URL || "https://api.apifox.com";
}

/**
 * Fetch with timeout using AbortController.
 * @param {string|URL} url
 * @param {RequestInit & { timeoutMs?: number }} init
 */
async function fetchWithTimeout(url, init = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build request headers for Apifox API.
 * @param {string} token
 */
function authHeaders(token) {
  return {
    "User-Agent": "apifox-skill/1.0",
    "X-Apifox-Version": API_VERSION,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * POST /api/v1/projects/{projectId}/export-openapi
 *
 * @param {{ projectId: string, token: string, baseUrl?: string, timeoutMs?: number }} opts
 * @returns {Promise<object>}
 */
export async function exportProjectOpenAPI({ projectId, token, baseUrl = defaultBaseUrl(), timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const url = new URL(`/api/v1/projects/${projectId}/export-openapi`, baseUrl);
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ scope: { type: "ALL" } }),
    timeoutMs,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apifox API 请求失败 (${res.status} ${res.statusText}): ${text}`);
  }

  return res.json();
}

/**
 * POST /api/v1/docs-sites/{siteId}/export-mcp-data
 *
 * @param {{ siteId: string, token: string, baseUrl?: string, timeoutMs?: number }} opts
 * @returns {Promise<object>}
 */
export async function exportDocsSiteData({ siteId, token, baseUrl = defaultBaseUrl(), timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const url = new URL(`/api/v1/docs-sites/${siteId}/export-mcp-data`, baseUrl);
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: authHeaders(token),
    timeoutMs,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apifox API 请求失败 (${res.status} ${res.statusText}): ${text}`);
  }

  return res.json();
}

/**
 * Fetch a remote OpenAPI/Swagger file.
 *
 * @param {{ url: string, timeoutMs?: number }} opts
 * @returns {Promise<object>}
 */
export async function fetchRemoteOAS({ url, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const res = await fetchWithTimeout(url, {
    headers: { "User-Agent": "apifox-skill/1.0" },
    timeoutMs,
  });
  if (!res.ok) {
    throw new Error(`远程 OAS 文件请求失败 (${res.status} ${res.statusText}): ${url}`);
  }
  return res.json();
}
