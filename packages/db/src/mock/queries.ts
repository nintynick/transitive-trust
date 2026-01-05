/**
 * Mock query implementations
 * These replace Neo4j queries with in-memory mock data
 */

import type {
  Principal,
  PrincipalId,
  CreatePrincipalInput,
  TrustEdge,
  CreateTrustEdgeInput,
  DistrustEdge,
  CreateDistrustEdgeInput,
  Subject,
  SubjectId,
  CreateSubjectInput,
  Endorsement,
  CreateEndorsementInput,
  Signature,
} from '@ttp/shared';

import {
  mockPrincipals,
  mockTrustEdges,
  mockSubjects,
  mockEndorsements,
} from './data.js';

// In-memory stores (copies of mock data that can be mutated)
const principals = new Map<string, Principal>(
  mockPrincipals.map((p) => [p.id, { ...p }])
);
const trustEdges = new Map<string, TrustEdge>(
  mockTrustEdges.map((e) => [e.id, { ...e }])
);
const distrustEdges = new Map<string, DistrustEdge>();
const subjects = new Map<string, Subject>(
  mockSubjects.map((s) => [s.id, { ...s }])
);
const endorsements = new Map<string, Endorsement>(
  mockEndorsements.map((e) => [e.id, { ...e }])
);

// Helper for mock signatures
const mockSignature: Signature = {
  algorithm: 'secp256k1',
  publicKey: 'mock-public-key',
  signature: 'mock-signature',
  signedAt: new Date().toISOString(),
};

let idCounter = 1000;
const generateId = (prefix: string) => `${prefix}-${++idCounter}`;

// ============ PRINCIPALS ============

export async function createPrincipal(
  input: CreatePrincipalInput
): Promise<Principal> {
  const principal: Principal = {
    id: input.publicKey,
    type: input.type,
    publicKey: input.publicKey,
    createdAt: new Date(),
    metadata: input.metadata ?? {},
  };
  principals.set(principal.id, principal);
  return principal;
}

export async function getOrCreatePrincipal(
  walletAddress: string
): Promise<Principal> {
  let principal = principals.get(walletAddress);
  if (!principal) {
    principal = await createPrincipal({
      type: 'user',
      publicKey: walletAddress,
      metadata: {},
    });
  }
  return principal;
}

export async function getPrincipalById(
  id: PrincipalId
): Promise<Principal | null> {
  return principals.get(id) ?? null;
}

export async function getPrincipalByPublicKey(
  publicKey: string
): Promise<Principal | null> {
  for (const p of principals.values()) {
    if (p.publicKey === publicKey) return p;
  }
  return null;
}

export async function updatePrincipalMetadata(
  id: PrincipalId,
  metadata: Record<string, string>
): Promise<Principal | null> {
  const principal = principals.get(id);
  if (!principal) return null;
  principal.metadata = metadata;
  return principal;
}

export async function deletePrincipal(id: PrincipalId): Promise<boolean> {
  return principals.delete(id);
}

export async function listPrincipals(
  limit: number = 20,
  offset: number = 0
): Promise<Principal[]> {
  const all = Array.from(principals.values());
  return all.slice(offset, offset + limit);
}

// ============ TRUST EDGES ============

export async function createTrustEdge(
  fromId: PrincipalId,
  input: CreateTrustEdgeInput,
  signature: Signature,
  options?: { isPending?: boolean }
): Promise<TrustEdge> {
  const edge: TrustEdge = {
    id: generateId('edge'),
    from: fromId,
    to: input.to,
    weight: input.weight,
    domain: input.domain,
    createdAt: new Date(),
    expiresAt: input.expiresAt,
    evidence: input.evidence,
    signature: signature,
    isPending: options?.isPending ?? !principals.has(input.to),
  };
  trustEdges.set(edge.id, edge);
  return edge;
}

export async function getTrustEdge(
  fromId: PrincipalId,
  toId: PrincipalId,
  domain: string
): Promise<TrustEdge | null> {
  for (const edge of trustEdges.values()) {
    if (edge.from === fromId && edge.to === toId && edge.domain === domain) {
      return edge;
    }
  }
  return null;
}

