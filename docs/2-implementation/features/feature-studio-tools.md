# Studio Tools Feature 实现方案（轻量化配置驱动架构）

Related: PRD 段落 [Studio Tools](../../1-specs/PRD.md#Studio Tools) | 依赖 [AI 动漫图片生成器](./feature-ai-anime-generator.md)

## 背景与目标

### 背景

Studio Tools (原Studo Tools) 是围绕 OC（原创角色）的应用型页面集合，通过 Prompt 模板配置实现细分场景的专业化生成（如手办图、贴纸等）。每个应用独立路由、独立 SEO 优化，承接长尾关键词流量。

**核心设计原则**：

- **零新增基础设施**：100% 复用现有 GenerationService 与数据表，仅通过 `type` 字段区分应用类型
- **配置驱动差异化**：通过 Prompt 模板 + 参数预设实现应用个性化，无需编写新服务类
- **组件最大化复用**：保留动漫生成器的 UI 组件与交互模式，降低开发与维护成本

### 目标

- 快速上线多个垂直场景应用（MVP: Action Figure Generator）
- 每个应用页支持 OC 角色注入或用户上传素材
- SEO 友好的独立路由与元数据优化
- 全量国际化与响应式设计

## 验收标准（可测试）

- ✅ 每个应用详情页包含：Tool、Introduction、Benefits、HowToUse、Example Gallery、FAQ、CTA、Footer
- ✅ 支持两种素材输入方式：选择 OC 角色（使用其头像与属性）或上传用户图片
- ✅ 生成任务正确标记 `type` 字段（如 `action-figure`）
- ✅ 生成记录与图片正确写入 `generations` 和 `generation_images` 表
- ✅ 生成状态查询与 Webhook 回调复用现有流程
- ✅ 页面所有文案使用页面级 i18n 配置（禁止硬编码）
- ✅ 移动端/桌面端均通过视觉与交互验收
- ✅ 积分计费正确扣除，失败时正确退款

## 系统级流程/时序（与生图架构对齐）

1. ✅ 用户访问应用页（如 `/ai-action-figure-generator`）
2. ✅ 选择模板（决定 prompt、比例等参数）- 通过 `TemplateSelectorCompact` 组件
3. ✅ 提供参考素材：
   - 方式A：选择 OC 角色 → 自动使用 `avatar_url` + 注入角色属性到 prompt
   - 方式B：上传用户图片 → 设置为 `reference_image_urls`
4. ✅ 可选补充描述文本
5. ✅ 构造完整请求：
   - `prompt = 模板prompt + OC特征（可选） + 用户补充` （基于PromptBuilder基础方法）
   - `aspect_ratio = 模板预设比例`
   - `gen_type = 应用类型标识（如 "action-figure"）`
6. ✅ 调用 `POST /api/anime-generation/create-task` → 后端委托 `AnimeGenerationService` 创建任务
7. ✅ 前端轮询 `GET /api/generation/status/[uuid]` 获取进度
8. ✅ Webhook 回调更新状态，结果写入 `generation_images` 表（`gen_type` 字段标识来源）
9. ✅ 前端结果区展示图片画廊，支持下载、收藏、分享

**关键实现点**：

- 页面路由：`src/app/[locale]/(default)/ai-action-figure-generator/page.tsx`
- 参数支持：URL 参数 `gen_image_id`（复用图片参数）、`character_uuid`（OC角色）
- 用户态切换：已登录用户显示全屏工具，未登录用户显示营销页面

## 信息架构与路由

### 路由模式（分散式）

**无独立目录页**，每个应用拥有独立 SEO 友好路由：

- **应用详情页**：`/{app-slug}`
  - ✅ 示例：`/ai-action-figure-generator`
  - ✅ 文件：`src/app/[locale]/(default)/ai-action-figure-generator/page.tsx`
  - ✅ Metadata 生成：`generateMetadata` 函数基于页面配置动态生成 SEO 元数据
  - ✅ Canonical URL：根据 locale 自动生成规范链接

- **支持参数**：
  - ✅ `?character_uuid=xxxx`：必须是用户自己的 OC，支持 URL 参数预选角色
  - ✅ `?gen_image_id=xxxx`：必须是自己的或 public 图片，支持参数复用
  - `?gen_video_id`：预留参数（视频类应用）

**应用发现入口**：

- ✅ 首页"Studio Tools"板块（通过 `src/configs/apps/oc-apps.json` 配置驱动）
- ✅ 角色详情页推荐相关应用
- ✅ 社区标签筛选（如 `#ActionFigure`）

### MVP 应用清单（当前实现）

| 应用 Slug                    | 名称                       | 类型  | 状态      | 描述                                  |
| ---------------------------- | -------------------------- | ----- | --------- | ------------------------------------- |
| `ai-action-figure-generator` | AI Action Figure Generator | Image | ✅ 已上线 | 生成专业手办效果图，支持 6 种模板样式 |
| `ai-sticker-generator`       | AI Sticker Generator       | Image | ✅ 已上线 | 生成可爱贴纸，支持 6 种风格模板       |

**已实现模板**（`src/configs/prompts/oc-apps/action-figure-templates.json`）：

1. **Desk Model with ZBrush Display** - 桌面模型展示
2. **Character Trait Toy Pack** - 角色特征玩具包装
3. **Acrylic Base Figure** - 亚克力底座手办
4. **Cabinet Display** - 展示柜陈列
5. **Lego Figure Display** - 乐高风格手办
6. **Figure Group Display** - 多人手办组合

**已实现模板**（`src/configs/prompts/oc-apps/sticker-templates.json`）：

1. **Pixar Style** - 皮克斯风格 3D 卡通贴纸，表情生动，精致电影感
2. **Pixel Art** - 像素艺术贴纸，8-bit 或 16-bit 复古游戏风格，透明背景
3. **Watercolor Soft** - 水彩柔和贴纸，温柔渐变，艺术感
4. **Pop Art** - 波普艺术贴纸，漫画风格，鲜艳色彩，半调图案
5. **Graffiti** - 涂鸦风格贴纸，粗犷喷漆效果，街头艺术风格
6. **Chibi** - Q 版可爱贴纸，夸张可爱角色，圆润俏皮
7. **Minimal Line Art** - 简约线条贴纸，干净线条，扁平化设计，透明背景
8. **No Preset** - 无预设，AI 根据输入自动决定风格
9. **OC Nine Grid** - OC 专属九宫格贴纸，一次生成9张不同表情的贴纸合集

**OC Nine Grid 九宫格模板详情**：

- 模板 ID: `oc_nine_grid`
- 支持所有输入模式（Text Only / Describe&Ref / OC）
- 生成 1 张图片，包含 9 个不同表情的贴纸排布成 3x3 九宫格
- Prompt 描述了 3x3 网格布局，每个单元格展示 OC 的不同表情
- 9 种表情：
  1. happy and waving - 开心挥手
  2. angry and stomping - 生气跺脚
  3. sad and crying - 悲伤哭泣
  4. surprised with open mouth - 惊讶张嘴
  5. shy and blushing - 害羞脸红
  6. cool posing - 酷炫姿势
  7. making a heart shape - 爱心手势
  8. thinking with wonder - 思考疑惑
  9. sleepy and yawning - 困倦打哈欠
- 结果展示：单张图片（内含九宫格布局）
- 计费：1 张图片的标准计费

**未来扩展**（设计预留）：

- `character-intro-video`：角色介绍视频（Video 类型）- 已有配置文件 `character-intro-video.json`
- `story-writer`：角色故事生成（Text 类型）- 已有配置文件 `story-writer.json`

## 页面模板（复用 AI 动漫生成器页面结构）

✅ **已实现布局**（`src/app/[locale]/(default)/ai-action-figure-generator/page.tsx`）：

```
已登录用户：全屏工具区（无营销干扰）
- 全屏 ActionFigureTool 组件

未登录用户：
  - 第一屏：全屏 ActionFigureTool（工具体验）
  - Introduction（AI手办生成器介绍 + SEO 关键词落地）
  - Benefits（价值点卡片 - ActionFigureBenefits）
  - HowToUse（4 步骤图文 - HowToUseSection）
  - FAQ（常见问题 - OCMakerFAQ）
  - CTA（引导登录/订阅/开始创作 - CTASection）
  - Footer（底部通用组件 - AppFooter）
```

**核心组件**（`src/components/oc-apps/ActionFigureTool.tsx`）：

- 左右分栏布局
- 左侧：模板选择、参考图上传、角色选择、模型选择、补充描述
- 右侧：示例画廊、生成进度、结果展示

**StickerTool 组件特殊功能**（`src/components/oc-apps/StickerTool.tsx`）：

- 支持 OC Nine Grid 九宫格模式（`is_nine_grid: true`）
- 当选择九宫格模板时：
  - 锁定 batch_size 为 1（只生成一张九宫格图片）
  - 显示九宫格专属提示（说明将生成包含9个表情的单张图片）
  - 支持所有输入模式（Text Only / Describe&Ref / OC），不再强制使用 OC 模式
- 支持三种输入模式切换：Text Only / Describe&Ref / OC
- 使用标准单任务轮询（与其他模式一致）

**国际化配置**：

- ✅ 应用页：`src/i18n/pages/ai-action-figure-generator/en.json`
  - metadata：title、description、keywords
  - controls：模型、自动、比例、数量
  - tool：工具栏文案
  - Introduce：介绍文案
  - benefits：6个价值点
  - howToUse：4步教程
  - FAQ：10个常见问题
  - call_to_action：行动号召
- ✅ 应用清单：`src/configs/apps/oc-apps.json` 中使用 i18n key 引用

## 前端设计

### 组件复用

✅ **复用动漫生成器组件**：

- ✅ `CharacterSelector`：OC 角色选择器
- ✅ `ReferenceImageUpload`：参考图片上传
- ✅ `ModelSelectorWithIcon`：模型选择
- ✅ `useGenerationPolling`：生成状态轮询
- ✅ `ImagePreviewDialog`：图片预览弹窗
- ✅ `toImageUrl`：R2 图片 URL 构造

### 新增组件

✅ **Studio Tools 专用组件**（`src/components/oc-apps/`）：

- ✅ `ActionFigureTool.tsx`：主工具组件
  - 左右分栏布局
  - 模板选择器集成
  - 参考图/OC 角色双模式
  - 生成控制与状态管理
  - 结果展示画廊

- ✅ `TemplateSelectorCompact.tsx`：模板选择器
  - 紧凑型网格布局
  - 缩略图预览
  - 模板信息展示（名称、描述、比例）
  - 选中状态管理

- ✅ `action-figure/ExamplesGallery.tsx`：示例画廊
  - 预设示例展示
  - 一键复用参数

### 关键交互

- ✅ **模板切换**：选择模板后自动更新比例参数预览
- ✅ **参考图切换**：上传图片 / OC 角色二选一（互斥逻辑）
- ✅ **URL 参数复用**：
  - `gen_image_id`：自动加载图片参数（需验证权限）
  - `character_uuid`：自动预选 OC 角色（需验证权限）
- ✅ **示例一键复用**：点击示例 → 自动填充模板 + 参考图参数
- ✅ **九宫格模式**（Sticker 专属）：
  - 选择 OC Nine Grid 模板时，锁定 batch_size 为 1（单张图片）
  - Prompt 描述 3x3 九宫格布局，AI 生成包含 9 个表情的单张图片
  - 支持所有输入模式（Text Only / Describe&Ref / OC）
  - 结果为标准单张图片展示（与其他模式一致）

## 后端设计

### 生成机制（零新增服务）

✅ **完全复用 `AnimeGenerationService`**：

- 前端职责：
  - ✅ 读取模板配置 `src/configs/prompts/oc-apps/action-figure-templates.json`
  - ✅ 构造最终 prompt：`模板prompt + OC特征（可选） + 用户补充`
  - ✅ 设置 `gen_type = "action-figure"` 标识来源
  - ✅ 通过 `validateGenerationType` 验证生成类型
- **后端无感知**：按标准 Image 生成流程处理，仅在数据库中记录 `type` 字段

### 数据模型（零新增字段/表）

**复用现有表结构**：

1. **`generations` 表**：
   - `type` 字段设为应用标识（如 `"action-figure"`）
   - 其他字段（prompt、model_id、reference_image_url、character_uuids等）按标准流程填充

2. **`generation_images` 表**：
   - `gen_type` 字段设为应用标识（与 `generations.type` 保持一致）
   - 其他字段（image*url、thumbnail*\*、final_prompt等）按标准流程填充

**未来多媒体扩展预留**（设计概念，暂不实现）：

- `generation_videos`：视频类应用（如角色介绍视频）
- `generation_texts`：文本类应用（如故事生成）
- `generation_audios`：音频类应用（如语音合成）

### API 设计

**复用现有接口**：

- ✅ `POST /api/anime-generation/create-task`
  - ✅ 增补 `gen_type` 字段标识应用类型
  - ✅ 其他参数完全一致

- ✅ `GET /api/generation/status/[uuid]`：无需改动
- ✅ `GET /api/anime-generation/history`：可选按 `gen_type` 筛选
- ✅ `POST /api/generation/webhook`：无需改动

**新增配置读取接口**：

- ✅ `GET /api/oc-apps/action-figure/templates`
  - ✅ 用途：获取手办模板配置
  - ✅ Auth：不需要
  - ✅ 位置：`src/app/api/oc-apps/action-figure/templates/route.ts`
  - ✅ Response：直接返回 JSON 配置文件内容

**页面数据服务**：

- ✅ `src/services/page.ts`：`getActionFigureGeneratorPage(locale)` 函数
- ✅ 通过 `getPage("ai-action-figure-generator", locale)` 加载页面配置

## 配置文件管理

### 模板配置

✅ **文件位置**：`src/configs/prompts/oc-apps/action-figure-templates.json`

✅ **已实现 6 个模板**：

```json
{
  "version": "1.0.0",
  "templates": [
    {
      "id": "desk_model",
      "name": "Desk Model with ZBrush Display",
      "description": "1/7 Scale Realistic Model on Desk...",
      "thumbnail": "/imgs/figure_templates/action-figure-template-1.webp",
      "aspect_ratio": "3:4",
      "prompt": "Create a 1/7 scale commercial model..."
    },
    {
      "id": "toy_pack",
      "name": "Character Trait Toy Pack",
      "description": "Action battle pose with effects...",
      "thumbnail": "/imgs/figure_templates/action-figure-template-2.webp",
      "aspect_ratio": "3:4",
      "prompt": "Create a realistic action figure packaging..."
    },
    ... (共 6 个模板)
  ]
}
```

### 应用清单配置

✅ **文件位置**：`src/configs/apps/oc-apps.json`

✅ **当前配置**：

```json
{
  "version": "1.0.0",
  "apps": [
    {
      "slug": "ai-action-figure-generator",
      "name": "Action Figures",
      "kind": "image",
      "i18n_name_key": "oc_apps.action_figure.title",
      "i18n_desc_key": "oc_apps.action_figure.desc",
      "prompt_file": "src/configs/prompts/oc-apps/action-figure-templates.json",
      "default_model": "image-default",
      "billing_multiplier": 1,
      "seo_keywords": ["ai action figure generator", ...]
    }
  ]
}
```

**作用**：

- ✅ 定义可用应用列表
- ✅ 配置应用元数据（名称、描述、SEO 关键词）
- ✅ 驱动首页"Studo Tools"板块展示
- ✅ 配置默认模型和计费倍率

### 国际化配置

✅ **应用页翻译**：`src/i18n/pages/ai-action-figure-generator/en.json`

**完整配置内容**：

- ✅ metadata：title、description、keywords
- ✅ controls：模型、自动、比例、数量
- ✅ tool：工具栏文案（25条）
- ✅ Introduce：介绍文案
- ✅ benefits：6个价值点
- ✅ howToUse：4步教程
- ✅ FAQ：10个常见问题
- ✅ call_to_action：行动号召
- ✅ image_detail：图片详情页操作

✅ **模板工具函数**：`src/lib/template-utils.ts`

- 标准化 API 响应格式处理
- `Template` 接口定义
- `processTemplatesResponse` 统一处理函数

✅ **应用清单翻译**：通过 i18n key 在 `oc-apps.json` 中引用

## 影响清单（双向链接）

### API 设计

- ✅ `docs/2-implementation/api/oc-apps.md` - Studo Tools API 规范
- ✅ `docs/2-implementation/api/anime-generation.md` - gen_type 增补说明
- ✅ `src/app/api/oc-apps/action-figure/templates/route.ts` - 模板配置 API

### 数据模型

- ✅ `docs/1-specs/data-models.md` - type 字段使用约定，预留多媒体扩展设计

### 前端文档

- ✅ `docs/2-implementation/frontend/page-ai-action-figure-generator.md` - ai action figure MVP应用详细设计
- ✅ `docs/2-implementation/frontend/page-ai-sticker-generator.md` - ai sticker generator 详细设计
- ✅ `docs/2-implementation/frontend/` - ai sticker generator 页面世界
- ✅ `src/app/[locale]/(default)/ai-action-figure-generator/page.tsx` - 页面入口
- ✅ `src/components/oc-apps/ActionFigureTool.tsx` - 主工具组件
- ✅ `src/components/oc-apps/TemplateSelectorCompact.tsx` - 模板选择器
- ✅ `src/components/oc-apps/action-figure/ExamplesGallery.tsx` - 示例画廊

### 后端文档

- ✅ 复用 `docs/2-implementation/backend/service-anime-generation.md`
- ✅ `src/services/page.ts` - 页面数据服务

### 配置文件

- ✅ `src/configs/prompts/oc-apps/action-figure-templates.json` - 手办模板配置（6个模板）
- ✅ `src/configs/apps/oc-apps.json` - 应用清单配置
- ✅ `src/i18n/pages/ai-action-figure-generator/en.json` - 页面级国际化配置

### 测试用例

- ✅ `tests/test-cases/FEAT-oc-apps-action-figure.md` - 专用测试用例

### 任务管理

- ✅ `docs/3-operations/tasks/tasks-feature-oc-app-ai-action-figure.md` - 详细开发任务列表

### 工具与库

- ✅ `src/lib/template-utils.ts` - 统一模板处理工具
- ✅ `src/lib/generation-type-validator.ts` - 生成类型验证

## 性能与扩展性

- **模板配置懒加载**：按需读取应用模板配置，减少首屏加载
- **图片资源 CDN 加速**：模板缩略图与示例图通过 R2 CDN 分发
- **应用按需扩展**：新增应用仅需添加配置文件 + 页面文件，无需改动核心服务
- **SEO 优化**：每个应用独立 meta 标签与 schema.org 结构化数据

## 权限与计费

- **统一积分系统**：复用现有 credits 计费机制
- **按图片数量计费**：与动漫生成器相同规则
- **VIP 权益**：高速队列、去水印、更高分辨率（由 generations 表的 user 权限控制）

## 监控与分析

- **应用使用统计**：按 `gen_type` 分组统计生成量、成功率
- **转化漏斗**：访问 → 选择模板 → 提供参考图 → 发起生成 → 成功
- **SEO 指标**：应用页入口流量与关键词排名跟踪

## 变更历史

- 2026-02-04 FEAT-studio-tools 移除九宫格模板对输入模式的限制（支持所有模式：Text Only/Describe&Ref/OC）
- 2025-12-19 FEAT-studio-tools 新增 OC Nine Grid 九宫格贴纸模板（OC专属模式，一次生成9张不同表情的贴纸合集）
- 2025-11-26 FEAT-oc-apps 新增 AI Sticker Generator 应用（完全复用 Action Figure 样式，差异化配置：6种贴纸风格模板、贴纸专用文案、营销组件）
- 2025-11-26 FEAT-oc-apps 文档更新（基于当前最新实现刷新所有配置和实现细节）
- 2025-10-31 FEAT-oc-apps 架构简化（移除目录页，采用分散式路由；零新增表/字段，完全复用 GenerationService；强化配置驱动理念）
- 2025-10-15 FEAT-oc-apps 扩展多媒体范畴（Image/Video/Text/Audio 设计预留）
- 2025-10-15 FEAT-oc-apps 创建 v1（目录页与三个应用页设计，确定路由与配置化方案）

## 附录：核心文件索引

### 页面与路由

- `src/app/[locale]/(default)/ai-action-figure-generator/page.tsx` - 手办页面入口（157行）
- `src/app/[locale]/(default)/ai-sticker-generator/page.tsx` - 贴纸页面入口（仿 Action Figure 结构）
- `src/services/page.ts` - 页面数据服务

### 工具组件

- `src/components/oc-apps/ActionFigureTool.tsx` - 手办主工具组件
- `src/components/oc-apps/StickerTool.tsx` - 贴纸主工具组件（100% 复用 ActionFigureTool）
- `src/components/oc-apps/TemplateSelectorCompact.tsx` - 模板选择器
- `src/components/oc-apps/action-figure/ExamplesGallery.tsx` - 手办示例画廊
- `src/components/oc-apps/sticker/ExamplesGallery.tsx` - 贴纸示例画廊

### 配置文件

- `src/configs/apps/oc-apps.json` - 应用清单（2个应用）
- `src/configs/prompts/oc-apps/action-figure-templates.json` - 手办模板配置（6个模板）
- `src/configs/prompts/oc-apps/sticker-templates.json` - 贴纸模板配置（6个模板）
- `src/i18n/pages/ai-action-figure-generator/en.json` - 手办页面国际化配置（221行）
- `src/i18n/pages/ai-sticker-generator/en.json` - 贴纸页面国际化配置（200+行）

### API 接口

- `src/app/api/oc-apps/action-figure/templates/route.ts` - 手办模板配置 API
- `src/app/api/oc-apps/sticker/templates/route.ts` - 贴纸模板配置 API

### 工具库

- `src/lib/template-utils.ts` - 模板处理工具
- `src/lib/generation-type-validator.ts` - 生成类型验证

### 营销组件

- `src/components/oc-maker/Introduction.tsx` - 介绍页
- `src/components/action-figure-page/Benefits.tsx` - 手办价值点
- `src/components/sticker-page/Benefits.tsx` - 贴纸价值点
- `src/components/anime-page/HowToUseSection.tsx` - 使用步骤
- `src/components/oc-maker/OCMakerFAQ.tsx` - FAQ
- `src/components/oc-maker/CTASection.tsx` - 行动号召
- `src/components/blocks/footer/AppFooter.tsx` - 页脚
