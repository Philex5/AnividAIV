# worlds API (世界观系统 API)

**Related**: FEAT-WORLDS | [feature-worlds.md](../features/feature-worlds.md)

## 当前版本

### 1. 获取世界观列表

**Endpoint**: `GET /api/worlds`

**Auth**: Optional（登录用户可见私有世界观；非 owner 且 allow_join = false 的世界观会被过滤）

**Query Parameters**:
- `visibility_level?`: `'public' | 'private'` - 筛选可见性（可选）
- `creator_uuid?`: `string` - 按创建者筛选（可选）
- `search?`: `string` - 搜索世界观名称（可选）

**Response** (200):
```typescript
{
  worlds: Array<{
    id: number;
    uuid: string;
    name: string;                          // 世界观名称（如"赛博朋克"）
    slug: string;                          // URL 友好的标识（如"cyberpunk"）
    description: string;                   // 世界观描述
    cover_url: string;                     // 缩略图 URL
    creator_uuid?: string;                 // 创建者 UUID（预置世界观为 null）
    visibility_level: 'public' | 'private';// 可见性
    allow_join: boolean;                   // 是否允许非 owner 关联 OC
    is_preset: boolean;                    // 是否预置世界观
    config: {
      theme_color: string;                 // 主题色（十六进制，如"#FF6B35"）
      background_image?: string;           // 背景图 URL（仅 URL，不使用 UUID）
      decoration_style?: string;           // 装饰元素风格描述
      fonts?: {
        title?: string;                    // 标题字体
        body?: string;                     // 正文字体
      };
      color_palette?: string[];            // 配色方案数组
    };
    character_count: number;               // 该世界观下的角色数量
    like_count: number;                    // 点赞数
    favorite_count: number;                // 收藏数
    comment_count: number;                 // 评论数
    share_count: number;                   // 分享数
    created_at: string;                    // ISO 8601 时间戳
    updated_at: string;
  }>;
  total: number;                           // 总数
  page: number;                            // 当前分页
  limit: number;                           // 每页数量
}
```

**Error Responses**:
- `400`: 参数校验失败
- `401`: 鉴权失败（仅在请求私有数据时）

---

### 2. 获取单个世界观详情

**Endpoint**: `GET /api/worlds/[id]`

**Auth**: Optional

**Path Parameters**:
- `id`: `number | string` - 世界观 ID 或 UUID

**Response** (200):
```typescript
{
  id: number;
  uuid: string;
  name: string;
  slug: string;
  description: string;
  cover_url: string;
  creator_uuid?: string;
  visibility_level: 'public' | 'private';
  allow_join: boolean;
  is_preset: boolean;
  config: {...};  // 同上
  character_count: number;
  like_count: number;
  favorite_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
}
```

**Error Responses**:
- `404`: 世界观不存在
- `403`: 无权限查看（私有世界观）

---

### 3. 创建自定义世界观

**Endpoint**: `POST /api/worlds`

**Auth**: Required

**Request Body**:
```typescript
{
  name: string;                        // 名称（1-50 字符）
  description?: string;                // 描述（最多 500 字符）
  cover_url?: string;                  // 缩略图 URL（可选）
  visibility_level?: 'public' | 'private';    // 可见性（默认 'public'，订阅用户可设置 private）
  allow_join?: boolean;                // 是否允许非 owner 关联 OC（默认 true）
  config?: {
    theme_color?: string;              // 主题色（十六进制）
    background_image?: string;         // 背景图 URL（仅 URL，不使用 UUID）
    decoration_style?: string;         // 装饰风格
    fonts?: {
      title?: string;
      body?: string;
    };
    color_palette?: string[];
  };
}
```
**说明**:
- `background_image` 支持 URL 或 UUID
- 如需上传，使用 `/api/upload` 且 `type=user_upload`、`sub_type=world_background`

**Response** (201):
```typescript
{
  id: number;
  uuid: string;
  name: string;
  slug: string;                        // 由后端自动生成
  description?: string;
  cover_url?: string;
  creator_uuid: string;
  visibility_level: 'public' | 'private';
  allow_join: boolean;
  is_preset: false;
  config: {...};
  character_count: 0;
  created_at: string;
  updated_at: string;
}
```

**Error Responses**:
- `400`: 参数校验失败（如名称已存在）
- `401`: 未登录
- `403`: 订阅限制（私有可见性仅订阅用户可用）
- `402`: 配额超限（code: `LIMIT_EXCEEDED`，如用户自定义世界观个数超过上限）

---

### 4. 更新世界观

**Endpoint**: `PUT /api/worlds/[id]`

**Auth**: Required（仅创建者可更新）

**Path Parameters**:
- `id`: `number | string` - 世界观 ID 或 UUID

**Request Body** (partial update):
```typescript
{
  name?: string;
  description?: string;
  cover_url?: string;
  visibility_level?: 'public' | 'private';
  allow_join?: boolean;
  config?: {...};  // 部分更新
}
```

**Response** (200):
```typescript
{
  id: number;
  uuid: string;
  // ... 完整的 world 对象
}
```

**Error Responses**:
- `400`: 参数校验失败
- `401`: 未登录
- `403`: 无权限更新（非创建者或订阅限制）
- `404`: 世界观不存在

---

### 5. 删除世界观

**Endpoint**: `DELETE /api/worlds/[id]`

**Auth**: Required（仅创建者可删除）

**Path Parameters**:
- `id`: `number | string` - 世界观 ID 或 UUID

**Response** (204): 无内容

**Error Responses**:
- `401`: 未登录
- `403`: 无权限删除
- `404`: 世界观不存在
- `409`: 冲突（如世界观被其他角色引用，无法删除）

---

### 6. 收藏世界观

