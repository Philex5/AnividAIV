# Backend: Community Unified View

Related: FEAT-community

状态：实现指引（MVP 方案，不建 artworks 表）

## 1. 目标

在不新增 `artworks` 表的前提下，使用“统一视图/物化视图 + 轻量统计聚合”支撑社区列表/详情查询，满足：
- 跨类型统一查询（OC/Image/Video）
- 分页排序（newest/top/trending）
- 低延迟、可扩展的统计（likes/views/comments/hot_score）

## 2. 统一视图（SQL 伪代码）

采用数据库视图或在 API 层 UNION 标准化查询字段。建议命名：`community_artworks_view`。

```sql
CREATE OR REPLACE VIEW community_artworks_view AS
SELECT
  'image'::text AS type,
  'generation_image'::text AS source_type,
  gi.uuid AS source_uuid,
  gi.user_uuid AS author_uuid,
  COALESCE(gi.title, '') AS title,
  gi.thumbnail_detail AS cover_url,
  jsonb_build_array(gi.thumbnail_detail) AS media_urls,
  NULL::text[] AS tags,
  jsonb_build_object(
    'model_code', gi.model,
    'style_code', gi.style
  ) AS meta,
  gi.gen_type AS gen_type,
  gi.created_at
FROM generation_images gi
WHERE gi.visibility_level = 'public'

UNION ALL

SELECT
  'video',
  'generation_video',
  gv.uuid,
  gv.user_uuid,
  COALESCE(gv.title, '') AS title,
  gv.poster_url AS cover_url,
  jsonb_build_array(gv.poster_url) AS media_urls,
  NULL::text[] AS tags,
  jsonb_build_object(
    'resolution', gv.resolution,
    'duration_seconds', gv.duration_seconds
  ) AS meta,
  gv.gen_type AS gen_type,
  gv.created_at
FROM generation_videos gv
WHERE gv.visibility_level = 'public'

UNION ALL

SELECT
  'oc',
  'character',
  c.uuid,
  c.user_uuid,
  COALESCE(c.display_name, '') AS title,
  c.cover_url,
  COALESCE(c.preview_images, '[]'::jsonb) AS media_urls,
  NULL::text[] AS tags,
  jsonb_build_object(
    'race_code', c.race_code,
    'traits_codes', COALESCE(c.traits_codes, '[]'::jsonb)
  ) AS meta,
  img.gen_type AS gen_type,
  c.created_at
FROM characters c
LEFT JOIN generation_images img ON img.uuid = c.profile_generation_image_uuid
WHERE c.visibility_level = 'public';
```

注意：字段名按 data-models.md 标准化；缺少字段使用 NULL/空集合占位；通用元素仅存 code，展示名由系统级 i18n 提供。

## 3. 统计聚合（两种策略）

- 策略 A：实时聚合（简易）
  - 查询时 `LEFT JOIN (
      SELECT source_type, source_uuid,
             SUM(CASE WHEN interaction_type='like' THEN 1 ELSE 0 END) AS likes,
             SUM(CASE WHEN interaction_type='view' THEN 1 ELSE 0 END) AS views,
             SUM(CASE WHEN interaction_type='comment' THEN 1 ELSE 0 END) AS comments
      FROM user_interactions
      WHERE art_type='artwork'
      GROUP BY source_type, source_uuid
    ) stats`。
  - trending 可运行期计算 `hot_score`（见第 4 节）。

- 策略 B：轻量聚合表（推荐）
  - 表：`community_artwork_stats_mvp(source_type, source_uuid, likes, views, comments, hot_score, updated_at)`
  - 维护：
    - 事件流或定时任务（每 1–5 分钟）增量刷新；
    - 交互写入时异步 upsert 对应行；
    - hot_score 定时重算（见第 4 节）。
  - 查询：与视图 `LEFT JOIN` 即可。

## 4. hot_score 计算（trending）

建议采用时间衰减的组合权重，兼顾近期热度：

```
base = w_like*likes + w_view*views + w_comment*comments
decay = 1 / (1 + (now - created_at_hours)/h)^p   // h: 半衰窗口，p: 衰减曲率
hot_score = base * decay
```

默认参数（可在配置中调整）：
- `w_like=3, w_comment=4, w_view=1`
- `h=24`（24小时半衰），`p=1.5`

刷新策略：
- 若采用策略 A：运行期用 `created_at` +统计即时计算（CPU 开销高，适合小规模）。
- 若采用策略 B：
  - 定时任务每 5 分钟重算最近 72 小时内的 hot_score；
  - 超过窗口的内容降频计算（例如每天一次）。

## 5. 物化视图（可选）

当 UNION 查询压力较大时，改用物化视图 `community_artworks_mv`：

- 构建：与视图 SQL 相同。
- 索引：`(type, created_at DESC)`, `(author_uuid, created_at DESC)`。
- 刷新策略：
  - 定时 `REFRESH MATERIALIZED VIEW CONCURRENTLY community_artworks_mv` 每 1–5 分钟；
  - 或在源表新增/变更后触发增量刷新（复杂，非 MVP 必需）。
- 查询：列表/详情改读 MV，统计仍 LEFT JOIN 轻量聚合表。

## 6. API 层实现要点

- 列表查询：
  - 读取 `community_artworks_view`（或 MV）；按 `type/sort/q/tags` 拼接 WHERE；
  - gen_type 二级分类：当 `type` 为 image/oc/video 且 `gen_types` 非空时追加 `gen_type IN (...)`；
  - `trending/top` 依赖聚合 stats 的 `hot_score/likes`；
  - 游标：使用 `(sort_key, created_at, source_type, source_uuid)` 组合生成稳定 cursor（Base64 编码）。

