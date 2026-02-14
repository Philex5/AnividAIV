# Tasks — FEAT-credits-refund-optimize: Credits Refund Mechanism Optimization

Related: docs/2-implementation/features/feature-credit-policy.md

## 描述

优化积分退款机制，采用软删除方式替代创建退款记录，新增 generation_uuid 字段明确关联生成任务，自动处理跨充值包退款场景，提升数据质量和查询性能。

## 验收标准（引用）

- Feature: docs/2-implementation/features/feature-credit-policy.md（完整验收标准）
- 数据模型: docs/1-specs/data-models.md#credits-表
- API 契约: docs/2-implementation/api/user.md

## 依赖

- 数据库迁移工具：Drizzle ORM (`pnpm db:generate`, `pnpm db:migrate`)
- 积分服务：`src/services/credit.ts`, `src/models/credit.ts`
- 生成服务：base-generation-service, video-generation-service, chat-service
- 测试环境数据库：用于验证迁移脚本

## 任务拆解（单任务 1–2 天粒度）

### Phase 1 — Schema 变更与数据迁移

- [ ] 1.1 更新数据库 Schema
  - [ ] 在 `src/db/schema.ts` 的 credits 表定义中新增字段：
    - `generation_uuid: varchar({ length: 255 })`
    - `is_voided: boolean().default(false)`
    - `voided_at: timestamp()`
    - `voided_reason: varchar({ length: 255 })`
  - [ ] 添加索引定义：
    - `index("idx_credits_generation_uuid").on(table.generation_uuid)`
    - `index("idx_credits_user_valid").on(table.user_uuid, table.is_voided, table.expired_at)`
  - [ ] 执行 `pnpm db:generate` 生成迁移文件
  - [ ] 在测试环境执行 `pnpm db:migrate` 验证

- [ ] 1.2 创建数据迁移脚本
  - [ ] 新建 `scripts/migrate-credits-data.ts`
  - [ ] 实现逻辑：
    - 查询所有 `order_no` 非空的 credits 记录
    - 关联 generations 表验证是否是 generation_uuid
    - 是：迁移到 `generation_uuid` 字段，清空 `order_no`
    - 否：检查是否是真实订单号（关联 orders 表），保持不变
    - 记录迁移统计（成功/跳过/错误）
  - [ ] 在测试环境运行迁移脚本
  - [ ] 验证数据正确性（抽查 100 条记录）

- [ ] 1.3 更新数据模型文档
  - [ ] 在 `docs/1-specs/data-models.md#credits-表` 更新字段定义
  - [ ] 记录新增索引说明
  - [ ] 补充字段用途与约束

### Phase 2 — Service 层改造

- [ ] 2.1 更新 credit.ts 服务层 - **改造 CreditsTransType（方案2）**
  - [ ] 将 `enum CreditsTransType` 改为 `const CreditsTransType` 对象：
    ```typescript
    // ❌ 移除旧的 enum
    // export enum CreditsTransType { ... }

    // ✅ 新的混合方案
    export const CreditsTransType = {
      // 固定类型
      NewUser: "new_user",
      OrderPay: "order_pay",
      SystemAdd: "system_add",
      Chat: "chat",
      ChatRefund: "chat_refund",

      // 动态生成函数
      generation: (genType: string) => `${genType}_generation`,
      refund: (genType: string) => `${genType}_generation_refund`,
    } as const;
    ```
  - [ ] 移除所有具体生成类型的枚举：
    - ❌ `AnimeGeneration`
    - ❌ `AnimeGenerationRefund`
    - ❌ `CharacterGeneration`
    - ❌ `CharacterGenerationRefund`
    - ❌ `AvatarGeneration`
    - ❌ `AvatarGenerationRefund`
    - ❌ `VideoGeneration`
    - ❌ `VideoGenerationRefund`
  - [ ] 更新 `decreaseCredits` 函数签名：
    - 新增 `generation_uuid?: string` 参数
    - 保留 `order_no?: string` 参数
    - 在 insertCredit 调用时传递 `generation_uuid`
    - 添加余额不足检查（抛出 ServiceError）
  - [ ] 新增 `refundCredits` 函数（软删除实现）：
    - 查找 generation_uuid 对应的扣款记录（未作废）
    - UPDATE 标记 `is_voided = true`
    - 设置 `voided_at`, `voided_reason`
    - 幂等性保证（WHERE is_voided = false）
  - [ ] 移除旧的退款逻辑（通过 increaseCredits 创建正数记录）

- [ ] 2.2 更新 credit.ts 模型层查询
  - [ ] `getUserValidCredits`: 添加 `is_voided` 过滤
  - [ ] `queryUserBalance`: 添加 `is_voided` 过滤
  - [ ] `queryCreditTimeline`: 添加 `is_voided` 过滤
  - [ ] `queryCreditSummary`: 添加 `is_voided` 过滤

- [ ] 2.3 更新后端文档
  - [ ] `docs/2-implementation/backend/service-credit.md` 更新函数签名与职责描述

### Phase 3 — 生成服务调用点更新

- [ ] 3.1 更新 base-generation-service.ts - **应用动态 trans_type**
  - [ ] 扣款调用更新：
    ```typescript
    // ❌ 旧方式
    trans_type: CreditsTransType.AnimeGeneration

    // ✅ 新方式
    await decreaseCredits({
      user_uuid: params.user_uuid,
      trans_type: CreditsTransType.generation(this.generationType),
      credits: creditsCost,
      generation_uuid: generationUuid, // ✅ 新增
    });
    ```
  - [ ] 退款调用更新（所有失败处理）：
    ```typescript
    // ❌ 旧方式
    await increaseCredits({
      trans_type: CreditsTransType.AnimeGenerationRefund,
      order_no: generation_uuid,
    });

    // ✅ 新方式
    await refundCredits({
      user_uuid: params.user_uuid,
      generation_uuid: generationUuid,
      reason: "Generation failed: API error",
    });
    ```
  - [ ] 移除旧的 `increaseCredits` 退款调用

