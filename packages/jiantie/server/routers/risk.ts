import { PrismaPg } from '@prisma/adapter-pg';
// @ts-ignore - work-rc generated client
import { PrismaClient as WorkRcPrismaClient } from '../../../work-rc/generated/client/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import mysql from 'mysql2/promise';

// 初始化 work-rc 数据库连接
function getWorkRcPrisma(): WorkRcPrismaClient {
  const connectionString = process.env.RC_DB_URL;
  if (!connectionString) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'RC_DB_URL 环境变量未设置',
    });
  }
  const adapter = new PrismaPg({ connectionString });
  return new WorkRcPrismaClient({ adapter });
}

// makadb 连接池（用于读取 platv5_works 表）
const makadbPool = mysql.createPool({
  host: 'rdsa2uaava2uaav413.mysql.rds.aliyuncs.com',
  user: 'mso_read_only',
  password: 'j3E4h6NWBQ5U',
  database: 'makaplatv4',
});

export const riskRouter = router({
  // 获取风控结果列表
  listAuditResults: publicProcedure
    .input(
      z.object({
        // 页面类型：suspicious_high（可疑&高危）、pass（通过）、whitelist（白名单）
        pageType: z.enum(['suspicious_high', 'pass', 'whitelist']).optional(),
        // 人工标记筛选：all（全部）、tagged（已标记）、untagged（待标记）
        manualTagFilter: z.enum(['all', 'tagged', 'untagged']).optional(),
        // 排序字段：默认 uv
        orderBy: z
          .enum(['uv', 'pv', 'lastReviewTime', 'createTime'])
          .optional(),
        // 排序方向：默认 desc
        orderDirection: z.enum(['asc', 'desc']).optional(),
        // 分页
        skip: z.number().int().min(0).default(0),
        take: z.number().int().min(1).max(100).default(20),
        // 搜索
        workId: z.string().optional(),
        uid: z.number().int().optional(),
        keyword: z.string().optional(),
        // 筛选：仅新作品（24小时内创建）
        onlyNewWork: z.boolean().optional(),
        // 筛选：仅新用户（当天新注册）
        onlyNewUser: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        // 构建基础查询条件
        const baseWhere: any = {
          type: 'makav7', // 只查询 makav7 作品
        };

        // 人工标记筛选
        if (input.manualTagFilter === 'tagged') {
          baseWhere.manualTag = { not: null };
        } else if (input.manualTagFilter === 'untagged') {
          baseWhere.manualTag = null;
        }

        // 搜索条件
        if (input.workId) {
          baseWhere.workId = input.workId;
        }
        if (input.uid) {
          baseWhere.uid = input.uid;
        }

        // 如果有关键词搜索，先处理关键词过滤
        if (input.keyword) {
          const keywordWorkInfos = await workRcPrisma.workInfo.findMany({
            where: {
              type: 'makav7',
              title: { contains: input.keyword, mode: 'insensitive' },
            },
            select: { workId: true },
          });
          const keywordWorkIds = keywordWorkInfos.map((w: any) => w.workId);

          if (keywordWorkIds.length === 0) {
            return {
              data: [],
              total: 0,
            };
          }

          // 将关键词过滤的 workId 加入查询条件
          if (baseWhere.workId) {
            if (typeof baseWhere.workId === 'string') {
              if (!keywordWorkIds.includes(baseWhere.workId)) {
                return {
                  data: [],
                  total: 0,
                };
              }
            } else if (
              typeof baseWhere.workId === 'object' &&
              'in' in baseWhere.workId
            ) {
              const existingIds = baseWhere.workId.in as string[];
              const intersection = existingIds.filter((id: string) =>
                keywordWorkIds.includes(id)
              );
              if (intersection.length === 0) {
                return {
                  data: [],
                  total: 0,
                };
              }
              baseWhere.workId = { in: intersection };
            }
          } else {
            baseWhere.workId = { in: keywordWorkIds };
          }
        }

        // 处理仅新作品筛选
        if (input.onlyNewWork) {
          const twentyFourHoursAgo = new Date();
          twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

          const newWorkInfos = await workRcPrisma.workInfo.findMany({
            where: {
              type: 'makav7',
              createTime: {
                gte: twentyFourHoursAgo,
              },
            },
            select: { workId: true },
          });
          const newWorkIds = newWorkInfos.map((w: any) => w.workId);

          if (newWorkIds.length === 0) {
            return {
              data: [],
              total: 0,
            };
          }

          // 将新作品筛选的 workId 加入查询条件
          if (baseWhere.workId) {
            if (typeof baseWhere.workId === 'string') {
              if (!newWorkIds.includes(baseWhere.workId)) {
                return {
                  data: [],
                  total: 0,
                };
              }
            } else if (
              typeof baseWhere.workId === 'object' &&
              'in' in baseWhere.workId
            ) {
              const existingIds = baseWhere.workId.in as string[];
              const intersection = existingIds.filter((id: string) =>
                newWorkIds.includes(id)
              );
              if (intersection.length === 0) {
                return {
                  data: [],
                  total: 0,
                };
              }
              baseWhere.workId = { in: intersection };
            }
          } else {
            baseWhere.workId = { in: newWorkIds };
          }
        }

        // 处理仅新用户筛选
        if (input.onlyNewUser) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // 查询所有 WorkInfo，然后在内存中筛选新用户
          const allWorkInfos = await workRcPrisma.workInfo.findMany({
            where: {
              type: 'makav7',
            },
            select: { workId: true, features: true },
          });

          const newUserWorkIds = allWorkInfos
            .filter((w: any) => {
              if (!w.features || typeof w.features !== 'object') {
                return false;
              }
              const features = w.features as any;
              if (!features.userInfo || !features.userInfo.registerTime) {
                return false;
              }
              const registerTime = new Date(features.userInfo.registerTime);
              return registerTime >= today && registerTime < tomorrow;
            })
            .map((w: any) => w.workId);

          if (newUserWorkIds.length === 0) {
            return {
              data: [],
              total: 0,
            };
          }

          // 将新用户筛选的 workId 加入查询条件
          if (baseWhere.workId) {
            if (typeof baseWhere.workId === 'string') {
              if (!newUserWorkIds.includes(baseWhere.workId)) {
                return {
                  data: [],
                  total: 0,
                };
              }
            } else if (
              typeof baseWhere.workId === 'object' &&
              'in' in baseWhere.workId
            ) {
              const existingIds = baseWhere.workId.in as string[];
              const intersection = existingIds.filter((id: string) =>
                newUserWorkIds.includes(id)
              );
              if (intersection.length === 0) {
                return {
                  data: [],
                  total: 0,
                };
              }
              baseWhere.workId = { in: intersection };
            }
          } else {
            baseWhere.workId = { in: newUserWorkIds };
          }
        }

        // 根据页面类型添加 lastAudit 过滤条件
        if (input.pageType) {
          if (input.pageType === 'suspicious_high') {
            baseWhere.lastAudit = {
              machineRiskLevel: { in: ['suspicious', 'high'] },
            };
          } else if (input.pageType === 'pass') {
            baseWhere.lastAudit = {
              machineReviewResult: 'pass',
            };
          } else if (input.pageType === 'whitelist') {
            baseWhere.lastAudit = {
              passType: { in: ['whiteWork', 'whiteUser'] },
            };
          }
        }

        // 排序字段
        const orderField = input.orderBy || 'uv';
        const orderDir = input.orderDirection || 'desc';

        // 先查询总数
        const total = await workRcPrisma.workAuditResult.count({
          where: baseWhere,
        });

        // 如果按 createTime 排序，需要先获取所有数据，关联 WorkInfo 排序后再分页
        if (orderField === 'createTime') {
          // 查询所有符合条件的数据（包含关联的 lastAudit）
          let allAuditResults = await workRcPrisma.workAuditResult.findMany({
            where: baseWhere,
            include: {
              lastAudit: true,
            },
          });

          // 获取所有 WorkInfo
          const workIds = allAuditResults.map((r: any) => r.workId);
          const workInfos = await workRcPrisma.workInfo.findMany({
            where: {
              workId: { in: workIds },
            },
          });
          const workInfoMap = new Map(workInfos.map((w: any) => [w.workId, w]));

          // 按 createTime 排序
          allAuditResults.sort((a: any, b: any) => {
            const aWorkInfo = workInfoMap.get(a.workId);
            const bWorkInfo = workInfoMap.get(b.workId);
            const aValue = aWorkInfo?.createTime
              ? new Date(aWorkInfo.createTime).getTime()
              : 0;
            const bValue = bWorkInfo?.createTime
              ? new Date(bWorkInfo.createTime).getTime()
              : 0;
            return orderDir === 'asc' ? aValue - bValue : bValue - aValue;
          });

          // 分页
          const auditResults = allAuditResults.slice(
            input.skip,
            input.skip + input.take
          );

          // 组合数据（WorkInfo 已获取，直接从 map 中取）
          const result = auditResults.map((auditResult: any) => {
            const workInfo = workInfoMap.get(auditResult.workId);
            return {
              ...auditResult,
              workInfo: workInfo || null,
              latestAudit: auditResult.lastAudit || null,
            };
          });

          return {
            data: result,
            total,
          };
        }

        // 其他排序字段可以直接在数据库层面排序
        const orderBy: any = {};
        if (orderField === 'uv') {
          orderBy.uv = orderDir;
        } else if (orderField === 'pv') {
          orderBy.pv = orderDir;
        } else if (orderField === 'lastReviewTime') {
          orderBy.lastReviewTime = orderDir;
        }

        // 查询数据（包含关联的 lastAudit）
        const auditResults = await workRcPrisma.workAuditResult.findMany({
          where: baseWhere,
          include: {
            lastAudit: true,
          },
          orderBy,
          skip: input.skip,
          take: input.take,
        });

        // 获取对应的 WorkInfo
        const workIds = auditResults.map((r: any) => r.workId);
        const workInfos = await workRcPrisma.workInfo.findMany({
          where: {
            workId: { in: workIds },
          },
        });
        const workInfoMap = new Map(workInfos.map((w: any) => [w.workId, w]));

        // 组合数据
        const result = auditResults.map((auditResult: any) => {
          const workInfo = workInfoMap.get(auditResult.workId);

          return {
            ...auditResult,
            workInfo: workInfo || null,
            latestAudit: auditResult.lastAudit || null,
          };
        });

        return {
          data: result,
          total,
        };
      } catch (error) {
        console.error('[Risk Router] 查询风控结果失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '查询风控结果失败',
        });
      }
    }),

  // 标记为白名单
  markAsWhitelist: publicProcedure
    .input(
      z.object({
        workId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        // 查找对应的 WorkAuditResult
        const auditResult = await workRcPrisma.workAuditResult.findUnique({
          where: { workId: input.workId },
        });

        if (!auditResult) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '未找到对应的审核结果',
          });
        }

        // 创建一条白名单审核记录
        const createdAuditList = await workRcPrisma.workAuditList.create({
          data: {
            workId: input.workId,
            uid: auditResult.uid,
            type: auditResult.type,
            snapshotTime: new Date(),
            machineReviewResult: 'pass',
            passType: 'whiteWork',
            machineRiskLevel: 'low',
            reason: '人工标记为白名单',
            reviewTime: new Date(),
          },
        });

        // 更新 WorkAuditResult 的 manualTag 和关联
        await workRcPrisma.workAuditResult.update({
          where: { workId: input.workId },
          data: {
            manualTag: 'whitelist',
            lastReviewTime: new Date(),
            reviewCount: { increment: 1 },
            lastAuditId: createdAuditList.id, // 更新关联
          },
        });

        // 将作品加入白名单
        await workRcPrisma.whitelistWork.upsert({
          where: { workId: input.workId },
          create: {
            workId: input.workId,
            uid: auditResult.uid,
            reason: '人工标记为白名单',
          },
          update: {
            reason: '人工标记为白名单',
          },
        });

        //如果一个用户有3个作品被标记为白名单，则将用户加入白名单
        const whitelistWorkCount = await workRcPrisma.whitelistWork.count({
          where: { uid: auditResult.uid },
        });

        // 检查用户是否已经在白名单中
        const existingWhitelistUser =
          await workRcPrisma.whitelistUser.findUnique({
            where: { uid: auditResult.uid },
          });

        if (whitelistWorkCount >= 3) {
          // const isNewWhitelistUser = !existingWhitelistUser;

          await workRcPrisma.whitelistUser.upsert({
            where: { uid: auditResult.uid },
            create: {
              uid: auditResult.uid,
              reason: `用户有${whitelistWorkCount}个作品被标记为白名单，自动加入用户白名单`,
            },
            update: {
              reason: `用户有${whitelistWorkCount}个作品被标记为白名单，自动加入用户白名单`,
            },
          });

          // 如果用户是新加入白名单的，自动标识该用户所有未人工标识的作品
          if (whitelistWorkCount >= 3) {
            // 查找该用户所有未人工标识的作品（manualTag 为 null）
            const untaggedWorks = await workRcPrisma.workAuditResult.findMany({
              where: {
                uid: auditResult.uid,
                type: 'makav7',
                manualTag: null,
              },
            });

            console.log(
              `[Risk Router] 用户 ${auditResult.uid} 新加入白名单，找到 ${untaggedWorks.length} 个未人工标识的作品，开始自动标识`
            );

            // 批量处理这些作品
            for (const work of untaggedWorks) {
              try {
                // 创建白名单审核记录
                const createdAuditList =
                  await workRcPrisma.workAuditList.create({
                    data: {
                      workId: work.workId,
                      uid: work.uid,
                      type: work.type,
                      snapshotTime: new Date(),
                      machineReviewResult: 'pass',
                      passType: 'whiteUser',
                      machineRiskLevel: 'low',
                      reason: '白名单用户，自动通过',
                      reviewTime: new Date(),
                    },
                  });

                // 更新 WorkAuditResult 的 manualTag 和关联
                await workRcPrisma.workAuditResult.update({
                  where: { workId: work.workId },
                  data: {
                    manualTag: 'whitelist',
                    lastReviewTime: new Date(),
                    reviewCount: { increment: 1 },
                    lastAuditId: createdAuditList.id,
                  },
                });

                console.log(
                  `[Risk Router] 成功自动标识作品 ${work.workId} 为白名单`
                );
              } catch (error) {
                console.error(
                  `[Risk Router] 自动标识作品 ${work.workId} 失败:`,
                  error
                );
                // 继续处理其他作品，不中断流程
              }
            }

            console.log(
              `[Risk Router] 用户 ${auditResult.uid} 的存量作品自动标识完成，共处理 ${untaggedWorks.length} 个作品`
            );
          }
        }

        return { success: true };
      } catch (error) {
        console.error('[Risk Router] 标记白名单失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '标记白名单失败',
        });
      }
    }),

  // 确认违规
  confirmViolation: publicProcedure
    .input(
      z.object({
        workId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        // 查找对应的 WorkAuditResult
        const auditResult = await workRcPrisma.workAuditResult.findUnique({
          where: { workId: input.workId },
        });

        if (!auditResult) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '未找到对应的审核结果',
          });
        }

        // 创建一条违规审核记录
        const createdAuditList = await workRcPrisma.workAuditList.create({
          data: {
            workId: input.workId,
            uid: auditResult.uid,
            type: auditResult.type,
            snapshotTime: new Date(),
            machineReviewResult: 'failed',
            passType: 'manual',
            machineRiskLevel: 'high',
            reason: '人工确认违规并已手动封禁',
            reviewTime: new Date(),
          },
        });

        // // 违规需要从白名单中移除
        // await workRcPrisma.whitelistWork.delete({
        //   where: { workId: input.workId },
        // });
        // await workRcPrisma.whitelistUser.delete({
        //   where: { uid: auditResult.uid },
        // });

        // 更新 WorkAuditResult 的 manualTag 和关联
        await workRcPrisma.workAuditResult.update({
          where: { workId: input.workId },
          data: {
            manualTag: 'violation',
            lastReviewTime: new Date(),
            reviewCount: { increment: 1 },
            lastAuditId: createdAuditList.id, // 更新关联
          },
        });

        return { success: true };
      } catch (error) {
        console.error('[Risk Router] 确认违规失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '确认违规失败',
        });
      }
    }),

  // 封禁用户
  banUser: publicProcedure
    .input(
      z.object({
        uid: z.number().int(),
      })
    )
    .mutation(async () => {
      // 这里需要调用封禁用户的接口
      // 暂时返回成功，实际需要根据业务逻辑实现
      return { success: true, message: '封禁用户功能待实现' };
    }),

  // 刷新用户作品状态（从 platv5_works 读取并同步到 workInfo 表）
  refreshUserWorksStatus: publicProcedure
    .input(
      z.object({
        uid: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        // 1. 从 platv5_works 表读取该用户的所有作品状态
        const tableIndex = input.uid % 16;
        const tableName = `platv5_works_${tableIndex}`;

        const [works] = await makadbPool.execute(
          `SELECT works_id, uid, title, create_time, update_time, thumb, status, version
           FROM ${tableName}
           WHERE uid = ?`,
          [input.uid]
        );

        const worksList = works as Array<{
          works_id: string;
          uid: number;
          title: string;
          create_time: Date;
          update_time: Date;
          thumb: string | null;
          status: number;
          version: string;
        }>;

        if (worksList.length === 0) {
          return { success: true, message: '未找到该用户的作品', count: 0 };
        }

        // 2. 同步到 workInfo 表
        let syncedCount = 0;
        for (const work of worksList) {
          const createTime =
            work.create_time instanceof Date
              ? work.create_time
              : new Date(work.create_time);
          const updateTime =
            work.update_time instanceof Date
              ? work.update_time
              : new Date(work.update_time);

          const metadata = {
            title: work.title,
            create_time: createTime.toISOString(),
            update_time: updateTime.toISOString(),
            thumb: work.thumb,
            status: work.status,
          };

          try {
            await workRcPrisma.workInfo.upsert({
              where: {
                workId: work.works_id,
              },
              update: {
                uid: work.uid,
                type: 'makav7',
                title: work.title,
                cover: work.thumb,
                status: work.status,
                createTime: createTime,
                updateTime: updateTime,
                metadata: metadata as any,
                updatedAt: new Date(),
              },
              create: {
                workId: work.works_id,
                uid: work.uid,
                type: 'makav7',
                title: work.title,
                cover: work.thumb,
                status: work.status,
                createTime: createTime,
                updateTime: updateTime,
                metadata: metadata as any,
              },
            });
            syncedCount++;
          } catch (error) {
            console.error(
              `[刷新作品状态] 同步作品 ${work.works_id} 失败:`,
              error
            );
          }
        }

        return {
          success: true,
          message: `成功刷新 ${syncedCount}/${worksList.length} 个作品状态`,
          count: syncedCount,
        };
      } catch (error) {
        console.error('[Risk Router] 刷新用户作品状态失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '刷新用户作品状态失败',
        });
      }
    }),

  // 获取敏感词列表
  listSensitiveWords: publicProcedure
    .input(
      z.object({
        // 搜索关键词
        keyword: z.string().optional(),
        // 风险等级筛选
        level: z.enum(['low', 'suspicious', 'high']).optional(),
        // 分页
        skip: z.number().int().min(0).default(0),
        take: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        const where: any = {};

        if (input.keyword) {
          where.word = { contains: input.keyword, mode: 'insensitive' };
        }

        if (input.level) {
          where.level = input.level;
        }

        const [data, total] = await Promise.all([
          workRcPrisma.sensitiveWord.findMany({
            where,
            skip: input.skip,
            take: input.take,
            orderBy: { word: 'asc' },
          }),
          workRcPrisma.sensitiveWord.count({ where }),
        ]);

        return {
          data,
          total,
        };
      } catch (error) {
        console.error('[Risk Router] 查询敏感词列表失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '查询敏感词列表失败',
        });
      }
    }),

  // 创建敏感词
  createSensitiveWord: publicProcedure
    .input(
      z.object({
        word: z.string().min(1, '敏感词不能为空'),
        level: z.enum(['low', 'suspicious', 'high']),
      })
    )
    .mutation(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        // 检查是否已存在相同的敏感词
        const existing = await workRcPrisma.sensitiveWord.findFirst({
          where: { word: input.word },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: '该敏感词已存在',
          });
        }

        const result = await workRcPrisma.sensitiveWord.create({
          data: {
            word: input.word,
            level: input.level,
          },
        });

        return { success: true, data: result };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('[Risk Router] 创建敏感词失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '创建敏感词失败',
        });
      }
    }),

  // 更新敏感词
  updateSensitiveWord: publicProcedure
    .input(
      z.object({
        id: z.string(),
        word: z.string().min(1, '敏感词不能为空').optional(),
        level: z.enum(['low', 'suspicious', 'high']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        const { id, ...updateData } = input;

        // 如果更新 word，检查是否与其他记录冲突
        if (updateData.word) {
          const existing = await workRcPrisma.sensitiveWord.findFirst({
            where: {
              word: updateData.word,
              id: { not: id },
            },
          });

          if (existing) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: '该敏感词已存在',
            });
          }
        }

        const result = await workRcPrisma.sensitiveWord.update({
          where: { id },
          data: updateData,
        });

        return { success: true, data: result };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('[Risk Router] 更新敏感词失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '更新敏感词失败',
        });
      }
    }),

  // 删除敏感词
  deleteSensitiveWord: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        await workRcPrisma.sensitiveWord.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        console.error('[Risk Router] 删除敏感词失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '删除敏感词失败',
        });
      }
    }),

  // 获取白名单用户列表
  listWhitelistUsers: publicProcedure
    .input(
      z.object({
        // 搜索关键词（uid）
        uid: z.number().int().optional(),
        // 分页
        skip: z.number().int().min(0).default(0),
        take: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        const where: any = {};

        if (input.uid) {
          where.uid = input.uid;
        }

        const [data, total] = await Promise.all([
          workRcPrisma.whitelistUser.findMany({
            where,
            skip: input.skip,
            take: input.take,
            orderBy: { createdAt: 'desc' },
          }),
          workRcPrisma.whitelistUser.count({ where }),
        ]);

        return {
          data,
          total,
        };
      } catch (error) {
        console.error('[Risk Router] 查询白名单用户列表失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '查询白名单用户列表失败',
        });
      }
    }),

  // 删除白名单用户
  deleteWhitelistUser: publicProcedure
    .input(
      z.object({
        uid: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      const workRcPrisma = getWorkRcPrisma();

      try {
        await workRcPrisma.whitelistUser.delete({
          where: { uid: input.uid },
        });

        return { success: true };
      } catch (error) {
        console.error('[Risk Router] 删除白名单用户失败:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '删除白名单用户失败',
        });
      }
    }),
});
