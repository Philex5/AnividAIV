# AnividAI API 完整索引

本文档提供所有 API 端点的快速索引,按字母顺序排列。

## 索引说明

- **端点**: API 路径
- **方法**: HTTP 方法
- **功能**: 简要说明
- **文档**: 对应的详细文档文件

---

## A

### Admin - Analytics

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/admin/analytics/costs/current` | GET | 获取当月成本 | [admin.md](./admin.md) |
| `/api/admin/analytics/costs/month` | GET | 获取指定月成本 | [admin.md](./admin.md) |
| `/api/admin/analytics/costs/total` | GET | 获取总成本 | [admin.md](./admin.md) |
| `/api/admin/analytics/generations` | GET | 生成任务分析 | [admin.md](./admin.md) |
| `/api/admin/analytics/month-detail` | GET | 月度明细 | [admin.md](./admin.md) |
| `/api/admin/analytics/months` | GET | 月度列表 | [admin.md](./admin.md) |
| `/api/admin/analytics/orders/by-product` | GET | 产品订单分布 | [admin.md](./admin.md) |
| `/api/admin/analytics/orders/count` | GET | 订单统计 | [admin.md](./admin.md) |
| `/api/admin/analytics/revenue/month` | GET | 当月收入 | [admin.md](./admin.md) |
| `/api/admin/analytics/revenue/total` | GET | 总收入 | [admin.md](./admin.md) |
| `/api/admin/analytics/revenue/trend` | GET | 收入趋势 | [admin.md](./admin.md) |
| `/api/admin/analytics/users` | GET | 用户分析 | [admin.md](./admin.md) |

### Admin - Management

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/admin/costs` | GET | 成本记录列表 | [admin.md](./admin.md) |
| `/api/admin/costs` | POST | 添加成本记录 | [admin.md](./admin.md) |
| `/api/admin/costs/[id]` | PUT | 更新成本记录 | [admin.md](./admin.md) |
| `/api/admin/costs/[id]` | DELETE | 删除成本记录 | [admin.md](./admin.md) |
| `/api/admin/chats/overview` | GET | 聊天指标与趋势 | [admin.md](./admin.md) |
| `/api/admin/chats/top-ocs` | GET | 热门 OC 排行（按 session） | [admin.md](./admin.md) |
| `/api/admin/chats/sessions` | GET | 聊天会话列表 | [admin.md](./admin.md) |
| `/api/admin/chats/sessions/[sessionId]/messages` | GET | 会话完整消息列表 | [admin.md](./admin.md) |
| `/api/admin/generations` | GET | 生成任务列表 | [admin.md](./admin.md) |
| `/api/admin/logs/failures` | GET | 失败日志列表 | [admin.md](./admin.md) |
| `/api/admin/subscriptions` | GET | 订阅列表 | [admin.md](./admin.md) |

### Admin - Operations

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/admin/init-chat-quota` | POST | 初始化聊天配额 | - |

### Admin - Revenue

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/admin/revenue/trend` | GET | 收入趋势 | [admin.md](./admin.md) |

### Admin - File Transfer

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/admin/file-transfer/pending-list` | GET | 待转存文件列表 | [admin-file-transfer.md](./admin-file-transfer.md) |
| `/api/admin/file-transfer/trigger-all` | POST | 批量触发转存 | [admin-file-transfer.md](./admin-file-transfer.md) |
| `/api/admin/file-transfer/trigger-one/[generationUuid]` | POST | 触发单个转存 | [admin-file-transfer.md](./admin-file-transfer.md) |
| `/api/admin/image-processing/trigger` | POST | 触发图片处理 | [admin-file-transfer.md](./admin-file-transfer.md) |

### Affiliate

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/update-invite` | POST | 使用邀请码 | [affiliate.md](./affiliate.md) |
| `/api/update-invite-code` | POST | 设置邀请码 | [affiliate.md](./affiliate.md) |

### Anime Generation

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/anime-generation/build-extract-prompt` | POST | LLM 提取层构建提示词 | [anime-generation.md](./anime-generation.md) |
| `/api/anime-generation/create-task` | POST | 创建动漫图片生成任务 | [anime-generation.md](./anime-generation.md) |
| `/api/anime-generation/history` | GET | 获取生成历史 | [anime-generation.md](./anime-generation.md) |
| `/api/anime-generation/optimize-prompt` | POST | 优化 prompt | [anime-generation.md](./anime-generation.md) |

### Anime Video

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/anime-video/create-task` | POST | 创建视频生成任务 | [anime-video.md](./anime-video.md) |
| `/api/anime-video/optimize-prompt` | POST | 优化视频 prompt | [anime-video.md](./anime-video.md) |
| `/api/anime-video/quote` | POST | 获取视频生成报价 | [anime-video.md](./anime-video.md) |

