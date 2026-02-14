# OC 导出功能方案 (FEAT-SHARE-EXPORTS)

**Related**:
- PRD：`docs/1-specs/PRD.md`
- OC 炫酷分享卡片：`docs/2-implementation/features/feature-oc-share-card.md`
- 任务列表：`docs/3-operations/tasks/tasks-feature-oc-rebuild.md`

## 1. 背景与目标

### 背景
目前的 OC 分享形式单一，仅支持基础链接分享和页面内浏览。用户希望能够：
- 将自己创造的 OC 以更精美的方式分享到社交媒体
- 将 OC 详细信息导出为文档保存或展示
- 获得多种格式的 OC 展示内容

### 目标
- **多样化导出格式**：支持卡片图片、PDF 文档、JSON 数据等多种导出格式
- **一键分享**：支持直接分享到社交媒体平台
- **高质量渲染**：确保导出的内容在各种场景下都有良好的视觉效果
- **用户友好**：操作简单，生成快速，支持预览和自定义

## 2. 功能范围 (Feature Scope)

### 2.1 核心导出类型

1. **OC 炫酷分享卡片 (公开功能)**
   - TCG 卡牌风格（参考游戏王）
   - 电影海报风格
   - 名片风格
   - 支持不同稀有度特效（SSR、SR、R等）
   - **使用场景**：社交媒体分享、头像、头像框等
   - **访问权限**：所有用户可用（公开角色），owner可用（私有角色）

2. **OC 详细信息导出 (仅限OC Owner可用)**
   - PDF 文档格式（完整的角色档案）
   - JSON 数据格式（开发者友好）
   - Markdown 文档格式（可编辑）
   - **使用场景**：备份、二次开发、打印
   - **访问权限**：仅限角色所有者

#### 社交分享 (已升级)

- **智能文案生成**：根据平台特性和内容类型自动生成优化的分享文案
  - Twitter: 简洁有力,带emoji,适合快速分享
  - Facebook: 稍长描述,适合社交互动
  - Reddit: 询问式,引发讨论
  - Web Share API: 通用文案,适配移动端
- **分享卡片集成**：使用炫酷分享卡片作为社交分享的预览图
- **分享内容**：
  - 优化的平台特定文案
  - 角色卡片图片 (OG标签)
  - 分享链接
- **一键分享**：支持 Twitter、Facebook、Reddit 等平台
- **Web Share API**：移动端原生分享,支持文件分享

##### 分享文案示例

**Character (OC) 分享文案：**
- Twitter: `"Just created an amazing OC \"{name}\" on AnividAI! 🎨✨ Check it out:"`
- Facebook: `"Check out my original character \"{name}\" created with AnividAI! 🎨"`
- Reddit: `"I made an original character \"{name}\" using AnividAI. What do you think?"`

**Image 分享文案：**
- Twitter: `"Generated this awesome anime art on AnividAI! 🎨✨"`
- Facebook: `"Check out this anime artwork I created with AnividAI!"`
- Reddit: `"Created this anime art using AnividAI. Thoughts?"`

**Video 分享文案：**
- Twitter: `"Just made an anime video on AnividAI! 🎬✨ Take a look:"`
- Facebook: `"Check out this anime video I created with AnividAI! 🎬"`
- Reddit: `"Created an anime video using AnividAI. What do you think?"`

**World 分享文案：**
- Twitter: `"Built an anime world \"{name}\" on AnividAI! 🌍✨ Explore it here:"`
- Facebook: `"Check out the anime world \"{name}\" I created with AnividAI! 🌍"`
- Reddit: `"I built a world called \"{name}\" using AnividAI. What do you think?"`

### 2.2 导出格式详解

#### A. 炫酷分享卡片
- **分辨率**：1200x630 (适配 OG 标签和社交分享)
- **风格**：
  - TCG 卡牌：游戏王风格，五层渲染结构
  - 电影海报：宽屏比例，突出角色形象
  - 名片：简洁商务风格
- **动态元素**：
  - 基于 `modules.appearance.theme_color` 的主题色彩
  - 角色属性雷达图
  - 专属序列号
- **使用场景**：
  - **OG 标签图片**：社交媒体分享时的预览图
  - **导出图片**：用户可下载保存
  - **社交分享**：直接分享卡片图片 + 链接

#### B. PDF 角色档案
- **内容结构**：
  - 封面：角色形象 + 基础信息
  - 角色详情：姓名、年龄、种族、角色等
  - 背景故事：完整的角色背景
  - 外观描述：`modules.appearance` 详细内容
  - 性格特征：`modules.personality` 分析
  - 技能标签：`tags` 和 `personality_tags`
  - 创作信息：创作者、创建时间、序列号
