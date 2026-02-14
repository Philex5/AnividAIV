# Notifications API

## 当前版本

### 获取通知列表
`GET /api/notifications?status=all|unread&cursor=<string>&limit=20`

响应：
- `items[]`: 通知列表
- `next_cursor`: 下一页游标
- `unread_count`: 未读总数（可选）

### 获取未读数量
`GET /api/notifications/unread-count`

响应：
- `count`: number

### 标记已读（单条/批量）
`POST /api/notifications/mark-read`

请求：
- `ids`: string[]

响应：
- `success`: boolean

### 标记全部已读
`POST /api/notifications/mark-all-read`

响应：
- `success`: boolean

### 归档通知（Future / v2）
`POST /api/notifications/archive`

> **Note**: 此接口在当前版本不实现，预留用于未来版本的归档功能。

请求：
- `ids`: string[]

响应：
- `success`: boolean

---

## 错误码
- `UNAUTHORIZED` 未登录
- `INVALID_PARAMS` 参数错误
- `NOT_FOUND` 通知不存在或无权限

## 说明
- 列表接口按 `created_at desc` 排序。
- 公告类通知使用 `notification_user_states` 记录已读状态。
- 所有错误消息返回英文文案。
- `level` 字段枚举值: `info` / `success` / `warning` / `error`
  - `info`: 一般信息通知
  - `success`: 成功操作（如生成完成、订阅成功）
  - `warning`: 警告提醒（如积分即将过期）
  - `error`: 错误通知（如生成失败、续费失败）

## 变更历史
- 2026-02-06 FEAT-NOTIFICATIONS Initial version.
- 2026-02-06 FEAT-NOTIFICATIONS 补充 level 字段枚举说明，标记归档功能为 Future。
