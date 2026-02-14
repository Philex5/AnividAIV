export interface PromptDimensionText {
  subject: string;
  action: string;
  setting: string;
  style: string;
  modifier: string;
}

export interface ArtPromptGeneratorPage {
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  hero?: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    cta_button?: string;
    secondary_cta?: string;
  };
  tool?: {
    title?: string;
    description?: string;
    generate_button?: string;
    generating?: string;
    lock_tooltip?: string;
    unlock_tooltip?: string;
    locked?: string;
    unlocked?: string;
    copy_prompt?: string;
    copy_success?: string;
    copy_failed?: string;
    use_in_generator?: string;
    empty_state?: string;
    unlock_notice?: string;
    dimensions?: PromptDimensionText;
  };
  generated_prompt?: {
    title?: string;
    subtitle?: string;
    placeholder?: string;
    copied?: string;
    use_button?: string;
  };
  showcase?: {
    title?: string;
    description?: string;
    copy_button?: string;
    copied?: string;
    copy_failed?: string;
    use_in_generator_button?: string;
    cta_text?: string;
    cta_button?: string;
  };
  introduction?: {
    tagline?: string;
    title?: string;
    description?: string;
  };
  how_to_use?: {
    title?: string;
    steps?: Array<{
      title: string;
      description: string;
    }>;
  };
  benefits?: {
    eyebrow?: string;
    title?: string;
    items?: Array<{
      title: string;
      description: string;
    }>;
  };
  faq?: {
    eyebrow?: string;
    title?: string;
    items?: Array<{
      question: string;
      answer: string;
    }>;
  };
  cta?: {
    title?: string;
    description?: string;
    primary_button?: string;
  };
}
