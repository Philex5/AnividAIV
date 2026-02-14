import { Header } from "@/types/blocks/header";
import { Hero } from "@/types/blocks/hero";
import { Section } from "@/types/blocks/section";
import { Footer } from "@/types/blocks/footer";
import { Pricing } from "@/types/blocks/pricing";

export interface LandingPage {
  header?: Header;
  hero?: Hero;
  draggable_hero?: {
    title: string;
    highlight_text?: string;
    description: string;
    oc_showcase_title: string;
    guide?: {
      drag_text_desktop: string;
      drag_text_mobile: string;
      click_text: string;
    };
  };
  branding?: Section;
  introduce?: Section;
  benefit?: Section;
  usage?: Section;
  feature?: Section;
  showcase?: Section;
  stats?: Section;
  pricing?: Pricing;
  testimonial?: Section;
  faq?: Section;
  cta?: Section;
  blog?: {
    title?: string;
    description?: string;
    read_more_text?: string;
  };
  footer?: Footer;
  user_showcase?: {
    title: string;
    description: string;
    see_more: string;
    loading: string;
    empty: string;
    featured_artworks: Array<{
      uuid: string;
      type: "image" | "video" | "character";
      badge_type: string;
    }>;
  };
}

export interface PricingPage {
  pricing?: Pricing;
}

export interface ShowcasePage {
  showcase?: Section;
}

