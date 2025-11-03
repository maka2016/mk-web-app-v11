import React from 'react';
// import { MkPinTuProps } from "../shared"

import './index.module.scss';

import { EditorSDK, LayerElemItem } from '@mk/works-store/types';
import { Icon } from '@workspace/ui/components/Icon';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import ColorSetting from './colorSetting';
import MkHuiZhiSetting from './setting';

interface Props {
  onFormValueChange: (values: any) => void;
  formControledValues: any;
  compAttrsMap: Record<string, LayerElemItem | null>;
  editorSDK?: EditorSDK;
  editorCtx?: any;
}

const MkHuiZhiForm: React.FC<Props> = props => {
  const {
    onFormValueChange,
    formControledValues,
    compAttrsMap,
    editorSDK,
    editorCtx,
  } = props;

  const showEditingPanel = () => {
    ShowDrawerV2({
      children: ({ close }) => (
        <MkHuiZhiSetting
          editorSDK={editorSDK}
          editorCtx={editorCtx}
          compAttrsMap={compAttrsMap as any}
          onClose={close}
          onFormValueChange={onFormValueChange}
          formControledValues={formControledValues}
          onChange={data => {
            editorSDK?.changeCompAttr(data.MkBulletScreen_v2?.elemId || '', {
              ...data.MkBulletScreen_v2?.attrs,
            });
            editorSDK?.changeCompAttr(data.MkGift?.elemId || '', {
              ...data.MkGift?.attrs,
            });
          }}
        ></MkHuiZhiSetting>
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

  const showColorPanel = () => {
    ShowDrawerV2({
      children: ({ close }) => (
        <ColorSetting
          onFormValueChange={onFormValueChange}
          formControledValues={formControledValues}
        ></ColorSetting>
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
        onClick={() => showEditingPanel()}
      >
        <Icon name='shezhi' size={16} />
        <span className='text-xs flex-shrink-0'>设置</span>
      </div>

      {/* <div
        style={{
          padding: '0 12px',
        }}
        className='flex items-center gap-1'
        onClick={() => showColorPanel()}
      >
        <Icon name='shezhi' size={16} />
        <span className='text-xs flex-shrink-0'>颜色</span>
      </div> */}
    </div>
  );
};

export default MkHuiZhiForm;
