import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { IconInput } from '@workspace/ui/components/icon-input';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group';
import {
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  Dot,
  GalleryHorizontal,
  GalleryVertical,
  RotateCcw,
  StretchVertical,
  UnfoldHorizontal,
  WrapText,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import ListSetting from './ListSetting';

const AlignmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 164px;
  height: 92px;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 4px 0;
`;

const AlignmentCell = styled.button<{ active?: boolean }>`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => (props.active ? 'var(--theme-color)' : '#666')};

  &:hover {
    color: var(--theme-color);
  }
`;

type AlignmentType =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'stretch';

const getAlignmentOptions = (
  style: React.CSSProperties
): Array<{
  justify: AlignmentType;
  align: AlignmentType;
  label: string;
  icon: Record<string, string>;
  icon2?: any;
}> => {
  return [
    {
      justify: 'flex-start',
      align: 'flex-start',
      label: '↖',
      icon: {
        'flex-column': 'rowl',
        'flex-row': 'coltop',
        grid: 'coltop',
      },
    },
    {
      justify: 'center',
      align: 'flex-start',
      label: '↑',
      icon: {
        'flex-column': 'rowcenter',
        'flex-row': 'coltop',
        grid: 'coltop',
      },
    },
    {
      justify: 'flex-end',
      align: 'flex-start',
      label: '↗',
      icon: {
        'flex-column': 'rowr',
        'flex-row': 'coltop',
        grid: 'coltop',
      },
    },
    {
      justify: 'flex-start',
      align: 'center',
      label: '←',
      icon: {
        'flex-column': 'rowl',
        'flex-row': 'colcenter',
        grid: 'colcenter',
      },
    },
    {
      justify: 'center',
      align: 'center',
      label: '•',
      icon: {
        'flex-column': 'rowcenter',
        'flex-row': 'colcenter',
        grid: 'colcenter',
      },
    },
    {
      justify: 'flex-end',
      align: 'center',
      label: '→',
      icon: {
        'flex-column': 'rowr',
        'flex-row': 'colcenter',
        grid: 'colcenter',
      },
    },
    {
      justify: 'flex-start',
      align: 'flex-end',
      label: '↙',
      icon: {
        'flex-column': 'rowl',
        'flex-row': 'colbottom',
        grid: 'colbottom',
      },
    },
    {
      justify: 'center',
      align: 'flex-end',
      label: '↓',
      icon: {
        'flex-column': 'rowcenter',
        'flex-row': 'colbottom',
        grid: 'colbottom',
      },
    },
    {
      justify: 'flex-end',
      align: 'flex-end',
      label: '↘',
      icon: {
        'flex-column': 'rowr',
        'flex-row': 'colbottom',
        grid: 'colbottom',
      },
    },
  ];
};

const getAlignmentOptions2 = (
  style: React.CSSProperties
): Array<{
  active?: boolean;
  justify?: AlignmentType;
  align?: AlignmentType;
  label: string;
  id: string;
  icon: Record<string, string>;
  icon2?: any;
}> => {
  return [
    {
      justify: 'space-between',
      align: style.alignItems as any,
      label: '两端对齐',
      id: 'space-between',
      icon: {
        'flex-column': 'rowl',
        'flex-row': 'coltop',
        grid: 'coltop',
      },
      icon2: AlignHorizontalSpaceBetween,
      active: style.justifyContent === 'space-between',
    },
    {
      justify: 'space-around',
      align: style.alignItems as any,
      label: '分散对齐',
      id: 'space-around',
      icon: {
        'flex-column': 'rowl',
        'flex-row': 'coltop',
        grid: 'coltop',
      },
      icon2: AlignHorizontalSpaceAround,
      active: style.justifyContent === 'space-around',
    },
    {
      justify: style.justifyContent as any,
      align: 'stretch',
      label: '拉伸对齐',
      id: 'stretch',
      icon: {
        'flex-column': 'rowl',
        'flex-row': 'coltop',
        grid: 'coltop',
      },
      icon2: UnfoldHorizontal,
      active:
        style.alignItems === 'stretch' ||
        typeof style.alignItems == 'undefined',
    },
  ];
};

export default function RowLayout({
  useAlign = true,
  value,
  gridOnly = false,
  flexOnly = false,
  onChange,
}: {
  useAlign?: boolean;
  value: React.CSSProperties;
  gridOnly?: boolean;
  flexOnly?: boolean;
  onChange: (value: React.CSSProperties) => void;
}) {
  const [selectedColumnCount, setSelectedColumnCount] = useState<string>('1');
  // deprecated padding link flags: kept no-op to avoid big refactor
  const _onChange = (nextValue: any) => {
    const commitVal = {
      ...value,
      ...nextValue,
      // justifyContent: undefined,
    };
    onChange(commitVal);
  };

  // 布局模式选择
  const layoutMode = value.display;
  // 宫格比例选项

  // 同步当前的 gridTemplateColumns 到状态
  useEffect(() => {
    const cols = value.gridTemplateColumns;
    if (cols) {
      const frCount = (String(cols).match(/fr/g) || []).length;
      setSelectedColumnCount(String(frCount));
    }
  }, [value.gridTemplateColumns]);

  // 方向与主/交叉轴（兼容 *-reverse）
  const flexDirection = (value as any).flexDirection as
    | 'row'
    | 'row-reverse'
    | 'column'
    | 'column-reverse'
    | undefined;
  const isReverse = useMemo(
    () =>
      layoutMode === 'flex' &&
      typeof flexDirection === 'string' &&
      flexDirection.includes('reverse'),
    [layoutMode, flexDirection]
  );
  const isFlexRow = useMemo(
    () =>
      layoutMode === 'flex' &&
      typeof flexDirection === 'string' &&
      flexDirection.includes('row'),
    [layoutMode, flexDirection]
  );
  // const mainAxis = isFlexRow ? "row" : "column";

  // Spacing 模式 - 已移除，不再需要
  // const spacingMode: "packed" | "space-between" =
  //   (value as any).justifyContent === "space-between"
  //     ? "space-between"
  //     : "packed";

  // Padding 读写逻辑移到 EdgesControl 中，这里仅保留占位，防止历史引用报错

  // 尺寸模式逻辑已抽象到 ResizingControl

  const handleAlignmentClick = (
    justify: AlignmentType,
    align: AlignmentType
  ) => {
    // console.log("justify", justify);
    // console.log("align", align);
    if (layoutMode === 'flex') {
      if (isFlexRow) {
        _onChange({
          justifyContent: justify,
          alignItems: align,
        });
      } else {
        // For column direction, we swap justify and align
        _onChange({
          alignItems: justify,
          justifyContent: align,
        });
      }
    } else if (layoutMode === 'grid') {
      // Grid 模式下使用 justifyItems 和 alignItems
      _onChange({
        justifyItems: justify,
        alignItems: align,
        // 更新 placeItems 作为简写属性
        placeItems: `${align} ${justify}`,
      });
    }
  };

  const baseFlexDir = isFlexRow ? 'row' : 'column';
  const toggleValue =
    layoutMode === 'grid' ? layoutMode : `${layoutMode}-${baseFlexDir}`;

  // 解析 gap 值的辅助函数
  const parseGapValue = (gapProperty: 'row' | 'column') => {
    const gap = value.gap;
    let gapValue: string | number = '';
    const specificGap = gapProperty === 'row' ? value.rowGap : value.columnGap;

    if (specificGap !== undefined) {
      gapValue = specificGap;
    }

    if (typeof gap === 'string' && gap.includes(' ')) {
      const parts = gap.split(' ');
      gapValue = gapProperty === 'row' ? parts[0] : parts[1] || parts[0];
    } else if (gap !== undefined) {
      gapValue = gap;
    }

    return Math.ceil(+String(gapValue || '').replace('px', ''));
  };

  // 更新 gap 值的辅助函数
  const updateGapValue = (gapProperty: 'row' | 'column', newValue: string) => {
    const newGapValue = newValue === '' ? undefined : Number(newValue);
    const currentRowGap =
      gapProperty === 'row' ? newGapValue : parseGapValue('row');
    const currentColumnGap =
      gapProperty === 'column' ? newGapValue : parseGapValue('column');

    const updates: any = {
      rowGap: Number(currentRowGap) || undefined,
      columnGap: Number(currentColumnGap) || undefined,
    };

    // 设置 gap 简写属性
    if (updates.rowGap !== undefined && updates.columnGap !== undefined) {
      updates.gap = `${updates.rowGap}px ${updates.columnGap}px`;
    } else if (
      updates.rowGap !== undefined &&
      updates.columnGap === undefined
    ) {
      updates.gap = `${updates.rowGap}px`;
    } else if (
      updates.rowGap === undefined &&
      updates.columnGap !== undefined
    ) {
      updates.gap = `0px ${updates.columnGap}px`;
    } else {
      updates.gap = undefined;
    }

    _onChange(updates);
  };

  return (
    <div className='flex flex-col gap-2'>
      <Button
        className='text-xs w-24'
        size='sm'
        variant={'secondary'}
        onClick={() => {
          _onChange({
            display: 'flex',
            flexDirection: value.flexDirection || 'column',
            flex: 1,
            placeSelf: undefined,
            placeContent: undefined,
            placeItems: undefined,
            alignSelf: undefined,
            justifySelf: undefined,
            justifyItems: undefined,
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            // alignItems: "flex-start",
            // justifyContent: "flex-start",
            margin: undefined,
          } as any);
        }}
      >
        <RotateCcw size={16} />
        重置布局
      </Button>
      {/* 布局模式分组（方向 + 反向） */}
      {useAlign && (
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <ToggleGroup
              type='single'
              size='sm'
              value={toggleValue}
              onValueChange={(val: string) => {
                if (!val) return;
                if (val === 'flex-column') {
                  _onChange({
                    display: 'flex',
                    flexDirection: isReverse ? 'column-reverse' : 'column',
                  });
                } else if (val === 'flex-row') {
                  _onChange({
                    display: 'flex',
                    flexDirection: isReverse ? 'row-reverse' : 'row',
                  });
                } else {
                  _onChange({ display: val, flexDirection: null });
                }
              }}
            >
              {!gridOnly && (
                <>
                  <ToggleGroupItem value='flex-column' aria-label='flex-column'>
                    <Icon name='arrow-down1' size={16} />
                    <span>垂直</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value='flex-row' aria-label='flex-row'>
                    <Icon name='arrow-right1' size={16} />
                    <span>水平</span>
                  </ToggleGroupItem>
                </>
              )}
              {!flexOnly && (
                <ToggleGroupItem value='grid' aria-label='grid'>
                  <Icon name='application-gi6a5h29' size={16} />
                  <span>分栏</span>
                </ToggleGroupItem>
              )}
            </ToggleGroup>
            {!gridOnly && layoutMode === 'flex' && (
              <>
                <Button
                  className='text-xs'
                  size='sm'
                  variant={'secondary'}
                  onClick={() => {
                    onChange({
                      flexWrap: value.flexWrap === 'wrap' ? undefined : 'wrap',
                    } as any);
                  }}
                >
                  <WrapText
                    size={16}
                    className={value.flexWrap === 'wrap' ? 'text-blue-500' : ''}
                  />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid 布局设置 */}
      {layoutMode === 'grid' || gridOnly ? (
        <div className='flex gap-2'>
          <div className='flex-1 flex gap-2'>
            <ListSetting useDesignerSetting={true} />
          </div>
        </div>
      ) : null}
      <div className='flex gap-2 items-start'>
        {useAlign && (
          <div className='flex flex-col gap-2'>
            <AlignmentGrid className='flex-1'>
              {getAlignmentOptions(value).map(option => {
                let active = false;
                if (layoutMode === 'flex') {
                  if (value.flexDirection === 'row') {
                    active =
                      value.justifyContent === option.justify &&
                      value.alignItems === option.align;
                  } else {
                    active =
                      value.alignItems === option.justify &&
                      value.justifyContent === option.align;
                  }
                } else if (layoutMode === 'grid') {
                  // Grid 模式下检查 justifyItems 和 alignItems
                  active =
                    value.justifyItems === option.justify &&
                    value.alignItems === option.align;
                }
                return (
                  <AlignmentCell
                    key={`${option.justify}-${option.align}`}
                    active={active}
                    onClick={() => {
                      handleAlignmentClick(option.justify, option.align);
                    }}
                  >
                    {active ? (
                      option.icon2 ? (
                        <option.icon2 size={16} color='#1A87FF' />
                      ) : (
                        <Icon
                          name={
                            option.icon[toggleValue] ||
                            option.icon['grid'] ||
                            'coltop'
                          }
                          size={16}
                          color='#1A87FF'
                        />
                      )
                    ) : (
                      <Dot size={16} />
                    )}
                  </AlignmentCell>
                );
              })}
            </AlignmentGrid>
            <AlignmentGrid className='flex-1'>
              {getAlignmentOptions2(value).map(option => {
                const active = option.active;
                return (
                  <AlignmentCell
                    key={`${option.id}`}
                    active={active}
                    onClick={() => {
                      _onChange({
                        justifyContent: option.justify,
                        alignItems: option.align,
                      });
                    }}
                  >
                    {/* <option.icon2
                      size={16}
                      color={active ? "#1A87FF" : "#666"}
                    /> */}
                    <span className='text-xs'>{option.label}</span>
                  </AlignmentCell>
                );
              })}
            </AlignmentGrid>
          </div>
        )}
        <div className='flex-1 flex gap-1'>
          {layoutMode === 'flex' ? (
            /* Flex模式：合并成一个间距输入框 */
            <div className='flex-1'>
              <IconInput
                icon2={<StretchVertical size={12} />}
                type='number'
                style={{ height: 32 }}
                min={0}
                placeholder='间距'
                value={Math.ceil(+String(value.gap || '').replace('px', ''))}
                disabled={(value as any).justifyContent === 'space-between'}
                onChange={e => {
                  const newValue = (e.target as HTMLInputElement).value;
                  console.log('newValue', newValue);
                  // 在flex模式下，同时设置rowGap和columnGap为相同值
                  _onChange({
                    gap: `${newValue}px`,
                  });
                }}
              />
            </div>
          ) : (
            <div className='flex flex-col gap-2'>
              {/* Grid模式：保持两个分开的输入框 */}
              {/* 水平间距 */}
              <div className='flex-1'>
                <IconInput
                  icon2={<GalleryHorizontal size={12} />}
                  type='number'
                  style={{ height: 32 }}
                  min={0}
                  placeholder='水平'
                  value={parseGapValue('column')}
                  onChange={e => {
                    updateGapValue(
                      'column',
                      (e.target as HTMLInputElement).value
                    );
                  }}
                />
              </div>

              {/* 垂直间距 */}
              <div className='flex-1'>
                <IconInput
                  icon2={<GalleryVertical size={12} />}
                  type='number'
                  style={{ height: 32 }}
                  min={0}
                  placeholder='垂直'
                  value={parseGapValue('row')}
                  onChange={e => {
                    updateGapValue('row', (e.target as HTMLInputElement).value);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
