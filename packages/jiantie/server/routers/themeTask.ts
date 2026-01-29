import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

const themeTaskStatusSchema = z.enum([
  'pending_review',
  'in_progress',
  'completed',
]);
const themeTaskSubmissionReviewStatusSchema = z.enum([
  'pending',
  'approved',
  'changes_requested',
  'rejected',
]);

export const themeTaskRouter = router({
  // -----------------------------
  // Task CRUD (运营侧)
  // -----------------------------
  createTask: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        desc: z.string().optional(),
        material_class_id: z.string().optional(),
        spec_id: z.string().optional(),
        designer_uid: z.number().optional(),
        designer_uids: z.array(z.number()).optional(),
        created_by_uid: z.number().optional(),
        due_at: z.string().datetime().optional(),
        status: themeTaskStatusSchema.optional(),
        style: z.string().optional(),
        sample_images: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const designerUidsRaw =
        input.designer_uids && input.designer_uids.length > 0
          ? input.designer_uids
          : input.designer_uid
            ? [input.designer_uid]
            : [];

      // 防御性：前端可能会传入重复 UID，关联表有唯一约束(theme_task_id, designer_uid)
      const designerUids = Array.from(new Set(designerUidsRaw));

      const task = await ctx.prisma.themeTaskEntity.create({
        data: {
          title: input.title,
          desc: input.desc || null,
          status: input.status || 'in_progress',
          material_class_id: input.material_class_id || null,
          spec_id: input.spec_id || null,
          designer_uid: designerUids.length > 0 ? designerUids[0] : null, // 保留第一个用于向后兼容
          created_by_uid: input.created_by_uid || null,
          due_at: input.due_at ? new Date(input.due_at) : null,
          style: input.style || null,
          sample_images: input.sample_images && input.sample_images.length > 0 ? input.sample_images : (null as any),
          designers: {
            create: designerUids.map(uid => ({
              designer_uid: uid,
            })),
          },
        },
        include: {
          designers: true,
        },
      });
      return task;
    }),

  updateTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        desc: z.string().optional().nullable(),
        material_class_id: z.string().optional().nullable(),
        spec_id: z.string().optional().nullable(),
        designer_uid: z.number().optional().nullable(),
        designer_uids: z.array(z.number()).optional(),
        due_at: z.string().datetime().optional().nullable(),
        status: themeTaskStatusSchema.optional(),
        style: z.string().optional().nullable(),
        sample_images: z.array(z.string()).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.themeTaskEntity.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '任务单不存在' });
      }

      // 处理设计师列表
      const designerUids = input.designer_uids !== undefined
        ? input.designer_uids
        : input.designer_uid !== undefined
          ? input.designer_uid === null
            ? []
            : [input.designer_uid]
          : undefined;

      const task = await ctx.prisma.$transaction(async prisma => {
        // 更新任务单基本信息
        const updated = await prisma.themeTaskEntity.update({
          where: { id: input.id },
          data: {
            title: input.title ?? undefined,
            desc: input.desc === undefined ? undefined : input.desc,
            material_class_id:
              input.material_class_id === undefined
                ? undefined
                : input.material_class_id,
            spec_id: input.spec_id === undefined ? undefined : input.spec_id,
            designer_uid:
              designerUids !== undefined && designerUids.length > 0
                ? designerUids[0]
                : input.designer_uid === undefined
                  ? undefined
                  : input.designer_uid, // 保留第一个用于向后兼容
            due_at:
              input.due_at === undefined
                ? undefined
                : input.due_at
                  ? new Date(input.due_at)
                  : null,
            status: input.status ?? undefined,
            style: input.style === undefined ? undefined : input.style,
            sample_images:
              input.sample_images === undefined
                ? undefined
                : input.sample_images && input.sample_images.length > 0
                  ? input.sample_images
                  : (null as any),
          },
        });

        // 更新设计师关联
        if (designerUids !== undefined) {
          // 删除旧的关联
          await prisma.themeTaskDesignerEntity.deleteMany({
            where: { theme_task_id: input.id },
          });

          // 创建新的关联
          if (designerUids.length > 0) {
            await prisma.themeTaskDesignerEntity.createMany({
              data: designerUids.map(uid => ({
                theme_task_id: input.id,
                designer_uid: uid,
              })),
            });
          }
        }

        return updated;
      });

      return task;
    }),

  listTasks: publicProcedure
    .input(
      z
        .object({
          status: themeTaskStatusSchema.optional(),
          designer_uid: z.number().optional(),
          material_class_id: z.string().optional(),
          spec_id: z.string().optional(),
          keyword: z.string().optional(),
          skip: z.number().optional().default(0),
          take: z.number().optional().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { deleted: false };
      if (input?.status) where.status = input.status;
      if (input?.designer_uid !== undefined) where.designer_uid = input.designer_uid;
      if (input?.material_class_id) where.material_class_id = input.material_class_id;
      if (input?.spec_id) where.spec_id = input.spec_id;
      if (input?.keyword) {
        where.OR = [
          { title: { contains: input.keyword } },
          { desc: { contains: input.keyword } },
        ];
      }

      const [data, total] = await Promise.all([
        ctx.prisma.themeTaskEntity.findMany({
          where,
          skip: input?.skip ?? 0,
          take: input?.take ?? 20,
          orderBy: { create_time: 'desc' },
          include: {
            material_class: { select: { id: true, name: true } },
            specInfo: { select: { id: true, name: true, display_name: true } },
            designers: { select: { designer_uid: true } },
            _count: { select: { submissions: true } },
          },
        }),
        ctx.prisma.themeTaskEntity.count({ where }),
      ]);

      return { data, total };
    }),

  getTaskById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.prisma.themeTaskEntity.findUnique({
        where: { id: input.id },
        include: {
          material_class: { select: { id: true, name: true } },
          specInfo: { select: { id: true, name: true, display_name: true } },
          designers: { select: { designer_uid: true } },
          _count: { select: { submissions: true } },
        },
      });
      return task;
    }),

  // -----------------------------
  // Submissions (设计师提交 & 运营查看)
  // -----------------------------
  listSubmissionsByTask: publicProcedure
    .input(
      z.object({
        theme_task_id: z.string(),
        review_status: themeTaskSubmissionReviewStatusSchema.optional(),
        designer_uid: z.number().optional(),
        skip: z.number().optional().default(0),
        take: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { theme_task_id: input.theme_task_id };
      if (input.review_status) where.review_status = input.review_status;
       if (input.designer_uid !== undefined) where.designer_uid = input.designer_uid;

      const [data, total] = await Promise.all([
        ctx.prisma.themeTaskSubmissionEntity.findMany({
          where,
          skip: input.skip ?? 0,
          take: input.take ?? 20,
          orderBy: { submit_time: 'desc' },
          include: {
            works: {
              select: {
                id: true,
                title: true,
                desc: true,
                cover: true,
                uid: true,
                create_time: true,
                update_time: true,
                spec_id: true,
                specInfo: {
                  select: {
                    id: true,
                    name: true,
                    display_name: true,
                    export_format: true,
                    is_flip_page: true,
                  },
                },
              },
            },
          },
        }),
        ctx.prisma.themeTaskSubmissionEntity.count({ where }),
      ]);

      return { data, total };
    }),

  deleteSubmission: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.prisma.themeTaskSubmissionEntity.findUnique({
        where: { id: input.id },
      });
      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '提交记录不存在' });
      }

      await ctx.prisma.$transaction(async prisma => {
        // 先删除所有审核日志，再删除提交记录，避免外键约束报错
        await prisma.themeTaskReviewLogEntity.deleteMany({
          where: { submission_id: input.id },
        });

        await prisma.themeTaskSubmissionEntity.delete({
          where: { id: input.id },
        });
      });

      return { success: true };
    }),

  submitWorkToTask: publicProcedure
    .input(
      z.object({
        theme_task_id: z.string(),
        works_id: z.string(),
        designer_uid: z.number(),
        designer_note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.themeTaskEntity.findUnique({
        where: { id: input.theme_task_id },
      });
      if (!task || task.deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '任务单不存在' });
      }
      if (task.status !== 'in_progress') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '任务单未处于进行中，无法提交',
        });
      }

      // 校验作品存在
      const works = await ctx.prisma.worksEntity.findUnique({
        where: { id: input.works_id },
        select: { id: true },
      });
      if (!works) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '作品不存在' });
      }

      // upsert：同一任务单下同一作品只保留一条记录
      const submission = await ctx.prisma.themeTaskSubmissionEntity.upsert({
        where: {
          theme_task_id_works_id: {
            theme_task_id: input.theme_task_id,
            works_id: input.works_id,
          },
        },
        create: {
          theme_task_id: input.theme_task_id,
          works_id: input.works_id,
          designer_uid: input.designer_uid,
          review_status: 'pending',
          designer_note: input.designer_note ?? null,
          submit_time: new Date(),
        },
        update: {
          designer_uid: input.designer_uid,
          review_status: 'pending',
          review_note: null,
          reviewed_at: null,
          reviewer_uid: null,
          designer_note: input.designer_note ?? null,
          submit_time: new Date(),
        },
        include: {
          works: {
            select: {
              id: true,
              title: true,
              desc: true,
              cover: true,
              uid: true,
              create_time: true,
              update_time: true,
              spec_id: true,
            },
          },
        },
      });

      return submission;
    }),

  // -----------------------------
  // Review (运营审核 + 日志)
  // -----------------------------
  reviewSubmission: publicProcedure
    .input(
      z.object({
        submission_id: z.string(),
        to_review_status: z.enum(['approved', 'changes_requested', 'rejected']),
        reviewer_uid: z.number(),
        review_note: z.string().optional(),
        review_images: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async prisma => {
        const submission = await prisma.themeTaskSubmissionEntity.findUnique({
          where: { id: input.submission_id },
          include: { themeTask: true },
        });
        if (!submission) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '提交记录不存在' });
        }
        if (submission.themeTask.deleted) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '任务单已删除' });
        }
        if (submission.themeTask.status === 'completed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '任务单已完成，无法审核',
          });
        }

        const fromStatus = submission.review_status;
        const toStatus = input.to_review_status;

        const updated = await prisma.themeTaskSubmissionEntity.update({
          where: { id: submission.id },
          data: {
            review_status: toStatus,
            review_note: input.review_note || null,
            reviewer_uid: input.reviewer_uid,
            reviewed_at: new Date(),
            review_images:
              input.review_images && input.review_images.length > 0
                ? input.review_images
                : (null as any),
          },
          include: {
            works: {
              select: {
                id: true,
                title: true,
                desc: true,
                cover: true,
                uid: true,
                create_time: true,
                update_time: true,
                spec_id: true,
              },
            },
          },
        });

        await prisma.themeTaskReviewLogEntity.create({
          data: {
            submission_id: submission.id,
            from_review_status: fromStatus,
            to_review_status: toStatus,
            reviewer_uid: input.reviewer_uid,
            review_note: input.review_note || null,
            review_images:
              input.review_images && input.review_images.length > 0
                ? input.review_images
                : (null as any),
          },
        });

        return updated;
      });

      return result;
    }),

  listReviewLogs: publicProcedure
    .input(z.object({ submission_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.prisma.themeTaskReviewLogEntity.findMany({
        where: { submission_id: input.submission_id },
        orderBy: { create_time: 'desc' },
      });
      return logs;
    }),

  deleteReviewLog: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.prisma.themeTaskReviewLogEntity.findUnique({
        where: { id: input.id },
        select: { id: true, create_time: true },
      });
      if (!log) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '审核历史不存在' });
      }

      const createTimeMs = log.create_time
        ? new Date(log.create_time).getTime()
        : 0;
      const nowMs = Date.now();
      const oneHourMs = 60 * 60 * 1000;
      if (!createTimeMs || nowMs - createTimeMs > oneHourMs) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '内容已归档不允许删除',
        });
      }

      await ctx.prisma.themeTaskReviewLogEntity.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // -----------------------------
  // Designer helper queries
  // -----------------------------
  listOpenTasksForDesigner: publicProcedure
    .input(z.object({ designer_uid: z.number() }))
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.prisma.themeTaskEntity.findMany({
        where: {
          deleted: false,
          status: 'in_progress',
          OR: [
            { designer_uid: input.designer_uid }, // 向后兼容旧字段
            { designers: { some: { designer_uid: input.designer_uid } } }, // 新的多对多关系
          ],
        },
        orderBy: { create_time: 'desc' },
        select: {
          id: true,
          title: true,
          desc: true,
          material_class: { select: { id: true, name: true } },
          specInfo: { select: { id: true, display_name: true, name: true } },
        },
      });
      return tasks;
    }),

  getSubmissionStatusesForWorks: publicProcedure
    .input(
      z.object({
        theme_task_id: z.string(),
        works_ids: z.array(z.string()).min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.themeTaskSubmissionEntity.findMany({
        where: {
          theme_task_id: input.theme_task_id,
          works_id: { in: input.works_ids },
        },
        select: {
          works_id: true,
          review_status: true,
          reviewed_at: true,
          reviewer_uid: true,
          review_note: true,
          review_images: true,
          designer_note: true,
          submit_time: true,
          id: true,
        },
      });

      const map: Record<string, (typeof rows)[number]> = {};
      for (const row of rows) {
        map[row.works_id] = row;
      }
      return map;
    }),

  // 获取该主题任务下所有提交作品创建的模板列表
  listTemplatesByTask: publicProcedure
    .input(z.object({ theme_task_id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. 获取该主题任务下的所有提交作品（通过关联查询）
      const submissions = await ctx.prisma.themeTaskSubmissionEntity.findMany({
        where: { theme_task_id: input.theme_task_id },
        include: {
          works: {
            select: {
              id: true,
            },
          },
        },
      });

      const worksIds = submissions
        .map(s => s.works?.id)
        .filter((id): id is string => !!id);

      if (worksIds.length === 0) {
        return [];
      }

      // 2. 通过关联关系查询这些作品创建的模板
      // 使用 designer_works_id 字段查询（关联关系已建立，但查询时使用字段更直接）
      const templates = await ctx.prisma.templateEntity.findMany({
        where: {
          designer_works_id: { in: worksIds },
          deleted: false,
        },
        orderBy: { create_time: 'desc' },
        include: {
          specInfo: {
            select: {
              id: true,
              name: true,
              display_name: true,
            },
          },
        },
      });

      return templates;
    }),

  // 获取指定作品创建的模板列表（针对任务作品项）
  listTemplatesByWorksId: publicProcedure
    .input(
      z.object({
        works_id: z.string(),
        skip: z.number().optional().default(0),
        take: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        designer_works_id: input.works_id,
        deleted: false,
      };

      const [data, total] = await Promise.all([
        ctx.prisma.templateEntity.findMany({
          where,
          skip: input.skip ?? 0,
          take: input.take ?? 20,
          orderBy: { create_time: 'desc' },
          include: {
            specInfo: {
              select: {
                id: true,
                name: true,
                display_name: true,
              },
            },
          },
        }),
        ctx.prisma.templateEntity.count({ where }),
      ]);

      return { data, total };
    }),
});
