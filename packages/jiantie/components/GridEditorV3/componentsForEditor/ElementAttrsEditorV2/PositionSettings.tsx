import { Button } from '@workspace/ui/components/button';
import { IconInput } from '@workspace/ui/components/icon-input';
import { RotateCcw, RotateCw } from 'lucide-react';
import React from 'react';
import AbsolutePositionSetting from './AbsolutePositionSetting';
import SelfAlign from './SelfAlign';
import { SingleValueStyleSettingItem } from './StyleSetting';

const getAspectRatioData = () => {
  return [
    {
      text: '1/1',
      value: '1/1',
    },
    {
      text: '16/9',
      value: '16/9',
    },
    {
      text: '4/3',
      value: '4/3',
    },
  ];
};

export interface PositionSettingsProps {
  style: any;
  parentStyle?: any;
  isAbsoluteElement?: boolean;
  reverse?: boolean;
  onChange: (value: React.CSSProperties) => void;
  useAlign?: boolean;
}

export default function PositionSettings({
  style,
  parentStyle,
  isAbsoluteElement = false,
  reverse = false,
  onChange,
  useAlign = true,
}: PositionSettingsProps) {
  // 判断父级是否为自动布局
  const isParentAutoLayout =
    parentStyle?.display === 'flex' || parentStyle?.display === 'grid';

  // 解析 transform 字符串中的 translate 值
  const parseTranslate = (transformStr: string | undefined) => {
    const str = transformStr || '';
    const match = str.match(/translate\(([^)]+)\)/);
    let x = 0;
    let y = 0;
    if (match) {
      const [tx, ty] = match[1]
        .split(',')
        .map(v => parseFloat(v.trim().replace('px', '')) || 0);
      x = tx || 0;
      y = ty || 0;
    }
    return { x, y, hasTranslate: !!match };
  };

  // 解析 transform 字符串中的 rotate 值
  const parseRotate = (transformStr: string | undefined) => {
    const str = transformStr || '';
    const match = str.match(/rotate\(([^)]+)\)/);
    if (match) {
      return parseFloat(match[1].replace('deg', '')) || 0;
    }
    return 0;
  };

  // 构建包含 translate 的 transform 字符串
  const buildTransformWithTranslate = (
    prev: string | undefined,
    x: number,
    y: number
  ) => {
    const prevStr = prev || '';
    const translateStr = `translate(${x}px, ${y}px)`;
    if (/translate\([^)]+\)/.test(prevStr)) {
      return prevStr.replace(/translate\([^)]+\)/, translateStr);
    }
    const result = prevStr ? `${prevStr} ${translateStr}` : translateStr;
    return result;
  };

  // 构建包含 rotate 的 transform 字符串
  const buildTransformWithRotate = (
    prev: string | undefined,
    rotate: number
  ) => {
    const prevStr = prev || '';
    const rotateStr = `rotate(${rotate}deg)`;
    if (/rotate\([^)]+\)/.test(prevStr)) {
      return prevStr.replace(/rotate\([^)]+\)/, rotateStr);
    }
    const result = prevStr ? `${prevStr} ${rotateStr}` : rotateStr;
    return result;
  };

  // 获取当前的变换值
  const { x: translateX, y: translateY } = parseTranslate(style?.transform);
  const rotateValue = parseRotate(style?.transform);

  return (
    <>
      <AbsolutePositionSetting />
      {/* 对齐控制 - 仅对自由元素或非自动布局父级可用 */}
      {useAlign && (isAbsoluteElement || !isParentAutoLayout) && (
        <SelfAlign
          value={style || {}}
          reverse={reverse}
          onChange={nextVal => {
            onChange(nextVal);
          }}
        />
      )}
      {/* <div className="grid grid-cols-3 gap-2">
        <IconInput
          icon2={<Maximize size={12} />}
          type="text"
          placeholder="1/1"
          value={style.aspectRatio || ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              aspectRatio: val ? val : undefined,
            });
          }}
          style={{ height: 32 }}
        />

        <IconInput
          icon2={<Layers size={12} />}
          type="number"
          placeholder="0"
          value={style.zIndex || ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              zIndex: val ? val : undefined,
            });
          }}
          style={{ height: 32 }}
        />
      </div> */}

      {/* 新增的 transform 控制区域 */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between mb-1'>
          <div className='text-xs text-gray-500'>变换控制</div>
          <Button
            variant='ghost'
            size='xs'
            onClick={() => {
              onChange({
                transform: undefined,
              });
            }}
            className='h-6 px-2 text-xs'
            title='重置所有变换'
          >
            <RotateCcw size={12} />
            复原
          </Button>
        </div>
        <div className='grid grid-cols-3 gap-2'>
          <IconInput
            icon2={<span className='text-xs'>X</span>}
            type='number'
            placeholder='0'
            value={translateX}
            onChange={e => {
              const val = e.target.value;
              const newTranslateX = val ? parseInt(val, 10) : 0;
              const newTransform = buildTransformWithTranslate(
                style?.transform,
                newTranslateX,
                translateY
              );
              onChange({
                transform: newTransform || undefined,
              });
            }}
          />

          <IconInput
            icon2={<span className='text-xs'>Y</span>}
            type='number'
            placeholder='0'
            value={translateY}
            onChange={e => {
              const val = e.target.value;
              const newTranslateY = val ? parseInt(val, 10) : 0;
              const newTransform = buildTransformWithTranslate(
                style?.transform,
                translateX,
                newTranslateY
              );
              onChange({
                transform: newTransform || undefined,
              });
            }}
          />

          <IconInput
            icon2={<RotateCw size={12} />}
            type='number'
            placeholder='0'
            value={rotateValue}
            onChange={e => {
              const val = e.target.value;
              const newRotate = val ? parseInt(val, 10) : 0;
              const newTransform = buildTransformWithRotate(
                style?.transform,
                newRotate
              );
              onChange({
                transform: newTransform || undefined,
                // transformObject: {
                //   rotate: newRotate,
                // },
              } as any);
            }}
          />
        </div>
      </div>

      <SingleValueStyleSettingItem
        title='层级'
        value={style.zIndex}
        onAddByDefault={() => {
          onChange({
            zIndex: 1,
          });
        }}
        onRemove={() => {
          onChange({
            zIndex: undefined,
          });
        }}
        onChange={value => {
          onChange({
            zIndex: +value,
          });
        }}
      />

      <SingleValueStyleSettingItem
        title='比例'
        value={style.aspectRatio}
        options={getAspectRatioData()}
        onAddByDefault={() => {
          onChange({
            aspectRatio: '1/1',
          });
        }}
        onRemove={() => {
          onChange({
            aspectRatio: 'auto',
          });
        }}
        onChange={value => {
          onChange({
            aspectRatio: value,
          });
        }}
      />
    </>
  );
}