- 详情查询：
  - 入参 `{id}` 为编码后的 `(source_type, source_uuid)` 或单一 `source_uuid` + `type`；
  - 定位源表，补齐详情字段（如 OC traits、视频时长/分辨率等），并 JOIN 作者信息与统计。

- 安全：仅返回 `public` 内容；URL 使用 `src/lib/r2-utils.ts` 生成可公开访问地址。

## 7. 维护与监控

- 指标：查询时延、MV 刷新时长、聚合任务延迟、错误率、交互事件入库速率。
- 异常：聚合任务失败回退为实时聚合；视图失效时降级为 UNION 查询。

## 8. 关联文档

- 页面：docs/2-implementation/frontend/page-community.md
- 组件：docs/2-implementation/frontend/component-community-cards.md
- API：docs/2-implementation/api/community.md
- 数据模型：docs/1-specs/data-models.md

## 9. 变更历史

- 2025-10-22 FEAT-community 初版：统一视图/MV 方案、hot_score 与刷新策略指引。
- 2025-01-24 FEAT-community 增补 gen_type 二级分类过滤与 OC gen_type 补齐

## 10. Cursor 与过滤（伪代码）

以下示例展示 API 层如何生成/解析游标，并按过滤条件构建 WHERE 子句与稳定排序键。

```ts
// Cursor payload 建议字段（按排序模式变更 sort_key）
type CursorPayload = {
  sort: 'newest' | 'top' | 'trending';
  sortKey: number | string; // newest: created_at_ts; top: likes; trending: hot_score
  createdAt: number;        // 毫秒时间戳，稳定回退键
  sourceType: 'character' | 'generation_image' | 'generation_video';
  sourceUuid: string;       // 最终稳定去重键
};

function encodeCursor(p: CursorPayload): string {
  return Buffer.from(JSON.stringify(p)).toString('base64url');
}
function decodeCursor(s?: string): CursorPayload | null {
  if (!s) return null;
  try { return JSON.parse(Buffer.from(s, 'base64url').toString('utf8')); } catch { return null; }
}

// 构造过滤条件
type Filters = {
  type?: 'all' | 'oc' | 'image' | 'video';
  sort?: 'newest' | 'top' | 'trending';
  q?: string;      // 标题/作者/标签检索
  tags?: string[]; // 规范化标签
};

function buildWhereSQL(f: Filters): { where: string[]; params: any[] } {
  const where: string[] = ["visibility_level = 'public'"]; // 视图内部已筛，可冗余强化
  const params: any[] = [];

  if (f.type && f.type !== 'all') {
    where.push('type = ?');
    params.push(f.type);
  }
  if (f.q) {
    // 简化：标题或作者名 ILIKE；实际可改为 TSVector
    where.push('(title ILIKE ? OR author_name ILIKE ?)');
    params.push(`%${f.q}%`, `%${f.q}%`);
  }
  if (f.tags && f.tags.length > 0) {
    // 简化：tags @> ARRAY[...]
    where.push('tags && ?'); // overlaps
    params.push(f.tags);
  }
  return { where, params };
}

// 排序与游标条件（MVP：trending/top 与 newest 等价或部分退化）
function buildOrderAndCursor(f: Filters, cur: CursorPayload | null) {
  const sort = f.sort ?? 'trending'; // MVP: trending 等价 newest
  const sortKey = sort === 'newest' || sort === 'trending' || sort === 'top' ? 'created_at' : 'created_at';

  const orderBy = `${sortKey} DESC, source_type, source_uuid`;

  let cursorSQL = '';
  const params: any[] = [];
  if (cur) {
    // 稳定翻页：先按 sortKey，再按 created_at，再按 (source_type, source_uuid)
    cursorSQL = `(
      (${sortKey} < to_timestamp(?/1000.0)) OR
      ((${sortKey} = to_timestamp(?/1000.0)) AND (source_type, source_uuid) < (?, ?))
    )`;
    params.push(cur.createdAt, cur.createdAt, cur.sourceType, cur.sourceUuid);
  }
  return { orderBy, cursorSQL, params };
}

// 组合查询（伪）
function buildQuery(f: Filters, cursorStr?: string) {
  const cur = decodeCursor(cursorStr);
  const { where, params } = buildWhereSQL(f);
  const { orderBy, cursorSQL, params: cParams } = buildOrderAndCursor(f, cur);

  if (cursorSQL) where.push(cursorSQL);
  const sql = `
    SELECT * FROM community_artworks_view v
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${orderBy}
    LIMIT ?
  `;
  return { sql, params: [...params, ...cParams, 24] };
}

// 生成 nextCursor（依据最后一条）
function makeNextCursor(row: any, f: Filters): string {
  const payload: CursorPayload = {
    sort: f.sort ?? 'trending', // MVP 与 newest 等价
    sortKey: Date.parse(row.created_at),
    createdAt: Date.parse(row.created_at),
    sourceType: row.source_type,
    sourceUuid: row.source_uuid,
  };
  return encodeCursor(payload);
}
```

说明：
- MVP 下 `trending/top` 与 `newest` 等价，使用 `created_at` 作为 `sortKey`。
- 当引入聚合表后：
  - `top` 使用 `likes` 作为 `sortKey`，游标条件需增加 `likes` 层级；
  - `trending` 使用 `hot_score` 作为 `sortKey`；
  - 生成/解析游标时需包含对应的 `sortKey` 数值。
```
