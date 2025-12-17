/**
 * Zod validation schemas for all TTP data types
 */

import { z } from 'zod';

// ============ Base Schemas ============

export const PrincipalIdSchema = z.string().min(1);
export const SubjectIdSchema = z.string().min(1);
export const DomainIdSchema = z.string().min(1);
export const EdgeIdSchema = z.string().min(1);
export const EndorsementIdSchema = z.string().min(1);

export const TrustWeightSchema = z.number().min(0).max(1);

// ============ Signature ============

export const SignatureAlgorithmSchema = z.enum(['ed25519', 'secp256k1']);

export const SignatureSchema = z.object({
  algorithm: SignatureAlgorithmSchema,
  publicKey: z.string().min(1),
  signature: z.string().min(1),
  signedAt: z.string().datetime(),
});

// ============ Principal ============

export const PrincipalTypeSchema = z.enum(['user', 'organization', 'agent']);

export const PrincipalSchema = z.object({
  id: PrincipalIdSchema,
  type: PrincipalTypeSchema,
  publicKey: z.string().min(1),
  createdAt: z.coerce.date(),
  metadata: z.record(z.string()),
});

export const CreatePrincipalInputSchema = z.object({
  type: PrincipalTypeSchema,
  publicKey: z.string().min(1),
  metadata: z.record(z.string()).optional().default({}),
});

// ============ Subject ============

export const SubjectTypeSchema = z.enum(['business', 'individual', 'product', 'service']);

export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const SubjectSchema = z.object({
  id: SubjectIdSchema,
  type: SubjectTypeSchema,
  canonicalName: z.string().min(1).max(500),
  domains: z.set(DomainIdSchema),
  location: GeoLocationSchema.optional(),
  externalIds: z.record(z.string()),
  createdAt: z.coerce.date(),
  metadata: z.record(z.string()),
});

export const CreateSubjectInputSchema = z.object({
  type: SubjectTypeSchema,
  canonicalName: z.string().min(1).max(500),
  domains: z.array(DomainIdSchema).min(1),
  location: GeoLocationSchema.optional(),
  externalIds: z.record(z.string()).optional().default({}),
  metadata: z.record(z.string()).optional().default({}),
});

// ============ Domain ============

export const DomainSchema = z.object({
  id: DomainIdSchema,
  parent: DomainIdSchema.optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
});

export const CreateDomainInputSchema = z.object({
  id: DomainIdSchema,
  parent: DomainIdSchema.optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
});

// ============ Trust Edge ============

export const EvidenceTypeSchema = z.enum([
  'personal_knowledge',
  'professional',
  'verified',
  'other',
]);

export const EvidenceSchema = z.object({
  type: EvidenceTypeSchema,
  note: z.string().max(1000).optional(),
});

export const TrustEdgeSchema = z.object({
  id: EdgeIdSchema,
  from: PrincipalIdSchema,
  to: PrincipalIdSchema,
  weight: TrustWeightSchema,
  domain: DomainIdSchema,
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  evidence: EvidenceSchema.optional(),
  signature: SignatureSchema,
});

export const CreateTrustEdgeInputSchema = z.object({
  to: PrincipalIdSchema,
  weight: TrustWeightSchema,
  domain: DomainIdSchema,
  expiresAt: z.coerce.date().optional(),
  evidence: EvidenceSchema.optional(),
  signature: SignatureSchema.optional(),
});

// ============ Distrust Edge ============

export const DistrustReasonSchema = z.enum([
  'spam',
  'malicious',
  'incompetent',
  'conflict_of_interest',
  'other',
]);

export const DistrustEdgeSchema = z.object({
  id: EdgeIdSchema,
  from: PrincipalIdSchema,
  to: PrincipalIdSchema,
  domain: DomainIdSchema,
  createdAt: z.coerce.date(),
  reason: DistrustReasonSchema,
  signature: SignatureSchema,
});

export const CreateDistrustEdgeInputSchema = z.object({
  to: PrincipalIdSchema,
  domain: DomainIdSchema,
  reason: DistrustReasonSchema,
});

