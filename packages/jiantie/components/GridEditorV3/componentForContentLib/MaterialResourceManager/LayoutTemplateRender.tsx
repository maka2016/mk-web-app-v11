import { cdnApi } from '@/services';
import styled from '@emotion/styled';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import { ImageIcon, Loader2, Search, Settings, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useMaterialResources } from './hook';
import MaterialFloorManager from './MaterialFloorManager';
import {
  MaterialFloor,
  MaterialItem,
  MaterialResourceManagerAPI,
} from './services';

export const FloorRoot = styled.div`
  position: relative;
  /* display: flex; */
  gap: 4px;
  padding: 8px;

  .scroll {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .floorItem {
    height: 28px;
    padding: 0px 8px;
    border-radius: 6px;
    background-color: #f5f5f5;
    cursor: pointer;
    white-space: nowrap;
    font-family: PingFang SC;
    font-weight: 400;
    font-size: 14px;
    line-height: 28px;
    color: #00000099;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;

    &.active {
      background-color: #1a87ff;
      color: #fff;
    }

    &:hover {
      background-color: #e0e0e0;

      &.active {
        background-color: #1670d9;
      }
    }
  }

  .viewToggle {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 6px;
    background-color: #f5f5f5;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    color: #666;

    &:hover {
      background-color: #e0e0e0;
    }

    &.active {
      background-color: #1a87ff;
      color: #fff;
    }
  }

  .finderContainer {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    margin-top: 4px;
  }

  .searchContainer {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

export const LayoutTemplateRoot = styled.div`
  /* display: flex; */
  /* flex-direction: column; */
  flex: 1;
  overflow: hidden;
  position: relative;
  .items_wrapper {
    flex: 1;
    overflow: auto;
    .scroll_list {
      display: grid;
      padding: 8px;
      align-content: baseline;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      height: fit-content;
    }
  }
  .pagination_wrapper {
    padding: 8px;
    display: flex;
    justify-content: center;
    border-top: 1px solid #f0f0f0;
  }
  .card_item {
    position: relative;
    max-width: 100%;
    min-height: 100px;
    width: 100%;
    overflow: hidden;
    border-radius: 4px;
    aspect-ratio: 1/1;
    cursor: pointer;
    border: 1px solid #01070d0a;
    background-image: url('https://img2.maka.im/cdn/mk-widgets/assets/image 2507.png');
    background-repeat: repeat;

    &:hover {
      background-color: #f5f5f5;
      .action_btns {
        opacity: 1;
      }
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: top;
    }
    .name {
      position: absolute;
      bottom: 8px;
      left: 8px;
      padding: 0 2px;
      background: #01070d66;
      color: #fff;
      font-size: 11px;
      font-weight: 400;
      text-align: center;
      height: 16px;
      border-radius: 2.5px;
    }
    .action_btns {
      opacity: 0;
      position: absolute;
      top: 0;
      right: 0;
      background-color: rgba(0, 0, 0, 0.6);
      border-radius: 2.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #fff;
    }
  }
  .loading_wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 11;
  }
