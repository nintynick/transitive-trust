/**
 * Subject routes
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import {
  CreateSubjectInputSchema,
  SubjectIdSchema,
  GeoLocationSchema,
  DomainIdSchema,
} from '@ttp/shared';
import {
  createSubject,
  getSubjectById,
  listSubjects,
  searchSubjects,
  updateSubject,
  getSubjectScores,
} from '../db';

export const subjectsRouter = router({
  create: publicProcedure
    .input(CreateSubjectInputSchema)
    .mutation(async ({ input }) => {
      return createSubject(input);
    }),

  getById: publicProcedure
    .input(z.object({ id: SubjectIdSchema }))
    .query(async ({ input }) => {
      return getSubjectById(input.id);
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return listSubjects(input.limit, input.offset);
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        domain: z.string().optional(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            radiusKm: z.number(),
          })
          .optional(),
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return searchSubjects(input.query || '', {
        domain: input.domain,
        location: input.location,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: SubjectIdSchema,
        canonicalName: z.string().optional(),
        domains: z.array(z.string()).optional(),
        location: GeoLocationSchema.nullable().optional(),
        externalIds: z.record(z.string()).optional(),
        metadata: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return updateSubject(id, updates);
    }),

  getScores: protectedProcedure
    .input(
      z.object({
        subjectId: SubjectIdSchema,
        domain: DomainIdSchema.optional(),
        maxHops: z.number().int().min(1).max(4).optional().default(4),
        minTrust: z.number().min(0).max(1).optional().default(0.01),
      })
    )
    .query(async ({ ctx, input }) => {
      return getSubjectScores(ctx.viewer.id, input.subjectId, {
        domain: input.domain,
        maxHops: input.maxHops,
        minTrust: input.minTrust,
      });
    }),
});
