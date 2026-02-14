# Admin 管理接口（当前版本）

Related: FEAT-manager-system | 设计：docs/2-implementation/features/feature-manager-system.md | 后端：docs/2-implementation/backend/module-admin-manager-system.md | 数据：docs/1-specs/data-models.md

- Base Path: `/api/admin`
- Auth: 需管理员（基于 `getUserInfo()` + `ADMIN_EMAILS` 校验）；未授权返回 401
- Content-Type: `application/json; charset=utf-8`
- 错误返回统一：`{ "error": string, "code": string }`（英文错误信息）

## 1. Analytics（用户/会员/生成）

### 1.1 GET `/api/admin/analytics/users`

- Query:
  - `months?` number 默认 12
- Response:

```
{
  "usersMonthly": [{ "month": "2025-09", "users": 123 }],
  "membersMonthly": [{ "month": "2025-09", "members": 40 }],
  "conversionMonthly": [{ "month": "2025-09", "conversion": 0.12 }]
}
```

- Notes:
  - 会员判定：`is_sub=true && sub_expired_at>=now`
  - 会员等级：`getMembershipLevel(userUuid)`

### 1.2 GET `/api/admin/analytics/generations`

- Query:
  - `window?` "7d" | "30d" | "90d" | "all"，默认 "90d"
  - `bucket?` "day" | "month"，默认 "day"
  - `type?` string
- Response:

```
{
  "trend": [{ "date": "2025-10-01", "total": 30, "success": 27, "failed": 3 }],
  "typeSummary": { "anime": 100, "avatar": 30, "character": 40, "video": 10 }
}
```

## 2. Generations（生成管理）

### 2.1 GET `/api/admin/generations`

- Query：
  - `user_uuid?` string
  - `email?` string
  - `type?` string
  - `character_uuid?` string
  - `from?` ISO datetime
  - `to?` ISO datetime
  - `page?` number 默认 1
  - `limit?` number 默认 50
  - `sort?` "updated_at_desc" | "updated_at_asc" | "created_at_desc"（默认 updated_at_desc）
- Response:

```
{
  "items": [
    { "uuid": "g1", "user_uuid": "u1", "type": "anime", "status": "completed", "created_at": "...", "updated_at": "..." }
  ],
  "total": 123
}
```

### 2.2 GET `/api/admin/generations/{uuid}`

- Path:
  - `uuid` string
- Response:

```
{
  "generation": { "uuid": "g1", "type": "anime", "status": "completed", "metadata": { } },
  "images": [{ "uuid": "img1", "image_url": "...", "model_id": "..." }],
  "videos": [{ "uuid": "vid1", "video_url": "...", "quality": "720p" }]
}
```

- Errors:
  - `404 { code: "ERR_ADMIN_GEN_NOT_FOUND", error: "Generation not found" }`

## 3. Logs & Ops（错误与失败）

### 3.1 GET `/api/admin/logs/error-rate`

- Query：
  - `window?` "7d" | "30d" | "90d" | "all"，默认 "30d"
  - `bucket?` "day" | "month"，默认 "day"
  - `type?` string
- Response:

```
{
  "trend": [{ "date": "2025-10-01", "error_rate": 0.08 }]
}
```

### 3.2 GET `/api/admin/logs/failures`

- Query：
  - `type?` string
  - `from?` ISO datetime
  - `to?` ISO datetime
  - `page?` number 默认 1
  - `limit?` number 默认 50
  - `q?` string（按 generation_uuid / error_code 模糊匹配）
- Response:

```
{
  "items": [
    { "generation_uuid": "g1", "type": "anime", "error_code": "TIMEOUT", "error_message": "...", "created_at": "..." }
  ],
  "total": 42
}
```

### 3.3 GET `/api/admin/logs/failures/export`

- Query 同 3.2
- Response: CSV 文件下载（`text/csv`）

## 4. Revenue（收入/成本/盈利）

### 4.1 GET `/api/admin/revenue/trend`

- Query：
  - `window?` "7d" | "30d" | "90d" | "all"，默认 "90d"
  - `bucket?` "day" | "month"，默认 "day"
- Response:

```
{
  "trend": [{ "date": "2025-10-01", "revenue": 120.5 }]
}
```

### 4.2 GET `/api/admin/revenue/summary`

- Query：
  - `window?` "30d" | "90d" | "12m" | "all"，默认 "30d"
- Response:

```
{
  "currentWindow": 1234.56,
  "lifetime": 98765.43
}
```

### 4.3 GET `/api/admin/costs`

- Query：
  - `month?` YYYY-MM
  - `platform?` string
- Response:

```
{
  "items": [ { "id": 1, "month": "2025-10", "platform": "openai", "amount": 8000, "currency": "USD", "note": "..." } ]
}
```

