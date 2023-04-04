import { createTRPCRouter } from "~/server/api/trpc";
import { messageRouter } from "~/server/api/routers/message";
import { s3Router } from "~/server/api/routers/s3";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  msg: messageRouter,
  s3: s3Router,
});

// export type definition of API
export type AppRouter = typeof appRouter;
