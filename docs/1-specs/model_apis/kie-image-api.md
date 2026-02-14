## 说明：

1. 积分以项目配置为准（见 `src/configs/models/ai-models.json`）。若模型对分辨率/时长敏感，按“基价 × 系数”计费，由计费层统一折算。
2. 新版/旧版API格式及平台使用见 @docs/1-specs/model_apis/kie_api_specs.md

## gpt-4o-image

### API版本-旧版API

### model_Id：

gpt4o-image

### 输入参数

见 kie说明文档 旧版api示例

- 参考图：通过 `filesUrl` 是否有值自动分流

### 计费

基准 `credits_per_generation = 30`（示例）；`nVariants`>1 时按倍数计费

## nano banana

### API版本-新版API

### model_id

- 文生图：`google/nano-banana`
- 图生图：`google/nano-banana-edit`（`input.image_urls` 必填）

### 输入参数

见 kie说明文档 新版api示例

### 计费：基准 `credits_per_generation = 30` `-edit` 与基准相同

## Seedream 4.0

### API版本-新版API

### 模型id：

- bytedance/seedream-v4-edit (图生图)
- bytedance/seedream-v4-text-to-image (文生图)
  **由有无image_urls决定使用哪个model**

### 请求参数：

- model: ${model_id}
- callbackUrl:
- input,输入参数，如下
  - prompt: 提示词（必选）
  - image_urls: List of URLs of input images for editing. Presently, up to 10 image inputs are allowed. (可选，最多10张)
  - image_size,The size of the generated image.,取值包括：[square,square_hd,portrait_3_4,portrait_2_3,portrait_9_16,landscape_4_3, landscape_3_2,landscape_16_9,landscape_21_9],默认square_hd, 可以使用nano banana标准的表达： 3:4,之后通过adapter映射到：portrait_3_4去请求kie AI.
  - image_resolution: Final image resolution is determined by combining image_size (aspect ratio) and image_resolution (pixel scale). For example, choosing 4:3 + 4K gives 4096 × 3072px, 取值范围：[1K,2K,4K] ,默认2k
  - max_images: 默认1 （不提供）

请求示例

```json
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "bytedance/seedream-v4-edit",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "flying bird",
      "image_urls": [
        "https://file.aiquickdraw.com/custom-page/akr/section-images/1757930552966e7f2on7s.png"
      ],
      "image_size": "square_hd",
      "image_resolution": "1K",
      "max_images": 1
    }
}'
```

### 计费： 35MC

## z-image

**仅支持文生图，不支持参考图片**

### API版本-新版API

### model_id

- z-image

### 请求参数：

- model: ${model_id}
- callbackUrl:
- input,输入参数，如下
  - prompt: 提示词（必选）
  - image_urls: List of URLs of input images for editing. Presently, up to 10 image inputs are allowed. (可选，最多10张)
  - aspect_ratio,分辨率，取值范围：[1:1, 4:3, 3:4, 16:9, 9:16],默认1:1

### 请求示例：

```json
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "z-image",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "A hyper-realistic, close-up portrait of a 30-year-old mixed-heritage French-Italian woman drinking coffee from a cup that says “Z-Image × Kie AI.” Natural light. Shot on a Leica M6 with a Kodak Portra 400 film-grain aesthetic.",
      "aspect_ratio": "1:1"
    }
}'
```

### 计费：8MC

## nano banana pro ( (Premium))

### API版本： 新版API

### model_id:

- "nano-banana-pro"(文生图、图生图统一)

### 请求参数：

在 nano banana 基础上改动：

- resolution: 取值范围 [1K, 2K, 4K] 默认 2K
- image_size 改名为aspect_ratio（可选默认auto）
- image_urls 改名为image_input（可选）

文生图请求示例：

```bash
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -d '{
    "model": "nano-banana-pro",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "A beautiful anime girl with long pink hair",
      "output_format": "png",
      "aspect_ratio": "auto",
      "resolution": "2k"
    }
  }'
```

图生图请求示例：

```bash
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -d '{
    "model": "nano-banana-pro",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "Transform into anime style",
      "image_urls": ["https://example.com/input.jpg"],
      "output_format": "png",
      "aspect_ratio": "1:1",
      "resolution": "4k"
    }
  }'
```

### 计费：单张 60MC

## Seedream 4.5 (Premium)

### API版本-新版API

### 模型id：

- seedream/4.5-edit (图生图)
- seedream/4.5-text-to-image (文生图)
  **由有无image_urls决定使用哪个model**

### 请求参数：

- model: ${model_id}
- callbackUrl:
- input,输入参数，如下
  - prompt: 提示词（必选）,Max length: 3000 characters
  - image_urls: List of URLs of input images for editing. Presently, up to 14 image inputs are allowed. (可选，最多14张)
  - aspect_ratio: The size of the generated image.,取值包括：[1:1, 4:3, 3;4, 16:9, 9:16, 2:3, 3:2, 21:9], 默认1:1
  - quality: [basic, high] , Basic outputs 2K images, while High outputs 4K images.

