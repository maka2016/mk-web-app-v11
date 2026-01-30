'use client';

import { MaterialCoverUploader } from '@/components/GridEditorV3/componentForContentLib/MaterialResourceManager/MaterialCoverUploader';
import MaterialFloorManager from '@/components/GridEditorV3/componentForContentLib/MaterialResourceManager/MaterialFloorManager';
import { MaterialResourceManagerAPI } from '@/components/GridEditorV3/componentForContentLib/MaterialResourceManager/services';
import { cdnApi } from '@/services';
import { trpc } from '@/utils/trpc';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import {
  ChevronDown,
  Copy,
  Edit,
  GripVertical,
  Image,
  Info,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PAGE_SIZE = 20;

interface MaterialFloor {
  id: string;
  name: string;
  desc?: string;
  documentId: string;
  material_tags?: MaterialFloor[];
  parents?: MaterialFloor[];
}

interface MaterialClass {
  id: string;
  name: string;
  desc?: string;
  alias?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// 可拖拽的分类项组件
function SortableClassItem({
  cls,
  isSelected,
  onSelect,
  onShowDetail,
  onEdit,
  onDelete,
  deletePopoverOpen,
  onDeletePopoverChange,
}: {
  cls: MaterialClass;
  isSelected: boolean;
  onSelect: () => void;
  onShowDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletePopoverOpen: boolean;
  onDeletePopoverChange: (open: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cls.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-1.5 border rounded cursor-pointer transition-colors text-xs ${
        isSelected
          ? 'border-primary/50 bg-primary/10'
          : 'border-transparent hover:bg-muted/50'
      } ${isDragging ? 'cursor-grabbing' : ''}`}
      onClick={onSelect}
    >
      <div className='flex items-start justify-between gap-1.5'>
        <div className='flex items-start gap-1 flex-1 min-w-0'>
          <div
            {...attributes}
            {...listeners}
            className='flex-shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 hover:bg-muted/50 rounded'
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className='h-3 w-3 text-muted-foreground' />
          </div>
          <div className='flex-1 min-w-0'>
            <div className='font-medium text-xs truncate leading-tight'>
              {cls.name}
            </div>
            {cls.desc && (
              <div className='text-[10px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight'>
                {cls.desc}
              </div>
            )}
          </div>
        </div>
        <div className='flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'>
          <Button
            variant='ghost'
            size='sm'
            className='h-5 w-5 p-0 hover:bg-muted'
            onClick={(e) => {
              e.stopPropagation();
              onShowDetail();
            }}
          >
            <Info className='h-3 w-3' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-5 w-5 p-0 hover:bg-muted'
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className='h-3 w-3' />
          </Button>
          <Popover open={deletePopoverOpen} onOpenChange={onDeletePopoverChange}>
            <PopoverTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-5 w-5 p-0 hover:bg-muted'
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Trash2 className='h-3 w-3' />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className='w-56 p-3'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='space-y-2'>
                <div className='text-sm font-medium'>
                  确定要删除这个素材分类吗？
                </div>
                <div className='text-xs text-muted-foreground'>
                  此操作不可恢复
                </div>
                <div className='flex justify-end gap-2 pt-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-6 px-2 text-xs'
                    onClick={() => onDeletePopoverChange(false)}
                  >
                    取消
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    className='h-6 px-2 text-xs'
                    onClick={onDelete}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

export default function MaterialManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [materialClassId, setMaterialClassId] = useState(
    searchParams.get('material_class_id') || ''
  );
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('search') || ''
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // 素材分类相关
  const [materialClasses, setMaterialClasses] = useState<MaterialClass[]>([]);
  const [floors, setFloors] = useState<MaterialFloor[]>([]);

  // 拖拽排序相关
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 创建 MaterialResourceManagerAPI 实例
  const materialManager = useMemo(() => {
    if (!materialClassId) return null;
    return new MaterialResourceManagerAPI(materialClassId);
  }, [materialClassId]);

  // 对话框状态
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showFloorDialog, setShowFloorDialog] = useState(false);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showClassDetailDialog, setShowClassDetailDialog] = useState(false);
  const [showTagSelectDialog, setShowTagSelectDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingFloor, setEditingFloor] = useState<MaterialFloor | null>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [selectedClassDetail, setSelectedClassDetail] = useState<any>(null);
  const [selectedTagData, setSelectedTagData] = useState<MaterialFloor | null>(
    null
  );

  // 删除确认 Popover 状态
  const [deleteItemPopoverOpen, setDeleteItemPopoverOpen] = useState<
    string | null
  >(null);
  const [deleteClassPopoverOpen, setDeleteClassPopoverOpen] = useState<
    string | null
  >(null);

  // 表单数据
  const [itemFormData, setItemFormData] = useState({
    name: '',
    author: '',
    desc: '',
    cover_url: '',
    content: {} as any,
    material_tags: [] as string[],
  });
  const [floorFormData, setFloorFormData] = useState({
    name: '',
    desc: '',
    parentId: '',
  });
  const [classFormData, setClassFormData] = useState({
    name: '',
    desc: '',
    alias: '',
  });

  // 加载素材分类列表
  const loadMaterialClasses = async () => {
    try {
      const classes = await trpc.materialResource.getMaterialClasses.query();
      setMaterialClasses(classes || []);
      if (classes.length > 0 && !materialClassId) {
        setMaterialClassId(classes[0].id);
      }
    } catch (error) {
      console.error('Failed to load material classes:', error);
    }
  };

  // 处理拖拽排序结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = materialClasses.findIndex((cls) => cls.id === active.id);
    const newIndex = materialClasses.findIndex((cls) => cls.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 更新本地状态（乐观更新）
    const newClasses = arrayMove(materialClasses, oldIndex, newIndex);
    setMaterialClasses(newClasses);

    // 计算新的排序值（从大到小，数值越大越靠前）
    const orders = newClasses.map((cls, index) => ({
      id: cls.id,
      sortOrder: newClasses.length - index,
    }));

    // 调用 API 更新排序
    try {
      await trpc.materialResource.updateMaterialClassesOrder.mutate({ orders });
    } catch (error: any) {
      console.error('Failed to update order:', error);
      // 如果失败，恢复原状态
      await loadMaterialClasses();
      alert(`更新排序失败: ${error.message || '未知错误'}`);
    }
  };

  // 加载标签树
  const loadFloors = async () => {
    if (!materialClassId) {
      setFloors([]);
      return;
    }
    try {
      const result = await trpc.materialResource.getAllFloorsRecursively.query({
        materialClassScope: materialClassId,
      });
      // 转换数据格式：将 material_tags 转换为 children_floor
      const convertFloors = (floors: any[]): any[] => {
        return floors.map(floor => ({
          ...floor,
          children_floor: floor.material_tags
            ? convertFloors(floor.material_tags)
            : undefined,
        }));
      };
      setFloors(convertFloors(result || []));
    } catch (error) {
      console.error('Failed to load floors:', error);
      setFloors([]);
    }
  };

  // 加载素材项列表
  const loadItems = async (targetPage?: number) => {
    if (!materialClassId) {
      setItems([]);
      setTotal(0);
      return;
    }

    const currentPage = targetPage !== undefined ? targetPage : page;
    setLoading(true);
    try {
      const result = await trpc.materialResource.getItems.query({
        materialClassScope: materialClassId,
        floorId: selectedFloorId || undefined,
        pagination: {
          page: currentPage,
          pageSize: PAGE_SIZE,
        },
        searchParams: searchTerm
          ? {
            searchTerm,
            searchFields: ['name', 'author', 'desc'],
          }
          : undefined,
      });

      setItems(result.data || []);
      setTotal(result.meta?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterialClasses();
  }, []);

  useEffect(() => {
    if (materialClassId) {
      loadFloors();
      loadItems(1);
      setPage(1);
    }
  }, [materialClassId]);

  useEffect(() => {
    if (materialClassId) {
      loadItems();
      updateURL();
    }
  }, [page, selectedFloorId]);

  // 监听 material_tags 变化，更新 selectedTagData
  const currentTagId = itemFormData.material_tags?.[0];
  useEffect(() => {
    if (
      currentTagId &&
      currentTagId !== selectedTagData?.documentId &&
      materialManager
    ) {
      loadAndSetTag(currentTagId);
    } else if (!currentTagId) {
      setSelectedTagData(null);
    }
  }, [currentTagId]);

  const handleSearch = () => {
    setPage(1);
    loadItems(1);
    updateURL();
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (materialClassId) params.set('material_class_id', materialClassId);
    if (selectedFloorId) params.set('floor_id', selectedFloorId);
    if (searchTerm) params.set('search', searchTerm);
    if (page > 1) params.set('page', String(page));
    router.replace(`/dashboard/manager/material?${params.toString()}`);
  };

  // 处理标签选择
  const handleFloorSelect = (floorId: string, _floor: any) => {
    setSelectedFloorId(floorId);
  };

  // 素材项相关操作
  const handleCreateItem = () => {
    setEditingItem(null);
    setSelectedTagData(null);
    setItemFormData({
      name: '',
      author: '',
      desc: '',
      cover_url: '',
      content: {},
      material_tags: [],
    });
    setShowItemDialog(true);
  };

  // 递归查找标签数据
  const findTagById = (
    tagId: string,
    tagList: MaterialFloor[]
  ): MaterialFloor | null => {
    for (const tag of tagList) {
      if (tag.documentId === tagId) {
        return tag;
      }
      const children =
        (tag as any).material_tags || (tag as any).children_floor;
      if (children && children.length > 0) {
        const found = findTagById(tagId, children);
        if (found) return found;
      }
    }
    return null;
  };

  // 根据标签ID加载并设置标签数据
  const loadAndSetTag = async (tagId: string | undefined) => {
    if (!tagId || !materialManager) return;

    try {
      const tags = await materialManager.getAllFloorsRecursively();
      const tag = findTagById(tagId, tags);
      if (tag) {
        setSelectedTagData(tag);
      }
    } catch (error) {
      console.error('加载标签数据失败:', error);
    }
  };

  // 获取当前选中的标签名称
  const getSelectedTagName = (): string => {
    return selectedTagData?.name || '请选择标签';
  };

  const handleEditItem = async (item: any) => {
    setEditingItem(item);
    const tagId = item.material_tags?.[0]?.documentId;
    setItemFormData({
      name: item.name || '',
      author: item.author || '',
      desc: item.desc || '',
      cover_url: item.cover_url || item.cover?.url || '',
      content: item.content || {},
      material_tags: tagId ? [tagId] : [],
    });
    // 加载并设置标签数据
    if (tagId) {
      await loadAndSetTag(tagId);
    } else {
      setSelectedTagData(null);
    }
    setShowItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!materialClassId) {
      alert('请先选择素材分类');
      return;
    }
    if (!itemFormData.name || !itemFormData.author || !itemFormData.cover_url) {
      alert('请填写必填项：名称、作者、封面');
      return;
    }

    try {
      if (editingItem) {
        await trpc.materialResource.updateItem.mutate({
          itemId: editingItem.documentId,
          itemData: {
            name: itemFormData.name,
            author: itemFormData.author,
            desc: itemFormData.desc,
            cover_url: itemFormData.cover_url,
            content: itemFormData.content,
            material_tags: {
              set: itemFormData.material_tags,
            },
          },
        });
      } else {
        await trpc.materialResource.createItem.mutate({
          materialClassScope: materialClassId,
          itemData: {
            name: itemFormData.name,
            author: itemFormData.author,
            desc: itemFormData.desc,
            cover_url: itemFormData.cover_url,
            content: itemFormData.content,
            material_tags: {
              set: itemFormData.material_tags,
            },
          },
        });
      }
      setShowItemDialog(false);
      await loadItems();
    } catch (error: any) {
      alert(`保存失败: ${error.message || '未知错误'}`);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await trpc.materialResource.removeItem.mutate({ itemId });
      await loadItems();
      setDeleteItemPopoverOpen(null);
    } catch (error: any) {
      alert(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  // 标签相关操作
  const handleCreateFloor = () => {
    setEditingFloor(null);
    setFloorFormData({
      name: '',
      desc: '',
      parentId: selectedFloorId || '',
    });
    setShowFloorDialog(true);
  };

  const handleEditFloor = (floor: MaterialFloor) => {
    setEditingFloor(floor);
    setFloorFormData({
      name: floor.name,
      desc: floor.desc || '',
      parentId: floor.parents?.[0]?.documentId || '',
    });
    setShowFloorDialog(true);
  };

  const handleSaveFloor = async () => {
    if (!materialClassId) {
      alert('请先选择素材分类');
      return;
    }
    if (!floorFormData.name) {
      alert('请填写标签名称');
      return;
    }

    try {
      if (editingFloor) {
        await trpc.materialResource.updateFloor.mutate({
          floorId: editingFloor.documentId,
          floorData: {
            name: floorFormData.name,
            desc: floorFormData.desc,
          },
        });
      } else {
        await trpc.materialResource.createFloor.mutate({
          materialClassScope: materialClassId,
          floorData: {
            name: floorFormData.name,
            desc: floorFormData.desc,
            parentId: floorFormData.parentId || undefined,
          },
        });
      }
      setShowFloorDialog(false);
      await loadFloors();
    } catch (error: any) {
      alert(`保存失败: ${error.message || '未知错误'}`);
    }
  };

  const handleDeleteFloor = async (floorId: string) => {
    if (!confirm('确定要删除这个标签吗？')) return;
    try {
      await trpc.materialResource.removeFloor.mutate({ floorId });
      await loadFloors();
      if (selectedFloorId === floorId) {
        setSelectedFloorId('');
      }
    } catch (error: any) {
      alert(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  // 素材分类相关操作
  const handleCreateClass = () => {
    setEditingClass(null);
    setClassFormData({
      name: '',
      desc: '',
      alias: '',
    });
    setShowClassDialog(true);
  };

  const handleEditClass = (cls: any) => {
    setEditingClass(cls);
    setClassFormData({
      name: cls.name,
      desc: cls.desc || '',
      alias: cls.alias || '',
    });
    setShowClassDialog(true);
  };

  const handleSaveClass = async () => {
    if (!classFormData.name) {
      alert('请填写分类名称');
      return;
    }

    try {
      if (editingClass) {
        await trpc.materialResource.updateMaterialClass.mutate({
          id: editingClass.id,
          ...classFormData,
        });
      } else {
        await trpc.materialResource.createMaterialClass.mutate(classFormData);
      }
      setShowClassDialog(false);
      await loadMaterialClasses();
    } catch (error: any) {
      alert(`保存失败: ${error.message || '未知错误'}`);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await trpc.materialResource.removeMaterialClass.mutate({ id: classId });
      await loadMaterialClasses();
      if (materialClassId === classId) {
        setMaterialClassId('');
      }
      setDeleteClassPopoverOpen(null);
    } catch (error: any) {
      alert(`删除失败: ${error.message || '未知错误'}`);
    }
  };

  // 显示分类详情
  const handleShowClassDetail = (cls: any) => {
    setSelectedClassDetail(cls);
    setShowClassDetailDialog(true);
  };

  // 复制ID
  const handleCopyId = async (id: string) => {
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(id);
        alert('ID已复制到剪贴板');
      } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = id;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('ID已复制到剪贴板');
      }
    } catch (error) {
      alert('复制失败，请重试');
    }
  };

  // 获取所有标签的扁平列表（用于选择）
  const getAllFloorsFlat = (floorList: MaterialFloor[]): MaterialFloor[] => {
    const result: MaterialFloor[] = [];
    const traverse = (floors: MaterialFloor[]) => {
      floors.forEach(floor => {
        result.push(floor);
        // 支持两种字段名：material_tags 和 children_floor
        const children =
          (floor as any).material_tags || (floor as any).children_floor;
        if (children) {
          traverse(children);
        }
      });
    };
    traverse(floorList);
    return result;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className='h-screen flex flex-col overflow-hidden'>
      <div className='grid grid-cols-12 gap-2 h-full p-2 overflow-hidden'>
        {/* 左侧：素材分类管理 */}
        <div className='col-span-3 flex flex-col h-full overflow-hidden'>
          <Card className='flex flex-col border shadow-none h-full'>
            <CardHeader className='px-3 py-2 border-b flex-shrink-0'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-sm font-medium'>
                  素材分类管理
                </CardTitle>
                <Button
                  onClick={handleCreateClass}
                  size='sm'
                  className='h-6 px-2 text-xs'
                >
                  <Plus className='h-3 w-3 mr-1' />
                  新增
                </Button>
              </div>
            </CardHeader>
            <CardContent className='flex-1 overflow-y-auto flex flex-col p-0'>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={materialClasses.map((cls) => cls.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className='flex-1 overflow-y-auto p-1.5 space-y-1'>
                    {materialClasses.length === 0 ? (
                      <div className='text-center py-6 text-xs text-muted-foreground'>
                        暂无分类
                      </div>
                    ) : (
                      materialClasses.map((cls) => {
                        const isSelected = materialClassId === cls.id;
                        return (
                          <SortableClassItem
                            key={cls.id}
                            cls={cls}
                            isSelected={isSelected}
                            onSelect={() => setMaterialClassId(cls.id)}
                            onShowDetail={() => handleShowClassDetail(cls)}
                            onEdit={() => handleEditClass(cls)}
                            onDelete={() => handleDeleteClass(cls.id)}
                            deletePopoverOpen={deleteClassPopoverOpen === cls.id}
                            onDeletePopoverChange={(open) =>
                              setDeleteClassPopoverOpen(open ? cls.id : null)
                            }
                          />
                        );
                      })
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </div>

        {/* 中间：标签管理 */}
        <div className='col-span-3 flex flex-col h-full overflow-hidden'>
          {materialClassId && materialManager ? (
            <div className='h-full flex flex-col overflow-hidden'>
              <MaterialFloorManager
                materialManager={materialManager}
                mode='selector'
                selectedFloorId={selectedFloorId}
                onFloorSelect={handleFloorSelect}
                className='h-full border shadow-none rounded-lg flex flex-col overflow-hidden'
                placeholder='搜索标签...'
                showSearch={true}
                showRefresh={false}
                showCreateEdit={true}
              />
            </div>
          ) : (
            <Card className='flex flex-col border shadow-none h-full'>
              <CardContent className='flex-1 flex items-center justify-center'>
                <div className='text-center text-xs text-muted-foreground'>
                  请先选择素材分类
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：素材项管理 */}
        <div className='col-span-6 flex flex-col h-full overflow-hidden'>
          {materialClassId ? (
            <Card className='flex flex-col border shadow-none h-full'>
              <CardHeader className='px-3 py-2 border-b flex-shrink-0'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-sm font-medium'>
                    素材项管理
                  </CardTitle>
                  <Button
                    onClick={handleCreateItem}
                    size='sm'
                    className='h-6 px-2 text-xs'
                  >
                    <Plus className='h-3 w-3 mr-1' />
                    新增
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='flex-1 overflow-y-auto flex flex-col p-2'>
                <div className='flex-1 overflow-hidden flex flex-col space-y-2'>
                  {/* 搜索区域 */}
                  <div className='flex flex-wrap items-center gap-1.5 flex-shrink-0'>
                    <Input
                      placeholder='搜索名称、作者、描述'
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                      className='h-6 text-xs flex-1 min-w-[150px]'
                    />
                    <Button
                      onClick={handleSearch}
                      size='sm'
                      className='h-6 px-2 text-xs'
                    >
                      <Search className='h-3 w-3 mr-1' />
                      查询
                    </Button>
                    {selectedFloorId && (
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-6 px-2 text-xs'
                        onClick={() => setSelectedFloorId('')}
                      >
                        清除筛选
                      </Button>
                    )}
                  </div>

                  {/* 数据表格 */}
                  <div className='border rounded overflow-auto flex-1'>
                    {loading ? (
                      <div className='flex items-center justify-center py-8'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span className='ml-2 text-xs'>加载中...</span>
                      </div>
                    ) : items.length === 0 ? (
                      <div className='text-center py-8 text-xs text-muted-foreground'>
                        暂无数据
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className='h-7'>
                            <TableHead className='h-7 px-2 text-xs font-medium'>
                              封面
                            </TableHead>
                            <TableHead className='h-7 px-2 text-xs font-medium'>
                              名称
                            </TableHead>
                            <TableHead className='h-7 px-2 text-xs font-medium'>
                              作者
                            </TableHead>
                            <TableHead className='h-7 px-2 text-xs font-medium'>
                              描述
                            </TableHead>
                            <TableHead className='h-7 px-2 text-xs font-medium'>
                              标签
                            </TableHead>
                            <TableHead className='h-7 px-2 text-xs font-medium'>
                              创建时间
                            </TableHead>
                            <TableHead className='h-7 px-2 text-xs font-medium'>
                              操作
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.documentId} className='h-auto'>
                              <TableCell className='px-2 py-1'>
                                {item.cover_url ? (
                                  <img
                                    src={cdnApi(item.cover_url, {
                                      resizeWidth: 200,
                                      format: 'webp',
                                    })}
                                    alt={item.name}
                                    className='w-8 h-8 object-cover rounded'
                                  />
                                ) : (
                                  <div className='w-8 h-8 bg-muted rounded flex items-center justify-center'>
                                    <Image className='h-3 w-3 text-muted-foreground' />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className='px-2 py-1 text-xs'>
                                {item.name}
                              </TableCell>
                              <TableCell className='px-2 py-1 text-xs'>
                                {item.author}
                              </TableCell>
                              <TableCell className='px-2 py-1 text-xs text-muted-foreground max-w-[120px] truncate'>
                                {item.desc || '-'}
                              </TableCell>
                              <TableCell className='px-2 py-1'>
                                <div className='flex flex-wrap gap-0.5'>
                                  {item.material_tags?.map((tag: any) => (
                                    <span
                                      key={tag.documentId}
                                      className='px-1 py-0.5 bg-primary/10 text-primary rounded text-[10px]'
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                  {(!item.material_tags ||
                                    item.material_tags.length === 0) && (
                                      <span className='text-muted-foreground text-[10px]'>
                                        -
                                      </span>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell className='px-2 py-1 text-[10px] text-muted-foreground'>
                                {item.createdAt
                                  ? new Date(item.createdAt).toLocaleString(
                                    'zh-CN',
                                    {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )
                                  : '-'}
                              </TableCell>
                              <TableCell className='px-2 py-1'>
                                <div className='flex items-center gap-0.5'>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='h-5 w-5 p-0 hover:bg-muted'
                                    onClick={() => handleEditItem(item)}
                                  >
                                    <Edit className='h-3 w-3' />
                                  </Button>
                                  <Popover
                                    open={
                                      deleteItemPopoverOpen === item.documentId
                                    }
                                    onOpenChange={open =>
                                      setDeleteItemPopoverOpen(
                                        open ? item.documentId : null
                                      )
                                    }
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-5 w-5 p-0 hover:bg-muted'
                                      >
                                        <Trash2 className='h-3 w-3' />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className='w-56 p-3'>
                                      <div className='space-y-2'>
                                        <div className='text-sm font-medium'>
                                          确定要删除这个素材项吗？
                                        </div>
                                        <div className='text-xs text-muted-foreground'>
                                          此操作不可恢复
                                        </div>
                                        <div className='flex justify-end gap-2 pt-2'>
                                          <Button
                                            variant='outline'
                                            size='sm'
                                            className='h-6 px-2 text-xs'
                                            onClick={() =>
                                              setDeleteItemPopoverOpen(null)
                                            }
                                          >
                                            取消
                                          </Button>
                                          <Button
                                            size='sm'
                                            variant='destructive'
                                            className='h-6 px-2 text-xs'
                                            onClick={() =>
                                              handleDeleteItem(item.documentId)
                                            }
                                          >
                                            删除
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* 分页 */}
                  {total > 0 && (
                    <div className='flex items-center justify-between flex-shrink-0 pt-1 border-t'>
                      <div className='text-xs text-muted-foreground'>
                        共 {total} 条，第 {page}/{totalPages} 页
                      </div>
                      <Pagination className='w-auto'>
                        <PaginationContent className='gap-0.5'>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => {
                                if (page > 1) {
                                  setPage(page - 1);
                                }
                              }}
                              className={`h-6 px-2 text-xs ${page <= 1
                                  ? 'pointer-events-none opacity-50'
                                  : ''
                                }`}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(
                              p =>
                                p === 1 ||
                                p === totalPages ||
                                (p >= page - 2 && p <= page + 2)
                            )
                            .map((p, idx, arr) => (
                              <React.Fragment key={p}>
                                {idx > 0 && arr[idx - 1] < p - 1 && (
                                  <PaginationItem>
                                    <span className='px-1 text-xs'>...</span>
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => {
                                      setPage(p);
                                    }}
                                    isActive={p === page}
                                    className='h-6 px-2 text-xs'
                                  >
                                    {p}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => {
                                if (page < totalPages) {
                                  setPage(page + 1);
                                }
                              }}
                              className={`h-6 px-2 text-xs ${page >= totalPages
                                  ? 'pointer-events-none opacity-50'
                                  : ''
                                }`}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className='flex-1 flex flex-col border shadow-none'>
              <CardContent className='flex-1 flex items-center justify-center'>
                <div className='text-center text-xs text-muted-foreground'>
                  请先选择素材分类
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 素材项编辑对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showItemDialog}
        onOpenChange={setShowItemDialog}
        contentProps={{
          className: 'max-w-[600px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <h2 className='text-lg font-semibold'>
            {editingItem ? '编辑素材项' : '新增素材项'}
          </h2>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label>名称 *</Label>
              <Input
                value={itemFormData.name}
                onChange={e =>
                  setItemFormData({ ...itemFormData, name: e.target.value })
                }
                placeholder='请输入素材名称'
              />
            </div>
            <div className='space-y-2'>
              <Label>作者 *</Label>
              <Input
                value={itemFormData.author}
                onChange={e =>
                  setItemFormData({ ...itemFormData, author: e.target.value })
                }
                placeholder='请输入作者'
              />
            </div>
            <div className='space-y-2'>
              <Label>描述</Label>
              <Input
                value={itemFormData.desc}
                onChange={e =>
                  setItemFormData({ ...itemFormData, desc: e.target.value })
                }
                placeholder='请输入描述'
              />
            </div>
            <div className='space-y-2'>
              <Label>封面 *</Label>
              <MaterialCoverUploader
                value={itemFormData.cover_url}
                onChange={url =>
                  setItemFormData({
                    ...itemFormData,
                    cover_url: url,
                  })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>内容（JSON格式）</Label>
              <textarea
                className='w-full min-h-[100px] p-2 border rounded'
                value={JSON.stringify(itemFormData.content, null, 2)}
                onChange={e => {
                  try {
                    const content = JSON.parse(e.target.value);
                    setItemFormData({ ...itemFormData, content });
                  } catch {
                    // 忽略无效 JSON
                  }
                }}
                placeholder='请输入JSON格式的内容'
              />
            </div>
            <div className='space-y-2'>
              <Label>标签</Label>
              {materialManager ? (
                <Button
                  type='button'
                  variant='outline'
                  className='w-full justify-between'
                  onClick={() => setShowTagSelectDialog(true)}
                >
                  <span className={selectedTagData ? '' : 'text-gray-400'}>
                    {getSelectedTagName()}
                  </span>
                  <ChevronDown className='h-4 w-4 opacity-50' />
                </Button>
              ) : (
                <div className='text-sm text-muted-foreground'>
                  请先选择素材分类
                </div>
              )}
            </div>
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button variant='outline' onClick={() => setShowItemDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveItem}>保存</Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 标签编辑对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showFloorDialog}
        onOpenChange={setShowFloorDialog}
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <h2 className='text-lg font-semibold'>
            {editingFloor ? '编辑标签' : '新增标签'}
          </h2>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label>名称 *</Label>
              <Input
                value={floorFormData.name}
                onChange={e =>
                  setFloorFormData({ ...floorFormData, name: e.target.value })
                }
                placeholder='请输入标签名称'
              />
            </div>
            <div className='space-y-2'>
              <Label>描述</Label>
              <Input
                value={floorFormData.desc}
                onChange={e =>
                  setFloorFormData({ ...floorFormData, desc: e.target.value })
                }
                placeholder='请输入描述'
              />
            </div>
            {!editingFloor && (
              <div className='space-y-2'>
                <Label>父标签</Label>
                <Select
                  value={floorFormData.parentId}
                  onValueChange={value =>
                    setFloorFormData({ ...floorFormData, parentId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='选择父标签（可选）' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=''>无（顶级标签）</SelectItem>
                    {getAllFloorsFlat(floors).map(floor => (
                      <SelectItem
                        key={floor.documentId}
                        value={floor.documentId}
                      >
                        {floor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button variant='outline' onClick={() => setShowFloorDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveFloor}>保存</Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 素材分类编辑对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showClassDialog}
        onOpenChange={setShowClassDialog}
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <h2 className='text-lg font-semibold'>
            {editingClass ? '编辑素材分类' : '新增素材分类'}
          </h2>
          <div className='space-y-3'>
            <div className='space-y-2'>
              <Label>名称 *</Label>
              <Input
                value={classFormData.name}
                onChange={e =>
                  setClassFormData({ ...classFormData, name: e.target.value })
                }
                placeholder='请输入分类名称'
              />
            </div>
            <div className='space-y-2'>
              <Label>描述</Label>
              <Input
                value={classFormData.desc}
                onChange={e =>
                  setClassFormData({ ...classFormData, desc: e.target.value })
                }
                placeholder='请输入描述'
              />
            </div>
            <div className='space-y-2'>
              <Label>别名</Label>
              <Input
                value={classFormData.alias}
                onChange={e =>
                  setClassFormData({ ...classFormData, alias: e.target.value })
                }
                placeholder='请输入别名（唯一标识）'
              />
            </div>
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button variant='outline' onClick={() => setShowClassDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveClass}>保存</Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 素材分类详情对话框 */}
      <ResponsiveDialog
        isDialog
        isOpen={showClassDetailDialog}
        onOpenChange={setShowClassDetailDialog}
        contentProps={{
          className: 'max-w-[500px]',
        }}
      >
        <div className='space-y-4 p-4'>
          <h2 className='text-lg font-semibold'>素材分类详情</h2>
          {selectedClassDetail && (
            <div className='space-y-3'>
              <div className='space-y-2'>
                <Label>名称</Label>
                <div className='p-2 bg-muted rounded text-sm'>
                  {selectedClassDetail.name || '-'}
                </div>
              </div>
              <div className='space-y-2'>
                <Label>描述</Label>
                <div className='p-2 bg-muted rounded text-sm'>
                  {selectedClassDetail.desc || '-'}
                </div>
              </div>
              <div className='space-y-2'>
                <Label>别名</Label>
                <div className='p-2 bg-muted rounded text-sm'>
                  {selectedClassDetail.alias || '-'}
                </div>
              </div>
              <div className='space-y-2'>
                <Label>ID</Label>
                <div className='flex items-center gap-2'>
                  <div className='flex-1 p-2 bg-muted rounded text-sm font-mono break-all'>
                    {selectedClassDetail.id}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleCopyId(selectedClassDetail.id)}
                  >
                    <Copy className='h-4 w-4 mr-1' />
                    复制
                  </Button>
                </div>
              </div>
              {selectedClassDetail.createdAt && (
                <div className='space-y-2'>
                  <Label>创建时间</Label>
                  <div className='p-2 bg-muted rounded text-sm'>
                    {new Date(selectedClassDetail.createdAt).toLocaleString(
                      'zh-CN'
                    )}
                  </div>
                </div>
              )}
              {selectedClassDetail.updatedAt && (
                <div className='space-y-2'>
                  <Label>更新时间</Label>
                  <div className='p-2 bg-muted rounded text-sm'>
                    {new Date(selectedClassDetail.updatedAt).toLocaleString(
                      'zh-CN'
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className='flex justify-end gap-2 pt-4'>
            <Button
              variant='outline'
              onClick={() => setShowClassDetailDialog(false)}
            >
              关闭
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* 标签选择弹窗 */}
      <ResponsiveDialog
        isOpen={showTagSelectDialog}
        onOpenChange={setShowTagSelectDialog}
        title='选择标签'
        contentProps={{
          className: 'max-w-[600px] w-full max-h-[90vh] h-full overflow-y-auto',
        }}
      >
        <div className='p-4'>
          {materialManager && (
            <MaterialFloorManager
              materialManager={materialManager}
              mode='selector'
              selectedFloorId={itemFormData.material_tags?.[0]}
              onFloorSelect={(floorId, floor) => {
                setItemFormData({
                  ...itemFormData,
                  material_tags: [floorId],
                });
                setSelectedTagData(floor);
                setShowTagSelectDialog(false);
              }}
              className='w-full'
              placeholder='搜索标签...'
              showSearch={true}
              showRefresh={false}
              showCreateEdit={false}
            />
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
