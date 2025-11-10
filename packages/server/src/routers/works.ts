import { TRPCError } from '@trpc/server';
import type { WorksSpecEntity } from '@workspace/database/generated/client';
import { z } from 'zod';
import { defaultWorksData } from '../defaultWorksData';
import {
  copyTemplateToWorksAssets,
  copyWorksAssets,
  getUserWorksAssetsPath,
} from '../oss/copy-works-assets';
import {
  getTemplateAssetsPath,
  getTemplateDataFromOSS,
  getWorksDataFromOSS,
  saveWorksDataToOSS,
} from '../oss/works-storage';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { generateWorksId, replacePath } from '../utils/works-utils';

// WorksEntity CRUD Router
export const worksRouter = router({
  // ==================== 作品基础操作 ====================

  // 创建作品
  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        desc: z.string().optional(),
        cover: z.string().optional(),
        template_id: z.string().optional(),
        spec_id: z.string().optional(),
        folder_id: z.string().optional(),
        alias: z.string().optional(),
        appid: z.string().optional(),
        is_folder: z.boolean().optional(),
        is_paied: z.boolean().optional(),
        offline: z.boolean().optional(),
        is_rsvp: z.boolean().optional(),
        envelope_enabled: z.boolean().optional(),
        envelope_config: z.any().optional(), // JSON: 信封完整配置（包含6张图片、视频背景等）
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { template_id } = input;

      // 生成唯一的作品ID（使用认证后的 ctx.uid）
      const worksId = await generateWorksId(ctx.prisma, ctx.uid);

      let createWorksData: any = defaultWorksData;
      let finalInput = { ...input, is_title_desc_modified: false };

      // 如果是从模板创建
      if (template_id) {
        try {
          console.log('[Step 1] 开始从模板创建', {
            template_id,
            uid: ctx.uid,
            worksId,
          });

          // 获取模板详情
          console.log('[Step 2] 查询模板详情...');
          const template = await ctx.prisma.templateEntity.findUnique({
            where: { id: template_id },
          });
          console.log('[Step 2] 模板详情查询完成', {
            found: !!template,
            spec_id: template?.spec_id,
          });

          if (!template) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: '模板不存在',
            });
          }

          // 继承模板配置
          if (template.spec_id) {
            finalInput.spec_id = template.spec_id;
            console.log('[Step 3] 设置规格ID:', template.spec_id);
          }

          // 继承信封配置（只在模板没有被 input 覆盖时继承）
          if (
            input.envelope_enabled === undefined &&
            template.envelope_enabled != null
          ) {
            finalInput.envelope_enabled = template.envelope_enabled;
          }
          if (
            input.envelope_config === undefined &&
            template.envelope_config != null
          ) {
            finalInput.envelope_config = template.envelope_config;
          }
          console.log('[Step 3] 继承信封配置:', {
            envelope_enabled: finalInput.envelope_enabled,
            has_envelope_config: !!finalInput.envelope_config,
          });

          console.log('[Step 4] 计算资源路径...');
          const worksAssetPath = getUserWorksAssetsPath(ctx.uid, worksId);
          const templateAssetPath = getTemplateAssetsPath(template_id);

          console.log('[Step 4] 资源路径计算完成:', {
            worksAssetPath,
            templateAssetPath,
          });

          // 并行获取模板数据和复制资源
          console.log('[Step 5] 开始并行操作: 获取模板数据 + 复制资源...');
          const [templateData] = await Promise.all([
            getTemplateDataFromOSS(template_id),
            copyTemplateToWorksAssets(ctx.uid, worksId, template_id),
          ]);
          console.log('[Step 5] 并行操作完成', {
            templateDataExists: !!templateData,
            templateDataType: typeof templateData,
            templateDataKeys: templateData
              ? Object.keys(templateData).slice(0, 5)
              : [],
          });

          // 替换路径（将模板资源路径替换为作品资源路径）
          console.log('[Step 6] 开始替换路径...');
          console.log('[Step 6.1] 序列化模板数据...');
          const templateDataJSON = JSON.stringify(templateData);
          console.log('[Step 6.1] 序列化完成', {
            jsonLength: templateDataJSON.length,
          });

          console.log('[Step 6.2] 执行路径替换...', {
            from: templateAssetPath,
            to: worksAssetPath,
          });
          const newTemplateJSON = replacePath(
            templateDataJSON,
            templateAssetPath,
            worksAssetPath
          );
          console.log('[Step 6.2] 路径替换完成', {
            newJsonLength: newTemplateJSON.length,
            changed: newTemplateJSON !== templateDataJSON,
          });

          console.log('[Step 7] 解析新的模板数据...');
          createWorksData = JSON.parse(newTemplateJSON);
          console.log('[Step 7] 解析完成', {
            resultType: typeof createWorksData,
            resultKeys: createWorksData
              ? Object.keys(createWorksData).slice(0, 5)
              : [],
          });

          console.log('[Success] ✅ 从模板创建作品数据准备完成');
        } catch (error) {
          console.error('[Error] ❌ 从模板创建失败:', error);
          console.error(
            '[Error] 错误堆栈:',
            error instanceof Error ? error.stack : 'No stack'
          );
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `从模板创建失败: ${error}`,
          });
        }
      }

      // 创建作品数据（使用认证后的 ctx.uid）
      const work = await ctx.prisma.worksEntity.create({
        data: {
          ...finalInput,
          uid: ctx.uid,
          id: worksId,
          version: 1,
          deleted: false,
        },
      });

      // 创建作品 JSON 文件
      try {
        await saveWorksDataToOSS(
          work.id,
          work.uid,
          String(work.version),
          createWorksData
        );
        console.log(`Successfully created works data for ${work.id}`);
      } catch (error) {
        console.error('Failed to create works data:', error);
        // 如果创建 JSON 文件失败，删除已创建的数据库记录
        await ctx.prisma.worksEntity.delete({
          where: { id: work.id },
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '创建作品文件失败',
        });
      }

      return work;
    }),

  // 查询列表（需要登录，自动过滤当前用户的作品）
  findMany: protectedProcedure
    .input(
      z
        .object({
          deleted: z.boolean().optional(),
          is_folder: z.boolean().optional(),
          folder_id: z.string().optional(),
          keyword: z.string().optional(),
          spec_id: z.string().optional(),
          spec_id_not: z.string().optional(),
          template_id: z.string().optional(),
          skip: z.number().optional(),
          take: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        // 自动使用当前用户的 uid
        uid: ctx.uid,
      };

      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.is_folder !== undefined) where.is_folder = input.is_folder;
      if (input?.folder_id !== undefined) where.folder_id = input.folder_id;

      // 规格过滤
      if (input?.spec_id) {
        where.spec_id = input.spec_id;
      }
      if (input?.spec_id_not) {
        where.spec_id = {
          not: input.spec_id_not,
        };
      }

      // 模板过滤
      if (input?.template_id) {
        where.template_id = input.template_id;
      }

      // 关键字搜索（标题）
      if (input?.keyword) {
        where.title = {
          contains: input.keyword,
          mode: 'insensitive', // 不区分大小写
        };
      }

      return ctx.prisma.worksEntity.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { update_time: 'desc' },
      });
    }),

  // 根据ID查询
  findById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const work = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.id },
      });

      if (!work) {
        throw new Error('作品不存在');
      }

      if (work.deleted) {
        throw new Error('作品已删除');
      }

      // 获取 spec 信息
      let specInfo: WorksSpecEntity | null = null;
      if (work.spec_id) {
        try {
          specInfo = await ctx.prisma.worksSpecEntity.findUnique({
            where: { id: work.spec_id },
          });
        } catch (error) {
          console.error('Failed to get spec info:', error);
        }
      }

      return {
        ...work,
        specInfo,
      };
    }),

  // 根据别名查询
  findByAlias: publicProcedure
    .input(z.object({ alias: z.string() }))
    .query(async ({ ctx, input }) => {
      const work = await ctx.prisma.worksEntity.findFirst({
        where: {
          alias: input.alias,
          deleted: false,
        },
      });

      if (!work) {
        throw new Error('作品不存在');
      }

      // 获取 spec 信息
      let specInfo = null;
      if (work.spec_id) {
        try {
          specInfo = await ctx.prisma.worksSpecEntity.findUnique({
            where: { id: work.spec_id },
          });
        } catch (error) {
          console.error('Failed to get spec info:', error);
        }
      }

      return {
        ...work,
        specInfo,
      };
    }),

  // 获取作品数据（包含详情和OSS数据）
  getWorksData: publicProcedure
    .input(
      z.object({
        id: z.string(),
        version: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const detail = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.id },
      });

      if (!detail) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '作品不存在',
        });
      }

      if (detail.deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '作品已删除',
        });
      }

      // 获取 spec 信息
      let specInfo = null;
      if (detail.spec_id) {
        try {
          specInfo = await ctx.prisma.worksSpecEntity.findUnique({
            where: { id: detail.spec_id },
          });
        } catch (error) {
          console.error('[getWorksData] Failed to get spec info:', error);
        }
      }

      try {
        const work_data = await getWorksDataFromOSS(
          input.id,
          detail.uid,
          input.version || 'latest'
        );

        return {
          detail: {
            ...detail,
            specInfo,
          },
          work_data,
        };
      } catch (error) {
        console.error('[getWorksData] Failed to get OSS data:', {
          worksId: input.id,
          uid: detail.uid,
          error,
        });
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

  // 更新作品
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        desc: z.string().optional(),
        cover: z.string().optional(),
        deleted: z.boolean().optional(),
        folder_id: z.string().optional(),
        custom_time: z.date().optional(),
        is_rsvp: z.boolean().optional(),
        is_title_desc_modified: z.boolean().optional(),
        envelope_enabled: z.boolean().optional(),
        envelope_config: z.any().optional(), // JSON: 信封完整配置（包含6张图片、视频背景等）
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 验证作品所有权
      const work = await ctx.prisma.worksEntity.findUnique({
        where: { id },
      });

      if (!work) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '作品不存在',
        });
      }

      if (work.uid !== ctx.uid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权修改此作品',
        });
      }

      return ctx.prisma.worksEntity.update({
        where: { id },
        data,
      });
    }),

  // 保存作品内容
  saveWorksContent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.any(),
        isBackup: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const work = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.id },
      });

      if (!work) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '作品不存在',
        });
      }

      if (work.uid !== ctx.uid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权保存此作品',
        });
      }

      if (work.deleted) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '作品已删除',
        });
      }

      // 如果是备份，则版本号+1
      let newVersion = work.version;
      if (input.isBackup) {
        newVersion = work.version + 1;
      }

      // 保存到 OSS
      try {
        await saveWorksDataToOSS(
          input.id,
          work.uid,
          String(newVersion),
          input.content
        );

        // 更新版本号
        if (input.isBackup) {
          await ctx.prisma.worksEntity.update({
            where: { id: input.id },
            data: { version: newVersion },
          });
        }

        return {
          success: true,
          version: newVersion,
        };
      } catch (error) {
        console.error('Failed to save works content:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '保存作品内容失败',
        });
      }
    }),

  // 删除作品（软删除）
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 验证作品所有权
      const work = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.id },
      });

      if (!work) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '作品不存在',
        });
      }

      if (work.uid !== ctx.uid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权删除此作品',
        });
      }

      return ctx.prisma.worksEntity.update({
        where: { id: input.id },
        data: { deleted: true },
      });
    }),

  // 批量删除作品
  deleteBatch: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        hardDelete: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证所有作品都属于当前用户
      const works = await ctx.prisma.worksEntity.findMany({
        where: {
          id: { in: input.ids },
        },
        select: { id: true, uid: true },
      });

      const unauthorizedWorks = works.filter(work => work.uid !== ctx.uid);
      if (unauthorizedWorks.length > 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '部分作品不属于当前用户，无法删除',
        });
      }

      const updateData: any = { deleted: true };
      if (input.hardDelete) {
        updateData.deleted_confirmed = true;
      }

      return ctx.prisma.worksEntity.updateMany({
        where: {
          id: { in: input.ids },
          uid: ctx.uid, // 额外保护
        },
        data: updateData,
      });
    }),

  // 恢复删除的作品
  recover: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const work = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.id },
      });

      if (!work) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '作品不存在',
        });
      }

      if (work.uid !== ctx.uid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权恢复此作品',
        });
      }

      return ctx.prisma.worksEntity.update({
        where: { id: input.id },
        data: { deleted: false },
      });
    }),

  // 统计数量（需要登录，自动统计当前用户的作品）
  count: protectedProcedure
    .input(
      z
        .object({
          deleted: z.boolean().optional(),
          is_folder: z.boolean().optional(),
          keyword: z.string().optional(),
          spec_id: z.string().optional(),
          spec_id_not: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        // 自动使用当前用户的 uid
        uid: ctx.uid,
      };

      if (input?.deleted !== undefined) where.deleted = input.deleted;
      if (input?.is_folder !== undefined) where.is_folder = input.is_folder;

      // 规格过滤
      if (input?.spec_id) {
        where.spec_id = input.spec_id;
      }
      if (input?.spec_id_not) {
        where.spec_id = {
          not: input.spec_id_not,
        };
      }

      // 关键字搜索（标题）
      if (input?.keyword) {
        where.title = {
          contains: input.keyword,
          mode: 'insensitive',
        };
      }

      return ctx.prisma.worksEntity.count({ where });
    }),

  // 复制作品
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 获取原作品
      const originalWork = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.id },
      });

      if (!originalWork) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '作品不存在',
        });
      }

      if (originalWork.uid !== ctx.uid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权复制此作品',
        });
      }

      // 创建副本（排除 id 和时间字段）
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, create_time, update_time, ...workData } = originalWork;
      const newWorksId = await generateWorksId(ctx.prisma, ctx.uid);

      const newWork = await ctx.prisma.worksEntity.create({
        data: {
          ...workData,
          title: `${originalWork.title} (副本)`,
          child_works_id: null, // 副本不继承发布状态
          id: newWorksId,
        } as any,
      });

      // 复制 OSS 资源
      try {
        await copyWorksAssets(originalWork.uid, originalWork.id, newWork.id);
        console.log(
          `Successfully copied assets from ${originalWork.id} to ${newWork.id}`
        );
      } catch (error) {
        console.error('Failed to copy works assets:', error);
        // 即使 OSS 复制失败，也返回创建的作品记录
      }

      return newWork;
    }),

  // ==================== 文件夹操作 ====================

  // 创建文件夹
  createFolder: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        cover: z.string().optional(),
        works_id: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.worksEntity.create({
        data: {
          title: input.title,
          uid: ctx.uid,
          cover: input.cover,
          is_folder: true,
          child_works_id: JSON.stringify(input.works_id || []),
        },
      });
    }),

  // 删除文件夹
  deleteFolder: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.id },
      });

      if (!folder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '文件夹不存在',
        });
      }

      if (!folder.is_folder) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '该对象不是文件夹',
        });
      }

      if (folder.uid !== ctx.uid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权删除此文件夹',
        });
      }

      // 软删除文件夹
      return ctx.prisma.worksEntity.update({
        where: { id: input.id },
        data: { deleted: true },
      });
    }),

  // 查询文件夹列表
  findFolders: protectedProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.worksEntity.findMany({
        where: {
          uid: ctx.uid,
          is_folder: true,
          deleted: false,
        },
        skip: input.skip,
        take: input.take,
        orderBy: { create_time: 'desc' },
      });
    }),

  // 移动作品到文件夹
  moveWorksToFolder: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        workIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证文件夹存在且属于当前用户
      const folder = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.folderId },
      });

      if (!folder || !folder.is_folder || folder.deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '文件夹不存在',
        });
      }

      if (folder.uid !== ctx.uid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权操作此文件夹',
        });
      }

      // 验证所有作品都属于当前用户
      const works = await ctx.prisma.worksEntity.findMany({
        where: {
          id: { in: input.workIds },
        },
        select: { id: true, uid: true },
      });

      const unauthorizedWorks = works.filter(work => work.uid !== ctx.uid);
      if (unauthorizedWorks.length > 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '部分作品不属于当前用户',
        });
      }

      // 更新作品的 folder_id
      await ctx.prisma.worksEntity.updateMany({
        where: {
          id: { in: input.workIds },
          uid: ctx.uid, // 额外保护
        },
        data: {
          folder_id: input.folderId,
        },
      });

      // 更新文件夹的 child_works_id
      const currentChildIds = folder.child_works_id
        ? JSON.parse(folder.child_works_id)
        : [];
      const newChildIds = [
        ...new Set([...(currentChildIds as string[]), ...input.workIds]),
      ];

      await ctx.prisma.worksEntity.update({
        where: { id: input.folderId },
        data: {
          child_works_id: JSON.stringify(newChildIds),
        },
      });

      return { success: true };
    }),

  // ==================== 回收站操作 ====================

  // 获取回收站列表
  getRecycle: publicProcedure
    .input(
      z.object({
        uid: z.number(),
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.worksEntity.findMany({
        where: {
          uid: input.uid,
          deleted: true,
        },
        skip: input.skip,
        take: input.take,
        orderBy: { update_time: 'desc' },
      });
    }),
});
