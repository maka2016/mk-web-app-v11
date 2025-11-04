/* eslint-disable @next/next/no-img-element */
import styled from '@emotion/styled';
import { cdnApi, getPageId, getPermissionData } from '@mk/services';
import { isPc } from '@mk/utils';
import { EditorContext } from '@mk/widgets-bridge-sdk';
import { EditorSDK } from '@mk/works-store/types';
import { ShowDrawerV2 } from '@workspace/ui/components/ShowDrawerV2';
import { QRCodeCanvas } from 'qrcode.react';
import React, { useEffect, useRef, useState } from 'react';
import { stringValueTo4Chunk } from '../../DesignerToolForEditor/ElementAttrsEditorV2/utils';
import { getImgInfo2, GridProps, GridState } from '../../shared';
import { getCanvaInfo2 } from '../provider/utils';
import { PictureData } from '../types';
import ImgLiteEditingPanel from './ImgLiteEditingPanel';
// import Image from "next/image";

const ImageConpDOM = styled.div`
  .edit_btn_wrap {
    position: absolute;
    top: -100%;
    left: -100%;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    opacity: 0;
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
      /* width: 180px; */
      /* height: 46px; */
      border-radius: 8px;
      pointer-events: auto;
      background-color: rgba(0, 0, 0, 0.6);
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
  }
`;

interface ContainerInfo {
  width: React.CSSProperties['width'];
  height: React.CSSProperties['height'];
  aspectRatio: React.CSSProperties['aspectRatio'];
  padding: React.CSSProperties['padding'];
}

