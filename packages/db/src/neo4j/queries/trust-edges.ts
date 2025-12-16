/**
 * Trust Edge operations
 */

import { writeQuery, readQuery, toDate } from '../client.js';
import type {
  TrustEdge,
  DistrustEdge,
  PrincipalId,
  DomainId,
  CreateTrustEdgeInput,
  CreateDistrustEdgeInput,
  Signature,
} from '@ttp/shared';
import { ids } from '@ttp/shared';

export interface TrustEdgeRecord {
  id: string;
  from: string;
  to: string;
  weight: number;
  domain: string;
  createdAt: string;
  expiresAt?: string;
  evidence?: string;
  signature: string;
}

export interface DistrustEdgeRecord {
  id: string;
  from: string;
  to: string;
  domain: string;
  createdAt: string;
  reason: string;
  signature: string;
}

function recordToTrustEdge(record: TrustEdgeRecord): TrustEdge {
  return {
    id: record.id,
    from: record.from,
    to: record.to,
    weight: record.weight,
    domain: record.domain,
    createdAt: toDate(record.createdAt) ?? new Date(),
    expiresAt: record.expiresAt ? toDate(record.expiresAt) ?? undefined : undefined,
    evidence: record.evidence ? JSON.parse(record.evidence) : undefined,
    signature: JSON.parse(record.signature),
  };
}

function recordToDistrustEdge(record: DistrustEdgeRecord): DistrustEdge {
  return {
    id: record.id,
    from: record.from,
    to: record.to,
    domain: record.domain,
    createdAt: toDate(record.createdAt) ?? new Date(),
    reason: record.reason as DistrustEdge['reason'],
    signature: JSON.parse(record.signature),
  };
}

export async function createTrustEdge(
  fromId: PrincipalId,
  input: CreateTrustEdgeInput,
  signature: Signature
): Promise<TrustEdge> {
  const edgeId = ids.trustEdge();
  const now = new Date().toISOString();

  // Delete any existing trust edge between these principals in this domain
  await writeQuery(
    `
    MATCH (from:Principal {id: $fromId})-[r:TRUSTS {domain: $domain}]->(to:Principal {id: $toId})
    DELETE r
    `,
    { fromId, toId: input.to, domain: input.domain }
  );

  const result = await writeQuery<{ e: TrustEdgeRecord }>(
    `
    MATCH (from:Principal {id: $fromId})
    MATCH (to:Principal {id: $toId})
    CREATE (from)-[r:TRUSTS {
      id: $edgeId,
      weight: $weight,
      domain: $domain,
      createdAt: datetime($createdAt),
      ${input.expiresAt ? 'expiresAt: datetime($expiresAt),' : ''}
      evidence: $evidence,
      signature: $signature
    }]->(to)
    RETURN {
      id: r.id,
      from: from.id,
      to: to.id,
      weight: r.weight,
      domain: r.domain,
      createdAt: toString(r.createdAt),
      expiresAt: CASE WHEN r.expiresAt IS NOT NULL THEN toString(r.expiresAt) ELSE null END,
      evidence: r.evidence,
      signature: r.signature
    } AS e
    `,
    {
      fromId,
      toId: input.to,
      edgeId,
      weight: input.weight,
      domain: input.domain,
      createdAt: now,
      expiresAt: input.expiresAt?.toISOString(),
      evidence: input.evidence ? JSON.stringify(input.evidence) : null,
      signature: JSON.stringify(signature),
    }
  );

  if (result.length === 0) {
    throw new Error('Failed to create trust edge');
  }

  return recordToTrustEdge(result[0].e);
}

export async function getTrustEdge(
  fromId: PrincipalId,
  toId: PrincipalId,
  domain: DomainId
): Promise<TrustEdge | null> {
  const result = await readQuery<{ e: TrustEdgeRecord }>(
    `
    MATCH (from:Principal {id: $fromId})-[r:TRUSTS {domain: $domain}]->(to:Principal {id: $toId})
    WHERE r.expiresAt IS NULL OR r.expiresAt > datetime()
    RETURN {
      id: r.id,
      from: from.id,
      to: to.id,
      weight: r.weight,
      domain: r.domain,
      createdAt: toString(r.createdAt),
      expiresAt: CASE WHEN r.expiresAt IS NOT NULL THEN toString(r.expiresAt) ELSE null END,
      evidence: r.evidence,
      signature: r.signature
    } AS e
    `,
    { fromId, toId, domain }
  );

  if (result.length === 0) {
    return null;
  }

  return recordToTrustEdge(result[0].e);
}

