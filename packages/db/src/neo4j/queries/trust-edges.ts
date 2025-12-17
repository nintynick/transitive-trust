/**
 * Trust Edge operations
 */

import { writeQuery, readQuery, toDate, toNumber } from '../client.js';
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
  isPending?: boolean;
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
    isPending: record.isPending ?? false,
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
  signature: Signature,
  options?: { isPending?: boolean }
): Promise<TrustEdge> {
  const edgeId = ids.trustEdge();
  const now = new Date().toISOString();
  const isPending = options?.isPending ?? false;

  // Delete any existing trust edge between these principals in this domain
  await writeQuery(
    `
    MATCH (from:Principal {id: $fromId})-[r:TRUSTS {domain: $domain}]->(to:Principal {id: $toId})
    DELETE r
    `,
    { fromId, toId: input.to, domain: input.domain }
  );

  // If pending, create placeholder principal if it doesn't exist
  if (isPending) {
    await writeQuery(
      `
      MERGE (p:Principal {id: $toId})
      ON CREATE SET
        p.type = 'user',
        p.publicKey = '',
        p.createdAt = datetime($createdAt),
        p.metadata = $metadata,
        p.isPending = true
      `,
      {
        toId: input.to,
        createdAt: now,
        metadata: JSON.stringify({ displayName: null, isPending: true }),
      }
    );
  }

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
      signature: $signature,
      isPending: $isPending
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
      signature: r.signature,
      isPending: r.isPending
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
      isPending,
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
      signature: r.signature,
      isPending: COALESCE(r.isPending, false)
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
      signature: r.signature,
      isPending: COALESCE(r.isPending, false)
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
      signature: r.signature,
      isPending: COALESCE(r.isPending, false)
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
    isPending?: boolean;
  }>;
}> {
  const { domain = '*', maxHops = 3, minTrust = 0.1, limit = 100 } = options;

  // Ensure maxHops is an integer for the Cypher query
  const intMaxHops = Math.floor(maxHops);
  const intLimit = Math.floor(limit);

  // Get nodes
  const nodesResult = await readQuery<{
    id: string;
    type: string;
    metadata: string;
    effectiveTrust: number;
    hopDistance: number;
  }>(
    `
    MATCH path = (viewer:Principal {id: $viewerId})-[:TRUSTS*1..${intMaxHops}]->(reached:Principal)
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
    LIMIT toInteger($limit)
    `,
    { viewerId, domain, minTrust, limit: intLimit }
  );

  // Get edges
  const edgesResult = await readQuery<{
    from: string;
    to: string;
    weight: number;
    domain: string;
    isPending: boolean;
  }>(
    `
    MATCH (viewer:Principal {id: $viewerId})-[:TRUSTS*0..${intMaxHops}]->(from:Principal)-[r:TRUSTS]->(to:Principal)
    WHERE (r.domain = $domain OR r.domain = '*')
      AND (r.expiresAt IS NULL OR r.expiresAt > datetime())
    WITH DISTINCT from, to, r
    RETURN
      from.id AS from,
      to.id AS to,
      r.weight AS weight,
      r.domain AS domain,
      COALESCE(r.isPending, false) AS isPending
    `,
    { viewerId, domain }
  );

  // Parse display names from metadata and convert Neo4j integers
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
      effectiveTrust: toNumber(n.effectiveTrust),
      hopDistance: toNumber(n.hopDistance),
    };
  });

  return { nodes, edges: edgesResult };
}

/**
 * Get trust connection info between viewer and a target principal
 */
