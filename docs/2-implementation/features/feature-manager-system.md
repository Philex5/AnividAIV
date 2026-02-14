# 管理员页面管理系统（FEAT-manager-system）

Related: docs/1-specs/PRD.md

## 背景与目标

- 背景：基于现有 ShipAny 管理端预置能力，补齐“页面管理系统”的分析与运营模块，支持用户分析、生成管理、日志与运维、收入/成本/盈利分析，形成可观测、可运营的一站式后台。
- 目标：在不推翻现有实现的前提下，复用框架组件与分层架构，新增必要的数据聚合服务与页面，保证数据口径清晰、性能可接受（管理员界面允许略低性能）。

## 范畴与不做清单

- 范畴：
  - 总览仪表盘增强（生成总量/成功率等）
  - 用户管理（分析 Tab、用户卡片 Tab、注册归因展示）
  - 生成管理（类型统计、曲线、筛选列表、详情联动图片/视频）
  - Chats 管理（聊天核心指标、趋势、热门 OC、会话列表与详情弹窗）
  - 日志与运维（错误率与失败任务列表、筛选与导出）
  - 收入详情（收入曲线、手工成本录入、盈利曲线）
- 不做：
  - 自动对接外部计费成本 API（当前仅手工录入）
  - 跨系统权限联动（延续 ADMIN_EMAILS 校验）

## 统一口径与定义

- 会员（Member）定义：以用户表口径为准，用户满足 `is_sub = true` 且 `sub_expired_at >= 当前时间` 视为“会员（有效订阅）”。
- 生成类型（Generation Type）：以 `generations.type` 字段作为唯一来源区分类型；无需依赖图片/视频子表的 `gen_type`。
- 成本数据：由两部分组成并统一进入利润计算。
  - Manual Cost：手工录入成本，按月份与平台维度维护与统计。
  - MC Cost：系统自动按“生成类”有效积分消耗计算成本，口径为 `credits.is_voided = false/null`、`credits < 0` 且 `trans_type like %_generation`，并排除 `chat` 相关记录；分档计价：
    - Video MC（`trans_type` 包含 `video`）：`1 MC = $0.001`
    - Image MC（其余生成类）：`1 MC = $0.0005`
    - 汇总成本按 cents 四舍五入。

## 验收标准（摘录）

1. 仪表盘
   - 显示总用户、付费订单、帖子、反馈、生成总量、成功率。
   - 显示 90 天趋势：用户、订单、生成（按日）。
2. 订单管理
   - 保持“只读列表”，包含订单号、支付邮箱、产品、金额、创建时间。
3. 用户管理
   - Tab1 分析：按月注册、有效会员数、会员等级分布、月注册转化率；展示关键指标卡片。
   - Tab2 卡片：分页卡片列表，含头像、会员等级、用户名、uuid、生成任务数、当前积分、本月使用积分；点击卡片可跳转到该用户的“生成管理”筛选视图。
   - 用户列表：展示注册国家（Country）与来源（Source=ref/utm_source 组合），未知显示 `-`。
4. 生成管理
   - 顶部卡片：各类型数量（anime/avatar/character/video/oc-app 等）。
   - 曲线：按日/月聚合，支持类型筛选。
   - 列表：支持按用户（email/uuid）、类型、OC uuid、时间窗口筛选，默认按更新时间倒序；行内可查看详情，联动图片/视频与参数。
5. 日志与运维
   - 错误率总览（按类型/时间窗），失败任务列表（generation_uuid、type、error_code、error_message、时间），支持筛选与导出 CSV。
6. 收入详情
   - 收入：按日/月趋势，本月与历史汇总。
   - 成本：按月、平台维度手工录入与历史列表；可编辑；并自动叠加 MC Cost。
   - 盈利：按月趋势、当月与历史汇总（收入-(手工成本+MC成本)）。