export interface AnimeGeneratorPage {
  metadata?: {
    title: string;
    description: string;
    keywords: string;
  };
  title?: string;
  subtitle?: string;
  credits?: string;
  images?: string;
  generate?: string;
  generating?: string;
  optimize?: string;
  empty_state?: {
    title: string;
    description: string;
  };
  gallery?: {
    title: string;
    empty: string;
    hint: string;
    preview?: string;
    reuse?: string;
    immersive_title?: string;
  };
  controls?: {
    model: string;
    auto: string;
    ratio: string;
    count: string;
    piece: string;
  };
  prompt?: {
    label: string;
    placeholder: string;
    optimize: string;
    optimizing: string;
    counter_too_long?: string;
    counter_too_short?: string;
    counter_format?: string;
  };
  parameters?: {
    character: string;
    style: string;
    action: string;
    scene: string;
    outfit: string;
    "aspect-ratio": string;
    "batch-size": string;
    model: string;
    advanced: string;
    "guidance-scale": string;
    "num-inference-steps": string;
    seed: string;
    "random-seed": string;
    "generate-seed": string;
    select: string;
    title: string;
    [key: string]: any;
  };
  processing_state?: {
    [key: string]: any;
  };
  completed_results?: {
    [key: string]: any;
  };
  result_image?: {
    [key: string]: any;
  };
  gallery_nav?: {
    [key: string]: any;
  };
  gallery_preview?: {
    [key: string]: any;
  };
  image_detail?: {
    [key: string]: any;
  };
  status?: {
    [key: string]: any;
  };
  errors?: {
    [key: string]: any;
  };
  auth_required?: {
    reuse_params?: string;
    ref_image?: string;
    character?: string;
  };
  features?: {
    section_title?: string;
    section_subtitle?: string;
    intelligent_prompts?: {
      title?: string;
      description?: string;
      features?: string[];
      cta?: string;
      media_alt?: string;
    };
    diverse_styles?: {
      title?: string;
      description?: string;
      features?: string[];
      cta?: string;
      media_alt?: string;
    };
    rapid_generation?: {
      title?: string;
      description?: string;
      features?: string[];
      cta?: string;
      media_alt?: string;
    };
  };
  feature_showcase?: {
    [key: string]: any;
  };
  community_gallery?: {
    title?: string;
    subtitle?: string;
    view_more?: string;
    upload_yours?: string;
  };
  how_to_use?: {
    title?: string;
    subtitle?: string;
    path_a?: {
      title?: string;
      description?: string;
      steps?: string[];
    };
    path_b?: {
      title?: string;
      description?: string;
      steps?: string[];
    };
    step_1_title?: string;
    step_1_description?: string;
    step_2_title?: string;
    step_2_description?: string;
    step_3_title?: string;
    step_3_description?: string;
    step_4_title?: string;
    step_4_description?: string;
    cta_button?: string;
    cta_subtitle?: string;
  };
  action_panel?: {
    [key: string]: any;
  };
  create_oc_quick_link?: {
    button?: string;
  };
  styles?: {
    [key: string]: any;
  };
  scenes?: {
    [key: string]: any;
  };
  outfits?: {
    [key: string]: any;
  };
  ratios?: {
    [key: string]: any;
  };
  models?: {
    [key: string]: any;
  };
  presets?: {
    [key: string]: any;
  };
  faq?: {
    title?: string;
    subtitle?: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  [key: string]: any;
}

export interface OCMakerQuickOption {
  value: string;
  label: string;
  icon?: string;
}

export interface OCMakerIdeaSparkExample {
  id?: string;
  title: string;
  prompt: string;
  description?: string;
  gender?: string;
  gender_label?: string;
  art_style?: string;
  art_style_label?: string;
  species?: string;
  species_label?: string;
  tags?: string[];
}

export interface OCMakerPage {
  metadata?: {
    title: string;
    description: string;
    keywords: string;
  };
  page?: {
    title: string;
    subtitle: string;
    tagline: string;
  };
  navigation?: {
    back_to_home: string;
    start_creating: string;
    browse_gallery: string;
  };
  quick_gen?: {
    title: string;
    subtitle: string;
    placeholder: string;
    button: {
      generate: string;
      generating: string;
      reset: string;
    };
    or?: string;
    result: {
      title: string;
      name_label: string;
      intro_label: string;
    };
    actions: {
      use: string;
      fine_tune: string;
      regenerate: string;
    };
    toast?: {
      generated: string;
      prefilled: string;
      suggestion_applied?: string;
      manual_mode?: string;
      auth_required?: string;
    };
    errors?: {
      failed: string;
      insufficient_credits?: string;
      generation_timeout?: string;
      generation_failed?: string;
      avatar_failed?: string;
    };
    progress?: {
      title?: string;
      subtitle?: string;
      parsing_description?: string;
      creating_character?: string;
      generating_portrait?: string;
      setting_avatar?: string;
    };
  };
  hero?: {
    title?: string;
    subtitle?: string;
    description_label?: string;
    description_placeholder?: string;
    description_helper?: string;
    gender_label?: string;
    art_style_label?: string;
    species_label?: string;
    gender_placeholder?: string;
    art_style_placeholder?: string;
    species_placeholder?: string;
    species_custom?: string;
    species_custom_placeholder?: string;
    gender_options?: {
      female?: string;
      male?: string;
      other?: string;
    };
    suggestions_label?: string;
    generate_button?: string;
    manual_button?: string;
    info_text?: string;
    suggestion_applied?: string;
    manual_mode?: string;
    start_creating?: string;
    browse_works?: string;
    auto_generate_label?: string;
    auto_generate_helper?: string;
    suggestion_pool?: string[];
    quick_options?: {
      clear?: string;
      gender?: OCMakerQuickOption[];
      art_styles?: OCMakerQuickOption[];
      species?: OCMakerQuickOption[];
    };
    suggestions?: {
      label?: string;
      refresh?: string;
      manual_hint?: string;
      pool?: string[];
    };
    idea_sparks?: {
      label?: string;
      description?: string;
      refresh?: string;
      apply_label?: string;
      applied_toast?: string;
      examples?: OCMakerIdeaSparkExample[];
    };
  };
  Introduce: {
    title: string;
    description: string;
    tagline: string;
    image?: {
      src: string;
      alt: string;
    };
  };
  gallery?: {
    title: string;
    description: string;
    view_more: string;
    no_characters: string;
    loading: string;
    search_placeholder: string;
  };
  character_creation?: {
    title: string;
    basic_info: string;
    name: string;
    name_placeholder: string;
    name_required: string;
    gender: string;
    gender_male: string;
    gender_female: string;
    gender_other: string;
    gender_required: string;
    age: string;
    age_placeholder: string;
    species: string;
    species_placeholder: string;
    personality_traits: string;
    background_story: string;
    background_placeholder: string;
    outfit_style: string;
    outfit_placeholder: string;
    color_scheme: string;
    color_placeholder: string;
    visibility: string;
    visibility_private: string;
    visibility_friends: string;
    visibility_public: string;
    allow_remix: string;
    creating: string;
    create_character: string;
    preview: string;
    edit: string;
  };
  character_card?: {
    view_details: string;
    edit: string;
    delete: string;
    share: string;
    like: string;
    unlike: string;
    views: string;
    likes: string;
    generations: string;
    forks: string;
    public: string;
    friends: string;
    private: string;
    no_background: string;
    unnamed_character: string;
    visual_features: string;
    no_visual_features: string;
    attributes: string;
    no_attributes: string;
    no_introduction: string;
    background_story: string;
    main_story: string;
  };
  character_list?: {
    create_character: string;
    search_placeholder: string;
    filter_all: string;
    filter_liked: string;
    filter_forkable: string;
    sort_updated: string;
    sort_created: string;
    sort_liked: string;
    sort_viewed: string;
    load_more: string;
    loading: string;
    no_results: string;
    no_characters: string;
  };
  call_to_action?: {
    title: string;
    description: string;
    start_creating: string;
    sign_up: string;
  };
  stats?: {
    active_users: string;
    characters_created: string;
    online_service: string;
  };
  tabs?: {
    save: string;
    gallery: string;
    info: string;
  };
  errors?: {
    load_characters_failed: string;
    create_character_failed: string;
    delete_character_failed: string;
    like_failed: string;
    unlike_failed: string;
    name_and_gender_required: string;
    character_not_found: string;
    access_denied: string;
    delete_confirm: string;
    delete_failed_retry: string;
    link_copied: string;
    check_url_message: string;
  };
  loading_states?: {};
  species?: {
    [key: string]: string;
  };
  personality?: {
    [key: string]: string;
  };
  backgrounds?: {
    [key: string]: string;
  };
  outfits?: {
    [key: string]: string;
  };
  oc_gallery?: {
    title: string;
    subtitle: string;
    view_more?: string;
    loading: string;
    empty: string;
    previous: string;
    next: string;
    age: string;
    species_label: string;
    style_label: string;
    traits_label: string;
    traits_more: string;
    use_template: string;
    template_loaded: string;
    use_template_tooltip: string;
    view: string;
    chat: string;
  };
  spotlight_gallery?: {
    title: string;
    subtitle: string;
    bio_fragment_title: string;
    skill_arsenal_title: string;
    skill_arsenal_subtitle: string;
    soul_frequency_title: string;
    aura_fragments_title: string;
    access_archives: string;
  };
  faq?: {
    title?: string;
    subtitle?: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  how_to_use?: {
    title?: string;
    subtitle?: string;
    path_a?: {
      title?: string;
      description?: string;
      steps?: string[];
    };
    path_b?: {
      title?: string;
      description?: string;
      steps?: string[];
    };
    step_1_title?: string;
    step_1_description?: string;
    step_2_title?: string;
    step_2_description?: string;
    step_3_title?: string;
    step_3_description?: string;
    step_4_title?: string;
    step_4_description?: string;
    cta_button?: string;
    cta_subtitle?: string;
  };
  benefits?: {
    section_title?: string;
    section_subtitle?: string;
    professional_quality?: {
      title?: string;
      description?: string;
    };
    diverse_styles?: {
      title?: string;
      description?: string;
    };
    fine_details?: {
      title?: string;
      description?: string;
    };
    character_ecosystem?: {
      title?: string;
      description?: string;
    };
    efficiency?: {
      title?: string;
      description?: string;
    };
    rich_character_info?: {
      title?: string;
      description?: string;
    };
  };
  [key: string]: any;
}

export interface CharacterDetailPage {
  metadata?: {
    title: string;
    description: string;
    fallback_description?: string;
  };

