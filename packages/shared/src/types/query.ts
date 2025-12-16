/**
 * Query interfaces for TTP API
 * Spec Section 8
 */

import type { PrincipalId, Principal } from './principal.js';
import type { SubjectId, Subject, GeoLocation } from './subject.js';
import type { DomainId } from './domain.js';
import type { Endorsement } from './endorsement.js';

// ============ Query Options (Spec Section 8.3) ============

export type DecayFunction = 'exponential' | 'linear' | 'hard_cutoff';
export type AggregationStrategy = 'maximum' | 'probabilistic' | 'sum';

export interface QueryOptions {
  maxHops?: number; // Default: 4
  decayFunction?: DecayFunction;
  decayParameter?: number; // Function-specific parameter
  aggregation?: AggregationStrategy;
  minTrustThreshold?: number; // Ignore endorsers below this trust
  includeExplanation?: boolean;
  includePaths?: boolean;
  verificationBoost?: number; // Multiplier for verified endorsements
  recencyHalfLifeDays?: number; // For time-based decay of endorsements
}

// ============ Trust Computation Results ============

export interface EffectiveTrustResult {
  trust: number;
  paths: string[][]; // Array of principal ID paths
  hops: number; // Minimum hop distance (-1 if unreachable)
}

export interface TrustPath {
  nodes: PrincipalId[];
  trust: number;
  hops: number;
}

// ============ GetPersonalizedScore (Spec Section 8.1.1) ============

export interface GetPersonalizedScoreInput {
  viewer: PrincipalId;
  subject: SubjectId;
  domain: DomainId;
  options?: QueryOptions;
}

export interface Contributor {
  principal: {
    id: PrincipalId;
    displayName?: string;
  };
  trust: number;
  rating: number;
  hopDistance: number;
  verified: boolean;
  paths?: string[][];
}

export interface ScoreExplanation {
  summary: string;
  primaryPath: string[];
  networkCoverage: 'sparse' | 'moderate' | 'dense';
}

export interface PersonalizedScoreResult {
  score: number | null; // null if no data
  confidence: number; // 0.0 to 1.0
  endorsementCount: number; // Total endorsements considered
  networkEndorsementCount: number; // Endorsements from viewer's network
  topContributors: Contributor[];
  explanation?: ScoreExplanation;
}

// ============ SearchSubjects (Spec Section 8.1.2) ============

export interface GeoFilter {
  near: GeoLocation;
  radiusKm: number;
}

export interface SearchFilters {
  query?: string; // Text search
  location?: GeoFilter;
  minScore?: number;
  minConfidence?: number;
  minNetworkEndorsements?: number;
}

export interface SortOptions {
  field: 'score' | 'confidence' | 'distance' | 'recency';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface SearchSubjectsInput {
  viewer: PrincipalId;
  domain: DomainId;
  filters?: SearchFilters;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

export interface SearchResult {
  subject: Subject;
  score: number | null;
  confidence: number;
  networkEndorsementCount: number;
  totalEndorsementCount: number;
  distance?: number; // If geo search
}

export interface SearchSubjectsResult {
  results: SearchResult[];
  totalCount: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

// ============ GetTrustNetwork (Spec Section 8.1.3) ============

export interface GetTrustNetworkInput {
  viewer: PrincipalId;
  domain?: DomainId; // null for all domains
  maxHops?: number;
  minTrust?: number;
}

export interface NetworkNode {
  id: PrincipalId;
  type: string;
  displayName?: string;
  effectiveTrust: number;
  hopDistance: number;
}

export interface NetworkEdge {
  from: PrincipalId;
  to: PrincipalId;
  weight: number;
  domain: DomainId;
}

export interface NetworkStats {
  nodeCount: number;
  edgeCount: number;
  avgTrust: number;
  maxHops: number;
}

export interface TrustNetworkResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: NetworkStats;
}

// ============ GetEndorsementFeed (Spec Section 8.1.4) ============

export interface FeedFilters {
  minAuthorTrust?: number;
  subjects?: SubjectId[];
  authors?: PrincipalId[];
  since?: Date;
}

export interface GetEndorsementFeedInput {
  viewer: PrincipalId;
  domain?: DomainId;
  filters?: FeedFilters;
  pagination?: PaginationOptions;
}

export interface EndorsementWithContext {
  endorsement: Endorsement;
  authorTrust: number;
  trustPath: PrincipalId[];
  subject: Subject;
}

export interface EndorsementFeedResult {
  endorsements: EndorsementWithContext[];
  hasMore: boolean;
  nextCursor?: string;
}
