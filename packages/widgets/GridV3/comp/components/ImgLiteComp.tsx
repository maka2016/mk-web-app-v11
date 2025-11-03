import styled from '@emotion/styled';
import { cdnApi, getPageId, getPermissionData } from '@mk/services';
import { isPc } from '@mk/utils';
import { EditorContext } from '@mk/widgets-bridge-sdk';
import { EditorSDK } from '@mk/works-store/types';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import { QRCodeCanvas } from 'qrcode.react';
import React, { useEffect, useRef } from 'react';
import { GridProps, GridState } from '../../shared';
import { getCanvaInfo2 } from '../provider/utils';
import { PictureData } from '../types';
import ImgLiteEditingPanel from './ImgLiteEditingPanel';

const ImageConpDOM = styled.div`
  .edit_btn_wrap {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .edit_btn {
    pointer-events: none;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    .label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 0 12px;
      width: 180px;
      height: 46px;
      border-radius: 8px;
      pointer-events: auto;
      background-color: rgba(0, 0, 0, 0.6);
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
  }
`;

interface ImgLiteCompProps {
  attrs: PictureData;
  layerLink: any;
  isAbsoluteElem?: boolean;
  editorSDK?: EditorSDK<GridProps, GridState>;
  elemId: string;
  didLoaded: () => void;
  active: boolean;
  canvaInfo: any;
  editorCtx?: EditorContext;
  style?: React.CSSProperties;
  viewerSDK?: any;
}

