import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Component as ComponentIcon, Square } from 'lucide-react';
import { useState } from 'react';
import { useGridContext } from '../../../comp/provider';
import { BtnLite } from '../../../shared/style-comps';
import MaterialGroupSelector from '../SettingPopoverV2/MaterialGroupSelector';
import { TagPicker } from '../SettingPopoverV2/TagPicker';
import ChangePictureButton from './ChangePictureButton';

const TagPickerPopoverForPicture = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BtnLite
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Square size={20} />
        <span>边框</span>
      </BtnLite>
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

export default function PictureEditV3Pop({ layer }: { layer: any }) {
  const { editorSDK, fullStack, materialResourcesGroup } = useGridContext();
  const layerId = layer.elemId;

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
                editorSDK?.changeCompAttr(layer.elemId, {
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
    </>
  );
}
