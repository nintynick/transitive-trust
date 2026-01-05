/**
 * Mock database implementations for demo/development
 * Used when USE_MOCK_DATA=true
 */

import type {
  Principal,
  TrustEdge,
  Subject,
  Endorsement,
  Signature,
  CreateTrustEdgeInput,
  CreateDistrustEdgeInput,
  DistrustEdge,
  CreateSubjectInput,
  CreateEndorsementInput,
} from '@ttp/shared';

// Helper to create a mock signature
const mockSignature: Signature = {
  algorithm: 'secp256k1',
  publicKey: 'mock-public-key',
  signature: 'mock-signature',
  signedAt: new Date().toISOString(),
};

// Sample Ethereum addresses for demo
const ADDRESSES = {
  alice: '0x1234567890123456789012345678901234567890',
  bob: '0x2345678901234567890123456789012345678901',
  carol: '0x3456789012345678901234567890123456789012',
  dave: '0x4567890123456789012345678901234567890123',
  eve: '0x5678901234567890123456789012345678901234',
  frank: '0x6789012345678901234567890123456789012345',
};

// In-memory stores
const principals = new Map<string, Principal>([
  [ADDRESSES.alice, {
    id: ADDRESSES.alice,
    type: 'user',
    publicKey: ADDRESSES.alice,
    createdAt: new Date('2024-01-15'),
    metadata: { displayName: 'Alice Chen' },
  }],
  [ADDRESSES.bob, {
    id: ADDRESSES.bob,
    type: 'user',
    publicKey: ADDRESSES.bob,
    createdAt: new Date('2024-02-01'),
    metadata: { displayName: 'Bob Martinez' },
  }],
  [ADDRESSES.carol, {
    id: ADDRESSES.carol,
    type: 'user',
    publicKey: ADDRESSES.carol,
    createdAt: new Date('2024-02-15'),
    metadata: { displayName: 'Carol Kim' },
  }],
  [ADDRESSES.dave, {
    id: ADDRESSES.dave,
    type: 'user',
    publicKey: ADDRESSES.dave,
    createdAt: new Date('2024-03-01'),
    metadata: { displayName: 'Dave Johnson' },
  }],
  [ADDRESSES.eve, {
    id: ADDRESSES.eve,
    type: 'user',
    publicKey: ADDRESSES.eve,
    createdAt: new Date('2024-03-15'),
    metadata: { displayName: 'Eve Williams' },
  }],
  [ADDRESSES.frank, {
    id: ADDRESSES.frank,
    type: 'user',
    publicKey: ADDRESSES.frank,
    createdAt: new Date('2024-04-01'),
    metadata: { displayName: 'Frank Lee' },
  }],
]);

const trustEdges = new Map<string, TrustEdge>([
  ['edge-1', {
    id: 'edge-1',
    from: ADDRESSES.alice,
    to: ADDRESSES.bob,
    weight: 0.9,
    domain: '*',
    createdAt: new Date('2024-02-10'),
    evidence: { type: 'personal_knowledge', note: 'Close friend for years' },
    signature: mockSignature,
  }],
  ['edge-2', {
    id: 'edge-2',
    from: ADDRESSES.alice,
    to: ADDRESSES.carol,
    weight: 0.8,
    domain: 'restaurants',
    createdAt: new Date('2024-02-20'),
    evidence: { type: 'personal_knowledge', note: 'Great taste in food' },
    signature: mockSignature,
  }],
  ['edge-3', {
    id: 'edge-3',
    from: ADDRESSES.bob,
    to: ADDRESSES.dave,
    weight: 0.85,
    domain: '*',
    createdAt: new Date('2024-03-05'),
    evidence: { type: 'professional', note: 'Worked together' },
    signature: mockSignature,
  }],
  ['edge-4', {
    id: 'edge-4',
    from: ADDRESSES.bob,
    to: ADDRESSES.eve,
    weight: 0.7,
    domain: 'restaurants',
    createdAt: new Date('2024-03-10'),
    evidence: { type: 'personal_knowledge' },
    signature: mockSignature,
  }],
  ['edge-5', {
    id: 'edge-5',
    from: ADDRESSES.carol,
    to: ADDRESSES.frank,
    weight: 0.75,
    domain: '*',
    createdAt: new Date('2024-03-20'),
    evidence: { type: 'personal_knowledge' },
    signature: mockSignature,
  }],
  ['edge-6', {
    id: 'edge-6',
    from: ADDRESSES.dave,
    to: ADDRESSES.alice,
    weight: 0.8,
    domain: '*',
    createdAt: new Date('2024-04-01'),
    evidence: { type: 'personal_knowledge' },
    signature: mockSignature,
  }],
]);

