import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

// 输入验证 Schema
const PaginationParamsSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

const SearchParamsSchema = z.object({
  searchTerm: z.string().optional(),
  searchFields: z.array(z.string()).optional(),
});

const CreateMaterialItemSchema = z.object({
  documentId: z.string().optional(),
  name: z.string(),
  content: z.any(),
  author: z.string(),
  desc: z.string().optional(),
  cover_url: z.string(),
  material_tags: z
    .object({
      set: z.array(z.string()),
    })
    .optional(),
});

const CreateMaterialFloorSchema = z.object({
  name: z.string(),
  desc: z.string().optional(),
  parentId: z.string().optional(),
});

// Material Resource Router
export const materialResourceRouter = router({
  // 获取素材项列表
  getItems: publicProcedure
    .input(
      z.object({
        materialClassScope: z.string(),
        floorId: z.string().optional(),
        pagination: PaginationParamsSchema.optional(),
        searchParams: SearchParamsSchema.optional(),
        fields: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      // 获取素材分类
      let materialClass = await prismaClient.materialClassEntity.findUnique({
        where: {
          alias: input.materialClassScope,
        },
      });

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findUnique({
          where: {
            id: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        // 兼容：允许直接使用分类 name 作为 scope（历史代码里常用 name 过滤 Strapi）
        materialClass = await prismaClient.materialClassEntity.findFirst({
          where: {
            name: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        throw new Error(
          `Material class with alias/id/name "${input.materialClassScope}" not found`
        );
      }

      const page = input.pagination?.page || 1;
      const pageSize = input.pagination?.pageSize || 500;
      const skip = (page - 1) * pageSize;

      // 构建 where 条件
      const where: any = {
        material_class_id: materialClass.id,
        deleted: false,
      };

      // 按标签过滤
      if (input.floorId) {
        where.material_tags = {
          some: {
            material_floor_id: input.floorId,
          },
        };
      }

      // 构建搜索条件
      if (input.searchParams?.searchTerm?.trim()) {
        const searchTerm = input.searchParams.searchTerm.trim();
        const searchFields = input.searchParams.searchFields || [
          'name',
          'author',
          'desc',
        ];

        const conditions: any[] = [];

        if (searchFields.includes('name')) {
          conditions.push({
            name: {
              contains: searchTerm,
              mode: 'insensitive' as const,
            },
          });
        }

        if (searchFields.includes('author')) {
          conditions.push({
            author: {
              contains: searchTerm,
              mode: 'insensitive' as const,
            },
          });
        }

        if (searchFields.includes('desc')) {
          conditions.push({
            desc: {
              contains: searchTerm,
              mode: 'insensitive' as const,
            },
          });
        }

        if (searchFields.includes('material_tags')) {
          conditions.push({
            material_tags: {
              some: {
                material_floor: {
                  name: {
                    contains: searchTerm,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
          });
        }

        if (conditions.length > 0) {
          where.OR = conditions;
        }
      }

      // 查询总数
      const total = await prismaClient.materialItemEntity.count({ where });

      // 查询数据
      const items = await prismaClient.materialItemEntity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          create_time: 'desc',
        },
        include: {
          material_tags: {
            include: {
              material_floor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              sort_order: 'desc',
            },
          },
        },
      });

      const pageCount = Math.ceil(total / pageSize);

      // 转换数据格式
      const transformedItems = items.map((item: any) => ({
        id: item.id,
        name: item.name,
        author: item.author,
        desc: item.desc || '',
        material_tags: item.material_tags?.map((tag: any) => ({
          name: tag.material_floor.name,
          documentId: tag.material_floor.id,
        })),
        content: item.content,
        cover_url: item.cover_url,
        cover: {
          url: item.cover_url,
        },
        documentId: item.id,
        createdAt: item.create_time.toISOString(),
        updatedAt: item.update_time.toISOString(),
      }));

      return {
        data: transformedItems,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount,
            total,
          },
        },
      };
    }),

  // 获取单个素材项
  getItem: publicProcedure
    .input(
      z.object({
        itemDocumentId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      const item = await prismaClient.materialItemEntity.findUnique({
        where: {
          id: input.itemDocumentId,
        },
        include: {
          material_tags: {
            include: {
              material_floor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              sort_order: 'desc',
            },
          },
        },
      });

      if (!item) {
        throw new Error(
          `Material item with id "${input.itemDocumentId}" not found`
        );
      }

      return {
        id: item.id,
        name: item.name,
        author: item.author,
        desc: item.desc || '',
        material_tags: item.material_tags?.map((tag: any) => ({
          name: tag.material_floor.name,
          documentId: tag.material_floor.id,
        })),
        content: item.content,
        cover_url: item.cover_url,
        cover: {
          url: item.cover_url,
        },
        documentId: item.id,
        createdAt: item.create_time.toISOString(),
        updatedAt: item.update_time.toISOString(),
      };
    }),

  // 创建素材项
  createItem: publicProcedure
    .input(
      z.object({
        materialClassScope: z.string(),
        itemData: CreateMaterialItemSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      // 获取素材分类
      let materialClass = await prismaClient.materialClassEntity.findUnique({
        where: {
          alias: input.materialClassScope,
        },
      });

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findUnique({
          where: {
            id: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findFirst({
          where: {
            name: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        throw new Error(
          `Material class with alias/id/name "${input.materialClassScope}" not found`
        );
      }

      const item = await prismaClient.materialItemEntity.create({
        data: {
          name: input.itemData.name,
          author: input.itemData.author,
          desc: input.itemData.desc,
          content: input.itemData.content,
          cover_url: input.itemData.cover_url,
          material_class_id: materialClass.id,
          material_tags: input.itemData.material_tags?.set
            ? {
                create: input.itemData.material_tags.set.map(
                  (floorId, index) => ({
                    material_floor_id: floorId,
                    sort_order:
                      input.itemData.material_tags!.set.length - index,
                  })
                ),
              }
            : undefined,
        },
        include: {
          material_tags: {
            include: {
              material_floor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return {
        id: item.id,
        name: item.name,
        author: item.author,
        desc: item.desc || '',
        material_tags: item.material_tags?.map((tag: any) => ({
          name: tag.material_floor.name,
          documentId: tag.material_floor.id,
        })),
        content: item.content,
        cover_url: item.cover_url,
        cover: {
          url: item.cover_url,
        },
        documentId: item.id,
        createdAt: item.create_time.toISOString(),
        updatedAt: item.update_time.toISOString(),
      };
    }),

  // 更新素材项
  updateItem: publicProcedure
    .input(
      z.object({
        itemId: z.string(),
        itemData: CreateMaterialItemSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      const updateData: any = {};

      if (input.itemData.name !== undefined)
        updateData.name = input.itemData.name;
      if (input.itemData.author !== undefined)
        updateData.author = input.itemData.author;
      if (input.itemData.desc !== undefined)
        updateData.desc = input.itemData.desc;
      if (input.itemData.content !== undefined)
        updateData.content = input.itemData.content;
      if (input.itemData.cover_url !== undefined)
        updateData.cover_url = input.itemData.cover_url;

      // 处理标签关联
      if (input.itemData.material_tags?.set) {
        // 先删除所有现有关联
        await prismaClient.materialItemTagEntity.deleteMany({
          where: {
            material_item_id: input.itemId,
          },
        });

        // 创建新关联
        if (input.itemData.material_tags.set.length > 0) {
          await prismaClient.materialItemTagEntity.createMany({
            data: input.itemData.material_tags.set.map((floorId, index) => ({
              material_item_id: input.itemId,
              material_floor_id: floorId,
              sort_order: input.itemData.material_tags!.set.length - index,
            })),
          });
        }
      }

      const item = await prismaClient.materialItemEntity.update({
        where: {
          id: input.itemId,
        },
        data: updateData,
        include: {
          material_tags: {
            include: {
              material_floor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              sort_order: 'desc',
            },
          },
        },
      });

      return {
        id: item.id,
        name: item.name,
        author: item.author,
        desc: item.desc || '',
        material_tags: item.material_tags?.map((tag: any) => ({
          name: tag.material_floor.name,
          documentId: tag.material_floor.id,
        })),
        content: item.content,
        cover_url: item.cover_url,
        cover: {
          url: item.cover_url,
        },
        documentId: item.id,
        createdAt: item.create_time.toISOString(),
        updatedAt: item.update_time.toISOString(),
      };
    }),

  // 删除素材项（软删除）
  removeItem: publicProcedure
    .input(
      z.object({
        itemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      const item = await prismaClient.materialItemEntity.update({
        where: {
          id: input.itemId,
        },
        data: {
          deleted: true,
        },
      });

      return {
        id: item.id,
        name: item.name,
        author: item.author,
        desc: item.desc || '',
        content: item.content,
        cover_url: item.cover_url,
        cover: {
          url: item.cover_url,
        },
        documentId: item.id,
        createdAt: item.create_time.toISOString(),
        updatedAt: item.update_time.toISOString(),
      };
    }),

  // 获取所有标签（递归，支持缓存）
  // 返回完整的树形结构，支持无限嵌套
  getAllFloorsRecursively: publicProcedure
    .input(
      z.object({
        materialClassScope: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma;

      // 获取素材分类
      let materialClass = await prismaClient.materialClassEntity.findUnique({
        where: {
          alias: input.materialClassScope,
        },
      });

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findUnique({
          where: {
            id: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findFirst({
          where: {
            name: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        throw new Error(
          `Material class with alias/id/name "${input.materialClassScope}" not found`
        );
      }

      // 获取所有楼层（不分页）
      const floors = await prismaClient.materialFloorEntity.findMany({
        where: {
          material_class_id: materialClass.id,
          deleted: false,
        },
        orderBy: {
          create_time: 'desc',
        },
      });

      // 收集所有需要查询的楼层 ID（包括初始楼层和所有子节点）
      const allFloorIds = new Set<string>();
      floors.forEach((floor: any) => {
        allFloorIds.add(floor.id);
      });

      // 递归收集更深层的子节点 ID
      let hasNewIds = true;
      while (hasNewIds) {
        hasNewIds = false;
        const currentFloorIds = Array.from(allFloorIds);

        // 查询当前楼层作为父节点的关系
        const newRelations = await (
          prismaClient as any
        ).materialFloorParentEntity.findMany({
          where: {
            parent_id: { in: currentFloorIds },
          },
        });

        newRelations.forEach((rel: any) => {
          if (!allFloorIds.has(rel.child_id)) {
            allFloorIds.add(rel.child_id);
            hasNewIds = true;
          }
        });
      }

      // 查询所有相关的楼层
      const allFloors = await prismaClient.materialFloorEntity.findMany({
        where: {
          id: { in: Array.from(allFloorIds) },
          material_class_id: materialClass.id,
          deleted: false,
        },
      });

      // 查询所有关系（使用关系表直接查询，不依赖 Prisma include）
      const allRelationsData = await (
        prismaClient as any
      ).materialFloorParentEntity.findMany({
        where: {
          parent_id: { in: Array.from(allFloorIds) },
        },
        orderBy: {
          sort_order: 'desc',
        },
      });

      // 构建楼层映射表（id -> floor），用于快速查找
      const floorMap = new Map<string, any>();
      allFloors.forEach((floor: any) => {
        floorMap.set(floor.id, floor);
      });

      // 构建父子关系映射（parent_id -> children[]）
      // 直接使用关系表数据，不依赖 Prisma include
      const childrenMap = new Map<
        string,
        Array<{ floor: any; sort_order: number }>
      >();
      const hasParentSet = new Set<string>(); // 记录有父节点的楼层ID

      // 按 parent_id 分组关系
      allRelationsData.forEach((rel: any) => {
        // 过滤掉自引用
        if (rel.parent_id === rel.child_id) {
          return;
        }

        const childFloor = floorMap.get(rel.child_id);
        if (!childFloor || childFloor.deleted) {
          return;
        }

        // 确保子节点属于同一个 material_class
        if (childFloor.material_class_id !== materialClass.id) {
          return;
        }

        if (!childrenMap.has(rel.parent_id)) {
          childrenMap.set(rel.parent_id, []);
        }
        childrenMap.get(rel.parent_id)!.push({
          floor: childFloor,
          sort_order: rel.sort_order || 0,
        });
        hasParentSet.add(rel.child_id); // 标记该子节点有父节点
      });

      // 对每个父节点的子节点列表进行排序
      childrenMap.forEach((children, parentId) => {
        children.sort((a, b) => b.sort_order - a.sort_order);
      });

      // 转换函数：将数据库实体转换为 API 格式（树形结构）
      const transformFloorToTree = (floor: any): any => {
        const baseFloor = {
          id: floor.id,
          name: floor.name,
          desc: floor.desc || '',
          documentId: floor.id,
          createdAt: floor.create_time.toISOString(),
          updatedAt: floor.update_time.toISOString(),
          publishedAt: floor.update_time.toISOString(),
          key: null,
        };

        // 获取子节点并递归转换
        const childrenData = childrenMap.get(floor.id) || [];
        const children_floor = childrenData.map(({ floor: childFloor }) =>
          transformFloorToTree(childFloor)
        );

        return {
          ...baseFloor,
          children_floor,
        };
      };

      // 找出所有根节点（没有父节点的楼层）
      // 注意：这里使用初始查询的 floors，因为我们需要返回的是符合初始查询条件的根节点
      const rootFloors = floors.filter(
        (floor: any) => !hasParentSet.has(floor.id)
      );

      // 构建树形结构
      const result = rootFloors.map((floor: any) =>
        transformFloorToTree(floor)
      );

      return result;
    }),

  // 获取标签列表（支持过滤）
  getFloors: publicProcedure
    .input(
      z.object({
        materialClassScope: z.string(),
        filter: z.record(z.string(), z.any()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      // 获取素材分类
      let materialClass = await prismaClient.materialClassEntity.findUnique({
        where: {
          alias: input.materialClassScope,
        },
      });

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findUnique({
          where: {
            id: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findFirst({
          where: {
            name: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        throw new Error(
          `Material class with alias/id/name "${input.materialClassScope}" not found`
        );
      }

      const where: any = {
        material_class_id: materialClass.id,
        deleted: false,
        ...(input.filter || {}),
      };

      const floors = await prismaClient.materialFloorEntity.findMany({
        where,
        include: {
          parent_relations: {
            include: {
              parent: true,
            },
            orderBy: {
              sort_order: 'desc',
            },
          },
          child_relations: {
            include: {
              child: true,
            },
            orderBy: {
              sort_order: 'desc',
            },
          },
        },
        orderBy: {
          create_time: 'desc',
        },
        take: 100,
      });

      const transformFloor = (floor: any): any => ({
        id: floor.id,
        name: floor.name,
        desc: floor.desc || '',
        documentId: floor.id,
        createdAt: floor.create_time.toISOString(),
        updatedAt: floor.update_time.toISOString(),
        parents: floor.parent_relations?.map((rel: any) => ({
          id: rel.parent.id,
          name: rel.parent.name,
          desc: rel.parent.desc || '',
          documentId: rel.parent.id,
          createdAt: rel.parent.create_time.toISOString(),
          updatedAt: rel.parent.update_time.toISOString(),
        })),
        material_tags: floor.child_relations?.map((rel: any) => ({
          id: rel.child.id,
          name: rel.child.name,
          desc: rel.child.desc || '',
          documentId: rel.child.id,
          createdAt: rel.child.create_time.toISOString(),
          updatedAt: rel.child.update_time.toISOString(),
        })),
      });

      return {
        data: floors.map(transformFloor),
        meta: {
          pagination: {
            page: 1,
            pageSize: floors.length,
            pageCount: 1,
            total: floors.length,
          },
        },
      };
    }),

  // 创建标签
  createFloor: publicProcedure
    .input(
      z.object({
        materialClassScope: z.string(),
        floorData: CreateMaterialFloorSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      // 获取素材分类
      let materialClass = await prismaClient.materialClassEntity.findUnique({
        where: {
          alias: input.materialClassScope,
        },
      });

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findUnique({
          where: {
            id: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        materialClass = await prismaClient.materialClassEntity.findFirst({
          where: {
            name: input.materialClassScope,
          },
        });
      }

      if (!materialClass) {
        throw new Error(
          `Material class with alias/id/name "${input.materialClassScope}" not found`
        );
      }

      // 先创建 floor 实体
      const floor = await prismaClient.materialFloorEntity.create({
        data: {
          name: input.floorData.name,
          desc: input.floorData.desc,
          material_class_id: materialClass.id,
        },
      });

      // 如果有父级，创建父子关系
      if (input.floorData.parentId) {
        await prismaClient.materialFloorParentEntity.create({
          data: {
            parent_id: input.floorData.parentId,
            child_id: floor.id,
            sort_order: 0,
          },
        });
      }

      // 查询完整的 floor 信息（包含关系）
      const floorWithRelations =
        await prismaClient.materialFloorEntity.findUnique({
          where: {
            id: floor.id,
          },
          include: {
            parent_relations: {
              include: {
                parent: true,
              },
            },
            child_relations: {
              include: {
                child: true,
              },
            },
          },
        });

      if (!floorWithRelations) {
        throw new Error('Failed to create floor');
      }

      return {
        id: floorWithRelations.id,
        name: floorWithRelations.name,
        desc: floorWithRelations.desc || '',
        documentId: floorWithRelations.id,
        createdAt: floorWithRelations.create_time.toISOString(),
        updatedAt: floorWithRelations.update_time.toISOString(),
        parents: floorWithRelations.parent_relations?.map((rel: any) => ({
          id: rel.parent.id,
          name: rel.parent.name,
          desc: rel.parent.desc || '',
          documentId: rel.parent.id,
          createdAt: rel.parent.create_time.toISOString(),
          updatedAt: rel.parent.update_time.toISOString(),
        })),
        material_tags: floorWithRelations.child_relations?.map((rel: any) => ({
          id: rel.child.id,
          name: rel.child.name,
          desc: rel.child.desc || '',
          documentId: rel.child.id,
          createdAt: rel.child.create_time.toISOString(),
          updatedAt: rel.child.update_time.toISOString(),
        })),
      };
    }),

  // 更新标签
  updateFloor: publicProcedure
    .input(
      z.object({
        floorId: z.string(),
        floorData: CreateMaterialFloorSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      const updateData: any = {};

      if (input.floorData.name !== undefined)
        updateData.name = input.floorData.name;
      if (input.floorData.desc !== undefined)
        updateData.desc = input.floorData.desc;

      const floor = await prismaClient.materialFloorEntity.update({
        where: {
          id: input.floorId,
        },
        data: updateData,
        include: {
          parent_relations: {
            include: {
              parent: true,
            },
          },
          child_relations: {
            include: {
              child: true,
            },
          },
        },
      });

      return {
        id: floor.id,
        name: floor.name,
        desc: floor.desc || '',
        documentId: floor.id,
        createdAt: floor.create_time.toISOString(),
        updatedAt: floor.update_time.toISOString(),
        parents: floor.parent_relations?.map((rel: any) => ({
          id: rel.parent.id,
          name: rel.parent.name,
          desc: rel.parent.desc || '',
          documentId: rel.parent.id,
          createdAt: rel.parent.create_time.toISOString(),
          updatedAt: rel.parent.update_time.toISOString(),
        })),
        material_tags: floor.child_relations?.map((rel: any) => ({
          id: rel.child.id,
          name: rel.child.name,
          desc: rel.child.desc || '',
          documentId: rel.child.id,
          createdAt: rel.child.create_time.toISOString(),
          updatedAt: rel.child.update_time.toISOString(),
        })),
      };
    }),

  // 删除标签（软删除）
  removeFloor: publicProcedure
    .input(
      z.object({
        floorId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      const floor = await prismaClient.materialFloorEntity.update({
        where: {
          id: input.floorId,
        },
        data: {
          deleted: true,
        },
      });

      return {
        id: floor.id,
        name: floor.name,
        desc: floor.desc || '',
        documentId: floor.id,
        createdAt: floor.create_time.toISOString(),
        updatedAt: floor.update_time.toISOString(),
      };
    }),

  // 获取所有素材分类
  getMaterialClasses: publicProcedure.query(async ({ ctx }) => {
    const prismaClient = ctx.prisma;

    const classes = await prismaClient.materialClassEntity.findMany({
      where: {
        deleted: false,
      },
      orderBy: [
        {
          sort_order: 'desc',
        },
        {
          create_time: 'desc',
        },
      ],
    });

    return classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      desc: cls.desc || '',
      alias: cls.alias || '',
      sortOrder: (cls as any).sort_order || 0,
      createdAt: cls.create_time.toISOString(),
      updatedAt: cls.update_time.toISOString(),
    }));
  }),

  // 创建素材分类
  createMaterialClass: publicProcedure
    .input(
      z.object({
        name: z.string(),
        desc: z.string().optional(),
        alias: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      // 获取当前最大的 sort_order，新分类排在最后
      const maxSortOrder = await prismaClient.materialClassEntity.findFirst({
        where: {
          deleted: false,
        },
        orderBy: {
          sort_order: 'desc',
        },
        select: {
          sort_order: true,
        },
      });

      const newSortOrder = (maxSortOrder?.sort_order || 0) + 1;

      const materialClass = await prismaClient.materialClassEntity.create({
        data: {
          name: input.name,
          desc: input.desc,
          alias: input.alias,
          sort_order: newSortOrder,
        },
      });

      return {
        id: materialClass.id,
        name: materialClass.name,
        desc: materialClass.desc || '',
        alias: materialClass.alias || '',
        sortOrder: materialClass.sort_order || 0,
        createdAt: materialClass.create_time.toISOString(),
        updatedAt: materialClass.update_time.toISOString(),
      };
    }),

  // 更新素材分类
  updateMaterialClass: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        desc: z.string().optional(),
        alias: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.desc !== undefined) updateData.desc = input.desc;
      if (input.alias !== undefined) updateData.alias = input.alias;

      const materialClass = await prismaClient.materialClassEntity.update({
        where: {
          id: input.id,
        },
        data: updateData,
      });

      return {
        id: materialClass.id,
        name: materialClass.name,
        desc: materialClass.desc || '',
        alias: materialClass.alias || '',
        createdAt: materialClass.create_time.toISOString(),
        updatedAt: materialClass.update_time.toISOString(),
      };
    }),

  // 删除素材分类（软删除）
  removeMaterialClass: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      const materialClass = await prismaClient.materialClassEntity.update({
        where: {
          id: input.id,
        },
        data: {
          deleted: true,
        },
      });

      return {
        id: materialClass.id,
        name: materialClass.name,
        desc: materialClass.desc || '',
        alias: materialClass.alias || '',
        createdAt: materialClass.create_time.toISOString(),
        updatedAt: materialClass.update_time.toISOString(),
      };
    }),

  // 更新素材分类排序
  updateMaterialClassesOrder: publicProcedure
    .input(
      z.object({
        orders: z.array(
          z.object({
            id: z.string(),
            sortOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prismaClient = ctx.prisma as any;

      // 批量更新排序
      await Promise.all(
        input.orders.map((order) =>
          prismaClient.materialClassEntity.update({
            where: {
              id: order.id,
            },
            data: {
              sort_order: order.sortOrder,
            },
          })
        )
      );

      return { success: true };
    }),

  // ==================== Theme Pack 相关接口 ====================
  // 注意：Theme Pack 现在作为 MaterialItem 存储，使用 createItem 和 updateItem 接口
  // updateThemePack 和 createThemePack 已废弃，迁移到 materialItem

  // 获取主题包的素材项
  getThemePackMaterialItems: publicProcedure
    .input(
      z.object({
        themePackId: z.string(),
        floorId: z.string().optional(),
        pagination: PaginationParamsSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: 实现获取主题包素材项逻辑
      throw new Error('getThemePackMaterialItems not implemented yet');
    }),

  // 获取素材渠道
  getMaterialChannels: publicProcedure
    .input(
      z.object({
        templateAppId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: 实现获取素材渠道逻辑
      throw new Error('getMaterialChannels not implemented yet');
    }),

  // 获取主题包的楼层数据
  getThemePackFloorData: publicProcedure
    .input(
      z.object({
        templateAppId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: 实现获取主题包楼层数据逻辑
      throw new Error('getThemePackFloorData not implemented yet');
    }),

  // 获取主题包列表
  getThemePackList: publicProcedure
    .input(
      z.object({
        templateAppId: z.string().optional(),
        pagination: z
          .object({
            page: z.number(),
            pageSize: z.number(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: 实现获取主题包列表逻辑
      throw new Error('getThemePackList not implemented yet');
    }),

  // 获取单个主题包
  getThemePack: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: 实现获取单个主题包逻辑
      throw new Error('getThemePack not implemented yet');
    }),

  // 根据模板ID获取主题包项
  getThemePackItemsByTemplateId: publicProcedure
    .input(
      z.object({
        templateId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: 实现根据模板ID获取主题包项逻辑
      throw new Error('getThemePackItemsByTemplateId not implemented yet');
    }),

  // 获取模板应用列表
  getTemplateApps: publicProcedure.query(async ({ ctx }) => {
    // TODO: 实现获取模板应用列表逻辑
    throw new Error('getTemplateApps not implemented yet');
  }),
});
