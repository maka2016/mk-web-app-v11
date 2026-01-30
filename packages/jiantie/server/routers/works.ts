import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { defaultWorksData } from '../defaultWorksData';
import { copyTemplateToWorksAssets, copyWorksAssets, getUserWorksAssetsPath } from '../oss/copy-works-assets';
import { getTemplateAssetsPath, getTemplateDataFromOSS, saveWorksDataToOSS } from '../oss/works-storage';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { SerializedWorksEntity, generateWorksId, getWorksDataWithOSS, replacePath } from '../utils/works-utils';
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
        // @deprecated
        is_rsvp: z.boolean().optional(),
        envelope_enabled: z.boolean().optional(),
        envelope_config: z.any().optional(), // JSON: 信封完整配置（包含6张图片、视频背景等）
        metadata: z.any().optional(), // JSON: 额外的元数据
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { template_id } = input;

      // 生成唯一的作品ID（使用认证后的 ctx.uid）
      const worksId = await generateWorksId(ctx.prisma, ctx.uid);

      let createWorksData: any = defaultWorksData;
      let finalInput = { ...input, is_title_desc_modified: false };
      let templateRelayConfig: any = null;
      let templateRsvpConfig: any = null;

      // 如果是从模板创建
      if (template_id) {
        try {
          // 获取模板详情
          const template = await ctx.prisma.templateEntity.findUnique({
            where: { id: template_id },
          });

          if (!template) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: '模板不存在',
            });
          }

          // 继承模板配置
          if (template.spec_id) {
            Object.assign(finalInput, {
              spec_id: template.spec_id,
              envelope_enabled: template.envelope_enabled,
              envelope_config: template.envelope_config,
              share_type: template.share_type,
              cover: (template.coverV3 as any)?.url,
            });
          }

          // 保存模版的 relay_config，用于后续创建接力配置
          templateRelayConfig = template.relay_config;
          // 保存模版的 rsvp_config，用于后续创建RSVP配置
          templateRsvpConfig = template.rsvp_config;

          const worksAssetPath = getUserWorksAssetsPath(ctx.uid, worksId);
          const templateAssetPath = getTemplateAssetsPath(template_id);

          // 并行获取模板数据和复制资源
          const [templateData] = await Promise.all([
            getTemplateDataFromOSS(template_id),
            copyTemplateToWorksAssets(ctx.uid, worksId, template_id),
          ]);

          const templateDataJSON = JSON.stringify(templateData);
          const newTemplateJSON = replacePath(templateDataJSON, templateAssetPath, worksAssetPath);
          createWorksData = JSON.parse(newTemplateJSON);
        } catch (error) {
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
        await saveWorksDataToOSS(work.id, work.uid, String(work.version), createWorksData);
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

      // 如果是从模版创建且模版有接力配置，自动创建接力配置
      if (template_id && templateRelayConfig) {
        try {
          await ctx.prisma.relayConfigEntity.create({
            data: {
              works_id: work.id,
              enabled: templateRelayConfig.enabled ?? true,
              button_text: templateRelayConfig.button_text ?? null,
              share_title: templateRelayConfig.share_title ?? null,
              share_desc: templateRelayConfig.share_desc ?? null,
              show_user_list: templateRelayConfig.show_user_list ?? true,
              list_display_mode: templateRelayConfig.list_display_mode ?? 'horizontal',
              max_relay_count: templateRelayConfig.max_relay_count ?? null,
              theme: templateRelayConfig.theme ?? null,
              content_prefix: templateRelayConfig.content_prefix ?? null,
              content_suffix: templateRelayConfig.content_suffix ?? null,
              enable_message: templateRelayConfig.enable_message ?? false,
              message_presets: templateRelayConfig.message_presets ?? null,
            },
          });
        } catch (error) {
          console.error('Failed to create relay config from template:', error);
          // 接力配置创建失败不影响作品创建，只记录错误
        }
      }

      // 如果是从模版创建且模版有RSVP配置，自动创建RSVP配置
      if (template_id && templateRsvpConfig) {
        try {
          await ctx.prisma.rsvpFormConfigEntity.create({
            data: {
              works_id: work.id,
              title: templateRsvpConfig.title,
              desc: templateRsvpConfig.desc ?? null,
              form_fields: templateRsvpConfig.form_fields,
              success_feedback_config: templateRsvpConfig.success_feedback_config ?? null,
              enabled: templateRsvpConfig.enabled ?? false,
              collect_form: templateRsvpConfig.collect_form ?? false,
              allow_multiple_submit: true,
              require_approval: false,
              max_submit_count: null,
              submit_deadline: null,
            },
          });
        } catch (error) {
          console.error('Failed to create RSVP config from template:', error);
          // RSVP配置创建失败不影响作品创建，只记录错误
        }
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

      const works = (await ctx.prisma.worksEntity.findMany({
        where,
        skip: input?.skip,
        take: input?.take,
        orderBy: { update_time: 'desc' },
        include: {
          specInfo: true,
          rsvp_form_config: true,
          rsvp_contacts: true,
        },
      })) as SerializedWorksEntity[];

      // 为所有 website 类型的作品加载 RSVP 统计信息
      const websiteWorks = works.filter(work => work.specInfo?.export_format?.includes('html'));

      // 批量查询 RSVP 统计信息
      const rsvpStatsMap = new Map<string, { invited: number; replied: number }>();

      if (websiteWorks.length > 0) {
        // 筛选出有 RSVP 配置且启用的作品
        const worksWithRsvp = websiteWorks.filter(work => {
          const formConfig = work.rsvp_form_config;
          return formConfig && formConfig.enabled && !formConfig.deleted;
        });

        if (worksWithRsvp.length > 0) {
          const worksIds = worksWithRsvp.map(work => work.id);
          const formConfigIds = worksWithRsvp.map(work => work.rsvp_form_config?.id).filter((id): id is string => !!id);

          // 批量查询所有作品的嘉宾（一次查询）
          const allInvitees = await ctx.prisma.rsvpContactEntity.findMany({
            where: {
              works_id: {
                in: worksIds,
              },
              uid: ctx.uid,
              deleted: false,
            },
            select: {
              id: true,
              works_id: true,
            },
          });

          // 按 works_id 分组统计邀请数量
          const invitedCountByWorksId = new Map<string, number>();
          for (const invitee of allInvitees) {
            if (invitee.works_id) {
              invitedCountByWorksId.set(invitee.works_id, (invitedCountByWorksId.get(invitee.works_id) || 0) + 1);
            }
          }

          // 批量查询所有相关的提交记录（一次查询）
          const allSubmissions =
            formConfigIds.length > 0
              ? await ctx.prisma.rsvpSubmissionEntity.findMany({
                  where: {
                    form_config_id: {
                      in: formConfigIds,
                    },
                    deleted: false,
                  },
                  select: {
                    contact_id: true,
                    form_config_id: true,
                  },
                })
              : [];

          // 构建 form_config_id 到 works_id 的映射
          const formConfigToWorksIdMap = new Map<string, string>();
          for (const work of worksWithRsvp) {
            if (work.rsvp_form_config?.id) {
              formConfigToWorksIdMap.set(work.rsvp_form_config.id, work.id);
            }
          }

          // 构建 works_id 到 contact_id 集合的映射（用于过滤提交记录）
          const contactIdsByWorksId = new Map<string, Set<string>>();
          for (const invitee of allInvitees) {
            if (invitee.works_id && invitee.id) {
              if (!contactIdsByWorksId.has(invitee.works_id)) {
                contactIdsByWorksId.set(invitee.works_id, new Set());
              }
              contactIdsByWorksId.get(invitee.works_id)?.add(invitee.id);
            }
          }

          // 对每个 works_id 去重统计回复数量
          const repliedContactIdsByWorksId = new Map<string, Set<string>>();
          for (const submission of allSubmissions) {
            if (submission.contact_id && submission.form_config_id) {
              const worksId = formConfigToWorksIdMap.get(submission.form_config_id);
              if (worksId) {
                const contactIds = contactIdsByWorksId.get(worksId);
                if (contactIds?.has(submission.contact_id)) {
                  if (!repliedContactIdsByWorksId.has(worksId)) {
                    repliedContactIdsByWorksId.set(worksId, new Set());
                  }
                  repliedContactIdsByWorksId.get(worksId)?.add(submission.contact_id);
                }
              }
            }
          }

          // 构建最终的统计信息
          for (const work of worksWithRsvp) {
            const invited = invitedCountByWorksId.get(work.id) || 0;
            const repliedSet = repliedContactIdsByWorksId.get(work.id);
            const replied = repliedSet?.size || 0;

            rsvpStatsMap.set(work.id, {
              invited,
              replied,
            });
          }
        }
      }

      // 将统计信息添加到作品对象中
      const worksWithStats = works.map(work => {
        const stats = rsvpStatsMap.get(work.id);
        return {
          ...work,
          rsvpStats: stats || null,
        };
      });

      return worksWithStats as SerializedWorksEntity[];
    }),

  // 查询列表（内部API，不需要登录，按uid查询）
  findManyInternal: publicProcedure
    .input(
      z.object({
        uid: z.number().optional(),
        work_id: z.string().optional(), // 作品ID精确匹配
        deleted: z.boolean().optional(),
        is_folder: z.boolean().optional(),
        folder_id: z.string().optional(),
        keyword: z.string().optional(),
        spec_id: z.string().optional(),
        spec_id_not: z.string().optional(),
        template_id: z.string().optional(),
        appid: z.string().optional(),
        version_gte: z.number().optional(), // 版本大于等于
        is_paid: z.enum(['all', 'paid', 'unpaid']).optional().default('all'), // 支付状态：全部、已付费、未付费
        skip: z.number().optional(),
        take: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.uid) {
        where.uid = input.uid;
      }

      // 作品ID过滤
      if (input.work_id) {
        where.id = input.work_id;
      }

      if (input.deleted !== undefined) where.deleted = input.deleted;
      if (input.is_folder !== undefined) where.is_folder = input.is_folder;
      if (input.folder_id !== undefined) where.folder_id = input.folder_id;

      // 规格过滤
      if (input.spec_id) {
        where.spec_id = input.spec_id;
      }
      if (input.spec_id_not) {
        where.spec_id = {
          not: input.spec_id_not,
        };
      }

      // 模板过滤
      if (input.template_id) {
        where.template_id = input.template_id;
      }

      // 关键字搜索（标题）
      if (input.keyword) {
        where.title = {
          contains: input.keyword,
          mode: 'insensitive', // 不区分大小写
        };
      }

      // AppID过滤
      if (input.appid) {
        where.appid = input.appid;
      }

      // 版本过滤（大于等于）
      if (input.version_gte !== undefined) {
        where.version = {
          gte: input.version_gte,
        };
      }

      // 如果需要按支付状态筛选，先查询所有符合条件的作品ID
      if (input.is_paid && input.is_paid !== 'all') {
        // 先查询所有符合条件的作品ID（不分页）
        const allWorks = await ctx.prisma.worksEntity.findMany({
          where,
          select: {
            id: true,
          },
        });

        const allWorkIds = allWorks.map(w => w.id);

        // 如果没有作品，直接返回
        if (allWorkIds.length === 0) {
          return [];
        }

        // 查询所有相关的订单记录
        const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
          where: {
            work_id: { in: allWorkIds },
            deleted: false,
            payment_type: {
              not: '', // payment_type 不为空表示已支付
            },
          },
          select: {
            work_id: true,
            payment_time: true,
          },
          orderBy: {
            payment_time: 'desc',
          },
        });

        // 构建已付费的作品ID集合
        const paidWorkIds = new Set(orderRecords.map(r => r.work_id).filter((id): id is string => !!id));

        // 根据支付状态筛选作品ID
        let filteredWorkIds: string[] = [];
        if (input.is_paid === 'paid') {
          filteredWorkIds = allWorkIds.filter(w => paidWorkIds.has(w));
        } else if (input.is_paid === 'unpaid') {
          filteredWorkIds = allWorkIds.filter(w => !paidWorkIds.has(w));
        }

        // 如果筛选后没有作品，直接返回
        if (filteredWorkIds.length === 0) {
          return [];
        }

        // 更新 where 条件，只查询筛选后的作品ID
        where.id = { in: filteredWorkIds };
      }

      const works = (await ctx.prisma.worksEntity.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: { update_time: 'desc' },
        include: {
          specInfo: true,
        },
      })) as SerializedWorksEntity[];

      // 如果需要返回付费状态，查询订单记录
      if (input.is_paid && input.is_paid !== 'all') {
        const workIds = works.map(w => w.id);
        if (workIds.length > 0) {
          const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
            where: {
              work_id: { in: workIds },
              deleted: false,
              payment_type: {
                not: '',
              },
            },
            select: {
              work_id: true,
              payment_time: true,
            },
            orderBy: {
              payment_time: 'desc',
            },
          });

          const paidWorkIds = new Set(orderRecords.map(r => r.work_id).filter((id): id is string => !!id));

          // 为每个作品添加支付状态
          return works.map(work => ({
            ...work,
            is_paid: paidWorkIds.has(work.id),
          })) as any[];
        }
      }

      // 即使不需要筛选，也查询并返回付费状态
      const workIds = works.map(w => w.id);
      if (workIds.length > 0) {
        const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
          where: {
            work_id: { in: workIds },
            deleted: false,
            payment_type: {
              not: '',
            },
          },
          select: {
            work_id: true,
            payment_time: true,
          },
          orderBy: {
            payment_time: 'desc',
          },
        });

        const paidWorkIds = new Set(orderRecords.map(r => r.work_id).filter((id): id is string => !!id));

        // 为每个作品添加支付状态
        return works.map(work => ({
          ...work,
          is_paid: paidWorkIds.has(work.id),
        })) as any[];
      }

      return works.map(work => ({
        ...work,
        is_paid: false,
      })) as any[];
    }),

  // 根据ID查询
  findById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const work = (await ctx.prisma.worksEntity.findUnique({
      where: { id: input.id },
      include: {
        specInfo: true, // 通过关联查询直接获取 spec 信息
      },
    })) as SerializedWorksEntity;

    if (!work) {
      throw new Error('作品不存在');
    }

    if (work.deleted) {
      throw new Error('作品已删除');
    }

    return work;
  }),

  // 根据别名查询
  findByAlias: publicProcedure.input(z.object({ alias: z.string() })).query(async ({ ctx, input }) => {
    const work = (await ctx.prisma.worksEntity.findFirst({
      where: {
        alias: input.alias,
        deleted: false,
      },
      include: {
        specInfo: true, // 通过关联查询直接获取 spec 信息
      },
    })) as SerializedWorksEntity;

    if (!work) {
      throw new Error('作品不存在');
    }

    return work;
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
      try {
        const result = await getWorksDataWithOSS({
          prisma: ctx.prisma,
          worksId: input.id,
          version: input.version,
        });

        return result;
      } catch (error: any) {
        console.log(error, 'error');
        // 将普通错误转换为 TRPCError
        if (error.message === '作品不存在' || error.message === '作品已删除') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: error.message,
          });
        }
        throw error;
      }
    }),

  // 更新作品
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        // 基础信息更新
        title: z.string().optional(),
        desc: z.string().optional(),
        cover: z.string().optional(),
        coverV3: z
          .object({
            url: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
          })
          .optional(),
        deleted: z.boolean().optional(),
        folder_id: z.string().optional(),
        custom_time: z.date().optional(),
        offline: z.boolean().optional(),
        // @deprecated
        is_rsvp: z.boolean().optional(),
        is_title_desc_modified: z.boolean().optional(),
        // 其他配置
        envelope_enabled: z.boolean().optional(),
        envelope_config: z.any().optional(), // JSON: 信封完整配置（包含6张图片、视频背景等）
        share_type: z.enum(['invite', 'poster', 'other']).optional(), // 分享类型：invite、poster、other
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 验证作品所有权
      const work = (await ctx.prisma.worksEntity.findUnique({
        where: { id },
      })) as SerializedWorksEntity;

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

  // 切换作品规格（变更 spec_id，并返回带最新规格信息的作品）
  switchSpec: protectedProcedure
    .input(
      z.object({
        id: z.string(), // 作品ID
        spec_id: z.string(), // 目标规格ID
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, spec_id } = input;

      // 验证作品存在且属于当前用户
      const work = (await ctx.prisma.worksEntity.findUnique({
        where: { id },
      })) as SerializedWorksEntity | null;

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

      if (work.deleted) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '作品已删除，无法修改规格',
        });
      }

      // 校验目标规格存在且未删除
      const spec = await ctx.prisma.worksSpecEntity.findFirst({
        where: {
          id: spec_id,
          deleted: false,
        },
      });

      if (!spec) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '目标规格不存在或已删除',
        });
      }

      // 更新作品绑定的规格
      const updatedWork = (await ctx.prisma.worksEntity.update({
        where: { id },
        data: {
          spec_id,
        },
        include: {
          specInfo: true,
        },
      })) as SerializedWorksEntity;

      return updatedWork;
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
      const work = (await ctx.prisma.worksEntity.findUnique({
        where: { id: input.id },
      })) as SerializedWorksEntity;

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
        await saveWorksDataToOSS(input.id, work.uid, String(newVersion), input.content);

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
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // 验证作品所有权
    const work = (await ctx.prisma.worksEntity.findUnique({
      where: { id: input.id },
    })) as SerializedWorksEntity;

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

    return (await ctx.prisma.worksEntity.update({
      where: { id: input.id },
      data: { deleted: true },
    })) as SerializedWorksEntity;
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
      const works = (await ctx.prisma.worksEntity.findMany({
        where: {
          id: { in: input.ids },
        },
        select: { id: true, uid: true },
      })) as SerializedWorksEntity[];

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
  recover: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const work = (await ctx.prisma.worksEntity.findUnique({
      where: { id: input.id },
    })) as SerializedWorksEntity;

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

  // 恢复删除的作品（内部API，不需要登录，用于管理后台）
  recoverByUid: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const work = (await ctx.prisma.worksEntity.findUnique({
      where: { id: input.id },
    })) as SerializedWorksEntity;

    if (!work) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: '作品不存在',
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

  // 统计数量（内部API，不需要登录，按uid统计）
  countByUid: publicProcedure
    .input(
      z.object({
        uid: z.number().optional(),
        work_id: z.string().optional(), // 作品ID精确匹配
        deleted: z.boolean().optional(),
        is_folder: z.boolean().optional(),
        keyword: z.string().optional(),
        spec_id: z.string().optional(),
        spec_id_not: z.string().optional(),
        template_id: z.string().optional(),
        appid: z.string().optional(),
        version_gte: z.number().optional(), // 版本大于等于
        is_paid: z.enum(['all', 'paid', 'unpaid']).optional().default('all'), // 支付状态：全部、已付费、未付费
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.uid) {
        where.uid = input.uid;
      }

      // 作品ID过滤
      if (input.work_id) {
        where.id = input.work_id;
      }

      if (input.deleted !== undefined) where.deleted = input.deleted;
      if (input.is_folder !== undefined) where.is_folder = input.is_folder;

      // 规格过滤
      if (input.spec_id) {
        where.spec_id = input.spec_id;
      }
      if (input.spec_id_not) {
        where.spec_id = {
          not: input.spec_id_not,
        };
      }

      // 模板过滤
      if (input.template_id) {
        where.template_id = input.template_id;
      }

      // 关键字搜索（标题）
      if (input.keyword) {
        where.title = {
          contains: input.keyword,
          mode: 'insensitive',
        };
      }

      // AppID过滤
      if (input.appid) {
        where.appid = input.appid;
      }

      // 版本过滤（大于等于）
      if (input.version_gte !== undefined) {
        where.version = {
          gte: input.version_gte,
        };
      }

      // 如果需要按支付状态筛选，先查询所有符合条件的作品ID
      if (input.is_paid && input.is_paid !== 'all') {
        // 先查询所有符合条件的作品ID（不分页）
        const allWorks = await ctx.prisma.worksEntity.findMany({
          where,
          select: {
            id: true,
          },
        });

        const allWorkIds = allWorks.map(w => w.id);

        // 如果没有作品，直接返回0
        if (allWorkIds.length === 0) {
          return 0;
        }

        // 查询所有相关的订单记录
        const orderRecords = await ctx.prisma.orderRecordEntity.findMany({
          where: {
            work_id: { in: allWorkIds },
            deleted: false,
            payment_type: {
              not: '', // payment_type 不为空表示已支付
            },
          },
          select: {
            work_id: true,
          },
        });

        // 构建已付费的作品ID集合
        const paidWorkIds = new Set(orderRecords.map(r => r.work_id).filter((id): id is string => !!id));

        // 根据支付状态筛选作品ID
        let filteredWorkIds: string[] = [];
        if (input.is_paid === 'paid') {
          filteredWorkIds = allWorkIds.filter(w => paidWorkIds.has(w));
        } else if (input.is_paid === 'unpaid') {
          filteredWorkIds = allWorkIds.filter(w => !paidWorkIds.has(w));
        }

        return filteredWorkIds.length;
      }

      return ctx.prisma.worksEntity.count({ where });
    }),

  // 复制作品
  duplicate: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
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
      console.log(`Successfully copied assets from ${originalWork.id} to ${newWork.id}`);
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
  deleteFolder: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
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
      return (await ctx.prisma.worksEntity.findMany({
        where: {
          uid: ctx.uid,
          is_folder: true,
          deleted: false,
        },
        skip: input.skip,
        take: input.take,
        orderBy: { create_time: 'desc' },
      })) as SerializedWorksEntity[];
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
      const works = (await ctx.prisma.worksEntity.findMany({
        where: {
          id: { in: input.workIds },
        },
        select: { id: true, uid: true },
      })) as SerializedWorksEntity[];

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
      const currentChildIds = folder.child_works_id ? JSON.parse(folder.child_works_id) : [];
      const newChildIds = [...new Set([...(currentChildIds as string[]), ...input.workIds])];

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
      return (await ctx.prisma.worksEntity.findMany({
        where: {
          uid: input.uid,
          deleted: true,
        },
        skip: input.skip,
        take: input.take,
        orderBy: { update_time: 'desc' },
      })) as SerializedWorksEntity[];
    }),

  // 批量获取作品的累计 PV/UV 数据
  getCumulativePvUv: publicProcedure
    .input(
      z.object({
        worksIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.worksIds.length === 0) {
        return {};
      }

      const stats = await ctx.prisma.slsWorksCumulativePvUvEntity.findMany({
        where: {
          works_id: {
            in: input.worksIds,
          },
        },
        select: {
          works_id: true,
          pv: true,
          uv: true,
        },
      });

      // 转换为 Map 格式，方便前端使用
      const result: Record<string, { pv: number; uv: number }> = {};
      for (const stat of stats) {
        result[stat.works_id] = {
          pv: stat.pv,
          uv: stat.uv,
        };
      }

      return result;
    }),

  // 获取单个作品的统计数据
  getWorksStatistics: publicProcedure
    .input(
      z.object({
        worksId: z.string(),
        days: z.number().optional().default(7), // 默认查询近7天
      })
    )
    .query(async ({ ctx, input }) => {
      const { worksId, days } = input;

      // 获取累计PV/UV数据
      const cumulative = await ctx.prisma.slsWorksCumulativePvUvEntity.findUnique({
        where: {
          works_id: worksId,
        },
        select: {
          pv: true,
          uv: true,
          data: true,
          update_time: true,
        },
      });

      // 计算日期范围（注意时区：数据库date字段存储时使用 new Date(`${date}T00:00:00+08:00`)）
      // 这会创建一个UTC时间，数据库只存储日期部分，所以存储的日期比东八区日期早一天
      // 例如：东八区 2024-01-01 存储为 UTC 2023-12-31
      // 获取东八区今天的日期字符串（YYYY-MM-DD）
      const now = new Date();
      const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
      const todayStr = `${beijingTime.getFullYear()}-${String(beijingTime.getMonth() + 1).padStart(2, '0')}-${String(beijingTime.getDate()).padStart(2, '0')}`;

      // 计算开始日期（东八区）
      const startDate = new Date(beijingTime);
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

      // 将东八区日期转换为UTC Date对象来查询数据库
      // 使用与存储时相同的转换方式：new Date(`${date}T00:00:00+08:00`)
      const startDateUTC = new Date(`${startDateStr}T00:00:00+08:00`);
      const todayUTC = new Date(`${todayStr}T00:00:00+08:00`);

      // 获取日统计数据（数据库中的date字段是Date类型）
      const dailyStats = await ctx.prisma.slsWorksDailyStatisticsEntity.findMany({
        where: {
          works_id: worksId,
          date: {
            gte: startDateUTC,
            lte: todayUTC,
          },
        },
        select: {
          date: true,
          viewer_pv: true,
          viewer_uv: true,
        },
        orderBy: {
          date: 'asc',
        },
      });

      // 处理省份数据（从累计数据的data字段中提取）
      let provinces: Array<{ name: string; pv: number; uv: number }> = [];
      if (cumulative?.data && typeof cumulative.data === 'object') {
        const data = cumulative.data as Record<string, any>;
        const provincesData = data.provinces;
        if (provincesData && typeof provincesData === 'object') {
          provinces = Object.entries(provincesData)
            .map(([name, stat]) => {
              if (stat && typeof stat === 'object' && 'pv' in stat && 'uv' in stat) {
                return {
                  name,
                  pv: (stat as { pv: number }).pv || 0,
                  uv: (stat as { uv: number }).uv || 0,
                };
              }
              return null;
            })
            .filter((p): p is { name: string; pv: number; uv: number } => p !== null)
            .sort((a, b) => b.pv - a.pv) // 按PV降序排序
            .slice(0, 10); // 取前10
        }
      }

      // 获取今日统计数据（从 sls_works_daily_statistics_entity 表）
      const todayStats = await ctx.prisma.slsWorksDailyStatisticsEntity.findFirst({
        where: {
          works_id: worksId,
          date: todayUTC,
        },
        select: {
          viewer_pv: true,
          viewer_uv: true,
        },
      });

      // 将数据库中的UTC日期转换回东八区日期字符串返回给前端
      // 数据库存储的date是UTC日期（比东八区早一天），需要转换回东八区日期显示
      // 例如：数据库存储 2023-12-31（UTC），实际代表东八区 2024-01-01
      const formatDateToBeijing = (utcDate: Date): string => {
        // 获取UTC日期的年月日
        const utcYear = utcDate.getUTCFullYear();
        const utcMonth = utcDate.getUTCMonth();
        const utcDay = utcDate.getUTCDate();

        // 将UTC日期转换为东八区日期
        // 由于数据库存储时使用了 new Date(`${date}T00:00:00+08:00`)，存储的UTC日期比东八区早一天
        // 所以我们需要加1天来恢复东八区日期
        const beijingDate = new Date(Date.UTC(utcYear, utcMonth, utcDay));
        beijingDate.setUTCDate(beijingDate.getUTCDate() + 1);

        const year = beijingDate.getUTCFullYear();
        const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(beijingDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      return {
        cumulative: {
          pv: cumulative?.pv || 0,
          uv: cumulative?.uv || 0,
          update_time: cumulative?.update_time || null,
        },
        today: {
          pv: todayStats?.viewer_pv || 0,
          uv: todayStats?.viewer_uv || 0,
        },
        daily: dailyStats.map(stat => ({
          date: formatDateToBeijing(stat.date),
          pv: stat.viewer_pv,
          uv: stat.viewer_uv,
        })),
        provinces,
      };
    }),

  // 检查是否可以无水印分享/导出
  // 判断条件：用户的角色权限包含 base_template_use 或对作品 ID 拥有 user_resource 的有效记录
  canShareWithoutWatermark: protectedProcedure
    .input(
      z.object({
        worksId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { worksId } = input;
      const now = new Date();

      // 1. 检查用户角色是否包含 base_template_use 权限
      const userRoles = await ctx.prisma.userRole.findMany({
        where: {
          uid: ctx.uid,
          OR: [
            { expires_at: null }, // 永久有效
            { expires_at: { gte: now } }, // 未过期
          ],
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      // 检查角色权限中是否包含 base_template_use
      const hasBaseTemplateUse = userRoles.some(userRole =>
        userRole.role.rolePermissions.some(rp => rp.permission.alias === 'base_template_use')
      );

      if (hasBaseTemplateUse) {
        return { canExportShare: true };
      }

      // 2. 检查用户是否对该作品拥有有效的 user_resource 记录
      const userResources = await ctx.prisma.userResource.findMany({
        where: {
          uid: ctx.uid,
          resource_id: worksId,
          OR: [
            { expires_at: null }, // 永久有效
            { expires_at: { gte: now } }, // 未过期
          ],
        },
      });

      const hasValidResource = userResources.length > 0;

      return { canExportShare: hasValidResource };
    }),
});
