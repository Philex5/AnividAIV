# Backend Service: world 社交服务 (service-world-social)

**Related**: FEAT-WORLDS | [feature-worlds.md](../features/feature-worlds.md)

## 目标与职责

- 为世界观提供点赞、收藏、分享、评论的服务逻辑与权限校验。
- 复用 `user_interactions` 与 `comments`，并双写 `oc_worlds` 统计字段。
- 保证非公开世界观不可被外部互动。

## 入口与依赖

- Service：`src/services/user-interaction.ts`
- Comments：`src/services/comment.ts`
- Models：`src/models/user-interaction.ts`、`src/models/oc-world.ts`
- API：`src/app/api/worlds/[id]/*`（待新增）

## 核心规则

- 仅 `visibility_level = public` 的世界观允许互动。
- 所有互动要求登录，未登录返回 `AUTH_REQUIRED`。
- 点赞/收藏/分享：写入 `user_interactions`，并更新 `oc_worlds` 的冗余计数。
- 评论：写入 `comments`，并更新 `oc_worlds.comment_count`。
- 删除评论：仅作者可删，采用软删除。

## 计数与一致性

- 使用事务双写：`user_interactions/comments` + `oc_worlds` 计数字段。
- 计数更新需原子自增/自减，避免并发异常。
- 定期对账脚本（后续）用于校验计数一致性。

## 错误码约定

- `AUTH_REQUIRED`：未登录
- `FORBIDDEN`：非公开世界观或非作者操作
- `NOT_FOUND`：世界观或评论不存在
- `VALIDATION_FAILED`：评论内容不合法

## 变更历史

- 2026-01-23 FEAT-WORLDS 新增世界观社交服务设计（影响：后端/文档）
