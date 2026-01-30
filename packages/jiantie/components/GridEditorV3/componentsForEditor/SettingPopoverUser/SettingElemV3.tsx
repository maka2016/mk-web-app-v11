import MkCalendarV3Form from '@/components/GridEditorV3/components/CalendarV3/MkCalendarV3FormForUser';
import styled from '@emotion/styled';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Slider } from '@workspace/ui/components/slider';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group';
import {
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { queryToObj } from '../../../../utils';
import MapV4Form from '../../components/MapV4/MapV4Form';
import PictureEditV3 from '../../components/Picture/PictureEditV3';
import {
  BtnLite as BtnLite1,
  BtnLiteColumn,
} from '../../components/style-comps';
import TextEditorV3 from '../../components/Text/TextEditorV3';
import {
  numberChunkValueToString,
  stringValueTo4Chunk,
} from '../../utils/utils';
import { useWorksStore } from '../../works-store/store/hook';

const BtnLite = styled(BtnLite1)`
  padding: 6px 8px;
`;

// 常用间距预设（单位：px）
const commonGaps = [0, 8, 16, 32, 48, 64];

// 安全解析 gap 值，支持 number / string（例如 "12px"）
const parseGapValue = (gap: any): number => {
  if (typeof gap === 'number') {
    return gap;
  }
  if (typeof gap === 'string') {
    const numericValue = parseFloat(gap.replace(/[^\d.-]/g, ''));
    return isNaN(numericValue) ? 0 : numericValue;
  }
  return 0;
};

const SettingElemV3 = ({ onUpdate }: { onUpdate?: () => void }) => {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const {
    getRowByDepth,
    moveElemV2,
    getActiveRow,
    deleteElemV2,
    duplicateElemV2,
  } = worksStore.gridPropsOperator;
  const { editingElemId, activeRowDepth } = widgetStateV2 || {};
  const [showFinetunePopover, setShowFinetunePopover] = useState(false);
  const [showSpacingPopover, setShowSpacingPopover] = useState(false);
  const [tempTopMargin, setTempTopMargin] = useState<number>(0);
  const [tempBottomMargin, setTempBottomMargin] = useState<number>(0);

  const layer = worksStore.getLayer(editingElemId || '');
  if (!layer) {
    return <></>;
  }
  const isAbsoluteElem = layer.attrs?.absoluteElem;

  const handleSetShowSpacingPopover = (open: boolean) => {
    if (open) {
      const layoutStyle = (layer?.attrs as any)?.layoutStyle || {};
      const marginValue = layoutStyle.margin as string | number | undefined;

      let top = 0;
      let bottom = 0;

      if (typeof marginValue === 'string') {
        const chunks = stringValueTo4Chunk(marginValue);
        if (chunks) {
          [top, , bottom] = chunks;
        } else {
          const val = parseGapValue(marginValue);
          top = val;
          bottom = val;
        }
      } else if (typeof marginValue === 'number') {
        top = marginValue;
        bottom = marginValue;
      }

      const clamp = (v: number) => Math.max(0, Math.min(64, v));
      setTempTopMargin(clamp(top));
      setTempBottomMargin(clamp(bottom));
    }
    setShowSpacingPopover(open);
  };
  if (!editingElemId) {
    return <></>;
  }
  const parentRowDepth = activeRowDepth?.slice(0, -1);
  const isInList =
    parentRowDepth && getRowByDepth(parentRowDepth)?.isRepeatList;

  // 有选中元素
  if (!layer) return <></>;
  let elemTag = layer?.tag;
  if (layer.elementRef === 'Text') {
    if (!elemTag) elemTag = 'text';
  }
  if (layer.elementRef === 'Picture') {
    if (!elemTag) elemTag = 'default_picture';
  }

  const renderEditForm = () => {
    switch (true) {
      case /picture/gi.test(layer.elementRef):
        return <PictureEditV3 layer={layer} onUpdate={onUpdate} />;
      case /text/gi.test(layer.elementRef):
        return <TextEditorV3 layer={layer} />;
      case /MkMapV4/gi.test(layer.elementRef):
        return (
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <MapV4Form
              entityInfo={{ id: layer.elemId }}
              formControledValues={worksStore.getLayer(layer.elemId)?.attrs}
              onFormValueChange={(nextVal: any) => {
                worksStore.changeCompAttr(layer.elemId, nextVal);
              }}
            />
          </div>
        );

      case /MkCalendarV3/gi.test(layer.elementRef):
        return (
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <MkCalendarV3Form
              formControledValues={worksStore.getLayer(layer.elemId)?.attrs}
              elemId={layer.elemId}
              onFormValueChange={(nextVal: any) => {
                worksStore.changeCompAttr(layer.elemId, nextVal);
              }}
            />
          </div>
        );
    }
  };

  const renderFinetunePanel = () => {
    // 解析当前的transform值
    const currentTransform = layer.attrs?.layoutStyle?.transform || '';
    const translateMatch = currentTransform.match(/translate\(([^)]+)\)/);

    let translateX = 0;
    let translateY = 0;

    if (translateMatch) {
      const translateValues = translateMatch[1]
        .split(',')
        .map((v: string) => parseFloat(v.trim().replace('px', '')) || 0);
      translateX = translateValues[0] || 0;
      translateY = translateValues[1] || 0;
    }

    // 计算各个方向的数值（显示实际的偏移值，保留符号）
    const topValue = translateY < 0 ? translateY : 0;
    const bottomValue = translateY > 0 ? translateY : 0;
    const leftValue = translateX < 0 ? translateX : 0;
    const rightValue = translateX > 0 ? translateX : 0;
    const hasOffset = translateX !== 0 || translateY !== 0;

    const changePosition = (
      key: 'top' | 'right' | 'bottom' | 'left' | 'reset',
      value: number
    ) => {
      let newTranslateX = translateX;
      let newTranslateY = translateY;

      switch (key) {
        case 'top':
          newTranslateY -= value;
          break;
        case 'right':
          newTranslateX += value;
          break;
        case 'bottom':
          newTranslateY += value;
          break;
        case 'left':
          newTranslateX -= value;
          break;
        case 'reset':
          newTranslateX = 0;
          newTranslateY = 0;
          break;
      }

      // 构建新的transform字符串
      let newTransform = currentTransform;
      const translateStr = `translate(${newTranslateX}px, ${newTranslateY}px)`;

      if (translateMatch) {
        // 替换现有的translate
        newTransform = currentTransform.replace(
          /translate\([^)]+\)/,
          translateStr
        );
      } else {
        // 添加新的translate
        newTransform = currentTransform
          ? `${currentTransform} ${translateStr}`
          : translateStr;
      }

      worksStore.changeCompAttr(editingElemId, {
        layoutStyle: {
          ...layer.attrs?.layoutStyle,
          transform: newTransform,
        },
      });

      onUpdate?.();
    };

    return (
      <div className='flex gap-2 p-3 justify-around items-center h-full'>
        <div className='flex gap-1 flex-1'>
          <BtnLite
            className='border flex-1 col'
            isActive={topValue !== 0}
            onClick={() => {
              changePosition('top', 4);
            }}
          >
            <MoveUp size={16} />
            <div className='flex flex-col items-center gap-0.5'>
              <span>上移</span>
              <span className='text-[10px] font-normal h-[12px]'>
                {topValue !== 0 ? `${topValue}px` : ''}
              </span>
            </div>
          </BtnLite>
          <BtnLite
            className='border flex-1 col'
            isActive={bottomValue !== 0}
            onClick={() => {
              changePosition('bottom', 4);
            }}
          >
            <MoveDown size={16} />
            <div className='flex flex-col items-center gap-0.5'>
              <span>下移</span>
              <span className='text-[10px] font-normal h-[12px]'>
                {bottomValue !== 0 ? `${bottomValue}px` : ''}
              </span>
            </div>
          </BtnLite>
          <BtnLite
            className='border flex-1 col'
            isActive={leftValue !== 0}
            onClick={() => {
              changePosition('left', 4);
            }}
          >
            <MoveLeft size={16} />
            <div className='flex flex-col items-center gap-0.5'>
              <span>左移</span>
              <span className='text-[10px] font-normal h-[12px]'>
                {leftValue !== 0 ? `${leftValue}px` : ''}
              </span>
            </div>
          </BtnLite>
          <BtnLite
            className='border flex-1 col'
            isActive={rightValue !== 0}
            onClick={() => {
              changePosition('right', 4);
            }}
          >
            <MoveRight size={16} />
            <div className='flex flex-col items-center gap-0.5'>
              <span>右移</span>
              <span className='text-[10px] font-normal h-[12px]'>
                {rightValue !== 0 ? `${rightValue}px` : ''}
              </span>
            </div>
          </BtnLite>
          <BtnLite
            className='border flex-1 col'
            isActive={hasOffset}
            onClick={() => {
              changePosition('reset', 0);
            }}
          >
            <RotateCcw size={16} />
            <span>复位</span>
          </BtnLite>
        </div>
        {/* {hasMoveBtn && (
          <>
            <div className='split w-[1px] h-[100px] bg-gray-200 self-center'></div>
            <div className='flex flex-col gap-2 justify-center items-center'>
              {!isFirstChild && !onlyOneChild && (
                <BtnLite
                  className={isFirstChild ? 'disabled' : ''}
                  onClick={() => {
                    if (isFirstChild) return;
                    moveElemV2('up');
                  }}
                >
                  <ArrowUpFromLine size={16} />
                  <span>调上一层</span>
                </BtnLite>
              )}
              {!isLastChild && !onlyOneChild && (
                <BtnLite
                  className={isLastChild ? 'disabled' : ''}
                  onClick={() => {
                    if (isLastChild) return;
                    moveElemV2('down');
                  }}
                >
                  <ArrowDownFromLine size={16} />
                  <span>调下一层</span>
                </BtnLite>
              )}
            </div>
          </>
        )} */}
      </div>
    );
  };

  const renderBtns = () => {
    const activeRow = getActiveRow();
    const currCellIds = (activeRow?.childrenIds || []).filter(Boolean);
    const isFirstChild =
      currCellIds.findIndex(id => id === editingElemId) === 0;
    const isLastChild =
      currCellIds.findIndex(id => id === editingElemId) ===
      currCellIds.length - 1;
    const onlyOneChild = currCellIds.length === 1;
    const isRSVP1 = layer.elementRef === 'RSVP1';
    const fullStack = queryToObj().designer_tool === 'dev';
    // RSVP1 只有在设计师模式下才显示复制和删除按钮
    const shouldHideRSVP1Actions = isRSVP1 && !fullStack;

    // 计算微调按钮的激活状态
    const currentTransform = layer.attrs?.layoutStyle?.transform || '';
    const translateMatch = currentTransform.match(/translate\(([^)]+)\)/);
    let hasFinetuneOffset = false;
    if (translateMatch) {
      const translateValues = translateMatch[1]
        .split(',')
        .map((v: string) => parseFloat(v.trim().replace('px', '')) || 0);
      const translateX = translateValues[0] || 0;
      const translateY = translateValues[1] || 0;
      hasFinetuneOffset = translateX !== 0 || translateY !== 0;
    }

    return (
      <>
        {renderEditForm()}
        {!isAbsoluteElem ? (
          <>
            <Popover
              open={showFinetunePopover}
              onOpenChange={setShowFinetunePopover}
            >
              <PopoverTrigger asChild>
                <BtnLiteColumn
                  isActive={hasFinetuneOffset}
                  onClick={e => {
                    e.stopPropagation();
                    setShowFinetunePopover(true);
                  }}
                >
                  <div className='border_icon'>
                    <Pencil size={16} />
                  </div>
                  <span>微调</span>
                </BtnLiteColumn>
              </PopoverTrigger>
              <PopoverContent className='p-0 shadow-none rounded-b-none md:w-fit w-screen md:rounded-lg md:shadow-lg md:border-none overflow-hidden'>
                {renderFinetunePanel()}
              </PopoverContent>
            </Popover>
            <Popover
              open={showSpacingPopover}
              onOpenChange={handleSetShowSpacingPopover}
            >
              <PopoverTrigger asChild>
                <BtnLiteColumn
                  onClick={e => {
                    e.stopPropagation();
                    handleSetShowSpacingPopover(true);
                  }}
                >
                  <div className='border_icon'>
                    <Code size={16} className='transform rotate-90' />
                  </div>
                  <span>间距</span>
                </BtnLiteColumn>
              </PopoverTrigger>
              <PopoverContent className='p-0 shadow-none rounded-b-none md:w-fit w-screen md:rounded-lg md:shadow-lg md:border-none overflow-hidden'>
                <div className='p-4'>
                  <div className='text-[12px] text-gray-500'>上下调整</div>
                  <ToggleGroup
                    type='single'
                    value={
                      tempTopMargin === tempBottomMargin
                        ? tempTopMargin.toString()
                        : ''
                    }
                    onValueChange={value => {
                      if (!value) return;
                      const nextGap = parseInt(value, 10);
                      setTempTopMargin(nextGap);
                      setTempBottomMargin(nextGap);

                      const prevLayoutStyle =
                        (layer.attrs as any)?.layoutStyle || {};
                      const prevMargin = prevLayoutStyle.margin as
                        | string
                        | undefined;
                      const [prevTop, prevRight, prevBottom, prevLeft] =
                        stringValueTo4Chunk(prevMargin || '') || [0, 0, 0, 0];

                      const nextMargin = numberChunkValueToString([
                        nextGap,
                        prevRight ?? 0,
                        nextGap,
                        prevLeft ?? 0,
                      ]);

                      worksStore.changeCompAttr(layer.elemId, {
                        layoutStyle: {
                          ...prevLayoutStyle,
                          margin: nextMargin,
                        },
                      });
                    }}
                    className='grid grid-cols-6 gap-2 mb-2'
                  >
                    {commonGaps.map(gap => (
                      <ToggleGroupItem
                        key={gap}
                        value={gap.toString()}
                        size='sm'
                        className='text-xs px-2'
                      >
                        {gap}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <div className='flex gap-4 px-2'>
                    <div className='flex-1 flex flex-col gap-2'>
                      <div className='text-[12px] text-gray-500'>上边距</div>
                      <Slider
                        min={0}
                        max={64}
                        step={2}
                        size='lg'
                        value={[tempTopMargin]}
                        onValueChange={values => {
                          if (!values?.length) return;
                          setTempTopMargin(values[0]);
                        }}
                        onValueCommit={values => {
                          if (!values?.length) return;
                          const nextTop = values[0];

                          const prevLayoutStyle =
                            (layer.attrs as any)?.layoutStyle || {};
                          const prevMargin = prevLayoutStyle.margin as
                            | string
                            | undefined;
                          const [prevTop, prevRight, prevBottom, prevLeft] =
                            stringValueTo4Chunk(prevMargin || '') || [
                              0, 0, 0, 0,
                            ];

                          const nextMargin = numberChunkValueToString([
                            nextTop,
                            prevRight ?? 0,
                            tempBottomMargin,
                            prevLeft ?? 0,
                          ]);

                          worksStore.changeCompAttr(layer.elemId, {
                            layoutStyle: {
                              ...prevLayoutStyle,
                              margin: nextMargin,
                            },
                          });
                        }}
                      />
                      <div className='text-[12px] font-semibold text-[#333] text-center'>
                        {tempTopMargin}px
                      </div>
                    </div>
                    <div className='flex-1 flex flex-col gap-2'>
                      <div className='text-[12px] text-gray-500'>下边距</div>
                      <Slider
                        min={0}
                        max={64}
                        step={2}
                        size='lg'
                        value={[tempBottomMargin]}
                        onValueChange={values => {
                          if (!values?.length) return;
                          setTempBottomMargin(values[0]);
                        }}
                        onValueCommit={values => {
                          if (!values?.length) return;
                          const nextBottom = values[0];

                          const prevLayoutStyle =
                            (layer.attrs as any)?.layoutStyle || {};
                          const prevMargin = prevLayoutStyle.margin as
                            | string
                            | undefined;
                          const [prevTop, prevRight, prevBottom, prevLeft] =
                            stringValueTo4Chunk(prevMargin || '') || [
                              0, 0, 0, 0,
                            ];

                          const nextMargin = numberChunkValueToString([
                            tempTopMargin,
                            prevRight ?? 0,
                            nextBottom,
                            prevLeft ?? 0,
                          ]);

                          worksStore.changeCompAttr(layer.elemId, {
                            layoutStyle: {
                              ...prevLayoutStyle,
                              margin: nextMargin,
                            },
                          });
                        }}
                      />
                      <div className='text-[12px] font-semibold text-[#333] text-center'>
                        {tempBottomMargin}px
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <BtnLiteColumn
              disabled={isFirstChild || onlyOneChild}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                if (isFirstChild) return;
                moveElemV2('up');
                onUpdate?.();
              }}
            >
              <div className='border_icon'>
                <ChevronUp size={16} />
              </div>
              <span>上移</span>
            </BtnLiteColumn>
            <BtnLiteColumn
              disabled={isLastChild || onlyOneChild}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                if (isLastChild) return;
                moveElemV2('down');
                onUpdate?.();
              }}
            >
              <div className='border_icon'>
                <ChevronDown size={16} />
              </div>
              <span>下移</span>
            </BtnLiteColumn>
          </>
        ) : (
          <>
            <Popover
              open={showFinetunePopover}
              onOpenChange={setShowFinetunePopover}
            >
              <PopoverTrigger asChild>
                <BtnLiteColumn>
                  <div className='border_icon'>
                    <ArrowUpFromLine size={16} />
                  </div>
                  <span>层级</span>
                </BtnLiteColumn>
              </PopoverTrigger>
              <PopoverContent className='p-0 shadow-none rounded-b-none md:w-fit w-screen md:rounded-lg md:shadow-lg md:border-none overflow-hidden'>
                {/* {renderFinetunePanel()} */}
                <div className='p-4 flex gap-2'>
                  <BtnLite
                    className='border flex-1 justify-center'
                    onClick={() => {
                      worksStore.changeCompAttr(layer.elemId, {
                        layoutStyle: {
                          zIndex: +(layer.attrs?.layoutStyle?.zIndex || 0) + 1,
                        },
                      });
                    }}
                  >
                    <MoveUp size={16} />
                    <span>调上一层</span>
                  </BtnLite>
                  <BtnLite
                    className='border flex-1 justify-center'
                    onClick={() => {
                      worksStore.changeCompAttr(layer.elemId, {
                        layoutStyle: {
                          zIndex: +(layer.attrs?.layoutStyle?.zIndex || 0) - 1,
                        },
                      });
                    }}
                  >
                    <MoveDown size={16} />
                    <span>调下一层</span>
                  </BtnLite>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
        {!shouldHideRSVP1Actions && (
          <BtnLiteColumn
            onClick={() => {
              // store.deleteCompEntity(layer.elemId)
              const nextId = duplicateElemV2();
              if (nextId) {
                setWidgetStateV2({
                  editingElemId: nextId,
                });
              }
            }}
          >
            <div className='border_icon'>
              <Copy size={16} />
            </div>
            <span>复制</span>
          </BtnLiteColumn>
        )}
        {!shouldHideRSVP1Actions && (
          <BtnLiteColumn
            onClick={() => {
              deleteElemV2();
              // clearActiveStatus?.();

              setWidgetStateV2({
                editingElemId: undefined,
              });
            }}
          >
            <div className='border_icon'>
              <Trash2 size={16} />
            </div>
            <span>删除</span>
          </BtnLiteColumn>
        )}
        {isInList && (
          <BtnLiteColumn
            style={{
              borderLeft: '1px solid #0000000f',
            }}
            onClick={() => {
              setWidgetStateV2({
                activeRowDepth: parentRowDepth,
                editingElemId: undefined,
              });
            }}
          >
            <span>编辑列表</span>
          </BtnLiteColumn>
        )}
      </>
    );
  };
  return renderBtns();
};

export default observer(SettingElemV3);