- [ ] 3.2 更新 video-generation-service.ts - **应用动态 trans_type**
  - [ ] 扣款时改用 `CreditsTransType.generation("video")`
  - [ ] 扣款时传递 `generation_uuid`
  - [ ] 所有失败场景改用 `refundCredits`

- [ ] 3.3 更新 chat-service.ts
  - [ ] 保持 `CreditsTransType.Chat`（已是固定类型）
  - [ ] 扣款时传递 `generation_uuid`（chat session uuid）
  - [ ] 失败场景改用 `refundCredits`

- [ ] 3.4 全局搜索并替换
  - [ ] 搜索 `CreditsTransType.AnimeGeneration` → 确认全部已替换
  - [ ] 搜索 `CreditsTransType.CharacterGeneration` → 确认全部已替换
  - [ ] 搜索 `CreditsTransType.VideoGeneration` → 确认全部已替换
  - [ ] 搜索 `CreditsTransType.AvatarGeneration` → 确认全部已替换
  - [ ] 搜索 `*GenerationRefund` → 确认全部已移除
  - [ ] TypeScript 编译通过（`pnpm build`）

- [ ] 3.5 更新前端文档
  - [ ] `docs/2-implementation/frontend/page-my-credits.md` 说明展示逻辑（自动排除作废记录）

### Phase 4 — 测试验证

- [ ] 4.1 单元测试
  - [ ] `tests/services/credit.test.ts`:
    - 测试 `decreaseCredits` 正确记录 `generation_uuid`
    - 测试 `refundCredits` 正确标记 `is_voided`
    - 测试余额计算排除作废记录
    - 测试跨充值包扣款的退款自动恢复
    - 测试重复退款幂等性
  - [ ] 运行测试：`pnpm test credit.test.ts`

- [ ] 4.2 集成测试
  - [ ] `tests/integration/generation-credits.test.ts`:
    - 完整生成流程（成功）
    - 生成失败退款流程
    - API 调用失败退款流程
    - Webhook 失败退款流程
  - [ ] 运行测试：`pnpm test generation-credits.test.ts`

- [ ] 4.3 编写测试用例文档
  - [ ] `tests/test-cases/FEAT-credits-refund-optimize.md`:
    - 主路径：扣款 → 成功 → 余额正确
    - 主路径：扣款 → 失败 → 退款 → 余额恢复
    - 边界：跨充值包扣款退款
    - 边界：并发退款幂等性
    - 错误：余额不足时扣款失败
    - 回归：历史数据迁移后查询正确

### Phase 5 — 生产部署与监控

- [ ] 5.1 部署前准备
  - [ ] 数据库全量备份
  - [ ] 准备回滚脚本（将 generation_uuid 恢复到 order_no）
  - [ ] 在预发布环境完整验证

- [ ] 5.2 生产部署
  - [ ] 维护窗口执行数据库迁移（Schema 变更）
  - [ ] 运行数据迁移脚本（分批执行，每批验证）
  - [ ] 部署新代码版本
  - [ ] 验证关键接口（`/api/get-user-credits`）

- [ ] 5.3 监控配置
  - [ ] 监控指标：
    - 积分余额准确性（抽样对比）
    - 退款成功率（软删除 UPDATE 成功率）
    - 作废记录比例（is_voided = true）
    - 查询性能（P95 < 250ms）
    - `generation_uuid` 为空的异常记录
  - [ ] 告警规则：
    - 退款失败率 > 1%
    - 查询 P95 > 500ms
    - 异常记录增长 > 10/小时

- [ ] 5.4 上线后验证
  - [ ] 抽查 100 个用户的余额计算正确性
  - [ ] 验证新生成任务的积分流程（扣款 → 成功/失败 → 退款）
  - [ ] 检查作废记录是否正确标记
  - [ ] 性能对比（上线前后 P95/P99）

## 风险与缓解

### 风险1: 数据迁移错误
- **缓解**: 测试环境完整验证 → 生产分批迁移 → 每批验证 → 回滚脚本就绪

### 风险2: 查询性能下降
- **缓解**: 复合索引 `(user_uuid, is_voided, expired_at)` → 压测验证 → 监控 P95

### 风险3: 软删除并发竞态
- **缓解**: WHERE 条件 `is_voided = false` → 幂等性设计 → 日志监控

### 风险4: 遗漏调用点
- **缓解**: 全局搜索 `decreaseCredits` → 单元测试覆盖 → 监控异常记录

## 完成判定（DoD）

- [x] Feature 文档已创建并完整描述方案
- [x] 技术决策已记录到 decisions.md
- [x] Changelog 已更新
- [ ] Schema 变更已执行并验证
- [ ] 数据迁移脚本已运行并验证
- [ ] Service 层代码已更新并通过单元测试
- [ ] 所有生成服务调用点已更新
- [ ] 集成测试全部通过
- [ ] 生产环境部署成功
- [ ] 监控指标正常（运行 48 小时无异常）

## 预计工时

- Phase 1: 1 天（Schema + 迁移脚本）
- Phase 2: 1.5 天（Service 层改造）
- Phase 3: 1 天（调用点更新）
- Phase 4: 1.5 天（测试验证）
- Phase 5: 0.5 天（部署监控）

**总计**: 约 5.5 天

## 参考资料

- Feature 文档: docs/2-implementation/features/feature-credit-policy.md
- 数据模型: docs/1-specs/data-models.md#credits-表
- 技术决策: docs/3-operations/decisions.md
- 现有实现: src/services/credit.ts, src/models/credit.ts
