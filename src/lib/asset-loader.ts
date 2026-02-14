/**
 * AssetLoader - 资源适配器
 *
 * 统一处理静态资源加载，所有环境均使用 R2 Storage + CDN：
 * - 开发环境：使用 R2/CDN 资源
 * - 生产环境：使用 R2 Storage + CDN
 * - Cloudflare Workers 兼容
 *
 * 核心原则：
 * - 统一使用 R2/CDN 资源，不使用本地 public/ 目录路径
 * - 通过 NEXT_PUBLIC_STORAGE_DOMAIN 或 STORAGE_DOMAIN 环境变量配置域名
 * - 保持开发/生产环境一致性，避免路径差异导致的 bug
 *
 * 支持的资源类型：
 * - logo.webp, favicon.ico
 * - imgs/ 目录下的图标、示例图、风格图等
 * - creamy/ 目录下的装饰和图标
 * - emails/ 目录下的邮件模板
 *
 * 使用示例：
 * ```typescript
 * // 配置环境变量
 * // 开发环境: NEXT_PUBLIC_STORAGE_DOMAIN=http://localhost:8787/assets
 * // 生产环境: NEXT_PUBLIC_STORAGE_DOMAIN=https://artworks.anividai.com/assets
 *
 * // 在组件中使用
 * import { getLogoUrl } from "@/lib/asset-loader";
 * <img src={getLogoUrl()} alt="Logo" />
 * ```
 */

type Environment = "development" | "production" | "preview";

class AssetLoader {
  private static instance: AssetLoader;
  private environment: Environment;
  private storageDomain: string | undefined;
  private isCloudflare: boolean;

  private constructor() {
    // 检测环境
    this.environment = (process.env.NODE_ENV as Environment) || "development";

    // 检测是否在 Cloudflare 环境中运行（仅用于日志，不影响环境变量获取）
    this.isCloudflare =
      typeof globalThis !== "undefined" && "Cloudflare" in globalThis;

    // 统一使用 process.env 获取环境变量
    // 在 Cloudflare Workers + OpenNext 中，NEXT_PUBLIC_ 前缀的环境变量会被注入到客户端
    this.storageDomain =
      process.env.NEXT_PUBLIC_STORAGE_DOMAIN || process.env.STORAGE_DOMAIN;

    // 检查 STORAGE_DOMAIN 是否配置
    if (!this.storageDomain) {
      console.error(
        "[AssetLoader] STORAGE_DOMAIN is not configured. Please set NEXT_PUBLIC_STORAGE_DOMAIN or STORAGE_DOMAIN environment variable.\n" +
          "Example: NEXT_PUBLIC_STORAGE_DOMAIN=https://artworks.anividai.com/assets",
      );
    }
  }

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  /**
   * 获取 logo.webp 的完整 URL
   */
  getLogoUrl(): string {
    return this.getPublicAssetUrl("logo.webp");
  }

  /**
   * 获取 favicon.ico 的完整 URL
   */
  getFaviconUrl(): string {
    return this.getPublicAssetUrl("favicon.ico");
  }

  /**
   * 获取 sidebar 图标 URL
   * @param iconName - 图标名称，如 "sidebar_home_icon", "sidebar_oc_maker" 等
   */
  getSidebarIconUrl(iconName: string): string {
    return this.getPublicAssetUrl(
      `imgs/icons/sidebar/sidebar_${iconName}_icon.png`,
    );
  }

  /**
   * 获取模型图标 URL
   * @param modelName - 模型名称，如 "openai", "banana", "seedream_4" 等
   * @param ext - 扩展名，默认为 webp/svg
   */
  getModelIconUrl(modelName: string, ext: string = "svg"): string {
    // 模型图标可能是 svg 或 webp
    return this.getPublicAssetUrl(`imgs/models/${modelName}.${ext}`);
  }

  /**
   * 获取会员徽章图标 URL
   * @param badgeType - 徽章类型，如 "pro_member", "basic_member", "free_member", "plus_member", "sub_only"
   */
  getMemberBadgeUrl(badgeType: string): string {
    // 标准化徽章类型到文件名
    const badgeFileMap: Record<string, string> = {
      pro: "pro_member_badge.webp",
      basic: "basic_member_badge.webp",
      plus: "plus_member_badge.webp",
      free: "free_member_badge.webp",
      premium: "pro_member_badge.webp",
      vip: "pro_member_badge.webp",
      enterprise: "pro_member_badge.webp",
      sub_only: "sub_only.webp",
      // 完整格式也支持
      pro_member: "pro_member_badge.webp",
      basic_member: "basic_member_badge.webp",
      free_member: "free_member_badge.webp",
      plus_member: "plus_member_badge.webp",
    };

    const normalizedType = badgeType.toLowerCase().trim();
    const fileName =
      badgeFileMap[normalizedType] ||
      badgeFileMap[normalizedType.replace(/_/g, "")] ||
      `${normalizedType}_badge.webp`;

    return this.getPublicAssetUrl(`imgs/icons/members/${fileName}`);
  }

