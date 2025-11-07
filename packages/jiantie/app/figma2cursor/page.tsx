'use client';

import React, { useState } from 'react';
import { FigmaImporter } from './components/FigmaImporter';
import { CodePreview } from './components/CodePreview';
import { Wand2 } from 'lucide-react';

export default function Figma2CursorPage() {
  const [importedCode, setImportedCode] = useState('');
  const [fullComponent, setFullComponent] = useState('');
  const [componentName, setComponentName] = useState('FigmaComponent');

  const handleImport = (code: string, full: string) => {
    setImportedCode(code);
    setFullComponent(full);
    // 从完整组件中提取组件名
    const match = full.match(/function\s+(\w+)/);
    if (match) {
      setComponentName(match[1]);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      {/* 头部 */}
      <div className='border-b bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-6 py-6'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-500 rounded-lg'>
              <Wand2 className='w-6 h-6 text-white' />
            </div>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>
                Figma to React Converter
              </h1>
              <p className='text-sm text-gray-600 mt-1'>
                将 Figma 设计稿智能转换为 React + Tailwind CSS 组件
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className='max-w-7xl mx-auto px-6 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]'>
          {/* 左侧：导入面板 */}
          <div className='bg-white rounded-xl shadow-lg overflow-hidden flex flex-col'>
            <FigmaImporter onImport={handleImport} />
          </div>

          {/* 右侧：代码预览 */}
          <div className='bg-white rounded-xl shadow-lg p-6 overflow-hidden flex flex-col'>
            <h2 className='text-2xl font-bold mb-4'>生成的代码</h2>
            <div className='flex-1 overflow-hidden'>
              <CodePreview
                code={importedCode}
                fullComponent={fullComponent}
                componentName={componentName}
              />
            </div>
          </div>
        </div>

        {/* 底部说明 */}
        <div className='mt-8 bg-white rounded-xl shadow-lg p-6'>
          <h3 className='text-lg font-bold mb-4'>如何使用</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold'>
                  1
                </div>
                <h4 className='font-semibold'>获取 Access Token</h4>
              </div>
              <p className='text-sm text-gray-600'>
                在 Figma 中进入 Settings → Account → Personal access
                tokens，创建新的 token
              </p>
            </div>
            <div>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold'>
                  2
                </div>
                <h4 className='font-semibold'>复制节点链接</h4>
              </div>
              <p className='text-sm text-gray-600'>
                在 Figma 中右键点击要转换的元素，选择 "Copy/Paste as" → "Copy
                link"
              </p>
            </div>
            <div>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold'>
                  3
                </div>
                <h4 className='font-semibold'>开始转换</h4>
              </div>
              <p className='text-sm text-gray-600'>
                粘贴 token 和链接，点击"开始转换"，即可生成 React 组件代码
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
