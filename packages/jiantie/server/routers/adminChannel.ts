import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// 管理员频道管理 Router
export const adminChannelRouter = router({
  // 获取频道树形列表
  list: publicProcedure
    .input(
      z.object({
        class: z.string().optional(), // 频道分类筛选：level_1, level_2, level_3, level_4
        locale: z.string().optional(), // 语言筛选
        env: z.string().optional(), // 环境筛选
        appid: z.string().optional(), // 应用ID筛选
        parent_id: z.number().optional(), // 父频道ID筛选
        include_children: z.boolean().default(true), // 是否包含子频道
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input.class) {
        where.class = input.class;
      }
      if (input.locale) {
        where.locale = input.locale;
      }
      if (input.env) {
        where.env = input.env;
      }
      if (input.appid) {
        where.appid = input.appid;
      }
      if (input.parent_id !== undefined) {
        where.parent_id = input.parent_id;
      }

      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where,
        include: input.include_children
          ? {
              children: {
                orderBy: {
                  sort_weight: 'desc',
                },
              },
              parent: true,
            }
          : {
              parent: true,
            },
        orderBy: {
          sort_weight: 'desc',
        },
      });

      return channels;
    }),

  // 根据ID查询频道详情
  findById: publicProcedure
    .input(
      z.object({
        id: z.number(),
        include_children: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const channel = await ctx.prisma.templateMarketChannelEntity.findUnique({
        where: {
          id: input.id,
        },
        include: input.include_children
          ? {
              children: {
                orderBy: {
                  sort_weight: 'desc',
                },
              },
              parent: true,
              filter: true,
              templateEntities: {
                select: {
                  id: true,
                  title: true,
                  coverV3: true,
                },
                take: 100,
              },
            }
          : {
              parent: true,
              filter: true,
              templateEntities: {
                select: {
                  id: true,
                  title: true,
                  coverV3: true,
                },
                take: 100,
              },
            },
      });

      return channel;
    }),

  // 创建频道
  create: publicProcedure
    .input(
      z.object({
        alias: z.string(),
        display_name: z.string(),
        desc: z.string().optional(),
        thumb_path: z.string().optional(),
        class: z.string(), // level_1, level_2, level_3, level_4
        locale: z.string().default('zh-CN'),
        parent_id: z.number().optional(),
        template_ids: z.array(z.string()).default([]),
        templateFilterEntityAlias: z.string().optional(),
        appid: z.string().optional(),
        env: z.string().default('production'),
        online: z.boolean().default(true),
        sort_weight: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查 alias 是否已存在
      const existing = await ctx.prisma.templateMarketChannelEntity.findUnique({
        where: {
          alias: input.alias,
        },
      });

      if (existing) {
        throw new Error(`频道别名 ${input.alias} 已存在`);
      }

      // 如果指定了 parent_id，验证父频道是否存在
      if (input.parent_id) {
        const parent = await ctx.prisma.templateMarketChannelEntity.findUnique({
          where: {
            id: input.parent_id,
          },
        });

        if (!parent) {
          throw new Error(`父频道不存在`);
        }
      }

      return ctx.prisma.templateMarketChannelEntity.create({
        data: {
          alias: input.alias,
          display_name: input.display_name,
          desc: input.desc,
          thumb_path: input.thumb_path,
          class: input.class,
          locale: input.locale,
          parent_id: input.parent_id,
          template_ids: input.template_ids,
          templateFilterEntityAlias: input.templateFilterEntityAlias,
          appid: input.appid,
          env: input.env,
          online: input.online,
          sort_weight: input.sort_weight,
        },
      });
    }),

  // 更新频道
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        alias: z.string().optional(),
        display_name: z.string().optional(),
        desc: z.string().optional(),
        thumb_path: z.string().optional(),
        class: z.string().optional(),
        locale: z.string().optional(),
        parent_id: z.number().optional().nullable(),
        templateFilterEntityAlias: z.string().optional().nullable(),
        appid: z.string().optional(),
        env: z.string().optional(),
        online: z.boolean().optional(),
        sort_weight: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // 如果更新 alias，检查是否与其他频道冲突
      if (updateData.alias) {
        const existing = await ctx.prisma.templateMarketChannelEntity.findFirst(
          {
            where: {
              alias: updateData.alias,
              id: {
                not: id,
              },
            },
          }
        );

        if (existing) {
          throw new Error(`频道别名 ${updateData.alias} 已存在`);
        }
      }

      // 如果更新 parent_id，验证父频道是否存在且不能是自己
      if (updateData.parent_id !== undefined) {
        if (updateData.parent_id === id) {
          throw new Error(`不能将自己设置为父频道`);
        }

        if (updateData.parent_id !== null) {
          const parent =
            await ctx.prisma.templateMarketChannelEntity.findUnique({
              where: {
                id: updateData.parent_id,
              },
            });

          if (!parent) {
            throw new Error(`父频道不存在`);
          }
        }
      }

      return ctx.prisma.templateMarketChannelEntity.update({
        where: {
          id,
        },
        data: updateData,
      });
    }),

  // 更新4级楼层的模板ID列表
  updateTemplateIds: publicProcedure
    .input(
      z.object({
        id: z.number(),
        template_ids: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证频道是否存在且是4级
      const channel = await ctx.prisma.templateMarketChannelEntity.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!channel) {
        throw new Error(`频道不存在`);
      }

      if (channel.class !== 'level_4' && channel.class !== '四级标签') {
        throw new Error(`只能更新4级楼层的模板列表`);
      }

      // 验证模板是否存在
      if (input.template_ids.length > 0) {
        const templates = await ctx.prisma.templateEntity.findMany({
          where: {
            id: {
              in: input.template_ids,
            },
            deleted: false,
          },
          select: {
            id: true,
          },
        });

        const existingIds = templates.map(t => t.id);
        const missingIds = input.template_ids.filter(
          id => !existingIds.includes(id)
        );

        if (missingIds.length > 0) {
          throw new Error(`以下模板不存在: ${missingIds.join(', ')}`);
        }
      }

      // 更新频道的模板ID列表
      await ctx.prisma.templateMarketChannelEntity.update({
        where: {
          id: input.id,
        },
        data: {
          template_ids: input.template_ids,
        },
      });

      // 如果频道有 appid，更新所有绑定模板的 appids 字段
      if (channel.appid) {
        // 获取所有需要更新的模板（包括新增的模板）
        const templatesToUpdate = await ctx.prisma.templateEntity.findMany({
          where: {
            id: {
              in: input.template_ids,
            },
            deleted: false,
          },
          select: {
            id: true,
            appids: true,
          },
        });

        // 批量更新模板的 appids
        for (const template of templatesToUpdate) {
          const currentAppids = template.appids || [];
          // 如果 appid 不在当前 appids 中，则添加
          if (!currentAppids.includes(channel.appid)) {
            const updatedAppids = [
              ...new Set([...currentAppids, channel.appid]),
            ];
            await ctx.prisma.templateEntity.update({
              where: { id: template.id },
              data: {
                appids: updatedAppids,
              },
            });
          }
        }
      }

      return { success: true };
    }),

  // 删除频道（软删除，实际是设置 online=false）
  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查是否有子频道
      const children = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          parent_id: input.id,
        },
      });

      if (children.length > 0) {
        throw new Error(
          `该频道下有 ${children.length} 个子频道，请先删除子频道`
        );
      }

      // 软删除：设置 online=false
      return ctx.prisma.templateMarketChannelEntity.update({
        where: {
          id: input.id,
        },
        data: {
          online: false,
        },
      });
    }),

  // 获取模板列表（用于选择模板）
  getTemplates: publicProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        channel_id: z.number().optional(), // 频道ID筛选（2、3、4级）
        skip: z.number().default(0),
        take: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        deleted: false,
      };

      // 如果指定了频道ID，需要获取该频道及其所有子频道（2、3、4级）的模板ID
      if (input.channel_id) {
        // 递归获取频道及其所有子频道的模板ID
        const getAllTemplateIds = async (
          channelId: number
        ): Promise<string[]> => {
          const channel =
            await ctx.prisma.templateMarketChannelEntity.findUnique({
              where: { id: channelId },
              include: {
                children: {
                  orderBy: {
                    sort_weight: 'desc',
                  },
                },
              },
            });

          if (!channel) {
            return [];
          }

          let templateIds: string[] = [];

          // 如果是4级频道，直接获取其模板ID
          if (
            channel.class === 'level_4' ||
            channel.class === '四级标签'
          ) {
            templateIds = channel.template_ids || [];
          }

          // 递归获取所有子频道的模板ID
          if (channel.children && channel.children.length > 0) {
            for (const child of channel.children) {
              const childTemplateIds = await getAllTemplateIds(child.id);
              templateIds = [...templateIds, ...childTemplateIds];
            }
          }

          // 去重
          return [...new Set(templateIds)];
        };

        const templateIds = await getAllTemplateIds(input.channel_id);

        if (templateIds.length > 0) {
          where.id = {
            in: templateIds,
          };
        } else {
          // 如果没有找到任何模板，返回空结果
          return {
            templates: [],
            total: 0,
          };
        }
      }

      if (input.keyword) {
        const keywordFilter = {
          OR: [
            {
              title: {
                contains: input.keyword,
              },
            },
            {
              id: {
                contains: input.keyword,
              },
            },
          ],
        };

        // 如果已经有 where.id 条件，需要合并
        if (where.id) {
          where.AND = [
            { id: where.id },
            keywordFilter,
          ];
          delete where.id;
        } else {
          where.OR = keywordFilter.OR;
        }
      }

      const [templates, total] = await Promise.all([
        ctx.prisma.templateEntity.findMany({
          where,
          select: {
            id: true,
            title: true,
            cover: true,
            coverV2: true,
            coverV3: true,
            desc: true,
          },
          skip: input.skip,
          take: input.take,
          orderBy: {
            custom_time: 'desc',
          },
        }),
        ctx.prisma.templateEntity.count({ where }),
      ]);

      return {
        templates,
        total,
      };
    }),

  // 按模板ID获取已上架频道列表（用于展示模板已上架频道）
  getChannelsByTemplateIds: publicProcedure
    .input(
      z.object({
        template_ids: z.array(z.string()).min(1),
        env: z.string().optional().default('production'),
      })
    )
    .query(async ({ ctx, input }) => {
      const channels = await ctx.prisma.templateMarketChannelEntity.findMany({
        where: {
          online: true,
          env: input.env,
          template_ids: {
            hasSome: input.template_ids,
          },
        },
        include: {
          parent: {
            include: {
              parent: {
                include: {
                  parent: true,
                },
              },
            },
          },
        },
        orderBy: {
          sort_weight: 'desc',
        },
      });

      const buildPath = (channel: any): string => {
        const names: string[] = [];
        const collect = (node: any | null | undefined) => {
          if (!node) return;
          const name = node.display_name || node.alias;
          if (name) {
            names.push(name);
          }
        };

        const stack: any[] = [];
        let current: any | null = channel;
        while (current) {
          stack.push(current);
          current = current.parent ?? null;
        }
        stack.reverse().forEach(collect);

        return names.join(' / ');
      };

      const result: Record<
        string,
        {
          id: number;
          display_name: string;
          alias: string;
          class: string;
          locale: string;
          appid: string | null;
          env: string;
          path: string;
        }[]
      > = {};

      for (const channel of channels) {
        const ids = channel.template_ids || [];
        const path = buildPath(channel);
        for (const templateId of ids) {
          if (!input.template_ids.includes(templateId)) continue;
          if (!result[templateId]) {
            result[templateId] = [];
          }
          result[templateId].push({
            id: channel.id,
            display_name: channel.display_name,
            alias: channel.alias,
            class: channel.class,
            locale: channel.locale,
            appid: channel.appid,
            env: channel.env,
            path,
          });
        }
      }

      return result;
    }),
});
