/**
 * Personalized Score Computation
 * Spec Section 7.3
 */

import type {
  PrincipalId,
  SubjectId,
  DomainId,
  QueryOptions,
  PersonalizedScoreResult,
  Contributor,
  ScoreExplanation,
  Endorsement,
} from '@ttp/shared';
import { DEFAULTS, recencyDecay } from '@ttp/shared';
import { computeEffectiveTrust, type TrustEdgeData } from '../propagation/bounded-bfs.js';

export interface EndorsementData {
  endorsement: Endorsement;
  authorId: PrincipalId;
  authorDisplayName?: string;
}

export interface ScoreConfig {
  minTrustThreshold: number;
  verificationBoost: number;
  recencyHalfLifeDays: number;
  maxContributors: number;
}

/**
 * Compute confidence based on total weight and number of contributors
 * Spec Section 7.4
 */
function computeConfidence(totalWeight: number, numContributors: number): number {
  // More contributors and higher total weight = more confidence
  const contributorFactor = 1 - Math.exp(-numContributors / 3);
  const weightFactor = 1 - Math.exp(-totalWeight / 2);

  return (contributorFactor + weightFactor) / 2;
}

/**
 * Determine network coverage level
 */
function getNetworkCoverage(
  networkEndorsements: number,
  totalEndorsements: number
): 'sparse' | 'moderate' | 'dense' {
  if (totalEndorsements === 0) return 'sparse';
  const ratio = networkEndorsements / totalEndorsements;

  if (ratio < 0.2) return 'sparse';
  if (ratio < 0.5) return 'moderate';
  return 'dense';
}

/**
 * Compute personalized score for a subject from a viewer's perspective
 */
export async function computePersonalizedScore(
  viewerId: PrincipalId,
  subjectId: SubjectId,
  domain: DomainId,
  options: Partial<QueryOptions>,
  endorsements: EndorsementData[],
  getOutgoingEdges: (
    nodeId: PrincipalId,
    domain: DomainId
  ) => Promise<TrustEdgeData[]>,
  isDistrusted: (
    viewerId: PrincipalId,
    nodeId: PrincipalId,
    domain: DomainId
  ) => Promise<boolean>
): Promise<PersonalizedScoreResult> {
  if (endorsements.length === 0) {
    return {
      score: null,
      confidence: 0,
      endorsementCount: 0,
      networkEndorsementCount: 0,
      topContributors: [],
    };
  }

  const config: ScoreConfig = {
    minTrustThreshold: options.minTrustThreshold ?? DEFAULTS.MIN_TRUST_THRESHOLD,
    verificationBoost: options.verificationBoost ?? DEFAULTS.VERIFICATION_BOOST,
    recencyHalfLifeDays: options.recencyHalfLifeDays ?? DEFAULTS.RECENCY_HALF_LIFE_DAYS,
    maxContributors: 10,
  };

  let weightedSum = 0.0;
  let totalWeight = 0.0;
  const contributors: Contributor[] = [];

  const now = Date.now();

  for (const { endorsement, authorId, authorDisplayName } of endorsements) {
    // Compute effective trust to the endorsement author
    const trustResult = await computeEffectiveTrust(
      viewerId,
      authorId,
      domain,
      options,
      getOutgoingEdges,
      isDistrusted
    );

    // Skip if below trust threshold
    if (trustResult.trust < config.minTrustThreshold) {
      continue;
    }

    let weight = trustResult.trust;

    // Apply verification boost
    if (endorsement.context?.verified) {
      weight *= config.verificationBoost;
    }

    // Apply recency decay
    const endorsementAge = now - new Date(endorsement.createdAt).getTime();
    const recencyWeight = recencyDecay(endorsementAge, config.recencyHalfLifeDays);
    weight *= recencyWeight;

    // Accumulate weighted score
    weightedSum += weight * endorsement.rating.score;
    totalWeight += weight;

    // Track contributor
    contributors.push({
      principal: {
        id: authorId,
        displayName: authorDisplayName,
      },
      trust: trustResult.trust,
      rating: endorsement.rating.score,
      hopDistance: trustResult.hops,
      verified: endorsement.context?.verified ?? false,
      paths: options.includePaths ? trustResult.paths : undefined,
    });
  }

  if (totalWeight === 0) {
    return {
      score: null,
      confidence: 0,
      endorsementCount: endorsements.length,
      networkEndorsementCount: 0,
      topContributors: [],
    };
  }

  // Sort contributors by trust (descending)
  contributors.sort((a, b) => b.trust - a.trust);
  const topContributors = contributors.slice(0, config.maxContributors);

  const score = weightedSum / totalWeight;
  const confidence = computeConfidence(totalWeight, contributors.length);

  const result: PersonalizedScoreResult = {
    score,
    confidence,
    endorsementCount: endorsements.length,
    networkEndorsementCount: contributors.length,
    topContributors,
  };

  // Add explanation if requested
  if (options.includeExplanation) {
    const topContributor = topContributors[0];
    result.explanation = {
      summary: `Score based on ${contributors.length} endorsement${
        contributors.length === 1 ? '' : 's'
      } from your network`,
      primaryPath: topContributor?.paths?.[0] ?? [],
      networkCoverage: getNetworkCoverage(contributors.length, endorsements.length),
    };
  }

  return result;
}

/**
 * Batch compute scores for multiple subjects
 */
export async function computePersonalizedScoresBatch(
  viewerId: PrincipalId,
  subjects: Array<{ subjectId: SubjectId; endorsements: EndorsementData[] }>,
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
): Promise<Map<SubjectId, PersonalizedScoreResult>> {
  const results = new Map<SubjectId, PersonalizedScoreResult>();

  // Process subjects in parallel for better performance
  const promises = subjects.map(async ({ subjectId, endorsements }) => {
    const score = await computePersonalizedScore(
      viewerId,
      subjectId,
      domain,
      options,
      endorsements,
      getOutgoingEdges,
      isDistrusted
    );
    return { subjectId, score };
  });

  const computed = await Promise.all(promises);

  for (const { subjectId, score } of computed) {
    results.set(subjectId, score);
  }

  return results;
}
