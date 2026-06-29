# apifox-skill

一个遵循 [Agent Skills](https://github.com/vercel-labs/skills) 开放标准的 Agent 技能，**直接替代 apifox-mcp-server**：通过 Apifox Open API 拉取项目接口文档，缓存在本地，让 AI 直接读取、搜索、生成代码。无需再注册单独的 MCP server，**用户也无需手动执行任何 node 脚本**。

## 设计要点

- **单配置**：`config.json` 位于 skill 根目录，包含账号级 token 和多个项目 ID
- **多项目**：`projects` 数组支持一个或多个 Apifox 项目
- **任意终端**：通过 `npx skills add` 安装后，任何 AI 终端都能使用同一套配置
- **斜杠命令驱动**：用户输入 `/apifox-skill`，AI 自动完成初始化、拉取、读取
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

## 初始化教程

第一次使用需要配置 Apifox 访问令牌和项目 ID。安装 skill 并重启 AI 终端后，输入：

```
/apifox-skill
```

AI 会引导你完成初始化。如果你希望提前准备好信息，按下面步骤获取：

### 1. 获取 Apifox API 访问令牌

1. 打开 [Apifox](https://www.apifox.cn/)
2. 点击右上角头像 → **账号设置**
3. 左侧选择 **API 访问令牌**
4. 点击 **新建令牌**，填写名称后复制生成的 token

token 格式通常以 `afs-` 开头，例如：

```text
afs-xxxxxxxxxxxxxxxxxxxx
```

### 2. 获取 Apifox 项目 ID

1. 打开目标 Apifox 项目
2. 左侧边栏点击 **项目设置** → **基本设置**
3. 复制页面上的 **项目 ID**（纯数字）

### 3. 完成初始化

把上面两项告诉 AI，例如：

```text
/apifox-skill --token=afs-xxx --project-id=123456 --project-name=orders -y
```

多项目可以重复 `--project-id`：

```text
/apifox-skill --token=afs-xxx \
  --project-id=123456 --project-name=orders \
  --project-id=789012 --project-name=payments \
  -y
```

初始化完成后会生成 `config.json`：

```json
{
  "token": "afs-xxxxxxxxxxxxxxxxxxxx",
  "projects": [
    { "id": "123456", "name": "orders" },
    { "id": "789012", "name": "payments" }
  ]
}
```

## 快速开始

初始化完成后，直接说：

```text
根据 orders 项目生成 Product 模型代码
```

AI 会自动拉取、读取接口文档，然后生成代码。

## 常用提示词示例

```text
根据 orders 项目生成所有数据模型的 TypeScript 定义
根据 payments 项目生成 /transactions 接口的 MVC 代码
orders 项目 /users GET 接口的响应字段是什么
列出 orders 项目的所有 POST 接口
对比 orders 和 payments 两个项目的 User 模型差异
刷新 orders 项目的接口文档缓存
```

## 凭据安全

- `config.json` 位于 skill 根目录，**已加入 `.gitignore`**，请勿手动提交
- 拉取的接口文档缓存位于 `data/cache/`，**已加入 `.gitignore`**
- token 过期或泄漏时，回 Apifox 重新生成，然后重新运行 `/apifox-skill`

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
