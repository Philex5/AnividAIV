**Related**: [feature-studio-tools](../features/feature-studio-tools.md)

# API 契约：Studo Tools

## 当前版本

- Version: v1.0
- Auth: 部分接口需要登录
- Errors: 统一英文

## 接口列表

### 1. GET /api/oc-apps/action-figure/templates

**用途**：获取手办模板配置

**Auth**: 不需要

**位置**：`src/app/api/oc-apps/action-figure/templates/route.ts`

**Query Parameters**: 无

**Response**:

```json
{
  "version": "1.0.0",
  "templates": [
    {
      "id": "classic-standing",
      "name": "Classic Standing",
      "description": "Traditional standing pose with simple base",
      "thumbnail": "/imgs/templates/standing.webp",
      "aspect_ratio": "3:4",
      "prompt": "Professional anime figure, standing pose, detailed PVC material..."
    }
  ]
}
```

**实现逻辑**：

```typescript
import templateConfig from "@/configs/prompts/oc-apps/action-figure-templates.json";

export async function GET() {
  return Response.json(templateConfig);
}
```

**错误响应**：

- 500: Internal server error（文件读取失败）

---

### 2. POST /api/anime-generation/create-task（复用并增补）

**用途**：创建手办图生成任务

**Auth**: Required

**位置**：`src/app/api/anime-generation/create-task/route.ts`

**增补字段**：

```typescript
// 原有字段保持不变
{
  prompt: string;
  model_id: string;
  aspect_ratio: string;  // 由模板决定
  counts: number;
  reference_image_urls?: string[];
  character_uuids?: string[];
  visibility_level: 'public' | 'private';

  // 新增字段（可选）
  gen_type?: string;  // 应用类型标识，如 "action-figure"
}
```

**gen_type 字段说明**：

- 用于标识生成来源应用
- 会写入 `generations.type` 和 `generation_images.gen_type`
- 可用于后续筛选与统计

**示例请求**：

```json
{
  "prompt": "Professional anime figure, standing pose, detailed PVC material, featuring Sakura, character traits: pink hair, green eyes, school uniform, add cape",
  "model_id": "gpt-4o-image",
  "aspect_ratio": "3:4",
  "counts": 2,
  "reference_image_urls": [
    "https://r2.anividai.com/characters/sakura-avatar.webp"
  ],
  "character_uuids": ["char-uuid-123"],
  "gen_type": "action-figure",
  "visibility_level": "private"
}
```

**Response** (与动漫生成器一致):

```json
{
  "generation_uuid": "gen-uuid-456",
  "status": "processing",
  "estimated_time": 30,
  "credits_cost": 10,
  "message": "Generation task created successfully"
}
```

**错误响应**（继承原有错误，无新增）：

- 401: Unauthorized
- 400: Invalid parameters
- 402: Insufficient credits
- 500: Failed to create generation task

---

### 3. GET /api/generation/status/[uuid]（完全复用）

**用途**：查询生成状态

**Auth**: Not required（但仅返回公开或用户自己的生成）

**位置**：`src/app/api/generation/status/[uuid]/route.ts`

**无需改动**，现有实现已支持所有 `type` 类型。

---

### 4. POST /api/generation/webhook（完全复用）

**用途**：接收生成服务回调

**Auth**: Internal（验证来源）

**位置**：`src/app/api/generation/webhook/route.ts`

**无需改动**，现有实现已支持所有 `type` 类型。

---

### 5. GET /api/anime-generation/history（可选增强）

**用途**：查询用户生成历史

**Auth**: Required

**位置**：`src/app/api/anime-generation/history/route.ts`

**可选增强**（未来）：增加 `gen_type` 筛选参数

**Query Parameters**:

```
page=1
limit=20
status=completed|failed|pending|processing
gen_type=action-figure|anime  // 可选，筛选特定应用类型
```

**Response**（保持不变）：

