
// 导入 prompt 模板配置
import promptOptimizationConfig from "@/configs/prompts/prompt-optimization.json";


export interface OptimizationPromptOptions {
  original_prompt: string;
  target_style?: string;
}

/**
 * 构建 LLM 优化请求的提示词
 */
export function buildOptimizationPrompt(options: OptimizationPromptOptions): {
  system: string;
  user: string;
} {
  const template = promptOptimizationConfig.template;

  return {
    system: template.system_prompt,
    user: template.user_prompt_template.replace("{original_prompt}", options.original_prompt)
  };
}

/**
 * 清理提示词
 */
export function cleanPrompt(prompt: string): string {
  return prompt
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .join(', ');
}