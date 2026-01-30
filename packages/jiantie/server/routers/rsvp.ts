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
  collect_form: z.boolean().optional(),
  success_feedback_config: z.any().nullable().optional(), // 提交成功反馈配置 JSON
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
  collect_form: z.boolean().optional(),
  deleted: z.boolean().optional(),
  success_feedback_config: z.any().nullable().optional(), // 提交成功反馈配置 JSON
});
const SubmissionDataSchema = z.any();

const RsvpSubmissionCreateInput = z.object({
  form_config_id: z.string(),
  contact_id: z.string().optional(),
  will_attend: z.boolean(),
  submission_data: SubmissionDataSchema,
  remark: z.string().optional(),
});

const RsvpSubmissionUpdateInput = z.object({
  submission_group_id: z.string(),
  submission_data: SubmissionDataSchema,
  will_attend: z.boolean().optional(), // 是否出席（可选，如果提供则更新）
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

const RsvpActionLogCreateInput = z.object({
  form_config_id: z.string(),
  contact_id: z.string().optional(),
  action_type: z.enum(['view_page', 'submit', 'resubmit']),
  submission_id: z.string().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  referer: z.string().optional(),
  device_type: z.string().optional(),
  view_duration: z.number().int().optional(),
  metadata: z.any().optional(),
});

// 保留旧的 schema 名称以兼容
const RsvpViewLogCreateInput = RsvpActionLogCreateInput;

const RsvpContactUpsertInput = z.object({
  id: z.string().optional(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const RsvpInviteeCreateInput = z.object({
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  works_id: z.string().optional(), // 关联的作品ID
});

const RsvpInviteeUpdateInput = z.object({
  id: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  invite_title: z.string().optional(),
  invite_desc: z.string().optional(),
});

const RsvpInviteeBatchCreateInput = z.object({
  names: z.array(z.string()).min(1), // 姓名数组
  works_id: z.string().optional(), // 关联的作品ID
});

// ===== 验证辅助函数 =====
/**
 * 验证作品是否存在且属于当前用户
 * @param prisma Prisma 客户端
 * @param worksId 作品ID
 * @param uid 当前用户ID
 * @param checkDeleted 是否检查作品是否已删除（默认 true）
 * @param customErrorMessage 自定义错误消息
 * @returns 作品信息
 */
async function verifyWorks(
  prisma: any,
  worksId: string,
  uid: number,
  checkDeleted: boolean = true,
  customErrorMessage?: {
    notFound?: string;
    deleted?: string;
    forbidden?: string;
  }
) {
  const works = await prisma.worksEntity.findUnique({
    where: { id: worksId },
    select: { id: true, uid: true, deleted: true },
  });

  if (!works) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: customErrorMessage?.notFound || `作品不存在：${worksId}`,
    });
  }

  if (checkDeleted && works.deleted) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: customErrorMessage?.deleted || '无法操作已删除的作品',
    });
  }

  if (works.uid !== uid) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: customErrorMessage?.forbidden || '无权操作该作品',
    });
  }

  return works;
}

/**
 * 验证表单配置是否存在且属于当前用户
 * @param prisma Prisma 客户端
 * @param formConfigId 表单配置ID
 * @param uid 当前用户ID
 * @param checkDeleted 是否检查配置是否已删除（默认 true）
 * @returns 表单配置信息（包含关联的作品信息）
 */
async function verifyFormConfig(
  prisma: any,
  formConfigId: string,
  uid: number,
  checkDeleted: boolean = true
) {
  const formConfig = await prisma.rsvpFormConfigEntity.findUnique({
    where: { id: formConfigId },
  });

  if (!formConfig) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: '表单配置不存在',
    });
  }

  if (checkDeleted && formConfig.deleted) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '表单配置已删除',
    });
  }

  // 验证作品是否属于当前用户
  const works = await prisma.worksEntity.findUnique({
    where: { id: formConfig.works_id },
    select: { id: true, uid: true },
  });

  if (!works || works.uid !== uid) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '无权访问该表单配置',
    });
  }

  return { formConfig, works };
}

/**
 * 验证嘉宾是否存在且属于当前用户
 * @param prisma Prisma 客户端
 * @param contactId 嘉宾ID
 * @param uid 当前用户ID
 * @param checkDeleted 是否检查嘉宾是否已删除（默认 true）
 * @returns 嘉宾信息
 */
async function verifyContact(
  prisma: any,
  contactId: string,
  uid: number,
  checkDeleted: boolean = true
) {
  const contact = await prisma.rsvpContactEntity.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: '嘉宾不存在',
    });
  }

  if (checkDeleted && contact.deleted) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '嘉宾已删除',
    });
  }

  if (contact.uid !== uid) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '无权操作该嘉宾',
    });
  }

  return contact;
}

