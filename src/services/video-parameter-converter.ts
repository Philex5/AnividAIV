/**
 * 视频模型参数转换服务
 * 处理不同视频模型参数到标准化字段的转换
 */

// 标准化的视频参数接口
export interface StandardizedVideoParams {
  model_id: string;
  duration_seconds: number | null;
  ratio: string | null;
  quality: string;
  resolution: string | null;
  reference_image_url: string | null;
  generation_params: string; // JSON字符串
}

// Sora2 模型参数接口
interface Sora2Params {
  model: string;
  input: {
    prompt: string;
    aspect_ratio?: 'portrait' | 'landscape';
    image_urls?: string[];
    n_frames?: '10' | '15';
    size?: 'standard' | 'high';
    remove_watermark?: boolean;
  };
}

/**
 * 视频参数转换器
 */
export class VideoParameterConverter {
  /**
   * 转换Sora2/Sora2-Pro模型参数
   */
  static convertSora2Params(params: Sora2Params): StandardizedVideoParams {
    const { model, input } = params;

    // 🔧 修复：检查 input 是否存在
    if (!input) {
      console.warn('[VideoParameterConverter] Sora2 input is missing, using fallback');
      return {
        model_id: model,
        duration_seconds: null,
        ratio: null,
        quality: 'standard',
        resolution: null,
        reference_image_url: null,
        generation_params: JSON.stringify(params)
      };
    }

    // 转换时长：n_frames直接对应秒数
    const duration_seconds = input.n_frames ? parseInt(input.n_frames) : null;

    // 转换宽高比
    let ratio: string | null = null;
    if (input.aspect_ratio === 'portrait') {
      ratio = '9:16';
    } else if (input.aspect_ratio === 'landscape') {
      ratio = '16:9';
    }

    // 转换质量
    const quality = input.size || 'standard';

    // Sora2系列无resolution参数
    const resolution = null;

    // 处理参考图片
    const reference_image_url = input.image_urls && input.image_urls.length > 0
      ? input.image_urls.join(',')
      : null;
    
    return {
      model_id: model,
      duration_seconds,
      ratio,
      quality,
      resolution,
      reference_image_url,
      generation_params: JSON.stringify(params)
    };
  }

  /**
   * 通用转换方法 - 根据模型类型自动选择转换器
   */
  static convertVideoParams(modelId: string, params: any): StandardizedVideoParams {
    // 识别模型类型
    if (modelId.includes('sora-2')) {
      return this.convertSora2Params(params as Sora2Params);
    } else {
      // 默认处理：保存原始参数，其他字段为null
      return {
        model_id: modelId,
        duration_seconds: null,
        ratio: null,
        quality: 'unknown',
        resolution: null,
        reference_image_url: null,
        generation_params: JSON.stringify(params)
      };
    }
  }

  /**
   * 从generation_params恢复原始参数
   */
  static parseGenerationParams(generation_params: string): any {
    try {
      return JSON.parse(generation_params);
    } catch (error) {
      console.error('Failed to parse generation_params:', error);
      return {};
    }
  }

  /**
   * 获取模型的友好显示名称
   */
  static getModelDisplayName(model_id: string): string {
    const modelNames: Record<string, string> = {
      'sora-2-text-to-video': 'Sora 2 Text-to-Video',
      'sora-2-image-to-video': 'Sora 2 Image-to-Video',
      'sora-2-pro-text-to-video': 'Sora 2 Pro Text-to-Video',
      'sora-2-pro-image-to-video': 'Sora 2 Pro Image-to-Video'
    };

    return modelNames[model_id] || model_id;
  }

  /**
   * 获取质量的友好显示名称
   */
  static getQualityDisplayName(quality: string): string {
    const qualityNames: Record<string, string> = {
      'standard': 'Standard',
      'high': 'High Quality',
      '720p': '720p HD',
      '1080p': '1080p Full HD'
    };
    
    return qualityNames[quality] || quality;
  }
}