  /**
   * 获取比例图标 URL
   * @param ratio - 比例值，如 "1:1", "16:9", "auto" 等
   */
  getRatioIconUrl(ratio: string): string {
    const ratioKey = ratio.replace(":", "_");
    return this.getPublicAssetUrl(`imgs/ratios/ar_${ratioKey}.svg`);
  }

  /**
   * 获取动漫风格示例图 URL
   * @param styleName - 风格名称，如 "anime", "ghiblio", "chibi" 等
   */
  getAnimeStyleImageUrl(styleName: string): string {
    return this.getPublicAssetUrl(`imgs/anime_styles/${styleName}.webp`);
  }

  /**
   * 获取 OC 风格示例图 URL
   * @param styleName - 风格名称，如 "anime", "cyberpunk", "chibi" 等
   */
  getOCStyleImageUrl(styleName: string): string {
    return this.getPublicAssetUrl(`imgs/oc_styles/${styleName}.webp`);
  }

  /**
   * 获取手办模板图片 URL
   * @param templateIndex - 模板编号，1-6
   */
  getActionFigureTemplateUrl(templateIndex: number | string): string {
    return this.getPublicAssetUrl(
      `imgs/figure_templates/action-figure-template-${templateIndex}.webp`,
    );
  }

  /**
   * 获取工具图标 URL（creamy 目录下的创建工具图标）
   * @param toolName - 工具名称，如 "anime_generator", "video_generator", "story_creator", "ai_chat"
   */
  getToolIconUrl(toolName: string): string {
    return this.getPublicAssetUrl(`creamy/creation_tool_icon/${toolName}.webp`);
  }

  /**
   * 获取 creamy 装饰图标 URL
   * @param decorationName - 装饰名称，如 "bow_tile", "foot", "tail", "pad"
   */
  getCreamyDecorationUrl(decorationName: string): string {
    return this.getPublicAssetUrl(`creamy/decorations/${decorationName}.webp`);
  }

  /**
   * 获取 creamy 角色图标 URL
   * @param characterName - 角色名称，如 "meow_coin", "chat", "ap", "bixin", "hello_anivid"
   */
  getCreamyCharacterUrl(characterName: string): string {
    return this.getPublicAssetUrl(`creamy/${characterName}.webp`);
  }

  /**
   * 获取邮件模板 URL
   * @param templateName - 模板名称，如 "welcome", "subscription-thank-you" 等
   */
  getEmailTemplateUrl(templateName: string): string {
    return this.getAssetUrl(`email/${templateName}.html`);
  }

  /**
   * 获取支付图标 URL
   * @param paymentMethod - 支付方式，如 "cnpay"
   */
  getPaymentIconUrl(paymentMethod: string): string {
    const ext = paymentMethod === "cnpay" ? "png" : "webp";
    return this.getPublicAssetUrl(`imgs/${paymentMethod}.${ext}`);
  }