export async function getTrustConnection(
  viewerId: PrincipalId,
  targetId: PrincipalId,
  options: {
    domain?: DomainId;
    maxHops?: number;
  } = {}
): Promise<{
  connected: boolean;
  effectiveTrust: number;
  hopDistance: number;
  path: Array<{ id: string; displayName?: string }>;
} | null> {
  const { domain = '*', maxHops = 4 } = options;
  const intMaxHops = Math.floor(maxHops);

  // Check if it's the viewer themselves
  if (viewerId === targetId) {
    return {
      connected: true,
      effectiveTrust: 1,
      hopDistance: 0,
      path: [],
    };
  }

  const result = await readQuery<{
    pathTrust: number;
    hops: number;
    pathIds: string[];
    pathMetadata: string[];
  }>(
    `
    MATCH path = shortestPath((viewer:Principal {id: $viewerId})-[:TRUSTS*1..${intMaxHops}]->(target:Principal {id: $targetId}))
    WHERE ALL(r IN relationships(path) WHERE
      (r.domain = $domain OR r.domain = '*') AND
      (r.expiresAt IS NULL OR r.expiresAt > datetime())
    )
    RETURN
      reduce(trust = 1.0, r IN relationships(path) | trust * r.weight) AS pathTrust,
      length(path) AS hops,
      [n IN nodes(path) | n.id] AS pathIds,
      [n IN nodes(path) | n.metadata] AS pathMetadata
    `,
    { viewerId, targetId, domain }
  );

  if (result.length === 0) {
    return null;
  }

  const r = result[0];

  // Parse path nodes (excluding first and last which are viewer and target)
  const pathNodes: Array<{ id: string; displayName?: string }> = [];
  for (let i = 1; i < r.pathIds.length - 1; i++) {
    let displayName: string | undefined;
    try {
      const metadata = JSON.parse(r.pathMetadata[i] || '{}');
      displayName = metadata.displayName || metadata.name;
    } catch {
      // Ignore
    }
    pathNodes.push({ id: r.pathIds[i], displayName });
  }

  return {
    connected: true,
    effectiveTrust: toNumber(r.pathTrust),
    hopDistance: toNumber(r.hops),
    path: pathNodes,
  };
}

/**
 * Get a public snapshot of the trust network (not from any specific viewer's perspective)
 * Used for logged-out users to explore the network
 */
