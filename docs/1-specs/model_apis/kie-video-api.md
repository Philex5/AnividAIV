说明：积分以项目配置为准（见 `src/configs/models/ai-models.json`）。若模型对分辨率/时长敏感，按“基价 × 系数”计费，由计费层统一折算。

## Wan 2.5

### API版本：新版API

### model_id

- 文生视频模型名：`wan/2-5-text-to-video`
- 图生视频模型名：`wan/2-5-image-to-video`

### 输入参数

- 通用顶层字段：
  - `model` string（必填）：取上述其一
  - `callBackUrl` string（可选）：回调地址
  - `input` object（必填）：见下
    - `prompt` string（文生视频必填；图生视频可选但推荐）
    - `image_url` string（图生视频必填；文生视频不传）根据是否有取值决定model_id
    - `duration` enum<string> '5' or '10' (仅图生视频, 文生视频无该参数，默认5s)
    - `resolution` string：`720p` | `1080p`
    - `aspect_ratio` string： `16:9` | `9:16` | `1:1`
    - `negative_prompt` string:
    - `enable_prompt_expansion` 默认 true (不提供)
    - `seed` number（可选）(不提供)

### 计费：

720p,5s=200MC, 720p,10s=400MC 1080p,5s=350MC, 1080p,10s=700MC

## Kling v2.5 (premium)

### API版本：新版API

### model_id

- kling/v2-5-turbo-image-to-video-pro (图生视频)
- kling/v2-5-turbo-text-to-video-pro (文生视频)
  参考图：`input.image_url` 存在为图生视频

### 请求参数:

-`model`: {model_id}

- `callBackUrl`: "string (optional)",
- `input`: {
  // Input parameters based on form configuration
  - `duration`: 5/10
  - `negative_prompt`: 负面prompt （可选）
  - `cfg_scale`:0-1, step:0.1 指令遵循程度
  - `input.image_url` 参考图片，存在为图生视频
    }

计费：

- 5s : 210MC
- 10s : 420MC

## Kling 3.0 (premium)

### API版本：新版API

### model_id

- `kling-3.0/video`（文生视频 / 图生视频首尾帧）

### 请求参数

- 顶层字段：
  - `model`: 固定为 `kling-3.0/video`
  - `callBackUrl`: string（可选）
  - `input`: object（必填）
    - `prompt`: string（非 `multi-shot` 必填，最大 2500 字符）
    - `duration`: integer（3-15，默认 5）
    - `mode`: `std` | `pro`（默认 `std`）
    - `multi_shots`: boolean（可选，默认 `false`）
    - `multi_prompt`: object[]（`multi_shots=true` 时必填）
      - `prompt`: string（单段提示词）
      - `duration`: integer（单段 3-12）
      - 约束：`multi_prompt.duration` 总和不超过 15
    - `sound`: boolean（可选；`multi_shots=true` 时官方默认开启）
    - `aspect_ratio`: `1:1` | `9:16` | `16:9`
    - `image_urls`: string[]（可选，最多 2 张）
      - 非 `multi_shots`：0-2 张（首帧/尾帧均可选，可不传图）
      - `multi_shots=true`：必须传且仅能传 1 张（作为首帧）
    - `kling_elements`: object[]（暂不支持）
      - `name`: string
      - `description`: string
      - `element_input_urls`: string[]（2-4，图片元素）
      - `element_input_video_urls`: string[]（1，视频元素）
      - 约束：单个元素对象内 `element_input_urls` 与 `element_input_video_urls` 二选一

请求示例：

```json
{
  "model": "kling-3.0/video",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "prompt": "A cinematic anime duel in a rainy alley, dramatic lighting",
    "duration": 5,
    "mode": "std",
    "aspect_ratio": "1:1",
    "sound": true
  }
}
```

说明（按 KIE 官方页面）：

- 任务创建：`POST https://api.kie.ai/api/v1/jobs/createTask`
- 任务查询：`GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...`
- 回调格式与新版统一 `jobs/recordInfo` 返回结构一致
- 支持首尾帧输入：`input.image_urls` 最多 2 张（在 AnividAI 非 multi-shot 场景下可不传）
- `multi_shots=true` 时应传 `multi_prompt`，并满足单段与总时长约束
- Prompt 模板应用规则（AnividAI）：
  - `multi_shots=false`：模板应用到 `input.prompt`
  - `multi_shots=true`：模板逐段应用到 `input.multi_prompt[].prompt`
  - `multi_shots=true` 时不应再用外层 `input.prompt` 作为模板承载字段

前端接入约定（AnividAI）：

