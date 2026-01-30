import axios from 'axios';
import qs from 'qs';

const cmsKey =
  'fd9abf5fcb8fd7f4667ce6fabf6212460bc30d72a96b654615387db51b5554f584f6c2d8b82928cfef349f2bbd11b9cd6d9577479569c70e23f2e8574d8aae704105309f44d2c0a76fe5d2eea14a3336ec1323a499f49e9c30490e619728b293cab14796d06fcedd530899fa19ca5560dcaad7f7040a41724238e7cf77fcc97c';

const getCmsApiHost = () => {
  return typeof window !== 'undefined' && /dev_cms/.test(window.location.href)
    ? 'http://localhost:1337'
    : 'https://prompt.maka.im';
};

export const requestCMSForDesigner = axios.create({
  baseURL: `${getCmsApiHost()}/api`,
  timeout: 35000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cmsKey}`,
  },
});

// 分页参数接口
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 搜索参数接口
export interface SearchParams {
  searchTerm?: string;
  searchFields?: string[]; // 搜索字段：['name', 'author', 'desc', 'material_tags']
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
  id: number;
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
  id: number;
  name: string;
  desc: string;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  /** 父级 */
  parents?: MaterialFloor[];
  /** 子级 */
  material_tags?: MaterialFloor[];
}

interface CreateMaterialItem<T> {
  documentId?: string;
  name: string;
  content: Partial<T>;
  author: string;
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

  // 构建搜索过滤器
  private buildSearchFilters = (searchParams?: SearchParams) => {
    console.log('buildSearchFilters called with:', searchParams);
    if (!searchParams?.searchTerm?.trim()) {
      console.log('No search term, returning empty filters');
      return {};
    }

    const searchTerm = searchParams.searchTerm.trim();
    const searchFields = searchParams.searchFields || [
      'name',
      'author',
      'desc',
    ];
    console.log('Processing search:', { searchTerm, searchFields });

    // 如果包含 material_tags 搜索，需要特殊处理
    if (searchFields.includes('material_tags')) {
      return {
        $or: [
          // 名称搜索
          ...(searchFields.includes('name')
            ? [{ name: { $containsi: searchTerm } }]
            : []),
          // 作者搜索
          ...(searchFields.includes('author')
            ? [{ author: { $containsi: searchTerm } }]
            : []),
          // 描述搜索
          ...(searchFields.includes('desc')
            ? [{ desc: { $containsi: searchTerm } }]
            : []),
          // 标签搜索
          {
            material_tags: {
              name: { $containsi: searchTerm },
            },
          },
        ],
      };
    } else {
      // 不包含标签搜索的简单情况
      const filters = [];
      if (searchFields.includes('name')) {
        filters.push({ name: { $containsi: searchTerm } });
      }
      if (searchFields.includes('author')) {
        filters.push({ author: { $containsi: searchTerm } });
      }
      if (searchFields.includes('desc')) {
        filters.push({ desc: { $containsi: searchTerm } });
      }

      return filters.length > 1 ? { $or: filters } : filters[0] || {};
    }
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
    // 构建搜索过滤器
    const searchFilters = this.buildSearchFilters(searchParams);

    const query = qs.stringify(
      {
        fields: fields,
        populate: {
          material_tags: {
            fields: ['documentId', 'name'],
          },
          cover: {
            populate: '*',
          },
        },

        filters: {
          ...(floorId
            ? {
                material_tags: {
                  documentId: { $eq: floorId },
                },
              }
            : {}),
          material_class: {
            documentId: {
              $eq: this.materialClassScope, // 固定的素材分类
            },
          },
          ...searchFilters, // 添加搜索过滤器
        },
        pagination: {
          pageSize: pagination?.pageSize || 500,
          page: pagination?.page || 1,
        },
        sort: ['createdAt:desc'],
      },
      { encodeValuesOnly: true }
    );
    const res = await requestCMSForDesigner.get(`/material-items?${query}`);
    return res.data as PaginatedResponse<MaterialItem>;
  };

  getItem = async (itemDocumentId: string) => {
    const query = qs.stringify(
      {
        populate: {
          material_tags: {
            fields: ['documentId', 'name'],
          },
        },

        filters: {
          documentId: {
            $eq: itemDocumentId,
          },
        },
      },
      { encodeValuesOnly: true }
    );
    const res = await requestCMSForDesigner.get(`/material-items?${query}`);
    return res.data.data?.[0] as MaterialItem<T>;
  };

  createItem = async (itemData: CreateMaterialItem<T>) => {
    const res = await requestCMSForDesigner.post('/material-items', {
      data: itemData,
    });
    return res.data;
  };

  updateItem = async (
    itemId: string,
    itemData: Partial<CreateMaterialItem<T>>
  ) => {
    const res = await requestCMSForDesigner.put(`/material-items/${itemId}`, {
      data: itemData,
    });
    return res.data;
  };

  removeItem = async (itemId: string) => {
    const res = await requestCMSForDesigner.delete(`/material-items/${itemId}`);
    return res.data;
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

    // 获取所有分类（不分页）
    const allFloors = await this.getAllFloorsWithoutPagination();

    // 缓存结果
    this.setCache(allFloors);

    return allFloors;
  };

  // 获取所有分类（分页循环获取）
  private getAllFloorsWithoutPagination = async (): Promise<
    MaterialFloor[]
  > => {
    const allFloors: MaterialFloor[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const query = qs.stringify(
        {
          populate: ['material_tags', 'parents'],
          filters: {
            material_class: {
              documentId: {
                $eq: this.materialClassScope, // 固定的素材分类
              },
            },
          },
          pagination: {
            pageSize: 100, // Strapi 最大分页限制
            page: currentPage,
          },
          sort: ['createdAt:desc'],
        },
        { encodeValuesOnly: true }
      );

      const res = await requestCMSForDesigner.get(`/material-tags?${query}`);
      const response = res.data as PaginatedResponse<MaterialFloor>;

      allFloors.push(...response.data);

      // 检查是否还有更多页面
      hasMorePages = currentPage < response.meta.pagination.pageCount;
      currentPage++;
    }

    // 递归获取所有子分类
    const hierarchicalFloors = await this.buildHierarchy(allFloors);

    return hierarchicalFloors;
  };

  // 构建层级结构
  private buildHierarchy = async (
    floors: MaterialFloor[]
  ): Promise<MaterialFloor[]> => {
    const result: MaterialFloor[] = [];
    const processedIds = new Set<string>();

    const processFloor = async (
      floor: MaterialFloor
    ): Promise<MaterialFloor> => {
      if (processedIds.has(floor.documentId)) {
        return floor;
      }
      processedIds.add(floor.documentId);

      // 递归处理子分类
      if (floor.material_tags && floor.material_tags.length > 0) {
        const childFloors = await Promise.all(
          floor.material_tags.map(child => processFloor(child))
        );
        floor.material_tags = childFloors;
      }

      return floor;
    };

    // 处理所有顶级分类
    for (const floor of floors) {
      const processedFloor = await processFloor(floor);
      result.push(processedFloor);
    }

    return result;
  };

  // 原有的 getFloors 方法，现在支持缓存
  getFloors = async (filter: any = {}) => {
    // 如果有过滤条件，不使用缓存，直接请求
    if (Object.keys(filter).length > 0) {
      const query = qs.stringify(
        {
          populate: ['material_tags', 'parents'],
          filters: {
            material_class: {
              documentId: {
                $eq: this.materialClassScope, // 固定的素材分类
              },
            },
            ...filter,
          },
          pagination: {
            pageSize: 100,
            page: 1,
          },
          sort: ['createdAt:desc'],
        },
        { encodeValuesOnly: true }
      );
      const res = await requestCMSForDesigner.get(`/material-tags?${query}`);
      return res.data as PaginatedResponse<MaterialFloor>;
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
    const { parentId, ...rest } = floorData as any;
    const res = await requestCMSForDesigner.post('/material-tags', {
      data: {
        name: rest.name,
        desc: rest.desc,
        material_class: {
          connect: [this.materialClassScope], // 固定的素材分类
        },
        ...(parentId
          ? {
              parents: {
                connect: [parentId],
              },
            }
          : {}),
      },
    });

    // 清除缓存，因为分类结构发生了变化
    this.clearCache();

    return res.data;
  };

  updateFloor = async (
    floorId: string,
    floorData: Partial<CreateMaterialFloor>
  ) => {
    const res = await requestCMSForDesigner.put(`/material-tags/${floorId}`, {
      data: floorData,
    });

    // 清除缓存，因为分类信息发生了变化
    this.clearCache();

    return res.data;
  };

  removeFloor = async (floorId: string) => {
    const res = await requestCMSForDesigner.delete(`/material-tags/${floorId}`);

    // 清除缓存，因为分类被删除了
    this.clearCache();

    return res.data;
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