export async function getPublicNetworkSnapshot(
  options: {
    limit?: number;
    includeEndorsements?: boolean;
  } = {}
): Promise<{
  nodes: Array<{
    id: string;
    type: 'principal' | 'subject';
    displayName?: string;
    trustCount: number;
    endorsementCount: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'trust' | 'endorsement';
    weight: number;
    domain: string;
  }>;
  stats: {
    totalPrincipals: number;
    totalEdges: number;
    totalSubjects: number;
    totalEndorsements: number;
  };
}> {
  const { limit = 50, includeEndorsements = true } = options;
  const intLimit = Math.floor(limit);

  // Get network stats
  const statsResult = await readQuery<{
    principals: number;
    edges: number;
    subjects: number;
    endorsements: number;
  }>(
    `
    MATCH (p:Principal)
    WHERE p.isPending IS NULL OR p.isPending = false
    WITH count(p) AS principals
    OPTIONAL MATCH ()-[r:TRUSTS]->()
    WHERE r.expiresAt IS NULL OR r.expiresAt > datetime()
    WITH principals, count(r) AS edges
    OPTIONAL MATCH (s:Subject)
    WITH principals, edges, count(s) AS subjects
    OPTIONAL MATCH (e:Endorsement)
    RETURN principals, edges, subjects, count(e) AS endorsements
    `
  );

  const stats = statsResult[0] || { principals: 0, edges: 0, subjects: 0, endorsements: 0 };

  // Get the most connected principals (by number of trust edges)
  const principalNodes = await readQuery<{
    id: string;
    metadata: string;
    trustCount: number;
    endorsementCount: number;
  }>(
    `
    MATCH (p:Principal)
    WHERE p.isPending IS NULL OR p.isPending = false
    OPTIONAL MATCH (p)-[outgoing:TRUSTS]->()
    WHERE outgoing.expiresAt IS NULL OR outgoing.expiresAt > datetime()
    OPTIONAL MATCH ()-[incoming:TRUSTS]->(p)
    WHERE incoming.expiresAt IS NULL OR incoming.expiresAt > datetime()
    OPTIONAL MATCH (p)-[:AUTHORED]->(e:Endorsement)
    WITH p, count(DISTINCT outgoing) + count(DISTINCT incoming) AS trustCount, count(DISTINCT e) AS endorsementCount
    WHERE trustCount > 0 OR endorsementCount > 0
    RETURN p.id AS id, p.metadata AS metadata, trustCount, endorsementCount
    ORDER BY trustCount DESC, endorsementCount DESC
    LIMIT toInteger($limit)
    `,
    { limit: intLimit }
  );

  // Get trust edges between the top principals
  const principalIds = principalNodes.map((n) => n.id);

  const trustEdges = await readQuery<{
    from: string;
    to: string;
    weight: number;
    domain: string;
  }>(
    `
    MATCH (from:Principal)-[r:TRUSTS]->(to:Principal)
    WHERE from.id IN $principalIds
      AND to.id IN $principalIds
      AND (r.expiresAt IS NULL OR r.expiresAt > datetime())
    RETURN DISTINCT
      from.id AS from,
      to.id AS to,
      r.weight AS weight,
      r.domain AS domain
    `,
    { principalIds }
  );

  // Parse principal nodes
  const nodes: Array<{
    id: string;
    type: 'principal' | 'subject';
    displayName?: string;
    trustCount: number;
    endorsementCount: number;
  }> = principalNodes.map((n) => {
    let displayName: string | undefined;
    try {
      const metadata = JSON.parse(n.metadata || '{}');
      displayName = metadata.displayName || metadata.name;
    } catch {
      // Ignore parse errors
    }
    return {
      id: n.id,
      type: 'principal' as const,
      displayName,
      trustCount: toNumber(n.trustCount),
      endorsementCount: toNumber(n.endorsementCount),
    };
  });

  // Build edges array
  const edges: Array<{
    from: string;
    to: string;
    type: 'trust' | 'endorsement';
    weight: number;
    domain: string;
  }> = trustEdges.map((e) => ({
    from: e.from,
    to: e.to,
    type: 'trust' as const,
    weight: e.weight,
    domain: e.domain,
  }));

  // Get endorsements and subjects if requested
  if (includeEndorsements && principalIds.length > 0) {
    const endorsementData = await readQuery<{
      authorId: string;
      subjectId: string;
      subjectName: string;
      rating: number;
      domain: string;
    }>(
      `
      MATCH (author:Principal)-[:AUTHORED]->(e:Endorsement)-[:ENDORSES]->(subject:Subject)
      MATCH (e)-[:FOR_DOMAIN]->(d:Domain)
      WHERE author.id IN $principalIds
      RETURN DISTINCT
        author.id AS authorId,
        subject.id AS subjectId,
        subject.canonicalName AS subjectName,
        e.ratingScore AS rating,
        d.id AS domain
      LIMIT toInteger($limit)
      `,
      { principalIds, limit: intLimit }
    );

    // Track unique subjects
    const subjectIds = new Set<string>();

    for (const e of endorsementData) {
      // Add subject node if not already added
      if (!subjectIds.has(e.subjectId)) {
        subjectIds.add(e.subjectId);
        nodes.push({
          id: e.subjectId,
          type: 'subject',
          displayName: e.subjectName || undefined,
          trustCount: 0,
          endorsementCount: 0,
        });
      }

      // Add endorsement edge
      edges.push({
        from: e.authorId,
        to: e.subjectId,
        type: 'endorsement',
        weight: toNumber(e.rating),
        domain: e.domain,
      });
    }
  }

  return {
    nodes,
    edges,
    stats: {
      totalPrincipals: toNumber(stats.principals),
      totalEdges: toNumber(stats.edges),
      totalSubjects: toNumber(stats.subjects),
      totalEndorsements: toNumber(stats.endorsements),
    },
  };
}

/**
 * Get the trust network with endorsements and subjects included
 */
