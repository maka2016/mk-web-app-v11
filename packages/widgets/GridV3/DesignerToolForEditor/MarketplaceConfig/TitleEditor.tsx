import type { WorksStore } from '@mk/works-store/store/WorksStore';
import { Input } from '@workspace/ui/components/input';
import { observer } from 'mobx-react';
import React, { useCallback, useState } from 'react';

interface TitleEditorProps {
  worksStore: WorksStore;
  title: string;
}

/**
 * 标题编辑器组件
 * 使用 observer 监听标题变化
 */
export const TitleEditor: React.FC<TitleEditorProps> = observer(
  ({ worksStore, title: initialTitle }) => {
    const [title, setTitle] = useState(initialTitle);
    const [error, setError] = useState('');

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);

        // 验证标题
        if (newTitle.length === 0) {
          setError('标题不能为空');
        } else if (newTitle.length > 100) {
          setError('标题不能超过100字符');
        } else {
          setError('');
          // 更新 WorksStore
          worksStore.templateShowcase.updateTitle(newTitle);
        }
      },
      [worksStore]
    );

    const characterCount = title.length;

    return (
      <div className='space-y-1.5'>
        <div className='flex justify-between items-center'>
          <label className='text-xs font-medium text-gray-700'>展示标题</label>
          <span className='text-xs text-gray-400'>{characterCount}/100</span>
        </div>
        <Input
          value={title}
          onChange={handleChange}
          placeholder='输入标题（必填）'
          className='w-full h-8 text-sm'
        />
        {error && <p className='text-xs text-red-500'>{error}</p>}
      </div>
    );
  }
);
