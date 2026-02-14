**Related**: [feature-anime-video-generation](../features/feature-anime-video-generation.md)

# 组件：VideoPlayerCard（结果播放卡片）

## 目标
- 播放生成视频、切换清晰度、展示参数与复用按钮。封面 `posterUrl` 为视频首帧生成。

## Props（建议）
- `posterUrl: string`
- `variants: Array<{ quality: '720p'|'1080p', videoUrl: string }>`
- `paramsSummary: string`（简要参数串）
- `onReuse(params): void`

## 交互
- 默认选择最低清晰度（720p），下拉切换 1080p
- 点击“Reuse”触发参数回填
- 下载：提供当前清晰度下载按钮

## i18n（页面级）
- keys: player.quality, actions.download, actions.reuse

## 样式
- Tailwind + 主题变量（避免硬编码颜色）

## 伪代码
```
const [q, setQ] = useState('720p')
<video poster={posterUrl} src={urlFor(q)} controls />
<Select value={q} onChange={setQ}>...</Select>
<Button onClick={() => onReuse(params)}>Reuse</Button>
```
