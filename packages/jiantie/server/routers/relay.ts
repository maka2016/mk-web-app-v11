import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';

// ===== Zod Schemas =====
const RelayConfigInput = z.object({
  works_id: z.string(),
  enabled: z.boolean().optional(),
  button_text: z.string().nullable().optional(),
  share_title: z.string().nullable().optional(),
  share_desc: z.string().nullable().optional(),
  show_user_list: z.boolean().optional(),
  list_display_mode: z.enum(['horizontal', 'grid']).nullable().optional(),
  max_relay_count: z.number().int().nullable().optional(),
  theme: z.any().nullable().optional(),
  content_prefix: z.string().nullable().optional(),
  content_suffix: z.string().nullable().optional(),
  enable_message: z.boolean().optional(),
  message_presets: z.array(z.string()).nullable().optional(),
});

const RelayConfigUpdateInput = z.object({
  id: z.string(),
  enabled: z.boolean().optional(),
  button_text: z.string().nullable().optional(),
  share_title: z.string().nullable().optional(),
  share_desc: z.string().nullable().optional(),
  show_user_list: z.boolean().optional(),
  list_display_mode: z.enum(['horizontal', 'grid']).nullable().optional(),
  max_relay_count: z.number().int().nullable().optional(),
  theme: z.any().nullable().optional(),
  deleted: z.boolean().optional(),
  content_prefix: z.string().nullable().optional(),
  content_suffix: z.string().nullable().optional(),
  enable_message: z.boolean().optional(),
  message_presets: z.array(z.string()).nullable().optional(),
});

const RelaySubmitInput = z.object({
  works_id: z.string(),
  user_openid: z.string(),
  user_unionid: z.string().optional(),
  user_nickname: z.string(),
  user_avatar: z.string().optional(),
  share_source: z.string().optional(), // 来源用户的openid
  user_message: z.string().nullable().optional(), // 用户留言（可选）
});

// ===== 验证辅助函数 =====
/**
 * 验证作品是否存在
 * @param prisma Prisma 客户端
 * @param worksId 作品ID
 * @param checkDeleted 是否检查作品是否已删除（默认 true）
 * @returns 作品信息
 */
async function verifyWorks(
  prisma: any,
  worksId: string,
  checkDeleted: boolean = true
) {
  const works = await prisma.worksEntity.findUnique({
    where: { id: worksId },
    select: { id: true, deleted: true },
  });

  if (!works) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `作品不存在：${worksId}`,
    });
  }

  if (checkDeleted && works.deleted) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '无法操作已删除的作品',
    });
  }

  return works;
}

/**
 * 验证作品是否存在且属于当前用户
 * @param prisma Prisma 客户端
 * @param worksId 作品ID
 * @param uid 当前用户ID
 * @param checkDeleted 是否检查作品是否已删除（默认 true）
 * @returns 作品信息
 */
async function verifyWorksOwner(
  prisma: any,
  worksId: string,
  uid: number,
  checkDeleted: boolean = true
) {
  const works = await prisma.worksEntity.findUnique({
    where: { id: worksId },
    select: { id: true, uid: true, deleted: true },
  });

  if (!works) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `作品不存在：${worksId}`,
    });
  }

  if (checkDeleted && works.deleted) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '无法操作已删除的作品',
    });
  }

  if (works.uid !== uid) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '无权操作该作品',
    });
  }

  return works;
}

/**
 * 验证模版是否存在且属于当前用户
 * @param prisma Prisma 客户端
 * @param templateId 模版ID
 * @param uid 当前用户ID
 * @param checkDeleted 是否检查模版是否已删除（默认 true）
 * @returns 模版信息
 */
async function verifyTemplateOwner(
  prisma: any,
  templateId: string,
  uid: number,
  checkDeleted: boolean = true
) {
  const template = await prisma.templateEntity.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      deleted: true,
      designer_uid: true,
      designer_works_id: true,
    },
  });

  if (!template) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `模版不存在：${templateId}`,
    });
  }

  if (checkDeleted && template.deleted) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '无法操作已删除的模版',
    });
  }

  // 验证模版所有者
  // 1. 如果模版有 designer_works_id，检查该作品的 uid
  if (template.designer_works_id) {
    const works = await prisma.worksEntity.findUnique({
      where: { id: template.designer_works_id },
      select: { uid: true },
    });

    if (works && works.uid === uid) {
      return template;
    }
  }

  // 2. 如果模版有 designer_uid，检查是否等于当前用户的 uid
  if (template.designer_uid && template.designer_uid === uid) {
    return template;
  }

  // 如果都不匹配，说明无权操作
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: '无权操作该模版',
  });
}

