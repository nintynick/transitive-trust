/**
 * tRPC initialization
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { Principal } from '@ttp/shared';

export interface Context {
  viewer: Principal | null;
}

export async function createContext({
  req,
}: CreateFastifyContextOptions): Promise<Context> {
  // In a real app, we'd verify the auth header and look up the principal
  // For now, we'll use a mock principal from the header
  const principalId = req.headers['x-principal-id'] as string | undefined;

  if (!principalId) {
    return { viewer: null };
  }

  // Mock viewer - in production this would be fetched from DB
  const viewer: Principal = {
    id: principalId,
    type: 'user',
    publicKey: '',
    createdAt: new Date(),
    metadata: {},
  };

  return { viewer };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.viewer) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      viewer: ctx.viewer,
    },
  });
});
