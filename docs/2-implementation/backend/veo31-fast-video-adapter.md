# Veo 3.1 Fast Video Adapter 实现文档

## 概述

本文档描述了如何在AnividAI项目中接入Veo 3.1 Fast视频生成模型。该模型是Google推出的高级订阅专属视频生成模型，支持文本生成视频和图片生成视频。

## 相关文件

- **Adapter实现**: `src/services/generation/providers/veo31-fast-video-adapter.ts`
- **Provider注册**: `src/services/generation/providers/video-ai-provider.ts`
- **模型配置**: `src/configs/models/ai-models.json`
- **API文档**: `docs/1-specs/model_apis/kie-video-api.md`

## 实现细节

### 1. Veo31FastVideoAdapter 类

继承自 `VideoBaseAdapter`，实现了以下功能：

- **createTask**: 创建视频生成任务
  - 支持文本生成视频（TEXT_2_VIDEO）
  - 支持图片生成视频（FIRST_AND_LAST_FRAMES_2_VIDEO）
  - 自动处理OC角色图和参考图
  - 支持aspectRatio: 16:9, 9:16, Auto

- **queryTask**: 查询任务状态
  - 标准化状态映射
  - 解析resultJson获取结果URL

- **calculateCredits**: 计算积分费用
  - 固定收费300MC

### 2. VideoAIProvider 注册

在 `VideoAIProvider.initializeAdapters()` 中注册了以下别名：
- `veo3_fast` (主要)
- `veo3.1-fast` (兼容点号)
- `veo-3.1-fast` (兼容短名)
- `Veo 3.1 Fast` (显示名)
- `Veo3.1 Fast` (不带空格)

### 3. 模型配置

在 `ai-models.json` 中添加了Veo 3.1 Fast的配置：

```json
{
  "name": "Veo 3.1 Fast",
  "model_id": "veo3_fast",
  "model_type": "text2video",
  "credits_per_generation": 300,
  "status": "active",
  "is_premium": true,
  "supported_tasks": [
    "text_to_video",
    "image_to_video"
  ],
  "supported_ratios": [
    "1:1",
    "9:16",
    "16:9"
  ]
}
```

## 使用方法

### 前端调用

```typescript
import { VideoAIProvider } from '@/services/generation/providers/video-ai-provider';

const provider = VideoAIProvider.getInstance();

// 创建任务
const result = await provider.createVideoTask({
  model_name: 'veo3_fast',
  prompt: '一只可爱的小猫在花园里玩耍',
  task_subtype: 'text_to_video',
  aspect_ratio: '16:9',
  watermark: 'Your Brand' // 可选
}, callbackUrl);

// 查询任务状态
const status = await provider.queryVideoTask(result.taskId, 'veo3_fast');

// 计算费用
const credits = await provider.calculateVideoCredits({
  model_name: 'veo3_fast',
  prompt: '...',
  task_subtype: 'text_to_video'
});
```

### 支持的参数

- **必填参数**:
  - `model_name`: 'veo3_fast'
  - `prompt`: 文本描述
  - `task_subtype`: 'text_to_video' | 'image_to_video'

- **可选参数**:
  - `aspect_ratio`: '1:1' | '9:16' | '16:9' (默认: '16:9')
  - `character_image_url`: OC角色图URL
  - `reference_image_urls`: 参考图URL数组
  - `watermark`: 水印文本

### API请求格式

#### 创建任务 (旧版API)

```json
{
  "model": "veo3_fast",
  "prompt": "文本描述",
  "generationType": "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO",
  "aspectRatio": "16:9" | "9:16" | "Auto",
  "callBackUrl": "回调URL",
  "imageUrls": ["图片URL"] // 仅图片生成视频时
}
```

#### 查询任务

```json
{
  "code": 200,
  "data": {
    "taskId": "任务ID",
    "state": "success",
    "resultJson": "{\"resultUrls\": [\"视频URL\"]}",
    "failMsg": "错误信息",
    "failCode": "错误码"
  }
}
```

## 计费说明

- **固定费用**: 300 MC (不根据分辨率或时长变化)
- **支持任务**: 文本生成视频、图片生成视频
- **视频时长**: 固定5秒
- **输出格式**: MP4

## 注意事项

1. **订阅专属**: 该模型为高级订阅用户专属，需设置 `is_premium: true`
2. **图片限制**: 最多支持1张图片（OC角色图或参考图）
3. **API版本**: 使用旧版API格式
4. **质量等级**: 不支持质量等级选择，固定高质量输出
5. **16:9比例**: 仅16:9比例支持生成1080P高清视频

## 测试验证

### 1. 编译检查

```bash
npx tsc --noEmit --project tsconfig.json
```

### 2. 配置验证

```bash
node -e "
const config = require('./src/configs/models/ai-models.json');
const veoModel = config.models.find(m => m.model_id === 'veo3_fast');
console.log('Veo 3.1 Fast 配置:', veoModel);
"
```

### 3. 运行测试

```bash
# 运行相关测试
pnpm test -- --testNamePattern="veo|video"

# 或运行所有测试
pnpm test
```

## 变更历史

- 2025-12-10: 初始实现，添加Veo 3.1 Fast adapter
- 实现createTask、queryTask、calculateCredits方法
- 在VideoAIProvider中注册adapter
- 在ai-models.json中添加模型配置

## 相关链接

- [Kie AI API文档](docs/1-specs/model_apis/kie-video-api.md)
- [视频生成服务](../backend/service-video-generation.md)
- [视频参数配置](../backend/video-parameter-converter.md)
