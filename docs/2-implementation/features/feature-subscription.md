# 订阅会员系统

**Related**: docs/1-specs/pricing-model.md (会员权益与定价模型)
**Status**: v5.1（统一 period_end 取消策略，已移除自动退款）

## 背景与目标
- 建立订阅会员体系（Free/Basic/Plus/Pro），支持月付与年付
- 通过积分与会员权益结合，驱动内容生成与功能限制
- 降低取消与退款带来的业务风险，保持状态一致性

## 验收标准（当前实现）
- 订阅支付与续费可用，会员等级与到期时间可自动维护
- 年付积分按月激活，积分有效期与激活时间连续衔接
- 订阅取消统一采用 period_end，取消后可使用至周期结束
- 本地订阅状态与日志可追踪，前端展示基于本地状态
- 会员权益在服务端强校验，前端提供升级提示

## 会员等级与权益
- 等级与权益以配置为准：`src/configs/membership/membership-config.json`
- 会员状态判断：`src/services/membership.ts`（基于 `users.is_sub` 与 `users.sub_expired_at`）
- 核心权益与对应判断：
  - 私密可见性：`canUsePrivateVisibility`
  - 水印移除：`canRemoveWatermark` / `canCreateCustomWatermark`
  - 聊天上下文与配额：`getChatContextSize`，支付成功同步聊天配额
  - OC 数量限制：`getUserOcLimit`
  - Worlds 数量限制：`getUserWorldLimit`
  - 优先支持与 Beta 权限：`hasPrioritySupport` / `canAccessBetaFeatures`

## 核心流程（实现思路）
- 购买订阅：Checkout 创建订单 → Stripe 支付 → Webhook 更新订单/会员/积分 → 创建本地订阅与日志
- 续费：`invoice.payment_succeeded` → 更新订单、积分、订阅周期与 sub_times
- 取消：`/api/subscriptions/cancel` 仅 period_end → 本地状态改为 pending_cancel → Webhook 落地最终状态
- 年付积分：一次性创建 12 条积分记录，按支付日期激活，无需定时任务
- 状态同步：Stripe Webhook 驱动本地 subscriptions 与 subscription_logs 状态

## 已知问题与优化对齐方案（日期口径）
**问题**：订单表 `orders.expired_at` 在续费时使用本地“+30 天/+1 年 + 24h”推算，导致与 Stripe 的 `current_period_end` 不一致（例如 2026-01-31 月付，Stripe 期末为 2026-02-28，而本地推算为 2026-03-03）。邮件使用 Stripe 日期，前端/后台与订单日志用本地日期，出现用户感知不一致。

**对齐原则（单一事实来源）**：订阅周期结束时间以 Stripe `subscription.current_period_end` 为唯一权威来源；本地所有展示与权限判断只读取已落地的 Stripe 周期时间（`orders.sub_period_end` / `subscriptions.current_period_end` / `users.sub_expired_at`），禁止再以“固定 30 天”推算。

**优化方案（实现步骤）**：
1. **订单续费写入**：在 `src/services/order.ts` 的续费分支（`updateSubOrder`）中，停止计算 `expired_at = now + 1 month/year + 24h`，改为：
   - `expired_at = new Date(sub_period_end * 1000)`（与 `sub_period_end` 对齐）
   - 若 `sub_period_end` 缺失或无效，**抛错并拒绝写入**，避免错误数据落库
2. **统一读口径**：
   - 订阅展示、后台详情优先使用 `orders.sub_period_end`（或 `subscriptions.current_period_end`），不再使用 `orders.expired_at` 做订阅口径
   - `users.sub_expired_at` 继续由 Webhook 使用 Stripe 周期时间写入
3. **邮件与页面一致**：邮件继续使用 Stripe 周期时间；前端展示改为读本地 `current_period_end`（它来自 Stripe），确保“邮件 = 页面 = 订单 = 权限判断”一致
4. **历史数据修复（一次性脚本或后台任务）**：
   - 对 `orders` 表中 `interval in ('month','year')` 且 `expired_at` 与 `sub_period_end` 不一致的记录进行回填
   - 规则：`expired_at = to_timestamp(sub_period_end)`；不改动一次性购买记录

**受影响文件清单（需在实现时更新）**：
- `src/services/order.ts`（续费订单写入 `expired_at` 的逻辑）
- `src/services/stripe.ts`（确认 `sub_period_end` 始终来自 Stripe）
- `src/app/api/pay/notify/stripe/route.ts`（确保 `users.sub_expired_at` 与 `subscriptions.current_period_end` 取 Stripe）
- `src/app/[locale]/(admin)/admin/subscriptions/page.tsx`、`src/components/console/user-center/MySubscriptionTab.tsx`（展示口径）

