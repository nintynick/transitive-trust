/**
 * Principal routes
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import {
  CreatePrincipalInputSchema,
  PrincipalIdSchema,
} from '@ttp/shared';
import {
  createPrincipal,
  getPrincipalById,
  listPrincipals,
  updatePrincipalMetadata,
} from '../db';

export const principalsRouter = router({
  create: publicProcedure
    .input(CreatePrincipalInputSchema)
    .mutation(async ({ input }) => {
      return createPrincipal(input);
    }),

  getById: publicProcedure
    .input(z.object({ id: PrincipalIdSchema }))
    .query(async ({ input }) => {
      return getPrincipalById(input.id);
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return listPrincipals(input.limit, input.offset);
    }),

  updateMetadata: protectedProcedure
    .input(
      z.object({
        metadata: z.record(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updatePrincipalMetadata(ctx.viewer.id, input.metadata);
    }),

  // Returns the current user's principal, or null if they haven't registered yet
  // This is a public procedure so new users can check if they need to register
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.viewer) {
      return null;
    }
    return ctx.viewer;
  }),
});
