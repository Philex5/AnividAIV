# 模型内页实现方案总结

## 方案概述

为三个AI模型创建独立的SEO优化落地页：
- **nano-banana** (图片生成)
- **wan-2-5** (视频生成)
- **z-image** (图片生成)

## 核心设计原则

### 1. 完全复用现有组件
- 不创建新的营销组件
- 使用 `@/components/marketing/` 下的全部组件
- 使用现有的生成器组件（AnimeGenerator/VideoGenerator）

### 2. 页面结构（与ai-anime-generator相同）
```
全屏生成器（首屏）
  ↓
MarketingIntroduction（模型介绍）
  ↓
MarketingBenefits（模型优势）
  ↓
MarketingHowToUse（使用步骤）
  ↓
MarketingFAQ（常见问题）
  ↓
FeatureRecommend（特性推荐）
  ↓
MarketingCTA（行动号召）
  ↓
AppFooter（包含Models列）
```

### 3. 技术实现要点

#### 路由映射配置
```typescript
// src/configs/models/route-mapping.ts
export const MODEL_ROUTE_MAP = {
  'nano-banana': 'google/nano-banana',
  'wan-2-5': 'wan/2.5',
  'z-image': 'z-image',
};

export const getModelType = (modelId: string): 'image' | 'video' => {
  const videoModels = ['wan/2.5', 'sora-2', 'veo/3.1-fast'];
  return videoModels.includes(modelId) ? 'video' : 'image';
};
```

#### 生成器预选模型
```typescript
// 图片模型
<AnimeGenerator
  pageData={pageData}
  initialModelId="google/nano-banana"  // 预选
/>

// 视频模型
<VideoGenerator
  pageData={pageData}
  initialModelId="wan/2.5"  // 预选
/>
```

#### Footer Models列
```json
// src/i18n/messages/en.json
{
  "footer": {
    "nav": {
      "items": [
        {
          "title": "Models",
          "children": [
            { "title": "Nano Banana", "url": "/models/nano-banana" },
            { "title": "Wan 2.5", "url": "/models/wan-2-5" },
            { "title": "Z Image", "url": "/models/z-image" }
          ]
        }
      ]
    }
  }
}
```

## 文件清单

### 新增文件
| 文件路径 | 说明 |
|---------|------|
| `src/configs/models/route-mapping.ts` | 路由映射配置 |
| `src/app/[locale]/(default)/models/[model_name]/page.tsx` | 动态模型页面 |
| `src/i18n/pages/models/en.json` | 模型页面文案 |

### 修改文件
| 文件路径 | 修改内容 |
|---------|----------|
| `src/i18n/messages/en.json` | Footer添加Models列 |
| `src/app/sitemap.ts` | 添加模型页面URL |

## 国际化配置结构

```json
// src/i18n/pages/models/en.json
{
  "metadata": { "title": "...", "description": "...", "keywords": "..." },
  "introduce": { "tagline": "...", "title": "...", "description": "..." },
  "benefits": { "section_title": "...", "items": [...] },
  "how_to_use": { "title": "...", "step_1_title": "...", ... },
  "faq": { "title": "...", "items": [...] },
  "call_to_action": { "title": "...", "description": "...", "start_creating": "..." }
}
```

## SEO配置

### 动态Metadata
- title: `{Model Name} AI Generator - ...`
- description: 模型特定描述
- keywords: 模型相关关键词
- OG/Twitter Card: 完整配置
- canonical: 正确的URL
- hreflang: 多语言支持

### 结构化数据
- SoftwareApplication schema
- FAQPage schema

### Sitemap
- 已更新 `src/app/sitemap.ts` 包含三个模型页面

## 任务进度

- [x] Feature文档创建
- [x] 任务列表创建
- [x] Sitemap更新
- [ ] 路由映射配置创建
- [ ] Footer配置更新
- [ ] 模型页面文案编写
- [ ] 模型页面组件开发
- [ ] 测试验证

## 相关文档

- [Feature设计](../2-implementation/features/feature-model-pages.md)
- [任务列表](../3-operations/tasks/tasks-feature-model-pages.md)
