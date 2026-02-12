import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Image as ImageIcon, LibraryBig } from 'lucide-react';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { BtnLite, BtnLiteColumn } from '../../components/style-comps';
import { useWorksStore } from '../../works-store/store/hook';
import MaterialManagerSelector from '../DesignerOperatorV2/MaterialManagerSelector';

interface ChangePictureButtonProps {
  layer: LayerElemItem;
  hasMaterialGroup: boolean;
  variant?: 'row' | 'column';
  iconSize?: number;
}

interface LocalUploadButtonProps {
  layerId: string;
  onUpload?: () => void;
}

/**
 * 本地上传按钮组件 - 用于素材选择器内的网格项
 * 显示为一个虚线边框的正方形卡片，带有上传图标
 */
function LocalUploadButton({ layerId, onUpload }: LocalUploadButtonProps) {
  const t = useTranslations('GridEditor');
  const handleClick = () => {
    const imgDOM = document.querySelector(
      `[data-image-id="${layerId}"]`
    ) as HTMLImageElement;
    imgDOM.click();
    onUpload?.();
  };

  return (
    <div className='group relative cursor-pointer' onClick={handleClick}>
      <div className='relative aspect-square rounded border border-dashed border-gray-300 overflow-hidden bg-gray-50 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center'>
        <ImageIcon
          size={24}
          className='text-gray-400 group-hover:text-blue-500'
        />
      </div>
      <div className='mt-1'>
        <div className='text-xs text-gray-900 truncate text-center'>
          {t('localUpload')}
        </div>
      </div>
    </div>
  );
}

/**
 * 换图/换素材按钮组件
 * 根据是否有素材组，显示不同的图标和文字，并执行不同的操作
 */
function ChangePictureButton({
  layer,
  hasMaterialGroup,
  variant = 'row',
  iconSize = 16,
}: ChangePictureButtonProps) {
  const t = useTranslations('GridEditor');
  const worksStore = useWorksStore();
  const { materialResourcesGroup } = worksStore.worksData.gridProps;
  const layerId = layer.elemId;
  const [showMaterialManagerSelector, setShowMaterialManagerSelector] =
    useState(false);
  const handleClick = () => {
    if (hasMaterialGroup) {
      // 有素材组时，打开换素材面板
      setShowMaterialManagerSelector(true);
    } else {
      // 没有素材组时，直接触发换图
      const imgDOM = document.querySelector<HTMLDivElement>(
        `#changeImgBtn_${layer.elemId}`
      );
      imgDOM?.click();
    }
  };

  const icon = hasMaterialGroup ? (
    <LibraryBig size={iconSize} />
  ) : (
    <ImageIcon size={iconSize} />
  );
  const text = hasMaterialGroup ? t('changeMaterial') : t('changeImage');

  return (
    <>
      {variant === 'column' ? (
        <BtnLiteColumn onClick={handleClick}>
          <div className='border_icon'>{icon}</div>
          <span>{text}</span>
        </BtnLiteColumn>
      ) : (
        <BtnLite onClick={handleClick}>
          {icon}
          {text}
        </BtnLite>
      )}

      <ResponsiveDialog
        isOpen={showMaterialManagerSelector}
        onOpenChange={setShowMaterialManagerSelector}
        title={t('changeMaterial')}
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
          prependItemInGrid={
            <LocalUploadButton
              layerId={layerId}
              onUpload={() => setShowMaterialManagerSelector(false)}
            />
          }
        />
      </ResponsiveDialog>
    </>
  );
}

export default observer(ChangePictureButton);
