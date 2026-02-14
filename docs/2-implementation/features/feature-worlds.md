# 世界观系统（FEAT-WORLDS）

Related:
- PRD：`docs/1-specs/PRD.md`
- Feature：`docs/2-implementation/features/feature-oc-rebuild.md`
- API：`docs/2-implementation/api/world.md`
- 后端：`docs/2-implementation/backend/service-world.md`
- 前端：`docs/2-implementation/frontend/page-world-create.md`、`docs/2-implementation/frontend/page-world-detail.md`、`docs/2-implementation/frontend/component-world-selector.md`

## 背景与目标

- 世界观（world）作为“文件夹式组织工具”，用于角色分类与主题化展示，不限制艺术风格。
- 支持预置世界观与用户自定义世界观，满足平台冷启动与用户深度创作需求。
- **分类引导**：通过流派（Genre）与标签（Tags）辅助用户快速构建设定，提升内容的发现效率。
- 通过主题配置（配色/背景/装饰/字体）驱动详情页沉浸式展示与角色详情页的主题联动。
- 为世界观补齐社交属性：收藏、点赞、评论、分享，用于提升内容分发与用户参与度。

## 验收标准

- 至少 3 个预置世界观可用（Generic/Cyberpunk/Fantasy）。
- 新增 `/worlds/create` 创建页面，支持选择流派并根据流派联动展示推荐标签。
- 新增 `/worlds/[uuid]` 详情页，支持基础信息展示、图库与关联角色入口。
- 角色详情页可选择/切换世界观，主题色与背景联动生效（详见 `component-world-selector.md`）。
- 世界观支持 `allow_join` 参数控制加入权限：关闭后仅 owner 可将 OC 关联到该 world，其他用户在 OC 详情页设置 world 时不可见该 world。
- API 支持世界观列表、详情、创建、更新、删除，并具备可见性与权限控制。
- 社区列表仅展示 `visibility_level = public` 的世界观。
- 仅订阅用户可设置 `visibility_level`，非订阅用户创建世界观默认 `public` 且不可修改可见性。

...



## 数据模型

### oc_worlds
- 目的：世界观内容 + 主题化展示配置（`config` JSONB）+ preset 支持。
- 新增字段：
    - `visibility_level`: (public/private)，与 OC 角色可见性一致。
    - `allow_join`: boolean，默认 `true`。控制是否允许非 owner 将其 OC 关联到该 world。
    - `genre`: 字符串，记录世界流派（如 Fantasy, Cyberpunk）。
    - `tags`: JSONB 数组，记录细分视觉标签（如 Neon, Magic, Medieval）。
- 拟新增字段：`favorite_count`、`like_count`、`comment_count`、`share_count`（冗余计数，便于列表与详情展示）。
- DDL：`src/db/migrations/0002_0011_combined.sql`

### characters（关联字段）
- 字段：`world_uuid`（FK → `oc_worlds.uuid`）。
- 说明：与角色详情页世界观选择器联动，变更由角色接口写回。

### world_favorites
- 复用：使用 `user_interactions` 统一记录（`art_type = world`，`interaction_type = favorite`）。

### world_likes
- 复用：使用 `user_interactions` 统一记录（`art_type = world`，`interaction_type = like`）。

### comments
- 复用：使用通用 `comments` 表记录世界观评论（`art_type = world`，`art_id = world.uuid`）。
- 备注：`comments` 已支持二级评论、点赞计数与软删除，满足评论需求。

### world_shares
- 复用：使用 `user_interactions` 统一记录（`art_type = world`，`interaction_type = share`）。

## API 影响清单

- `docs/2-implementation/api/world.md`
- 核心接口：
  - `GET /api/worlds`
  - `GET /api/worlds/[id]`
  - `POST /api/worlds`
  - `PUT /api/worlds/[id]`
  - `DELETE /api/worlds/[id]`
- 社交接口（待补充到 API 文档）：
  - `POST /api/worlds/[id]/favorite`
  - `DELETE /api/worlds/[id]/favorite`
  - `POST /api/worlds/[id]/like`
  - `DELETE /api/worlds/[id]/like`
  - `GET /api/worlds/[id]/comments`
  - `POST /api/worlds/[id]/comments`
  - `DELETE /api/worlds/[id]/comments/[commentId]`
  - `POST /api/worlds/[id]/share`

## 前端影响清单

- 创建页：`docs/2-implementation/frontend/page-world-create.md`
- 世界观列表页：`docs/2-implementation/frontend/page-world-list.md`
- 详情页：`docs/2-implementation/frontend/page-world-detail.md`
- 详情页社交区块：`docs/2-implementation/frontend/component-world-social.md`
- 选择器组件：`docs/2-implementation/frontend/component-world-selector.md`
- 角色详情页联动：`docs/2-implementation/frontend/page-character-detail-redesign.md`

## 后端影响清单

- 世界观服务：`docs/2-implementation/backend/service-world.md`
- 社交服务：`docs/2-implementation/backend/service-world-social.md`
- 数据模型：`docs/1-specs/data-models.md`

## 前端实现补充（world 社媒互动）

### world 列表页（/world）

