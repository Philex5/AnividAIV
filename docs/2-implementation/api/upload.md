**Related**: 资源上传（R2 存储）

# API 契约：Upload

## 当前版本
- Version: v1.0
- Auth: 需要登录
- Errors: 统一英文

## 接口

- POST /api/upload
  - 用途：上传参考图或用户上传资源，保存至 R2，返回可用 URL（部分类型需生成 UUID 追踪）
  - Auth: Required
  - 位置：`src/app/api/upload/route.ts`
  - Headers: `Content-Type: multipart/form-data`
  - FormData:
    - `file: File`
    - `type: 'reference' | 'user_upload'`
    - `sub_type`（当 `type=user_upload`）：`oc-avatar | oc-gallery | oc-gallery-video | user_avatar | user_background | world_background`
  - 校验：文件类型（jpeg/jpg/png/webp/mp4）、大小 ≤10MB、文件名安全
  - Response: `{ success, url, key, filename, size, type, sub_type?, upload_uuid? }`
  - UUID 规则：
    - `oc-avatar` / `oc-gallery` / `oc-gallery-video` 必须创建 `generations` + `generation_images/generation_videos`，返回 `upload_uuid`
    - `user_avatar` / `user_background` / `world_background` 支持 UUID 或 URL（上传文件则生成 UUID；从画廊选择则直接使用 UUID/URL）
    - `reference` 不生成 UUID，仅返回 URL
  - 错误：`User not authenticated | Invalid content type | No file provided | Unsupported file format | File size exceeds ... | Invalid upload type | Upload failed ...`
  - 伪代码：
    ```
    assert(auth)
    assert(content-type includes multipart)
    parse formData(file,type,sub_type)
    validate(file.type && size)
    key = `${type}/${userUuid}/${timestamp-uuid}.ext`
    storage.uploadFile(buffer, key)
    if type == 'user_upload' && sub_type in ['oc-avatar','oc-gallery','oc-gallery-video']:
      create generation + generation_image/video, return upload_uuid
    return { url, key, filename, upload_uuid? }
    ```

## 变更历史
- 2025-10-20 v1.0 首次补齐（reference 上传）
- 2026-01-29 v1.1 支持 user_upload + sub_type 与 UUID 规则