export async function getOutgoingTrustEdges(
  fromId: PrincipalId,
  domain?: string
): Promise<TrustEdge[]> {
  const edges: TrustEdge[] = [];
  for (const edge of trustEdges.values()) {
    if (edge.from === fromId) {
      if (!domain || domain === '*' || edge.domain === domain || edge.domain === '*') {
        edges.push(edge);
      }
    }
  }
  return edges;
}

export async function getIncomingTrustEdges(
  toId: PrincipalId,
  domain?: string
): Promise<TrustEdge[]> {
  const edges: TrustEdge[] = [];
  for (const edge of trustEdges.values()) {
    if (edge.to === toId) {
      if (!domain || domain === '*' || edge.domain === domain || edge.domain === '*') {
        edges.push(edge);
      }
    }
  }
  return edges;
}

export async function revokeTrustEdge(
  edgeId: string,
  _fromId: PrincipalId
): Promise<{ success: boolean }> {
  const deleted = trustEdges.delete(edgeId);
  return { success: deleted };
}

export async function createDistrustEdge(
  fromId: PrincipalId,
  input: CreateDistrustEdgeInput
): Promise<DistrustEdge> {
  const edge: DistrustEdge = {
    id: generateId('distrust'),
    from: fromId,
    to: input.to,
    domain: input.domain,
    createdAt: new Date(),
    reason: input.reason,
    signature: mockSignature,
  };
  distrustEdges.set(edge.id, edge);
  return edge;
}

export async function isDistrusted(
  _fromId: PrincipalId,
  _toId: PrincipalId,
  _domain: string
): Promise<boolean> {
  return false;
}

export async function revokeDistrustEdge(
  edgeId: string,
  _fromId: PrincipalId
): Promise<{ success: boolean }> {
  const deleted = distrustEdges.delete(edgeId);
  return { success: deleted };
}

export async function getOutgoingEdgesForBFS(
  nodeId: PrincipalId,
  _domain: string
): Promise<Array<{ to: PrincipalId; weight: number }>> {
  const edges: Array<{ to: PrincipalId; weight: number }> = [];
  for (const edge of trustEdges.values()) {
    if (edge.from === nodeId) {
      edges.push({ to: edge.to, weight: edge.weight });
    }
  }
  return edges;
}

// Network types
interface NetworkNode {
  id: string;
  type: string;
  displayName?: string;
  effectiveTrust: number;
  hopDistance: number;
}

interface NetworkEdge {
  from: string;
  to: string;
  weight: number;
  domain: string;
}

interface NetworkStats {
  nodeCount: number;
  edgeCount: number;
  avgTrust: number;
  maxHops: number;
}

interface TrustNetworkResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: NetworkStats;
}

export async function getTrustNetwork(
  viewerId: PrincipalId,
  _domain: string,
  maxHops: number = 3,
  minTrust: number = 0.1,
  limit: number = 100
): Promise<TrustNetworkResult> {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const visited = new Set<string>();

  // BFS from viewer
  const queue: Array<{ id: string; distance: number; trust: number }> = [
    { id: viewerId, distance: 0, trust: 1.0 },
  ];

  while (queue.length > 0 && nodes.length < limit) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const principal = principals.get(current.id);
    nodes.push({
      id: current.id,
      type: 'user',
      displayName: principal?.metadata?.displayName,
      effectiveTrust: current.trust,
      hopDistance: current.distance,
    });

    if (current.distance < maxHops) {
      for (const edge of trustEdges.values()) {
        if (edge.from === current.id && !visited.has(edge.to)) {
          const effectiveTrust = current.trust * edge.weight;
          if (effectiveTrust >= minTrust) {
            edges.push({
              from: edge.from,
              to: edge.to,
              weight: edge.weight,
              domain: edge.domain,
            });
            queue.push({
              id: edge.to,
              distance: current.distance + 1,
              trust: effectiveTrust,
            });
          }
        }
      }
    }
  }

  return {
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      avgTrust: nodes.reduce((sum, n) => sum + n.effectiveTrust, 0) / nodes.length || 0,
      maxHops,
    },
  };
}

