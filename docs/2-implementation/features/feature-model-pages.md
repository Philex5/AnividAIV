# Feature: 模型内页 (Model Landing Pages)

**Related**: SEO流量获取策略 (PRD 段落: TBD)

## 背景与目标

### 功能背景

为每个AI模型创建独立的SEO优化落地页，通过模型名称关键词获取搜索引擎流量。用户搜索特定模型（如"nano banana"、"wan 2.5"、"z image"）时，可以直接进入对应模型内页开始创作。

### 目标用户

- 搜索特定AI模型名称的用户
- 了解模型特性后决定使用的用户
- 需要快速访问特定模型功能的用户

## 验收标准

### 功能验收

- Footer新增"Models"列，显示一期模型链接
- 访问 `/models/nano-banana` 可直接使用nano banana生成图片
- 访问 `/models/wan-2-5` 可直接使用wan 2.5生成视频
- 访问 `/models/z-image` 可直接使用z image生成图片
- 每个模型页面包含完整的营销文案（全部复用现有营销组件）
- 所有文案支持页面级国际化配置

### SEO验收

- 每个模型页面有独立的metadata（title/description/keywords）
- 模型关键词出现在H1/H2标签中
- 页面包含结构化数据（JSON-LD）
- 页面被sitemap收录

## 系统级流程/时序

### 主流程：模型内页访问与创作

```
用户搜索 "nano banana ai"
  ↓ 点击搜索结果
  ↓ 进入 /models/nano-banana
  ↓ 阅读模型介绍与特性
  ↓ 在同一页面直接开始生成（无需跳转）
  ↓ 图片: AnimeGenerator 布局（预选模型）
  ↓ 视频: VideoGenerator 布局（预选模型）
```

### SEO流量路径

```
搜索引擎 → 模型内页 → 阅读营销内容 → 开始创作 → 注册/登录 → 付费转化
```

## 影响清单

### 1. 新增文件结构

```
src/app/[locale]/(default)/models/
└── [model_name]/
    └── page.tsx                    # 动态模型页面

src/i18n/pages/models/
└── en.json                         # 页面级文案配置（新增）

src/configs/gallery/models/
├── nano-banana-examples.json       # Nano Banana模型专用示例
├── wan-2-5-examples.json           # Wan 2.5模型专用示例
└── z-image-examples.json           # Z Image模型专用示例
```

### 2. 修改文件

```
src/i18n/messages/
en.json           # Footer添加Models列
src/app/sitemap.ts                  # 包含模型页面URL
```

### 3. 路由映射表

| URL路径               | 模型ID             | 生成器         | 类型 |
| --------------------- | ------------------ | -------------- | ---- |
| `/models/nano-banana` | google/nano-banana | AnimeGenerator | 图片 |
| `/models/wan-2-5`     | wan/2.5            | VideoGenerator | 视频 |
| `/models/z-image`     | z-image            | AnimeGenerator | 图片 |
| `/models/kling-3-0`   | kling-3.0/video    | VideoGenerator | 视频 |

### 4. 组件复用清单（全部来自 @/components/marketing）

| 组件                            | 复用方式                      |
| ------------------------------- | ----------------------------- |
| AnimeGenerator / VideoGenerator | 预选modelId + 隐藏风格选择器  |
| MarketingIntroduction           | 模型介绍文案                  |
| MarketingBenefits               | 模型优势列表                  |
| MarketingHowToUse               | 使用步骤                      |
| MarketingFAQ                    | 模型FAQ                       |
| MarketingCTA                    | 行动号召                      |
| FeatureRecommend                | 特性推荐                      |
| AppFooter                       | 包含Models列                  |

### 5. 新增配置文件

| 配置文件                                   | 说明                           |
| ------------------------------------------ | ------------------------------ |
| `src/configs/gallery/models/nano-banana-examples.json`  | Nano Banana模型专用示例画廊    |
| `src/configs/gallery/models/wan-2-5-examples.json`      | Wan 2.5模型专用示例画廊        |
| `src/configs/gallery/models/z-image-examples.json`      | Z Image模型专用示例画廊        |

### 6. 生成器组件需新增的props

| Prop名称           | 类型    | 说明                           |
| ------------------ | ------- | ------------------------------ |
| `initialModelId`   | string  | 预设的模型ID                   |
| `examples`         | array   | 模型专用示例数据（可选）       |
| `hideStyleSelector`| boolean | 是否隐藏风格选择器（根据initialModelId自动推导） |

## 前端设计

### 页面结构（完全复用现有组件）

