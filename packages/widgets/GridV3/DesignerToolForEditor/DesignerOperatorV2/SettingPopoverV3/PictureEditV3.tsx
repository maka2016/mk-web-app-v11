import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Component as ComponentIcon, Crop, Square } from 'lucide-react';
import { useState } from 'react';
import { useGridContext } from '../../../comp/provider';
import { getCanvaInfo2 } from '../../../comp/provider/utils';
import { BtnLiteColumn } from '../../../shared/style-comps';
import MaterialGroupSelector from '../SettingPopoverV2/MaterialGroupSelector';
import { TagPicker } from '../SettingPopoverV2/TagPicker';
import ChangePictureButton from './ChangePictureButton';

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

export default function PictureEditV3({ layer }: { layer: any }) {
  const { editorSDK, fullStack, materialResourcesGroup } = useGridContext();
  const [showMaterialManagerSelector, setShowMaterialManagerSelector] =
    useState(false);
  const layerId = layer.elemId;

  const step = 5;

  const getImgWidth = () => {
    if (layer.attrs.layoutStyle.width) {
      return layer.attrs.layoutStyle.width;
    }
    const imgDOM = document.querySelector(
      `[data-image-id="${layerId}"]`
    ) as HTMLImageElement;
    const scaleRate = getCanvaInfo2().canvaScale;
    const rect = imgDOM.getBoundingClientRect();
    return rect.width / scaleRate;
  };

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
                editorSDK?.changeCompAttr(layer.elemId, {
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
          const imgDOM = document.querySelector(
            `[data-image-id="${layerId}"] [data-action="adjust_image"]`
          ) as HTMLImageElement;
          imgDOM.click();
        }}
      >
        <div className='border_icon'>
          <Crop size={16} />
        </div>
        <span>裁切</span>
      </BtnLiteColumn>

      {fullStack && <TagPickerPopoverForPicture />}

      {/* <BtnLiteColumn
        onClick={() => {
          const currentWidth = getImgWidth();
          const nextWidth = Math.max(20, (currentWidth || 20) + step);
          const nextVal = {
            width: nextWidth,
            minWidth: nextWidth,
            layoutStyle: {
              ...layer.attrs?.layoutStyle,
              width: nextWidth,
            },
          };
          editorSDK?.changeCompAttr(layer.elemId, nextVal);
        }}
      >
        <ZoomIn size={20} />
        <span>放大</span>
      </BtnLiteColumn>
      <BtnLiteColumn
        onClick={() => {
          const currentWidth = getImgWidth();
          const nextWidth = Math.max(20, (currentWidth || 20) - step);
          const nextVal = {
            width: nextWidth,
            layoutStyle: {
              ...layer.attrs?.layoutStyle,
              width: nextWidth,
            },
          };
          editorSDK?.changeCompAttr(layer.elemId, nextVal);
        }}
      >
        <ZoomOut size={20} />
        <span>缩小</span>
      </BtnLiteColumn> */}
    </>
  );
}
