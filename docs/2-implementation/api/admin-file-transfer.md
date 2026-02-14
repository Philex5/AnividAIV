**Related**: 管理员文件转存系统（Admin File Transfer System）

# API 契约：Admin File Transfer

## 当前版本

- Version: v1.0
- Auth: Required + Admin Only
- Errors: 统一英文

## 接口列表

### 1. 获取待转存文件列表

- **Endpoint**: `GET /api/admin/file-transfer/pending-list`
- **用途**: 获取所有待转存到 R2 的生成文件列表
- **Auth**: Required + Admin
- **文件位置**: `src/app/api/admin/file-transfer/pending-list/route.ts`
- **Request**: Query Parameters
  ```typescript
  {
    page?: number,              // 页码，默认 1
    limit?: number,             // 每页数量，默认 20，最大 100
    type?: 'image' | 'video'|'character',   // 文件类型过滤
    status?: 'pending' | 'processing' | 'failed'  // 转存状态
  }
  ```
- **Response**:
  ```json
  {
    "data": {
      "items": [
        {
          "uuid": "gen-xxx",
          "generation_type": "anime",
          "file_type": "image",
          "status": "completed",
          "file_transfer_status": "pending",
          "original_url": "https://kie-api.com/xxx.webp",
          "r2_url": null,
          "created_at": "2025-10-30T10:00:00.000Z",
          "file_size": 2048576,
          "user_uuid": "user-xxx"
        }
      ],
      "total": 150,
      "page": 1,
      "limit": 20,
      "stats": {
        "pending": 120,
        "processing": 10,
        "failed": 20
      }
    }
  }
  ```
- **说明**:
  - 仅返回 `status=completed` 且 `file_transfer_status!=completed` 的记录
  - 按创建时间倒序排列
  - 包含转存状态统计
- **错误**:
  - `no auth` (401)
  - `permission denied` (403) - 非管理员
  - `get pending list failed` (500)

### 2. 触发批量文件转存

- **Endpoint**: `POST /api/admin/file-transfer/trigger-all`
- **用途**: 批量触发待转存文件的转存任务
- **Auth**: Required + Admin
- **文件位置**: `src/app/api/admin/file-transfer/trigger-all/route.ts`
- **Request**:
  ```json
  {
    "type": "image", // 可选，指定文件类型
    "limit": 50 // 可选，限制批量数量，默认 50，最大 200
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "triggered_count": 45,
    "message": "Triggered 45 file transfers"
  }
  ```
- **说明**:
  - 异步处理，立即返回
  - 实际转存由后台队列处理
  - 优先处理失败次数少的文件
- **错误**:
  - `no auth` (401)
  - `permission denied` (403)
  - `trigger failed` (500)

### 3. 触发单个文件转存

- **Endpoint**: `POST /api/admin/file-transfer/trigger-one/[uuid]`
- **用途**: 手动触发单个生成文件的转存任务
- **Auth**: Required + Admin
- **文件位置**: `src/app/api/admin/file-transfer/trigger-one/[uuid]/route.ts`
- **Request**: 路径参数 `uuid` - 生成记录的 UUID
- **Response**:
  ```json
  {
    "success": true,
    "message": "File transfer triggered",
    "generation_uuid": "gen-xxx",
    "status": "processing"
  }
  ```
- **说明**:
  - 用于重试失败的转存任务
  - 立即将状态更新为 `processing`
  - 实际转存由后台队列处理
- **错误**:
  - `generation not found` (404)
  - `permission denied` (403)
  - `already transferred` (400) - 文件已转存
  - `trigger failed` (500)

### 4. 触发图片处理

- **Endpoint**: `POST /api/admin/image-processing/trigger`
- **用途**: 触发图片后处理（缩略图生成、多设备适配）
- **Auth**: Required + Admin
- **文件位置**: `src/app/api/admin/image-processing/trigger/route.ts`
- **Request**:
  ```json
  {
    "generation_uuid": "gen-xxx" // 可选，不填则批量处理
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "processed_count": 10,
    "message": "Image processing triggered"
  }
  ```
