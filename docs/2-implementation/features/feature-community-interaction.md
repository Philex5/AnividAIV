# Feature: 社区互动（点赞/收藏/评论/统计）

Related: FEAT-social-stats, FEAT-user-comments

## 背景与目标

整合社区互动与统计能力，覆盖作品点赞/收藏、评论与评论点赞，并在列表与详情中提供高性能统计数据。

## 功能范围（当前实现）

- 作品互动：对 `image` / `video` / `character` 点赞与收藏
- 评论系统：发表评论、二级回复、删除自己的评论
- 评论互动：评论点赞
- 统计展示：列表与详情展示点赞/收藏/评论数（views 目前固定为 0 占位）

## 数据与一致性策略

- 明细记录：`user_interactions` 记录用户对作品与评论的互动明细
  - 文件：`src/db/schema.ts`，`src/models/user-interaction.ts`
- 评论数据：`comments` 表存储评论内容、父子关系与评论点赞数
  - 文件：`src/db/schema.ts`，`src/models/comment.ts`
- 冗余统计：`characters` / `generation_images` / `generation_videos` 存储 `like_count`、`favorite_count`、`comment_count`
  - 文件：`src/db/schema.ts`，`src/models/social-stats.ts`
- 双写事务：
  - 作品点赞/收藏：在 `user_interactions` 写明细，同时更新资源表统计字段
    - 文件：`src/services/user-interaction.ts`，`src/models/social-stats.ts`
  - 评论新增/删除：在 `comments` 写入/软删，同时更新资源表 `comment_count`
    - 文件：`src/services/comment.ts`，`src/models/comment.ts`，`src/models/social-stats.ts`
  - 评论点赞：在 `user_interactions` 写明细，同时更新 `comments.like_count`
    - 文件：`src/services/comment.ts`，`src/services/user-interaction.ts`

## API 与服务位置

- 作品互动：
  - 点赞：`POST /api/community/artworks/[uuid]/like`，取消点赞：`DELETE /api/community/artworks/[uuid]/like`
  - 收藏：`POST /api/community/artworks/[uuid]/favorite`，取消收藏：`DELETE /api/community/artworks/[uuid]/favorite`
  - 文件：`src/app/api/community/artworks/[uuid]/like/route.ts`，`src/app/api/community/artworks/[uuid]/favorite/route.ts`
- 社区列表与统计聚合：
  - 列表：`GET /api/community/artworks`
  - 统计装配：`src/services/community.ts` 读取冗余统计字段并合并用户交互状态
  - 文件：`src/app/api/community/artworks/route.ts`，`src/services/community.ts`
- 评论相关：
  - 列表：`GET /api/comments`
  - 发表：`POST /api/comments`
  - 删除：`DELETE /api/comments/[uuid]`
  - 点赞/取消：`POST|DELETE /api/comments/[uuid]/like`
  - 回复列表：`GET /api/comments/[uuid]/replies`
  - 文件：`src/app/api/comments/route.ts`，`src/app/api/comments/[uuid]/route.ts`，`src/app/api/comments/[uuid]/like/route.ts`，`src/app/api/comments/[uuid]/replies/route.ts`

## 前端集成位置

- 社区详情互动按钮（点赞/收藏）：`src/components/community/detail/SocialActions.tsx`
- 详情页评论区：
  - `src/components/community/comment/CommentSection.tsx`
  - `src/components/community/comment/CommentItem.tsx`
  - `src/components/community/comment/CommentInput.tsx`
  - `src/components/community/detail/ArtworkDetailModal.tsx`
  - `src/components/character-detail/CharacterDetailClient.tsx`

## 国际化现状

- 评论相关文案当前使用全局 messages 的 `comments` 命名空间：
  - `src/i18n/messages/en.json`
  - `src/i18n/messages/ja.json`

## 约束与边界

- 仅支持公开作品评论；私有作品仅作者可评论
- 评论内容长度由 API 层校验（1–1000 字符）
- 评论删除为软删除

## 变更历史

- 2026-01-14 FEAT-user-comments 初始方案
- 2026-01-14 FEAT-social-stats 初始方案
- 2026-01-14 FEAT-community-interaction 合并文档
