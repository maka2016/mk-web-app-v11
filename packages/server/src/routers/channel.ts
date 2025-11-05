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
          class: '一级栏目',
          appid: input.appid,
          locale: input.locale,
        },
        include: {
          children: {
            where: {
              class: '二级频道',
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

  // 获取二级频道详情（包含三级热词）
  getChannelDetail: publicProcedure
    .input(
      z.object({
        id: z.number(),
        locale: z.string().default('zh-CN'),
      })
    )
    .query(async ({ ctx, input }) => {
      const channel = await ctx.prisma.templateMarketChannelEntity.findUnique({
        where: {
          id: input.id,
        },
        include: {
          children: {
            where: {
              class: '三级热词',
              locale: input.locale,
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
      });

      return channel;
    }),

  // 获取四级集合列表
  getFourthLevelCollections: publicProcedure
    .input(
      z.object({
        parentId: z.number(),
        locale: z.string().default('zh-CN'),
      })
    )
    .query(async ({ ctx, input }) => {
      const collections = await ctx.prisma.templateMarketChannelEntity.findMany(
        {
          where: {
            parent_id: input.parentId,
            class: '四级集合',
            locale: input.locale,
          },
          orderBy: {
            id: 'asc',
          },
        }
      );

      return collections;
    }),
});
