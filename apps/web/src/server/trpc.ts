/**
 * tRPC server initialization for Next.js API routes
 *
 * Currently using mock data. To switch back to Neo4j:
 * 1. Update db.ts to export from @ttp/db instead of ./mock-db.js
 * 2. Ensure NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD are set
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { Principal } from '@ttp/shared';
import superjson from 'superjson';
import { isAddress } from 'viem';
import { initDriver, getOrCreatePrincipal } from './db';

// Initialize driver (no-op in mock mode)
let driverInitialized = false;

function ensureDriver() {
  if (!driverInitialized) {
    initDriver({});
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

  // The header contains the wallet address
  const walletAddress = opts.req.headers.get('x-principal-id');

  if (!walletAddress) {
    return { viewer: null };
  }

  // Validate that it's a proper Ethereum address
  if (!isAddress(walletAddress)) {
    console.warn(`Invalid Ethereum address received: ${walletAddress}`);
    return { viewer: null };
  }

  // Get or create the principal - no separate registration needed
  const principal = await getOrCreatePrincipal(walletAddress);

  return { viewer: principal };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

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
