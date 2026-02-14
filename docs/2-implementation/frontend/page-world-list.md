# 世界观列表页面设计 (World List Page)

**Related**: FEAT-WORLDS | [feature-worlds.md](../features/feature-worlds.md)

## 页面路径

- `/world`
- **权限要求**：公开（所有人可见）

## 页面目标

- 展示平台所有的公开世界观（包括预置和用户创建）。
- 提供搜索和筛选功能。
- 作为进入世界观详情页的主要入口。

## 页面结构

### 1. Header (Hero Section)
- 标题：Explore Worlds
- 副标题：Discover unique settings and lore created by the community.
- 搜索框：支持按名称或描述搜索。

### 2. Grid List
- 使用卡片式布局展示世界观。
- 每个卡片包含：
  - 封面图
  - 世界观名称
  - 简介（截断）
  - 统计信息（如角色数量）
  - 标签（预置/用户创建）
  - 主题色指示

### 3. Pagination / Load More
- 支持分页或加载更多。

## 封面图解析规则

- **字段**：`oc_worlds.cover_url`
- **字段约定**：
  - `http/https` 开头：视为用户上传 URL，直接使用
  - 其他情况：视为 `image_uuid`
- **读取逻辑**：
  - `image_uuid` -> `GET /api/generation/image-resolve/[uuid]`（`size=auto`）
  - 优先使用 `resolved_url`，缺失时回退 `original_url`
- **说明**：
  - 详见 `docs/2-implementation/api/generation.md`

### 伪代码（解析逻辑）

```ts
function resolveWorldCover(input: string, size = "auto") {
  if (isHttpUrl(input)) return { resolvedUrl: input, originalUrl: input };

  const { data } = await fetchJson(`/api/generation/image-resolve/${input}?size=${size}`);
  return {
    resolvedUrl: data.resolved_url || data.original_url,
    originalUrl: data.original_url,
  };
}
```

## UI 风格
- 延续 `QuickCreationHero` 的玻璃拟态 (Glassmorphism) 风格。
- 强调卡片的阴影感 (Bolder shadows, `shadow-[8px_8px_0px_0px]`)。
- 交互动效：悬停时位移并改变阴影。

## API 依赖
- `GET /api/worlds`
  - 参数：`page`, `limit`, `search`, `visibility=public`

## 相关文件
- 页面：`src/app/[locale]/(default)/worlds/page.tsx`
- 组件：`src/components/worlds/WorldListPage.tsx`
- 组件：`src/components/worlds/WorldCard.tsx`

## 变更历史

- 2026-01-25 FEAT-IMAGE-ASSET-UNIFY 统一封面图解析规则（cover_url 支持 uuid）
