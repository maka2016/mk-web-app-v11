import RSVPConfigPanelTrigger from '@/components/RSVP/configPanel';
import styled from '@emotion/styled';
import { getPermissionData } from '@mk/services';
import MkCalendarV3Form from '@mk/widgets/MkCalendarV3/form';
import MkMapV4Form from '@mk/widgets/MkMapV4/form-wap';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  Copy,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useGridContext } from '../../../comp/provider';
import { BtnLite } from '../../../shared/style-comps';
import PictureEditV3Pop from './PictureEditV3Pop';
import TextEditorV3Pop from './TextEditorV3Pop';

const BtnLite2 = styled(BtnLite)`
  background-color: rgba(244, 244, 245, 1);
  width: auto;
  border-radius: 8px;
  padding: 8px 16px;
  color: #000;
  font-weight: bold;
`;

export const SettingElemV3Pop = () => {
  const {
    editorSDK,
    editorCtx,
    widgetStateV2,
    getRowByDepth,
    getActiveRow,
    deleteElemV2,
    clearActiveStatus,
    moveElemV2,
    duplicateElemV2,
    setWidgetStateV2,
    getWorksData,
  } = useGridContext();
  const { editingElemId, activeRowDepth } = widgetStateV2 || {};
  const [finetuneMode, setFinetuneMode] = useState(false);

  if (!editingElemId) {
    return <></>;
  }
  const parentRowDepth = activeRowDepth?.slice(0, -1);
  const isInList =
    parentRowDepth && getRowByDepth(parentRowDepth)?.isRepeatList;

  // 有选中元素
  const layer = editorSDK?.getLayer(editingElemId);
  const layerLink = editorSDK?.getLink(editingElemId);
  if (!layer) return <></>;
  let elemTag = layerLink?.tag;
  if (layer.elementRef === 'Text') {
    if (!elemTag) elemTag = 'text';
  }
  if (layer.elementRef === 'Picture') {
    if (!elemTag) elemTag = 'default_picture';
  }

  const activeRow = getActiveRow();

  const currCellIds = (activeRow?.childrenIds || []).filter(Boolean);
  const isFirstChild = currCellIds.findIndex(id => id === editingElemId) === 0;
  const isLastChild =
    currCellIds.findIndex(id => id === editingElemId) ===
    currCellIds.length - 1;
  const onlyOneChild = currCellIds.length === 1;

  const renderEditForm = () => {
    switch (true) {
      case /picture/gi.test(layer.elementRef):
        return <PictureEditV3Pop layer={layer} />;
      case /text/gi.test(layer.elementRef):
        return <TextEditorV3Pop layer={layer} />;
      case /MkMapV4/gi.test(layer.elementRef):
        return (
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <MkMapV4Form
              entityInfo={{ id: layer.elemId }}
              formControledValues={editorSDK?.getLayer(layer.elemId)?.attrs}
              onFormValueChange={(nextVal: any) => {
                editorSDK?.changeCompAttr(layer.elemId, nextVal);
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
              formControledValues={editorSDK?.getLayer(layer.elemId)?.attrs}
              onFormValueChange={(nextVal: any) => {
                editorSDK?.changeCompAttr(layer.elemId, nextVal);
              }}
              editorSDK={editorSDK}
              editorCtx={editorCtx}
            />
          </div>
        );
      case /RSVP/gi.test(layer.elementRef):
        return (
          <RSVPConfigPanelTrigger
            attrs={layer.attrs as any}
            editorSDK={editorSDK}
            layer={layer}
          />
        );
      default:
        // return <></>
        return <></>;
    }
  };

  const renderFinetunePanel = () => {
    const changePosition = (
      key: 'top' | 'right' | 'bottom' | 'left',
      value: number
    ) => {
      const currentTransform = layer.attrs?.layoutStyle?.transform || '';
      const translateMatch = currentTransform.match(/translate\(([^)]+)\)/);

      let translateX = 0;
      let translateY = 0;

      if (translateMatch) {
        const translateValues = translateMatch[1]
          .split(',')
          .map((v: string) => parseFloat(v.trim()) || 0);
        translateX = translateValues[0] || 0;
        translateY = translateValues[1] || 0;
      }

      switch (key) {
        case 'top':
          translateY -= value;
          break;
        case 'right':
          translateX += value;
          break;
        case 'bottom':
          translateY += value;
          break;
        case 'left':
          translateX -= value;
          break;
      }

      // 构建新的transform字符串
      let newTransform = currentTransform;
      const translateStr = `translate(${translateX}px, ${translateY}px)`;

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

      console.log('newTransform', newTransform);
      editorSDK?.changeCompAttr(editingElemId, {
        layoutStyle: {
          ...layer.attrs?.layoutStyle,
          transform: newTransform,
        },
      });
    };
    const hasMoveBtn = !isFirstChild && !isLastChild && !onlyOneChild;

    return (
      <div className='flex gap-2 p-4 pb-8 justify-around items-center h-full'>
        <div className='flex flex-col gap-2'>
          <BtnLite2
            style={{
              flexDirection: 'column',
              placeSelf: 'center',
            }}
            onClick={() => {
              changePosition('top', 4);
            }}
          >
            <MoveUp size={16} />
            <span>上移</span>
          </BtnLite2>
          <div
            className='flex gap-2'
            style={{
              placeSelf: 'center',
            }}
          >
            <BtnLite2
              style={{
                padding: '12px 16px',
              }}
              onClick={() => {
                changePosition('left', 4);
              }}
            >
              <MoveLeft size={16} />
              <span>左移</span>
            </BtnLite2>
            <BtnLite2
              style={{
                padding: '12px 16px',
              }}
              onClick={() => {
                changePosition('right', 4);
              }}
            >
              <span>右移</span>
              <MoveRight size={16} />
            </BtnLite2>
          </div>

          <BtnLite2
            style={{
              flexDirection: 'column',
              placeSelf: 'center',
            }}
            onClick={() => {
              changePosition('bottom', 4);
            }}
          >
            <span>下移</span>
            <MoveDown size={16} />
          </BtnLite2>
        </div>
        {hasMoveBtn && (
          <>
            <div className='split w-[1px] h-[100px] bg-gray-200 self-center'></div>
            <div className='flex flex-col gap-2 justify-center items-center'>
              {!isFirstChild && !onlyOneChild && (
                <BtnLite2
                  className={isFirstChild ? 'disabled' : ''}
                  onClick={() => {
                    if (isFirstChild) return;
                    moveElemV2('up');
                  }}
                >
                  <ArrowUpFromLine size={16} />
                  <span>调上一层</span>
                </BtnLite2>
              )}
              {!isLastChild && !onlyOneChild && (
                <BtnLite2
                  className={isLastChild ? 'disabled' : ''}
                  onClick={() => {
                    if (isLastChild) return;
                    moveElemV2('down');
                  }}
                >
                  <ArrowDownFromLine size={16} />
                  <span>调下一层</span>
                </BtnLite2>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderBtns = () => {
    // if (finetuneMode) {
    //   return renderFinetunePanel();
    // }
    const isRSVP1 = layer.elementRef === 'RSVP1';
    const isDesigner = getPermissionData().materialProduct;
    // RSVP1 只有在设计师模式下才显示复制和删除按钮
    const shouldHideRSVP1Actions = isRSVP1 && !isDesigner;
    return (
      <>
        {renderEditForm()}

        {!shouldHideRSVP1Actions && (
          <BtnLite
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
            <Copy size={20} />
          </BtnLite>
        )}
        {!shouldHideRSVP1Actions && (
          <BtnLite
            onClick={() => {
              deleteElemV2();
              clearActiveStatus?.();
            }}
          >
            <Trash2 size={20} />
          </BtnLite>
        )}
        {/* {isInList && (
          <BtnLite
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
            编辑列表
          </BtnLite>
        )} */}

        {/* <BtnLite
          style={{
            borderLeft: '1px solid #0000000f',
          }}
          onClick={() => {
            setWidgetStateV2({
              activeRowDepth: [widgetStateV2.activeRowDepth?.[0] || 0],
              editingElemId: undefined,
              hideOperator: true,
            });
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
        >
          <Check size={20} />
        </BtnLite> */}
        <ResponsiveDialog
          isOpen={finetuneMode}
          onOpenChange={setFinetuneMode}
          title='微调'
          overlayClassName='bg-transparent'
        >
          {renderFinetunePanel()}
        </ResponsiveDialog>
      </>
    );
  };
  return renderBtns();
};
