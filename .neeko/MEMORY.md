# 项目记忆

## PITFALL

- [2026-05-22 09:40] [PITFALL] [DEBUGGING] WHEN 需要用 lint/测试验证本次改动时 — PROBLEM 直接运行仓库级命令容易被无关子项目或工作树问题阻塞，导致验证信号不可靠 — FIX 先识别 monorepo/嵌套 worktree 边界并优先执行针对改动文件或当前包的定向校验，必要时再说明全量校验受外部噪音影响 [mid:1c9f973f]

## STRATEGY

- [2026-05-22 09:40] [STRATEGY] [IMPLEMENTATION] 在执行“提交代码”这类模糊指令时，先用 git status + 定向 diff 明确改动边界，再按主题分批暂存提交并显式排除工具产物/无关文件 → 能避免把环境文件或临时目录误提交，且可连续处理多次提交请求而不混淆范围 [mid:1ff8b0df]
