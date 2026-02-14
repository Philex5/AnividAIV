**Related**: [feature-anime-video-generation](../features/feature-anime-video-generation.md)

# 组件：WaterfallVideoGallery（示例视频瀑布流）

## 目标
- 在未登录状态右侧展示示例视频卡片，支持懒加载、点击复用参数。

## 数据源
- `src/configs/gallery/example-video-gallery.json`
```
{
  "version": "1.0.0",
  "examples": [
    {
      "uuid": "ex-001",
      "poster": "r2://.../poster.jpg", // 首帧生成
      "video": "r2://.../video.mp4",
      "duration": 5,
      "ratio": "9:16",
      "parameters": { /* minimal */ }
    }
  ]
}
```

## 行为
- 响应式两列（移动端一列，桌面端两/三列）
- 懒加载图片海报；点击海报弹出预览并可“复用参数”

## Props（建议）
- `items: ExampleItem[]`
- `onReuse(params): void`

## 伪代码
```
<div className="columns-2 md:columns-3 gap-4">
  {items.map(it => (
    <Card key={it.uuid}>
      <img loading="lazy" src={it.poster} />
      <Button onClick={() => onReuse(it.parameters)}>Use this</Button>
    </Card>
  ))}
</div>
```
