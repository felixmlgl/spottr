/**
 * Business model shown in the gym demo. Keep in sync with the pitch deck.
 * The price is a target that hasn't been tested with paying customers yet; the UI says so wherever it appears.
 */

export const PRICE_PER_LOCATION_MONTH = 1500;

/** Example monthly dues for the break-even card; visitors pick the one closest to their gym. */
export const DUES_OPTIONS = [40, 60, 80, 100] as const;
export const DEFAULT_DUES = 60;

/** Members who must stay (instead of cancelling) each month for Spottr to cover its own price at one location. */
export const breakEvenMembers = (monthlyDues: number) => Math.ceil(PRICE_PER_LOCATION_MONTH / monthlyDues);

export const formatUsd = (v: number) => `$${v.toLocaleString('en-US')}`;