### Artworks

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/artworks` | GET | 获取用户作品列表 | [artworks.md](./artworks.md) |

### Auth

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/auth/[...nextauth]` | ALL | NextAuth 认证端点 | [auth.md](./auth.md) |

---

## C

### Characters

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/characters/[uuid]/avatar` | GET | 获取角色头像 | [characters.md](./characters.md) |
| `/api/characters/[uuid]/creations` | GET | 获取角色创作历史 | [characters.md](./characters.md) |
| `/api/characters/[uuid]/profile` | GET | 获取角色立绘 | [characters.md](./characters.md) |
| `/api/characters/[uuid]/recommendations` | GET | 获取相似角色推荐 | [characters.md](./characters.md) |
| `/api/characters/avatars/batch` | POST | 批量获取角色头像 | [characters.md](./characters.md) |
| `/api/characters/profiles/batch` | POST | 批量获取角色立绘 | [characters.md](./characters.md) |

### Chat

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/chat/config` | GET | 获取聊天配置 | [chat.md](./chat.md) |
| `/api/chat/history` | GET | 获取会话历史 | [chat.md](./chat.md) |
| `/api/chat/quota` | GET | 获取聊天配额 | - |
| `/api/chat/quota/reset` | POST | 重置聊天配额 | - |
| `/api/chat/quota/reset` | GET | 配额重置健康检查 | - |
| `/api/chat/send-message` | POST | 发送聊天消息 | [chat.md](./chat.md) |
| `/api/chat/sessions` | GET | 获取会话列表 | [chat.md](./chat.md) |
| `/api/chat/sessions/[id]/clear` | POST | 清空会话消息 | - |
| `/api/chat/sessions/create` | POST | 创建聊天会话 | [chat.md](./chat.md) |

### Comments

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/comments` | GET | 获取评论列表 | - |
| `/api/comments` | POST | 发表评论 | - |
| `/api/comments/[uuid]` | DELETE | 删除评论 | - |
| `/api/comments/[uuid]/like` | POST | 点赞评论 | - |
| `/api/comments/[uuid]/like` | DELETE | 取消点赞评论 | - |
| `/api/comments/[uuid]/replies` | GET | 获取子评论 | - |

### Community

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/community/artworks` | GET | 获取社区作品列表 | [community.md](./community.md) |
| `/api/community/artworks/[uuid]` | GET | 获取作品详情 | [community.md](./community.md) |
| `/api/community/artworks/[uuid]/favorite` | POST | 收藏作品 | [community.md](./community.md) |
| `/api/community/artworks/[uuid]/favorite` | DELETE | 取消收藏 | [community.md](./community.md) |
| `/api/community/artworks/[uuid]/like` | POST | 点赞作品 | [community.md](./community.md) |
| `/api/community/artworks/[uuid]/like` | DELETE | 取消点赞 | [community.md](./community.md) |
| `/api/community/artworks/[uuid]/visibility` | PUT | 修改作品可见性 | [community.md](./community.md) |

---

## D

### Docs

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/docs/search` | GET | 搜索文档 | [docs-search.md](./docs-search.md) |

### Download

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/download/image/[uuid]` | GET | 下载生成图片 | [download.md](./download.md) |
| `/api/download/video/[uuid]` | GET | 下载生成视频 | [download.md](./download.md) |

---

## E

### Export

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/export/character/[uuid]/json` | GET | 导出角色 JSON | [export.md](./export.md) |
| `/api/export/character/[uuid]/markdown` | GET | 导出角色 Markdown | [export.md](./export.md) |

### Emails

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/emails/send` | POST | 发送邮件 | [emails.md](./emails.md) |

---

## F

### Feedback

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/add-feedback` | POST | 提交用户反馈 | [feedback.md](./feedback.md) |

---

## G

### Generation

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/generation/handle-failure` | POST | 处理生成失败 | [generation.md](./generation.md) |
| `/api/generation/image/[uuid]` | GET | 获取生成图片 | [generation.md](./generation.md) |
| `/api/generation/image-resolve/[uuid]` | GET | 解析生成图片资源 | [generation.md](./generation.md) |
| `/api/generation/status/[generation_uuid]` | GET | 查询生成任务状态 | [generation.md](./generation.md) |
| `/api/generation/video/[uuid]` | GET | 获取生成视频 | [generation.md](./generation.md) |
| `/api/generation/webhook` | POST | KieAI Webhook 回调 | [generation.md](./generation.md) |

