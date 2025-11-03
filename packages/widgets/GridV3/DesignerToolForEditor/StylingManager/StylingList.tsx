import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  takeInnerStyle,
  takeLayoutWrapperStyle,
  takeTextStyle,
} from '../../comp/WidgetItemRendererV2';
import { useGridContext } from '../../comp/provider';
import { mergeDeep2 } from '../../comp/provider/utils';
import { GridRow, noTakeTag, ThemeConfigV2 } from '../../shared/types';
import { defaultTheme2, getDefaultTheme2 } from '../AddCompHelper/const';
import LayoutTemplateRender from '../MaterialResourceManager/LayoutTemplateRender';
import MaterialFloorManager from '../MaterialResourceManager/MaterialFloorManager';
import { useMaterialResources } from '../MaterialResourceManager/hook';
import { MaterialItem } from '../ThemePackManager/services';
import StylingCreatorV2 from './StylingCreatorV2';
import { stylingManager } from './services';

interface StylingListProps {
  className?: string;
}

const pageSize = 20;

const clearStyle = (content: any) => {
  const removeStyleDimension = [
    'width',
    'height',
    'minWidth',
    'minHeight',
    'zIndex',
    'flex',
  ];
  Object.keys(content).forEach(tag => {
    Object.keys(content[tag]).forEach(item => {
      if (removeStyleDimension.includes(item)) {
        console.log('item', item);
        delete content[tag][item as keyof ThemeConfigV2];
      }
    });
  });
  return content;
};
export default function StylingList({ className = '' }: StylingListProps) {
  const {
    gridProps,
    themeConfig,
    editorSDK,
    gridsData,
    getStyleByTag2,
    getActiveRootRow,
    clearActiveStatus,
  } = useGridContext();
  const stylePack = gridProps?.stylePackV2 || {
    name: '未保存',
    documentId: '',
    author: '',
    desc: '',
    cover_url: '',
    categoryDocumentId: '',
  };
  const [showCate, setShowCate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [selectTheme, setSelectTheme] = useState<MaterialItem<ThemeConfigV2>>();

  const takeStyle = (): ThemeConfigV2 => {
    const styleRes = {
      page: gridProps.style || {},
    } as ThemeConfigV2;
    const defaultStyle = getDefaultTheme2();
    const breadthFirstTakeStyle = (rootRow: GridRow) => {
      // 广度优先递归，优先提取同级Grid的样式
      const queue: GridRow[] = [rootRow];

      while (queue.length > 0) {
        const currentRow = queue.shift()!;
        const rowTag = currentRow.tag as keyof ThemeConfigV2;

        // 处理当前节点的样式
        if (
          !styleRes[rowTag] &&
          currentRow.style &&
          Object.values(currentRow.style).length > 0 &&
          rowTag &&
          !noTakeTag.includes(rowTag)
        ) {
          styleRes[rowTag] = {
            ...getStyleByTag2(rowTag),
            ...(currentRow.style || {}),
          };
        }

        // 将直接子节点加入队列
        if (currentRow.children?.length) {
          queue.push(...currentRow.children);
        }

        // 处理 childrenIds 中的节点
        if (currentRow.childrenIds?.length) {
          for (const childId of currentRow.childrenIds) {
            const layerLink = editorSDK?.getLink(childId);
            const layer = editorSDK?.getLayer(childId);
            const layerTag = layerLink?.tag as keyof ThemeConfigV2;
            if (
              !styleRes[layerTag] &&
              layer &&
              !layer.attrs.disabledToEdit &&
              layerLink &&
              layerTag &&
              !noTakeTag.includes(layerTag)
            ) {
              styleRes[layerTag] = {
                ...getStyleByTag2(layerTag),
                ...(takeLayoutWrapperStyle(layer.attrs) || {}),
                ...(takeInnerStyle(layer.attrs) || {}),
                ...(takeTextStyle(layer.attrs) || {}),
                layoutStyle: {
                  ...takeLayoutWrapperStyle(layer.attrs.layoutStyle || {}),
                  ...takeInnerStyle(layer.attrs.layoutStyle || {}),
                  ...takeTextStyle(layer.attrs.layoutStyle || {}),
                  width: 'auto',
                  height: 'auto',
                },
              };
            }
          }
        }
      }
    };
    gridsData.forEach(grid => {
      breadthFirstTakeStyle(grid);
    });
    return mergeDeep2({}, defaultStyle, styleRes);
  };

  const onSelectStyle = (item: MaterialItem) => {
    const { content, ...other } = item;
    console.log('content', clearStyle(content));
    editorSDK?.onFormValueChange({
      themeConfig2: clearStyle(content),
      stylePackV2: other,
      _updateVersion: (gridProps._updateVersion || 0) + 1,
    });
    clearActiveStatus();
  };

  const {
    list: stylingItems,
    selectedCategory,
    setPage,
    setCategory,
    page,
    loading,
    total,
    reloadList,
    loadCategories,
    categories,
    setSearch,
    clearSearch,
  } = useMaterialResources({
    materialManager: stylingManager,
    pageSize,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 风格列表区域 */}
      <div className='flex-1 flex flex-col min-h-0 space-y-2'>
        <div className='flex items-center px-2 gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setShowCate(true);
            }}
          >
            分类管理
          </Button>
          {/* <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectTheme(undefined);
              setShowCreator(true);
            }}
          >
            新建风格
          </Button> */}
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              onSelectStyle?.({
                content: {
                  ...defaultTheme2,
                  themeColors: themeConfig.themeColors,
                },
                name: '未保存风格',
                documentId: '',
                author: '',
                desc: '',
                cover_url: '',
              } as any);
            }}
          >
            恢复默认
          </Button>

          <Button
            className='trggier px-2'
            size='sm'
            variant='outline'
            style={{
              pointerEvents: 'auto',
            }}
            onClick={e => {
              const style = takeStyle();
              console.log('style', style);
              setSelectTheme({
                ...stylePack,
                content: {
                  ...style,
                  themeColors: themeConfig.themeColors,
                },
                // documentId: "",
              } as any);
              setShowCreator(true);
            }}
          >
            提取风格
          </Button>
          <Button
            className='trggier px-2'
            size='sm'
            variant='outline'
            style={{
              pointerEvents: 'auto',
            }}
            onClick={e => {
              setShowImport(true);
            }}
          >
            导入风格
          </Button>
        </div>
        <div className='px-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setSelectTheme(undefined);
              setShowCreator(true);
            }}
          >
            当前风格: {stylePack?.name}-{stylePack?.author}，点击编辑
          </Button>
        </div>
      </div>
      <ResponsiveDialog
        isOpen={showCate}
        onOpenChange={setShowCate}
        title='分类管理'
        direction='left'
      >
        <MaterialFloorManager
          materialManager={stylingManager}
          onDelete={category => {
            loadCategories();
          }}
        />
      </ResponsiveDialog>
      <ResponsiveDialog
        isOpen={showCreator}
        onOpenChange={setShowCreator}
        title='风格管理'
        contentProps={{
          className: 'max-w-[80vw] w-full',
        }}
      >
        <StylingCreatorV2
          themeItem={selectTheme}
          categories={categories}
          onSave={async (nextValue, saveAsNew) => {
            // setIsSaveDialogOpen(true);
            reloadList();
            setShowCreator(false);
          }}
          onCancel={() => {
            // setShowCreator(false);
            setShowCreator(false);
          }}
        />
        {/* {useGridV2 ? (
          <StylingCreatorV2
            categories={categories}
            onSave={async (nextValue, saveAsNew) => {
              setIsSaveDialogOpen(true);
            }}
            onCancel={() => {
              setShowCreator(false);
            }}
          />
        ) : (
          <StylingCreator
            theme={selectTheme?.content}
            onSave={async (nextValue, saveAsNew) => {
              setSelectTheme({
                ...(selectTheme || {}),
                content: nextValue,
                documentId: saveAsNew ? undefined : selectTheme?.documentId,
              } as any);
              setIsSaveDialogOpen(true);
            }}
            onCancel={() => {
              setShowCreator(false);
            }}
          />
        )} */}
      </ResponsiveDialog>

      {/* <ResponsiveDialog
        isOpen={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        title={selectTheme ? "编辑风格" : "新增风格"}
      >
        <UpdateMaterialItemForm
          defaultContent={
            widgetState.activeRowDepth?.[0]
              ? getCopyRowCodeV2({
                  activeRowDepth: [widgetState.activeRowDepth?.[0]],
                })
              : undefined
          }
          materialItem={selectTheme}
          categories={categories}
          onClose={() => setIsSaveDialogOpen(false)}
          onSubmit={async (submitData) => {
            if (selectTheme?.documentId) {
              await stylingManager.updateItem(selectTheme.documentId, {
                ...submitData,
              });
            } else {
              await stylingManager.createItem({
                ...submitData,
                material_class: {
                  set: [stylingCateId],
                },
              });
            }
            setPage(1);
            setIsSaveDialogOpen(false);
            setShowCreator(false);
          }}
          selectedCategory={selectedCategory}
        />
      </ResponsiveDialog> */}
      <ResponsiveDialog
        isOpen={showImport}
        direction='left'
        onOpenChange={setShowImport}
        title='导入风格'
      >
        <LayoutTemplateRender
          style={{
            width: '400px',
          }}
          onItemClick={materialItem => {
            onSelectStyle?.(materialItem);
            setShowImport(false);
            toast.success('导入风格成功！');
          }}
          onSettingMaterial={materialItem => {
            setSelectTheme(materialItem);
            setShowCreator(true);
          }}
          onRemoveMaterial={async materialItem => {
            await stylingManager.removeItem(materialItem.documentId);
            reloadList();
          }}
          onChangeFloor={id => {
            setCategory(id);
          }}
          activeFloorId={selectedCategory}
          floors={categories}
          materials={stylingItems}
          loading={loading}
          onPageChange={page => {
            setPage(page);
          }}
          currentPage={page}
          pageSize={pageSize}
          total={total}
          showSearch={true}
          searchPlaceholder='搜索风格...'
          onSearch={searchTerm => {
            if (searchTerm.trim()) {
              setSearch(searchTerm);
            } else {
              clearSearch();
            }
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}