- **设计风格**：简洁专业，适配打印和数字阅读

#### C. JSON 数据导出
- **用途**：开发者、设计师二次开发
- **内容**：完整的角色数据（去除敏感信息与 `art` 字段）
- **外观范围**：`modules.appearance` 仅导出视觉特征参数（如发型、配饰等）
- **格式标准**：遵循 JSON Schema 规范

#### D. Markdown 文档
- **用途**：可编辑的角色档案
- **格式**：标准的 Markdown 格式
- **包含**：完整的角色信息和格式化文本（`modules.appearance` 仅导出视觉特征参数，如发型、配饰等）

## 3. 技术实现方案

### 3.1 技术栈选择

#### 渲染引擎
- **卡片图片**：`@vercel/og` (Satori)
  - 支持 Tailwind CSS 编写布局
  - 直接渲染为高质 PNG
  - 集成于 Next.js API Routes

#### PDF 生成
- **方案一**：`@react-pdf/renderer`
  - React 组件直接生成 PDF
  - 支持复杂布局和样式
  - 前端可直接生成

- **方案二**：`puppeteer` + HTML 模板
  - 后端渲染 HTML 为 PDF
  - 样式控制能力强
  - 适合复杂设计

#### 文档导出
- **JSON**：原生 JSON.stringify
- **Markdown**：模板引擎生成

### 3.2 API 设计

#### 卡片生成 API (公开功能)
```typescript
// OG 标签图片 API (替换现有的基础 OG 图)
GET /api/og/character/[uuid]?template=tcg&rarity=ssr&theme=dark

// 支持多种模板：
GET /api/og/character/[uuid]?template=movie&theme=cyberpunk
GET /api/og/character/[uuid]?template=business-card&theme=minimal

// 权限：公开角色所有用户可用，私有角色仅owner可用
```

#### PDF 导出 API (仅限Owner)
```typescript
GET /api/export/character/[uuid]/pdf?format=profile&template=modern

// 参数：
// - format: profile (角色档案), summary (简要信息)
// - template: modern (现代风), classic (经典风), print (打印优化)
// - 权限：仅限角色所有者
```

#### JSON 导出 API (仅限Owner)
```typescript
GET /api/export/character/[uuid]/json?include=sensitive&version=1

// 参数：
// - include: sensitive (包含敏感信息), public (仅公开信息)
// - version: 1, 2 (API 版本)
// - 权限：仅限角色所有者
```

#### Markdown 导出 API (仅限Owner)
```typescript
GET /api/export/character/[uuid]/markdown?template=detailed&locale=en

// 参数：
// - template: detailed (详细), concise (简洁)
// - locale: en, ja (语言版本)
// - 权限：仅限角色所有者
```

### 3.3 前端交互设计

#### 导出入口
在 OC 详情页 (`src/app/[locale]/(default)/characters/[uuid]/page.tsx`) 添加导出按钮组：

```typescript
// 建议位置：ActionBar 组件中
<ExportDropdown>
  <ExportOption
    icon="card"
    label="生成分享卡片"
    description="公开功能，所有用户可用"
    onClick={handleGenerateCard}
  />
  <ExportOption
    icon="file-pdf"
    label="导出 PDF 档案"
    description="仅限所有者"
    onClick={handleExportPDF}
    requireAuth
    requireOwner
  />
  <ExportOption
    icon="code"
    label="导出 JSON 数据"
    description="仅限所有者"
    onClick={handleExportJSON}
    requireAuth
    requireOwner
  />
  <ExportOption
    icon="markdown"
    label="导出 Markdown"
    description="仅限所有者"
    onClick={handleExportMarkdown}
    requireAuth
    requireOwner
  />
</ExportDropdown>
```

#### 社交分享实现 (已完成 ✅)

现有的 `ShareMenu` 组件已升级,集成智能文案生成和卡片分享功能。

**实现位置：**
- 组件：`src/components/character-detail/ShareMenu.tsx`
- 工具库：`src/lib/share-utils.ts`
- 全局国际化：`src/i18n/messages/en.json`, `src/i18n/messages/ja.json`

**核心功能：**

1. **全局国际化架构**
   - 分享文案统一配置在全局 i18n (`messages/en.json` 和 `messages/ja.json`)
   - 支持英语和日语双语分享文案
   - 结构化配置：`share_texts.{content_type}.{platform}`
   - 各平台回退到对应内容类型的默认文案