  breadcrumb?: {
    home: string;
    characters: string;
    my_ocs: string;
    create_oc: string;
  };

  navigation?: {
    back: string;
    you_own_this: string;
  };
  header?: {
    world_label?: string;
    world_empty?: string;
    quotes_label?: string;
    avatar_upload_label?: string;
    avatar_gallery_label?: string;
    greeting_placeholder?: string;
  };

  sections?: {
    personality_traits: string;
    personality_traits_description?: string;
    background_story: string;
    background_story_empty?: string;
    appearance_style: string;
    outfit_style: string;
    theme_specific_details: string;
    other_views?: string;
    other_views_placeholder?: string;
    attributes_empty?: string;
    extended_attributes?: string;
    extended_attributes_description?: string;
    character_information: string;
  };

  info?: {
    created: string;
    updated: string;
    forking: string;
    allowed: string;
    not_allowed: string;
    years_old: string;
    theme: string;
    created_by?: string;
  };

  actions?: {
    share: string;
    edit: string;
    quit_edit?: string;
    like: string;
    generate: string;
    download: string;
  };

  quick_actions?: {
    title: string;
    export_character: string;
    create_based: string;
    share_character: string;
    more_from_theme: string;
  };

  generation?: {
    title: string;
    style: string;
    aspect_ratio: string;
    quality: string;
    steps: string;
    guidance: string;
    prompt_preview: string;
    generate_images: string;
    generating: string;
    generated_images: string;
    cost_per_generation: string;
    credits: string;
    selection?: {
      title?: string;
      confirm?: string;
      cancel?: string;
    };
  };

