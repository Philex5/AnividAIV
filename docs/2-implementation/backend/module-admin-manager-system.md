Related: FEAT-manager-system | Feature: docs/2-implementation/features/feature-manager-system.md

# Admin Manager System Backend（合并文档）

## 总览
- 目的：为管理员后台提供用户/会员/生成的统计与查询、错误与运维监测、收入/成本/盈利分析。
- 口径：
  - 会员：`users.is_sub = true` 且 `users.sub_expired_at >= NOW()`。
  - 生成类型：仅以 `generations.type` 为唯一来源。
  - 成本：仅支持手工录入。
- 性能：管理员界面可接受适度延迟。新增只读视图简化聚合；如后续不足，再评估物化视图。

## 数据与视图
- 新增表：`operation_costs`
  - `id | month(YYYY-MM) | platform | amount(int) | currency | note | created_at | updated_at`
  - 索引建议：`(month, platform)`；可选唯一约束 `(month, platform)`。
- 建议视图：
  - `vw_orders_daily_revenue(date, revenue)`：订单收入（仅 paid），按日聚合。
  - `vw_generations_daily_counts(date, total, success, failed, type_counts jsonb)`：生成按日聚合。
  - `vw_generation_failures_daily(date, type, failed_count)`：失败任务按日、类型聚合。
  - `vw_generations_type_summary(type, total, last_updated_at)`：按类型汇总与最近更新时间。

## 模块与服务

### 1) Analytics（用户/会员/生成 趋势与汇总）
- 职责：用户注册、有效会员、注册转化率，生成趋势与汇总。
- 依赖：`users`、`generations`，以及 `vw_generations_daily_counts`。
- 输出示例：
  - 用户月度：`[{ month, users }]`
  - 会员月度：`[{ month, members }]`
  - 转化率：`[{ month, conversion }]`
  - 生成趋势：`[{ date, total, success, failed }]`
- 方法签名（伪代码）：
```
export async function getUserMonthlyTrend({ months = 12 }): Promise<Array<{ month: string; users: number }>>
export async function getMemberMonthlyTrend({ months = 12 }): Promise<Array<{ month: string; members: number }>>
export async function getMonthlyConversion({ months = 12 }): Promise<Array<{ month: string; conversion: number }>>
export async function getGenerationsTrend({ window = '90d', bucket = 'day', type?: string }): Promise<Array<{ date: string; total: number; success: number; failed: number }>>
export async function getGenerationTypeSummary({ window = '30d' }): Promise<Record<string, number>>
```
- 错误码：`ERR_ADMIN_ANALYTICS_INVALID_RANGE`、`ERR_ADMIN_ANALYTICS_QUERY_FAILED`

### 2) Generations（生成管理）
- 职责：类型汇总、趋势、筛选分页、详情（联动图片/视频）。
- 依赖：`generations`、`generation_images`、`generation_videos`，以及 `vw_generations_type_summary`。
- 方法签名：
```
export interface GenerationQuery { user?: { uuid?: string; email?: string }; type?: string; characterUuid?: string; from?: string; to?: string; page?: number; limit?: number; sort?: 'updated_at_desc' | 'updated_at_asc' | 'created_at_desc' }
export async function getGenerationTypeSummary(params: { window?: '7d' | '30d' | '90d' | 'all' }): Promise<Record<string, number>>
export async function listGenerations(query: GenerationQuery): Promise<{ items: any[]; total?: number }>
export async function getGenerationDetail(uuid: string): Promise<{ generation: any; images: any[]; videos: any[] }>
```
- 错误码：`ERR_ADMIN_GEN_QUERY_FAILED`、`ERR_ADMIN_GEN_NOT_FOUND`

### 3) Logs & Ops（错误率与失败任务）
- 职责：错误率趋势、失败任务列表、导出 CSV。
- 依赖：`generations`，以及 `vw_generation_failures_daily`。
- 方法签名：
```
export async function getErrorRateTrend({ window = '30d', bucket = 'day', type?: string }): Promise<Array<{ date: string; error_rate: number }>>
export interface FailureQuery { type?: string; from?: string; to?: string; page?: number; limit?: number; q?: string }
export async function listFailures(query: FailureQuery): Promise<{ items: any[]; total?: number }>
export async function exportFailuresCSV(query: FailureQuery): Promise<Buffer>
```
- 错误码：`ERR_ADMIN_LOGS_QUERY_FAILED`

### 4) Revenue（收入/成本/盈利）+ Operation Cost（成本录入）
- 职责：收入趋势与汇总（orders）、成本录入与聚合（operation_costs）、盈利趋势与汇总（收入-成本）。
- 方法签名：
```
// revenue
export async function getRevenueTrend({ window = '90d', bucket = 'day' }): Promise<Array<{ date: string; revenue: number }>>
export async function getRevenueSummary({ window = '30d' }): Promise<{ currentWindow: number; lifetime: number }>
export async function getCostTrend({ window = '12m' | 'all' }): Promise<Array<{ month: string; platform?: string; cost: number }>>
export async function getProfitTrend({ window = '12m' | 'all' }): Promise<Array<{ month: string; profit: number }>>
export async function getProfitSummary({ window = '12m' | 'all' }): Promise<{ currentWindow: number; lifetime: number }>

// operation-cost
export interface CostInput { month: string; platform: string; amount: number; currency: string; note?: string }
export async function upsertCost(input: CostInput): Promise<void>
export async function listCosts(filter?: { month?: string; platform?: string }): Promise<Array<CostInput & { id: number }>>
export async function deleteCost(id: number): Promise<void>
export async function getMonthlyCost(month: string): Promise<number>
export async function getCostTrend({ months = 12 }): Promise<Array<{ month: string; cost: number }>>
```
- 错误码：`ERR_ADMIN_REVENUE_QUERY_FAILED`、`ERR_COST_UPSERT_FAILED`、`ERR_COST_QUERY_FAILED`、`ERR_COST_DELETE_FAILED`

## API（可选）
- 命名空间：`/api/admin/*`，所有路由需要管理员校验。
- 路由示例：`/api/admin/analytics/*`、`/api/admin/generations/*`、`/api/admin/logs/*`、`/api/admin/revenue/*`、`/api/admin/costs/*`。

## 变更历史
- 2025-10-31 FEAT-manager-system 首次合并文档