const distrustEdges = new Map<string, DistrustEdge>();

const subjects = new Map<string, Subject>([
  ['subj-tacos-el-rey', {
    id: 'subj-tacos-el-rey',
    type: 'business',
    canonicalName: 'Tacos El Rey',
    domains: new Set(['restaurants', 'mexican-food']),
    location: { latitude: 37.7749, longitude: -122.4194 },
    externalIds: { google_place_id: 'ChIJ123456789' },
    createdAt: new Date('2024-01-01'),
    metadata: { category: 'Mexican Restaurant', city: 'San Francisco' },
  }],
  ['subj-joes-pizza', {
    id: 'subj-joes-pizza',
    type: 'business',
    canonicalName: "Joe's Pizza",
    domains: new Set(['restaurants', 'pizza']),
    location: { latitude: 40.7128, longitude: -74.006 },
    externalIds: {},
    createdAt: new Date('2024-01-05'),
    metadata: { category: 'Pizza', city: 'New York' },
  }],
  ['subj-green-leaf-cafe', {
    id: 'subj-green-leaf-cafe',
    type: 'business',
    canonicalName: 'Green Leaf Cafe',
    domains: new Set(['restaurants', 'cafes', 'vegan']),
    location: { latitude: 34.0522, longitude: -118.2437 },
    externalIds: {},
    createdAt: new Date('2024-01-10'),
    metadata: { category: 'Vegan Cafe', city: 'Los Angeles' },
  }],
  ['subj-swift-plumbing', {
    id: 'subj-swift-plumbing',
    type: 'business',
    canonicalName: 'Swift Plumbing Co.',
    domains: new Set(['home-services', 'plumbing']),
    location: { latitude: 37.7749, longitude: -122.4194 },
    externalIds: {},
    createdAt: new Date('2024-02-01'),
    metadata: { category: 'Plumbing', city: 'San Francisco' },
  }],
  ['subj-bright-dental', {
    id: 'subj-bright-dental',
    type: 'business',
    canonicalName: 'Bright Smile Dental',
    domains: new Set(['healthcare', 'dental']),
    location: { latitude: 37.7849, longitude: -122.4094 },
    externalIds: {},
    createdAt: new Date('2024-02-15'),
    metadata: { category: 'Dentist', city: 'San Francisco' },
  }],
]);

