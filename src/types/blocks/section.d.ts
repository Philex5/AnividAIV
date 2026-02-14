import { Image, Button } from "@/types/blocks/base";

export interface Media {
  type: "image" | "video" | "before-after";
  src?: string;
  poster?: string;
  before_src?: string;
  after_src?: string;
  alt?: string;
}

export interface SectionItem {
  id?: string;
  title?: string;
  description?: string;
  label?: string;
  icon?: string;
  image?: Image;
  media?: Media;
  buttons?: Button[];
  url?: string;
  target?: string;
  children?: SectionItem[];
}

export interface Section {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  label?: string;
  icon?: string;
  image?: Image;
  buttons?: Button[];
  items?: SectionItem[];
}
