import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';

// ===== Zod Schemas =====
const RsvpFormConfigInput = z.object({
  works_id: z.string(),
  title: z.string(),
  desc: z.string().optional(),
  form_fields: z.any(),
  allow_multiple_submit: z.boolean().optional(),
  require_approval: z.boolean().optional(),
  max_submit_count: z.number().int().optional(),
  submit_deadline: z.date().optional(),
  enabled: z.boolean().optional(),
});
const RsvpFormConfigUpdateInput = z.object({
  id: z.string(),
  title: z.string().optional(),
  desc: z.string().optional(),
  form_fields: z.any().optional(),
  allow_multiple_submit: z.boolean().optional(),
  require_approval: z.boolean().optional(),
  max_submit_count: z.number().int().nullable().optional(),
  submit_deadline: z.date().nullable().optional(),
  enabled: z.boolean().optional(),
  deleted: z.boolean().optional(),
});
const SubmissionDataSchema = z.any();

const RsvpSubmissionCreateInput = z.object({
  form_config_id: z.string(),
  visitor_id: z.string().optional(),
  contact_id: z.string().optional(),
  submission_data: SubmissionDataSchema,
  remark: z.string().optional(),
});

const RsvpSubmissionUpdateInput = z.object({
  submission_group_id: z.string(),
  submission_data: SubmissionDataSchema,
  changed_fields: z.any().optional(),
  operator_type: z.enum(['visitor', 'admin', 'system']).optional(),
  operator_id: z.string().optional(),
  operator_name: z.string().optional(),
  remark: z.string().optional(),
});

const RsvpSubmissionStatusChangeInput = z.object({
  id: z.string(),
  approve: z.boolean(),
  approved_by: z.string().optional(),
  reject_reason: z.string().optional(),
});

const RsvpViewLogCreateInput = z.object({
  form_config_id: z.string(),
  visitor_id: z.string().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  referer: z.string().optional(),
  device_type: z.string().optional(),
  view_duration: z.number().int().optional(),
});

