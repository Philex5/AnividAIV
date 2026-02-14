// AI服务提供商接口定义
export interface AIProvider {
  name: string;
  createGeneration(params: GenerationParams): Promise<GenerationResponse>;
  getGenerationStatus(taskId: string): Promise<GenerationStatus>;
  cancelGeneration(taskId: string): Promise<boolean>;
}

export interface GenerationParams {
  prompt: string;
  model: string;
  width: number;
  height: number;
  num_outputs: number;
  scheduler?: string;
  webhook_url?: string;
  // KIE AI specific params
  reference_images?: string[];
  output_format?: string;
  image_size?: string;
}

export interface GenerationResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  urls?: string[];
  error?: string;
}

export interface GenerationStatus {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  urls?: string[];
  error?: string;
  progress?: number;
}

// Replicate AI 提供商
export class ReplicateProvider implements AIProvider {
  name = "replicate";
  private apiKey: string;
  private baseUrl = "https://api.replicate.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createGeneration(
    params: GenerationParams
  ): Promise<GenerationResponse> {
    try {
      const input = {
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        num_outputs: params.num_outputs,
        scheduler: params.scheduler || "K_EULER",
      };

      const requestBody = {
        version: params.model,
        input,
        webhook: params.webhook_url,
        webhook_events_filter: ["start", "output", "logs", "completed"],
      };

      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Replicate API错误: ${error.detail || response.statusText}`
        );
      }

      const result = await response.json();

      return {
        id: result.id,
        status: result.status,
        urls: result.output,
        error: result.error,
      };
    } catch (error) {
      console.error("Replicate生成请求失败:", error);
      throw error;
    }
  }

  async getGenerationStatus(taskId: string): Promise<GenerationStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/predictions/${taskId}`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`获取状态失败: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        id: result.id,
        status: result.status,
        urls: result.output,
        error: result.error,
      };
    } catch (error) {
      console.error("获取Replicate状态失败:", error);
      throw error;
    }
  }

  async cancelGeneration(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/predictions/${taskId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${this.apiKey}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error("取消Replicate生成失败:", error);
      return false;
    }
  }
}

// Stability AI 提供商
export class StabilityProvider implements AIProvider {
  name = "stability";
  private apiKey: string;
  private baseUrl = "https://api.stability.ai";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createGeneration(
    params: GenerationParams
  ): Promise<GenerationResponse> {
    try {
      const requestBody = {
        text_prompts: [
          {
            text: params.prompt,
            weight: 1,
          },
        ],
        width: params.width,
        height: params.height,
        samples: params.num_outputs,
      };

      const response = await fetch(
        `${this.baseUrl}/v1/generation/${params.model}/text-to-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Stability AI错误: ${(error as any)?.message || response.statusText}`
        );
      }

      const result = await response.json();

      // Stability AI 直接返回完成的图片
      const urls =
        result.artifacts?.map((artifact: any) => {
          // 这里需要处理base64图片数据
          return `data:image/png;base64,${artifact.base64}`;
        }) || [];

      return {
        id: `stability_${Date.now()}`, // Stability AI 不返回任务ID，我们生成一个
        status: "succeeded",
        urls,
      };
    } catch (error) {
      console.error("Stability AI生成请求失败:", error);
      throw error;
    }
  }

  async getGenerationStatus(taskId: string): Promise<GenerationStatus> {
    // Stability AI 是同步的，直接返回完成状态
    return {
      id: taskId,
      status: "succeeded",
    };
  }

  async cancelGeneration(taskId: string): Promise<boolean> {
    // Stability AI 是同步的，无法取消
    return false;
  }
}

// KIE AI 提供商
export class KieAIProvider implements AIProvider {
  name = "kie-ai";
  private apiKey: string;
  private baseUrl = "https://api.kie.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createGeneration(
    params: GenerationParams
  ): Promise<GenerationResponse> {
    try {
      // 根据模型选择不同的API端点和参数格式
      if (params.model === "gpt4o-image") {
        return await this.createGptImageGeneration(params);
      } else if (
        params.model === "google/nano-banana" ||
        params.model === "google/nano-banana-edit"
      ) {
        return await this.createNanoBananaGeneration(params);
      } else {
        throw new Error(`Unsupported KIE AI model: ${params.model}`);
      }
    } catch (error) {
      console.error("KIE AI generation request failed:", error);
      throw error;
    }
  }

  private async createGptImageGeneration(
    params: GenerationParams
  ): Promise<GenerationResponse> {
    const requestBody = {
      filesUrl: params.reference_images || [],
      prompt: params.prompt,
      size: this.getAspectRatio(params.width, params.height),
      callBackUrl: params.webhook_url,
      isEnhance: false,
      uploadCn: false,
      nVariants: params.num_outputs,
      enableFallback: false,
      fallbackModel: "FLUX_MAX",
    };

    const response = await fetch(`${this.baseUrl}/gpt4o-image/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(
        `KIE AI GPT-Image API error: ${error.msg || error.message || response.statusText}`
      );
    }

    const result = await response.json();

    if (result.code !== 200) {
      throw new Error(`KIE AI API error: ${result.msg}`);
    }

    return {
      id: result.data.taskId,
      status: "starting",
    };
  }

  private async createNanoBananaGeneration(
    params: GenerationParams
  ): Promise<GenerationResponse> {
    // 根据是否有reference图片选择模型
    const modelId =
      params.reference_images && params.reference_images.length > 0
        ? "google/nano-banana-edit"
        : "google/nano-banana";

    const input: any = {
      prompt: params.prompt,
      output_format: params.output_format || "png",
      image_size: params.image_size || "auto",
    };

    // 如果是edit模式，添加reference图片
    if (modelId === "google/nano-banana-edit" && params.reference_images) {
      input.image_urls = params.reference_images;
    }

    const requestBody = {
      model: modelId,
      callBackUrl: params.webhook_url,
      input,
    };

    const response = await fetch(`${this.baseUrl}/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(
        `KIE AI Nano-Banana API error: ${(error as any)?.message || response.statusText}`
      );
    }

    const result = await response.json();

    if (result.code !== 200) {
      throw new Error(`KIE AI API error: ${result.message}`);
    }

    return {
      id: result.data.taskId,
      status: "starting",
    };
  }

  async getGenerationStatus(taskId: string): Promise<GenerationStatus> {
    try {
      // 尝试两种不同的状态查询接口
      let response = await fetch(
        `${this.baseUrl}/gpt4o-image/record-info?taskId=${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        // 如果GPT-Image接口失败，尝试Jobs接口
        response = await fetch(
          `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Get status failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`KIE AI API error: ${result.msg || result.message}`);
      }

      const data = result.data;
      let status: GenerationStatus["status"] = "starting";
      let urls: string[] = [];

      // 处理不同接口的状态格式
      if (data.status === "SUCCESS" || data.state === "success") {
        status = "succeeded";
        if (data.response?.resultUrls) {
          urls = data.response.resultUrls;
        } else if (data.resultJson) {
          const resultData = JSON.parse(data.resultJson);
          urls = resultData.resultUrls || [];
        }
      } else if (data.status === "FAILED" || data.state === "fail") {
        status = "failed";
      } else if (data.status === "PROCESSING" || data.state === "processing") {
        status = "processing";
      }

      return {
        id: taskId,
        status,
        urls,
        error: data.errorMessage || data.failMsg,
      };
    } catch (error) {
      console.error("Get KIE AI status failed:", error);
      throw error;
    }
  }

  async cancelGeneration(taskId: string): Promise<boolean> {
    // KIE AI 暂不支持取消任务
    return false;
  }

  private getAspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) return "1:1";
    if (Math.abs(ratio - 2 / 3) < 0.1) return "2:3";
    if (Math.abs(ratio - 3 / 4) < 0.1) return "3:4";
    if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
    return "1:1"; // 默认正方形
  }
}

// AI提供商工厂
export class AIProviderFactory {
  private static providers = new Map<string, (apiKey: string) => AIProvider>();

  static {
    AIProviderFactory.providers.set(
      "replicate",
      (apiKey) => new ReplicateProvider(apiKey)
    );
    AIProviderFactory.providers.set(
      "stability",
      (apiKey) => new StabilityProvider(apiKey)
    );
    AIProviderFactory.providers.set(
      "kie-ai",
      (apiKey) => new KieAIProvider(apiKey)
    );
  }

  static createProvider(providerName: string, apiKey: string): AIProvider {
    const providerClass = this.providers.get(providerName);
    if (!providerClass) {
      throw new Error(`不支持的AI提供商: ${providerName}`);
    }

    return providerClass(apiKey);
  }

  static getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// AI服务管理器
export class AIServiceManager {
  private providers = new Map<string, AIProvider>();

  constructor() {
    // 从环境变量初始化提供商
    this.initializeProviders();
  }

  private initializeProviders() {
    // Replicate
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    if (replicateApiKey) {
      this.providers.set(
        "replicate",
        AIProviderFactory.createProvider("replicate", replicateApiKey)
      );
      console.log("已初始化Replicate提供商");
    }

    // Stability AI
    const stabilityApiKey = process.env.STABILITY_API_KEY;
    if (stabilityApiKey) {
      this.providers.set(
        "stability",
        AIProviderFactory.createProvider("stability", stabilityApiKey)
      );
      console.log("已初始化Stability AI提供商");
    }

    // KIE AI
    const kieAIApiKey = process.env.KIE_AI_API_KEY;
    if (kieAIApiKey) {
      this.providers.set(
        "kie-ai",
        AIProviderFactory.createProvider("kie-ai", kieAIApiKey)
      );
      console.log("已初始化KIE AI提供商");
    }
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async createGeneration(
    providerName: string,
    params: GenerationParams
  ): Promise<GenerationResponse> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`提供商 ${providerName} 不可用`);
    }

    return await provider.createGeneration(params);
  }

  async getGenerationStatus(
    providerName: string,
    taskId: string
  ): Promise<GenerationStatus> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`提供商 ${providerName} 不可用`);
    }

    return await provider.getGenerationStatus(taskId);
  }

  async cancelGeneration(
    providerName: string,
    taskId: string
  ): Promise<boolean> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return false;
    }

    return await provider.cancelGeneration(taskId);
  }
}

// 单例实例
export const aiServiceManager = new AIServiceManager();