  /**
   * 通用方法：获取 public/ 目录下资源的完整 URL
   * @param publicPath - public/ 下的相对路径，支持多种格式：
   *   - "imgs/icons/sidebar/home.webp"
   *   - "/imgs/icons/sidebar/home.webp"
   *   - "public/imgs/icons/sidebar/home.webp"
   * @returns 完整的资源 URL
   */
  getPublicAssetUrl(publicPath: string): string {
    // 处理空路径
    if (!publicPath) {
      return "";
    }

    // 移除开头的 / 符号
    let cleanPath = publicPath.startsWith("/")
      ? publicPath.slice(1)
      : publicPath;

    // 移除开头的 public/ 前缀
    cleanPath = cleanPath.replace(/^public\//, "");

    // 统一使用 R2/CDN 资源
    if (this.storageDomain) {
      // 如果路径已经包含 assets/，则不重复添加
      if (cleanPath.startsWith("assets/")) {
        return `${this.storageDomain}/${cleanPath}`;
      }
      return `${this.storageDomain}/assets/${cleanPath}`;
    }

    // 回退：如果没有配置 STORAGE_DOMAIN，报错提示
    console.error(
      "STORAGE_DOMAIN is not configured. Please set NEXT_PUBLIC_STORAGE_DOMAIN or STORAGE_DOMAIN environment variable",
    );
    return "";
  }

  /**
   * 获取 assets/ 目录下资源的完整 URL（保留旧方法以保持兼容性）
   * @param assetPath - assets/ 下的相对路径，如 "logos/logo.webp"
   * @returns 完整的资源 URL
   */
  getAssetUrl(assetPath: string): string {
    // 处理空路径
    if (!assetPath) {
      return "";
    }

    // 移除开头的 assets/ 前缀，统一处理
    const cleanPath = assetPath.replace(/^assets\//, "");

    // 统一使用 R2/CDN 资源
    if (this.storageDomain) {
      return `${this.storageDomain}/assets/${cleanPath}`;
    }

    // 回退：如果没有配置 STORAGE_DOMAIN，报错提示
    console.error(
      "STORAGE_DOMAIN is not configured. Please set NEXT_PUBLIC_STORAGE_DOMAIN or STORAGE_DOMAIN environment variable",
    );
    return "";
  }

  /**
   * 通用方法：获取图片 URL
   * 自动识别路径类型并返回正确的 URL
   * @param imagePath - 图片路径，支持：
   *   - 以 "/" 开始的相对路径: "/imgs/...", "/creamy/..."
   *   - 不以 "/" 开始的路径: "imgs/...", "creamy/..."
   *   - assets/ 路径: "assets/..."
   *   - R2 路径: "gallery/...", "uploads/..."
   * @returns 完整的图片 URL
   */
  getImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      return "";
    }

    // 处理空路径或空字符串
    if (!imagePath.trim()) {
      return "";
    }

    // 移除首尾空格
    const trimmedPath = imagePath.trim();

    // 如果已经是完整 URL（以 http:// 或 https:// 开头），直接返回
    if (/^https?:\/\//i.test(trimmedPath)) {
      return trimmedPath;
    }

    // 如果是 assets/ 路径，使用 getAssetUrl
    if (
      trimmedPath.startsWith("assets/") ||
      trimmedPath.startsWith("/assets/")
    ) {
      const cleanAssetPath = trimmedPath.startsWith("/")
        ? trimmedPath.slice(1)
        : trimmedPath;
      return this.getAssetUrl(cleanAssetPath);
    }

    // 默认情况（以 / 开头或直接路径），使用 getPublicAssetUrl
    // 移除开头的 / 符号，统一处理
    const cleanPath = trimmedPath.startsWith("/")
      ? trimmedPath
      : `/${trimmedPath}`;
    return this.getPublicAssetUrl(cleanPath);
  }

  /**
   * 获取 R2 存储的图片 URL
   * @param r2Path - R2 中的路径，如 "gallery/image.webp"
   * @returns 完整的图片 URL
   */
  getR2Url(r2Path: string): string {
    if (!r2Path) return "";

    // 如果是绝对 URL，直接返回
    if (/^https?:\/\//i.test(r2Path)) {
      return r2Path;
    }

    // 移除开头的斜杠
    const cleanPath = r2Path.startsWith("/") ? r2Path.slice(1) : r2Path;

    // 统一使用 R2/CDN
    if (this.storageDomain) {
      return `${this.storageDomain}/${cleanPath}`;
    }

    // 回退：如果没有配置 STORAGE_DOMAIN，报错提示
    console.error(
      "STORAGE_DOMAIN is not configured. Please set NEXT_PUBLIC_STORAGE_DOMAIN or STORAGE_DOMAIN environment variable",
    );
    return "";
  }

  /**
   * 获取缩略图 URL
   * @param r2Path - 原始图片路径
   * @returns 缩略图 URL
   */
  getThumbnailUrl(r2Path: string): string {
    if (!r2Path) return "";

    // 提取目录和文件名
    const lastSlashIndex = r2Path.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      return this.getR2Url(`thumbs/${r2Path}`);
    }

    const directory = r2Path.substring(0, lastSlashIndex);
    const filename = r2Path.substring(lastSlashIndex + 1);