export async function getOutgoingTrustEdges(
  principalId: PrincipalId,
  domain?: DomainId
): Promise<TrustEdge[]> {
  const result = await readQuery<{ e: TrustEdgeRecord }>(
    `
    MATCH (from:Principal {id: $principalId})-[r:TRUSTS]->(to:Principal)
    WHERE (r.expiresAt IS NULL OR r.expiresAt > datetime())
      ${domain ? "AND (r.domain = $domain OR r.domain = '*')" : ''}
    RETURN {
      id: r.id,
      from: from.id,
      to: to.id,
      weight: r.weight,
      domain: r.domain,
      createdAt: toString(r.createdAt),
      expiresAt: CASE WHEN r.expiresAt IS NOT NULL THEN toString(r.expiresAt) ELSE null END,
      evidence: r.evidence,
      signature: r.signature
    } AS e
    `,
    { principalId, domain }
  );

  return result.map((r) => recordToTrustEdge(r.e));
}

export async function getIncomingTrustEdges(
  principalId: PrincipalId,
  domain?: DomainId
): Promise<TrustEdge[]> {
  const result = await readQuery<{ e: TrustEdgeRecord }>(
    `
    MATCH (from:Principal)-[r:TRUSTS]->(to:Principal {id: $principalId})
    WHERE (r.expiresAt IS NULL OR r.expiresAt > datetime())
      ${domain ? "AND (r.domain = $domain OR r.domain = '*')" : ''}
    RETURN {
      id: r.id,
      from: from.id,
      to: to.id,
      weight: r.weight,
      domain: r.domain,
      createdAt: toString(r.createdAt),
      expiresAt: CASE WHEN r.expiresAt IS NOT NULL THEN toString(r.expiresAt) ELSE null END,
      evidence: r.evidence,
      signature: r.signature
    } AS e
    `,
    { principalId, domain }
  );

  return result.map((r) => recordToTrustEdge(r.e));
}

export async function revokeTrustEdge(
  fromId: PrincipalId,
  edgeId: string
): Promise<boolean> {
  const result = await writeQuery<{ deleted: number }>(
    `
    MATCH (from:Principal {id: $fromId})-[r:TRUSTS {id: $edgeId}]->()
    DELETE r
    RETURN count(r) AS deleted
    `,
    { fromId, edgeId }
  );

  return result.length > 0 && result[0].deleted > 0;
}

// ============ Distrust Edges ============

export async function createDistrustEdge(
  fromId: PrincipalId,
  input: CreateDistrustEdgeInput,
  signature: Signature
): Promise<DistrustEdge> {
  const edgeId = ids.distrustEdge();
  const now = new Date().toISOString();

  // Delete any existing distrust edge
  await writeQuery(
    `
    MATCH (from:Principal {id: $fromId})-[r:DISTRUSTS {domain: $domain}]->(to:Principal {id: $toId})
    DELETE r
    `,
    { fromId, toId: input.to, domain: input.domain }
  );

  const result = await writeQuery<{ e: DistrustEdgeRecord }>(
    `
    MATCH (from:Principal {id: $fromId})
    MATCH (to:Principal {id: $toId})
    CREATE (from)-[r:DISTRUSTS {
      id: $edgeId,
      domain: $domain,
      createdAt: datetime($createdAt),
      reason: $reason,
      signature: $signature
    }]->(to)
    RETURN {
      id: r.id,
      from: from.id,
      to: to.id,
      domain: r.domain,
      createdAt: toString(r.createdAt),
      reason: r.reason,
      signature: r.signature
    } AS e
    `,
    {
      fromId,
      toId: input.to,
      edgeId,
      domain: input.domain,
      createdAt: now,
      reason: input.reason,
      signature: JSON.stringify(signature),
    }
  );

  if (result.length === 0) {
    throw new Error('Failed to create distrust edge');
  }

  return recordToDistrustEdge(result[0].e);
}

