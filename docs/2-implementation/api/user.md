**Related**: 用户中心（控制台）

# API 契约：User Management

## 当前版本
- Version: v1.0
- Auth: 需要登录（基于 NextAuth 会话）
- Errors: 统一英文

## 接口列表

### 1. 获取用户信息
- **Endpoint**: `POST /api/get-user-info`
- **用途**: 获取当前登录用户的详细信息（含 credits 与是否管理员）
- **Auth**: Required
- **文件位置**: `src/app/api/get-user-info/route.ts`
- **Request**: 无 body（POST 仅为统一风格）
- **Response**:
  ```json
  {
    "data": {
      "uuid": "user-uuid",
      "email": "user@example.com",
      "name": "User Name",
      "membership_level": "free",
      "credits": {
        "left_credits": 100,
        "is_recharged": true
      },
      "is_admin": false
    }
  }
  ```
- **错误**:
  - `no auth` (401)
  - `user not exist` (404)
  - `get user info failed` (500)

### 2. 获取用户积分详情
- **Endpoint**: `POST /api/get-user-credits`
- **用途**: 查询当前登录用户的积分聚合摘要（后端聚合）
- **Auth**: Required
- **文件位置**: `src/app/api/get-user-credits/route.ts`
- **Request Body**（可选）:
  - `window`: `all | 30d | 7d`（默认 `all`）
  - `type`: `all | in | out`（默认 `all`）
  - `includeTimeline`: `boolean`（默认 `false`）
  - `limit`: `number`（时间线条数，默认 50，最大 5000）
- **Response**:
  ```json
  {
    "data": {
      "balance": 120,
      "totalEarned": 300,
      "totalUsed": 180,
      "expiringCredits": 20,
      "expiringAt": "2025-11-01T00:00:00.000Z",
      "lastEventAt": "2025-10-29T10:00:00.000Z",
      "window": "all",
      "type": "all",
      "left_credits": 120,
      "timeline": [...]
    }
  }
  ```
- **错误**: `ERR_CREDITS_AGGREGATION_FAILED` (500)

### 3. 获取用户余额
- **Endpoint**: `GET /api/get-user-balance`
- **用途**: 快速获取用户当前积分余额
- **Auth**: Required
- **文件位置**: `src/app/api/get-user-balance/route.ts`
- **Response**:
  ```json
  {
    "data": {
      "balance": 120
    }
  }
  ```

### 4. 获取即将过期的积分
- **Endpoint**: `GET /api/get-expiring-credits`
- **用途**: 获取用户即将过期的积分信息
- **Auth**: Required
- **文件位置**: `src/app/api/get-expiring-credits/route.ts`
- **Response**:
  ```json
  {
    "data": {
      "expiringCredits": 20,
      "expiringAt": "2025-11-01T00:00:00.000Z"
    }
  }
  ```

### 5. 获取会员状态
- **Endpoint**: `GET /api/membership/status`
- **用途**: 获取用户会员等级状态
- **Auth**: Required
- **文件位置**: `src/app/api/membership/status/route.ts`
- **说明**: 详细文档请参考 [membership.md](./membership.md)
- **Response**:
  ```json
  {
    "data": {
      "level": "free",
      "features": [...]
    }
  }
  ```

### 6. 批量获取用户角色头像
- **Endpoint**: `GET /api/users/character-avatars`
- **用途**: 批量获取指定用户的角色头像 URL
- **Auth**: Optional（公开接口，但登录用户可查看更多信息）
- **文件位置**: `src/app/api/users/character-avatars/route.ts`
- **Request**: Query Parameters
  ```
  ?user_uuids=uuid1,uuid2,uuid3
  ```
- **Response**:
  ```json
  {
    "data": {
      "avatars": {
        "user-uuid-1": "https://cdn.anivid.ai/avatars/xxx.webp",
        "user-uuid-2": "https://cdn.anivid.ai/avatars/yyy.webp",
        "user-uuid-3": null
      }
    }
  }
  ```
- **说明**:
  - 批量查询多个用户的默认角色头像
  - 用于社区列表等场景显示用户头像
  - 未设置头像的用户返回 null
- **错误**:
  - `invalid user uuids` (400)
  - `get avatars failed` (500)

