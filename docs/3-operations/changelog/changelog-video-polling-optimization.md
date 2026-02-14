# Video Generation Polling Optimization - Changelog

**Date**: 2025-01-11
**Feature**: Video Generation Polling Optimization
**Related Files**:
- `src/hooks/useGenerationPolling.ts`

## 背景

视频生成是一个耗时较长的操作,原有的轮询配置针对快速的图片生成进行优化,不适合视频生成场景:
- 原轮询间隔: 3秒(对视频生成过于频繁)
- 原超时时长: 5分钟(对复杂视频可能不够)
- 固定轮询间隔,无法根据时间动态调整

## 实施方案

### 1. 类型相关的轮询配置

添加 `getPollingConfig()` 函数,根据生成类型返回不同的默认配置:

**视频生成 (video)**:
- 初始轮询间隔: 5秒
- 中期轮询间隔: 8秒 (30秒后)
- 后期轮询间隔: 10秒 (2分钟后)
- 超时时长: 10分钟
- 最大轮询次数: 100次

**图片生成 (anime/avatar/character)**:
- 轮询间隔: 3秒(保持不变)
- 超时时长: 5分钟(保持不变)
- 最大轮询次数: 100次

### 2. 渐进式轮询间隔

实现 `getAdaptiveInterval()` 函数,根据经过的时间动态调整轮询间隔:

```typescript
// 视频生成的渐进式间隔示例:
// 0-30秒:    每5秒轮询一次
// 30秒-2分钟: 每8秒轮询一次
// 2分钟后:    每10秒轮询一次
```

**优点**:
- 前期快速响应用户
- 后期降低服务器压力
- 自动适应不同时长的视频生成

### 3. 灵活的配置覆盖

保留用户自定义配置的能力:
```typescript
// 用户可以手动指定轮询间隔和超时
useGenerationPolling({
  generationId: "xxx",
  generationType: "video",
  pollingInterval: 6000,  // 自定义6秒
  timeoutMs: 15 * 60 * 1000,  // 自定义15分钟
  ...
})
```

## 主要变更

### 新增功能

1. **`getPollingConfig(generationType)`** - 根据类型获取默认配置
2. **`getAdaptiveInterval()`** - 动态计算当前应使用的轮询间隔
3. **类型相关的超时时长** - 视频生成10分钟,图片生成5分钟
4. **渐进式轮询逻辑** - 在 `startPolling()` 中实现间隔自动调整

### 修改的函数

1. **`useGenerationPolling()` 主函数**:
   - 移除硬编码的默认值
   - 使用 `getPollingConfig()` 获取类型相关的默认配置
   - 添加 `currentInterval` 状态追踪当前间隔

2. **`handleTimeout()`**:
   - 使用 `effectiveTimeout` 替代硬编码的 `timeoutMs`
   - 动态计算超时分钟数用于错误消息

3. **`pollStatus()`**:
   - 使用 `effectiveTimeout` 进行超时检查
   - 使用 `pollingConfig.maxPollingCount` 进行计数上限检查

4. **`startPolling()`**:
   - 添加渐进式轮询逻辑
   - 在每次轮询后调用 `setupPolling()` 检查是否需要调整间隔
   - 增强日志输出,包含配置信息

## 影响范围

### 前端组件

所有使用 `useGenerationPolling` 的组件将自动受益于这些优化:
- 视频生成页面
- 图片生成页面
- 头像生成页面
- 角色生成页面

### 向后兼容性

✅ **完全向后兼容**:
- 现有代码无需修改
- 图片生成的默认行为保持不变(3秒间隔, 5分钟超时)
- 视频生成自动使用新的优化配置
- 支持手动覆盖配置

## 测试要点

1. **视频生成场景**:
   - ✅ 初始阶段(0-30秒): 5秒间隔
   - ✅ 中期阶段(30秒-2分钟): 8秒间隔
   - ✅ 后期阶段(2分钟后): 10秒间隔
   - ✅ 超时时长: 10分钟

2. **图片生成场景**:
   - ✅ 保持原有3秒间隔
   - ✅ 保持原有5分钟超时

3. **自定义配置**:
   - ✅ 手动指定的 `pollingInterval` 优先生效
   - ✅ 手动指定的 `timeoutMs` 优先生效

## 性能影响

### 优化效果

**视频生成 (10分钟内完成)**:
- 优化前: 3秒间隔 × 200次 = 600秒 = 10分钟
- 优化后:
  - 前30秒: 6次 (5秒间隔)
  - 30秒-2分钟: 11次 (8秒间隔)
  - 2-10分钟: 48次 (10秒间隔)
  - **总计: 约65次轮询 (相比200次减少67%)**

### 服务器负载

- 轮询请求数量减少约 **67%**
- 后端API压力显著降低
- 数据库查询次数减少

## 后续优化建议

1. **Webhook优先策略** (已实现):
   - 当前系统已有webhook回调机制
   - 轮询作为降级方案

2. **WebSocket实时推送** (可选):
   - 完全替代轮询
   - 实时状态更新

3. **指数退避策略** (可选):
   - 进一步减少后期轮询频率
   - 适用于超长视频生成

## 相关文档

- PRD: `docs/1-specs/PRD.md`
- API设计: `docs/2-implementation/api/generation-api.md`
- 前端实现: `docs/2-implementation/frontend/page-anime-video-generator.md`

## 变更历史

- 2025-01-11: 初始实现 - 视频生成轮询优化
