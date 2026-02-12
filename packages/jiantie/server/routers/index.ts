import { router } from '../trpc';
import { adminAuthRouter } from './adminAuth';
import { adminChannelRouter } from './adminChannel';
import { aiGenerateRouter } from './aiGenerate';
import { aiGenerationLogRouter } from './aiGenerationLog';
import { adminProductRouter } from './adminProduct';
import { adminRoleRouter } from './adminRole';
import { adminSearchRouter } from './adminSearch';
import { adminUserRouter } from './adminUser';
import { adminWorksRouter } from './adminWorks';
import { asyncTaskRouter } from './asyncTask';
import { biRouter } from './bi';
import { channelRouter } from './channel';
import { designerRouter } from './designer';
import { materialResourceRouter } from './materialResource';
import { oldMakaSearchRouter } from './oldMakaSearch';
import { relayRouter } from './relay';
import { riskRouter } from './risk';
import { rsvpRouter } from './rsvp';
import { searchRouter } from './search';
import { templateRouter } from './template';
import { templateAIVectorRouter } from './templateAIVector';
import { themeTaskRouter } from './themeTask';
import { userRouter } from './user';
import { userBehaviorRouter } from './userBehavior';
import { vipRouter } from './vip';
import { worksRouter } from './works';
import { worksAIVectorRouter } from './worksAIVector';
import { worksSpecRouter } from './worksSpec';
import { rolePermissionRouter } from './rolePermission';
import { userResourceRouter } from './userResource';

// 合并所有路由
export const appRouter = router({
  works: worksRouter,
  worksAIVector: worksAIVectorRouter,
  aiGenerate: aiGenerateRouter,
  vip: vipRouter,
  template: templateRouter,
  templateAIVector: templateAIVectorRouter,
  worksSpec: worksSpecRouter,
  themeTask: themeTaskRouter,
  asyncTask: asyncTaskRouter,
  aiGenerationLog: aiGenerationLogRouter,
  rsvp: rsvpRouter,
  relay: relayRouter,
  channel: channelRouter,
  designer: designerRouter,
  adminWorks: adminWorksRouter,
  adminChannel: adminChannelRouter,
  adminProduct: adminProductRouter,
  adminSearch: adminSearchRouter,
  adminUser: adminUserRouter,
  adminRole: adminRoleRouter,
  adminAuth: adminAuthRouter,
  rolePermission: rolePermissionRouter,
  userBehavior: userBehaviorRouter,
  materialResource: materialResourceRouter,
  oldMakaSearch: oldMakaSearchRouter,
  user: userRouter,
  userResource: userResourceRouter,
  risk: riskRouter,
  search: searchRouter,
  bi: biRouter,
});

export type AppRouter = typeof appRouter;
