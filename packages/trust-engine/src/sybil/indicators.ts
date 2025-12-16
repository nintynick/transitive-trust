/**
 * Sybil Detection Indicators
 * Spec Section 10
 */

import type {
  PrincipalId,
  SybilIndicators,
  SybilRiskAssessment,
  SybilFlag,
} from '@ttp/shared';
import { DEFAULTS } from '@ttp/shared';

export interface SybilAnalysisInput {
  principalId: PrincipalId;
  createdAt: Date;
  outgoingEdges: Array<{ to: PrincipalId; weight: number; createdAt: Date }>;
  incomingEdges: Array<{ from: PrincipalId; weight: number }>;
  neighbors: PrincipalId[];
  neighborConnections: Array<{ from: PrincipalId; to: PrincipalId }>;
}

/**
 * Compute cluster coefficient - how interconnected are a principal's neighbors
 */
export function computeClusterCoefficient(
  neighbors: PrincipalId[],
  neighborConnections: Array<{ from: PrincipalId; to: PrincipalId }>
): number {
  const k = neighbors.length;

  if (k < 2) {
    return 0; // Can't compute cluster coefficient with fewer than 2 neighbors
  }

  // Count actual edges between neighbors
  const neighborSet = new Set(neighbors);
  let actualEdges = 0;

  for (const conn of neighborConnections) {
    if (neighborSet.has(conn.from) && neighborSet.has(conn.to)) {
      actualEdges++;
    }
  }

  // Maximum possible edges between k nodes = k * (k-1) / 2 (undirected)
  // For directed graph: k * (k-1)
  const maxEdges = k * (k - 1);

  return maxEdges > 0 ? actualEdges / maxEdges : 0;
}

/**
 * Compute trust reciprocity - what fraction of outgoing edges are reciprocated
 */
export function computeTrustReciprocity(
  outgoingEdges: Array<{ to: PrincipalId }>,
  incomingEdges: Array<{ from: PrincipalId }>
): number {
  if (outgoingEdges.length === 0) {
    return 0;
  }

  const incomingFrom = new Set(incomingEdges.map((e) => e.from));
  let reciprocated = 0;

  for (const edge of outgoingEdges) {
    if (incomingFrom.has(edge.to)) {
      reciprocated++;
    }
  }

  return reciprocated / outgoingEdges.length;
}

/**
 * Compute edge creation velocity - edges created in recent time period
 */
export function computeEdgeCreationVelocity(
  edges: Array<{ createdAt: Date }>,
  windowDays: number = DEFAULTS.SYBIL.RAPID_EDGE_CREATION_DAYS
): number {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - windowMs;

  return edges.filter((e) => new Date(e.createdAt).getTime() > cutoff).length;
}

/**
 * Compute all Sybil indicators for a principal
 */
export function computeSybilIndicators(input: SybilAnalysisInput): SybilIndicators {
  const clusterCoefficient = computeClusterCoefficient(
    input.neighbors,
    input.neighborConnections
  );

  const trustReciprocity = computeTrustReciprocity(
    input.outgoingEdges,
    input.incomingEdges
  );

  const edgeCreationVelocity = computeEdgeCreationVelocity(input.outgoingEdges);

  // Path diversity approximation - use number of independent incoming edges
  const pathDiversity = input.incomingEdges.length;

  // Account age in days
  const accountAge = Math.floor(
    (Date.now() - new Date(input.createdAt).getTime()) / (24 * 60 * 60 * 1000)
  );

  return {
    clusterCoefficient,
    trustReciprocity,
    edgeCreationVelocity,
    pathDiversity,
    accountAge,
  };
}

/**
 * Identify Sybil flags based on indicators
 */
export function identifySybilFlags(indicators: SybilIndicators): SybilFlag[] {
  const flags: SybilFlag[] = [];

  if (indicators.clusterCoefficient > DEFAULTS.SYBIL.HIGH_CLUSTER_COEFFICIENT_THRESHOLD) {
    flags.push('high_cluster_coefficient');
  }

  if (indicators.trustReciprocity > DEFAULTS.SYBIL.HIGH_RECIPROCITY_THRESHOLD) {
    flags.push('high_reciprocity');
  }

  if (indicators.edgeCreationVelocity > DEFAULTS.SYBIL.RAPID_EDGE_CREATION_COUNT) {
    flags.push('rapid_edge_creation');
  }

  if (indicators.pathDiversity < 2) {
    flags.push('low_path_diversity');
  }

  if (indicators.accountAge < DEFAULTS.SYBIL.NEW_ACCOUNT_DAYS) {
    flags.push('new_account');
  }

  if (indicators.pathDiversity === 0) {
    flags.push('no_inbound_trust');
  }

  return flags;
}

/**
 * Compute overall Sybil risk score
 */
export function computeSybilRiskScore(indicators: SybilIndicators): number {
  // Weight each indicator
  const weights = {
    clusterCoefficient: 0.25,
    trustReciprocity: 0.2,
    edgeCreationVelocity: 0.2,
    pathDiversity: 0.15,
    accountAge: 0.2,
  };

  // Normalize indicators to 0-1 risk scores
  const scores = {
    clusterCoefficient: Math.min(
      1,
      indicators.clusterCoefficient / DEFAULTS.SYBIL.HIGH_CLUSTER_COEFFICIENT_THRESHOLD
    ),
    trustReciprocity: Math.min(
      1,
      indicators.trustReciprocity / DEFAULTS.SYBIL.HIGH_RECIPROCITY_THRESHOLD
    ),
    edgeCreationVelocity: Math.min(
      1,
      indicators.edgeCreationVelocity / (DEFAULTS.SYBIL.RAPID_EDGE_CREATION_COUNT * 2)
    ),
    // Low path diversity is risky
    pathDiversity: indicators.pathDiversity > 0 ? Math.max(0, 1 - indicators.pathDiversity / 10) : 1,
    // New accounts are riskier
    accountAge: Math.max(0, 1 - indicators.accountAge / (DEFAULTS.SYBIL.NEW_ACCOUNT_DAYS * 2)),
  };

  // Weighted sum
  return (
    scores.clusterCoefficient * weights.clusterCoefficient +
    scores.trustReciprocity * weights.trustReciprocity +
    scores.edgeCreationVelocity * weights.edgeCreationVelocity +
    scores.pathDiversity * weights.pathDiversity +
    scores.accountAge * weights.accountAge
  );
}

/**
 * Full Sybil risk assessment
 */
export function assessSybilRisk(input: SybilAnalysisInput): SybilRiskAssessment {
  const indicators = computeSybilIndicators(input);
  const flags = identifySybilFlags(indicators);
  const riskScore = computeSybilRiskScore(indicators);

  return {
    principalId: input.principalId,
    indicators,
    riskScore,
    flags,
    assessedAt: new Date(),
  };
}
