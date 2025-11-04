import styled from '@emotion/styled';
import { getPermissionData, getWidgetMeta } from '@mk/services';
import { isPc, LoadWidget } from '@mk/utils';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  Check,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
} from 'lucide-react';
import { useState } from 'react';
import MkCalendarV3Form from '@mk/widgets/MkCalendarV3/form';
import MkHuiZhiForm from '@mk/widgets/MkHuiZhi/form';

import MkImageGroupForm from '@mk/widgets/MkImageGroup_v2/form-wap';
import MkMapV4Form from '@mk/widgets/MkMapV4/form-wap';
import { useGridContext } from '../../comp/provider';
import { useWidgetsAttrs } from '../../comp/WidgetLoader';
import { BtnLite, Sep } from '../../shared/style-comps';
import '../form.scss';
import PictureEdit from './PictureEdit';

const BtnLite2 = styled(BtnLite)`
  background-color: rgba(244, 244, 245, 1);
  width: auto;
  border-radius: 8px;
  padding: 8px 16px;
  color: #000;
  font-weight: bold;
`;

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

const Container = styled.div`
  height: 36px;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  /* gap: 4px; */
  justify-content: center;
  .split {
    background-color: #0000000f;
    height: 16px;
    width: 1px;
  }
`;

export const SettingElemV1 = () => {
  const {
    editorSDK,
    editorCtx,
    widgetState,
    cellsMap,
    deleteComp,
    clearActiveStatus,
    moveElem,
    duplicateElem,
    getWorksData,
  } = useGridContext();
  const { editingElemId, activeCellId, activeRowId } = widgetState || {};
  const [finetuneMode, setFinetuneMode] = useState(false);
  const { compAttrsMap } = useWidgetsAttrs({
    needInit: false,
    worksData: getWorksData(),
  });

  if (!editingElemId) {
    return <></>;
  }

  const isDesigner = getPermissionData().materialProduct;

  // 有选中元素
  const layer = editorSDK?.getLayer(editingElemId);
  const layerLink = editorSDK?.getLink(editingElemId);
  if (!layer) return <></>;
  const widgetMeta = getWidgetMeta(layer.elementRef);
  const { disabledDelete = false, disabledCommonOperator = false } =
    widgetMeta?.editorApply || {};
  let elemTag = layerLink?.tag;
  if (layer.elementRef === 'Text') {
    if (!elemTag) elemTag = 'text';
  }
  if (layer.elementRef === 'Picture') {
    if (!elemTag) elemTag = 'default_picture';
  }

  const currCellIds = (
    cellsMap
      .find(row => row.id === activeRowId)
      ?.cells.find(cell => cell.id === activeCellId)?.childrenIds || []
  ).filter(Boolean);
  const isFirstChild = currCellIds.findIndex(id => id === editingElemId) === 0;
  const isLastChild =
    currCellIds.findIndex(id => id === editingElemId) ===
    currCellIds.length - 1;
  const onlyOneChild = currCellIds.length === 1;

  const renderEditForm = () => {
    switch (true) {
      case /picture/gi.test(layer.elementRef):
        return (
          <PictureEdit
            editorCtx={editorCtx}
            editorSDK={editorSDK}
            layer={layer}
          />
        );
      case /text/gi.test(layer.elementRef):
        return (
          <>
            {
              <>
                <BtnLite
                  title='文本'
                  id={`${layer.elemId}-text-edit`}
                  onClick={() => {
                    const activeTextDOM =
                      document.querySelector<HTMLDivElement>(
                        `#layer_root_${layer.elemId} .editinput`
                      );
                    if (activeTextDOM) {
                      activeTextDOM.focus();
                    }
                    // setShowTextEditDrawer(true)
                    // ShowDrawerV2({
                    //   showOverlay: false,
                    //   overlayClassName: "bg-transparent",
                    //   showHandler: false,
                    //   className: "rounded-none",
                    //   dismissible: false,
                    //   isDialog: true,
                    //   direction: isPc() ? "right" : undefined,
                    //   title: "",
                    //   children: ({ close }) => (
                    //     <div
                    //       style={{
                    //         height: isPc() ? "50dvh" : "100dvh",
                    //         overflow: "auto",
                    //       }}
                    //     >
                    //       <TextEditForm
                    //         cellsMap={cellsMap}
                    //         widgetState={widgetState}
                    //         editorSDK={editorSDK}
                    //         layer={layer}
                    //         editorCtx={editorCtx}
                    //         useTextEditor={true}
                    //         close={close}
                    //         onChange={(nextVal) => {
                    //           console.log("nextVal", nextVal);
                    //           editorSDK?.changeCompAttr(layer.elemId, nextVal);
                    //         }}
                    //         autoFocus={false}
                    //       />
                    //     </div>
                    //   ),
                    // });
                  }}
                >
                  <span>改字</span>
                </BtnLite>
                <Sep />
              </>
            }
            <BtnLite
              title='文本'
              className={
                parseFontSize(layer.attrs.fontSize) >= 100 ? 'disabled' : ''
              }
              onClick={() => {
                const currentFontSize = parseFontSize(layer.attrs.fontSize);
                const nextVal = {
                  ...layer.attrs,
                  fontSize: Math.min(100, currentFontSize + 2),
                };
                editorSDK?.changeCompAttr(layer.elemId, nextVal);
              }}
            >
              <span>放大</span>
            </BtnLite>
            <BtnLite
              title='文本'
              className={
                parseFontSize(layer.attrs.fontSize) <= 10 ? 'disabled' : ''
              }
              onClick={() => {
                const currentFontSize = parseFontSize(layer.attrs.fontSize);
                const nextVal = {
                  ...layer.attrs,
                  fontSize: Math.max(10, currentFontSize - 2),
                };
                editorSDK?.changeCompAttr(layer.elemId, nextVal);
              }}
            >
              <span>缩小</span>
            </BtnLite>
          </>
        );
      case /MkMapV4/gi.test(layer.elementRef):
        const attrs = editorSDK?.getLayer(layer.elemId)?.attrs;
        return (
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <MkMapV4Form
              entityInfo={{ id: layer.elemId }}
              formControledValues={attrs as any}
              onFormValueChange={(nextVal: any) => {
                editorSDK?.changeCompAttr(layer.elemId, nextVal);
              }}
            />
          </div>
        );
      case /MkHuiZhi/gi.test(layer.elementRef):
        return (
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <MkHuiZhiForm
              compAttrsMap={compAttrsMap}
              formControledValues={editorSDK?.getLayer(layer.elemId)?.attrs}
              onFormValueChange={(nextVal: any) => {
                editorSDK?.changeCompAttr(layer.elemId, nextVal);
              }}
              editorSDK={editorSDK}
              editorCtx={editorCtx}
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
      default:
        // return <></>
        let WebForm = isPc()
          ? LoadWidget(getWidgetMeta(layer.elementRef)?.editorApply?.webFormRef)
          : LoadWidget(
              getWidgetMeta(layer.elementRef)?.editorApply?.wapFormRef
            );

        if (layer.elementRef === 'MkImageGroup_v2') {
          WebForm = MkImageGroupForm;
        }

        const FormComp = typeof WebForm === 'function' ? WebForm : undefined;
        const elemProps = editorSDK?.getLayer(layer.elemId)?.attrs;
        return (
          <>
            {FormComp && (
              <div
                style={{
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                <FormComp
                  key={layer.elemId}
                  entityInfo={{ id: layer.elemId }}
                  pageInfo={editorSDK?.getPageData(
                    editorSDK.getActivePageIdx()
                  )}
                  canvaInfo={{
                    canvaW: 375,
                    canvaH: 667,
                    scaleRate: 1,
                  }}
                  changeOperatorHandle={() => {}}
                  useCropV2={true} // 用户图片v2版本裁剪
                  getOperatorHandle={editorSDK?.getOperatorHandle}
                  changeContainer={() => {}}
                  containerInfo={{
                    width: '100%',
                    height: '100%',
                  }}
                  editorCtx={editorCtx}
                  formControledValues={elemProps}
                  onFormValueChange={(nextVal: any) => {
                    editorSDK?.changeCompAttr(layer.elemId, nextVal);
                  }}
                  onDeleteGridComp={() => {
                    deleteComp();
                    editorSDK?.changeWidgetState({
                      editingElemId: undefined,
                      activeCellId: undefined,
                      activeRowId: undefined,
                    });
                  }}
                />
              </div>
            )}
          </>
        );
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
                    moveElem('up');
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
                    moveElem('down');
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
    return (
      <>
        {renderEditForm()}
        <BtnLite
          onClick={() => {
            setFinetuneMode(true);
          }}
        >
          <span>微调</span>
        </BtnLite>
        <BtnLite
          onClick={() => {
            // store.deleteCompEntity(layer.elemId)
            const nextId = duplicateElem();
            if (Array.isArray(nextId)) {
              editorSDK?.changeWidgetState({
                editingElemId: nextId[0],
              });
            }
          }}
        >
          <span>复制</span>
        </BtnLite>
        {!disabledDelete && (
          <>
            <BtnLite
              onClick={() => {
                deleteComp();
                clearActiveStatus?.();
              }}
            >
              <span>删除</span>
            </BtnLite>
          </>
        )}
        <BtnLite
          style={{
            borderLeft: '1px solid #0000000f',
            marginLeft: 8,
          }}
          onClick={() => {
            editorSDK?.changeWidgetState({
              activeRowId: activeRowId,
              activeCellId: undefined,
              editingElemId: undefined,
            });
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
        >
          <Check size={20} />
        </BtnLite>
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

  return <Container>{renderBtns()}</Container>;
};
