import styled from '@emotion/styled';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Image, LayoutGrid, MessageCircle, Type } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { BtnLite as BtnLite1 } from '../../components/style-comps';
import { blockStyleFilter } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import {
  AddCategory,
  createAddHandlers,
  getAddContainerThemeConfig,
  getAddPictureItemsByThemeConfig,
  getAddTextsByThemeConfig,
  getInteractiveComponents,
  IAddItem,
} from './const';

const ContainerRoot = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
  .category-list {
    width: 120px;
    border-right: 1px solid #e5e7eb;
    background-color: #f9fafb;
    display: flex;
    flex-direction: column;
  }
  .content-list {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
    background-color: #ffffff;
  }
`;

const BtnLite = styled(BtnLite1)`
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.05);
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
    outline: 1px solid #e5e7eb;
  }
  &:active {
    background-color: rgba(0, 0, 0, 0.15);
  }
`;

/**
 * 添加项选择器组件的 Props
 */
export interface AddItemPickerProps {
  /** 当选择添加项时的回调函数 */
  onAdd?: (item: IAddItem, category: AddCategory) => void;
  /** 主题配置 */
  themeConfig?: any;
  /** 添加组件配置上下文，如果不提供则从 useGridContext 和 useWorksStore 获取 */
  addConfigContext?: {
    addComponentV2: (params: {
      layer: any;
      toIndex?: number;
    }) => string | undefined;
    addRowToRootV2: (rows: any[] | any) => number[];
    addRowToRowChildV2: (rows: any[] | any) => number[] | undefined;
    widgetStateV2: any;
    setWidgetStateV2: (state: Partial<any>) => void;
  };
}

/**
 * 添加项选择器组件
 */
function AddItemPicker({
  onAdd,
  themeConfig: themeConfigProp,
  addConfigContext: addConfigContextProp,
}: AddItemPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2, worksData } = worksStore;
  const themeConfig =
    themeConfigProp || worksData.gridProps.themeConfig2 || ({} as any);

  const { addComponentV2, addRowToRootV2, addRowToRowChildV2 } =
    worksStore.gridPropsOperator;

  // 创建 handlers
  const handlers = createAddHandlers({
    addComponentV2,
    widgetStateV2: addConfigContextProp?.widgetStateV2 || widgetStateV2,
    addRowToRootV2,
    setWidgetStateV2:
      addConfigContextProp?.setWidgetStateV2 || setWidgetStateV2,
    addRowToRowChildV2,
  });

  // 创建配置数组
  const addConfig: AddCategory[] = [
    {
      title: '文字',
      icon: Type,
      childrenFactory: () =>
        getAddTextsByThemeConfig(themeConfig || ({} as any)),
      onAction: handlers.handleBasicElement,
    },
    {
      title: '图片',
      icon: Image,
      childrenFactory: () =>
        getAddPictureItemsByThemeConfig(themeConfig || ({} as any)),
      onAction: handlers.handleBasicElement,
    },
    {
      title: '布局',
      icon: LayoutGrid,
      childrenFactory: () => [
        ...getAddContainerThemeConfig(themeConfig || ({} as any)),
      ],
      onAction: handlers.handleLayoutContainer,
    },
    {
      title: '互动组件',
      icon: MessageCircle,
      childrenFactory: () =>
        getInteractiveComponents(handlers.handleInteractiveComponent),
      onAction: (item: IAddItem) => {
        // 互动组件有自己的 action，这里调用它
        item.action?.(item);
      },
    },
  ];

  const currentCategory = addConfig[selectedCategory];
  const childrenItems = currentCategory?.childrenFactory?.() || [];

  return (
    <ContainerRoot>
      {/* 左侧类别选择 */}
      <div className='category-list'>
        {addConfig.map((item, index: number) => (
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
              fontWeight: selectedCategory === index ? 600 : 400,
              color: selectedCategory === index ? '#3b82f6' : '#374151',
              cursor: 'pointer',
            }}
            onClick={() => setSelectedCategory(index)}
          >
            {item.icon && (
              <item.icon
                style={{
                  width: '16px',
                  height: '16px',
                }}
              />
            )}
            <span style={{ marginLeft: '8px' }}>{item.title}</span>
          </BtnLite>
        ))}
      </div>

      {/* 右侧子项列表 */}
      <div className='content-list'>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '8px',
          }}
        >
          {childrenItems.map((childItem: IAddItem) => {
            return (
              <BtnLite
                key={childItem.title}
                title={childItem.title}
                onClick={() => {
                  if (onAdd) {
                    onAdd(childItem, currentCategory);
                    return;
                  } else {
                    // category.onAction 会处理所有逻辑，包括互动组件的 item.action
                    // 所以这里只需要调用 category.onAction 即可，避免重复调用
                    currentCategory.onAction?.(childItem);
                  }
                }}
              >
                {childItem.Component ? (
                  <childItem.Component {...childItem} />
                ) : (
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
                )}
                {childItem.icon && (
                  <div style={{ marginBottom: '8px' }}>{childItem.icon}</div>
                )}
              </BtnLite>
            );
          })}
        </div>
      </div>
    </ContainerRoot>
  );
}

const AddItemModalV2 = () => {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const { isAddModalShow2 } = widgetStateV2;

  return (
    <>
      <ResponsiveDialog
        isOpen={isAddModalShow2}
        direction='left'
        contentProps={{
          className: 'w-[420px]',
        }}
        dismissible={true}
        showOverlay={true}
        onOpenChange={open => {
          setWidgetStateV2({
            isAddModalShow2: open,
          });
        }}
        title='添加内容'
      >
        <AddItemPicker
          onAdd={(item, category) => {
            // 对于互动组件，category.onAction 内部已经会调用 item.action
            // 所以这里只需要调用 category.onAction 即可，避免重复调用
            category.onAction?.(item);
            setWidgetStateV2({
              isAddModalShow2: false,
            });
          }}
        />
      </ResponsiveDialog>
    </>
  );
};
export default observer(AddItemModalV2);
