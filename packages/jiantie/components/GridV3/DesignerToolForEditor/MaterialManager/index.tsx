import styled from '@emotion/styled';
import { cdnApi, getFiles, getFolders, type FileItem } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import cls from 'classnames';
import {
  ChevronLeft,
  ChevronRight,
  Folder,
  ImageIcon,
  Loader2,
  Settings,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import FolderManager from './FolderManager';

interface Folder {
  id: number;
  appid: string;
  uid: number;
  name: string;
  isInternalDesigner: number;
  createdAt: string;
  updatedAt: string;
  parentId?: number;
}

// 楼层导航样式
export const FloorRoot = styled.div`
  position: relative;
  display: flex;
  gap: 4px;
  padding: 0 12px 8px;
  max-height: 120px;
  overflow-y: auto;
  overflow-x: hidden;

  .arrow_up,
  .arrow_down {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 24px;
    box-shadow:
      0 1px 3px 0 rgba(0, 0, 0, 0.1),
      0 1px 2px 0 rgba(0, 0, 0, 0.06);
    border-radius: 50%;
    background-color: #fff;
    color: #374151;
    cursor: pointer;
    z-index: 10;
    transition: all 0.2s ease;
    border: 1px solid #e5e7eb;

    &:hover {
      background-color: #f3f4f6;
      border-color: #d1d5db;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  .arrow_up {
    top: 8px;
  }

  .arrow_down {
    bottom: 8px;
  }

  .scroll {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
    height: 100%;
    padding: 4px 0;

    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
  }

  .floorItem {
    height: 28px;
    padding: 0px 8px;
    border-radius: 6px;
    background-color: #f3f4f6;
    cursor: pointer;
    white-space: nowrap;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 400;
    font-size: 14px;
    line-height: 28px;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;

    &:hover {
      background-color: #e5e7eb;
      border-color: #d1d5db;
    }

    &.active {
      background-color: #1a87ff;
      color: #fff;
      border-color: #1a87ff;
    }
  }

  .backButton {
    height: 28px;
    padding: 0px 8px;
    border-radius: 6px;
    background-color: #f3f4f6;
    cursor: pointer;
    white-space: nowrap;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 400;
    font-size: 14px;
    line-height: 28px;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;

    &:hover {
      background-color: #e5e7eb;
      border-color: #d1d5db;
    }
  }
`;

// 主容器样式
export const MaterialManagerRoot = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  position: relative;
  max-height: 100%;

  .items_wrapper {
    flex: 1;
    overflow: auto;
    .scroll_list {
      display: grid;
      padding: 8px 12px;
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
    border-top: 1px solid #e5e7eb;
  }
  .card_item {
    position: relative;
    max-width: 100%;
    min-height: 100px;
    width: 100%;
    overflow: hidden;
    border-radius: 6px;
    aspect-ratio: 1/1;
    cursor: pointer;
    border: 1px solid #e5e7eb;
    background-image: url('https://img2.maka.im/cdn/mk-widgets/assets/image 2507.png');
    background-repeat: repeat;
    transition: all 0.2s ease;

    &:hover {
      background-color: #f3f4f6;
      border-color: #d1d5db;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    .name {
      position: absolute;
      bottom: 8px;
      left: 8px;
      padding: 0 2px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-size: 11px;
      font-weight: 400;
      text-align: center;
      height: 16px;
      border-radius: 4px;
      max-width: calc(100% - 16px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

function MaterialManager({
  onChange,
}: {
  onChange: (material: { url: string; name: string }) => void;
}) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  // 楼层滚动引用
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllFolders();
  }, []);

  useEffect(() => {
    loadCurrentLevelFolders();
  }, [currentParentId]);

  useEffect(() => {
    if (selectedFolder !== null) {
      loadFiles(selectedFolder, currentPage);
    } else {
      setFiles([]);
      setTotal(0);
    }
  }, [selectedFolder, currentPage]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (breadcrumbs.length === 0 && scrollRef.current) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          scrollRef.current.scrollTop -= 40;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          scrollRef.current.scrollTop += 40;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [breadcrumbs.length]);

  const loadAllFolders = async () => {
    try {
      const response = await getFolders();
      setAllFolders(response);
    } catch (error) {
      console.error('Failed to load all folders:', error);
      toast.error('加载文件夹失败');
    }
  };

  const loadCurrentLevelFolders = async () => {
    try {
      const response = await getFolders(
        currentParentId === null ? 0 : currentParentId
      );
      setFolders(response);
      // 只有在根目录且没有选中文件夹时才自动选择第一个文件夹
      if (
        response.length > 0 &&
        selectedFolder === null &&
        currentParentId === null
      ) {
        setSelectedFolder(response[0].id);
      }
    } catch (error) {
      console.error('Failed to load current level folders:', error);
      toast.error('加载当前层级文件夹失败');
    }
  };

  const loadFiles = async (folderId: number, page: number) => {
    setLoading(true);
    try {
      const response = await getFiles({
        folderId,
        page,
        pageSize,
      });
      setFiles(response.data || []);
      setTotal(response.meta?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast.error('加载文件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: Folder) => {
    // 检查是否有子文件夹
    const hasSubfolders = allFolders.some(f => f.parentId === folder.id);

    if (hasSubfolders) {
      // 进入子文件夹
      setCurrentParentId(folder.id);
      setSelectedFolder(null);
      setBreadcrumbs(prev => [...prev, folder]);
      setCurrentPage(1);
    } else {
      // 选择当前文件夹
      setSelectedFolder(folder.id);
      setCurrentPage(1);
    }
  };

  // 处理面包屑导航点击
  const handleBreadcrumbClick = (folder: Folder, index: number) => {
    // 如果点击的是当前层级，直接选择该文件夹
    if (index === breadcrumbs.length - 1) {
      setSelectedFolder(folder.id);
      setCurrentPage(1);
      return;
    }

    // 如果点击的是上级目录，需要回退到对应层级
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);

    if (newBreadcrumbs.length === 0) {
      setCurrentParentId(null);
    } else {
      const lastBreadcrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
      setCurrentParentId(lastBreadcrumb.id);
    }
    setSelectedFolder(null);
    setCurrentPage(1);
  };

  // 检查文件夹是否有子文件夹的函数
  const hasSubfolders = (folderId: number) => {
    return allFolders.some(f => f.parentId === folderId);
  };

  // 返回上级目录
  const handleBackToParent = () => {
    if (breadcrumbs.length > 0) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      setBreadcrumbs(newBreadcrumbs);

      if (newBreadcrumbs.length === 0) {
        setCurrentParentId(null);
      } else {
        const lastBreadcrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
        setCurrentParentId(lastBreadcrumb.id);
      }
      setSelectedFolder(null);
      setCurrentPage(1);
    }
  };

  // 处理分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <MaterialManagerRoot>
      {loading && (
        <div className='loading_wrapper text-white'>
          <Loader2 className='w-8 h-8 animate-spin mr-2' />
          <div className='loading_text'>加载中...</div>
        </div>
      )}

      {/* 设置按钮 */}
      <Button
        variant='ghost'
        size='icon'
        className='h-7 w-7 flex-shrink-0 absolute right-2 top-2 z-10'
        onClick={() => setIsFolderManagerOpen(true)}
      >
        <Settings className='h-3.5 w-3.5' />
      </Button>

      {/* 楼层导航 */}
      <FloorRoot>
        <div ref={scrollRef} className='scroll'>
          {breadcrumbs.length > 0 ? (
            // 子级目录视图
            <>
              <div className='backButton' onClick={handleBackToParent}>
                <ChevronLeft className='w-4 h-4' />
                返回
              </div>
              {breadcrumbs.map((breadcrumb, index) => (
                <div
                  key={breadcrumb.id}
                  className={cls(
                    'floorItem',
                    selectedFolder === breadcrumb.id && 'active'
                  )}
                  onClick={() => handleBreadcrumbClick(breadcrumb, index)}
                >
                  {breadcrumb.name}
                </div>
              ))}
              {/* 显示当前层级的所有文件夹 */}
              {folders.map(folder => {
                const hasChild = hasSubfolders(folder.id);
                return (
                  <div
                    key={folder.id}
                    className={cls([
                      'floorItem',
                      selectedFolder === folder.id && 'active',
                    ])}
                    onClick={() => handleFolderClick(folder)}
                  >
                    {folder.name}
                    {hasChild && (
                      <ChevronRight className='w-3 h-3 opacity-60' />
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            // 根目录视图
            <>
              <div
                className={cls(
                  'floorItem',
                  selectedFolder === null && 'active'
                )}
                onClick={() => {
                  setSelectedFolder(null);
                  setCurrentPage(1);
                }}
              >
                全部
              </div>
              {folders.map(folder => {
                const hasChild = hasSubfolders(folder.id);
                return (
                  <div
                    key={folder.id}
                    className={cls([
                      'floorItem',
                      selectedFolder === folder.id && 'active',
                    ])}
                    onClick={() => handleFolderClick(folder)}
                  >
                    {folder.name}
                    {hasChild && (
                      <ChevronRight className='w-3 h-3 opacity-60' />
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </FloorRoot>

      {/* 文件展示区域 */}
      <div className='items_wrapper'>
        <div className='scroll_list'>
          {files.map(file => (
            <div key={file.id} className='card_item'>
              <div
                onClick={() =>
                  onChange({ url: file.url, name: file.originName })
                }
                className='h-full w-full overflow-hidden'
              >
                {file.url ? (
                  <img
                    width={300}
                    height={300}
                    src={cdnApi(file.url, {
                      resizeWidth: 300,
                      format: 'webp',
                    })}
                    alt={file.originName}
                  />
                ) : (
                  <div className='flex items-center justify-center w-full h-full'>
                    <ImageIcon />
                  </div>
                )}
              </div>
              <div className='name'>{file.originName}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className='pagination_wrapper'>
          <Pagination>
            <PaginationContent>
              <PaginationItem className='sticky left-0 bg-white'>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    href='#'
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      handlePageChange(index + 1);
                    }}
                    isActive={currentPage === index + 1}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem className='sticky right-0 bg-white'>
                <PaginationNext
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* 空状态 */}
      {!loading && files.length === 0 && selectedFolder !== null && (
        <div className='flex-1 flex flex-col items-center justify-center text-gray-400 gap-2'>
          <Folder className='h-8 w-8' />
          <p>当前文件夹暂无文件</p>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-sm'
            onClick={() => setIsFolderManagerOpen(true)}
          >
            <Settings className='h-4 w-4 mr-1.5' />
            管理文件
          </Button>
        </div>
      )}

      {/* 文件夹管理对话框 */}
      <ResponsiveDialog
        isOpen={isFolderManagerOpen}
        onOpenChange={setIsFolderManagerOpen}
        title='文件夹管理'
      >
        <FolderManager />
      </ResponsiveDialog>
    </MaterialManagerRoot>
  );
}

export default function MaterialManagerWrapper() {
  const { editorSDK, widgetState, widgetStateV2 } = useGridContext();
  return (
    <MaterialManager
      onChange={payload => {
        const elemLayer = editorSDK?.getLayer(
          widgetStateV2.editingElemId || widgetState.editingElemId || ''
        );
        if (elemLayer && /picture/gi.test(elemLayer.elementRef)) {
          editorSDK?.changeCompAttr(elemLayer.elemId, {
            ossPath: payload.url,
          });
        } else {
          toast.error('只能对图片元素使用素材');
        }
      }}
    />
  );
}
