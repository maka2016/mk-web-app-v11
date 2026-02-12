import { z } from 'zod';
import {
  getTemplateDataFromOSS,
  getWorksDataFromOSS,
  saveTemplateDataToOSS,
} from '../oss/works-storage';
import { publicProcedure, router } from '../trpc';
import {
  generateTemplateId,
  getTemplateDataWithOSS,
} from '../utils/works-utils';

// TemplateEntity CRUD Router
export const templateRouter = router({
  // 创建模板
  create: publicProcedure
    .input(
      z.object({
        title: z.string(),
        desc: z.string().optional(),
        cover: z.string().optional(),
        designer_uid: z.number(),
        spec_id: z.string().optional(),
        designer_works_id: z.string().optional(),
        envelope_enabled: z.boolean().optional(),
        envelope_config: z.any().optional(), // JSON: 信封完整配置（包含6张图片、视频背景等）
        relay_config: z.any().optional(), // JSON: 接力功能配置
        rsvp_config: z.any().optional(), // JSON: RSVP功能配置
      })
    )
    .mutation(async ({ ctx, input }) => {
      let finalInput = { ...input };
      let worksData: any = null;

      // 如果提供了 designer_works_id，从设计师作品中获取信封配置、接力配置和JSON数据
      if (input.designer_works_id) {
        const works = await ctx.prisma.worksEntity.findUnique({
          where: { id: input.designer_works_id },
          select: {
            uid: true,
            envelope_enabled: true,
            envelope_config: true,
            spec_id: true,
            relay_config: {
              select: {
                enabled: true,
                button_text: true,
                share_title: true,
                share_desc: true,
                show_user_list: true,
                list_display_mode: true,
                max_relay_count: true,
                theme: true,
                content_prefix: true,
                content_suffix: true,
                enable_message: true,
                message_presets: true,
              },
            },
          },
        });

        if (works) {
          // 如果 input 中没有指定信封配置，则从作品中继承
          Object.assign(finalInput, {
            envelope_enabled: works.envelope_enabled,
            envelope_config: works.envelope_config,
            spec_id: works.spec_id,
          });

          // 如果作品有接力配置，提取并保存到模版
          if (works.relay_config) {
            finalInput.relay_config = works.relay_config as any;
          }

          // 如果 input 中没有指定 RSVP 配置，则从作品中继承
          if (input.rsvp_config === undefined) {
            const rsvpConfig = await ctx.prisma.rsvpFormConfigEntity.findFirst({
              where: { works_id: input.designer_works_id, deleted: false },
            });

            if (rsvpConfig) {
              finalInput.rsvp_config = {
                title: rsvpConfig.title,
                desc: rsvpConfig.desc,
                form_fields: rsvpConfig.form_fields,
                success_feedback_config: rsvpConfig.success_feedback_config,
                enabled: rsvpConfig.enabled,
                collect_form: rsvpConfig.collect_form,
              };
            }
          }

          // 获取作品的JSON数据
          try {
            worksData = await getWorksDataFromOSS(
              input.designer_works_id,
              works.uid,
              'latest'
            );
          } catch (error) {
            console.error(
              'Failed to get works data from OSS:',
              input.designer_works_id,
              error
            );
            // 如果获取失败，继续创建模板，但不保存JSON数据
          }
        }
      }

      // 生成唯一的模板ID
      const templateId = await generateTemplateId(ctx.prisma);

      // 创建模板记录
      const template = await ctx.prisma.templateEntity.create({
        data: {
          id: templateId,
          ...finalInput,
          version: 1,
        },
      });

      // 如果获取到了作品JSON数据，保存到OSS
      if (worksData) {
        try {
          await saveTemplateDataToOSS(template.id, 1, worksData);
        } catch (error) {
          console.error('Failed to save template content to OSS:', error);
          // OSS 保存失败，但模板记录已创建，可以后续修复
        }
      }

      return template;
    }),

  // 查询列表
  findMany: publicProcedure
    .input(
      z
        .object({
          designer_uid: z.number().optional(),
          deleted: z.boolean().optional(),
          spec_id: z.string().optional(),
          template_id: z.string().optional(), // ID包含匹配
          title: z.string().optional(), // 标题模糊搜索
          date_from: z.string().optional(), // 日期范围开始 (ISO string)
          date_to: z.string().optional(), // 日期范围结束 (ISO string)
          ids: z.array(z.string()).optional(), // 精确匹配多个ID
          skip: z.number().optional(),
          take: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.designer_uid !== undefined)
        where.designer_uid = input.designer_uid;
      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.spec_id !== undefined) where.spec_id = input.spec_id;

      // 精确匹配多个ID（优先级高于 template_id 模糊匹配）
      if (input?.ids && input.ids.length > 0) {
        where.id = { in: input.ids };
      } else if (input?.template_id) {
        // ID包含匹配（仅在未指定 ids 时生效）
        where.id = {
          contains: input.template_id,
        };
      }

      // 标题模糊搜索
      if (input?.title) {
        where.title = {
          contains: input.title,
        };
      }

      // 日期范围过滤
      if (input?.date_from || input?.date_to) {
        where.create_time = {};
        if (input.date_from) {
          where.create_time.gte = new Date(input.date_from);
        }
        if (input.date_to) {
          const dateTo = new Date(input.date_to);
          dateTo.setHours(23, 59, 59, 999);
          where.create_time.lte = dateTo;
        }
      }

      return ctx.prisma.templateEntity.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { custom_time: 'desc' },
      });
    }),

  // 根据ID查询
  findById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.templateEntity.findUnique({
        where: { id: input.id },
        include: {
          tags: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      if (!template) {
        return null;
      }

      // 获取 spec 信息
      let specInfo = null;
      if (template.spec_id) {
        try {
          specInfo = await ctx.prisma.worksSpecEntity.findUnique({
            where: { id: template.spec_id },
          });
        } catch (error) {
          console.error('Failed to get spec info:', error);
        }
      }

      return {
        ...template,
        specInfo,
      };
    }),

  // 更新模板
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        desc: z.string().optional(),
        cover: z.string().optional(),
        deleted: z.boolean().optional(),
        custom_time: z.date().optional(),
        version: z.number().optional(),
        envelope_enabled: z.boolean().optional(),
        envelope_config: z.any().optional(), // JSON: 信封完整配置（包含6张图片、视频背景等）
        relay_config: z.any().optional(), // JSON: 接力功能配置
        rsvp_config: z.any().optional(), // JSON: RSVP功能配置
        share_type: z.enum(['invite', 'poster', 'other']).optional(), // 分享类型：invite、poster、other
        coverV3: z
          .object({
            url: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
          })
          .optional(),
        designer_uid: z.number().nullable().optional(),
        appids: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.templateEntity.update({
        where: { id },
        data,
      });
    }),

  // 删除模板标签
  removeTag: publicProcedure
    .input(
      z.object({
        templateId: z.string(),
        tagId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 获取模板当前的所有标签
      const template = await ctx.prisma.templateEntity.findUnique({
        where: { id: input.templateId },
        include: {
          tags: true,
        },
      });

      if (!template) {
        throw new Error('模板不存在');
      }

      // 移除指定的标签
      const remainingTags = template.tags.filter(tag => tag.id !== input.tagId);

      // 更新模板的标签关系
      await ctx.prisma.templateEntity.update({
        where: { id: input.templateId },
        data: {
          tags: {
            set: remainingTags.map(tag => ({ id: tag.id })),
          },
        },
      });

      return { success: true };
    }),

  // 删除模板（软删除）
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.templateEntity.update({
        where: { id: input.id },
        data: { deleted: true },
      });
    }),

  // 统计数量
  count: publicProcedure
    .input(
      z
        .object({
          designer_uid: z.number().optional(),
          deleted: z.boolean().optional(),
          spec_id: z.string().optional(),
          template_id: z.string().optional(), // ID包含匹配
          title: z.string().optional(), // 标题模糊搜索
          date_from: z.string().optional(), // 日期范围开始 (ISO string)
          date_to: z.string().optional(), // 日期范围结束 (ISO string)
          ids: z.array(z.string()).optional(), // 精确匹配多个ID
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.designer_uid !== undefined)
        where.designer_uid = input.designer_uid;
      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.spec_id !== undefined) where.spec_id = input.spec_id;

      // 精确匹配多个ID（优先级高于 template_id 模糊匹配）
      if (input?.ids && input.ids.length > 0) {
        where.id = { in: input.ids };
      } else if (input?.template_id) {
        // ID包含匹配（仅在未指定 ids 时生效）
        where.id = {
          contains: input.template_id,
        };
      }

      // 标题模糊搜索
      if (input?.title) {
        where.title = {
          contains: input.title,
        };
      }

      // 日期范围过滤
      if (input?.date_from || input?.date_to) {
        where.create_time = {};
        if (input.date_from) {
          where.create_time.gte = new Date(input.date_from);
        }
        if (input.date_to) {
          const dateTo = new Date(input.date_to);
          dateTo.setHours(23, 59, 59, 999);
          where.create_time.lte = dateTo;
        }
      }

      return ctx.prisma.templateEntity.count({ where });
    }),

  // 获取模板数据（包含详情和 OSS 数据）
  getTemplateData: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await getTemplateDataWithOSS({
        prisma: ctx.prisma,
        templateId: input.id,
      });

      return {
        detail: result.detail,
        work_data: result.work_data,
        specInfo: result.specInfo,
      };
    }),

  // 获取模板统计数据
  getTemplateStatistics: publicProcedure
    .input(
      z.object({
        id: z.string(),
        appid: z.string().optional(),
        scene_type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const templateId = input.id;

      // 构建查询条件
      const where: any = {
        template_id: templateId,
      };

      if (input.appid) {
        where.appid = input.appid;
      }

      if (input.scene_type) {
        where.scene_type = input.scene_type;
      }

      // 1. 计算历史统计数据（所有时间）
      const allTimeStats = await ctx.prisma.biTemplateDailyEntity.findMany({
        where,
        select: {
          order_count: true,
          gmv: true,
          click_pv: true,
          creation_pv: true,
        },
      });

      // 聚合历史统计数据
      let totalSales = 0;
      let totalGmv = 0;
      let totalClicks = 0;
      let totalCreations = 0;

      for (const stat of allTimeStats) {
        totalSales += stat.order_count || 0;
        totalGmv += Number(stat.gmv || 0);
        totalClicks += stat.click_pv || 0;
        totalCreations += stat.creation_pv || 0;
      }

      // 2. 计算近30天统计数据
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const recent30DaysStats = await ctx.prisma.biTemplateDailyEntity.findMany(
        {
          where: {
            ...where,
            date: {
              gte: thirtyDaysAgo,
            },
          },
          select: {
            order_count: true,
            gmv: true,
            creation_pv: true,
          },
        }
      );

      // 聚合近30天统计数据
      let sales30d = 0;
      let gmv30d = 0;
      let creations30d = 0;

      for (const stat of recent30DaysStats) {
        sales30d += stat.order_count || 0;
        gmv30d += Number(stat.gmv || 0);
        creations30d += stat.creation_pv || 0;
      }

      return {
        // 历史数据
        total_sales: totalSales,
        total_gmv: totalGmv,
        total_clicks: totalClicks,
        total_creations: totalCreations,
        // 近30天数据
        sales_30d: sales30d,
        gmv_30d: gmv30d,
        creations_30d: creations30d,
      };
    }),

  // 获取模板分天统计数据
  getTemplateDailyStatistics: publicProcedure
    .input(
      z.object({
        id: z.string(),
        appid: z.string().optional(),
        scene_type: z.string().optional(),
        dateFrom: z.string().optional(), // 开始日期 YYYY-MM-DD
        dateTo: z.string().optional(), // 结束日期 YYYY-MM-DD
      })
    )
    .query(async ({ ctx, input }) => {
      const templateId = input.id;

      // 构建查询条件
      const where: any = {
        template_id: templateId,
      };

      if (input.appid) {
        where.appid = input.appid;
      }

      if (input.scene_type) {
        where.scene_type = input.scene_type;
      }

      // 日期筛选
      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          const startDate = new Date(input.dateFrom);
          startDate.setHours(0, 0, 0, 0);
          where.date.gte = startDate;
        }
        if (input.dateTo) {
          const endDate = new Date(input.dateTo);
          endDate.setHours(23, 59, 59, 999);
          where.date.lte = endDate;
        }
      }

      // 查询分天数据
      const dailyStats = await ctx.prisma.biTemplateDailyEntity.findMany({
        where,
        select: {
          date: true,
          creation_uv: true,
          success_uv: true,
        },
        orderBy: {
          date: 'asc',
        },
      });

      // 按日期聚合数据（同一天可能有多个appid/scene_type的记录）
      const aggregatedMap = new Map<
        string,
        {
          date: string;
          creation_uv: number;
          success_uv: number;
          success_rate: number; // 创作成功率
        }
      >();

      for (const stat of dailyStats) {
        const dateKey = stat.date.toISOString().split('T')[0];
        if (!aggregatedMap.has(dateKey)) {
          aggregatedMap.set(dateKey, {
            date: dateKey,
            creation_uv: 0,
            success_uv: 0,
            success_rate: 0,
          });
        }
        const aggregated = aggregatedMap.get(dateKey)!;
        aggregated.creation_uv += stat.creation_uv || 0;
        aggregated.success_uv += stat.success_uv || 0;
      }

      // 计算创作成功率
      const result = Array.from(aggregatedMap.values()).map(item => ({
        ...item,
        success_rate:
          item.creation_uv > 0 ? (item.success_uv / item.creation_uv) * 100 : 0,
      }));

      return result;
    }),

  // 保存模板内容到 OSS
  saveTemplateContent: publicProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.any(),
        isBackup: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.templateEntity.findUnique({
        where: { id: input.id },
      });

      if (!template) {
        throw new Error('模板不存在');
      }

      if (template.deleted) {
        throw new Error('模板已删除');
      }

      // 如果是备份，则版本号+1
      let newVersion = template.version || 1;
      if (input.isBackup) {
        newVersion = (template.version || 1) + 1;
      }

      try {
        // 保存到 OSS
        await saveTemplateDataToOSS(input.id, newVersion, input.content);

        // 更新版本号
        if (input.isBackup) {
          await ctx.prisma.templateEntity.update({
            where: { id: input.id },
            data: { version: newVersion },
          });
        }

        return {
          success: true,
          version: newVersion,
        };
      } catch (error) {
        console.error('Failed to save template content:', error);
        throw new Error('保存模板内容失败');
      }
    }),

  // 批量查询模板规格
  findTemplateSpec: publicProcedure
    .input(
      z.object({
        template_ids: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          id: { in: input.template_ids },
          deleted: false,
        },
        select: {
          id: true,
          spec_id: true,
        },
      });

      // 获取规格信息
      const specIds = templates.map(t => t.spec_id).filter(Boolean) as string[];
      const specs = await ctx.prisma.worksSpecEntity.findMany({
        where: {
          id: { in: specIds },
        },
        select: {
          id: true,
          name: true,
          display_name: true,
        },
      });

      // 构建返回结果
      const result: Record<string, { name: string; display_name?: string }> =
        {};

      templates.forEach(template => {
        if (template.spec_id) {
          const spec = specs.find(s => s.id === template.spec_id);
          if (spec) {
            result[template.id] = {
              name: spec.name,
              display_name: spec.display_name || spec.name,
            };
          }
        }
      });

      return result;
    }),

  // 批量获取模板信息（用于集合落地页）
  findManyByIds: publicProcedure
    .input(
      z.object({
        template_ids: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.template_ids.length === 0) {
        return [];
      }

      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          id: { in: input.template_ids },
          deleted: false,
        },
        select: {
          id: true,
          title: true,
          desc: true,
          coverV3: true,
          spec_id: true,
          create_time: true,
          update_time: true,
          custom_time: true,
        },
        orderBy: {
          custom_time: 'desc',
        },
      });

      // 获取规格数据
      const specIds = templates.map(t => t.spec_id).filter(Boolean) as string[];

      const specs = await ctx.prisma.worksSpecEntity.findMany({
        where: {
          id: { in: specIds },
        },
        select: {
          id: true,
          preview_width: true,
          preview_height: true,
        },
      });

      // 构建规格数据映射
      const specMap = new Map(specs.map(s => [s.id, s]));

      // 合并规格数据到模板
      return (
        templates.map(template => ({
          ...template,
          spec: template.spec_id ? specMap.get(template.spec_id) : null,
        })) ?? []
      );
      // templates.forEach(template => {
      //   result[template.id] = {
      //     ...template,
      //     spec: template.spec_id ? specMap.get(template.spec_id) : null,
      //   };
      // });
    }),

  // 从数据创建模板
  createFromData: publicProcedure
    .input(
      z.object({
        title: z.string(),
        desc: z.string().optional(),
        cover: z.string().optional(),
        coverV3: z
          .object({
            url: z.string(),
            width: z.number(),
            height: z.number(),
          })
          .optional(),
        designer_uid: z.number(),
        spec_id: z.string().optional(),
        designer_works_id: z.string().optional(),
        content: z.any(), // 模板数据
        envelope_enabled: z.boolean().optional(),
        envelope_config: z.any().optional(), // JSON: 信封完整配置（包含6张图片、视频背景等）
        relay_config: z.any().optional(), // JSON: 接力功能配置
        rsvp_config: z.any().optional(), // JSON: RSVP功能配置
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { content, ...templateData } = input;
      let finalTemplateData = { ...templateData };

      // 如果提供了 designer_works_id，从设计师作品中获取信封配置、接力配置和RSVP配置
      if (input.designer_works_id) {
        const works = await ctx.prisma.worksEntity.findUnique({
          where: { id: input.designer_works_id },
          select: {
            envelope_enabled: true,
            envelope_config: true,
            relay_config: {
              select: {
                enabled: true,
                button_text: true,
                share_title: true,
                share_desc: true,
                show_user_list: true,
                list_display_mode: true,
                max_relay_count: true,
                theme: true,
                content_prefix: true,
                content_suffix: true,
                enable_message: true,
                message_presets: true,
              },
            },
          },
        });

        if (works) {
          // 如果 input 中没有指定信封配置，则从作品中继承
          if (
            input.envelope_enabled === undefined &&
            works.envelope_enabled != null
          ) {
            finalTemplateData.envelope_enabled = works.envelope_enabled;
          }
          if (
            input.envelope_config === undefined &&
            works.envelope_config != null
          ) {
            finalTemplateData.envelope_config = works.envelope_config;
          }

          // 如果作品有接力配置，提取并保存到模版
          if (works.relay_config && input.relay_config === undefined) {
            finalTemplateData.relay_config = works.relay_config as any;
          }

          // 如果 input 中没有指定 RSVP 配置，则从作品中继承
          if (input.rsvp_config === undefined) {
            const rsvpConfig = await ctx.prisma.rsvpFormConfigEntity.findFirst({
              where: { works_id: input.designer_works_id, deleted: false },
            });

            if (rsvpConfig) {
              finalTemplateData.rsvp_config = {
                title: rsvpConfig.title,
                desc: rsvpConfig.desc,
                form_fields: rsvpConfig.form_fields,
                success_feedback_config: rsvpConfig.success_feedback_config,
                enabled: rsvpConfig.enabled,
                collect_form: rsvpConfig.collect_form,
              };
            }
          }
        }
      }

      // 生成唯一的模板ID
      const templateId = await generateTemplateId(ctx.prisma);

      // 创建模板记录
      const template = await ctx.prisma.templateEntity.create({
        data: {
          id: templateId,
          ...finalTemplateData,
          version: 1,
        },
      });

      // 保存内容到 OSS
      try {
        await saveTemplateDataToOSS(template.id, 1, content);
      } catch (error) {
        console.error('Failed to save template content to OSS:', error);
        // OSS 保存失败，但模板记录已创建，可以后续修复
      }

      return template;
    }),

  // 复制模版
  copy: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sourceTemplate = await ctx.prisma.templateEntity.findUnique({
        where: { id: input.id },
      });
      if (!sourceTemplate) {
        throw new Error('模版不存在');
      }
      const content = await getTemplateDataFromOSS(input.id);
      const templateId = await generateTemplateId(ctx.prisma);
      const newTitle = `${sourceTemplate.title}（副本）`;
      const template = await ctx.prisma.templateEntity.create({
        data: {
          id: templateId,
          title: newTitle,
          desc: sourceTemplate.desc,
          cover: sourceTemplate.cover,
          coverV2: sourceTemplate.coverV2,
          coverV3: sourceTemplate.coverV3 as any,
          designer_uid: sourceTemplate.designer_uid,
          designer_works_id: sourceTemplate.designer_works_id,
          spec_id: sourceTemplate.spec_id,
          appid: sourceTemplate.appid,
          appids: sourceTemplate.appids ?? [],
          envelope_enabled: sourceTemplate.envelope_enabled,
          envelope_config: sourceTemplate.envelope_config as any,
          relay_config: sourceTemplate.relay_config as any,
          rsvp_config: sourceTemplate.rsvp_config as any,
          version: 1,
        },
      });
      try {
        await saveTemplateDataToOSS(template.id, 1, content);
      } catch (error) {
        console.error('Failed to save template content to OSS:', error);
      }
      return template;
    }),

  // 获取模板挂载的所有四级频道（包含层级路径）
  getMountedChannels: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const templateId = input.id;

      // 查询所有包含该模板ID的四级频道
      const level4Channels =
        await ctx.prisma.templateMarketChannelEntity.findMany({
          where: {
            class: { in: ['level_4', '四级标签'] },
            template_ids: {
              has: templateId,
            },
            online: true,
          },
          include: {
            parent: {
              include: {
                parent: true,
              },
            },
          },
        });

      // 构建层级路径信息
      const channelsWithPath = level4Channels.map(channel => {
        const level4 = channel;
        const level3 = channel.parent;
        const level2 = level3?.parent;

        return {
          level4Id: level4.id,
          level4Name: level4.display_name || level4.alias,
          level3Id: level3?.id || null,
          level3Name: level3?.display_name || level3?.alias || null,
          level2Id: level2?.id || null,
          level2Name: level2?.display_name || level2?.alias || null,
          path: level2
            ? `${level2.display_name || level2.alias} - ${level3?.display_name || level3?.alias} - ${level4.display_name || level4.alias}`
            : level3
              ? `${level3.display_name || level3.alias} - ${level4.display_name || level4.alias}`
              : level4.display_name || level4.alias,
        };
      });

      return channelsWithPath;
    }),

  // 批量生成封面（异步任务）
  batchGenerateCovers: publicProcedure
    .input(
      z.object({
        template_ids: z.array(z.string()),
        task_name: z.string(),
        created_by_uid: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 创建异步任务
      const task = await ctx.prisma.asyncTaskEntity.create({
        data: {
          task_type: 'batch_generate_covers',
          task_name: input.task_name,
          input_data: {
            template_ids: input.template_ids,
          },
          created_by_uid: input.created_by_uid || null,
          status: 'pending',
        },
      });

      return {
        success: true,
        task_id: task.id,
        message: '任务已创建，请前往异步任务管理页面查看进度',
      };
    }),

  // 批量重新生成封面（按日期范围，异步任务）
  batchRegenerateCoversByDate: publicProcedure
    .input(
      z.object({
        date_from: z.string(), // 开始日期字符串，例如 "2025-11-04"
        date_to: z.string().optional(), // 结束日期字符串，例如 "2025-11-10"（可选）
        task_name: z.string().optional(),
        created_by_uid: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证日期格式
      const dateFrom = new Date(input.date_from);
      if (isNaN(dateFrom.getTime())) {
        throw new Error('开始日期格式无效');
      }

      if (input.date_to) {
        const dateTo = new Date(input.date_to);
        if (isNaN(dateTo.getTime())) {
          throw new Error('结束日期格式无效');
        }
        if (dateTo < dateFrom) {
          throw new Error('结束日期不能早于开始日期');
        }
      }

      // 生成任务名称（如果未提供）：类型+日期范围
      const dateRangeStr = input.date_to
        ? `${input.date_from}至${input.date_to}`
        : input.date_from;
      const taskName = input.task_name || `修正模版封面_${dateRangeStr}`;

      // 创建异步任务
      const task = await ctx.prisma.asyncTaskEntity.create({
        data: {
          task_type: 'batch_regenerate_covers_by_date' as any,
          task_name: taskName,
          input_data: {
            date_from: input.date_from,
            date_to: input.date_to || undefined,
          },
          created_by_uid: input.created_by_uid || null,
          status: 'pending',
        },
      });

      return {
        success: true,
        task_id: task.id,
        message: '任务已创建，请前往异步任务管理页面查看进度',
      };
    }),
});
