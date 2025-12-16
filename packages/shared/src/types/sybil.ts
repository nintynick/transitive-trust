/**
 * Sybil Detection Types
 * Spec Section 10
 */

import type { PrincipalId } from './principal.js';

export interface SybilIndicators {
  clusterCoefficient: number; // Unusually tight clusters (0-1)
  trustReciprocity: number; // Too many mutual edges (0-1)
  edgeCreationVelocity: number; // Rapid trust accumulation
  pathDiversity: number; // Single paths vs. multiple independent paths
  accountAge: number; // Days since account creation
}

export interface SybilRiskAssessment {
  principalId: PrincipalId;
  indicators: SybilIndicators;
  riskScore: number; // 0.0 (low risk) to 1.0 (high risk)
  flags: SybilFlag[];
  assessedAt: Date;
}

export type SybilFlag =
  | 'high_cluster_coefficient'
  | 'high_reciprocity'
  | 'rapid_edge_creation'
  | 'low_path_diversity'
  | 'new_account'
  | 'no_inbound_trust';

/**
 * Vouching Penalty - Applied when someone vouches for a malicious principal
 * Spec Section 10.2.4
 */
export interface VouchingPenalty {
  voucherId: PrincipalId;
  maliciousPrincipalId: PrincipalId;
  severity: number; // 0.0 to 1.0
  penaltyFactor: number; // Multiplier applied to voucher's edges
  appliedAt: Date;
}
