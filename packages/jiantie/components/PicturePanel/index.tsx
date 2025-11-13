import { compressImg } from '@/utils/compressImg';
import APPBridge from '@mk/app-bridge';
import {
  cdnApi,
  deleteFile,
  FileItem,
  getFiles,
  uploadFile,
} from '@mk/services';
import { isMakaAppAndroid } from '@mk/utils';
import { Loading } from '@workspace/ui/components/loading';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@workspace/ui/components/pagination';
import cls from 'classnames';
import { FileVideo, FolderArchive, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import styles from './index.module.scss';

interface Props {
  onSelectItem: (url: string) => void;
}

const pageSize = 30;

const PicturePanel = (props: Props) => {
  const { onSelectItem } = props;
  const inputRef = useRef<any>(null);
  const [list, setList] = useState<FileItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

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

    const res = await getFiles({
      page,
      pageSize,
      ignoreIsInternalDesigner: '1',
    });

    if (res.data) {
      setList(res.data);
      setTotal(res.meta.pagination.total);
      setLoading(false);
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
          src={cdnApi(url, {
            resizeWidth: 200,
            format: 'webp',
          })}
        />
      );
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={cls([styles.picturePanel])}>
      {/* 图片列表区域 - 可滚动，占据剩余空间 */}
      <div className='flex-1 min-h-0 overflow-y-auto'>
        <div className='grid gap-2 md:grid-cols-5 max-md:grid-cols-3 pb-4'>
          <div className={styles.upload} onClick={() => onUploadClick()}>
            <Plus size={16} />
            <span>上传素材</span>
          </div>
          {list.map((item, index) => {
            return (
              <div
                key={item.url}
                className={styles.item}
                onClick={() => {
                  onSelectItem(item.url);
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
                {/* <div className={styles.delete} onClick={(e) => {
                  e.stopPropagation()
                  onDelete(item.url)
                }}>
                  <Icon name="close" size={16} />
                </div> */}
              </div>
            );
          })}
        </div>

        {loading && (
          <div className='flex items-center justify-center py-4'>
            <Loading />
          </div>
        )}
      </div>

      {/* 分页组件 - 固定在底部，不参与滚动 */}
      {totalPages > 1 && (
        <div className='flex-shrink-0 border-t border-gray-200 bg-white pt-2'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(page - 1)}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, index) => {
                const pageNum = index + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href='#'
                      onClick={e => {
                        e.preventDefault();
                        handlePageChange(pageNum);
                      }}
                      isActive={page === pageNum}
                    >
                      {pageNum}
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

      <input
        className={styles.uploadInput}
        ref={inputRef}
        onChange={onChange}
        type='file'
        accept={'image/*,video/*,.zip'}
        multiple={true}
      />
    </div>
  );
};

export default PicturePanel;