export async function getTrustConnection(
  viewerId: PrincipalId,
  targetId: PrincipalId,
  _domain: string,
  maxHops: number = 4
): Promise<{
  effectiveTrust: number;
  hopDistance: number;
  path: Array<{ id: string; displayName?: string }>;
} | null> {
  // Simple BFS to find path
  const visited = new Map<string, { trust: number; path: string[] }>();
  const queue: Array<{ id: string; trust: number; path: string[] }> = [
    { id: viewerId, trust: 1.0, path: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.set(current.id, { trust: current.trust, path: current.path });

    if (current.id === targetId) {
      return {
        effectiveTrust: current.trust,
        hopDistance: current.path.length,
        path: current.path.map((id) => ({
          id,
          displayName: principals.get(id)?.metadata?.displayName,
        })),
      };
    }

    if (current.path.length < maxHops) {
      for (const edge of trustEdges.values()) {
        if (edge.from === current.id && !visited.has(edge.to)) {
          queue.push({
            id: edge.to,
            trust: current.trust * edge.weight,
            path: [...current.path, current.id],
          });
        }
      }
    }
  }

  return null;
}

export async function getPublicNetworkSnapshot(
  limit: number = 50,
  includeEndorsements: boolean = false
): Promise<TrustNetworkResult & { endorsements?: Array<{ from: string; to: string; rating: number }> }> {
  const nodes: NetworkNode[] = [];
  const networkEdges: NetworkEdge[] = [];
  const endorsementEdges: Array<{ from: string; to: string; rating: number }> = [];

  // Add all principals as nodes
  for (const [id, principal] of principals.entries()) {
    if (nodes.length >= limit) break;
    nodes.push({
      id,
      type: 'user',
      displayName: principal.metadata?.displayName,
      effectiveTrust: 1.0,
      hopDistance: 0,
    });
  }

  // Add all trust edges
  for (const edge of trustEdges.values()) {
    networkEdges.push({
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      domain: edge.domain,
    });
  }

  // Add subjects and endorsements if requested
  if (includeEndorsements) {
    for (const subject of subjects.values()) {
      nodes.push({
        id: subject.id,
        type: 'subject',
        displayName: subject.canonicalName,
        effectiveTrust: 0,
        hopDistance: 0,
      });
    }

    for (const endorsement of endorsements.values()) {
      endorsementEdges.push({
        from: endorsement.author,
        to: endorsement.subject,
        rating: endorsement.rating.score,
      });
    }
  }

  return {
    nodes,
    edges: networkEdges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: networkEdges.length,
      avgTrust: 0.8,
      maxHops: 0,
    },
    ...(includeEndorsements ? { endorsements: endorsementEdges } : {}),
  };
}

export async function getTrustNetworkWithEndorsements(
  viewerId: PrincipalId,
  domain: string,
  maxHops: number = 3,
  minTrust: number = 0.1,
  limit: number = 100,
  includeEndorsements: boolean = true
): Promise<TrustNetworkResult & { endorsements?: Array<{ from: string; to: string; rating: number }> }> {
  const network = await getTrustNetwork(viewerId, domain, maxHops, minTrust, limit);

  if (!includeEndorsements) {
    return network;
  }

  const nodeIds = new Set(network.nodes.map((n) => n.id));
  const endorsementEdges: Array<{ from: string; to: string; rating: number }> = [];

  // Add subjects that have been endorsed by network members
  for (const endorsement of endorsements.values()) {
    if (nodeIds.has(endorsement.author)) {
      // Add subject node if not present
      if (!nodeIds.has(endorsement.subject)) {
        const subject = subjects.get(endorsement.subject);
        if (subject) {
          network.nodes.push({
            id: subject.id,
            type: 'subject',
            displayName: subject.canonicalName,
            effectiveTrust: 0,
            hopDistance: 0,
          });
          nodeIds.add(subject.id);
        }
      }

      endorsementEdges.push({
        from: endorsement.author,
        to: endorsement.subject,
        rating: endorsement.rating.score,
      });
    }
  }

  return {
    ...network,
    endorsements: endorsementEdges,
  };
}

// ============ SUBJECTS ============

