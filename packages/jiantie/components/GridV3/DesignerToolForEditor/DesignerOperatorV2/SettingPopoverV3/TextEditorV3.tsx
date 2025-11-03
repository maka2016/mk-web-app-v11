import styled from '@emotion/styled';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Slider } from '@workspace/ui/components/slider';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@workspace/ui/components/toggle-group';
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
} from 'lucide-react';
import { useState } from 'react';
import { useGridContext } from '../../../comp/provider';
import UserColorPicker from '../../../shared/ColorPicker/UserColorPicker';
import { colorValueBuilder } from '../../../shared/ColorPicker/utils';
import { BtnLiteColumn } from '../../../shared/style-comps';
import { getElementDisplayName } from '../../AddCompHelper/const';
import { SelectableElement } from '../../StylingManager/types';
import MaterialManagerSelector from '../MaterialManagerSelector';
import { TagPicker } from '../SettingPopoverV2/TagPicker';
import { TextEditDialog } from './TextEditDialog';

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

// 对齐方式类型
type TextAlign = 'left' | 'center' | 'right' | 'justify';

// 对齐方式配置
const alignConfig = {
  left: { icon: AlignLeft, label: '左对齐' },
  center: { icon: AlignCenter, label: '居中' },
  right: { icon: AlignRight, label: '右对齐' },
  justify: { icon: AlignJustify, label: '两端' },
};

// 对齐方式切换顺序
const alignOrder: TextAlign[] = ['left', 'center', 'right', 'justify'];

// 获取下一个对齐方式
const getNextAlign = (current: string): TextAlign => {
  const currentIndex = alignOrder.indexOf(current as TextAlign);
  if (currentIndex === -1) return 'left';
  return alignOrder[(currentIndex + 1) % alignOrder.length];
};

// 常用字号选项（精简版，一行显示）
const commonFontSizes = [12, 16, 20, 24, 32, 48];

// 字号滑动条容器样式
const FontSizeSliderContainer = styled.div`
  padding: 8px 16px 32px;
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
  const { widgetStateV2, getActiveRow, editorSDK } = useGridContext();
  const [open, setOpen] = useState(false);
  const { editingElemId } = widgetStateV2;
  const currTag = editingElemId
    ? editorSDK?.getLink(editingElemId)?.tag
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
      <ResponsiveDialog isOpen={open} onOpenChange={setOpen} title='文字样式'>
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

export default function TextEditorV3({ layer }: { layer: any }) {
  const { editorSDK, fullStack, materialResourcesGroup } = useGridContext();
  const [showMaterialManagerSelector, setShowMaterialManagerSelector] =
    useState(false);
  const [showTextEditDialog, setShowTextEditDialog] = useState(false);
  const [fontSizeDialogOpen, setFontSizeDialogOpen] = useState(false);

  // 获取当前对齐方式
  const currentAlign = (layer.attrs.textAlign || 'left') as TextAlign;
  const AlignIcon = alignConfig[currentAlign].icon;

  // 获取加粗状态
  const isBold =
    layer.attrs.fontWeight === 'bold' || layer.attrs.fontWeight >= 700;

  // 获取当前字号
  const currentFontSize = parseFontSize(layer.attrs.fontSize || 16);

  // 临时字号状态（用于滑动时实时显示）
  const [tempFontSize, setTempFontSize] = useState<number>(currentFontSize);

  // 当对话框打开时，重置临时字号
  const handleDialogOpenChange = (open: boolean) => {
    setFontSizeDialogOpen(open);
    if (open) {
      setTempFontSize(currentFontSize);
    }
  };

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
          <span>素材</span>
        </BtnLiteColumn>
      )}
      <BtnLiteColumn
        title='文本'
        id={`${layer.elemId}-text-edit`}
        onClick={() => {
          setShowTextEditDialog(true);
        }}
      >
        <div className='border_icon'>
          <PencilLine size={16} />
        </div>
        <span>改字</span>
      </BtnLiteColumn>
      <TextEditDialog
        isOpen={showTextEditDialog}
        onOpenChange={setShowTextEditDialog}
        layer={layer}
        editorSDK={editorSDK}
      />
      {fullStack && <TagPickerPopoverForText />}
      <UserColorPicker
        wrapper={trigger => {
          return (
            <BtnLiteColumn>
              <div className='border_icon'>
                {/* {trigger} */}
                <Palette size={16} />
              </div>
              颜色
            </BtnLiteColumn>
          );
        }}
        value={layer.attrs.color}
        onChange={value => {
          editorSDK?.changeCompAttr(layer.elemId, {
            color: colorValueBuilder(value),
          });
        }}
      />
      <BtnLiteColumn
        title='加粗'
        className={isBold ? 'active' : ''}
        onClick={() => {
          editorSDK?.changeCompAttr(layer.elemId, {
            fontWeight: isBold ? 'normal' : 'bold',
          });
        }}
      >
        <div className='border_icon'>
          <Bold size={16} />
        </div>
        <span>加粗</span>
      </BtnLiteColumn>
      <BtnLiteColumn
        title={alignConfig[currentAlign].label}
        onClick={() => {
          const nextAlign = getNextAlign(currentAlign);
          console.log('layer.elemId', layer.elemId);
          editorSDK?.changeCompAttr(layer.elemId, {
            textAlign: nextAlign,
          });
        }}
      >
        <div className='border_icon'>
          <AlignIcon size={16} />
        </div>
        <span>对齐</span>
      </BtnLiteColumn>
      <BtnLiteColumn
        title='字号'
        onClick={() => {
          setFontSizeDialogOpen(true);
        }}
      >
        <div className='border_icon'>
          <ALargeSmall size={16} />
        </div>
        {/* <span>{currentFontSize}px</span> */}
        字号
      </BtnLiteColumn>
      <ResponsiveDialog
        isOpen={showMaterialManagerSelector}
        onOpenChange={setShowMaterialManagerSelector}
        title='换文案'
      >
        {materialResourcesGroup?.text && (
          <MaterialManagerSelector
            materialGroup={
              materialResourcesGroup?.text
                ? ([
                    materialResourcesGroup?.text?.find(
                      group => group.id === layer.attrs.materialGroupRefId
                    ),
                  ].filter(Boolean) as any)
                : undefined
            }
            onChange={material => {
              editorSDK?.changeCompAttr(layer.elemId, {
                text: material.content,
              });
              setShowMaterialManagerSelector(false);
            }}
          />
        )}
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={fontSizeDialogOpen}
        onOpenChange={handleDialogOpenChange}
        handleOnly={true}
        title='调整字号'
        showOverlay={false}
      >
        <FontSizeSliderContainer>
          <ToggleGroup
            type='single'
            value={tempFontSize.toString()}
            onValueChange={value => {
              if (value) {
                const size = parseInt(value);
                setTempFontSize(size);
                editorSDK?.changeCompAttr(layer.elemId, {
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
                editorSDK?.changeCompAttr(layer.elemId, {
                  fontSize: values[0],
                });
              }}
            />
            <FontSizeDisplay>{tempFontSize}px</FontSizeDisplay>
          </SliderWrapper>
        </FontSizeSliderContainer>
      </ResponsiveDialog>
    </>
  );
}
