import React, { useEffect, useMemo, useState } from 'react';
import { IconInput } from '@workspace/ui/components/icon-input';
import {
  ArrowUpToLine,
  ArrowRightToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  Link2,
  Link2Off,
} from 'lucide-react';
import type ReactCSS from 'react';
import { numberChunkValueToString, stringValueTo4Chunk } from './utils';

type CSSProperties = ReactCSS.CSSProperties;

interface EdgesControlProps {
  label?: string;
  property: 'padding' | 'margin';
  // 当 useShorthandString 为 true 时，读取/写入使用四值字符串（"t r b l"）
  // 否则使用单值/四边单独字段（padding、paddingTop...）
  useShorthandString?: boolean;
  value: Partial<CSSProperties> & Record<string, any>;
  onChange: (patch: Partial<CSSProperties>) => void;
}

const normalize = (val: string | number) => {
  if (val === '' || val === null || typeof val === 'undefined')
    return '' as any;
  const num = Number(val);
  return Number.isNaN(num) ? (val as any) : (num as any);
};

export default function EdgesControl(props: EdgesControlProps) {
  const {
    label = 'Padding',
    property,
    useShorthandString,
    value,
    onChange,
  } = props;

  // 读取当前四边数值
  const [allValue, setAllValue] = useState<string>('');
  const [isAllEditing, setIsAllEditing] = useState<boolean>(false);

  const topKey = `${property}Top` as keyof CSSProperties;
  const rightKey = `${property}Right` as keyof CSSProperties;
  const bottomKey = `${property}Bottom` as keyof CSSProperties;
  const leftKey = `${property}Left` as keyof CSSProperties;

  const { top, right, bottom, left } = useMemo(() => {
    if (useShorthandString) {
      const strVal = (value as any)[property] as string | undefined;
      const chunk = stringValueTo4Chunk(strVal || '');
      return {
        top: chunk?.[0] ?? '',
        right: chunk?.[1] ?? '',
        bottom: chunk?.[2] ?? '',
        left: chunk?.[3] ?? '',
      };
    }
    return {
      top: (value as any)[topKey] ?? (value as any)[property],
      right: (value as any)[rightKey] ?? (value as any)[property],
      bottom: (value as any)[bottomKey] ?? (value as any)[property],
      left: (value as any)[leftKey] ?? (value as any)[property],
    };
  }, [
    useShorthandString,
    value,
    property,
    topKey,
    rightKey,
    bottomKey,
    leftKey,
  ]);

  // 同步统一输入框显示
  useEffect(() => {
    if (!isAllEditing) {
      const all = [top, right, bottom, left].map(v => v ?? '');
      const allEqual = all.every(v => String(v) === String(all[0]));
      if (allEqual && all[0] !== '') {
        setAllValue(String(all[0]));
      } else {
        setAllValue('');
      }
    }
  }, [top, right, bottom, left, isAllEditing]);

  const commitAll = (val: string | number) => {
    if (useShorthandString) {
      // 写入四值字符串
      const nv = normalize(val);
      const str = numberChunkValueToString([
        nv as any,
        nv as any,
        nv as any,
        nv as any,
      ]);
      onChange({ [property]: str } as any);
    } else {
      const nv = normalize(val);
      onChange({
        [property]: nv as any,
        [topKey]: null as any,
        [rightKey]: null as any,
        [bottomKey]: null as any,
        [leftKey]: null as any,
      } as any);
    }
  };

  const commitSide = (
    side: 'top' | 'right' | 'bottom' | 'left',
    val: string | number
  ) => {
    const nv = normalize(val);
    if (useShorthandString) {
      const chunk = [top, right, bottom, left].map(v => Number(v) || 0);
      const idx = { top: 0, right: 1, bottom: 2, left: 3 }[side];
      (chunk as any)[idx] = Number(nv) || 0;
      const str = numberChunkValueToString(chunk as any);
      onChange({ [property]: str } as any);
      return;
    }
    onChange({
      [property]: null as any,
      [topKey]: side === 'top' ? (nv as any) : (top as any),
      [rightKey]: side === 'right' ? (nv as any) : (right as any),
      [bottomKey]: side === 'bottom' ? (nv as any) : (bottom as any),
      [leftKey]: side === 'left' ? (nv as any) : (left as any),
    } as any);
  };

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-center justify-between gap-2'>
        {label && <div className='font-semibold text-xs flex-1'>{label}</div>}
        <button
          className='text-xs text-[#1A87FF] whitespace-nowrap'
          onClick={() => {
            // 一键清空
            if (useShorthandString) {
              onChange({ [property]: undefined } as any);
            } else {
              onChange({
                [property]: undefined,
                [topKey]: undefined as any,
                [rightKey]: undefined as any,
                [bottomKey]: undefined as any,
                [leftKey]: undefined as any,
              } as any);
            }
            setAllValue('');
          }}
          title='清空'
        >
          清空
        </button>
        <div className='w-16'>
          <IconInput
            icon2={<Link2 size={12} />}
            type='number'
            placeholder='全部'
            value={allValue as any}
            onChange={e => {
              const raw = (e.target as HTMLInputElement).value;
              setAllValue(raw);
              commitAll(raw);
            }}
            onFocus={() => setIsAllEditing(true)}
            onBlur={() => setIsAllEditing(false)}
          />
        </div>
      </div>
      <div className='grid grid-cols-4 gap-1'>
        <IconInput
          icon2={<ArrowUpToLine size={12} />}
          type='number'
          placeholder='上'
          value={top as any}
          onChange={e =>
            commitSide('top', (e.target as HTMLInputElement).value)
          }
        />
        <IconInput
          icon2={<ArrowRightToLine size={12} />}
          type='number'
          placeholder='右'
          value={right as any}
          onChange={e =>
            commitSide('right', (e.target as HTMLInputElement).value)
          }
        />
        <IconInput
          icon2={<ArrowDownToLine size={12} />}
          type='number'
          placeholder='下'
          value={bottom as any}
          onChange={e =>
            commitSide('bottom', (e.target as HTMLInputElement).value)
          }
        />
        <IconInput
          icon2={<ArrowLeftToLine size={12} />}
          type='number'
          placeholder='左'
          value={left as any}
          onChange={e =>
            commitSide('left', (e.target as HTMLInputElement).value)
          }
        />
      </div>
    </div>
  );
}