7. Chats 子页面
   - 指标栏展示：总 Session 数、总使用 Chat 的用户数。
   - 趋势图展示：Session 数与用户数双折线，支持按天/按月聚合切换。
   - 展示最受欢迎 OC Top3：头像、OC 名称、参与用户数、Session 数。
   - 会话列表按 Session 组织：`sessionId`（省略展示且可复制）、用户头像（Tooltip 展示用户名+用户ID）、角色头像（Tooltip 展示角色名+角色ID）、会话消息数、创建时间。
   - 点击会话可打开弹窗查看完整聊天记录。

## 系统级流程/时序（文字版）

1. 管理员访问 `/admin/*` → 布局层通过 `getUserInfo + ADMIN_EMAILS` 校验 → 允许访问。
2. 页面以 Server Components 直调 service 聚合（SSR 优先），需要交互筛选时调用 `/api/admin/*`。
3. service 层从 models 获取聚合数据；部分统计走数据库视图（简化查询）；必要时在 service 层做二次聚合。
4. UI 通过 DataCards/DataCharts/Table 组件渲染；筛选变更触发服务或 API 的新查询。
5. 用户归因：首触访问捕获 `ref/utm_source` 写入 cookie，首次登录回调读取 cookie 与请求头国家码并落库。

## 性能与实现策略

- 分层：保持 Model → Service → API 模式，跨模型统计放在 service，页面尽量“瘦”。
- 视图：新增只读数据库视图，简化常用聚合查询（如：每日生成数、每日收入、每日失败数、类型分布等）。
- 性能：管理员界面可接受较低性能；趋势默认 90 天窗口；列表分页 50/页；必要时进行批量查询以避免 N+1。

## 权限与安全

- 访问：延续 `src/app/[locale]/(admin)/layout.tsx` 的管理员校验（基于 ADMIN_EMAILS）。
- 接口：新增 `/api/admin/*` 统一做管理员校验；错误信息与默认提示统一英文。

## 国际化与 UI 约束

- 页面级 i18n：当前 admin 文案集中在 `src/i18n/messages/en.json` 的 `admin.*`（后续可扩其他语言）。
- 主题与色彩：沿用框架主题 Token（如 `var(--primary)`），避免硬编码颜色
  。
- 组件复用：`DataCards`、`DataCharts`、`TableSlot`、`Dropdown`、`Empty` 等。

## 数据模型影响

- 新增表：`operation_costs`
  - 字段：`id | month(YYYY-MM) | platform | amount(int) | currency | note | created_at | updated_at`
  - 用途：保存每月各平台成本（手工录入），支持修改与追溯。
- users 字段补充（注册归因）：
  - `signup_country`、`signup_ref`、`signup_utm_source`（迁移：`src/db/migrations/0007_add_user_attribution.sql`）
- 建议新增只读视图（示例命名，实际以迁移为准）：
  - `vw_generations_daily_counts`：基于 `generations` 按日聚合（total / success / failed / by type）。
  - `vw_orders_daily_revenue`：基于 `orders` 按日聚合收入（仅 status=paid）。
  - `vw_generation_failures_daily`：失败任务按日聚合，含 error_code。
  - `vw_generations_type_summary`：各类型合计数量与最近更新时间。

## API（可选，交互筛选时使用）

- 命名空间：`/api/admin/*`（均需管理员校验）
  - `GET /api/admin/analytics/users`：用户与会员趋势/转化率。
  - `GET /api/admin/analytics/generations`：生成趋势与汇总。
  - `GET /api/admin/generations`：生成列表筛选与分页。
  - `GET /api/admin/generations/{uuid}`：生成详情（含图片/视频）。
  - `GET /api/admin/logs/failures`、`GET /api/admin/logs/error-rate`、`GET /api/admin/logs/failures/export`。
  - `GET /api/admin/revenue/trend|summary`。
  - `GET/POST /api/admin/costs`：成本录入、查询。
  - `GET /api/admin/chats/overview`：聊天指标与趋势（sessions/users，day|month）。
  - `GET /api/admin/chats/top-ocs`：热门 OC TopN（默认 3）。
  - `GET /api/admin/chats/sessions`：会话列表筛选与分页。
  - `GET /api/admin/chats/sessions/{sessionId}/messages`：会话完整聊天记录。

