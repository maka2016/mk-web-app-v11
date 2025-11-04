'use client';

import { useRouter } from 'next/navigation';

interface Props {}

export default function Main({ appid }: Props) {
  const router = useRouter();

  return (
    <div className='flex flex-col h-dvh bg-gray-50'>
      {/* 头部 */}
      <div className='flex items-center justify-between px-4 py-3 bg-white border-b'>
        <h1 className='text-lg font-semibold'>Chanel2 页面</h1>
        <div className='text-sm text-gray-500'>AppID: {appid}</div>
      </div>

      {/* 主内容区 */}
      <div className='flex-1 overflow-y-auto p-4'>
        <div className='bg-white rounded-lg shadow-sm p-6'>
          <h2 className='text-xl font-bold mb-4'>欢迎来到 Chanel2</h2>
          <p className='text-gray-600 mb-4'>
            这是一个新的组件目录，你可以在这里开始开发你的功能。
          </p>
          <div className='space-y-2'>
            <div className='p-3 bg-blue-50 rounded-md'>
              <p className='text-sm text-blue-800'>
                📁 使用 Tailwind CSS 进行样式开发
              </p>
            </div>
            <div className='p-3 bg-green-50 rounded-md'>
              <p className='text-sm text-green-800'>
                ⚛️ React 19 + Next.js 15 App Router
              </p>
            </div>
            <div className='p-3 bg-purple-50 rounded-md'>
              <p className='text-sm text-purple-800'>
                📱 移动端优先的响应式设计
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作栏（可选） */}
      <div className='flex items-center justify-center gap-4 p-4 bg-white border-t'>
        <button
          onClick={() => router.back()}
          className='px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
        >
          返回
        </button>
        <button className='px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'>
          开始使用
        </button>
      </div>
    </div>
  );
}
