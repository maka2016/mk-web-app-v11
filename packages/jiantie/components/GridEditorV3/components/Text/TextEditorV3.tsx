import { useWorksStore } from '@/components/GridEditorV3/works-store/store/hook';
import styled from '@emotion/styled';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Slider } from '@workspace/ui/components/slider';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group';
import chroma from 'chroma-js';
import {
  ALargeSmall,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  LibraryBig,
  Palette,
  PencilLine,
  TextQuote,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import MaterialManagerSelector from '../../componentsForEditor/DesignerOperatorV2/MaterialManagerSelector';
import { TagPicker } from '../../componentsForEditor/SettingPopoverDesigner/TagPicker';
import { SelectableElement } from '../../componentsForEditor/types';
import { getElementDisplayName } from '../../utils/const';
import UserColorPicker from '../ColorPicker/UserColorPicker';
import { colorValueBuilder } from '../ColorPicker/utils';
import { BtnLiteColumn } from '../style-comps';
import TextEditDialog from './TextEditDialog';

// 辅助函数：安全地解析fontSize值
const parseFontSize = (fontSize: any): number => {
  if (typeof fontSize === 'number') {
    return fontSize;
  }
  if (typeof fontSize === 'string') {
    // 移除单位（px, em, rem等）并转换为数字
    const numericValue = parseFloat(fontSize.replace(/[^\d.-]/g, ''));
    return isNaN(numericValue) ? 16 : numericValue;
  }
  return 16; // 默认值
};

// 根据背景色计算高对比度的图标颜色（前景色）- 支持纯色和渐变
const getContrastIconColor = (bgHex?: string): string => {
  if (!bgHex) return '#111827'; // 默认深色

  try {
    let colorForCalc = bgHex;

    // 如果是渐变（例如：linear-gradient(...)），从中提取代表颜色
    if (bgHex.startsWith('linear-gradient')) {
      // 提取渐变中的所有 hex 颜色
      const hexColors = bgHex.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g);

      if (hexColors && hexColors.length > 0) {
        if (hexColors.length === 1) {
          // 只有一个 stop，直接用这个颜色
          colorForCalc = hexColors[0];
        } else {
          // 有多个 stop，取首尾两个做一次简单的中间混合，得到一个代表色
          try {
            const mixed = chroma.mix(
              hexColors[0],
              hexColors[hexColors.length - 1],
              0.5,
              'lab'
            );
            colorForCalc = mixed.hex();
          } catch {
            // mix 失败就用第一个 stop 兜底
            colorForCalc = hexColors[0];
          }
        }
      }
    }

    const luminance = chroma(colorForCalc).luminance();
    // 背景偏亮时用深色图标，背景偏暗时用白色图标
    return luminance > 0.5 ? '#111827' : '#ffffff';
  } catch {
    // 解析失败时兜底为深色
    return '#111827';
  }
};

// 在基础颜色上计算一个更深的边框颜色 - 支持纯色和渐变
const getDarkerBorderColor = (baseHex?: string): string => {
  if (!baseHex) return '#111827';
  try {
    let colorForCalc = baseHex;

    // 渐变场景：从 linear-gradient(...) 中抽取代表色再加深
    if (baseHex.startsWith('linear-gradient')) {
      const hexColors = baseHex.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g);

      if (hexColors && hexColors.length > 0) {
        if (hexColors.length === 1) {
          colorForCalc = hexColors[0];
        } else {
          try {
            const mixed = chroma.mix(
              hexColors[0],
              hexColors[hexColors.length - 1],
              0.5,
              'lab'
            );
            colorForCalc = mixed.hex();
          } catch {
            colorForCalc = hexColors[0];
          }
        }
      }
    }

    return chroma(colorForCalc).darken(0.8).hex();
  } catch {
    return '#111827';
  }
};

// 对齐方式类型
type TextAlign = 'left' | 'center' | 'right' | 'justify';

// 对齐方式配置（图标映射）
const alignIconMap = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
};

// 对齐方式的翻译 key 映射
const alignLabelKeyMap: Record<TextAlign, string> = {
  left: 'alignLeft',
  center: 'alignCenter',
  right: 'alignRight',
  justify: 'alignJustify',
};

// 对齐方式切换顺序
const alignOrder: TextAlign[] = ['left', 'center', 'right', 'justify'];

// 常用字号选项（精简版，一行显示）
const commonFontSizes = [12, 16, 20, 24, 32, 48];

// 字号滑动条容器样式
const FontSizeSliderContainer = styled.div`
  padding: 8px 16px 24px;
`;

const FontSizeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #333;
`;

const SliderWrapper = styled.div`
  display: flex;
  gap: 8px;
  padding: 0 8px;
