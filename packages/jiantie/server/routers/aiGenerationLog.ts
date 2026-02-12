import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const aiGenerationLogRouter = router({
  listRuns: protectedProcedure
    .input(
      z.object({
        template_id: z.string().optional(),
        uid: z.number().optional(),
        status: z.enum(['running', 'success', 'failed']).optional(),
        date_from: z.string().datetime().optional(),
        date_to: z.string().datetime().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: {
        template_id?: string;
        uid?: number;
        status?: string;
        created_at?: { gte?: Date; lte?: Date };
      } = {};
      if (input.template_id != null && input.template_id !== '') {
        where.template_id = input.template_id;
      }
      if (input.uid != null) {
        where.uid = input.uid;
      }
      if (input.status != null) {
        where.status = input.status;
      }
      if (input.date_from != null || input.date_to != null) {
        where.created_at = {};
        if (input.date_from != null) where.created_at.gte = new Date(input.date_from);
        if (input.date_to != null) where.created_at.lte = new Date(input.date_to);
      }

      const skip = (input.page - 1) * input.pageSize;
      const [runs, total] = await Promise.all([
        ctx.prisma.aiTemplateGenerationRunEntity.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            uid: true,
            appid: true,
            template_id: true,
            template_title: true,
            user_input: true,
            status: true,
            error_message: true,
            _count: { select: { steps: true } },
          },
        }),
        ctx.prisma.aiTemplateGenerationRunEntity.count({ where }),
      ]);

      return {
        runs,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  getRunDetail: protectedProcedure
    .input(z.object({ run_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.prisma.aiTemplateGenerationRunEntity.findUnique({
        where: { id: input.run_id },
        include: {
          steps: {
            orderBy: [{ iteration: 'asc' }, { step_type: 'asc' }],
          },
        },
      });
      if (!run) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'run 不存在',
        });
      }
      return run;
    }),
});