export const relayRouter = router({
  // ===== Config =====
  /**
   * 获取接力配置和统计信息
   */
  getConfig: publicProcedure
    .input(z.object({ works_id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 判断是否是模版ID（模版ID以 T_ 开头）
      const isTemplateId = input.works_id.startsWith('T_');

      if (isTemplateId) {
        // 如果是模版ID，从模版的 relay_config 字段读取配置
        const template = await ctx.prisma.templateEntity.findUnique({
          where: { id: input.works_id },
          select: {
            relay_config: true,
            deleted: true,
          },
        });

        if (!template) {
          return {
            config: null,
            relay_count: 0,
            current_user_relayed: false,
            current_user_record: null,
          };
        }

        if (template.deleted) {
          return {
            config: null,
            relay_count: 0,
            current_user_relayed: false,
            current_user_record: null,
          };
        }

        // 将模版的 relay_config 转换为 RelayConfigEntity 格式
        const relayConfig = template.relay_config as any;
        const config = relayConfig
          ? {
              id: 'template-preview', // 预览模式使用特殊ID
              works_id: input.works_id,
              enabled: relayConfig.enabled ?? true,
              button_text: relayConfig.button_text ?? null,
              share_title: relayConfig.share_title ?? null,
              share_desc: relayConfig.share_desc ?? null,
              show_user_list: relayConfig.show_user_list ?? true,
              list_display_mode:
                relayConfig.list_display_mode ?? 'horizontal',
              max_relay_count: relayConfig.max_relay_count ?? null,
              theme: relayConfig.theme ?? null,
              content_prefix: relayConfig.content_prefix ?? null,
              content_suffix: relayConfig.content_suffix ?? null,
              enable_message: relayConfig.enable_message ?? false,
              message_presets: relayConfig.message_presets ?? null,
              deleted: false,
              create_time: new Date(),
              update_time: new Date(),
            }
          : null;

        return {
          config: config,
          relay_count: 0, // 模版预览模式下，接力数为0
          current_user_relayed: false,
          current_user_record: null,
        };
      }

      // 如果是作品ID，使用原有逻辑
      // 验证作品存在
      await verifyWorks(ctx.prisma, input.works_id, false);

      // 获取配置
      const config = await ctx.prisma.relayConfigEntity.findFirst({
        where: {
          works_id: input.works_id,
          deleted: false,
        },
      });

      // 获取接力总数
      const relayCount = await ctx.prisma.relayRecordEntity.count({
        where: {
          works_id: input.works_id,
          deleted: false,
        },
      });

      // 检查当前用户是否已接力（如果提供了openid）
      // 注意：openid 应该通过 submit 接口传入，这里不处理
      let currentUserRelayed = false;
      let currentUserRecord = null;

      return {
        config: config || null,
        relay_count: relayCount,
        current_user_relayed: currentUserRelayed,
        current_user_record: currentUserRecord,
      };
    }),

  /**
   * 创建/更新接力配置（管理员）
   */
  upsertConfig: protectedProcedure
    .input(RelayConfigInput)
    .mutation(async ({ ctx, input }) => {
      // 判断是否是模版ID（模版ID以 T_ 开头）
      const isTemplateId = input.works_id.startsWith('T_');

      if (isTemplateId) {
        // 如果是模版ID，验证模版所有者并更新模版的 relay_config
        await verifyTemplateOwner(ctx.prisma, input.works_id, ctx.uid, true);

        // 获取模版当前的 relay_config（如果有）
        const template = await ctx.prisma.templateEntity.findUnique({
          where: { id: input.works_id },
          select: { relay_config: true },
        });

        const existingRelayConfig = (template?.relay_config as any) || {};

        // 构建新的 relay_config 数据
        const relayConfigData = {
          enabled: input.enabled ?? existingRelayConfig.enabled ?? true,
          button_text: input.button_text ?? existingRelayConfig.button_text ?? null,
          share_title: input.share_title ?? existingRelayConfig.share_title ?? null,
          share_desc: input.share_desc ?? existingRelayConfig.share_desc ?? null,
          show_user_list: input.show_user_list ?? existingRelayConfig.show_user_list ?? true,
          list_display_mode:
            input.list_display_mode ?? existingRelayConfig.list_display_mode ?? 'horizontal',
          max_relay_count: input.max_relay_count ?? existingRelayConfig.max_relay_count ?? null,
          theme: input.theme ?? existingRelayConfig.theme ?? null,
          content_prefix: input.content_prefix ?? existingRelayConfig.content_prefix ?? null,
          content_suffix: input.content_suffix ?? existingRelayConfig.content_suffix ?? null,
          enable_message: input.enable_message ?? existingRelayConfig.enable_message ?? false,
          message_presets:
            input.message_presets ?? existingRelayConfig.message_presets ?? null,
        };

        // 更新模版的 relay_config 字段
        await ctx.prisma.templateEntity.update({
          where: { id: input.works_id },
          data: {
            relay_config: relayConfigData as any,
          },
        });

        // 返回格式化的配置（模拟 RelayConfigEntity 格式）
        return {
          id: 'template-config',
          works_id: input.works_id,
          ...relayConfigData,
          deleted: false,
          create_time: new Date(),
          update_time: new Date(),
        };
      }

      // 如果是作品ID，使用原有逻辑
      // 验证作品是否存在且属于当前用户
      await verifyWorksOwner(ctx.prisma, input.works_id, ctx.uid, true);

      // 查找是否已存在配置
      const exists = await ctx.prisma.relayConfigEntity.findFirst({
        where: { works_id: input.works_id, deleted: false },
      });

      if (exists) {
        // 更新现有配置
        return ctx.prisma.relayConfigEntity.update({
          where: { id: exists.id },
          data: {
            enabled: input.enabled ?? exists.enabled,
            button_text: input.button_text ?? exists.button_text,
            share_title: input.share_title ?? exists.share_title,
            share_desc: input.share_desc ?? exists.share_desc,
            show_user_list: input.show_user_list ?? exists.show_user_list,
            list_display_mode:
              input.list_display_mode ?? exists.list_display_mode,
            max_relay_count: input.max_relay_count ?? exists.max_relay_count,
            theme: input.theme ?? exists.theme,
            content_prefix: input.content_prefix ?? exists.content_prefix,
            content_suffix: input.content_suffix ?? exists.content_suffix,
            enable_message: input.enable_message ?? exists.enable_message,
            message_presets:
              input.message_presets ?? (exists.message_presets as any),
          },
        });
      }

      // 创建新配置
      return ctx.prisma.relayConfigEntity.create({
        data: {
          works_id: input.works_id,
          enabled: input.enabled ?? true,
          button_text: input.button_text ?? null,
          share_title: input.share_title ?? null,
          share_desc: input.share_desc ?? null,
          show_user_list: input.show_user_list ?? true,
          list_display_mode: input.list_display_mode ?? 'horizontal',
          max_relay_count: input.max_relay_count ?? null,
          theme: input.theme ?? null,
          content_prefix: input.content_prefix ?? null,
          content_suffix: input.content_suffix ?? null,
          enable_message: input.enable_message ?? false,
          message_presets: input.message_presets ?? (null as any),
        },
      });
    }),

  /**
   * 更新接力配置
   */
  updateConfig: protectedProcedure
    .input(RelayConfigUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 验证配置存在且属于当前用户
      const config = await ctx.prisma.relayConfigEntity.findUnique({
        where: { id },
        include: { works: true },
      });

      if (!config || config.deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '配置不存在',
        });
      }

      if (config.works.uid !== ctx.uid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权操作该配置',
        });
      }

      return ctx.prisma.relayConfigEntity.update({
        where: { id },
        data: {
          ...data,
          message_presets: data.message_presets ?? (null as any),
        },
      });
    }),

  // ===== Records =====
  /**
   * 获取接力用户列表（分页）
   */
  getList: publicProcedure
    .input(
      z.object({
        works_id: z.string(),
        skip: z.number().int().min(0).default(0),
        take: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // 判断是否是模版ID（模版ID以 T_ 开头）
      const isTemplateId = input.works_id.startsWith('T_');

      if (isTemplateId) {
        // 模版预览模式下，返回空列表
        return {
          data: [],
          total: 0,
        };
      }

      // 验证作品存在
      await verifyWorks(ctx.prisma, input.works_id, false);

      // 获取配置（用于获取config_id）
      const config = await ctx.prisma.relayConfigEntity.findFirst({
        where: {
          works_id: input.works_id,
          deleted: false,
        },
      });

      if (!config) {
        return {
          data: [],
          total: 0,
        };
      }

      // 查询接力记录
      const [data, total] = await Promise.all([
        ctx.prisma.relayRecordEntity.findMany({
          where: {
            config_id: config.id,
            deleted: false,
          },
          orderBy: {
            relay_time: 'desc',
          },
          skip: input.skip,
          take: input.take,
        }),
        ctx.prisma.relayRecordEntity.count({
          where: {
            config_id: config.id,
            deleted: false,
          },
        }),
      ]);

      return {
        data,
        total,
      };
    }),

  /**
   * 提交接力记录
   */
  submit: publicProcedure
    .input(RelaySubmitInput)
    .mutation(async ({ ctx, input }) => {
      // 验证作品存在
      await verifyWorks(ctx.prisma, input.works_id, false);

      // 获取或创建配置
      let config = await ctx.prisma.relayConfigEntity.findFirst({
        where: {
          works_id: input.works_id,
          deleted: false,
        },
      });

      if (!config) {
        // 如果没有配置，自动创建一个默认配置
        config = await ctx.prisma.relayConfigEntity.create({
          data: {
            works_id: input.works_id,
            enabled: true,
            show_user_list: true,
            list_display_mode: 'horizontal',
          },
        });
      }

      if (!config.enabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '接力功能已禁用',
        });
      }

      // 检查是否已达到最大接力人数
      if (config.max_relay_count) {
        const currentCount = await ctx.prisma.relayRecordEntity.count({
          where: {
            config_id: config.id,
            deleted: false,
          },
        });

        if (currentCount >= config.max_relay_count) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `接力人数已达到上限（${config.max_relay_count}人）`,
          });
        }
      }

      // 检查是否已接力（防重复）- 确保 openid 匹配
      const normalizedOpenid = input.user_openid?.trim();
      const existingRecord = await ctx.prisma.relayRecordEntity.findFirst({
        where: {
          config_id: config.id,
          user_openid: normalizedOpenid,
          deleted: false,
        },
      });

      if (existingRecord) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '您已经参与过接力了',
        });
      }

      // 获取IP和User-Agent（用于风控）
      // 注意：在实际部署环境中，IP和User-Agent应该从请求头中获取
      // 这里暂时设为null，如果需要可以从context中扩展
      const ipAddress = null;
      const userAgent = null;

      // 处理“软删除记录导致唯一约束冲突”的情况：如果存在 deleted=true 的旧记录，则恢复它
      const anyRecord = await ctx.prisma.relayRecordEntity.findFirst({
        where: {
          config_id: config.id,
          user_openid: normalizedOpenid,
          // 注意：不加 deleted 过滤
        },
      });
      if (anyRecord?.deleted) {
        const revived = await ctx.prisma.relayRecordEntity.update({
          where: { id: anyRecord.id },
          data: {
            deleted: false,
            relay_time: new Date(),
            user_unionid: input.user_unionid || null,
            user_nickname: input.user_nickname,
            user_avatar: input.user_avatar || null,
            share_source: input.share_source || null,
            user_message: input.user_message || null,
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        });

        return {
          success: true,
          message: '接力成功！',
          relay_id: revived.id,
        };
      }

      // 创建接力记录
      try {
        const record = await ctx.prisma.relayRecordEntity.create({
          data: {
            config_id: config.id,
            works_id: input.works_id,
            user_openid: normalizedOpenid,
            user_unionid: input.user_unionid || null,
            user_nickname: input.user_nickname,
            user_avatar: input.user_avatar || null,
            share_source: input.share_source || null,
            user_message: input.user_message || null,
            ip_address: ipAddress,
            user_agent: userAgent,
          },
        });

        return {
          success: true,
          message: '接力成功！',
          relay_id: record.id,
        };
      } catch (error: any) {
        // 捕获唯一约束错误（P2002），转换为友好的错误消息
        // 这种情况可能发生在并发请求或检查逻辑未覆盖的边缘情况
        if (error?.code === 'P2002') {
          // 检查是否是 config_id + user_openid 的唯一约束
          const target = error?.meta?.target;
          const isUniqueConstraintError =
            Array.isArray(target) &&
            target.includes('config_id') &&
            target.includes('user_openid');

          // 也检查错误消息中是否包含唯一约束相关的关键词
          const errorMessage = String(error?.message || '').toLowerCase();
          const hasUniqueConstraintInMessage =
            errorMessage.includes('unique constraint') ||
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('constraint failed');

          if (isUniqueConstraintError || hasUniqueConstraintInMessage) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '您已经参与过接力了',
            });
          }
        }

        // 对于其他数据库错误，也要检查是否包含唯一约束相关信息
        const errorMessage = String(error?.message || '').toLowerCase();
        if (
          errorMessage.includes('unique constraint') &&
          (errorMessage.includes('config_id') ||
            errorMessage.includes('user_openid'))
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '您已经参与过接力了',
          });
        }

        // 如果无法识别错误类型，记录日志并抛出友好的错误
        console.error('Relay submit unexpected error:', {
          code: error?.code,
          message: error?.message,
          meta: error?.meta,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '接力失败，请重试',
        });
      }
    }),

  /**
   * 检查用户是否已接力
   */
  check: publicProcedure
    .input(
      z.object({
        works_id: z.string(),
        openid: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const normalizedOpenid = input.openid?.trim();

      // 判断是否是模版ID（模版ID以 T_ 开头）
      const isTemplateId = input.works_id.startsWith('T_');

      if (isTemplateId) {
        // 模版预览模式下，返回未接力状态
        return {
          relayed: false,
          relay_record: null,
          user_rank: null,
        };
      }

      // 获取配置
      const config = await ctx.prisma.relayConfigEntity.findFirst({
        where: {
          works_id: input.works_id,
          deleted: false,
        },
      });

      if (!config) {
        return {
          relayed: false,
          relay_record: null,
          user_rank: null,
        };
      }

      // 查找接力记录（确保 openid 匹配，去除可能的空格）
      const record = await ctx.prisma.relayRecordEntity.findFirst({
        where: {
          config_id: config.id,
          user_openid: normalizedOpenid,
          deleted: false,
        },
      });

      if (!record) {
        // 调试：检查是否有其他记录（可能 openid 不匹配）
        return {
          relayed: false,
          relay_record: null,
          user_rank: null,
        };
      }

      // 计算用户排名：按照 relay_time 升序排序，计算排名
      // 排名 = 有多少人的 relay_time 早于或等于当前用户的 relay_time
      const earlierOrEqualCount = await ctx.prisma.relayRecordEntity.count({
        where: {
          config_id: config.id,
          deleted: false,
          relay_time: {
            lte: record.relay_time,
          },
        },
      });

      return {
        relayed: true,
        relay_record: record,
        user_rank: earlierOrEqualCount,
      };
    }),

  /**
   * 删除接力记录（调试用）
   */
  deleteRecord: publicProcedure
    .input(
      z.object({
        works_id: z.string(),
        openid: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 验证作品存在
      await verifyWorks(ctx.prisma, input.works_id, false);

      // 获取配置
      const config = await ctx.prisma.relayConfigEntity.findFirst({
        where: {
          works_id: input.works_id,
          deleted: false,
        },
      });

      if (!config) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '接力配置不存在',
        });
      }

      // 查找并软删除接力记录
      const record = await ctx.prisma.relayRecordEntity.findFirst({
        where: {
          config_id: config.id,
          user_openid: input.openid,
          deleted: false,
        },
      });

      if (!record) {
        return { success: true, message: '记录不存在或已删除' };
      }

      // 软删除
      await ctx.prisma.relayRecordEntity.update({
        where: { id: record.id },
        data: { deleted: true },
      });

      return { success: true, message: '接力记录已删除' };
    }),
});