`;

const TagPickerPopoverForText = () => {
  const t = useTranslations('Editor');
  const worksStore = useWorksStore();
  const { getActiveRow } = worksStore.gridPropsOperator;
  const [open, setOpen] = useState(false);
  const { editingElemId } = worksStore.widgetStateV2;
  const currTag = editingElemId
    ? worksStore.getLayer(editingElemId)?.tag
    : getActiveRow()?.tag;
  return (
    <>
      <BtnLiteColumn
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {getElementDisplayName(currTag as SelectableElement)}
        <ChevronDown size={14} />
      </BtnLiteColumn>
      <ResponsiveDialog isOpen={open} onOpenChange={setOpen} title={t('textStyle')}>
        <TagPicker
          replaceMode={true}
          noTitle={true}
          onClose={() => {
            setOpen(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
};

function TextEditorV3({ layer }: { layer: any }) {
  const t = useTranslations('Editor');
  const worksStore = useWorksStore();
  const fullStack = worksStore.fullStack;
  const { materialResourcesGroup } = worksStore.worksData.gridProps;
  const [showMaterialManagerSelector, setShowMaterialManagerSelector] =
    useState(false);
  const [showTextEditDialog, setShowTextEditDialog] = useState(false);
  const [showFontSizePopover, setShowFontSizePopover] = useState(false);
  const [showAlignPopover, setShowAlignPopover] = useState(false);
  const [showTextIndentPopover, setShowTextIndentPopover] = useState(false);

  // 获取当前对齐方式
  const currentAlign = (layer.attrs.textAlign || 'left') as TextAlign;
  const AlignIcon = alignIconMap[currentAlign];

  const handleSetShowFontSizePopover = (open: boolean) => {
    if (open) {
      setTempFontSize(currentFontSize);
    }
    setShowFontSizePopover(open);
  };

  // 获取加粗状态
  const isBold =
    layer.attrs.fontWeight === 'bold' || layer.attrs.fontWeight >= 700;

  // 获取当前字号
  const currentFontSize = parseFontSize(layer.attrs.fontSize || 16);

  // 临时字号状态（用于滑动时实时显示）
  const [tempFontSize, setTempFontSize] = useState<number>(currentFontSize);

  // 获取当前首行缩进的字符数（0, 2, 4, 8）
  const getCurrentIndentChars = (): string => {
    const textIndent = layer.attrs.textIndent;
    if (!textIndent || textIndent === 0) return '0';

    let emValue = 0;
    if (typeof textIndent === 'number') {
      // 如果是数字，假设是 px，转换为 em（基于当前字号）
      emValue = textIndent / currentFontSize;
    } else if (typeof textIndent === 'string') {
      if (textIndent.endsWith('em')) {
        emValue = parseFloat(textIndent) || 0;
      } else if (textIndent.endsWith('px')) {
        emValue = parseFloat(textIndent) / currentFontSize || 0;
      } else {
        emValue = parseFloat(textIndent) / currentFontSize || 0;
      }
    }

    // 将 em 值转换为最接近的字符数选项（0, 2, 4, 8）
    if (emValue <= 0) return '0';
    if (emValue <= 3) return '2';
    if (emValue <= 6) return '4';
    return '8';
  };

  const currentIndentChars = getCurrentIndentChars();

  return (
    <>
      {layer.attrs.materialGroupRefId && (
        <BtnLiteColumn
          onClick={() => {
            setShowMaterialManagerSelector(true);
          }}
        >
          <div className='border_icon'>
            <LibraryBig size={16} />
          </div>
          <span>{t('material')}</span>
        </BtnLiteColumn>
      )}
      <BtnLiteColumn
        title={t('text')}
        id={`${layer.elemId}-text-edit`}
        onClick={() => {
          setShowTextEditDialog(true);
        }}
      >
        <div className='border_icon'>
          <PencilLine size={16} />
        </div>
        <span>{t('editText')}</span>
      </BtnLiteColumn>
      <TextEditDialog
        isOpen={showTextEditDialog}
        onOpenChange={setShowTextEditDialog}
        layer={layer}
      />
      {fullStack && <TagPickerPopoverForText />}
      <UserColorPicker
        wrapper={(trigger, colorForDisplay) => {
          // 用 chroma 根据背景色计算一个高对比度的 icon 颜色
          const colorForIcon = getContrastIconColor(colorForDisplay.hex);
          return (
            <BtnLiteColumn>
              <div
                className='border_icon'
                style={{
                  borderColor: getDarkerBorderColor(colorForDisplay.hex),
                  background: colorForDisplay.hex,
                }}
              >
                {/* {trigger} */}
                <Palette size={16} color={colorForIcon} />
              </div>
              {t('color')}
            </BtnLiteColumn>
          );
        }}
        value={layer.attrs.color}
        onChange={value => {
          worksStore?.changeCompAttr(layer.elemId, {
            color: colorValueBuilder(value),
          });
        }}
      />
      <BtnLiteColumn
        title={t('bold')}
        className={isBold ? 'active' : ''}
        onClick={() => {
          worksStore?.changeCompAttr(layer.elemId, {
            fontWeight: isBold ? 'normal' : 'bold',
          });
        }}
      >
        <div className='border_icon'>
          <Bold size={16} />
        </div>
        <span>{t('bold')}</span>
      </BtnLiteColumn>
      <Popover open={showAlignPopover} onOpenChange={setShowAlignPopover}>
        <PopoverTrigger asChild>
          <BtnLiteColumn title={t(alignLabelKeyMap[currentAlign])}>
            <div className='border_icon'>
              <AlignIcon size={16} />
            </div>
            <span>{t('align')}</span>
          </BtnLiteColumn>
        </PopoverTrigger>
        <PopoverContent className='p-2 shadow-none rounded-b-none md:w-fit w-screen md:rounded-lg md:shadow-lg md:border-none overflow-hidden' align='start'>
          <div className='flex gap-1'>
            {alignOrder.map(align => {
              const Icon = alignIconMap[align];
              const isActive = currentAlign === align;
              return (
                <button
                  key={align}
                  onClick={() => {
                    worksStore.changeCompAttr(layer.elemId, {
                      textAlign: align,
                    });
                    setShowAlignPopover(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                    }`}
                >
                  <Icon size={16} />
                  <span>{t(alignLabelKeyMap[align])}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      <Popover
        open={showFontSizePopover}
        onOpenChange={handleSetShowFontSizePopover}
      >
        <PopoverTrigger asChild>
          <BtnLiteColumn title={t('fontSize')}>
            <div className='border_icon'>
              <ALargeSmall size={16} />
            </div>
            {t('fontSize')}
          </BtnLiteColumn>
        </PopoverTrigger>
        <PopoverContent className='p-0 shadow-none rounded-b-none md:w-fit w-screen md:rounded-lg md:shadow-lg md:border-none overflow-hidden'>
          <FontSizeSliderContainer>
            <ToggleGroup
              type='single'
              value={tempFontSize.toString()}
              onValueChange={value => {
                if (value) {
                  const size = parseInt(value);
                  setTempFontSize(size);
                  worksStore.changeCompAttr(layer.elemId, {
                    fontSize: size,
                  });
                }
              }}
              className='grid grid-cols-6 gap-2 mb-5 bg-transparent p-0'
            >
              {commonFontSizes.map(size => (
                <ToggleGroupItem
                  key={size}
                  value={size.toString()}
                  size='sm'
                  className='text-xs px-2'
                >
                  {size}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <SliderWrapper>
              <Slider
                min={12}
                max={48}
                step={2}
                size='lg'
                value={[tempFontSize]}
                onValueChange={values => {
                  setTempFontSize(values[0]);
                }}
                onValueCommit={values => {
                  worksStore.changeCompAttr(layer.elemId, {
                    fontSize: values[0],
                  });
                }}
              />
              <FontSizeDisplay>{tempFontSize}px</FontSizeDisplay>
            </SliderWrapper>
          </FontSizeSliderContainer>
        </PopoverContent>
      </Popover>
      <Popover
        open={showTextIndentPopover}
        onOpenChange={setShowTextIndentPopover}
      >
        <PopoverTrigger asChild>
          <BtnLiteColumn
            title={t('firstLineIndentTitle')}
            className={currentIndentChars !== '0' ? 'active' : ''}
          >
            <div className='border_icon'>
              <TextQuote size={16} />
            </div>
            {t('indent')}
          </BtnLiteColumn>
        </PopoverTrigger>
        <PopoverContent className='p-2 shadow-none rounded-b-none md:w-fit w-screen md:rounded-lg md:shadow-lg md:border-none overflow-hidden' align='start'>
          <ToggleGroup
            type='single'
            value={currentIndentChars}
            onValueChange={value => {
              if (value) {
                const chars = parseInt(value);
                worksStore.changeCompAttr(layer.elemId, {
                  textIndent: chars > 0 ? `${chars}em` : 0,
                });
                // setShowTextIndentPopover(false);
              }
            }}
            className='flex gap-1 bg-transparent p-0'
          >
            <ToggleGroupItem value='0' className='text-xs px-3 whitespace-nowrap'>
              {t('indentNone')}
            </ToggleGroupItem>
            <ToggleGroupItem value='2' className='text-xs px-3 whitespace-nowrap'>
              {t('indent2Chars')}
            </ToggleGroupItem>
            <ToggleGroupItem value='4' className='text-xs px-3 whitespace-nowrap'>
              {t('indent4Chars')}
            </ToggleGroupItem>
            <ToggleGroupItem value='8' className='text-xs px-3 whitespace-nowrap'>
              {t('indent8Chars')}
            </ToggleGroupItem>
          </ToggleGroup>
        </PopoverContent>
      </Popover>
      <ResponsiveDialog
        isOpen={showMaterialManagerSelector}
        onOpenChange={setShowMaterialManagerSelector}
        title={t('changeCopy')}
      >
        {materialResourcesGroup?.text && (
          <MaterialManagerSelector
            materialGroup={
              materialResourcesGroup?.text
                ? ([
                  materialResourcesGroup?.text?.find(
                    (group: any) =>
                      group.id === layer.attrs.materialGroupRefId
                  ),
                ].filter(Boolean) as any)
                : undefined
            }
            onChange={material => {
              worksStore.changeCompAttr(layer.elemId, {
                text: material.content,
              });
              setShowMaterialManagerSelector(false);
            }}
          />
        )}
      </ResponsiveDialog>
    </>
  );
}

export default observer(TextEditorV3);