2. **智能文案生成流程**
   - 组件层：ShareMenu 使用 `useTranslations("share_texts")` 获取全局文案
   - 平台适配：根据平台(Twitter/Facebook/Reddit/WebShare)和内容类型(Character/Image/Video/World)自动选择文案
   - 自定义覆盖：支持用户自定义文案覆盖默认文案
   - 工具层：share-utils.ts 保持框架无关,提供英文默认回退

3. **平台特定分享**
   - Twitter: 使用 intent API,支持文本+URL
   - Facebook: 使用 sharer API,支持URL分享
   - Reddit: 使用 submit API,支持标题+URL
   - Web Share API: 移动端原生分享,支持文件分享

4. **分享卡片集成**
   - 自动为角色生成 TCG 卡片作为分享图片
   - 卡片图片用作 OG 标签,提升社交分享体验
   - 支持下载卡片图片到本地

**使用示例：**

```typescript
// ShareMenu 组件使用
<ShareMenu
  content={{
    type: "character",
    id: characterUuid,
    title: characterName,
    imageUrl: characterImage, // 可选,会自动生成
  }}
  options={{
    platforms: [
      SharePlatform.TWITTER,
      SharePlatform.FACEBOOK,
      SharePlatform.REDDIT,
      SharePlatform.LINK,
    ],
    onSuccess: (platform) => {
      console.log(`Shared to ${platform}`);
    }
  }}
/>
```

**国际化配置结构：**

```typescript
// src/i18n/messages/en.json 和 ja.json 中的配置结构
{
  "share_texts": {
    "character": {
      "twitter": "Just created an amazing OC \"{name}\" on AnividAI! 🎨✨ Check it out:",
      "facebook": "Check out my original character \"{name}\" created with AnividAI! 🎨",
      "reddit": "I made an original character \"{name}\" using AnividAI. What do you think?",
      "default": "I created an OC \"{name}\" on AnividAI! Come and see:"
    },
    "image": {
      "twitter": "Generated this awesome anime art on AnividAI! 🎨✨",
      "facebook": "Check out this anime artwork I created with AnividAI!",
      "reddit": "Created this anime art using AnividAI. Thoughts?",
      "default": "Check out this artwork I created on AnividAI!"
    },
    "video": {
      "twitter": "Just made an anime video on AnividAI! 🎬✨ Take a look:",
      "facebook": "Check out this anime video I created with AnividAI! 🎬",
      "reddit": "Created an anime video using AnividAI. What do you think?",
      "default": "I created an anime video on AnividAI! Come watch:"
    },
    "world": {
      "twitter": "Built an anime world \"{name}\" on AnividAI! 🌍✨ Explore it here:",
      "facebook": "Check out the anime world \"{name}\" I created with AnividAI! 🌍",
      "reddit": "I built a world called \"{name}\" using AnividAI. What do you think?",
      "default": "I created a world \"{name}\" on AnividAI! Come explore:"
    }
  }
}
```

**组件实现细节：**

```typescript
// ShareMenu.tsx 中的国际化实现
const tShareTexts = useTranslations("share_texts");

// 生成本地化分享文案
const getLocalizedShareText = useCallback((platform: SharePlatform): string => {
  const typeKey = content.type;
  const title = content.title || "";
  const platformKey = platform.toString().toLowerCase() as keyof typeof tShareTexts;

  // 从全局 i18n 获取文案
  if (typeKey === "character" && title) {
    const texts = tShareTexts.character;
    return texts[platformKey] || texts.default;
  }
  // ... 其他内容类型

  return title || "Check out this awesome content!";
}, [content, tShareTexts]);

// 分享时使用本地化文案
const handleShare = async (platform: SharePlatform) => {
  const localizedText = getLocalizedShareText(platform);
  const shareContentWithText = { ...shareContent, text: localizedText };
  await shareToPlatform(shareContentWithText, platform);
  // ...
};
```

**奖励机制：**
- 每日分享奖励：用户每日首次分享可获得 +10 积分
- 后端通过 `/api/incentive/claim-share` 验证并发放奖励
- UI 显示每日奖励进度提示

#### 预览与自定义
弹出模态框支持：
- 卡片模板选择（TCG/海报/名片）
- 稀有度特效选择
- 主题色彩调整
- PDF 格式预览

#### 分享集成
- 复制分享链接：`{BASE_URL}/i/{character_uuid}`
- 一键保存到相册（下载图片）
- 分享到社交媒体（调用 Web Share API）

### 3.4 数据流设计

