import dayjs from 'dayjs';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// 产品BI Router
export const biRouter = router({
  // 查询产品BI数据
  getProductBiDaily: publicProcedure
    .input(
      z.object({
        // 日期范围
        dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
        dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
        // 筛选条件
        appid: z.string().optional(), // 应用ID
        device: z.string().optional(), // 端类型：web、ios、android、wap、miniprogram、other
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, appid, device } = input;

      // 构建查询条件
      const where: any = {};

      // 日期筛选
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          where.date.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          // 设置为当天的结束时间（23:59:59）
          endDate.setHours(23, 59, 59, 999);
          where.date.lte = endDate;
        }
      }

      // appid筛选
      if (appid) {
        where.appid = appid;
      }

      // device筛选
      if (device) {
        where.device = device;
      }

      // 查询数据
      const data = await ctx.prisma.biProductDailyEntity.findMany({
        where,
        orderBy: [{ date: 'desc' }, { appid: 'asc' }, { device: 'asc' }],
      });

      // 序列化日期和Decimal类型
      return data.map(item => ({
        ...item,
        date: item.date.toISOString().split('T')[0],
        gmv: Number(item.gmv),
        create_time: item.create_time.toISOString(),
        update_time: item.update_time.toISOString(),
      }));
    }),

  // 获取可用的appid列表
  getAppids: publicProcedure.query(async ({ ctx }) => {
    const distinctAppids = await ctx.prisma.biProductDailyEntity.findMany({
      select: {
        appid: true,
      },
      distinct: ['appid'],
      orderBy: {
        appid: 'asc',
      },
    });

    return distinctAppids.map(item => item.appid);
  }),

  // 获取可用的device列表
  getDevices: publicProcedure.query(async ({ ctx }) => {
    const distinctDevices = await ctx.prisma.biProductDailyEntity.findMany({
      select: {
        device: true,
      },
      distinct: ['device'],
      orderBy: {
        device: 'asc',
      },
    });

    return distinctDevices.map(item => item.device);
  }),

  // 查询渠道获客BI数据
  getChannelBiDaily: publicProcedure
    .input(
      z.object({
        // 日期范围
        dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
        dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
        // 筛选条件
        appid: z.string().optional(), // 应用ID
        device: z.string().optional(), // 端类型：web、ios、android、wap、miniprogram、other
        source: z.string().optional(), // 渠道标识
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, appid, device, source } = input;

      // 构建查询条件
      const where: any = {};

      // 日期筛选
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          where.date.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          // 设置为当天的结束时间（23:59:59）
          endDate.setHours(23, 59, 59, 999);
          where.date.lte = endDate;
        }
      }

      // appid筛选
      if (appid) {
        where.appid = appid;
      }

      // device筛选
      if (device) {
        where.device = device;
      }

      // source筛选
      if (source) {
        where.source = source;
      }

      // 查询数据
      const data = await ctx.prisma.biChannelDailyEntity.findMany({
        where,
        orderBy: [{ date: 'desc' }, { appid: 'asc' }, { source: 'asc' }, { device: 'asc' }],
      });

      // 序列化日期和Decimal类型
      return data.map(item => ({
        ...item,
        date: item.date.toISOString().split('T')[0],
        gmv_7d: Number(item.gmv_7d),
        gmv_today: Number(item.gmv_today),
        create_time: item.create_time.toISOString(),
        update_time: item.update_time.toISOString(),
      }));
    }),

  // 获取渠道获客可用的appid列表
  getChannelBiAppids: publicProcedure.query(async ({ ctx }) => {
    const distinctAppids = await ctx.prisma.biChannelDailyEntity.findMany({
      select: {
        appid: true,
      },
      distinct: ['appid'],
      orderBy: {
        appid: 'asc',
      },
    });

    return distinctAppids.map(item => item.appid);
  }),

  // 获取渠道获客可用的source列表
  getChannelBiSources: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.appid) {
        where.appid = input.appid;
      }

      const distinctSources = await ctx.prisma.biChannelDailyEntity.findMany({
        where,
        select: {
          source: true,
        },
        distinct: ['source'],
        orderBy: {
          source: 'asc',
        },
      });

      return distinctSources.map(item => item.source);
    }),

  // 获取用户列表的设备列表
  getUserListDevices: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        deleted: false,
      };
      if (input.appid) {
        where.appid = input.appid;
      }

      const distinctDevices = await ctx.prisma.userInfoEntity.findMany({
        where,
        select: {
          register_device: true,
        },
        distinct: ['register_device'],
        orderBy: {
          register_device: 'asc',
        },
      });

      return distinctDevices.map(item => item.register_device).filter((device): device is string => device !== null);
    }),

  // 查询综合面板数据（按用户类型）
  getProductUserTypeBiDaily: publicProcedure
    .input(
      z.object({
        // 日期范围
        dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
        dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
        // 筛选条件
        appid: z.string().optional(), // 应用ID
        device: z.string().optional(), // 端类型：web、ios、android、wap、miniprogram、other
        user_type: z.string().optional(), // 用户类型：new、old
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, appid, device, user_type } = input;

      // 构建查询条件
      const where: any = {};

      // 日期筛选
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          const startDate = new Date(dateFrom);
          startDate.setHours(0, 0, 0, 0);
          where.date.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          // 设置为当天的结束时间（23:59:59）
          endDate.setHours(23, 59, 59, 999);
          where.date.lte = endDate;
        }
      }

      // appid筛选
      if (appid) {
        where.appid = appid;
      }

      // device筛选
      if (device) {
        where.device = device;
      }

      // user_type筛选
      if (user_type) {
        where.user_type = user_type;
      }

      // 查询数据
      const data = await ctx.prisma.biProductUserTypeDailyEntity.findMany({
        where,
        orderBy: [{ date: 'desc' }, { appid: 'asc' }, { device: 'asc' }, { user_type: 'asc' }],
      });

      // 序列化日期和Decimal类型
      return data.map(item => ({
        ...item,
        date: dayjs(item.date).add(1, 'day').format('YYYY-MM-DD'),
        gmv: Number(item.gmv),
        create_time: item.create_time.toISOString(),
        update_time: item.update_time.toISOString(),
      }));
    }),

  // 查询频道BI数据（模板频道）
  getTemplateChannelBiDaily: publicProcedure
    .input(
      z.object({
        // 日期范围
        dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
        dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
        // 筛选条件
        appid: z.string().optional(), // 应用ID
        device: z.string().optional(), // 端类型：web、ios、android、wap、miniprogram、other
        level3HotWordId: z.number().optional(), // 三级热词ID
        level2ChannelId: z.number().optional(), // 二级频道ID
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, appid, device, level3HotWordId, level2ChannelId } = input;

      // 1. 先获取符合条件的四级标签ID列表
      let level4ChannelIds: number[] = [];

      // 构建频道查询的 where 条件（包含 appid 筛选）
      const buildChannelWhere = (baseWhere: any) => {
        const where = { ...baseWhere };
        if (appid) {
          where.appid = appid;
        }
        return where;
      };

      if (level3HotWordId) {
        // 根据三级热词ID筛选四级标签
        const level4Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: buildChannelWhere({
            parent_id: level3HotWordId,
            class: { in: ['level_4', '四级标签'] },
          }),
          select: {
            id: true,
          },
        });
        level4ChannelIds = level4Channels.map(ch => ch.id);
      } else if (level2ChannelId) {
        // 根据二级频道ID筛选四级标签（需要找到三级热词，再找四级标签）
        const level3Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: buildChannelWhere({
            parent_id: level2ChannelId,
            class: { in: ['level_3', '三级热词'] },
          }),
          select: {
            id: true,
          },
        });
        const level3Ids = level3Channels.map(ch => ch.id);
        if (level3Ids.length > 0) {
          const level4Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
            where: buildChannelWhere({
              parent_id: { in: level3Ids },
              class: { in: ['level_4', '四级标签'] },
            }),
            select: {
              id: true,
            },
          });
          level4ChannelIds = level4Channels.map(ch => ch.id);
        }
      } else {
        // 如果没有筛选条件，获取所有四级标签
        const level4Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: buildChannelWhere({
            class: { in: ['level_4', '四级标签'] },
          }),
          select: {
            id: true,
          },
        });
        level4ChannelIds = level4Channels.map(ch => ch.id);
      }

      if (level4ChannelIds.length === 0) {
        return [];
      }

      // 2. 构建查询条件
      const where: any = {
        source: {
          in: level4ChannelIds.map(id => String(id)),
        },
      };

      // 日期筛选
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          const startDate = new Date(dateFrom);
          startDate.setHours(0, 0, 0, 0);
          where.date.gt = new Date(startDate);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          // 设置为当天的结束时间（23:59:59）
          endDate.setHours(23, 0, 0, 0);
          where.date.lte = endDate;
        }
      }

      // appid筛选
      if (appid) {
        where.appid = appid;
      }

      // device筛选
      if (device) {
        where.device = device;
      }

      // 3. 查询数据
      const data = await ctx.prisma.biTemplateChannelDailyEntity.findMany({
        where,
        orderBy: [{ date: 'desc' }, { appid: 'asc' }, { source: 'asc' }, { device: 'asc' }],
      });

      // 4. 获取频道信息并关联
      const channelIds = Array.from(new Set(data.map(item => parseInt(item.source))));
      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          id: { in: channelIds },
        },
        include: {
          parent: {
            include: {
              parent: true,
            },
          },
        },
      });

      const channelMap = new Map(channels.map(ch => [ch.id, ch]));

      // 5. 序列化日期和Decimal类型，并关联频道信息
      return data.map(item => {
        const channelId = parseInt(item.source);
        const channel = channelMap.get(channelId);
        return {
          ...item,
          date: item.date.toISOString().split('T')[0],
          gmv: Number(item.gmv),
          create_time: item.create_time.toISOString(),
          update_time: item.update_time.toISOString(),
          channel: channel
            ? {
                id: channel.id,
                display_name: channel.display_name,
                alias: channel.alias,
                class: channel.class,
                parent: channel.parent
                  ? {
                      id: channel.parent.id,
                      display_name: channel.parent.display_name,
                      alias: channel.parent.alias,
                      class: channel.parent.class,
                      parent: channel.parent.parent
                        ? {
                            id: channel.parent.parent.id,
                            display_name: channel.parent.parent.display_name,
                            alias: channel.parent.parent.alias,
                            class: channel.parent.parent.class,
                            thumb_path: channel.parent.parent.thumb_path,
                          }
                        : null,
                    }
                  : null,
              }
            : null,
        };
      });
    }),

  // 获取可用的三级热词列表
  getLevel3HotWords: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
        level2ChannelId: z.number().optional(), // 如果指定了二级频道，只返回该二级频道下的三级热词
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        class: { in: ['level_3', '三级热词'] },
      };

      if (input.appid) {
        where.appid = input.appid;
      }

      if (input.level2ChannelId) {
        where.parent_id = input.level2ChannelId;
      }

      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where,
        select: {
          id: true,
          display_name: true,
          alias: true,
        },
        orderBy: {
          sort_weight: 'desc',
        },
      });

      return channels;
    }),

  // 获取可用的二级频道列表
  getLevel2Channels: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        class: { in: ['level_2', '二级频道'] },
      };

      if (input.appid) {
        where.appid = input.appid;
      }

      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where,
        select: {
          id: true,
          display_name: true,
          alias: true,
        },
        orderBy: {
          sort_weight: 'desc',
        },
      });

      return channels;
    }),

  // 查询搜索词BI数据
  getSearchTermBiDaily: publicProcedure
    .input(
      z.object({
        // 日期范围
        dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
        dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
        // 筛选条件
        appid: z.string().optional(), // 应用ID
        device: z.string().optional(), // 端类型：web、ios、android、wap、miniprogram、other
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, appid, device } = input;

      // 构建查询条件
      const where: any = {};

      // 日期筛选
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          const startDate = new Date(dateFrom);
          startDate.setHours(0, 0, 0, 0);
          where.date.gte = startDate;
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          // 设置为当天的结束时间（23:59:59）
          endDate.setHours(0, 0, 0, 0);
          where.date.lte = endDate;
        }
      }

      // appid筛选
      if (appid) {
        where.appid = appid;
      }

      // device筛选
      if (device) {
        where.device = device;
      }

      // 查询数据
      const data = await ctx.prisma.biSearchTermDailyEntity.findMany({
        where,
        orderBy: [{ date: 'desc' }, { appid: 'asc' }, { search_word: 'asc' }, { device: 'asc' }],
      });

      // 序列化日期和Decimal类型
      return data.map(item => ({
        ...item,
        date: item.date.toISOString().split('T')[0],
        gmv: Number(item.gmv),
        create_time: item.create_time.toISOString(),
        update_time: item.update_time.toISOString(),
      }));
    }),

  // 查询模板BI数据
  getTemplateBiDaily: publicProcedure
    .input(
      z.object({
        // 日期范围
        dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
        dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
        // 筛选条件
        appid: z.string().optional(), // 应用ID
        template_type: z.string().optional(), // 模板类型：v11、old
        scene_type: z.string().optional(), // 场类型：channel、search、other
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, appid, template_type, scene_type } = input;

      // 构建查询条件
      const where: any = {};

      // 日期筛选
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          where.date.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          // 设置为当天的结束时间（23:59:59）
          endDate.setHours(23, 59, 59, 999);
          where.date.lte = endDate;
        }
      }

      // appid筛选
      if (appid) {
        where.appid = appid;
      }

      // template_type筛选
      if (template_type) {
        where.template_type = template_type;
      }

      // scene_type筛选
      if (scene_type) {
        where.scene_type = scene_type;
      }

      // 查询数据（手动关联模板信息，因为 Prisma schema 中没有定义关系）
      const data = await ctx.prisma.biTemplateDailyEntity.findMany({
        where,
        orderBy: [{ date: 'desc' }, { appid: 'asc' }, { template_id: 'asc' }],
        take: 1000, // 限制返回数量，避免数据过大
      });

      // 获取所有模板ID
      const templateIds = Array.from(new Set(data.map(item => item.template_id)));

      // 批量查询模板信息
      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          id: { in: templateIds },
        },
        include: {
          designer: {
            select: {
              id: true,
              name: true,
              uid: true,
            },
          },
        },
      });

      // 创建模板映射
      const templateMap = new Map(
        templates.map(t => [
          t.id,
          {
            title: t.title,
            cover: (t.coverV3 as { url: string; width: number; height: number } | null)?.url || '',
            designer: t.designer
              ? {
                  id: t.designer.id,
                  name: t.designer.name,
                  uid: t.designer.uid,
                }
              : null,
            create_time: t.create_time ? t.create_time.toISOString().split('T')[0] : null,
          },
        ])
      );

      // 序列化日期和Decimal类型，并关联模板信息
      return data.map(item => {
        const template = templateMap.get(item.template_id);
        return {
          ...item,
          date: item.date.toISOString().split('T')[0],
          gmv: Number(item.gmv),
          create_time: item.create_time.toISOString(),
          update_time: item.update_time.toISOString(),
          template: template || null,
        };
      });
    }),

  // 获取模板列表的频道入口（2、3、4级频道）
  getTemplateListChannels: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        class: {
          in: ['level_2', '二级频道', 'level_3', '三级热词', 'level_4', '四级标签'],
        },
        online: true,
      };

      if (input.appid) {
        where.appid = input.appid;
      }

      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where,
        select: {
          id: true,
          display_name: true,
          alias: true,
          class: true,
          thumb_path: true,
          parent_id: true,
          sort_weight: true,
        },
        orderBy: {
          sort_weight: 'desc',
        },
      });

      // 组织成层级结构
      const level2Channels = channels.filter(ch => ch.class === 'level_2' || ch.class === '二级频道');
      const level3Channels = channels.filter(ch => ch.class === 'level_3' || ch.class === '三级热词');
      const level4Channels = channels.filter(ch => ch.class === 'level_4' || ch.class === '四级标签');

      return {
        level2: level2Channels,
        level3: level3Channels,
        level4: level4Channels,
      };
    }),

  // 获取模板列表
  getTemplateList: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
        level2ChannelId: z.number().optional(),
        level3HotWordId: z.number().optional(),
        level4TagId: z.number().optional(),
        dateRange: z.enum(['today', 'yesterday', '7d', '14d', '30d']).optional().default('7d'),
      })
    )
    .query(async ({ ctx, input }) => {
      const startTime = Date.now();
      console.log('[getTemplateList] 开始执行，参数:', input);

      // 1. 根据筛选条件获取四级标签ID列表
      const step1Start = Date.now();
      let level4ChannelIds: number[] = [];

      if (input.level4TagId) {
        // 直接使用指定的四级标签
        level4ChannelIds = [input.level4TagId];
      } else if (input.level3HotWordId) {
        // 根据三级热词ID筛选四级标签
        const level4Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: {
            parent_id: input.level3HotWordId,
            class: { in: ['level_4', '四级标签'] },
            online: true,
          },
          select: {
            id: true,
          },
        });
        level4ChannelIds = level4Channels.map(ch => ch.id);
      } else if (input.level2ChannelId) {
        // 根据二级频道ID筛选四级标签（需要找到三级热词，再找四级标签）
        const level3Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where: {
            parent_id: input.level2ChannelId,
            class: { in: ['level_3', '三级热词'] },
            online: true,
          },
          select: {
            id: true,
          },
        });
        const level3Ids = level3Channels.map(ch => ch.id);
        if (level3Ids.length > 0) {
          const level4Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
            where: {
              parent_id: { in: level3Ids },
              class: { in: ['level_4', '四级标签'] },
              online: true,
            },
            select: {
              id: true,
            },
          });
          level4ChannelIds = level4Channels.map(ch => ch.id);
        }
      } else {
        // 如果没有筛选条件，获取所有四级标签
        const where: any = {
          class: { in: ['level_4', '四级标签'] },
          online: true,
        };
        if (input.appid) {
          where.appid = input.appid;
        }
        const level4Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
          where,
          select: {
            id: true,
          },
        });
        level4ChannelIds = level4Channels.map(ch => ch.id);
      }
      const step1End = Date.now();
      console.log(
        `[getTemplateList] 步骤1-获取四级标签ID列表: ${step1End - step1Start}ms, 数量: ${level4ChannelIds.length}`
      );

      if (level4ChannelIds.length === 0) {
        console.log('[getTemplateList] 四级标签ID列表为空，直接返回');
        return [];
      }

      // 2. 从四级标签获取模板ID列表
      const step2Start = Date.now();
      const level4Channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          id: { in: level4ChannelIds },
        },
        select: {
          template_ids: true,
        },
      });

      const templateIdSet = new Set<string>();
      for (const ch of level4Channels) {
        if (ch.template_ids && ch.template_ids.length > 0) {
          for (const id of ch.template_ids) {
            if (id) {
              templateIdSet.add(id);
            }
          }
        }
      }

      const templateIds = Array.from(templateIdSet);
      const step2End = Date.now();
      console.log(
        `[getTemplateList] 步骤2-从四级标签获取模板ID列表: ${step2End - step2Start}ms, 模板数量: ${templateIds.length}`
      );

      if (templateIds.length === 0) {
        console.log('[getTemplateList] 模板ID列表为空，直接返回');
        return [];
      }

      // 3. 获取模板基本信息
      const step3Start = Date.now();
      const whereTemplate: any = {
        id: { in: templateIds },
        deleted: false,
      };
      // 根据 appids 数组筛选：检查 appids 数组中是否包含指定的 appid
      if (input.appid) {
        whereTemplate.appids = { has: input.appid };
      }

      const templates = await ctx.prisma.templateEntity.findMany({
        where: whereTemplate,
        include: {
          designer: {
            select: {
              id: true,
              name: true,
              uid: true,
            },
          },
        },
        orderBy: {
          create_time: 'desc',
        },
      });
      const step3End = Date.now();
      console.log(
        `[getTemplateList] 步骤3-获取模板基本信息: ${step3End - step3Start}ms, 模板数量: ${templates.length}`
      );

      // 4. 计算日期范围（根据 dateRange 参数）
      const now = new Date();
      let dateFrom: Date;

      switch (input.dateRange) {
        case 'today': {
          dateFrom = new Date(now);
          dateFrom.setDate(dateFrom.getDate() - 1);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        }
        case 'yesterday': {
          dateFrom = new Date(now);
          dateFrom.setDate(dateFrom.getDate() - 2);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        }
        case '7d': {
          dateFrom = new Date(now);
          dateFrom.setDate(dateFrom.getDate() - 8);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        }
        case '14d': {
          dateFrom = new Date(now);
          dateFrom.setDate(dateFrom.getDate() - 15);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        }
        case '30d': {
          dateFrom = new Date(now);
          dateFrom.setDate(dateFrom.getDate() - 31);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        }
        default: {
          dateFrom = new Date(now);
          dateFrom.setDate(dateFrom.getDate() - 8);
          dateFrom.setHours(0, 0, 0, 0);
        }
      }

      // 如果是当天或昨天，需要精确匹配日期
      const dateTo = new Date(now);
      dateTo.setHours(23, 59, 59, 999);

      // 5. 获取指定日期范围的BI数据
      const step5Start = Date.now();
      const biDataWhere: any = {
        template_id: { in: templateIds },
        ...(input.appid ? { appid: input.appid } : {}),
      };

      if (input.dateRange === 'today' || input.dateRange === 'yesterday') {
        // 当天或昨天：精确匹配日期
        const targetDate = new Date(dateFrom);
        targetDate.setHours(0, 0, 0, 0);
        const targetDateEnd = new Date(targetDate);
        targetDateEnd.setHours(23, 59, 59, 999);
        biDataWhere.date = {
          gt: targetDate,
          lte: targetDateEnd,
        };
      } else {
        // 多天范围：从 dateFrom 到当前
        biDataWhere.date = {
          gte: dateFrom,
        };
      }

      console.log('biDataWhere', biDataWhere);

      const biData = await ctx.prisma.biTemplateDailyEntity.findMany({
        where: biDataWhere,
      });
      const step5End = Date.now();
      console.log(`[getTemplateList] 步骤5-获取近7天BI数据: ${step5End - step5Start}ms, 记录数: ${biData.length}`);

      // 6. 按模板聚合指定日期范围的BI数据
      const step6Start = Date.now();
      const templateBiMap = new Map<
        string,
        {
          exposure_pv: number;
          exposure_uv: number;
          click_pv: number;
          click_uv: number;
          creation_pv: number;
          creation_uv: number;
          intercept_pv: number;
          intercept_uv: number;
          success_pv: number;
          success_uv: number;
          order_count_7d: number;
          gmv_7d: number;
        }
      >();

      for (const bi of biData) {
        const existing = templateBiMap.get(bi.template_id) || {
          exposure_pv: 0,
          exposure_uv: 0,
          click_pv: 0,
          click_uv: 0,
          creation_pv: 0,
          creation_uv: 0,
          intercept_pv: 0,
          intercept_uv: 0,
          success_pv: 0,
          success_uv: 0,
          order_count_7d: 0,
          gmv_7d: 0,
        };

        existing.exposure_pv += bi.exposure_pv;
        existing.exposure_uv += bi.exposure_uv;
        existing.click_pv += bi.click_pv;
        existing.click_uv += bi.click_uv;
        existing.creation_pv += bi.creation_pv;
        existing.creation_uv += bi.creation_uv;
        existing.intercept_pv += bi.intercept_pv;
        existing.intercept_uv += bi.intercept_uv;
        existing.success_pv += bi.success_pv;
        existing.success_uv += bi.success_uv;
        existing.order_count_7d += bi.order_count;
        existing.gmv_7d += Number(bi.gmv);

        templateBiMap.set(bi.template_id, existing);
      }
      const step6End = Date.now();
      console.log(
        `[getTemplateList] 步骤6-按模板聚合BI数据: ${step6End - step6Start}ms, 模板数: ${templateBiMap.size}`
      );

      // 7. 判断是否为新模板（当月、上月）
      const step7Start = Date.now();
      const nowDate = new Date();
      const currentMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
      const lastMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth(), 0, 23, 59, 59, 999);
      const step7End = Date.now();
      console.log(`[getTemplateList] 步骤7-计算新模板标签: ${step7End - step7Start}ms`);

      // 8. 获取模板排序分
      const step8Start = Date.now();
      const sortMetrics = await ctx.prisma.templateSortMetricsEntity.findMany({
        where: {
          template_id: { in: templateIds },
        },
        select: {
          template_id: true,
          composite_score: true,
        },
      });
      const sortScoreMap = new Map(sortMetrics.map(m => [m.template_id, m.composite_score]));
      const step8End = Date.now();
      console.log(`[getTemplateList] 步骤8-获取模板排序分: ${step8End - step8Start}ms, 记录数: ${sortMetrics.length}`);

      // 9. 组合数据
      const step9Start = Date.now();
      const result = templates.map(template => {
        const bi = templateBiMap.get(template.id) || {
          exposure_pv: 0,
          exposure_uv: 0,
          click_pv: 0,
          click_uv: 0,
          creation_pv: 0,
          creation_uv: 0,
          intercept_pv: 0,
          intercept_uv: 0,
          success_pv: 0,
          success_uv: 0,
          order_count_7d: 0,
          gmv_7d: 0,
        };

        const createTime = new Date(template.create_time);
        let newTemplateTag = '';
        if (createTime >= currentMonthStart) {
          newTemplateTag = '当月';
        } else if (createTime >= lastMonthStart && createTime <= lastMonthEnd) {
          newTemplateTag = '上月';
        }

        const compositeScore = sortScoreMap.get(template.id) || 0;

        // 计算各种指标
        const creationUv = bi.creation_uv;
        const gmv = bi.gmv_7d;
        const creationUvValue = creationUv > 0 ? gmv / creationUv : 0;

        // 成功率UV = 成功UV / 创作UV
        const successUv = bi.success_uv;
        const successUvRate = creationUv > 0 ? successUv / creationUv : 0;

        // 拦截PV和UV
        const interceptPv = bi.intercept_pv;
        const interceptUv = bi.intercept_uv;

        // 创作拦截率PV = 拦截PV / 创作PV
        const creationPv = bi.creation_pv;
        const interceptPvRate = creationPv > 0 ? interceptPv / creationPv : 0;

        // 创作拦截率UV = 拦截UV / 创作UV
        const interceptUvRate = creationUv > 0 ? interceptUv / creationUv : 0;

        // 创作订单率UV = 订单数 / 创作UV
        const orderCount = bi.order_count_7d;
        const creationOrderUvRate = creationUv > 0 ? orderCount / creationUv : 0;

        // 处理 coverV3 类型
        const coverV3 = template.coverV3 as { url: string; width: number; height: number } | null;

        return {
          id: template.id,
          title: template.title,
          cover: coverV3?.url || '',
          coverV3: coverV3,
          designer: template.designer
            ? {
                id: template.designer.id,
                name: template.designer.name,
                uid: template.designer.uid,
              }
            : null,
          create_time: template.create_time.toISOString().split('T')[0],
          status: template.deleted ? '已删除' : '正常',
          newTemplateTag,
          // 统计数据（根据日期范围）
          exposure: bi.exposure_pv,
          click: bi.click_pv,
          creation: bi.creation_pv,
          success: bi.success_pv,
          sales: bi.order_count_7d,
          gmv: bi.gmv_7d,
          creation_uv_value: creationUvValue,
          // 新增指标
          success_uv: successUv,
          success_uv_rate: successUvRate,
          intercept_pv: interceptPv,
          intercept_uv: interceptUv,
          intercept_pv_rate: interceptPvRate,
          intercept_uv_rate: interceptUvRate,
          creation_order_uv_rate: creationOrderUvRate,
          // 排序分
          composite_score: compositeScore,
        };
      });
      const step9End = Date.now();
      const totalTime = Date.now() - startTime;
      console.log(`[getTemplateList] 步骤9-组合数据: ${step9End - step9Start}ms, 返回结果数: ${result.length}`);
      console.log(`[getTemplateList] 总耗时: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      return result;
    }),

  // 查询用户列表（带作品数和付费量统计）
  getUserList: publicProcedure
    .input(
      z.object({
        // 搜索条件
        uid: z.number().optional(), // 根据 uid 精确查询
        appid: z.string().optional(), // 应用ID
        register_source: z.string().optional(), // 注册渠道（模糊搜索）
        register_device: z.string().optional(), // 注册设备
        register_date_from: z.string().optional(), // 注册开始日期 YYYY-MM-DD
        register_date_to: z.string().optional(), // 注册结束日期 YYYY-MM-DD
        ad_plan_id: z.string().optional(), // 广告计划ID
        has_order: z.enum(['all', 'yes', 'no']).optional().default('all'), // 是否有订单：全部、有、无
        has_works: z.enum(['all', 'yes', 'no']).optional().default('all'), // 是否有作品：全部、有、无
        // 分页
        skip: z.number().optional().default(0),
        take: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        uid,
        appid,
        register_source,
        register_device,
        register_date_from,
        register_date_to,
        ad_plan_id,
        has_order,
        has_works,
        skip,
        take,
      } = input;

      // 构建用户查询条件
      const where: any = {
        deleted: false,
      };

      if (uid) {
        where.uid = uid;
      }

      if (appid) {
        where.appid = appid;
      }

      if (register_source) {
        if (register_source === 'natural') {
          // natural 实际存储为 null，需要特殊处理
          where.register_source = null;
        } else {
          where.register_source = {
            contains: register_source,
          };
        }
      }

      if (register_device) {
        where.register_device = register_device;
      }

      // 注册时间筛选
      if (register_date_from || register_date_to) {
        where.register_date = {};
        if (register_date_from) {
          where.register_date.gte = new Date(register_date_from);
        }
        if (register_date_to) {
          const endDate = new Date(register_date_to);
          endDate.setHours(23, 59, 59, 999);
          where.register_date.lte = endDate;
        }
      }

      // 广告计划ID筛选
      if (ad_plan_id) {
        where.ad_plan_id = {
          contains: ad_plan_id,
        };
      }

      // 先查询所有符合条件的用户（不分页，用于统计）
      const allUsers = await ctx.prisma.userInfoEntity.findMany({
        where,
        select: {
          uid: true,
          register_date: true,
          register_device: true,
          register_source: true,
          appid: true,
          ad_plan_id: true,
        },
      });

      if (allUsers.length === 0) {
        return {
          users: [],
          total: 0,
        };
      }

      // 获取所有用户ID
      const uids = allUsers.map(u => u.uid);

      // 统计每个用户的作品数
      const worksCounts = await ctx.prisma.worksEntity.groupBy({
        by: ['uid'],
        where: {
          uid: { in: uids },
          deleted: false,
        },
        _count: {
          id: true,
        },
      });

      const worksCountMap = new Map(worksCounts.map(item => [item.uid, item._count.id]));

      // 批量查询所有用户的作品标题（按更新时间倒序）
      const allWorks = await ctx.prisma.worksEntity.findMany({
        where: {
          uid: { in: uids },
          deleted: false,
        },
        select: {
          uid: true,
          title: true,
          update_time: true,
        },
        orderBy: {
          update_time: 'desc',
        },
      });

      // 按用户分组，每个用户只取前5个作品标题
      const worksTitlesMap = new Map<number, string[]>();
      for (const uid of uids) {
        worksTitlesMap.set(uid, []);
      }
      for (const work of allWorks) {
        const titles = worksTitlesMap.get(work.uid);
        if (titles && titles.length < 5) {
          titles.push(work.title || '未命名作品');
        }
      }

      // 直接通过uid查询所有订单记录（不限制work_id，因为用户可能有其他类型的订单）
      const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
        where: {
          uid: { in: uids },
          deleted: false,
          payment_type: {
            not: '', // payment_type 不为空表示已支付
          },
        },
        select: {
          uid: true,
          order_id: true,
          order_amount: true,
        },
      });

      // 按用户聚合订单数和GMV
      const userOrderMap = new Map<number, { count: number; gmv: number }>();
      for (const order of orderRecords) {
        if (order.uid) {
          const existing = userOrderMap.get(order.uid) || { count: 0, gmv: 0 };
          existing.count += 1;
          // order_amount单位为分，转换为元
          const amount = order.order_amount ? order.order_amount / 100 : 0;
          existing.gmv += amount;
          userOrderMap.set(order.uid, existing);
        }
      }

      // 组合数据并应用筛选
      let filteredUsers = allUsers
        .map(user => {
          const worksCount = worksCountMap.get(user.uid) || 0;
          const orderData = userOrderMap.get(user.uid) || { count: 0, gmv: 0 };
          const worksTitles = worksTitlesMap.get(user.uid) || [];
          return {
            uid: user.uid,
            register_date: user.register_date.toISOString().split('T')[0],
            register_device: user.register_device,
            register_source: user.register_source,
            appid: user.appid,
            ad_plan_id: user.ad_plan_id,
            works_count: worksCount,
            works_titles: worksTitles,
            order_count: orderData.count,
            gmv: orderData.gmv,
          };
        })
        .filter(user => {
          // 筛选是否有订单
          if (has_order === 'yes' && user.order_count === 0) {
            return false;
          }
          if (has_order === 'no' && user.order_count > 0) {
            return false;
          }
          // 筛选是否有作品
          if (has_works === 'yes' && user.works_count === 0) {
            return false;
          }
          if (has_works === 'no' && user.works_count > 0) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.order_count - a.order_count); // 按订单数倒序

      // 统计总数
      const total = filteredUsers.length;

      // 分页
      const paginatedUsers = filteredUsers.slice(skip, skip + take);

      return {
        users: paginatedUsers,
        total,
      };
    }),

  // 获取模板产销数据
  getTemplateGenSales: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      // 计算近6个月的开始时间
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1); // 设置为月初
      sixMonthsAgo.setHours(0, 0, 0, 0);

      // 1. 查询近6个月生成的模板
      const baseWhere: any = {
        create_time: {
          gte: sixMonthsAgo,
        },
        deleted: false,
        designer_uid: {
          not: null,
        },
      };

      // 如果提供了 appid，添加筛选条件
      // 需要同时检查 appid 字段和 appids 数组
      const where: any = input.appid
        ? {
            ...baseWhere,
            OR: [{ appid: input.appid }, { appids: { has: input.appid } }],
          }
        : baseWhere;

      const templates = await ctx.prisma.templateEntity.findMany({
        where,
        select: {
          id: true,
          create_time: true,
          designer_uid: true,
          appid: true,
          appids: true,
          designer: {
            select: {
              uid: true,
              name: true,
            },
          },
          sortMetrics: {
            select: {
              publish_time: true,
            },
          },
        },
      });

      // 2. 按生产月数和设计师分组
      // 数据结构: Map<生产月份, Map<设计师UID, 模板列表>>
      const templatesByMonthAndDesigner = new Map<string, Map<number, typeof templates>>();

      for (const template of templates) {
        if (!template.designer_uid) continue;

        const createTime = new Date(template.create_time);
        const monthKey = `${createTime.getFullYear()}${String(createTime.getMonth() + 1).padStart(2, '0')}`; // 格式：202505

        if (!templatesByMonthAndDesigner.has(monthKey)) {
          templatesByMonthAndDesigner.set(monthKey, new Map());
        }

        const designerMap = templatesByMonthAndDesigner.get(monthKey)!;
        if (!designerMap.has(template.designer_uid)) {
          designerMap.set(template.designer_uid, []);
        }

        designerMap.get(template.designer_uid)!.push(template);
      }

      // 3. 获取所有模板ID
      const templateIds = templates.map(t => t.id);

      // 4. 从 order_record_entity 查询订单数据，直接使用订单记录中的 template_id
      const orderWhere: any = {
        deleted: false,
        template_id: {
          not: null,
          in: templateIds,
        },
      };

      // 如果提供了 appid，添加筛选条件
      if (input.appid) {
        orderWhere.appid = input.appid;
      }

      // 查询订单记录
      const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
        where: orderWhere,
        select: {
          template_id: true,
          date: true,
          order_id: true,
          order_amount: true,
        },
      });

      // 按模板ID和日期聚合订单数据
      const statsMap = new Map<string, Map<string, { order_count: number; gmv: number }>>();

      for (const order of orderRecords) {
        // 直接使用订单记录中的 template_id
        const templateId = order.template_id;
        if (!templateId) continue;

        const date = new Date(order.date);
        const statMonthKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!statsMap.has(templateId)) {
          statsMap.set(templateId, new Map());
        }

        const monthStatsMap = statsMap.get(templateId)!;
        if (!monthStatsMap.has(statMonthKey)) {
          monthStatsMap.set(statMonthKey, { order_count: 0, gmv: 0 });
        }

        const stats = monthStatsMap.get(statMonthKey)!;
        stats.order_count += 1;
        // 使用 order_amount 字段计算 GMV（单位为分，转换为元）
        const amount = order.order_amount ? order.order_amount / 100 : 0;
        stats.gmv += amount;
      }

      // 转换为与原来兼容的格式
      const stats: Array<{
        template_id: string;
        date: Date;
        order_count: number;
        gmv: number;
      }> = [];

      for (const [templateId, monthStatsMap] of statsMap) {
        for (const [monthKey, monthStats] of monthStatsMap) {
          // 将月份字符串转换为日期（使用该月的第一天）
          const year = parseInt(monthKey.substring(0, 4));
          const month = parseInt(monthKey.substring(4, 6)) - 1;
          const date = new Date(year, month, 1);

          stats.push({
            template_id: templateId,
            date,
            order_count: monthStats.order_count,
            gmv: monthStats.gmv,
          });
        }
      }

      // 5. 构建模板ID到生产月份的映射
      const templateToMonthMap = new Map<string, string>();
      for (const template of templates) {
        const createTime = new Date(template.create_time);
        const monthKey = `${createTime.getFullYear()}${String(createTime.getMonth() + 1).padStart(2, '0')}`;
        templateToMonthMap.set(template.id, monthKey);
      }

      // 6. 按模板ID和统计月份聚合数据
      // Map<模板ID, Map<统计月份, {销量, 销售额}>>
      const templateStatsMap = new Map<string, Map<string, { sales: number; gmv: number }>>();

      for (const stat of stats) {
        const statDate = new Date(stat.date);
        const statMonthKey = `${statDate.getFullYear()}${String(statDate.getMonth() + 1).padStart(2, '0')}`;

        if (!templateStatsMap.has(stat.template_id)) {
          templateStatsMap.set(stat.template_id, new Map());
        }

        const monthStatsMap = templateStatsMap.get(stat.template_id)!;
        if (!monthStatsMap.has(statMonthKey)) {
          monthStatsMap.set(statMonthKey, { sales: 0, gmv: 0 });
        }

        const monthStats = monthStatsMap.get(statMonthKey)!;
        monthStats.sales += stat.order_count || 0;
        monthStats.gmv += Number(stat.gmv || 0);
      }

      // 7. 生成所有需要显示的月份（从最早的生产月份开始到当前月份）
      const allMonths = new Set<string>();

      // 找到最早的生产月份
      let earliestMonth: Date | null = null;
      for (const template of templates) {
        const createTime = new Date(template.create_time);
        if (!earliestMonth || createTime < earliestMonth) {
          earliestMonth = createTime;
        }
      }

      // 从最早的生产月份到当前月份，生成所有月份
      if (earliestMonth) {
        let currentMonth = new Date(earliestMonth);
        currentMonth.setDate(1); // 设置为月初
        currentMonth.setHours(0, 0, 0, 0);

        const nowMonth = new Date(now);
        nowMonth.setDate(1);
        nowMonth.setHours(0, 0, 0, 0);

        while (currentMonth <= nowMonth) {
          const monthKey = `${currentMonth.getFullYear()}${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
          allMonths.add(monthKey);
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
      }

      const sortedMonths = Array.from(allMonths).sort();

      // 8. 构建结果数据
      const result: Array<{
        productionMonth: string; // 生产月份
        designerUid: number;
        designerName: string;
        templateCount: number; // 上架量
        monthlySales: Record<string, number>; // 周期销量按月聚合
        monthlyGmv: Record<string, number>; // 销售额按月聚合
      }> = [];

      for (const [productionMonth, designerMap] of templatesByMonthAndDesigner) {
        for (const [designerUid, templateList] of designerMap) {
          const designer = templateList[0]?.designer;
          if (!designer) continue;

          // 统计上架量：由于查询时已经筛选了 appid，所以 templateList 中的所有模板都属于该 appid
          const templateCount = templateList.length;

          // 初始化月度数据
          const monthlySales: Record<string, number> = {};
          const monthlyGmv: Record<string, number> = {};

          // 遍历该设计师在该生产月份的所有模板（查询时已筛选过 appid）
          for (const template of templateList) {
            const templateStats = templateStatsMap.get(template.id);
            if (templateStats) {
              for (const [statMonth, stats] of templateStats) {
                // 只统计生产月份之后的月份
                if (statMonth >= productionMonth) {
                  monthlySales[statMonth] = (monthlySales[statMonth] || 0) + stats.sales;
                  monthlyGmv[statMonth] = (monthlyGmv[statMonth] || 0) + stats.gmv;
                }
              }
            }
          }

          result.push({
            productionMonth,
            designerUid,
            designerName: designer.name || `设计师${designerUid}`,
            templateCount,
            monthlySales,
            monthlyGmv,
          });
        }
      }

      // 9. 按生产月份和设计师名称排序
      result.sort((a, b) => {
        if (a.productionMonth !== b.productionMonth) {
          return b.productionMonth.localeCompare(a.productionMonth); // 降序
        }
        return a.designerName.localeCompare(b.designerName);
      });

      return {
        data: result,
        months: sortedMonths,
      };
    }),

  // 获取模板产销订单详情
  getTemplateGenSalesOrderDetails: publicProcedure
    .input(
      z.object({
        appid: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      // 计算近6个月的开始时间
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1); // 设置为月初
      sixMonthsAgo.setHours(0, 0, 0, 0);

      // 1. 查询近6个月生成的模板
      const baseWhere: any = {
        create_time: {
          gte: sixMonthsAgo,
        },
        deleted: false,
        designer_uid: {
          not: null,
        },
      };

      // 如果提供了 appid，添加筛选条件
      const where: any = input.appid
        ? {
            ...baseWhere,
            OR: [{ appid: input.appid }, { appids: { has: input.appid } }],
          }
        : baseWhere;

      const templates = await ctx.prisma.templateEntity.findMany({
        where,
        select: {
          id: true,
          create_time: true,
          designer_uid: true,
          designer: {
            select: {
              uid: true,
              name: true,
            },
          },
        },
      });

      const templateIds = templates.map(t => t.id);
      const templateMap = new Map(
        templates.map(t => [
          t.id,
          {
            createTime: t.create_time,
            designerUid: t.designer_uid!,
            designerName: t.designer?.name || `设计师${t.designer_uid}`,
          },
        ])
      );

      // 2. 查询订单记录（近6个月）
      const orderWhere: any = {
        deleted: false,
        work_id: {
          not: null,
        },
        date: {
          gte: sixMonthsAgo,
        },
      };

      if (input.appid) {
        orderWhere.appid = input.appid;
      }

      const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
        where: orderWhere,
        select: {
          order_id: true,
          payment_time: true,
          order_amount: true,
          work_id: true,
          template_id: true,
          date: true,
        },
      });

      // 3. 构建订单详情数据（直接使用订单记录中的 template_id）
      const orderDetails: Array<{
        orderId: string;
        paymentTime: Date;
        orderAmount: number;
        templateId: string;
        createTime: Date;
        designerUid: number;
        designerName: string;
        date: Date;
      }> = [];

      for (const order of orderRecords) {
        // 直接使用订单记录中的 template_id
        const templateId = order.template_id;
        if (!templateId) continue;

        // 确保模板ID在筛选的模板列表中
        if (!templateIds.includes(templateId)) continue;

        const templateInfo = templateMap.get(templateId);
        if (!templateInfo) continue;

        orderDetails.push({
          orderId: order.order_id,
          paymentTime: order.payment_time,
          orderAmount: order.order_amount ? order.order_amount / 100 : 0, // 转换为元
          templateId,
          createTime: templateInfo.createTime,
          designerUid: templateInfo.designerUid,
          designerName: templateInfo.designerName,
          date: order.date,
        });
      }

      // 5. 按销售日期降序排序
      orderDetails.sort((a, b) => b.date.getTime() - a.date.getTime());

      // 返回原始数据，不进行时区处理和格式化
      return orderDetails.map(order => ({
        ...order,
        paymentTime: order.paymentTime.toISOString(),
        createTime: order.createTime.toISOString(),
        date: order.date.toISOString(),
      }));
    }),

  // 查询ABtest BI数据
  getAbtestBiDaily: publicProcedure
    .input(
      z.object({
        // 日期范围
        dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
        dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
        // 筛选条件
        appid: z.string().optional(), // 应用ID
        device: z.string().optional(), // 端类型：web、ios、android、wap、miniprogram、other
        uidParity: z.enum(['odd', 'even']).optional(), // UID单双号
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, appid, device, uidParity } = input;

      // 构建查询条件
      const where: any = {};

      // 日期筛选
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          where.date.gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          // 设置为当天的结束时间（23:59:59）
          endDate.setHours(23, 59, 59, 999);
          where.date.lte = endDate;
        }
      }

      // appid筛选
      if (appid) {
        where.appid = appid;
      }

      // device筛选
      if (device) {
        where.device = device;
      }

      // uidParity筛选
      if (uidParity) {
        where.uid_parity = uidParity;
      }

      // 查询数据
      const data = await ctx.prisma.biAbtestDailyEntity.findMany({
        where,
        orderBy: [{ date: 'desc' }, { appid: 'asc' }, { device: 'asc' }, { uid_parity: 'asc' }],
      });

      // 序列化日期和Decimal类型
      return data.map(item => ({
        ...item,
        date: item.date.toISOString().split('T')[0],
        active_gmv: Number(item.active_gmv),
        gmv_1d: Number(item.gmv_1d),
        gmv_3d: Number(item.gmv_3d),
        gmv_7d: Number(item.gmv_7d),
        create_time: item.create_time.toISOString(),
        update_time: item.update_time.toISOString(),
      }));
    }),

  // 获取ABtest可用的device列表
  getAbtestDevices: publicProcedure.query(async ({ ctx }) => {
    const distinctDevices = await ctx.prisma.biAbtestDailyEntity.findMany({
      select: {
        device: true,
      },
      distinct: ['device'],
      orderBy: {
        device: 'asc',
      },
    });

    return distinctDevices.map(item => item.device);
  }),
});
