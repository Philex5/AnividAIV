# Chat with Characters Feature Implementation (FEAT-CHAT)

## 功能概述

用户可与原创角色（OC）进行实时对话。系统提供会话管理、上下文记忆、模型权限控制与按月聊天配额（AP）管理，响应为SSE流式返回，聊天记录持久化保存。

## 验收标准

- ✅ 用户可选择角色开始新对话并创建会话
- ✅ 支持SSE流式响应，前端可逐步展示
- ✅ 自动保存聊天历史到数据库
- ✅ 按会员等级限制上下文窗口与token总量
- ✅ 按会员等级限制月度聊天配额（AP），不足时禁止发送并引导升级
- ✅ 失败时不消耗配额（成功后才扣减）
- ✅ 权限控制：仅可与公开角色或自建角色对话
- ✅ 免费用户仅可用Base模型，订阅用户可用Premium模型
- ✅ 实时展示对话轮数与token/配额进度

## 系统级流程（当前实现）

- 前端：选择角色 → 创建会话 → 发送消息 → SSE接收回复 → 渲染与存储
- 后端：权限校验 → 限制校验（轮数/总tokens/模型权限/配额）
- 生成成功后：写入消息 → 记录使用日志 → 消耗配额
- 生成失败：不扣减配额，返回英文错误

## 管理端 Chats 子页面设计（2026-02 更新）

Related: docs/2-implementation/features/feature-manager-system.md

### 页面目标

- 面向管理员集中查看全站 Chat 使用情况与会话明细。
- 在一个页面内完成“指标总览 + 趋势洞察 + 热门角色 + 会话追踪 + 会话详情复盘”。

### 页面结构与布局

- 页面路由：`/admin/chats`
- 布局分区：
  - 第一行左右分栏：左侧指标卡片区，右侧趋势曲线图区。
  - 第二行：最受欢迎 OC（Top 3）卡片区。
  - 第三行：会话列表区（按 session 组织）+ 会话详情弹窗。

### 指标卡片区（左侧）

- `Total Sessions`：累计会话总数。
- `Chat Users`：累计使用过 Chat 的去重用户数。
- 统计口径：默认按当前筛选时间窗口汇总（不筛选时为全量）。

### 趋势曲线区（右侧）

- 双折线：`Session Count` 与 `User Count`。
- 维度切换：`day` / `month`。
- 交互要求：切换维度后，卡片统计与图表数据同步刷新。

### 热门 OC（Top 3）

- 排序规则：按 session 数量降序。
- 每张卡片展示：
  - OC 头像
  - OC 名称
  - 参与用户数（去重）
  - Session 数量
- 默认返回前三名，可扩展 `limit` 参数。

### 会话列表（按 Session 组织）

- 列字段：
  - `Session ID`：省略展示（如 `abc...xyz`），支持一键复制完整值。
  - 用户头像：悬停 Tooltip 展示 `username` 与 `userId`。
  - 角色头像：悬停 Tooltip 展示 `characterName` 与 `characterId`。
  - `Message Count`：该会话消息数（会话消息条数）。
  - `Created At`：会话创建时间。
- 排序：默认按 `created_at desc`。
- 分页：与管理端列表规范一致（默认 50/页）。

### 会话详情弹窗

- 触发方式：点击列表行或“View”按钮。
- 内容：该 `sessionId` 的完整聊天记录（按 `message_index` 正序）。
- 消息字段：`role`、`content`、`created_at`（必要时可展示 metadata 摘要）。

### 管理端 API 设计（新增）

- `GET /api/admin/chats/overview`
  - query: `granularity=day|month`, `start`, `end`
  - response: `totals + trends`
- `GET /api/admin/chats/top-ocs`
  - query: `start`, `end`, `limit`（默认 3）
  - response: `[{ characterId, characterName, avatarUrl, userCount, sessionCount }]`
- `GET /api/admin/chats/sessions`
  - query: `page`, `pageSize`, `start`, `end`, `characterId`, `userId`
  - response: `session 列表 + 分页信息`
- `GET /api/admin/chats/sessions/{sessionId}/messages`
  - response: `完整聊天消息列表`

### 数据聚合口径

- Session 总数：`chat_sessions` 记录数。
- Chat 用户数：`chat_sessions.user_uuid` 去重计数。
- 热门 OC 排名：按 `chat_sessions.character_uuid` 分组后 `count(*) desc`。
- 会话消息数：优先使用 `chat_sessions.message_count`；缺失时回退聚合 `character_chats`。
- 趋势图：
  - day：按日期聚合 sessions 与去重 users。
  - month：按 `YYYY-MM` 聚合 sessions 与去重 users。

