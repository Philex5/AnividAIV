/**
 * 分享功能相关类型定义
 */

export enum SharePlatform {
  TWITTER = "twitter",
  FACEBOOK = "facebook",
  REDDIT = "reddit",
  LINK = "link",
  COMMUNITY = "community",
  LINKEDIN = "linkedin",
  TELEGRAM = "telegram",
  WEB_SHARE = "web_share",
}

/**
 * 分享内容接口
 */
export interface ShareContent {
  /** 内容类型 */
  type: "character" | "image" | "video" | "world";
  /** 内容ID或UUID */
  id: string;
  /** 分享标题 */
  title?: string;
  /** 分享文本描述 */
  text?: string;
  /** 封面图片URL */
  imageUrl?: string;
  /** 相关角色UUID列表（可选） */
  characterUuids?: string[];
}

/**
 * 分享选项配置
 */
export interface ShareOptions {
  /** 启用的分享平台列表，默认所有平台 */
  platforms?: SharePlatform[];
  /** 分享成功回调 */
  onSuccess?: (platform: SharePlatform) => void;
  /** 分享失败回调 */
  onError?: (platform: SharePlatform, error: Error) => void;
  /** 自定义分享文本（按平台） */
  customTexts?: Partial<Record<SharePlatform, string>>;
  /** 是否显示平台图标（menu模式时） */
  showIcons?: boolean;
  /** 是否显示平台标签（menu模式时） */
  showLabels?: boolean;
}

/**
 * ShareMenu 组件Props
 */
export interface ShareMenuProps {
  /** 分享内容 */
  content: ShareContent;
  /** 分享选项 */
  options?: ShareOptions;
  /** 变体：button（按钮模式）或 menu（下拉菜单模式） */
  variant?: "button" | "menu";
  /** 尺寸 */
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  /** 自定义类名 */
  className?: string;
  /** 子元素（用于自定义触发器） */
  children?: React.ReactNode;
}

/**
 * 平台分享配置
 */
export interface PlatformConfig {
  /** 平台标识 */
  platform: SharePlatform;
  /** 显示名称 */
  label: string;
  /** 图标组件或图标名称 */
  icon?: string | React.ComponentType<any>;
  /** 是否启用 */
  enabled?: boolean;
  /** 自定义分享URL构建函数 */
  buildUrl?: (content: ShareContent) => string;
}

/**
 * 分享服务接口
 */
export interface IShareService {
  /** 分享到指定平台 */
  share: (content: ShareContent, platform: SharePlatform) => Promise<void>;
  /** 分享到多个平台 */
  shareMultiple: (
    content: ShareContent,
    platforms: SharePlatform[]
  ) => Promise<void>;
  /** 构建分享URL */
  buildShareUrl: (content: ShareContent) => string;
  /** 复制到剪贴板 */
  copyToClipboard: (text: string) => Promise<void>;
}

/**
 * 社区作品分享链接参数
 */
export interface CommunityShareParams {
  artwork: string;
  artworkType: "image" | "video" | "character";
  type?: "image" | "video" | "character";
}

/**
 * 角色分享链接参数
 */
export interface CharacterShareParams {
  characterUuid: string;
}
