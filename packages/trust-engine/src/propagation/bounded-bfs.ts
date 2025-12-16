/**
 * Bounded BFS Trust Propagation Algorithm
 * Spec Section 6.1
 */

import type {
  PrincipalId,
  DomainId,
  QueryOptions,
  EffectiveTrustResult,
  DecayFunction,
  AggregationStrategy,
} from '@ttp/shared';
import { getDecayFunction, DEFAULTS, getDomainAncestors } from '@ttp/shared';

export interface TrustEdgeData {
  targetId: PrincipalId;
  weight: number;
  domain: DomainId;
}

export interface BFSConfig {
  maxHops: number;
  decayFunction: DecayFunction;
  decayParameter: number;
  aggregation: AggregationStrategy;
  minThreshold: number;
}

export interface PathInfo {
  trust: number;
  paths: string[][];
}

/**
 * Get effective domain weight based on domain hierarchy
 * Spec Section 5.5
 */
export function getDomainWeight(
  declaredDomain: DomainId,
  queriedDomain: DomainId
): number {
  if (declaredDomain === queriedDomain) {
    return 1.0;
  }

  if (declaredDomain === '*') {
    return 1.0; // Wildcard applies to all domains
  }

  // Check if declared domain is an ancestor of queried domain
  const ancestors = getDomainAncestors(queriedDomain);
  const ancestorIndex = ancestors.indexOf(declaredDomain);

  if (ancestorIndex >= 0) {
    // Apply domain distance decay (0.9^depth)
    return Math.pow(DEFAULTS.DOMAIN_DISTANCE_DECAY, ancestorIndex + 1);
  }

  return 0.0; // No hierarchical relationship
}

/**
 * Aggregate path information based on strategy
 */
function aggregatePaths(
  existing: PathInfo | undefined,
  newPath: PathInfo,
  strategy: AggregationStrategy
): PathInfo {
  if (!existing) {
    return newPath;
  }

  switch (strategy) {
    case 'maximum':
      // Keep the path with highest trust
      if (newPath.trust > existing.trust) {
        return {
          trust: newPath.trust,
          paths: [...existing.paths, ...newPath.paths],
        };
      }
      return {
        trust: existing.trust,
        paths: [...existing.paths, ...newPath.paths],
      };

    case 'probabilistic':
      // Probabilistic union: 1 - (1-a)(1-b)
      const combinedTrust = 1 - (1 - existing.trust) * (1 - newPath.trust);
      return {
        trust: combinedTrust,
        paths: [...existing.paths, ...newPath.paths],
      };

    case 'sum':
      // Sum (capped at 1.0)
      return {
        trust: Math.min(1.0, existing.trust + newPath.trust),
        paths: [...existing.paths, ...newPath.paths],
      };

    default:
      return existing;
  }
}

/**
 * Check if we should update the visited entry
 */
function shouldUpdate(
  existingTrust: number,
  newTrust: number,
  strategy: AggregationStrategy
): boolean {
  switch (strategy) {
    case 'maximum':
      return newTrust > existingTrust;
    case 'probabilistic':
    case 'sum':
      // Always update for accumulating strategies
      return true;
    default:
      return newTrust > existingTrust;
  }
}

/**
 * Compute effective trust between viewer and target using bounded BFS
 */
