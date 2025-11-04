import React, { useState } from 'react';
import { getWidgetMeta } from '@mk/services';
import { BtnLite, Sep } from '../../../shared/style-comps';
import { useGridContext } from '../../../comp/provider';
import { isPc, LoadWidget } from '@mk/utils';
import PictureEdit from '../../../UserForm/Setting/PictureEdit';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { IPositionLink, LayerElemItem } from '@mk/works-store/types';
import { SelectableElement } from '../../StylingManager/types';
import cls from 'classnames';
import {
  getAddItemsByThemeConfig,
  getElementDisplayName,
} from '../../AddCompHelper/const';
import { ChevronDown, ChevronUp, Copy, Trash } from 'lucide-react';
import MkImageGroupForm from '@mk/widgets/MkImageGroup_v2/form-wap';

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

const TagPicker = ({
  onClose,
  layer,
  layerLink,
}: {
  onClose: () => void;
  layer: LayerElemItem;
  layerLink?: IPositionLink;
}) => {
  const { themeConfig, editorSDK } = useGridContext();
  if (!layerLink) {
    return <></>;
  }
  const tagableElem = getAddItemsByThemeConfig(themeConfig);
  return (
    <div className='p-4'>
      当前标签：{getElementDisplayName(layerLink.tag as SelectableElement)}
      <div className='mt-4'></div>
      {tagableElem.map(item => {
        if (item.elementRef !== layer.elementRef) {
          return null;
        }
        return (
          <div
            key={item.link.tag}
            className={cls(
              'flex items-center gap-2 cursor-pointer p-2 rounded-md',
              {
                'bg-gray-200': item.link.tag === layerLink.tag,
              }
            )}
            onClick={() => {
              editorSDK?.fullSDK.setLink(layer.elemId, {
                tag: item.link.tag,
              });
              editorSDK?.changeCompAttr(layer.elemId, {
                ...layer.attrs,
                version: (layer.attrs.version || 0) + 1,
              });
              onClose();
            }}
          >
            <div
              className={cls(
                'w-4 h-4 rounded-full',
                item.link.tag === layerLink.tag ? 'bg-blue-500' : 'bg-gray-200'
              )}
            ></div>
            <div>{item.title}</div>
          </div>
        );
      })}
    </div>
  );
};

export const SettingElemDesigner = () => {
  const {
    editorSDK,
    widgetState,
    moveElem,
    duplicateElem,
    clearActiveStatus,
    deleteComp,
    editorCtx,
  } = useGridContext();
  const { editingElemId, activeCellId, activeRowId } = widgetState || {};
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  if (!editingElemId) {
    return <></>;
  }

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
            {/* <BtnLite
              title="文本"
              className={
                parseFontSize(layer.attrs.fontSize) >= 100 ? "disabled" : ""
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
              title="文本"
              className={
                parseFontSize(layer.attrs.fontSize) <= 10 ? "disabled" : ""
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
            </BtnLite> */}
          </>
        );

      default:
        // return <></>
        let WebForm = LoadWidget(
          getWidgetMeta(layer.elementRef)?.editorApply?.wapFormRef
        );

        if (layer.elementRef === 'MkImageGroup_v2') {
          WebForm = MkImageGroupForm;
        }
        console.log('isPc()', isPc());
        console.log('WebForm', WebForm);
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
                    zIndex: 1,
                  },
                });
              }}
            >
              <span>置底</span>
            </BtnLite>
          </>
        ) : (
          <>
            <BtnLite
              onClick={() => {
                moveElem('up');
              }}
            >
              <ChevronUp size={16} />
              {/* <span>上移</span> */}
            </BtnLite>
            <BtnLite
              onClick={() => {
                moveElem('down');
              }}
            >
              <ChevronDown size={16} />
              {/* <span>下移</span> */}
            </BtnLite>
          </>
        )}
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
          <Copy size={16} />
          {/* <span>复制</span> */}
        </BtnLite>
        {!disabledDelete && (
          <>
            <BtnLite
              onClick={() => {
                deleteComp();
                clearActiveStatus?.();
              }}
            >
              <Trash size={16} />
              {/* <span>删除</span> */}
            </BtnLite>
          </>
        )}
        <BtnLite
          onClick={() => {
            editorSDK?.changeWidgetState({
              editingElemId: undefined,
            });
          }}
        >
          <span>选父级</span>
        </BtnLite>
        <BtnLite
          onClick={() => {
            setIsTagPickerOpen(true);
          }}
        >
          标签
        </BtnLite>

        <ResponsiveDialog
          isOpen={isTagPickerOpen}
          onOpenChange={nextVal => {
            setIsTagPickerOpen(nextVal);
          }}
          contentProps={{
            className: 'w-[400px]',
          }}
        >
          <TagPicker
            onClose={() => {
              setIsTagPickerOpen(false);
            }}
            layer={layer}
            layerLink={layerLink}
          />
        </ResponsiveDialog>
      </>
    );
  };
  return renderBtns();
};
