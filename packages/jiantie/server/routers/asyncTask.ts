import { Prisma } from '@mk/jiantie/v11-database/generated/client/client';
import { TRPCError } from '@trpc/server';
import axios from 'axios';
import { imageSize } from 'image-size';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// 任务类型枚举 Schema
const asyncTaskTypeSchema = z.enum(['batch_generate_covers', 'batch_regenerate_covers_by_date']);

// 任务状态枚举 Schema
const asyncTaskStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

// 获取图片的真实尺寸
async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    const buffer = Buffer.from(response.data);
    const result = imageSize(buffer);
    if (!result || !result.width || !result.height) {
      throw new Error('无法解析图片尺寸');
    }
    return {
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error(`获取图片尺寸失败: ${url}`, error);
    return null;
  }
}

// 处理批量生成封面任务
async function processBatchGenerateCoversTask(
  prisma: any,
  task: any
): Promise<{
  success: boolean;
  total: number;
  success_count: number;
  failed_count: number;
  success_ids: string[];
  failed_ids: string[];
  results: Array<{
    template_id: string;
    success: boolean;
    cover_url?: string;
    error?: string;
  }>;
}> {
  const inputData = task.input_data as { template_ids: string[] };
  const templateIds = inputData.template_ids || [];

  const results: Array<{
    template_id: string;
    success: boolean;
    cover_url?: string;
    error?: string;
  }> = [];

  // 获取模板信息和规格信息
  const templates = await prisma.templateEntity.findMany({
    where: {
      id: { in: templateIds },
    },
    select: {
      id: true,
      designer_uid: true,
      spec_id: true,
    },
  });

  // 获取所有规格信息
  const specIds = templates.map((t: any) => t.spec_id).filter((id: string | null): id is string => !!id);
  const specs = await prisma.worksSpecEntity.findMany({
    where: {
      id: { in: specIds },
    },
  });
  const specMap = new Map<string, { export_format?: string | null; is_flip_page?: boolean | null }>();
  specs.forEach((s: any) => {
    specMap.set(s.id, {
      export_format: s.export_format,
      is_flip_page: s.is_flip_page,
    });
  });

  // 逐个生成封面
  for (const template of templates) {
    try {
      const templateId = template.id;
      const designerUid = template.designer_uid?.toString() || '0';
      const specInfo = template.spec_id ? specMap.get(template.spec_id) : null;

      // 判断是否需要动态封面
      // 如果是模板且（export_format 包含 video 或者是翻页）则使用动态封面
      const useDynamicCover = Boolean(
        specInfo?.export_format?.includes('video') || specInfo?.export_format?.includes('html')
      );

      // 构建查看器 URL
      const viewerUrl = `https://www.jiantieapp.com/mobile/template?id=${templateId}&screenshot=true`;

      // 根据封面类型选择 API
      const apiUrl = useDynamicCover
        ? 'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync'
        : 'https://www.maka.im/mk-gif-generator/screenshot/v2/export';

      const width = 540;
      // 默认高度按 16:9 比例，后面会用真实图片高度覆盖
      const defaultHeight = Math.round((540 * 16) / 9);
      // 与前端 HeaderV2 中 handleCoverChange 的规则保持一致：
      // 封面高度不超过 540/9 * 20（即 1200）
      const maxHeight = (540 / 9) * 20;

      const urlParams = useDynamicCover
        ? {
            url: viewerUrl,
            width: String(width),
            height: String(defaultHeight),
            works_id: templateId,
            uid: designerUid,
            mode: 'template',
            watermark: '0',
            setpts: '0.5',
            pageCount: '1',
          }
        : {
            url: viewerUrl,
            width: String(width),
            height: String(defaultHeight),
            works_id: templateId,
            uid: designerUid,
            format: 'png',
            type: 'longH5',
            pageCount: '1',
            appid: 'jiantie',
          };

      const apiUrlFinal = `${apiUrl}?${new URLSearchParams(urlParams as any).toString()}${useDynamicCover ? '' : `&surfix=${Date.now()}`}`;

      // 调用封面生成 API
      const coverRes = await axios.get(apiUrlFinal, {
        timeout: 60000,
      });

      const coverUrl = useDynamicCover ? coverRes.data.fullUrls?.[0] : coverRes.data?.data?.fullUrls?.[0];

      if (!coverUrl) {
        throw new Error('封面生成失败：未返回封面 URL');
      }

      // 获取真实图片尺寸
      const dimensions = await getImageDimensions(coverUrl);
      const realWidth = dimensions?.width ?? width;
      const realHeight = dimensions?.height ?? defaultHeight;
      const finalHeight = Math.min(maxHeight, realHeight);

      // 更新模板的 coverV3
      await prisma.templateEntity.update({
        where: { id: templateId },
        data: {
          coverV3: {
            url: coverUrl,
            width: realWidth,
            height: finalHeight,
          },
        },
      });

      results.push({
        template_id: templateId,
        success: true,
        cover_url: coverUrl,
      });
    } catch (error: any) {
      console.error(`生成模板 ${template.id} 封面失败:`, error?.message || error);
      results.push({
        template_id: template.id,
        success: false,
        error: error?.message || '生成封面失败',
      });
    }
  }

  const successIds = results.filter(r => r.success).map(r => r.template_id);
  const failedIds = results.filter(r => !r.success).map(r => r.template_id);

  return {
    success: true,
    total: templateIds.length,
    success_count: successIds.length,
    failed_count: failedIds.length,
    success_ids: successIds,
    failed_ids: failedIds,
    results,
  };
}

