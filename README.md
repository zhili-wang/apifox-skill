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

### 方式一：手动克隆（推荐，最稳定）

直接克隆仓库到对应 AI 终端的 skills 目录，可确保 `scripts/` 等文件完整可用：

**Claude Code：**

```bash
git clone https://github.com/zhili-wang/apifox-skill.git ~/.claude/skills/apifox-skill
```

**Codex CLI：**

```bash
git clone https://github.com/zhili-wang/apifox-skill.git ~/.codex/skills/apifox-skill
```

克隆完成后重启 AI 终端，即可使用 `/apifox-skill` 命令。

### 方式二：`npx skills add`

```bash
npx skills add zhili-wang/apifox-skill
```

安装完成后重启 AI 终端。

> ⚠️ 注意：部分用户反馈通过 `npx skills add` 安装后技能目录中缺少 `scripts/`。如果安装后发现 `~/.claude/skills/apifox-skill/scripts` 不存在，请改用上面的手动克隆方式。

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

token 格式通常以 `afxp-` 开头，例如：

```text
afxp-xxxxxxxxxxxxxxxxxxxx
```

### 2. 获取 Apifox 项目 ID

1. 打开目标 Apifox 项目
2. 左侧边栏点击 **项目设置** → **基本设置**
3. 复制页面上的 **项目 ID**（纯数字）

### 3. 完成初始化

把上面两项告诉 AI，例如用自然语言描述（推荐）：

```text
/apifox-skill 我的 token 是 afxp-xxx，新增项目：my-project id：123456
```

如果 token 已经配置过，只需告诉 AI 新增项目即可：

```text
/apifox-skill 新增项目：my-project id：123456
```

或者使用完整参数：

```text
/apifox-skill --token=afxp-xxx --project-id=123456 --project-name=orders -y
```

多项目可以重复 `--project-id`：

```text
/apifox-skill --token=afxp-xxx \
  --project-id=123456 --project-name=orders \
  --project-id=789012 --project-name=payments \
  -y
```

初始化完成后会生成 `config.json`：

```json
{
  "token": "afxp-xxxxxxxxxxxxxxxxxxxx",
  "projects": [
    { "id": "123456", "name": "orders" },
    { "id": "789012", "name": "payments" }
  ]
}
```

### 手动配置（可选）

如果你不想通过对话让 AI 初始化，也可以在安装本skill后，在skill根目录手动创建 `config.json`：

1. 复制配置模板：

   ```bash
   cp config.template.json config.json
   ```

2. 用编辑器打开 `config.json`，填入你的 token 和项目信息：

   ```json
   {
     "token": "afxp-你的实际token",
     "projects": [{ "id": "123456", "name": "my-project" }]
   }
   ```

3. 保存后即可直接使用，例如：

   ```text
   列出 my-project 项目的所有接口
   ```

> ⚠️ 注意：`config.json` 已加入 `.gitignore`，不会被提交到 Git，请放心填写真实 token。

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
├── package.json                    # 包信息
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
