# Feature: System Notifications

**Related**:
- PRD: `docs/1-specs/PRD.md`
- 数据模型: `docs/1-specs/data-models.md`
- API: `docs/2-implementation/api/notifications.md`
- 前端: `docs/2-implementation/frontend/page-notifications.md`
- 后端: `docs/2-implementation/backend/service-notifications.md`
- 测试: `tests/test-cases/FEAT-NOTIFICATIONS-system-notifications.md`

## Background & Objectives
系统通知用于把“生成完成、订阅/积分变动、系统公告、风控提醒”等事件，以统一入口推送给用户，减少用户错过关键状态变更的概率，并提供可追溯的通知中心。

## Acceptance Criteria
- [ ] Header 右侧新增“闹钟/铃铛”入口，显示未读数量徽标（无未读时不显示徽标）。
- [ ] 点击入口打开通知面板，支持查看最新通知、标记单条已读、标记全部已读、跳转到详情。
- [ ] 提供通知中心页面，支持筛选（全部/未读）与分页加载。
- [ ] 通知支持用户定向与全站公告两类投放策略。
- [ ] 通知文本支持 i18n 结构化字段或服务端提供英语文案，前端不硬编码中文。
- [ ] API 支持未读计数、列表分页、读状态更新。

## Current Solution (Proposed)

### 通知类型与来源
- `generation`: 生成完成/失败
- `credits`: 积分变动/即将过期
- `subscription`: 订阅成功/续费失败/到期提醒
- `announcement`: 平台公告
- `security`: 登录异常/安全提醒
- `system`: 系统维护/配置更新

### 交互流程（文字版）
1. 事件触发（生成完成/订阅变更/公告发布）。
2. 服务层创建通知记录（`notifications`），并按受众范围写入或关联读状态。
3. Header 轮询未读数量（间隔30秒），或在进入页面/打开面板时被动刷新。
   - *未来优化*: 可考虑使用 Server-Sent Events (SSE) 或 WebSocket 替代轮询以提升实时性。
4. 用户点击通知进入详情/相关页面，状态同步为已读。

### 受众与投放策略
- **User**: 直接写入 `target_user_uuid`。
- **Global**: 公告类通知不单独生成用户行，通过 `notification_user_states` 记录用户读状态（读时插入/更新）。
- **Segment（预留）**: 支持后续按会员等级/地区等进行受众筛选。

## Impact List
- **API**: `docs/2-implementation/api/notifications.md`
- **Data Model**: `docs/1-specs/data-models.md#系统通知`
- **Frontend**: `docs/2-implementation/frontend/page-notifications.md`
- **Backend**: `docs/2-implementation/backend/service-notifications.md`
- **Tests**: `tests/test-cases/FEAT-NOTIFICATIONS-system-notifications.md`

## Change History
- 2026-02-06 FEAT-NOTIFICATIONS Initial proposal.
- 2026-02-06 FEAT-NOTIFICATIONS 补充轮询频率定义（30秒）及 SSE 未来优化方向。