const RsvpContactUpsertInput = z.object({
  id: z.string().optional(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const rsvpRouter = router({
  // ===== Form Configs =====
  upsertFormConfig: protectedProcedure
    .input(RsvpFormConfigInput)
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.prisma.rsvpFormConfigEntity.findFirst({
        where: { works_id: input.works_id, deleted: false },
      });

      if (exists) {
        return ctx.prisma.rsvpFormConfigEntity.update({
          where: { id: exists.id },
          data: input,
        });
      }

      return ctx.prisma.rsvpFormConfigEntity.create({
        data: input,
      });
    }),

  updateFormConfig: protectedProcedure
    .input(RsvpFormConfigUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.rsvpFormConfigEntity.update({ where: { id }, data });
    }),

  getFormConfigByWorksId: publicProcedure
    .input(z.object({ works_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.rsvpFormConfigEntity.findFirst({
        where: { works_id: input.works_id, deleted: false },
      });
    }),

  getFormConfigById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.rsvpFormConfigEntity.findUnique({
        where: { id: input.id },
      });
    }),

  toggleFormEnabled: protectedProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rsvpFormConfigEntity.update({
        where: { id: input.id },
        data: { enabled: input.enabled },
      });
    }),

  // ===== Submissions (versioned) =====
  createSubmission: publicProcedure
    .input(RsvpSubmissionCreateInput)
    .mutation(async ({ ctx, input }) => {
      const form = await ctx.prisma.rsvpFormConfigEntity.findUnique({
        where: { id: input.form_config_id },
      });
      if (!form || form.deleted || !form.enabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '表单未启用或不存在',
        });
      }

      // 基于创建的 id 作为组 id
      const created = await ctx.prisma.rsvpSubmissionEntity.create({
        data: {
          form_config_id: input.form_config_id,
          visitor_id: input.visitor_id,
          contact_id: input.contact_id,
          submission_group_id: '',
          submission_data: input.submission_data,
          remark: input.remark,
          status: 'pending',
        },
      });

      // 第一次提交将自己的 id 写入组 id
      const updated = await ctx.prisma.rsvpSubmissionEntity.update({
        where: { id: created.id },
        data: { submission_group_id: created.id },
      });

      return updated;
    }),

  updateSubmissionVersion: publicProcedure
    .input(RsvpSubmissionUpdateInput)
    .mutation(async ({ ctx, input }) => {
      // 复制新版本记录，保持组 id 一致
      const latest = await ctx.prisma.rsvpSubmissionEntity.findFirst({
        where: {
          submission_group_id: input.submission_group_id,
          deleted: false,
        },
        orderBy: { create_time: 'desc' },
      });

      if (!latest) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '提交记录不存在' });
      }

      return ctx.prisma.rsvpSubmissionEntity.create({
        data: {
          form_config_id: latest.form_config_id,
          visitor_id: latest.visitor_id,
          contact_id: latest.contact_id,
          submission_group_id: latest.submission_group_id,
          submission_data: input.submission_data,
          changed_fields: input.changed_fields,
          operator_type: input.operator_type,
          operator_id: input.operator_id,
          operator_name: input.operator_name,
          remark: input.remark,
          status: latest.status, // 版本化修改不改变审核状态
        },
      });
    }),

  approveOrRejectSubmission: protectedProcedure
    .input(RsvpSubmissionStatusChangeInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.rsvpSubmissionEntity.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '提交记录不存在' });
      }

      return ctx.prisma.rsvpSubmissionEntity.update({
        where: { id: input.id },
        data: {
          status: input.approve ? 'approved' : 'rejected',
          approved_by: input.approved_by,
          approved_time: input.approve ? new Date() : null,
          reject_reason: input.approve ? null : input.reject_reason,
        },
      });
    }),

  cancelSubmission: publicProcedure
    .input(z.object({ id: z.string(), remark: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.rsvpSubmissionEntity.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '提交记录不存在' });
      }

      return ctx.prisma.rsvpSubmissionEntity.update({
        where: { id: input.id },
        data: { status: 'cancelled', remark: input.remark },
      });
    }),

  getLatestSubmissions: protectedProcedure
    .input(
      z.object({
        form_config_id: z.string(),
        status: z
          .enum(['pending', 'approved', 'rejected', 'cancelled'])
          .optional(),
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 获取每个组的最新记录：通过组 id 排序最新时间
      return ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          form_config_id: input.form_config_id,
          deleted: false,
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: { create_time: 'desc' },
        skip: input.skip,
        take: input.take,
      });
    }),

  getSubmissionHistory: protectedProcedure
    .input(z.object({ submission_group_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.rsvpSubmissionEntity.findMany({
        where: { submission_group_id: input.submission_group_id },
        orderBy: { create_time: 'asc' },
      });
    }),

  // ===== View Logs =====
  createViewLog: publicProcedure
    .input(RsvpViewLogCreateInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.rsvpViewLogEntity.create({ data: input });
    }),

  // ===== Contacts =====
  upsertContact: protectedProcedure
    .input(RsvpContactUpsertInput)
    .mutation(async ({ ctx, input }) => {
      // 唯一标识：优先 email，其次 phone；否则按 id 更新，否则创建
      if (input.id) {
        const { id, ...data } = input;
        return ctx.prisma.rsvpContactEntity.update({ where: { id }, data });
      }

      if (input.email) {
        const existing = await ctx.prisma.rsvpContactEntity.findUnique({
          where: { email: input.email },
        });
        if (existing) {
          return ctx.prisma.rsvpContactEntity.update({
            where: { id: existing.id },
            data: input,
          });
        }
      }

      if (input.phone) {
        const existing = await ctx.prisma.rsvpContactEntity.findUnique({
          where: { phone: input.phone },
        });
        if (existing) {
          return ctx.prisma.rsvpContactEntity.update({
            where: { id: existing.id },
            data: input,
          });
        }
      }

      return ctx.prisma.rsvpContactEntity.create({ data: input });
    }),

  findContacts: protectedProcedure
    .input(
      z
        .object({
          keyword: z.string().optional(),
          skip: z.number().optional(),
          take: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { deleted: false };
      if (input?.keyword) {
        where.OR = [
          { name: { contains: input.keyword, mode: 'insensitive' } },
          { email: { contains: input.keyword, mode: 'insensitive' } },
          { phone: { contains: input.keyword, mode: 'insensitive' } },
        ];
      }
      return ctx.prisma.rsvpContactEntity.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { update_time: 'desc' },
      });
    }),
});