export async function getTrustNetworkWithEndorsements(
  viewerId: PrincipalId,
  options: {
    domain?: DomainId;
    maxHops?: number;
    minTrust?: number;
    limit?: number;
    includeEndorsements?: boolean;
  } = {}
): Promise<{
  nodes: Array<{
    id: string;
    type: 'principal' | 'subject';
    displayName?: string;
    effectiveTrust: number;
    hopDistance: number;
    // For subjects
    subjectMetadata?: {
      name?: string;
      description?: string;
    };
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'trust' | 'endorsement';
    weight: number;
    domain: string;
    // For endorsements
    rating?: number;
    summary?: string;
    // For pending trust
    isPending?: boolean;
  }>;
}> {
  const { domain = '*', maxHops = 3, minTrust = 0.1, limit = 100, includeEndorsements = true } = options;

  const intMaxHops = Math.floor(maxHops);
  const intLimit = Math.floor(limit);

  // Get principal nodes (same as getTrustNetwork)
  const principalNodes = await readQuery<{
    id: string;
    metadata: string;
    effectiveTrust: number;
    hopDistance: number;
  }>(
    `
    MATCH path = (viewer:Principal {id: $viewerId})-[:TRUSTS*1..${intMaxHops}]->(reached:Principal)
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
      reached.metadata AS metadata,
      max(pathTrust) AS effectiveTrust,
      min(hops) AS hopDistance
    ORDER BY effectiveTrust DESC
    LIMIT toInteger($limit)
    `,
    { viewerId, domain, minTrust, limit: intLimit }
  );

  // Get trust edges (same as getTrustNetwork)
  const trustEdges = await readQuery<{
    from: string;
    to: string;
    weight: number;
    domain: string;
    isPending: boolean;
  }>(
    `
    MATCH (viewer:Principal {id: $viewerId})-[:TRUSTS*0..${intMaxHops}]->(from:Principal)-[r:TRUSTS]->(to:Principal)
    WHERE (r.domain = $domain OR r.domain = '*')
      AND (r.expiresAt IS NULL OR r.expiresAt > datetime())
    WITH DISTINCT from, to, r
    RETURN
      from.id AS from,
      to.id AS to,
      r.weight AS weight,
      r.domain AS domain,
      COALESCE(r.isPending, false) AS isPending
    `,
    { viewerId, domain }
  );

  // Parse principal nodes
  const nodes: Array<{
    id: string;
    type: 'principal' | 'subject';
    displayName?: string;
    effectiveTrust: number;
    hopDistance: number;
    subjectMetadata?: { name?: string; description?: string };
  }> = principalNodes.map((n) => {
    let displayName: string | undefined;
    try {
      const metadata = JSON.parse(n.metadata || '{}');
      displayName = metadata.displayName || metadata.name;
    } catch {
      // Ignore parse errors
    }
    return {
      id: n.id,
      type: 'principal' as const,
      displayName,
      effectiveTrust: toNumber(n.effectiveTrust),
      hopDistance: toNumber(n.hopDistance),
    };
  });

  // Build edges array
  const edges: Array<{
    from: string;
    to: string;
    type: 'trust' | 'endorsement';
    weight: number;
    domain: string;
    rating?: number;
    summary?: string;
    isPending?: boolean;
  }> = trustEdges.map((e) => ({
    from: e.from,
    to: e.to,
    type: 'trust' as const,
    weight: e.weight,
    domain: e.domain,
    isPending: e.isPending,
  }));

  // Get endorsements and subjects if requested
  if (includeEndorsements) {
    // Get all principal IDs in the network (including viewer)
    const networkPrincipalIds = [viewerId, ...nodes.map((n) => n.id)];

    // Get subjects and endorsements from network principals
    const endorsementData = await readQuery<{
      authorId: string;
      subjectId: string;
      subjectName: string;
      subjectDescription: string;
      rating: number;
      summary: string;
      domain: string;
    }>(
      `
      MATCH (author:Principal)-[:AUTHORED]->(e:Endorsement)-[:ENDORSES]->(subject:Subject)
      MATCH (e)-[:FOR_DOMAIN]->(d:Domain)
      WHERE author.id IN $principalIds
      RETURN DISTINCT
        author.id AS authorId,
        subject.id AS subjectId,
        subject.canonicalName AS subjectName,
        subject.metadata AS subjectDescription,
        e.ratingScore AS rating,
        e.summary AS summary,
        d.id AS domain
      LIMIT toInteger($limit)
      `,
      { principalIds: networkPrincipalIds, limit: intLimit * 2 }
    );

    // Track unique subjects
    const subjectIds = new Set<string>();

    for (const e of endorsementData) {
      // Add subject node if not already added
      if (!subjectIds.has(e.subjectId)) {
        subjectIds.add(e.subjectId);
        // Parse metadata JSON for description if available
        let description: string | undefined;
        try {
          if (e.subjectDescription) {
            const metadata = JSON.parse(e.subjectDescription);
            description = metadata.description;
          }
        } catch {
          // Ignore parse errors
        }
        nodes.push({
          id: e.subjectId,
          type: 'subject',
          displayName: e.subjectName || undefined,
          effectiveTrust: 0,
          hopDistance: -1, // Subjects don't have hop distance
          subjectMetadata: {
            name: e.subjectName || undefined,
            description,
          },
        });
      }

      // Add endorsement edge
      edges.push({
        from: e.authorId,
        to: e.subjectId,
        type: 'endorsement',
        weight: toNumber(e.rating),
        domain: e.domain,
        rating: toNumber(e.rating),
        summary: e.summary || undefined,
      });
    }
  }

  return { nodes, edges };
}
