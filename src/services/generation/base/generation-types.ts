// 通用生图服务类型定义

export interface BaseGenerationRequest {
  user_uuid: string;
  model_id: string;
  aspect_ratio: string;
  counts: number;
  visibility_level?: string;
  image_resolution?: string; // 分辨率参数，用于Seedream等模型
  character_uuids?: string[]; // 角色UUID数组，用于OC Maker功能
  metadata?: {
    [key: string]: any;
  };
}

export interface GenerationResponse {
  generation_uuid: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  remote_task_id?: string; // KieAI平台返回的任务ID
  estimated_time?: number;
  credits_cost: number;
  message: string;
}

export interface GenerationStatus {
  uuid: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: GenerationResult[];
  error_message?: string;
  created_at?: string;
  batch_size?: number;
  credits_used?: number;
}

export interface GenerationResult {
  id: number;
  image_url: string;
  image_alt?: string | null;
  generation_uuid: string;
  created_at: string;
}

export interface HistoryOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export interface HistoryResponse {
  generations: GenerationWithImages[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GenerationWithImages {
  uuid: string;
  status: string;
  model_id: string;
  aspect_ratio?: string;
  counts: number;
  credits_cost: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  images: GenerationResult[];
}

export class ValidationResult {
  constructor(
    public valid: boolean,
    public errors: string[] = []
  ) {}

  addError(error: string): void {
    this.errors.push(error);
    this.valid = false;
  }
}

export abstract class GenerationValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'GenerationValidationError';
  }
}

export class InsufficientCreditsError extends GenerationValidationError {
  constructor() {
    super('Insufficient credits', 'INSUFFICIENT_CREDITS');
  }
}

export class InvalidParametersError extends GenerationValidationError {
  constructor(message: string) {
    super(`Invalid parameters: ${message}`, 'INVALID_PARAMETERS');
  }
}

export class GenerationLimitExceededError extends GenerationValidationError {
  constructor() {
    super('Concurrent generation limit exceeded', 'GENERATION_LIMIT_EXCEEDED');
  }
}