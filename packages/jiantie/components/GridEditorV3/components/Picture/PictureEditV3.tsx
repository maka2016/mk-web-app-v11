import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Component as ComponentIcon, Crop, Square } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import MaterialGroupSelector from '../../componentsForEditor/SettingPopoverDesigner/MaterialGroupSelector';
import { TagPicker } from '../../componentsForEditor/SettingPopoverDesigner/TagPicker';
import ChangePictureButton from '../../componentsForEditor/SettingPopoverUser/ChangePictureButton';
import { useWorksStore } from '../../works-store/store/hook';
import { BtnLiteColumn } from '../style-comps';
import ChangeScaleHelper from './ChangeScaleHelper';

const TagPickerPopoverForPicture = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BtnLiteColumn
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <div className='border_icon'>
          <Square size={16} />
        </div>
        <span>边框</span>
      </BtnLiteColumn>
      <ResponsiveDialog isOpen={open} onOpenChange={setOpen} title='图片边框'>
        <TagPicker
          replaceMode={true}
          noTitle={true}
          onClose={() => {
            setOpen(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
};

function PictureEditV3({
  layer,
  onUpdate,
}: {
  layer: any;
  onUpdate?: () => void;
}) {
  const worksStore = useWorksStore();
  const { fullStack, setWidgetStateV2 } = worksStore;
  const { materialResourcesGroup } = worksStore.worksData.gridProps;

  return (
    <>
      {fullStack && (
        <Popover>
          <PopoverTrigger asChild>
            <BtnLiteColumn direction='column'>
              <div className='border_icon'>
                <ComponentIcon size={16} />
              </div>
              <span>素材</span>
            </BtnLiteColumn>
          </PopoverTrigger>
          <PopoverContent>
            <MaterialGroupSelector
              activeGroupId={layer.attrs.materialGroupRefId}
              materialGroup={materialResourcesGroup?.pic}
              onSelect={group => {
                worksStore.changeCompAttr(layer.elemId, {
                  materialGroupRefId: group.id,
                });
              }}
            />
          </PopoverContent>
        </Popover>
      )}
      <ChangePictureButton
        hasMaterialGroup={!!layer.attrs.materialGroupRefId}
        layer={layer}
        variant='column'
        iconSize={16}
      />
      <BtnLiteColumn
        onClick={() => {
          setWidgetStateV2({
            imageEditingOpen: true,
          });
        }}
      >
        <div className='border_icon'>
          <Crop size={16} />
        </div>
        <span>裁切</span>
      </BtnLiteColumn>

      {fullStack && <TagPickerPopoverForPicture />}
      <ChangeScaleHelper
        layer={layer}
        onUpdate={onUpdate}
        onChange={(elemId, nextVal) => {
          worksStore.changeCompAttr(layer.elemId, nextVal);
          onUpdate?.();
        }}
      />
    </>
  );
}

export default observer(PictureEditV3);
