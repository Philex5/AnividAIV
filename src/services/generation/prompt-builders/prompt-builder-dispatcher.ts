/**
 * Prompt Builder 调度器
 * 根据 gen_type(sub_type) 将prompt构建任务分发到对应的Builder
 */

import { IPromptBuilder } from "./types";

export class PromptBuilderDispatcher {
  private builders: Map<string, IPromptBuilder> = new Map();
  private initPromise: Promise<void>;

  constructor() {
    // 注册默认的builders
    this.initPromise = this.registerDefaultBuilders();
  }

  /**
   * 注册默认的Prompt Builders
   * 在构造函数中自动注册，无需手动调用
   */
  private registerDefaultBuilders(): Promise<void> {
    const registrations: Promise<void>[] = [
      import("./anime-prompt-builder").then((module) => {
        this.registerBuilder("anime", new module.AnimePromptBuilder());
      }),
      import("./action-figure-prompt-builder").then((module) => {
        this.registerBuilder("action_figure", new module.ActionFigurePromptBuilder());
      }),
      import("./sticker-prompt-builder").then((module) => {
        this.registerBuilder("sticker", new module.StickerPromptBuilder());
      }),
    ];

    return Promise.all(registrations).then(() => undefined);
  }

  /**
   * 注册一个Prompt Builder
   */
  registerBuilder(subType: string, builder: IPromptBuilder): void {
    this.builders.set(subType, builder);
  }

  /**
   * 根据sub_type分发prompt构建任务
   */
  async buildPrompt(
    subType: string,
    params: any
  ): Promise<string> {
    await this.initPromise;

    // 1. 尝试精确匹配
    if (this.builders.has(subType)) {
      return this.builders.get(subType)!.buildPrompt(params);
    }

    // 2. 标准化sub_type格式（小写、空格转下划线）
    const normalizedType = this.normalizeSubType(subType);
    if (this.builders.has(normalizedType)) {
      console.warn(
        `[PromptBuilder] Normalized sub_type from '${subType}' to '${normalizedType}'`
      );
      return this.builders.get(normalizedType)!.buildPrompt(params);
    }

    // 3. 尝试默认构建器（anime）
    if (this.builders.has("anime")) {
      console.warn(
        `[PromptBuilder] No specific builder for sub_type '${subType}', falling back to anime builder`
      );
      // 对于回退情况，尝试用anime builder处理
      return this.builders.get("anime")!.buildPrompt(params);
    }

    // 4. 回退：直接返回原始prompt或空字符串
    console.error(
      `[PromptBuilder] No prompt builder found for sub_type: '${subType}', using fallback`
    );
    return params.prompt || params.template_prompt || "";
  }

  /**
   * 检查是否支持指定的sub_type
   */
  supports(subType: string): boolean {
    return (
      this.builders.has(subType) ||
      this.builders.has(this.normalizeSubType(subType))
    );
  }

  /**
   * 获取所有已注册的sub_type
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.builders.keys());
  }

  /**
   * 标准化sub_type格式
   */
  private normalizeSubType(raw?: string): string {
    if (!raw) return "";
    return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  }
}
