import { getWidgetMeta } from '@mk/services';
import { isPc, LoadWidget } from '@mk/utils';
import MkImageGroupForm from '@mk/widgets/MkImageGroup_v2/form-wap';
import { Lock, SquareDashedMousePointer } from 'lucide-react';
import MkCalendarV3Form from '@mk/widgets/MkCalendarV3/form';
import MkHuiZhiForm from '@mk/widgets/MkHuiZhi/form';
import { useGridContext } from '../../../comp/provider';
import { useWidgetsAttrs } from '../../../comp/WidgetLoader';
import { BtnLite } from '../../../shared/style-comps';
import { toggleAbsoluteElemAttrs } from '../../../shared/utils';
import PictureEditV2 from './PictureEditV2';
import TextEditorV2 from './TextEditorV2';

export const SettingElemDesigner = () => {
  const {
    editorSDK,
    widgetStateV2,
    deleteElemV2,
    editorCtx,
    setWidgetStateV2,
    getWorksData,
  } = useGridContext();
  const { editingElemId } = widgetStateV2 || {};
  const { compAttrsMap } = useWidgetsAttrs({
    needInit: false,
    worksData: getWorksData(),
  });
  if (!editingElemId) {
    return <></>;
  }

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

  const renderEditForm = () => {
    switch (true) {
      case /picture/gi.test(layer.elementRef):
        return <PictureEditV2 layer={layer} />;
      case /text/gi.test(layer.elementRef):
        return <TextEditorV2 layer={layer} />;
      case /MkHuiZhi/gi.test(layer.elementRef):
        return (
          <div
            style={{
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            <MkHuiZhiForm
              editorCtx={editorCtx}
              editorSDK={editorSDK}
              compAttrsMap={compAttrsMap}
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
        // if (typeof WebForm === "function") {
        //   return <></>
        // }
        // const WapForm = LoadWidget(getWidgetMeta(layer.elementRef)?.editorApply?.wapFormRef)
        // const FormComp = typeof WapForm === "function" ? WapForm : undefined
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
                    deleteElemV2();
                    setWidgetStateV2({
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

  const renderBtns = () => {
    const isAbsoluteElem = layer.attrs?.absoluteElem;
    return (
      <>
        {renderEditForm()}
        {isAbsoluteElem ? (
          <>
            <BtnLite
              onClick={() => {
                editorSDK?.changeCompAttr(editingElemId, {
                  layoutStyle: {
                    ...layer.attrs?.layoutStyle,
                    zIndex: 50,
                  },
                });
              }}
            >
              <span>置顶</span>
            </BtnLite>
            <BtnLite
              onClick={() => {
                console.log('移到最底层', editingElemId);
                editorSDK?.changeCompAttr(editingElemId, {
                  layoutStyle: {
                    ...layer.attrs?.layoutStyle,
                    zIndex: 0,
                  },
                });
              }}
            >
              <span>置底</span>
            </BtnLite>
          </>
        ) : (
          <></>
        )}
        <BtnLite
          className={layer.attrs?.disabledToEdit ? 'active' : ''}
          onClick={() => {
            // setIsTagPickerOpen(true);
            editorSDK?.changeCompAttr(editingElemId, {
              disabledToEdit: !layer.attrs?.disabledToEdit,
            });
          }}
        >
          <Lock size={16} />
        </BtnLite>
        <BtnLite
          className={layer.attrs?.absoluteElem ? 'active' : ''}
          onClick={() => {
            editorSDK?.changeCompAttr(editingElemId, {
              ...toggleAbsoluteElemAttrs(layer),
            });
          }}
        >
          {/* <span>自由元素</span> */}
          <SquareDashedMousePointer size={16} />
        </BtnLite>
      </>
    );
  };
  return renderBtns();
};