- world 卡片的社交互动按钮复用 oc 的互动按钮组件与交互逻辑（收藏/点赞/评论/分享）。
- 对应操作与数据流保持与 oc 一致：点击 → 调用 world 社交接口 → 返回计数 → 局部刷新计数。
- 仅当 `visibility_level = public` 且用户非 owner 时展示互动按钮。
- owner 模式（`/my-creations` 的 world 卡片）不展示互动按钮，仅展示统计数据（收藏/点赞/评论/分享计数）供 owner 查看。
- world 卡片 Badge 展示预置 Genre 的 **value**（展示文案）而非 key，使用预置配置映射后渲染。

### world 详情页（/worlds/[uuid]）

- 详情页社交区块按钮与 oc 详情页一致（复用组件、样式、交互与空态）。
- 评论列表与输入区保持 oc 相同的加载/错误/空态体验与权限限制（未登录提示 AUTH_REQUIRED）。
- 详情页展示预置 Genre 时必须使用 **value**（展示文案）而非 key，与列表页一致。

## 前端实现补充（allow_join 与选择器规则）

### 角色详情页世界观选择器

- 默认仅展示 `visibility_level = public` 的世界观。
- 若 world 为当前用户创建（owner），则无视 `allow_join` 仍可选择与绑定。
- 若 world 非 owner 且 `allow_join = false`，在选择器中隐藏且不可绑定（前端不展示、后端列表过滤兜底）。

## 待确认

- 分享记录是否需要扩展字段（如 `channel`、`ref`）与落地位置（`user_interactions.metadata`）。
- 评论审核策略与敏感内容处理方案（关键词过滤/人工审核/自动隐藏）。
- 计数一致性策略（强一致 vs 允许最终一致）以及缓存失效规则。
- 社交行为风控与频率限制（避免刷赞/刷评论）。

## 后端服务实现（补齐）

### 入口与文件

- Service：`src/services/world.ts`
- Model：`src/models/oc-world.ts`
- API：
  - `src/app/api/worlds/route.ts`
  - `src/app/api/worlds/[id]/route.ts`

### 已实现能力

- 列表：`getworlds` 支持分页、搜索、可见性、创建者过滤与预置世界观开关，使用 `serverMemoryCache` 做 1 小时缓存。
- 详情：`getworldByIdentifier` 支持 id/uuid/数字字符串查询，并返回 `character_count`。
- 创建：`createworld` 校验输入（`worldInsertSchema`），生成或校验 slug，验证 URL 字段，写入 `oc_worlds`，并清理列表缓存。
- 更新：`updateworld` 校验所有权，支持 slug 变更校验，按字段更新并清理缓存。
- 删除：`deleteworld` 校验所有权，禁止删除被角色引用的世界观。

### 权限与可见性约束

- `visibility_level = private` 仅创建者可见与可操作。
- `allow_join = false` 时，仅 owner 可在角色详情页将 OC 关联到该 world；非 owner 不在选择器中可见，API 需在列表侧过滤。
- 删除前检查角色引用数量（`countCharactersByworldId`）。
- 创建受会员 worlds 数量限制，超限返回 `LIMIT_EXCEEDED`。
- 仅订阅用户允许设置或修改 `visibility_level`。
- 社区侧拉取仅展示 `visibility_level = public` 的世界观。

### 关联类型与校验

- Zod 校验：`src/types/world.ts`
- 返回类型：`OCworld`、`OCworldWithCount`

## 测试要点

- 列表筛选/搜索、创建、更新、删除、权限校验。
- 角色详情页世界观切换的主题联动与写回成功率。
- `allow_join` 关闭后：非 owner 在 OC 详情页选择器不可见且不可关联；owner 仍可关联。
- 收藏/点赞幂等性与取消逻辑（重复操作不增长计数）。
- 评论新增/删除、敏感词或违规内容处理（状态变更）。
- 分享追踪字段记录与详情页计数一致性。
- 非公开世界观的社交入口不可见，且 API 返回 `FORBIDDEN`。

## 测试用例索引

- `tests/test-cases/FEAT-WORLDS-social.md`

## 变更历史

- 2026-01-19 FEAT-WORLDS 世界观系统方案收敛（影响：页面/API/服务/数据模型）
- 2026-01-20 FEAT-WORLDS 修复世界观选择器完整展示其他世界观（影响：前端/文档）
- 2026-01-21 FEAT-subscription 增加会员 worlds 数量限制（影响：服务/API/文档）
- 2026-01-22 FEAT-WORLDS 增加世界观可见性等级与订阅权限控制（影响：文档/服务/API/数据模型）
- 2026-01-23 FEAT-WORLDS 扩展世界观社交属性方案（影响：文档/API/数据模型/前后端）
- 2026-01-25 FEAT-IMAGE-ASSET-UNIFY 补充封面图解析规则引用（影响：前端文档）
- 2026-01-28 FEAT-WORLDS 增加 allow_join 加入权限与选择器过滤规则（影响：文档/前端/服务）
- 2026-01-29 FEAT-WORLDS 世界观背景图支持 UUID/URL，上传路径修正（影响：文档/前端/API/类型校验）
- 2026-01-30 FEAT-WORLDS OG 卡片无 world 不展示并修复 world 名获取（影响：前端）
- 2026-01-31 FEAT-WORLDS 修复 world 列表 Badge 与详情页 genre 展示使用 value（影响：前端）
