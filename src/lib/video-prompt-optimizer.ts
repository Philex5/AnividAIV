// 导入视频 prompt 优化模板配置
import videoOptimizerConfig from "@/configs/prompts/video/optimizer.json";

export interface VideoOptimizationPromptOptions {
  original_prompt: string;
  target_style?: string;
}

/**
 * 构建视频 LLM 优化请求的提示词
 * 使用 video/optimizer.json 配置
 */
export function buildVideoOptimizationPrompt(options: VideoOptimizationPromptOptions): {
  system: string;
  user: string;
} {
  const template = videoOptimizerConfig.template;

  // 替换模板中的变量
  const userPrompt = template.replace("${user_input}", options.original_prompt);

  return {
    system: "You are an expert at optimizing video generation prompts for anime-style content. Create concise, clear prompts that work well with AI video generation models.",
    user: userPrompt
  };
}

/**
 * 清理视频提示词
 */
export function cleanVideoPrompt(prompt: string): string {
  return prompt
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .join(', ');
}
