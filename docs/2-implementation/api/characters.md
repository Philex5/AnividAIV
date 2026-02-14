**Related**: 角色与作品（OC 展示与资源取用）

# API 契约：Characters

## 当前版本
- Version: v1.0
- Auth: 部分需要登录
- Errors: 统一英文

## 用户角色头像（聚合）

- GET /api/users/character-avatars
  - 用途：当前用户的角色头像列表（分页、不同设备裁剪）
  - Auth: Required（内部校验）
  - 位置：`src/app/api/users/character-avatars/route.ts`
  - Query: `page, limit, deviceType=mobile|desktop|detail|original`
  - Response: `{ characters: [...], page, limit, deviceType, total }`

## 公开角色列表

- GET /api/oc-maker/public/characters
  - 用途：公开角色列表（分页）
  - Auth: No
  - 位置：`src/app/api/oc-maker/public/characters/route.ts`
  - Query: `page, limit, uuids`
  - 备注：`uuids` 传入时忽略分页，按输入顺序返回

## 角色头像/立绘单资源（按角色 UUID）

- GET /api/characters/[uuid]/avatar
  - 用途：获取角色头像图（按设备裁剪）
  - Auth: No
  - 位置：`src/app/api/characters/[uuid]/avatar/route.ts`
  - Query: `device=mobile|desktop|detail|original`

- GET /api/characters/[uuid]/profile
  - 用途：获取角色立绘图（按设备裁剪）
  - Auth: No
  - 位置：`src/app/api/characters/[uuid]/profile/route.ts`
  - Query: `device=mobile|desktop|detail|original`

## 批量资源（按 UUID 列表）

- POST /api/characters/avatars/batch
  - 用途：批量获取角色头像 URL（按设备裁剪）
  - Auth: No
  - 位置：`src/app/api/characters/avatars/batch/route.ts`
  - Body: `{ characterUuids: string[], deviceType? }`

- POST /api/characters/profiles/batch
  - 用途：批量获取角色立绘及相关媒体（较丰富）
  - Auth: No
  - 位置：`src/app/api/characters/profiles/batch/route.ts`
  - Body: `{ characterUuids: string[], deviceType? }`

## 角色作品（按角色 UUID 分组返回）

- GET /api/characters/[uuid]/creations
  - 用途：按作品类型聚合（image/video），带分页与过滤
  - Auth: 使用 `auth()` 获取用户，未登录也可公共访问
  - 位置：`src/app/api/characters/[uuid]/creations/route.ts`
  - Query: `page, limit, type, visibility_level, start_date, end_date`

## 变更历史
- 2025-10-20 v1.0 首次补齐（头像/立绘/批量/作品）
- 2026-01-28 FEAT-OC-REBUILD 公开角色列表支持 `uuids` 批量查询