## 前端实现（页面 & 交互概述）

- 仪表盘 `/admin`：增强总览卡片（含生成总量、成功率）与 90 天三折线（用户/订单/生成）。
- 用户 `/admin/users`：Tab1“Analytics”（趋势与分布）；Tab2“Cards”（卡片列表、筛选、跳转）；列表展示注册国家与来源。
- 生成 `/admin/generations`：顶部类型卡片 + 趋势 + 可筛选表格 + 详情侧滑/页。
- Chats `/admin/chats`：左侧指标卡片、右侧趋势图；下方热门 OC 卡片与会话列表；行点击打开聊天记录弹窗。
- 日志 `/admin/logs`：错误率与失败列表（筛选、导出）。
- 收入 `/admin/revenue`：收入趋势 + 成本录入与历史 + 盈利趋势与汇总。
- 归因采集：在 `src/app/[locale]/layout.tsx` 注入 `AttributionTracker` 监听并写入 cookie。
- CMS `/admin/emails`：Tab1“Sent Emails”查看发送历史并查看详情；Tab2“Manual Send”支持 `all users` / `specific emails` 手动群发。

## 测试要点与用例索引

- 覆盖三类：主路径、错误/边界、回归。
- 重点：
  - 会员口径（is_sub=true 且 sub_expired_at>=now）。
  - 生成类型按 `generations.type` 单一来源。
  - 成本录入的增改查与盈利口径（收入-成本）。
  - 趋势窗口切换（7d/30d/90d）与分页正确性。
- 用例索引：`tests/test-cases/FEAT-manager-system-*.md`（新增时补充链接）。

## 影响清单

- API：docs/2-implementation/api/\*.md（待补充 admin/analytics、admin/generations、admin/logs、admin/revenue、admin/costs 段落）
- 数据模型：docs/1-specs/data-models.md（新增 operation_costs 表、视图说明、users 归因字段）
- 前端：docs/2-implementation/frontend/page-manager-system.md（页面结构/状态/交互与字段映射）
- 后端：docs/2-implementation/backend/module-admin-manager-system.md.md（服务模块说明）
- Chats 设计：docs/2-implementation/features/feature-chat.md（管理员 chats 子页）
- 测试：tests/test-cases/FEAT-manager-system-\*.md
- 代码：
  - `src/app/[locale]/layout.tsx`
  - `src/components/analytics/AttributionTracker.tsx`
  - `src/auth/handler.ts`
  - `src/models/user.ts`
  - `src/components/admin/users/UsersTable.tsx`
  - `src/app/[locale]/(admin)/admin/users/page.tsx`
  - `src/app/[locale]/(admin)/admin/chats/page.tsx`
  - `src/app/[locale]/(admin)/admin/emails/page.tsx`
  - `src/components/admin/chats/`
  - `src/components/admin/email/AdminEmailsClient.tsx`
  - `src/services/admin/chat-analytics.ts`
  - `src/services/admin/email.ts`
  - `src/models/email-log.ts`
  - `src/models/email-campaign.ts`
  - `src/models/chat.ts`

## 变更历史

- 2025-10-31 FEAT-manager-system 首次创建（影响：API/表/页面）
- 2026-01-16 FEAT-manager-system 整合用户归因采集与后台展示说明（影响：表/页面）
- 2026-02-07 FEAT-manager-system 新增系统内 MC 自动成本机制（影响：API/页面）
- 2026-02-10 FEAT-manager-system 新增 chats 子页面设计与接口口径（影响：API/页面）
- 2026-02-13 FEAT-manager-system CMS 增加 Emails 子页面（发送历史 + 手动发送）（影响：API/页面）。
