/**
 * Default configuration values for TTP
 * Based on spec recommendations
 */

export const DEFAULTS = {
  // Trust propagation defaults (Spec Section 5.3)
  MAX_HOPS: 4,
  DECAY_FUNCTION: 'exponential' as const,
  EXPONENTIAL_DECAY_FACTOR: 0.7, // λ = 0.7
  LINEAR_DECAY_DELTA: 0.25,

  // Aggregation defaults (Spec Section 5.4)
  AGGREGATION_STRATEGY: 'maximum' as const,

  // Query defaults
  MIN_TRUST_THRESHOLD: 0.01,
  VERIFICATION_BOOST: 1.5,
  RECENCY_HALF_LIFE_DAYS: 365,

  // Domain distance decay (Spec Section 5.5)
  DOMAIN_DISTANCE_DECAY: 0.9,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Rate limiting
  REQUEST_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes for signature freshness

  // Sybil detection thresholds (Spec Section 10)
  SYBIL: {
    HIGH_CLUSTER_COEFFICIENT_THRESHOLD: 0.8,
    HIGH_RECIPROCITY_THRESHOLD: 0.7,
    RAPID_EDGE_CREATION_DAYS: 7,
    RAPID_EDGE_CREATION_COUNT: 20,
    NEW_ACCOUNT_DAYS: 30,
    VOUCHING_PENALTY_FACTOR: 0.5,
  },

  // Cache TTL
  TRUST_NEIGHBORHOOD_TTL_SECONDS: 3600, // 1 hour
} as const;
