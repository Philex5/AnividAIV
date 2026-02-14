/**
 * 统一的模板数据处理工具
 *
 * 标准化从 API 响应中提取模板数组的逻辑
 *
 * Related: FEAT-unified-template-handling
 */

/**
 * 模板类型定义
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  aspect_ratio: string;
  prompt: string;
  i18n_name_key?: string;
  i18n_description_key?: string;
  // OC Nine Grid 专属字段
  requires_oc_mode?: boolean; // 是否需要 OC 模式
  is_nine_grid?: boolean; // 是否为九宫格模板
  fixed_batch_size?: number; // 固定批量大小（九宫格为9）
  expressions?: string[]; // 九宫格的表情列表
}

/**
 * 标准化 API 响应格式
 * 支持多种可能的响应结构，统一返回 templates 数组
 */
export interface TemplatesApiResponse {
  version?: string;
  templates: Template[];
  data?: {
    templates?: Template[];
  };
}

/**
 * 从 API 响应中提取模板数组
 *
 * @param response API 响应数据
 * @returns 模板数组
 *
 * @example
 * // 标准格式
 * const data = { version: "1.0.0", templates: [...] };
 * const templates = extractTemplates(data); // 返回 [...]
 *
 * // 兼容格式 (不推荐，已废弃)
 * const data = { templates: [...] };
 * const templates = extractTemplates(data); // 返回 [...]
 *
 * @deprecated
 * 旧的兼容格式 `data.data` 或直接数组已废弃，请使用标准格式
 */
export function extractTemplates(response: TemplatesApiResponse | Template[]): Template[] {
  // 如果是直接数组，直接返回
  if (Array.isArray(response)) {
    return response;
  }

  // 标准格式：response.templates
  if (response && Array.isArray(response.templates)) {
    return response.templates;
  }

  // 兼容格式：response.data.templates (废弃)
  if (response && response.data && Array.isArray(response.data.templates)) {
    console.warn(
      '[Template Utils] 使用了已废弃的响应格式，请使用标准格式 { version, templates }'
    );
    return response.data.templates;
  }

  // 返回空数组，避免运行时错误
  console.error(
    '[Template Utils] 无法从响应中提取模板数组，请检查 API 响应格式',
    response
  );
  return [];
}

/**
 * 验证模板数据完整性
 *
 * @param template 单个模板对象
 * @returns 是否有效
 */
export function validateTemplate(template: any): template is Template {
  return (
    typeof template === 'object' &&
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.description === 'string' &&
    typeof template.thumbnail === 'string' &&
    typeof template.aspect_ratio === 'string' &&
    typeof template.prompt === 'string'
  );
}

/**
 * 验证模板数组
 *
 * @param templates 模板数组
 * @returns 验证后的模板数组
 */
export function validateTemplates(templates: any[]): Template[] {
  if (!Array.isArray(templates)) {
    console.error('[Template Utils] 模板数据不是数组格式');
    return [];
  }

  const validTemplates: Template[] = [];
  const invalidTemplates: any[] = [];

  templates.forEach((template, index) => {
    if (validateTemplate(template)) {
      validTemplates.push(template);
    } else {
      invalidTemplates.push({ index, template });
    }
  });

  if (invalidTemplates.length > 0) {
    console.warn(
      '[Template Utils] 发现无效的模板数据，已过滤',
      invalidTemplates
    );
  }

  return validTemplates;
}

/**
 * 处理模板 API 响应的完整流程
 *
 * @param response API 响应
 * @returns 验证后的模板数组
 *
 * @example
 * const response = await fetch('/api/oc-apps/action-figure/templates');
 * const data = await response.json();
 * const templates = processTemplatesResponse(data);
 */
export function processTemplatesResponse(response: TemplatesApiResponse | Template[]): Template[] {
  const extracted = extractTemplates(response);
  return validateTemplates(extracted);
}