**验收标准（补充）**：
- Stripe 返回 `current_period_end = 2026-02-28` 的月度订阅，本地 `orders.expired_at`/`orders.sub_period_end`/`subscriptions.current_period_end`/`users.sub_expired_at` 全部对齐为 2026-02-28
- 邮件与前端展示一致，不再出现“30 天推算”日期

## 会员权益落地与校验
- 私密可见性（前端提示 + 服务端校验）
  - 前端：`src/components/anime-generator/AnimeGenerator.tsx`、`src/components/video/VideoGenerator.tsx`、`src/components/oc-apps/ActionFigureTool.tsx`、`src/components/oc-apps/StickerTool.tsx`
  - 服务端：`src/app/api/anime-generation/create-task/route.ts`、`src/app/api/anime-video/create-task/route.ts`
- 会员徽章资源由 `src/lib/asset-loader.ts` 的 `getMemberBadgeUrl` 输出（R2/CDN 资源）
- OC 数量限制（服务端强校验）
  - 入口检查：`src/app/api/oc-maker/check-limit/route.ts`
  - 创建校验：`src/app/api/oc-maker/characters/route.ts`
- Worlds 数量限制（服务端强校验）
  - 创建校验：`src/services/world.ts`、`src/app/api/worlds/route.ts`
- 订阅管理
  - 用户中心：`src/components/console/user-center/MySubscriptionTab.tsx`
  - 管理后台：`src/app/[locale]/(admin)/admin/subscriptions/page.tsx`

## 数据模型与配置
- 用户会员字段：`src/db/schema.ts`（`users.is_sub`、`users.sub_expired_at`、`users.sub_plan_type`）
- 订阅表与日志：`src/models/subscription.ts`、`src/models/subscription-log.ts`
- 积分表与激活时间：`src/models/credit.ts`（`actived_at`）
- 会员配置：`src/configs/membership/membership-config.json`

## 迁移（字段更名）
将用户表字段 `is_pro` 更名为 `is_sub`，保留原有数据：

```sql
ALTER TABLE users RENAME COLUMN is_pro TO is_sub;
ALTER TABLE users RENAME COLUMN pro_expired_at TO sub_expired_at;
ALTER TABLE users RENAME COLUMN pro_plan_type TO sub_plan_type;
```

## 影响清单（文档链接）
- PRD：docs/1-specs/pricing-model.md
- API：docs/2-implementation/api/subscriptions.md、docs/2-implementation/api/payments.md、docs/2-implementation/api/membership.md、docs/2-implementation/api/oc-maker.md、docs/2-implementation/api/anime-generation.md、docs/2-implementation/api/anime-video.md
- 数据模型：docs/1-specs/data-models.md
- 前端：docs/2-implementation/frontend/page-user-console.md、docs/2-implementation/frontend/page-my-credits.md、docs/2-implementation/frontend/page-ai-anime-generator.md、docs/2-implementation/frontend/page-anime-video-generator.md、docs/2-implementation/frontend/page-oc-maker.md
- 后端：docs/2-implementation/backend/service-credit.md、docs/2-implementation/backend/service-oc-maker.md、docs/2-implementation/backend/service-anime-generation.md、docs/2-implementation/backend/service-anime-video-generation.md、docs/2-implementation/backend/service-chat.md

## 关键实现文件清单
- 会员服务：`src/services/membership.ts`
- 订阅与订单：`src/services/order.ts`、`src/services/stripe.ts`
- 支付回调：`src/app/api/pay/notify/stripe/route.ts`
- 订阅 API：`src/app/api/subscriptions/`、`src/app/api/checkout/route.ts`
- 积分服务：`src/services/credit.ts`
- 国际化配置：`src/i18n/pages/pricing/en.json`、`src/i18n/pages/user-center/en.json`、`src/i18n/pages/anime-generator/en.json`、`src/i18n/pages/ai-anime-video-generator/en.json`、`src/i18n/pages/oc-maker/en.json`

## 变更历史
- 2026-01-16 FEAT-subscription 整合 VIP 文档内容，精简订阅文档并对齐当前实现
- 2026-01-21 FEAT-subscription 会员字段更名：is_pro → is_sub（影响：表/服务/API/前端）
- 2026-01-21 FEAT-subscription 增加 worlds 数量限制（影响：配置/服务/API）