export const rsvpRouter = router({
  // ===== Form Configs =====
  upsertFormConfig: protectedProcedure
    .input(RsvpFormConfigInput)
    .mutation(async ({ ctx, input }) => {
      // 验证作品是否存在且属于当前用户
      await verifyWorks(ctx.prisma, input.works_id, ctx.uid, true, {
        deleted: '无法为已删除的作品创建RSVP配置',
        forbidden: '无权操作该作品的RSVP配置',
      });

      // 查找是否已存在配置
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

      // 创建新配置（数据库外键约束会自动建立关联关系）
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
      const submissionData = input.submission_data as Record<
        string,
        any
      > | null;

      // 公开链接提交时，强制创建新宾客，忽略传入的 contact_id
      const isPublicLink = submissionData?._guestInfo?.guestName;
      if (isPublicLink) {
        finalContactId = undefined;
      }

      // 验证传入的 contact_id 是否有效（防止使用过期或无效的ID）
      if (finalContactId) {
        const contactExists = await ctx.prisma.rsvpContactEntity.findUnique({
          where: { id: finalContactId },
        });
        if (!contactExists || contactExists.deleted) {
          // 如果 contact_id 无效或已删除，清空它
          finalContactId = undefined;
        }
      }

      // 如果没有 contact_id，根据提交数据类型处理
      if (!finalContactId && submissionData) {
        // 优先处理专属链接提交（有 _inviteeInfo）
        if (submissionData._inviteeInfo?.inviteeName) {
          const inviteeName = submissionData._inviteeInfo.inviteeName.trim();
          const inviteePhone = submissionData._inviteeInfo.inviteePhone;
          const inviteeEmail = submissionData._inviteeInfo.inviteeEmail;

          if (inviteeName && form.works_id) {
            // 根据姓名和 works_id 查找对应的 invitee
            const invitee = await ctx.prisma.rsvpContactEntity.findFirst({
              where: {
                name: inviteeName,
                works_id: form.works_id,
                deleted: false,
              },
            });

            if (invitee) {
              // 找到对应的 invitee，使用其 id 作为 contact_id
              finalContactId = invitee.id;
            } else {
              // 如果没有找到，说明可能是通过其他方式创建的链接，尝试根据手机号或邮箱查找
              if (inviteePhone || inviteeEmail) {
                const inviteeByContact =
                  await ctx.prisma.rsvpContactEntity.findFirst({
                    where: {
                      works_id: form.works_id,
                      deleted: false,
                      OR: [
                        ...(inviteePhone ? [{ phone: inviteePhone }] : []),
                        ...(inviteeEmail ? [{ email: inviteeEmail }] : []),
                      ],
                    },
                  });

                if (inviteeByContact) {
                  finalContactId = inviteeByContact.id;
                }
              }
            }
          }
        }

        // 公开链接提交（有 _guestInfo），自动创建 contact
        if (submissionData._guestInfo?.guestName) {
          const guestName = submissionData._guestInfo.guestName.trim();

          if (guestName) {
            // 获取表单配置对应的works的uid（用于创建联系人）
            const works = await ctx.prisma.worksEntity.findUnique({
              where: { id: form.works_id },
            });
            const contactUid = works?.uid;

            if (!contactUid) {
              // 记录错误日志但不抛出异常，继续提交（contact_id 为 null）
              console.error(
                `[RSVP] 无法创建联系人：表单配置 ${input.form_config_id} 关联的作品 ${form.works_id} 不存在或已删除`
              );
              console.error(
                `[RSVP] 访客姓名：${guestName}，表单配置：${JSON.stringify({
                  form_config_id: input.form_config_id,
                  works_id: form.works_id,
                  form_title: form.title,
                })}`
              );
              // 抛出明确的错误，提示用户或管理员
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message:
                  '表单配置异常，请联系管理员。表单可能关联到已删除的作品。',
              });
            }

            if (contactUid) {
              // 创建新联系人（无需手机号，仅基于姓名）
              const created = await ctx.prisma.rsvpContactEntity.create({
                data: {
                  name: guestName,
                  phone: null, // 公开链接提交时无需手机号
                  email: null,
                  uid: contactUid,
                  works_id: form.works_id, // 关联到作品
                  source_type: 'auto', // 被动创建（公开链接提交时自动创建）
                },
              });
              finalContactId = created.id;

              // 自动关联到当前表单
              await ctx.prisma.rsvpContactFormConfigEntity.create({
                data: {
                  contact_id: created.id,
                  form_config_id: input.form_config_id,
                },
              });
            }
          }
        }
      }

      // 基于创建的 id 作为组 id
      const created = await ctx.prisma.rsvpSubmissionEntity.create({
        data: {
          form_config_id: input.form_config_id,
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

      // 记录操作日志 - 首次提交
      try {
        await ctx.prisma.rsvpViewLogEntity.create({
          data: {
            form_config_id: input.form_config_id,
            contact_id: finalContactId,
            action_type: 'submit',
            submission_id: updated.id,
          },
        });
      } catch (error) {
        // 日志记录失败不影响提交
        console.error('Failed to create action log:', error);
      }

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

      const newVersion = await ctx.prisma.rsvpSubmissionEntity.create({
        data: {
          form_config_id: latest.form_config_id,
          contact_id: latest.contact_id,
          submission_group_id: latest.submission_group_id,
          submission_data: input.submission_data,
          changed_fields: input.changed_fields,
          operator_type: input.operator_type,
          operator_id: input.operator_id,
          operator_name: input.operator_name,
          remark: input.remark,
          status: latest.status, // 版本化修改不改变审核状态
          // 如果提供了新的 will_attend，使用新值；否则使用旧值
          will_attend:
            input.will_attend !== undefined
              ? input.will_attend
              : latest.will_attend,
        },
      });

      // 记录操作日志 - 重新提交
      try {
        await ctx.prisma.rsvpViewLogEntity.create({
          data: {
            form_config_id: latest.form_config_id,
            contact_id: latest.contact_id,
            action_type: 'resubmit',
            submission_id: newVersion.id,
          },
        });
      } catch (error) {
        // 日志记录失败不影响提交
        console.error('Failed to create action log:', error);
      }

      return newVersion;
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
      // 注意：联系人归属于当前用户（uid）
      if (input.id) {
        const { id, ...data } = input;
        // 检查联系人是否属于当前用户
        await verifyContact(ctx.prisma, id, ctx.uid);
        return ctx.prisma.rsvpContactEntity.update({ where: { id }, data });
      }

      if (input.email) {
        // 在同一用户下查找
        const existing = await ctx.prisma.rsvpContactEntity.findFirst({
          where: {
            email: input.email,
            uid: ctx.uid,
          },
        });
        if (existing) {
          return ctx.prisma.rsvpContactEntity.update({
            where: { id: existing.id },
            data: input,
          });
        }
      }

      if (input.phone) {
        // 在同一用户下查找
        const existing = await ctx.prisma.rsvpContactEntity.findFirst({
          where: {
            phone: input.phone,
            uid: ctx.uid,
          },
        });
        if (existing) {
          return ctx.prisma.rsvpContactEntity.update({
            where: { id: existing.id },
            data: input,
          });
        }
      }

      // 创建新联系人，归属于当前用户
      return ctx.prisma.rsvpContactEntity.create({
        data: {
          ...input,
          uid: ctx.uid,
          source_type: 'manual', // 通过管理接口创建，视为主动邀请
        },
      });
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

  // 批量查询：根据多个 contact_ids 获取提交记录
  getSubmissionsByContactIds: protectedProcedure
    .input(z.object({ contact_ids: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      if (input.contact_ids.length === 0) {
        return [];
      }
      return ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          contact_id: { in: input.contact_ids },
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

  // 公开接口：根据 contact_id 查询当前表单的提交记录
  getMySubmissionByFormConfig: publicProcedure
    .input(
      z.object({
        form_config_id: z.string(),
        contact_id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 如果没有 contact_id，直接返回空
      if (!input.contact_id) {
        return [];
      }

      // 获取每个 submission_group_id 的最新记录
      const allSubmissions = await ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          form_config_id: input.form_config_id,
          contact_id: input.contact_id,
          deleted: false,
        },
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
      // 联系人归属于用户（uid）
      const where: any = {
        uid: ctx.uid,
        deleted: false,
      };
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
      // 如果提供了手机号，检查是否已存在且属于当前用户
      if (input.phone) {
        const existing = await ctx.prisma.rsvpContactEntity.findFirst({
          where: {
            phone: input.phone,
            uid: ctx.uid,
          },
        });
        if (existing) {
          // 如果已存在，更新嘉宾信息
          return ctx.prisma.rsvpContactEntity.update({
            where: { id: existing.id },
            data: {
              name: input.name,
              email: input.email,
            },
          });
        }
      }

      // 如果提供了邮箱，检查是否已存在且属于当前用户
      if (input.email) {
        const existing = await ctx.prisma.rsvpContactEntity.findFirst({
          where: {
            email: input.email,
            uid: ctx.uid,
          },
        });
        if (existing) {
          // 如果已存在，更新嘉宾信息
          return ctx.prisma.rsvpContactEntity.update({
            where: { id: existing.id },
            data: {
              name: input.name,
              phone: input.phone,
            },
          });
        }
      }

      // 如果提供了 works_id，验证作品是否存在且属于当前用户
      if (input.works_id) {
        await verifyWorks(ctx.prisma, input.works_id, ctx.uid, true, {
          deleted: '无法为已删除的作品创建嘉宾',
        });
      }

      // 创建新嘉宾，归属于当前用户，关联到作品（如果提供了 works_id）
      return ctx.prisma.rsvpContactEntity.create({
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email,
          uid: ctx.uid,
          works_id: input.works_id || null,
          source_type: 'manual', // 主动邀请
        },
      });
    }),

  // 批量创建嘉宾
  batchCreateInvitees: protectedProcedure
    .input(RsvpInviteeBatchCreateInput)
    .mutation(async ({ ctx, input }) => {
      // 如果提供了 works_id，验证作品是否存在且属于当前用户
      if (input.works_id) {
        await verifyWorks(ctx.prisma, input.works_id, ctx.uid, true, {
          deleted: '无法为已删除的作品创建嘉宾',
        });
      }

      const results: Array<{
        name: string;
        success: boolean;
        invitee?: any;
        error?: string;
      }> = [];

      // 批量创建嘉宾
      for (const name of input.names) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          results.push({
            name: name,
            success: false,
            error: '姓名为空',
          });
          continue;
        }

        try {
          // 检查是否已存在同名嘉宾（仅检查姓名，不检查手机和邮箱）
          const existing = await ctx.prisma.rsvpContactEntity.findFirst({
            where: {
              name: trimmedName,
              uid: ctx.uid,
              works_id: input.works_id || null,
            },
          });

          if (existing) {
            // 如果已存在，返回现有记录
            results.push({
              name: trimmedName,
              success: true,
              invitee: existing,
            });
          } else {
            // 创建新嘉宾
            const created = await ctx.prisma.rsvpContactEntity.create({
              data: {
                name: trimmedName,
                uid: ctx.uid,
                works_id: input.works_id || null,
                source_type: 'manual', // 主动邀请
              },
            });
            results.push({
              name: trimmedName,
              success: true,
              invitee: created,
            });
          }
        } catch (error: any) {
          results.push({
            name: trimmedName,
            success: false,
            error: error.message || '创建失败',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      return {
        results,
        successCount,
        failedCount,
        total: input.names.length,
      };
    }),

  // 关联嘉宾到表单（用于分享时）
  linkInviteeToForm: protectedProcedure
    .input(
      z.object({
        contact_id: z.string(),
        form_config_id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证嘉宾属于当前用户
      await verifyContact(ctx.prisma, input.contact_id, ctx.uid);

      // 验证表单配置属于当前用户
      await verifyFormConfig(ctx.prisma, input.form_config_id, ctx.uid);

      // 检查关联是否已存在
      const existing = await ctx.prisma.rsvpContactFormConfigEntity.findUnique({
        where: {
          contact_id_form_config_id: {
            contact_id: input.contact_id,
            form_config_id: input.form_config_id,
          },
        },
      });

      if (existing) {
        // 如果已存在，直接返回
        return existing;
      }

      // 创建关联关系
      return ctx.prisma.rsvpContactFormConfigEntity.create({
        data: {
          contact_id: input.contact_id,
          form_config_id: input.form_config_id,
        },
      });
    }),

  updateInvitee: protectedProcedure
    .input(RsvpInviteeUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 检查嘉宾是否存在且属于当前用户
      const existing = await verifyContact(ctx.prisma, id, ctx.uid);

      // 如果更新手机号，检查唯一性（仅检查同一用户的）
      if (data.phone && data.phone !== existing.phone) {
        const phoneExists = await ctx.prisma.rsvpContactEntity.findFirst({
          where: {
            phone: data.phone,
            uid: ctx.uid,
          },
        });
        if (phoneExists && phoneExists.id !== id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '该手机号已被使用',
          });
        }
      }

      // 如果更新邮箱，检查唯一性（仅检查同一用户的）
      if (data.email && data.email !== existing.email) {
        const emailExists = await ctx.prisma.rsvpContactEntity.findFirst({
          where: {
            email: data.email,
            uid: ctx.uid,
          },
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
      // 检查嘉宾是否存在且属于当前用户
      const existing = await verifyContact(ctx.prisma, input.id, ctx.uid);

      // 软删除
      return ctx.prisma.rsvpContactEntity.update({
        where: { id: input.id },
        data: { deleted: true },
      });
    }),

  listInvitees: protectedProcedure
    .input(
      z.object({
        works_id: z.string().optional(), // 关联的作品ID，如果提供则只返回该作品下的嘉宾
        form_config_id: z.string().optional(), // 可选的RSVP表单ID（保持向后兼容）
        keyword: z.string().optional(),
        source_type: z.enum(['manual', 'auto']).optional(), // 创建来源筛选：'manual'（主动邀请）| 'auto'（被动创建）
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 优先使用 works_id 查询
      if (input.works_id) {
        // 验证作品属于当前用户
        await verifyWorks(ctx.prisma, input.works_id, ctx.uid, false);

        // 查询该作品下的所有嘉宾
        const where: any = {
          works_id: input.works_id,
          uid: ctx.uid,
          deleted: false,
        };

        // 按来源筛选
        if (input.source_type) {
          where.source_type = input.source_type;
        }

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
      }

      // 如果提供了form_config_id，则查询该RSVP下的宾客（保持向后兼容）
      if (input.form_config_id) {
        // 验证表单配置属于当前用户
        await verifyFormConfig(ctx.prisma, input.form_config_id, ctx.uid);

        // 通过关联表查询该RSVP下的宾客
        const contactWhere: any = {
          uid: ctx.uid,
          deleted: false,
        };

        // 按来源筛选
        if (input.source_type) {
          contactWhere.source_type = input.source_type;
        }

        const where: any = {
          form_config_id: input.form_config_id,
          contact: contactWhere,
        };

        if (input.keyword) {
          where.contact = {
            ...where.contact,
            OR: [
              { name: { contains: input.keyword, mode: 'insensitive' } },
              { phone: { contains: input.keyword, mode: 'insensitive' } },
              { email: { contains: input.keyword, mode: 'insensitive' } },
            ],
          };
        }

        const contactFormConfigs =
          await ctx.prisma.rsvpContactFormConfigEntity.findMany({
            where,
            include: {
              contact: true,
            },
            skip: input.skip,
            take: input.take,
            orderBy: { create_time: 'desc' },
          });

        // 提取并返回宾客列表
        return contactFormConfigs
          .map(cfc => cfc.contact)
          .filter(
            (contact): contact is NonNullable<typeof contact> =>
              contact !== null
          );
      }

      // 如果没有提供works_id或form_config_id，返回当前用户的所有宾客
      const where: any = {
        uid: ctx.uid,
        deleted: false,
      };

      // 按来源筛选
      if (input.source_type) {
        where.source_type = input.source_type;
      }

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

  // 获取当前RSVP下的嘉宾响应状态列表
  getInviteesWithResponseStatus: protectedProcedure
    .input(
      z.object({
        works_id: z.string().optional(), // 优先使用 works_id
        form_config_id: z.string().optional(), // 保持向后兼容
      })
    )
    .query(async ({ ctx, input }) => {
      let invitees: any[] = [];
      let formConfigId: string | null = null;

      // 优先使用 works_id 查询
      if (input.works_id) {
        // 验证作品属于当前用户
        await verifyWorks(ctx.prisma, input.works_id, ctx.uid, false);

        // 获取该作品下的所有嘉宾
        invitees = await ctx.prisma.rsvpContactEntity.findMany({
          where: {
            works_id: input.works_id,
            uid: ctx.uid,
            deleted: false,
          },
          orderBy: { create_time: 'desc' },
        });

        // 获取该作品对应的 form_config（如果有）
        const formConfig = await ctx.prisma.rsvpFormConfigEntity.findFirst({
          where: {
            works_id: input.works_id,
            deleted: false,
          },
        });
        formConfigId = formConfig?.id || null;
      } else if (input.form_config_id) {
        // 使用 form_config_id 查询（保持向后兼容）
        // 验证表单配置属于当前用户
        const { formConfig } = await verifyFormConfig(
          ctx.prisma,
          input.form_config_id,
          ctx.uid
        );

        formConfigId = formConfig.id;

        // 通过关联表获取当前RSVP下关联的嘉宾
        const contactFormConfigs =
          await ctx.prisma.rsvpContactFormConfigEntity.findMany({
            where: {
              form_config_id: input.form_config_id,
              contact: {
                uid: ctx.uid,
                deleted: false,
              },
            },
            include: {
              contact: true,
            },
            orderBy: { create_time: 'desc' },
          });

        // 提取嘉宾列表
        invitees = contactFormConfigs
          .map(cfc => cfc.contact)
          .filter(
            (contact): contact is NonNullable<typeof contact> =>
              contact !== null
          );
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '必须提供 works_id 或 form_config_id',
        });
      }

      // 如果没有 form_config_id，无法查询提交记录，返回空响应状态
      if (!formConfigId) {
        return invitees.map(invitee => ({
          id: invitee.id,
          name: invitee.name,
          email: invitee.email,
          phone: invitee.phone,
          source_type: invitee.source_type,
          create_time: invitee.create_time,
          has_response: false,
          will_attend: null,
          submission_data: null,
          submission_create_time: null,
        }));
      }

      // 获取该表单的所有提交记录
      const submissions = await ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          form_config_id: formConfigId,
          deleted: false,
        },
        orderBy: { create_time: 'desc' },
      });

      // 创建contact_id到提交记录的映射（取最新的一条）
      const submissionMap = new Map<string, any>();
      for (const submission of submissions) {
        if (submission.contact_id) {
          // 如果该嘉宾还没有记录，或者这条记录更新，则更新
          if (
            !submissionMap.has(submission.contact_id) ||
            submissionMap.get(submission.contact_id).create_time <
              submission.create_time
          ) {
            submissionMap.set(submission.contact_id, submission);
          }
        }
      }

      // 组合数据，返回嘉宾及其响应状态
      return invitees.map(invitee => {
        const submission = submissionMap.get(invitee.id);
        return {
          id: invitee.id,
          name: invitee.name,
          email: invitee.email,
          phone: invitee.phone,
          source_type: invitee.source_type,
          create_time: invitee.create_time,
          has_response: !!submission, // 是否有响应
          will_attend: submission?.will_attend ?? null, // 出席状态
          submission_data: submission?.submission_data ?? null, // 提交数据
          submission_create_time: submission?.create_time ?? null, // 提交时间
        };
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

  // 查询该 RSVP 下的所有提交记录（包含嘉宾信息）
  getAllSubmissions: protectedProcedure
    .input(
      z.object({
        form_config_id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 查询所有提交记录
      const submissions = await ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          form_config_id: input.form_config_id,
          deleted: false,
        },
        orderBy: { create_time: 'desc' },
      });

      // 获取所有相关的 contact_id
      const contactIds = [
        ...new Set(
          submissions.map(s => s.contact_id).filter(id => id !== null)
        ),
      ];

      // 批量查询联系人信息
      const contacts = await ctx.prisma.rsvpContactEntity.findMany({
        where: {
          id: { in: contactIds as string[] },
        },
      });

      // 创建 contact_id 到 contact 的映射
      const contactMap = new Map(contacts.map(c => [c.id, c]));
      console.log('contactMap', contactMap);

      // 为每个提交记录添加嘉宾信息
      return submissions.map(submission => {
        const contact = submission.contact_id
          ? contactMap.get(submission.contact_id)
          : null;
        return {
          ...submission,
          invitee_name: contact?.name || '未知嘉宾',
          invitee_email: contact?.email,
          invitee_phone: contact?.phone,
        };
      });
    }),

  // 根据 works_id 获取表单提交记录（包含嘉宾信息）
  getSubmissionsByWorksId: protectedProcedure
    .input(
      z.object({
        works_id: z.string(),
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 验证作品是否存在且属于当前用户
      await verifyWorks(ctx.prisma, input.works_id, ctx.uid, false);

      // 获取该作品对应的表单配置
      const formConfig = await ctx.prisma.rsvpFormConfigEntity.findFirst({
        where: {
          works_id: input.works_id,
          deleted: false,
        },
      });

      if (!formConfig) {
        return {
          submissions: [],
          total: 0,
        };
      }

      // 查询所有提交记录（按 submission_group_id 分组，取每组最新记录）
      const allSubmissions = await ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          form_config_id: formConfig.id,
          deleted: false,
        },
        orderBy: { create_time: 'desc' },
      });

      // 按 submission_group_id 分组，取每组最新记录
      const latestByGroup = new Map();
      for (const submission of allSubmissions) {
        const groupId = submission.submission_group_id;
        if (!latestByGroup.has(groupId)) {
          latestByGroup.set(groupId, submission);
        }
      }

      const uniqueSubmissions = Array.from(latestByGroup.values());
      const total = uniqueSubmissions.length;

      // 分页
      const paginatedSubmissions = uniqueSubmissions.slice(
        input.skip || 0,
        (input.skip || 0) + (input.take || 20)
      );

      // 获取所有相关的 contact_id
      const contactIds = [
        ...new Set(
          paginatedSubmissions
            .map(s => s.contact_id)
            .filter(id => id !== null) as string[]
        ),
      ];

      // 批量查询联系人信息
      const contacts = await ctx.prisma.rsvpContactEntity.findMany({
        where: {
          id: { in: contactIds },
        },
      });

      // 创建 contact_id 到 contact 的映射
      const contactMap = new Map(contacts.map(c => [c.id, c]));

      // 为每个提交记录添加嘉宾信息
      const submissionsWithContact = paginatedSubmissions.map(submission => {
        const contact = submission.contact_id
          ? contactMap.get(submission.contact_id)
          : null;
        return {
          ...submission,
          invitee_name: contact?.name || '未知嘉宾',
          invitee_email: contact?.email,
          invitee_phone: contact?.phone,
        };
      });

      return {
        submissions: submissionsWithContact,
        total,
      };
    }),

  // ===== 操作日志 =====
  // 创建操作日志（访问页面）
  createActionLog: publicProcedure
    .input(RsvpActionLogCreateInput)
    .mutation(async ({ ctx, input }) => {
      // 验证 contact_id 是否存在（避免外键约束错误）
      let validContactId = input.contact_id;
      if (input.contact_id) {
        const contactExists = await ctx.prisma.rsvpContactEntity.findUnique({
          where: { id: input.contact_id },
          select: { id: true },
        });
        if (!contactExists) {
          // 如果 contact_id 不存在，设为 undefined（数据库中存储为 NULL）
          validContactId = undefined;
        }
      }

      return ctx.prisma.rsvpViewLogEntity.create({
        data: {
          form_config_id: input.form_config_id,
          contact_id: validContactId,
          action_type: input.action_type,
          submission_id: input.submission_id,
          ip_address: input.ip_address,
          user_agent: input.user_agent,
          referer: input.referer,
          device_type: input.device_type,
          view_duration: input.view_duration,
          metadata: input.metadata,
        },
      });
    }),

  // 查询操作日志
  getActionLogs: protectedProcedure
    .input(
      z.object({
        form_config_id: z.string(),
        contact_id: z.string().optional(),
        action_type: z.enum(['view_page', 'submit', 'resubmit']).optional(),
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        form_config_id: input.form_config_id,
      };

      if (input.contact_id) {
        where.contact_id = input.contact_id;
      }

      if (input.action_type) {
        where.action_type = input.action_type;
      }

      const logs = await ctx.prisma.rsvpViewLogEntity.findMany({
        where,
        orderBy: { create_time: 'desc' },
        skip: input.skip,
        take: input.take,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          submission: {
            select: {
              id: true,
              will_attend: true,
              status: true,
            },
          },
        },
      });

      return logs;
    }),

  // ===== 通知中心 =====
  // 获取用户的所有 RSVP 通知（包含提交记录）
  getMyNotifications: protectedProcedure
    .input(
      z.object({
        user_id: z.string(),
        unread_only: z.boolean().optional(),
        skip: z.number().optional(),
        take: z.number().optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // 将 user_id (string) 转换为 uid (number)
      const uid = parseInt(input.user_id, 10);
      if (isNaN(uid)) {
        return {
          notifications: [],
          total: 0,
          unreadCount: 0,
        };
      }

      // 1. 查询用户的所有作品ID
      const userWorks = await ctx.prisma.worksEntity.findMany({
        where: {
          uid: uid,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      const worksIds = userWorks.map(w => w.id);

      if (worksIds.length === 0) {
        return {
          notifications: [],
          total: 0,
          unreadCount: 0,
        };
      }

      // 2. 查询这些作品下的所有 RSVP 表单
      const formConfigs = await ctx.prisma.rsvpFormConfigEntity.findMany({
        where: {
          works_id: { in: worksIds },
          deleted: false,
        },
        select: {
          id: true,
          works_id: true,
          title: true,
        },
      });

      const formConfigIds = formConfigs.map(f => f.id);

      if (formConfigIds.length === 0) {
        return {
          notifications: [],
          total: 0,
          unreadCount: 0,
        };
      }

      // 2. 查询这些表单的所有提交操作日志
      const actionLogs = await ctx.prisma.rsvpViewLogEntity.findMany({
        where: {
          form_config_id: { in: formConfigIds },
          action_type: { in: ['submit', 'resubmit'] },
          submission_id: { not: null },
        },
        orderBy: { create_time: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          submission: {
            select: {
              id: true,
              will_attend: true,
              status: true,
              submission_data: true,
              create_time: true,
            },
          },
          form_config: {
            select: {
              id: true,
              works_id: true,
              title: true,
            },
          },
        },
      });

      // 3. 查询已读记录
      const submissionIds = actionLogs
        .map(log => log.submission_id)
        .filter(id => id !== null) as string[];

      const readRecords = await ctx.prisma.rsvpNotificationReadEntity.findMany({
        where: {
          user_id: input.user_id,
          submission_id: { in: submissionIds },
        },
      });

      const readSubmissionIds = new Set(readRecords.map(r => r.submission_id));

      // 4. 组装通知数据
      let notifications = actionLogs.map(log => ({
        id: log.id,
        action_type: log.action_type,
        create_time: log.create_time,
        form_config: log.form_config,
        contact: log.contact,
        submission: log.submission,
        is_read: log.submission_id
          ? readSubmissionIds.has(log.submission_id)
          : false,
      }));

      // 5. 如果只要未读的，过滤
      if (input.unread_only) {
        notifications = notifications.filter(n => !n.is_read);
      }

      const total = notifications.length;
      const unreadCount = notifications.filter(n => !n.is_read).length;

      // 6. 分页
      if (input.skip !== undefined || input.take !== undefined) {
        const skip = input.skip || 0;
        const take = input.take || 50;
        notifications = notifications.slice(skip, skip + take);
      }

      return {
        notifications,
        total,
        unreadCount,
      };
    }),

  // 标记通知为已读
  markNotificationAsRead: protectedProcedure
    .input(
      z.object({
        user_id: z.string(),
        submission_ids: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 使用 upsert 避免重复插入
      const results = await Promise.all(
        input.submission_ids.map(submissionId =>
          ctx.prisma.rsvpNotificationReadEntity.upsert({
            where: {
              user_id_submission_id: {
                user_id: input.user_id,
                submission_id: submissionId,
              },
            },
            create: {
              user_id: input.user_id,
              submission_id: submissionId,
            },
            update: {
              read_time: new Date(),
            },
          })
        )
      );

      return { count: results.length };
    }),

  // 标记所有通知为已读
  markAllNotificationsAsRead: protectedProcedure
    .input(
      z.object({
        user_id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 将 user_id (string) 转换为 uid (number)
      const uid = parseInt(input.user_id, 10);
      if (isNaN(uid)) {
        return { count: 0 };
      }

      // 查询用户的所有作品ID
      const userWorks = await ctx.prisma.worksEntity.findMany({
        where: {
          uid: uid,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      const worksIds = userWorks.map(w => w.id);

      if (worksIds.length === 0) {
        return { count: 0 };
      }

      // 查询这些作品下的所有表单
      const formConfigs = await ctx.prisma.rsvpFormConfigEntity.findMany({
        where: {
          works_id: { in: worksIds },
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      const formConfigIds = formConfigs.map(f => f.id);

      if (formConfigIds.length === 0) {
        return { count: 0 };
      }

      // 查询所有提交记录
      const submissions = await ctx.prisma.rsvpSubmissionEntity.findMany({
        where: {
          form_config_id: { in: formConfigIds },
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      const submissionIds = submissions.map(s => s.id);

      if (submissionIds.length === 0) {
        return { count: 0 };
      }

      // 批量标记为已读
      const results = await Promise.all(
        submissionIds.map(submissionId =>
          ctx.prisma.rsvpNotificationReadEntity.upsert({
            where: {
              user_id_submission_id: {
                user_id: input.user_id,
                submission_id: submissionId,
              },
            },
            create: {
              user_id: input.user_id,
              submission_id: submissionId,
            },
            update: {
              read_time: new Date(),
            },
          })
        )
      );

      return { count: results.length };
    }),

  // 获取未读通知数量
  getUnreadNotificationCount: protectedProcedure
    .input(
      z.object({
        user_id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // 将 user_id (string) 转换为 uid (number)
      const uid = parseInt(input.user_id, 10);
      if (isNaN(uid)) {
        return { count: 0 };
      }

      // 查询用户的所有作品ID
      const userWorks = await ctx.prisma.worksEntity.findMany({
        where: {
          uid: uid,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      const worksIds = userWorks.map(w => w.id);

      if (worksIds.length === 0) {
        return { count: 0 };
      }

      // 查询这些作品下的所有表单
      const formConfigs = await ctx.prisma.rsvpFormConfigEntity.findMany({
        where: {
          works_id: { in: worksIds },
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      const formConfigIds = formConfigs.map(f => f.id);

      if (formConfigIds.length === 0) {
        return { count: 0 };
      }

      // 查询所有提交操作
      const actionLogs = await ctx.prisma.rsvpViewLogEntity.findMany({
        where: {
          form_config_id: { in: formConfigIds },
          action_type: { in: ['submit', 'resubmit'] },
          submission_id: { not: null },
        },
        select: {
          submission_id: true,
        },
      });

      const submissionIds = [
        ...new Set(actionLogs.map(log => log.submission_id).filter(Boolean)),
      ] as string[];

      if (submissionIds.length === 0) {
        return { count: 0 };
      }

      // 查询已读记录
      const readCount = await ctx.prisma.rsvpNotificationReadEntity.count({
        where: {
          user_id: input.user_id,
          submission_id: { in: submissionIds },
        },
      });

      return { count: submissionIds.length - readCount };
    }),

  // ===== 管理员功能 =====
  // 获取所有RSVP列表（管理员视角）
  listAllRSVPs: protectedProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        worksId: z.string().optional(),
        uid: z.number().optional(),
        skip: z.number().optional(),
        take: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // 1. 获取所有未删除的RSVP配置
      const allFormConfigs = await ctx.prisma.rsvpFormConfigEntity.findMany({
        where: {
          deleted: false,
        },
        orderBy: { create_time: 'desc' },
      });

      // 2. 获取所有关联的作品ID
      const worksIds = allFormConfigs
        .map(config => config.works_id)
        .filter((id): id is string => !!id);

      // 3. 批量查询作品信息
      const works = await ctx.prisma.worksEntity.findMany({
        where: {
          id: { in: worksIds },
          deleted: false,
        },
        select: {
          id: true,
          title: true,
          cover: true,
          uid: true,
          create_time: true,
        },
      });

      // 4. 创建作品映射
      const worksMap = new Map(works.map(w => [w.id, w]));

      // 5. 应用筛选条件
      let filteredConfigs = allFormConfigs;

      // 5.1 作品ID筛选
      if (input.worksId) {
        filteredConfigs = filteredConfigs.filter(
          config => config.works_id === input.worksId
        );
      }

      // 5.2 用户ID筛选
      if (input.uid) {
        filteredConfigs = filteredConfigs.filter(config => {
          const work = worksMap.get(config.works_id);
          return work?.uid === input.uid;
        });
      }

      // 5.3 关键字搜索过滤（如果有关键字）
      if (input.keyword) {
        const keyword = input.keyword.toLowerCase();
        filteredConfigs = filteredConfigs.filter(config => {
          const work = worksMap.get(config.works_id);
          return (
            config.title?.toLowerCase().includes(keyword) ||
            work?.title?.toLowerCase().includes(keyword)
          );
        });
      }

      // 6. 计算总数
      const total = filteredConfigs.length;

      // 7. 分页
      const paginatedConfigs = filteredConfigs.slice(
        input.skip || 0,
        (input.skip || 0) + (input.take || 20)
      );

      // 8. 组合数据
      const data = paginatedConfigs.map(config => ({
        ...config,
        works: worksMap.get(config.works_id) || null,
      }));

      return {
        data,
        total,
      };
    }),
});
