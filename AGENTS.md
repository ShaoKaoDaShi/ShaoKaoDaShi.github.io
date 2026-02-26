# AGENTS：高层架构与协作指南

本仓库是一个“多应用/多扩展”集合：包含多个相互独立的前端应用、浏览器扩展、VS Code 扩展与配套后端服务。各子项目有各自的构建链路与运行方式，通常不共享运行时代码。

说明：仓库中未发现 `.cursor/rules/*`、`.github/copilot-instructions.md`、`.trae/rules/*`。

## 1) 项目概览

### 1.1 主要子项目

**A. `./`（React JSON Viewer Web）**
- 入口与路由：`src/App.tsx` 使用 `HashRouter`，主要页面为 `Home`、`JsonEditor`、多种 Diff 页面。
- 本地存储：`src/Database/jsonParseHistory.ts` 使用 Dexie（IndexedDB）存储 JSON 解析历史。
- 构建输出：`vite.config.ts` 指定 `build.outDir = "docs"`，用于静态部署。

**B. `http-modifier-extension/`（Chrome 扩展：改 Header + Mock Response + 日志 + 同步）**
- MV3 配置：`http-modifier-extension/public/manifest.json`。
- 核心运行机制分三层：
  - Service Worker：`http-modifier-extension/public/background.js`
    - 将“Header 规则”转换为 `declarativeNetRequest` 动态规则并更新（动态规则 id 采用 `index+1` 的整数）。
    - “Debugger Mode”通过 `chrome.debugger` + `Fetch.enable` / `Fetch.fulfillRequest` 在网络层 mock，使 DevTools Network 可见。
    - 日志存内存队列（最多 50 条），通过 `chrome.runtime` 消息供 Popup 拉取。
  - Content Script：`http-modifier-extension/public/content.js`
    - 在 `document_start` 注入 `inject.js` 到页面主世界。
    - 通过 `window.postMessage` 将 response 规则与 Debugger 状态下发到页面脚本。
    - 将页面脚本发出的拦截日志转发到 `background.js`。
  - Page Inject：`http-modifier-extension/public/inject.js`
    - Monkey patch `window.fetch` 与 `XMLHttpRequest` 做“客户端层” response mock。
    - 当 Debugger Mode 启用时（由 content script 通知）停止匹配/拦截，避免“双层同时 mock”。

Popup UI（React + Tailwind）：`http-modifier-extension/src/App.jsx` + `http-modifier-extension/src/components/*`
- 规则与用户信息主要存 `chrome.storage.local`（键：`rules`、`user`）。
- Cloud Sync API 入口固定为 `http-modifier-extension/src/components/DataSyncTab.jsx` 中的 `API_BASE_URL = "http://localhost:3000/api"`。

**C. `http-modifier-server/`（Cloud Sync 后端）**
- 运行时：`http-modifier-server/package.json` 使用 `bun` 启动（`bun server.ts`）。
- HTTP 服务：`http-modifier-server/server.ts` 基于 Express + CORS，提供：
  - `POST /api/login`：注册/登录并返回 token。
  - `POST /api/sync/push`：保存 rules JSON。
  - `GET /api/sync/pull`：拉取 rules JSON。
- 数据库：`http-modifier-server/database.ts` 使用 `bun:sqlite`，文件名 `db.sqlite`，表：`user`、`rules`。

**D. `pdf-image-converter/`（PDF/图片处理 Web 应用）**
- 构建：`pdf-image-converter/vite.config.ts`，包含 `@rdservices/aime-code-inspector` 的 `CodeInspectorPlugin`（注释标明“不要移除”），并配置了 `@` -> `./src` 的别名。
- 依赖（从 `pdf-image-converter/package.json`）：包含 `pdf-lib`、`pdfjs-dist`、`file-saver`、`jszip` 等（具体用途以实现代码为准）。

**E. `vscode-tab-guardian/`（VS Code 扩展：标签页上限 + LRU 清理）**
- 核心逻辑：`vscode-tab-guardian/src/extension.ts` 维护 `WeakMap<Tab, number>` 作为 LRU 分数；在 tab 变化/激活编辑器变化时根据配置自动关闭“可关闭”的文本 tab。
- 配置项：`vscode-tab-guardian/package.json` 的 `contributes.configuration`（如 `tabManager.maxOpenTabs`、`respectPinned`、`respectDirty`）。

### 1.2 子项目之间的关系

- `http-modifier-extension/` 与 `http-modifier-server/` 通过 HTTP 接口协作（见 `DataSyncTab.jsx` 使用的 `API_BASE_URL` 与 `server.ts` 的 `/api/*` 路由）。
- 其它子项目（根 Web、PDF 工具、VS Code 扩展）在代码层面互不依赖，按目录独立开发/构建。

## 2) Build & Commands

以各目录的 `package.json` 为准（本仓库不同子项目的包管理器/脚本并不完全统一）。

**根目录（React JSON Viewer）**：`package.json`
- `npm run dev`：启动 Vite 开发服务器
- `npm run build`：Vite 构建（输出到 `docs/`，见 `vite.config.ts`）
- `npm run lint`：ESLint
- `npm run preview`：本地预览构建产物

