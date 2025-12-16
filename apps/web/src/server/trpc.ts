/**
 * tRPC server initialization for Next.js API routes
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Principal } from '@ttp/shared';
import { initDriver, getPrincipalById } from '@ttp/db';

// Initialize Neo4j driver
const neo4jConfig = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'trustpassword',
};

let driverInitialized = false;

function ensureDriver() {
  if (!driverInitialized) {
    initDriver(neo4jConfig);
    driverInitialized = true;
  }
}

export interface Context {
  viewer: Principal | null;
}

export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  ensureDriver();

  const principalId = opts.req.headers.get('x-principal-id');

  if (!principalId) {
    return { viewer: null };
  }

  // Look up the principal
  const principal = await getPrincipalById(principalId);

  return { viewer: principal };
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
