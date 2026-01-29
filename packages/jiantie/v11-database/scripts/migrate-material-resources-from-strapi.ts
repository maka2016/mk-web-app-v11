/**
 * 从 Strapi 迁移素材资源数据到 Prisma 数据库
 *
 * 迁移内容：
 * 1. MaterialClassEntity (素材分类)
 * 2. MaterialFloorEntity (素材标签/分类)
 * 3. MaterialItemEntity (素材项)
 * 4. 关联关系（多对多）
 *
 * 使用方法：
 *   cd packages/jiantie/v11-database
 *   DATABASE_URL="your_database_url" npx tsx scripts/migrate-material-resources-from-strapi.ts
 *
 * 参数：
 *   --dry-run: 仅查看数据，不实际迁移
 *   --material-class-scope: 指定要迁移的素材分类 scope（documentId 或 alias），不指定则迁移所有
 *   --skip-classes: 跳过素材分类的迁移（如果已存在）
 *   --skip-floors: 跳过标签的迁移
 *   --skip-items: 跳过素材项的迁移
 *
 * 注意：
 * - 执行前请务必备份数据库
 * - 建议先在测试环境验证
 * - 脚本会创建或更新数据，不会删除现有数据
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import qs from 'qs';
import { initPrisma } from '../index';

// 加载环境变量
// 尝试从多个可能的位置加载 .env.local 文件
const possibleEnvPaths = [
  // 项目根目录
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(__dirname, '../../../.env'),
  // packages/jiantie/ 目录
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  // 当前工作目录
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

const cmsKey =
  'fd9abf5fcb8fd7f4667ce6fabf6212460bc30d72a96b654615387db51b5554f584f6c2d8b82928cfef349f2bbd11b9cd6d9577479569c70e23f2e8574d8aae704105309f44d2c0a76fe5d2eea14a3336ec1323a499f49e9c30490e619728b293cab14796d06fcedd530899fa19ca5560dcaad7f7040a41724238e7cf77fcc97c';

const getCmsApiHost = () => {
  // 从环境变量获取，或使用默认值
  const envHost = process.env.STRAPI_API_HOST;
  if (envHost) {
    return envHost;
  }
  // 默认使用生产环境
  return 'https://prompt.maka.im';
};

const requestCMSForDesigner = axios.create({
  baseURL: `${getCmsApiHost()}/api`,
  timeout: 60000, // 增加超时时间
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cmsKey}`,
  },
});

interface MigrationOptions {
  dryRun?: boolean;
  materialClassScope?: string;
  skipClasses?: boolean;
  skipFloors?: boolean;
  skipItems?: boolean;
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
  material_class?: {
    documentId: string;
  };
  parents?: Array<{
    documentId: string;
  }>;
  material_tags?: Array<{
    documentId: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface StrapiMaterialItem {
  id: number;
  documentId: string;
  name: string;
  author: string;
  desc?: string;
  content: any;
  cover_url: string;
  material_class?: {
    documentId: string;
  };
  material_tags?: Array<{
    documentId: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 从 Strapi 获取所有素材分类
 */
async function fetchMaterialClasses(): Promise<StrapiMaterialClass[]> {
  console.log('📦 正在从 Strapi 获取素材分类...');

  const allClasses: StrapiMaterialClass[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const query = qs.stringify(
      {
        pagination: {
          pageSize: 100,
          page: currentPage,
        },
        sort: ['createdAt:desc'],
      },
      { encodeValuesOnly: true }
    );

    try {
      const res = await requestCMSForDesigner.get(`/material-classes?${query}`);
      const response = res.data;

      if (response.data && Array.isArray(response.data)) {
        allClasses.push(...response.data);
      }

      const pageCount = response.meta?.pagination?.pageCount || 0;
      hasMorePages = currentPage < pageCount;
      currentPage++;

      console.log(
        `  已获取 ${allClasses.length} 个分类 (第 ${currentPage - 1}/${pageCount} 页)`
      );
    } catch (error: any) {
      console.error(`  获取第 ${currentPage} 页失败:`, error.message);
      hasMorePages = false;
    }
  }

  console.log(`✅ 共获取 ${allClasses.length} 个素材分类\n`);
  return allClasses;
}

/**
 * 从 Strapi 获取指定分类的所有标签
 */
