'use client';

import { useTranslations } from 'next-intl';

interface TranslationsProps {
  textKey: string;
  values?: Record<string, any>;
}

export function Translations({ textKey, values }: TranslationsProps) {
  const t = useTranslations('feature_recommend');

  // 防护检查：确保 textKey 存在
  if (!textKey) {
    console.warn('Translations: textKey is required');
    return null;
  }

  try {
    // 直接使用 next-intl 的内置功能，支持嵌套键
    return values ? t(textKey, values) : t(textKey);
  } catch (error) {
    console.warn(`Translations: Missing translation for key "${textKey}"`, error);
    return null;
  }
}