```
┌─────────────────────────────────────────────────┐
│ Header (全局导航)                                 │
├─────────────────────────────────────────────────┤
│ 全屏生成器（首屏）                                 │
│ - AnimeGenerator 或 VideoGenerator               │
│ - 预选对应模型                                    │
│ - 隐藏风格选择框（模型专用页面）                   │
│ - 风格默认为"no preset"                           │
│ - 使用模型专用示例画廊                             │
├─────────────────────────────────────────────────┤
│ MarketingIntroduction                             │
│ - 模型介绍                                        │
├─────────────────────────────────────────────────┤
│ MarketingBenefits                                │
│ - 模型优势                                        │
├─────────────────────────────────────────────────┤
│ MarketingHowToUse                                │
│ - 使用步骤                                        │
├─────────────────────────────────────────────────┤
│ MarketingFAQ                                     │
│ - 常见问题                                        │
├─────────────────────────────────────────────────┤
│ FeatureRecommend                                 │
│ - 特性推荐                                        │
├─────────────────────────────────────────────────┤
│ MarketingCTA                                     │
│ - 行动号召                                        │
├─────────────────────────────────────────────────┤
│ AppFooter (包含Models列)                          │
└─────────────────────────────────────────────────┘
```

### 路由映射配置

```typescript
// src/configs/models/route-mapping.ts
export const MODEL_ROUTE_MAP: Record<string, string> = {
  "nano-banana": "google/nano-banana",
  "wan-2-5": "wan/2.5",
  "z-image": "z-image",
} as const;

// 反向映射（用于验证）
export const MODEL_ID_TO_ROUTE: Record<string, string> = {
  "google/nano-banana": "nano-banana",
  "wan/2.5": "wan-2-5",
  "z-image": "z-image",
} as const;

// 模型类型判断
export const getModelType = (modelId: string): "image" | "video" => {
  const videoModels = ["wan/2.5", "sora-2", "veo/3.1-fast"];
  return videoModels.includes(modelId) ? "video" : "image";
};
```

### 生成器参数预设置

```typescript
// 伪代码示意：页面组件传递预选模型
<AnimeGenerator
  pageData={pageData}
  initialModelId="google/nano-banana"  // 预选模型
/>

<VideoGenerator
  pageData={pageData}
  initialModelId="wan/2.5"  // 预选模型
/>
```

### 预设模型时的生成器行为调整

当检测到有预设模型时，生成器组件需要进行以下调整：

#### 1. 风格选择框隐藏逻辑

```typescript
// 生成器组件内部逻辑
const hasPresetModel = !!initialModelId;

// 风格选择框渲染条件
{!hasPresetModel && (
  <StyleSelectorCompact ... />
)}

// 或者使用更细粒度的控制
{showStyleSelector && (
  <StyleSelectorCompact ... />
)}
```

#### 2. 风格参数默认值处理

```typescript
// 当有预设模型时，风格参数设为 "no preset"
const getInitialStyleValue = (hasPresetModel: boolean): string => {
  return hasPresetModel ? "no preset" : defaultStyleValue;
};

// 初始参数设置
const initialParams = {
  model_uuid: initialModelId,
  style: hasPresetModel ? "no preset" : defaultStyle,
  // 其他参数从模型配置读取默认值
};
```

#### 3. 用户体验影响

- **有预设模型时**：用户进入模型页面，生成器已预选该模型，风格选择框隐藏，风格默认为"no preset"，用户可直接输入prompt开始生成
- **无预设模型时**：保持现有行为，显示完整的风格选择器

### 独立示例画廊配置

每个模型页面使用独立的示例配置文件，确保展示内容与模型特性高度相关。

#### 配置文件结构

```
src/configs/gallery/
├── anime-example-gallery.json      # 通用动漫示例（主页使用）
├── video-example-gallery.json      # 通用视频示例（主页使用）
├── models/
│   ├── nano-banana-examples.json   # Nano Banana模型专用示例
│   ├── wan-2-5-examples.json       # Wan 2.5模型专用示例
│   └── z-image-examples.json       # Z Image模型专用示例
```

#### 配置文件格式示例