export async function createSubject(input: CreateSubjectInput): Promise<Subject> {
  const subject: Subject = {
    id: generateId('subj'),
    type: input.type,
    canonicalName: input.canonicalName,
    domains: new Set(input.domains),
    location: input.location,
    externalIds: input.externalIds ?? {},
    createdAt: new Date(),
    metadata: input.metadata ?? {},
  };
  subjects.set(subject.id, subject);
  return subject;
}

export async function getSubjectById(id: SubjectId): Promise<Subject | null> {
  return subjects.get(id) ?? null;
}

export async function updateSubject(
  id: SubjectId,
  updates: Partial<CreateSubjectInput>
): Promise<Subject | null> {
  const subject = subjects.get(id);
  if (!subject) return null;

  if (updates.canonicalName) subject.canonicalName = updates.canonicalName;
  if (updates.domains) subject.domains = new Set(updates.domains);
  if (updates.location) subject.location = updates.location;
  if (updates.metadata) subject.metadata = { ...subject.metadata, ...updates.metadata };

  return subject;
}

export async function deleteSubject(id: SubjectId): Promise<boolean> {
  return subjects.delete(id);
}

export async function searchSubjects(
  query: string,
  _domain?: string,
  limit: number = 20
): Promise<Subject[]> {
  const results: Subject[] = [];
  const lowerQuery = query.toLowerCase();

  for (const subject of subjects.values()) {
    if (
      subject.canonicalName.toLowerCase().includes(lowerQuery) ||
      Object.values(subject.metadata).some((v) =>
        v.toLowerCase().includes(lowerQuery)
      )
    ) {
      results.push(subject);
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function listSubjects(
  limit: number = 20,
  offset: number = 0
): Promise<Subject[]> {
  const all = Array.from(subjects.values());
  return all.slice(offset, offset + limit);
}

// ============ ENDORSEMENTS ============

export async function createEndorsement(
  authorId: PrincipalId,
  input: CreateEndorsementInput,
  signature: Signature
): Promise<Endorsement> {
  const endorsement: Endorsement = {
    id: generateId('end'),
    author: authorId,
    subject: input.subject,
    domain: input.domain,
    rating: input.rating,
    content: input.content,
    createdAt: new Date(),
    updatedAt: new Date(),
    context: input.context
      ? {
          ...input.context,
          verified: input.context.verified ?? false,
        }
      : undefined,
    signature: signature,
  };
  endorsements.set(endorsement.id, endorsement);
  return endorsement;
}

export async function getEndorsementById(
  id: string
): Promise<Endorsement | null> {
  return endorsements.get(id) ?? null;
}

export async function getEndorsementsForSubject(
  subjectId: SubjectId,
  domain?: string,
  limit: number = 50,
  offset: number = 0
): Promise<Array<Endorsement & { subjectName?: string }>> {
  const results: Array<Endorsement & { subjectName?: string }> = [];
  const subject = subjects.get(subjectId);

  for (const endorsement of endorsements.values()) {
    if (endorsement.subject === subjectId) {
      if (!domain || endorsement.domain === domain) {
        results.push({
          ...endorsement,
          subjectName: subject?.canonicalName,
        });
      }
    }
  }

  return results.slice(offset, offset + limit);
}

export async function getEndorsementsByAuthor(
  authorId: PrincipalId,
  domain?: string,
  limit: number = 50,
  offset: number = 0
): Promise<Array<Endorsement & { subjectName?: string }>> {
  const results: Array<Endorsement & { subjectName?: string }> = [];

  for (const endorsement of endorsements.values()) {
    if (endorsement.author === authorId) {
      if (!domain || endorsement.domain === domain) {
        const subject = subjects.get(endorsement.subject);
        results.push({
          ...endorsement,
          subjectName: subject?.canonicalName,
        });
      }
    }
  }

  return results.slice(offset, offset + limit);
}

export async function updateEndorsement(
  id: string,
  authorId: PrincipalId,
  updates: Partial<CreateEndorsementInput>
): Promise<Endorsement | null> {
  const endorsement = endorsements.get(id);
  if (!endorsement || endorsement.author !== authorId) return null;

  if (updates.rating) endorsement.rating = updates.rating;
  if (updates.content) endorsement.content = updates.content;
  endorsement.updatedAt = new Date();

  return endorsement;
}

export async function deleteEndorsement(
  id: string,
  authorId: PrincipalId
): Promise<{ success: boolean }> {
  const endorsement = endorsements.get(id);
  if (!endorsement || endorsement.author !== authorId) {
    return { success: false };
  }
  endorsements.delete(id);
  return { success: true };
}

export async function getEndorsementsFromNetwork(
  viewerId: PrincipalId,
  options: {
    subjectId?: string;
    domain?: string;
    maxHops?: number;
    minTrust?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'trust' | 'date' | 'rating';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<Array<Endorsement & {
  subjectName?: string;
  effectiveTrust: number;
  hopDistance: number;
  authorDisplayName?: string;
}>> {
  const {
    subjectId,
    domain,
    maxHops = 4,
    minTrust = 0.01,
    limit = 20,
    offset = 0,
    sortBy = 'trust',
    sortOrder = 'desc',
  } = options;

  // Get trusted network
  const network = await getTrustNetwork(viewerId, domain ?? '*', maxHops, minTrust, 200);
  const trustedNodes = new Map(network.nodes.map((n) => [n.id, n]));

  const results: Array<Endorsement & {
    subjectName?: string;
    effectiveTrust: number;
    hopDistance: number;
    authorDisplayName?: string;
  }> = [];

  for (const endorsement of endorsements.values()) {
    const authorNode = trustedNodes.get(endorsement.author);
    if (!authorNode) continue;

    if (subjectId && endorsement.subject !== subjectId) continue;
    if (domain && endorsement.domain !== domain) continue;

    const subject = subjects.get(endorsement.subject);
    const author = principals.get(endorsement.author);

    results.push({
      ...endorsement,
      subjectName: subject?.canonicalName,
      effectiveTrust: authorNode.effectiveTrust,
      hopDistance: authorNode.hopDistance,
      authorDisplayName: author?.metadata?.displayName,
    });
  }

  // Sort results
  results.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'trust') {
      cmp = a.effectiveTrust - b.effectiveTrust;
    } else if (sortBy === 'date') {
      cmp = a.createdAt.getTime() - b.createdAt.getTime();
    } else if (sortBy === 'rating') {
      cmp = a.rating.score - b.rating.score;
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });

  return results.slice(offset, offset + limit);
}

export async function getSubjectScores(
  viewerId: PrincipalId,
  subjectId: SubjectId,
  _domain?: string,
  maxHops: number = 4,
  minTrust: number = 0.01
): Promise<{
  score: number | null;
  confidence: number;
  endorsementCount: number;
  networkEndorsementCount: number;
  topContributors: Array<{
    principal: { id: string; displayName?: string };
    trust: number;
    rating: number;
    hopDistance: number;
    verified: boolean;
  }>;
}> {
  const networkEndorsements = await getEndorsementsFromNetwork(viewerId, {
    subjectId,
    maxHops,
    minTrust,
    limit: 100,
  });

  const allEndorsements = await getEndorsementsForSubject(subjectId);

  if (networkEndorsements.length === 0) {
    return {
      score: null,
      confidence: 0,
      endorsementCount: allEndorsements.length,
      networkEndorsementCount: 0,
      topContributors: [],
    };
  }

  // Calculate weighted average score
  let totalWeight = 0;
  let weightedSum = 0;
  const topContributors: Array<{
    principal: { id: string; displayName?: string };
    trust: number;
    rating: number;
    hopDistance: number;
    verified: boolean;
  }> = [];

  for (const e of networkEndorsements) {
    weightedSum += e.rating.score * e.effectiveTrust;
    totalWeight += e.effectiveTrust;

    topContributors.push({
      principal: {
        id: e.author,
        displayName: e.authorDisplayName,
      },
      trust: e.effectiveTrust,
      rating: e.rating.score,
      hopDistance: e.hopDistance,
      verified: e.context?.verified ?? false,
    });
  }

  return {
    score: totalWeight > 0 ? weightedSum / totalWeight : null,
    confidence: Math.min(1, networkEndorsements.length / 5), // Simple confidence based on count
    endorsementCount: allEndorsements.length,
    networkEndorsementCount: networkEndorsements.length,
    topContributors: topContributors.slice(0, 5),
  };
}
