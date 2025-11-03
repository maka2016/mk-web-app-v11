'use client';

import { Clock, Eye, User } from 'lucide-react';
import { ImageCarousel } from './ImageCarousel';
import { RichTextDisplay } from './RichTextDisplay';

interface DetailContentProps {
  showcaseInfo?: {
    displayTitle: string;
    displayDescription: {
      format: 'html' | 'markdown';
      content: string;
      plainText: string;
    };
    previewImages: Array<{
      id: string;
      url: string;
      thumbnailUrl: string;
      order: number;
      isCover: boolean;
      width?: number;
      height?: number;
      uploadedAt: number;
    }>;
    enabled: boolean;
  };
  worksDetail?: {
    title: string;
    cover: string;
    created_at?: string;
    view_count?: number;
    designer_name?: string;
    designer_uid?: string;
  };
}

export const DetailContent: React.FC<DetailContentProps> = ({
  showcaseInfo,
  worksDetail,
}) => {
  // 如果有 showcaseInfo 且启用了商城展示，使用 showcaseInfo
  const useShowcase =
    showcaseInfo?.enabled && showcaseInfo.previewImages.length > 0;

  // 准备图片数据 - 封面图始终排在第一位
  const images = useShowcase
    ? (() => {
        const sortedImages = [...showcaseInfo.previewImages].sort(
          (a, b) => a.order - b.order
        );
        // 找到封面图
        const coverIndex = sortedImages.findIndex(img => img.isCover);
        if (coverIndex > 0) {
          // 如果封面图不在第一位，将其移到最前面
          const coverImage = sortedImages.splice(coverIndex, 1)[0];
          sortedImages.unshift(coverImage);
        }
        return sortedImages.map(img => ({
          url: img.url,
          alt: showcaseInfo.displayTitle || worksDetail?.title || '模板预览',
        }));
      })()
    : worksDetail?.cover
      ? [{ url: worksDetail.cover, alt: worksDetail.title }]
      : [];

  // 标题
  const title = useShowcase
    ? showcaseInfo.displayTitle
    : worksDetail?.title || '模板详情';

  // 描述内容
  const hasDescription = useShowcase && showcaseInfo.displayDescription.content;

  // 格式化时间
  const formatDate = (timestamp?: string | number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className='flex flex-col h-full bg-white'>
      {/* 图片轮播区域 - 固定在顶部 */}
      <div className='flex-shrink-0'>
        <ImageCarousel images={images} />
      </div>

      {/* 内容区域 - 可滚动 */}
      <div
        className='flex-1 overflow-auto'
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className='p-4 space-y-4'>
          {/* 标题 */}
          <h1 className='text-xl font-semibold text-gray-900 leading-tight'>
            {title}
          </h1>

          {/* 元信息 */}
          <div className='flex items-center gap-4 text-sm text-gray-500'>
            {worksDetail?.designer_name && (
              <div className='flex items-center gap-1'>
                <User className='w-4 h-4' />
                <span>{worksDetail.designer_name}</span>
              </div>
            )}
            {worksDetail?.view_count !== undefined && (
              <div className='flex items-center gap-1'>
                <Eye className='w-4 h-4' />
                <span>{worksDetail.view_count}</span>
              </div>
            )}
            {worksDetail?.created_at && (
              <div className='flex items-center gap-1'>
                <Clock className='w-4 h-4' />
                <span>{formatDate(worksDetail.created_at)}</span>
              </div>
            )}
          </div>

          {/* 分割线 */}
          {hasDescription && <div className='border-t border-gray-100' />}

          {/* 富文本描述 */}
          {hasDescription && (
            <div className='py-2'>
              <RichTextDisplay
                content={showcaseInfo.displayDescription.content}
                format={showcaseInfo.displayDescription.format}
                maxHeight={300}
                showExpandButton={true}
              />
            </div>
          )}

          {/* 占位，确保底部有足够空间 */}
          <div className='h-20' />
        </div>
      </div>
    </div>
  );
};
