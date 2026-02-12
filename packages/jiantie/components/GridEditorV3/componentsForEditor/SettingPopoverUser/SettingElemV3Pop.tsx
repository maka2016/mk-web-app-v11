import MkCalendarV3Form from '@/components/GridEditorV3/components/CalendarV3/MkCalendarV3FormForUser';
import RSVPConfigPanelTrigger from '@/components/RSVP/configPanel';
import styled from '@emotion/styled';
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
import { queryToObj } from '../../../../utils';
import RelayConfigPanelTrigger from '../../../Relay/configPanel/RelayConfigPanelTrigger';
import MapV4Form from '../../components/MapV4/MapV4Form';
import PictureEditV3Pop from '../../components/Picture/PictureEditV3Pop';
import { BtnLite } from '../../components/style-comps';
import TextEditorV3Pop from '../../components/Text/TextEditorV3Pop';
import { useWorksStore } from '../../works-store/store/hook';
import SettingElemV3PopForSys from './SettingElemV3PopForSys';

const BtnLite2 = styled(BtnLite)`
  background-color: rgba(244, 244, 245, 1);
  width: auto;
  border-radius: 8px;
  padding: 8px 16px;
  color: #000;
  font-weight: bold;
`;

export const SettingElemV3Pop = ({ onUpdate }: { onUpdate?: () => void }) => {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const { getActiveRow, deleteElemV2, moveElemV2, duplicateElemV2 } =
    worksStore.gridPropsOperator;
  const { editingElemId } = widgetStateV2 || {};
  const [finetuneMode, setFinetuneMode] = useState(false);

  if (!editingElemId) {
    return <></>;
  }

  // 有选中元素
  const layer = worksStore.getLayer(editingElemId);
  if (!layer) return <></>;
  let elemTag = layer?.tag;
  if (layer.elementRef === 'Text') {
    if (!elemTag) elemTag = 'text';
  }
  if (layer.elementRef === 'Picture') {
    if (!elemTag) elemTag = 'default_picture';
  }

  const useSystemVariable = layer?.attrs?.systemVariable?.enabled;
  if (useSystemVariable) {
    return <SettingElemV3PopForSys />;
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
        return <PictureEditV3Pop layer={layer} onUpdate={onUpdate} />;
      case /text/gi.test(layer.elementRef):
        return <TextEditorV3Pop layer={layer} />;
      case /MkMapV4/gi.test(layer.elementRef):
        return (
          <MapV4Form
            entityInfo={{ id: layer.elemId }}
            formControledValues={worksStore.getLayer(layer.elemId)?.attrs}
            onFormValueChange={(nextVal: any) => {
              worksStore.changeCompAttr(layer.elemId, nextVal);
            }}
          />
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
      case /RSVP/gi.test(layer.elementRef):
        return <RSVPConfigPanelTrigger />;
      case /Relay/gi.test(layer.elementRef):
        return <RelayConfigPanelTrigger />;
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
      worksStore.changeCompAttr(editingElemId, {
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
    if (finetuneMode) {
      return renderFinetunePanel();
    }
    const isRSVP1 = layer.elementRef === 'RSVP1';
    const fullStack = queryToObj().designer_tool === 'dev';
    // RSVP1 只有在设计师模式下才显示复制和删除按钮
    const shouldHideRSVP1Actions = isRSVP1 && !fullStack;
    return (
      <>
        {renderEditForm()}

        {!shouldHideRSVP1Actions && (
          <BtnLite
            title='复制'
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
            title='删除'
            onClick={() => {
              deleteElemV2();
              // clearActiveStatus?.();
              setWidgetStateV2({
                editingElemId: undefined,
              });
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
