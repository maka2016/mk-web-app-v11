import { Button } from '@workspace/ui/components/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { HelpCircle, Keyboard } from 'lucide-react';
import React from 'react';

interface ShortcutHelpProps {
  className?: string;
}

const ShortcutHelp: React.FC<ShortcutHelpProps> = ({
  className,
}) => {
  const shortcuts = [
    {
      category: '编辑操作',
      items: [
        { key: 'Delete/Backspace', description: '删除选中元素或行' },
        { key: 'Ctrl/Cmd + Z', description: '撤销' },
        { key: 'Ctrl/Cmd + Shift + Z', description: '重做' },
        { key: 'Ctrl/Cmd + Y', description: '重做 (Windows)' },
        { key: 'Ctrl/Cmd + C', description: '复制元素或行' },
        { key: 'Ctrl/Cmd + V', description: '粘贴' },
        { key: 'a / = / Shift + =', description: '添加元素' },
        { key: 'Shift + A', description: '元素打组' },
        { key: 'Shift + S', description: '元素取消打组' },
      ],
    },
    {
      category: '移动/选择操作',
      items: [
        { key: '↑/←', description: '向上/向左移动元素或行' },
        { key: '↓/→', description: '向下/向右移动元素或行' },
        { key: 'Esc / q', description: '选父级' },
      ],
    },
    {
      category: '模式切换',
      items: [{ key: 'Ctrl/Cmd + K', description: '切换到设计师模式' }],
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='justify-start w-full h-8 px-2'
          title='快捷键说明'
        >
          <HelpCircle size={12} />
          <span>快捷键</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-96 max-h-[80vh] overflow-y-auto'
        align='end'
        side='left'
        sideOffset={8}
        alignOffset={0}
      >
        <div className='flex items-center gap-2 mb-4 pb-2 border-b'>
          <Keyboard size={20} />
          <span className='font-semibold text-lg'>快捷键说明</span>
        </div>

        <div className='space-y-6'>
          {shortcuts.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h3 className='text-base font-semibold text-foreground mb-3 pb-2 border-b'>
                {category.category}
              </h3>
              <div className='space-y-3'>
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className='flex items-center gap-3'>
                    <kbd className='bg-muted border border-border rounded px-2 py-1 font-mono text-xs font-medium text-foreground min-w-fit text-center'>
                      {item.key}
                    </kbd>
                    <span className='text-sm text-muted-foreground leading-relaxed'>
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

};

export default ShortcutHelp;
