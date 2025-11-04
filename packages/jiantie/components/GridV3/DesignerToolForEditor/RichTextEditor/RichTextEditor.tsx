import type { TemplateShowcaseRichText } from '@mk/works-store/types/interface';
import React, { useCallback, useState } from 'react';

interface RichTextEditorProps {
  value: TemplateShowcaseRichText;
  onChange: (value: TemplateShowcaseRichText) => void;
  maxLength?: number;
  placeholder?: string;
}

/**
 * 简单的富文本编辑器组件
 * P0版本：使用textarea实现，支持基本的文本编辑和字数统计
 * 后续可升级为完整的富文本编辑器（Tiptap/Lexical）
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  maxLength = 5000,
  placeholder = '请输入描述内容...',
}) => {
  const [content, setContent] = useState(value.plainText);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);

      // 更新富文本数据
      onChange({
        format: 'html',
        content: `<p>${newContent.replace(/\n/g, '</p><p>')}</p>`,
        plainText: newContent,
      });
    },
    [onChange]
  );

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className='space-y-2'>
      {/* 简化的工具栏 - P0版本暂时隐藏 */}
      {/* <div className='flex gap-1 p-2 border-b'>
        <Button variant='ghost' size='sm' disabled>
          <Bold className='h-4 w-4' />
        </Button>
        <Button variant='ghost' size='sm' disabled>
          <Italic className='h-4 w-4' />
        </Button>
        <Button variant='ghost' size='sm' disabled>
          <List className='h-4 w-4' />
        </Button>
        <Button variant='ghost' size='sm' disabled>
          <ListOrdered className='h-4 w-4' />
        </Button>
        <Button variant='ghost' size='sm' disabled>
          <LinkIcon className='h-4 w-4' />
        </Button>
      </div> */}

      {/* 文本编辑区域 */}
      <div className='relative'>
        <textarea
          value={content}
          onChange={handleChange}
          placeholder={placeholder}
          className='w-full min-h-[200px] p-3 border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500'
          style={{
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        />
      </div>

      {/* 字数统计 */}
      <div className='flex justify-between text-sm'>
        <span className={isOverLimit ? 'text-red-500' : 'text-gray-500'}>
          {characterCount} / {maxLength} 字符
        </span>
        {isOverLimit && (
          <span className='text-red-500 font-medium'>超出字数限制</span>
        )}
      </div>
    </div>
  );
};
