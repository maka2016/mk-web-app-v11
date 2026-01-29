import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import {
  ChevronDown,
  ChevronRight,
  Dot,
  Folder,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { MaterialFloor, MaterialResourceManagerAPI } from './services';

interface CreateFloorData {
  name: string;
  desc: string;
  parentId?: string;
}

interface TreeNode extends MaterialFloor {
  children: TreeNode[];
  isExpanded: boolean;
  level: number;
}

interface MaterialFloorManagerProps {
  materialManager?: MaterialResourceManagerAPI;
  allCategories?: MaterialFloor[]; // 从外部传入的分类数据（树形结构）
  onDelete?: (category: MaterialFloor) => void;
  // 新增的选择器模式相关属性
  mode?: 'manager' | 'selector';
  selectedFloorId?: string;
  onFloorSelect?: (floorId: string, floor: MaterialFloor | null) => void;
  className?: string;
  placeholder?: string;
  showSearch?: boolean;
  showRefresh?: boolean;
  showCreateEdit?: boolean; // 是否显示创建/编辑功能
}

export default function MaterialFloorManager({
  materialManager,
  allCategories,
  onDelete,
  mode: initialMode = 'manager',
  selectedFloorId,
  onFloorSelect,
  className,
  placeholder = '搜索分类...',
  showSearch = true,
  showRefresh = true,
  showCreateEdit = true,
}: MaterialFloorManagerProps) {
  // 内部管理模式状态
  const [internalMode, setInternalMode] = useState<'manager' | 'selector'>(
    initialMode
  );

  // 如果提供了 materialManager，则优先使用内部管理模式
  const currentMode = materialManager ? internalMode : initialMode;
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<MaterialFloor | null>(null);
  const [formData, setFormData] = useState<CreateFloorData>({
    name: '',
    desc: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  // 加载分类数据
  const loadCategoriesData = async (): Promise<TreeNode[]> => {
    setIsLoading(true);
    try {
      let categories: MaterialFloor[] = [];

      if (allCategories) {
        // 优先使用传入的分类数据（已经是树形结构）
        categories = allCategories;
      } else if (materialManager) {
        // 如果没有传入分类数据，则从 API 获取（返回树形结构）
        categories = await materialManager.getAllFloorsRecursively();
      } else {
        // 既没有传入数据也没有 materialManager，使用空数组
        categories = [];
      }

      // 将树形结构转换为带展开状态的 TreeNode
      const tree = convertToTreeNode(
        categories,
        treeData,
        currentMode === 'selector',
        selectedFloorId
      );
      setTreeData(tree);
      return tree;
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('加载分类失败');
      return [];
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadCategoriesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialManager, allCategories, selectedFloorId]);

  // 处理选择器模式下选中节点路径的展开
  useEffect(() => {
    if (currentMode === 'selector' && selectedFloorId && treeData.length > 0) {
      setTreeData(prev => {
        // 递归查找节点是否存在于树中
        const findNodeInTree = (nodeId: string, nodes: TreeNode[]): boolean => {
          for (const node of nodes) {
            if (node.documentId === nodeId) {
              return true;
            }
            if (
              node.children.length > 0 &&
              findNodeInTree(nodeId, node.children)
            ) {
              return true;
            }
          }
          return false;
        };

        // 检查是否需要展开路径
        const needsExpansion = findNodeInTree(selectedFloorId, prev);
        if (!needsExpansion) {
          return prev; // 不需要更新，返回原数据
        }

        // 展开路径到选中节点
        const updateNode = (treeNodes: TreeNode[]): TreeNode[] => {
          return treeNodes.map(n => {
            if (n.documentId === selectedFloorId) {
              return n; // 选中节点本身不需要展开
            }
            if (n.children.length > 0) {
              const hasSelectedChild = findNodeInTree(
                selectedFloorId,
                n.children
              );
              if (hasSelectedChild) {
                return {
                  ...n,
                  isExpanded: true,
                  children: updateNode(n.children),
                };
              }
              return { ...n, children: updateNode(n.children) };
            }
            return n;
          });
        };
        return updateNode(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFloorId, currentMode]);

  // 检查节点是否是目标节点的祖先（需要在 convertToTreeNode 之前定义）
  const checkIsAncestor = (
    node: MaterialFloor,
    targetId: string,
    visited: Set<string> = new Set()
  ): boolean => {
    // 如果当前节点就是目标节点，返回 false（不是祖先）
    if (node.documentId === targetId) {
      return false;
    }

    // 防止循环引用
    if (visited.has(node.documentId)) {
      return false;
    }
    visited.add(node.documentId);

    // 检查子节点中是否包含目标节点
    if (node.children_floor && node.children_floor.length > 0) {
      for (const child of node.children_floor) {
        if (child.documentId === targetId) {
          return true;
        }
        // 递归检查子节点的子节点
        if (checkIsAncestor(child, targetId, new Set(visited))) {
          return true;
        }
      }
    }

    return false;
  };

  // 将 MaterialFloor 树形结构转换为 TreeNode（带展开状态）
  const convertToTreeNode = (
    floors: MaterialFloor[],
    existingTreeData?: TreeNode[],
    shouldExpandSelectedPath?: boolean,
    selectedId?: string
  ): TreeNode[] => {
    // 创建展开状态映射，从现有树数据中提取
    const expandedStateMap = new Map<string, boolean>();
    if (existingTreeData) {
      const extractExpandedState = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          expandedStateMap.set(node.documentId, node.isExpanded);
          if (node.children.length > 0) {
            extractExpandedState(node.children);
          }
        });
      };
      extractExpandedState(existingTreeData);
    }

    // 递归转换函数
    const convert = (
      floor: MaterialFloor,
      level: number = 0,
      visited: Set<string> = new Set()
    ): TreeNode | null => {
      // 防止循环引用
      if (visited.has(floor.documentId)) {
        return null;
      }
      visited.add(floor.documentId);

      // 获取展开状态
      // 如果 expandedStateMap 中有该节点的状态，使用该状态；否则默认展开（有子节点时）
      const hasExistingState = expandedStateMap.has(floor.documentId);
      const hasChildren = Boolean(
        floor.children_floor && floor.children_floor.length > 0
      );
      let isExpanded: boolean = hasExistingState
        ? (expandedStateMap.get(floor.documentId) ?? false)
        : hasChildren; // 默认展开有子节点的节点

      // 如果需要展开选中节点的路径
      if (shouldExpandSelectedPath && selectedId) {
        // 检查当前节点是否是选中节点的祖先
        const isAncestor = checkIsAncestor(floor, selectedId);
        if (isAncestor) {
          isExpanded = true;
        }
      }

      // 转换子节点（children_floor 是子级）
      const children: TreeNode[] = [];
      if (floor.children_floor && floor.children_floor.length > 0) {
        floor.children_floor.forEach(childFloor => {
          const childNode = convert(childFloor, level + 1, new Set(visited));
          if (childNode) {
            children.push(childNode);
          }
        });
      }

      return {
        ...floor,
        children,
        isExpanded,
        level,
      };
    };

    // floors 已经是根节点数组，直接转换
    return floors
      .map(floor => convert(floor, 0, new Set()))
      .filter(Boolean) as TreeNode[];
  };

  // 展开/收起节点
  const toggleNode = (nodeId: string) => {
    setTreeData(prev => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.documentId === nodeId) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children.length > 0) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prev);
    });
  };

  // 检查是否所有有子节点的节点都已展开
  const areAllNodesExpanded = (nodes: TreeNode[]): boolean => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        if (!node.isExpanded) {
          return false;
        }
        if (!areAllNodesExpanded(node.children)) {
          return false;
        }
      }
    }
    return true;
  };

  // 切换所有节点的展开/收起状态
  const toggleAllNodes = () => {
    const shouldExpand = !areAllNodesExpanded(treeData);
    setTreeData(prev => {
      const updateNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          const hasChildren = node.children.length > 0;
          if (hasChildren) {
            return {
              ...node,
              isExpanded: shouldExpand,
              children: updateNode(node.children),
            };
          }
          return node;
        });
      };
      return updateNode(prev);
    });
  };

  // 递归渲染树节点
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = node.isExpanded;
    const isSelected =
      currentMode === 'selector' && selectedFloorId === node.documentId;

    return (
      <div key={node.documentId} className='w-full'>
        <div
          className={`group flex items-center gap-1 py-1 cursor-pointer transition-colors duration-150 ${
            isSelected
              ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-500'
              : 'hover:bg-gray-100'
          }`}
          // 使用内联样式是因为需要根据 depth 动态计算 paddingLeft
          // eslint-disable-next-line react/forbid-dom-props
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={e => {
            e.stopPropagation();
            if (currentMode === 'selector' && onFloorSelect) {
              onFloorSelect(node.documentId, node);
            } else if (currentMode === 'manager') {
              // 在管理模式下，点击节点区域也会展开/收起
              toggleNode(node.documentId);
            }
          }}
        >
          {/* 展开/收起按钮 */}
          {hasChildren ? (
            <div
              onClick={e => {
                e.stopPropagation();
                toggleNode(node.documentId);
              }}
            >
              {isExpanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronRight className='h-4 w-4' />
              )}
            </div>
          ) : (
            <div className='' />
          )}

          {!hasChildren ? <Dot className='h-4 w-4 text-gray-400' /> : <></>}

          {/* 内容区域 */}
          <div className='flex-1 min-w-0'>
            <div className='text-xs text-gray-900 truncate'>
              {node.name}
              {node.desc && (
                <span className='text-gray-500'> ({node.desc})</span>
              )}
            </div>
          </div>

          {/* 操作按钮 - 只在悬停时显示 */}
          {showCreateEdit && materialManager && (
            <div className='flex opacity-0 group-hover:opacity-100 transition-opacity gap-2'>
              {currentMode === 'manager' && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-5 px-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  onClick={e => {
                    e.stopPropagation();
                    openEditDialog(node);
                  }}
                  title='编辑'
                >
                  编辑
                </Button>
              )}
              <Button
                variant='ghost'
                size='sm'
                className='h-5 w-8 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                onClick={e => {
                  e.stopPropagation();
                  openCreateDialog(node);
                }}
                title='添加子分类'
              >
                <Plus className='h-5 w-4' />
              </Button>
              {currentMode === 'manager' && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-4 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50'
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteCategory(node);
                  }}
                  title='删除'
                >
                  删除
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className='space-y-0'>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // 过滤树数据（搜索功能）
  const filterTreeData = (
    nodes: TreeNode[],
    searchTerm: string
  ): TreeNode[] => {
    if (!searchTerm.trim()) return nodes;

    const filterNode = (node: TreeNode): TreeNode | null => {
      const matchesSearch =
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.desc &&
          node.desc.toLowerCase().includes(searchTerm.toLowerCase()));

      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter(Boolean) as TreeNode[];

      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
          isExpanded: true, // 搜索时自动展开匹配的节点
        };
      }

      return null;
    };

    return nodes.map(node => filterNode(node)).filter(Boolean) as TreeNode[];
  };

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    if (!materialManager) {
      toast.error('无法创建分类：缺少 materialManager');
      return;
    }

    setIsLoading(true);
    try {
      const newFloor = await materialManager.createFloor({
        name: formData.name,
        desc: formData.desc,
        parentId: formData.parentId,
      });
      const newFloorId = (newFloor as any)?.documentId;
      setFormData({ name: '', desc: '' });
      setIsCreateDialogOpen(false);

      // 重新加载数据
      const updatedTree = await loadCategoriesData();

      // 如果是选择模式，创建成功后自动选中新创建的分类
      if (currentMode === 'selector' && onFloorSelect && newFloorId) {
        // 从新加载的树数据中查找新创建的节点
        const findNodeById = (
          nodes: TreeNode[],
          id: string
        ): MaterialFloor | null => {
          for (const node of nodes) {
            if (node.documentId === id) {
              return node;
            }
            if (node.children.length > 0) {
              const found = findNodeById(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };
        const createdNode = findNodeById(updatedTree, newFloorId);
        if (createdNode) {
          onFloorSelect(newFloorId, createdNode);
        }
      }

      toast.success('创建分类成功');
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('创建分类失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    if (!materialManager) {
      toast.error('无法更新分类：缺少 materialManager');
      return;
    }

    setIsLoading(true);
    try {
      await materialManager.updateFloor(selectedCategory.documentId, {
        name: formData.name,
        desc: formData.desc,
      });
      setFormData({ name: '', desc: '' });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);

      // 重新加载数据
      await loadCategoriesData();
      toast.success('更新分类成功');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('更新分类失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (category: MaterialFloor) => {
    if (!confirm(`确定要删除分类 "${category.name}" 吗？`)) {
      return;
    }

    if (!materialManager) {
      toast.error('无法删除分类：缺少 materialManager');
      return;
    }

    setIsLoading(true);
    try {
      await materialManager.removeFloor(category.documentId);
      onDelete?.(category);

      // 重新加载数据
      await loadCategoriesData();
      toast.success('删除分类成功');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('删除分类失败');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (category: MaterialFloor) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      desc: category.desc,
    });
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = (parentCategory?: MaterialFloor) => {
    setFormData({
      name: '',
      desc: '',
      parentId: parentCategory?.documentId,
    });
    setIsCreateDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', desc: '' });
    setSelectedCategory(null);
  };

  const filteredTreeData = filterTreeData(treeData, searchTerm);

  return (
    <div
      className={cls(
        'max-h-full flex flex-col bg-white overflow-hidden border border-gray-200 rounded-lg w-[540px] max-w-full',
        className
      )}
    >
      {/* Header - 统一的头部布局 */}
      <div className='flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50'>
        {/* 左侧：模式选择 */}
        {materialManager && (
          <RadioGroup
            defaultValue='selector'
            className='flex'
            onValueChange={val => {
              setInternalMode(val as 'manager' | 'selector');
            }}
          >
            <div className='flex items-center gap-1'>
              <RadioGroupItem value='manager' id='r1' />
              <Label htmlFor='r1'>管理</Label>
            </div>
            <div className='flex items-center gap-1'>
              <RadioGroupItem value='selector' id='r2' />
              <Label htmlFor='r2'>选择</Label>
            </div>
          </RadioGroup>
        )}

        {/* 中间：操作按钮组 */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          {showCreateEdit && materialManager && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 px-2 text-xs flex items-center gap-1 flex-shrink-0'
              onClick={() => openCreateDialog()}
            >
              新建分类
            </Button>
          )}

          {showRefresh && materialManager && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 flex-shrink-0'
              onClick={loadCategoriesData}
              disabled={isLoading}
              title='刷新'
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          )}

          <Button
            variant='ghost'
            size='sm'
            className='h-8 px-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 flex-shrink-0'
            onClick={toggleAllNodes}
            title={areAllNodesExpanded(treeData) ? '收起全部' : '展开全部'}
          >
            {areAllNodesExpanded(treeData) ? '收起全部' : '展开全部'}
          </Button>
        </div>
      </div>

      <div className='overflow-y-auto flex-1 min-h-0'>
        {isInitialLoading ? (
          <div className='flex items-center justify-center h-full'>
            <div className='flex flex-col items-center gap-2 text-gray-500'>
              <RefreshCw className='h-5 w-5 animate-spin' />
              <span className='text-sm'>加载中...</span>
            </div>
          </div>
        ) : (
          <>
            {/* 选择全部按钮 - 在内容区第一行 */}
            {currentMode === 'selector' && onFloorSelect && (
              <div className='flex items-center'>
                <div className='px-3 py-2 border-b border-gray-100'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 px-2 text-xs flex items-center gap-1'
                    onClick={() => onFloorSelect('', null)}
                  >
                    选择全部
                  </Button>
                </div>

                <div className='flex-1 min-w-0 max-w-md ml-auto px-3 py-2 border-b border-gray-100'>
                  <div className='relative'>
                    <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                    <Input
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder={placeholder}
                      className='pl-8 h-8 text-sm bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    />
                  </div>
                </div>
              </div>
            )}
            {filteredTreeData.length > 0 ? (
              <div className='py-1'>
                {filteredTreeData.map(node => renderTreeNode(node))}
              </div>
            ) : searchTerm ? (
              <div className='flex flex-col items-center justify-center h-full text-gray-400 gap-2'>
                <Search className='h-8 w-8 text-gray-300' />
                <div className='text-center'>
                  <p className='font-medium text-gray-500 mb-1 text-sm'>
                    未找到匹配的分类
                  </p>
                  <p className='text-xs text-gray-400'>
                    尝试使用其他关键词搜索
                  </p>
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center h-full text-gray-400 gap-2'>
                <Folder className='h-8 w-8 text-gray-300' />
                <div className='text-center'>
                  <p className='font-medium text-gray-500 mb-1 text-sm'>
                    暂无分类
                  </p>
                  <p className='text-xs text-gray-400'>
                    {currentMode === 'manager'
                      ? '点击上方按钮创建第一个分类'
                      : '暂无可用分类'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Dialog - 在有 materialManager 时显示 */}
      {showCreateEdit && materialManager && (
        <ResponsiveDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={open => {
            setIsCreateDialogOpen(open);
            if (!open) resetForm();
          }}
          title={formData.parentId ? '新建子级分类' : '新建分类'}
          contentProps={{
            className: 'max-w-[400px] w-full',
          }}
        >
          <div className='space-y-3 p-4'>
            {formData.parentId && (
              <div className='p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700'>
                将在选定的分类下创建子级分类
              </div>
            )}
            <div>
              <label className='block text-sm font-medium mb-1'>名称 *</label>
              <Input
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='请输入名称'
                className='w-full h-8 text-sm'
                autoFocus
              />
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>描述</label>
              <Input
                value={formData.desc}
                onChange={e =>
                  setFormData({ ...formData, desc: e.target.value })
                }
                placeholder='请输入描述（可选）'
                className='w-full h-8 text-sm'
              />
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-sm px-2'
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                size='sm'
                className='h-8 text-sm px-2'
                onClick={handleCreateCategory}
                disabled={isLoading || !formData.name.trim()}
              >
                {isLoading ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      )}

      {/* Edit Dialog - 只在管理模式下显示 */}
      {showCreateEdit && currentMode === 'manager' && (
        <ResponsiveDialog
          isOpen={isEditDialogOpen}
          onOpenChange={open => {
            setIsEditDialogOpen(open);
            if (!open) resetForm();
          }}
          title='编辑分类'
          contentProps={{
            className: 'max-w-[400px] w-full',
          }}
        >
          <div className='space-y-3 p-4'>
            <div>
              <label className='block text-sm font-medium mb-1'>名称 *</label>
              <Input
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='请输入名称'
                className='w-full h-8 text-sm'
                autoFocus
              />
            </div>
            <div>
              <label className='block text-sm font-medium mb-1'>描述</label>
              <Input
                value={formData.desc}
                onChange={e =>
                  setFormData({ ...formData, desc: e.target.value })
                }
                placeholder='请输入描述（可选）'
                className='w-full h-8 text-sm'
              />
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-sm px-2'
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                size='sm'
                className='h-8 text-sm px-3'
                onClick={handleUpdateCategory}
                disabled={isLoading || !formData.name.trim()}
              >
                {isLoading ? '更新中...' : '更新'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      )}
    </div>
  );
}
