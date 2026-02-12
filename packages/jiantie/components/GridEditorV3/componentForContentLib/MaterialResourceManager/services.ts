import { trpc } from '@/utils/trpc';

// 分页参数接口
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 搜索参数接口
export interface SearchParams {
  searchTerm?: string;
  searchFields?: string[]; // 搜索字段：['name', 'author', 'desc', 'id', 'material_tags']
}

// 分页响应接口
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface MaterialItem<T = any> {
  id: string;
  name: string;
  author: string;
  desc: string;
  material_tags?: {
    name: string;
    documentId: string;
  }[];
  theme_pack_v2?: {
    name: string;
    documentId: string;
  }[];
  content: T;
  cover_url: string;
  cover: {
    url: string;
  };
  documentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialFloor {
  id: string;
  name: string;
  desc: string;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  key: null;
  /** 子级（树形结构） */
  children_floor?: MaterialFloor[];
}

interface CreateMaterialItem<T> {
  documentId?: string;
  name: string;
  content: Partial<T>;
  author: string;
  desc?: string;
  cover_url: string;
  material_tags?: {
    set: string[];
  };
  material_class?: {
    set: string[];
  };
}

interface CreateMaterialFloor {
  name: string;
  desc: string;
  /** 当存在时，表示此楼层为子级，parentId 为父级的 documentId */
  parentId?: string;
}

export class MaterialResourceManagerAPI<T = any> {
  private materialClassScope = '';
  private cacheKey = 'material_floors_cache_v2';
  private cacheExpiryKey = 'material_floors_cache_expiry_v2';
  private cacheExpiryTime = 10 * 60 * 1000; // 10分钟缓存

  constructor(materialClassScope: string) {
    this.materialClassScope = materialClassScope;
    // 自动清理旧缓存数据
    this.clearAllCache();
  }

  changeScope = (materialClassScope: string) => {
    this.materialClassScope = materialClassScope;
  };

  // 缓存相关方法
  private getCacheKey = () => {
    return `${this.cacheKey}_${this.materialClassScope}`;
  };

  private getCacheExpiryKey = () => {
    return `${this.cacheExpiryKey}_${this.materialClassScope}`;
  };

  private isCacheValid = (): boolean => {
    if (typeof window === 'undefined') return false;

    const expiry = sessionStorage.getItem(this.getCacheExpiryKey());
    if (!expiry) return false;

    const now = Date.now();
    const cacheTime = parseInt(expiry, 10);
    return now - cacheTime < this.cacheExpiryTime;
  };

  private setCache = (data: MaterialFloor[]) => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(this.getCacheKey(), JSON.stringify(data));
      sessionStorage.setItem(this.getCacheExpiryKey(), Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache material floors:', error);
    }
  };

  private getCache = (): MaterialFloor[] | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = sessionStorage.getItem(this.getCacheKey());
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to get cached material floors:', error);
      return null;
    }
  };

  private clearCache = () => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem(this.getCacheKey());
      sessionStorage.removeItem(this.getCacheExpiryKey());
    } catch (error) {
      console.warn('Failed to clear material floors cache:', error);
    }
  };

  getItems = async (
    floorId: string,
    pagination?: PaginationParams,
    searchParams?: SearchParams,
    fields?: string[]
  ) => {
    const result = await trpc.materialResource.getItems.query({
      materialClassScope: this.materialClassScope,
      floorId: floorId || undefined,
      pagination,
      searchParams,
      fields,
    });

    return result as PaginatedResponse<MaterialItem>;
  };

  getItem = async (itemDocumentId: string) => {
    const result = await trpc.materialResource.getItem.query({
      itemDocumentId,
    });

    return result as MaterialItem<T>;
  };

  createItem = async (itemData: CreateMaterialItem<T>) => {
    const result = await trpc.materialResource.createItem.mutate({
      materialClassScope: this.materialClassScope,
      itemData: {
        documentId: itemData.documentId,
        name: itemData.name,
        content: itemData.content as any,
        author: itemData.author,
        desc: itemData.desc,
        cover_url: itemData.cover_url,
        material_tags: itemData.material_tags,
      },
    });

    return result as MaterialItem<T>;
  };

  updateItem = async (
    itemId: string,
    itemData: Partial<CreateMaterialItem<T>>
  ) => {
    const result = await trpc.materialResource.updateItem.mutate({
      itemId,
      itemData: {
        name: itemData.name,
        content: itemData.content as any,
        author: itemData.author,
        desc: itemData.desc,
        cover_url: itemData.cover_url,
        material_tags: itemData.material_tags,
      },
    });

    return result as MaterialItem<T>;
  };

  removeItem = async (itemId: string) => {
    const result = await trpc.materialResource.removeItem.mutate({
      itemId,
    });

    return result as MaterialItem<T>;
  };

  // 递归获取所有分类（包括子分类）
  getAllFloorsRecursively = async (): Promise<MaterialFloor[]> => {
    // 检查缓存
    if (this.isCacheValid()) {
      const cached = this.getCache();
      if (cached) {
        return cached;
      }
    }

    // 从服务端获取
    const allFloors = await trpc.materialResource.getAllFloorsRecursively.query(
      {
        materialClassScope: this.materialClassScope,
      }
    );

    // 缓存结果
    this.setCache(allFloors);

    return allFloors;
  };

  // 原有的 getFloors 方法，现在支持缓存
  getFloors = async (filter: any = {}) => {
    // 如果有过滤条件，不使用缓存，直接请求
    if (Object.keys(filter).length > 0) {
      const result = await trpc.materialResource.getFloors.query({
        materialClassScope: this.materialClassScope,
        filter,
      });

      return result as PaginatedResponse<MaterialFloor>;
    }

    // 没有过滤条件时，尝试使用缓存
    if (this.isCacheValid()) {
      const cached = this.getCache();
      if (cached) {
        return {
          data: cached,
          meta: {
            pagination: {
              page: 1,
              pageSize: cached.length,
              pageCount: 1,
              total: cached.length,
            },
          },
        } as PaginatedResponse<MaterialFloor>;
      }
    }

    // 缓存无效或不存在，获取所有数据
    const allFloors = await this.getAllFloorsRecursively();

    return {
      data: allFloors,
      meta: {
        pagination: {
          page: 1,
          pageSize: allFloors.length,
          pageCount: 1,
          total: allFloors.length,
        },
      },
    } as PaginatedResponse<MaterialFloor>;
  };

  createFloor = async (floorData: CreateMaterialFloor) => {
    const result = await trpc.materialResource.createFloor.mutate({
      materialClassScope: this.materialClassScope,
      floorData,
    });

    // 清除缓存，因为分类结构发生了变化
    this.clearCache();

    return result;
  };

  updateFloor = async (
    floorId: string,
    floorData: Partial<CreateMaterialFloor>
  ) => {
    const result = await trpc.materialResource.updateFloor.mutate({
      floorId,
      floorData,
    });

    // 清除缓存，因为分类信息发生了变化
    this.clearCache();

    return result;
  };

  removeFloor = async (floorId: string) => {
    const result = await trpc.materialResource.removeFloor.mutate({
      floorId,
    });

    // 清除缓存，因为分类被删除了
    this.clearCache();

    return result;
  };

  // 公共方法：手动清除缓存
  clearFloorsCache = () => {
    this.clearCache();
  };

  // 公共方法：强制刷新分类数据
  refreshFloors = async (): Promise<MaterialFloor[]> => {
    this.clearCache();
    return await this.getAllFloorsRecursively();
  };

  // 公共方法：清理所有旧缓存数据
  clearAllCache = () => {
    if (typeof window === 'undefined') return;

    try {
      // 清理旧版本的缓存
      sessionStorage.removeItem('material_floors_cache');
      sessionStorage.removeItem('material_floors_cache_expiry');

      // 清理当前版本的缓存
      this.clearCache();
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  };
}
