/**
 * Endorsement routes
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  CreateEndorsementInputSchema,
  UpdateEndorsementInputSchema,
  EndorsementIdSchema,
  SubjectIdSchema,
  DomainIdSchema,
  PrincipalIdSchema,
} from '@ttp/shared';
import {
  createEndorsement,
  getEndorsementById,
  getEndorsementsForSubject,
  getEndorsementsByAuthor,
  updateEndorsement,
  deleteEndorsement,
  getEndorsementsFromNetwork,
} from '../db';
import { TRPCError } from '@trpc/server';
import { verifyPrincipalSignature, hasValidSignature } from '../lib/verify';

export const endorsementsRouter = router({
  create: protectedProcedure
    .input(CreateEndorsementInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify signature if provided
      if (hasValidSignature(input.signature)) {
        const endorsementData = {
          subject: input.subject,
          domain: input.domain,
          rating: input.rating,
          content: input.content,
          context: input.context,
        };
        const verification = await verifyPrincipalSignature(
          ctx.viewer.id,
          endorsementData,
          input.signature!
        );
        if (!verification.valid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: verification.error || 'Invalid signature',
          });
        }
      }

      // Use provided signature or create placeholder for legacy support
      const signature = input.signature || {
        algorithm: 'secp256k1' as const,
        publicKey: '',
        signature: '',
        signedAt: new Date().toISOString(),
      };

      return createEndorsement(ctx.viewer.id, input, signature);
    }),

  getById: publicProcedure
    .input(z.object({ id: EndorsementIdSchema }))
    .query(async ({ input }) => {
      return getEndorsementById(input.id);
    }),

  getForSubject: publicProcedure
    .input(
      z.object({
        subjectId: SubjectIdSchema,
        domain: DomainIdSchema.optional(),
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return getEndorsementsForSubject(input.subjectId, input.domain, {
        limit: input.limit,
        offset: input.offset,
      });
    }),

  getByAuthor: publicProcedure
    .input(
      z.object({
        authorId: PrincipalIdSchema,
        domain: DomainIdSchema.optional(),
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return getEndorsementsByAuthor(input.authorId, {
        domain: input.domain,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  getMine: protectedProcedure
    .input(
      z.object({
        domain: DomainIdSchema.optional(),
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return getEndorsementsByAuthor(ctx.viewer.id, {
        domain: input.domain,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: EndorsementIdSchema,
        ...UpdateEndorsementInputSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      // TODO: Add signature verification for endorsement updates
      const signature = {
        algorithm: 'secp256k1' as const,
        publicKey: '',
        signature: '',
        signedAt: new Date().toISOString(),
      };

      return updateEndorsement(id, ctx.viewer.id, updates, signature);
    }),

  delete: protectedProcedure
    .input(z.object({ id: EndorsementIdSchema }))
    .mutation(async ({ ctx, input }) => {
      return deleteEndorsement(input.id, ctx.viewer.id);
    }),

  getFeed: protectedProcedure
    .input(
      z.object({
        domain: DomainIdSchema.optional(),
        subjectId: SubjectIdSchema.optional(),
        maxHops: z.number().int().min(1).max(4).optional().default(4),
        minTrust: z.number().min(0).max(1).optional().default(0.01),
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
        sortBy: z.enum(['trust', 'date', 'rating']).optional().default('trust'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      return getEndorsementsFromNetwork(ctx.viewer.id, {
        domain: input.domain,
        subjectId: input.subjectId,
        maxHops: input.maxHops,
        minTrust: input.minTrust,
        limit: input.limit,
        offset: input.offset,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      });
    }),
});
