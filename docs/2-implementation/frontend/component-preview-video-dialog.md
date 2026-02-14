**Related**: [feature-anime-video-generation](../features/feature-anime-video-generation.md)

# 组件：Video Preview Dialog（视频预览对话框）

视频预览窗口用于承接 Anime Video 结果中的「查看详情」需求。整体交互与布局复用图片预览对话框（component-preview-image-dialog.md），媒体展示区保持在左侧（与图片版一致），差异仅在媒体类型从图片换为视频。本文仅描述视频特有/不同点，能复用的不再赘述。

## 组件位置

- UI 组件：`src/components/video/VideoPreviewDialog.tsx`
- 使用入口：`src/components/video/VideoGenerator.tsx` 及其他视频结果列表/画廊（点击结果卡片后挂载该对话框）

## 简图（与图片对话框一致，媒体在左侧）

```text
┌──────────────────────────────────────────────────────────────┐
│ Dialog Header: title                                         │
├──────────────────────────────────────────────────────────────┤
│ 左侧：视频预览（三段）              │     右侧：信息与操作区       │
│  • 上：Badge（右上角）             │  • Create New / Share / 可见性 │
│  • 中：视频播放器（自适应）         │  • 模型/OC/时长/清晰度/创建时间 │
│  • 下：快捷链接（暂无）                  │  • Prompt 文本/复制/下载/复用   │
└──────────────────────────────────────────────────────────────┘
```

主要交互时序（与图片版一致，接口资源改为视频）：

```text
用户点击结果 → 打开对话框(open=true, 传入 videoUuid)
  → useEffect 拉取 GET /api/generation/video/:uuid
    → 成功：渲染视频与信息
    → 失败：展示 pageData.video_detail.error

Visibility 切换 → PATCH /api/generation/video/:uuid{visibility_level}
  → 成功：更新本地 videoDetail.visibility_level 与 videoDetail.generation.visibility_level

复制 Prompt → navigator.clipboard → 成功/失败 toast
下载（当前清晰度）→ 使用当前 variant.video_url → 保存为 anime-<uuid>-<quality>.<ext>
复用参数 → 调用 onReuseParameters(videoUuid) → toast(loading) → 关闭对话框
快捷链接 →
  - 暂无
```

## 样式与布局（与图片版统一）

- 对话框大小与滚动策略一致：`max-w-[1100px]`、`max-h-[85–88vh]`、外层 `overflow-hidden`、左右子区 `overflow-auto`。
- 大屏两栏：`lg:flex-row`。本组件中，左侧为媒体预览区，右侧为信息与操作区（与图片版一致）。
- 左侧预览区三段：
  - 上：右上角 `Badge` 展示风格/标签（存在时）
  - 中：`<video>` 播放器自适应展示（`object-contain`，保持比例）

## 数据流与状态（视频特有）

```ts
type VideoVariant = {
  quality: "720p" | "1080p" | "source";
  video_url: string; // mp4/webm/hls 派生 URL，优先 mp4
  mime_type?: string; // 推断下载扩展名用
};

type VideoDetailResponse = {
  uuid: string;
  poster_url: string | null; // 首帧封面
  variants: VideoVariant[]; // 清晰度列表
  created_at: string | null;
  visibility_level: "public" | "private";
  style: string | null;
  final_prompt: string | null;
  original_prompt: string | null;
  generation: {
    uuid: string;
    prompt: string;
    model_id: string;
    style_preset: string | null;
    duration_seconds: number | null;
    resolution: "720p" | "1080p" | null;
    visibility_level: string | null;
    created_at: string | null;
  };
  characters: Array<{
    uuid: string;
    name: string | null;
    avatar_url: string | null;
    visibility_level: string | null;
  }>; // 共享结构
};
```

- 获取详情：`GET /api/generation/video/:uuid`（返回如上结构）。
- 更新可见性：`PATCH /api/generation/video/:uuid`，body `{ visibility_level }`。
- 组件内部状态：`isLoading`、`error`、`isUpdatingVisibility`、`isReusing`、`activeQuality`（当前清晰度）。
- 模型/风格名解析：与图片版一致，通过 `useAllConfigs()`。
- Prompt：original_prompt。

## 播放与下载（差异点）

- 源选择策略：
  - 默认选择最高可用清晰度播放（优先 1080p → 720p → source）。
  - 如存在 HLS，自行权衡是否接入 `<video>` + `hls.js`（当前建议优先 mp4 直链，保持简单）。