### 前端实现建议（页面级）

- 页面文件：`src/app/[locale]/(admin)/admin/chats/page.tsx`
- 组件建议：
  - `src/components/admin/chats/ChatMetricsCards.tsx`
  - `src/components/admin/chats/ChatTrendChart.tsx`
  - `src/components/admin/chats/TopOcCards.tsx`
  - `src/components/admin/chats/ChatSessionsTable.tsx`
  - `src/components/admin/chats/ChatSessionDetailDialog.tsx`
- 文案来源：页面级 i18n（管理端命名空间），不新增中文硬编码。

## 关键机制

### 1. 配额体系（替代通用积分）

- 聊天使用独立配额（AP），不走通用积分扣减与退款
- Pro会员：monthly_quota = -1 表示无限；为满足数据库约束，reset_at 使用固定远期时间
- 配额扣减在生成成功后执行，失败不扣减
- 会员等级变化后同步更新配额（支付成功触发更新）

### 2. 上下文与限制策略

- 轮数限制、单轮最大tokens、总tokens限制均来自配置
- 采用滑窗策略保留最近N轮对话
- 达到上限后返回英文错误并提示升级或清空对话

### 3. 模型权限

- Base: gpt-3.5-turbo（免费用户可用）
- Premium: gpt-4.1（订阅用户可用）
- 后端严格校验模型权限

### 4. 通信方式

- API 以SSE流式输出
- 前端通过流式事件更新消息与状态

## 影响清单

### API 层

- `src/app/api/chat/send-message/route.ts`：SSE消息发送
- `src/app/api/chat/sessions/route.ts`：会话列表
- `src/app/api/chat/sessions/create/route.ts`：创建会话
- `src/app/api/chat/history/route.ts`：会话历史
- `src/app/api/chat/config/route.ts`：聊天配置与模型权限
- `src/app/api/chat/quota/route.ts`：配额与统计
- `src/app/api/chat/quota/reset/route.ts`：配额重置与健康检查（需CRON_TOKEN）
- `src/app/api/admin/init-chat-quota/route.ts`：初始化配额数据
- `src/app/api/admin/chats/overview/route.ts`：管理员 chats 指标与趋势
- `src/app/api/admin/chats/top-ocs/route.ts`：管理员热门 OC 排行
- `src/app/api/admin/chats/sessions/route.ts`：管理员会话列表
- `src/app/api/admin/chats/sessions/[sessionId]/messages/route.ts`：管理员会话详情

### 服务层

- `src/services/chat/chat-service.ts`：聊天主流程（限制校验、调用模型、保存消息、扣减配额）
- `src/services/chat/chat-quota-service.ts`：配额生命周期与消耗逻辑
- `src/services/chat/chat-quota-reset-cron.ts`：配额重置任务
- `src/services/membership.ts`：会员变更触发配额同步更新
- `src/services/admin/chat-analytics.ts`：管理员 chats 聚合查询（overview/top/session list/detail）

### 数据模型层

- `src/models/chat.ts`：会话与消息存储
- `src/models/chat-quota.ts`：配额记录与重置逻辑
- `src/models/chat-usage-log.ts`：配额使用日志
- `src/db/schema.ts`：`chat_sessions`、`character_chats`、`chat_quotas`、`chat_usage_logs`

### 前端与UI

#### 页面路由
- `src/app/[locale]/(default)/chat/page.tsx` - 营销落地页（SEO优化）
- `src/app/[locale]/(default)/chat/page-client-marketing.tsx` - 营销页面客户端组件
- `src/app/[locale]/(default)/chat/[uuid]/page.tsx` - 聊天会话页面（需登录）
- `src/app/[locale]/(default)/chat/page-client.tsx` - 聊天界面客户端组件
- `src/app/[locale]/(admin)/admin/chats/page.tsx` - 管理端 chats 子页面（指标、趋势、热门 OC、会话列表）

#### 管理端组件
- `src/components/admin/chats/ChatMetricsCards.tsx`
- `src/components/admin/chats/ChatTrendChart.tsx`
- `src/components/admin/chats/TopOcCards.tsx`
- `src/components/admin/chats/ChatSessionsTable.tsx`
- `src/components/admin/chats/ChatSessionDetailDialog.tsx`

