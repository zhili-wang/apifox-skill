#!/usr/bin/env node

/**
 * End-to-end test for the refactored apifox-skill.
 *
 * Tests config init/read + Apifox API fetch/read flow using a mock HTTP server.
 * Uses direct module imports instead of spawning child processes.
 */

import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert";

// Mock modules to use a temp skill root
const TMP = mkdtempSync(path.join(os.tmpdir(), "apifox-skill-e2e-"));
process.env.CLAUDE_SKILL_DIR = TMP;

const { writeConfig, readConfig, checkConfig, findProject } = await import("../lib/config.mjs");
const { exportProjectOpenAPI } = await import("../lib/apifox.mjs");
const { writeProjectCache, readProjectCache, readProjectIndex, hasProjectCache, listCachedProjects } = await import("../lib/cache.mjs");

function startMockServer() {
  const spec = {
    openapi: "3.0.0",
    info: { title: "Orders API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "listUsers",
          summary: "List users",
          responses: { "200": { description: "OK" } },
        },
      },
      "/orders": {
        get: {
          operationId: "listOrders",
          summary: "List orders",
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };

  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url?.startsWith("/api/v1/projects/") && req.url?.endsWith("/export-openapi")) {
        res.writeHead(200, { "Content-Type": "application/json", "Connection": "close" });
        res.end(JSON.stringify(spec));
        return;
      }
      res.writeHead(404, { "Connection": "close" });
      res.end("not found");
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

try {
  mkdirSync(TMP, { recursive: true });

  // 1. checkConfig before init → not_ready
  {
    const r = checkConfig();
    assert(!r.ok, "config should not be ready before init");
    assert(r.error.includes("config.json 不存在"));
  }

  // 2. writeConfig with multiple projects
  writeConfig({
    token: "afs-test-token-123",
    projects: [
      { id: "111111", name: "orders" },
      { id: "222222", name: "payments" },
    ],
  });

  // 3. readConfig after init
  {
    const cfg = readConfig();
    assert.strictEqual(cfg.token, "afs-test-token-123");
    assert.strictEqual(cfg.projects.length, 2);
    assert.deepStrictEqual(findProject(cfg, "orders"), { id: "111111", name: "orders" });
    assert.deepStrictEqual(findProject(cfg, "222222"), { id: "222222", name: "payments" });
  }

  // 4. invalid token format rejected
  {
    let threw = false;
    try {
      writeConfig({ token: "bad-token", projects: [{ id: "333333" }] });
    } catch (e) {
      threw = true;
      assert(e.message.includes("token 格式无效"));
    }
    assert(threw, "invalid token should be rejected");
  }

  // 5. afxp_ project token accepted
  {
    const cfg = writeConfig({ token: "afxp_valid_project_token", projects: [{ id: "333333", name: "demo" }] });
    assert.strictEqual(cfg.token, "afxp_valid_project_token");
  }

  // 6. fetch project via mock Apifox API
  const { server, url } = await startMockServer();
  try {
    process.env.APIFOX_API_BASE_URL = url;
    const spec = await exportProjectOpenAPI({ projectId: "111111", token: "afs-test-token-123" });
    assert.strictEqual(spec.info.title, "Orders API");

    const { metadata } = writeProjectCache("111111", spec);
    assert.strictEqual(metadata.title, "Orders API");
    assert.strictEqual(metadata.pathCount, 2);
  } finally {
    server.close();
    delete process.env.APIFOX_API_BASE_URL;
  }

  // 6. read cached project
  {
    assert(hasProjectCache("111111"));
    const cached = readProjectCache("111111");
    assert.strictEqual(cached.info.title, "Orders API");
    assert(cached.paths["/users"]);
  }

  // 7. read index
  {
    const index = readProjectIndex("111111");
    assert.strictEqual(index.title, "Orders API");
    assert(index.paths.some((p) => p.path === "/users"));
    assert(index.schemas.length === 0);
  }

  // 8. list cached projects
  {
    const ids = listCachedProjects();
    assert.deepStrictEqual(ids, ["111111"]);
  }

  console.log("✅ End-to-end verification passed!");
} catch (e) {
  console.error("❌ End-to-end verification failed:");
  console.error(e.message);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
