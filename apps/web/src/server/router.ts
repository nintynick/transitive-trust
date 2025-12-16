/**
 * Main tRPC router combining all sub-routers
 */

import { router } from './trpc';
import { principalsRouter } from './routers/principals';
import { subjectsRouter } from './routers/subjects';
import { trustRouter } from './routers/trust';
import { endorsementsRouter } from './routers/endorsements';
import { queriesRouter } from './routers/queries';

export const appRouter = router({
  principals: principalsRouter,
  subjects: subjectsRouter,
  trust: trustRouter,
  endorsements: endorsementsRouter,
  queries: queriesRouter,
});

export type AppRouter = typeof appRouter;