### 7. 用户详情页（公开 profile）

- **Endpoint**: `GET /api/users/[id]/profile`
- **用途**: 获取用户公开资料（头像、显示名、简介、背景图等）
- **Auth**: Optional
- **文件位置**: `src/app/api/users/[id]/profile/route.ts`
- **Response**:
  ```json
  {
    "data": {
      "uuid": "user-uuid",
      "display_name": "User Name",
      "avatar_url": "https://cdn.anivid.ai/avatars/xxx.webp",
      "bio": "Short bio",
      "gender": "other",
      "background_url": "https://cdn.anivid.ai/backgrounds/xxx.webp",
      "is_self": false,
      "stats": {
        "public_characters": 12,
        "public_worlds": 3,
        "public_artworks": 48
      }
    }
  }
  ```
- **说明**:
  - `avatar_url` / `background_url` 返回**存储引用**（URL 或 `image_uuid`），前端需统一解析后展示
  - 当 `avatar_url` 为 `image_uuid` 时，允许展示用户本人作品，即使作品为私有
  - 如需上传：`type=user_upload`，`sub_type=user_avatar | user_background`
- **错误**:
  - `Profile not found` (404)
  - `Failed to load profile` (500)

### 8. 更新用户 Profile（本人）

- **Endpoint**: `PUT /api/users/[id]/profile`
- **用途**: 更新本人 Profile（用户名/头像/性别/简介/背景图）
- **Auth**: Required
- **文件位置**: `src/app/api/users/[id]/profile/route.ts`
- **权限**: 以会话用户为准，路径 `id` 仅用于路由/404；不匹配返回 `Unauthorized` 或 `Forbidden`
- **Request**:
  ```json
  {
    "display_name": "New Name",
    "avatar_url": "https://cdn.anivid.ai/avatars/new.webp",
    "gender": "female",
    "bio": "Updated bio",
    "background_url": "https://cdn.anivid.ai/backgrounds/new.webp"
  }
  ```
- **说明**:
  - `avatar_url` / `background_url` 支持 URL 或 `image_uuid`
  - 当 `avatar_url` 为 `image_uuid` 时，必须校验该 UUID 归属当前用户
  - 允许引用私有作品作为头像
- **Response**:
  ```json
  {
    "data": {
      "uuid": "user-uuid",
      "display_name": "New Name",
      "avatar_url": "https://cdn.anivid.ai/avatars/new.webp",
      "bio": "Updated bio",
      "gender": "female",
      "background_url": "https://cdn.anivid.ai/backgrounds/new.webp"
    }
  }
  ```
- **错误**:
  - `Unauthorized` (401)
  - `Invalid payload` (400)
  - `Profile not found` (404)
  - `Invalid avatar reference` (400)

### 9. 用户公开内容列表

- **Endpoint**: `GET /api/users/[id]/public-characters`
  - 用途：获取用户公开角色列表
  - Auth: No
  - 位置：`src/app/api/users/[id]/public-characters/route.ts`（待新增）
  - Query: `page, limit`

- **Endpoint**: `GET /api/users/[id]/public-worlds`
  - 用途：获取用户公开世界列表
  - Auth: No
  - 位置：`src/app/api/users/[id]/public-worlds/route.ts`（待新增）
  - Query: `page, limit`

- **Endpoint**: `GET /api/users/[id]/public-artworks`
  - 用途：获取用户公开 artworks 列表
  - Auth: No
  - 位置：`src/app/api/users/[id]/public-artworks/route.ts`（待新增）
  - Query: `page, limit`

## 相关 API

- **会员系统**: 详见 [membership.md](./membership.md)
- **订阅管理**: 详见 [subscriptions.md](./subscriptions.md)
- **邀请返利**: 详见 [affiliate.md](./affiliate.md)

## 变更历史
- 2026-01-19 FEAT-USER-PROFILE 新增用户详情页接口契约
- 2026-01-30 FEAT-USER-PROFILE 头像 URL/UUID 规则与归属校验补充（影响：profile接口）
- 2025-11-12 补充批量获取角色头像接口，添加相关 API 链接
- 2025-10-29 FEAT-credits-calc-optimize 聚合接口改造
- 2025-10-20 v1.0 首次补齐