// 处理批量重新生成封面任务（按日期）
async function processBatchRegenerateCoversByDateTask(
  prisma: any,
  task: any
): Promise<{
  success: boolean;
  total: number;
  checked_count: number;
  regenerated_count: number;
  skipped_count: number;
  failed_count: number;
  results: Array<{
    template_id: string;
    status: 'checked' | 'regenerated' | 'skipped' | 'failed';
    cover_url?: string;
    error?: string;
    reason?: string;
  }>;
}> {
  const inputData = task.input_data as { date_from: string; date_to?: string };
  const dateFrom = inputData.date_from;
  const dateTo = inputData.date_to;

  if (!dateFrom) {
    throw new Error('开始日期参数不能为空');
  }

  const results: Array<{
    template_id: string;
    status: 'checked' | 'regenerated' | 'skipped' | 'failed';
    cover_url?: string;
    error?: string;
    reason?: string;
  }> = [];

  // 构建时间范围查询条件
  const dateFromDate = new Date(dateFrom);
  dateFromDate.setHours(0, 0, 0, 0);

  const whereCondition: any = {
    create_time: {
      gte: dateFromDate,
    },
    deleted: false,
    coverV3: {
      not: Prisma.JsonNull,
    },
  };

  // 如果提供了结束日期，添加上限
  if (dateTo) {
    const dateToDate = new Date(dateTo);
    dateToDate.setHours(23, 59, 59, 999);
    whereCondition.create_time.lte = dateToDate;
  }

  const templates = await prisma.templateEntity.findMany({
    where: whereCondition,
    select: {
      id: true,
      designer_uid: true,
      spec_id: true,
      coverV3: true,
    },
  });

  // 过滤出有 coverV3 且 coverV3.url 存在的模版
  const validTemplates = templates.filter((t: any) => {
    const coverV3 = t.coverV3;
    return coverV3 && typeof coverV3 === 'object' && coverV3.url;
  });

  // 获取所有规格信息
  const specIds = validTemplates.map((t: any) => t.spec_id).filter((id: string | null): id is string => !!id);
  const specs = await prisma.worksSpecEntity.findMany({
    where: {
      id: { in: specIds },
    },
  });
  const specMap = new Map<string, { export_format?: string | null; is_flip_page?: boolean | null }>();
  specs.forEach((s: any) => {
    specMap.set(s.id, {
      export_format: s.export_format,
      is_flip_page: s.is_flip_page,
    });
  });

  const width = 540;
  const maxHeight = (540 / 9) * 20; // 1200

  // 逐个检查并处理模版
  for (const template of validTemplates) {
    try {
      const templateId = template.id;
      const coverV3 = template.coverV3 as { url: string; width: number; height: number };

      // 如果 URL 是 gif，跳过
      if (coverV3.url.toLowerCase().includes('.gif') || coverV3.url.toLowerCase().endsWith('.gif')) {
        results.push({
          template_id: templateId,
          status: 'skipped',
          reason: '封面为 GIF 格式，跳过处理',
        });
        continue;
      }

      // 获取图片真实尺寸
      const dimensions = await getImageDimensions(coverV3.url);
      if (!dimensions) {
        results.push({
          template_id: templateId,
          status: 'failed',
          error: '无法获取图片尺寸',
        });
        continue;
      }

      const realWidth = dimensions.width;
      const realHeight = dimensions.height;
      const finalHeight = Math.min(maxHeight, realHeight);

      // 检查宽高是否一致
      const widthMatch = coverV3.width === realWidth;
      const heightMatch = coverV3.height === finalHeight;

      if (widthMatch && heightMatch) {
        // 宽高一致，跳过
        results.push({
          template_id: templateId,
          status: 'checked',
          reason: '宽高一致，无需重新生成',
        });
        continue;
      }

      // 宽高不一致，需要重新生成封面
      const designerUid = template.designer_uid?.toString() || '0';
      const specInfo = template.spec_id ? specMap.get(template.spec_id) : null;

      // 判断是否需要动态封面
      const useDynamicCover = Boolean(
        specInfo?.export_format?.includes('video') || specInfo?.export_format?.includes('html')
      );

      // 构建查看器 URL
      const viewerUrl = `https://www.jiantieapp.com/mobile/template?id=${templateId}&screenshot=true`;

      // 根据封面类型选择 API
      const apiUrl = useDynamicCover
        ? 'https://www.maka.im/mk-gif-generator/screenshot-v2/v3/make-gif-url-sync'
        : 'https://www.maka.im/mk-gif-generator/screenshot/v2/export';

      const defaultHeight = Math.round((540 * 16) / 9);

      const urlParams = useDynamicCover
        ? {
            url: viewerUrl,
            width: String(width),
            height: String(defaultHeight),
            works_id: templateId,
            uid: designerUid,
            mode: 'template',
            watermark: '0',
            setpts: '0.5',
            pageCount: '1',
          }
        : {
            url: viewerUrl,
            width: String(width),
            height: String(defaultHeight),
            works_id: templateId,
            uid: designerUid,
            format: 'png',
            type: 'longH5',
            pageCount: '1',
            appid: 'jiantie',
          };

      const apiUrlFinal = `${apiUrl}?${new URLSearchParams(urlParams as any).toString()}${useDynamicCover ? '' : `&surfix=${Date.now()}`}`;

      // 调用封面生成 API
      const coverRes = await axios.get(apiUrlFinal, {
        timeout: 60000,
      });

      const coverUrl = useDynamicCover ? coverRes.data.fullUrls?.[0] : coverRes.data?.data?.fullUrls?.[0];

      if (!coverUrl) {
        throw new Error('封面生成失败：未返回封面 URL');
      }

      // 获取新生成封面的真实尺寸
      const newDimensions = await getImageDimensions(coverUrl);
      const newRealWidth = newDimensions?.width ?? width;
      const newRealHeight = newDimensions?.height ?? defaultHeight;
      const newFinalHeight = Math.min(maxHeight, newRealHeight);

      // 更新模板的 coverV3
      await prisma.templateEntity.update({
        where: { id: templateId },
        data: {
          coverV3: {
            url: coverUrl,
            width: newRealWidth,
            height: newFinalHeight,
          },
        },
      });

      results.push({
        template_id: templateId,
        status: 'regenerated',
        cover_url: coverUrl,
        reason: `宽高不一致，已重新生成 (${coverV3.width}x${coverV3.height} -> ${newRealWidth}x${newFinalHeight})`,
      });
    } catch (error: any) {
      console.error(`处理模板 ${template.id} 失败:`, error?.message || error);
      results.push({
        template_id: template.id,
        status: 'failed',
        error: error?.message || '处理失败',
      });
    }
  }

  const checkedCount = results.filter(r => r.status === 'checked').length;
  const regeneratedCount = results.filter(r => r.status === 'regenerated').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  return {
    success: true,
    total: validTemplates.length,
    checked_count: checkedCount,
    regenerated_count: regeneratedCount,
    skipped_count: skippedCount,
    failed_count: failedCount,
    results,
  };
}

