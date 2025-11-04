import { router } from '../trpc';
import { templateRouter } from './template';
import { worksRouter } from './works';
import { worksSpecRouter } from './worksSpec';
import { rsvpRouter } from './rsvp';

// 合并所有路由
export const appRouter = router({
  works: worksRouter,
  template: templateRouter,
  worksSpec: worksSpecRouter,
  rsvp: rsvpRouter,
});

export type AppRouter = typeof appRouter;
