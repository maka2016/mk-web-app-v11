'use client';

import WebsiteApp from '@/components/GridViewer/website';
import { safeCopy } from '@/utils';
import { Copy } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type WebsiteAppProps = React.ComponentProps<typeof WebsiteApp>;

/**
 * 桌面端查看器包装组件
 * 在桌面端显示手机外壳和二维码，移动端保持原样
 */
export default function DesktopViewerWrapper(props: WebsiteAppProps) {
  const { worksDetail } = props;
  const [isDesktop, setIsDesktop] = useState(false);
  const [shareUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  });

  useEffect(() => {
    // 客户端判断是否为桌面端（宽度 >= 768px）
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);

    return () => {
      window.removeEventListener('resize', checkIsDesktop);
    };
  }, []);

  // 判断是否为截图模式或视频录制模式
  const isScreenshot = !!props.query?.screenshot;
  const isVideoMode = !!props.query?.video_mode;
  const isPoster = worksDetail?.specInfo?.export_format?.includes('image');

  // 移动端、截图模式或视频录制模式：直接渲染 WebsiteApp，保持原有逻辑
  if (!isDesktop || isScreenshot || isVideoMode || isPoster) {
    return <WebsiteApp {...props} />;
  }

  // 桌面端：显示手机外壳包裹的预览和二维码
  return (
    <div className='flex min-h-screen w-full items-center justify-center bg-gray-100 p-8'>
      <div className='flex max-w-[1400px] items-center gap-12'>
        {/* 左侧：手机外壳包裹的预览区域 */}
        <div className='flex-shrink-0'>
          {/* 手机外壳 - 1:2 比例 (宽度:高度) */}
          <div
            className='relative mx-auto'
            style={{
              width: '375px',
              height: '750px', // 1:2 比例
            }}
          >
            {/* 手机外壳外层装饰 */}
            <div className='absolute inset-0 rounded-[3rem] bg-gray-900 p-2 shadow-2xl'>
              {/* 手机屏幕区域（留出边框和内边距） */}
              <div className='relative h-full w-full overflow-hidden rounded-[2.5rem] bg-black'>
                {/* 顶部刘海区域（模拟真实手机） */}
                <div className='absolute top-0 z-10 h-12 w-full bg-black'>
                  <div className='absolute left-1/2 top-4 h-6 w-32 -translate-x-1/2 rounded-full bg-gray-900' />
                </div>
                {/* 预览内容区域 */}
                <div
                  className='h-full w-full overflow-auto pt-12'
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <WebsiteApp {...props} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：二维码和说明 */}
        <div className='flex flex-shrink-0 flex-col items-center gap-6'>
          <div className='text-center'>
            <h2 className='mb-2 text-2xl font-semibold text-gray-900'>
              扫码查看
            </h2>
            <p className='text-sm text-gray-600'>
              使用手机扫描二维码，在移动端查看完整效果
            </p>
          </div>
          <div className='rounded-lg bg-white p-6 shadow-lg'>
            {shareUrl && <QRCodeCanvas value={shareUrl} size={240} level='H' />}
          </div>
          {/* 链接显示和复制区域 */}
          <div className='w-full max-w-sm'>
            <div className='mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3'>
              <p className='flex-1 break-all text-xs text-gray-700'>
                {shareUrl}
              </p>
              <button
                onClick={() => {
                  if (shareUrl) {
                    safeCopy(shareUrl);
                    toast.success('链接已复制');
                  }
                }}
                className='flex-shrink-0 rounded p-2 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900'
                title='复制链接'
              >
                <Copy className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
