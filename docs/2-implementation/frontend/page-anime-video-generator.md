**Related**: [feature-anime-video-generation](../features/feature-anime-video-generation.md)

# 页面：Anime Video Generator（视频生成器，Wan2.5 对齐）

## 页面目标与入口

- 目标：从文本/OC/参考图生成 3–10s 动漫风格短视频，支持参数配置、进度展示、结果播放与复用。
- 入口：`/[(locale)]/(default)/ai-anime-video-generator/`

## 架构与复用

- 框架：Next.js App Router + React 19 + TS
- UI：Tailwind CSS 4 + Shadcn UI（主题变量，避免硬编码颜色）
- 状态：前端以局部 state 管理（无 RHF）；参数校验由服务端 Zod 负责
- i18n：页面级翻译（`src/i18n/pages/ai-anime-video-generator/en.json`），不使用全局 messages
- 复用：
  - 结果展示使用 `VideoPlayerCard`；未登录右侧使用示例瀑布流 `VideoExamplesWaterfall`

## 主要区块

- Prompt/OC/参考图输入区：文本输入 + 角色选择（`CharacterSelector`）+ 参考图上传（`ReferenceImageUpload`）
- 参数区：模型、时长（3–10s）、分辨率、比例、风格、镜头运动（按模型配置过滤）
- 生成与进度：`Create Video` → 禁用按钮 → `useGenerationPolling` 轮询状态
- 结果区：`VideoPlayerCard` 播放结果；未登录则展示示例瀑布流

## 登录态与营销组件显示规则

- 未登录：顶部为视频生成器（右侧展示示例视频画廊），其下展示整套营销组件（Introduction / Benefits / HowToUse / CharacterVideoGallery / FAQ / CTA）。
- 已登录：仅显示视频生成器；隐藏下方营销组件；可保留轻量提示位（如“Need help? Read how-to”链接）。

伪代码：

```
const session = useAuth();
return (
  <Page>
    <VideoGenerator />
    {!session && <MarketingBlocks />}
  </Page>
)
```

## 营销组件设计（未登录展示）

- Introduction（`src/components/video-page/Introduction.tsx`）
  - 简要说明“从图/文到动”的价值与场景（社媒短视频/作品集）
- Benefits（`src/components/video-page/Benefits.tsx`）
  - 3x2 卡片：一致风格图标 + 标题 + 一句话说明（性能、风格一致性、移动端友好等）
- HowToUse（`src/components/video-page/HowToUseSection.tsx`）
  - 步骤：Describe → Choose model/styles → Set duration/ratio → Generate → Share
- CharacterVideoGallery（`src/components/video-page/CharacterVideoGallery.tsx`）
  - 上方横向角色选择/轮播；下方展示角色相关短视频卡片（播放器封面，点击播放）
- FAQ（`src/components/video-page/VideoFAQ.tsx`）
  - 常见问题：配额/清晰度/失败重试/版权与限制（英文回答）
- CTA（`src/components/video-page/CTA.tsx`）
  - 行动按钮：Sign in / Start Creating（根据未登录状态显示）

## 示例视频画廊（右侧展示，未登录）

- 组件：`src/components/video/VideoExamplesWaterfall.tsx`
- 数据：`src/configs/gallery/video-example-gallery.json`（内含 r2_path/poster_path/parameters）
- 特性：懒加载、响应式两列/三列、点击一键带参至左侧面板

## 交互与状态

- 初始：禁用生成直至必填项通过 Zod
- 生成中：按钮 loading，显示阶段与百分比（若可用）
- 成功：插入结果卡片，滚动至可视区域
- 失败：英文错误 Toast（统一错误码映射）

## API 交互

- 创建任务：`POST /api/anime-video/create-task`（字段与服务端一致：`prompt, model_id, duration, aspect_ratio, resolution, motion?, style_preset?, reference_image_url?, character_uuid?`）
- 轮询状态：`GET /api/generation/status/[generation_uuid]`（`status/results[]`）
- Webhook：服务端处理，前端不直连

## 简要伪代码（仅说明流程）

```
onSubmit(form):
  validate(form) // zod
  const { uuid } = await createTask(form)
  startPolling(uuid)

startPolling(id):
  while (!done):
    s = await getStatus(id)
    updateProgressUI(s)
    if s.state in ["succeeded","failed"] break
    wait(1500)
```

## i18n 占位（英文示例）

- keys: title, subtitle, input.prompt, input.oc, input.referenceImage, parameters.model, parameters.duration, parameters.ratio, parameters.quality, parameters.camera_motion, buttons.create_video, buttons.generating, toast.started, toast.completed, errors.\*

## 代码位置（现状）

- 页面：`src/app/[locale]/(default)/ai-anime-video-generator/page.tsx`
- 生成器：`src/components/video/VideoGenerator.tsx`
- 示例瀑布流：`src/components/video/VideoExamplesWaterfall.tsx`
- 播放卡片：`src/components/video/VideoPlayerCard.tsx`
- 轮询：`src/hooks/useGenerationPolling.ts`

## 权限/计费（前端）

- 仅登录态可创建任务；未登录展示示例与营销组件
- Credits 显示：当前基于模型 `credits_per_generation` 静态展示；未来按 `duration/resolution/model` 动态计算（文案已提示）
