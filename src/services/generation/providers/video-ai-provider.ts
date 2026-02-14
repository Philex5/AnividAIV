/**
 * VideoAI Provider
 * 独立的视频生成Provider，不影响现有图片生成的KieAIProvider
 */

import type {
  VideoGenerationParams,
  VideoTaskCreationResult,
  VideoTaskQueryResult,
  VideoBaseAdapter,
} from "@/types/video-provider";

export class VideoAIProvider {
  private static instance: VideoAIProvider | null = null;
  private adapters: Map<string, VideoBaseAdapter>;

  private constructor() {
    this.adapters = new Map();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): VideoAIProvider {
    if (!VideoAIProvider.instance) {
      VideoAIProvider.instance = new VideoAIProvider();
    }
    return VideoAIProvider.instance;
  }

  /**
   * 初始化视频模型适配器
   */
  private async initializeAdapters() {
    // 动态导入适配器，避免循环依赖
    try {
      // 注册Kling视频适配器
      try {
        const { KlingVideoAdapter } = await import("./kling-video-adapter");
        this.adapters.set("kling/video-v2.5", new KlingVideoAdapter());
        this.adapters.set("kling/video.v2.5", new KlingVideoAdapter()); // 兼容点号
        this.adapters.set("kling", new KlingVideoAdapter()); // 兼容简化名
        this.adapters.set("kling-v2.5", new KlingVideoAdapter()); // 兼容短名
        this.adapters.set("kling-3.0/video", new KlingVideoAdapter());
        this.adapters.set("kling/video-v3.0", new KlingVideoAdapter());
        this.adapters.set("kling-v3.0", new KlingVideoAdapter());
      } catch (error) {
        console.error(
          "[VideoAIProvider] Failed to load KlingVideoAdapter:",
          error,
        );
      }

      // 注册Wan视频适配器
      try {
        const { WanVideoAdapter } = await import("./wan-video-adapter");
        this.adapters.set("wan/2.5", new WanVideoAdapter());
        this.adapters.set("wan2.5", new WanVideoAdapter()); // 兼容简化名
        this.adapters.set("wan-2.5", new WanVideoAdapter()); // 兼容短名
        this.adapters.set("Wan-2.5", new WanVideoAdapter()); // 兼容大写
        this.adapters.set("wan", new WanVideoAdapter()); // 基础名
      } catch (error) {
        console.error(
          "[VideoAIProvider] Failed to load WanVideoAdapter:",
          error,
        );
      }

      // 注册Sora2视频适配器
      try {
        const { Sora2VideoAdapter } = await import("./sora2-video-adapter");
        this.adapters.set("sora-2", new Sora2VideoAdapter());
        this.adapters.set("sora2", new Sora2VideoAdapter()); // 兼容简化名
        this.adapters.set("Sora-2", new Sora2VideoAdapter()); // 兼容大写
      } catch (error) {
        console.error(
          "[VideoAIProvider] Failed to load Sora2VideoAdapter:",
          error,
        );
      }

      // 注册Sora2Pro视频适配器
      try {
        const { Sora2ProVideoAdapter } =
          await import("./sora2-pro-video-adapter");
        this.adapters.set("sora-2-pro", new Sora2ProVideoAdapter());
        this.adapters.set("sora2-pro", new Sora2ProVideoAdapter()); // 兼容简化名
        this.adapters.set("sora2_pro", new Sora2ProVideoAdapter()); // 兼容下划线
        this.adapters.set("Sora-2 Pro", new Sora2ProVideoAdapter()); // 兼容大写
      } catch (error) {
        console.error(
          "[VideoAIProvider] Failed to load Sora2ProVideoAdapter:",
          error,
        );
      }

      // 注册Veo3.1 Fast视频适配器
      try {
        const { Veo31FastVideoAdapter } =
          await import("./veo31-fast-video-adapter");
        this.adapters.set("veo3_fast", new Veo31FastVideoAdapter());
        this.adapters.set("veo3.1-fast", new Veo31FastVideoAdapter()); // 兼容点号
        this.adapters.set("veo-3.1-fast", new Veo31FastVideoAdapter()); // 兼容短名
        this.adapters.set("Veo 3.1 Fast", new Veo31FastVideoAdapter()); // 兼容显示名
        this.adapters.set("Veo3.1 Fast", new Veo31FastVideoAdapter()); // 兼容不带空格
      } catch (error) {
        console.error(
          "[VideoAIProvider] Failed to load Veo31FastVideoAdapter:",
          error,
        );
      }

      // 注册 Hailuo 2.3 视频适配器
      try {
        const { HailuoVideoAdapter } = await import("./hailuo-video-adapter");
        this.adapters.set("hailuo/2-3-image-to-video-standard", new HailuoVideoAdapter());
        this.adapters.set("hailuo/2-3-image-to-video-pro", new HailuoVideoAdapter());
        this.adapters.set("hailuo 2.3", new HailuoVideoAdapter());
        this.adapters.set("hailuo-2.3", new HailuoVideoAdapter());
        this.adapters.set("hailuo", new HailuoVideoAdapter());
      } catch (error) {
        console.error(
          "[VideoAIProvider] Failed to load HailuoVideoAdapter:",
          error,
        );
      }
    } catch (error) {
      console.error(
        "[VideoAIProvider] Failed to initialize video adapters:",
        error,
      );
    }
  }

  /**
   * 创建视频生成任务
   */
  async createVideoTask(
    params: VideoGenerationParams,
    callbackUrl: string,
  ): Promise<VideoTaskCreationResult> {
    const adapter = await this.getAdapter(params.model_name);
    return await adapter.createTask(params, callbackUrl);
  }

  /**
   * 查询视频任务状态
   */
  async queryVideoTask(
    taskId: string,
    modelName: string,
  ): Promise<VideoTaskQueryResult> {
    const adapter = await this.getAdapter(modelName);
    return await adapter.queryTask(taskId);
  }

  /**
   * 计算视频生成费用
   */
  async calculateVideoCredits(params: VideoGenerationParams): Promise<number> {
    const adapter = await this.getAdapter(params.model_name);
    return adapter.calculateCredits(params);
  }

  /**
   * 根据模型名获取对应的适配器
   */
  private async getAdapter(modelName: string): Promise<VideoBaseAdapter> {
    // 确保适配器已初始化
    if (this.adapters.size === 0) {
      console.log(
        `[VideoAIProvider] Initializing adapters for model: ${modelName}`,
      );
      await this.initializeAdapters();
    }

    const lowerModelName = modelName.toLowerCase();

    // 直接匹配
    let adapter =
      this.adapters.get(modelName) || this.adapters.get(lowerModelName);

    if (!adapter) {
      // 模糊匹配
      for (const [key, value] of this.adapters.entries()) {
        if (
          lowerModelName.includes(key.toLowerCase()) ||
          key.toLowerCase().includes(lowerModelName)
        ) {
          adapter = value;
          break;
        }
      }
    }

    if (!adapter) {
      console.error(`[VideoAIProvider] Model not found: ${modelName}`, {
        requested: modelName,
        available: Array.from(this.adapters.keys()),
        total_registered: this.adapters.size,
      });
      throw new Error(
        `Unsupported video model: ${modelName}. Available models: ${Array.from(this.adapters.keys()).join(", ")}`,
      );
    }

    return adapter;
  }

  /**
   * 检查模型是否支持
   */
  async isModelSupported(modelName: string): Promise<boolean> {
    try {
      await this.getAdapter(modelName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取所有支持的模型
   */
  getSupportedModels(): string[] {
    return Array.from(this.adapters.keys());
  }
}
