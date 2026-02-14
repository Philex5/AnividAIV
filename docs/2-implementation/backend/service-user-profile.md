# Backend Service: user profile 用户详情服务 (service-user-profile)

**Related**: FEAT-USER-PROFILE | [feature-user-profile.md](../features/feature-user-profile.md)

## 概览

用户详情服务负责：
- 用户公开资料读取（头像、显示名、简介、背景图等）
- 公共资源聚合（公开角色/世界/artworks）
- 本人资料更新（用户名、头像、性别、简介、背景图）
- 用户头像引用校验（URL/UUID）与私有作品展示策略

## 服务架构（规划）

**建议文件位置**: `src/services/user-profile.ts`

### 核心方法（拟新增）

#### 1. getPublicProfile(identifier, viewerUuid?)

- 输入：用户 `uuid` 或 slug（若后续支持）
- 输出：公开 profile 字段 + 是否本人 + 统计摘要
- 处理：
  - 读取 `users` 基础字段
  - 汇总公开角色/世界/artworks 数量
  - 非本人时仅返回公开字段

#### 2. updateProfile(userUuid, payload)

- 校验：仅本人可更新
- 字段：`display_name`、`avatar_url`（URL 或 `image_uuid`）、`gender`、`bio`、`background_url`
- 头像规则：
  - 当 `avatar_url` 为 `image_uuid` 时，必须校验 UUID 归属当前用户
  - 允许引用私有作品作为头像
- 返回：更新后的 profile

#### 3. listPublicCharacters(userUuid, pagination)

- 读取公开角色（复用现有 `oc-maker` 的公开查询逻辑）

#### 4. listPublicWorlds(userUuid, pagination)

- 读取公开世界观（复用 `worlds` 列表接口 + creator 过滤）

#### 5. listPublicArtworks(userUuid, pagination)

- 读取公开 artworks（复用 community 作品列表）

## API 关联

- `GET /api/users/[id]/profile`
- `PUT /api/users/[id]/profile`
- `GET /api/users/[id]/public-characters`
- `GET /api/users/[id]/public-worlds`
- `GET /api/users/[id]/public-artworks`

## 数据模型依赖

- `users` 表新增字段：`gender`、`bio`、`background_url`
- 显示名规则：`display_name` 默认取 Google 用户名；用户修改后以最新值为准
- `avatar_url` 支持 URL/UUID（方案 A），存储为引用而非解析后的最终 URL

## 权限与校验

- 读取：公开信息无需登录；隐藏字段不返回
- 更新：必须通过 `auth()` 校验本人
- 错误码（英文）：`Unauthorized`、`Profile not found`、`Invalid payload`
- 头像引用非法：`Invalid avatar reference`

## 性能与缓存（建议）

- 公开 profile 可使用短时缓存（5-10 分钟）
- 更新后清理缓存

## 关联模型/服务

- Model：`src/models/user.ts`
- Community：`src/services/community.ts`（artworks 公开列表）
- OC Maker：`src/services/oc-maker.ts`（公开角色列表）
- World：`src/services/world.ts`
- Image resolve：`src/lib/image-resolve.ts`（客户端解析逻辑）
- Resolve API：`src/app/api/generation/image-resolve/[uuid]/route.ts`（UUID 解析与访问控制）

## 变更历史

- 2026-01-19 FEAT-USER-PROFILE 新增用户详情服务方案（影响：服务/API/数据模型）
- 2026-01-30 FEAT-USER-PROFILE 头像 URL/UUID 校验与私有作品展示规则（影响：服务/API）
