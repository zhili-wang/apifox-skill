# apifox-skill

一个遵循 [Agent Skills](https://github.com/vercel-labs/skills) 开放标准的 Agent 技能，**直接替代 apifox-mcp-server**：通过 Apifox Open API 拉取项目接口文档，缓存在本地，让 AI 直接读取、搜索、生成代码。无需再注册单独的 MCP server。

## 设计要点

- **单配置**：`config.json` 位于 skill 根目录，包含账号级 token 和多个项目 ID
- **多项目**：`projects` 数组支持一个或多个 Apifox 项目
- **任意终端**：通过 `npx skills add` 安装后，任何 AI 终端都能使用同一套配置
- **本地缓存**：接口文档拉取后缓存在 `data/cache/`，避免重复请求
- **安全**：`config.json` 和缓存已加入 `.gitignore`，不会被提交

## 安装

### 方式一：`npx skills add`（推荐）

```bash
npx skills add zhili-wang/apifox-skill -g
```

### 方式二：本地安装脚本

```bash
cd apifox-skill && bash install.sh
```

默认自动检测已安装的 AI 终端并直接复制安装。也可以指定终端：

```bash
bash install.sh --claude          # 仅 Claude Code
bash install.sh --codex           # 仅 Codex CLI
bash install.sh --claude --codex  # 同时安装到两者
```

全局安装（Agent Skills 标准枢纽）：

```bash
bash install.sh --all
```

`--all` 会先安装到 `~/.agents/skills/apifox-skill`，然后为每个支持的 AI 终端创建符号链接到该全局副本。这样所有终端共享同一份 skill，更新时只需替换全局目录。

## 快速开始

### 1. 初始化配置

```bash
node ~/.claude/skills/apifox-skill/scripts/init.mjs \
  --token=afs-xxx \
  --project-id=123456 --project-name=orders \
  --project-id=789012 --project-name=payments \
  -y
```

生成的 `config.json`：

```json
{
  "token": "afs-xxxxxxxxxxxxxxxxxxxx",
  "projects": [
    { "id": "123456", "name": "orders" },
    { "id": "789012", "name": "payments" }
  ]
}
```

### 2. 拉取接口文档

```bash
node ~/.claude/skills/apifox-skill/scripts/fetch-project.mjs --project-name=orders
```

### 3. 读取接口文档

```bash
# 完整 spec
node ~/.claude/skills/apifox-skill/scripts/read-project.mjs --project-name=orders

# 只读索引
node ~/.claude/skills/apifox-skill/scripts/read-project.mjs --project-name=orders --index

# 只读某个路径
node ~/.claude/skills/apifox-skill/scripts/read-project.mjs --project-name=orders --path=/users
```

### 4. 刷新缓存

```bash
node ~/.claude/skills/apifox-skill/scripts/refresh-project.mjs --project-name=orders
```

## AI 使用示例

用户：「根据 orders 项目的 API 文档生成 Product 模型代码」

AI 工作流：

1. `read-config.mjs` 确认配置
2. `fetch-project.mjs --project-name=orders` 拉取文档
3. `read-project.mjs --project-name=orders` 读取文档
4. 生成代码

## 前置条件

- Node.js >= 18
- Apifox API 访问令牌（Apifox 头像 → 账号设置 → API 访问令牌 → 新建）
- 至少一个 Apifox 项目 ID（Apifox 项目 → 项目设置 → 基本设置，纯数字）

## 更新配置

重新运行 `init.mjs` 即可覆盖：

```bash
node ~/.claude/skills/apifox-skill/scripts/init.mjs \
  --token=afs-new \
  --project-id=123456 \
  --project-id=789012 \
  -y
```

原 `config.json` 会自动备份为 `config.json.bak`。

## 凭据安全

- `config.json` 位于 skill 根目录，**已加入 `.gitignore`**，请勿手动提交
- 拉取的接口文档缓存位于 `data/cache/`，**已加入 `.gitignore`**
- token 过期或泄漏时，回 Apifox 重新生成并重新运行 `init.mjs`

## 目录结构

```text
apifox-skill/
├── SKILL.md                        # 斜杠命令工作流
├── README.md                       # 本文件
├── install.sh                      # 统一本地安装脚本
├── config.template.json            # 配置模板
├── .gitignore                      # 忽略 config.json / data/cache
└── scripts/
    ├── init.mjs                   # 初始化 / 更新 config.json
    ├── read-config.mjs            # 读取并校验 config.json
    ├── fetch-project.mjs          # 拉取项目接口文档并缓存
    ├── read-project.mjs           # 读取缓存的接口文档
    ├── refresh-project.mjs        # 刷新缓存
    ├── lib/
    │   ├── config.mjs             # config.json 读写校验
    │   ├── apifox.mjs             # Apifox Open API 客户端
    │   └── cache.mjs              # 本地缓存管理
    └── test/
        └── e2e.mjs                # 端到端测试
```

## 兼容性

遵循 [Agent Skills](https://github.com/vercel-labs/skills) 开放标准，支持通过 `npx skills add` 安装到任意 AI 终端。

## 作者与许可证

- **Author**: wangzl
- **License**: [MIT](./LICENSE)
- **Repository**: https://github.com/zhili-wang/apifox-skill
