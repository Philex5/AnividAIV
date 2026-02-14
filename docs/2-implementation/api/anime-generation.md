**Related**:
- 总体架构：`docs/2-implementation/backend/service-generation-architecture.md`
- 图片服务：`docs/2-implementation/backend/service-anime-generation.md`
- 统一能力：`docs/2-implementation/api/generation.md`
- Feature：`docs/2-implementation/features/feature-ai-anime-generator.md`
- Feature：`docs/2-implementation/features/feature-generator-modals.md`

# API 契约：Anime Image Generation

## 当前版本
- Version: v1.0
- Auth: 需要登录
- Errors: 统一英文

## 接口列表

### 1. 优化提示词
- **Endpoint**: `POST /api/anime-generation/optimize-prompt`
- **用途**: 调用 LLM 优化用户输入的 prompt
- **Auth**: Required
- **文件位置**: `src/app/api/anime-generation/optimize-prompt/route.ts`
- **Request**:
  ```json
  {
    "prompt": "原始提示词",
    "style": "可选风格",
    "scene": "可选场景",
    "outfit": "可选服装"
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

### 2. LLM 提取层构建提示词（待实现）
- **Endpoint**: `POST /api/anime-generation/build-extract-prompt`
- **用途**: 基于模板配置与变量输入构建最终提示词（用于无弹窗/弹窗生成）
- **Auth**: Required
- **文件位置**: 待实现（建议：`src/app/api/anime-generation/build-extract-prompt/route.ts`）
- **Request**:
  ```json
  {
    "template_key": "world-cover",
    "template_params": {
      "world_name": "Aetheria",
      "world_genre": "Fantasy",
      "world_description": "Floating islands and ancient ruins...",
      "scene_hint": ""
    },
    "use_llm_build": true
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "prompt": "A vast floating archipelago under a golden sky..."
    }
  }
  ```
- **错误码**:
  - `TEMPLATE_NOT_FOUND` (404): 模板不存在
  - `REQUIRED_FIELD_MISSING` (400): 缺少必填字段
  - `LLM_BUILD_FAILED` (502): LLM 构建失败
  - `PROMPT_EMPTY` (500): 构建结果为空

### 3. 创建生图任务
- **Endpoint**: `POST /api/anime-generation/create-task`
- **用途**: 创建生图任务（支持 Anime 和 ActionFigure 两种类型）
- **Auth**: Required
- **文件位置**: `src/app/api/anime-generation/create-task/route.ts`

#### Anime 类型参数
```json
{
  "gen_type": "anime",
  "prompt": "提示词",
  "style_preset": "可选",
  "scene_preset": "可选",
  "outfit_preset": "可选",
  "action_preset": "可选",
  "character_uuids": ["角色UUID"],
  "aspect_ratio": "1:1",
  "image_resolution": "2K",  //部分模型有该参数
  "model_uuid": "模型UUID",  //对应配置的model_id
  "batch_size": 1,
  "reference_image_urls": ["图片URL"],
  "visibility_level": "public"
}
```

#### ActionFigure 类型参数
```json
{
  "gen_type": "action_figure",
  "template_id": "模板ID",
  "template_prompt": "模板提示词",
  "user_prompt": "用户自定义提示词",
  "character_uuids": ["角色UUID"],
  "aspect_ratio": "3:4",
  "image_resolution": "2K",
  "style_preset": "可选",
  "scene_preset": "可选",
  "outfit_preset": "可选",
  "action_preset": "可选",
  "model_uuid": "模型UUID",
  "batch_size": 1,
  "reference_image_urls": ["图片URL"],
  "visibility_level": "public"
}
```

- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "generation_uuid": "gen-uuid",
      "status": "pending"
    }
  }
  ```

### 4. 获取生成历史
- **Endpoint**: `GET /api/anime-generation/history`
- **用途**: 查询当前用户的生成历史，返回每条 generation 关联的图片
- **Auth**: Required
- **文件位置**: `src/app/api/anime-generation/history/route.ts`
- **Query Parameters**:
  - `page`: 页码（默认 1）
  - `limit`: 每页数量（默认 20）
  - `status`: 状态筛选（completed/failed/pending/processing）
- **Response**:
  ```json
  {
    "data": {
      "records": [...],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "totalPages": 5,
        "hasNext": true,
        "hasPrev": false
      }
    }
  }
  ```

## 权限说明
- `visibility_level` 为 `private` 时，需要 Pro 会员权限
- 角色立绘生成需要验证角色归属权

## 变更历史
- 2025-11-21 v1.1 增强参数复用功能
  - 新增 `image_resolution` 参数支持
  - 优化参数保存机制，确保复用时完整恢复所有生成设置
  - 修复 `gen_image_id` 复用时 aspect_ratio 丢失的问题
  - 文件影响：base-generation-service.ts, anime-generation/create-task/route.ts, AnimeGenerator.tsx
- 2025-10-20 v1.0 首次补齐
