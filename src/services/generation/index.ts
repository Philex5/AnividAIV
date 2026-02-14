/**
 * Generation Services Index
 * 统一导出所有生图服务相关的模块
 */

// 基础服务和类型
export * from './base/generation-types';
export * from './base/generation-errors';
export * from './base/base-generation-service';

// 动漫生图服务
export * from './anime/anime-types';
export * from './anime/anime-prompt-builder';
export * from './anime/anime-generation-service';

// 角色生图服务
export * from './character/character-types';
export * from './character/character-prompt-builder';
export * from './character/character-generation-service';

// 头像生图服务
export * from './avatar/avatar-types';
export * from './avatar/avatar-prompt-builder';
export * from './avatar/avatar-generation-service';

// 背景生图服务
export * from './background/background-types';
export * from './background/background-prompt-builder';
export * from './background/background-generation-service';

// 服务工厂
export * from './factory/generation-service-factory';

// 便利导出 - 主要的服务实例
export { animeGenerationService } from './anime/anime-generation-service';
export { characterGenerationService } from './character/character-generation-service';
export { avatarGenerationService } from './avatar/avatar-generation-service';
export { backgroundGenerationService } from './background/background-generation-service';
export { generationServiceFactory } from './factory/generation-service-factory';