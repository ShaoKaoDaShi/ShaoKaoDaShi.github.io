# 1. 问题

JsonEditor 的历史记录保存逻辑使用了 lodash 的防抖函数，但未在组件卸载时进行取消清理，可能在路由切换或页面关闭后依然触发异步写入 Dexie。这会带来潜在的内存泄漏、跨页面写入以及偶发的控制台错误。

## 1.1. **防抖任务未取消导致卸载后仍发生写入**

- 位置：src/JsonEditor/index.tsx 第 200-225 行左右（saveToHistory 的 useMemo 创建与使用）。
- 问题：防抖函数在组件卸载时没有执行 cancel，挂起的保存任务仍会在延迟到期后写入 IndexedDB（Dexie）。如果用户在输入后立刻离开页面，任务会在组件已卸载的上下文中执行。
- 影响：
  - 稳定性：可能触发与卸载状态相关的错误日志（如在非预期时机访问数据库）。
  - 可预期性：历史记录会在离开页面后被写入，造成跨页面/会话的“幽灵”记录。
  - 性能：在频繁切换页面或输入节奏较高的情况下，挂起任务增多，增加不必要的 IO。

代表性代码（问题前）：

```ts
// 第 200-225 行（节选）
const saveToHistory = useMemo(
  () =>
    debounce(async (value: string) => {
      try {
        const existing = await db.jsonParseHistory
          .where("jsonString")
          .equals(value)
          .first();

        if (existing) {
          await db.jsonParseHistory.update(existing.id, {
            date: new Date().getTime(),
          });
        } else {
          await db.jsonParseHistory.add({
            jsonString: value,
            date: new Date().getTime(),
          });
        }
      } catch (error) {
        console.error("Failed to save history:", error);
      }
    }, 2000),
  [],
);
```

# 2. 收益

通过在组件卸载时取消未决的防抖任务，确保历史写入只发生在组件生命周期内。

## 2.1. **减少偶发错误与跨页面写入**
- 取消挂起任务，避免在路由切换/关闭页面后仍执行 IO，减少“幽灵”历史记录。

## 2.2. **提升稳定性与可维护性**
- 防止卸载后执行异步逻辑引发的隐性异常，降低排障成本，代码意图更清晰。

## 2.3. **性能更友好**
- 在快速输入与频繁切换场景下，取消不必要的写入，降低 IndexedDB 访问与序列化开销，预计能够减少无效写入次数到 **0**（在页面离开路径上）。

# 3. 方案

在组件卸载时显式调用防抖函数的 `cancel` 进行清理，同时保证函数实例稳定（仍可通过 useMemo / useRef 管理）。

## 3.1. **为“防抖任务未取消”引入卸载清理**

1. 方案概述
- 在 `useEffect` 中返回清理函数，调用 `saveToHistory.cancel()`；
- 可选：将 `saveToHistory` 包装在 `useRef` 中，进一步确保引用稳定且便于在清理阶段访问。

2. 实施步骤
- 保持现有 useMemo 创建的防抖函数；
- 新增一个仅用于清理的 `useEffect`，在卸载时调用 `cancel`；
- 可追加在路由切换前（如 `visibilitychange` 或 `beforeunload`）触发一次 `flush`，确保最后一次有效输入被保存（按需）。

3. 修改前后代码对比

修改后（最小改动版本）：

```ts
// 维持 useMemo 创建防抖函数
const saveToHistory = useMemo(
  () => debounce(async (value: string) => { /* ...原实现... */ }, 2000),
  [],
);

// 新增：组件卸载时取消挂起任务
useEffect(() => {
  return () => {
    if (typeof (saveToHistory as any).cancel === 'function') {
      (saveToHistory as any).cancel();
    }
  };
}, [saveToHistory]);
```

可选增强（确保最后一次输入落库）：

```ts
useEffect(() => {
  const handleBeforeUnload = () => {
    if (typeof (saveToHistory as any).flush === 'function') {
      try { (saveToHistory as any).flush(); } catch {}
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (typeof (saveToHistory as any).cancel === 'function') {
      (saveToHistory as any).cancel();
    }
  };
}, [saveToHistory]);
```

4. 说明
- lodash 的防抖对象具备 `cancel/flush` 方法；`cancel` 清理定时器，`flush` 立即执行已排队的调用。
- 选择只调用 `cancel` 即可满足“离开页面不再写入”的最小目标；是否使用 `flush` 取决于产品对“最后一次输入是否必须保存”的要求。

# 4. 回归范围

本次改动仅涉及 JsonEditor 的历史记录保存流程，需从“页面使用流程”角度进行端到端验证。

## 4.1. 主链路
- 进入编辑器页面 -> 输入 JSON -> 等待 2 秒自动写入历史 -> 历史侧栏展示最近一条记录。
- 关键回归点：
  - 正常停留页面 ≥ 2 秒时，历史记录按预期写入一次；
  - 在输入后立刻切换到其他路由，历史记录不应新增；
  - 返回编辑器后，再次输入时能继续按规则写入。

## 4.2. 边界情况
- 输入后立即关闭浏览器标签页：不应产生新历史记录；
- 在极短时间内快速输入与切换页面：不应出现异常日志（包括 Dexie 相关）；
- 可选启用 `flush` 时：
  - 关闭页面前最后一次输入被保存；
  - 不应出现重复写入或顺序错误。