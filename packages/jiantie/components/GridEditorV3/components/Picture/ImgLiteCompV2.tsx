
import { LayerElemItem } from '@/components/GridEditorV3/works-store/types';
import { showSelector } from '@/components/showSelector';
import { cdnApi } from '@/services';
import { isPc } from '@/utils';
import styled from '@emotion/styled';
import { observer } from 'mobx-react';
import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getCanvaInfo2 } from '../../provider/utils';
import { calcLayoutStyleVal, getImgInfo2 } from '../../utils';
import { stringValueTo4Chunk } from '../../utils/utils';
import { useWorksStore } from '../../works-store/store/hook';
import { VideoBgConfig } from '../VideoBg/types';
import VideoBg from '../VideoBg/VideoBg';
import { PictureData } from './types';
// import Image from "next/image";

const ImageConpDOM = styled.div``;

interface ContainerInfo {
  width: React.CSSProperties['width'];
  height: React.CSSProperties['height'];
  aspectRatio: React.CSSProperties['aspectRatio'];
  padding: React.CSSProperties['padding'];
}

interface ImgLiteCompProps {
  attrs: PictureData;
  layer: LayerElemItem;
  isAbsoluteElem?: boolean;
  editable: boolean;
  elemId: string;
  didLoaded?: () => void;
  active: boolean;
  style?: React.CSSProperties;
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

function VideoComp({
  config,
  elemId,
}: {
  config: VideoBgConfig;
  elemId: string;
}) {
  if (config) {
    // 对于视频模式，需要确保容器有明确的尺寸
    return (
      <VideoBg
        id={elemId}
        wrapper={c => c}
        style={{
          width: '100%',
          height: '100%',
        }}
        config={config}
      />
    );
  }
  return null;
}

function ImgLiteCompV2Comp({
  attrs,
  editable,
  readonly,
  isAbsoluteElem,
  elemId,
  layer,
  didLoaded,
  active = false,
  containerInfo,
  style = {},
}: ImgLiteCompProps) {
  const worksStore = useWorksStore();
  const fullStack = worksStore.fullStack;
  const inViewer = worksStore.inViewer;
  const actionLink = layer?.action?.actionAttrs?.link;
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
  } = attrs;
  const containerRef = useRef<HTMLDivElement>(null);
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

  if (type === 'qrcode_link') {
    // return (
    //   <div
    //     id={qrcodeId}
    //     style={{
    //       display: 'flex',
    //       alignItems: 'center',
    //       justifyContent: 'center',
    //     }}
    //   >
    //     <QRCodeCanvas value={actionLink} />
    //   </div>
    // );
  }

  const aspectRatio = (() => {
    return Number(imgInfoState?.aspectRatio) || 1;
  })();

  const userEditable = !fullStack && !disabledToEdit;

  const formatImgUrl = (scale = 1) => {
    const resizeWidth = !readonly
      ? (originBaseW / canvaInfo.viewportScale) * scale
      : undefined;
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
      String(calcLayoutStyleVal(containerInfo?.padding || '')) || ''
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
      pointerEvents: inViewer || active ? 'auto' : 'none',
      clipPath: calcClipPath(mask, originBaseW || 0),
      backgroundImage: `url(${formatImgUrl(2)})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: `${objectPosition.x === undefined ? 50 : objectPosition.x}% ${objectPosition.y === undefined ? 0 : objectPosition.y
        }%`,
      backgroundSize: objectPosition.size || 'cover',
      transform: `scaleX(${flipHorizontal ? -1 : 1})`,
      filter: filter || strokeStyle?.value || 'none',
    } as React.CSSProperties;
  };

  const handleChangeImg = () => {
    showSelector({
      onSelected: async (params: any) => {
        const { url, type, ossPath } = params;
        toast.loading('更换图片中...');
        const nextImgInfo = await getImgInfo2(ossPath);
        const commitData = {
          ...attrs,
          ossPath,
          originBaseW: nextImgInfo.baseWidth,
          originBaseH: nextImgInfo.baseHeight,
          aspectRatio: nextImgInfo.baseWidth / nextImgInfo.baseHeight || 1,
          rotate: 0,
          objectPosition: {
            x: 50,
            y: 0,
            size: 'cover',
          },
        };
        if (typeof commitData.disabledToEdit === 'undefined' && fullStack) {
          /** 设计师上传的需要做尺寸判断 */
          const pictureEditable = isPictureUserEditable({
            aspectRatio: Number(imgInfoState.aspectRatio),
            imgWidth: imgInfoState.originBaseW,
          });
          console.log('pictureEditable', pictureEditable);
          commitData.disabledToEdit =
            isAbsoluteElem || !pictureEditable ? true : false;
        }
        worksStore.changeCompAttr(elemId, commitData);
        setTimeout(() => {
          document.getElementById('hidden_edit_img_panel_trigger_btn')?.click();
        }, 50);
        setTimeout(() => {
          toast.dismiss();
        }, 500);
      },
      type: 'picture',
      // preUpload: false
    } as any);
  };

  return (
    <>
      {!readonly && (
        <div id={`changeImgBtn_${elemId}`} onClick={handleChangeImg}></div>
      )}
      <ImageConpDOM
        ref={containerRef}
        id={`img_lite_comp_${elemId}`}
        data-image-id={elemId}
        data-image-editable={editable}
        data-image-aspect-ratio={aspectRatio}
        data-image-width={originBaseW || 0}
        data-image-height={originBaseH || 0}
        style={getContainerStyle()}
        onClick={e => {
          if (active && userEditable && !fullStack && !isAbsoluteElem) {
            handleChangeImg();
          }
        }}
      >
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
          pointerEvents: editable && inViewer ? 'auto' : 'none',
        }}
        onLoad={async e => {
          didLoaded?.();
        }}
        // key={formatImgUrl()}
        src={formatImgUrl()}
        alt='占位图，用于自动布局渲染'
      />
    </>
  );
}

const ImgLiteCompV2CompObserver = observer(ImgLiteCompV2Comp);

export default function ImgLiteCompV2(props: ImgLiteCompProps) {
  const { attrs, elemId } = props;
  const { bgMode, videoBgConfig, ossPath } = attrs;
  const isVideo = bgMode === 'video' || /mp4|mov|webm/gi.test(ossPath);
  const videoConfig = videoBgConfig;
  if (isVideo || videoConfig) {
    return (
      <VideoComp
        elemId={elemId}
        config={
          videoConfig || {
            mp4VideoUrl: ossPath,
            movVideoUrl: ossPath,
            webmVideoUrl: ossPath,
            objectFit: 'cover',
            loop: true,
            muted: true,
            opacity: 1,
          }
        }
      />
    );
  }
  return <ImgLiteCompV2CompObserver {...props} />;
}
