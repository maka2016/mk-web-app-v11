import { z } from 'zod';
import {
  getTemplateDataFromOSS,
  saveTemplateDataToOSS,
} from '../oss/works-storage';
import { publicProcedure, router } from '../trpc';

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
      })
    )
    .mutation(async ({ ctx, input }) => {
      let finalInput = { ...input };

      // 如果提供了 designer_works_id，从设计师作品中获取信封配置
      if (input.designer_works_id) {
        const works = await ctx.prisma.worksEntity.findUnique({
          where: { id: input.designer_works_id },
          select: {
            envelope_enabled: true,
            envelope_config: true,
          },
        });

        if (works) {
          // 如果 input 中没有指定信封配置，则从作品中继承
          if (
            input.envelope_enabled === undefined &&
            works.envelope_enabled != null
          ) {
            finalInput.envelope_enabled = works.envelope_enabled;
          }
          if (
            input.envelope_config === undefined &&
            works.envelope_config != null
          ) {
            finalInput.envelope_config = works.envelope_config;
          }
        }
      }

      return ctx.prisma.templateEntity.create({
        data: finalInput,
      });
    }),

  // 查询列表
  findMany: publicProcedure
    .input(
      z
        .object({
          designer_uid: z.number().optional(),
          deleted: z.boolean().optional(),
          spec_id: z.string().optional(),
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.templateEntity.update({
        where: { id },
        data,
      });
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
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input?.designer_uid !== undefined)
        where.designer_uid = input.designer_uid;
      if (input?.deleted !== undefined) where.deleted = input.deleted;

      return ctx.prisma.templateEntity.count({ where });
    }),

  // 获取模板数据（包含详情和 OSS 数据）
  getTemplateData: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const detail = await ctx.prisma.templateEntity.findUnique({
        where: { id: input.id },
      });

      if (!detail) {
        throw new Error('模板不存在');
      }

      if (detail.deleted) {
        throw new Error('模板已删除');
      }

      // 获取 spec 信息
      let specInfo = null;
      if (detail.spec_id) {
        try {
          specInfo = await ctx.prisma.worksSpecEntity.findUnique({
            where: { id: detail.spec_id },
          });
        } catch (error) {
          console.error('Failed to get spec info:', error);
        }
      }

      try {
        const work_data = await getTemplateDataFromOSS(input.id);

        return {
          detail: {
            ...detail,
            specInfo,
          },
          work_data,
        };
      } catch (error) {
        console.error('Failed to get template data:', error);
        // 如果获取 OSS 数据失败，只返回详情
        return {
          detail: {
            ...detail,
            specInfo,
          },
          work_data: null,
        };
      }
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
          cover: true,
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
      return templates.map(template => ({
        ...template,
        spec: template.spec_id ? specMap.get(template.spec_id) : null,
      }));
    }),

  // 从数据创建模板
  createFromData: publicProcedure
    .input(
      z.object({
        title: z.string(),
        desc: z.string().optional(),
        cover: z.string().optional(),
        designer_uid: z.number(),
        spec_id: z.string().optional(),
        designer_works_id: z.string().optional(),
        content: z.any(), // 模板数据
        envelope_enabled: z.boolean().optional(),
        envelope_config: z.any().optional(), // JSON: 信封完整配置（包含6张图片、视频背景等）
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { content, ...templateData } = input;
      let finalTemplateData = { ...templateData };

      // 如果提供了 designer_works_id，从设计师作品中获取信封配置
      if (input.designer_works_id) {
        const works = await ctx.prisma.worksEntity.findUnique({
          where: { id: input.designer_works_id },
          select: {
            envelope_enabled: true,
            envelope_config: true,
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
        }
      }

      // 创建模板记录
      const template = await ctx.prisma.templateEntity.create({
        data: {
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
});