const calcClipPath = (mask: any, width: number) => {
  if (!mask?.content) {
    return '';
  }
  const path = mask.content;
  const pathWidth = mask.width || 38;
  if (path.indexOf('clip-path') > -1) {
    const clipPath = path.replace('clip-path: ', '');
    return clipPath.replace(/;/g, '');
  } else {
    const WIDTH = width / pathWidth;
    const PRECISION = 1;
    if (WIDTH && path && PRECISION) {
      const output = path.replace(
        /([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/g,
        (match: string) => {
          return (+match * WIDTH).toFixed(PRECISION);
        }
      );
      return `path("${output}")`;
    }
  }
  return '';
};

export const isPictureUserEditable = ({
  aspectRatio,
  imgWidth,
}: {
  aspectRatio: number;
  imgWidth: number;
}) => {
  const canvaW = isPc() ? getCanvaInfo2().canvaW : window.innerWidth;
  // const canvaW = isPc() ? 375 : window.innerWidth;
  return aspectRatio > 0.3 && aspectRatio < 2 && (imgWidth || 0) > canvaW / 4;
};

export default function ImgLiteComp({
  attrs,
  isAbsoluteElem,
  editorSDK,
  elemId,
  layerLink,
  didLoaded,
  canvaInfo,
  active = false,
  viewerSDK,
  editorCtx,
  style = {},
}: ImgLiteCompProps) {
  const actionLink = layerLink?.action?.actionAttrs?.link;
  const {
    ossPath,
    mask,
    type,
    description,
    objectPosition = {
      x: 50,
      y: 0,
      size: 'cover',
    },
    flipHorizontal = false,
    strokeStyle,
    filter,
    rotate = 0,
  } = attrs;
  const isVideo = /mp4|mov/gi.test(ossPath);
  const ossPathPrev = useRef(ossPath);
  const containerRef = useRef<HTMLDivElement>(null);
  const originImgRef = useRef<HTMLImageElement>(null);
  const isDesigner = getPermissionData().materialProduct;
  const qrcodeId = `qrcode_${elemId}`;
  const { disabledToEdit = false, focusToEdit = false } = attrs;

  useEffect(() => {
    /** 换图 */
    if (ossPathPrev.current !== ossPath) {
      const img = new Image();
      img.src = cdnApi(ossPath, {
        format: 'webp',
      });
      img.onload = () => {
        ossPathPrev.current = ossPath;
        const nextData = {
          baseW: img.width,
          baseH: img.height,
          originBaseW: img.width,
          originBaseH: img.height,
        };
        editorSDK?.changeCompAttr(elemId, nextData);
      };
      img.onerror = () => {};
    }
  }, [ossPath]);

  if (type === 'qrcode_link') {
    return (
      <div
        id={qrcodeId}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <QRCodeCanvas value={actionLink} />
      </div>
    );
  }
  const aspectRatio = (() => {
    const width = originImgRef.current?.width || 0;
    const height = originImgRef.current?.height || 0;
    const ratio = width / height;
    return isNaN(ratio) ? 1 : ratio;
  })();
  const pictureEditable =
    !isAbsoluteElem &&
    isPictureUserEditable({
      aspectRatio,
      imgWidth: originImgRef.current?.width || 0,
    });
  // 如果宽高比大于2或者小于0.3，则不显示编辑按钮，宽度小于屏幕的1/4
  const userEditable =
    !isDesigner && (pictureEditable || focusToEdit) && !disabledToEdit;

  const showEditDrawer = async (attrs: any) => {
    ShowDrawerV2({
      children: ({ close }) => (
        <ImgLiteEditingPanel
          attrs={attrs}
          onClose={close}
          onChange={nextVal => {
            editorSDK?.changeCompAttr(elemId, nextVal);
            checkFirstImage(nextVal.ossPath);
          }}
        ></ImgLiteEditingPanel>
      ),
      title: '',
      showOverlay: false,
      handleOnly: true,
      contentProps: {
        style: {
          pointerEvents: 'auto',
        },
      },
    });
  };

  const checkFirstImage = (ossPath: string) => {
    try {
      const works_id = viewerSDK?.workInfo?.getWorksID?.() || getPageId();
      const visitedWorks = localStorage.getItem('replace_image_works');
      let visitedWorksArray = visitedWorks ? JSON.parse(visitedWorks) : {};

      if (!visitedWorksArray[works_id]) {
        visitedWorksArray = Object.assign(visitedWorksArray, {
          [works_id]: ossPath,
        });
        localStorage.setItem(
          'replace_image_works',
          JSON.stringify(visitedWorksArray)
        );
      }
    } catch (error) {}
  };

  const formatImgUrl = () => {
    const url = cdnApi(ossPath, {
      resizeWidth: viewerSDK ? 1200 : 1200,
      format: 'webp',
    });

    let rotateParmas = rotate ? `/rotate,${rotate}` : '';

    if (!url.includes('x-oss-process')) {
      rotateParmas = `?x-oss-process=image${rotateParmas}`;
    }
    return `${url}${rotateParmas}`;
  };

  return (
    <ImageConpDOM
      ref={containerRef}
      data-image-id={elemId}
      data-image-aspect-ratio={aspectRatio}
      data-image-width={originImgRef.current?.width || 0}
      data-image-height={originImgRef.current?.height || 0}
      style={{
        ...(attrs as any),
        filter: 'unset',
        // 超链接样式
        cursor: actionLink ? 'pointer' : 'auto',
        position: 'relative',
        // overflow: "hidden",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        height: '100%',
        zIndex: 1,
        ...style,
        outline: actionLink
          ? '2px solid var(--theme-color, #8d8d8d)'
          : undefined,
        border: actionLink ? '2px solid #fff' : undefined,
        // pointerEvents: userEditable ? "auto" : undefined,
      }}
      onClick={e => {
        if (active && userEditable && !isDesigner) {
          e.preventDefault();
          e.stopPropagation();
          editorCtx?.utils.showSelector({
            onSelected: (params: any) => {
              const { url, type, ossPath } = params;
              showEditDrawer({
                ...attrs,
                crop: false,
                ossPath,
                rotate: 0,
                objectPosition: {
                  x: 50,
                  y: 0,
                  size: 'cover',
                },
              });
              if (!ossPath.startsWith('blob:')) {
                checkFirstImage(ossPath);
              }
              // editorSDK?.changeCompAttr(elemId, {
              //   crop: false,
              //   ossPath,
              //   objectPosition: {
              //     x: 50,
              //     y: 0,
              //     size: "cover"
              //   }
              // });
            },
            type: 'picture',
            // preUpload: false
          } as any);
        }
      }}
    >
      {isVideo ? (
        <video width='100%' controls>
          <source src={cdnApi(ossPath)} type='video/mp4' />
        </video>
      ) : (
        <>
          <div
            style={{
              clipPath: calcClipPath(mask, originImgRef.current?.width || 0),
              height: '100%',
              width: '100%',
              // overflow: "hidden",
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: `url(${formatImgUrl()})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: `${objectPosition.x === undefined ? 50 : objectPosition.x}% ${
                  objectPosition.y === undefined ? 0 : objectPosition.y
                }%`,
                backgroundSize: objectPosition.size || 'cover',
                transform: `scaleX(${flipHorizontal ? -1 : 1})`,
                filter: filter || strokeStyle?.value || 'none',
              }}
            ></div>
            <img
              className='origin_img'
              ref={originImgRef}
              style={{
                display: 'block',
                maxWidth: '100%',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0,
                pointerEvents: editorSDK ? 'none' : 'auto',
              }}
              onLoad={() => {
                didLoaded();
              }}
              src={formatImgUrl()}
              alt=''
            />
          </div>
          {description && (
            <div
              style={{
                fontSize: attrs.fontSize,
                color: attrs.color,
                textAlign: attrs.textAlign as any,
                fontWeight: attrs.fontWeight,
                textIndent: attrs.textIndent,
                textDecoration: attrs.textDecoration,
                fontStyle: attrs.fontStyle,
              }}
            >
              {description}
            </div>
          )}
        </>
      )}
      {/* {editable && (
        <div className="edit_btn_wrap">
          <div className="edit_btn">
            <span
              className="label"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                editorCtx?.utils.showSelector({
                  onSelected: (params) => {
                    const { url, type, ossPath } = params;
                    checkFirstImage(ossPath);
                    editorSDK?.changeCompAttr(elemId, {
                      crop: false,
                      ossPath,
                      objectPosition: {
                        x: 50,
                        y: 0,
                        size: "cover",
                      },
                    });
                  },
                  type: "picture",
                });
              }}
            >
              <img
                draggable={false}
                src={cdnApi("/cdn/mk-widgets/assets/icon_pic.png", {
                  format: "webp",
                })}
                style={{
                  width: 20,
                  height: 20,
                }}
                alt=""
              />
              {i18nModule.t("replaceImage")}
            </span>
          </div>
          <div className="edit_btn">
            <span
              className="label"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                showEditDrawer({
                  ...attrs,
                  crop: true,
                });
              }}
            >
              <img
                draggable={false}
                src={cdnApi("/cdn/mk-widgets/assets/icon_tailoring_2.png", {
                  format: "webp",
                })}
                style={{
                  width: 20,
                  height: 20,
                }}
                alt=""
              />
              {i18nModule.t("adjustImage")}
            </span>
          </div>
        </div>
      )} */}
    </ImageConpDOM>
  );
}
