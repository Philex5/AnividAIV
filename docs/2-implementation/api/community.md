# API: Community Artworks

Related: FEAT-community

状态：契约草案（可随实现微调，保持变更历史）

## 1. 概述

提供社区作品的查询与详情接口，支持类型筛选、搜索、排序、标签过滤与基于游标的无限滚动。

## 2. 列表查询

- Endpoint: `GET /api/community/artworks`
- Query Params:
  - `type`: `all | oc | image | video`（默认 `all`）
  - `sort`: `trending | newest | top`（默认 `trending`）
  - `q`: string（搜索标题/作者/标签，长度 ≤ 100）
  - `gen_types`: `anime,action_figure,sticker,avatar,character,video,anime_video`（默认空，表示全选；仅在 `type` 为 `image/oc/video` 时生效）
  - `tags`: `tag1,tag2,...`（最大 10 个）
  - `cursor`: string（上一页返回的 `nextCursor`）
  - `limit`: number（默认 24，区间 12–60）

- 200 Response

```json
{
  "items": [
    {
      "id": "art_123",
      "type": "image",
      "title": "Sunset City",
      "cover_url": "https://...",
      "media_urls": ["https://..."],
      "author": { "id": "u_1", "name": "Alice", "avatar": "https://..." },
      "stats": { "likes": 120, "views": 3210, "comments": 32 },
      "tags": ["style:cyber", "mood:soft"],
      "meta": { "duration": 0, "resolution": "4k" }
    }
  ],
  "nextCursor": "eyJpZCI6ICJhcnRfMTIzIn0="
}
```

- 错误（示例）
  - 400: `{"error":"Invalid parameters"}`
  - 400: `{"error":"Invalid gen_types"}`
  - 429: `{"error":"Rate limit exceeded"}`
  - 500: `{"error":"Failed to fetch artworks"}`

## 3. 详情查询

- Endpoint: `GET /api/community/artworks/{id}`

- 200 Response

```json
{
  "id": "art_123",
  "type": "oc",
  "title": "Mika",
  "cover_url": "https://...",
  "media_urls": ["https://.../1.png", "https://.../2.png"],
  "author": { "id": "u_1", "name": "Alice", "avatar": "https://..." },
  "stats": { "likes": 120, "views": 3210, "comments": 32 },
  "tags": ["hair:pink", "race:elf"],
  "meta": { "oc_traits": ["pink hair", "kimono"] },
  "description": "...",
  "prompt": "..."
}
```

- 错误（示例）
  - 404: `{"error":"Artwork not found"}`
  - 500: `{"error":"Failed to fetch artwork detail"}`

## 4. 字段约定

- `type`: `oc | image | video`
- `author`: `id`, `name`, `avatar`（公开基础信息，不返回敏感字段）
- `stats`: `likes`, `views`, `comments`（读取优化可延迟一致）
- `meta.duration`: seconds（仅 video）
- `meta.resolution`: e.g. `720p` / `1080p` / `4k`
- `meta.oc_traits`: 角色关键设定词条数组

## 5. 排序与筛选

- `trending`: MVP 简化为与 `newest` 等价；后续引入异步聚合的 `hot_score` 后再切换
- `newest`: 按创建时间倒序
- `top`: 若无聚合数据，MVP 可与 `newest` 等价；如有 `likes` 聚合则按 `likes DESC, created_at DESC`
- `tags`: 通过标签索引筛选（大小写不敏感，前端建议展示标准化文案）
- `gen_types`: 仅对 `type=image/oc/video` 生效，空数组代表不过滤

## 6. 分页模型（游标）

- 请求携带 `cursor`（上一页响应 `nextCursor`），无则视为第一页。
- 当 `nextCursor` 为空或缺失时表示无更多数据。
- 游标含加密或编码的位点信息，不暴露内部主键细节。

## 7. 速率限制与缓存（建议）

- 列表与详情均建议做基础速率限制（如 IP 级别）。
- 公共可缓存字段允许 CDN 缓存短时（如 30–60s），用户态操作（点赞/收藏）命中后端直出。

## 8. 错误码与信息（英文）

- 400 `Invalid parameters`
- 401 `Unauthorized`（若后续部分接口要求登录）
- 404 `Artwork not found`
- 429 `Rate limit exceeded`
- 500 `Failed to fetch artworks` / `Failed to fetch artwork detail`

## 9. 安全与隐私

- 不返回用户敏感信息；避免泄漏私有资源路径与签名。
- 资源 URL 通过 `src/lib/r2-utils.ts` 统一生成（服务器端签名或样式参数）。

## 10. 相关实现文件（计划）

- API Routes：
  - `src/app/api/community/artworks/route.ts`（列表）
  - `src/app/api/community/artworks/[id]/route.ts`（详情）

- 前端对接：
  - `src/app/[locale]/(default)/community/page.tsx`
  - `src/components/community/*`

## 11. 数据模型（指引）

- 采用 MVP 统一视图方案（不建 `artworks` 表）：详见 `docs/1-specs/data-models.md`
  - 统一视图：`community_artworks_view`（或 API 层 UNION）聚合 `characters` / `generation_images` / `generation_videos`
  - 标准字段：`type, source_type, source_uuid, author_uuid, title, cover_url, media_urls, tags, meta, created_at`
  - 统计：从 `user_interactions` 实时聚合，或使用轻量聚合表 `community_artwork_stats_mvp`（主键 `(source_type, source_uuid)`）
  - 索引：使用源表索引；如采用物化视图，可在其上建立 `(type, created_at)`、`(author_uuid, created_at)` 索引

## 12. 变更历史

- 2025-10-22 FEAT-community 初版：列表/详情查询契约、分页与错误码草案。
- 2025-01-24 FEAT-community 新增 gen_types 二级分类筛选参数
