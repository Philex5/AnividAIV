export interface WorldMetadata {
  title?: string;
  description?: string;
  keywords?: string;
}

export interface WorldFormSectionCopy {
  title?: string;
  subtitle?: string;
}

export interface WorldFormCopy {
  labels?: Record<string, string>;
  placeholders?: Record<string, string>;
  options?: Record<string, Record<string, string>>;
  sections?: Record<string, WorldFormSectionCopy>;
  buttons?: Record<string, string>;
  empty?: Record<string, string>;
  helpers?: Record<string, string>;
  fields?: {
    extra?: {
      key?: string;
      value?: string;
    };
  };
  ocs?: Record<string, string>;
}

export interface WorldFormPageSection {
  metadata?: WorldMetadata;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  helper?: string;
  form?: WorldFormCopy;
  visibility?: Record<string, string>;
  errors?: Record<string, string>;
}

export interface WorldDetailPageSection {
  metadata?: WorldMetadata;
  title?: string;
  subtitle?: string;
  note?: string;
  uuidLabel?: string;
  cta?: string;
  section_title?: string;
  info?: {
    labels?: Record<string, string>;
    fallbacks?: Record<string, string>;
  };
  errors?: Record<string, string>;
}

export interface WorldListSection {
  title?: string;
  subtitle?: string;
  create?: string;
  empty_title?: string;
  empty_description?: string;
  empty_cta?: string;
}

export interface WorldSelectorCopy {
  placeholder?: string;
  search?: string;
  none?: string;
  presets?: string;
  custom?: string;
  empty?: string;
}

export interface WorldPage {
  metadata?: WorldMetadata;
  breadcrumb?: {
    worlds?: string;
  };
  create?: WorldFormPageSection;
  edit?: WorldFormPageSection;
  detail?: WorldDetailPageSection;
  list?: WorldListSection;
  world_selector?: WorldSelectorCopy;
  errors?: Record<string, string>;
  toast?: Record<string, string>;
  [key: string]: unknown;
}
