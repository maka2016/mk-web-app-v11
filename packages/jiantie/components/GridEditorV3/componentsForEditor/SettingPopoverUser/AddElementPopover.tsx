import { deepClone, random } from '@/utils';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
// @ts-ignore - chroma-js 没有类型定义
import { cn } from '@workspace/ui/lib/utils';
import chroma from 'chroma-js';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import WidgetItemRendererV2 from '../../AppV2/WidgetItemRendererV2';
import MaterialComponents from '../../componentForContentLib/ThemeLayoutLibraryV3/MaterialComponents';
import { colorValueParser } from '../../components/ColorPicker/utils';
import { BtnLiteColumn } from '../../components/style-comps';
import { getCanvaInfo2 } from '../../provider/utils';
import type { CopyRowData } from '../../utils';
import { scrollToActiveRow, ThemeConfigV2 } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import { demoPicUrl } from '../DesignerOperatorV2/const';
import {
  createImageTopTextRowData,
  createTwoColumnsImageTextRowData,
  createTwoPicturesSideBySideRowData,
  ImageTextMenuItemCard,
} from './imageTextTemplates';

// 常规图片：单图模板
const createSinglePictureRowData = (tag: string): CopyRowData => {
  const picElemId = random();

  return {
    rows: [
      {
        tag: 'grid_root',
        style: {
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          gridTemplateColumns: '1fr',
          writingMode: 'horizontal-tb',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'auto',
          zIndex: 2,
          gap: '12.00px',
        },
        childrenIds: [picElemId],
        id: random(),
      },
    ],
    elemComps: [
      {
        elementRef: 'Picture',
        attrs: {
          ossPath: demoPicUrl,
          aspectRatio: 0.75,
          originBaseW: 1200,
          originBaseH: 1600,
          version: 2,
          _v: 4,
          disabledToEdit: false,
        },
        elemId: picElemId,
        type: 'element',
        tag,
      },
    ],
  } as CopyRowData;
};

// 图文模板/预览卡片暂时隐藏，已迁移到 `imageTextTemplates.tsx`

// 图片类菜单统一卡片组件，保证 UI 和高度一致
const PictureMenuItemCard = ({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className='cursor-pointer h-full rounded-md border bg-white overflow-hidden flex flex-col'
      onClick={onClick}
    >
      <div className='relative w-full aspect-[4/3] bg-gray-100 flex items-center justify-center p-2'>
        {children}
      </div>
      <div className='bg-black/50 text-white px-2 py-1 text-[11px] text-center'>
        {title}
      </div>
    </div>
  );
};

