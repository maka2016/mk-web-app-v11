import { IMusic } from '@/components/GridEditorV3/works-store/types';
import { getFiles, uploadFile } from '@/services';
import { Button } from '@workspace/ui/components/button';
import { Loading } from '@workspace/ui/components/loading';
import cls from 'classnames';
import { ExternalLink, Music, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import CommunityTerms from './CommunityTerms';
import styles from './index.module.scss';
import { useMusic } from './MusicProvider';

interface UserMusicPageProps {
  value: IMusic;
  onChange: (payload: IMusic) => void;
}

interface MusicFile {
  id: string | number;
  title: string;
  url: string;
  materialId: string;
  type: string;
  duration: number;
  preview: string;
  uploadTime: string;
  size?: number;
  format?: string;
}

const UserMusicPage = (props: UserMusicPageProps) => {
  const { value, onChange } = props;
  const { togglePlay, isPlaying } = useMusic();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [myMusicList, setMyMusicList] = useState<MusicFile[]>([]);
  const [shareToCommunity, setShareToCommunity] = useState(true);
  const [showTerms, setShowTerms] = useState(false);

  // 分页相关状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  // 获取用户已上传的音乐列表
  const fetchUserMusicList = async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await getFiles({
        type: 'music',
        page: pageNum,
        pageSize,
        ignoreIsInternalDesigner: '1',
      });

      if (response.data) {
        const musicFiles: MusicFile[] = response.data.map((file: any) => ({
          id: file.id,
          title: file.originName?.replace(/\.[^/.]+$/, '') || `音乐${file.id}`,
          url: file.url,
          materialId: file.id.toString(),
          type: 'music',
          duration: 0,
          preview: '',
          uploadTime:
            file.createdAt || file.uploadTime || new Date().toISOString(),
          size: file.size,
          format: file.mimeType || file.type,
        }));

        if (append) {
          setMyMusicList(prev => [...prev, ...musicFiles]);
        } else {
          setMyMusicList(musicFiles);
        }

        setFinished(musicFiles.length < pageSize);
      }
    } catch (error) {
      console.error('获取音乐列表失败:', error);
      toast.error('获取音乐列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载更多音乐
  const loadMoreMusic = () => {
    if (loading || finished) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUserMusicList(nextPage, true);
  };

  // 组件加载时获取音乐列表
  useEffect(() => {
    fetchUserMusicList(1, false);
  }, []);

  // 本地文件上传
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/m4a',
      'audio/aac',
      'audio/ogg',
    ];
    console.log('allowedTypes', file.type);
    if (!allowedTypes.includes(file.type)) {
      toast.error('请选择支持的音频格式（MP3, M4A, AAC, OGG）');
      return;
    }

    // 验证文件大小（最大20MB）
    if (file.size > 20 * 1024 * 1024) {
      toast.error('文件大小不能超过20MB');
      return;
    }

    setUploading(true);
    toast.loading('正在上传音频文件...');

    try {
      const result = await uploadFile({
        file,
        type: 'music' as any,
        originName: file.name,
        shareToCommunity,
      });

      if (result) {
        const musicData: MusicFile = {
          id: result.id,
          title: file.name.replace(/\.[^/.]+$/, ''), // 去掉文件扩展名
          url: result.url,
          materialId: result.id.toString(),
          type: 'music',
          duration: 0,
          preview: '', // 音频文件没有预览图
          uploadTime: new Date().toISOString(),
          size: file.size,
          format: file.type,
        };

        // 重新获取音乐列表以包含新上传的音乐
        fetchUserMusicList(1, false);

        toast.dismiss();
        toast.success('音频上传成功！');
      }
    } catch (error) {
      console.error('上传失败:', error);
      toast.dismiss();
      toast.error('音频上传失败，请重试');
    } finally {
      setUploading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 删除音乐
  const deleteMusic = (musicId: string | number) => {
    // 从本地状态中移除
    setMyMusicList(prev => prev.filter(music => music.id !== musicId));

    // 重新获取列表以确保数据同步
    fetchUserMusicList(1, false);

    toast.success('音乐已删除');
  };

  // 应用音乐到编辑器
  const applyMusic = (music: MusicFile) => {
    const musicData = {
      title: music.title,
      url: music.url,
      materialId: music.materialId,
      type: 'music',
      duration: music.duration || 0,
      preview: music.preview || '',
    };
    onChange(musicData);

    toast.success(`已应用音乐：${music.title}`);
  };

  // 处理音乐播放
  const handleTogglePlay = async (url: string) => {
    await togglePlay(url);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 格式化上传时间
  const formatUploadTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`${styles.music} relative flex flex-col overflow-hidden h-full`}
    >
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* 上传区域 */}
        <div className='mb-3 p-2.5 bg-gray-50 rounded-lg'>
          <div className='grid grid-cols-1 gap-2'>
            {/* 本地文件上传 */}
            <div className='relative'>
              <input
                ref={fileInputRef}
                type='file'
                accept='.mp3,.m4a,.aac,.ogg'
                onChange={handleFileUpload}
                disabled={uploading}
                className='absolute opacity-0 w-0 h-0 overflow-hidden'
              />
              <div
                className={`flex items-center justify-center p-3 border border-dashed border-black/10 rounded-md cursor-pointer transition-all duration-200 gap-2 ${
                  uploading
                    ? 'pointer-events-none opacity-70 bg-white'
                    : 'bg-white hover:border-black/15 hover:bg-gray-50'
                }`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loading />
                    <span className='text-xs text-black/60 font-normal'>
                      上传中...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <div className='flex flex-col'>
                      <span className='text-xs text-black/60 font-normal'>
                        本地上传
                      </span>
                      <small className='text-[10px] text-black/45'>
                        选择音频文件
                      </small>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 社区共享选项 */}
            <div className='flex items-center gap-2 px-2 py-1.5'>
              <label className='flex items-center gap-2 cursor-pointer text-xs'>
                <input
                  type='checkbox'
                  checked={shareToCommunity}
                  onChange={e => setShareToCommunity(e.target.checked)}
                  className='w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1'
                />
                <span className='text-black/70'>共享到音乐社区</span>
              </label>
              <button
                onClick={() => setShowTerms(true)}
                className='text-blue-500 hover:text-blue-600 text-xs flex items-center gap-1'
              >
                查看协议
                <ExternalLink size={10} />
              </button>
            </div>

            {/* URL下载上传 */}
            {/* <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5 items-center">
                <input
                  placeholder="音频文件URL"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={uploading}
                  className="flex-1 text-xs h-8 border border-black/10 rounded px-2 outline-none focus:border-[#0066cc] focus:shadow-[0_0_0_2px_rgba(0,102,204,0.1)]"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !uploading && urlInput.trim()) {
                      handleUrlExtract();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleUrlExtract}
                  disabled={uploading || !urlInput.trim()}
                  className="h-8 w-8 p-0 flex items-center justify-center"
                  title="从URL下载上传"
                >
                  {uploading ? <Loading /> : <Link size={14} />}
                </Button>
              </div>
              <div className="text-[10px] text-black/45">
                支持从网络URL下载音频文件
              </div>
            </div> */}
          </div>
        </div>

        {/* 音乐列表 */}
        <div className={styles.scrollList}>
          {myMusicList.length > 0 ? (
            <>
              <div className={styles.materialList}>
                {myMusicList.map(music => {
                  const isActive = value.materialId === music.materialId;
                  return (
                    <div
                      key={music.id}
                      className={cls([
                        styles.templateItem,
                        isPlaying(music.url) && styles.playing,
                      ])}
                      style={{
                        // 确保播放状态样式生效
                        ...(isPlaying(music.url) && {
                          backgroundColor: 'rgba(0, 102, 204, 0.1) !important',
                          outline: '1px solid #0066cc !important',
                          color: '#0066cc !important',
                        }),
                      }}
                      onClick={() => {
                        handleTogglePlay(music.url);
                      }}
                    >
                      <div className={styles.cover}>
                        <div
                          className={styles.mask}
                          style={{
                            ...(isPlaying(music.url) && {
                              backgroundColor:
                                'rgba(0, 102, 204, 0.8) !important',
                            }),
                          }}
                        >
                          <Music size={20} color='#fff' />
                        </div>
                        <div className='w-full h-full flex items-center justify-center bg-gray-100'>
                          <Music size={20} color='#ccc' />
                        </div>
                      </div>

                      <div
                        className={styles.name}
                        style={{
                          ...(isPlaying(music.url) && {
                            color: '#0066cc !important',
                            fontWeight: '500 !important',
                          }),
                        }}
                      >
                        {music.title}
                        <div className='text-xs text-black/50 mt-0.5'>
                          {formatUploadTime(music.uploadTime)}
                          {music.size && ` • ${formatFileSize(music.size)}`}
                        </div>
                      </div>

                      <div className='flex gap-2 items-center flex-shrink-0'>
                        <Button
                          size='sm'
                          disabled={isActive}
                          onClick={e => {
                            e.stopPropagation();
                            applyMusic(music);
                          }}
                        >
                          {isActive ? '已应用' : '应用'}
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={e => {
                            e.stopPropagation();
                            deleteMusic(music.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 加载更多 */}
              {!finished && (
                <div className='flex justify-center py-4'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={loadMoreMusic}
                    disabled={loading}
                  >
                    {loading ? <Loading /> : '加载更多'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 加载状态 */}
              {loading && (
                <div className='flex flex-col items-center justify-center py-10 px-5 gap-2'>
                  <Loading />
                  <span className='text-sm text-black/60'>加载中...</span>
                </div>
              )}

              {/* 空状态 */}
              {!loading && (
                <div className='flex flex-col items-center justify-center h-50 gap-3 text-center'>
                  <Music size={48} color='#ccc' />
                  <span className='text-sm text-black/60 font-medium'>
                    暂无上传的音乐
                  </span>
                  <span className='text-xs text-black/40'>
                    点击上方区域上传音频文件或从URL下载上传
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 社区协议弹窗 */}
      <CommunityTerms show={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
};

export default UserMusicPage;
