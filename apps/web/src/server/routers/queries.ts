/**
 * Query routes - personalized scores and search
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  SubjectIdSchema,
  DomainIdSchema,
  QueryOptionsSchema,
} from '@ttp/shared';
import {
  getEndorsementsForSubject,
  getOutgoingEdgesForBFS,
  isDistrusted,
  searchSubjects,
  getPrincipalById,
} from '@ttp/db';
import { computePersonalizedScore } from '@ttp/trust-engine';

export const queriesRouter = router({
  getPersonalizedScore: protectedProcedure
    .input(
      z.object({
        subjectId: SubjectIdSchema,
        domain: DomainIdSchema,
        options: QueryOptionsSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const options = input.options ?? {};

      const endorsements = await getEndorsementsForSubject(
        input.subjectId,
        input.domain
      );

      const endorsementData = await Promise.all(
        endorsements.map(async (e) => {
          const author = await getPrincipalById(e.author);
          return {
            endorsement: e,
            authorId: e.author,
            authorDisplayName: author?.metadata.displayName || author?.metadata.name,
          };
        })
      );

      const result = await computePersonalizedScore(
        ctx.viewer.id,
        input.subjectId,
        input.domain,
        options,
        endorsementData,
        async (nodeId, domain) => {
          const edges = await getOutgoingEdgesForBFS(nodeId, domain);
          return edges;
        },
        async (viewerId, nodeId, domain) => {
          return isDistrusted(viewerId, nodeId, domain);
        }
      );

      return result;
    }),

  searchSubjects: protectedProcedure
    .input(
      z.object({
        domain: DomainIdSchema,
        query: z.string().optional(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            radiusKm: z.number(),
          })
          .optional(),
        minScore: z.number().min(0).max(1).optional(),
        minConfidence: z.number().min(0).max(1).optional(),
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const subjects = await searchSubjects(input.query || '', {
        domain: input.domain,
        location: input.location,
        limit: input.limit * 2,
        offset: input.offset,
      });

      const scoredSubjects = await Promise.all(
        subjects.map(async (subject) => {
          const endorsements = await getEndorsementsForSubject(
            subject.id,
            input.domain
          );

          const endorsementData = await Promise.all(
            endorsements.map(async (e) => {
              const author = await getPrincipalById(e.author);
              return {
                endorsement: e,
                authorId: e.author,
                authorDisplayName: author?.metadata.displayName,
              };
            })
          );

          const scoreResult = await computePersonalizedScore(
            ctx.viewer.id,
            subject.id,
            input.domain,
            {},
            endorsementData,
            async (nodeId, domain) => getOutgoingEdgesForBFS(nodeId, domain),
            async (viewerId, nodeId, domain) =>
              isDistrusted(viewerId, nodeId, domain)
          );

          return {
            subject,
            score: scoreResult.score,
            confidence: scoreResult.confidence,
            networkEndorsementCount: scoreResult.networkEndorsementCount,
            totalEndorsementCount: scoreResult.endorsementCount,
          };
        })
      );

      let filtered = scoredSubjects;

      if (input.minScore !== undefined) {
        filtered = filtered.filter(
          (s) => s.score !== null && s.score >= input.minScore!
        );
      }

      if (input.minConfidence !== undefined) {
        filtered = filtered.filter((s) => s.confidence >= input.minConfidence!);
      }

      filtered.sort((a, b) => {
        if (a.score === null && b.score === null) return 0;
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return b.score - a.score;
      });

      return {
        results: filtered.slice(0, input.limit),
        totalCount: filtered.length,
      };
    }),
});
