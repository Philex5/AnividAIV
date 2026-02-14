import { NextRequest } from 'next/server';
import { getUserUuid } from '@/services/user';
import { Storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import { insertGeneration } from '@/models/generation';
import { insertGenerationImage } from '@/models/generation-image';

// 支持的图片格式
const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // 检查用户身份验证
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json({ 
        success: false, 
        error: 'User not authenticated' 
      }, { status: 401 });
    }

    // 检查请求频率（简单的防刷保护）
    const userAgent = request.headers.get('user-agent') || '';
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    console.log(`Upload request from user ${userUuid}, IP: ${clientIP}, UA: ${userAgent}`);

    // 检查 Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ 
        success: false, 
        error: 'Invalid content type. Must be multipart/form-data' 
      }, { status: 400 });
    }

    // 解析 FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rawType = formData.get('type') as string;

    // 验证文件是否存在
    if (!file) {
      return Response.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }

    const typeAliases: Record<string, string> = {
      avatar: "oc-avatar",
      character_gallery: "oc-gallery",
      "oc-art": "oc-gallery",
      user_avatar: "user-avatar",
      user_background: "user-background",
      world_background: "world-background",
      "world-setting": "world-background",
    };
    const normalizedType = typeAliases[rawType] || rawType;
    const allowedTypes = new Set([
      "reference",
      "oc-avatar",
      "oc-gallery",
      "oc-gallery-video",
      "user-avatar",
      "user-background",
      "world-background",
      "scene",
      "other",
    ]);

    // 验证上传类型
    if (!allowedTypes.has(normalizedType)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid upload type' 
      }, { status: 400 });
    }

    // 验证文件格式
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return Response.json({ 
        success: false, 
        error: 'Unsupported file format. Please use JPEG, PNG, or WebP' 
      }, { status: 400 });
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ 
        success: false, 
        error: 'File size exceeds 10MB limit' 
      }, { status: 400 });
    }

    // 验证文件名安全性
    if (!isValidFileName(file.name)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid file name' 
      }, { status: 400 });
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const fileExtension = getFileExtension(file.name);
    const uniqueId = uuidv4().substring(0, 8);
    const fileName = `${timestamp}-${uniqueId}${fileExtension}`;
    const now = new Date(timestamp);
    const year = now.getUTCFullYear().toString();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const storageKey =
      normalizedType === "reference"
        ? `reference/${userUuid}/${fileName}`
        : `uploads/${userUuid}/${normalizedType}/${year}/${month}/${fileName}`;

    // 初始化存储服务
    const storage = new Storage();

    // 将文件转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 上传到 R2
    const uploadResult = await storage.uploadFile({
      body: buffer,
      key: storageKey,
      contentType: file.type,
      disposition: 'inline'
    });

    const uuidRequiredTypes = new Set([
      "oc-avatar",
      "oc-gallery",
      "oc-gallery-video",
      "user-avatar",
      "user-background",
    ]);
    let uploadUuid: string | null = null;
    if (uuidRequiredTypes.has(normalizedType)) {
      const generationUuid = uuidv4();
      uploadUuid = uuidv4();
      const generationSubType =
        normalizedType === "user-avatar"
          ? "user_avatar"
          : normalizedType === "user-background"
            ? "user_background"
            : normalizedType;

      await insertGeneration({
        uuid: generationUuid,
        user_uuid: userUuid,
        type: "user_upload",
        sub_type: generationSubType,
        prompt: `User upload (${normalizedType})`,
        model_id: "manual",
        status: "completed",
        counts: 1,
        success_count: 1,
        visibility_level: "private",
        created_at: new Date(),
      });

      await insertGenerationImage({
        uuid: uploadUuid,
        generation_uuid: generationUuid,
        user_uuid: userUuid,
        image_url: uploadResult.url,
        image_index: 0,
        gen_type: "user_upload",
        visibility_level: "private",
        status: "archived",
        created_at: new Date(),
      });
    }

    // 返回成功响应
    return Response.json({
      success: true,
      url: uploadResult.url,
      key: storageKey,
      asset_type: normalizedType,
      filename: fileName,
      size: file.size,
      type: file.type,
      upload_uuid: uploadUuid,
    });

  } catch (error: any) {
    console.error('File upload failed:', error);

    // 处理存储相关错误
    if (error.message?.includes('Bucket is required')) {
      return Response.json({ 
        success: false, 
        error: 'Storage configuration error' 
      }, { status: 500 });
    }

    if (error.message?.includes('Upload failed')) {
      return Response.json({ 
        success: false, 
        error: 'Storage upload failed' 
      }, { status: 500 });
    }

    // 处理文件格式错误
    if (error.message?.includes('Invalid file')) {
      return Response.json({ 
        success: false, 
        error: error.message 
      }, { status: 400 });
    }

    // 通用错误
    return Response.json({ 
      success: false, 
      error: 'Upload failed, please try again' 
    }, { status: 500 });
  }
}

// 支持的 HTTP 方法
export async function GET() {
  return Response.json({ 
    error: 'Method not allowed' 
  }, { status: 405 });
}

// 工具函数：获取文件扩展名
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return filename.substring(lastDotIndex);
}

// 工具函数：验证文件名安全性
function isValidFileName(filename: string): boolean {
  // 检查文件名长度
  if (!filename || filename.length > 255) {
    return false;
  }

  // 检查危险字符
  const dangerousChars = /[<>:"|?*\x00-\x1F]/;
  if (dangerousChars.test(filename)) {
    return false;
  }

  // 检查路径遍历攻击
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }

  // 检查保留名称（Windows）
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reservedNames.test(filename)) {
    return false;
  }

  return true;
}
