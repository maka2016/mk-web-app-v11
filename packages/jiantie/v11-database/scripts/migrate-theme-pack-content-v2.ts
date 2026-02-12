/**
 * 主题包 content 扩展迁移：将 materialResourcesGroup 和 themeConfig2 从作品 gridProps 回填到主题包 content
 *
 * 迁移内容：
 * - 查询 material_class 为 themePackV3 的所有 MaterialItemEntity
 * - 若 content 已包含 materialResourcesGroup 且 themeConfig2，则跳过
 * - 从 content.worksId 获取作品数据，从 work_data.gridProps 取 materialResourcesGroup、themeConfig2
 * - 合并到 content 后更新素材项
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/migrate-theme-pack-content-v2.ts
 *
 * 参数：
 *   --dry-run: 仅查看数据，不实际更新
 *   --limit: 最多处理条数（用于试跑）
 *   --id: 指定素材项 id，仅处理该条（用于测试）
 *   --force-clean: 对已有 themeConfig2/materialResourcesGroup 的项也执行 nextVal 清理并更新
 *   --concurrency: 并发数（默认 10），同时处理的条数，可显著提升速度
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 需配置 OSS 相关环境变量（供 getWorksDataWithOSS 使用）
 * - 作品仅软删除（deleted=true）时仍会从 OSS 拉取数据回填；作品不存在或 OSS 不可用时跳过并记录日志
 */

import dotenv from 'dotenv';
import path from 'path';
import { cleanNextValChains } from '../../components/GridEditorV3/works-store';
import { initPrisma } from '../index';

// 加载环境变量
const possibleEnvPaths = [
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✅ 已加载环境变量文件: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  未找到环境变量文件，将使用系统环境变量');
}

/** 主题包 V3 素材分类 id（与 ThemeLayoutLibraryV3/services 中 themePackV3CateId 一致） */
const THEME_PACK_V3_CATE_ID = 'gsds5y0ap0ss0c83lxv9chy2';

interface MigrationOptions {
  dryRun: boolean;
  limit: number | null;
  id: string | null;
  forceClean: boolean;
  concurrency: number;
}

interface ContentShape {
  worksId?: string;
  componentsGrids?: unknown;
  componentsBlocks?: unknown;
  materialResourcesGroup?: unknown;
  themeConfig2?: unknown;
  [key: string]: unknown;
}

