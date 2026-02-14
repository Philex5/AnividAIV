export type CreditWindow = 'all' | '30d' | '7d';
export type CreditType = 'all' | 'in' | 'out';

export interface CreditSummaryParams {
  userUuid: string;
  window?: CreditWindow;
  type?: CreditType;
}

export interface CreditSummary {
  balance: number;
  totalEarned: number;
  totalUsed: number;
  expiringCredits: number;
  expiringAt?: string; // ISO string for next expiration
  lastEventAt?: string; // ISO string for last activity
  window: CreditWindow;
  type: CreditType;
}

export interface CreditTimelineParams {
  userUuid: string;
  window?: CreditWindow;
  type?: CreditType;
  limit?: number;
  page?: number;
}

export interface ExpiringCredits {
  amount: number;
  expiresAt?: string; // ISO string for next expiration
}

export interface CreditTimelineItem {
  id: number;
  transNo: string;
  amount: number; // positive=in, negative=out
  transType: string;
  orderNo?: string;
  expiresAt?: string; // ISO
  createdAt: string; // ISO
  activedAt: string; // ISO - when the credit becomes active (for yearly subscriptions)
}

