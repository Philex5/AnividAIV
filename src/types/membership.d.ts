export type MembershipLevel = 'free' | 'basic' | 'plus' | 'pro';

export type BillingCycle = 'monthly' | 'yearly';

export interface MembershipConfig {
  level: MembershipLevel;
  display_name: string;
  monthly_credits: number;
  yearly_credits: number;
  price_monthly_usd: number;
  price_yearly_usd: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  features: string[];
}

export interface MCPack {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  stripe_price_id: string;
}

export interface MembershipStatus {
  level: MembershipLevel;
  display_name: string;
  monthly_credits: number;
  yearly_credits: number;
  billing_cycle?: BillingCycle;
  features: string[];
  expired_at: string | null;
  is_active: boolean;
}