- 默认进入首尾帧模式（Start/End Frame），首帧/尾帧均为可选
- 不展示 OC 入口，不传 `character_uuid`
- 当模型支持 multi-shot（当前仅 kling 3.0）时，展示 `multi-shot` 开关
  - 开启后提交 `multi_shots=true`、`multi_prompt`
  - 开启后必须上传首帧图，并屏蔽尾帧上传（`image_urls` 仅第 1 张）

计费（项目实现）：

- 按秒计费（`duration` 秒数参与结算）：
  - Standard（`mode=std`）
    - `sound=false`：`60 MC/s`
    - `sound=true`：`90 MC/s`
  - Pro（`mode=pro`）
    - `sound=false`：`85 MC/s`
    - `sound=true`：`120 MC/s`
- 结算公式：
  - `total_mc = rate_per_second_mc * duration_seconds`
  - `total_usd = usd_per_second * duration_seconds`
- 示例（5s）：
  - Standard + no-audio：`60 * 5 = 300 MC`
  - Pro + with-audio：`120 * 5 = 600 MC`

### UI Badge 配置（模型选择器）

- 位置：模型名与 MC 价格之间
- 响应式：小屏空间不足时隐藏
- 配置来源：`src/configs/models/ai-models.json` 中对应模型的 `badges`
- 核对口径：当前视频模型仅展示营销/权益类 badge；具体分辨率与参数限制以各模型 `ui_config/config` 为准
- 统一颜色映射：
  - `-50%`: `bgColor=#FFE4E6` `textColor=#BE123C` `borderColor=#FDA4AF`
- 视频模型中当前覆盖：
  - `-50%`：Kling 3.0、Sora-2 Pro、Wan 2.5

3. Sora2
   模型列表：

- sora-2-image-to-video (图生视频)
- sora-2-text-to-video (文生视频)
- sora-2-pro-text-to-video (文生视频)
- sora-2-pro-image-to-video (图生视频)

请求参数:
{
`model`: "string",
`callBackUrl`: "string (optional)",
`input`: {
// Input parameters based on form configuration
}
input parameters:

- `prompt`: string
- `aspect_ratio`: portrait,landscape
- `image_urls`: array(URL) 参考图列表，仅图生视频模型
- `n_frames`: string, number of frames(s): 10,15
- `remove_watermark`: true - `size`: standard, hight (仅适用于 Sora2 pro)
  }

计费：

- sora2: 10s -> 100MC; 15s -> 140MC
- sora2 pro: 10s + standard -> 180MC; 15s + standard -> 270MC; 10s + high -> 400MC; 15s + high -> 800MC

## Veo3.1 Fast (premium)

### API版本： 旧版API

### model_id

- veo3_fast # veo3.1快速生成模型，支持文本生成视频和图片生成视频

### 请求参数:

- `prompt` string required 描述所需视频内容的文本提示词。所有生成模式都需要。

- `imageUrls`：string[]图片链接p列表（图片生成视频模式使用）。支持1张图片：生成的视频围绕该图片展开，图片内容会动态呈现
  ​
- `model` :veo3_fast：veo3.1快速生成模型，支持文本生成视频和图片生成视频
  ​
- `generationType`: enum<string> 视频生成模式（可选）。指定不同的视频生成方式：
  - TEXT_2_VIDEO：文生视频 - 仅使用文本提示词生成视频
  - FIRST_AND_LAST_FRAMES_2_VIDEO：传1张图片：基于该图片生成视频

- `watermark` string.可选参数,如果提供，将在生成的视频上添加水印
  ​
- `aspectRatio`: enum<string> 生成视频比例
- 16:9：横屏视频格式，支持生成1080P高清视频（仅16:9比例支持生成1080P）
- 9:16：竖屏视频格式，适合移动端短视频
- Auto：自动模式，视频会根据上传图片更接近16:9还是9:16自动进行居中裁剪。
- 默认值为 16:9。

- `callBackUrl`: string
  ​

### 计费：

- veo3_fast: 300MC

## Hailuo 2.3

Hailuo 2.3 是 MiniMax 的高保真 AI 视频生成模型，旨在创造真实的动作、富有表现力的角色和电影般的视觉效果。它支持文本转视频和图像转视频，能够稳定地处理复杂动作、光照变化以及细腻的面部表情。

### API版本：新版API

### model_id

- 图生视频基本模型名：`hailuo/2-3-image-to-video-standard`
- 图生视频高级模型名：`hailuo/2-3-image-to-video-pro`

### 输入参数

