/**
 * Business model shown on the landing page, in the gym demo and in the request-a-demo popup. Keep in sync with the
 * pitch deck (Option B of the pricing case). The prices are a hypothesis that hasn't been tested with paying gyms yet;
 * the UI says so wherever they appear.
 */

export type TierId = 'rack' | 'floor' | 'hall' | 'arena';

export interface Tier {
  id: TierId;
  name: string;
  /** Active members per location, the way a gym owner would say it */
  members: string;
  /** Lower end of the member band, to place a location in its tier */
  minMembers: number;
  /** Per location per month: annual contract, Spottr boxes and install included */
  price: number;
  cameras: number;
  /** Typical monthly dues at this size, the basis of the break-even */
  dues: number;
}

export const TIERS: Tier[] = [
  { id: 'rack', name: 'Rack', members: 'Under 500', minMembers: 0, price: 399, cameras: 3, dues: 80 },
  { id: 'floor', name: 'Floor', members: '500–1,500', minMembers: 500, price: 799, cameras: 6, dues: 60 },
  { id: 'hall', name: 'Hall', members: '1,500–5,000', minMembers: 1500, price: 1499, cameras: 12, dues: 45 },
  { id: 'arena', name: 'Arena', members: '5,000+', minMembers: 5000, price: 2999, cameras: 24, dues: 30 },
];

export const DEFAULT_TIER: TierId = 'floor';

/** Monthly price of one more Spottr box, for gyms with more cameras than their tier includes */
export const EXTRA_BOX_MONTH = 149;

/** Chain discounts by number of locations */
export const CHAIN_DISCOUNTS = [
  { from: 5, off: 0.1 },
  { from: 20, off: 0.15 },
] as const;

export const tierById = (id: TierId) => TIERS.find((t) => t.id === id) ?? TIERS[0];

export const tierForMembers = (members: number) => TIERS.filter((t) => members >= t.minMembers).at(-1) ?? TIERS[0];

/** Members who must stay (instead of cancelling) each month for Spottr to cover its own price at one location. */
export const breakEvenMembers = (tier: Tier) => Math.ceil(tier.price / tier.dues);

export const formatUsd = (v: number) => `$${v.toLocaleString('en-US')}`;
