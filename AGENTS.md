# 架构概览

本项目是一个包含多个模块的工程，涵盖 React Web 应用、Chrome 扩展、VS Code 插件以及后端服务。主要功能包括 JSON 数据查看与对比、HTTP 请求修改、PDF 工具以及 IDE 标签页管理。

## 1. 项目概览

### 核心模块

*   **`react-json-viewer` (根目录)**:
    *   **类型**: Web 应用
    *   **技术栈**: React 18, Vite, TypeScript, Monaco Editor, Dexie (IndexedDB)。
    *   **用途**: 提供 JSON 数据的高级查看、编辑和 Diff 对比功能。

*   **`http-modifier-extension`**:
    *   **类型**: Chrome 浏览器扩展
    *   **技术栈**: React, Vite, Tailwind CSS。
    *   **用途**: 拦截和修改浏览器发出的 HTTP 请求与响应，支持规则同步。

*   **`http-modifier-server`**:
    *   **类型**: 后端服务
    *   **技术栈**: Node.js, Express, SQLite。
    *   **用途**: 为 Chrome 扩展提供用户认证和配置规则的云端同步服务。

*   **`pdf-image-converter`**:
    *   **类型**: Web 应用
    *   **技术栈**: React 18, Vite, TypeScript, Tailwind CSS, Shadcn/ui, pdf-lib, pdfjs-dist。
    *   **用途**: 处理 PDF 与图片之间的转换，支持文件拖拽和预览。

*   **`vscode-tab-guardian`**:
    *   **类型**: VS Code 扩展
    *   **技术栈**: TypeScript, VS Code Extension API。
    *   **用途**: 自动管理编辑器标签页数量，基于 LRU 策略关闭多余标签，支持固定和未保存保护。

## 2. 构建与命令

各模块通常独立运行。以下是常用开发命令：

### 根项目 (`react-json-viewer`)
| 命令 | 描述 |
| :--- | :--- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 (输出到 `docs/`) |
| `pnpm lint` | 运行 ESLint 检查 |
| `pnpm preview` | 预览生产构建 |

### Chrome 扩展 (`http-modifier-extension`)
| 命令 | 描述 |
| :--- | :--- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建扩展 (输出到 `dist/`) |
| `pnpm generate-icons` | 生成扩展图标 |

### 后端服务 (`http-modifier-server`)
| 命令 | 描述 |
| :--- | :--- |
| `pnpm start` | 启动 Express 服务器 (Port 3000) |

### PDF 工具 (`pdf-image-converter`)
进入目录后执行：
| 命令 | 描述 |
| :--- | :--- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |

### VS Code 插件 (`vscode-tab-guardian`)
进入目录后执行：
| 命令 | 描述 |
| :--- | :--- |
| `npm run compile` | 编译 TypeScript |
| `npm run watch` | 监听文件变更并编译 |
| `npm run vscode:prepublish` | 发布前编译 |

## 3. 代码风格与规范

*   **语言**: 全面使用 **TypeScript** (除了后端服务部分使用 JavaScript)。
*   **框架**: 前端统一使用 **React** (Functional Components + Hooks)。
*   **样式方案**:
    *   新模块 (`pdf-image-converter`, `http-modifier-extension`) 优先使用 **Tailwind CSS**。
    *   根项目混用了 Styled Components 和 CSS Modules。
    *   UI 组件库：`pdf-image-converter` 使用了 **Shadcn/ui** (@radix-ui)。
*   **代码规范**:
    *   **ESLint**: 大部分模块配置了 ESLint 9+ 和 typescript-eslint。
    *   **Prettier**: 项目包含 Prettier 依赖用于代码格式化。

## 4. 测试

*   **现状**: 目前主要模块 (`package.json`) 中未配置自动化测试框架 (如 Jest 或 Vitest)。
*   **建议**:
    *   对 React 组件引入 `Vitest` + `React Testing Library`。
    *   对后端 API 引入 `Supertest`。
    *   VS Code 插件目前无测试配置，建议引入 `@vscode/test-electron`。

## 5. 安全与数据

*   **认证 (Server)**: 使用基于 Token 的自定义认证机制。
*   **加密**: 密码存储目前使用 MD5 (见 `database.js` 或相关逻辑)，**建议升级**到 bcrypt 或 Argon2。
*   **存储**:
    *   后端使用 SQLite (`db.sqlite`)，需注意文件权限。
    *   前端大量使用 IndexedDB (Dexie) 和 LocalStorage，敏感数据应避免明文存储。
    *   PDF 处理完全在客户端进行，不涉及文件上传，隐私性较好。

## 6. 配置管理

*   **构建配置**:
    *   根项目: `vite.config.ts` (构建到 `docs` 目录，适配 GitHub Pages)。
    *   PDF 工具: `vite.config.ts` (标准构建)。
    *   Chrome 扩展: `vite.config.js` (适配浏览器扩展结构)。
*   **环境变**: 使用 `.env` 文件管理环境变量 (如 API 地址)。
*   **VS Code 配置**: 插件配置项定义在 `package.json` 的 `contributes.configuration` 中 (如 `tabManager.maxOpenTabs`)。

## 7. 目录结构说明

```
/
├── http-modifier-extension/  # Chrome 扩展源码
├── http-modifier-server/     # 后端服务源码
├── pdf-image-converter/      # PDF 转图片工具源码
├── vscode-tab-guardian/      # VS Code 插件源码
├── src/                      # JSON Viewer 主应用源码
├── docs/                     # 主应用构建产物 (GitHub Pages)
├── package.json              # 主应用依赖
└── ...
```
