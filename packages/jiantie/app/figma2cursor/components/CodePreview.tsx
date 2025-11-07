'use client';

import React, { useState } from 'react';
import { Copy, Download, Eye, Code2, Check } from 'lucide-react';

interface CodePreviewProps {
  code: string;
  fullComponent: string;
  componentName: string;
}

export const CodePreview: React.FC<CodePreviewProps> = ({
  code,
  fullComponent,
  componentName,
}) => {
  const [activeTab, setActiveTab] = useState<'jsx' | 'full'>('jsx');
  const [copied, setCopied] = useState(false);

  const displayCode = activeTab === 'jsx' ? code : fullComponent;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullComponent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentName}.tsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!code && !fullComponent) {
    return (
      <div className='h-full flex flex-col items-center justify-center text-gray-400'>
        <Code2 className='w-16 h-16 mb-4' />
        <p className='text-lg font-medium'>代码将在此显示</p>
        <p className='text-sm mt-2'>从左侧导入 Figma 设计稿开始</p>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col'>
      <div className='flex items-center justify-between mb-4 pb-4 border-b'>
        <div className='flex gap-2'>
          <button
            onClick={() => setActiveTab('jsx')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'jsx'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className='flex items-center gap-2'>
              <Eye className='w-4 h-4' />
              JSX 片段
            </div>
          </button>
          <button
            onClick={() => setActiveTab('full')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'full'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className='flex items-center gap-2'>
              <Code2 className='w-4 h-4' />
              完整组件
            </div>
          </button>
        </div>

        <div className='flex gap-2'>
          <button
            onClick={handleCopy}
            className='flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors'
          >
            {copied ? (
              <>
                <Check className='w-4 h-4 text-green-500' />
                已复制
              </>
            ) : (
              <>
                <Copy className='w-4 h-4' />
                复制
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className='flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors'
          >
            <Download className='w-4 h-4' />
            下载
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-auto'>
        <pre className='bg-gray-50 p-6 rounded-lg text-sm font-mono leading-relaxed'>
          <code>{displayCode}</code>
        </pre>
      </div>

      <div className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
        <h3 className='text-sm font-medium text-blue-900 mb-2'>使用提示:</h3>
        <ul className='text-xs text-blue-700 space-y-1'>
          <li>• 生成的代码使用 Tailwind CSS 类，确保项目已配置 Tailwind</li>
          <li>• 使用 lucide-react 图标库（如需要）</li>
          <li>• 代码遵循 Next.js 15 + React 19 规范</li>
          <li>• 可以直接复制到项目中使用，或根据需要进行调整</li>
        </ul>
      </div>
    </div>
  );
};
