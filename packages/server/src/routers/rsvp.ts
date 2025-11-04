import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';

// ===== Zod Schemas =====
const RsvpFormConfigInput = z.object({
  works_id: z.string(),
  title: z.string(),
  desc: z.string().nullable().optional(),
  form_fields: z.any(),
  allow_multiple_submit: z.boolean().optional(),
  require_approval: z.boolean().optional(),
  max_submit_count: z.number().int().nullable().optional(),
  submit_deadline: z.date().nullable().optional(),
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
  will_attend: z.boolean(),
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

const RsvpInviteeCreateInput = z.object({
  form_config_id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

const RsvpInviteeUpdateInput = z.object({
  id: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
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
        // 一个作品只允许添加一个表单，添加多少个都会一样
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

      let finalContactId = input.contact_id;

      // 如果提交了手机号，自动创建/更新联系人
      if (input.will_attend && input.submission_data) {
        const submissionData = input.submission_data as Record<string, any>;

        // 从提交数据中提取手机号
        let phone: string | null = null;
        for (const [key, value] of Object.entries(submissionData)) {
          if (typeof value === 'string') {
            const lowerKey = key.toLowerCase();
            if (
              lowerKey.includes('phone') ||
              lowerKey.includes('mobile') ||
              lowerKey.includes('tel') ||
              lowerKey.includes('手机') ||
              lowerKey.includes('电话') ||
              lowerKey.includes('联系方式')
            ) {
              const phoneMatch = value.replace(/\D/g, '');
              if (phoneMatch.length >= 7) {
                phone = phoneMatch;
                break;
              }
            }
          }
        }

        // 如果有手机号，创建/更新联系人
        if (phone) {
          // 从提交数据中提取姓名
          let name = '访客'; // 默认名称

          // 优先从 _guestInfo 中获取
          if (submissionData._guestInfo?.guestName) {
            name = submissionData._guestInfo.guestName;
          } else {
            // 查找姓名字段
            for (const [key, value] of Object.entries(submissionData)) {
              if (typeof value === 'string') {
                const lowerKey = key.toLowerCase();
                if (
                  (lowerKey.includes('name') ||
                    lowerKey.includes('姓名') ||
                    lowerKey.includes('名字')) &&
                  value.trim()
                ) {
                  name = value.trim();
                  break;
                }
              }
            }
          }

          // 查找或创建联系人
          const existing = await ctx.prisma.rsvpContactEntity.findUnique({
            where: { phone: phone },
          });

          if (existing) {
            // 更新现有联系人
            const updated = await ctx.prisma.rsvpContactEntity.update({
              where: { id: existing.id },
              data: { name: name },
            });
            finalContactId = updated.id;
          } else {
            // 创建新联系人
            const created = await ctx.prisma.rsvpContactEntity.create({
              data: { phone: phone, name: name },
            });
            finalContactId = created.id;
          }
        }
      }

      // 基于创建的 id 作为组 id
      const created = await ctx.prisma.rsvpSubmissionEntity.create({
        data: {
          form_config_id: input.form_config_id,
          visitor_id: input.visitor_id,
          contact_id: finalContactId,
          will_attend: input.will_attend,
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

      // 返回包含 contact_id 的完整记录
      return ctx.prisma.rsvpSubmissionEntity.findUnique({
        where: { id: updated.id },
      });
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

  // 公开接口：根据 contact_id 获取提交记录
  getSubmissionsByContactId: publicProcedure
    .input(z.object({ contact_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          contact_id: input.contact_id,
          deleted: false,
        },
        orderBy: { create_time: 'desc' },
        include: {
          form_config: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    }),

  // 公开接口：根据 visitor_id 或 contact_id 查询当前表单的提交记录
  getMySubmissionByFormConfig: publicProcedure
    .input(
      z.object({
        form_config_id: z.string(),
        visitor_id: z.string().optional(),
        contact_id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        form_config_id: input.form_config_id,
        deleted: false,
      };

      // 优先使用 contact_id，其次 visitor_id
      if (input.contact_id) {
        where.contact_id = input.contact_id;
      } else if (input.visitor_id) {
        where.visitor_id = input.visitor_id;
      } else {
        return [];
      }

      // 获取每个 submission_group_id 的最新记录
      const allSubmissions = await ctx.prisma.rsvpSubmissionEntity.findMany({
        where,
        orderBy: { create_time: 'desc' },
      });

      // 按 submission_group_id 分组，取每组最新的
      const latestByGroup = new Map();
      for (const submission of allSubmissions) {
        const groupId = submission.submission_group_id;
        if (!latestByGroup.has(groupId)) {
          latestByGroup.set(groupId, submission);
        }
      }

      return Array.from(latestByGroup.values());
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

  // ===== Invitees (嘉宾管理) =====
  createInvitee: protectedProcedure
    .input(RsvpInviteeCreateInput)
    .mutation(async ({ ctx, input }) => {
      // 验证表单配置存在
      const formConfig = await ctx.prisma.rsvpFormConfigEntity.findUnique({
        where: { id: input.form_config_id },
      });
      if (!formConfig || formConfig.deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '表单配置不存在',
        });
      }

      // 如果提供了手机号，检查是否已存在
      if (input.phone) {
        const existing = await ctx.prisma.rsvpContactEntity.findUnique({
          where: { phone: input.phone },
        });
        if (existing) {
          // 如果已存在，更新为嘉宾
          return ctx.prisma.rsvpContactEntity.update({
            where: { id: existing.id },
            data: {
              name: input.name,
              email: input.email,
              form_config_id: input.form_config_id,
            },
          });
        }
      }

      // 如果提供了邮箱，检查是否已存在
      if (input.email) {
        const existing = await ctx.prisma.rsvpContactEntity.findUnique({
          where: { email: input.email },
        });
        if (existing) {
          // 如果已存在，更新为嘉宾
          return ctx.prisma.rsvpContactEntity.update({
            where: { id: existing.id },
            data: {
              name: input.name,
              phone: input.phone,
              form_config_id: input.form_config_id,
            },
          });
        }
      }

      // 创建新嘉宾
      return ctx.prisma.rsvpContactEntity.create({
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email,
          form_config_id: input.form_config_id,
        },
      });
    }),

  updateInvitee: protectedProcedure
    .input(RsvpInviteeUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 检查嘉宾是否存在且是嘉宾（有form_config_id）
      const existing = await ctx.prisma.rsvpContactEntity.findUnique({
        where: { id },
      });
      if (!existing || !existing.form_config_id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '嘉宾不存在',
        });
      }

      // 如果更新手机号，检查唯一性
      if (data.phone && data.phone !== existing.phone) {
        const phoneExists = await ctx.prisma.rsvpContactEntity.findUnique({
          where: { phone: data.phone },
        });
        if (phoneExists && phoneExists.id !== id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '该手机号已被使用',
          });
        }
      }

      // 如果更新邮箱，检查唯一性
      if (data.email && data.email !== existing.email) {
        const emailExists = await ctx.prisma.rsvpContactEntity.findUnique({
          where: { email: data.email },
        });
        if (emailExists && emailExists.id !== id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '该邮箱已被使用',
          });
        }
      }

      return ctx.prisma.rsvpContactEntity.update({
        where: { id },
        data,
      });
    }),

  deleteInvitee: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 软删除
      return ctx.prisma.rsvpContactEntity.update({
        where: { id: input.id },
        data: { deleted: true },
      });
    }),

  listInvitees: protectedProcedure
    .input(
      z.object({
        form_config_id: z.string(),
        keyword: z.string().optional(),
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        form_config_id: input.form_config_id,
        deleted: false,
      };

      if (input.keyword) {
        where.OR = [
          { name: { contains: input.keyword, mode: 'insensitive' } },
          { phone: { contains: input.keyword, mode: 'insensitive' } },
          { email: { contains: input.keyword, mode: 'insensitive' } },
        ];
      }

      return ctx.prisma.rsvpContactEntity.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: { create_time: 'desc' },
      });
    }),

  getInviteeById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.rsvpContactEntity.findUnique({
        where: { id: input.id },
      });
    }),

  getInviteeSubmissions: protectedProcedure
    .input(
      z.object({
        contact_id: z.string(),
        form_config_id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 查询该联系人的所有提交记录
      const submissions = await ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          contact_id: input.contact_id,
          form_config_id: input.form_config_id,
          deleted: false,
        },
        orderBy: { create_time: 'desc' },
      });

      // 按submission_group_id分组，取每组最新记录
      const latestByGroup = new Map();
      for (const submission of submissions) {
        const groupId = submission.submission_group_id;
        if (!latestByGroup.has(groupId)) {
          latestByGroup.set(groupId, submission);
        }
      }

      return Array.from(latestByGroup.values());
    }),
});
