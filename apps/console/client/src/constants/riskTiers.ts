/**
 * Risk Tier Constants
 * 
 * Centralized risk tier configuration matching marketing site colors.
 * Used across Fleet Dashboard, Execution pages, and Policy Builder.
 */

export const RISK_TIER_COLORS = {
  T0: '#10b981', // Green - AUTO_APPROVE
  T1: '#10b981', // Green - POLICY_GATE
  T2: '#fbbf24', // Amber - HUMAN_GATE (highlighted)
  T3: '#ef4444', // Red - STRICT_HALT
} as const;

export const RISK_TIER_LABELS = {
  T0: 'AUTO_APPROVE',
  T1: 'POLICY_GATE',
  T2: 'HUMAN_GATE',
  T3: 'STRICT_HALT',
} as const;

export type RiskTier = keyof typeof RISK_TIER_COLORS;

/**
 * Get the color for a given risk tier
 */
export function getRiskTierColor(tier: RiskTier): string {
  return RISK_TIER_COLORS[tier];
}

/**
 * Get the label for a given risk tier
 */
export function getRiskTierLabel(tier: RiskTier): string {
  return RISK_TIER_LABELS[tier];
}
