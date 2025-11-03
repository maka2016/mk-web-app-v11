import { getPermissionData } from '@mk/services';
import clas from 'classnames';
import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isPictureUserEditable } from '../../comp/components/ImgLiteComp';
import { BtnLite } from '../../shared/style-comps';

export default function PictureEdit({
  editorCtx,
  editorSDK,
  layer,
}: {
  editorCtx: any;
  editorSDK: any;
  layer: any;
}) {
  const isQrcode = layer.attrs.type === 'qrcode_link';
  const layerId = layer.elemId;
  const isAbsolute = layer.attrs.absoluteElem;
  const { focusToEdit = false, disabledToEdit = false } = layer.attrs;
  const [value, setValue] = useState(layer.attrs.url);
  const [imageInfo, setImageInfo] = useState<{
    aspectRatio: number;
    imgWidth: number;
    imgHeight: number;
  } | null>(null);
  const isDesigner = getPermissionData().materialProduct;

  const isUserEditable =
    !disabledToEdit &&
    (focusToEdit ||
      isPictureUserEditable({
        aspectRatio: imageInfo?.aspectRatio || 0,
        imgWidth: imageInfo?.imgWidth || 0,
      }));
  const resizable = isAbsolute && isUserEditable;

  useEffect(() => {
    const getImageInfoFromDOM = () => {
      const image = document.querySelector(`[data-image-id="${layerId}"]`);
      if (image) {
        const aspectRatio = image.getAttribute('data-image-aspect-ratio');
        const imgWidth = image.getAttribute('data-image-width');
        const imgHeight = image.getAttribute('data-image-height');
        return {
          aspectRatio: parseFloat(aspectRatio || '0'),
          imgWidth: parseFloat(imgWidth || '0'),
          imgHeight: parseFloat(imgHeight || '0'),
        };
      }
    };
    const nextImageInfo = getImageInfoFromDOM();
    if (nextImageInfo) {
      setImageInfo(nextImageInfo);
    }
  }, []);

  return (
    <>
      {isUserEditable && !isDesigner && (
        <BtnLite
          onClick={() => {
            const imgDOM = document.querySelector(
              `[data-image-id="${layerId}"]`
            ) as HTMLImageElement;
            imgDOM.click();
          }}
        >
          换图
        </BtnLite>
      )}

      {resizable && (
        <>
          <BtnLite
            onClick={() => {
              console.log('layerId', layerId);
              const targetDOM = document.querySelector(
                `[data-image-id="${layerId}"]`
              );
              const currentWidth = targetDOM?.clientWidth;
              const currentHeight = targetDOM?.clientHeight;
              const nextWidth = Math.max(20, (currentWidth || 20) + 2);
              const nextHeight = Math.max(20, (currentHeight || 20) + 2);
              console.log('nextWidth', nextWidth);
              const nextVal = {
                ...layer.attrs,
                width: nextWidth,
                minWidth: nextWidth,
                height: nextHeight,
                minHeight: nextHeight,
                layoutStyle: {
                  width: nextWidth,
                  minWidth: nextWidth,
                  height: nextHeight,
                  minHeight: nextHeight,
                },
              };
              editorSDK?.changeCompAttr(layer.elemId, nextVal);
            }}
          >
            <span>放大</span>
          </BtnLite>
          <BtnLite
            onClick={() => {
              const currentWidth = document.querySelector(
                `[data-image-id="${layerId}"]`
              )?.clientWidth;
              const nextWidth = Math.max(20, (currentWidth || 20) - 2);
              const nextVal = {
                ...layer.attrs,
                width: nextWidth,
                minWidth: nextWidth,
                layoutStyle: {
                  width: nextWidth,
                  minWidth: nextWidth,
                },
              };
              editorSDK?.changeCompAttr(layer.elemId, nextVal);
            }}
          >
            <span>缩小</span>
          </BtnLite>
        </>
      )}
      {isAbsolute && isDesigner && (
        <BtnLite
          className={clas(layer.attrs?.focusToEdit ? 'active' : '')}
          onClick={() => {
            editorSDK?.changeCompAttr(layerId, {
              focusToEdit: !layer.attrs?.focusToEdit,
            });
          }}
        >
          <span>用户可替换</span>
        </BtnLite>
      )}
      {!isAbsolute && isDesigner && (
        <BtnLite
          className={clas(layer.attrs?.disabledToEdit ? 'active' : '')}
          onClick={() => {
            editorSDK?.changeCompAttr(layerId, {
              disabledToEdit: !layer.attrs?.disabledToEdit,
            });
          }}
          title={disabledToEdit ? '用户不可替换' : '用户可替换'}
        >
          <span>
            <Lock
              size={14}
              className={clas('text-gray-800', {
                'text-red-500': disabledToEdit,
              })}
            />
          </span>
        </BtnLite>
      )}
    </>
  );
}
