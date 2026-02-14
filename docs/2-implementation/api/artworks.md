**Related**: 作品管理（Artworks Management）

# API 契约：Artworks

## 当前版本
- Version: v1.0
- Auth: Required
- Errors: 统一英文

## 接口列表

### 1. 获取用户作品列表
- **Endpoint**: `GET /api/artworks`
- **用途**: 获取用户的所有作品（图片、视频）或收藏的作品
- **Auth**: Required
- **文件位置**: `src/app/api/artworks/route.ts`
- **Request**: Query Parameters
  ```typescript
  {
    type?: 'all' | 'image' | 'video',    // 作品类型过滤
    tab?: 'mine' | 'favorites',          // 标签页：我的作品 | 收藏的作品
    q?: string,                          // 搜索关键词（搜索 prompt）
    page?: number,                       // 页码，默认 1
    limit?: number                       // 每页数量，默认 20，最大 100
  }
  ```
- **Response**:
  ```json
  {
    "data": {
      "items": [
        {
          "uuid": "gen-xxx",
          "type": "image",
          "generation_type": "anime",
          "status": "completed",
          "prompt": "A cute anime girl...",
          "results": [
            {
              "url": "https://cdn.anivid.ai/xxx.webp",
              "thumbnail_url": "https://cdn.anivid.ai/xxx_thumb.webp",
              "width": 1024,
              "height": 1024
            }
          ],
          "model_name": "GPT-4o",
          "visibility_level": "public",
          "created_at": "2025-10-30T10:00:00.000Z",
          "user_interaction": {
            "is_liked": false,
            "is_favorited": true
          },
          "stats": {
            "likes": 25,
            "favorites": 10
          }
        }
      ],
      "total": 150,
      "page": 1,
      "limit": 20,
      "has_more": true
    }
  }
  ```
- **说明**:
  - `tab=mine`: 返回用户自己创建的作品
  - `tab=favorites`: 返回用户收藏的作品
  - `type=all`: 返回所有类型作品
  - `type=anime`: 仅返回动漫图片生成作品
  - `type=video`: 仅返回视频生成作品
  - 结果按创建时间倒序排列
- **错误**:
  - `no auth` (401)
  - `invalid parameters` (400)
  - `get artworks failed` (500)

## 作品类型说明

### Image 类型作品
- **generation_type**: `anime` | `oc_avatar` | `oc_image` | `action_figure`
- **results**: 数组，包含生成的图片 URL、缩略图、尺寸信息
- **支持操作**: 下载、分享、设置可见性、删除

### Video 类型作品
- **generation_type**: `anime_video`
- **results**: 包含视频 URL、缩略图、时长、尺寸信息
- **支持操作**: 下载、分享、设置可见性、删除

### OC 类型作品
- **type**: `character`
- **包含信息**: 角色头像、立绘、基本信息
- **支持操作**: 编辑、删除、生成新作品

## 数据聚合说明

该接口聚合以下数据:
1. **生成记录**: 从 `generations` 表查询
2. **用户交互**: 从 `user_interactions` 表查询当前用户的点赞、收藏状态
3. **社交统计**: 从 `social_stats` 表获取总点赞数、收藏数
4. **图片/视频数据**: 从 `image_generations` / `video_generations` 表获取详细信息

## 过滤与排序

### 支持的过滤条件:
- **类型过滤**: `type` 参数
- **标签页过滤**: `tab` 参数（mine/favorites）
- **关键词搜索**: `q` 参数（搜索 prompt 字段）
- **状态过滤**: 仅返回 `status=completed` 的作品

### 排序规则:
- 默认按 `created_at` 倒序排列（最新的在前）
- 收藏作品按收藏时间倒序排列

## 性能优化建议

### 前端分页加载:
```typescript
// 使用无限滚动加载
const [page, setPage] = useState(1)
const [artworks, setArtworks] = useState([])

const loadMore = async () => {
  const { data } = await fetch(`/api/artworks?page=${page}&limit=20&tab=mine`)
  setArtworks([...artworks, ...data.items])
  setPage(page + 1)
}
```

### 缓存策略:
- 图片缩略图使用 CDN 缓存
- API 响应使用短期缓存（60s）

## 相关 API

- **社区作品**: `/api/community/artworks` - 获取公开的社区作品
- **点赞**: `/api/community/artworks/[uuid]/like` - 点赞作品
- **收藏**: `/api/community/artworks/[uuid]/favorite` - 收藏作品
- **可见性**: `/api/community/artworks/[uuid]/visibility` - 修改可见性
- **下载**: `/api/download/image/[uuid]` - 下载图片
- **下载**: `/api/download/video/[uuid]` - 下载视频

## 相关服务

- **Service Layer**: `src/services/artworks.ts` - 作品管理服务
- **Service Layer**: `src/services/generation.ts` - 生成服务
- **Model Layer**: `src/models/artwork.ts` - 作品数据模型
- **Model Layer**: `src/models/generation.ts` - 生成记录模型
- **Model Layer**: `src/models/user-interaction.ts` - 用户交互模型
- **Model Layer**: `src/models/social-stats.ts` - 社交统计模型

## 前端页面

- **我的作品页**: `src/app/[locale]/(default)/my-artworks/page.tsx`
- **作品卡片组件**: `src/components/artworks/ArtworkCard.tsx`
- **分页组件**: `src/components/artworks/ArtworksPagination.tsx`

## 变更历史
- 2025-11-12 v1.0 首次创建作品管理 API 文档