interface ImgLiteCompProps {
  fullStack?: boolean;
  attrs: PictureData;
  layerLink: any;
  isAbsoluteElem?: boolean;
  editable: boolean;
  editorSDK?: EditorSDK<GridProps, GridState>;
  elemId: string;
  didLoaded: () => void;
  active: boolean;
  editorCtx?: EditorContext;
  style?: React.CSSProperties;
  viewerSDK?: any;
  containerInfo?: ContainerInfo;
  readonly?: boolean;
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

export default function ImgLiteCompV2({
  attrs,
  fullStack,
  editable,
  readonly,
  isAbsoluteElem,
  editorSDK,
  elemId,
  layerLink,
  didLoaded,
  active = false,
  viewerSDK,
  editorCtx,
  containerInfo,
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
    originBaseW,
    originBaseH,
    version,
  } = attrs;
  const isVideo = /mp4|mov/gi.test(ossPath);
  const ossPathPrev = useRef(ossPath);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesigner = getPermissionData().materialProduct;
  const [ready, setReady] = useState(false);
  const canvaInfo = getCanvaInfo2();
  const [imgInfoState, setImgInfoState] = useState<{
    aspectRatio: number | string;
    originBaseW: number;
    originBaseH: number;
  }>({
    aspectRatio:
      attrs.aspectRatio || attrs.originBaseW / attrs.originBaseH || 1,
    originBaseW: attrs.originBaseW,
    originBaseH: attrs.originBaseH,
  });
  const qrcodeId = `qrcode_${elemId}`;
  const { disabledToEdit = false } = attrs;
  const resetAttrs = async () => {
    if (readonly) return;
    const imgInfo = await getImgInfo2(ossPath);
    if (imgInfo.baseWidth === attrs.originBaseW) {
      return;
    }
    ossPathPrev.current = ossPath;
    const nextData = {
      aspectRatio: imgInfo.baseWidth / imgInfo.baseHeight,
      originBaseW: imgInfo.baseWidth,
      originBaseH: imgInfo.baseHeight,
      version: 2,
    };
    setImgInfoState(nextData);
    console.log('imgInfo', imgInfo);
    editorSDK?.changeCompAttr(elemId, nextData);
  };

  useEffect(() => {
    /** 换图 */
    const init = async () => {
      if (
        !version ||
        version < 2 ||
        !originBaseW ||
        ossPathPrev.current !== ossPath
      ) {
        await resetAttrs();
        setReady(true);
      } else {
        setReady(true);
      }
    };
    init();
  }, [ossPath]);

  useEffect(() => {
    const initLock = async () => {
      /** 判断自身图片属性，决定是否锁定 */
      if (!imgInfoState || ossPathPrev.current === ossPath) {
        return;
      }
      if (typeof attrs.disabledToEdit === 'undefined' && fullStack) {
        /** 设计师上传的需要做尺寸判断 */
        const pictureEditable = isPictureUserEditable({
          aspectRatio: Number(imgInfoState.aspectRatio),
          imgWidth: imgInfoState.originBaseW,
        });
        console.log('pictureEditable', pictureEditable);
        editorSDK?.changeCompAttr(elemId, {
          disabledToEdit: isAbsoluteElem || !pictureEditable ? true : false,
        });
      }
    };
    initLock();
  }, [imgInfoState, ossPath]);

  // if (!ready) {
  //   return null;
  // }

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
    return Number(imgInfoState?.aspectRatio) || 1;
  })();

  const userEditable = !isDesigner && !disabledToEdit;

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
        />
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

  const formatImgUrl = (scale = 1) => {
    const resizeWidth = editorSDK
      ? (originBaseW / canvaInfo.viewportScale) * scale
      : Math.min(originBaseW, canvaInfo.deviceWidth * 2);
    const url = cdnApi(ossPath, {
      resizeWidth: resizeWidth,
      format: 'webp',
    });

    let rotateParmas = rotate ? `/rotate,${rotate}` : '';

    if (!url.includes('x-oss-process')) {
      rotateParmas = `?x-oss-process=image${rotateParmas}`;
    }
    return `${url}${rotateParmas}`;
  };

  const getRectInfo = () => {
    if (
      containerInfo &&
      (typeof containerInfo.width === 'number' ||
        typeof containerInfo.height === 'number' ||
        /px/.test(String(containerInfo.width)) ||
        /px/.test(String(containerInfo.height)))
    ) {
      const width = containerInfo.width;
      const height = containerInfo.height;
      // 只处理设置了固定宽高px的情况
      if (height === 'auto' && width === 'auto') {
        return {
          width: '100%',
          height: '100%',
        };
      } else if (height === 'auto' && width !== 'auto') {
        // 只设置了宽度，高度需要进行计算
        return {
          width,
          height: `${+String(height).replace(/px/g, '') / aspectRatio}px`,
        };
      } else if (width === 'auto' && height !== 'auto') {
        // 只设置了高度，宽度需要进行计算
        return {
          width: `${+String(width).replace(/px/g, '') * aspectRatio}px`,
          height,
        };
      }
      return {
        width: width,
        height: height,
      };
    }
    return {
      width: '100%',
      height: '100%',
    };
  };
  const imgRect = getRectInfo();

  const getContainerStyle = () => {
    const [pt, pr, pb, pl] = stringValueTo4Chunk(
      String(containerInfo?.padding) || ''
    ) || [0, 0, 0, 0];
    return {
      ...imgRect,
      ...style,
      position: 'absolute',
      width: 'auto',
      height: 'auto',
      top: pt,
      left: pl,
      bottom: pb,
      right: pr,
      cursor: actionLink ? 'pointer' : 'auto',
      pointerEvents: viewerSDK || active ? 'auto' : 'none',
      clipPath: calcClipPath(mask, originBaseW || 0),
      backgroundImage: `url(${formatImgUrl(2)})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: `${objectPosition.x === undefined ? 50 : objectPosition.x}% ${
        objectPosition.y === undefined ? 0 : objectPosition.y
      }%`,
      backgroundSize: objectPosition.size || 'cover',
      transform: `scaleX(${flipHorizontal ? -1 : 1})`,
      filter: filter || strokeStyle?.value || 'none',
    } as React.CSSProperties;
  };

  return (
    <>
      <ImageConpDOM
        ref={containerRef}
        id={`img_lite_comp_${elemId}`}
        data-image-id={elemId}
        data-image-aspect-ratio={aspectRatio}
        data-image-width={originBaseW || 0}
        data-image-height={originBaseH || 0}
        style={getContainerStyle()}
        onClick={e => {
          if (active && userEditable && !isDesigner) {
            editorCtx?.utils.showSelector({
              onSelected: async (params: any) => {
                const { url, type, ossPath } = params;
                const nextImgInfo = await getImgInfo2(ossPath);
                showEditDrawer({
                  ...attrs,
                  crop: false,
                  ossPath,
                  originBaseW: nextImgInfo.baseWidth,
                  originBaseH: nextImgInfo.baseHeight,
                  aspectRatio:
                    nextImgInfo.baseWidth / nextImgInfo.baseHeight || 1,
                  rotate: 0,
                  objectPosition: {
                    x: 0,
                    y: 0,
                    size: 'cover',
                  },
                });
                if (!ossPath.startsWith('blob:')) {
                  checkFirstImage(ossPath);
                }
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
        {editable && active && (
          <div className='edit_btn_wrap'>
            <div
              className='trigger_btn'
              data-action='adjust_image'
              data-tip='for script to click'
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                showEditDrawer({
                  ...attrs,
                  crop: false,
                });
              }}
            ></div>
          </div>
        )}
      </ImageConpDOM>
      <img
        className='origin_img'
        style={{
          aspectRatio: containerInfo?.aspectRatio,
          display: 'block',
          maxWidth: '100%',
          width: imgRect.width,
          height: imgRect.height === '100%' ? 'auto' : imgRect.height,
          objectFit: 'cover',
          opacity: 0,
          pointerEvents: editable && viewerSDK ? 'auto' : 'none',
        }}
        onLoad={async e => {
          // const target = e.target as HTMLImageElement;
          // if (target && target.clientWidth) {
          //   const realAspectRatio = target.clientWidth / target.clientHeight;
          //   const diff =
          //     realAspectRatio -
          //     imgInfoState.originBaseW / imgInfoState.originBaseH;
          //   // 处理NaN和Infinity的情况
          //   if (Math.abs(diff) > 2 && !isNaN(diff) && !Number.isFinite(diff)) {
          //     console.log('diff', diff);
          //     await resetAttrs();
          //     // resetAttrs();
          //   }
          // }
          didLoaded();
        }}
        key={formatImgUrl()}
        src={formatImgUrl()}
        alt='占位图，用于自动布局渲染'
      />
    </>
  );
}