`;

interface LayoutTemplateRenderProps {
  materialManager: MaterialResourceManagerAPI;
  onItemClick: (material: MaterialItem) => void;
  onSettingMaterial: (material: MaterialItem) => void;
  onRemoveMaterial: (material: MaterialItem) => void;
  onChangeFloor: (floorId: string, floor: MaterialFloor | null) => void;
  needRemove?: boolean;
  needAction?: boolean;
  activeFloorId?: string;
  style?: React.CSSProperties;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

export default function LayoutTemplateRender({
  materialManager,
  onItemClick,
  onSettingMaterial,
  onRemoveMaterial,
  onChangeFloor,
  needRemove = true,
  needAction = true,
  activeFloorId,
  style,
  showSearch = true,
  searchPlaceholder = '搜索版式...',
}: LayoutTemplateRenderProps) {
  // 信封资源管理
  const materialResources = useMaterialResources({
    materialManager,
    mountToLoadData: true,
    defaultCategory: activeFloorId,
    pageSize: 24,
  });
  const { total, categories, page, loading, list, pageSize, selectedCategory } =
    materialResources;

  const totalPages = Math.ceil(total / pageSize);
  const [showFinder, setShowFinder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 处理 floor 选择
  const handleFloorSelect = (floorId: string, floor: MaterialFloor | null) => {
    onChangeFloor(floorId, floor);
  };

  // 处理搜索输入变化
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // 执行搜索
  const handleSearch = () => {
    console.log('handleSearch called with searchTerm:', searchTerm);
    materialResources.setSearch(searchTerm);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchTerm('');
    materialResources.setSearch('');
  };

  // 处理回车键搜索
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 使用 API 搜索，不再需要客户端过滤
  const filteredMaterials = list;

  return (
    <LayoutTemplateRoot style={style} className='grid grid-cols-12 gap-2 p-2'>
      {loading && (
        <div className='loading_wrapper text-white'>
          <Loader2 className='w-8 h-8 animate-spin mr-2' />
          <div className='loading_text'>加载中...</div>
        </div>
      )}
      <div className='col-span-5 max-h-full overflow-hidden'>
        <MaterialFloorManager
          materialManager={materialManager}
          mode='selector'
          selectedFloorId={selectedCategory}
          onFloorSelect={(floorId, floor) => {
            materialResources.setCategory(floorId);
            setShowFinder(false);
          }}
          placeholder={'搜索分类...'}
          showSearch={true}
          showRefresh={false}
        />
      </div>
      <div className='col-span-7 max-h-full overflow-hidden relative flex flex-col'>
        <FloorRoot>
          <div className='scroll'>
            {showSearch && (
              <div className='searchContainer'>
                <Input
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={searchPlaceholder}
                  className='border-gray-300 h-8'
                />
                <Button
                  className='searchButton h-8'
                  onClick={handleSearch}
                  disabled={!searchTerm.trim()}
                  size='sm'
                >
                  搜索
                </Button>
                <Button
                  variant={'secondary'}
                  className='clearButton h-8'
                  onClick={handleClearSearch}
                  size='sm'
                >
                  清空
                </Button>
              </div>
            )}
          </div>
        </FloorRoot>
        <div className='items_wrapper'>
          <div className='scroll_list'>
            {filteredMaterials.length > 0 ? (
              filteredMaterials.map(materialItem => {
                const imgUrl =
                  materialItem.cover_url || materialItem.cover?.url;
                return (
                  <div key={materialItem.documentId} className='card_item'>
                    <div
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        onItemClick(materialItem);
                      }}
                      className='h-full w-full overflow-hidden'
                    >
                      {imgUrl ? (
                        <img
                          width={300}
                          height={300}
                          src={cdnApi(imgUrl, {
                            resizeWidth: 300,
                            format: 'webp',
                          })}
                          alt=''
                        />
                      ) : (
                        <div className='flex items-center justify-center w-full h-full'>
                          <ImageIcon />
                        </div>
                      )}
                    </div>
                    <div className='name'>{materialItem.name}</div>
                    {needAction && (
                      <div className='action_btns'>
                        <Settings
                          className='h-7 w-7 p-1'
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSettingMaterial(materialItem);
                          }}
                        />
                        {needRemove && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Trash2 className='h-7 w-7 p-1' />
                            </AlertDialogTrigger>
                            <AlertDialogContent className='w-[320px]'>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  想要删除吗？
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={e => {
                                    onRemoveMaterial(materialItem);
                                  }}
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : searchTerm ? (
              <div className='col-span-3 flex flex-col items-center justify-center py-12 text-gray-400 gap-2'>
                <Search className='h-8 w-8 text-gray-300' />
                <div className='text-center'>
                  <p className='font-medium text-gray-500 mb-1 text-sm'>
                    未找到匹配的版式
                  </p>
                  <p className='text-xs text-gray-400'>
                    尝试使用其他关键词搜索
                  </p>
                </div>
              </div>
            ) : (
              <div className='col-span-3 flex flex-col items-center justify-center py-12 text-gray-400 gap-2'>
                <ImageIcon className='h-8 w-8 text-gray-300' />
                <div className='text-center'>
                  <p className='font-medium text-gray-500 mb-1 text-sm'>
                    暂无版式数据
                  </p>
                  <p className='text-xs text-gray-400'>
                    请选择其他分类或稍后再试
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        {totalPages > 1 && (
          <div className='pagination_wrapper'>
            <Pagination>
              <PaginationContent>
                <PaginationItem className='sticky left-0 bg-white'>
                  <PaginationPrevious
                    onClick={() =>
                      materialResources.setPage(Math.max(1, page - 1))
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink
                      href='#'
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        materialResources.setPage(index + 1);
                      }}
                      isActive={page === index + 1}
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem className='sticky right-0 bg-white'>
                  <PaginationNext
                    onClick={() =>
                      materialResources.setPage(Math.min(totalPages, page + 1))
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </LayoutTemplateRoot>
  );
}
