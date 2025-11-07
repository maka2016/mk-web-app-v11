import RSVPConfigPanelTrigger from '@/components/RSVP/configPanel';
import MkCalendarV3Form from '@mk/widgets/MkCalendarV3/form';
import { Lock, SquareDashedMousePointer } from 'lucide-react';
import { useGridContext } from '../../../comp/provider';
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
      case /RSVP/gi.test(layer.elementRef):
        return (
          <RSVPConfigPanelTrigger
            attrs={layer.attrs as any}
            editorSDK={editorSDK}
            layer={layer}
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
              formControledValues={editorSDK?.getLayer(layer.elemId)?.attrs}
              onFormValueChange={(nextVal: any) => {
                editorSDK?.changeCompAttr(layer.elemId, nextVal);
              }}
              editorSDK={editorSDK}
              editorCtx={editorCtx}
            />
          </div>
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
