'use client';

import { Button } from '@workspace/ui/components/button';
import { ArrowLeft, FileQuestion, Home } from 'lucide-react';

export default function EventNotFound() {
  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-4 py-12'>
      <div className='w-full max-w-md text-center'>
        {/* 图标容器 */}
        <div className='mb-8 flex justify-center'>
          <div className='relative'>
            {/* 主图标 */}
            <div className='flex h-24 w-24 items-center justify-center rounded-full bg-muted'>
              <FileQuestion className='h-12 w-12 text-muted-foreground' />
            </div>
            {/* 装饰性圆圈 */}
            <div className='absolute -right-2 -top-2 h-8 w-8 rounded-full bg-primary/20' />
            <div className='absolute -bottom-2 -left-2 h-6 w-6 rounded-full bg-primary/10' />
          </div>
        </div>

        {/* 错误代码 */}
        <h1 className='mb-4 text-6xl font-bold text-foreground'>404</h1>

        {/* 主标题 */}
        <h2 className='mb-3 text-2xl font-semibold text-foreground'>
          活动未找到
        </h2>

        {/* 描述文字 */}
        <p className='mb-8 text-base text-muted-foreground leading-relaxed'>
          抱歉，您访问的页面不存在或已被删除。
          <br />
          请检查链接是否正确，或返回首页浏览其他内容。
        </p>

        {/* 操作按钮组 */}
        <div className='flex flex-col gap-3 sm:flex-row sm:justify-center'>
          <Button
            variant='outline'
            size='lg'
            onClick={handleGoBack}
            className='w-full sm:w-auto'
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            返回上一页
          </Button>
          <Button
            variant='default'
            size='lg'
            onClick={handleGoHome}
            className='w-full sm:w-auto'
          >
            <Home className='mr-2 h-4 w-4' />
            回到首页
          </Button>
        </div>

        {/* 底部提示 */}
        <p className='mt-8 text-sm text-muted-foreground'>
          如果问题持续存在，请联系客服获取帮助
        </p>
      </div>
    </div>
  );
}
