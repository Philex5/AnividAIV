# Tasks — FEAT-CHAT: Chat with OC

Related: docs/2-implementation/features/feature-chat-with-oc.md

## 描述
面向“Chat with OC (角色聊天)”MVP，落地“选择角色→发送消息→流式回复→保存会话→按次扣费”的完整闭环；保证流畅体验、权限与扣费严格、错误可追溯、配置可控、文档与测试闭环。

## 验收标准（引用）
- PRD: docs/1-specs/PRD.md（Chat with OC 段落）
- Feature: docs/2-implementation/features/feature-chat-with-oc.md（验收标准与流程）
- API 契约: docs/2-implementation/api/chat.md
- 数据模型: docs/1-specs/data-models.md#chat-with-oc-聊天相关

## 依赖
- 角色数据可用：`characters` 已上线（OC Maker 依赖）
- 积分系统：`src/services/credit.ts` 可扣减/退款并可追溯
- 身份认证：`@/auth` 与 `src/services/user.ts`
- LLM 平台：XiaoJingAI API Key 配置到环境变量
- R2归档

## 任务拆解（单任务 1–2 天粒度）

1) 合同与文档对齐
- [ ] 核对 Feature/PRD/API/数据模型一致性，补齐缺失与冲突
- [x] 修正特性文档中的配置链接指向（feature 文档中“chat-limits.md/character-chat-prompts.md”与实际 `docs/1-specs/configs/chat-config.md` 一致）
- [ ] 在 feature 的“影响清单”补充双向链接（前端/后端/测试文件路径）

2) 数据模型与迁移
- [x] 在 `src/db/schema.ts` 定义 `character_chats`、`chat_sessions`
- [ ] 生成与执行迁移：`pnpm db:generate`、`pnpm db:migrate`
- [ ] 建立必要索引（会话查询、归档标记、更新时间）
- [ ] 校对数据模型文档与表结构最终一致

3) 聊天服务层（业务逻辑）
- [x] 新增 `src/services/chat/chat-service.ts` 并实现：
  - [ ] `getOrCreateSession`、`listSessions`、`getHistory`
  - [ ] `getConversationContext`（滑动窗口）
  - [ ] `buildCharacterPrompt`（基于角色与模板）
  - [ ] `sendMessage`（非流式）与 [x] `sendMessageStream`（SSE）
  - [x] 消息持久化与会话元数据更新
  - [x] 异常退还积分与错误上报（SSE内置退款）

4) AI 平台与积分集成
- [ ] 复用 XiaoJingAI 客户端创建逻辑（现有 optimize-prompt 参照）
- [x] 预扣 1 MC，失败自动退款；成功写入扣费流水
 - [x] 权限校验：private 角色仅所有者可聊；public 对所有用户开放

5) API 路由实现（遵循契约）
- [x] `POST /api/chat/send-message`（SSE/非流式二选一）
- [x] `GET /api/chat/history`（分页、排序）
- [x] `GET /api/chat/sessions`（筛选与排序）
- [x] `GET /api/chat/config`（返回用户等级限制）
- [ ] 可选：`GET /api/chat/sessions/{session_id}/archive-status`（非 MVP）
- [ ] 可选：`GET /api/chat/sessions/{session_id}/export-archive`（非 MVP）

6) 频率限制与可靠性
- [ ] 基于 `chat-limits.json` 的 per-minute / per-day 频控（优先 Redis）
- [ ] SSE 连接健壮性与错误事件格式统一
- [ ] 限流/鉴权/参数错误均返回英文错误信息

7) 配置与提示词
- [x] 新增 `src/configs/chat/chat-limits.json`（free/pro 等分级）
- [x] 新增 `src/configs/prompts/character-chat.json`（角色 system prompt 模板）
- [x] 可选：`src/configs/chat/archive-config.json`（归档策略，非 MVP）
- [ ] 文档：对齐 `docs/1-specs/configs/chat-config.md` 示例与字段

8) 前端页面与组件
- [x] 页面：`src/app/[locale]/(default)/chat/page.tsx`
- [ ] 组件：`MessageList`、`MessageBubble`、`ChatInput`、`SessionSidebar`
- [ ] SSE 流式渲染与中断；自动滚动；空态/加载/异常态
- [ ] 会话列表与继续会话；新建会话入口；费用提示与余额校验
- [ ] 响应式与移动端 Drawer；复用主题配色与 UI 组件

9) 国际化（页面级）
- [x] 新增 `src/i18n/pages/chat/en.json`（仅英文）
- [x] 页面所有文案走 `@i18n/pages/chat`，严禁硬编码

10) 测试与验收
- [ ] 新增测试用例文档：`tests/test-cases/FEAT-CHAT-main.md`（主路径）
- [ ] 新增测试用例文档：`tests/test-cases/FEAT-CHAT-errors.md`（错误/边界）
- [ ] 新增测试用例文档：`tests/test-cases/FEAT-CHAT-regression.md`（回归）
- [ ] 执行后在 `tests/test-reports/` 记录摘要

11) 观测与运维
- [ ] 关键日志与指标：请求失败、退款次数、SSE 中断率、响应耗时
- [ ] 变更记录：`docs/3-operations/changelog.md` 追加 FEAT-CHAT
- [ ] 如有重要取舍：`docs/3-operations/decisions.md` 记录

12) 非 MVP（排期）
- [ ] 聊天归档到 R2 的定时任务与导出接口
- [ ] 会话标题自动生成与敏感词过滤
- [ ] Redis 缓存对话上下文与会话列表
- [ ] 多模态输入与长记忆（向量库）

## DoD（完成判定）
- [ ] PRD 含可测试验收标准（Chat with OC 段落）
- [ ] feature 文档“影响清单”与实现一致且双向链接完备
- [ ] API 与数据模型落地并与文档一致
- [ ] 前端/后端实现细化文档已更新并反链 feature
- [ ] 三类测试用例已新增并通过（主路径/错误/回归）
- [ ] changelog 已追加；必要时 decisions 已记录
