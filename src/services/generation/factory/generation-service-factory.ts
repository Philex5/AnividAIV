/**
 * Generation Service Factory
 * 根据生成类型路由到对应的服务实例
 */

import { animeGenerationService } from '../anime/anime-generation-service';
import { characterGenerationService } from '../character/character-generation-service';
import { avatarGenerationService } from '../avatar/avatar-generation-service';
import { backgroundGenerationService } from '../background/background-generation-service';
import { videoGenerationService } from '../video/video-generation-service';
import type { BaseGenerationService } from '../base/base-generation-service';
import type { AnimeGenerationRequest } from '../anime/anime-types';
import type { CharacterGenerationRequest } from '../character/character-types';
import type { AvatarGenerationRequest } from '../avatar/avatar-types';
import type { BackgroundGenerationRequest } from '../background/background-types';

export type GenerationType = 'anime' | 'character' | 'avatar' | 'video' | 'background';

export type GenerationRequest = AnimeGenerationRequest | CharacterGenerationRequest | AvatarGenerationRequest | BackgroundGenerationRequest;

export class GenerationServiceFactory {
  private static instance: GenerationServiceFactory;

  // 服务实例缓存
  private services: Map<GenerationType, BaseGenerationService<any>> = new Map();

  constructor() {
    // 初始化服务实例
    this.services.set('anime', animeGenerationService);
    this.services.set('character', characterGenerationService);
    this.services.set('avatar', avatarGenerationService);
    this.services.set('background', backgroundGenerationService);
    this.services.set('video', videoGenerationService as any);
  }

  /**
   * 获取单例实例
   */
  static getInstance(): GenerationServiceFactory {
    if (!GenerationServiceFactory.instance) {
      GenerationServiceFactory.instance = new GenerationServiceFactory();
    }
    return GenerationServiceFactory.instance;
  }

  /**
   * 根据生成类型获取对应的服务实例
   */
  getService(type: GenerationType): BaseGenerationService<any> {
    const service = this.services.get(type);
    
    if (!service) {
      throw new Error(`No service found for generation type: ${type}`);
    }
    
    return service;
  }

  /**
   * 根据生成类型获取动漫生图服务
   */
  getAnimeService(): BaseGenerationService<AnimeGenerationRequest> {
    return this.getService('anime');
  }

  /**
   * 根据生成类型获取角色生图服务
   */
  getCharacterService(): BaseGenerationService<CharacterGenerationRequest> {
    return this.getService('character');
  }

  /**
   * 根据生成类型获取头像生图服务
   */
  getAvatarService(): BaseGenerationService<AvatarGenerationRequest> {
    return this.getService('avatar');
  }

  /**
   * 根据生成类型获取背景生图服务
   */
  getBackgroundService(): BaseGenerationService<BackgroundGenerationRequest> {
    return this.getService('background');
  }

  /**
   * 创建生图任务的统一入口
   */
  async createGeneration(type: GenerationType, params: GenerationRequest) {
    const service = this.getService(type);
    return await service.createGeneration(params);
  }

  /**
   * 查询生图状态的统一入口
   */
  async getGenerationStatus(uuid: string) {
    // 根据数据库记录的类型路由到对应服务，确保视频等类型能返回正确结果
    const { findGenerationByUuid } = await import('@/models/generation');
    const gen = await findGenerationByUuid(uuid);
    const type = this.determineGenerationType(gen?.type, gen?.sub_type ?? undefined);
    const service = this.getService(type);
    return await (service as any).getGenerationStatus(uuid);
  }

  /**
   * 获取用户历史的统一入口
   */
  async getUserGenerationHistory(userUuid: string, options: any = {}) {
    // 历史查询也不需要区分类型，可以通过任一服务查询
    const service = this.getService('anime');
    return await service.getUserGenerationHistory(userUuid, options);
  }

  /**
   * 处理 Webhook 回调的统一入口
   */
  async handleWebhookByGenerationType(
    generationType: GenerationType,
    taskId: string,
    state: string,
    resultUrls?: string[],
    failMsg?: string
  ) {
    const service = this.getService(generationType);
    return await service.handleWebhookCallback(taskId, state, resultUrls, failMsg);
  }

  /**
   * 根据数据库记录的 generation_type 处理 Webhook
   */
  async handleWebhookByTaskId(
    taskId: string,
    state: string,
    resultUrls?: string[],
    failMsg?: string
  ) {
    // 先从数据库查询生成记录以确定类型
    const { findGenerationByRemoteTaskId } = await import('@/models/generation');
    const generation = await findGenerationByRemoteTaskId(taskId);
    
    if (!generation) {
      throw new Error(`Generation not found for task ${taskId}`);
    }

    // 确定生成类型
    const generationType = this.determineGenerationType(generation.type, generation.sub_type);
    
    // 路由到对应的服务处理
    return await this.handleWebhookByGenerationType(
      generationType,
      taskId,
      state,
      resultUrls,
      failMsg
    );
  }

  /**
   * 确定生成类型
   */
  private determineGenerationType(
    dbType?: string | null,
    dbSubType?: string | null
  ): GenerationType {
    switch (dbType) {
      case 'video':
        return 'video';
      case 'character':
        return dbSubType === 'avatar' ? 'avatar' : 'character';
      case 'image':
        return 'anime';
      case 'background':
        return 'background';
      case 'avatar': // legacy fallback
        return 'avatar';
      case 'anime': // legacy fallback
        return 'anime';
      default:
        // 如果是 image 类型，且 sub_type 是 background
        if (dbType === 'image' && dbSubType === 'background') {
            return 'background';
        }
        return 'anime';
    }
  }

  resolveServiceByStoredType(
    dbType?: string | null,
    dbSubType?: string | null
  ): BaseGenerationService<any> {
    const serviceKey = this.determineGenerationType(dbType, dbSubType);
    return this.getService(serviceKey);
  }

  /**
   * 获取所有支持的生成类型
   */
  getSupportedTypes(): GenerationType[] {
    return Array.from(this.services.keys());
  }

  /**
   * 检查是否支持指定的生成类型
   */
  isTypeSupported(type: string): type is GenerationType {
    return this.services.has(type as GenerationType);
  }

  /**
   * 注册新的生成服务（用于扩展）
   */
  registerService(type: GenerationType, service: BaseGenerationService<any>): void {
    this.services.set(type, service);
  }
}

// 导出单例实例
export const generationServiceFactory = GenerationServiceFactory.getInstance();

// 导出便利函数
export function getGenerationService(type: GenerationType) {
  return generationServiceFactory.getService(type);
}

export function createGeneration(type: GenerationType, params: GenerationRequest) {
  return generationServiceFactory.createGeneration(type, params);
}

export function getGenerationStatus(uuid: string) {
  return generationServiceFactory.getGenerationStatus(uuid);
}

export function getUserGenerationHistory(userUuid: string, options: any = {}) {
  return generationServiceFactory.getUserGenerationHistory(userUuid, options);
}

export function handleWebhookCallback(
  taskId: string,
  state: string,
  resultUrls?: string[],
  failMsg?: string
) {
  return generationServiceFactory.handleWebhookByTaskId(taskId, state, resultUrls, failMsg);
}