async function fetchMaterialFloors(
  materialClassDocumentId: string
): Promise<StrapiMaterialFloor[]> {
  console.log(
    `📦 正在从 Strapi 获取素材标签 (material_class: ${materialClassDocumentId})...`
  );

  const allFloors: StrapiMaterialFloor[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const query = qs.stringify(
      {
        populate: ['material_tags', 'parents', 'material_class'],
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

    try {
      const res = await requestCMSForDesigner.get(`/material-tags?${query}`);
      const response = res.data;

      if (response.data && Array.isArray(response.data)) {
        allFloors.push(...response.data);
      }

      const pageCount = response.meta?.pagination?.pageCount || 0;
      hasMorePages = currentPage < pageCount;
      currentPage++;

      console.log(
        `  已获取 ${allFloors.length} 个标签 (第 ${currentPage - 1}/${pageCount} 页)`
      );
    } catch (error: any) {
      console.error(`  获取第 ${currentPage} 页失败:`, error.message);
      hasMorePages = false;
    }
  }

  console.log(`✅ 共获取 ${allFloors.length} 个素材标签\n`);
  return allFloors;
}

/**
 * 从 Strapi 获取指定分类的所有素材项
 */
async function fetchMaterialItems(
  materialClassDocumentId: string
): Promise<StrapiMaterialItem[]> {
  console.log(
    `📦 正在从 Strapi 获取素材项 (material_class: ${materialClassDocumentId})...`
  );

  const allItems: StrapiMaterialItem[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    // 先尝试简化版本，不 populate material_class（因为它已经在 filters 中）
    const queryParams: any = {
      populate: {
        material_tags: {
          fields: ['documentId', 'name'],
        },
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
    };

    // 尝试添加 material_class 的 populate（如果 Strapi 支持）
    // 如果失败，可以注释掉这部分
    queryParams.populate.material_class = {
      fields: ['documentId'],
    };

    const query = qs.stringify(queryParams, {
      encodeValuesOnly: true,
      arrayFormat: 'brackets',
    });

    try {
      console.log(
        `  正在获取第 ${currentPage} 页，查询参数长度: ${query.length}`
      );

      // 如果查询参数太长，输出前200字符用于调试
      if (query.length > 500) {
        console.log(`  查询参数预览: ${query.substring(0, 200)}...`);
      }

      const res = await requestCMSForDesigner.get(`/material-items?${query}`);
      const response = res.data;

      // 只在第一页或出错时输出详细日志
      if (currentPage === 1) {
        console.log('  📋 第一页响应数据:', {
          hasData: !!response.data,
          dataLength: response.data?.length || 0,
          meta: response.meta,
        });
      }

      if (response.data && Array.isArray(response.data)) {
        allItems.push(...response.data);

        // 检查第一页的数据，输出 material_class 信息
        if (currentPage === 1 && response.data.length > 0) {
          const firstItem = response.data[0];
          console.log(
            `  🔍 第一页第一个素材项的 material_class:`,
            JSON.stringify(firstItem.material_class, null, 2)
          );
        }
      }

      const pageCount = response.meta?.pagination?.pageCount || 0;
      hasMorePages = currentPage < pageCount;
      currentPage++;

      console.log(
        `  已获取 ${allItems.length} 个素材项 (第 ${currentPage - 1}/${pageCount} 页)`
      );
    } catch (error: any) {
      console.error(`  ❌ 获取第 ${currentPage} 页失败:`);
      console.error(`     错误信息: ${error.message}`);
      if (error.response) {
        console.error(`     状态码: ${error.response.status}`);
        console.error(
          `     响应数据:`,
          JSON.stringify(error.response.data, null, 2)
        );
        console.error(`     请求URL: ${error.config?.url}`);
        console.error(`     查询参数:`, query.substring(0, 500)); // 只显示前500字符
      }
      if (error.stack) {
        console.error(`     堆栈:`, error.stack);
      }
      hasMorePages = false;
    }
  }

  console.log(`✅ 共获取 ${allItems.length} 个素材项\n`);
  return allItems;
}

/**
 * 迁移素材分类
 */
async function migrateMaterialClasses(
  prisma: ReturnType<typeof initPrisma>,
  classes: StrapiMaterialClass[],
  options: MigrationOptions
): Promise<Map<string, string>> {
  console.log('🔄 开始迁移素材分类...');
  console.log(`  📊 待迁移分类数量: ${classes.length}`);
  const classIdMap = new Map<string, string>(); // Strapi documentId -> Prisma id
  let successCount = 0;
  let errorCount = 0;

  for (const strapiClass of classes) {
    if (options.dryRun) {
      console.log(
        `  [DRY-RUN] 将创建/更新分类: ${strapiClass.name} (documentId: ${strapiClass.documentId}, alias: ${strapiClass.alias || '无'})`
      );
      classIdMap.set(strapiClass.documentId, 'dry-run-id');
      successCount++;
      continue;
    }

    try {
      // 检查是否已存在（通过 documentId 或 alias）
      const existing = await prisma.materialClassEntity.findFirst({
        where: {
          OR: [
            { id: strapiClass.documentId },
            ...(strapiClass.alias ? [{ alias: strapiClass.alias }] : []),
          ],
        },
      });

      if (existing) {
        // 更新现有记录
        const updated = await prisma.materialClassEntity.update({
          where: { id: existing.id },
          data: {
            name: strapiClass.name,
            desc: strapiClass.desc || null,
            alias: strapiClass.alias || null,
          },
        });
        classIdMap.set(strapiClass.documentId, updated.id);
        // 如果 alias 存在，也添加到映射中
        if (strapiClass.alias) {
          classIdMap.set(strapiClass.alias, updated.id);
        }
        console.log(
          `  ✅ 更新分类: ${strapiClass.name} (id: ${updated.id}, documentId: ${strapiClass.documentId}, alias: ${strapiClass.alias || '无'})`
        );
        successCount++;
      } else {
        // 创建新记录
        const created = await prisma.materialClassEntity.create({
          data: {
            id: strapiClass.documentId, // 使用 Strapi 的 documentId 作为 id
            name: strapiClass.name,
            desc: strapiClass.desc || null,
            alias: strapiClass.alias || null,
          },
        });
        classIdMap.set(strapiClass.documentId, created.id);
        // 如果 alias 存在，也添加到映射中
        if (strapiClass.alias) {
          classIdMap.set(strapiClass.alias, created.id);
        }
        console.log(
          `  ✅ 创建分类: ${strapiClass.name} (id: ${created.id}, documentId: ${strapiClass.documentId}, alias: ${strapiClass.alias || '无'})`
        );
        successCount++;
      }
    } catch (error: any) {
      console.error(
        `  ❌ 迁移分类失败: ${strapiClass.name} (documentId: ${strapiClass.documentId}) - ${error.message}`
      );
      if (error.stack) {
        console.error(`     堆栈: ${error.stack}`);
      }
      errorCount++;
    }
  }

  console.log(
    `✅ 素材分类迁移完成，成功: ${successCount}，失败: ${errorCount}，映射表大小: ${classIdMap.size}\n`
  );
  return classIdMap;
}

/**
 * 迁移素材标签
 */
async function migrateMaterialFloors(
  prisma: ReturnType<typeof initPrisma>,
  floors: StrapiMaterialFloor[],
  classIdMap: Map<string, string>,
  options: MigrationOptions
): Promise<Map<string, string>> {
  console.log('🔄 开始迁移素材标签...');
  const floorIdMap = new Map<string, string>(); // Strapi documentId -> Prisma id

  // 第一遍：创建所有标签（不处理层级关系）
  for (const strapiFloor of floors) {
    const materialClassId = strapiFloor.material_class?.documentId
      ? classIdMap.get(strapiFloor.material_class.documentId)
      : null;

    if (!materialClassId) {
      console.warn(`  ⚠️  跳过标签 ${strapiFloor.name}：找不到对应的素材分类`);
      continue;
    }

    if (options.dryRun) {
      console.log(
        `  [DRY-RUN] 将创建/更新标签: ${strapiFloor.name} (${strapiFloor.documentId})`
      );
      floorIdMap.set(strapiFloor.documentId, 'dry-run-id');
      continue;
    }

    try {
      const existing = await prisma.materialFloorEntity.findUnique({
        where: { id: strapiFloor.documentId },
      });

      if (existing) {
        const updated = await prisma.materialFloorEntity.update({
          where: { id: strapiFloor.documentId },
          data: {
            name: strapiFloor.name,
            desc: strapiFloor.desc || null,
            material_class_id: materialClassId,
          },
        });
        floorIdMap.set(strapiFloor.documentId, updated.id);
      } else {
        const created = await prisma.materialFloorEntity.create({
          data: {
            id: strapiFloor.documentId,
            name: strapiFloor.name,
            desc: strapiFloor.desc || null,
            material_class_id: materialClassId,
          },
        });
        floorIdMap.set(strapiFloor.documentId, created.id);
      }
    } catch (error: any) {
      console.error(
        `  ❌ 迁移标签失败: ${strapiFloor.name} - ${error.message}`
      );
    }
  }

  // 第二遍：处理层级关系
  console.log('  处理标签层级关系...');

  // 使用 Set 来跟踪已创建的关系，避免重复
  const createdRelations = new Set<string>();
  const createRelation = async (
    parentId: string,
    childId: string,
    sortOrder: number = 0
  ) => {
    const relationKey = `${parentId}:${childId}`;
    if (createdRelations.has(relationKey)) {
      return; // 关系已创建，跳过
    }
    createdRelations.add(relationKey);

    if (options.dryRun) {
      console.log(
        `  [DRY-RUN] 将创建父子关系: ${parentId} -> ${childId} (sort_order: ${sortOrder})`
      );
      return;
    }

    try {
      // 检查关系是否已存在
      const existing = await (
        prisma as any
      ).materialFloorParentEntity.findFirst({
        where: {
          parent_id: parentId,
          child_id: childId,
        },
      });

      if (!existing) {
        await (prisma as any).materialFloorParentEntity.create({
          data: {
            parent_id: parentId,
            child_id: childId,
            sort_order: sortOrder,
          },
        });
      }
    } catch (error: any) {
      console.error(
        `  ❌ 创建父子关系失败: ${parentId} -> ${childId} - ${error.message}`
      );
    }
  };

  for (const strapiFloor of floors) {
    const prismaFloorId = floorIdMap.get(strapiFloor.documentId);
    if (!prismaFloorId || prismaFloorId === 'dry-run-id') continue;

    // 处理父级关系（从 parents 字段）
    if (strapiFloor.parents && strapiFloor.parents.length > 0) {
      for (let index = 0; index < strapiFloor.parents.length; index++) {
        const parent = strapiFloor.parents[index];
        const parentPrismaId = floorIdMap.get(parent.documentId);
        if (!parentPrismaId || parentPrismaId === 'dry-run-id') continue;

        // 防止自引用：如果父节点ID等于当前节点ID，跳过
        if (parentPrismaId === prismaFloorId) {
          console.warn(
            `  ⚠️  跳过自引用关系: ${strapiFloor.name} (${strapiFloor.documentId}) 不能作为自己的父节点`
          );
          continue;
        }

        // 使用索引作为 sort_order（索引越大，sort_order 越大，排序越靠前）
        const sortOrder = strapiFloor.parents.length - index - 1;
        await createRelation(parentPrismaId, prismaFloorId, sortOrder);
      }
    }

    // 同时处理子级关系（从 material_tags 字段，作为补充）
    // 这样可以确保即使 parents 数据不完整，也能建立关系
    if (strapiFloor.material_tags && strapiFloor.material_tags.length > 0) {
      for (let index = 0; index < strapiFloor.material_tags.length; index++) {
        const child = strapiFloor.material_tags[index];
        const childPrismaId = floorIdMap.get(child.documentId);
        if (!childPrismaId || childPrismaId === 'dry-run-id') continue;

        // 防止自引用
        if (childPrismaId === prismaFloorId) {
          continue;
        }

        // 使用索引作为 sort_order
        const sortOrder = strapiFloor.material_tags.length - index - 1;
        await createRelation(prismaFloorId, childPrismaId, sortOrder);
      }
    }
  }

  console.log(`✅ 素材标签迁移完成，共 ${floorIdMap.size} 个\n`);
  return floorIdMap;
}

/**
 * 迁移素材项
 */
async function migrateMaterialItems(
  prisma: ReturnType<typeof initPrisma>,
  items: StrapiMaterialItem[],
  classIdMap: Map<string, string>,
  floorIdMap: Map<string, string>,
  options: MigrationOptions
): Promise<void> {
  console.log('🔄 开始迁移素材项...');
  console.log(`  📊 classIdMap 大小: ${classIdMap.size}`);
  if (classIdMap.size > 0 && classIdMap.size <= 10) {
    console.log(`  📊 classIdMap 内容:`, Array.from(classIdMap.entries()));
  } else if (classIdMap.size > 10) {
    console.log(
      `  📊 classIdMap 前10个键:`,
      Array.from(classIdMap.keys()).slice(0, 10)
    );
  }

  let successCount = 0;
  let errorCount = 0;
  const missingClassStats = new Map<string, number>(); // 统计缺失的分类

  for (const strapiItem of items) {
    const materialClassDocumentId = strapiItem.material_class?.documentId;

    // material_class 是可选的，如果不存在或找不到，设置为 null
    let materialClassId: string | null = null;

    if (materialClassDocumentId) {
      materialClassId = classIdMap.get(materialClassDocumentId) || null;

      if (!materialClassId) {
        // 记录警告，但不阻止迁移
        if (errorCount < 10) {
          console.warn(
            `  ⚠️  素材项 ${strapiItem.name} (${strapiItem.documentId})：找不到对应的素材分类，将设置为 null`
          );
          console.warn(
            `      素材项的 material_class.documentId: ${materialClassDocumentId}`
          );
          console.warn(
            `      classIdMap 中是否有此键: ${classIdMap.has(materialClassDocumentId)}`
          );
        }

        // 统计缺失的分类
        missingClassStats.set(
          materialClassDocumentId,
          (missingClassStats.get(materialClassDocumentId) || 0) + 1
        );
      }
    } else {
      // material_class 为空，记录但不阻止迁移
      if (errorCount < 10) {
        console.warn(
          `  ⚠️  素材项 ${strapiItem.name} (${strapiItem.documentId})：material_class 为空，将设置为 null`
        );
      }
      missingClassStats.set('null', (missingClassStats.get('null') || 0) + 1);
    }

    if (options.dryRun) {
      console.log(
        `  [DRY-RUN] 将创建/更新素材项: ${strapiItem.name} (${strapiItem.documentId})`
      );
      successCount++;
      continue;
    }

    try {
      const existing = await prisma.materialItemEntity.findUnique({
        where: { id: strapiItem.documentId },
      });

      // 构建更新/创建数据
      const itemData: any = {
        name: strapiItem.name,
        author: strapiItem.author,
        desc: strapiItem.desc || null,
        content: strapiItem.content,
        cover_url: strapiItem.cover_url || '',
        // material_class_id 是可选的，如果找不到就设置为 null
        ...(materialClassId
          ? { material_class_id: materialClassId }
          : { material_class_id: null }),
      };

      if (existing) {
        // 更新现有记录
        await prisma.materialItemEntity.update({
          where: { id: strapiItem.documentId },
          data: itemData,
        });
      } else {
        // 创建新记录
        await prisma.materialItemEntity.create({
          data: {
            id: strapiItem.documentId,
            ...itemData,
          },
        });
      }

      // 处理标签关联
      if (strapiItem.material_tags && strapiItem.material_tags.length > 0) {
        // 先删除所有现有关联
        await prisma.materialItemTagEntity.deleteMany({
          where: {
            material_item_id: strapiItem.documentId,
          },
        });

        // 创建新关联
        const tagRelations = strapiItem.material_tags
          .map((tag, index) => {
            const floorPrismaId = floorIdMap.get(tag.documentId);
            if (!floorPrismaId || floorPrismaId === 'dry-run-id') return null;
            return {
              material_item_id: strapiItem.documentId,
              material_floor_id: floorPrismaId,
              sort_order: strapiItem.material_tags!.length - index,
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
        console.log(`  已迁移 ${successCount} 个素材项...`);
      }
    } catch (error: any) {
      console.error(
        `  ❌ 迁移素材项失败: ${strapiItem.name} - ${error.message}`
      );
      errorCount++;
    }
  }

  console.log(
    `✅ 素材项迁移完成，成功: ${successCount}，失败: ${errorCount}\n`
  );

  // 输出缺失分类的统计信息
  if (missingClassStats.size > 0) {
    console.log('📊 缺失素材分类统计:');
    const sortedStats = Array.from(missingClassStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // 只显示前10个
    for (const [classId, count] of sortedStats) {
      console.log(`  - ${classId || 'null'}: ${count} 个素材项`);
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
    skipClasses: args.includes('--skip-classes'),
    skipFloors: args.includes('--skip-floors'),
    skipItems: args.includes('--skip-items'),
  };

  // 解析 material-class-scope 参数
  const scopeIndex = args.indexOf('--material-class-scope');
  if (scopeIndex !== -1 && args[scopeIndex + 1]) {
    options.materialClassScope = args[scopeIndex + 1];
  }

  console.log('🚀 开始从 Strapi 迁移素材资源数据...\n');
  console.log('选项:', {
    dryRun: options.dryRun,
    materialClassScope: options.materialClassScope || '全部',
    skipClasses: options.skipClasses,
    skipFloors: options.skipFloors,
    skipItems: options.skipItems,
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
    // 1. 获取素材分类
    let materialClasses: StrapiMaterialClass[] = [];
    if (!options.skipClasses) {
      materialClasses = await fetchMaterialClasses();

      // 如果指定了 scope，只迁移指定的分类
      if (options.materialClassScope) {
        materialClasses = materialClasses.filter(
          c =>
            c.documentId === options.materialClassScope ||
            c.alias === options.materialClassScope
        );
        console.log(`筛选后，将迁移 ${materialClasses.length} 个素材分类\n`);
      }
    }

    // 2. 迁移素材分类
    const classIdMap = new Map<string, string>();
    if (!options.skipClasses && materialClasses.length > 0) {
      const migratedClassIdMap = await migrateMaterialClasses(
        prisma,
        materialClasses,
        options
      );
      classIdMap.clear();
      migratedClassIdMap.forEach((v, k) => classIdMap.set(k, v));
      console.log(`📊 素材分类映射表已构建，共 ${classIdMap.size} 个分类\n`);
    } else if (options.skipClasses) {
      // 如果跳过了分类迁移，尝试从数据库读取现有的分类
      console.log('📦 从数据库读取现有的素材分类...');
      const existingClasses = await (
        prisma as any
      ).materialClassEntity.findMany({
        select: {
          id: true,
          alias: true,
          name: true,
        },
      });
      for (const cls of existingClasses) {
        classIdMap.set(cls.id, cls.id);
        if (cls.alias) {
          classIdMap.set(cls.alias, cls.id);
        }
      }
      console.log(`✅ 从数据库读取到 ${classIdMap.size} 个分类映射\n`);
    }

    // 3. 迁移每个分类的标签和素材项
    for (const materialClass of materialClasses) {
      console.log(
        `\n📁 处理素材分类: ${materialClass.name} (${materialClass.documentId})\n`
      );

      // 获取标签
      let floors: StrapiMaterialFloor[] = [];
      if (!options.skipFloors) {
        floors = await fetchMaterialFloors(materialClass.documentId);
      }

      // 迁移标签
      const floorIdMap = new Map<string, string>();
      if (!options.skipFloors && floors.length > 0) {
        const migratedFloorIdMap = await migrateMaterialFloors(
          prisma,
          floors,
          classIdMap,
          options
        );
        floorIdMap.clear();
        migratedFloorIdMap.forEach((v, k) => floorIdMap.set(k, v));
      }

      // 获取素材项
      let items: StrapiMaterialItem[] = [];
      if (!options.skipItems) {
        items = await fetchMaterialItems(materialClass.documentId);

        // 检查素材项的 material_class 数据
        if (items.length > 0) {
          const sampleItem = items[0];
          console.log(`  📋 素材项示例数据:`);
          console.log(`     名称: ${sampleItem.name}`);
          console.log(
            `     material_class:`,
            JSON.stringify(sampleItem.material_class, null, 2)
          );
          console.log(
            `     当前处理的分类 documentId: ${materialClass.documentId}`
          );
          console.log(
            `     classIdMap 中是否有此分类: ${classIdMap.has(materialClass.documentId)}`
          );
        }
      }

      // 迁移素材项
      if (!options.skipItems && items.length > 0) {
        await migrateMaterialItems(
          prisma,
          items,
          classIdMap,
          floorIdMap,
          options
        );
      }
    }

    console.log('\n✅ 迁移完成！');
  } catch (error: any) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行迁移
main().catch(console.error);
