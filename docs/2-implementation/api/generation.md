**Related**:
- 总体架构：`docs/2-implementation/backend/service-generation-architecture.md`
- 图片服务：`docs/2-implementation/backend/service-anime-generation.md`
- 视频服务：`docs/2-implementation/backend/service-anime-video-generation.md`

# API 契约：Generation（统一）

## 当前版本
- Version: v1.0
- Auth: 视接口而定
- Errors: 统一英文

## 状态与结果

- GET /api/generation/status/[generation_uuid]
  - 用途：查询生成状态（只读，不写 DB）
  - Auth: Required（且需资源归属校验）
  - 位置：`src/app/api/generation/status/[generation_uuid]/route.ts`
  - Response: `{ uuid, status, progress, results, error_message, created_at, batch_size, credits_used, message }`

- GET /api/generation/image/[uuid]
  - 用途：获取单张生成图片详情（带关联 OC 与权限判断）
  - Auth: 公开图无需登录；私有图需登录且归属校验
  - 位置：`src/app/api/generation/image/[uuid]/route.ts`
  - Response: `data` 包含 `user_uuid`（图片 owner）、`generation`（新增 `user_uuid` 字段）和关联 `characters`

- GET /api/generation/image-resolve/[uuid]
  - 用途：获取当前设备适配的生成图片 URL（轻量解析，不携带 OC 关联与复杂权限逻辑）
  - Auth: 公开图无需登录；私有图需登录且归属校验
  - 位置：`src/app/api/generation/image-resolve/[uuid]/route.ts`
  - Request:
    ```json
    {
      "size": "auto | desktop | mobile" // 可选，默认 auto（由服务端根据 UA/设备推断）
    }
    ```
  - Response:
    ```json
    {
      "data": {
        "uuid": "img-xxx",
        "user_uuid": "user-xxx",
        "resolved_url": "https://.../thumb_desktop.webp",
        "original_url": "https://.../original.webp",
        "size": "desktop"
      }
    }
    ```
  - 说明：
    - 数据来自 `generation_images` 的已有字段（缩略图或原图），不新增字段
    - 优先返回设备匹配的缩略图，无法匹配时回退到原图
    - 不返回 `generation` 与 `characters`，用于前端轻量展示场景
    - size 判定规则：
      - `size` 参数显式传入时优先使用（`desktop`/`mobile`）
      - `size=auto` 时使用 `sec-ch-ua-mobile` 或 `user-agent` 推断设备
      - 解析顺序：
        - desktop: `thumb_desktop` -> `thumb` -> `original`
        - mobile: `thumb_mobile` -> `thumb` -> `original`
      - 推断失败默认按 `desktop` 处理
  - Errors:
    - `invalid uuid` (400)
    - `not found` (404)
    - `permission denied` (403)
    - `resolve image failed` (500)
  - Cache:
    - 服务端可按 `uuid + size` 做短缓存（建议 5-30 分钟）
    - 响应可设置 `Cache-Control: private, max-age=300`

## Webhook 与失败处理

- POST /api/generation/webhook
  - 用途：KieAI 等回调统一入口（写入结果与更新 generation 状态）
  - Auth: Required（token 鉴权：`/api/generation/webhook?token=...`；并校验 `resultUrls` allowlist）
  - 位置：`src/app/api/generation/webhook/route.ts`
  - 语义：根据不同模型回调结构，解析 state / resultUrls / failMsg，并调用 service `handleWebhookCallback`

- POST /api/generation/handle-failure
  - 用途：轮询失败/网络错误等场景的统一兜底处理（确保退款幂等）
  - Auth: Required（`Authorization: Bearer $INTERNAL_API_SECRET` 或登录态 + owner 校验）
  - 位置：`src/app/api/generation/handle-failure/route.ts`

## 伪代码
```
GET /status/{id}:
  assert(auth && ownership)
  status = getGenerationStatus(id)
  return status

POST /webhook:
  payload = parse()
  ({state, resultUrls, failMsg} = adaptByProvider(payload))
  handleWebhookCallback(taskId, state, resultUrls, failMsg)
  return 200

POST /handle-failure:
  service = generationServiceFactory.resolveServiceByStoredType(...)
  service.safeHandlePollingFailure(generation_uuid, reason, error_type)
```

## 变更历史
- 2025-10-21 FEAT-action-figure: `/api/generation/image/:uuid` 的 `generation` 对象补充 `user_uuid`
- 2025-10-20 v1.0 首次补齐（状态、图片详情、Webhook、失败处理）
- 2026-01-25 FEAT-IMAGE-ASSET-UNIFY 新增轻量解析接口 `/api/generation/image-resolve/:uuid`（设备适配与回退规则）
