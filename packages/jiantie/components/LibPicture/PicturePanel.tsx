import {
  cdnApi,
  deleteFile,
  FileItem,
  getFiles,
  uploadFile,
  uploadFile2,
} from '@/services';
import APPBridge from '@/store/app-bridge';
import { isMakaAppAndroid, isMakaAppClient } from '@/utils';
import { compressImg } from '@/utils/compressImg';
import { Loading } from '@workspace/ui/components/loading';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { cn } from '@workspace/ui/lib/utils';
import { Check, FileVideo, FolderArchive, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  onSelectItem: (url: string) => void;
  embedded?: boolean; // 是否嵌入在其他组件中（移除 max-h 限制，使用父容器高度）
}

const pageSize = 29;

const PicturePanel = (props: Props) => {
  const { onSelectItem, embedded = false } = props;
  const inputRef = useRef<any>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<FileItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // 是否是第一次加载
  const [total, setTotal] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const onUploadClick = () => {
    if (isMakaAppAndroid()) {
      APPBridge.appCall(
        {
          type: 'MKAlbumAuthSetting',
          params: {},
          jsCbFnName: 'appBridgeOnAppSetAuthCb',
        },
        cbParams => {
          console.log('cbParams', cbParams);
          if (cbParams?.authorized && cbParams?.authorized === '1') {
            inputRef.current?.click();
          }
        },
        60000
      );
    } else {
      inputRef.current?.click();
    }
  };

  const handleVideoUpload = async (file: File) => {
    const validTypes = ['video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('仅支持 MP4 和 WebM 格式的视频');
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('视频文件不能超过 15MB');
      return;
    }

    try {
      setVideoUploading(true);
      setVideoUploadProgress(0);
      const result = await uploadFile2(
        {
          file,
          type: 'video',
        },
        progress => {
          setVideoUploadProgress(Math.round(progress * 100));
        }
      );
      toast.success('视频上传成功');
      // 自动选择上传的视频
      if (result?.url) {
        onSelectItem(result.url);
      }
    } catch (error) {
      console.error('视频上传失败:', error);
      toast.error('视频上传失败');
    } finally {
      setVideoUploading(false);
      setVideoUploadProgress(0);
    }
  };

  const handleVideoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleVideoUpload(file);
    }
    event.target.value = '';
  };

  const onVideoUploadClick = () => {
    if (videoUploading) return;
    if (isMakaAppAndroid()) {
      APPBridge.appCall(
        {
          type: 'MKAlbumAuthSetting',
          params: {},
          jsCbFnName: 'appBridgeOnAppSetAuthCb',
        },
        cbParams => {
          console.log('cbParams', cbParams);
          if (cbParams?.authorized && cbParams?.authorized === '1') {
            videoInputRef.current?.click();
          }
        },
        60000
      );
    } else {
      videoInputRef.current?.click();
    }
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxSize = 50;
    let files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if ((file as File).size * 0.001 > maxSize * 1024) {
          toast.error(`文件不能超过${maxSize}mb`);
          return;
        }
      }
      toast.loading('上传中...');
      const res = (await Promise.all(
        Array.from(files).map(file => uploadAction(file))
      )) as FileItem[];

      if (res.filter(Boolean).length) {
        // 上传成功后刷新当前页
        getUploadList();
        toast.dismiss();
        toast.success('上传成功');
      }
    }
  };

  const uploadAction = async (file: File, len = 1) => {
    console.time('compressImg');
    const fileCompress = await compressImg(file);
    console.timeEnd('compressImg');
    if (!fileCompress) {
      toast.error('不支持的图片格式');
      return;
    }
    console.log(
      'fileCompress.fileSize in MB',
      fileCompress.size / (1024 * 1024)
    );

    try {
      const res = await uploadFile({
        file: fileCompress,
      });
      return res;
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.message || '请求超时，请重试');
    }
  };

  const getUploadList = async () => {
    if (loading) {
      return;
    }
    setLoading(true);

    try {
      const res = await getFiles({
        page,
        pageSize,
        ignoreIsInternalDesigner: '1',
      });

      if (res.data) {
        setList(res.data);
        setTotal(res.meta.pagination.total);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
      toast.error('加载文件列表失败');
    } finally {
      setLoading(false);
      setIsInitialLoading(false); // 第一次加载完成
    }
  };

  useEffect(() => {
    getUploadList();
  }, [page]);

  const onDelete = async (id: number) => {
    await deleteFile(id, 0);
    // 删除后刷新当前页
    getUploadList();
    toast.success('删除成功');
  };

  const onBatchDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要删除的文件');
      return;
    }

    const idsArray = Array.from(selectedIds);
    try {
      toast.loading(`正在删除 ${idsArray.length} 个文件...`);
      await Promise.all(idsArray.map(id => deleteFile(id, 0)));
      toast.dismiss();
      toast.success(`成功删除 ${idsArray.length} 个文件`);
      // 清空选中状态并退出多选模式
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
      // 删除后刷新当前页
      getUploadList();
    } catch {
      toast.dismiss();
      toast.error('批量删除失败，请重试');
    }
  };

  const toggleSelect = (id: number) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map(item => item.id)));
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const renderIcon = (url: string) => {
    const isZip = /\.zip$/gi.test(url);
    const isVideo = /\.mp4|\.mov|\.qt$/gi.test(url);
    if (isZip) {
      return <FolderArchive />;
    } else if (isVideo) {
      return <FileVideo />;
    } else {
      return (
        <img
          alt=''
          src={cdnApi(url, {
            resizeWidth: 200,
            format: 'webp',
          })}
        />
      );
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // 生成要显示的页码列表（简化版，保持一行显示）
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

    // 如果总页数小于等于5，显示所有页码
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // 总是显示第一页
    pages.push(1);

    // 当前页靠近开头：1 2 3 ... 10
    if (page <= 3) {
      for (let i = 2; i <= Math.min(3, totalPages - 1); i++) {
        pages.push(i);
      }
      if (totalPages > 4) {
        pages.push('ellipsis-end');
      }
    }
    // 当前页靠近结尾：1 ... 8 9 10
    else if (page >= totalPages - 2) {
      pages.push('ellipsis-start');
      for (let i = Math.max(totalPages - 2, 2); i < totalPages; i++) {
        pages.push(i);
      }
    }
    // 当前页在中间：1 ... 4 5 6 ... 10
    else {
      pages.push('ellipsis-start');
      pages.push(page);
      pages.push('ellipsis-end');
    }

    // 总是显示最后一页
    pages.push(totalPages);

    return pages;
  };

  // 骨架屏组件
  const renderSkeleton = () => {
    return (
      <div className='grid gap-2 md:grid-cols-5 max-md:grid-cols-3 pb-4'>
        {/* 上传按钮骨架（如果不是 app 客户端） */}
        {!isMakaAppClient() && (
          <Skeleton className='w-full aspect-square rounded' />
        )}
        {/* 图片骨架 */}
        {Array.from({ length: 11 }).map((_, index) => (
          <Skeleton
            key={`skeleton-${index}`}
            className='w-full aspect-square rounded'
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn([
        'p-4 overflow-hidden flex flex-col',
        embedded ? 'h-full' : 'max-h-[60vh]',
      ])}
    >
      {/* 图片列表区域 - 可滚动，占据剩余空间 */}
      <div className='flex-1 min-h-0 overflow-y-auto'>
        {isInitialLoading ? (
          // 第一次加载时显示骨架屏
          renderSkeleton()
        ) : !loading && list.length === 0 ? (

          // 非初始加载且数据为空时显示空状态
          <div className='flex flex-col items-center justify-center py-12 p-4'>
            {!isMakaAppClient() && (
              <div
                className='relative overflow-hidden w-full aspect-square flex flex-col items-center gap-1 justify-center text-[var(--theme-color)] border border-black/6 rounded text-sm cursor-pointer'
                onClick={() => onUploadClick()}
              >
                <Plus size={16} />
                <span>上传素材</span>
              </div>
            )}
            <span className='text-gray-500'>暂无内容</span>
          </div>
        ) : (
          <div className='grid gap-2 md:grid-cols-5 max-md:grid-cols-3 pb-4'>
            {/* <div
            className={styles.upload}
            onClick={onVideoUploadClick}
            style={{
              opacity: videoUploading ? 0.6 : 1,
              cursor: videoUploading ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={16} />
            <span>
              {videoUploading ? `上传中 ${videoUploadProgress}%` : '上传视频2'}
            </span>
          </div> */}
            {!isMakaAppClient() && (
              <div
                className='relative overflow-hidden w-full aspect-square flex flex-col items-center gap-1 justify-center text-[var(--theme-color)] border border-black/6 rounded text-sm cursor-pointer'
                onClick={() => onUploadClick()}
              >
                <Plus size={16} />
                <span>上传素材</span>
              </div>
            )}
            {list.map(item => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.url}
                  className={cn(
                    'relative w-full aspect-square cursor-pointer border rounded overflow-hidden flex flex-col items-center justify-center [&_img]:w-full [&_img]:h-full [&_img]:object-contain transition-all',
                    isMultiSelectMode
                      ? isSelected
                        ? 'border-[var(--theme-color)] border-2'
                        : 'border-black/6'
                      : 'border-black/6',
                    isMultiSelectMode &&
                    isSelected &&
                    'ring-2 ring-[var(--theme-color)] ring-offset-1'
                  )}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleSelect(item.id);
                    } else {
                      onSelectItem(item.url);
                    }
                  }}
                >
                  {renderIcon(item.url)}
                  <span
                    style={{
                      backgroundColor: `rgba(0,0,0,${0.5})`,
                    }}
                    className='absolute bottom-0 left-0 right-0 text-center text-xs text-white z-10 p-0.5 overflow-hidden text-ellipsis whitespace-nowrap'
                  >
                    {item.originName}
                  </span>
                  {isMultiSelectMode && (
                    <div className='absolute top-1 right-1 z-20'>
                      <div
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                          isSelected
                            ? 'bg-[var(--theme-color)] border-[var(--theme-color)]'
                            : 'bg-white border-gray-300'
                        )}
                      >
                        {isSelected && (
                          <Check size={12} className='text-white' />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loading && !isInitialLoading && (
          <div className='flex items-center justify-center py-4'>
            <Loading />
          </div>
        )}
      </div>

      {/* 底部工具栏 - 分页和多选按钮 */}
      <div className='flex-shrink-0 border-t border-gray-200 bg-white pt-2'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4'>
          {/* 左侧：多选相关按钮 */}
          <div className='flex items-center gap-2 flex-shrink-0 overflow-x-auto pb-1 md:pb-0'>
            <button
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedIds(new Set());
              }}
              className={cn(
                'px-3 py-1.5 text-sm rounded border transition-colors flex-shrink-0',
                isMultiSelectMode
                  ? 'bg-[var(--theme-color)] text-white border-[var(--theme-color)]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              )}
            >
              {isMultiSelectMode ? '取消多选' : '多选'}
            </button>
            {isMultiSelectMode && (
              <>
                <span className='text-sm text-gray-600 whitespace-nowrap flex-shrink-0'>
                  已选择 {selectedIds.size} / {list.length}
                </span>
                {list.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className='px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap flex-shrink-0'
                  >
                    {selectedIds.size === list.length ? '取消全选' : '全选'}
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <button
                    onClick={onBatchDelete}
                    className='px-3 py-1.5 text-sm rounded border border-red-500 bg-red-500 text-white hover:bg-red-600 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0'
                  >
                    <Trash2 size={14} />
                    删除选中 ({selectedIds.size})
                  </button>
                )}
              </>
            )}
          </div>

          {/* 右侧：分页组件 */}
          {totalPages > 1 && !isMultiSelectMode && (
            <div className='flex-1 flex justify-center md:justify-end overflow-x-auto pb-1 md:pb-0'>
              <Pagination>
                <PaginationContent className='flex-nowrap'>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(page - 1)}
                      className={
                        page <= 1 ? 'pointer-events-none opacity-50' : ''
                      }
                    />
                  </PaginationItem>

                  {getPageNumbers().map((pageItem, index) => {
                    if (
                      pageItem === 'ellipsis-start' ||
                      pageItem === 'ellipsis-end'
                    ) {
                      return (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return (
                      <PaginationItem key={pageItem}>
                        <PaginationLink
                          href='#'
                          onClick={e => {
                            e.preventDefault();
                            handlePageChange(pageItem);
                          }}
                          isActive={page === pageItem}
                        >
                          {pageItem}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(page + 1)}
                      className={
                        page >= totalPages
                          ? 'pointer-events-none opacity-50'
                          : ''
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      <input
        className='absolute invisible -left-[9999px] -top-[9999px] opacity-0'
        ref={inputRef}
        onChange={onChange}
        type='file'
        accept={'image/*,.zip'}
        multiple={true}
        title='上传图片'
      />
      <input
        className='absolute invisible -left-[9999px] -top-[9999px] opacity-0'
        ref={videoInputRef}
        onChange={handleVideoFileChange}
        type='file'
        accept='video/mp4,video/webm'
        title='上传视频'
      />
    </div>
  );
};

export default PicturePanel;