### 4.4 POST `/api/admin/costs`

- Body：

```
{
  "month": "2025-10",
  "platform": "openai",
  "amount": 8000,
  "currency": "USD",
  "note": "optional"
}
```

- Response: `204 No Content`
- Errors：
  - `400 { code: "ERR_COST_UPSERT_FAILED", error: "Invalid input" }`

### 4.5 DELETE `/api/admin/costs/{id}`

- Path：`id` number
- Response: `204 No Content`

### 4.6 GET `/api/admin/profit/trend`

- Query：
  - `window?` "12m" | "all"（按月）
- Response:

```
{
  "trend": [{ "month": "2025-10", "profit": 405.5 }]
}
```

### 4.7 GET `/api/admin/profit/summary`

- Query：
  - `window?` "12m" | "all"
- Response:

```
{
  "currentWindow": 400.0,
  "lifetime": 5000.0
}
```

## 5. Chats（聊天管理）

Related: docs/2-implementation/features/feature-chat.md

### 5.1 GET `/api/admin/chats/overview`

- Query：
  - `granularity?` "day" | "month"，默认 "day"
  - `start?` ISO datetime
  - `end?` ISO datetime
- Response:

```
{
  "totals": {
    "sessions": 1280,
    "users": 423
  },
  "trends": [
    { "bucket": "2026-02-01", "sessions": 82, "users": 39 },
    { "bucket": "2026-02-02", "sessions": 94, "users": 44 }
  ]
}
```

- Notes：
  - `sessions` 来自 `chat_sessions` 计数
  - `users` 为 `chat_sessions.user_uuid` 去重计数
  - `granularity=month` 时 `bucket` 形如 `2026-02`

### 5.2 GET `/api/admin/chats/top-ocs`

- Query：
  - `start?` ISO datetime
  - `end?` ISO datetime
  - `limit?` number 默认 3，最大 20
- Response:

```
{
  "items": [
    {
      "characterId": "oc_xxx",
      "characterName": "Airi",
      "avatarUrl": "https://...",
      "userCount": 120,
      "sessionCount": 310
    }
  ]
}
```

- Notes：
  - 排序规则：按 `sessionCount desc`

### 5.3 GET `/api/admin/chats/sessions`

- Query：
  - `page?` number 默认 1
  - `limit?` number 默认 50，最大 100
  - `start?` ISO datetime
  - `end?` ISO datetime
  - `characterId?` string
  - `userId?` string
  - `sort?` "created_at_desc" | "created_at_asc"（默认 created_at_desc）
- Response:

```
{
  "items": [
    {
      "sessionId": "s_abc123xyz",
      "user": {
        "id": "u_001",
        "name": "Demo User",
        "avatarUrl": "https://..."
      },
      "character": {
        "id": "oc_001",
        "name": "Airi",
        "avatarUrl": "https://..."
      },
      "messageCount": 28,
      "createdAt": "2026-02-09T10:30:00.000Z"
    }
  ],
  "total": 1280,
  "page": 1,
  "limit": 50,
  "has_more": true
}
```

- Notes：
  - `messageCount` 优先使用 `chat_sessions.message_count`，缺失时可回退聚合 `character_chats`

### 5.4 GET `/api/admin/chats/sessions/{sessionId}/messages`

- Path：
  - `sessionId` string
- Response:

```
{
  "session": {
    "sessionId": "s_abc123xyz",
    "userId": "u_001",
    "characterId": "oc_001"
  },
  "messages": [
    {
      "id": "m_001",
      "messageIndex": 1,
      "role": "user",
      "content": "Hello",
      "createdAt": "2026-02-09T10:30:00.000Z"
    },
    {
      "id": "m_002",
      "messageIndex": 2,
      "role": "assistant",
      "content": "Hi there!",
      "createdAt": "2026-02-09T10:30:03.000Z"
    }
  ]
}
```

- Errors：
  - `404 { code: "ERR_ADMIN_CHAT_SESSION_NOT_FOUND", error: "Chat session not found" }`

## 6. Emails（CMS 邮件管理）

### 6.1 GET `/api/admin/emails/logs`

- Query：
  - `page?` number 默认 1
  - `limit?` number 默认 20，最大 100
  - `q?` string（按 subject/email/uuid 模糊检索）
  - `status?` string（pending/sent/delivered/opened/clicked/failed/bounced/complained）
- Response:

