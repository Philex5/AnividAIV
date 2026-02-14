export interface TagPresetCategory {
  id: string;
  title: string;
  tags: string[];
}

export interface TagPresetItem {
  tag: string;
  label: string;
  category?: string;
  aliases?: string[];
}

export interface TagPresetConfig {
  version: string;
  updated_at?: string;
  categories: TagPresetCategory[];
  popular: TagPresetItem[];
}
