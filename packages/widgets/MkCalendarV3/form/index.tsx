import { EditorSDK } from '@mk/works-store/types';
import { Icon } from '@workspace/ui/components/Icon';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import React from 'react';
import './index.module.scss';
import MarkSetting from './markSetting';

interface Props {
  onFormValueChange: (values: any) => void;
  formControledValues: any;
  editorSDK?: EditorSDK;
  editorCtx?: any;
}

const MkCalendarV3Form: React.FC<Props> = props => {
  const { onFormValueChange, formControledValues } = props;

  const showColorPanel = () => {
    ShowDrawerV2({
      title: '设置',
      showCloseIcon: true,
      children: ({ close }) => (
        <MarkSetting
          formControledValues={formControledValues}
          onFormValueChange={onFormValueChange}
        />
      ),
      showOverlay: false,
      handleOnly: true,
      contentProps: {
        style: {
          pointerEvents: 'auto',
        },
      },
    });
  };

  return (
    <div className='flex items-center'>
      <div
        style={{
          padding: '0 12px',
        }}
        className='flex items-center gap-1'
        onClick={() => showColorPanel()}
      >
        <Icon name='shezhi' size={16} />
        <span className='text-xs flex-shrink-0'>设置</span>
      </div>
    </div>
  );
};

export default MkCalendarV3Form;
