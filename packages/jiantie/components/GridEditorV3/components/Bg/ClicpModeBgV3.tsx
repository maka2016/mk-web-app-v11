import { cdnApi } from '@/services';
import { useRef } from 'react';

interface ClipBgSettingV3 {
  type: 'color' | 'image';
  width: number;
  height: number;
  ossPath?: string;
  color?: string;
}

export interface ClipModeBgProps {
  clipBgSettingV3: ClipBgSettingV3[];
  clipBgLayout?: 'row' | 'column';
}

const getHalf = (num: number) => {
  const ret = Math.floor(num / 2);
  return ret;
};

export default function ClipModeBgV3(props: ClipModeBgProps) {
  const { clipBgSettingV3, clipBgLayout = 'row' } = props;
  const bgMode = clipBgSettingV3.length === 9 ? '3x3' : '1x3';

  const currentDOM = useRef<HTMLDivElement>(null);
  const colLayout = clipBgLayout === 'column';

  if (!clipBgSettingV3 || clipBgSettingV3.length < 3) return null;

  if (bgMode === '1x3') {
    return (
      <div
        className='clip_bg_container'
        ref={currentDOM}
        style={{
          display: 'grid',
          gridTemplateColumns: colLayout
            ? '1fr'
            : `${getHalf(clipBgSettingV3[0]?.width)}px 1fr ${getHalf(clipBgSettingV3[2]?.width)}px`,
          gridTemplateRows: colLayout
            ? `${getHalf(clipBgSettingV3[0]?.height)}px 1fr ${getHalf(
                clipBgSettingV3[2]?.height
              )}px`
            : '1fr',
          height: '100%',
          width: '100%',
        }}
      >
        {clipBgSettingV3.map((bgItem, index) => {
          // const imgSize = bgGroupSize[index]
          const item = clipBgSettingV3[index];
          if (!item) {
            return <div key={index}></div>;
          }
          const url = item.ossPath || '';
          return url ? (
            <div
              key={index}
              className={`clip_bg_item idx_${index}`}
              style={{
                // aspectRatio: `${bgItem.width} / ${bgItem.height}`,
                backgroundImage: `url("${cdnApi(url)}")`,
                backgroundSize:
                  index === 0 || index === 2 ? 'cover' : 'contain', // 四个角不形变
                backgroundRepeat: 'repeat',
              }}
            ></div>
          ) : null;
        })}
      </div>
    );
  } else {
    const firstColItem = clipBgSettingV3[0];
    const firstRowItem = clipBgSettingV3[3];
    if (!firstColItem || !firstRowItem) return null;
    return (
      <div
        className='clip_bg_container'
        ref={currentDOM}
        style={{
          display: 'grid',
          gridTemplateColumns: `${getHalf(clipBgSettingV3[0]?.width)}px minmax(10px, 1fr) ${getHalf(
            clipBgSettingV3[2]?.width
          )}px`,
          gridTemplateRows: `${getHalf(clipBgSettingV3[0]?.height)}px minmax(10px, 1fr) ${getHalf(
            clipBgSettingV3[6]?.height
          )}px`,
          width: '100%',
          height: '100%',
        }}
      >
        {clipBgSettingV3.map((bgItem, index) => {
          const item = clipBgSettingV3[index];
          if (!item) {
            return <div key={index}></div>;
          }
          const url = item.ossPath || '';
          return url ? (
            <div
              key={index}
              className={`clip_bg_item idx_${index}`}
              style={(() => {
                let backgroundPosition = 'center';
                if (index === 0) {
                  backgroundPosition = 'top left';
                } else if (index === 2) {
                  backgroundPosition = 'top right';
                } else if (index === 6) {
                  backgroundPosition = 'bottom left';
                } else if (index === 8) {
                  backgroundPosition = 'bottom right';
                }
                return {
                  backgroundImage: `url(${url})`,
                  backgroundSize:
                    index === 0 || index === 2 || index === 6 || index === 8
                      ? 'cover'
                      : 'contain', // 四个角不形变
                  backgroundRepeat:
                    index === 0 || index === 2 || index === 6 || index === 8
                      ? 'no-repeat'
                      : 'repeat',
                  // 根据index设置背景位置
                  backgroundPosition,
                };
              })()}
            ></div>
          ) : null;
        })}
      </div>
    );
  }
}
