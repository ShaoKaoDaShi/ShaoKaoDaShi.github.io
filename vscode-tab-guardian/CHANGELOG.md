# 更新日志 (Changelog)

所有此项目的显著变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，且本项目遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

## [0.0.5] - 2026-03-27

### 🐛 修复 (Fixed)

- **清理逻辑**: 延迟标签页变更后的清理操作，避免在 VS Code 完成活动标签页更新前错误关闭新打开的标签。
- **测试**: 增加测试覆盖率，引入回归测试和测试桩代码确保延迟清理调度正确执行。

## [0.0.4] - 2026-03-03

### ✨ 新增 (Added)

- **配置选项**: 将最大允许打开的标签页数量上限提升至 50 (`tabManager.maxOpenTabs`)。

### 🐛 修复 (Fixed)

- **自动关闭**: 修复了新打开标签页被立即错误关闭的问题。

## [0.0.3] - 2026-02-26

### 🎨 杂项 (Chore)

- **图标**: 更新了插件图标。

## [0.0.2] - 2026-02-26

### 🐛 修复 (Fixed)

- **实例持有**: 修复了 TabGuardian 实例未能正确保留的问题。
- **自动关闭**: 修复了新标签页自动关闭相关的 bug。

## [0.0.1] - 2026-02-13

### ✨ 新增 (Added)

- **核心功能**: 创建了 `vscode-tab-guardian` 项目，实现了基于 LRU 策略的标签页自动关闭功能。
- **数量限制**: 默认最多打开 6 个标签页，超出时自动关闭可关闭的标签。
- **保护机制**:
  - 不关闭已固定 (Pinned) 的标签。
  - 不关闭有未保存更改 (Dirty) 的标签。
  - 不关闭当前活动标签。
- **状态栏指示器**: 在状态栏右侧显示 `Tabs X/Y`，展示当前标签数和最大限制。
- **手动清理命令**: 添加了 `Tab Guardian: 立即清理多余标签页` (`tabManager.cleanNow`) 命令，可通过命令面板或点击状态栏图标触发。
- **配置选项**:
  - `tabManager.maxOpenTabs`: 设置最大标签数 (4-6)。
  - `tabManager.autoCloseEnabled`: 启用或禁用自动关闭。
  - `tabManager.respectPinned`: 切换是否保护固定标签。
  - `tabManager.respectDirty`: 切换是否保护脏文件标签。
- **项目结构**:
  - 包含完整的 `package.json`, `tsconfig.json`。
  - 核心逻辑位于 `src/extension.ts`。
  - 提供了 `README.md` 和 `CHANGELOG.md`。
  - 配置了本地调试环境 (`.vscode/launch.json`, `.vscode/tasks.json`)。
