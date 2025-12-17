/**
 * Trust edge routes
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  CreateTrustEdgeInputSchema,
  CreateDistrustEdgeInputSchema,
  DomainIdSchema,
  PrincipalIdSchema,
} from '@ttp/shared';
import {
  createTrustEdge,
  getTrustEdge,
  getOutgoingTrustEdges,
  getIncomingTrustEdges,
  revokeTrustEdge,
  createDistrustEdge,
  revokeDistrustEdge,
  getTrustNetwork,
  getTrustNetworkWithEndorsements,
  getTrustConnection,
  getPrincipalById,
} from '@ttp/db';
import { TRPCError } from '@trpc/server';
import { verifyPrincipalSignature, hasValidSignature } from '../lib/verify';
import { isAddress } from 'viem';

export const trustRouter = router({
  declareTrust: protectedProcedure
    .input(CreateTrustEdgeInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate Ethereum address format
      if (!isAddress(input.to)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid Ethereum address format.',
        });
      }

      // Can't trust yourself
      if (input.to === ctx.viewer.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot declare trust in yourself.',
        });
      }

      // Check if target principal exists - if not, create as pending
      const targetPrincipal = await getPrincipalById(input.to);
      const isPending = !targetPrincipal;

      // Verify signature if provided
      if (hasValidSignature(input.signature)) {
        const trustData = { to: input.to, weight: input.weight, domain: input.domain };
        const verification = await verifyPrincipalSignature(
          ctx.viewer.id,
          trustData,
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

      return createTrustEdge(ctx.viewer.id, input, signature, { isPending });
    }),

  revokeTrust: protectedProcedure
    .input(z.object({ edgeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return revokeTrustEdge(ctx.viewer.id, input.edgeId);
    }),

  getTrust: protectedProcedure
    .input(
      z.object({
        toId: PrincipalIdSchema,
        domain: DomainIdSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      return getTrustEdge(ctx.viewer.id, input.toId, input.domain);
    }),

  getOutgoing: protectedProcedure
    .input(z.object({ domain: DomainIdSchema.optional() }))
    .query(async ({ ctx, input }) => {
      return getOutgoingTrustEdges(ctx.viewer.id, input.domain);
    }),

  getIncoming: protectedProcedure
    .input(z.object({ domain: DomainIdSchema.optional() }))
    .query(async ({ ctx, input }) => {
      return getIncomingTrustEdges(ctx.viewer.id, input.domain);
    }),

  declareDistrust: protectedProcedure
    .input(CreateDistrustEdgeInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate Ethereum address format
      if (!isAddress(input.to)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid Ethereum address format.',
        });
      }

      // TODO: Add signature support for distrust edges
      const signature = {
        algorithm: 'secp256k1' as const,
        publicKey: '',
        signature: '',
        signedAt: new Date().toISOString(),
      };

      return createDistrustEdge(ctx.viewer.id, input, signature);
    }),

  revokeDistrust: protectedProcedure
    .input(z.object({ edgeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return revokeDistrustEdge(ctx.viewer.id, input.edgeId);
    }),

  getNetwork: protectedProcedure
    .input(
      z.object({
        domain: DomainIdSchema.optional(),
        maxHops: z.number().int().min(1).max(4).optional().default(3),
        minTrust: z.number().min(0).max(1).optional().default(0.1),
        limit: z.number().int().min(1).max(200).optional().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      return getTrustNetwork(ctx.viewer.id, input);
    }),

  getNetworkWithEndorsements: protectedProcedure
    .input(
      z.object({
        domain: DomainIdSchema.optional(),
        maxHops: z.number().int().min(1).max(4).optional().default(3),
        minTrust: z.number().min(0).max(1).optional().default(0.1),
        limit: z.number().int().min(1).max(200).optional().default(100),
        includeEndorsements: z.boolean().optional().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      return getTrustNetworkWithEndorsements(ctx.viewer.id, input);
    }),

  getConnection: protectedProcedure
    .input(
      z.object({
        targetId: PrincipalIdSchema,
        domain: DomainIdSchema.optional(),
        maxHops: z.number().int().min(1).max(4).optional().default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      return getTrustConnection(ctx.viewer.id, input.targetId, {
        domain: input.domain,
        maxHops: input.maxHops,
      });
    }),
});