  styles?: {
    anime: string;
    realistic: string;
    cartoon: string;
    fantasy: string;
  };

  aspect_ratios?: {
    [key: string]: string;
  };

  quality_levels?: {
    draft: string;
    standard: string;
    high: string;
  };

  visibility?: {
    public: string;
    private: string;
  };

  character_id?: string;

  character_card?: {
    unnamed_character?: string;
  };

  creations?: {
    title: string;
    all: string;
    images: string;
    videos: string;
    no_creations: string;
    view_more: string;
  };
  gallery?: {
    breakdown_sheet_label?: string;
    breakdown_sheet_hint?: string;
    visual_archives_label?: string;
    rearranging_label?: string;
    add_archive_label?: string;
    add_menu_upload_label?: string;
    add_menu_upload_hint?: string;
    add_menu_from_artworks_label?: string;
    add_menu_from_artworks_hint?: string;
    breakdown_sheet_new_label?: string;
    settings_label?: string;
    exit_settings_label?: string;
    untitled_label?: string;
    preview_title?: string;
    preview_description?: string;
    new_stream_label?: string;
    image_alt?: string;
    preview_alt?: string;
    limit_reached?: string;
    primary_badge?: string;
    primary_badge_tooltip?: string;
    primary_set_label?: string;
    primary_delete_title?: string;
    primary_delete_confirm?: string;
    primary_delete_cancel?: string;
    primary_delete_action?: string;
    upload_type_title?: string;
    upload_type_description?: string;
    upload_type_portrait?: string;
    upload_type_upload?: string;
    upload_type_cancel?: string;
    upload_portrait_label?: string;
    upload_label?: string;
  };

  recommendations?: {
    title?: string;
    from_same_author?: string;
    from_same_theme?: string;
    no_recommendations?: string;
    errors?: {
      fetch_failed?: string;
    };
    defaults?: {
      name?: string;
      empty_description?: string;
    };
  };