```json
// src/configs/gallery/models/nano-banana-examples.json
{
  "modelId": "google/nano-banana",
  "modelName": "Nano Banana",
  "examples": [
    {
      "id": "nb-001",
      "prompt": "A cute anime girl with long pink hair, wearing a school uniform, standing in a cherry blossom garden",
      "imageUrl": "/imgs/models/nano-banana/examples/nb-001.jpg",
      "negative_prompt": "",
      "tags": ["anime", "girl", "school"]
    },
    {
      "id": "nb-002",
      "prompt": "A dynamic anime battle scene, warrior with glowing sword, dramatic lighting",
      "imageUrl": "/imgs/models/nano-banana/examples/nb-002.jpg",
      "negative_prompt": "",
      "tags": ["action", "battle", "dynamic"]
    }
  ]
}
```

#### 页面组件集成

```typescript
// 模型页面组件
import nanoBananaExamples from '@/configs/gallery/models/nano-banana-examples.json';
import wan25Examples from '@/configs/gallery/models/wan-2-5-examples.json';

const MODEL_EXAMPLES_MAP = {
  "nano-banana": nanoBananaExamples,
  "wan-2-5": wan25Examples,
  "z-image": zImageExamples,
};

// 传递给生成器
<AnimeGenerator
  pageData={pageData}
  initialModelId="google/nano-banana"
  examples={MODEL_EXAMPLES_MAP[modelName]}  // 模型专用示例
/>
```

## 国际化配置结构

### models/en.json

```json
{
  "metadata": {
    "title": "{Model Name} AI Generator - ... | AnividAI",
    "description": "Generate ... with {Model Name}",
    "keywords": "{model name}, ai generator, ..."
  },
  "introduce": {
    "tagline": "{Model Name} AI Generator on AnividAI",
    "title": "What is {Model Name}",
    "description": "模型详细介绍..."
  },
  "benefits": {
    "section_title": "Why Choose {Model Name}",
    "section_subtitle": "...",
    "items": [
      {
        "icon": "/imgs/icons/...",
        "title": "...",
        "description": "..."
      }
    ]
  },
  "how_to_use": {
    "title": "Generate with {Model Name} in Simple Steps",
    "subtitle": "...",
    "step_1_title": "...",
    "step_1_description": "...",
    ...
  },
  "faq": {
    "title": "Frequently Asked Questions",
    "subtitle": "...",
    "items": [...]
  },
  "call_to_action": {
    "title": "Start Creating with {Model Name}",
    "description": "...",
    "start_creating": "Start Creating"
  }
}
```

### Footer配置更新（messages/en.json）

```json
{
  "footer": {
    "nav": {
      "items": [
        { "title": "Products", "children": [...] },
        {
          "title": "Models",
          "children": [
            { "title": "Nano Banana", "url": "/models/nano-banana", "target": "_self" },
            { "title": "Wan 2.5", "url": "/models/wan-2-5", "target": "_self" },
            { "title": "Z Image", "url": "/models/z-image", "target": "_self" }
          ]
        },
        { "title": "Resources", "children": [...] }
      ]
    }
  }
}
```

## SEO优化

### 动态Metadata生成

```typescript
// generateMetadata函数伪代码
const modelPageData = getModelPageData(modelName, locale);
return {
  title: modelPageData.metadata.title,
  description: modelPageData.metadata.description,
  alternates: {
    canonical: `${WEB_URL}/models/${modelName}`,
    languages: { en: `...`, ja: `...` }
  },
  openGraph: { ... }
};
```

### 文案要求：

1. 价格相关： 提供免费积分（MC）无需使用信用卡，且可以通过签到分享生成艺术品获取免费 MC.

### SEO 检查

使用 seo-audit 技能检查页面情况，主词为模型词

### JSON-LD结构化数据

```typescript
// SoftwareApplication + FAQPage
const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{Model Name} AI Generator",
  ...
};
```

## 任务拆解

### 阶段1：基础配置

- [ ] 创建 `src/configs/models/route-mapping.ts`
- [ ] 更新 `src/i18n/messages/en.json` 添加Models列

### 阶段2：页面开发

- [ ] 创建 `src/app/[locale]/(default)/models/[model_name]/page.tsx`
- [ ] 实现动态metadata生成
- [ ] 实现JSON-LD结构化数据
- [ ] 集成营销组件

### 阶段3：国际化配置

- [ ] 创建 `src/i18n/pages/models/en.json`
- [ ] 编写三个模型的文案内容

### 阶段4：SEO配置

- [ ] 更新 `src/app/sitemap.ts` 包含模型页面
- [ ] 配置canonical和hreflang

### 阶段5：测试

- [ ] 三个模型页面功能测试
- [ ] SEO元数据验证
- [ ] 响应式测试

## 变更历史

