import { Button, Image, Announcement } from "@/types/blocks/base";

export interface Announcement {
  title?: string;
  description?: string;
  label?: string;
  url?: string;
  target?: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  icon: string;
}

export interface FeatureCards {
  text_to_image?: FeatureCard;
  image_editing?: FeatureCard;
  style_conversion?: FeatureCard;
}

export interface Hero {
  name?: string;
  disabled?: boolean;
  announcement?: Announcement;
  title?: string;
  highlight_text?: string;
  description?: string;
  buttons?: Button[];
  image?: Image;
  tip?: string;
  show_happy_users?: boolean;
  show_badge?: boolean;
  feature_cards?: FeatureCards;
}