**Endpoint**: `POST /api/worlds/[id]/favorite`

**Auth**: Required

**Response** (200):
```typescript
{
  favorite_count: number;
  has_favorited: true;
}
```

**Error Responses**:
- `401`: AUTH_REQUIRED
- `403`: FORBIDDEN（非公开世界观）
- `404`: NOT_FOUND

---

### 7. 取消收藏世界观

**Endpoint**: `DELETE /api/worlds/[id]/favorite`

**Auth**: Required

**Response** (200):
```typescript
{
  favorite_count: number;
  has_favorited: false;
}
```

**Error Responses**:
- `401`: AUTH_REQUIRED
- `403`: FORBIDDEN
- `404`: NOT_FOUND

---

### 8. 点赞世界观

**Endpoint**: `POST /api/worlds/[id]/like`

**Auth**: Required

**Response** (200):
```typescript
{
  like_count: number;
  has_liked: true;
}
```

**Error Responses**:
- `401`: AUTH_REQUIRED
- `403`: FORBIDDEN
- `404`: NOT_FOUND

---

### 9. 取消点赞世界观

**Endpoint**: `DELETE /api/worlds/[id]/like`

**Auth**: Required

**Response** (200):
```typescript
{
  like_count: number;
  has_liked: false;
}
```

**Error Responses**:
- `401`: AUTH_REQUIRED
- `403`: FORBIDDEN
- `404`: NOT_FOUND

---

### 10. 获取世界观评论列表

**Endpoint**: `GET /api/worlds/[id]/comments`

**Auth**: Optional

**Query Parameters**:
- `page?`: `number` - 页码，默认 1
- `limit?`: `number` - 每页数量，默认 20

**Response** (200):
```typescript
{
  comments: Array<{
    uuid: string;
    user_uuid: string;
    content: string;
    parent_uuid?: string | null;
    reply_to_user_uuid?: string | null;
    like_count: number;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

**Error Responses**:
- `403`: FORBIDDEN（非公开世界观）
- `404`: NOT_FOUND

---

### 11. 新增世界观评论

**Endpoint**: `POST /api/worlds/[id]/comments`

**Auth**: Required

**Request Body**:
```typescript
{
  content: string;                // 1-1000 字符
  parent_uuid?: string | null;    // 回复某条评论
  reply_to_user_uuid?: string | null;
}
```

**Response** (201):
```typescript
{
  uuid: string;
  content: string;
  user_uuid: string;
  parent_uuid?: string | null;
  reply_to_user_uuid?: string | null;
  like_count: number;
  created_at: string;
  updated_at: string;
  comment_count: number;          // 世界观评论总数
}
```

**Error Responses**:
- `400`: VALIDATION_FAILED
- `401`: AUTH_REQUIRED
- `403`: FORBIDDEN
- `404`: NOT_FOUND

---

### 12. 删除世界观评论

**Endpoint**: `DELETE /api/worlds/[id]/comments/[commentId]`

**Auth**: Required

**Response** (204): 无内容

**Error Responses**:
- `401`: AUTH_REQUIRED
- `403`: FORBIDDEN（非作者或无权限）
- `404`: NOT_FOUND

---

### 13. 分享世界观

**Endpoint**: `POST /api/worlds/[id]/share`

**Auth**: Required

**Request Body**:
```typescript
{
  channel?: string;      // e.g. twitter, discord, link
  ref?: string;          // 追踪标识
}
```

**Response** (200):
```typescript
{
  share_count: number;
  share_url: string;
}
```

**Error Responses**:
- `401`: AUTH_REQUIRED
- `403`: FORBIDDEN
- `404`: NOT_FOUND

## 实现细节

### 缓存策略

- **读取缓存**（Server Memory Cache）：
  - Key 格式：`world:{identifier}`、`worlds:list:{...}`、`worlds:user:{creator_uuid}:{...}`
  - TTL：1 小时
  - 更新世界观后自动清除相关缓存

- **列表缓存**：
  - 预置世界观列表缓存 5 小时（`worlds:preset`）
  - 用户自定义列表缓存 1 小时（`worlds:user:{creator_uuid}:`）

### 数据库索引

- 关键索引：`uniq_oc_worlds_creator_slug`、`idx_oc_worlds_creator_uuid`、`idx_oc_worlds_visibility_level`、`idx_oc_worlds_is_preset`
- 迁移文件：`src/db/migrations/0009_worlds_slug_scope.sql`

### 社交数据来源

- 明细记录：`user_interactions`（like/favorite/share）与 `comments`（评论内容）。
- 统计字段：`oc_worlds.like_count/favorite_count/comment_count/share_count` 冗余存储。
- 评论列表默认过滤 `is_deleted = false`。
- 分享追踪信息写入 `user_interactions.metadata`（如 `channel`、`ref`）。

### 错误码约定

- `AUTH_REQUIRED`: 未登录
- `FORBIDDEN`: 无权限或非公开世界观
- `NOT_FOUND`: 资源不存在
- `VALIDATION_FAILED`: 参数校验失败

### 错误处理

- 创建时检查名称唯一性（per user）
- 删除时检查是否被角色引用
- 更新时需要验证 config 的 URL 字段可访问性

---

## 变更历史

- 2026-01-08 FEAT-OC-REBUILD 初始版本，定义世界观 API 契约
  - 实现文件：`src/app/api/worlds/route.ts`、`src/services/world.ts`
  - 关联模型：`src/models/oc-world.ts`
- 2026-01-22 FEAT-WORLDS 增加世界观可见性等级与订阅限制（影响：API/服务/模型）
- 2026-01-28 FEAT-WORLDS 增加 allow_join 字段与列表过滤规则（影响：API/服务/模型）