    return this.getR2Url(`${directory}/thumbs/${filename}`);
  }

  /**
   * 智能图片 URL 解析
   * 自动判断是 assets/ 路径还是 R2 路径，返回合适的 URL
   * @param imagePath - 图片路径（可能是 assets/ 路径或 R2 路径）
   * @returns 完整的图片 URL
   */
  resolveImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) return "";

    // assets/ 路径
    if (imagePath.startsWith("assets/")) {
      return this.getAssetUrl(imagePath);
    }

    // R2 路径或其他路径
    return this.getR2Url(imagePath);
  }

  /**
   * 获取 R2 存储的图片 URL（R2 根目录路径，不添加 assets/ 前缀）
   * @param r2Path - R2 中的路径，如 "showcases/image.webp", "gallery/..." 等
   * @returns 完整的图片 URL
   */
  getR2ImageUrl(r2Path: string | null | undefined): string {
    if (!r2Path) return "";

    // 处理空路径或空字符串
    if (!r2Path.trim()) {
      return "";
    }

    // 移除首尾空格
    const trimmedPath = r2Path.trim();

    // 如果已经是完整 URL（以 http:// 或 https:// 开头），直接返回
    if (/^https?:\/\//i.test(trimmedPath)) {
      return trimmedPath;
    }

    // 移除开头的斜杠，统一处理
    const cleanPath = trimmedPath.startsWith("/")
      ? trimmedPath.slice(1)
      : trimmedPath;

    // 统一使用 R2/CDN，不添加 assets/ 前缀
    if (this.storageDomain) {
      return `${this.storageDomain}/${cleanPath}`;
    }

    // 回退：如果没有配置 STORAGE_DOMAIN，报错提示
    console.error(
      "STORAGE_DOMAIN is not configured. Please set NEXT_PUBLIC_STORAGE_DOMAIN or STORAGE_DOMAIN environment variable",
    );
    return "";
  }

  /**
   * 检查是否在 Cloudflare 环境中运行
   */
  isRunningOnCloudflare(): boolean {
    return this.isCloudflare;
  }

  /**
   * 获取当前环境信息
   */
  getEnvironmentInfo() {
    return {
      environment: this.environment,
      storageDomain: this.storageDomain,
      isCloudflare: this.isCloudflare,
    };
  }

  /**
   * 预加载关键资源（可选的性能优化）
   * @param assets - 要预加载的资源路径数组
   */
  async preloadAssets(assets: string[]): Promise<void> {
    if (typeof window === "undefined") {
      // 服务端环境跳过预加载
      return;
    }

    const preloadPromises = assets.map(async (assetPath) => {
      const url = this.resolveImageUrl(assetPath);
      if (!url) return;

      try {
        await fetch(url, { method: "HEAD", mode: "no-cors" });
      } catch (error) {
        console.warn(`Failed to preload asset: ${url}`, error);
      }
    });

    await Promise.all(preloadPromises);
  }
}

// 导出单例实例
export const assetLoader = AssetLoader.getInstance();

// 导出便捷方法 - Logo & Favicon
export const getLogoUrl = () => assetLoader.getLogoUrl();
export const getFaviconUrl = () => assetLoader.getFaviconUrl();

// 导出便捷方法 - Sidebar
export const getSidebarIconUrl = (iconName: string) =>
  assetLoader.getSidebarIconUrl(iconName);

// 导出便捷方法 - 模型图标
export const getModelIconUrl = (modelName: string, ext?: string) =>
  assetLoader.getModelIconUrl(modelName, ext);

// 导出便捷方法 - 会员徽章
export const getMemberBadgeUrl = (badgeType: string) =>
  assetLoader.getMemberBadgeUrl(badgeType);

// 导出便捷方法 - 比例图标
export const getRatioIconUrl = (ratio: string) =>
  assetLoader.getRatioIconUrl(ratio);

// 导出便捷方法 - 风格示例图
export const getAnimeStyleImageUrl = (styleName: string) =>
  assetLoader.getAnimeStyleImageUrl(styleName);
export const getOCStyleImageUrl = (styleName: string) =>
  assetLoader.getOCStyleImageUrl(styleName);

// 导出便捷方法 - Creamy图标
export const getToolIconUrl = (toolName: string) =>
  assetLoader.getToolIconUrl(toolName);
export const getCreamyDecorationUrl = (decorationName: string) =>
  assetLoader.getCreamyDecorationUrl(decorationName);
export const getCreamyCharacterUrl = (characterName: string) =>
  assetLoader.getCreamyCharacterUrl(characterName);

// 导出便捷方法 - 邮件模板
export const getEmailTemplateUrl = (templateName: string) =>
  assetLoader.getEmailTemplateUrl(templateName);

// 导出便捷方法 - 支付
export const getPaymentIconUrl = (paymentMethod: string) =>
  assetLoader.getPaymentIconUrl(paymentMethod);

// 导出便捷方法 - 通用
export const getPublicAssetUrl = (publicPath: string) =>
  assetLoader.getPublicAssetUrl(publicPath);

// 导出便捷方法 - 图片 URL（推荐使用）
export const getImageUrl = (imagePath: string | null | undefined) =>
  assetLoader.getImageUrl(imagePath);

// 保留旧方法以保持兼容性
export const getAssetUrl = (path: string) => assetLoader.getAssetUrl(path);
export const getR2Url = (path: string) => assetLoader.getR2Url(path);
export const getThumbnailUrl = (path: string) =>
  assetLoader.getThumbnailUrl(path);
export const resolveImageUrl = (path: string | null | undefined) =>
  assetLoader.resolveImageUrl(path);

// 导出便捷方法 - R2 根目录图片 URL（R2 路径，不添加 assets/ 前缀）
export const getR2ImageUrl = (path: string | null | undefined) =>
  assetLoader.getR2ImageUrl(path);

export default AssetLoader;
