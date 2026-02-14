# 用户详情页设计

**Related**: FEAT-USER-PROFILE | [feature-user-profile.md](../features/feature-user-profile.md)

## 页面路径

- 建议路径：`/user/[uuid]`
- 备用路径（短链）：`/u/[uuid]`（如需要再评审）
- **权限要求**：公开页，未登录可访问；本人登录后可编辑资料

## 页面目标

- 展示创作者头像、姓名、简介、公开角色、公开世界、公开 artworks。
- 提供本人编辑资料与背景图设置能力。
- 从社区内容与 Header Profile 入口统一导流。

## 数据依赖

- `GET /api/users/[id]/profile`：用户公开资料
- `GET /api/users/[id]/public-characters`：公开角色列表
- `GET /api/users/[id]/public-worlds`：公开世界列表
- `GET /api/users/[id]/public-artworks`：公开 artworks 列表
- `PUT /api/users/[id]/profile`：更新本人资料（按钮触发）

## 页面结构（建议）

1. **Hero 区域**：背景图 + 头像 + 用户名 + 简介
2. **操作区**（右上角）：`Set Background`、`Update Profile`
3. **内容区块**：Public Characters / Public Worlds / Public Artworks（tabs 或分区）

## 交互与状态

- **加载态**：Hero 与列表使用 skeleton；按钮 disabled。
- **空态**（英文）：
  - `No public characters yet`
  - `No public worlds yet`
  - `No public artworks yet`
- **错误态**（英文）：
  - `Profile not found`
  - `Failed to load profile`
  - `Unauthorized`

## 编辑 Profile（本人）

- 表单字段：`display_name`（默认取 Google 用户名）、`avatar_url`（URL 或 `image_uuid`）、`gender`、`bio`
- 表单校验：
  - display_name：1-40 字符
  - bio：0-200 字符
  - gender：`male | female | other`
- 提交成功后刷新页面数据；失败时回滚并提示英文错误。
- 头像上传：`type=user_upload`，`sub_type=user_avatar`（支持 UUID 或 URL）
- 头像引用限制：仅允许本人作品的 `image_uuid`（即使私有也可展示）

## 头像与背景图解析规则

- **字段**：`avatar_url`、`background_url`
- **字段约定**：
  - `http/https` 开头：视为用户上传 URL，直接使用
  - 其他情况：视为 `image_uuid`
- **说明**：
  - 组件支持 UUID 与 URL 双模式，用户资料场景允许两者
  - 尺寸由页面自行控制（不做全局固定尺寸）
  - 头像渲染统一使用复用组件（避免各页面单独处理）

## 背景图设置（本人）

- 复用上传组件：`src/components/anime-generator/ReferenceImageUpload.tsx`
- 上传类型：`type=user_upload`，`sub_type=user_background`（支持 UUID 或 URL）
- 上传成功写入 `background_url`，Hero 背景即时更新
- 失败提示英文，例如：`Failed to upload background`

## 权限与路由

- 非本人不显示编辑按钮，不允许调用更新接口。
- Header Profile 入口：`src/components/blocks/app-header/index.tsx`
- 社区头像入口：`src/components/community/*`（需统一跳转到用户详情页）
 - Created by 场景（world/OC 详情）：复用同一头像组件并使用页面级 i18n 文案

## 国际化

- 页面文案使用 `src/i18n/pages/user-profile/en.json`
- 禁止使用全局 `src/i18n/messages`

## 涉及文件（规划）

- `src/app/[locale]/(default)/user/[uuid]/page.tsx`
- `src/components/user/profile/*`（如拆分模块）
- `src/i18n/pages/user-profile/en.json`
- `src/components/blocks/app-header/index.tsx`
- `src/components/community/*`

## 变更历史

- 2026-01-19 FEAT-USER-PROFILE 新增用户详情页前端设计（影响：页面/入口/交互）
- 2026-01-25 FEAT-IMAGE-ASSET-UNIFY 统一头像与背景图解析规则（支持 uuid 与 URL）
- 2026-01-30 FEAT-USER-PROFILE 头像 URL/UUID 解析与归属规则补充（影响：头像组件/表单/入口）