- `<video>` 属性：`controls playsInline preload="metadata"`。不自动播放，避免弹窗干扰；如需自动播放需默认 `muted` 并考虑浏览器策略。
- `poster`：使用 `poster_url`，回退到首帧缩略图（如后端已生成）。
- 清晰度切换：信息区提供下拉或按钮组切换 `activeQuality`，切换时更新 `src` 并保留 `currentTime`（可选优化）。
- 下载：下载当前清晰度 `video_url`，文件名 `anime-<uuid>-<quality>.<ext>`；`<ext>` 从 `mime_type` 或 URL 推断（`mp4`/`webm`）。

## 元信息（与图片版相比的补充/调整）

- 基础字段：模型、关联 OC、创建时间，展示方式一致。
- 视频特有字段：
  - `duration_seconds`：显示为 `Xs`（如 8s）；缺失则 `—`。
  - `resolution/quality`：显示当前/可用清晰度（与切换控件对应）。
  - Ratio：视频保留展示（若后端在 `generation` 提供比值，可在 Meta 区补充）。
- Prompt 卡片、复制交互与图片版一致。

## 快捷链接（左侧预览区底部）

当前暂无

## 国际化（系统级 i18n）

- 使用系统级国际化配置：`src/i18n/messages/en.json` 下新增独立命名空间，便于多页面共用，避免重复定义。
- 建议命名空间：`video_detail.*`（不与图片 `image_detail.*` 混用，按钮文案存在差异：下载视频/下载图片）。
- 建议键位清单：
  - `video_detail.title`
  - `video_detail.create_new`
  - `video_detail.share`
  - `video_detail.visibility.{label, public, private, make_public, make_private}`
  - `video_detail.oc.{label, none}`
  - `video_detail.model.label`
  - `video_detail.meta.{duration, resolution, aspect_ratio, created_at}`
  - `video_detail.prompt.{label, copy, copied, failed}`
  - `video_detail.actions.{download, reuse, download_error}`
  - `video_detail.quality.{label, q720p, q1080p}`
  - `video_detail.visibility_toast.{success, error}`
  - `video_detail.reuse_status.{loading, error}`
  - `video_detail.empty.{title, description}`
  - `video_detail.loading`
  - `video_detail.error`

- 使用方式：组件内通过 `useTranslations()` 指向全局命名空间，例如：`const t = useTranslations('video_detail')`，再以 `t('actions.download')` 取值。

## 依赖与复用

- 共享组件：`ShareMenu`、`Avatar`、`Button`、`Dialog`、`Badge` 等，保持与图片版一致的主题与尺寸。
- 父组件职责：传入 `onReuseParameters(videoUuid)` 与 `onCreateNew()`，并在结果卡片中触发打开。
- API 合同：`GET/PATCH /api/generation/video/:uuid`（与图片合同对称；服务端返回 `variants` 与 `poster_url`）。

## 伪代码概览（仅差异片段）

```tsx
const VideoPreviewDialog = ({ open, generationVideoUuid, pageData }) => {
  const [activeQuality, setActiveQuality] = useState<
    "1080p" | "720p" | "source"
  >("1080p");
  const variants = detail?.variants ?? [];
  const current = pickVariant(variants, activeQuality); // 1080p→720p→source回退

  return (
    <Dialog open={open}>
      <LeftPanel> {/* 信息与操作区，与图片版一致 */} </LeftPanel>
      <RightPreview>
        <video
          key={current?.video_url}
          src={current?.video_url}
          poster={detail?.poster_url ?? undefined}
          controls
          playsInline
          preload="metadata"
        />
        <QuickLinks asRef toImage />
      </RightPreview>
    </Dialog>
  );
};
```

## 边界与错误处理

- 详情获取失败：展示 `video_detail.error` 文案。
- 无可用变体：按钮禁用，播放器显示空态（`video_detail.empty.description`）。
- 下载失败：toast `video_detail.actions.download_error`。
- 可见性更新失败：toast `video_detail.visibility_toast.error`。
- 自动播放策略：默认不自动播放；如需自动播放，需 `muted` 并在首次用户交互后恢复有声播放。

变更历史：

- 2025-10-24 新增视频预览对话框设计文档；与图片版保持一致布局，仅媒体类型为视频并补充视频特有处理
- 2025-10-24 修正：媒体展示区位于左侧，保持与图片版一致