  appearance?: {
    outfit_style: string;
    appearance_features: string;
    accessories: string;
    features: string;
    visual_matrix?: string;
    metadata_label?: string;
    custom?: string;
    custom_body_type_placeholder?: string;
    custom_hair_style_placeholder?: string;
  };

  visuals?: {
    labels?: Record<string, string>;
    descriptions?: Record<string, string>;
    examples?: Record<string, string>;
    placeholders?: Record<string, string>;
    status?: Record<string, string>;
    aria?: Record<string, string>;
  };

  background_story?: {
    title?: string;
    no_story?: string;
    placeholder?: string;
    overall_title?: string;
    overall_placeholder?: string;
    events_title?: string;
    events_empty?: string;
    add_event?: string;
    delete_event?: string;
    event_title?: string;
    event_content?: string;
    event_title_placeholder?: string;
    event_content_placeholder?: string;
    event_ai_generate?: string;
    event_image_upload?: string;
    event_image_select?: string;
  };
  event_visual_generation?: {
    title: string;
    description?: string;
    labels: {
      model: string;
      style: string;
      prompt: string;
      quantity: string;
      resolution: string;
      reference: string;
      status: string;
      results: string;
    };
    placeholders: {
      model: string;
      style: string;
      prompt: string;
      resolution: string;
      reference: string;
    };
    actions: {
      submit: string;
      cancel: string;
    };
    status: {
      idle: string;
      submitting: string;
      polling: string;
      completed: string;
      failed: string;
      emptyResults: string;
      loadingOptions: string;
      loadFailed: string;
    };
    errors: {
      missingPrompt: string;
      missingModel: string;
      missingResolution: string;
      missingEventTitle?: string;
      missingEventContent?: string;
      requestFailed: string;
      missingTemplate?: string;
      missingTemplateParams?: string;
    };
  };

  skills?: {
    title?: string;
    stats_title?: string;
    abilities_title?: string;
    add_skill?: string;
    add_stat?: string;
    empty_skills?: string;
    level?: string;
    type?: string;
    description?: string;
    edit_skill?: string;
    delete_skill?: string;
    stat_name?: string;
    stat_value?: string;
    skill_name?: string;
    icon?: string;
  };

  action_bar?: {
    buttons?: {
      done?: string;
      save?: string;
      saving?: string;
      reset?: string;
      delete?: string;
      cancel?: string;
      deleting?: string;
      confirm_delete?: string;
    };
    labels?: {
      basic_info?: string;
      visibility?: string;
      visibility_public_desc?: string;
      visibility_private_desc?: string;
      visibility_pro_hint?: string;
      remix?: string;
      remix_description?: string;
      export?: string;
      share?: string;
      chat?: string;
      like?: string;
      favorite?: string;
      delete?: string;
      name?: string;
      gender?: string;
      species?: string;
      species_custom?: string;
      species_custom_placeholder?: string;
      role?: string;
      age?: string;
      greeting?: string;
      custom?: string;
    };
    gender?: {
      male?: string;
      female?: string;
      other?: string;
    };
    toast?: {
      visibility_public?: string;
      visibility_private?: string;
      remix_enabled?: string;
      remix_disabled?: string;
      deleted?: string;
      saved?: string;
    };
    errors?: {
      operation_failed?: string;
      like_failed?: string;
      favorite_failed?: string;
      visibility_failed?: string;
      remix_failed?: string;
      delete_failed?: string;
      update_failed?: string;
      update_personality_failed?: string;
      update_extended_attributes_failed?: string;
      update_skills_failed?: string;
      update_avatar_failed?: string;
      load_profile_failed?: string;
      upload_failed?: string;
      save_changes_failed?: string;
      profile_required_for_avatar?: string;
      profile_required_for_breakdown_sheet?: string;
      breakdown_sheet_prompt_missing?: string;
      portrait_prompt_missing?: string;
      portrait_prompt_failed?: string;
      visibility_sub_required?: string;
      name_required?: string;
      age_invalid?: string;
    };
    aria?: {
      like?: string;
      unlike?: string;
      favorite?: string;
      unfavorite?: string;
      remix?: string;
    };
    delete_dialog?: {
      title?: string;
      description?: string;
      warning?: string;
    };
  };