// ============ Endorsement ============

export const RatingSchema = z.object({
  score: z.number().min(0).max(1),
  originalScore: z.string(),
  originalScale: z.string(),
});

export const MediaReferenceSchema = z.object({
  type: z.enum(['image', 'video', 'document']),
  url: z.string().url(),
  caption: z.string().max(500).optional(),
});

export const EndorsementContentSchema = z.object({
  summary: z.string().min(1).max(280),
  body: z.string().max(10000).optional(),
  media: z.array(MediaReferenceSchema).max(10).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const EndorsementContextSchema = z.object({
  transactionDate: z.coerce.date().optional(),
  transactionId: z.string().optional(),
  relationship: z.enum(['one-time', 'recurring', 'long-term']).optional(),
  verified: z.boolean(),
});

export const EndorsementSchema = z.object({
  id: EndorsementIdSchema,
  author: PrincipalIdSchema,
  subject: SubjectIdSchema,
  domain: DomainIdSchema,
  rating: RatingSchema,
  content: EndorsementContentSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  context: EndorsementContextSchema.optional(),
  signature: SignatureSchema,
});

export const CreateEndorsementInputSchema = z.object({
  subject: SubjectIdSchema,
  domain: DomainIdSchema,
  rating: RatingSchema,
  content: z
    .object({
      summary: z.string().min(1).max(280),
      body: z.string().max(10000).optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
    })
    .optional(),
  context: z
    .object({
      transactionDate: z.coerce.date().optional(),
      transactionId: z.string().optional(),
      relationship: z.enum(['one-time', 'recurring', 'long-term']).optional(),
      verified: z.boolean().optional().default(false),
    })
    .optional(),
  signature: SignatureSchema.optional(),
});

export const UpdateEndorsementInputSchema = z.object({
  rating: RatingSchema.optional(),
  content: z
    .object({
      summary: z.string().min(1).max(280),
      body: z.string().max(10000).optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
    })
    .optional(),
});

// ============ Query Options ============

export const DecayFunctionSchema = z.enum(['exponential', 'linear', 'hard_cutoff']);
export const AggregationStrategySchema = z.enum(['maximum', 'probabilistic', 'sum']);

export const QueryOptionsSchema = z.object({
  maxHops: z.number().int().min(1).max(6).optional().default(4),
  decayFunction: DecayFunctionSchema.optional().default('exponential'),
  decayParameter: z.number().min(0).max(1).optional().default(0.7),
  aggregation: AggregationStrategySchema.optional().default('maximum'),
  minTrustThreshold: z.number().min(0).max(1).optional().default(0.01),
  includeExplanation: z.boolean().optional().default(false),
  includePaths: z.boolean().optional().default(false),
  verificationBoost: z.number().min(1).max(5).optional().default(1.5),
  recencyHalfLifeDays: z.number().int().min(1).optional().default(365),
});

// ============ Search ============

export const GeoFilterSchema = z.object({
  near: GeoLocationSchema,
  radiusKm: z.number().min(0).max(500),
});

export const SearchFiltersSchema = z.object({
  query: z.string().max(500).optional(),
  location: GeoFilterSchema.optional(),
  minScore: z.number().min(0).max(1).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  minNetworkEndorsements: z.number().int().min(0).optional(),
});

export const SortOptionsSchema = z.object({
  field: z.enum(['score', 'confidence', 'distance', 'recency']),
  order: z.enum(['asc', 'desc']),
});

export const PaginationOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  cursor: z.string().optional(),
});

// ============ Sybil ============

export const SybilIndicatorsSchema = z.object({
  clusterCoefficient: z.number().min(0).max(1),
  trustReciprocity: z.number().min(0).max(1),
  edgeCreationVelocity: z.number().min(0),
  pathDiversity: z.number().min(0),
  accountAge: z.number().min(0),
});

export const SybilFlagSchema = z.enum([
  'high_cluster_coefficient',
  'high_reciprocity',
  'rapid_edge_creation',
  'low_path_diversity',
  'new_account',
  'no_inbound_trust',
]);
