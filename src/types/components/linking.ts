/**
 * LinkingComponent - 联动链接组件类型定义
 *
 * 用于在OC详情页等场景中，快速链接到相关创作功能
 */

import type { LucideIcon } from 'lucide-react';

export interface LinkButton {
  /** 按钮文本（需要国际化） */
  label: string;
  /** 跳转链接 */
  href: string;
  /** 按钮样式变体 */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link';
  /** 可选图标 */
  icon?: React.ReactNode;
  /** 额外类名 */
  className?: string;
}

export interface MainButton {
  /** 主按钮文本 */
  label: string;
  /** 按钮类型：single（单按钮）或list（列表） */
  type: 'single' | 'list';
  /** 单按钮模式下的跳转链接 */
  href?: string;
  /** 列表模式下的子按钮项 */
  listItems?: LinkButton[];
  /** 按钮样式变体 */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link';
  /** 额外类名 */
  className?: string;
  /** Lucide 图标组件（用于 icon-only 模式） */
  lucideIcon?: LucideIcon;
  /** Tooltip 提示文字（用于 icon-only 模式） */
  tooltip?: string;
}

export interface LinkingComponentProps {
  /** 布局方向 */
  orientation: 'horizontal' | 'vertical';
  /** 按钮配置数组 */
  buttons: MainButton[];
  /** 显示模式：default(默认按钮) | icon-only(纯图标) | compact(紧凑模式：移动端只显示一个图标) */
  displayMode?: 'default' | 'icon-only' | 'compact';
  /** 紧凑模式下的触发图标 */
  triggerIcon?: LucideIcon;
  /** 紧凑模式下的触发提示文案 */
  triggerTooltip?: string;
  /** 紧凑模式下的触发按钮文本 */
  triggerLabel?: string;
  /** 自定义样式类 */
  className?: string;
  /** 额外属性 */
  [key: string]: any;
}

/** 场景配置类型 */
export interface SceneConfig {
  /** 场景名称 */
  name: 'anime-generation' | 'oc-maker' | 'character-detail' | 'community-detail';
  /** 布局方向 */
  orientation: 'horizontal' | 'vertical';
  /** 显示模式 */
  displayMode?: 'default' | 'icon-only' | 'compact';
  /** 按钮配置 */
  buttons: MainButton[];
}
