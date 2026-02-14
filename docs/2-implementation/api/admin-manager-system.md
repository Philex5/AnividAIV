# Admin Manager System APIs (FEAT-manager-system)

当前版本：v1 (仅管理员访问)

统一鉴权：基于 `ADMIN_EMAILS` 白名单进行校验。未通过返回：`{"code":-1,"message":"no access"}`。

## GET /api/admin/analytics/users

请求：
- query: `start` (ISO 时间，默认过去 90 天)

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": {
    "trend": [
      {"date":"2025-10-01","users":12,"orders":3},
      ...
    ]
  }
}
```

## GET /api/admin/analytics/generations

请求：
- query: `start` (ISO 时间，默认过去 90 天)

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": {
    "trend": [
      {"date":"2025-10-01","total":30,"success":24,"failed":6},
      ...
    ],
    "types": [
      {"type":"anime","count":1234},
      {"type":"video","count":56}
    ]
  }
}
```

## GET /api/admin/logs/failures

请求：
- query: `limit` (默认 50)

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": { "items": [ {"uuid":"...","type":"anime","error_code":"MODEL_TIMEOUT",...} ] }
}
```

## GET /api/admin/revenue/trend

请求：
- query: `start` (ISO 时间，默认过去 90 天)

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": { "trend": [ {"date":"2025-10-01","amount":12345}, ... ] }
}
```

## GET /api/admin/costs

请求：
- query: `month` (YYYY-MM，可选)
- query: `platform` (可选)

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": { "items": [ {"month":"2025-10","platform":"openai","amount":1000,"currency":"USD"} ] }
}
```

## POST /api/admin/costs

请求体：
```
{ "month":"2025-10", "platform":"openai", "amount": 1000, "currency":"USD", "note":"manual" }
```

响应：`{"code":0,"message":"ok"}`

## GET /api/admin/chats/overview

请求：
- query: `granularity` (`day|month`，默认 `day`)
- query: `start` (ISO 时间，可选)
- query: `end` (ISO 时间，可选)

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": {
    "totals": { "sessions": 1280, "users": 423 },
    "trends": [
      { "bucket": "2026-02-01", "sessions": 82, "users": 39 }
    ]
  }
}
```

## GET /api/admin/chats/top-ocs

请求：
- query: `start` (ISO 时间，可选)
- query: `end` (ISO 时间，可选)
- query: `limit` (默认 3)

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": {
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
}
```

## GET /api/admin/chats/sessions

请求：
- query: `page` (默认 1)
- query: `limit` (默认 50)
- query: `start` (ISO 时间，可选)
- query: `end` (ISO 时间，可选)
- query: `characterId` (可选)
- query: `userId` (可选)

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "sessionId": "s_abc123xyz",
        "user": { "id": "u_001", "name": "Demo User", "avatarUrl": "https://..." },
        "character": { "id": "oc_001", "name": "Airi", "avatarUrl": "https://..." },
        "messageCount": 28,
        "createdAt": "2026-02-09T10:30:00.000Z"
      }
    ],
    "total": 1280,
    "page": 1,
    "limit": 50,
    "has_more": true
  }
}
```

## GET /api/admin/chats/sessions/{sessionId}/messages

请求：
- path: `sessionId`

响应：
```
{
  "code": 0,
  "message": "ok",
  "data": {
    "session": { "sessionId": "s_abc123xyz", "userId": "u_001", "characterId": "oc_001" },
    "messages": [
      { "id": "m_001", "messageIndex": 1, "role": "user", "content": "Hello", "createdAt": "2026-02-09T10:30:00.000Z" }
    ]
  }
}
```

变更历史：
- 2025-10-31 FEAT-manager-system 首次发布：analytics/generations、analytics/users、logs/failures、revenue/trend、costs
- 2026-02-10 FEAT-CHAT-ADMIN-VIEW 新增 chats 管理接口：overview/top-ocs/sessions/session messages
