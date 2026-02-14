# KIE AI 平台 API 规格（gpt-4o-image / nano-banana）

本文为 API 契约文档，完整覆盖创建任务、异步回调（webhook）、轮询查询（query）三部分，并简述两种 API 风格差异及图片/视频场景与积分规则。示例中的错误信息与默认值均为英文。

## 概览与通用约定

- Base URL：`https://api.kie.ai`
- 认证：`Authorization: Bearer <YOUR_API_KEY>`（必填）
- Content-Type：`application/json`
- 任务处理：异步。创建任务成功后返回 `taskId`；结果通过 webhook 回调，同时可使用查询接口轮询。
- 任务状态（可能值）：`waiting` | `queuing` | `generating` | `success` | `fail`
- 对应api_key的环境变量：KIE_AI_API_KEY
- 可选 Base URL 覆盖：`KIE_AI_API_KEY`（用于代理/私有出口等场景；必须为绝对 URL）

差异摘要：

- gpt-4o-image：同一模型名（`gpt4o-image`），是否携带参考图由请求参数（如 `filesUrl`）是否有值自动处理。
- nano-banana：统一 `jobs/createTask` 协议；文生图使用 `google/nano-banana`，带参考图改用 `google/nano-banana-edit`，并在 `input.image_urls` 提供参考图。

## 一、旧版API

### 1) 创建任务

- 方法与路径：`POST /api/v1/gpt4o-image/generate`
- 请求体字段（核心）：
  - `prompt` string（必填）：生成提示词
  - `size` string（可选）：如 `1:1`、`2:3`、`3:2`
  - `filesUrl` string[]（可选）：参考图 URL 列表。为空为文生图；有值为图生图
  - `nVariants` number（可选）：变体数
  - `isEnhance` boolean（可选）
  - `uploadCn` boolean（可选）
  - `enableFallback` boolean（可选）
  - `fallbackModel` string（可选）
  - `callBackUrl` string（可选）：任务完成时回调地址

请求示例：

```bash
curl --request POST \
  --url https://api.kie.ai/api/v1/gpt4o-image/generate \
  --header 'Authorization: Bearer ${YOUR_API_KEY}' \
  --header 'Content-Type: application/json' \
  --data '{
  "prompt": "A beautiful sunset over the mountains",
  "size": "1:1",
  "filesUrl": [],
  "nVariants": 1,
  "isEnhance": false,
  "uploadCn": false,
  "enableFallback": false,
  "fallbackModel": "FLUX_MAX",
  "callBackUrl": "https://your-domain.com/api/callback"
}'
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": { "taskId": "task12345" }
}
```

### 2) Webhook 回调（异步）

- 回调目标：创建任务时传入的 `callBackUrl`
- Header：平台以 POST 方式回调，Body 为 JSON。建议在服务端校验来源并记录 `taskId`。
- 安全约定（本项目实现）：`callBackUrl` 必须包含 `token` 查询参数（随机值），服务端会根据 `taskId` 找到对应 generation 并校验该 `token`，校验失败返回 `401`。