```json
{
  "records": [
    {
      "uuid": "gen-uuid-456",
      "type": "action-figure",
      "status": "completed",
      "created_at": "2025-10-31T10:00:00Z",
      "images": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 数据流说明

### 创建任务流程

```
前端 ActionFigureTool
  ↓
构造完整 prompt（模板 + OC + 用户补充）
  ↓
POST /api/anime-generation/create-task
  ↓
AnimeGenerationService.createGeneration()
  ↓
写入 generations 表（type: "action-figure"）
扣除积分
调用 KieAI 创建远程任务
  ↓
返回 generation_uuid 给前端
  ↓
前端开始轮询状态
```

### Webhook 回调流程

```
KieAI 完成生成
  ↓
POST /api/generation/webhook
  ↓
BaseGenerationService.handleWebhookCallback()
  ↓
上传图片到 R2
写入 generation_images 表（gen_type: "action-figure"）
更新 generations.status = "completed"
  ↓
前端轮询获取到完成状态
  ↓
展示结果
```

---

## 错误码规范

| 错误码                   | HTTP Status | 说明       | 前端处理              |
| ------------------------ | ----------- | ---------- | --------------------- |
| UNAUTHORIZED             | 401         | 未登录     | 跳转登录页            |
| INVALID_PARAMETERS       | 400         | 参数错误   | Toast 提示具体错误    |
| INSUFFICIENT_CREDITS     | 402         | 积分不足   | Toast + 跳转 /pricing |
| INVALID_MODEL            | 400         | 模型不存在 | Toast 提示            |
| GENERATION_FAILED        | 500         | 生成失败   | 显示错误 + 重试按钮   |
| CREDITS_DEDUCTION_FAILED | 500         | 扣费失败   | 联系客服              |

---

## 测试用例

### 1. 模板配置读取

```bash
curl -X GET https://anividai.com/api/oc-apps/action-figure/templates
```

**预期**：返回 JSON 格式的模板列表

---

### 2. 创建手办图任务（上传图片）

```bash
curl -X POST https://anividai.com/api/anime-generation/create-task \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Professional anime figure, standing pose...",
    "model_id": "gpt-4o-image",
    "aspect_ratio": "3:4",
    "counts": 1,
    "reference_image_urls": ["https://..."],
    "gen_type": "action-figure"
  }'
```

**预期**：返回 `generation_uuid`，积分正确扣除

---

### 3. 创建手办图任务（使用 OC）

```bash
curl -X POST https://anividai.com/api/anime-generation/create-task \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Professional anime figure, standing pose, featuring Sakura...",
    "model_id": "gpt-4o-image",
    "aspect_ratio": "3:4",
    "counts": 2,
    "reference_image_urls": ["https://.../sakura-avatar.webp"],
    "character_uuids": ["char-uuid-123"],
    "gen_type": "action-figure"
  }'
```

**预期**：返回 `generation_uuid`，`character_uuids` 正确记录

---

### 4. 查询生成状态

```bash
curl -X GET https://anividai.com/api/generation/status/gen-uuid-456
```

**预期**：返回状态与结果，`type: "action-figure"`

---

### 5. 查询历史（筛选手办图）

```bash
curl -X GET "https://anividai.com/api/anime-generation/history?gen_type=action-figure" \
  -H "Cookie: session=..."
```

**预期**：仅返回 `gen_type="action-figure"` 的记录

---

## 实现检查清单

- [ ] `GET /api/oc-apps/action-figure/templates` API 创建并返回正确 JSON
- [ ] `POST /api/anime-generation/create-task` 接受并正确处理 `gen_type` 字段
- [ ] `generations.type` 正确记录为 "action-figure"
- [ ] `generation_images.gen_type` 正确记录为 "action-figure"
- [ ] Webhook 回调正常处理手办图类型
- [ ] 历史查询可选按 `gen_type` 筛选（可选增强）
- [ ] 错误响应符合规范，英文提示
- [ ] 积分计费与动漫生成器一致
- [ ] 测试用例全部通过

---

## 变更历史

- 2025-10-31 v1.0 创建 Studo Tools API 契约文档（MVP: Action Figure Generator）