---

## I

### Images

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/images/proxy` | GET | 图片代理 | - |

### Incentive

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/incentive/status` | GET | 获取激励状态 | - |
| `/api/incentive/check-in` | POST | 每日签到 | - |
| `/api/incentive/claim-share` | POST | 领取分享奖励 | - |

## M

### Membership

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/membership/status` | GET | 获取会员状态 | [membership.md](./membership.md) |

## N

### Notifications

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/notifications` | GET | 获取通知列表 | [notifications.md](./notifications.md) |
| `/api/notifications/unread-count` | GET | 获取未读数量 | [notifications.md](./notifications.md) |
| `/api/notifications/mark-read` | POST | 标记已读 | [notifications.md](./notifications.md) |
| `/api/notifications/mark-all-read` | POST | 标记全部已读 | [notifications.md](./notifications.md) |
| `/api/notifications/archive` | POST | 归档通知 | [notifications.md](./notifications.md) |

---

## O

### Studo Tools

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/oc-apps/action-figure/templates` | GET | 获取手办模板列表 | [oc-apps.md](./oc-apps.md) |
| `/api/oc-apps/sticker/templates` | GET | 获取贴纸模板列表 | [oc-apps.md](./oc-apps.md) |

### OC Maker

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/oc-maker/characters` | GET | 获取用户 OC 列表 | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/characters` | POST | 创建新 OC | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/characters/[uuid]` | GET | 获取 OC 详情 | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/characters/[uuid]` | PUT | 更新 OC | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/characters/[uuid]` | DELETE | 删除 OC | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/characters/[uuid]/avatar` | POST | 更新 OC 头像 | - |
| `/api/oc-maker/characters/generate-avatar` | POST | 生成 OC 头像 | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/characters/generate-image` | POST | 生成 OC 图片 | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/check-limit` | GET | 检查 OC 创建限额 | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/config` | GET | 获取 OC Maker 配置 | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/config` | POST | 验证 OC 配置 | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/public/characters` | GET | 获取公开 OC 列表（支持 uuids 批量） | [oc-maker.md](./oc-maker.md) |
| `/api/oc-maker/quick-generate` | POST | 快速生成 OC | [oc-maker.md](./oc-maker.md) |

### Orders

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/orders` | GET | 获取订单列表 | - |

---

## P

### Payments

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/checkout` | POST | 创建支付订单 | [payments.md](./payments.md) |
| `/api/pay/callback/creem` | GET | Creem 支付回调 | [payments.md](./payments.md) |
| `/api/pay/callback/stripe` | GET | Stripe 支付回调 | [payments.md](./payments.md) |
| `/api/pay/notify/creem` | POST | Creem 支付 Webhook | [payments.md](./payments.md) |
| `/api/pay/notify/stripe` | POST | Stripe 支付 Webhook | [payments.md](./payments.md) |

---

## S

### Story Lab

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/story-lab/runs` | POST | 创建 Story Lab Run | [story-lab.md](./story-lab.md) |
| `/api/story-lab/runs/[run_uuid]` | GET | 查询 Run 详情 | [story-lab.md](./story-lab.md) |
| `/api/story-lab/runs/[run_uuid]/parse` | POST | 解析脚本为 Scene | [story-lab.md](./story-lab.md) |
| `/api/story-lab/runs/[run_uuid]/plan` | POST | 生成 Shot 计划 | [story-lab.md](./story-lab.md) |
| `/api/story-lab/runs/[run_uuid]/generate` | POST | 启动镜头生成 | [story-lab.md](./story-lab.md) |
| `/api/story-lab/runs/[run_uuid]/export` | POST | 导出 storyboard 包 | [story-lab.md](./story-lab.md) |
| `/api/story-lab/shots/[shot_uuid]` | PATCH | 更新镜头语义 | [story-lab.md](./story-lab.md) |
| `/api/story-lab/shots/[shot_uuid]/retry` | POST | 镜头级重试 | [story-lab.md](./story-lab.md) |

### Subscriptions

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/subscriptions` | GET | 获取用户订阅信息 | [subscriptions.md](./subscriptions.md) |
| `/api/subscriptions/[id]/logs` | GET | 获取订阅日志 | [subscriptions.md](./subscriptions.md) |
| `/api/subscriptions/billing-portal` | POST | 创建计费门户会话 | [subscriptions.md](./subscriptions.md) |
| `/api/subscriptions/cancel` | POST | 取消订阅 | [subscriptions.md](./subscriptions.md) |

