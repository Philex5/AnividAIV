# 用户详情页（FEAT-USER-PROFILE）

Related:
- PRD：`docs/1-specs/PRD.md`
- Feature：`docs/2-implementation/features/feature-user-profile.md`
- API：`docs/2-implementation/api/user.md`
- 前端：`docs/2-implementation/frontend/page-user-profile.md`
- 后端：`docs/2-implementation/backend/service-user-profile.md`

## 背景与目标

- 社区内需要统一且可复用的用户详情页，用于承载创作者形象、公开资产与互动入口。
- 入口来自社区中 artwork 创作者头像、评论区用户头像，以及 Header 用户头像下拉的 Profile（位于 User Center 上方）。
- 详情页需要支持查看与编辑（本人）两种状态，满足展示与维护个人资料的需求。
- 用户头像支持两种来源：URL（默认 Google 或上传）与 `image_uuid`（使用 artwork 作为头像）。
- 头像渲染在多个场景复用，需统一解析与组件化，避免每处各自处理。

## 验收标准

- 从社区 artwork、评论头像、Header 头像下拉菜单可进入用户详情页。
- 详情页展示用户头像、用户名、简介、公开角色、公开世界、公开 artwork。
- 背景图展示在头像后方；右上角提供“设置背景”和“更新 Profile”入口。
- 本人可更新 Profile：用户名、头像、性别、简介；背景图上传复用 `src/components/anime-generator/ReferenceImageUpload.tsx`。
- 非本人仅可查看公开内容；所有错误提示与默认值为英文。
- 用户头像可保存 URL 或 `image_uuid`；展示时自动解析为可用图片地址。
- 头像支持使用本人作品，即使作品为私有也可展示（无需公开作品）。

## 系统级流程（文字版）

1. **入口跳转**：社区 artwork/评论头像、Header 用户头像下拉点击 Profile → 跳转用户详情页（基于用户 uuid/slug）。
2. **数据加载**：页面并行拉取用户公开信息、公开角色列表、公开世界列表、公开 artwork 列表。
3. **编辑资料**（本人）：点击“Update Profile”打开编辑面板 → 提交更新 → 刷新基础信息。
4. **设置背景**（本人）：点击“Set Background” → 复用 `ReferenceImageUpload` 上传 → 保存背景图 URL → 页面即时更新。
5. **头像解析**：客户端渲染头像时优先通过统一解析器将 URL/UUID 解析为可展示的图片地址；服务端元数据同样需解析。

## 影响清单（链接锚点）

- 数据模型：`docs/1-specs/data-models.md#users-表`
- API：
  - `docs/2-implementation/api/user.md#7-用户详情页公开-profile`
  - `docs/2-implementation/api/user.md#8-更新用户-profile本人`
- 前端：
  - `docs/2-implementation/frontend/page-user-profile.md#编辑-profile本人`
  - `docs/2-implementation/frontend/page-user-profile.md#头像与背景图解析规则`
- 后端：
  - `docs/2-implementation/backend/service-user-profile.md#2-updateprofileuseruuid-payload`
  - `docs/2-implementation/backend/service-user-profile.md#权限与校验`

## 功能与交互方案

### 页面结构

- 顶部区域：背景图（覆盖到头像后方）+ 头像 + 用户名 + 简介。
- 右上角操作：`Set Background`、`Update Profile` 两个按钮。
- 内容区块：Public Characters / Public Worlds / Public Artworks（按 tabs 或连续分区展示，以页面设计为准）。
- 移动端：顶部信息与操作按钮垂直排列，按钮置于头像下方或右侧独立行，避免遮挡背景图。

### 编辑 Profile（本人）

- 字段：`display_name`（用户名，默认取 Google 用户名）、`avatar_url`（URL 或 `image_uuid`）、`gender`、`bio`。
- 表单交互：提交后乐观更新 + 失败回滚；错误提示英文。
- 服务端校验：限制长度与字符集，持久化前做规范化（例如 trim），避免脏数据。
- 性别枚举：`male/female/other`，不允许写入空值（后端校验）。
- 头像来源限制：仅允许**当前用户本人作品**的 `image_uuid`；校验必须在服务端完成。


### 背景图设置（本人）

- 复用组件：`src/components/anime-generator/ReferenceImageUpload.tsx`。
- 上传结果写入用户 profile 背景字段（例如 `background_url`）。
- 背景图仅用于详情页展示，不参与其他生成流程。
- 用户头像与背景图支持 URL 或 UUID。
- 上传类型：`type=user_upload`，`sub_type=user_文案` / `user_background`。

### 头像渲染复用方案

- 统一组件：新增用户头像组件，集中处理 URL/UUID 解析与 fallback（按页面自定义尺寸）。
- Created by / 卡片 / 大头像 / Header user toggle 统一接入同一组件。
- 客户端解析：优先使用 `useResolvedImageUrl` 处理 URL/UUID。
- 服务端解析（SEO/OG/JSON-LD）：新增 server 侧解析函数，避免直接 `toImageUrl` 误判 UUID。

