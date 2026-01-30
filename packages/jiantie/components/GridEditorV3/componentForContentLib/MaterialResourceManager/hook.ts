import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  MaterialFloor,
  MaterialItem,
  MaterialResourceManagerAPI,
  SearchParams,
} from './services';

export const useMaterialResources = ({
  materialManager,
  pageSize = 10,
  mountToLoadData = true,
  fields,
  defaultCategory,
}: {
  materialManager: MaterialResourceManagerAPI;
  pageSize?: number;
  mountToLoadData?: boolean;
  fields?: string[];
  defaultCategory?: string;
}) => {
  const [list, setList] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    defaultCategory || ''
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<MaterialFloor[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchFields, setSearchFields] = useState<string[]>([
    'name',
    'author',
    'desc',
    'material_tags',
  ]);

  const loadCategories = async () => {
    try {
      const response = await materialManager.getFloors();
      const categoryList = response.data || [];
      setCategories(categoryList);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('加载版式分类失败');
    } finally {
    }
  };

  const loadItems = async (
    category: string,
    page: number,
    searchParams?: SearchParams
  ) => {
    if (loading) {
      return null;
    }
    setLoading(true);
    try {
      const response = await materialManager.getItems(
        category,
        {
          page,
          pageSize,
        },
        searchParams,
        fields
      );
      const items = response.data || [];
      // Always replace the list for traditional pagination
      setList(items);
      setTotal(response.meta?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load styling items:', error);
      toast.error('加载风格列表失败');
    } finally {
      setLoading(false);
    }
  };

  const reloadList = () => {
    const searchParams = searchTerm ? { searchTerm, searchFields } : undefined;
    loadItems(selectedCategory, currentPage, searchParams);
  };

  const setPage = (page: number) => {
    setCurrentPage(page);
    const searchParams = searchTerm ? { searchTerm, searchFields } : undefined;
    loadItems(selectedCategory, page, searchParams);
  };

  const setCategory = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    const searchParams = searchTerm ? { searchTerm, searchFields } : undefined;
    loadItems(category, 1, searchParams);
  };

  // 搜索相关方法
  const setSearch = (term: string, fields?: string[]) => {
    console.log('term', term);
    setSearchTerm(term);
    if (fields) {
      setSearchFields(fields);
    }
    setCurrentPage(1); // 搜索时重置到第一页
    const searchParams = term
      ? { searchTerm: term, searchFields: fields || searchFields }
      : undefined;
    console.log('setSearch called with:', {
      term,
      selectedCategory,
      searchParams,
    });
    // 使用 selectedCategory 或者空字符串（表示搜索所有分类）
    loadItems(selectedCategory || '', 1, searchParams);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    console.log('clearSearch called with selectedCategory:', selectedCategory);
    loadItems(selectedCategory || '', 1);
  };

  useEffect(() => {
    if (mountToLoadData) {
      loadCategories();
      loadItems(selectedCategory, currentPage);
    }
  }, []);

  return {
    loadCategories,
    setCategories,
    categories,
    setPage,
    setCategory,
    reloadList,
    selectedCategory,
    page: currentPage,
    loading,
    list,
    total,
    pageSize,
    // 搜索相关
    searchTerm,
    searchFields,
    setSearch,
    clearSearch,
  };
};
