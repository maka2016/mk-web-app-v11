import { Mail, Tag, User } from 'lucide-react';
import { EnvelopeConfig } from '../../../Envelope/types';
import { cdnApi } from '@/services';

interface EnvelopeInfoCardProps {
  envelopeConfig: EnvelopeConfig | null | undefined;
  envelopeEnabled?: boolean;
  envelopeName?: string;
  envelopeAuthor?: string;
  envelopeCover?: string;
  className?: string;
}

export default function EnvelopeInfoCard({
  envelopeConfig,
  envelopeEnabled,
  envelopeName,
  envelopeAuthor,
  envelopeCover,
  className = '',
}: EnvelopeInfoCardProps) {
  if (!envelopeEnabled || !envelopeConfig) {
    return (
      <div
        className={`flex-shrink-0 p-2 bg-gray-50 rounded-lg border border-gray-200 ${className}`}
      >
        <div className='flex items-center gap-1.5 text-sm text-gray-500'>
          <Mail className='w-3.5 h-3.5' />
          <span>当前未应用信封</span>
        </div>
      </div>
    );
  }

  const coverUrl = envelopeCover || envelopeConfig.backgroundImage;

  return (
    <div
      className={`flex-shrink-0 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 ${className}`}
    >
      {/* 封面预览 */}
      {coverUrl && (
        <div className='mb-2 rounded overflow-hidden border border-blue-200'>
          <img
            src={cdnApi(coverUrl, { resizeWidth: 200, format: 'webp' })}
            alt='信封封面'
            className='w-full h-24 object-cover'
          />
        </div>
      )}

      {/* 第一行：信封名称和作者 */}
      <div className='flex items-center justify-between mb-1'>
        <div className='flex items-center gap-1.5'>
          <Mail className='w-3.5 h-3.5 text-blue-600' />
          <span className='text-sm font-medium text-gray-900'>
            {envelopeName || '已应用信封'}
          </span>
        </div>
        {envelopeAuthor && (
          <div className='flex items-center gap-1'>
            <User className='w-3 h-3 text-gray-500' />
            <span className='text-xs text-gray-600'>{envelopeAuthor}</span>
          </div>
        )}
      </div>

      {/* 配置状态 */}
      <div className='flex items-center gap-1 mt-1'>
        <Tag className='w-3 h-3 text-gray-500' />
        <span className='px-1.5 py-0.5 text-xs bg-white text-blue-700 rounded-full border border-blue-200'>
          已启用
        </span>
        {envelopeConfig.enableConfetti !== false && (
          <span className='px-1.5 py-0.5 text-xs bg-white text-purple-700 rounded-full border border-purple-200'>
            撒花动画
          </span>
        )}
      </div>
    </div>
  );
}
