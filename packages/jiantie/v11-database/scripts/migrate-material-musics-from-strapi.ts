/**
 * 从 Strapi 迁移 material-musics 数据到 MaterialItemEntity
 *
 * 迁移内容：
 * 1. MaterialItemEntity (音乐素材项)
 * 2. 关联关系（material_tags 通过 MaterialItemTagEntity）
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/migrate-material-musics-from-strapi.ts
 *
 * 参数：
 *   --dry-run: 仅查看数据，不实际迁移
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 脚本会创建或更新数据，不会删除现有数据
 * - 需要确保"简帖音乐"分类已存在（documentId: tlljh8cexlk80g74cz3uisxg）
 * - 需要确保相关标签已迁移到 MaterialFloorEntity
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import qs from 'qs';
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

for (const envPath of possibleEnvPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✅ 已加载环境变量文件: ${envPath}`);
    break;
  }
}

const cmsKey =
  'f042966d53f71413bc5143412fb3e5c45bdc1dc55a6c5d7c6f95a9defdfce37836b7413647b3f334fae050f8ed22665e224dc121d884bc96a89791d5b3ab5cea3bd0e77ff95e05281cda9f581f1bee0d99db896ffe7dfd300c04e6a1e79b6dac326581d02f0df7bfb6309b3ff9aaf9e24bd80a3c0b63f3bdfd7b2fbe53bf9d70';

const getCmsApiHost = () => {
  const envHost = process.env.STRAPI_API_HOST;
  if (envHost) {
    return envHost;
  }
  return 'https://prompt.maka.im';
};

const requestCMSForDesigner = axios.create({
  baseURL: `${getCmsApiHost()}/api`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cmsKey}`,
  },
});

interface MigrationOptions {
  dryRun?: boolean;
}

// 简帖音乐分类的 documentId
const MUSIC_CLASS_DOCUMENT_ID = 'tlljh8cexlk80g74cz3uisxg';

interface StrapiMaterialMusic {
  id: number;
  documentId: string;
  name: string;
  content?: any;
  cover?: {
    url: string;
  };
  url?: {
    url: string;
  };
  material_floors?: Array<{
    id: number;
    documentId: string;
  }>;
  desc?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 从 Strapi 获取所有 material-musics 数据
 */
async function fetchMaterialMusics(): Promise<StrapiMaterialMusic[]> {
  console.log('📦 正在从 Strapi 获取 material-musics 数据...');

  const allMusics: StrapiMaterialMusic[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const query = qs.stringify(
      {
        populate: {
          cover: {
            populate: '*',
          },
          url: {
            populate: '*',
          },
          material_floors: {
            populate: '*',
          },
        },
        pagination: {
          pageSize: 100,
          page: currentPage,
        },
        sort: ['createdAt:desc'],
      },
      { encodeValuesOnly: true }
    );

    try {
      const res = await requestCMSForDesigner.get(`/material-musics?${query}`);
      const response = res.data;

      if (response.data && Array.isArray(response.data)) {
        allMusics.push(...response.data);
      }

      const pageCount = response.meta?.pagination?.pageCount || 0;
      hasMorePages = currentPage < pageCount;
      currentPage++;

      console.log(`  已获取 ${allMusics.length} 个音乐素材 (第 ${currentPage - 1}/${pageCount} 页)`);
    } catch (error: any) {
      console.error(`  获取第 ${currentPage} 页失败:`, error.message);
      hasMorePages = false;
    }
  }

  console.log(`✅ 共获取 ${allMusics.length} 个音乐素材\n`);
  return allMusics;
}

/**
 * 迁移音乐素材到 MaterialItemEntity
 */