#### 卡片生成流程
```
用户点击生成卡片
    ↓
前端请求 /api/og/character/[uuid]
    ↓
后端获取角色数据
    ↓
渲染 Satori 组件为 PNG
    ↓
返回图片流/保存到 R2
    ↓
前端展示/下载
```

#### PDF 导出流程
```
用户选择 PDF 导出
    ↓
前端请求 /api/export/character/[uuid]/pdf
    ↓
后端获取完整角色数据
    ↓
渲染 PDF 模板
    ↓
返回 PDF 文件
    ↓
浏览器下载
```

### 3.5 缓存策略

#### R2 存储缓存
- 卡片图片：基于 `{uuid}_{template}_{rarity}` 键缓存
- PDF 文档：基于 `{uuid}_{format}_{template}` 键缓存
- 缓存时间：7 天（可配置）

#### CDN 缓存
- API 响应设置 Cache-Control 头
- 静态资源通过 CDN 分发

## 4. 用户交互流程

### 4.1 炫酷分享卡片流程
1. 用户在 OC 详情页点击"生成分享卡"
2. 弹出模板选择器（TCG/海报/名片）
3. 选择稀有度和主题风格
4. 实时预览效果
5. 点击"生成并下载"
6. 显示生成进度
7. 下载完成，显示分享选项

### 4.2 PDF 档案导出流程
1. 点击"导出 PDF 档案"
2. 选择格式模板（现代/经典/打印）
3. 预览文档大纲
4. 点击"生成 PDF"
5. 显示下载链接
6. 可选择预览或直接下载

### 4.3 数据导出流程
1. 点击"导出 JSON/Markdown"
2. 选择包含内容（完整/公开）
3. 确认导出
4. 自动下载文件

## 5. 性能与优化

### 5.1 性能指标
- 卡片生成：< 2 秒
- PDF 导出：< 5 秒
- JSON/Markdown：< 1 秒

### 5.2 优化策略
- **异步生成**：大文件异步生成，完成后通知用户
- **进度反馈**：实时显示生成进度
- **预生成缓存**：热门 OC 预生成卡片
- **图片压缩**：自动压缩导出的图片文件
- **并发控制**：限制同时生成的请求数

## 6. 权限与安全

### 6.1 访问控制
- **私有角色**：仅所有者可导出
- **公开角色**：任何人可导出分享卡
- **创作者信息**：导出时可选包含/隐藏

### 6.2 敏感信息处理
- JSON 导出提供 `include` 参数控制敏感信息
- 默认不包含邮箱、手机等隐私数据
- 导出记录写入日志（可选）

## 7. 变更历史
- 2026-01-23 FEAT-SHARE-EXPORTS 方案初始化，整合卡片生成和详情导出功能
- 2026-02-05 社交分享优化完成：
  - ✅ 新增智能分享文案生成系统
  - ✅ 根据平台和内容类型自动生成优化文案
  - ✅ 支持多语言分享文案配置（英语、日语）
  - ✅ 采用全局国际化配置架构（messages/en.json, messages/ja.json）
  - ✅ ShareMenu 组件集成 useTranslations 获取本地化文案
  - ✅ share-utils.ts 保持框架无关，提供英文默认回退
  - ✅ 集成分享卡片到社交分享流程
  - ✅ 完善文档补充分享实现细节和配置结构

## 8. 影响清单

### API 变更
- ✅ 更新 `/api/og/character/[uuid]` - 支持多种模板参数
- ✅ 新增 `/api/export/character/[uuid]/pdf` - PDF 导出
- ✅ 新增 `/api/export/character/[uuid]/json` - JSON 导出
- ✅ 新增 `/api/export/character/[uuid]/markdown` - Markdown 导出

### 前端组件
- ✅ 新增 `ExportDropdown` 组件
- ✅ 升级 `ActionBar` 集成导出功能
- ✅ 升级 `share-utils.ts` 智能文案生成
- ✅ 升级 `ShareMenu` 组件集成优化分享文案
- ✅ 新增分享文案国际化配置

### 数据库
- ✅ 无需数据库变更（使用现有 character 表）

### 国际化
- ✅ 更新 `messages/en.json` 添加全局分享文案配置
- ✅ 更新 `messages/ja.json` 添加全局分享文案配置（日语）
- ✅ 从 `pages/character-detail/en.json` 移除分享文案配置

### 文档
- ✅ 创建 `docs/2-implementation/api/export.md` API 契约文档
- ✅ 更新 `docs/2-implementation/api/README.md` API 索引

### 测试
- ✅ 创建 `tests/export.test.ts` 测试用例
