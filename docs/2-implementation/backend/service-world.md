# Backend Service: world 世界观服务 (service-world)

**Related**: FEAT-WORLDS | [feature-worlds.md](../features/feature-worlds.md)

## 概览

world 服务负责世界观的 CRUD、列表查询与基础权限控制，使用内存缓存做读取优化。预置世界观支持幂等初始化与独立缓存。

## 服务架构

**文件位置**: `src/services/world.ts`

### 核心方法（现有实现）

#### 1. getworlds(options)
获取世界观列表（分页、筛选、搜索）

- 缓存键：`worlds:list:{page}:{limit}:{visibility_level}:{search}:{creatorUuid}:{viewerUuid}:{includePreset}`
- 调用前置：`ensurePresetWorldsInitialized`（幂等）
- 列表数据来自 `src/models/oc-world.ts:listworlds`
- 预置世界观与私有世界观由查询条件控制（viewerUuid 参与可见性判断）
- **加入权限**：非 owner 且 `allow_join = false` 的 world 在列表中过滤（用于角色详情页选择器）

#### 2. getworldByIdentifier(identifier)
获取单个世界观（支持 id/uuid/数字字符串）

- 缓存键：`world:{identifier}`
- 调用前置：`ensurePresetWorldsInitialized`（幂等）
- 读取 `findworldById/findworldByUuid`，并统计 `character_count`

#### 3. createworld(data, userUuid)
创建自定义世界观

- `worldInsertSchema` 校验 + slug 生成 + URL 校验
- **新增字段**：支持 `genre` (流派 ID) 和 `tags` (标签数组) 的校验与写入。
- **新增字段**：支持 `allow_join` 的写入，默认 `true`。
- 会员 worlds 数量限制：调用 `getUserWorldLimit` 与 `countworldsByCreator`，超限抛出 `LIMIT_EXCEEDED`
- 可见性权限：仅订阅用户可设置 `visibility_level = private`，否则返回订阅限制错误
- slug 在创建者范围内唯一（`findworldBySlugAndCreator`）
- 写入 `oc_worlds` 后清理 `worlds:list:` 缓存

#### 4. updateworld(identifier, updates, userUuid)
更新世界观

- 预置不可修改，创建者校验
- **新增字段**：支持 `genre` 和 `tags` 的按需更新。
- **新增字段**：支持 `allow_join` 的按需更新。
- 支持 slug 更新（与现有 slug 冲突则失败）
- 更新后清理 `world:{identifier}` 与 `worlds:list:` 缓存

#### 5. deleteworld(identifier, userUuid)
删除世界观

- 预置不可删除，创建者校验
- 被角色引用时拒绝删除（`countCharactersByworldId`）
- 删除后清理 `world:{identifier}` 与 `worlds:list:` 缓存

#### 6. ensurePresetWorldsInitialized()
预置世界观幂等初始化

- 配置来源：`src/configs/worlds/preset-worlds.json`
- 缓存键：`worlds:preset:init`
- 仅在缺失时写入 `oc_worlds`（`is_preset = true`）

#### 7. getPresetWorlds()
获取预置世界观列表（独立缓存）

- 缓存键：`worlds:preset`

## 缓存策略（现有实现）

- 缓存实现：`src/lib/server-memory-cache`
- `world:{identifier}`：详情缓存 1 小时（内存）
- `worlds:list:` 前缀：通用列表缓存 1 小时（内存）
- `worlds:user:{creator_uuid}:` 前缀：用户维度列表缓存 1 小时（内存）
- `worlds:preset`：预置世界观缓存 5 小时（内存）
- `worlds:preset:init`：预置初始化标记缓存 1 小时（内存）

## 权限管理（现有实现）

- `is_preset = true` 不可修改/删除
- 创建者校验（`creator_uuid === userUuid`）
- 列表可见性由 `viewerUuid` 与 `visibility_level` 组合控制

## 数据验证（现有实现）

- Zod Schema：`src/types/world.ts`
- 字段覆盖：slug/name/description/visibility_level/cover_url/config + 复杂结构（factions/history_timeline/theme_colors 等）

## 错误处理（现有实现）

- 通过 `Error` 的 `code` 字段区分：`NOT_FOUND` / `CONFLICT` / `FORBIDDEN` / `INVALID_URL` / `INVALID_NAME` / `LIMIT_EXCEEDED` / `SUBSCRIPTION_REQUIRED`
- API 层在 `src/app/api/worlds/*` 将 `code` 映射到 HTTP 状态码

## 初始化：预置世界观

- 使用 `ensurePresetWorldsInitialized` 在服务侧幂等补齐缺失预置世界观。
- 预置数据来源：`src/configs/worlds/preset-worlds.json`。

## 关联模型

- **数据模型**：`src/models/oc-world.ts`
- **Character 表**：`characters.world_uuid` (外键，可为 NULL)
- **数据库表**：`oc_worlds`

## 性能考虑

1. **常见 N+1 问题**：
   - 批量获取角色时，使用 JOIN 预加载 world 配置
   - 避免在循环中调用 `getworldById()`

2. **大量自定义世界观场景**：
   - 分页加载（limit 20）
   - 使用表达式索引加快搜索：
     ```sql
     CREATE INDEX idx_worlds_name_search ON oc_worlds (
       LOWER(name)
     ) WHERE is_preset = false;
     ```

## 测试要点

- [x] 预置世界观列表加载
- [x] 用户自定义世界观创建/更新/删除
- [x] 世界观名称唯一性校验
- [x] 权限验证（仅创建者可编辑）
- [x] 缓存效果验证（读取性能）
- [x] 世界观被引用时无法删除
- [x] URL 字段可访问性验证

## 相关文件

- API：[world.md](../api/world.md)
- 数据模型：[data-models.md](../../1-specs/data-models.md)
- 前端组件：[component-world-selector.md](../frontend/component-world-selector.md)

## 待补齐（实现缺口）

- 暂无

## 变更历史

- 2026-01-08 FEAT-OC-REBUILD 初始版本
  - 实现 world CRUD 完整服务
  - 预置 3 个默认世界观（Generic/Cyberpunk/Fantasy）
  - 缓存策略与权限验证机制
  - 错误处理与数据验证
- 2026-01-19 FEAT-WORLDS 补齐预置初始化、缓存策略与唯一性范围（影响：服务/模型/迁移）
- 2026-01-21 FEAT-subscription 增加会员 worlds 数量限制（影响：服务/模型/API）
- 2026-01-22 FEAT-WORLDS 增加世界观可见性等级与订阅权限控制（影响：服务/API）
- 2026-01-28 FEAT-WORLDS 增加 allow_join 加入权限过滤与更新支持（影响：服务/API/模型）