- 2026-02-05 FEAT-MODEL-PAGES 完成生成器组件优化与示例集成
  - **实现状态**：✅ 已完成
  - AnimeGenerator 新增 `examples` prop，支持传入模型专用示例
  - VideoGenerator 新增 `examples` prop，支持传入模型专用示例
  - 当有 `initialModelId` 时，自动隐藏风格选择器
  - 当有 `initialModelId` 时，风格参数默认为 "no preset"
  - 模型页面自动加载并传递模型专用示例配置
  - 涉及文件：
    - `src/components/anime-generator/AnimeGenerator.tsx`
    - `src/components/video/VideoGenerator.tsx`
    - `src/app/[locale]/(default)/models/[model_name]/page.tsx`
    - `src/configs/gallery/models/nano-banana-examples.json`
    - `src/configs/gallery/models/wan-2-5-examples.json`
    - `src/configs/gallery/models/z-image-examples.json`
- 2026-02-05 FEAT-MODEL-PAGES 优化生成器预设模型行为和示例画廊配置
  - 新增：当检测到有预设模型时，隐藏风格选择框，风格默认为"no preset"
  - 新增：每个模型使用独立的示例配置json文件
  - 新增：模型专用示例配置文件结构说明
  - 更新：组件复用清单，添加新增props说明
  - 更新：任务拆解，添加示例准备相关任务
- 2026-02-04 FEAT-MODEL-PAGES 创建模型内页Feature设计文档v1.0

### 国际化配置结构

#### src/i18n/pages/models/[model_name]/en.json 结构设计

```json
{
  "metadata": {
    "title": "{Model Name} AI Generator - ... | AnividAI",
    "description": "Generate ... with {Model Name}",
    "keywords": "{model name}, ai generator, ..."
  },
  "hero": {
    "tagline": "{Model Name} AI Generator on AnividAI",
    "title": "What is {Model Name}",
    "description": "模型详细介绍...",
    "cta": "Start Generating"
  },
  "features": {
    "title": "Why Choose {Model Name}",
    "items": [
      {
        "icon": "feature-icon-key",
        "title": "Feature Title",
        "description": "Feature description"
      }
    ]
  },
  "benefits": {
    // 复用anime-generator结构，可选择性覆盖
  },
  "how_to_use": {
    "title": "Generate with {Model Name} in 3 Steps",
    "steps": [...]
  },
  "faq": {
    "title": "Frequently Asked Questions",
    "items": [
      {
        "question": "What is {Model Name}?",
        "answer": "..."
      }
    ]
  },
  "cta": {
    "title": "Start Creating with {Model Name}",
    "description": "...",
    "button": "Start Creating"
  }
}
```

#### 模型特定配置

每个模型需要独立的文案配置key：

- `nano_banana`: models.nano_banana.\*
- `wan_2_5`: models.wan_2_5.\*
- `z_image`: models.z_image.\*

### Footer配置更新

#### en.json添加Models列

```json
{
  "footer": {
    "nav": {
      "items": [
        {
          "title": "Products",
          "children": [...]
        },
        {
          "title": "Models",
          "children": [
            {
              "title": "Nano Banana",
              "url": "/models/nano-banana",
              "target": "_self"
            },
            {
              "title": "Wan 2.5",
              "url": "/models/wan-2-5",
              "target": "_self"
            },
            {
              "title": "Z Image",
              "url": "/models/z-image",
              "target": "_self"
            }
          ]
        },
        {
          "title": "Resources",
          "children": [...]
        }
      ]
    }
  }
}
```

## SEO优化要点

### 1. Metadata配置

```typescript
// 每个模型页面独立的metadata
{
  title: "{Model Name} AI Generator - Create ... | AnividAI",
  description: "Use {Model Name} to generate ...",
  keywords: "{model name}, ai generator, anime art, ...",
  openGraph: {
    title: "...",
    description: "...",
    images: ["/models/{model}/og-image.png"]
  }
}
```

### 2. 结构化数据

