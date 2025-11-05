import styled from '@emotion/styled';
import { random } from '@mk/utils';
import { IPositionLink } from '@mk/works-store/types';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useState } from 'react';
import { useGridContext } from '../../comp/provider';
import { blockStyleFilter } from '../../shared';
import { BtnLite as BtnLite1 } from '../../shared/style-comps';
import {
  getAddContainerThemeConfig,
  getAddItemsByThemeConfig,
  IAddItem,
} from './const';

const BtnLite = styled(BtnLite1)`
  background-color: #000;
  padding: 2px;
  font-size: 12px;
  color: #fff;
  &:active {
    background-color: #00000080;
  }
`;
interface GridMoreOptionsProps {
  text?: string;
}

const AddItemPicker = ({ onAdd }: { onAdd: (item: any) => void }) => {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const {
    addRow,
    addComponent,
    editorSDK,
    editorCtx,
    widgetState,
    rowsGroup,
    themeConfig,
  } = useGridContext();

  const blockId = rowsGroup.find(block =>
    block.rowIds.includes(widgetState.activeRowId || '')
  )?.groupId;

  const addConfig = [
    {
      title: '自动布局元素',
      childrenFactory: () => {
        return getAddItemsByThemeConfig(themeConfig || ({} as any));
      },
      onAction: (addItem: IAddItem) => {
        if (addItem.elementRef === 'Text') {
          const compId = addComponent({
            layer: {
              elementRef: addItem.elementRef,
              attrs: {
                text: 'H1',
                ...addItem.attrs,
              },
            },
            link: addItem.link as IPositionLink,
          });
          return compId;
        } else if (addItem.elementRef === 'Picture') {
          editorCtx?.utils.showSelector({
            onSelected: (params: any) => {
              const { url, type, ossPath } = params;

              const compId = addComponent({
                layer: {
                  elementRef: addItem.elementRef,
                  attrs: {
                    ...addItem.attrs,
                    ossPath,
                  },
                },
                link: addItem.link as IPositionLink,
              });
              return compId;
            },
            type: 'picture',
            // preUpload: false
          } as any);
          return;
        }
      },
    },
    {
      title: '自由元素',
      onAction: (addItem: IAddItem) => {
        if (addItem.elementRef === 'Text') {
          const compId = addComponent(
            {
              layer: {
                elementRef: addItem.elementRef,
                attrs: {
                  text: 'H1',
                  ...addItem.attrs,
                  absoluteElem: true,
                  layoutStyle: {
                    zIndex: 10,
                    width: 200,
                  },
                  position: {
                    top: 0,
                    left: 0,
                  },
                },
              },
              link: addItem.link as IPositionLink,
            },
            {
              activeRowId: blockId,
            }
          );
          editorSDK?.changeWidgetState({
            activeRowId: blockId,
            activeCellId: undefined,
            editingElemId: compId,
          });
          return compId;
        } else if (addItem.elementRef === 'Picture') {
          editorCtx?.utils.showSelector({
            onSelected: (params: any) => {
              const { url, type, ossPath } = params;

              const compId = addComponent({
                layer: {
                  elementRef: addItem.elementRef,
                  attrs: {
                    ...addItem.attrs,
                    absoluteElem: true,
                    layoutStyle: {
                      zIndex: 10,
                      width: 200,
                    },
                    position: {
                      top: 0,
                      left: 0,
                    },
                    ossPath,
                  },
                },
                link: addItem.link as IPositionLink,
              });
              editorSDK?.changeWidgetState({
                activeRowId: blockId,
                activeCellId: undefined,
                editingElemId: compId,
              });
              return compId;
            },
            type: 'picture',
            // preUpload: false
          } as any);
        }
      },
      childrenFactory: () => {
        return getAddItemsByThemeConfig(themeConfig || ({} as any));
      },
    },
    {
      title: '自动布局容器',
      onAction: (addItem: IAddItem) => {
        const compId1 = editorSDK?.addComponent(
          {
            elementRef: 'Text',
            attrs: {
              text: '正文1',
            },
          },
          {
            visibility: false,
            lock: true,
            disabled: true,
            tag: 'text_body',
          } as any,
          false
        );
        const compId2 = editorSDK?.addComponent(
          {
            elementRef: 'Text',
            attrs: {
              text: '正文1',
            },
          },
          {
            visibility: false,
            lock: true,
            disabled: true,
            tag: 'text_body',
          } as any,
          false
        );
        if (!compId1 || !compId2) {
          return;
        }
        const rowId = addRow(
          {
            id: random(),
            tag: addItem.link.tag as any,
            style: addItem.attrs.style,
            childrenIds: [],
            groupByRowId: blockId,
            cells: [
              {
                id: random(),
                childrenIds: [compId1],
                tag: 'grid_cell_root',
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                },
              },
              {
                id: random(),
                childrenIds: [compId2],
                tag: 'grid_cell_root',
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                },
              },
            ],
          },
          {
            activeRowId: widgetState.activeRowId,
          }
        );
        editorSDK?.changeWidgetState({
          activeRowId: rowId,
          activeCellId: undefined,
          editingElemId: undefined,
        });
      },
      childrenFactory: () => {
        return [...getAddContainerThemeConfig(themeConfig || ({} as any))];
      },
    },
    {
      title: '互动组件',
      childrenFactory: () => {
        return [
          {
            title: '拼图',
            action: () => {
              addComponent({
                layer: {
                  elementRef: 'MKsvg',
                  attrs: {},
                },
              });
              const elemId = addComponent({
                layer: {
                  elementRef: 'MkPinTu',
                  attrs: {
                    editing: true,
                  },
                },
              });

              const timer = setInterval(() => {
                const hasMkPinTu = !!(window as any).MkPinTu?.$$typeof;

                if (hasMkPinTu) {
                  clearInterval(timer);
                  editorSDK?.changeWidgetState({
                    activeCellId: widgetState.activeCellId,
                    activeRowId: widgetState.activeRowId,
                    editingElemId: elemId,
                  });
                }
              }, 100);
            },
          },
          {
            title: '轮播图',
            action: () => {
              const elemId = addComponent({
                layer: {
                  elementRef: 'MkImageGroup_v2',
                  attrs: {
                    imageDataList: [],
                    type: 'tiled',
                    autoFlip: true,
                    carouselType: 'default',
                    flipFeq: 5000,
                    editing: true,
                  },
                },
              });

              const timer = setInterval(() => {
                const hasMkPinTu = !!(window as any).MkImageGroup_v2?.$$typeof;
                if (hasMkPinTu) {
                  clearInterval(timer);
                  editorSDK?.changeWidgetState({
                    activeCellId: widgetState.activeCellId,
                    activeRowId: widgetState.activeRowId,
                    editingElemId: elemId,
                  });
                }
              }, 100);
            },
          },
          {
            title: '回执',
            action: () => {
              const elemId = addComponent({
                layer: {
                  elementRef: 'MkHuiZhi',
                  attrs: {
                    show: true,
                    inLayout: true,
                  },
                },
              });

              const timer = setInterval(() => {
                const hasComp = !!(window as any).MkHuiZhi?.$$typeof;
                if (hasComp) {
                  clearInterval(timer);
                  editorSDK?.changeWidgetState({
                    activeCellId: widgetState.activeCellId,
                    activeRowId: widgetState.activeRowId,
                    editingElemId: elemId,
                  });
                }
              }, 100);
            },
          },
          {
            title: '弹幕',
            action: () => {
              const elemId = addComponent({
                layer: {
                  elementRef: 'MkBulletScreen_v2',
                  attrs: {},
                },
              });

              const timer = setInterval(() => {
                const hasComp = !!(window as any).MkBulletScreen_v2?.$$typeof;
                if (hasComp) {
                  clearInterval(timer);
                  editorSDK?.changeWidgetState({
                    activeCellId: widgetState.activeCellId,
                    activeRowId: widgetState.activeRowId,
                    editingElemId: elemId,
                  });
                }
              }, 100);
            },
          },
          {
            title: '地图',
            action: () => {
              const elemId = addComponent({
                layer: {
                  elementRef: 'MkMapV4',
                  attrs: {},
                },
              });

              const timer = setInterval(() => {
                const hasComp = !!(window as any).MkMapV4?.$$typeof;
                if (hasComp) {
                  clearInterval(timer);
                  editorSDK?.changeWidgetState({
                    activeCellId: widgetState.activeCellId,
                    activeRowId: widgetState.activeRowId,
                    editingElemId: elemId,
                  });
                }
              }, 100);
            },
          },
          {
            title: '日历',
            action: () => {
              const elemId = addComponent({
                layer: {
                  elementRef: 'MkCalendarV3',
                  attrs: {},
                },
              });

              const timer = setInterval(() => {
                const hasComp = !!(window as any).MkCalendarV2?.$$typeof;
                if (hasComp) {
                  clearInterval(timer);
                  editorSDK?.changeWidgetState({
                    activeCellId: widgetState.activeCellId,
                    activeRowId: widgetState.activeRowId,
                    editingElemId: elemId,
                  });
                }
              }, 100);
            },
          },
        ].filter(Boolean) as any;
      },
    },
  ];

  const currentCategory = addConfig[selectedCategory];
  const childrenItems = currentCategory?.childrenFactory?.() || [];

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* 左侧类别选择 */}
      <div
        style={{
          width: '120px',
          borderRight: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {addConfig.map((item: any, index: number) => (
          <BtnLite
            key={item.title}
            title={item.title}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              border: 'none',
              borderRadius: 0,
              backgroundColor:
                selectedCategory === index ? '#ffffff' : 'transparent',
              borderRight:
                selectedCategory === index ? '2px solid #3b82f6' : 'none',
              fontWeight: selectedCategory === index ? 600 : 400,
              color: selectedCategory === index ? '#3b82f6' : '#374151',
              cursor: 'pointer',
            }}
            onClick={() => setSelectedCategory(index)}
          >
            {item.icon}
            <span style={{ marginLeft: '8px' }}>{item.title}</span>
          </BtnLite>
        ))}
      </div>

      {/* 右侧子项列表 */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '16px',
            color: '#111827',
          }}
        >
          {currentCategory?.title}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px',
          }}
        >
          {childrenItems.map((childItem: any, index: number) => {
            return (
              <BtnLite
                key={childItem.title}
                title={childItem.title}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '2px 4px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  justifyContent: 'center',
                }}
                onClick={() => {
                  currentCategory.onAction?.(childItem);
                  childItem.action?.(childItem);
                  onAdd(childItem);
                }}
              >
                {childItem.icon && (
                  <div style={{ marginBottom: '8px' }}>{childItem.icon}</div>
                )}
                <span
                  style={blockStyleFilter({
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    textAlign: 'center',
                    ...(childItem.displayStyle || {}),
                  })}
                >
                  {childItem.title}
                </span>
              </BtnLite>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AddItemModal = (props: GridMoreOptionsProps) => {
  const { editorSDK, widgetState } = useGridContext();
  const { isAddModalShow } = widgetState;

  return (
    <>
      <ResponsiveDialog
        isOpen={isAddModalShow}
        direction='left'
        onOpenChange={open => {
          editorSDK?.changeWidgetState({
            isAddModalShow: open,
          });
        }}
        title='添加内容'
      >
        <AddItemPicker
          onAdd={() => {
            editorSDK?.changeWidgetState({
              isAddModalShow: false,
            });
          }}
        />
      </ResponsiveDialog>
    </>
  );
};

export default AddItemModal;
