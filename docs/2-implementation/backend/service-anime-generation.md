# 动漫生成服务（图片）

Related:
- 总体架构：`docs/2-implementation/backend/service-generation-architecture.md`
- API 契约（图片）：`docs/2-implementation/api/anime-generation.md`
- API 契约（统一能力）：`docs/2-implementation/api/generation.md`
- Feature：`docs/2-implementation/features/feature-ai-anime-generator.md`

## 概述

`AnimeGenerationService` 继承自 `BaseGenerationService`，专门处理动漫风格图片生成的业务逻辑。

## 服务架构

### 类继承关系
```
BaseGenerationService<AnimeGenerationRequest>
    ↓
AnimeGenerationService
```

### 服务职责

- 动漫图片生成的参数验证（支持风格、场景、服装预设）
- 动漫专用提示词构建（基于 AnimePromptBuilder）
- 继承通用任务创建、状态查询、Webhook 处理等功能
- 支持参考图片的图生图模式

### 主要特性

- **文字到图片生成**: 主要生成模式，支持丰富的预设配置
- **多预设支持**: style_preset（风格）、scene_preset（场景）、outfit_preset（服装）
- **参考图片**: 可选的 reference_image_urls 支持图生图模式
- **灵活规格**: 支持 1:1、2:3、3:4、16:9 等多种宽高比
- **批量生成**: 支持 1-4 张图片批量生成

## 核心业务方法

### 抽象方法实现

#### validateGenerationParams 方法
- **功能**: 验证动漫生图专用参数
- **验证内容**:
  - 提示词（必需，1-1000字符）
  - 基础参数（model_uuid、aspect_ratio、counts: 1-4）
  - 参考图片URL格式
  - 样式预设存在性（从配置文件）

#### buildFullPrompt 方法
- **功能**: 构建完整的动漫生成提示词
- **流程**:
  1. 提取用户提示词
  2. 应用风格预设
  3. 应用场景预设
  4. 应用服装预设
  5. 整合角色信息（如有）
  6. 添加通用动漫风格修饰词

#### extractReferenceImageUrl 方法
- **功能**: 提取参考图片URL
- **支持**: 单张或多张参考图片的图生图模式

## 服务文件

- `src/services/generation/anime/anime-generation-service.ts` - 主服务类
- `src/services/generation/anime/anime-types.ts` - 类型定义
- `src/services/generation/anime/anime-prompt-builder.ts` - 提示词构建

## API 契约

以 API 文档为单一事实来源：`docs/2-implementation/api/anime-generation.md`

## 集成说明

与统一生成架构深度集成：通过 `GenerationServiceFactory` 接入统一 `status/webhook/handle-failure` 能力；webhook token 鉴权与 resultUrls 白名单策略见总体架构文档。

## 状态字段写入规则

- 写入位置：`generation_images.status`
- 默认值：`archived`
- 写入时机：图片结果落库时写入默认值，后续仅更新 `generations.status` 与图片URL等结果字段

## 变更历史
- 2025-10-20 v1.0 初始版本
