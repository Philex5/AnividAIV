# AnividAI 数据库维护指南

## 文档信息

- **文档版本**: v1.0
- **创建日期**: 2025-11-19
- **适用范围**: 开发、测试、生产环境
- **关联文档**:
  - `docs/1-specs/data-models.md` - 数据模型文档
  - `src/db/README.md` - 数据库部署指南
  - `docs/2-implementation/api/` - API 契约文档

## 目录

1. [数据库概览](#1-数据库概览)
2. [环境配置](#2-环境配置)
3. [Schema 修改流程](#3-schema-修改流程)
4. [迁移操作指南](#4-迁移操作指南)
5. [备份方案](#5-备份方案)
6. [故障回退方案](#6-故障回退方案)
7. [风险分级与最佳实践](#7-风险分级与最佳实践)
8. [监控与告警](#8-监控与告警)
9. [应急响应流程](#9-应急响应流程)
10. [常见问题排查](#10-常见问题排查)

---

## 1. 数据库概览

### 1.1 技术栈

- **数据库**: PostgreSQL 15+ (Supabase 托管)
- **ORM**: Drizzle ORM v0.44.2
- **迁移工具**: Drizzle Kit v0.31.1
- **连接池**: postgres-js v3.4.7
- **连接数**: 10 (可配置)

### 1.2 数据库表结构总览

**核心业务表** (4个)
- `users` - 用户管理
- `credits` - 积分系统
- `orders` - 支付订单
- `apikeys` - API 密钥管理

**AI 生成表** (3个)
- `generations` - AI 生成任务主表
- `generation_images` - 生成图片记录
- `generation_videos` - 生成视频记录

**OC 角色系统** (5个)
- `characters` - 原创角色创建
- `character_generations` - 角色生成历史
- `character_chats` - 角色聊天记录
- `chat_sessions` - 聊天会话管理
- `character_remixs` - 角色衍生关系

**社交互动表** (1个)
- `user_interactions` - 用户互动

**营销增长表** (1个)
- `affiliates` - 推荐系统

**内容管理表** (3个)
- `categories` - 内容分类
- `posts` - 博客/文章
- `feedbacks` - 用户反馈

**邮件系统表** (5个)
- `email_templates` - 邮件模板
- `email_subscriptions` - 邮件订阅
- `email_logs` - 邮件日志
- `email_campaigns` - 邮件活动
- `email_campaign_recipients` - 活动接收者

**运营表** (1个)
- `operation_costs` - 运营成本跟踪

**总计**: 23 个数据表

### 1.3 目录结构

```
src/db/
├── schema.ts          # 数据库 Schema 定义（单一事实源）
├── config.ts          # Drizzle 配置文件
├── index.ts           # 应用内数据库连接
├── standalone.ts      # 独立脚本连接
├── migrations/        # 迁移文件目录
│   ├── 0000_little_spyke.sql  # 当前初始迁移
│   ├── meta/          # 迁移元数据
│   └── archive/       # 历史迁移归档
│       ├── README.md
│       └── old-migrations/
└── README.md          # 数据库部署指南
```

---

## 2. 环境配置

### 2.1 环境变量

| 环境 | 变量名 | 示例值 | 说明 |
|------|--------|--------|------|
| 开发 | `DATABASE_URL` | `postgresql://dev_user:***@dev-host:5432/dev_db` | 开发环境数据库 |
| 测试 | `DATABASE_URL` | `postgresql://test_user:***@test-host:6543/test_db` | 测试环境数据库 |
| 生产 | `DATABASE_URL` | `postgresql://prod_user:***@prod-host:6543/prod_db` | 生产环境数据库 |

### 2.2 连接池配置

```typescript
// src/db/index.ts
import { postgres } from 'postgres';

const max = 10;           // 最大连接数
const idle_timeout = 30;  // 空闲超时(秒)
const connect_timeout = 10;  // 连接超时(秒)

const db = postgres(databaseUrl, {
  prepare: false,
  max,
  idle_timeout,
  connect_timeout,
});

export { db };
```

### 2.3 环境检查

```bash
# 检查环境变量
echo $DATABASE_URL

# 测试连接
tsx -e "import {getDb} from './src/db'; console.log('Connection OK');"
```

---

## 3. Schema 修改流程

### 3.1 修改前准备

**✅ 检查清单**
- [ ] 已在开发环境备份当前数据
- [ ] 已审查相关 API 契约文档
- [ ] 已更新数据模型文档 `docs/1-specs/data-models.md`
- [ ] 已创建 Feature 文档（如需）
- [ ] 已评估变更影响范围

### 3.2 修改 Schema

**步骤 1: 编辑 Schema 文件**

编辑 `src/db/schema.ts`，遵循以下规范：

```typescript
// ✅ 正确的做法
export const tableName = pgTable('table_name', {
  id: varchar('id', { length: 255 }).primaryKey(),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  // 新字段
  new_field: varchar('new_field', { length: 255 })
    .$type<'value1' | 'value2'>()
    .default('default_value'),
  // 使用 JSON 存储灵活数据
  metadata: json('metadata').$type<{
    key1: string;
    key2: number;
  }>(),
  // 添加索引优化查询
}, (table) => ({
  index1: index('idx_table_field1').on(table.field1, table.field2),
}));

// ❌ 错误的做法
// 1. 在迁移文件中直接修改
// 2. 跳过迁移生成直接修改数据库
// 3. 不添加索引导致查询性能问题
```

**步骤 2: 生成迁移文件**

```bash
pnpm db:generate
```

**重要**: 必须审查生成的 `.sql` 文件，确认：
- [ ] 字段定义正确
- [ ] 数据类型匹配
- [ ] 默认值设置合理
- [ ] 索引创建正确
- [ ] 约束条件合理

**步骤 3: 迁移文件命名**

```bash
# 格式: 序号_描述.sql
0000_initial_schema.sql           # 初始建表
0001_add_new_field.sql            # 添加字段
0002_create_index.sql             # 创建索引
0003_modify_table.sql             # 修改表
```

### 3.3 本地验证

```bash
# 应用迁移到本地数据库
pnpm db:migrate

# 启动 Drizzle Studio 检查结构
pnpm db:studio

# 验证迁移完整性
pnpm db:verify

# 检查特定字段
tsx scripts/check-db-columns.ts
```

### 3.4 更新文档

```markdown
更新文件:
- docs/1-specs/data-models.md
- docs/2-implementation/api/[相关API].md
- docs/2-implementation/feature-[feature-name].md
```

---

## 4. 迁移操作指南

### 4.1 开发环境迁移

```bash
# 1. 备份当前数据
pnpm db:backup

# 2. 应用迁移
pnpm db:migrate

# 3. 验证数据库结构
pnpm db:verify
pnpm db:studio

# 4. 运行测试
pnpm test

# 5. 检查应用功能
pnpm dev
```

### 4.2 测试环境迁移

```bash
# 1. 配置测试环境
export DATABASE_URL="postgresql://test_user:***@test-host:6543/test_db"

# 2. 备份测试数据
pnpm db:backup

# 3. 应用迁移
pnpm db:migrate

# 4. 验证结构
pnpm db:verify

# 5. 运行集成测试
pnpm test:integration

# 6. 手动测试核心功能
```

### 4.3 生产环境迁移

```bash
# 1. 设置维护窗口期（通知用户）
# 2. 配置生产环境
export DATABASE_URL="postgresql://prod_user:***@prod-host:6543/prod_db"

# 3. 完整备份生产数据
pnpm db:backup
# 等待备份完成并验证

# 4. 执行迁移
pnpm db:migrate
# 如果失败，立即回退

# 5. 验证数据库
pnpm db:verify

# 6. 启动应用服务
systemctl start anivid-ai

# 7. 检查应用状态
curl -f http://localhost:3000/health

# 8. 逐步开放流量
```

### 4.4 迁移脚本命令速查

| 命令 | 描述 | 用途 |
|------|------|------|
| `pnpm db:generate` | 生成迁移文件 | Schema 变更后 |
| `pnpm db:migrate` | 应用迁移 | 部署到数据库 |
| `pnpm db:studio` | 启动 Drizzle Studio | 可视化检查结构 |
| `pnpm db:push` | 推送 Schema | 快速同步（开发环境） |
| `pnpm db:backup` | 备份数据库 | 变更前必须 |
| `pnpm db:rebuild` | 重建数据库 | 紧急恢复 |
| `pnpm db:verify` | 验证数据库结构 | 迁移后检查 |

---

## 5. 备份方案

### 5.1 自动备份（生产环境 - 推荐）

**Supabase 自动备份**
- 每日自动备份，保留 30 天
- 支持 Point-in-Time Recovery (PITR)
- 可通过仪表板或 API 管理

```bash
# 查看备份列表
supabase db-backups list

# 创建按需备份
supabase db-backups create

# 下载备份
supabase db-backups download <backup-id>
```

**配置自动备份**
```bash
# 启用 PITR（可选）
# 在 Supabase 仪表板中配置
# Database → Settings → Backup → Point-in-time recovery
```

### 5.2 项目内置备份脚本

**使用 pnpm 命令**
```bash
pnpm db:backup
```

**备份文件位置**
```
backups/
├── anividai_backup_20251119_143022.sql  # 完整备份
├── anividai_backup_20251119_143022.sql.gz  # 压缩备份（如果配置）
└── latest-backup.sql  # 最新备份的软链接（可选）
```

**脚本工作原理**
```bash
# 1. 从 DATABASE_URL 提取连接信息
# 2. 创建备份目录
# 3. 使用 pg_dump 执行备份
# 4. 验证备份完整性
# 5. 显示备份结果
```

### 5.3 手动备份命令

**完整备份**
```bash
pg_dump "$DATABASE_URL" > backups/manual-backup-$(date +%Y%m%d-%H%M%S).sql
```

**仅数据结构**
```bash
pg_dump "$DATABASE_URL" --schema-only > schema-backup.sql
```

**仅数据**
```bash
pg_dump "$DATABASE_URL" --data-only > data-backup.sql
```

**压缩备份**
```bash
pg_dump "$DATABASE_URL" | gzip > backup.sql.gz
```

### 5.4 备份策略

| 环境 | 频率 | 保留时间 | 触发条件 |
|------|------|----------|----------|
| 开发环境 | 按需 | 7 天 | 重大变更前 |
| 测试环境 | 每次迁移前 | 14 天 | 部署前 |
| 生产环境 | 每日自动 + 手动 | 30 天 | 每日 + 重大变更前 |

### 5.5 备份验证

```bash
# 验证备份文件存在
ls -lh backups/

# 验证备份文件大小（不应为 0）
du -sh backups/*.sql

# 验证备份文件完整性
head -20 backups/anividai_backup_*.sql

# 测试备份恢复（测试环境）
psql "$TEST_DATABASE_URL" < backups/latest-backup.sql
```

### 5.6 备份文件命名规范

```bash
# 格式: 项目_环境_时间戳.sql
anividai_development_20251119_143022.sql
anividai_test_20251119_143022.sql
anividai_production_20251119_143022.sql

# 软链接（推荐）
latest-backup.sql -> anividai_production_20251119_143022.sql
```

---

## 6. 故障回退方案

### 6.1 回退场景分类

| 场景 | 严重程度 | 影响范围 | 回退时间 |
|------|----------|----------|----------|
| 迁移失败 | 高 | 部分/全部功能 | 5-10 分钟 |
| 数据损坏 | 极高 | 全部功能 | 10-30 分钟 |
| 查询性能问题 | 中 | 部分功能 | 30-60 分钟 |
| 新功能缺陷 | 中 | 相关功能 | 5-15 分钟 |

### 6.2 回退方案 A：迁移失败（数据未修改）

**症状**：迁移脚本执行中断，数据库状态不变

**处理步骤**：
```bash
# 1. 检查迁移状态
psql "$DATABASE_URL" -c "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;"

# 2. 查看错误日志
tail -100 logs/migration.log

# 3. 重新执行迁移（如果中断）
pnpm db:migrate

# 4. 验证数据库完整性
pnpm db:verify

# 5. 重启应用服务
systemctl restart anivid-ai
```

### 6.3 回退方案 B：迁移完成但需要回退

**症状**：迁移已执行，但发现问题需要回退

**注意**：Drizzle 不直接支持 down 迁移，需要手动处理

**处理步骤**：
```bash
# 1. 确认问题严重程度
# 2. 如果严重，立即备份当前状态
pnpm db:backup

# 3. 执行回退（方案选择）
# 方案1: 从备份恢复
psql "$DATABASE_URL" < backups/latest-backup.sql

# 方案2: 手动回滚 SQL
# 找到目标版本的迁移文件
cat migrations/0000_initial_schema.sql > rollback.sql
# 编辑 rollback.sql，将 CREATE 改为 DROP，ADD 改为 DROP COLUMN
psql "$DATABASE_URL" < rollback.sql

# 方案3: 删除迁移记录
psql "$DATABASE_URL" -c "DELETE FROM __drizzle_migrations WHERE version > '目标版本';"

# 4. 验证回退结果
pnpm db:verify
pnpm db:studio

# 5. 重启应用
systemctl restart anivid-ai
```

### 6.4 回退方案 C：数据损坏

**症状**：数据库数据损坏、丢失或污染

**紧急处理步骤**：
```bash
# 1. 立即停止应用服务
systemctl stop anivid-ai

# 2. 通知相关人员（群发告警）
# 3. 评估损坏范围

# 4. 从最新备份恢复
psql "$DATABASE_URL" < backups/anividai_backup_YYYYMMDD_HHMMSS.sql

# 5. 验证数据完整性
pnpm db:verify
tsx scripts/check-db-columns.ts

# 6. 启动应用服务
systemctl start anivid-ai

# 7. 逐步恢复流量
```

### 6.5 回退方案 D：部分数据损坏

**症状**：特定表或部分数据损坏

**处理步骤**：
```bash
# 1. 识别损坏的表
# 2. 从备份恢复特定表
pg_restore --data-only --table=users backups/full-backup.sql

# 3. 或者删除损坏记录重新同步
psql "$DATABASE_URL" -c "DELETE FROM corrupted_table WHERE condition;"

# 4. 验证数据一致性
```

### 6.6 回退决策矩阵

| 条件 | 操作 | 等待时间 | 回退方案 |
|------|------|----------|----------|
| 迁移执行中失败 | 立即停止 | 0 分钟 | 方案 A |
| 迁移完成后发现缺陷 | 评估影响 | 5 分钟 | 方案 B/C |
| 数据损坏 | 立即执行 | 0 分钟 | 方案 C |
| 性能问题 | 分析原因 | 30 分钟 | 方案 B |

---

## 7. 风险分级与最佳实践

### 7.1 变更风险分级

#### 低风险变更 ✅
**特征**：
- 新增表
- 新增字段（nullable）
- 新增索引
- 新增注释
- 增加默认值

**处理方式**：
- 直接执行迁移
- 无需额外备份（仍建议备份）
- 可在维护窗口外执行

**示例**：
```sql
-- 新增表
CREATE TABLE new_table (...);

-- 新增字段
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- 新增索引
CREATE INDEX idx_users_email ON users(email);
```

#### 中风险变更 ⚠️
**特征**：
- 修改字段类型
- 删除字段
- 重命名字段
- 修改默认值
- 删除索引

**处理方式**：
- 分步骤执行
- 必须备份
- 在维护窗口执行
- 准备详细回退计划

**示例**：
```sql
-- 修改字段类型（分步）
ALTER TABLE users ADD COLUMN email_temp VARCHAR(255);
UPDATE users SET email_temp = email::varchar;
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_temp TO email;
```

#### 高风险变更 ❌
**特征**：
- 删除表
- 大量数据迁移
- 核心业务逻辑变更
- 架构重构

**处理方式**：
- 完整测试环境验证
- 详细回退计划
- 维护窗口执行
- 逐步灰度发布

**示例**：
```sql
-- 删除表（高风险）
DROP TABLE old_table;

-- 大量数据迁移
UPDATE users SET new_field = ... WHERE condition;
```

### 7.2 变更前检查清单

**通用检查**
- [ ] 已审查生成的 SQL 迁移文件
- [ ] 已在开发环境测试通过
- [ ] 已备份当前数据库
- [ ] 已准备回退计划
- [ ] 已通知相关团队成员
- [ ] 已设置维护窗口期（生产环境）

**开发环境**
- [ ] 功能测试通过
- [ ] 单元测试通过
- [ ] 性能测试通过（如果涉及大量数据）

**测试环境**
- [ ] 集成测试通过
- [ ] API 测试通过
- [ ] 前端功能测试通过
- [ ] 负载测试通过

**生产环境**
- [ ] 备份完成并验证
- [ ] 回退方案已准备
- [ ] 维护窗口已设置
- [ ] 监控告警已配置
- [ ] 应急预案已确认

### 7.3 迁移后检查清单

- [ ] 备份成功
- [ ] 迁移执行成功
- [ ] 数据库结构验证通过
- [ ] 应用功能测试通过
- [ ] 性能测试通过
- [ ] 监控告警正常
- [ ] API 响应正常
- [ ] 前端页面正常

### 7.4 性能优化建议

#### 索引优化
```sql
-- 为常用查询添加索引
CREATE INDEX idx_credits_user_valid ON credits(user_uuid, is_voided, expired_at);

-- 为排序字段添加索引
CREATE INDEX idx_characters_public_popular ON characters(visibility_level, like_count, created_at);

-- 复合索引优化范围查询
CREATE INDEX idx_generations_status_created ON generations(status, created_at);
```

#### 查询优化
```typescript
// 使用索引字段进行查询
const validCredits = await db
  .select()
  .from(credits)
  .where(
    and(
      eq(credits.user_uuid, userUuid),
      eq(credits.is_voided, false),
      gt(credits.expired_at, new Date())
    )
  );

// 避免 SELECT *
const users = await db
  .select({
    id: users.id,
    email: users.email,
    created_at: users.created_at,
  })
  .from(users);
```

### 7.5 数据一致性建议

#### 使用事务
```typescript
import { db } from '@/db';
import { drizzle } from 'drizzle-orm/postgres-js';
import { transaction } from 'drizzle-orm';

await transaction(db, async (tx) => {
  // 多步操作保证原子性
  await tx.insert(users).values(userData);
  await tx.insert(credits).values(creditData);
});
```

#### 软删除
```typescript
// 使用软删除保留历史
await tx
  .update(credits)
  .set({
    is_voided: true,
    voided_at: new Date(),
    voided_reason: 'refund',
  })
  .where(eq(credits.id, creditId));
```

---

## 8. 监控与告警

### 8.1 关键监控指标

#### 数据库连接
- 连接数使用率
- 连接池状态
- 连接超时率

#### 性能指标
- 查询响应时间
- 慢查询数量
- 锁等待时间

#### 存储指标
- 数据库大小
- 表大小增长趋势
- 可用磁盘空间

#### 迁移相关
- 迁移执行时间
- 迁移失败次数
- 事务回滚率

### 8.2 告警设置

**级别 1：紧急** 🔴
- 数据库连接失败
- 迁移执行失败
- 数据损坏检测

**级别 2：重要** 🟡
- 慢查询超过阈值
- 连接数接近上限
- 磁盘空间不足

**级别 3：警告** 🟢
- 查询时间异常
- 表大小增长过快

### 8.3 监控工具

#### Supabase 仪表板
```bash
# 查看数据库指标
# Database → Logs
# Database → Logs → Connection Logs
# Database → Logs → Error Logs
```

#### 自定义监控脚本
```bash
# 检查数据库连接
tsx scripts/monitor-db-connection.ts

# 检查表大小
tsx scripts/monitor-table-size.ts

# 检查慢查询
tsx scripts/monitor-slow-queries.ts
```

---

## 9. 应急响应流程

### 9.1 事件分级

#### P0 - 生产故障
**定义**：生产环境核心功能不可用
**响应时间**：立即（15 分钟内）
**处理流程**：
1. 立即响应，确认问题
2. 启动紧急回退流程
3. 通知所有相关人员
4. 修复问题
5. 验证恢复
6. 事后分析

#### P1 - 严重问题
**定义**：重要功能受影响
**响应时间**：30 分钟内
**处理流程**：
1. 评估影响范围
2. 实施修复或回退
3. 通知相关团队
4. 验证修复结果

#### P2 - 一般问题
**定义**：部分功能受影响
**响应时间**：2 小时内
**处理流程**：
1. 分析问题原因
2. 制定修复计划
3. 在下一个维护窗口修复

### 9.2 应急联系人

| 角色 | 职责 | 联系方式 |
|------|------|----------|
| 技术负责人 | 决策协调 | #oncall |
| 数据库管理员 | 技术支持 | #database-team |
| 开发工程师 | 问题修复 | #dev-team |
| 运维工程师 | 部署支持 | #ops-team |

### 9.3 应急响应检查清单

**启动阶段**
- [ ] 确认问题存在
- [ ] 评估影响范围
- [ ] 通知相关人员
- [ ] 启动应急流程

**处理阶段**
- [ ] 收集错误日志
- [ ] 分析根本原因
- [ ] 实施修复或回退方案
- [ ] 验证修复结果
- [ ] 监控系统状态

**恢复阶段**
- [ ] 确认所有功能正常
- [ ] 撤销告警
- [ ] 通知用户恢复
- [ ] 更新状态页面

**事后阶段**
- [ ] 编写故障报告
- [ ] 分析根本原因
- [ ] 制定改进措施
- [ ] 更新文档和流程
- [ ] 组织复盘会议

---

## 10. 常见问题排查

### 10.1 迁移相关问题

#### 问题 1：迁移文件已存在
```
error: relation "table_name" already exists
```

**原因**：重复执行迁移
**解决**：
```bash
# 检查已执行的迁移
psql "$DATABASE_URL" -c "SELECT * FROM __drizzle_migrations;"

# 跳过已执行的迁移
# 在 migrations/meta/_journal.json 中标记为已完成
```

#### 问题 2：迁移执行中断
```
error: could not execute statement: ...
```

**原因**：网络中断、超时、权限不足
**解决**：
```bash
# 检查迁移状态
SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;

# 从中断点继续
pnpm db:migrate
```

#### 问题 3：Schema 不匹配
```
error: column "xxx" does not exist
```

**原因**：代码中引用了不存在的字段
**解决**：
```bash
# 验证数据库结构
pnpm db:verify
tsx scripts/check-db-columns.ts

# 对比代码和数据库
pnpm db:studio
```

### 10.2 连接问题

#### 问题 1：连接被拒绝
```
error: could not connect to server: Connection refused
```

**原因**：数据库服务未启动或防火墙阻止
**解决**：
```bash
# 检查连接信息
echo $DATABASE_URL

# 测试连接
pg_isready -h $DB_HOST -p $DB_PORT

# 检查防火墙
ufw status
```

#### 问题 2：认证失败
```
error: password authentication failed for user "xxx"
```

**原因**：用户名或密码错误
**解决**：
```bash
# 验证凭据
psql "$DATABASE_URL" -c "SELECT current_user;"

# 更新密码或重新配置环境变量
```

#### 问题 3：连接超时
```
error: connection to server at "xxx", port 5432 timed out
```

**原因**：网络问题或连接池耗尽
**解决**：
```bash
# 检查连接池配置
# 增加 max 连接数
# 检查长时间运行的事务
```

### 10.3 性能问题

#### 问题 1：慢查询
```sql
-- 查看最慢的查询
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**解决**：
- 添加索引
- 优化查询语句
- 减少返回数据量

#### 问题 2：锁等待
```sql
-- 查看锁等待
SELECT * FROM pg_stat_activity
WHERE state = 'active' AND wait_event IS NOT NULL;
```

**解决**：
- 检查长时间运行的事务
- 优化事务范围
- 使用行级锁

### 10.4 备份问题

#### 问题 1：备份失败
```
pg_dump: error: could not execute query: ...
```

**原因**：权限不足或磁盘空间不足
**解决**：
```bash
# 检查权限
psql "$DATABASE_URL" -c "SELECT rolname FROM pg_roles;"

# 检查磁盘空间
df -h

# 备份到其他位置
pg_dump "$DATABASE_URL" > /path/to/backup.sql
```

#### 问题 2：备份文件损坏
```
psql: error: invalid byte sequence for encoding
```

**原因**：编码问题或文件损坏
**解决**：
```bash
# 指定编码
pg_dump "$DATABASE_URL" --encoding=UTF8 > backup.sql

# 验证备份文件
head -100 backup.sql
```

---

## 变更历史

- **2025-11-19**: 初始版本创建 - 创建完整的数据库维护指南
- **关联需求**: 数据库维护标准化
- **影响范围**: 开发、测试、生产环境数据库操作
- **相关文件**: `src/db/schema.ts`, `src/db/config.ts`, `scripts/backup-database.sh`

- **2025-11-19**: 新增自定义数据库维护脚本章节
  - 添加生产环境备份脚本 (`create-production-backup.js`) 文档
  - 添加生产环境迁移脚本 (`apply-production-migration.js`) 文档
  - 添加迁移验证脚本 (`verify-production-migration.js`) 文档
  - 提供完整的脚本使用说明和注意事项
  - **影响范围**: 数据库维护流程、备份和迁移操作
  - **相关文件**: `docs/3-operations/database-maintenance-guide.md`

---

## 附录

### A. 有用的 SQL 查询

```sql
-- 查看所有表
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 查看表大小
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看索引
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public';

-- 查看活跃连接
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start
FROM pg_stat_activity
WHERE state = 'active';

-- 查看迁移历史
SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;
```

### B. 常用脚本

```bash
#!/bin/bash
# 检查数据库健康状态
echo "=== Database Health Check ==="

# 检查连接
pg_isready -h $DB_HOST -p $DB_PORT

# 检查连接数
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# 检查数据库大小
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));"

# 检查表数量
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';"

echo "=== Health Check Complete ==="
```

### C. 自定义数据库维护脚本

项目提供了一套 Node.js 脚本，用于处理特定的数据库维护任务，特别是在 pg_dump 版本不匹配或需要更灵活操作时使用。

#### C.1 生产环境备份脚本

**用途**：创建生产环境的完整数据库备份（包括结构和数据）

**使用场景**：
- pg_dump 版本与服务器不匹配时
- 需要更详细的备份信息时
- 需要批量处理或自定义备份逻辑时

**命令**：
```bash
node create-production-backup.js
```

**功能特性**：
- 自动创建 `backups` 目录
- 生成带时间戳的备份文件：`anividai_production_backup_YYYYMMDD_HHMMSS.sql`
- 备份所有36个表的结构和数据
- 创建 `latest-backup.sql` 软链接指向最新备份
- 显示详细的备份统计信息

**输出示例**：
```
✅ Connected to production database
📦 Found 36 tables to backup
🔄 Backing up table: users (Rows: 3)
🔄 Backing up table: generations (Rows: 262)
...
✅ Backup completed successfully!
📋 Backup Summary:
   File: anividai_production_backup_20251119_023043.sql
   Size: 2.38 MB
   Tables: 36
   Created: 2025-11-19T02:30:43.289Z
```

**备份文件位置**：
```
backups/
├── anividai_production_backup_20251119_023043.sql (2.4 MB)
└── latest-backup.sql → anividai_production_backup_20251119_023043.sql
```

#### C.2 生产环境迁移脚本

**用途**：应用特定迁移到生产环境数据库

**使用场景**：
- 迁移工具版本不兼容时
- 需要更精细控制迁移过程时
- 需要跳过已执行的迁移时

**命令**：
```bash
node apply-production-migration.js
```

**功能特性**：
- 自动创建 `__drizzle_migrations` 表（如果不存在）
- 检查迁移是否已应用，避免重复执行
- 逐个执行 SQL 语句，提供详细进度反馈
- 忽略 "already exists" 错误，继续执行
- 记录迁移历史
- 验证迁移结果

**执行示例**：
```
✅ Connected to production database
✅ Drizzle migrations table ready
📝 Found 4 SQL statements to execute
🔄 Executing statement 1/4: ALTER TABLE "characters" ALTER COLUMN...
✅ Success
🔄 Executing statement 2/4: ALTER TABLE "feedbacks" ADD COLUMN...
✅ Success
✅ Migration completed successfully!
✅ Migration verified: type column added to feedbacks table
```

#### C.3 生产环境迁移验证脚本

**用途**：验证生产环境数据库迁移结果

**命令**：
```bash
node verify-production-migration.js
```

**功能特性**：
- 验证表结构变更
- 检查索引创建
- 验证字段类型
- 显示迁移历史
- 提供详细的验证报告

**输出示例**：
```
=== 验证 feedbacks 表 ===
📋 feedbacks 表结构:
   id: integer
   status: character varying
🆕 type: character varying (default: 'general'::character varying)

=== 验证索引 ===
✅ 索引 idx_feedbacks_type 已创建

=== 验证迁移记录 ===
📝 已应用的迁移:
  - 0001_blushing_lady_vermin (2025-11-19 10:25:09 GMT+0800)
```

#### C.4 脚本使用注意事项

**配置要求**：
```bash
# 确保 DATABASE_URL 指向正确的数据库
export DATABASE_URL="postgresql://user:pass@host:port/database"

# 或在 .env.development 中配置
DATABASE_URL="postgresql://..."
```

**权限要求**：
- 数据库用户需要 SELECT、INSERT、UPDATE、CREATE 权限
- 需要访问 `information_schema` 和 `pg_*` 系统表

**错误处理**：
- 所有脚本都有完善的错误捕获和日志记录
- 网络错误、权限错误等会显示详细错误信息
- 脚本会在失败时返回非零退出码

**清理脚本**：
```bash
# 使用完成后可以删除临时脚本
rm -f create-production-backup.js apply-production-migration.js verify-production-migration.js
```

**版本兼容性**：
- 支持 Node.js 14+
- 使用 `pg` npm 包连接 PostgreSQL
- 兼容 PostgreSQL 9.6+ 和 Supabase

### D. 参考链接

- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Drizzle Kit 文档](https://orm.drizzle.team/kit-docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Supabase 文档](https://supabase.com/docs)

---
