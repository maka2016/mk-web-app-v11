import MkCalendarV3Form from '@mk/widgets/MkCalendarV3/form';
import MkMapV4Form from '@mk/widgets/MkMapV4/form-wap';
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { useGridContext } from '../../../comp/provider';
import { BtnLiteColumn as BtnLite } from '../../../shared/style-comps';
import PictureEditV3 from './PictureEditV3';
import TextEditorV3 from './TextEditorV3';

export const SettingElemV3 = ({ onUpdate }: { onUpdate?: () => void }) => {
  const {
    editorSDK,
    editorCtx,
    widgetStateV2,
    getRowByDepth,
    moveElemV2,
    getActiveRow,
    deleteElemV2,
    clearActiveStatus,
    duplicateElemV2,
    setWidgetStateV2,
    getWorksData,
  } = useGridContext();
  const { editingElemId, activeRowDepth } = widgetStateV2 || {};
  // const [finetuneMode, setFinetuneMode] = useState(false);

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

  const renderEditForm = () => {
    switch (true) {
      case /picture/gi.test(layer.elementRef):
        return <PictureEditV3 layer={layer} />;
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
    }
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
    return (
      <>
        {renderEditForm()}
        <BtnLite
          disabled={isFirstChild || onlyOneChild}
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            if (isFirstChild) return;
            moveElemV2('up');
            onUpdate?.();
          }}
        >
          <div className='border_icon '>
            <ChevronUp size={16} />
          </div>
          <span>上移</span>
        </BtnLite>
        <BtnLite
          disabled={isLastChild || onlyOneChild}
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            if (isLastChild) return;
            moveElemV2('down');
            onUpdate?.();
          }}
        >
          <div className='border_icon '>
            <ChevronDown size={16} />
          </div>
          <span>下移</span>
        </BtnLite>
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
          <div className='border_icon '>
            <Copy size={16} />
          </div>
          <span>复制</span>
        </BtnLite>
        <BtnLite
          onClick={() => {
            deleteElemV2();
            clearActiveStatus?.();
          }}
        >
          <div className='border_icon '>
            <Trash2 size={16} />
          </div>
          <span>删除</span>
        </BtnLite>
        {isInList && (
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
            <span>编辑列表</span>
          </BtnLite>
        )}
      </>
    );
  };
  return renderBtns();
};