成功回调示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task12345",
    "info": {
      "result_urls": ["https://example.com/result/image1.png"]
    }
  }
}
```

失败回调示例：

```json
{
  "code": 400,
  "msg": "Your content was flagged by OpenAI as violating content policies",
  "data": { "taskId": "task12345", "info": null }
}
```

### 3) 任务查询（轮询）

- 方法与路径：`GET /api/v1/gpt4o-image/record-info`
- 查询参数：`taskId`（可选，若省略由平台返回最近记录，建议携带）

请求示例：

```bash
curl --request GET \
  --url 'https://api.kie.ai/api/v1/gpt4o-image/record-info?taskId=task12345' \
  --header 'Authorization: Bearer ${YOUR_API_KEY}'
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task12345",
    "paramJson": "{\"prompt\":\"A beautiful sunset over the mountains\",\"size\":\"1:1\",\"isEnhance\":false}",
    "completeTime": 1672574400000,
    "response": { "resultUrls": ["https://example.com/result/image1.png"] },
    "successFlag": 1,
    "status": "SUCCESS",
    "errorCode": null,
    "errorMessage": "",
    "createTime": 1672561200000,
    "progress": "1.00"
  }
}
```

## 二、新版API

统一入口：`POST /api/v1/jobs/createTask`；根据 `model` 选择具体能力。

### 1) 创建任务（图片：文生图）

- `model`: `google/nano-banana`
- 关键字段（`input` 内）：
  - `prompt` string（必填）
  - `output_format` string（可选，如 `png`）
  - `image_size` string（可选，如 `auto` 或比例）
  - `callBackUrl` 顶层传入（可选）

请求示例：

```bash
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -d '{
    "model": "google/nano-banana",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "A surreal painting of a giant banana floating in space",
      "output_format": "png",
      "image_size": "auto"
    }
}'
```

成功响应：

```json
{ "code": 200, "message": "success", "data": { "taskId": "task_12345678" } }
```

### 2) 创建任务（图片：图生图/带参考图）

- `model`: `google/nano-banana-edit`
- `input.image_urls`: string[]（必填）参考图 URL 列表

请求示例：

```bash
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -d '{
    "model": "google/nano-banana-edit",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "turn this photo into an anime figure",
      "image_urls": ["https://example.com/ref.png"],
      "output_format": "png",
      "image_size": "auto"
    }
}'
```

成功响应：

```json
{ "code": 200, "message": "success", "data": { "taskId": "task_12345678" } }
```

### 3) 创建任务（视频：Kling 3.0）

- `model`: `kling-3.0/video`
- `input` 字段：
  - `prompt`: string（单镜头必填，最大 2500 字符）
  - `duration`: integer（3-15，默认 5）
  - `mode`: `std` | `pro`
  - `multi_shots`: boolean（可选，默认 `false`）
  - `multi_prompt`: object[]（`multi_shots=true` 时必填）
    - `prompt`: string
    - `duration`: integer（1-12）
    - 约束：`multi_prompt.duration` 总和 <= 15
  - `sound`: boolean（可选，`multi_shots=true` 时官方默认开启）
  - `aspect_ratio`: `1:1` | `9:16` | `16:9`（传首尾帧时无效）
  - `image_urls`: string[]（可选，1-2 张，支持首尾帧）
  - `kling_elements`: object[]（可选）
    - `name`: string
    - `description`: string
    - `element_input_urls`: string[]（2-4）
    - `element_input_video_urls`: string[]（1）
    - 约束：同一元素对象中，`element_input_urls` 与 `element_input_video_urls` 二选一
- `callBackUrl` 顶层传入（可选）

请求示例：

```bash
curl -X POST "https://api.kie.ai/api/v1/jobs/createTask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${YOUR_API_KEY}" \
  -d '{
    "model": "kling-3.0/video",
    "callBackUrl": "https://your-domain.com/api/callback",
    "input": {
      "prompt": "A cinematic anime duel in a rainy alley, dramatic lighting",
      "duration": 5,
      "mode": "std",
      "aspect_ratio": "1:1",
      "sound": true
    }
}'
```

成功响应：

```json
{ "code": 200, "msg": "success", "data": { "taskId": "task_12345678" } }
```

### 4) Webhook 回调（异步）

安全约定（本项目实现）：

- `callBackUrl` 必须包含 `token` 查询参数（随机值），服务端会根据 `taskId` 找到对应 generation 并校验该 `token`，校验失败返回 `401`。

成功回调示例：

```json
{
  "code": 200,
  "data": {
    "completeTime": 1755599644000,
    "consumeCredits": 100,
    "costTime": 8,
    "createTime": 1755599634000,
    "model": "google/nano-banana",
    "param": "{\"callBackUrl\":\"https://your-domain.com/api/callback\",\"model\":\"google/nano-banana\",\"input\":{\"prompt\":\"...\",\"output_format\":\"png\",\"image_size\":\"auto\"}}",
    "remainedCredits": 2510330,
    "resultJson": "{\"resultUrls\":[\"https://example.com/generated-image.jpg\"]}",
    "state": "success",
    "taskId": "e989621f54392584b05867f87b160672",
    "updateTime": 1755599644000
  },
  "msg": "Playground task completed successfully."
}
```

失败回调示例：

```json
{
  "code": 501,
  "data": {
    "completeTime": 1755597081000,
    "consumeCredits": 0,
    "costTime": 0,
    "createTime": 1755596341000,
    "failCode": "500",
    "failMsg": "Internal server error",
    "model": "google/nano-banana",
    "param": "{\"callBackUrl\":\"https://your-domain.com/api/callback\",\"model\":\"google/nano-banana\",\"input\":{\"prompt\":\"...\",\"output_format\":\"png\",\"image_size\":\"auto\"}}",
    "remainedCredits": 2510430,
    "state": "fail",
    "taskId": "bd3a37c523149e4adf45a3ddb5faf1a8",
    "updateTime": 1755597097000
  },
  "msg": "Playground task failed."
}
```

说明：视频/其他模型的回调结构一致，`model`、`resultJson` 具体内容会按模型能力变化（如视频返回 `mp4` 链接）。

### 5) 任务查询（轮询）

- 方法与路径：`GET /api/v1/jobs/recordInfo`
- 查询参数：`taskId`（必填）

请求示例：

```bash
curl -X GET "https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_12345678" \
  -H "Authorization: Bearer ${YOUR_API_KEY}"
```

成功响应示例：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": "task_12345678",
    "model": "google/nano-banana",
    "state": "success",
    "param": "{\"model\":\"google/nano-banana\",\"callBackUrl\":\"https://your-domain.com/api/callback\",\"input\":{\"prompt\":\"...\",\"output_format\":\"png\",\"image_size\":\"auto\"}}",
    "resultJson": "{\"resultUrls\":[\"https://example.com/generated-image.jpg\"]}",
    "failCode": "",
    "failMsg": "",
    "completeTime": 1698765432000,
    "createTime": 1698765400000,
    "updateTime": 1698765432000
  }
}
```

## 四、实现建议（重要）

- 请求构造：前端用“是否参考图”开关控制字段（`filesUrl` 或 `input.image_urls`）及在 nano-banana 下的模型名切换。
- 回调处理：统一解析 `taskId`、结果链接（gpt4o-image: `data.info.result_urls`；nano-banana: `data.resultJson.resultUrls`）。
- 容错：失败回调与查询响应均包含错误码与错误信息（英文），务必透出到前端并记录日志。
