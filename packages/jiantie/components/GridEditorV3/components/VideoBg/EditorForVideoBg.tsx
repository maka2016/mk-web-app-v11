import { cdnApi, uploadFile2 } from '@/services';
import { Button } from '@workspace/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Slider } from '@workspace/ui/components/slider';
import { Switch } from '@workspace/ui/components/switch';
import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { showSelector } from '../../../showSelector';
import { ToggleItem } from '../../componentsForEditor/ElementAttrsEditorV2/ToggleItem';
import { VideoBgConfig } from './types';

interface EditorForVideoBgProps {
  videoBgConfig?: VideoBgConfig;
  onChange: (
    value: React.CSSProperties & { videoBgConfig?: VideoBgConfig }
  ) => void;
  /** 是否启用 MOV 格式上传 */
  useMov?: boolean;
  /** 是否启用 MP4 格式上传 */
  useMp4?: boolean;
  /** 是否启用 WebM 格式上传 */
  useWebm?: boolean;
  label?: string;
}

export default function EditorForVideoBg({
  videoBgConfig,
  onChange,
  useMov = false,
  useMp4 = true,
  useWebm = false,
  label = '视频背景',
}: EditorForVideoBgProps) {
  const [movVideoUploading, setMovVideoUploading] = useState(false);
  const [movVideoUploadProgress, setMovVideoUploadProgress] = useState(0);
  const [webmVideoUploading, setWebmVideoUploading] = useState(false);
  const [webmVideoUploadProgress, setWebmVideoUploadProgress] = useState(0);
  const [mp4VideoUploading, setMp4VideoUploading] = useState(false);
  const [mp4VideoUploadProgress, setMp4VideoUploadProgress] = useState(0);
  const [extractingPoster, setExtractingPoster] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [posterExtractTime, setPosterExtractTime] = useState(0);
  const [draggingVideoOpacity, setDraggingVideoOpacity] = useState<
    number | null
  >(null);
  // 内部维护的打开状态
  const [isOpen, setIsOpen] = useState(() => {
    // 初始化时，如果有视频 URL 则打开
    return !!(
      (useMov && videoBgConfig?.movVideoUrl) ||
      (useMp4 && videoBgConfig?.mp4VideoUrl) ||
      (useWebm && videoBgConfig?.webmVideoUrl)
    );
  });
  const movVideoInputRef = useRef<HTMLInputElement>(null);
  const webmVideoInputRef = useRef<HTMLInputElement>(null);
  const mp4VideoInputRef = useRef<HTMLInputElement>(null);

  const ensureVideoConfig = (): VideoBgConfig => ({
    mp4VideoUrl: videoBgConfig?.mp4VideoUrl,
    movVideoUrl: videoBgConfig?.movVideoUrl,
    webmVideoUrl: videoBgConfig?.webmVideoUrl,
    posterUrl: videoBgConfig?.posterUrl,
    loop: videoBgConfig?.loop !== undefined ? videoBgConfig.loop : true,
    muted: videoBgConfig?.muted !== undefined ? videoBgConfig.muted : true,
    objectFit: videoBgConfig?.objectFit || 'cover',
    opacity: videoBgConfig?.opacity,
  });

  const updateVideoConfig = (next: Partial<VideoBgConfig>) => {
    const base = ensureVideoConfig();
    const merged: VideoBgConfig = {
      ...base,
      ...next,
    };
    if (merged.opacity === undefined || merged.opacity === 1) {
      delete (merged as Partial<VideoBgConfig>).opacity;
    }
    onChange({
      videoBgConfig: merged,
    } as any);
  };

  const handleMovVideoUpload = async (file: File) => {
    const validTypes = ['video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast.error('仅支持 MOV 格式的视频');
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('视频文件不能超过 15MB');
      return;
    }

    try {
      setMovVideoUploading(true);
      setMovVideoUploadProgress(0);
      const result = await uploadFile2(
        {
          file,
          type: 'video',
        },
        progress => {
          setMovVideoUploadProgress(Math.round(progress * 100));
        }
      );
      updateVideoConfig({ movVideoUrl: result.url });
      toast.success('MOV 视频上传成功');
    } catch (error) {
      console.error('MOV 视频上传失败:', error);
      toast.error('MOV 视频上传失败');
    } finally {
      setMovVideoUploading(false);
      setMovVideoUploadProgress(0);
    }
  };

  const handleMovVideoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleMovVideoUpload(file);
    }
    event.target.value = '';
  };

  const handleWebmVideoUpload = async (file: File) => {
    const validTypes = ['video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('仅支持 WebM 格式的视频');
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('视频文件不能超过 15MB');
      return;
    }

    try {
      setWebmVideoUploading(true);
      setWebmVideoUploadProgress(0);
      const result = await uploadFile2(
        {
          file,
          type: 'video',
        },
        progress => {
          setWebmVideoUploadProgress(Math.round(progress * 100));
        }
      );
      updateVideoConfig({ webmVideoUrl: result.url });
      toast.success('WebM 视频上传成功');
    } catch (error) {
      console.error('WebM 视频上传失败:', error);
      toast.error('WebM 视频上传失败');
    } finally {
      setWebmVideoUploading(false);
      setWebmVideoUploadProgress(0);
    }
  };

  const handleWebmVideoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleWebmVideoUpload(file);
    }
    event.target.value = '';
  };

  const handleMp4VideoUpload = async (file: File) => {
    const validTypes = ['video/mp4'];
    if (!validTypes.includes(file.type)) {
      toast.error('仅支持 MP4 格式的视频');
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('视频文件不能超过 15MB');
      return;
    }

    try {
      setMp4VideoUploading(true);
      setMp4VideoUploadProgress(0);
      const result = await uploadFile2(
        {
          file,
          type: 'video',
        },
        progress => {
          setMp4VideoUploadProgress(Math.round(progress * 100));
        }
      );
      updateVideoConfig({ mp4VideoUrl: result.url });
      toast.success('MP4 视频上传成功');
    } catch (error) {
      console.error('MP4 视频上传失败:', error);
      toast.error('MP4 视频上传失败');
    } finally {
      setMp4VideoUploading(false);
      setMp4VideoUploadProgress(0);
    }
  };

  const handleMp4VideoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleMp4VideoUpload(file);
    }
    event.target.value = '';
  };

  const handleVideoRemove = () => {
    setDraggingVideoOpacity(null);
    setIsOpen(false);
    const nextConfig = { ...videoBgConfig };
    if (useMov) {
      nextConfig.movVideoUrl = undefined;
    }
    if (useMp4) {
      nextConfig.mp4VideoUrl = undefined;
    }
    if (useWebm) {
      nextConfig.webmVideoUrl = undefined;
    }
    onChange({
      videoBgConfig: nextConfig,
    });
  };

  const handleVideoDestroy = () => {
    onChange({
      videoBgConfig: undefined,
    });
  };

  const openMovVideoSelector = () => {
    if (movVideoUploading || webmVideoUploading || mp4VideoUploading) return;
    movVideoInputRef.current?.click();
  };

  const openMovVideoLibrary = () => {
    if (movVideoUploading || webmVideoUploading || mp4VideoUploading) return;
    showSelector?.({
      type: 'picture',
      onSelected: (params: any) => {
        if (params?.url) {
          updateVideoConfig({ movVideoUrl: params.url });
          toast.success('已选择 MOV 视频');
        }
      },
    });
  };

  const openWebmVideoSelector = () => {
    if (movVideoUploading || webmVideoUploading || mp4VideoUploading) return;
    webmVideoInputRef.current?.click();
  };

  const openWebmVideoLibrary = () => {
    if (movVideoUploading || webmVideoUploading || mp4VideoUploading) return;
    showSelector?.({
      type: 'picture',
      onSelected: (params: any) => {
        if (params?.url) {
          updateVideoConfig({ webmVideoUrl: params.url });
          toast.success('已选择 WebM 视频');
        }
      },
    });
  };

  const openMp4VideoSelector = () => {
    if (movVideoUploading || webmVideoUploading || mp4VideoUploading) return;
    mp4VideoInputRef.current?.click();
  };

  const openMp4VideoLibrary = () => {
    if (movVideoUploading || webmVideoUploading || mp4VideoUploading) return;
    showSelector?.({
      type: 'picture',
      onSelected: (params: any) => {
        if (params?.url) {
          updateVideoConfig({ mp4VideoUrl: params.url });
          toast.success('已选择 MP4 视频');
        }
      },
    });
  };

  const openPosterSelector = () => {
    if (movVideoUploading || webmVideoUploading || mp4VideoUploading) return;
    showSelector?.({
      type: 'picture',
      onSelected: (params: any) => {
        if (params?.url) {
          updateVideoConfig({ posterUrl: params.url });
          toast.success('已设置视频封面');
        }
      },
    });
  };

  /**
   * 从视频提取某一帧作为封面图片
   * @param videoUrl 视频 URL
   * @param time 提取的时间点（秒），默认 0（第一帧）
   */
  const extractFrameFromVideo = async (
    videoUrl: string,
    time: number = 0
  ): Promise<File | null> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';

      const handleLoadedMetadata = () => {
        // 设置视频时间到指定帧
        video.currentTime = Math.min(time, video.duration || 0);
      };

      const handleSeeked = () => {
        try {
          // 创建 canvas 来绘制视频帧
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            video.remove();
            canvas.remove();
            reject(
              new Error(
                `无法创建 Canvas 上下文。视频URL: ${videoUrl}，提取时间: ${time}秒，视频尺寸: ${video.videoWidth}x${video.videoHeight}`
              )
            );
            return;
          }

          // 将视频帧绘制到 canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // 将 canvas 转换为 Blob
          canvas.toBlob(
            blob => {
              if (!blob) {
                video.remove();
                canvas.remove();
                reject(
                  new Error(
                    `无法生成图片。视频URL: ${videoUrl}，提取时间: ${time}秒，视频尺寸: ${video.videoWidth}x${video.videoHeight}，Canvas尺寸: ${canvas.width}x${canvas.height}`
                  )
                );
                return;
              }

              // 转换为 File 对象
              const file = new File([blob], `poster-${Date.now()}.png`, {
                type: 'image/png',
              });

              // 清理
              video.remove();
              canvas.remove();

              resolve(file);
            },
            'image/png',
            0.95
          );
        } catch (error) {
          video.remove();
          const errorMessage =
            error instanceof Error ? error.message : '未知错误';
          reject(
            new Error(
              `提取视频帧时发生错误: ${errorMessage}。视频URL: ${videoUrl}，提取时间: ${time}秒，视频尺寸: ${video.videoWidth}x${video.videoHeight}`
            )
          );
        }
      };

      const handleError = (event: Event) => {
        const videoElement = event.target as HTMLVideoElement;
        const error = videoElement.error;
        let errorMessage = '视频加载失败';

        if (error) {
          switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
              errorMessage = '视频加载被中止';
              break;
            case error.MEDIA_ERR_NETWORK:
              errorMessage = '网络错误，无法加载视频';
              break;
            case error.MEDIA_ERR_DECODE:
              errorMessage = '视频解码失败，可能格式不支持';
              break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = '视频格式不支持或源文件不存在';
              break;
            default:
              errorMessage = `视频加载失败 (错误代码: ${error.code})`;
          }
        }

        video.remove();
        reject(
          new Error(
            `${errorMessage}。视频URL: ${videoUrl}，提取时间: ${time}秒`
          )
        );
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);

      video.src = cdnApi(videoUrl);
    });
  };

  /**
   * 获取视频时长
   */
  const getVideoDuration = async (videoUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';

      const handleLoadedMetadata = () => {
        const duration = video.duration;
        video.remove();
        if (isFinite(duration) && duration > 0) {
          resolve(duration);
        } else {
          reject(new Error('无法获取视频时长'));
        }
      };

      const handleError = (event: Event) => {
        const videoElement = event.target as HTMLVideoElement;
        const error = videoElement.error;
        let errorMessage = '视频加载失败';

        if (error) {
          switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
              errorMessage = '视频加载被中止';
              break;
            case error.MEDIA_ERR_NETWORK:
              errorMessage = '网络错误，无法加载视频';
              break;
            case error.MEDIA_ERR_DECODE:
              errorMessage = '视频解码失败，可能格式不支持';
              break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = '视频格式不支持或源文件不存在';
              break;
            default:
              errorMessage = `视频加载失败 (错误代码: ${error.code})`;
          }
        }

        video.remove();
        reject(new Error(`${errorMessage}。视频URL: ${videoUrl}`));
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);
      video.src = cdnApi(videoUrl);
    });
  };

  /**
   * 加载视频时长（当视频URL变化时）
   */
  React.useEffect(() => {
    const videoUrl =
      videoBgConfig?.mp4VideoUrl ||
      videoBgConfig?.webmVideoUrl ||
      videoBgConfig?.movVideoUrl;

    if (videoUrl) {
      getVideoDuration(videoUrl)
        .then(duration => {
          setVideoDuration(duration);
          // 如果当前选择的时间超过视频时长，重置为0
          setPosterExtractTime(prev => (prev > duration ? 0 : prev));
        })
        .catch(error => {
          setVideoDuration(null);
        });
    } else {
      setVideoDuration(null);
      setPosterExtractTime(0);
    }
  }, [
    videoBgConfig?.mp4VideoUrl,
    videoBgConfig?.movVideoUrl,
    videoBgConfig?.webmVideoUrl,
  ]);

  /**
   * 格式化时间显示（秒 -> 分:秒）
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 从当前视频提取封面并上传
   */
  const handleExtractPosterFromVideo = async () => {
    if (movVideoUploading || webmVideoUploading || mp4VideoUploading) return;

    // 获取当前视频 URL（优先使用 MP4，如果没有则使用其他格式）
    const videoUrl =
      videoBgConfig?.mp4VideoUrl ||
      videoBgConfig?.webmVideoUrl ||
      videoBgConfig?.movVideoUrl;

    if (!videoUrl) {
      toast.error('请先上传视频');
      return;
    }

    try {
      setExtractingPoster(true);

      // 使用用户选择的时间提取帧
      const extractTime = Math.min(posterExtractTime, videoDuration || 0);
      const posterFile = await extractFrameFromVideo(videoUrl, extractTime);

      if (!posterFile) {
        toast.error('提取封面失败');
        return;
      }

      // 上传提取的封面图片
      const result = await uploadFile2(
        {
          file: posterFile,
          type: 'picture',
        },
        () => {
          // 上传进度可以在这里处理，但图片通常很快
        }
      );

      // 更新配置
      updateVideoConfig({ posterUrl: result.url });
      toast.success(`已从视频第 ${formatTime(extractTime)} 秒提取封面`);
    } catch (error) {
      console.error('提取封面失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`提取封面失败: ${errorMessage}`);
    } finally {
      setExtractingPoster(false);
    }
  };

  return (
    <ToggleItem
      title={label}
      hasValue={isOpen}
      onAdd={() => {
        setIsOpen(true);
      }}
      onRemove={handleVideoRemove}
    >
      <div className='flex flex-col gap-3 px-2 pb-2'>
        <input
          ref={movVideoInputRef}
          type='file'
          accept='video/quicktime'
          className='hidden'
          onChange={handleMovVideoFileChange}
        />
        <input
          ref={webmVideoInputRef}
          type='file'
          accept='video/webm'
          className='hidden'
          onChange={handleWebmVideoFileChange}
        />
        <input
          ref={mp4VideoInputRef}
          type='file'
          accept='video/mp4'
          className='hidden'
          onChange={handleMp4VideoFileChange}
        />

        {/* 根据 useMov、useMp4、useWebm 显示对应的上传界面 */}
        {useMov && (
          /* MOV 视频 */
          <div className='flex flex-col gap-2'>
            <div className='text-xs font-medium text-gray-700'>
              MOV 视频（用于 Safari/iOS）
            </div>
            {videoBgConfig?.movVideoUrl ? (
              <div
                className='relative overflow-hidden rounded-md'
                style={{
                  backgroundImage: `
                  linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                  linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                  linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                `,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              >
                <video
                  key={videoBgConfig.movVideoUrl}
                  src={cdnApi(videoBgConfig.movVideoUrl)}
                  className='aspect-video w-full object-contain'
                  controls
                  loop
                  muted
                  playsInline
                  preload='metadata'
                />
                <div className='absolute top-2 right-2 flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs'
                    onClick={openMovVideoLibrary}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    素材库
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs'
                    onClick={openMovVideoSelector}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    更换
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs text-red-500 hover:text-red-600'
                    onClick={() => {
                      updateVideoConfig({ movVideoUrl: undefined });
                    }}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    移除
                  </Button>
                </div>
                <div className='absolute bottom-2 left-2 right-2 truncate rounded bg-black/40 px-2 py-1 text-[10px] text-white'>
                  {videoBgConfig.movVideoUrl}
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 p-4 text-xs text-gray-500'>
                <span>支持 MOV、MP4，建议小于 15MB</span>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-3 text-xs'
                    onClick={openMovVideoSelector}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    {movVideoUploading
                      ? `上传中... ${movVideoUploadProgress}%`
                      : '上传 MOV 视频'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-3 text-xs'
                    onClick={openMovVideoLibrary}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    素材库
                  </Button>
                </div>
              </div>
            )}
            {movVideoUploading && (
              <div className='text-xs text-gray-500 text-right'>
                上传进度 {movVideoUploadProgress}%
              </div>
            )}
          </div>
        )}

        {useWebm && (
          /* WebM 视频 */
          <div className='flex flex-col gap-2'>
            <div className='text-xs font-medium text-gray-700'>
              WebM 视频（用于 Chrome/Firefox/Edge）
            </div>
            {videoBgConfig?.webmVideoUrl ? (
              <div
                className='relative overflow-hidden rounded-md'
                style={{
                  backgroundImage: `
                  linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                  linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                  linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                `,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              >
                <video
                  key={videoBgConfig.webmVideoUrl}
                  src={cdnApi(videoBgConfig.webmVideoUrl)}
                  className='aspect-video w-full object-contain'
                  controls
                  loop
                  muted
                  playsInline
                  preload='metadata'
                />
                <div className='absolute top-2 right-2 flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs'
                    onClick={openWebmVideoLibrary}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    素材库
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs'
                    onClick={openWebmVideoSelector}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    更换
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs text-red-500 hover:text-red-600'
                    onClick={() => {
                      updateVideoConfig({ webmVideoUrl: undefined });
                    }}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    移除
                  </Button>
                </div>
                <div className='absolute bottom-2 left-2 right-2 truncate rounded bg-black/40 px-2 py-1 text-[10px] text-white'>
                  {videoBgConfig.webmVideoUrl}
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 p-4 text-xs text-gray-500'>
                <span>支持 WebM，建议小于 15MB</span>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-3 text-xs'
                    onClick={openWebmVideoSelector}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    {webmVideoUploading
                      ? `上传中... ${webmVideoUploadProgress}%`
                      : '上传 WebM 视频'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-3 text-xs'
                    onClick={openWebmVideoLibrary}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    素材库
                  </Button>
                </div>
              </div>
            )}
            {webmVideoUploading && (
              <div className='text-xs text-gray-500 text-right'>
                上传进度 {webmVideoUploadProgress}%
              </div>
            )}
          </div>
        )}

        {useMp4 && (
          /* MP4 视频 */
          <div className='flex flex-col gap-2'>
            <div className='text-xs font-medium text-gray-700 flex items-center justify-between'>
              MP4 视频
              <span
                onClick={() => {
                  handleVideoDestroy();
                }}
                className='text-xs text-blue-500 hover:text-blue-600 cursor-pointer'
              >
                重置
              </span>
            </div>
            {videoBgConfig?.mp4VideoUrl ? (
              <div
                className='relative overflow-hidden rounded-md'
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                    linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                    linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                  `,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              >
                <video
                  key={videoBgConfig.mp4VideoUrl}
                  src={cdnApi(videoBgConfig.mp4VideoUrl)}
                  className='aspect-video w-full object-contain'
                  controls
                  loop
                  muted
                  playsInline
                  preload='metadata'
                />
                <div className='absolute top-2 right-2 flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs'
                    onClick={openMp4VideoLibrary}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    素材库
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs'
                    onClick={openMp4VideoSelector}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    更换
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 text-xs text-red-500 hover:text-red-600'
                    onClick={() => {
                      updateVideoConfig({ mp4VideoUrl: undefined });
                    }}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    移除
                  </Button>
                </div>
                <div className='absolute bottom-2 left-2 right-2 truncate rounded bg-black/40 px-2 py-1 text-[10px] text-white'>
                  {videoBgConfig.mp4VideoUrl}
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 p-4 text-xs text-gray-500'>
                <span>支持 MP4，建议小于 15MB</span>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-3 text-xs'
                    onClick={openMp4VideoSelector}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    {mp4VideoUploading
                      ? `上传中... ${mp4VideoUploadProgress}%`
                      : '上传 MP4 视频'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 px-3 text-xs'
                    onClick={openMp4VideoLibrary}
                    disabled={
                      movVideoUploading ||
                      webmVideoUploading ||
                      mp4VideoUploading
                    }
                  >
                    素材库
                  </Button>
                </div>
              </div>
            )}
            {mp4VideoUploading && (
              <div className='text-xs text-gray-500 text-right'>
                上传进度 {mp4VideoUploadProgress}%
              </div>
            )}
          </div>
        )}
        {typeof videoBgConfig !== 'undefined' && (
          <div className='flex flex-col gap-2 text-xs text-gray-600'>
            <div className='flex items-center justify-between gap-2'>
              <span className='whitespace-nowrap'>填充方式</span>
              <Select
                value={videoBgConfig?.objectFit || 'cover'}
                onValueChange={value =>
                  updateVideoConfig({
                    objectFit: value as VideoBgConfig['objectFit'],
                  })
                }
              >
                <SelectTrigger className='h-7 w-[140px] text-xs'>
                  <SelectValue placeholder='选择模式' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='cover'>填充裁剪</SelectItem>
                  <SelectItem value='contain'>完整展示</SelectItem>
                  <SelectItem value='fill'>拉伸填满</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center justify-between gap-2'>
              <span className='whitespace-nowrap'>循环播放</span>
              <Switch
                checked={videoBgConfig?.loop !== false}
                onCheckedChange={checked =>
                  updateVideoConfig({ loop: checked })
                }
              />
            </div>
            <div className='flex items-center justify-between gap-2'>
              <span className='whitespace-nowrap'>静音</span>
              <Switch
                checked={videoBgConfig?.muted !== false}
                onCheckedChange={checked =>
                  updateVideoConfig({ muted: checked })
                }
              />
            </div>
            <div className='flex flex-col gap-2'>
              <div className='flex items-center justify-between'>
                <span>透明度</span>
                <span>
                  {draggingVideoOpacity ??
                    Math.round((videoBgConfig?.opacity ?? 1) * 100)}
                  %
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                value={[
                  draggingVideoOpacity ??
                    Math.round((videoBgConfig?.opacity ?? 1) * 100),
                ]}
                onValueChange={values => {
                  setDraggingVideoOpacity(values[0]);
                }}
                onValueCommit={values => {
                  const opacity = values[0] / 100;
                  setDraggingVideoOpacity(null);
                  updateVideoConfig({
                    opacity: opacity === 1 ? undefined : opacity,
                  });
                }}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <div className='text-xs font-medium text-gray-700'>视频封面</div>
              {videoBgConfig?.posterUrl ? (
                <div className='relative overflow-hidden rounded-md border border-gray-200'>
                  <img
                    src={cdnApi(videoBgConfig.posterUrl)}
                    alt='视频封面'
                    className='aspect-video w-full object-cover'
                  />
                  <div className='absolute top-2 right-2 flex gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 px-2 text-xs'
                      onClick={openPosterSelector}
                      disabled={
                        movVideoUploading ||
                        webmVideoUploading ||
                        mp4VideoUploading ||
                        extractingPoster
                      }
                    >
                      更换
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 px-2 text-xs text-red-500 hover:text-red-600'
                      onClick={() => {
                        updateVideoConfig({ posterUrl: undefined });
                      }}
                      disabled={
                        movVideoUploading ||
                        webmVideoUploading ||
                        mp4VideoUploading ||
                        extractingPoster
                      }
                    >
                      移除
                    </Button>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 p-4'>
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7 px-3 text-xs'
                      onClick={openPosterSelector}
                      disabled={
                        movVideoUploading ||
                        webmVideoUploading ||
                        mp4VideoUploading ||
                        extractingPoster
                      }
                    >
                      选择封面图片
                    </Button>
                    {(videoBgConfig?.mp4VideoUrl ||
                      videoBgConfig?.movVideoUrl ||
                      videoBgConfig?.webmVideoUrl) && (
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-7 px-3 text-xs'
                        onClick={handleExtractPosterFromVideo}
                        disabled={
                          movVideoUploading ||
                          webmVideoUploading ||
                          mp4VideoUploading ||
                          extractingPoster ||
                          videoDuration === null
                        }
                      >
                        {extractingPoster ? '提取中...' : '从视频提取'}
                      </Button>
                    )}
                  </div>
                  {/* 时间选择器 */}
                  {(videoBgConfig?.mp4VideoUrl ||
                    videoBgConfig?.movVideoUrl ||
                    videoBgConfig?.webmVideoUrl) &&
                    videoDuration !== null && (
                      <div className='w-full flex flex-col gap-2'>
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-gray-600'>选择提取时间</span>
                          <span className='text-gray-700 font-medium'>
                            {formatTime(posterExtractTime)} /{' '}
                            {formatTime(videoDuration)}
                          </span>
                        </div>
                        <Slider
                          min={0}
                          max={Math.floor(videoDuration)}
                          step={0.1}
                          value={[posterExtractTime]}
                          onValueChange={values => {
                            setPosterExtractTime(values[0]);
                          }}
                          disabled={
                            movVideoUploading ||
                            webmVideoUploading ||
                            mp4VideoUploading ||
                            extractingPoster
                          }
                        />
                      </div>
                    )}
                  {extractingPoster && (
                    <div className='text-xs text-gray-500'>
                      正在从视频第 {formatTime(posterExtractTime)} 秒提取帧...
                    </div>
                  )}
                </div>
              )}
              {/* 有封面时也显示从视频提取选项 */}
              {videoBgConfig?.posterUrl &&
                (videoBgConfig?.mp4VideoUrl ||
                  videoBgConfig?.movVideoUrl ||
                  videoBgConfig?.webmVideoUrl) && (
                  <div className='flex flex-col gap-2'>
                    {/* 时间选择器 */}
                    {videoDuration !== null && (
                      <div className='flex flex-col gap-2'>
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-gray-600'>选择提取时间</span>
                          <span className='text-gray-700 font-medium'>
                            {formatTime(posterExtractTime)} /{' '}
                            {formatTime(videoDuration)}
                          </span>
                        </div>
                        <Slider
                          min={0}
                          max={Math.floor(videoDuration)}
                          step={0.1}
                          value={[posterExtractTime]}
                          onValueChange={values => {
                            setPosterExtractTime(values[0]);
                          }}
                          disabled={
                            movVideoUploading ||
                            webmVideoUploading ||
                            mp4VideoUploading ||
                            extractingPoster
                          }
                        />
                      </div>
                    )}
                    <div className='flex justify-end'>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-6 px-2 text-xs text-gray-500'
                        onClick={handleExtractPosterFromVideo}
                        disabled={
                          movVideoUploading ||
                          webmVideoUploading ||
                          mp4VideoUploading ||
                          extractingPoster ||
                          videoDuration === null
                        }
                      >
                        {extractingPoster
                          ? `提取中... (${formatTime(posterExtractTime)})`
                          : '重新从视频提取'}
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </ToggleItem>
  );
}
