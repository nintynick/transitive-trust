/**
 * Mock data for development and demo purposes
 */

import type {
  Principal,
  TrustEdge,
  Subject,
  Endorsement,
  Signature,
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

// Mock Principals
export const mockPrincipals: Principal[] = [
  {
    id: ADDRESSES.alice,
    type: 'user',
    publicKey: ADDRESSES.alice,
    createdAt: new Date('2024-01-15'),
    metadata: { displayName: 'Alice Chen', avatar: '' },
  },
  {
    id: ADDRESSES.bob,
    type: 'user',
    publicKey: ADDRESSES.bob,
    createdAt: new Date('2024-02-01'),
    metadata: { displayName: 'Bob Martinez', avatar: '' },
  },
  {
    id: ADDRESSES.carol,
    type: 'user',
    publicKey: ADDRESSES.carol,
    createdAt: new Date('2024-02-15'),
    metadata: { displayName: 'Carol Kim', avatar: '' },
  },
  {
    id: ADDRESSES.dave,
    type: 'user',
    publicKey: ADDRESSES.dave,
    createdAt: new Date('2024-03-01'),
    metadata: { displayName: 'Dave Johnson', avatar: '' },
  },
  {
    id: ADDRESSES.eve,
    type: 'user',
    publicKey: ADDRESSES.eve,
    createdAt: new Date('2024-03-15'),
    metadata: { displayName: 'Eve Williams', avatar: '' },
  },
  {
    id: ADDRESSES.frank,
    type: 'user',
    publicKey: ADDRESSES.frank,
    createdAt: new Date('2024-04-01'),
    metadata: { displayName: 'Frank Lee', avatar: '' },
  },
];

// Mock Trust Edges (who trusts whom)
export const mockTrustEdges: TrustEdge[] = [
  // Alice trusts Bob and Carol
  {
    id: 'edge-1',
    from: ADDRESSES.alice,
    to: ADDRESSES.bob,
    weight: 0.9,
    domain: '*',
    createdAt: new Date('2024-02-10'),
    evidence: { type: 'personal_knowledge', note: 'Close friend for years' },
    signature: mockSignature,
  },
  {
    id: 'edge-2',
    from: ADDRESSES.alice,
    to: ADDRESSES.carol,
    weight: 0.8,
    domain: 'restaurants',
    createdAt: new Date('2024-02-20'),
    evidence: { type: 'personal_knowledge', note: 'Great taste in food' },
    signature: mockSignature,
  },
  // Bob trusts Dave and Eve
  {
    id: 'edge-3',
    from: ADDRESSES.bob,
    to: ADDRESSES.dave,
    weight: 0.85,
    domain: '*',
    createdAt: new Date('2024-03-05'),
    evidence: { type: 'professional', note: 'Worked together' },
    signature: mockSignature,
  },
  {
    id: 'edge-4',
    from: ADDRESSES.bob,
    to: ADDRESSES.eve,
    weight: 0.7,
    domain: 'restaurants',
    createdAt: new Date('2024-03-10'),
    evidence: { type: 'personal_knowledge' },
    signature: mockSignature,
  },
  // Carol trusts Frank
  {
    id: 'edge-5',
    from: ADDRESSES.carol,
    to: ADDRESSES.frank,
    weight: 0.75,
    domain: '*',
    createdAt: new Date('2024-03-20'),
    evidence: { type: 'personal_knowledge' },
    signature: mockSignature,
  },
  // Dave trusts Alice (circular trust)
  {
    id: 'edge-6',
    from: ADDRESSES.dave,
    to: ADDRESSES.alice,
    weight: 0.8,
    domain: '*',
    createdAt: new Date('2024-04-01'),
    evidence: { type: 'personal_knowledge' },
    signature: mockSignature,
  },
];

// Mock Subjects (businesses, products, etc.)
export const mockSubjects: Subject[] = [
  {
    id: 'subj-tacos-el-rey',
    type: 'business',
    canonicalName: 'Tacos El Rey',
    domains: new Set(['restaurants', 'mexican-food']),
    location: { latitude: 37.7749, longitude: -122.4194 },
    externalIds: { google_place_id: 'ChIJ123456789' },
    createdAt: new Date('2024-01-01'),
    metadata: { category: 'Mexican Restaurant', city: 'San Francisco' },
  },
  {
    id: 'subj-joes-pizza',
    type: 'business',
    canonicalName: "Joe's Pizza",
    domains: new Set(['restaurants', 'pizza']),
    location: { latitude: 40.7128, longitude: -74.006 },
    externalIds: {},
    createdAt: new Date('2024-01-05'),
    metadata: { category: 'Pizza', city: 'New York' },
  },
  {
    id: 'subj-green-leaf-cafe',
    type: 'business',
    canonicalName: 'Green Leaf Cafe',
    domains: new Set(['restaurants', 'cafes', 'vegan']),
    location: { latitude: 34.0522, longitude: -118.2437 },
    externalIds: {},
    createdAt: new Date('2024-01-10'),
    metadata: { category: 'Vegan Cafe', city: 'Los Angeles' },
  },
  {
    id: 'subj-swift-plumbing',
    type: 'business',
    canonicalName: 'Swift Plumbing Co.',
    domains: new Set(['home-services', 'plumbing']),
    location: { latitude: 37.7749, longitude: -122.4194 },
    externalIds: {},
    createdAt: new Date('2024-02-01'),
    metadata: { category: 'Plumbing', city: 'San Francisco' },
  },
  {
    id: 'subj-bright-dental',
    type: 'business',
    canonicalName: 'Bright Smile Dental',
    domains: new Set(['healthcare', 'dental']),
    location: { latitude: 37.7849, longitude: -122.4094 },
    externalIds: {},
    createdAt: new Date('2024-02-15'),
    metadata: { category: 'Dentist', city: 'San Francisco' },
  },
];

// Mock Endorsements (reviews)
export const mockEndorsements: Endorsement[] = [
  // Bob reviews Tacos El Rey
  {
    id: 'end-1',
    author: ADDRESSES.bob,
    subject: 'subj-tacos-el-rey',
    domain: 'restaurants',
    rating: {
      score: 0.95,
      originalScore: '5 out of 5 stars',
      originalScale: '5-star scale',
    },
    content: {
      summary: 'Best tacos in the city! Authentic flavors and generous portions.',
      body: 'I have been coming here for years. The carne asada is perfectly seasoned and the handmade tortillas are amazing. Great family atmosphere too.',
      tags: ['authentic', 'great-value', 'family-friendly'],
    },
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
    context: {
      relationship: 'recurring',
      verified: false,
    },
    signature: mockSignature,
  },
  // Carol reviews Tacos El Rey
  {
    id: 'end-2',
    author: ADDRESSES.carol,
    subject: 'subj-tacos-el-rey',
    domain: 'restaurants',
    rating: {
      score: 0.8,
      originalScore: '4 out of 5 stars',
      originalScale: '5-star scale',
    },
    content: {
      summary: 'Great food, but can get crowded on weekends.',
      tags: ['good-food', 'busy'],
    },
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-15'),
    signature: mockSignature,
  },
  // Eve reviews Joe's Pizza
  {
    id: 'end-3',
    author: ADDRESSES.eve,
    subject: 'subj-joes-pizza',
    domain: 'restaurants',
    rating: {
      score: 0.9,
      originalScore: '4.5 out of 5',
      originalScale: '5-star scale',
    },
    content: {
      summary: 'Classic NY slice. Thin crust, perfect cheese to sauce ratio.',
      body: 'This is what pizza should taste like. No frills, just excellent pizza.',
      tags: ['classic', 'authentic-ny'],
    },
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
    signature: mockSignature,
  },
  // Dave reviews Green Leaf Cafe
  {
    id: 'end-4',
    author: ADDRESSES.dave,
    subject: 'subj-green-leaf-cafe',
    domain: 'restaurants',
    rating: {
      score: 0.85,
      originalScore: '4 out of 5',
      originalScale: '5-star scale',
    },
    content: {
      summary: 'Surprisingly delicious vegan food. Even meat lovers will enjoy it.',
      tags: ['vegan', 'healthy', 'tasty'],
    },
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01'),
    signature: mockSignature,
  },
  // Frank reviews Swift Plumbing
  {
    id: 'end-5',
    author: ADDRESSES.frank,
    subject: 'subj-swift-plumbing',
    domain: 'home-services',
    rating: {
      score: 0.95,
      originalScore: '5 out of 5',
      originalScale: '5-star scale',
    },
    content: {
      summary: 'Fixed my leak quickly and fairly priced. Very professional.',
      body: 'They showed up on time, diagnosed the issue quickly, and fixed it without trying to upsell me on unnecessary services.',
      tags: ['professional', 'fair-pricing', 'punctual'],
    },
    createdAt: new Date('2024-04-05'),
    updatedAt: new Date('2024-04-05'),
    context: {
      relationship: 'one-time',
      verified: false,
    },
    signature: mockSignature,
  },
  // Alice reviews Bright Smile Dental
  {
    id: 'end-6',
    author: ADDRESSES.alice,
    subject: 'subj-bright-dental',
    domain: 'healthcare',
    rating: {
      score: 0.7,
      originalScore: '3.5 out of 5',
      originalScale: '5-star scale',
    },
    content: {
      summary: 'Good dental work but the wait times can be long.',
      tags: ['good-work', 'long-wait'],
    },
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-04-10'),
    context: {
      relationship: 'recurring',
      verified: false,
    },
    signature: mockSignature,
  },
];

// Export addresses for use in other modules
export { ADDRESSES };
