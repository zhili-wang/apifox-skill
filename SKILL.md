---
name: apifox-skill
description: "Use this skill when the user wants to read Apifox API docs. The skill fetches docs directly from Apifox Open API using a single config.json (token + one or more project IDs), caches them locally, and exposes them to the AI without requiring apifox-mcp-server registration. Trigger on Chinese or English requests mentioning Apifox, apifox-mcp, APIFOX_ACCESS_TOKEN, 接口文档, API文档, project-id, 刷新接口文档, Apifox MCP 配置, or setting up API docs MCP."
disable-model-invocation: true
allowed-tools: Bash(node *)
argument-hint: "[--token=xxx] [--project-id=123] [--project-id=456] [--project-name=orders]"
---

# Apifox API Docs

## 概览

本 skill **直接替代 apifox-mcp-server**：通过 Apifox Open API 拉取项目接口文档，缓存在 skill 本地，然后让 AI 读取、搜索、生成代码。不再需要单独注册 MCP server。

核心设计：

- `config.json`：统一配置 token + 多个 projectId（已加入 `.gitignore`）
- `scripts/fetch-project.mjs`：拉取并缓存项目接口文档
- `scripts/read-project.mjs`：读取缓存的接口文档
- `scripts/refresh-project.mjs`：强制刷新缓存

## 使用流程

### 1. 检查/初始化配置

```bash
node "${CLAUDE_SKILL_DIR}/scripts/read-config.mjs"
```

- `status=ready`：已有 `config.json`，继续下一步。
- `status=not_ready`：运行初始化。

若 `$ARGUMENTS` 为空，使用 `AskUserQuestion` 收集 token 和项目信息，然后运行：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/init.mjs" $ARGUMENTS
```

示例：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/init.mjs" \
  --token=afs-xxx \
  --project-id=123456 --project-name=orders \
  --project-id=789012 --project-name=payments \
  -y
```

> 若 `${CLAUDE_SKILL_DIR}` 未设置，脚本会从自身位置推导 skill 根目录；命令中也可替换为 skill 安装路径。

### 2. 拉取接口文档

```bash
node "${CLAUDE_SKILL_DIR}/scripts/fetch-project.mjs" --project-id=123456
```

或按项目名称：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/fetch-project.mjs" --project-name=orders
```

缓存位置：`data/cache/projects/<projectId>/`

### 3. 读取接口文档

读取完整 spec：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/read-project.mjs" --project-id=123456
```

只读索引（轻量）：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/read-project.mjs" --project-id=123456 --index
```

只读某个路径：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/read-project.mjs" --project-id=123456 --path=/users
```

### 4. 刷新缓存

当 Apifox 内文档更新后：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/refresh-project.mjs" --project-id=123456
```

## AI 使用示例

用户说：「根据 orders 项目的 API 文档生成 Product 模型代码」

AI 执行：

1. 读取 config：
   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/read-config.mjs"
   ```
2. 确认 orders 项目 id
3. 拉取/读取文档：
   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/fetch-project.mjs" --project-name=orders
   node "${CLAUDE_SKILL_DIR}/scripts/read-project.mjs" --project-name=orders --index
   ```
4. 根据需要读取具体路径，然后生成代码

## 前置条件

- Node.js >= 18
- Apifox API 访问令牌（Apifox 头像 → 账号设置 → API 访问令牌 → 新建）
- 至少一个 Apifox 项目 ID（Apifox 项目 → 项目设置 → 基本设置，纯数字）

## 文件结构

```text
apifox-skill/
├── SKILL.md                  # 本文件
├── README.md                 # 安装与使用说明
├── install.sh                # 统一本地安装脚本
├── config.template.json      # 配置模板
├── .gitignore                # 忽略 config.json / data/cache
└── scripts/
    ├── init.mjs              # 初始化 / 更新 config.json
    ├── read-config.mjs       # 读取并校验 config.json
    ├── fetch-project.mjs     # 拉取项目接口文档并缓存
    ├── read-project.mjs      # 读取缓存的接口文档
    ├── refresh-project.mjs   # 刷新缓存
    ├── lib/
    │   ├── config.mjs        # config.json 读写校验
    │   ├── apifox.mjs        # Apifox Open API 客户端
    │   └── cache.mjs         # 本地缓存管理
    └── test/
        └── e2e.mjs           # 端到端测试
```

## 完成检查

- [ ] `/apifox-skill` 成功生成 `config.json`
- [ ] `read-config.mjs` 返回 `status=ready`
- [ ] `fetch-project.mjs` 成功拉取至少一个项目
- [ ] `read-project.mjs` 能输出接口文档
- [ ] AI 能基于接口文档生成代码
