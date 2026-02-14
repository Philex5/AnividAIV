# Cloudflare R2 存储集成

**Related**: [AI动漫生成器 Feature](../features/feature-ai-anime-generator.md) | [动漫生成服务](./service-anime-generation.md)

## 概述

AnividAI 使用 Cloudflare R2 作为主要的图片存储服务，通过 ShipAny 框架内置的 `@src/lib/storage.ts` 类进行统一管理。R2 提供 S3 兼容的 API，同时具备全球 CDN 加速和无出站费用的优势。

## 技术架构

### 存储层级结构
```
Cloudflare R2 Bucket
├── generations/
│   ├── {generation_uuid}/
│   │   ├── image_1.png          # 原图
│   │   ├── image_2.png
│   │   ├── thumb_1.png          # 缩略图
│   │   └── thumb_2.png
│   └── {generation_uuid}/
├── gallery/
│   ├── featured/
│   └── examples/
└── parameters/
    ├── styles/
    ├── scenes/
    └── outfits/
```

### 框架集成

#### 使用框架内置存储类
```typescript
import { newStorage } from '@/lib/storage';

// 创建存储实例
const storage = newStorage();

// 上传生成图片
const uploadResult = await storage.uploadFile({
  body: imageBuffer,
  key: 'generations/uuid-123/image_1.png',
  contentType: 'image/png',
  disposition: 'inline'
});

// 返回的 URL 可以直接用于前端展示
const imageUrl = uploadResult.url; // https://your-domain.com/generations/uuid-123/image_1.png
```

#### 环境变量配置
```env
# Cloudflare R2 配置（用户需要设置）
STORAGE_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key  
STORAGE_BUCKET=anividai-images
STORAGE_REGION=auto
STORAGE_DOMAIN=https://images.your-domain.com  # R2 自定义域名（可选）
```

## 存储服务实现

### AnimeStorageService 类
**文件路径**: `src/services/anime-generation/storage-service.ts`

**核心设计思路**：
- 使用 ShipAny 框架内置的 `@/lib/storage.ts` 进行统一存储管理
- 原图和多尺寸缩略图并行上传，提升性能
- 基于等比例缩放生成不同用途的缩略图

**关键配置**：
```typescript
// 缩略图生成配置
const thumbnailSizes = [
  { minEdge: 250, suffix: 'mobile' },    // 移动端列表
  { minEdge: 400, suffix: 'desktop' },   // 桌面端列表
  { minEdge: 800, suffix: 'detail' }     // 详情页展示
];

// 生成等比例缩略图逻辑
private async generateThumbnail(imageBuffer: Buffer, minEdge: number): Promise<Buffer> {
  const sharp = require('sharp');

  return await sharp(imageBuffer)
    .resize(minEdge, minEdge, {
      fit: 'inside',           // 保持宽高比
      withoutEnlargement: true // 不放大小图
    })
    .png()
    .toBuffer();
}
```

### 类型定义
```typescript
interface StorageResult {
  imageUrl: string;
  thumbnailUrl: string;
  key: string;
  size: number;
}

interface UploadResult {
  location: string;
  bucket: string;
  key: string;
  filename?: string;
  url: string;
}

class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}
```

## 性能优化策略

### 1. 并发上传
```typescript
// 并行处理多张图片
const uploadPromises = images.map(async (imageBuffer, index) => {
  return await storageService.uploadGenerationImage(generationUuid, index + 1, imageBuffer);
});

const results = await Promise.all(uploadPromises);
```

### 2. 缩略图优化
```typescript
// 基于等比例缩放的缩略图配置
const generateThumbnailSizes = [
  { minEdge: 250, suffix: 'mobile' },    // 移动端社区列表预览
  { minEdge: 400, suffix: 'desktop' },   // 桌面端社区列表预览
  { minEdge: 800, suffix: 'detail' }     // 详情页预览图
];

// 核心设计思路：
// - 保持原图宽高比（1:1, 2:3, 3:4, 16:9等）
// - 按最短边限制尺寸，另一边等比例缩放
// - 前端列表页使用CSS自适应展示
```

### 3. CDN 缓存配置
```typescript
// 上传时设置缓存头
await this.storage.uploadFile({
  body: imageBuffer,
  key: imageKey,
  contentType: 'image/png',
  disposition: 'inline',
  // 注意：当前 storage.ts 不支持自定义 headers，需要扩展
});
```

## 性能和可靠性策略

### 错误处理机制
- **重试策略**: 指数退避重试，最多3次
- **错误监控**: 记录上传失败日志，便于排查
- **降级方案**: 上传失败时使用原图作为缩略图

### 存储空间管理
- **定期清理**: 自动清理90天以上的临时文件
- **使用监控**: 跟踪存储空间和带宽使用情况
- **成本优化**: 利用R2无出站费用优势

## 安全和权限

### 访问控制策略
- **分层权限**: 公开访问gallery和缩略图，限制原图访问
- **IAM限制**: 生产环境使用专用IAM用户，最小权限原则
- **预签名URL**: 敏感内容使用限时访问链接

### 内容安全验证
- **格式检查**: 仅支持 JPEG、PNG、WebP 格式
- **尺寸限制**: 检查图片分辨率和文件大小
- **内容扫描**: 集成内容安全检测API（可选）

## Cloudflare R2 优势

### 成本优势
- **无出站费用**: 不像 AWS S3，R2 不收取数据传出费用
- **存储成本**: 每 GB $0.015/月，比 S3 更便宜
- **操作成本**: 免费层级覆盖大部分小规模使用

### 性能优势
- **全球 CDN**: 集成 Cloudflare CDN，全球加速访问
- **边缘缓存**: 图片自动在边缘节点缓存
- **高可用性**: 99.999999999% (11 个 9) 的数据持久性

### 开发体验
- **S3 兼容**: 无需修改现有 S3 代码
- **原生集成**: 与 Cloudflare Workers 和 Pages 无缝集成
- **仪表板**: 直观的 Cloudflare Dashboard 管理界面

## 环境配置指南

### R2 Bucket 创建
1. 在 Cloudflare Dashboard 创建名为 "anividai-images" 的 Bucket
2. 配置 CORS 设置支持前端访问（如需要）

### 访问凭证配置
1. 创建 API Token，权限设置为 "Object Storage:Edit"
2. 在 `.env` 文件中配置访问密钥

### 自定义域名设置（推荐）
1. 绑定域名 "images.your-domain.com" 到 R2 Bucket
2. 配置 DNS 记录并启用 CDN 加速

## 相关文件路径

### 核心集成
- `src/lib/storage.ts` - 框架内置存储类
- `src/services/anime-generation/storage-service.ts` - AnividAI 存储服务封装

### 工具类
- `src/services/anime-generation/image-processor.ts` - 图片处理工具
- `src/services/anime-generation/storage-monitor.ts` - 存储监控工具

### 类型定义
- `src/types/storage.ts` - 存储相关类型定义

## 变更历史
- 2025-09-29 更新缩略图策略为等比例缩放方案，支持移动端(250px)、桌面端(400px)、详情页(800px)三种用途
- 2025-09-09 创建 Cloudflare R2 存储集成文档 v1.0，定义完整的存储架构和实现方案