const endorsements = new Map<string, Endorsement>([
  ['end-1', {
    id: 'end-1',
    author: ADDRESSES.bob,
    subject: 'subj-tacos-el-rey',
    domain: 'restaurants',
    rating: { score: 0.95, originalScore: '5 out of 5 stars', originalScale: '5-star scale' },
    content: {
      summary: 'Best tacos in the city! Authentic flavors and generous portions.',
      body: 'I have been coming here for years. The carne asada is perfectly seasoned.',
      tags: ['authentic', 'great-value', 'family-friendly'],
    },
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    context: { relationship: 'recurring', verified: false },
    signature: mockSignature,
  }],
  ['end-2', {
    id: 'end-2',
    author: ADDRESSES.carol,
    subject: 'subj-tacos-el-rey',
    domain: 'restaurants',
    rating: { score: 0.8, originalScore: '4 out of 5 stars', originalScale: '5-star scale' },
    content: { summary: 'Great food, but can get crowded on weekends.', tags: ['good-food', 'busy'] },
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-15'),
    signature: mockSignature,
  }],
  ['end-3', {
    id: 'end-3',
    author: ADDRESSES.eve,
    subject: 'subj-joes-pizza',
    domain: 'restaurants',
    rating: { score: 0.9, originalScore: '4.5 out of 5', originalScale: '5-star scale' },
    content: {
      summary: 'Classic NY slice. Thin crust, perfect cheese to sauce ratio.',
      body: 'This is what pizza should taste like. No frills, just excellent pizza.',
      tags: ['classic', 'authentic-ny'],
    },
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
    signature: mockSignature,
  }],
  ['end-4', {
    id: 'end-4',
    author: ADDRESSES.dave,
    subject: 'subj-green-leaf-cafe',
    domain: 'restaurants',
    rating: { score: 0.85, originalScore: '4 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Surprisingly delicious vegan food. Even meat lovers will enjoy it.', tags: ['vegan', 'healthy'] },
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
    signature: mockSignature,
  }],
  ['end-5', {
    id: 'end-5',
    author: ADDRESSES.frank,
    subject: 'subj-swift-plumbing',
    domain: 'home-services',
    rating: { score: 0.95, originalScore: '5 out of 5', originalScale: '5-star scale' },
    content: {
      summary: 'Fixed my leak quickly and fairly priced. Very professional.',
      body: 'They showed up on time and fixed it without trying to upsell.',
      tags: ['professional', 'fair-pricing', 'punctual'],
    },
    createdAt: new Date('2024-04-05'),
    updatedAt: new Date('2024-04-05'),
    context: { relationship: 'one-time', verified: false },
    signature: mockSignature,
  }],
  ['end-6', {
    id: 'end-6',
    author: ADDRESSES.alice,
    subject: 'subj-bright-dental',
    domain: 'healthcare',
    rating: { score: 0.7, originalScore: '3.5 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Good dental work but the wait times can be long.', tags: ['good-work', 'long-wait'] },
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
    context: { relationship: 'recurring', verified: false },
    signature: mockSignature,
  }],
  // Additional endorsements to connect businesses to more people in the network
  ['end-7', {
    id: 'end-7',
    author: ADDRESSES.alice,
    subject: 'subj-tacos-el-rey',
    domain: 'restaurants',
    rating: { score: 0.9, originalScore: '4.5 out of 5', originalScale: '5-star scale' },
    content: { summary: 'My favorite taco spot! The al pastor is incredible.', tags: ['authentic', 'delicious'] },
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
    context: { relationship: 'recurring', verified: false },
    signature: mockSignature,
  }],
  ['end-8', {
    id: 'end-8',
    author: ADDRESSES.alice,
    subject: 'subj-joes-pizza',
    domain: 'restaurants',
    rating: { score: 0.85, originalScore: '4 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Solid NY-style pizza. Great late night option.', tags: ['classic', 'late-night'] },
    createdAt: new Date('2024-03-25'),
    updatedAt: new Date('2024-03-25'),
    signature: mockSignature,
  }],
  ['end-9', {
    id: 'end-9',
    author: ADDRESSES.bob,
    subject: 'subj-swift-plumbing',
    domain: 'home-services',
    rating: { score: 0.9, originalScore: '4.5 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Saved us during a weekend emergency. Highly recommend!', body: 'Pipe burst on Saturday and they came same day.', tags: ['emergency-service', 'reliable'] },
    createdAt: new Date('2024-04-08'),
    updatedAt: new Date('2024-04-08'),
    context: { relationship: 'one-time', verified: false },
    signature: mockSignature,
  }],
  ['end-10', {
    id: 'end-10',
    author: ADDRESSES.bob,
    subject: 'subj-bright-dental',
    domain: 'healthcare',
    rating: { score: 0.85, originalScore: '4 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Great cleaning, friendly staff. Modern equipment.', tags: ['professional', 'clean'] },
    createdAt: new Date('2024-04-12'),
    updatedAt: new Date('2024-04-12'),
    context: { relationship: 'recurring', verified: false },
    signature: mockSignature,
  }],
  ['end-11', {
    id: 'end-11',
    author: ADDRESSES.carol,
    subject: 'subj-green-leaf-cafe',
    domain: 'restaurants',
    rating: { score: 0.95, originalScore: '5 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Best vegan brunch in the city! The avocado toast is a must.', tags: ['vegan', 'brunch', 'organic'] },
    createdAt: new Date('2024-04-02'),
    updatedAt: new Date('2024-04-02'),
    signature: mockSignature,
  }],
  ['end-12', {
    id: 'end-12',
    author: ADDRESSES.carol,
    subject: 'subj-joes-pizza',
    domain: 'restaurants',
    rating: { score: 0.75, originalScore: '3.5 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Good pizza but a bit greasy for my taste.', tags: ['classic', 'greasy'] },
    createdAt: new Date('2024-03-28'),
    updatedAt: new Date('2024-03-28'),
    signature: mockSignature,
  }],
  ['end-13', {
    id: 'end-13',
    author: ADDRESSES.dave,
    subject: 'subj-tacos-el-rey',
    domain: 'restaurants',
    rating: { score: 0.85, originalScore: '4 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Great burritos and friendly service. Will come back!', tags: ['burritos', 'friendly'] },
    createdAt: new Date('2024-04-03'),
    updatedAt: new Date('2024-04-03'),
    signature: mockSignature,
  }],
  ['end-14', {
    id: 'end-14',
    author: ADDRESSES.dave,
    subject: 'subj-swift-plumbing',
    domain: 'home-services',
    rating: { score: 0.8, originalScore: '4 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Good work on bathroom renovation. Fair prices.', tags: ['renovation', 'fair-pricing'] },
    createdAt: new Date('2024-04-15'),
    updatedAt: new Date('2024-04-15'),
    context: { relationship: 'one-time', verified: false },
    signature: mockSignature,
  }],
  ['end-15', {
    id: 'end-15',
    author: ADDRESSES.eve,
    subject: 'subj-green-leaf-cafe',
    domain: 'restaurants',
    rating: { score: 0.8, originalScore: '4 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Love their smoothie bowls. Nice atmosphere for working.', tags: ['smoothies', 'work-friendly'] },
    createdAt: new Date('2024-04-05'),
    updatedAt: new Date('2024-04-05'),
    signature: mockSignature,
  }],
  ['end-16', {
    id: 'end-16',
    author: ADDRESSES.eve,
    subject: 'subj-bright-dental',
    domain: 'healthcare',
    rating: { score: 0.9, originalScore: '4.5 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Excellent care! Dr. Smith is very thorough and gentle.', tags: ['gentle', 'thorough'] },
    createdAt: new Date('2024-04-18'),
    updatedAt: new Date('2024-04-18'),
    context: { relationship: 'recurring', verified: false },
    signature: mockSignature,
  }],
  ['end-17', {
    id: 'end-17',
    author: ADDRESSES.frank,
    subject: 'subj-tacos-el-rey',
    domain: 'restaurants',
    rating: { score: 0.9, originalScore: '4.5 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Best carnitas tacos I have had. Homemade tortillas!', tags: ['carnitas', 'homemade'] },
    createdAt: new Date('2024-04-06'),
    updatedAt: new Date('2024-04-06'),
    signature: mockSignature,
  }],
  ['end-18', {
    id: 'end-18',
    author: ADDRESSES.frank,
    subject: 'subj-joes-pizza',
    domain: 'restaurants',
    rating: { score: 0.85, originalScore: '4 out of 5', originalScale: '5-star scale' },
    content: { summary: 'Reminds me of pizza back in Brooklyn. Simple and good.', tags: ['authentic-ny', 'simple'] },
    createdAt: new Date('2024-04-09'),
    updatedAt: new Date('2024-04-09'),
    signature: mockSignature,
  }],
]);