export async function computeEffectiveTrust(
  viewerId: PrincipalId,
  targetId: PrincipalId,
  domain: DomainId,
  options: Partial<QueryOptions>,
  getOutgoingEdges: (
    nodeId: PrincipalId,
    domain: DomainId
  ) => Promise<TrustEdgeData[]>,
  isDistrusted: (
    viewerId: PrincipalId,
    nodeId: PrincipalId,
    domain: DomainId
  ) => Promise<boolean>
): Promise<EffectiveTrustResult> {
  // Self-trust is always 1.0
  if (viewerId === targetId) {
    return { trust: 1.0, paths: [[viewerId]], hops: 0 };
  }

  const config: BFSConfig = {
    maxHops: options.maxHops ?? DEFAULTS.MAX_HOPS,
    decayFunction: options.decayFunction ?? 'exponential',
    decayParameter: options.decayParameter ?? DEFAULTS.EXPONENTIAL_DECAY_FACTOR,
    aggregation: options.aggregation ?? 'maximum',
    minThreshold: options.minTrustThreshold ?? DEFAULTS.MIN_TRUST_THRESHOLD,
  };

  const decayFn = getDecayFunction(config.decayFunction, config.decayParameter);

  // Track visited nodes with their trust values and paths
  const visited = new Map<PrincipalId, PathInfo>();
  visited.set(viewerId, { trust: 1.0, paths: [[viewerId]] });

  // BFS queue: [nodeId, currentTrust, hops, path]
  const queue: Array<{
    nodeId: PrincipalId;
    currentTrust: number;
    hops: number;
    path: PrincipalId[];
  }> = [{ nodeId: viewerId, currentTrust: 1.0, hops: 0, path: [viewerId] }];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    const { nodeId, currentTrust, hops, path } = item;

    // Stop if we've reached max hops
    if (hops >= config.maxHops) {
      continue;
    }

    // Get outgoing trust edges
    const edges = await getOutgoingEdges(nodeId, domain);

    for (const edge of edges) {
      // Skip distrusted nodes
      if (await isDistrusted(viewerId, edge.targetId, domain)) {
        continue;
      }

      // Calculate domain weight
      const domainWeight = getDomainWeight(edge.domain, domain);
      if (domainWeight === 0) {
        continue;
      }

      // Calculate path trust with decay
      const edgeTrust = edge.weight * domainWeight;
      const pathTrust = currentTrust * edgeTrust * decayFn(hops + 1);

      // Skip if below threshold
      if (pathTrust < config.minThreshold) {
        continue;
      }

      const newPath = [...path, edge.targetId];
      const existing = visited.get(edge.targetId);

      // Update if needed based on aggregation strategy
      if (!existing || shouldUpdate(existing.trust, pathTrust, config.aggregation)) {
        const newInfo = aggregatePaths(
          existing,
          { trust: pathTrust, paths: [newPath] },
          config.aggregation
        );
        visited.set(edge.targetId, newInfo);

        // Add to queue for further exploration
        queue.push({
          nodeId: edge.targetId,
          currentTrust: pathTrust,
          hops: hops + 1,
          path: newPath,
        });
      }
    }
  }

  // Get result for target
  const result = visited.get(targetId);

  if (!result) {
    return { trust: 0.0, paths: [], hops: -1 };
  }

  // Calculate minimum hop distance
  const minHops = Math.min(...result.paths.map((p) => p.length - 1));

  return {
    trust: result.trust,
    paths: result.paths,
    hops: minHops,
  };
}

/**
 * Compute trust to all reachable principals (for batch operations)
 */
export async function computeTrustNeighborhood(
  viewerId: PrincipalId,
  domain: DomainId,
  options: Partial<QueryOptions>,
  getOutgoingEdges: (
    nodeId: PrincipalId,
    domain: DomainId
  ) => Promise<TrustEdgeData[]>,
  isDistrusted: (
    viewerId: PrincipalId,
    nodeId: PrincipalId,
    domain: DomainId
  ) => Promise<boolean>
): Promise<Map<PrincipalId, PathInfo>> {
  const config: BFSConfig = {
    maxHops: options.maxHops ?? DEFAULTS.MAX_HOPS,
    decayFunction: options.decayFunction ?? 'exponential',
    decayParameter: options.decayParameter ?? DEFAULTS.EXPONENTIAL_DECAY_FACTOR,
    aggregation: options.aggregation ?? 'maximum',
    minThreshold: options.minTrustThreshold ?? DEFAULTS.MIN_TRUST_THRESHOLD,
  };

  const decayFn = getDecayFunction(config.decayFunction, config.decayParameter);

  const visited = new Map<PrincipalId, PathInfo>();
  visited.set(viewerId, { trust: 1.0, paths: [[viewerId]] });

  const queue: Array<{
    nodeId: PrincipalId;
    currentTrust: number;
    hops: number;
    path: PrincipalId[];
  }> = [{ nodeId: viewerId, currentTrust: 1.0, hops: 0, path: [viewerId] }];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    const { nodeId, currentTrust, hops, path } = item;

    if (hops >= config.maxHops) {
      continue;
    }

    const edges = await getOutgoingEdges(nodeId, domain);

    for (const edge of edges) {
      if (await isDistrusted(viewerId, edge.targetId, domain)) {
        continue;
      }

      const domainWeight = getDomainWeight(edge.domain, domain);
      if (domainWeight === 0) continue;

      const edgeTrust = edge.weight * domainWeight;
      const pathTrust = currentTrust * edgeTrust * decayFn(hops + 1);

      if (pathTrust < config.minThreshold) continue;

      const newPath = [...path, edge.targetId];
      const existing = visited.get(edge.targetId);

      if (!existing || shouldUpdate(existing.trust, pathTrust, config.aggregation)) {
        const newInfo = aggregatePaths(
          existing,
          { trust: pathTrust, paths: [newPath] },
          config.aggregation
        );
        visited.set(edge.targetId, newInfo);

        queue.push({
          nodeId: edge.targetId,
          currentTrust: pathTrust,
          hops: hops + 1,
          path: newPath,
        });
      }
    }
  }

  return visited;
}
