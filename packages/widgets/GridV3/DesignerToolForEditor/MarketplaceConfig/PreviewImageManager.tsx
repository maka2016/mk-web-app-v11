import { random } from '@mk/utils';
import type { WorksStore } from '@mk/works-store/store/WorksStore';
import type { TemplateShowcasePreviewImage } from '@mk/works-store/types/interface';
import { Button } from '@workspace/ui/components/button';
import { Star, Upload, X } from 'lucide-react';
import { observer } from 'mobx-react';
import React from 'react';
import toast from 'react-hot-toast';
import { useGridContext } from '../../comp/provider';
import { getImgInfo2 } from '../../shared/utils';

interface PreviewImageManagerProps {
  worksStore: WorksStore;
  images: TemplateShowcasePreviewImage[];
}

/**
 * 预览图管理器组件
 * 使用现有的图片选择器系统
 * 使用 observer 监听图片列表的变化
 */
export const PreviewImageManager: React.FC<PreviewImageManagerProps> = observer(
  ({ worksStore, images }) => {
    const { editorCtx } = useGridContext();

    // 添加图片 - 使用现有的图片选择器
    const handleAddImage = () => {
      if (images.length >= 9) {
        toast.error('最多只能添加 9 张预览图');
        return;
      }

      editorCtx?.utils.showSelector({
        onSelected: async (params: any) => {
          try {
            const { ossPath } = params;

            // 获取图片信息
            const imgInfo = await getImgInfo2(ossPath);

            // 构造数据
            const imageData: TemplateShowcasePreviewImage = {
              id: random(),
              url: ossPath,
              thumbnailUrl: ossPath,
              order: images.length,
              isCover: images.length === 0,
              width: imgInfo.baseWidth,
              height: imgInfo.baseHeight,
              uploadedAt: Date.now(),
            };

            // 添加到 WorksStore（自动保存）
            worksStore.templateShowcase.addPreviewImage(imageData);
            toast.success('图片添加成功');
          } catch {
            toast.error('图片加载失败');
          }
        },
        type: 'picture',
      } as any);
    };

    // 设置封面
    const handleSetCover = (imageId: string) => {
      worksStore.templateShowcase.setCoverImage(imageId);
      toast.success('封面设置成功');
    };

    // 删除图片
    const handleRemove = (imageId: string) => {
      if (window.confirm('确定要删除这张图片吗？')) {
        worksStore.templateShowcase.removePreviewImage(imageId);
        toast.success('图片已删除');
      }
    };

    return (
      <div className='space-y-2'>
        <div className='flex justify-between items-center'>
          <label className='text-xs font-medium text-gray-700'>
            预览图 ({images.length}/9)
          </label>
          {images.length < 9 && (
            <Button size='sm' variant='outline' onClick={handleAddImage}>
              <Upload className='h-3 w-3 mr-1' />
              添加
            </Button>
          )}
        </div>

        {images.length === 0 ? (
          <div className='border-2 border-dashed rounded p-4 text-center'>
            <p className='text-xs text-gray-400 mb-2'>还没有预览图</p>
            <Button size='sm' variant='outline' onClick={handleAddImage}>
              <Upload className='h-3 w-3 mr-1' />
              添加图片
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-4 gap-2'>
            {images.map(img => (
              <div
                key={img.id}
                className={`relative group border-2 rounded overflow-hidden aspect-[3/4] ${
                  img.isCover
                    ? 'border-yellow-500 ring-2 ring-yellow-500 ring-offset-2'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={img.thumbnailUrl}
                  alt='预览图'
                  className='w-full h-full object-cover'
                />

                {/* 封面标识 */}
                {img.isCover && (
                  <div className='absolute top-1 left-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-medium shadow-sm'>
                    <Star className='h-2.5 w-2.5 fill-current' />
                    封面
                  </div>
                )}

                {/* 操作按钮 */}
                <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-1'>
                  <div className='opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1'>
                    {!img.isCover && (
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() => handleSetCover(img.id)}
                        className='text-xs h-7 px-3 bg-white hover:bg-gray-100 text-gray-900'
                      >
                        <Star className='h-3 w-3 mr-1' />
                        设为封面
                      </Button>
                    )}
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => handleRemove(img.id)}
                      className='h-7 px-3 text-xs'
                    >
                      <X className='h-3 w-3 mr-1' />
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
