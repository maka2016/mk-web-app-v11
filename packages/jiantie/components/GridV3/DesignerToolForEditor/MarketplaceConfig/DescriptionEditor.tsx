import type { WorksStore } from '@mk/works-store/store/WorksStore';
import type { TemplateShowcaseRichText } from '@mk/works-store/types/interface';
import { observer } from 'mobx-react';
import React from 'react';
import { RichTextEditor } from '../RichTextEditor';

interface DescriptionEditorProps {
  worksStore: WorksStore;
  description: TemplateShowcaseRichText;
}

/**
 * 描述编辑器组件
 * 使用 observer 监听描述变化
 */
export const DescriptionEditor: React.FC<DescriptionEditorProps> = observer(
  ({ worksStore, description }) => {
    const handleChange = (newDescription: TemplateShowcaseRichText) => {
      worksStore.templateShowcase.updateDescription(newDescription);
    };

    return (
      <div className='space-y-1.5'>
        <label className='text-xs font-medium text-gray-700'>展示描述</label>
        <RichTextEditor
          value={description}
          onChange={handleChange}
          maxLength={5000}
          placeholder='输入模板描述...'
        />
      </div>
    );
  }
);
