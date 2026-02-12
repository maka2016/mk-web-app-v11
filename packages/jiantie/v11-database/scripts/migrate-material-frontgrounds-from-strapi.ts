/**
 * 从 Strapi 迁移“简帖氛围前景”素材到 Prisma 数据库（MaterialItemEntity）
 *
 * 数据源：
 * - material-classes（按 name = "简帖氛围前景" 过滤）
 * - material-tags（该分类下的标签）
 * - material-items（该分类下的素材项）
 *
 * 写入目标：
 * - MaterialClassEntity / MaterialFloorEntity / MaterialItemEntity / MaterialItemTagEntity
 *
 * 关键约定：
 * - 沿用 Strapi 的 documentId 作为 Prisma 的 id（幂等可重复执行，避免重复迁移）
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/migrate-material-frontgrounds-from-strapi.ts
 *
 * 参数：
 *   --dry-run: 仅查看数据，不实际迁移
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import qs from 'qs';
import { initPrisma } from '../index';

const MATERIAL_CLASS_NAME = '简帖氛围前景';

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
  if (envHost) return envHost;
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

interface StrapiMaterialClass {
  id: number;
  documentId: string;
  name: string;
  desc?: string;
  alias?: string;
  createdAt: string;
  updatedAt: string;
}

interface StrapiMaterialFloor {
  id: number;
  documentId: string;
  name: string;
  desc?: string;
  material_class?: { documentId: string };
  createdAt: string;
  updatedAt: string;
}

interface StrapiMaterialItem {
  id: number;
  documentId: string;
  name: string;
  author?: string;
  desc?: string;
  content: unknown;
  cover_url?: string;
  cover?: { url: string };
  material_class?: { documentId: string };
  material_tags?: Array<{ documentId: string }>;
  createdAt: string;
  updatedAt: string;
}

async function fetchMaterialClassByName(): Promise<StrapiMaterialClass | null> {
  const query = qs.stringify(
    {
      filters: {
        name: {
          $eq: MATERIAL_CLASS_NAME,
        },
      },
      pagination: {
        pageSize: 1,
        page: 1,
      },
      sort: ['createdAt:desc'],
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMSForDesigner.get(`/material-classes?${query}`);
  const first = res.data?.data?.[0] as StrapiMaterialClass | undefined;
  return first || null;
}

async function fetchMaterialFloors(
  materialClassDocumentId: string
): Promise<StrapiMaterialFloor[]> {
  const all: StrapiMaterialFloor[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const query = qs.stringify(
      {
        populate: ['material_class'],
        filters: {
          material_class: {
            documentId: {
              $eq: materialClassDocumentId,
            },
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

    const res = await requestCMSForDesigner.get(`/material-tags?${query}`);
    const response = res.data;
    if (response.data && Array.isArray(response.data)) {
      all.push(...response.data);
    }
    const pageCount = response.meta?.pagination?.pageCount || 0;
    hasMorePages = currentPage < pageCount;
    currentPage++;
  }

  return all;
}

async function fetchMaterialItems(
  materialClassDocumentId: string
): Promise<StrapiMaterialItem[]> {
  const all: StrapiMaterialItem[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const query = qs.stringify(
      {
        populate: {
          cover: { populate: '*' },
          material_tags: { fields: ['documentId'] },
          material_class: { fields: ['documentId'] },
        },
        filters: {
          material_class: {
            documentId: {
              $eq: materialClassDocumentId,
            },
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

    const res = await requestCMSForDesigner.get(`/material-items?${query}`);
    const response = res.data;
    if (response.data && Array.isArray(response.data)) {
      all.push(...response.data);
    }
    const pageCount = response.meta?.pagination?.pageCount || 0;
    hasMorePages = currentPage < pageCount;
    currentPage++;
  }

  return all;
}

async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = { dryRun: args.includes('--dry-run') };

  console.log(`🚀 开始迁移素材分类: ${MATERIAL_CLASS_NAME}`);
  if (options.dryRun) {
    console.log('⚠️  DRY-RUN 模式：不会实际修改数据库');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    process.exit(1);
  }

  const prisma = initPrisma({ connectionString: databaseUrl });

  try {
    const materialClass = await fetchMaterialClassByName();
    if (!materialClass) {
      console.error(`❌ Strapi 中未找到素材分类: ${MATERIAL_CLASS_NAME}`);
      process.exit(1);
    }

    console.log(
      `✅ 找到分类: ${materialClass.name} (documentId: ${materialClass.documentId}, alias: ${materialClass.alias || '无'})`
    );

    if (!options.dryRun) {
      // upsert class（id 使用 documentId）
      const existingClass = await prisma.materialClassEntity.findUnique({
        where: { id: materialClass.documentId },
      });

      if (existingClass) {
        await prisma.materialClassEntity.update({
          where: { id: materialClass.documentId },
          data: {
            name: materialClass.name,
            desc: materialClass.desc || null,
            alias: materialClass.alias || null,
          },
        });
      } else {
        await prisma.materialClassEntity.create({
          data: {
            id: materialClass.documentId,
            name: materialClass.name,
            desc: materialClass.desc || null,
            alias: materialClass.alias || null,
          },
        });
      }
    }

    // floors
    console.log('📦 获取标签...');
    const floors = await fetchMaterialFloors(materialClass.documentId);
    console.log(`✅ 获取到 ${floors.length} 个标签`);

    const floorIdMap = new Map<string, string>();
    for (const floor of floors) {
      floorIdMap.set(floor.documentId, floor.documentId);
      if (options.dryRun) continue;

      const existing = await prisma.materialFloorEntity.findUnique({
        where: { id: floor.documentId },
      });
      if (existing) {
        await prisma.materialFloorEntity.update({
          where: { id: floor.documentId },
          data: {
            name: floor.name,
            desc: floor.desc || null,
            material_class_id: materialClass.documentId,
          },
        });
      } else {
        await prisma.materialFloorEntity.create({
          data: {
            id: floor.documentId,
            name: floor.name,
            desc: floor.desc || null,
            material_class_id: materialClass.documentId,
          },
        });
      }
    }

    // items
    console.log('📦 获取素材项...');
    const items = await fetchMaterialItems(materialClass.documentId);
    console.log(`✅ 获取到 ${items.length} 个素材项`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      if (options.dryRun) {
        console.log(`  [DRY-RUN] 将创建/更新素材项: ${item.name} (${item.documentId})`);
        successCount++;
        continue;
      }

      try {
        const coverUrl = item.cover_url || item.cover?.url || '';
        const author = item.author?.trim() ? item.author.trim() : '系统';

        const existing = await prisma.materialItemEntity.findUnique({
          where: { id: item.documentId },
        });

        const itemData: any = {
          name: item.name,
          author,
          desc: item.desc || null,
          content: item.content ?? {},
          cover_url: coverUrl,
          material_class_id: materialClass.documentId,
        };

        if (existing) {
          await prisma.materialItemEntity.update({
            where: { id: item.documentId },
            data: itemData,
          });
        } else {
          await prisma.materialItemEntity.create({
            data: { id: item.documentId, ...itemData },
          });
        }

        // tags mapping
        await prisma.materialItemTagEntity.deleteMany({
          where: { material_item_id: item.documentId },
        });

        const tagRelations =
          item.material_tags
            ?.map((t, index) => {
              const floorId = floorIdMap.get(t.documentId);
              if (!floorId) return null;
              return {
                material_item_id: item.documentId,
                material_floor_id: floorId,
                sort_order: (item.material_tags?.length || 0) - index,
              };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x)) || [];

        if (tagRelations.length > 0) {
          await prisma.materialItemTagEntity.createMany({
            data: tagRelations,
            skipDuplicates: true,
          });
        }

        successCount++;
      } catch (e: any) {
        errorCount++;
        console.error(`  ❌ 迁移失败: ${item.name} (${item.documentId}) - ${e.message}`);
      }
    }

    console.log(`✅ 迁移完成，成功: ${successCount}，失败: ${errorCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ 脚本运行失败:', err);
  process.exit(1);
});

