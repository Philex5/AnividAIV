// 生图服务错误类型定义

export class GenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

export const GENERATION_ERRORS = {
  INVALID_PARAMETERS: new GenerationError('Invalid generation parameters', 'INVALID_PARAMETERS', 400),
  INSUFFICIENT_CREDITS: new GenerationError('Insufficient credits', 'INSUFFICIENT_CREDITS', 400),
  GENERATION_LIMIT_EXCEEDED: new GenerationError('Concurrent generation limit exceeded', 'GENERATION_LIMIT_EXCEEDED', 429),
  AI_PROVIDER_ERROR: new GenerationError('AI provider error', 'AI_PROVIDER_ERROR', 500),
  GENERATION_TIMEOUT: new GenerationError('Generation timeout', 'GENERATION_TIMEOUT', 408),
  GENERATION_NOT_FOUND: new GenerationError('Generation not found', 'GENERATION_NOT_FOUND', 404),
  INVALID_MODEL: new GenerationError('Invalid model name', 'INVALID_MODEL', 400),
  INVALID_ASPECT_RATIO: new GenerationError('Invalid aspect ratio', 'INVALID_ASPECT_RATIO', 400),
  PROMPT_TOO_LONG: new GenerationError('Prompt too long', 'PROMPT_TOO_LONG', 400),
  counts_INVALID: new GenerationError('Invalid image count', 'counts_INVALID', 400),
} as const;