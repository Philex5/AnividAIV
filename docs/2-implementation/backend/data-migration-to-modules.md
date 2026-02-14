# Backend: Data Migration to Modules (数据迁移至模块化)

**Related**: FEAT-OC-REBUILD | [feature-oc-rebuild.md](../features/feature-oc-rebuild.md)

## 目标

将 `characters` 表现有扁平化字段迁移到 `modules`（JSONB）中，并补齐 `world_uuid/tags` 的默认值，保证：
- 迁移前可完整备份
- 迁移过程可分批、可重复执行
- 迁移后可做最小一致性校验
- 必要时可快速回滚（仅清空新字段，旧字段仍保留）

## 前置条件

- `DATABASE_URL` 已配置且可连接到目标数据库（dev/staging/prod）
- 已具备 `pg_dump`、`psql`（用于 `pnpm db:backup`/验证）
- schema 迁移已包含 OC Rebuild 新字段（见下）

## Phase 1: Schema 准备

**迁移文件**：`src/db/migrations/0002_0011_combined.sql`

该迁移负责：
- 创建 `oc_worlds`
- 为 `characters` 增量新增 `modules/world_uuid/tags/background_url`
- 添加必要索引与 preset worlds（Generic/Cyberpunk/Fantasy）

执行：

```bash
pnpm db:migrate
```

## Phase 2: 数据迁移（扁平字段 → modules）

本项目提供两种执行方式：
- **方式A（推荐，Dashboard SQL）**：直接在 Supabase Dashboard 执行 SQL（无需本地直连数据库）
- **方式B（本地脚本）**：在本地可直连数据库的环境执行 `tsx` 脚本

### 方式A：Supabase Dashboard SQL（推荐）

**SQL 文件**：`docs/2-implementation/backend/sql/oc-rebuild-characters-data-migration.sql`

覆盖内容：
- `characters.tags` 标准化为 JSON 数组
- `characters.world_uuid` 兜底赋值（基于 `theme_id` 的 best-effort 映射：generic/cyberpunk/fantasy → oc_worlds.uuid）
- `characters.modules` 从旧扁平字段构建（仅更新 `modules IS NULL` 的记录，可重复执行）
- 补齐部分索引（`IF NOT EXISTS`，可安全重复执行）

执行步骤：
1. Supabase Dashboard → SQL Editor → New query
2. 粘贴 `docs/2-implementation/backend/sql/oc-rebuild-characters-data-migration.sql` 全文并执行
3. 执行结束后，按 SQL 文件末尾的 Quick checks 单独跑几条校验查询

### 方式B：本地脚本（可选）

**脚本**：`scripts/migrate-characters-to-modules.ts`

处理策略：
- 仅处理 `characters.modules IS NULL` 的记录（可重复执行）
- modules 结构由 `src/types/oc.ts` 的 `CharacterModulesSchema` 严格校验
- `world_uuid` 默认映射：优先复用现有 `world_uuid`，否则从 `theme_id` 兜底到 `generic/cyberpunk/fantasy` 对应的 `oc_worlds.uuid`
- 输出 JSON 汇总（包含失败 UUID 列表）；若存在失败，退出码为非0

执行（示例）：

```bash
# 先备份，再迁移
pnpm db:backup
pnpm tsx scripts/migrate-characters-to-modules.ts --batch-size=500
```

参数：
- `--batch-size=500`：每批处理数量
- `--limit=1000`：最多处理多少条（用于演练）
- `--dry-run=true`：只统计不写库

## Phase 3: 验证

**脚本**：`scripts/verify-migration.ts`

当前只做最小必需检查：
- `modules IS NULL` 的数量
- `world_uuid` 是否存在非法外键（指向不存在的 `oc_worlds.uuid`）

执行：

```bash
pnpm tsx scripts/verify-migration.ts
```

## 回滚（紧急止损）

**脚本**：`scripts/rollback-migration.ts`

说明：
- 回滚策略为“清空新字段”，不尝试覆盖旧字段
- 适用于发现新字段导致线上读写异常时的快速止损

执行：

```bash
pnpm tsx scripts/rollback-migration.ts
```

参数：
- `--limit=1000`：最多回滚多少条
- `--dry-run=true`：只统计不写库

## Phase 4: 旧字段清理（可选，破坏性操作）

如果你确认：
- 新版读写已完全切换到 `modules/world_uuid/tags`
- 不再依赖 `theme_id/theme_specific_data` 以及扁平化字段
- 已完成备份并接受不可逆变更

则可以执行 `src/db/migrations/0003_feat_oc_rebuild_remaining.sql` 里的 **Destructive cleanup** 段落：
1. 先执行：`SELECT set_config('app.oc_rebuild_drop_legacy','true', false);`
2. 再执行该段中的 `DROP INDEX`/`ALTER TABLE ... DROP COLUMN`（按需取消注释）

## 相关文件

- Schema 迁移：`src/db/migrations/0002_0011_combined.sql`
- 数据迁移：`scripts/migrate-characters-to-modules.ts`
- 验证脚本：`scripts/verify-migration.ts`
- 回滚脚本：`scripts/rollback-migration.ts`
 - Dashboard SQL：`docs/2-implementation/backend/sql/oc-rebuild-characters-data-migration.sql`
 - Remaining bundle：`src/db/migrations/0003_feat_oc_rebuild_remaining.sql`

## 变更历史

- 2026-01-09 FEAT-OC-REBUILD 对齐仓库实际脚本与迁移文件（影响：迁移文档）