---

## T

### Tags

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/tags/presets` | GET | 获取预置标签 | [oc-maker.md](./oc-maker.md) |

## U

### Upload

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/upload` | POST | 上传参考图/用户上传资源 | [upload.md](./upload.md) |

### User

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/get-expiring-credits` | GET | 获取即将过期积分 | [user.md](./user.md) |
| `/api/get-user-balance` | GET | 获取用户余额 | [user.md](./user.md) |
| `/api/get-user-credits` | POST | 获取用户积分详情 | [user.md](./user.md) |
| `/api/get-user-info` | POST | 获取用户信息 | [user.md](./user.md) |
| `/api/users/character-avatars` | GET | 批量获取用户角色头像 | [user.md](./user.md) |
| `/api/users/[id]/profile` | GET | 获取用户公开资料 | [user.md](./user.md) |
| `/api/users/[id]/profile` | PUT | 更新用户 Profile | [user.md](./user.md) |
| `/api/users/[id]/public-characters` | GET | 获取用户公开角色 | [user.md](./user.md) |
| `/api/users/[id]/public-worlds` | GET | 获取用户公开世界 | [user.md](./user.md) |
| `/api/users/[id]/public-artworks` | GET | 获取用户公开 artworks | [user.md](./user.md) |

---

## W

### Worlds

| 端点 | 方法 | 功能 | 文档 |
|------|------|------|------|
| `/api/worlds` | GET | 获取世界观列表 | [world.md](./world.md) |
| `/api/worlds/[id]` | GET | 获取世界观详情 | [world.md](./world.md) |
| `/api/worlds` | POST | 创建世界观 | [world.md](./world.md) |
| `/api/worlds/[id]` | PUT | 更新世界观 | [world.md](./world.md) |
| `/api/worlds/[id]` | DELETE | 删除世界观 | [world.md](./world.md) |
| `/api/worlds/[id]/favorite` | POST | 收藏世界观 | [world.md](./world.md) |
| `/api/worlds/[id]/favorite` | DELETE | 取消收藏世界观 | [world.md](./world.md) |
| `/api/worlds/[id]/like` | POST | 点赞世界观 | [world.md](./world.md) |
| `/api/worlds/[id]/like` | DELETE | 取消点赞世界观 | [world.md](./world.md) |
| `/api/worlds/[id]/share` | POST | 分享世界观 | [world.md](./world.md) |

---

## 按业务域分类

### 用户与会员 (User & Membership)
- user.md - 用户信息、积分与 Profile
- membership.md - 会员等级、权益
- affiliate.md - 邀请返利

### 生成服务 (Generation)
- anime-generation.md - 动漫图片生成
- anime-video.md - 视频生成
- generation.md - 生成通用 API
- oc-maker.md - OC 角色创建
- oc-apps.md - OC 应用工具

### 社交与社区 (Social & Community)
- community.md - 社区作品
- artworks.md - 作品管理
- characters.md - 角色资源
- chat.md - 聊天对话
- world.md - 世界观社交与详情

### 支付与订阅 (Payment & Subscription)
- payments.md - 支付处理
- subscriptions.md - 订阅管理

### 管理后台 (Admin)
- admin.md - 管理员后台
- admin-file-transfer.md - 文件转存管理

### 基础服务 (Basic Services)
- auth.md - 认证
- upload.md - 文件上传
- download.md - 文件下载
- emails.md - 邮件发送
- feedback.md - 用户反馈

---

## 快速查找

### 按功能查找

**用户管理**
- 获取用户信息: `/api/get-user-info`
- 获取积分: `/api/get-user-credits`
- 获取用户 Profile: `/api/users/[id]/profile`
- 会员状态: `/api/membership/status`

**生成任务**
- 创建图片任务: `/api/anime-generation/create-task`
- 创建视频任务: `/api/anime-video/create-task`
- 查询状态: `/api/generation/status/[generation_uuid]`

**社区互动**
- 浏览作品: `/api/community/artworks`
- 点赞: `/api/community/artworks/[uuid]/like`
- 收藏: `/api/community/artworks/[uuid]/favorite`

**订阅管理**
- 查看订阅: `/api/subscriptions`
- 取消订阅: `/api/subscriptions/cancel`

---

## 变更历史

- 2025-11-12 首次创建 API 完整索引文档
