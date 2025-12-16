/**
 * Root tRPC router
 */

import { router } from './trpc.js';
import { principalsRouter } from './routers/principals.js';
import { subjectsRouter } from './routers/subjects.js';
import { trustRouter } from './routers/trust.js';
import { endorsementsRouter } from './routers/endorsements.js';
import { queriesRouter } from './routers/queries.js';

export const appRouter = router({
  principals: principalsRouter,
  subjects: subjectsRouter,
  trust: trustRouter,
  endorsements: endorsementsRouter,
  queries: queriesRouter,
});

export type AppRouter = typeof appRouter;
