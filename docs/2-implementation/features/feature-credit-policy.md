# Credit Policy & Lifecycle (FEAT-CREDIT-POLICY)

Related: FEAT-credits-calc-optimize, FEAT-credits-refund-optimize

## 功能概述

积分（MC）用于图片/视频等生成类功能的计费与审计。当前实现强调：后端聚合计算、按激活/过期/FIFO消耗、软删除退款、延迟Webhook恢复、订单分期发放。

## 核心原则

- 余额与统计由后端聚合计算，前端不做全量聚合
- 消耗后记录负数流水，退款通过软删除原扣款记录
- 生成任务创建成功后再扣费，避免创建失败导致扣费
- 订单类积分按订阅周期拆分并设置激活/过期时间

## 数据模型（Credits）

- 表：`src/db/schema.ts`
- 关键字段：`trans_no`、`user_uuid`、`trans_type`、`credits`、`order_no`、`actived_at`、`expired_at`、`generation_uuid`、`is_voided`、`voided_at`、`voided_reason`
- 索引：`idx_credits_generation_uuid`、`idx_credits_user_valid(user_uuid,is_voided,expired_at)`、`idx_credits_voided_at`

## 生命周期与计算

### 1) 发放（Increase）

- 新用户奖励：注册后调用 `increaseCredits`，设置 1 个月后过期
- 订单发放：`updateCreditForOrder`
  - 年付：拆分 12 条月度记录，使用“保持日期位置”的月偏移
  - 月付：立即激活，过期时间为当前时间 + 30 天
  - 积分包（一次性）：立即激活，过期时间为当前时间 + 30 年
- 文件位置：`src/services/credit.ts`、`src/services/user.ts`

### 2) 消耗（Decrease）

- 余额检查：`getUserBalance`（仅统计已激活、未过期、未作废记录）
- FIFO 消耗：`getUserValidCredits` 按 `expired_at` 升序选择，继承最近可用批次的 `order_no/actived_at/expired_at`
- 同时存在订阅积分与积分包积分时，优先扣除订阅积分（订阅积分过期更早，FIFO 自动优先）
- 扣款记录：负数流水，关联 `generation_uuid`
- 文件位置：`src/services/credit.ts`、`src/models/credit.ts`

### 3) 退款（Soft Delete）

- `refundCredits` 通过 `generation_uuid` 查找负数扣款记录并标记 `is_voided=true`
- 不再创建正数退款记录，避免跨充值包退款复杂度
- 文件位置：`src/services/credit.ts`

### 4) 恢复（Webhook Late）

- `restoreCredits` 将 `is_voided=true` 的扣款记录恢复为可用
- 用于轮询超时后 webhook 晚到但任务成功的场景
- 文件位置：`src/services/credit.ts`、`src/services/generation/base/base-generation-service.ts`、`src/services/generation/video/video-generation-service.ts`

## 生成服务中的扣费策略

- 创建任务成功后再扣费，扣费与任务状态更新同事务执行
- 失败场景：不扣费或软删除退款
- 文件位置：
  - `src/services/generation/base/base-generation-service.ts`
  - `src/services/generation/video/video-generation-service.ts`

## 聚合与查询（后端）

- 余额：`getUserBalance`（轻量查询，仅活跃且未过期、未作废）
- 汇总：`getUserCreditSummary`（window/type 过滤，返回 balance/totalEarned/totalUsed/expiringCredits/nextExpiringAt/lastEventAt）
- 时间线：`getUserCreditTimeline`（分页、最多5000条，排除作废记录）
- 文件位置：`src/services/credit.ts`、`src/models/credit.ts`

## API

- `POST /api/get-user-credits`
  - 支持：`window=all|30d|7d`、`type=all|in|out`、`includeTimeline`、`limit`、`page`
  - 返回：summary + `left_credits`（兼容旧调用）
  - 错误：`ERR_CREDITS_AGGREGATION_FAILED`
- `GET /api/get-user-balance`：仅余额
- `GET /api/get-expiring-credits`：即将过期统计
- 文件位置：`src/app/api/get-user-credits/route.ts`、`src/app/api/get-user-balance/route.ts`、`src/app/api/get-expiring-credits/route.ts`

## 前端使用

- 主要入口：`src/components/console/user-center/MyCreditsTab.tsx`
- 依赖文案：`src/i18n/pages/user-center/en.json` / `ja.json`
- 头部展示：`src/components/blocks/app-header/index.tsx`

## 优化策略（已落地）

- 服务端聚合替代前端全量分页
- 软删除退款减少冗余记录并避免跨充值包拆分
- 生成任务“创建成功后扣费”，并与状态更新原子化
- 年付订阅拆分为12条月度记录，确保激活/过期可追踪

## 注意与已知行为（与现实现一致）

- `getUserCreditSummary.expiringCredits` 当前为“有效区间内的正数积分总和”，未按7天窗口过滤
- `getExpiringCredits` 当前仅按 `user_uuid` 聚合，未过滤作废/激活/过期窗口
- 聊天已切换到 AP 配额体系，`CreditsTransType.Chat` 当前无实际扣费入口

## 影响清单

- 模型：`src/db/schema.ts`、`src/models/credit.ts`
- 服务：`src/services/credit.ts`、`src/services/user.ts`
- 生成流程：`src/services/generation/base/base-generation-service.ts`、`src/services/generation/video/video-generation-service.ts`
- API：`src/app/api/get-user-credits/route.ts`、`src/app/api/get-user-balance/route.ts`、`src/app/api/get-expiring-credits/route.ts`
- 前端：`src/components/console/user-center/MyCreditsTab.tsx`

## 变更历史

- 2025-10-29 FEAT-credits-calc-optimize 后端聚合与分页接口落地
- 2025-11-11 FEAT-credits-refund-optimize 软删除退款与 generation_uuid 关联
- 2025-11-12 FEAT-credits-refund-optimize Webhook 晚到恢复机制
- 2025-11-28 FEAT-credits-refund-optimize 任务创建成功后再扣费
- 2025-11-28 FEAT-CREDIT-POLICY 文档整合与去冗余
- 2026-01-26 FEAT-CREDIT-POLICY 积分包延长至30年过期，明确订阅积分优先消耗