请求示例

```json
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "seedream/4.5-edit",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "Keep the model's pose and the flowing shape of the liquid dress unchanged. Change the clothing material from silver metal to completely transparent clear water (or glass). Through the liquid water, the model's skin details are visible. Lighting changes from reflection to refraction.",
      "image_urls": [
        "https://static.aiquickdraw.com/tools/example/1764851484363_ScV1s2aq.webp"
      ],
      "aspect_ratio": "1:1",
      "quality": "basic"
    }
}'
```

### 计费： 65MC/张

## Flux 2 Pro

Flux 2 is Black Forest Labs’ advanced image generation model that delivers photoreal detail, strong multi-reference consistency, and accurate text rendering with flexible control.

### API版本-新版API

### 模型id：

- 文生图模型：flux-2/pro-text-to-image
- 图生图模型：flux-2/pro-image-to-image

### 请求参数：

- `model`: ${model_id}
- `callbackUrl`:
- `input`,输入参数，如下
  - `prompt`: 提示词（必选）字符数：3-5000
  - `input_urls`: List of URLs of input images for editing. Presently, up to 10 image inputs are allowed. (可选，有则为图生图模型，1-8张)
  - `aspect_ratio`: 取值包括：[1:1, 4:3, 3:4, 16:9, 9:16, 2:3, 3:2], 默认auto
  - `resolution`: 1K, 2K

请求示例

```json
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "flux-2/pro-text-to-image",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "Hyperrealistic supermarket blister pack on clean olive green surface. No shadows. Inside: bright pink 3D letters spelling \"FLUX.2\" pressing against stretched plastic film, creating realistic deformation and reflective highlights. Bottom left corner: barcode sticker with text \"GENERATE NOW\" and \"PLAYGROUND\". Plastic shows tension wrinkles and realistic shine where stretched by the volumetric letters.",
      "aspect_ratio": "1:1",
      "resolution": "1K"
    }
}'
```

### 计费

- 1K: 50MC/张
- 2K: 70MC/张

## Flux 2 Flex (Premium)

Flux 2 is Black Forest Labs’ advanced image generation model that delivers photoreal detail, strong multi-reference consistency, and accurate text rendering with flexible control.

### API版本-新版API

### 模型id：

- 本文生图模型：flux-2/flex-text-to-image
- 本图生图模型：flux-2/flex-image-to-image

### 请求参数：

- `model`: ${model_id}
- `callbackUrl`:
- `input`,输入参数，如下
  - `prompt`: 提示词（必选）字符数：3-5000
  - `input_urls`: List of URLs of input images for editing. Presently, up to 10 image inputs are allowed. (可选，有则为图生图模型，1-8张)
  - `aspect_ratio`: 取值包括：[1:1, 4:3, 3:4, 16:9, 9:16, 2:3, 3:2], 默认auto
  - `resolution`: 1K, 2K

请求示例

```json
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "flux-2/flex-image-to-image",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "input_urls": [
        "https://static.aiquickdraw.com/tools/example/1764235158281_tABmx723.png",
        "https://static.aiquickdraw.com/tools/example/1764235165079_8fIR5MEF.png"
      ],
      "prompt": "Replace the can in image 2 with the can from image 1",
      "aspect_ratio": "1:1",
      "resolution": "1K"
    }
}'
```

### 计费

- 1K: 70MC/张
- 2K: 120MC/张

### UI Badge 配置（模型选择器）

- 位置：模型名与 MC 价格之间
- 响应式：小屏空间不足时隐藏
- 配置来源：`src/configs/models/ai-models.json` 中对应模型的 `badges`
- 统一颜色映射：
  - `2K`: `bgColor=#DBEAFE` `textColor=#1D4ED8` `borderColor=#93C5FD`
  - `4K`: `bgColor=#DCFCE7` `textColor=#15803D` `borderColor=#86EFAC`
  - `50%OFF`: `bgColor=#FFE4E6` `textColor=#BE123C` `borderColor=#FDA4AF`
- 基于本文档分辨率能力的 badge 分配：
  - `2K`: Seedream 4.0, Seedream 4.5, nano-banana Pro, Flux 2 Pro, Flux 2 Flex
  - `4K`: Seedream 4.0, Seedream 4.5, nano-banana Pro
  - `50%OFF`: GPT-Image-1, nano-banana Pro, Flux 2 Flex

## 变更历史

- 2026-02-13 FEAT-model-badge 扩展图片模型 badge（2K/4K/50%OFF）并统一颜色映射
- 2026-02-06 FEAT-FLUX2 新增 Flux 2 Pro / Flux 2 Flex 模型参数与计费说明
