import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// 频道栏目 Router
export const channelRouter = router({
  // 查询频道栏目（一级-栏目及其下级二级-频道）
  getChannels: publicProcedure
    .input(
      z.object({
        appid: z.string().default('jiantie'),
        locale: z.string().default('zh-CN'),
      })
    )
    .query(async ({ ctx, input }) => {
      // 查询"一级-栏目"
      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          class: '一级-栏目',
          appid: input.appid,
          locale: input.locale,
        },
        include: {
          children: {
            where: {
              class: '二级-频道',
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      return channels;
    }),
});