let idCounter = 1000;
const generateId = (prefix: string) => `${prefix}-${++idCounter}`;

// ============ DRIVER (no-op) ============

export function initDriver(_config: unknown): void {
  console.log('[Mock DB] Initialized with mock data');
}

export function getDriver(): null {
  return null;
}

export function closeDriver(): void {}

// ============ PRINCIPALS ============

export async function createPrincipal(input: {
  type: 'user' | 'organization' | 'agent';
  publicKey: string;
  metadata?: Record<string, string>;
}): Promise<Principal> {
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

export async function getOrCreatePrincipal(walletAddress: string): Promise<Principal> {
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

export async function getPrincipalById(id: string): Promise<Principal | null> {
  return principals.get(id) ?? null;
}

export async function getPrincipalByPublicKey(publicKey: string): Promise<Principal | null> {
  for (const p of principals.values()) {
    if (p.publicKey === publicKey) return p;
  }
  return null;
}

export async function updatePrincipalMetadata(
  id: string,
  metadata: Record<string, string>
): Promise<Principal | null> {
  const principal = principals.get(id);
  if (!principal) return null;
  principal.metadata = metadata;
  return principal;
}

export async function deletePrincipal(id: string): Promise<boolean> {
  return principals.delete(id);
}

export async function listPrincipals(limit: number = 20, offset: number = 0): Promise<Principal[]> {
  return Array.from(principals.values()).slice(offset, offset + limit);
}

// ============ TRUST EDGES ============

export async function createTrustEdge(
  fromId: string,
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

export async function getTrustEdge(fromId: string, toId: string, domain: string): Promise<TrustEdge | null> {
  for (const edge of trustEdges.values()) {
    if (edge.from === fromId && edge.to === toId && edge.domain === domain) {
      return edge;
    }
  }
  return null;
}

export async function getOutgoingTrustEdges(fromId: string, domain?: string): Promise<TrustEdge[]> {
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

export async function getIncomingTrustEdges(toId: string, domain?: string): Promise<TrustEdge[]> {
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

export async function revokeTrustEdge(fromId: string, edgeId: string): Promise<{ success: boolean }> {
  const edge = trustEdges.get(edgeId);
  if (edge && edge.from === fromId) {
    return { success: trustEdges.delete(edgeId) };
  }
  return { success: false };
}

export async function createDistrustEdge(
  fromId: string,
  input: CreateDistrustEdgeInput,
  signature: Signature
): Promise<DistrustEdge> {
  const edge: DistrustEdge = {
    id: generateId('distrust'),
    from: fromId,
    to: input.to,
    domain: input.domain,
    createdAt: new Date(),
    reason: input.reason,
    signature: signature,
  };
  distrustEdges.set(edge.id, edge);
  return edge;
}

export async function isDistrusted(): Promise<boolean> {
  return false;
}

export async function revokeDistrustEdge(fromId: string, edgeId: string): Promise<{ success: boolean }> {
  const edge = distrustEdges.get(edgeId);
  if (edge && edge.from === fromId) {
    return { success: distrustEdges.delete(edgeId) };
  }
  return { success: false };
}

export async function getOutgoingEdgesForBFS(nodeId: string): Promise<Array<{ to: string; weight: number }>> {
  const edges: Array<{ to: string; weight: number }> = [];
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

interface TrustNetworkResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: { nodeCount: number; edgeCount: number; avgTrust: number; maxHops: number };
}

export async function getTrustNetwork(
  viewerId: string,
  options: {
    domain?: string;
    maxHops?: number;
    minTrust?: number;
    limit?: number;
  } = {}
): Promise<TrustNetworkResult> {
  const { maxHops = 3, minTrust = 0.1, limit = 100 } = options;
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const visited = new Set<string>();
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
            edges.push({ from: edge.from, to: edge.to, weight: edge.weight, domain: edge.domain });
            queue.push({ id: edge.to, distance: current.distance + 1, trust: effectiveTrust });
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
  viewerId: string,
  targetId: string,
  options: { domain?: string; maxHops?: number } = {}
): Promise<{ effectiveTrust: number; hopDistance: number; path: Array<{ id: string; displayName?: string }> } | null> {
  const { maxHops = 4 } = options;
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
        path: current.path.map((id) => ({ id, displayName: principals.get(id)?.metadata?.displayName })),
      };
    }

    if (current.path.length < maxHops) {
      for (const edge of trustEdges.values()) {
        if (edge.from === current.id && !visited.has(edge.to)) {
          queue.push({ id: edge.to, trust: current.trust * edge.weight, path: [...current.path, current.id] });
        }
      }
    }
  }

  return null;
}

// Types for PublicNetworkExplorer component
interface PublicNode {
  id: string;
  type: 'principal' | 'subject';
  displayName?: string;
  trustCount: number;
  endorsementCount: number;
}

interface PublicEdge {
  from: string;
  to: string;
  type: 'trust' | 'endorsement';
  weight: number;
  domain: string;
}

interface PublicNetworkStats {
  totalPrincipals: number;
  totalEdges: number;
  totalSubjects: number;
  totalEndorsements: number;
}

export async function getPublicNetworkSnapshot(
  options: { limit?: number; includeEndorsements?: boolean } = {}
): Promise<{ nodes: PublicNode[]; edges: PublicEdge[]; stats: PublicNetworkStats }> {
  const { limit = 50, includeEndorsements = true } = options;
  const nodes: PublicNode[] = [];
  const allEdges: PublicEdge[] = [];

  // Count trust connections and endorsements per principal
  const trustCounts = new Map<string, number>();
  const endorsementCounts = new Map<string, number>();

  for (const edge of trustEdges.values()) {
    trustCounts.set(edge.from, (trustCounts.get(edge.from) || 0) + 1);
  }

  for (const e of endorsements.values()) {
    endorsementCounts.set(e.author, (endorsementCounts.get(e.author) || 0) + 1);
  }

  // Add principal nodes
  for (const [id, principal] of principals.entries()) {
    if (nodes.length >= limit) break;
    nodes.push({
      id,
      type: 'principal',
      displayName: principal.metadata?.displayName,
      trustCount: trustCounts.get(id) || 0,
      endorsementCount: endorsementCounts.get(id) || 0,
    });
  }

  // Add trust edges
  for (const edge of trustEdges.values()) {
    allEdges.push({
      from: edge.from,
      to: edge.to,
      type: 'trust',
      weight: edge.weight,
      domain: edge.domain,
    });
  }

  // Add subjects and endorsement edges if requested
  if (includeEndorsements) {
    for (const subject of subjects.values()) {
      nodes.push({
        id: subject.id,
        type: 'subject',
        displayName: subject.canonicalName,
        trustCount: 0,
        endorsementCount: 0,
      });
    }
    for (const e of endorsements.values()) {
      allEdges.push({
        from: e.author,
        to: e.subject,
        type: 'endorsement',
        weight: e.rating.score,
        domain: e.domain,
      });
    }
  }

  const totalPrincipals = Array.from(principals.values()).length;
  const totalSubjects = includeEndorsements ? Array.from(subjects.values()).length : 0;
  const totalEndorsements = includeEndorsements ? Array.from(endorsements.values()).length : 0;

  return {
    nodes,
    edges: allEdges,
    stats: {
      totalPrincipals,
      totalEdges: Array.from(trustEdges.values()).length,
      totalSubjects,
      totalEndorsements,
    },
  };
}

export async function getTrustNetworkWithEndorsements(
  viewerId: string,
  options: {
    domain?: string;
    maxHops?: number;
    minTrust?: number;
    limit?: number;
    includeEndorsements?: boolean;
  } = {}
): Promise<TrustNetworkResult & { endorsements?: Array<{ from: string; to: string; rating: number }> }> {
  const { includeEndorsements = true, ...networkOptions } = options;
  const network = await getTrustNetwork(viewerId, networkOptions);

  if (!includeEndorsements) return network;

  const nodeIds = new Set(network.nodes.map((n) => n.id));
  const endorsementEdges: Array<{ from: string; to: string; rating: number }> = [];

  for (const e of endorsements.values()) {
    if (nodeIds.has(e.author)) {
      if (!nodeIds.has(e.subject)) {
        const subject = subjects.get(e.subject);
        if (subject) {
          network.nodes.push({ id: subject.id, type: 'subject', displayName: subject.canonicalName, effectiveTrust: 0, hopDistance: 0 });
          nodeIds.add(subject.id);
        }
      }
      endorsementEdges.push({ from: e.author, to: e.subject, rating: e.rating.score });
    }
  }

  return { ...network, endorsements: endorsementEdges };
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

export async function getSubjectById(id: string): Promise<Subject | null> {
  return subjects.get(id) ?? null;
}

export async function updateSubject(id: string, updates: Partial<CreateSubjectInput>): Promise<Subject | null> {
  const subject = subjects.get(id);
  if (!subject) return null;
  if (updates.canonicalName) subject.canonicalName = updates.canonicalName;
  if (updates.domains) subject.domains = new Set(updates.domains);
  if (updates.location) subject.location = updates.location;
  if (updates.metadata) subject.metadata = { ...subject.metadata, ...updates.metadata };
  return subject;
}

export async function deleteSubject(id: string): Promise<boolean> {
  return subjects.delete(id);
}

export async function searchSubjects(query: string, _domain?: string, limit: number = 20): Promise<Subject[]> {
  const results: Subject[] = [];
  const lowerQuery = query.toLowerCase();
  for (const subject of subjects.values()) {
    if (subject.canonicalName.toLowerCase().includes(lowerQuery) ||
        Object.values(subject.metadata).some((v) => v.toLowerCase().includes(lowerQuery))) {
      results.push(subject);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export async function listSubjects(limit: number = 20, offset: number = 0): Promise<Subject[]> {
  return Array.from(subjects.values()).slice(offset, offset + limit);
}

// ============ ENDORSEMENTS ============

export async function createEndorsement(
  authorId: string,
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
    context: input.context ? { ...input.context, verified: input.context.verified ?? false } : undefined,
    signature: signature,
  };
  endorsements.set(endorsement.id, endorsement);
  return endorsement;
}

export async function getEndorsementById(id: string): Promise<Endorsement | null> {
  return endorsements.get(id) ?? null;
}

export async function getEndorsementsForSubject(
  subjectId: string,
  domain: string | undefined,
  options: { limit?: number; offset?: number } = {}
): Promise<Array<Endorsement & { subjectName?: string }>> {
  const { limit = 50, offset = 0 } = options;
  const results: Array<Endorsement & { subjectName?: string }> = [];
  const subject = subjects.get(subjectId);
  for (const e of endorsements.values()) {
    if (e.subject === subjectId && (!domain || e.domain === domain)) {
      results.push({ ...e, subjectName: subject?.canonicalName });
    }
  }
  return results.slice(offset, offset + limit);
}

export async function getEndorsementsByAuthor(
  authorId: string,
  options: { domain?: string; limit?: number; offset?: number } = {}
): Promise<Array<Endorsement & { subjectName?: string }>> {
  const { domain, limit = 50, offset = 0 } = options;
  const results: Array<Endorsement & { subjectName?: string }> = [];
  for (const e of endorsements.values()) {
    if (e.author === authorId && (!domain || e.domain === domain)) {
      results.push({ ...e, subjectName: subjects.get(e.subject)?.canonicalName });
    }
  }
  return results.slice(offset, offset + limit);
}

export async function updateEndorsement(
  id: string,
  authorId: string,
  updates: Partial<CreateEndorsementInput>,
  _signature: Signature
): Promise<Endorsement | null> {
  const endorsement = endorsements.get(id);
  if (!endorsement || endorsement.author !== authorId) return null;
  if (updates.rating) endorsement.rating = updates.rating;
  if (updates.content) endorsement.content = updates.content;
  endorsement.updatedAt = new Date();
  return endorsement;
}

export async function deleteEndorsement(id: string, authorId: string): Promise<{ success: boolean }> {
  const endorsement = endorsements.get(id);
  if (!endorsement || endorsement.author !== authorId) return { success: false };
  endorsements.delete(id);
  return { success: true };
}

export async function getEndorsementsFromNetwork(
  viewerId: string,
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
): Promise<Array<Endorsement & { subjectName?: string; effectiveTrust: number; hopDistance: number; authorDisplayName?: string }>> {
  const { subjectId, domain, maxHops = 4, minTrust = 0.01, limit = 20, offset = 0, sortBy = 'trust', sortOrder = 'desc' } = options;

  const network = await getTrustNetwork(viewerId, { domain: domain ?? '*', maxHops, minTrust, limit: 200 });
  const trustedNodes = new Map(network.nodes.map((n) => [n.id, n]));

  const results: Array<Endorsement & { subjectName?: string; effectiveTrust: number; hopDistance: number; authorDisplayName?: string }> = [];

  for (const e of endorsements.values()) {
    const authorNode = trustedNodes.get(e.author);
    if (!authorNode) continue;
    if (subjectId && e.subject !== subjectId) continue;
    if (domain && e.domain !== domain) continue;

    results.push({
      ...e,
      subjectName: subjects.get(e.subject)?.canonicalName,
      effectiveTrust: authorNode.effectiveTrust,
      hopDistance: authorNode.hopDistance,
      authorDisplayName: principals.get(e.author)?.metadata?.displayName,
    });
  }

  results.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'trust') cmp = a.effectiveTrust - b.effectiveTrust;
    else if (sortBy === 'date') cmp = a.createdAt.getTime() - b.createdAt.getTime();
    else if (sortBy === 'rating') cmp = a.rating.score - b.rating.score;
    return sortOrder === 'desc' ? -cmp : cmp;
  });

  return results.slice(offset, offset + limit);
}

export async function getSubjectScores(
  viewerId: string,
  subjectId: string,
  _domain?: string,
  maxHops: number = 4,
  minTrust: number = 0.01
): Promise<{
  score: number | null;
  confidence: number;
  endorsementCount: number;
  networkEndorsementCount: number;
  topContributors: Array<{ principal: { id: string; displayName?: string }; trust: number; rating: number; hopDistance: number; verified: boolean }>;
}> {
  const networkEndorsements = await getEndorsementsFromNetwork(viewerId, { subjectId, maxHops, minTrust, limit: 100 });
  const allEndorsements = await getEndorsementsForSubject(subjectId, undefined, {});

  if (networkEndorsements.length === 0) {
    return { score: null, confidence: 0, endorsementCount: allEndorsements.length, networkEndorsementCount: 0, topContributors: [] };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  const topContributors: Array<{ principal: { id: string; displayName?: string }; trust: number; rating: number; hopDistance: number; verified: boolean }> = [];

  for (const e of networkEndorsements) {
    weightedSum += e.rating.score * e.effectiveTrust;
    totalWeight += e.effectiveTrust;
    topContributors.push({
      principal: { id: e.author, displayName: e.authorDisplayName },
      trust: e.effectiveTrust,
      rating: e.rating.score,
      hopDistance: e.hopDistance,
      verified: e.context?.verified ?? false,
    });
  }

  return {
    score: totalWeight > 0 ? weightedSum / totalWeight : null,
    confidence: Math.min(1, networkEndorsements.length / 5),
    endorsementCount: allEndorsements.length,
    networkEndorsementCount: networkEndorsements.length,
    topContributors: topContributors.slice(0, 5),
  };
}
