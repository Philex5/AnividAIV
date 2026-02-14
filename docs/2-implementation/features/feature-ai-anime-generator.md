# AI 动漫图片生成器 Feature 实现方案

**Related**: 核心功能 (PRD 段落: [AI动漫图片生成器](../1-specs/PRD.md#ai动漫图片生成器-核心功能))

## 背景与目标

### 功能背景
实现 AnividAI 的核心功能之一 - AI 动漫图片生成器，为用户提供专业级的动漫风格图片生成体验。该功能需要支持多参数控制、批量生成、智能交互和响应式设计。

### 目标用户
- 动漫爱好者和创作者
- 设计师和内容创作者
- 对动漫风格图片有生成需求的用户

## 验收标准 (摘录自 PRD)

## 系统级流程/时序

### 主流程：图片生成（基于新架构）
1. **用户输入**: 用户在AI动漫生成器页面输入提示词（中/英文）
2. **参数选择**: 选择生成参数（模型/比例/数量/参考图片）和预设参数（风格/场景/服饰）
3. **参数验证**: AnimeGenerationService 验证所有输入参数
4. **提示词构建**: AnimePromptBuilder 构建完整的生成提示词
5. **任务创建**: BaseGenerationService 创建远程生成任务并原样记录 gen_type
6. **状态轮询**: 前端轮询统一状态API获取生成进度
7. **Webhook处理**: KieAI完成后通过统一Webhook更新任务状态
8. **多分辨率处理**: 系统自动生成mobile、desktop、detail三种分辨率
9. **结果展示**: 展示生成结果，支持查看详情和下载
10. **历史记录**: 完整参数记录，支持一键复用

### 辅助流程：智能交互
1. **示例复用**: 用户点击画廊示例图片 → 自动填充对应参数
2. **AI优化**: 用户输入简单描述 → AI自动优化提示词

### 架构优势
- **统一状态管理**: 使用BaseGenerationService的模板方法模式
- **专业化验证**: AnimeGenerationService专用参数验证
- **配置化分辨率**: 自动多分辨率处理
- **统一错误处理**: ValidationResult模式和标准化错误码

## gen_type 记录与展示策略

- 生成侧不对 gen_type 做白名单过滤，按请求原样记录。
- 展示侧由场景白名单控制可见性，避免新增 gen_type 时改动多处逻辑。

## 影响清单

### API 设计
- [生图服务架构](../backend/service-generation-architecture.md) - 统一生图架构设计
- `POST /api/anime-generation/create-task` - 动漫生图创建API
- `GET /api/generation/status/[uuid]` - 统一状态查询API
- `POST /api/generation/webhook` - 统一Webhook回调API

### 数据模型  
- [数据模型](../1-specs/data-models.md#anividai-扩展表结构) - generations、generation_images 等表
- [分辨率配置](../../src/configs/generation/resolution-configs.ts) - 多分辨率配置系统
- [JSON配置文件](../../src/configs/) - styles、scenes、outfits、models 等配置
- [gen_type 展示白名单](../../src/configs/gen-type-display.ts) - 场景化展示控制

### 前端组件
- [AI动漫生成器页面](../frontend/page-ai-anime-generator.md) - 主页面实现
- [动漫生成器组件](../frontend/component-anime-generator.md) - 核心生成组件
- [结果展示组件](../frontend/component-result-gallery.md) - 批量结果展示

### 后端服务
- [生图服务架构](../backend/service-generation-architecture.md) - 整体架构设计
- [动漫生成服务](../backend/service-anime-generation.md) - AnimeGenerationService实现
- [基础生成服务](../backend/service-generation-architecture.md#baseGenerationservice) - 通用逻辑

### 测试用例
- [测试用例索引](../../tests/test-cases/) - 覆盖主路径、错误边界、性能测试

## 核心功能模块

### 1. 参数控制系统
**组件**: ParameterSelector
**功能**:
- 模型选择 (gpt-image-1, nano banana)
- 图片比例 (1:1, 2:3, 3:4, 16:9)
- 生成数量 (1-4张)
- **风格预设** (宫崎骏、3D卡通、水彩、**No Presets**等)
  - **新增**: "No Presets" 选项，配图使用吉祥物粉文字显示
  - **智能切换**: 当用户选择OC后，自动切换到"No Presets"
  - **说明文字**: 选择"No Presets"时，按钮下方显示小字体说明，左侧与"Style:"参数名对齐
- 场景预设 (雪山、森林、城市、海边等)
- 服饰预设 (汉服、旗袍、JK制服等)
- **角色选择**: 支持OC角色选择，与风格自动联动
- 图生图参数 (参考图片)

### 2. 智能交互系统
**组件**: ExampleGallery, PromptOptimizer
**功能**:
- 示例图片一键复用参数
- AI 提示词智能优化
- 参数记忆和快速切换
- 渐进式功能展示 (基础/高级模式)

### 3. 生成结果系统
**组件**: GenerationResults
**功能**:
- 批量图片网格展示
- 单张图片详情查看
- 下载和分享功能
- 生成参数显示和复用

### 4. 示例画廊系统
**组件**: ExampleGallery
**功能**:
- 分类标签导航 (风格/场景/服饰)
- 可点击复用的示例图片
- 参数组合展示
- 懒加载和性能优化

### 5. 图片存储系统
**集成**: Cloudflare R2 + Framework Storage
**功能**:
- 使用框架内置的`@src/lib/storage.ts`进行图片上传
- 生成图片直接保存到Cloudflare R2存储
- 支持多尺寸缩略图生成和CDN分发
- 全球加速访问，无出站费用

## 技术架构

### 前端架构
- **框架**: Next.js 15 + React 19 + TypeScript
- **UI**: Tailwind CSS 4 + Shadcn UI
- **状态管理**: React Context + useReducer
- **国际化**: next-intl
- **表单**: React Hook Form + Zod

### 后端架构  
- **服务层**: AnimeGenerationService 继承 BaseGenerationService
- **API**: 专用动漫生图API + 统一状态管理API
- **数据库**: PostgreSQL + Drizzle ORM
- **AI集成**: KieAI平台 (gpt-image-1, nano-banana)
- **文件存储**: Cloudflare R2 + 自动多分辨率生成
- **提示词构建**: AnimePromptBuilder 专用构建器

### 数据流模式（新架构）
```
用户输入 → AnimeGenerationService → BaseGenerationService 模板方法
     ↓              ↓                        ↓
参数验证 → AnimePromptBuilder构建 → KieAI远程任务创建
     ↓              ↓                        ↓
前端轮询 → 统一状态API查询 → Webhook回调更新状态
     ↓              ↓                        ↓
结果展示 → 多分辨率图片处理 → R2存储+CDN分发
```

## 集成点和依赖

### ShipAny 框架集成
- **用户系统**: 使用框架的用户认证和权限管理
- **积分系统**: 集成 credits 表进行消费计费
- **支付系统**: 对接现有的 Stripe/Creem 支付流程
- **国际化**: 复用框架的多语言支持

### 外部服务依赖
- **AI 模型**: gpt-image-1 (OpenAI), nano banana (Google) 基于KIE AI平台
- **文件存储**: Cloudflare R2 (已配置)
- **CDN**: Cloudflare CDN 图片分发和缓存
- **监控**: 生成请求的性能监控

## Flux 2 Pro / Flux 2 Flex 接入开发方案（FEAT-FLUX2）

### 目标
- 在现有 Anime Generator 架构下，新增 `Flux 2 Pro` 与 `Flux 2 Flex` 两个图片模型。
- 保持“参数校验 → Provider 适配 → 统一回调/查询 → 结果入库”的既有链路，不引入旁路逻辑。

### 分阶段实施
- **Phase 1（本次）配置与文档落位**：完成模型契约文档 + `ai-models.json` 配置，模型状态设为 `inactive`，避免在适配器未就绪时暴露到前端。
- **Phase 2 Provider接入**：新增 `flux2-pro-adapter.ts`、`flux2-flex-adapter.ts`，请求字段映射为 `input_urls/aspect_ratio/resolution`，并在 `kie-ai-provider.ts` 按 `model_name` 路由。
- **Phase 3 API与校验联动**：在生图创建接口校验 `resolution in [1K,2K]`、`prompt length 3-5000`、多图上限；错误信息保持英文。
- **Phase 4 前端与计费上线**：开启 `status=active`，补齐模型 i18n、模型图标、高级模型标识；联动 credits 展示与扣费规则。

### 参数与计费约束
- **Flux 2 Pro**：`1K=50 credits`，`2K=70 credits`，默认 `1K`。
- **Flux 2 Flex**：`1K=140 credits`，`2K=240 credits`，默认 `1K`，标记 `is_premium=true`。
- 比例统一使用现有 `supported_ratios/image_size` 字段承载，provider 层映射到 KIE `aspect_ratio`。

### 风险与处理
- 当前 `KieAIProvider` 尚未识别 `flux-2/*`，若直接激活会触发 `Unsupported model` 异常；因此先 `inactive`。
- `input_urls` 与现有 `reference_image_urls` 字段名不一致，必须在 adapter 层显式映射，禁止前端直传新字段。
- 新模型文案必须通过页面级 i18n key 提供，禁止硬编码文案。

## 性能和扩展性考虑

### 性能优化
- **图片优化**: WebP 格式 + 多尺寸缩略图
- **缓存策略**: API 响应缓存 + Cloudflare CDN
- **懒加载**: 示例画廊和结果展示
- **并发控制**: 限制同时生成请求数量
- **R2存储**: 利用Cloudflare全球网络加速图片访问

## 变更历史
- 2025-09-09 创建 AI 动漫生成器 Feature 实现方案v1.0，定义核心功能模块和技术架构
- 2025-09-09 FEAT-001 优化参数控制系统，移除传统SD参数，支持现代AI模型gpt-image-1和nano banana，存储迁移至Cloudflare R2
- 2025-09-09 FEAT-005 参数配置系统重构，从数据库配置表改为JSON配置文件管理，简化参数系统
- 2025-10-02 架构重构：集成新一代生图服务架构，基于AnimeGenerationService继承BaseGenerationService，实现统一状态管理、专业化参数验证、配置化多分辨率处理和统一错误处理
- 2025-11-24 **FEAT-006 风格选择优化**：新增"No Presets"风格选项（配图使用吉祥物粉文字），实现OC选择时自动切换，说明文字改为按钮下方显示，优化用户体验
- 2026-02-06 FEAT-FLUX2 新增 Flux 2 Pro / Flux 2 Flex 接入方案（分阶段实施、参数约束与风险控制）
- 2026-02-06 FEAT-FLUX2 完成 Phase 2-3：新增 Flux 2 Pro/Flex Provider 适配器、create-task 参数校验、按分辨率计费并激活模型