async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    limit: (() => {
      const i = args.indexOf('--limit');
      if (i !== -1 && args[i + 1]) {
        const n = parseInt(args[i + 1], 10);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    })(),
    id: (() => {
      const i = args.indexOf('--id');
      if (i !== -1 && args[i + 1]) {
        return args[i + 1].trim() || null;
      }
      return null;
    })(),
    forceClean: args.includes('--force-clean'),
    concurrency: (() => {
      const i = args.indexOf('--concurrency');
      if (i !== -1 && args[i + 1]) {
        const n = parseInt(args[i + 1], 10);
        return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 10;
      }
      return 10;
    })(),
  };

  console.log('🚀 开始主题包 content 扩展迁移（materialResourcesGroup / themeConfig2）\n');
  console.log('选项:', {
    dryRun: options.dryRun,
    limit: options.limit ?? '无限制',
    id: options.id ?? '全部',
    forceClean: options.forceClean,
    concurrency: options.concurrency,
  });
  console.log('');

  if (options.dryRun) {
    console.log('⚠️  DRY-RUN 模式：不会实际更新数据库\n');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  const prisma = initPrisma({ connectionString: databaseUrl });

  // 动态导入，避免脚本在无 server 环境下直接依赖路径解析失败
  let getWorksDataWithOSS: (params: {
    prisma: ReturnType<typeof initPrisma>;
    worksId: string;
    version?: string;
    includeDeleted?: boolean;
  }) => Promise<{ work_data: { gridProps?: { materialResourcesGroup?: unknown; themeConfig2?: unknown } } }>;
  try {
    const worksUtils = await import('../../server/utils/works-utils');
    getWorksDataWithOSS = worksUtils.getWorksDataWithOSS;
  } catch (e) {
    console.error(
      '❌ 无法加载 getWorksDataWithOSS，请确保在 jiantie 包内运行（如 cd packages/jiantie/v11-database）',
      e
    );
    process.exit(1);
  }

  try {
    // 解析主题包分类：支持 id 或 alias
    const materialClass = await (prisma as any).materialClassEntity.findFirst({
      where: {
        OR: [{ id: THEME_PACK_V3_CATE_ID }, { alias: THEME_PACK_V3_CATE_ID }],
      },
    });

    if (!materialClass) {
      console.log(`⚠️  未找到主题包分类 (id/alias: ${THEME_PACK_V3_CATE_ID})，无需迁移`);
      await prisma.$disconnect();
      return;
    }

    const themePackClassId = materialClass.id;
    const items = await (prisma as any).materialItemEntity.findMany({
      where: {
        material_class_id: themePackClassId,
        deleted: false,
        ...(options.id && { id: options.id }),
      },
      orderBy: { update_time: 'desc' },
    });

    const total = items.length;
    if (options.id && total === 0) {
      console.log(`⚠️  未找到 id 为 ${options.id} 的主题包素材项`);
      await prisma.$disconnect();
      return;
    }
    console.log(`📦 共找到 ${total} 个主题包素材项\n`);

    let success = 0;
    let skipped = 0;
    let failed = 0;
    const limit = options.limit ?? total;
    const concurrency = options.concurrency;

    type ProcessResult = { result: 'success' | 'failed' | 'skipped'; id?: string; name?: string; kind?: 'clean' | 'update' };

    /** 单条异步处理：forceClean 更新 或 拉作品 + 更新 */
    async function processOne(
      item: (typeof items)[0],
      content: ContentShape
    ): Promise<ProcessResult> {
      const hasMaterialResourcesGroup = content.materialResourcesGroup != null;
      const hasThemeConfig2 = content.themeConfig2 != null;

      if (options.forceClean && (hasMaterialResourcesGroup || hasThemeConfig2)) {
        const materialResourcesGroup =
          content.materialResourcesGroup != null
            ? cleanNextValChains(content.materialResourcesGroup)
            : content.materialResourcesGroup;
        const themeConfig2 =
          content.themeConfig2 != null ? cleanNextValChains(content.themeConfig2) : content.themeConfig2;

        const nextContent: ContentShape = {
          ...content,
          ...(materialResourcesGroup != null && { materialResourcesGroup }),
          ...(themeConfig2 != null && { themeConfig2 }),
        };

        if (options.dryRun) {
          console.log(`  [DRY-RUN] 将清理 nextVal: ${item.id} (${item.name})`);
          return { result: 'success', id: item.id, name: item.name, kind: 'clean' };
        }
        await (prisma as any).materialItemEntity.update({
          where: { id: item.id },
          data: { content: nextContent },
        });
        return { result: 'success', id: item.id, name: item.name, kind: 'clean' };
      }

      const worksId = content.worksId;
      if (!worksId || typeof worksId !== 'string') {
        console.warn(`  ⚠️  跳过 ${item.id} (${item.name})：content.worksId 缺失`);
        return { result: 'skipped' };
      }

      if (options.dryRun) {
        console.log(`  [DRY-RUN] 将回填: ${item.name} (${item.id}), worksId: ${worksId}`);
        return { result: 'success', id: item.id, name: item.name, kind: 'update' };
      }

      try {
        const { work_data } = await getWorksDataWithOSS({
          prisma,
          worksId,
          includeDeleted: true, // 作品仅软删除，可继续从 OSS 拉取数据回填主题包
        });
        const gridProps = work_data?.gridProps;
        const materialResourcesGroupRaw = gridProps?.materialResourcesGroup;
        const themeConfig2Raw = gridProps?.themeConfig2;

        const materialResourcesGroup =
          materialResourcesGroupRaw != null ? cleanNextValChains(materialResourcesGroupRaw) : undefined;
        const themeConfig2 = themeConfig2Raw != null ? cleanNextValChains(themeConfig2Raw) : undefined;

        const nextContent: ContentShape = {
          ...content,
          ...(materialResourcesGroup != null && { materialResourcesGroup }),
          ...(themeConfig2 != null && { themeConfig2 }),
        };

        await (prisma as any).materialItemEntity.update({
          where: { id: item.id },
          data: { content: nextContent },
        });

        return { result: 'success', id: item.id, name: item.name, kind: 'update' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ❌ 失败 ${item.id} (${item.name}), worksId: ${worksId} - ${msg}`);
        return { result: 'failed' };
      }
    }

    const running = new Set<Promise<void>>();

    for (let i = 0; i < items.length; i++) {
      if (limit != null && success + failed + skipped >= limit) break;

      const item = items[i];
      const content = item.content as ContentShape | null;

      if (!content || typeof content !== 'object') {
        console.warn(`  ⚠️  跳过 ${item.id} (${item.name})：content 无效`);
        skipped++;
        continue;
      }

      const hasMaterialResourcesGroup = content.materialResourcesGroup != null;
      const hasThemeConfig2 = content.themeConfig2 != null;

      if (hasMaterialResourcesGroup && hasThemeConfig2 && !options.forceClean) {
        if (skipped < 3) {
          console.log(`  ⏭️  跳过 ${item.id} (${item.name})：已包含 materialResourcesGroup 与 themeConfig2`);
        }
        skipped++;
        continue;
      }

      while (running.size >= concurrency) {
        await Promise.race(running);
      }

      const p = processOne(item, content).then((res) => {
        if (res.result === 'success') {
          success++;
          if (success <= 5 || success % 50 === 0) {
            console.log(
              res.kind === 'clean'
                ? `  ✅ 已清理 ${res.id} (${res.name})`
                : `  ✅ 已更新 ${res.id} (${res.name})`
            );
          }
        } else if (res.result === 'failed') {
          failed++;
        } else {
          skipped++;
        }
        running.delete(p);
      });
      running.add(p);
    }

    await Promise.all(running);

    console.log('');
    console.log('✅ 迁移结束');
    console.log(`   成功: ${success}，跳过: ${skipped}，失败: ${failed}`);
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