- **说明**:
  - 生成缩略图（thumb）
  - 生成移动端适配版本
  - 生成桌面端适配版本
  - 异步处理
- **错误**:
  - `no auth` (401)
  - `permission denied` (403)
  - `trigger failed` (500)

## 文件转存策略

### 延迟转存机制:

1. **生成完成**: 文件先保存在 KieAI CDN
2. **延迟转存**: 48 小时后触发转存到 R2
3. **定时任务**: Cron 每小时检查待转存文件
4. **手动触发**: 管理员可手动触发转存

### 转存优先级:

- **高优先级**: 付费用户的文件
- **中优先级**: 公开分享的文件
- **低优先级**: 私有文件

### 失败重试策略:

- 失败后自动重试，最多 3 次
- 每次重试间隔递增：1h, 4h, 12h
- 3 次失败后标记为 `failed`，需手动处理

## 文件转存流程

```
[生成完成]
    ↓
[文件保存在 KieAI CDN]
    ↓
[file_transfer_status = pending]
    ↓
[48小时后 或 手动触发]
    ↓
[从 KieAI 下载文件]
    ↓
[上传到 R2 Storage]
    ↓
[生成缩略图（图片）]
    ↓
[更新 r2_url 字段]
    ↓
[file_transfer_status = completed]
```

## 转存状态说明

### 状态枚举:

- `pending`: 待转存
- `processing`: 转存中
- `completed`: 已完成
- `failed`: 失败（需重试）

### 状态转换:

```
pending → processing → completed
   ↓          ↓
   └──────→ failed → processing (retry)
```

## 监控指标

### 关键指标:

- 待转存文件数量
- 转存成功率
- 平均转存时间
- 失败率及失败原因分布
- 存储使用量

### 告警规则:

- 待转存文件超过 1000 个
- 转存成功率低于 95%
- 连续失败超过 10 次

## Cron 定时任务

### 任务配置:

- **执行频率**: 每小时一次
- **执行时间**: 每小时的第 5 分钟
- **批量大小**: 每次处理 50 个文件
- **Cron 表达式**: `5 * * * *`
- **配置文件**: `.github/workflows/file-transfer-cron.yml`

### 任务逻辑:

```typescript
// 伪代码
async function fileTransferCron() {
  // 1. 查询待转存文件（48小时前创建）
  const pendingFiles = await getPendingFiles({
    created_before: now() - 48 * 3600 * 1000,
    limit: 50,
  });

  // 2. 批量触发转存
  for (const file of pendingFiles) {
    await triggerFileTransfer(file.uuid);
  }

  // 3. 记录执行日志
  await logCronExecution({
    triggered_count: pendingFiles.length,
    timestamp: now(),
  });
}
```

## 相关服务

- **Service Layer**: `src/services/generation/file-transfer-service.ts` - 文件转存服务
- **Service Layer**: `src/services/generation/image-processor.ts` - 图片处理服务
- **Service Layer**: `src/services/generation/video-processor.ts` - 视频处理服务
- **Lib Layer**: `src/lib/r2-utils.ts` - R2 存储工具
- **Model Layer**: `src/models/generation.ts` - 生成记录模型

## 前端管理界面

- **页面**: `src/app/[locale]/(admin)/admin/file_trans/page.tsx`
- **组件**: `src/components/admin/monitors/FileTransferSection.tsx`
- **过滤器**: `src/components/admin/monitors/FileTransferFilters.tsx`
- **列表**: `src/components/admin/monitors/PendingTransfersList.tsx`
- **手动控制**: `src/components/admin/monitors/ManualTransferControls.tsx`

## 性能优化

### 1. 批量下载:

- 使用连接池复用 HTTP 连接
- 并发下载，最多 5 个并发

### 2. 断点续传:

- 大文件（>10MB）支持断点续传
- 失败后从断点继续下载

### 3. 压缩优化:

- 图片转 WebP 格式
- 视频使用 H.264 编码

## 变更历史

- 2025-11-12 v1.0 首次创建文件转存 API 文档