## 数据模型

### users（新增/扩展字段）

- `display_name`：用户展示名（默认取 Google 用户名；用户修改后以最新值为准）。
- `gender`：`male/female/other`。
- `bio`：用户简介。
- `background_url`：用户详情页背景图 URL。
- `avatar_url`：支持 URL 或 `image_uuid`（方案 A，保持单字段）。
- 迁移与约束：补充到 `docs/1-specs/data-models.md`，并记录迁移文件路径。

## API 影响清单

- `GET /api/users/[id]/profile`：获取用户公开信息 + 公开内容汇总。
- `PUT /api/users/[id]/profile`：更新本人 profile（用户名/头像/性别/简介/背景图）。
- 头像更新校验：当 `avatar_url` 为 UUID 时，必须验证 UUID 归属当前用户。
- 头像解析接口：UUID 解析需支持“头像引用访问”，即便作品私有也可用于展示（仅当 UUID 被当前用户设置为头像）。
- `GET /api/users/[id]/public-artworks`：公开作品列表（或复用社区现有接口）。
- `GET /api/users/[id]/public-characters`：公开角色列表（或复用 OC Maker 列表接口）。
- `GET /api/users/[id]/public-worlds`：公开世界列表（或复用 worlds 列表接口）。

## 前端影响清单

- 新增用户详情页路由与页面（`page-user-profile.md`）。
- Header 用户头像下拉菜单新增 Profile 入口。
- 社区 artwork 与评论头像跳转统一为用户详情页。
- 详情页 i18n：新增 `src/i18n/pages/user-profile/en.json`（仅英文）。
- 头像复用组件：替换世界详情、OC 详情、社区卡片、world 卡片、用户中心、Header user toggle 等。

## 后端影响清单

- 用户 Profile 聚合服务：负责返回公开信息 + 公开内容摘要。
- 更新 Profile 服务：权限校验（仅本人）+ 字段校验 + 写库。
- 需要在用户查询中支持按 uuid/slug 获取用户公开信息。
- 数据模型：`docs/1-specs/data-models.md`
- 头像解析服务：支持 UUID 解析并兼容“头像引用访问”策略。

## 权限与可见性约束

- 非本人只读公开数据；禁止修改 Profile 与背景图。
- 仅展示公开角色/世界/artworks；私有数据不出现在详情页。
- 公开/私有判定：按对应资源的可见性字段过滤（如 `visibility=public`），API 返回不包含私有字段与私有资源。
- 更新接口必须以 `auth()` 会话用户为准，路径 `id` 仅用于路由/404；不匹配则返回 `Unauthorized` 或 `Forbidden`。
- 输出字段需安全转义或安全渲染，避免将用户输入直接注入 HTML。
- 所有错误文案使用英文，如：`"Unauthorized"`、`"Profile not found"`。
- 头像来源限制：仅允许当前用户本人作品作为 `image_uuid`，不允许引用他人作品。
- 头像展示访问：即使作品私有，若被设置为头像则允许在公共页面展示。

## 测试要点

- 入口跳转正确（artwork/评论/Header Profile）。
- 本人更新 profile 与背景图成功，非本人禁止更新。
- 公开内容渲染与空态（英文）正确。
- 背景图上传失败/超限时的英文错误提示。

## 测试用例

- `tests/test-cases/FEAT-USER-PROFILE-user-profile.md`

## 变更历史

- 2026-01-19 FEAT-USER-PROFILE 用户详情页方案补齐（影响：页面/API/数据模型/服务）
- 2026-01-30 FEAT-USER-PROFILE 头像 URL/UUID 统一与权限规则补充（影响：页面/API/服务）
- 2026-02-06 FEAT-USER-PROFILE 修复 admin 子页面头像展示并统一复用组件（影响：admin/generations、admin/users、admin/subscriptions、admin API）
- 2026-02-13 FEAT-USER-PROFILE 修复 admin/feedbacks 用户头像展示并复用统一组件（影响：admin/feedbacks）

## Admin 子页面头像展示修复（2026-02-06）

- 目标页面：`/admin/generations`、`/admin/users`、`/admin/subscriptions`、`/admin/feedbacks`。
- 对齐方式：复用统一组件 `src/components/admin/AdminUserAvatar.tsx`，统一 URL/UUID 解析、fallback 与尺寸可配置能力。
- 复用策略：
  - `admin/users` 原有本地 `AvatarCell` 改为调用统一头像组件。
  - `admin/generations` 卡片底部作者头像改为统一头像组件，保留原有点击复制用户 UUID 交互。
  - `admin/subscriptions` 表格用户列新增头像展示并复用统一组件。
  - `admin/feedbacks` 用户列头像改为统一头像组件，修复 UUID 头像在后台不显示问题。
- API 对齐：`GET /api/admin/subscriptions` 订阅列表补充 `user_avatar_url` 字段，前端直接消费。