```
{
  "items": [
    {
      "uuid": "e_log_001",
      "email": "user@example.com",
      "campaign_uuid": "camp_001",
      "campaign_name": "manual-2026-02-13T11:00:00",
      "subject": "Product update",
      "status": "sent",
      "sent_at": "2026-02-13T11:00:10.000Z",
      "created_at": "2026-02-13T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

### 6.2 GET `/api/admin/emails/logs/{uuid}`

- Path:
  - `uuid` string
- Response:

```
{
  "item": {
    "uuid": "e_log_001",
    "email": "user@example.com",
    "subject": "Product update",
    "status": "sent",
    "html_content": "<html>...</html>",
    "text_content": "plain text",
    "resend_message_id": "msg_xxx",
    "metadata": { "source": "admin_manual", "target_type": "all" }
  }
}
```

### 6.3 POST `/api/admin/emails/send-manual`

- Body：

```
{
  "targetType": "all",
  "campaignName": "manual-feb-13",
  "subject": "Product update",
  "contentText": "plain text body",
  "specificEmails": ["a@example.com", "b@example.com"]
}
```

- Notes:
  - `targetType=all` 时忽略 `specificEmails`
  - `targetType=specific` 时要求 `specificEmails`
  - `contentText` 为唯一正文输入；后端自动生成主题 HTML（品牌主题色 + 奶油玻璃质感 + 右上角 logo）
  - 发送使用 Resend API，并写入 `email_campaigns`、`email_campaign_recipients`、`email_logs`
- Response:

```
{
  "campaign_uuid": "camp_001",
  "target_type": "all",
  "total": 200,
  "success": 198,
  "failed_count": 2,
  "failed": [
    { "email": "x@example.com", "error": "..." }
  ]
}
```

### 6.4 POST `/api/admin/emails/sync-resend`

- Body：

```
{
  "uuids": ["e_log_001", "e_log_002"],
  "limit": 100
}
```

### 6.5 POST `/api/admin/emails/preview-manual`

- Body：

```
{
  "subject": "Product update",
  "contentText": "plain text body"
}
```

- Notes:
  - 仅用于发送前预览
  - 与 `send-manual` 复用同一 HTML 生成逻辑，确保预览与最终邮件一致
- Response:

```
{
  "html": "<!DOCTYPE html>..."
}
```

- Notes:
  - `uuids` 可选，传入时仅同步指定日志
  - 未传 `uuids` 时按最近记录批量同步（默认 100）
  - 通过 Resend `emails.get` 拉取 `last_event` 并回写本地 `status`
- Response:

```
{
  "total": 20,
  "synced": 20,
  "changed": 7,
  "failed": []
}
```

## 错误码（统一）

- `ERR_UNAUTHORIZED` 未授权访问
- `ERR_INVALID_PARAMS` 参数非法
- `ERR_ADMIN_ANALYTICS_INVALID_RANGE` 范围或粒度非法
- `ERR_ADMIN_ANALYTICS_QUERY_FAILED` 统计查询失败
- `ERR_ADMIN_GEN_QUERY_FAILED` 生成查询失败
- `ERR_ADMIN_GEN_NOT_FOUND` 生成不存在
- `ERR_ADMIN_LOGS_QUERY_FAILED` 日志查询失败
- `ERR_ADMIN_REVENUE_QUERY_FAILED` 收入/盈利查询失败
- `ERR_COST_UPSERT_FAILED` 成本录入失败
- `ERR_COST_QUERY_FAILED` 成本查询失败
- `ERR_COST_DELETE_FAILED` 成本删除失败
- `ERR_ADMIN_CHAT_QUERY_FAILED` chats 统计或列表查询失败
- `ERR_ADMIN_CHAT_SESSION_NOT_FOUND` 会话不存在
- `ERR_ADMIN_CHAT_MESSAGES_QUERY_FAILED` 会话消息查询失败
- `ERR_ADMIN_EMAIL_LOG_QUERY_FAILED` 邮件日志查询失败
- `ERR_ADMIN_EMAIL_LOG_NOT_FOUND` 邮件日志不存在
- `ERR_ADMIN_EMAIL_SEND_FAILED` 手动邮件发送失败
- `ERR_ADMIN_EMAIL_SYNC_FAILED` Resend 同步失败

## 版本与变更历史

- 2025-10-31 FEAT-manager-system 初始版本：新增 admin analytics/generations/logs/revenue/costs 接口设计
- 2026-02-10 FEAT-CHAT-ADMIN-VIEW 新增 admin chats 接口设计：overview/top-ocs/sessions/messages
- 2026-02-13 FEAT-cms-email-admin 新增 admin emails 接口：logs/detail/send-manual
- 2026-02-13 FEAT-cms-email-admin-v2 admin 手动发信改为纯文本输入，新增 `sync-resend` 状态同步接口
- 2026-02-13 FEAT-cms-email-admin-v3 新增发送前预览接口 `preview-manual`
