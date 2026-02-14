**Related**: 文件下载（File Download）

# API 契约：Download

## 当前版本
- Version: v1.0
- Auth: Required
- Errors: 统一英文

## 接口列表

### 1. 下载生成图片
- **Endpoint**: `GET /api/download/image/[uuid]`
- **用途**: 下载用户生成的图片（原图）
- **Auth**: Required
- **文件位置**: `src/app/api/download/image/[uuid]/route.ts`
- **Request**: 路径参数 `uuid` - 图片生成记录的 UUID
- **Response**:
  - **Content-Type**: `image/webp` | `image/png` | `image/jpeg`
  - **Headers**:
    ```
    Content-Disposition: attachment; filename="anivid-{uuid}.webp"
    Content-Length: {file_size}
    Cache-Control: public, max-age=31536000
    ```
  - **Body**: Binary image data
- **说明**:
  - 仅允许下载自己创建的图片
  - 返回原始分辨率图片（非缩略图）
  - 文件名格式：`anivid-{uuid}.{ext}`
- **错误**:
  - `no auth` (401)
  - `image not found` (404)
  - `permission denied` (403) - 尝试下载他人的图片
  - `download failed` (500)

### 2. 下载生成视频
- **Endpoint**: `GET /api/download/video/[uuid]`
- **用途**: 下载用户生成的视频（原视频）
- **Auth**: Required
- **文件位置**: `src/app/api/download/video/[uuid]/route.ts`
- **Request**: 路径参数 `uuid` - 视频生成记录的 UUID
- **Response**:
  - **Content-Type**: `video/mp4`
  - **Headers**:
    ```
    Content-Disposition: attachment; filename="anivid-{uuid}.mp4"
    Content-Length: {file_size}
    Cache-Control: public, max-age=31536000
    Accept-Ranges: bytes
    ```
  - **Body**: Binary video data
- **说明**:
  - 仅允许下载自己创建的视频
  - 返回原始质量视频
  - 文件名格式：`anivid-{uuid}.mp4`
  - 支持断点续传（Range requests）
- **错误**:
  - `no auth` (401)
  - `video not found` (404)
  - `permission denied` (403) - 尝试下载他人的视频
  - `download failed` (500)

## 权限控制

### 下载权限检查流程:
```typescript
// 伪代码
async function checkDownloadPermission(generationUuid, userUuid) {
  // 1. 查询生成记录
  const generation = await getGeneration(generationUuid)

  // 2. 检查是否存在
  if (!generation) {
    throw new Error('not found')
  }

  // 3. 检查所有权
  if (generation.user_uuid !== userUuid) {
    throw new Error('permission denied')
  }

  // 4. 检查状态
  if (generation.status !== 'completed') {
    throw new Error('generation not completed')
  }

  return generation
}
```

## 文件存储策略

### R2 Storage 路径规范:
```
/images/{user_uuid}/{generation_uuid}.webp     # 原图
/images/{user_uuid}/{generation_uuid}_thumb.webp  # 缩略图

/videos/{user_uuid}/{generation_uuid}.mp4      # 原视频
/videos/{user_uuid}/{generation_uuid}_thumb.webp  # 视频封面
```

### CDN 加速:
- 图片通过 Cloudflare R2 + CDN 分发
- 视频通过 R2 + CDN 分发，支持断点续传
- 缓存策略：`max-age=31536000`（1年）

## 下载限流策略

### 频率限制:
- 单用户每分钟最多 60 次下载请求
- 超过限制返回 `429 Too Many Requests`

### 带宽限制:
- Free 会员：下载速度限制 2MB/s
- Basic 会员：下载速度限制 5MB/s
- Plus 会员：下载速度限制 10MB/s
- Pro 会员：无限制

## 前端使用示例

### 下载图片:
```typescript
// 方式 1: 使用 fetch + blob
const downloadImage = async (uuid: string) => {
  const response = await fetch(`/api/download/image/${uuid}`)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `anivid-${uuid}.webp`
  a.click()

  URL.revokeObjectURL(url)
}

// 方式 2: 直接使用链接
<a href={`/api/download/image/${uuid}`} download>
  Download Image
</a>
```

### 下载视频（支持进度条）:
```typescript
const downloadVideo = async (uuid: string, onProgress: (progress: number) => void) => {
  const response = await fetch(`/api/download/video/${uuid}`)
  const reader = response.body.getReader()
  const contentLength = +response.headers.get('Content-Length')

  let receivedLength = 0
  const chunks = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    receivedLength += value.length

    onProgress((receivedLength / contentLength) * 100)
  }

  const blob = new Blob(chunks)
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `anivid-${uuid}.mp4`
  a.click()

  URL.revokeObjectURL(url)
}
```

## 性能优化

### 1. 预签名 URL（推荐）:
对于大文件，建议返回预签名 URL 而不是代理下载:
```typescript
// 修改后的实现
export async function GET(request: Request, { params }: { params: { uuid: string } }) {
  // 权限检查
  const generation = await checkDownloadPermission(params.uuid, user.uuid)

  // 生成预签名 URL（有效期 1 小时）
  const presignedUrl = await generatePresignedUrl(generation.result_url, 3600)

  // 重定向到预签名 URL
  return NextResponse.redirect(presignedUrl)
}
```

### 2. 缓存策略:
- 权限检查结果缓存 60 秒
- 预签名 URL 有效期 1 小时

## 相关 API

- **获取图片**: `/api/generation/image/[uuid]` - 获取图片 URL（非下载）
- **获取视频**: `/api/generation/video/[uuid]` - 获取视频 URL（非下载）
- **作品列表**: `/api/artworks` - 获取用户所有作品

## 相关服务

- **Service Layer**: `src/services/generation.ts` - 生成服务
- **Lib Layer**: `src/lib/r2-utils.ts` - R2 存储工具
- **Lib Layer**: `src/lib/storage.ts` - 存储管理
- **Model Layer**: `src/models/generation.ts` - 生成记录模型

## 变更历史
- 2025-11-12 v1.0 首次创建下载 API 文档