#### 聊天组件
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/MessageList.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/ChatQuotaDisplay.tsx`
- `src/components/chat/ChatQuotaBadge.tsx`
- `src/components/chat/QuotaExceededDialog.tsx`
- `src/components/chat/CharacterSelector.tsx`

#### 营销组件
- `src/components/chat/ChatMarketingHero.tsx`
- `src/components/chat/ChatOCCarouselGallery.tsx`
- `src/components/marketing/MarketingIntroduction.tsx`
- `src/components/marketing/MarketingBenefits.tsx`
- `src/components/marketing/MarketingHowToUse.tsx`
- `src/components/marketing/MarketingFAQ.tsx`
- `src/components/marketing/MarketingCTA.tsx`

### 配置与Prompt

- `src/configs/chat/chat-limits.json`
- `src/configs/prompts/character-chat.json`

## 数据模型（摘要）

- `chat_sessions`：session_id、user_uuid、character_uuid、title、message_count、last_message_at、created_at
- `character_chats`：uuid、session_id、message_index、role、content、metadata、created_at
- `chat_quotas`：user_uuid、membership_level、monthly_quota、monthly_used、quota_reset_at、total_used
- `chat_usage_logs`：uuid、user_uuid、session_id、membership_level、tokens_used、ap_used、created_at

## 配额重置与监控

- 定时任务入口：`POST /api/chat/quota/reset`（Bearer CRON_TOKEN）
- 健康检查入口：`GET /api/chat/quota/reset`
- 逻辑：查找过期配额并批量重置；同时支持“懒检查”在发送消息前触发重置

## 变更历史

- 2025-01-14 FEAT-CHAT 初始实现：聊天会话、上下文管理、角色权限控制
- 2025-11-14 FEAT-CHAT 增强：模型权限、会员等级限制、进度条与升级引导
- 2025-11-19 FEAT-CHAT-QUOTA-OPT 引入AP配额体系替代积分，新增配额与使用日志表
- 2025-11-19 FEAT-CHAT-QUOTA-OPT 修复：会员过期导致配额未重置的问题
- 2025-11-19 FEAT-CHAT-QUOTA-OPT 修复：Pro配额reset_at为远期时间以满足约束
- 2025-11-19 FEAT-CHAT-QUOTA-OPT 修复：支付成功后同步更新配额
- 2026-02-03 FEAT-CHAT-GREETING 新增：新建会话时从OC的modules.personality.greeting随机取一条打招呼
- 2026-02-03 FEAT-CHAT-PROMPT-OPT 优化：增强System Prompt，从quotes/extended_attributes提取说话风格，添加话题多样性指导
  - 相关文档：docs/2-implementation/backend/chat-experience-optimization-research.md
- 2026-02-04 FEAT-CHAT-PAGE-SPLIT 页面分离：营销页面 `/chat` 与聊天会话页面 `/chat/[uuid]` 分离
  - `/chat`：营销落地页，包含Hero、OC Gallery、Benefits、HowToUse、FAQ、CTA等营销内容
  - `/chat/[uuid]`：实际聊天界面，需要登录，支持会话历史、消息收发、配额显示等
  - 示例角色（oc-example-XXX）对未登录用户开放访问
- 2025-11-14 FEAT-CHAT 增强：模型权限、会员等级限制、进度条与升级引导
- 2025-11-19 FEAT-CHAT-QUOTA-OPT 引入AP配额体系替代积分，新增配额与使用日志表
- 2025-11-19 FEAT-CHAT-QUOTA-OPT 修复：会员过期导致配额未重置的问题
- 2025-11-19 FEAT-CHAT-QUOTA-OPT 修复：Pro配额reset_at为远期时间以满足约束
- 2025-11-19 FEAT-CHAT-QUOTA-OPT 修复：支付成功后同步更新配额
- 2026-02-03 FEAT-CHAT-GREETING 新增：新建会话时从OC的modules.personality.greeting随机取一条打招呼
- 2026-02-03 FEAT-CHAT-PROMPT-OPT 优化：增强System Prompt，从quotes/extended_attributes提取说话风格，添加话题多样性指导
  - 相关文档：docs/2-implementation/backend/chat-experience-optimization-research.md
- 2026-02-10 FEAT-CHAT-ADMIN-VIEW 新增：管理员 chats 子页面设计（指标/趋势/热门 OC/会话列表/详情弹窗）

---

Related: PRD章节-聊天室功能
