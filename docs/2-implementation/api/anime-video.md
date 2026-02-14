**Related**:
- 总体架构：`docs/2-implementation/backend/service-generation-architecture.md`
- 视频服务：`docs/2-implementation/backend/service-anime-video-generation.md`
- 统一能力：`docs/2-implementation/api/generation.md`

# API 契约：Anime Video Generation

## 当前版本
- Version: v1.2
- Auth: 需要登录
- Errors: 统一英文
- 支持模型: Wan 2.5, Sora-2, Sora-2 Pro, Kling 2.5, Kling 3.0

## 支持的视频生成模型

### Wan 2.5 (kie-ai)
- **model_id**: `wan/2.5`
- **能力**: 文生视频、图生视频
- **分辨率**: 720p (标准), 1080p (高质量)
- **宽高比**: 1:1, 9:16, 16:9
- **时长**: 5秒, 10秒
- **计费标准**:
  - 720p 5秒: 300 MC
  - 720p 10秒: 600 MC
  - 1080p 5秒: 500 MC
  - 1080p 10秒: 1000 MC
- **API Endpoint**: `https://api.kie.ai/api/v1/jobs/createTask`
- **特性**: 支持OC角色和参考图自动切换

### Kling 2.5 (kie-ai)
- **model_id**: `kling/video-v2.5`
- **能力**: 文生视频、图生视频
- **分辨率**: 720p, 1080p
- **时长**: 5秒, 10秒
- **计费标准**: 210 MC (基础)
- **API Endpoint**: `https://api.kie.ai/api/v1/kling/video/createTask`

### Kling 3.0 (kie-ai, premium)
- **model_id**: `kling-3.0/video`
- **能力**: 文生视频、图生视频（支持首尾帧）
- **模式**: `std`, `pro`
- **多镜头**: `multi_shots`（开启时必须提供首帧图，且仅使用首帧）
- **宽高比**: 1:1, 9:16, 16:9
- **图片参数**: `reference_image_urls`（最多 2 张；非 multi-shot 可不传，multi-shot 必须 1 张首帧）
- **计费标准**:
  - `std`: 1050 MC（KIE credit * 5）
  - `pro`: 2100 MC（KIE credit * 5）
- **API Endpoint**: `https://api.kie.ai/api/v1/jobs/createTask`

### Sora-2 (kie-ai)
- **model_id**: `sora-2`
- **能力**: 文生视频、图生视频、多图生视频
- **时长**: 10秒, 15秒
- **宽高比**: 横屏、竖屏
- **计费标准**: 30-40 MC

### Sora-2 Pro (kie-ai)
- **model_id**: `sora-2-pro`
- **能力**: 文生视频、图生视频、多图生视频
- **时长**: 10秒, 15秒
- **质量**: 标准、高质量
- **计费标准**: 180-800 MC

## 接口列表

### 1. 创建视频生成任务
- **Endpoint**: `POST /api/anime-video/create-task`
- **用途**: 创建视频生成任务
- **Auth**: Required
- **文件位置**: `src/app/api/anime-video/create-task/route.ts`
- **Request**:
  ```json
  {
    "prompt": "视频描述提示词",
    "model_id": "模型ID",
    "aspect_ratio": "16:9",
    "task_subtype": "text_to_video",
    "duration_seconds": 5,
    "resolution": "720p",
    "mode": "std",
    "multi_shots": false,
    "motion": "optional",
    "style_preset": "optional",
    "reference_image_url": "optional",
    "reference_image_urls": ["optional-start-frame", "optional-end-frame"],
    "character_uuid": "optional",
    "visibility_level": "public"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "generation_uuid": "gen-uuid",
      "status": "processing",
      "estimated_time": 20,
      "credits_cost": 30,
      "message": "Generation task created successfully"
    }
  }
  ```

### 2. 优化视频提示词
- **Endpoint**: `POST /api/anime-video/optimize-prompt`
- **用途**: 调用 LLM 优化视频生成提示词
- **Auth**: Required
- **文件位置**: `src/app/api/anime-video/optimize-prompt/route.ts`
- **Request**:
  ```json
  {
    "prompt": "原始提示词",
    "style": "视频风格",
    "duration": "3s"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "original_prompt": "原始提示词",
      "optimized_prompt": "优化后的提示词",
      "improvements": ["改进点1", "改进点2"]
    }
  }
  ```

### 3. 获取视频生成报价
- **Endpoint**: `POST /api/anime-video/quote`
- **用途**: 获取视频生成任务的积分消耗报价
 - **Auth**: Required（当前实现不扣费）
 - **文件位置**: `src/app/api/anime-video/quote/route.ts`
 - **Request**:
  ```json
  {
    "model_id": "模型ID",
    "task_subtype": "text_to_video",
    "duration_seconds": 5,
    "resolution": "720p",
    "mode": "std",
    "multi_shots": false,
    "aspect_ratio": "16:9",
    "reference_image_url": "optional",
    "reference_image_urls": ["optional-start-frame", "optional-end-frame"]
  }
  ```
- **Response**:
  ```json
  {
    "estimated_credits": 50,
    "explain": "..."
  }
  ```

### 4. 统一状态查询
- **Endpoint**: `GET /api/generation/status/{generation_uuid}`
- **用途**: 查询所有生成任务的状态（图片、视频统一入口）
- **Auth**: Required
- **文件位置**: `src/app/api/generation/status/[generation_uuid]/route.ts`
- **Response**:
  ```json
  {
    "uuid": "gen-uuid",
    "status": "pending|processing|completed|failed",
    "results": [
      {
        "image_url": "https://.../result.mp4"
      }
    ],
    "error_message": null,
    "credits_used": 12
  }
  ```

### 5. 统一 Webhook
- **Endpoint**: `POST /api/generation/webhook`
- **用途**: 处理生成提供方的回调通知
- **文件位置**: `src/app/api/generation/webhook/route.ts`
- 支持多种提供方的统一回调入口

## 变更历史
- 2026-02-13 v1.2 对齐 Kling 3.0 图参约束：multi-shot 必须首帧，非 multi-shot 可无图
- 2026-02-11 v1.2 新增 Kling 3.0 premium（`kling-3.0/video`）参数契约与报价参数 `mode`
- 2025-11-20 v1.1 新增 Wan 2.5 模型支持，更新计费标准（720p 5s=300MC, 1080p 5s=500MC, 1080p 10s=1000MC）
- 2025-10-20 v1.0 首次补齐