**Chrome 扩展（http-modifier-extension）**：`http-modifier-extension/package.json`
- `npm run dev`：Vite 开发（Popup UI）
- `npm run build`：构建扩展（输出到 `http-modifier-extension/dist/`，见 `http-modifier-extension/vite.config.js`）
- `npm run lint`：ESLint
- `npm run generate-icons`：用 `sharp` 从 `public/icons/icon.svg` 生成多尺寸 PNG（见 `http-modifier-extension/scripts/generate-icons.js`）

**Cloud Sync Server（http-modifier-server）**：`http-modifier-server/package.json`
- `bun server.ts`：启动（脚本：`npm run start`）
- `bun --watch server.ts`：开发热重载（脚本：`npm run dev`）
- `npm run typecheck`：TypeScript 类型检查

**PDF 工具（pdf-image-converter）**：`pdf-image-converter/package.json`
- `npm run dev`、`npm run build`、`npm run lint`、`npm run preview`（以该目录脚本为准）

**VS Code 扩展（vscode-tab-guardian）**：`vscode-tab-guardian/package.json`
- `npm run compile`：编译 TypeScript（输出到 `out/`）
- `npm run watch`：监听编译
- `npm run vscode:prepublish`：发布前编译

**部署相关脚本（可选）**
- `scripts/deploy_mac_nginx.sh`：将 `./dist/` 复制到 `/opt/homebrew/etc/nginx/jsonParse/`（脚本假设存在 `dist/`）。
- `scripts/nginx.conf`：一个监听 `8080` 的静态站点示例配置。

## 3) Code Style

### 3.1 ESLint（实际配置）

- 根目录：`eslint.config.js` 使用 `typescript-eslint` flat config，规则包含 `react-hooks` 推荐集与 `react-refresh/only-export-components`。
- `http-modifier-extension/`：`http-modifier-extension/eslint.config.js` 针对 `**/*.{js,jsx}`，并将 `dist/` 设为 ignore；包含规则 `no-unused-vars: ["error", { varsIgnorePattern: "^[A-Z_]" }]`。
- `pdf-image-converter/`：`pdf-image-converter/eslint.config.js` 同样采用 `typescript-eslint` flat config。

### 3.2 约定与“容易踩坑”的实现细节

- Chrome 扩展的三层脚本边界：
  - Popup UI（`http-modifier-extension/src/*`）在扩展页面环境运行；
  - Background/Content/Inject（`http-modifier-extension/public/*.js`）在 MV3/页面上下文运行；
  - `public/manifest.json` 直接引用 `public/*.js`，因此这些文件的路径与输出结构需要保持一致。
- DNR 动态规则 ID 必须是整数：`http-modifier-extension/public/background.js` 用数组 index 生成（更改规则生成逻辑时要保持这一约束）。
- Response mock 有两条路径：
  - 默认模式：`inject.js`（fetch/XHR patch）
  - Debugger 模式：`background.js`（Fetch.fulfillRequest）
  两者通过消息互斥，避免冲突。

## 4) Testing

仓库内未看到统一的自动化测试框架接入（例如 Jest/Vitest 的测试脚本与用例目录约定）。现阶段验证主要依赖：
- 各子项目的 `npm run lint` / `npm run build`
- `http-modifier-server` 的 `npm run typecheck`
- `vscode-tab-guardian` 的 `npm run compile`

## 5) Security

### 5.1 Chrome 扩展权限与风险点

- `http-modifier-extension/public/manifest.json` 申请了 `debugger`、`declarativeNetRequest*`、`storage`、`tabs`，并对 `<all_urls>` 具备 host 访问能力。
- `http-modifier-extension/public/content.js` 通过 `window.postMessage(..., "*")` 与页面脚本通信，并仅校验 `event.source === window`；任何同页脚本都可伪造同类型消息。当前实现依赖消息 `type` 字段做分流（扩展内不执行来自页面的代码字符串），但在扩展增强功能时应保持“只接收必要字段、校验结构”的原则。

### 5.2 后端认证/存储

- `http-modifier-server/server.ts` 使用 `md5()` 存储密码与生成 token（见 `md5()` 与 `/api/login`）。
- `http-modifier-server/server.ts` 默认启用 `cors()`（允许跨域）。
- `http-modifier-server/database.ts` 将规则以 `rules_json` 字段整块存储；调试/备份时注意其中可能包含敏感信息（如 Header 里的 token）。

### 5.3 本仓库的本地凭证/环境变量

- `src/config.js` 使用 `dotenv.config()` 从环境读取 `MRS_TOKEN`、`MRS_JWT` 等敏感字段，并用于 `src/mrsClient.js` 这类 Node 脚本（含 `fs/promises` 写文件）。
- `http-modifier-extension/src/components/DataSyncTab.jsx` 会把登录返回的 `user.token` 存在 `chrome.storage.local` 并作为 `Authorization: Bearer ...` 发送。

## 6) Configuration

### 6.1 Vite/构建配置

- 根目录：`vite.config.ts` 设置 `base: "./"` 与 `build.outDir: "docs"`。
- `http-modifier-extension/`：`http-modifier-extension/vite.config.js` 将 `index.html` 作为构建入口，并输出到 `dist/`。
- `pdf-image-converter/`：`pdf-image-converter/vite.config.ts` 配置了 `@` alias，并启用 `CodeInspectorPlugin`。

### 6.2 MCP（可选开发工具）

- `mcp.json` 配置了 `chrome-devtools-mcp@latest` 的 MCP server（通过 `npx` 启动）。
