import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Component as ComponentIcon,
  Crop,
  Image as ImageIcon,
  LibraryBig,
  Square,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { BtnLite } from '../../components/style-comps';
import MaterialManagerSelector from '../../componentsForEditor/DesignerOperatorV2/MaterialManagerSelector';
import MaterialGroupSelector from '../../componentsForEditor/SettingPopoverDesigner/MaterialGroupSelector';
import { TagPicker } from '../../componentsForEditor/SettingPopoverDesigner/TagPicker';
import { getCanvaInfo2 } from '../../provider/utils';
import { useWorksStore } from '../../works-store/store/hook';

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

function PictureEditV2({ layer }: { layer: any }) {
  const worksStore = useWorksStore();
  const { setWidgetStateV2, fullStack } = worksStore;
  const { materialResourcesGroup } = worksStore.worksData.gridProps;
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
      {layer.attrs.materialGroupRefId && (
        <BtnLite
          onClick={() => {
            setShowMaterialManagerSelector(true);
          }}
        >
          <LibraryBig size={20} />
        </BtnLite>
      )}
      <BtnLite
        onClick={() => {
          const imgDOM = document.querySelector<HTMLDivElement>(
            `#changeImgBtn_${layer.elemId}`
          );
          imgDOM?.click();
        }}
      >
        <ImageIcon size={20} />
        换图v2
      </BtnLite>
      <BtnLite
        onClick={() => {
          setWidgetStateV2({
            imageEditingOpen: true,
          });
        }}
      >
        <Crop size={20} />
      </BtnLite>

      {fullStack && <TagPickerPopoverForPicture />}

      <BtnLite
        onClick={() => {
          const currentWidth = getImgWidth();
          const nextWidth = Math.max(20, (currentWidth || 20) + step);
          const nextVal = {
            ...layer.attrs,
            width: nextWidth,
            minWidth: nextWidth,
            layoutStyle: {
              ...layer.attrs?.layoutStyle,
              width: nextWidth,
            },
          };
          worksStore.changeCompAttr(layer.elemId, nextVal);
        }}
      >
        <ZoomIn size={20} />
        {/* <span>放大</span> */}
      </BtnLite>
      <BtnLite
        onClick={() => {
          const currentWidth = getImgWidth();
          const nextWidth = Math.max(20, (currentWidth || 20) - step);
          const nextVal = {
            ...layer.attrs,
            width: nextWidth,
            layoutStyle: {
              ...layer.attrs?.layoutStyle,
              width: nextWidth,
            },
          };
          worksStore.changeCompAttr(layer.elemId, nextVal);
        }}
      >
        <ZoomOut size={20} />
        {/* <span>缩小</span> */}
      </BtnLite>
      <ResponsiveDialog
        isOpen={showMaterialManagerSelector}
        onOpenChange={setShowMaterialManagerSelector}
        title='换素材'
      >
        <MaterialManagerSelector
          materialGroup={
            materialResourcesGroup?.pic
              ? ([
                materialResourcesGroup?.pic?.find(
                  group => group.id === layer.attrs.materialGroupRefId
                ),
              ] as any)
              : undefined
          }
          columns={4}
          onChange={material => {
            worksStore.changeCompAttr(layer.elemId, {
              ossPath: material.content,
            });
            setShowMaterialManagerSelector(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
}
export default observer(PictureEditV2);
