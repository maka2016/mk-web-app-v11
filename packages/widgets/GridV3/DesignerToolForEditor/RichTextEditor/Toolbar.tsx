import { Button } from '@workspace/ui/components/button';
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Underline,
} from 'lucide-react';
import React from 'react';

interface ToolbarProps {
  onCommand: (command: string) => void;
}

/**
 * 富文本编辑器工具栏
 * P0版本：占位组件，后续实现完整功能
 */
export const Toolbar: React.FC<ToolbarProps> = ({ onCommand }) => {
  return (
    <div className='flex gap-1 p-2 border-b bg-gray-50'>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => onCommand('bold')}
        title='粗体'
      >
        <Bold className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => onCommand('italic')}
        title='斜体'
      >
        <Italic className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => onCommand('underline')}
        title='下划线'
      >
        <Underline className='h-4 w-4' />
      </Button>
      <div className='w-px h-6 bg-gray-300 mx-1' />
      <Button
        variant='ghost'
        size='sm'
        onClick={() => onCommand('bulletList')}
        title='无序列表'
      >
        <List className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => onCommand('orderedList')}
        title='有序列表'
      >
        <ListOrdered className='h-4 w-4' />
      </Button>
      <div className='w-px h-6 bg-gray-300 mx-1' />
      <Button
        variant='ghost'
        size='sm'
        onClick={() => onCommand('link')}
        title='插入链接'
      >
        <LinkIcon className='h-4 w-4' />
      </Button>
    </div>
  );
};