async function migrateMaterialMusics(
  prisma: ReturnType<typeof initPrisma>,
  musics: StrapiMaterialMusic[],
  classIdMap: Map<string, string>,
  floorIdMap: Map<string, string>,
  options: MigrationOptions
): Promise<void> {
  console.log('🔄 开始迁移音乐素材...');

  // 获取"简帖音乐"分类的 ID
  const musicClassId = classIdMap.get(MUSIC_CLASS_DOCUMENT_ID);
  if (!musicClassId) {
    console.error(`❌ 错误: 找不到"简帖音乐"分类 (documentId: ${MUSIC_CLASS_DOCUMENT_ID})`);
    console.error('请先确保该分类已迁移到 MaterialClassEntity');
    process.exit(1);
  }

  console.log(`  📊 音乐分类 ID: ${musicClassId}`);
  console.log(`  📊 floorIdMap 大小: ${floorIdMap.size}`);

  let successCount = 0;
  let errorCount = 0;
  const missingFloorStats = new Map<string, number>();

  for (const strapiMusic of musics) {
    if (options.dryRun) {
      console.log(`  [DRY-RUN] 将创建/更新音乐素材: ${strapiMusic.name} (${strapiMusic.documentId})`);
      successCount++;
      continue;
    }

    try {
      // 数据转换
      const coverUrl = strapiMusic.cover?.url || '';
      const musicUrl = strapiMusic.url?.url || '';

      // 合并 content：将 url.url 合并到 content 中
      let content: any = strapiMusic.content || {};
      if (musicUrl) {
        content = {
          ...(typeof content === 'object' && content !== null ? content : {}),
          url: musicUrl,
        };
      }

      // 处理 author 字段（必需字段，设置默认值）
      const author = '系统';

      const existing = await prisma.materialItemEntity.findUnique({
        where: { id: strapiMusic.documentId },
      });

      // 构建更新/创建数据
      const itemData: any = {
        name: strapiMusic.name,
        author: author,
        desc: strapiMusic.desc || null,
        content: content,
        cover_url: coverUrl,
        material_class_id: musicClassId,
      };

      if (existing) {
        // 更新现有记录
        await prisma.materialItemEntity.update({
          where: { id: strapiMusic.documentId },
          data: itemData,
        });
      } else {
        // 创建新记录
        await prisma.materialItemEntity.create({
          data: {
            id: strapiMusic.documentId,
            ...itemData,
          },
        });
      }

      // 处理标签关联（material_floors → material_tags）
      if (strapiMusic.material_floors && strapiMusic.material_floors.length > 0) {
        // 先删除所有现有关联
        await prisma.materialItemTagEntity.deleteMany({
          where: {
            material_item_id: strapiMusic.documentId,
          },
        });

        // 创建新关联
        const tagRelations = strapiMusic.material_floors
          .map((floor, index) => {
            const floorPrismaId = floorIdMap.get(floor.documentId);
            if (!floorPrismaId || floorPrismaId === 'dry-run-id') {
              // 统计缺失的标签
              missingFloorStats.set(floor.documentId, (missingFloorStats.get(floor.documentId) || 0) + 1);
              return null;
            }
            return {
              material_item_id: strapiMusic.documentId,
              material_floor_id: floorPrismaId,
              sort_order: strapiMusic.material_floors!.length - index,
            };
          })
          .filter((rel): rel is NonNullable<typeof rel> => rel !== null);

        if (tagRelations.length > 0) {
          await prisma.materialItemTagEntity.createMany({
            data: tagRelations,
            skipDuplicates: true,
          });
        }
      }

      successCount++;
      if (successCount % 50 === 0) {
        console.log(`  已迁移 ${successCount} 个音乐素材...`);
      }
    } catch (error: any) {
      console.error(`  ❌ 迁移音乐素材失败: ${strapiMusic.name} (${strapiMusic.documentId}) - ${error.message}`);
      if (error.stack) {
        console.error(`     堆栈: ${error.stack}`);
      }
      errorCount++;
    }
  }

  console.log(`✅ 音乐素材迁移完成，成功: ${successCount}，失败: ${errorCount}\n`);

  // 输出缺失标签的统计信息
  if (missingFloorStats.size > 0) {
    console.log('📊 缺失标签统计:');
    const sortedStats = Array.from(missingFloorStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [floorId, count] of sortedStats) {
      console.log(`  - ${floorId}: ${count} 个音乐素材`);
    }
    console.log('');
  }
}

/**
 * 主迁移函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
  };

  console.log('🚀 开始从 Strapi 迁移 material-musics 数据...\n');
  console.log('选项:', {
    dryRun: options.dryRun,
  });
  console.log('');

  if (options.dryRun) {
    console.log('⚠️  DRY-RUN 模式：不会实际修改数据库\n');
  }

  // 初始化 Prisma
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  const prisma = initPrisma({ connectionString: databaseUrl });

  try {
    // 1. 获取"简帖音乐"分类的 ID 映射
    console.log('📦 从数据库读取"简帖音乐"分类...');
    const musicClass = await prisma.materialClassEntity.findFirst({
      where: {
        OR: [{ id: MUSIC_CLASS_DOCUMENT_ID }, { alias: '简帖音乐' }],
      },
    });

    if (!musicClass) {
      console.error(`❌ 错误: 找不到"简帖音乐"分类 (documentId: ${MUSIC_CLASS_DOCUMENT_ID} 或 alias: 简帖音乐)`);
      console.error('请先运行 migrate-material-resources-from-strapi.ts 迁移分类数据');
      process.exit(1);
    }

    const classIdMap = new Map<string, string>();
    classIdMap.set(MUSIC_CLASS_DOCUMENT_ID, musicClass.id);
    if (musicClass.alias) {
      classIdMap.set(musicClass.alias, musicClass.id);
    }
    console.log(`✅ 找到"简帖音乐"分类: ${musicClass.name} (id: ${musicClass.id})\n`);

    // 2. 获取所有标签的 ID 映射
    console.log('📦 从数据库读取标签映射...');
    const floors = await prisma.materialFloorEntity.findMany({
      where: {
        material_class_id: musicClass.id,
      },
    });

    // 构建标签映射：key 和 value 都是 floor.id
    // 注意：如果标签是从 Strapi 迁移的，floor.id 就是 Strapi 的 documentId
    // material-musics 中的 material_floors 包含的是 Strapi 的 documentId
    const floorIdMap = new Map<string, string>();
    for (const floor of floors) {
      // 使用 floor.id 作为 key（因为迁移时使用了 documentId 作为 id）
      floorIdMap.set(floor.id, floor.id);
    }
    console.log(`✅ 找到 ${floorIdMap.size} 个标签\n`);

    // 3. 获取所有 material-musics 数据
    const musics = await fetchMaterialMusics();

    if (musics.length === 0) {
      console.log('⚠️  没有找到需要迁移的音乐素材数据');
      return;
    }

    // 4. 迁移音乐素材
    await migrateMaterialMusics(prisma, musics, classIdMap, floorIdMap, options);

    console.log('\n✅ 迁移完成！');
  } catch (error: any) {
    console.error('\n❌ 迁移失败:', error);
    if (error.stack) {
      console.error('堆栈:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行迁移
main().catch(console.error);
