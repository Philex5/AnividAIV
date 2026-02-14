# Component: world Social (世界观社交区)

**Related**: FEAT-WORLDS | [feature-worlds.md](../features/feature-worlds.md)

## 组件目标

- 提供世界观详情页的点赞、收藏、分享入口与计数展示。
- 提供评论输入与列表展示，支持二级评论与删除。
- 与世界观可见性与登录态保持一致，避免非公开内容被互动。

## 数据依赖

- `POST /api/worlds/[id]/like` / `DELETE /api/worlds/[id]/like`
- `POST /api/worlds/[id]/favorite` / `DELETE /api/worlds/[id]/favorite`
- `POST /api/worlds/[id]/share`
- `GET /api/worlds/[id]/comments`
- `POST /api/worlds/[id]/comments`
- `DELETE /api/worlds/[id]/comments/[commentId]`

## 交互与状态

- 未登录用户点击点赞/收藏/评论/分享：提示登录（英文错误）。
- 私有世界观：隐藏社交入口与评论区，仅创建者可见编辑入口。
- 点赞/收藏：前端乐观更新，失败时回滚并提示。
- 分享：先调用 share API 记录，再执行客户端分享（复制链接或系统分享）。
- 评论：提交成功后插入顶部；删除后本地移除并同步计数。
- 文案与空态使用 `src/i18n/pages/world/en.json`，避免硬编码。

## 组件结构（建议）

- **InteractionBar**：点赞/收藏/分享按钮 + 计数
- **CommentComposer**：评论输入、提交按钮
- **CommentList**：分页加载、回复与删除入口

## 涉及文件

- `src/components/worlds/WorldSocialSection.tsx`（建议新增）
- `src/components/worlds/WorldCommentList.tsx`（建议新增）
- `src/components/worlds/WorldCommentComposer.tsx`（建议新增）
- `src/app/[locale]/(default)/worlds/[uuid]/page.tsx`
- `src/i18n/pages/world/en.json`

## 变更历史

- 2026-01-23 FEAT-WORLDS 新增世界观社交区组件设计（影响：前端/文档）
