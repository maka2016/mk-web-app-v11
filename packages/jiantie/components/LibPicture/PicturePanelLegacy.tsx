import { cdnApi, getUid, uploadFile, uploadFile2 } from '@/services';
import APPBridge from '@/store/app-bridge';
import { getCookie, isMakaAppAndroid, isMakaAppClient } from '@/utils';
import { compressImg } from '@/utils/compressImg';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
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
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { cn } from '@workspace/ui/lib/utils';
import { FileVideo, FolderArchive, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import NativePhotoCollection from './NativePhotoCollection';
import PicturePanel from './PicturePanel';
import {
  deletePicOnServerLegacy,
  getMyPicsLegacy,
  getUserFoldersLegacy,
  FileItem as LegacyFileItem,
  syncPicToUserLib,
} from './services-legacy';

interface Props {
  onSelectItem: (url: string) => void;
}

const pageSize = 40;
const NATIVE_PHOTO_COLLECTION_FOLDER_ID = -9998; // NativePhotoCollection 的特殊文件夹 ID
const PICTURE_PANEL_FOLDER_ID = -9999; // PicturePanel 的特殊文件夹 ID

interface Folder {
  name: string;
  id: number;
}

const PicturePanelLegacy = (props: Props) => {
  const { onSelectItem } = props;
  const inputRef = useRef<any>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 文件夹相关状态
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number>(-1);
  const [rootFolderId, setRootFolderId] = useState<number>(-1);
  const [loadLocalImageAvaliable, setLoadLocalImageAvaliable] = useState(false);

  // 文件列表和分页
  const [list, setList] = useState<LegacyFileItem[]>([]);
  const [pageNum, setPageNum] = useState(0); // API 使用从 0 开始的页码
  const [page, setPage] = useState(1); // UI 显示从 1 开始的页码
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // 是否是第一次加载
  const [total, setTotal] = useState(0);

  // 批量删除相关
  const [isControl, setIsControl] = useState(false);
  const [filesSelection, setFilesSelection] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 计算 itemW（用于预览图尺寸）
  const [itemW, setItemW] = useState(0);

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
      const result = await uploadFile2(
        {
          file,
          type: 'video',
        },
        () => {}
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
      const res = await Promise.all(
        Array.from(files).map(file => uploadAction(file))
      );

      if (res.filter(Boolean).length) {
        // 上传成功后刷新当前页
        loadMyPicList();
        toast.dismiss();
        toast.success('上传成功');
      }
    }
  };

  const uploadAction = async (file: File) => {
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

      // 上传成功后，如果当前文件夹不是特殊文件夹（NativePhotoCollection 或 PicturePanel），则同步到文件夹
      if (
        res?.url &&
        currentFolderId !== NATIVE_PHOTO_COLLECTION_FOLDER_ID &&
        currentFolderId !== PICTURE_PANEL_FOLDER_ID &&
        currentFolderId !== -1
      ) {
        try {
          await syncPicToUserLib(String(currentFolderId), res.url);
        } catch (syncError) {
          console.error('同步图片到文件夹失败:', syncError);
          // 同步失败不影响上传成功，只记录错误
        }
      }

      return res;
    } catch (error: any) {
      toast.dismiss();
      toast.error(error?.message || '请求超时，请重试');
    }
  };

  // 初始化文件夹
  const initMyFolder = async () => {
    const uid = getUid();
    if (!uid) {
      toast.error('请先登录');
      return;
    }

    // 检测是否支持本地相册（在 app 内）
    if (isMakaAppClient()) {
      APPBridge.appCall(
        {
          type: 'MKTypeCheck',
          params: {
            check_type: 'MKAlbumList',
          },
          jsCbFnName: 'appBridgeOnAppTypeCheckCb',
        },
        cbParams => {
          const hasLocalImage = cbParams && cbParams?.enable === '1';
          setLoadLocalImageAvaliable(hasLocalImage);
          // 初始化文件夹列表
          initFolderList(uid, hasLocalImage);
        },
        60000
      );
    } else {
      // 不在 app 内，不支持本地相册
      setLoadLocalImageAvaliable(false);
      initFolderList(uid, false);
    }
  };

  // 初始化文件夹列表
  const initFolderList = async (uid: string, hasLocalImage: boolean) => {
    try {
      const res = await getUserFoldersLegacy(uid);
      let defaultRootId = -1;
      const foldersList: Folder[] = [];

      // 1. 如果在 app 内且支持本地相册，第一个 tab 是系统相册
      if (hasLocalImage) {
        foldersList.push({
          name: '相册',
          id: NATIVE_PHOTO_COLLECTION_FOLDER_ID,
        });
      }

      // 2. 第二个 tab 是我的新版相册（PicturePanel）
      foldersList.push({
        name: '我的',
        id: PICTURE_PANEL_FOLDER_ID,
      });

      // 3. 后续的 tab 都是通过 API 获取的文件夹
      if (Array.isArray(res)) {
        res.forEach(item => {
          if (item.name === 'root') {
            defaultRootId = item.id;
            foldersList.push({
              name: '默认分类',
              id: item.id,
            });
          } else {
            foldersList.push({
              name: item.name,
              id: item.id,
            });
          }
        });
      }

      setRootFolderId(defaultRootId);
      setFolders(foldersList);

      // 默认选择第一个 tab
      if (hasLocalImage) {
        setCurrentFolderId(NATIVE_PHOTO_COLLECTION_FOLDER_ID);
        // 特殊文件夹不需要加载数据，直接设置为非初始加载状态
        setIsInitialLoading(false);
      } else {
        setCurrentFolderId(PICTURE_PANEL_FOLDER_ID);
        // 特殊文件夹不需要加载数据，直接设置为非初始加载状态
        setIsInitialLoading(false);
      }
    } catch (error) {
      console.error('加载文件夹失败:', error);
      toast.error('加载文件夹失败');
    }
  };

  // 加载图片列表
  const loadMyPicList = async () => {
    if (loading || currentFolderId === -1) {
      return;
    }

    // 如果是 NativePhotoCollection 或 PicturePanel 文件夹，不加载数据（组件自己处理）
    if (
      currentFolderId === NATIVE_PHOTO_COLLECTION_FOLDER_ID ||
      currentFolderId === PICTURE_PANEL_FOLDER_ID
    ) {
      return;
    }

    const uid = getUid();
    if (!uid) {
      return;
    }

    setLoading(true);

    try {
      const res = await getMyPicsLegacy(
        uid,
        currentFolderId,
        pageNum,
        pageSize
      );

      // res 是 { perPage: number; pageNumber: number; dataList: FileItem[]; }
      const dataList = (res as any)?.dataList;
      if (dataList && Array.isArray(dataList)) {
        setList(dataList);
        // 根据返回的数据计算总数（如果 API 没有返回总数，可以根据 dataList.length 和 perPage 估算）
        // 这里假设如果返回的数据少于 pageSize，说明是最后一页
        if (dataList.length < pageSize) {
          setTotal((pageNum + 1) * pageSize);
        } else {
          // 如果返回的数据等于 pageSize，可能还有更多，设置一个较大的值
          setTotal((pageNum + 2) * pageSize);
        }
      } else {
        setList([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('加载图片列表失败:', error);
      toast.error('加载图片列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setIsInitialLoading(false); // 第一次加载完成
    }
  };

  // 初始化文件夹
  useEffect(() => {
    initMyFolder();

    // 计算 itemW
    const calculateItemW = () => {
      if (typeof window !== 'undefined') {
        const w = window.innerWidth;
        const columnNum = window.innerWidth >= 768 ? 5 : 3;
        const width = Math.ceil((w - 16 - (columnNum - 1) * 8) / columnNum);
        setItemW(width);
      }
    };

    calculateItemW();
    window.addEventListener('resize', calculateItemW);
    return () => window.removeEventListener('resize', calculateItemW);
  }, []);

  // 当文件夹或页码变化时加载数据
  useEffect(() => {
    if (currentFolderId !== -1) {
      loadMyPicList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, pageNum]);

  // 切换 isControl 时清空选中
  useEffect(() => {
    if (!isControl) {
      setFilesSelection([]);
    }
  }, [isControl]);

  // 文件夹切换
  const folderChange = (folderId: number) => {
    // 切换文件夹时重置状态
    if (
      folderId !== NATIVE_PHOTO_COLLECTION_FOLDER_ID &&
      folderId !== PICTURE_PANEL_FOLDER_ID
    ) {
      setPageNum(0);
      setPage(1);
      setIsInitialLoading(true); // 切换文件夹时重置初始加载状态
    } else {
      // 特殊文件夹（NativePhotoCollection 或 PicturePanel）不需要加载数据，直接设置为非初始加载状态
      setIsInitialLoading(false);
    }
    setList([]);
    setFilesSelection([]);
    setCurrentFolderId(folderId);

    // 滚动到顶部
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  // 选择文件（批量删除模式）
  const onSelectFiles = (id: string) => {
    let newSelection = [...filesSelection];
    if (newSelection.includes(id)) {
      newSelection = newSelection.filter(item => item !== id);
    } else {
      newSelection.push(id);
    }
    setFilesSelection(newSelection);
  };

  // 批量删除
  const onDeleteFiles = async () => {
    if (filesSelection.length === 0 || currentFolderId === -1) {
      return;
    }

    try {
      await deletePicOnServerLegacy(filesSelection, currentFolderId);
      setFilesSelection([]);
      setPageNum(0);
      setPage(1);
      setList([]);
      await loadMyPicList();
      toast.success('删除成功');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const isNativePhotoCollectionFolder =
    currentFolderId === NATIVE_PHOTO_COLLECTION_FOLDER_ID;
  const isPicturePanelFolder = currentFolderId === PICTURE_PANEL_FOLDER_ID;
  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (newPage: number) => {
    const totalPagesCalc = Math.ceil(total / pageSize);
    if (newPage >= 1 && newPage <= totalPagesCalc) {
      setPage(newPage);
      setPageNum(newPage - 1); // UI 页码转 API 页码（从 0 开始）
    }
  };

  // 获取预览 URL
  const getPreviewUrl = (ossPath: string = '') => {
    if (!ossPath) return '';

    const wpicTail =
      itemW > 0
        ? `?x-oss-process=image/resize,w_${Math.ceil(itemW * 2)}/interlace,1`
        : '';

    const video = [
      'mp4',
      'm2v',
      'mkv',
      'flv',
      'avi',
      'mov',
      'wmv',
      'mpeg',
      'mpg',
      'swf',
      'qsv',
    ];
    const isVideo = video.some(suffix => {
      return ossPath.toLowerCase().indexOf(`.${suffix}`) > -1;
    });

    if (isVideo) {
      const file_name = ossPath.replace(/(.*\/)*([^.]+).*/gi, '$1,$2');
      const arr = file_name.split(',');
      return cdnApi(`${arr[0]}video_cover_${arr[1]}.png${wpicTail}`);
    }

    if (ossPath.includes('.svg')) {
      return cdnApi(ossPath);
    }

    return cdnApi(`${ossPath}${wpicTail}`);
  };

  const renderIcon = (item: LegacyFileItem) => {
    const url = item.url || item.name || '';
    const isZip = /\.zip$/gi.test(url);
    const isVideo =
      /\.mp4|\.mov|\.qt|\.m2v|\.mkv|\.flv|\.avi|\.wmv|\.mpeg|\.mpg|\.swf|\.qsv$/gi.test(
        url
      );

    if (isZip) {
      return <FolderArchive className='w-8 h-8 text-gray-400' />;
    } else if (isVideo) {
      return <FileVideo className='w-8 h-8 text-gray-400' />;
    } else {
      return (
        <img
          src={cdnApi(url)}
          alt={item.name || ''}
          loading='lazy'
          className='w-full h-full object-cover'
        />
      );
    }
  };

  // 骨架屏组件
  const renderSkeleton = () => {
    return (
      <div className='p-4'>
        <div className='grid gap-2 md:grid-cols-5 max-md:grid-cols-3 pb-4'>
          {/* 上传按钮骨架 */}
          <Skeleton className='w-full aspect-square rounded' />
          {/* 图片骨架 */}
          {Array.from({ length: 11 }).map((_, index) => (
            <Skeleton
              key={`skeleton-${index}`}
              className='w-full aspect-square rounded'
            />
          ))}
        </div>
      </div>
    );
  };

  // 生成要显示的页码列表
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

    // 如果总页数小于等于7，显示所有页码
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // 总是显示第一页
    pages.push(1);

    // 当前页靠近开头：1 2 3 4 5 ... 10
    if (page <= 4) {
      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
        pages.push(i);
      }
      pages.push('ellipsis-end');
    }
    // 当前页靠近结尾：1 ... 6 7 8 9 10
    else if (page >= totalPages - 3) {
      pages.push('ellipsis-start');
      for (let i = Math.max(totalPages - 4, 2); i < totalPages; i++) {
        pages.push(i);
      }
    }
    // 当前页在中间：1 ... 4 5 6 ... 10
    else {
      pages.push('ellipsis-start');
      for (let i = page - 1; i <= page + 1; i++) {
        pages.push(i);
      }
      pages.push('ellipsis-end');
    }

    // 总是显示最后一页
    pages.push(totalPages);

    return pages;
  };

  return (
    <div className={cn(['h-[60vh] overflow-hidden flex flex-col'])}>
      {/* 文件夹导航 - 上方 */}
      {folders.length > 0 && (
        <div className='flex-shrink-0 border-b border-gray-200 bg-white px-2 py-2 relative'>
          <Tabs
            value={currentFolderId.toString()}
            onValueChange={value => folderChange(Number(value))}
          >
            <TabsList className='w-full h-auto flex items-center justify-start overflow-x-auto'>
              {folders.map(folder => (
                <TabsTrigger
                  key={folder.id}
                  value={folder.id.toString()}
                  className='whitespace-nowrap'
                >
                  {folder.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 设置按钮 */}
          {/* <button
            className='absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-100'
            onClick={() => setIsControl(!isControl)}
            title={isControl ? '退出管理' : '管理'}
          >
            <Settings className='w-4 h-4' />
          </button> */}
        </div>
      )}

      {/* 图片列表区域 - 可滚动，占据剩余空间 */}
      {/* 如果是 PicturePanel 文件夹，直接渲染 PicturePanel 组件（PicturePanel 自己处理滚动和布局） */}
      {isPicturePanelFolder ? (
        <div className='flex-1 min-h-0'>
          <PicturePanel onSelectItem={onSelectItem} embedded={true} />
        </div>
      ) : (
        <div ref={scrollRef} className='flex-1 min-h-0 overflow-y-auto'>
          {isNativePhotoCollectionFolder ? (
            <NativePhotoCollection
              onSelectItem={onSelectItem}
              multiple={false}
              preUpload={true}
              t={(key: string) => {
                const locale = getCookie('NEXT_LOCALE') || 'zh-CN';
                const messages: any = {
                  en: {
                    noAuthText1:
                      'Allow access to your photos to import images. ',
                    noAuthText2: 'Go to device settings to enable permission.',
                    openAuth: 'Open Settings',
                    complete: 'Done',
                    uploading: 'Uploading...',
                    recentAlbum: 'Recent',
                  },
                  'zh-CN': {
                    noAuthText1: '需要访问您的系统相册，您才可以导入',
                    noAuthText2: '自己的照片，请前往设置中开启权限。',
                    openAuth: '开启权限',
                    complete: '完成',
                    uploading: '图片上传中...',
                    recentAlbum: '最近',
                  },
                };
                return messages[locale]?.[key] || key;
              }}
            />
          ) : isInitialLoading ? (
            // 第一次加载时显示骨架屏（不管 loading 状态）
            renderSkeleton()
          ) : !loading && list.length === 0 ? (
            // 非初始加载且数据为空时显示空状态
            <div className='flex flex-col items-center justify-center py-12 p-4'>
              <img
                src={cdnApi('/cdn/editor7/material_empty_tip.png')}
                alt=''
                className='mb-4'
              />
              <span className='text-gray-500'>暂无内容</span>
            </div>
          ) : (
            <div className='p-4'>
              <div className='grid gap-2 md:grid-cols-5 max-md:grid-cols-3 pb-4'>
                {/* 上传按钮 */}
                {!isMakaAppClient() && (
                  <div
                    className='relative overflow-hidden w-full aspect-square flex flex-col items-center gap-1 justify-center text-[var(--theme-color)] border border-black/6 rounded text-sm cursor-pointer'
                    onClick={() => onUploadClick()}
                  >
                    <Plus size={16} />
                    <span>上传素材</span>
                  </div>
                )}
                {list.map((item, index) => {
                  const itemId =
                    item.id?.toString() || item.url || index.toString();
                  const isSelected = filesSelection.includes(itemId);
                  const isActive = activeId === item.id;

                  return (
                    <div
                      key={itemId}
                      className={cn(
                        'relative w-full aspect-square cursor-pointer border border-black/6 rounded overflow-hidden flex flex-col items-center justify-center',
                        isActive &&
                          !isControl &&
                          'ring-2 ring-[var(--theme-color)]'
                      )}
                      onClick={() => {
                        if (isControl) {
                          onSelectFiles(itemId);
                        } else {
                          setActiveId(item.id || 0);
                          onSelectItem(item.url || item.name || '');
                        }
                      }}
                    >
                      {isControl && (
                        <div
                          className={cn(
                            'absolute inset-0 z-20 flex items-center justify-center',
                            isSelected && 'bg-black/20'
                          )}
                          onClick={e => {
                            e.stopPropagation();
                            onSelectFiles(itemId);
                          }}
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center',
                              isSelected
                                ? 'bg-[var(--theme-color)] border-[var(--theme-color)]'
                                : 'bg-white border-gray-300'
                            )}
                          >
                            {isSelected && (
                              <svg
                                className='w-3 h-3 text-white'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M5 13l4 4L19 7'
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}
                      {renderIcon(item)}
                      <span
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.5)',
                        }}
                        className='absolute bottom-0 left-0 right-0 text-center text-xs text-white z-10 p-0.5 overflow-hidden text-ellipsis whitespace-nowrap'
                      >
                        {item.name || item.url || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loading && (
            <div className='flex items-center justify-center py-4'>
              <Loading />
            </div>
          )}
        </div>
      )}

      {/* 分页组件 - 固定在底部，不参与滚动 - NativePhotoCollection 和 PicturePanel 文件夹不显示分页 */}
      {!isNativePhotoCollectionFolder &&
        !isPicturePanelFolder &&
        totalPages > 1 && (
          <div className='flex-shrink-0 border-t border-gray-200 bg-white py-2 px-4 sticky bottom-0'>
            <Pagination>
              <PaginationContent>
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
                      page >= totalPages ? 'pointer-events-none opacity-50' : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

      {/* 批量删除按钮 - PicturePanel 文件夹不支持批量删除 */}
      {isControl && !isPicturePanelFolder && (
        <div
          className={cn(
            'flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3',
            filesSelection.length === 0 && 'opacity-50 pointer-events-none'
          )}
        >
          <button
            className='w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed'
            onClick={() => setDeleteDialogOpen(true)}
            disabled={filesSelection.length === 0}
          >
            删除{' '}
            {filesSelection.length === 0 ? '' : `(${filesSelection.length})`}
          </button>
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>删除后将无法恢复</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteFiles}
              className='bg-red-500 hover:bg-red-600'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

export default PicturePanelLegacy;