// 添加元素按钮菜单
const AddElementPopover = () => {
  const [open, setOpen] = useState(false);
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2, worksData, getStyleByTag2 } =
    worksStore;
  const themeConfig = worksData.gridProps.themeConfig2 || ({} as ThemeConfigV2);
  const { addComponentV2, getRowByDepth, getActiveRow, addRowFromTemplateV2 } =
    worksStore.gridPropsOperator;

  const handleAddElement = (item: {
    tag: string;
    elementRef: string;
    attrs: any;
    action?: () => void;
  }) => {
    const { tag, elementRef, attrs, action } = item;
    // 检查是否可以添加元素
    if (
      !widgetStateV2.activeRowDepth ||
      widgetStateV2.activeRowDepth.length === 0
    ) {
      toast.error('不能直接添加元素到画布');
      return;
    }

    // 判断是否在页面级别（activeRowDepth.length === 1）
    // 页面级别允许添加元素，会自动设置为自由元素
    const isPageLevel = widgetStateV2.activeRowDepth.length === 1;

    if (action) {
      action();
      setOpen(false);
      return;
    }

    // 如果是页面级别且是图片元素，不使用 action，直接添加为自由元素
    if (elementRef === 'Picture') {
      let position = undefined;
      let estimatedElementWidth: number | string = 'auto'
      if (isPageLevel) {
        // 计算页面中间位置
        const canvaInfo = getCanvaInfo2(worksStore.worksDetail);
        const activeRow = getActiveRow();
        const blockWidth = canvaInfo.canvaW || 375;
        let blockHeight = 667;
        if (activeRow?.canvasHeight) {
          blockHeight = activeRow.canvasHeight;
        } else if (canvaInfo.canvaH && typeof canvaInfo.canvaH === 'number') {
          blockHeight = canvaInfo.canvaH;
        } else {
          const blockId = activeRow?.id;
          if (blockId) {
            const blockDOM = document.querySelector<HTMLDivElement>(
              `#editor_block_${blockId}`
            );
            if (blockDOM) {
              blockHeight = blockDOM.getBoundingClientRect().height;
            }
          }
        }

        // 估算图片尺寸（根据 aspectRatio 和页面宽度）
        const aspectRatio = attrs.aspectRatio || 0.75;
        estimatedElementWidth = Math.min(blockWidth * 0.8, 300); // 最大宽度为页面宽度的80%或300px
        const estimatedElementHeight = estimatedElementWidth / aspectRatio;

        // 计算中间位置（减去元素尺寸的一半）
        const centerX = blockWidth / 2 - estimatedElementWidth / 2;
        const centerY = blockHeight / 2 - estimatedElementHeight / 2;

        position = {
          left: centerX,
          top: centerY,
          relativeTo: 'block',
          constraint: 'left-top',
        };
      }

      const elementAttrs = {
        ...attrs,
        absoluteElem: !!position,
        layoutStyle: {
          ...(attrs.layoutStyle || {}),
          zIndex: 11,
          width: estimatedElementWidth,
        },
        position,
      };

      const compId = addComponentV2({
        layer: {
          elementRef: 'Picture',
          attrs: elementAttrs,
          tag,
        },
      });

      toast.success('添加元素成功');

      setWidgetStateV2({
        editingElemId: compId,
        hideOperator: false,
      });

      setOpen(false);
      return;
    }

    if (elementRef === 'Text') {
      // 如果在页面级别，设置为自由元素并对齐到block
      let position = undefined;
      if (isPageLevel) {
        // 计算页面中间位置
        const canvaInfo = getCanvaInfo2(worksStore.worksDetail);
        const activeRow = getActiveRow();
        const blockWidth = canvaInfo.canvaW || 375; // 默认375px
        // 获取页面高度：优先使用 canvasHeight，否则使用 canvaH，再否则使用默认值
        let blockHeight = 667; // 默认值
        if (activeRow?.canvasHeight) {
          blockHeight = activeRow.canvasHeight;
        } else if (canvaInfo.canvaH && typeof canvaInfo.canvaH === 'number') {
          blockHeight = canvaInfo.canvaH;
        } else {
          // 尝试从DOM获取实际高度
          const blockId = activeRow?.id;
          if (blockId) {
            const blockDOM = document.querySelector<HTMLDivElement>(
              `#editor_block_${blockId}`
            );
            if (blockDOM) {
              blockHeight = blockDOM.getBoundingClientRect().height;
            }
          }
        }

        // 先计算一个临时中心位置（后续会根据元素实际尺寸调整）
        // 使用估算值：文本元素通常宽度为页面宽度的60-80%，高度取决于字体大小
        // 暂时使用默认值，添加后通过DOM获取实际尺寸再调整
        const estimatedElementWidth = blockWidth * 0.7; // 估算宽度为页面宽度的70%
        const estimatedElementHeight = 40; // 估算高度，文本元素通常20-60px

        // 计算中间位置（减去元素尺寸的一半）
        const centerX = blockWidth / 2 - estimatedElementWidth / 2;
        const centerY = blockHeight / 2 - estimatedElementHeight / 2;

        position = {
          left: centerX,
          top: centerY,
          relativeTo: 'block',
          constraint: 'left-top',
        };
      }

      const elementAttrs = isPageLevel
        ? {
          ...attrs,
          absoluteElem: true,
          layoutStyle: {
            zIndex: 11,
          },
          position,
        }
        : attrs;

      const compId = addComponentV2({
        layer: {
          elementRef,
          attrs: elementAttrs,
          tag,
        },
      });

      toast.success('添加元素成功');

      setWidgetStateV2({
        editingElemId: compId,
        hideOperator: false,
      });

      setOpen(false);
    }
  };

  // 判断是否在页面级别
  const isPageLevel = widgetStateV2.activeRowDepth?.length === 1;

  // 图文菜单项：仅非页面级别显示
  const imageTextItems = [
    {
      title: '上图下文',
      elementRef: 'Picture',
      tag: 'image_top_text',
      render: () => {
        return (
          <ImageTextMenuItemCard
            key='image_top_text'
            title='上图下文'
            onClick={() => {
              addRowFromTemplateV2(createImageTopTextRowData(), {
                activeRowDepth: widgetStateV2.activeRowDepth,
                editingElemId: undefined,
              });
              setOpen(false);
            }}
          >
            <div className='flex flex-col w-full h-full gap-1'>
              <div
                className='flex-1 h-full bg-gray-300 rounded-md'
                style={{
                  backgroundImage: `url(${demoPicUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className='text-center line-clamp-1 text-xs text-gray-500'>
                标题
              </div>
            </div>
          </ImageTextMenuItemCard>
        );
      },
    },
    {
      title: '左右两图',
      elementRef: 'Picture',
      tag: 'image_two_side',
      render: () => {
        return (
          <ImageTextMenuItemCard
            key='image_two_side'
            title='左右两图'
            onClick={() => {
              addRowFromTemplateV2(createTwoPicturesSideBySideRowData(), {
                activeRowDepth: widgetStateV2.activeRowDepth,
                editingElemId: undefined,
              });
              setOpen(false);
            }}
          >
            <div className='flex w-full h-full gap-2'>
              <div
                className='flex-1 h-full bg-gray-300 rounded-md'
                style={{
                  backgroundImage: `url(${demoPicUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div
                className='flex-1 h-full bg-gray-300 rounded-md'
                style={{
                  backgroundImage: `url(${demoPicUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </div>
          </ImageTextMenuItemCard>
        );
      },
    },
    {
      title: '左右双列图文',
      elementRef: 'Picture',
      tag: 'image_two_col_text',
      render: () => {
        return (
          <ImageTextMenuItemCard
            key='image_two_col_text'
            title='左右双列图文'
            onClick={() => {
              addRowFromTemplateV2(createTwoColumnsImageTextRowData(), {
                activeRowDepth: widgetStateV2.activeRowDepth,
                editingElemId: undefined,
              });
              setOpen(false);
            }}
          >
            <div className='grid grid-cols-2 gap-2 w-full h-full text-[10px] text-gray-500'>
              <div className='flex flex-col gap-1 items-center'>
                <div
                  className='w-full flex-1 bg-gray-300 rounded-md'
                  style={{
                    backgroundImage: `url(${demoPicUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className='text-center line-clamp-1'>标题</div>
              </div>
              <div className='flex flex-col gap-1 items-center'>
                <div
                  className='w-full flex-1 bg-gray-300 rounded-md'
                  style={{
                    backgroundImage: `url(${demoPicUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className='text-center line-clamp-1'>标题</div>
              </div>
            </div>
          </ImageTextMenuItemCard>
        );
      },
    },
  ];

  const menuItems = [
    {
      category: '文本',
      className: 'grid grid-cols-2 gap-2',
      items: [
        {
          title: '标题',
          elementRef: 'Text',
          attrs: {
            text: '大标题',
          },
          tag: 'text_heading1',
        },
        {
          title: '副标题',
          elementRef: 'Text',
          attrs: {
            text: '副标题',
          },
          tag: 'text_heading2',
        },
        {
          title: '正文',
          elementRef: 'Text',
          attrs: {
            text: '正文',
          },
          tag: 'text_body',
        },
        {
          title: '描述',
          elementRef: 'Text',
          attrs: {
            text: '描述',
          },
          tag: 'text_desc',
        },
      ],
    },
    {
      category: '图片',
      className: 'grid grid-cols-3 md:grid-cols-3 gap-3',
      items: [
        {
          title: '常规图片',
          elementRef: 'Picture',
          tag: 'photo1',
          attrs: {
            ossPath: demoPicUrl,
          },
        },
        {
          title: '横图',
          elementRef: 'Picture',
          tag: 'photo1',
          attrs: {
            ossPath: demoPicUrl,
            objectPosition: {
              x: 50,
              y: 50,
              size: 'cover',
            },
            layoutStyle: {
              aspectRatio: '4/3',
            }
          },
        },
        {
          title: '方图',
          elementRef: 'Picture',
          tag: 'photo1',
          attrs: {
            ossPath: demoPicUrl,
            objectPosition: {
              x: 50,
              y: 50,
              size: 'cover',
            },
            layoutStyle: {
              aspectRatio: '1/1',
            }
          },
        },
      ],
    },
    // 非页面级别才展示图文
    ...(!isPageLevel
      ? [
        {
          category: '图文组合',
          className: 'grid grid-cols-3 md:grid-cols-3 gap-3',
          items: imageTextItems,
        },
      ]
      : []),
    {
      category: '版式',
      render: () => {
        return (
          <MaterialComponents
            manager={false}
            key={`material-components-${getActiveRow()?.componentGroupRefId}`}
            showGroupNavigation={true}
            renderOnlyActiveGroup={true}
            // viewMode={replaceCurrentRow ? 'horizontal' : 'vertical'}
            dataType='components'
            showAllComponent={true}
            activeComponentGroupId={getActiveRow()?.componentGroupRefId}
            autoScroll={false}
            onComponentClick={c => {
              const currRow = getActiveRow();
              if (!currRow) {
                return;
              }
              // console.log('c', c);
              // return;
              const component = deepClone(c);
              try {
                if (currRow.sourceComponentId === component.compId) {
                  toast('当前组件已经是该组件变体');
                  return;
                }
                component.data.rows[0].componentGroupRefId =
                  currRow.componentGroupRefId;
                component.data.rows[0]._id = currRow.id;

                const addResult = addRowFromTemplateV2(
                  component.data,
                  widgetStateV2,
                  false
                );
                setWidgetStateV2({
                  activeRowDepth: addResult.copiedRowDepth,
                  editingElemId: undefined,
                });
                setTimeout(() => {
                  scrollToActiveRow(
                    getRowByDepth(addResult.copiedRowDepth || [])?.id || '',
                    true,
                    100
                  );
                }, 100);
              } catch (error) {
                console.error('切换组件失败', error);
                toast.error('操作失败');
              }
            }}
          />
        );
      },
    },
  ];

  return (
    <>
      <BtnLiteColumn
        onClick={() => setOpen(true)}
        id='addElementPopoverTriggerBtn'
      >
        <div className='border_icon'>
          <Plus size={16} />
        </div>
        添加
      </BtnLiteColumn>
      <ResponsiveDialog
        isOpen={open}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={setOpen}
        title='添加元素'
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        <div className='flex flex-col overflow-y-auto h-full'>
          {menuItems.map(mItem => {
            if (mItem.render) {
              return (
                <div key={mItem.category} className='flex flex-col'>
                  <div className='px-3 py-2'>
                    <p className='text-sm text-[#64748b] font-semibold leading-5'>
                      {mItem.category}
                    </p>
                  </div>
                  {mItem.render()}
                </div>
              );
            }
            return (
              <div key={mItem.category} className={cn('flex flex-col')}>
                <div className='px-3 py-2'>
                  <p className='text-sm text-[#64748b] font-semibold leading-5'>
                    {mItem.category}
                  </p>
                </div>
                <div
                  className={cn(
                    'grid gap-2 items-stretch justify-center p-2 bg-white',
                    mItem.className
                  )}
                >
                  {mItem.items.map(item => {
                    if ('render' in item) {
                      return item.render();
                    }
                    const textColor = colorValueParser(
                      (item.attrs as any).color ||
                      getStyleByTag2(item.tag as keyof ThemeConfigV2)?.color,
                      themeConfig?.themeColors
                    );
                    const isPictureElement = item.elementRef === 'Picture';

                    // 根据文字颜色计算高对比度的背景色
                    const getContrastBackground = (color?: string): string => {
                      if (!color) return '#f3f4f6'; // 默认灰色
                      try {
                        const chromaColor = chroma(color);
                        // 候选背景色：白色和深灰色
                        const candidates = [
                          '#ffffff',
                          '#1f2937',
                          '#f9fafb',
                          '#111827',
                        ];
                        let bestBg = '#f3f4f6';
                        let maxContrast = 0;

                        // 找到对比度最高的背景色
                        for (const bg of candidates) {
                          const contrast = chroma.contrast(
                            chromaColor,
                            chroma(bg)
                          );
                          if (contrast > maxContrast) {
                            maxContrast = contrast;
                            bestBg = bg;
                          }
                        }

                        return bestBg;
                      } catch {
                        // 如果颜色解析失败，返回默认背景色
                        return '#f3f4f6';
                      }
                    };

                    const backgroundColor = getContrastBackground(textColor);

                    return (
                      <div
                        key={item.title}
                        className='p-4 rounded-md border relative flex flex-col items-center justify-center'
                        style={{ backgroundColor }}
                        onClick={() => {
                          handleAddElement(item);
                        }}
                      >
                        {isPictureElement && (
                          <div className='text-xs label absolute bottom-0 left-0 right-0 bg-black/50 text-white px-2 py-1 rounded-md z-50 pointer-events-none'>
                            {item.title}
                          </div>
                        )}
                        <WidgetItemRendererV2
                          layer={{
                            elementRef: item.elementRef,
                            type: 'element',
                            elemId: item.title,
                            attrs: item.attrs,
                            tag: item.tag,
                          }}
                          readonly={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ResponsiveDialog>
    </>
  );
};

export default observer(AddElementPopover);
