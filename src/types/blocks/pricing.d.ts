import { Button } from "@/types/blocks/base/button";

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  is_featured?: boolean;
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;
  price?: string;
  original_price?: string;
  price_per_month?: string;
  currency?: string;
  unit?: string;
  features_title?: string;
  features?: string[];
  button?: Button;
  tip?: string;
  is_featured?: boolean;
  interval: "month" | "year" | "one-time";
  product_id: string;
  product_name?: string;
  amount: number;
  cn_amount?: number;
  currency: string;
  credits?: number;
  credits_text?: string;
  valid_months?: number;
  group?: string;
  mc_rate?: number; // MC rate per MC (e.g. 0.006 for Basic, 0.005 for Plus, 0.004 for Pro)
  // Custom PAYG (pay-as-you-go) support
  is_custom?: boolean;
  custom_input_label?: string;
  custom_placeholder?: string;
  custom_unit?: string; // e.g. "MC"
  custom_price_prefix?: string; // e.g. "$"
  custom_price_suffix?: string; // e.g. ""
  custom_rate?: number; // price per unit in USD (e.g. 0.05 per MC)
}

export interface FeatureComparisonRow {
  feature: string;
  free: string;
  basic: string;
  plus: string;
  pro: string;
}

export interface FeatureComparison {
  title?: string;
  subtitle?: string;
  headers?: string[];
  rows?: FeatureComparisonRow[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQ {
  title?: string;
  items?: FAQItem[];
}

export interface Pricing {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  items?: PricingItem[];
  groups?: PricingGroup[];
  // MC Packs Section
  mc_packs_section?: {
    title?: string;
    subtitle?: string;
    note?: string;
  };
  mc_payg?: {
    title?: string;
    description?: string;
  };
  mc_fixed?: {
    title?: string;
    description?: string;
  };
  // Credits Display i18n
  credits_display?: {
    for_new_user?: string;
    includes?: string;
    per_month?: string;
    total?: string;
    per_year?: string;
    monthly_valid?: string;
    monthly_chat_messages?: string;
    billed_annually?: string;
    current_plan?: string;
    included?: string;
    mc_rate?: string;
  };
  mc_payg_items?: PricingItem[];
  mc_fixed_items?: PricingItem[];
  // Feature Comparison Section
  features_comparison?: FeatureComparison;
  // FAQ Section
  faq?: FAQ;
}
