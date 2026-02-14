export type PromptDimensionKey =
  | "subject"
  | "action"
  | "setting"
  | "style"
  | "modifier";

export interface PromptItem {
  id: string;
  text: string;
  weight?: number;
}

export type PromptState = Record<PromptDimensionKey, PromptItem | null>;
export type LockState = Record<PromptDimensionKey, boolean>;

export interface WordBank {
  subjects: PromptItem[];
  actions: PromptItem[];
  settings: PromptItem[];
  styles: PromptItem[];
  modifiers: PromptItem[];
}
