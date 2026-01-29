import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Component as ComponentIcon, ZoomIn } from 'lucide-react';
import { observer } from 'mobx-react';
import MaterialGroupSelector from '../../componentsForEditor/SettingPopoverDesigner/MaterialGroupSelector';
import ChangePictureButton from '../../componentsForEditor/SettingPopoverUser/ChangePictureButton';
import { useWorksStore } from '../../works-store/store/hook';
import { BtnLite } from '../style-comps';
import ChangeScaleHelper from './ChangeScaleHelper';

function PictureEditV3Pop({
  layer,
  onUpdate,
}: {
  layer: any;
  onUpdate?: () => void;
}) {
  const worksStore = useWorksStore();
  const fullStack = worksStore.fullStack;
  const { materialResourcesGroup } = worksStore.worksData.gridProps;

  return (
    <>
      {fullStack && (
        <Popover>
          <PopoverTrigger asChild>
            <BtnLite>
              <ComponentIcon size={20} />
            </BtnLite>
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
        layer={layer}
        hasMaterialGroup={!!layer.attrs.materialGroupRefId}
        variant='row'
        iconSize={20}
      />

      <ChangeScaleHelper
        layer={layer}
        trigger={
          <BtnLite>
            <ZoomIn size={20} />
          </BtnLite>
        }
        onUpdate={onUpdate}
        onChange={(elemId, nextVal) => {
          worksStore.changeCompAttr(layer.elemId, nextVal);
          onUpdate?.();
        }}
      />
    </>
  );
}

export default observer(PictureEditV3Pop);