```json
// JSON-LD Schema
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{Model Name} AI Generator",
  "applicationCategory": "MultimediaApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

### 3. URL到模型ID的映射

```typescript
// src/configs/models/route-mapping.ts
export const MODEL_ROUTE_MAP = {
  "nano-banana": "google/nano-banana",
  "wan-2-5": "wan/2.5",
  "z-image": "z-image",
  "kling-3-0": "kling-3.0/video",
} as const;
```

## 任务拆解

### 阶段1：基础架构 ✅ 已完成

1. ✅ 创建 `src/app/[locale]/(default)/models/[model_name]/page.tsx`
2. ✅ 创建路由映射配置文件
3. ✅ 更新Footer配置和组件

### 阶段2：国际化配置与示例准备 ✅ 已完成

1. ✅ 创建 `src/i18n/pages/models/en.json`,`src/i18n/messages/ja.json`
2. ✅ 为三个模型编写多语种文案，符合本地人表达，语气亲和地道
3. ✅ 更新 `src/i18n/messages/en.json`,`src/i18n/messages/ja.json` 的footer配置
4. ✅ 创建模型专用示例配置文件
   - `src/configs/gallery/models/nano-banana-examples.json`
   - `src/configs/gallery/models/wan-2-5-examples.json`
   - `src/configs/gallery/models/z-image-examples.json`
5. ⏳ 准备示例图片资源并上传到对应目录（待定）

### 阶段3：组件开发 ✅ 已完成

1. ✅ 模型页面已存在并功能完善（无需创建新组件）
2. ✅ 适配 AnimeGenerator 接受预选模型
   - ✅ 新增 `examples` prop 支持模型专用示例
   - ✅ 当有预设模型时，隐藏风格选择框
   - ✅ 当有预设模型时，风格参数默认为 "no preset"
3. ✅ 适配 VideoGenerator 接受预选模型
   - ✅ 新增 `examples` prop 支持模型专用示例
   - ✅ 当有预设模型时，隐藏风格选择框
   - ✅ 当有预设模型时，风格参数默认为 "no preset"
4. ✅ 模型页面集成示例配置加载

### 阶段4：SEO优化 ✅ 已完成

1. ✅ 配置动态metadata生成
2. ✅ 添加JSON-LD结构化数据
3. ✅ 更新sitemap.ts包含模型页面
4. ✅ 配置canonical和hreflang

### 阶段5：测试与上线 ⏳ 待进行

1. ⏳ 三个模型页面功能测试
2. ⏳ SEO元数据验证
3. ⏳ 移动端响应式测试
4. ⏳ 性能优化检查

## 技术约束

### 模型类型判断逻辑

```typescript
// 伪代码：根据模型ID判断使用哪个生成器
const getGeneratorType = (modelId: string) => {
  const model = models.find((m) => m.model_id === modelId);
  return model?.model_type === "text2video" ? "video" : "image";
};
```

### 初始参数设置

```typescript
// 伪代码：预设模型参数
const getInitialParams = (modelId: string) => ({
  model_uuid: modelId,
  // 其他参数从模型配置读取默认值
});
```

## 扩展性考虑

### 未来模型添加

1. 在 `MODEL_ROUTE_MAP` 添加新条目
2. 在 `models/en.json` 添加新模型文案
3. 在Footer添加链接（可选）
4. 无需修改页面组件代码

### 多语言支持

1. 创建 `src/i18n/pages/models/ja.json`
2. 文案结构保持一致
3. 页面组件自动适配

## 变更历史

- 2026-02-11 FEAT-MODEL-PAGES 新增 Kling 3.0 模型页配置（影响：路由映射/页面 i18n/示例画廊/sitemap/footer）
- 2026-02-05 FEAT-MODEL-PAGES 完成生成器组件优化与示例集成
  - **实现状态**：✅ 已完成
  - AnimeGenerator 新增 `examples` prop，支持传入模型专用示例
  - VideoGenerator 新增 `examples` prop，支持传入模型专用示例
  - 当有 `initialModelId` 时，自动隐藏风格选择器
  - 当有 `initialModelId` 时，风格参数默认为 "no preset"
  - 模型页面自动加载并传递模型专用示例配置
  - 涉及文件：
    - `src/components/anime-generator/AnimeGenerator.tsx`
    - `src/components/video/VideoGenerator.tsx`
    - `src/app/[locale]/(default)/models/[model_name]/page.tsx`
    - `src/configs/gallery/models/nano-banana-examples.json`
    - `src/configs/gallery/models/wan-2-5-examples.json`
    - `src/configs/gallery/models/z-image-examples.json`
- 2026-02-05 FEAT-MODEL-PAGES 优化生成器预设模型行为和示例画廊配置
  - 新增：当检测到有预设模型时，隐藏风格选择框，风格默认为"no preset"
  - 新增：每个模型使用独立的示例配置json文件
  - 新增：模型专用示例配置文件结构说明
  - 更新：组件复用清单，添加新增props说明
  - 更新：任务拆解，添加示例准备相关任务
- 2026-02-04 FEAT-MODEL-PAGES 创建模型内页Feature设计文档v1.0