  errors?: {
    not_found: string;
    access_denied: string;
    access_denied_title?: string;
    load_failed: string;
    retry: string;
  };

  tags?: {
    title?: string;
    placeholder?: string;
    input_aria?: string;
    helper?: string;
    helper_owner?: string;
    helper_viewer?: string;
    empty_owner?: string;
    empty_viewer?: string;
    max?: string;
    duplicate?: string;
    saving?: string;
    updated?: string;
    error?: string;
    view_more?: string;
    suggestions?: string;
    recommended?: string;
    remove?: string;
  };
  background_controls?: {
    title?: string;
    description?: string;
    theme_tab?: string;
    background_tab?: string;
    color_label?: string;
    image_label?: string;
    ai_gen_label?: string;
    image_placeholder?: string;
    or_generate?: string;
    ai_gen_placeholder?: string;
    generate_button?: string;
    apply_button?: string;
    clear_button?: string;
    saved?: string;
  };
  portrait_generation?: {
    title?: string;
    description?: string;
    appearance_details?: string;
    body_type?: string;
    hair_style?: string;
    hair_color?: string;
    eye_color?: string;
    outfit_style?: string;
    features?: string;
    accessories?: string;
    art_style?: string;
    extra_info?: string;
    extra_info_placeholder?: string;
    generate?: string;
    generate_description?: string;
    generating?: string;
    regenerate?: string;
    start_visual_magic?: string;
    generate_avatar?: string;
    generate_from_fullbody?: string;
    generate_from_fullbody_desc?: string;
    crop_from_fullbody?: string;
    crop_from_fullbody_desc?: string;
    avatar_update_failed?: string;
    or_label?: string;
    crop_cancel?: string;
    crop_save?: string;
    crop_image_alt?: string;
    crop_load_failed?: string;
    crop_still_loading?: string;
    crop_canvas_failed?: string;
    crop_blob_failed?: string;
    crop_upload_failed?: string;
    crop_upload_uuid_required?: string;
    crop_failed?: string;
    avatar_setting_title?: string;
    avatar_setting_description?: string;
    upload_label?: string;
    profile_required_for_avatar?: string;
    update_avatar_label?: string;
    update_avatar_description?: string;
    cost_label?: string;
    cost_with_avatar?: string;
    cost_without_avatar?: string;
  };
  world_selector?: {
    placeholder?: string;
    search?: string;
    presets?: string;
    custom?: string;
    empty?: string;
    description_empty?: string;
    none?: string;
    create?: string;
    updated?: string;
    my_worlds?: string;
    recommended?: string;
  };
  share_card?: {
    title?: string;
    download?: string;
    download_filename?: string;
    download_success?: string;
    copy?: string;
    copied?: string;
    copy_error?: string;
    download_error?: string;
    placeholder?: string;
  };
  create_mode?: {
    title?: string;
    steps?: {
      basic_info?: string;
      visuals?: string;
      personality?: string;
      story?: string;
      skills?: string;
      settings?: string;
    };
    labels?: Record<string, string>;
    placeholders?: Record<string, string>;
    status?: Record<string, string>;
    toasts?: Record<string, string>;
    hints?: Record<string, string>;
    titles?: Record<string, string>;
    overlays?: Record<string, string>;
    buttons?: {
      previous?: string;
      next?: string;
      finish?: string;
      randomize?: string;
      ai_expand?: string;
    };
    visuals?: {
      dice_tooltip?: string;
    };
    story?: {
      ai_expand_tooltip?: string;
    };
    settings?: {
      visibility?: string;
      remix?: string;
      public_desc?: string;
      private_desc?: string;
      remix_desc?: string;
    };
  };
}
