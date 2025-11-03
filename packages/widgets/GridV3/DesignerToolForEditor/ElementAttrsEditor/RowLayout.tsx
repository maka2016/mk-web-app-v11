import React, { useMemo, useState, useEffect } from 'react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@workspace/ui/components/select';
import { Dot, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import styled from '@emotion/styled';
import { Icon } from '@workspace/ui/components/Icon';
import { IconInput } from '@workspace/ui/components/icon-input';
import { Button } from '@workspace/ui/components/button';

const getChildLayoutConfig = () => {
  return [
    {
      label: '一栏',
      datas: [
        {
          label: '1列',
          value: {
            gridTemplateColumns: '1fr',
          },
        },
      ],
    },
    {
      label: '二栏',
      datas: [
        '1:1',
        '1:2',
        '1:3',
        '1:4',
        '1:5',
        '1:6',
        '2:1',
        '3:1',
        '4:1',
        '5:1',
        '6:1',
        '2:3',
        '3:2',
      ].map(mode => {
        const [a, b] = mode.split(':');
        return {
          label: mode,
          value: {
            gridTemplateColumns: `${a}fr ${b}fr`,
          },
        };
      }),
    },
    {
      label: '三栏',
      datas: [
        '1:1:1',
        '1:1:2',
        '1:1:3',
        '1:2:1',
        '1:2:2',
        '1:2:3',
        '1:3:1',
        '1:3:2',
        '1:3:3',
        '2:1:2',
        '3:1:3',
      ].map(mode => {
        const [a, b, c] = mode.split(':');
        return {
          label: mode,
          value: {
            gridTemplateColumns: `${a}fr ${b}fr ${c}fr`,
          },
        };
      }),
    },
  ];
};

const AlignmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 144px;
  height: 72px;
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

const alignmentOptions: Array<{
  justify: 'flex-start' | 'center' | 'flex-end';
  align: 'flex-start' | 'center' | 'flex-end';
  label: string;
  icon: Record<string, string>;
}> = [
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

export default function RowLayout({
  value,
  gridOnly = false,
  flexOnly = false,
  onChange,
}: {
  value: React.CSSProperties;
  gridOnly?: boolean;
  flexOnly?: boolean;
  onChange: (value: React.CSSProperties) => void;
}) {
  const [selectedColumnCount, setSelectedColumnCount] = useState<string>('1');
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
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
  const childLayoutConfig = getChildLayoutConfig();
  // let gridOptions: { label: string; value: any }[] = [];
  // if (layoutMode === "grid") {
  //   gridOptions = childLayoutConfig.flatMap((group) => group.datas);
  // }

  // 同步当前的 gridTemplateColumns 到状态
  useEffect(() => {
    const cols = value.gridTemplateColumns;
    if (cols) {
      const frCount = (String(cols).match(/fr/g) || []).length;
      setSelectedColumnCount(String(frCount));
    }
  }, [value.gridTemplateColumns, childLayoutConfig]);

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
    justify: 'flex-start' | 'center' | 'flex-end',
    align: 'flex-start' | 'center' | 'flex-end'
  ) => {
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
    const specificGap = gapProperty === 'row' ? value.rowGap : value.columnGap;

    if (specificGap !== undefined) {
      return specificGap;
    }

    if (typeof gap === 'string' && gap.includes(' ')) {
      const parts = gap.split(' ');
      return gapProperty === 'row' ? parts[0] : parts[1] || parts[0];
    } else if (gap !== undefined) {
      return gap;
    }

    return '';
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
      {/* 布局模式分组（方向 + 反向） */}
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
            {/* {!flexOnly && ( */}
            <ToggleGroupItem value='grid' aria-label='grid'>
              <Icon name='application-gi6a5h29' size={16} />
              <span>分栏</span>
            </ToggleGroupItem>
            {/* )} */}
          </ToggleGroup>
          {!gridOnly && layoutMode === 'flex' && (
            <>
              {/* <Button
                className="text-xs"
                size="sm"
                variant={"secondary"}
                onClick={() => {
                  if (isFlexRow) {
                    _onChange({
                      flexDirection: isReverse ? "row" : "row-reverse",
                    } as any);
                  } else {
                    _onChange({
                      flexDirection: isReverse ? "column" : "column-reverse",
                    } as any);
                  }
                }}
              >
                {isReverse ? "顺序" : "反向"}
              </Button> */}
              <Button
                className='text-xs'
                size='sm'
                variant={'secondary'}
                onClick={() => {
                  if (isFlexRow) {
                    _onChange({
                      alignItems: undefined,
                      justifyContent: undefined,
                    } as any);
                  } else {
                    _onChange({
                      alignItems: undefined,
                      justifyContent: undefined,
                    } as any);
                  }
                }}
              >
                重置
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Spacing 模式（Figma Packed / Space between） */}
      {/* {layoutMode === "flex" && (
        <div className="flex items-center gap-2">
          <div className="font-semibold text-xs w-14">Spacing</div>
          <ToggleGroup
            type="single"
            size="sm"
            value={spacingMode}
            onValueChange={(val: string) => {
              if (!val) return;
              if (val === "space-between") {
                _onChange({ justifyContent: "space-between" });
              } else {
                _onChange({ justifyContent: "flex-start" });
              }
            }}
          >
            <ToggleGroupItem value="packed" aria-label="packed">
              <Icon name="rowcenter" size={16} />
              <span>密集</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="space-between" aria-label="space-between">
              <Icon name="rowr" size={16} />
              <span>两端</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )} */}

      {/* Grid 布局设置 */}
      {layoutMode === 'grid' || gridOnly ? (
        <>
          <div className='flex gap-2'>
            {/* 第一级：栏数选择 */}
            <div className=''>
              <Select
                value={selectedColumnCount}
                onValueChange={(value: string) => {
                  setSelectedColumnCount(value);

                  // 设置默认的等比例布局
                  const columnCount = parseInt(value);
                  let gridTemplateColumns = '';

                  switch (columnCount) {
                    case 1:
                      gridTemplateColumns = '1fr';
                      break;
                    case 2:
                      gridTemplateColumns = '1fr 1fr';
                      break;
                    case 3:
                      gridTemplateColumns = '1fr 1fr 1fr';
                      break;
                    default:
                      gridTemplateColumns = '1fr';
                  }

                  _onChange({ gridTemplateColumns });

                  // 找到对应的第一个比例选项并设置
                  const group = childLayoutConfig.find(g => {
                    const groupColumnCount =
                      g.label === '一栏'
                        ? 1
                        : g.label === '二栏'
                          ? 2
                          : g.label === '三栏'
                            ? 3
                            : 1;
                    return groupColumnCount === columnCount;
                  });

                  if (group && group.datas[0]) {
                    setSelectedRatio(group.datas[0].label);
                  }
                }}
              >
                <SelectTrigger className='w-full h-8 text-sm border-0 bg-[#f5f5f5]'>
                  <div className='flex items-center gap-2'>
                    <Icon name='gap' size={16} />
                    <SelectValue placeholder='选择栏数' />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>一栏</SelectItem>
                  <SelectItem value='2'>二栏</SelectItem>
                  <SelectItem value='3'>三栏</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 第二级：比例选择 */}
            <div className='flex-1 flex gap-2'>
              {/* <ListSetting /> */}
              <Select
                value={selectedRatio}
                onValueChange={(value: string) => {
                  setSelectedRatio(value);

                  // 查找对应的配置并应用
                  const allOptions = childLayoutConfig.flatMap(
                    group => group.datas
                  );
                  const found = allOptions.find(opt => opt.label === value);

                  if (found) {
                    _onChange({
                      gridTemplateColumns: String(
                        found.value.gridTemplateColumns
                      ),
                    });
                  }
                }}
              >
                <SelectTrigger className='w-full h-8 text-sm border-0 bg-[#f5f5f5]'>
                  <SelectValue placeholder='选择比例' />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const groupLabel =
                      selectedColumnCount === '2'
                        ? '二栏'
                        : selectedColumnCount === '3'
                          ? '三栏'
                          : '';
                    const group = childLayoutConfig.find(
                      g => g.label === groupLabel
                    );

                    return (
                      group?.datas.map(option => (
                        <SelectItem key={option.label} value={option.label}>
                          {option.label}
                        </SelectItem>
                      )) || []
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      ) : null}
      <div className='flex gap-2 items-start'>
        <AlignmentGrid className='flex-1'>
          {alignmentOptions.map(option => {
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
                  <Icon
                    name={
                      option.icon[toggleValue] ||
                      option.icon['grid'] ||
                      'coltop'
                    }
                    size={16}
                    color='#1A87FF'
                  />
                ) : (
                  <Dot size={16} />
                )}
              </AlignmentCell>
            );
          })}
        </AlignmentGrid>
        <div className='flex-1 flex flex-col gap-1'>
          {/* 水平间距 */}
          <div className='flex-1'>
            <IconInput
              icon2={<ArrowLeftRight size={12} />}
              type='number'
              style={{ height: 32 }}
              min={0}
              placeholder='水平'
              value={parseGapValue('column')}
              disabled={
                layoutMode === 'flex' &&
                (value as any).justifyContent === 'space-between'
              }
              onChange={e => {
                updateGapValue('column', (e.target as HTMLInputElement).value);
              }}
            />
          </div>

          {/* 垂直间距 */}
          <div className='flex-1'>
            <IconInput
              icon2={<ArrowUpDown size={12} />}
              type='number'
              style={{ height: 32 }}
              min={0}
              placeholder='垂直'
              value={parseGapValue('row')}
              disabled={
                layoutMode === 'flex' &&
                (value as any).justifyContent === 'space-between'
              }
              onChange={e => {
                updateGapValue('row', (e.target as HTMLInputElement).value);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