export async function isDistrusted(
  viewerId: PrincipalId,
  targetId: PrincipalId,
  domain: DomainId
): Promise<boolean> {
  const result = await readQuery<{ exists: boolean }>(
    `
    MATCH (viewer:Principal {id: $viewerId})-[r:DISTRUSTS]->(target:Principal {id: $targetId})
    WHERE r.domain = $domain OR r.domain = '*'
    RETURN true AS exists
    LIMIT 1
    `,
    { viewerId, targetId, domain }
  );

  return result.length > 0;
}

export async function revokeDistrustEdge(
  fromId: PrincipalId,
  edgeId: string
): Promise<boolean> {
  const result = await writeQuery<{ deleted: number }>(
    `
    MATCH (from:Principal {id: $fromId})-[r:DISTRUSTS {id: $edgeId}]->()
    DELETE r
    RETURN count(r) AS deleted
    `,
    { fromId, edgeId }
  );

  return result.length > 0 && result[0].deleted > 0;
}

// ============ Trust Network Queries ============

/**
 * Get edges for BFS traversal
 */
export async function getOutgoingEdgesForBFS(
  principalId: PrincipalId,
  domain: DomainId
): Promise<Array<{ targetId: string; weight: number; domain: string }>> {
  const result = await readQuery<{
    targetId: string;
    weight: number;
    domain: string;
  }>(
    `
    MATCH (p:Principal {id: $principalId})-[r:TRUSTS]->(target:Principal)
    WHERE (r.domain = $domain OR r.domain = '*')
      AND (r.expiresAt IS NULL OR r.expiresAt > datetime())
    RETURN target.id AS targetId, r.weight AS weight, r.domain AS domain
    `,
    { principalId, domain }
  );

  return result;
}

/**
 * Get the trust network up to N hops
 */
export async function getTrustNetwork(
  viewerId: PrincipalId,
  options: {
    domain?: DomainId;
    maxHops?: number;
    minTrust?: number;
    limit?: number;
  } = {}
): Promise<{
  nodes: Array<{
    id: string;
    type: string;
    displayName?: string;
    effectiveTrust: number;
    hopDistance: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    weight: number;
    domain: string;
  }>;
}> {
  const { domain = '*', maxHops = 3, minTrust = 0.1, limit = 100 } = options;

  // Get nodes
  const nodesResult = await readQuery<{
    id: string;
    type: string;
    metadata: string;
    effectiveTrust: number;
    hopDistance: number;
  }>(
    `
    MATCH path = (viewer:Principal {id: $viewerId})-[:TRUSTS*1..${maxHops}]->(reached:Principal)
    WHERE ALL(r IN relationships(path) WHERE
      (r.domain = $domain OR r.domain = '*') AND
      (r.expiresAt IS NULL OR r.expiresAt > datetime())
    )
    WITH viewer, reached, path,
         reduce(trust = 1.0, r IN relationships(path) | trust * r.weight) AS pathTrust,
         length(path) AS hops
    WHERE pathTrust >= $minTrust
    RETURN DISTINCT
      reached.id AS id,
      reached.type AS type,
      reached.metadata AS metadata,
      max(pathTrust) AS effectiveTrust,
      min(hops) AS hopDistance
    ORDER BY effectiveTrust DESC
    LIMIT $limit
    `,
    { viewerId, domain, minTrust, limit }
  );

  // Get edges
  const edgesResult = await readQuery<{
    from: string;
    to: string;
    weight: number;
    domain: string;
  }>(
    `
    MATCH (viewer:Principal {id: $viewerId})-[:TRUSTS*0..${maxHops}]->(from:Principal)-[r:TRUSTS]->(to:Principal)
    WHERE (r.domain = $domain OR r.domain = '*')
      AND (r.expiresAt IS NULL OR r.expiresAt > datetime())
    WITH DISTINCT from, to, r
    RETURN
      from.id AS from,
      to.id AS to,
      r.weight AS weight,
      r.domain AS domain
    `,
    { viewerId, domain }
  );

  // Parse display names from metadata
  const nodes = nodesResult.map((n) => {
    let displayName: string | undefined;
    try {
      const metadata = JSON.parse(n.metadata || '{}');
      displayName = metadata.displayName || metadata.name;
    } catch {
      // Ignore parse errors
    }
    return {
      id: n.id,
      type: n.type,
      displayName,
      effectiveTrust: n.effectiveTrust,
      hopDistance: n.hopDistance,
    };
  });

  return { nodes, edges: edgesResult };
}
