import MkCalendarV3Form from '@/components/GridEditorV3/components/CalendarV3/MkCalendarV3FormForUser';
import RelayConfigPanelTrigger from '@/components/Relay/configPanel/RelayConfigPanelTrigger';
import RSVPConfigPanelTrigger from '@/components/RSVP/configPanel';
import { Lock, SquareDashedMousePointer } from 'lucide-react';
import { observer } from 'mobx-react';
import PictureEditV2 from '../../components/Picture/PictureEditV2';
import { BtnLite } from '../../components/style-comps';
import TextEditorV2 from '../../components/Text/TextEditorV2';
import { toggleAbsoluteElemAttrs } from '../../utils/utils1';
import { useWorksStore } from '../../works-store/store/hook';
import AddElementPopover from '../SettingPopoverUser/AddElementPopover';

const SettingElemDesigner = () => {
  const worksStore = useWorksStore();
  const { widgetStateV2 } = worksStore;
  const { editingElemId } = widgetStateV2 || {};
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

  const renderEditForm = () => {
    switch (true) {
      case /picture/gi.test(layer.elementRef):
        return <PictureEditV2 layer={layer} />;
      case /text/gi.test(layer.elementRef):
        return <TextEditorV2 layer={layer} />;
      case /RSVP/gi.test(layer.elementRef):
        return <RSVPConfigPanelTrigger />;
      case /Relay/gi.test(layer.elementRef):
        return <RelayConfigPanelTrigger />;
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

  const renderBtns = () => {
    const isAbsoluteElem = layer.attrs?.absoluteElem;
    return (
      <>
        <AddElementPopover />
        {renderEditForm()}
        {isAbsoluteElem ? (
          <>
            <BtnLite
              onClick={() => {
                worksStore.changeCompAttr(editingElemId, {
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
                worksStore.changeCompAttr(editingElemId, {
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
            worksStore.changeCompAttr(editingElemId, {
              disabledToEdit: !layer.attrs?.disabledToEdit,
            });
          }}
        >
          <Lock size={16} />
        </BtnLite>
        <BtnLite
          className={layer.attrs?.absoluteElem ? 'active' : ''}
          onClick={() => {
            worksStore.changeCompAttr(editingElemId, {
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

export default observer(SettingElemDesigner);
