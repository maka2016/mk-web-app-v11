import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  ChevronDown,
  ComponentIcon,
  LibraryBig,
  PencilLine,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useState } from 'react';
import { useGridContext } from '../../../comp/provider';
import UserColorPicker from '../../../shared/ColorPicker/UserColorPicker';
import { colorValueBuilder } from '../../../shared/ColorPicker/utils';
import { BtnLite } from '../../../shared/style-comps';
import { getElementDisplayName } from '../../AddCompHelper/const';
import { SelectableElement } from '../../StylingManager/types';
import MaterialManagerSelector from '../MaterialManagerSelector';
import MaterialGroupSelector from './MaterialGroupSelector';
import { TagPicker } from './TagPicker';

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

const TagPickerPopoverForText = () => {
  const { widgetStateV2, getActiveRow, editorSDK } = useGridContext();
  const [open, setOpen] = useState(false);
  const { activeRowDepth, editingElemId } = widgetStateV2;
  const currTag = editingElemId
    ? editorSDK?.getLink(editingElemId)?.tag
    : getActiveRow()?.tag;
  return (
    <>
      <BtnLite
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {getElementDisplayName(currTag as SelectableElement)}
        <ChevronDown size={14} />
      </BtnLite>
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
    // <Popover open={open} onOpenChange={setOpen}>
    //   <PopoverTrigger asChild>
    //     <BtnLite onClick={(e) => {}}>
    //       {getElementDisplayName(currTag as SelectableElement)}
    //       <ChevronDown size={14} />
    //     </BtnLite>
    //   </PopoverTrigger>
    //   <PopoverContent className="p-0">
    //     <TagPicker
    //       replaceMode={true}
    //       noTitle={true}
    //       onClose={() => {
    //         setOpen(false);
    //       }}
    //     />
    //   </PopoverContent>
    // </Popover>
  );
};

export default function TextEditorV2({ layer }: { layer: any }) {
  const { editorSDK, fullStack, materialResourcesGroup } = useGridContext();
  const [showMaterialManagerSelector, setShowMaterialManagerSelector] =
    useState(false);
  const step = 2;

  return (
    <>
      {fullStack && (
        <Popover>
          <PopoverTrigger asChild>
            <BtnLite>
              <ComponentIcon size={20} />
            </BtnLite>
          </PopoverTrigger>
          <PopoverContent>
            <MaterialGroupSelector
              activeGroupId={layer.attrs.materialGroupRefId}
              materialGroup={materialResourcesGroup?.text}
              onSelect={group => {
                editorSDK?.changeCompAttr(layer.elemId, {
                  materialGroupRefId: group.id,
                });
              }}
            />
          </PopoverContent>
        </Popover>
      )}
      {layer.attrs.materialGroupRefId && (
        <BtnLite
          onClick={() => {
            setShowMaterialManagerSelector(true);
          }}
        >
          <LibraryBig size={20} />
        </BtnLite>
      )}
      <BtnLite
        title='文本'
        id={`${layer.elemId}-text-edit`}
        onClick={() => {
          const activeTextDOM = document.querySelector<HTMLDivElement>(
            `#layer_root_${layer.elemId} .editinput`
          );
          if (activeTextDOM) {
            activeTextDOM.focus();
            // 将光标移动到内容最后
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(activeTextDOM);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }}
      >
        <PencilLine size={20} />
        <span>改字</span>
      </BtnLite>
      {fullStack && <TagPickerPopoverForText />}
      <UserColorPicker
        wrapper={trigger => {
          return <BtnLite>{trigger}</BtnLite>;
        }}
        value={layer.attrs.color}
        onChange={value => {
          editorSDK?.changeCompAttr(layer.elemId, {
            ...layer.attrs,
            color: colorValueBuilder(value),
          });
        }}
      />
      <BtnLite
        title='文本'
        className={parseFontSize(layer.attrs.fontSize) >= 100 ? 'disabled' : ''}
        onClick={() => {
          const currentFontSize = parseFontSize(layer.attrs.fontSize);
          const nextVal = {
            ...layer.attrs,
            fontSize: Math.min(100, currentFontSize + step),
          };
          editorSDK?.changeCompAttr(layer.elemId, nextVal);
        }}
      >
        {/* <AArrowUp size={20} /> */}
        <ZoomIn size={20} />
        {/* <span>放大</span> */}
      </BtnLite>
      <BtnLite
        title='文本'
        className={parseFontSize(layer.attrs.fontSize) <= 10 ? 'disabled' : ''}
        onClick={() => {
          const currentFontSize = parseFontSize(layer.attrs.fontSize);
          const nextVal = {
            ...layer.attrs,
            fontSize: Math.max(10, currentFontSize - step),
          };
          editorSDK?.changeCompAttr(layer.elemId, nextVal);
        }}
      >
        <ZoomOut size={20} />

        {/* <AArrowDown size={20} /> */}
        {/* <span>缩小</span> */}
      </BtnLite>
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
    </>
  );
}