- 通用顶层字段：
  - `model` string（必填）：取上述其一
  - `callBackUrl` string（可选）：回调地址
  - `input` object（必填）：见下
    - `prompt` string（文生视频必填；图生视频可选但推荐）最大字符数：5000
    - `image_url` string（图生视频必填；文生视频不传）根据是否有取值决定model_id, 仅支持1张
    - `duration` enum<string> "6","10" //视频时长（字符串）
    - `resolution` enum<string> ：`768P` | `1080P` **10s不支持1080P**

### 示例

```json
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "hailuo/2-3-image-to-video-pro",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "A graceful geisha performs a traditional Japanese dance indoors. She wears a luxurious red kimono with golden floral embroidery, white obi belt, and white tabi socks. Soft and elegant hand movements, expressive pose, sleeves flowing naturally. Scene set in a Japanese tatami room with warm ambient lighting, shoji paper sliding doors, and cherry blossom branches hanging in the foreground. Cinematic, soft depth of field, high detail fabric texture, hyper-realistic, smooth motion.",
      "image_url": "https://file.aiquickdraw.com/custom-page/akr/section-images/1761736831884xl56xfiw.webp",
      "duration": "6",
      "resolution": "768P"
    }
}'
```

### 计费：

standard模型：6s,768P=125MC，6s,1080P=200MC，10s,768P=200MC
pro模型：6s,768P=200MC，6s,1080P=350MC，10s,768P=400MC

## Wan 2.6 (premium)

### API版本：新版API

### model_id

- 文生视频模型名：`wan/2-6-text-to-video`
- 图生视频模型名：`wan/2-6-image-to-video`
- 视频生视频模型名： `wan/2-5-video-to-video`

### 输入参数

- 通用顶层字段：
  - `model` string（必填）：取上述其一
  - `callBackUrl` string（可选）：回调地址
  - `input` object（必填）：见下
    - `prompt` string（文生视频必填；图生视频可选但推荐）最大字符数：5000
    - `image_urls` list[string]（图生视频必填；文生视频不传）根据是否有取值决定model_id, 最多1张
    - `video_urls` list[sting] 视频生视频必传，其他不传，根据是否有取值决定model_id, 最多1个视频
    - `duration` enum<int> 5,10, 15
    - `resolution` string：`720p` | `1080p`
    - `multi_shots` boolean: false #The multi shots parameter controls the shot composition style during AI video generation, determining whether the generated video is a single continuous shot or multiple shots with transitions.

### 计费：

文生视频/图生视频 720p,5s=350MC 720p,10s=700MC, 720p,15s=1050MC 1080p,5s=525MC 1080p,10s=1045MC 1080p,15s=1575MC

## 变更历史

- 2026-02-13 FEAT-anime-video-generation 修正 Kling 3.0 图参约束：multi-shot 必须首帧，非 multi-shot 首尾帧可选（影响：Kling3.0 参数说明）
- 2026-02-13 FEAT-anime-video-generation 修正 Kling 3.0 multi-shot 模板作用域为 `multi_prompt[].prompt`（影响：Kling3.0 参数说明）
- 2026-02-13 FEAT-model-badge-video-fix 回滚视频模型 `2K/4K` badge（Sora2/Kling2.5/Hailuo 等不支持该分辨率标识，按真实能力修正）
- 2026-02-13 FEAT-model-badge-video-all 扩展 `2K/4K` badge 到全部视频模型并完成配置核对（影响：video model badges/docs）
- 2026-02-13 FEAT-model-badge-video 为 Sora-2 Pro 补齐 `2K/4K` badge（影响：model badge 配置/视频模型选择器）
- 2026-02-13 FEAT-model-badge 扩展视频模型 badge（50%OFF：Kling 3.0 / Sora-2 Pro / Wan 2.5）
- 2026-02-13 FEAT-anime-video-generation Kling 3.0 计费改为按秒结算（统一 MC 口径：60/90/85/120 MC/s）
- 2026-02-12 FEAT-anime-video-generation Kling 3.0 计费改为按秒结算（统一 MC 口径：100/150/135/200 MC/s）
- 2026-02-07 FEAT-video-hailuo 更新 Hailuo 2.3 新版价格（standard/pro）
- 2026-02-07 FEAT-video-hailuo 修正 Hailuo 2.3 `input.resolution` 枚举为大写 `768P`/`1080P`
- 2026-02-07 FEAT-video-hailuo 修正 Hailuo 2.3 `input.duration` 类型为 string（"6"/"10"）
- 2026-02-07 FEAT-video-hailuo 修正 Hailuo 2.3 图生视频字段为 `input.image_url`（单图）
