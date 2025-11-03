'use client';

import { useState } from 'react';

interface RichTextDisplayProps {
  content: string;
  format?: 'html' | 'markdown' | 'plain';
  maxHeight?: number;
  showExpandButton?: boolean;
}

export const RichTextDisplay: React.FC<RichTextDisplayProps> = ({
  content,
  format = 'html',
  maxHeight = 300,
  showExpandButton = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);

  const handleContentRef = (el: HTMLDivElement | null) => {
    if (el && showExpandButton) {
      const shouldShow = el.scrollHeight > maxHeight;
      setShouldShowButton(shouldShow);
    }
  };

  const renderContent = () => {
    switch (format) {
      case 'html':
        return (
          <div
            ref={handleContentRef}
            className='prose prose-sm max-w-none'
            style={{
              maxHeight: isExpanded ? 'none' : `${maxHeight}px`,
              overflow: 'hidden',
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      case 'markdown':
        // 简单的 markdown 转换（如果需要完整支持可以使用 react-markdown）
        const htmlContent = content
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*)\*/gim, '<em>$1</em>')
          .replace(/\n/g, '<br />');
        return (
          <div
            ref={handleContentRef}
            className='prose prose-sm max-w-none'
            style={{
              maxHeight: isExpanded ? 'none' : `${maxHeight}px`,
              overflow: 'hidden',
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        );
      case 'plain':
      default:
        return (
          <div
            ref={handleContentRef}
            className='whitespace-pre-wrap text-sm text-gray-700'
            style={{
              maxHeight: isExpanded ? 'none' : `${maxHeight}px`,
              overflow: 'hidden',
            }}
          >
            {content}
          </div>
        );
    }
  };

  if (!content) {
    return null;
  }

  return (
    <div className='relative'>
      {renderContent()}

      {/* 展开/收起按钮 */}
      {shouldShowButton && !isExpanded && (
        <div className='absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-2'>
          <button
            onClick={() => setIsExpanded(true)}
            className='px-4 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium bg-white border border-blue-200 rounded-full shadow-sm'
          >
            展开全文
          </button>
        </div>
      )}

      {shouldShowButton && isExpanded && (
        <div className='flex justify-center mt-4'>
          <button
            onClick={() => setIsExpanded(false)}
            className='px-4 py-1.5 text-sm text-gray-600 hover:text-gray-700 font-medium bg-white border border-gray-200 rounded-full shadow-sm'
          >
            收起
          </button>
        </div>
      )}
    </div>
  );
};