export const asyncTaskRouter = router({
  // 创建异步任务
  createTask: publicProcedure
    .input(
      z.object({
        task_type: asyncTaskTypeSchema,
        task_name: z.string(),
        input_data: z.any(), // JSON 格式的输入数据
        created_by_uid: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.asyncTaskEntity.create({
        data: {
          task_type: input.task_type as any,
          task_name: input.task_name,
          input_data: input.input_data,
          created_by_uid: input.created_by_uid || null,
          status: 'pending',
        },
      });

      return task;
    }),

  // 获取任务列表
  getTaskList: publicProcedure
    .input(
      z
        .object({
          task_type: asyncTaskTypeSchema.optional(),
          status: asyncTaskStatusSchema.optional(),
          page: z.number().optional().default(1),
          pageSize: z.number().optional().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (input?.task_type) {
        where.task_type = input.task_type;
      }
      if (input?.status) {
        where.status = input.status;
      }

      const [tasks, total] = await Promise.all([
        ctx.prisma.asyncTaskEntity.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { create_time: 'desc' },
        }),
        ctx.prisma.asyncTaskEntity.count({ where }),
      ]);

      return {
        tasks,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // 获取任务详情
  getTaskById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const task = await ctx.prisma.asyncTaskEntity.findUnique({
      where: { id: input.id },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: '任务不存在',
      });
    }

    return task;
  }),

  // 处理任务（API 触发方式）
  processTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const task = await ctx.prisma.asyncTaskEntity.findUnique({
      where: { id: input.id },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: '任务不存在',
      });
    }

    if (task.status === 'processing') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '任务正在处理中',
      });
    }

    if (task.status === 'completed') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '任务已完成',
      });
    }

    const inputData = task.input_data as any;
    let total = 0;

    // 根据任务类型确定总数
    if (task.task_type === 'batch_generate_covers') {
      total = inputData.template_ids?.length || 0;
    } else if (task.task_type === 'batch_regenerate_covers_by_date') {
      // 对于按日期查询的任务，先查询模版数量
      const dateFrom = inputData.date_from;
      const dateTo = inputData.date_to;
      if (dateFrom) {
        const dateFromDate = new Date(dateFrom);
        dateFromDate.setHours(0, 0, 0, 0);

        const whereCondition: any = {
          create_time: {
            gte: dateFromDate,
          },
          deleted: false,
          coverV3: {
            not: Prisma.JsonNull,
          },
        };

        if (dateTo) {
          const dateToDate = new Date(dateTo);
          dateToDate.setHours(23, 59, 59, 999);
          whereCondition.create_time.lte = dateToDate;
        }

        total = await ctx.prisma.templateEntity.count({
          where: whereCondition,
        });
      }
    }

    // 更新任务状态为 processing
    await ctx.prisma.asyncTaskEntity.update({
      where: { id: input.id },
      data: {
        status: 'processing',
        started_at: new Date(),
        progress: {
          total: total,
          completed: 0,
          failed: 0,
        },
      },
    });

    try {
      let outputData: any = null;
      let progress: any = null;

      // 根据任务类型路由到对应的处理函数
      if (task.task_type === 'batch_generate_covers') {
        const result = await processBatchGenerateCoversTask(ctx.prisma, task);

        outputData = result;
        progress = {
          total: result.total,
          completed: result.success_count,
          failed: result.failed_count,
        };

        // 更新任务状态和结果
        await ctx.prisma.asyncTaskEntity.update({
          where: { id: input.id },
          data: {
            status: 'completed',
            output_data: outputData,
            progress: progress,
            completed_at: new Date(),
          },
        });
      } else if (task.task_type === 'batch_regenerate_covers_by_date') {
        const result = await processBatchRegenerateCoversByDateTask(ctx.prisma, task);

        outputData = result;
        progress = {
          total: result.total,
          completed: result.checked_count + result.regenerated_count,
          failed: result.failed_count,
        };

        // 更新任务状态和结果
        await ctx.prisma.asyncTaskEntity.update({
          where: { id: input.id },
          data: {
            status: 'completed',
            output_data: outputData,
            progress: progress,
            completed_at: new Date(),
          },
        });
      } else {
        throw new Error(`未知的任务类型: ${task.task_type}`);
      }

      return {
        success: true,
        task: await ctx.prisma.asyncTaskEntity.findUnique({
          where: { id: input.id },
        }),
      };
    } catch (error: any) {
      // 更新任务状态为失败
      await ctx.prisma.asyncTaskEntity.update({
        where: { id: input.id },
        data: {
          status: 'failed',
          error_message: error?.message || '任务处理失败',
          completed_at: new Date(),
        },
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error?.message || '任务处理失败',
      });
    }
  }),

  // 重试失败的任务
  retryTask: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const task = await ctx.prisma.asyncTaskEntity.findUnique({
      where: { id: input.id },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: '任务不存在',
      });
    }

    if (task.status !== 'failed') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '只能重试失败的任务',
      });
    }

    // 重置任务状态为 pending
    await ctx.prisma.asyncTaskEntity.update({
      where: { id: input.id },
      data: {
        status: 'pending',
        error_message: null,
        started_at: null,
        completed_at: null,
        progress: Prisma.JsonNull,
      },
    });

    return {
      success: true,
      task: await ctx.prisma.asyncTaskEntity.findUnique({
        where: { id: input.id },
      }),
    };
  }),
});
