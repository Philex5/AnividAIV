/**
 * KieAI Provider Type Definitions
 * Supports both gpt-image-1 and nano-banana models
 */

export interface TaskCreationResult {
  taskId: string;
}

export type TaskState = 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';

export interface TaskQueryResult {
  taskId: string;
  state: TaskState;
  resultUrls?: string[];
  failMsg?: string;
  failCode?: string;
}

export interface ProcessedGenerationParams {
  prompt: string;
  // gpt-image-1 specific
  size?: string; // "1:1", "2:3", "3:4", "16:9"
  filesUrl?: string[]; // reference images
  // nano-banana specific
  image_size?: string; // "auto" or specific size
  image_urls?: string[]; // for nano-banana-edit
  output_format?: string; // "png"
}

export interface GenerationParams {
  prompt: string;
  model_name: string;
  aspect_ratio: string;
  counts?: number;
  reference_image_urls?: string[];
  image_resolution?: string; // "1K", "2K", "4K" - for models like Seedream
  quality?: "basic" | "high"; // "basic"=2K, "high"=4K - for Seedream 4.5 model

  // Video-specific parameters
  duration?: number;
  duration_seconds?: number;
  resolution?: string; // "480p", "580p", "720p", "1080p"
  motion?: string;
  style_preset?: string;
  fps?: number;
  task_subtype?: 'text_to_video' | 'image_to_video';
}

export abstract class BaseAdapter {
  /**
   * Create a generation task
   */
  abstract createTask(params: GenerationParams): Promise<TaskCreationResult>;

  /**
   * Query task status
   */
  abstract queryTask(taskId: string): Promise<TaskQueryResult>;

  /**
   * Map aspect ratio to model-specific format
   */
  protected abstract mapAspectRatio(aspectRatio: string): string;

  /**
   * Standardize state mapping
   */
  protected mapState(state: TaskState): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (state) {
      case 'waiting':
      case 'queuing':
        return 'pending';
      case 'generating':
        return 'processing';
      case 'success':
        return 'completed';
      case 'fail':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
