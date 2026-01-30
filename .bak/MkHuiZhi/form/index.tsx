import React from 'react';
// import { MkPinTuProps } from "../shared"

import './index.module.scss';

import { useWorksStore } from '@/components/GridEditorV3/works-store/store/hook';
import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import { Icon } from '@workspace/ui/components/Icon';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import ColorSetting from './colorSetting';
import MkHuiZhiSetting from './setting';

interface Props {
  onFormValueChange: (values: any) => void;
  formControledValues: any;
  compAttrsMap: Record<string, LayerElemItem | null>;
}

const MkHuiZhiForm: React.FC<Props> = props => {
  const { onFormValueChange, formControledValues, compAttrsMap } = props;
  const worksStore = useWorksStore();

  const showEditingPanel = () => {
    ShowDrawerV2({
      children: ({ close }) => (
        <MkHuiZhiSetting
          compAttrsMap={compAttrsMap as any}
          onClose={close}
          onFormValueChange={onFormValueChange}
          formControledValues={formControledValues}
          onChange={data => {
            worksStore?.changeCompAttr(data.MkBulletScreen_v2?.elemId || '', {
              ...data.MkBulletScreen_v2?.attrs,
            });
            worksStore?.changeCompAttr(data.MkGift?.elemId || '', {
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
