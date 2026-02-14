# 系统通知服务设计

## Related
- FEAT-NOTIFICATIONS
- 数据模型: `docs/1-specs/data-models.md`
- API: `docs/2-implementation/api/notifications.md`

## 责任边界

- 负责创建通知、读取列表、维护读状态。
- 对接事件源（生成完成/订阅/积分/公告）。
- 不负责邮件发送（邮件由 Email Service 处理）。

## 数据流

1. 业务事件触发（生成、订阅、积分等）。
2. Service 调用 `createNotification` 写入 `notifications`。
3. 列表查询时合并 `notification_user_states`，返回 read 状态。
4. 前端调用 `mark-read` 更新读状态。

## 幂等与一致性

- 通过 `metadata.event_id` 或 `metadata.source_id` 进行幂等校验（同事件只生成一次通知）。
- 读状态使用 `unique(notification_id, user_uuid)` 约束防止重复写入。

## 事务与并发

- 创建通知时与外部业务事件保持同事务边界（如生成完成回调内）。
- 标记已读支持批量更新，保证幂等。

## 错误处理

- 所有错误消息使用英文文案。
- 对无权限访问返回 `NOT_FOUND` 或 `UNAUTHORIZED`。

## 受影响代码（规划）

- `src/models/notification.ts`
- `src/services/notification.ts`
- `src/app/api/notifications/*`

## 变更历史

- 2026-02-06 FEAT-NOTIFICATIONS Initial proposal.
