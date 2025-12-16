/**
 * Trust edge routes
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import {
  CreateTrustEdgeInputSchema,
  CreateDistrustEdgeInputSchema,
  DomainIdSchema,
  PrincipalIdSchema,
} from '@ttp/shared';
import { signObject } from '@ttp/shared';
import {
  createTrustEdge,
  getTrustEdge,
  getOutgoingTrustEdges,
  getIncomingTrustEdges,
  revokeTrustEdge,
  createDistrustEdge,
  revokeDistrustEdge,
  getTrustNetwork,
} from '@ttp/db';

export const trustRouter = router({
  declareTrust: protectedProcedure
    .input(CreateTrustEdgeInputSchema)
    .mutation(async ({ ctx, input }) => {
      // In a real app, the client would sign the edge
      // Here we create a placeholder signature
      const signature = {
        algorithm: 'ed25519' as const,
        publicKey: '',
        signature: '',
        signedAt: new Date().toISOString(),
      };

      return createTrustEdge(ctx.viewer.id, input, signature);
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
      const signature = {
        algorithm: 'ed25519' as const,
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
});
