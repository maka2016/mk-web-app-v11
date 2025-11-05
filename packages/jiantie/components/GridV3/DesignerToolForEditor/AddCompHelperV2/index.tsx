import React, { useEffect, useState } from 'react';
import { BtnLite as BtnLite1 } from '../../shared/style-comps';
import styled from '@emotion/styled';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { useGridContext } from '../../comp/provider';
import { createAddConfigFactory, IAddItem } from './const';
import { blockStyleFilter } from '../../shared';

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

const AddItemPicker = ({
  onAdd,
}: {
  onAdd: (
    item: IAddItem,
    category: {
      title: string;
      icon: React.ReactNode;
      onAction: (item: IAddItem) => void;
    }
  ) => void;
}) => {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const {
    addComponentV2,
    editorCtx,
    widgetStateV2,
    themeConfig,
    setWidgetStateV2,
    addRowToRootV2,
    addRowToRowChildV2,
  } = useGridContext();

  // 使用工厂函数生成配置
  const addConfig = createAddConfigFactory(themeConfig || ({} as any), {
    addComponentV2,
    editorCtx,
    widgetStateV2,
    addRowToRootV2,
    setWidgetStateV2,
    addRowToRowChildV2,
  });

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
          {childrenItems.map((childItem: any, index: number) => {
            return (
              <BtnLite
                key={childItem.title}
                title={childItem.title}
                onClick={() => {
                  if (onAdd) {
                    onAdd(childItem, currentCategory as any);
                    return;
                  } else {
                    currentCategory.onAction?.(childItem);
                    childItem.action?.(childItem);
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
};

const AddItemModalV2 = () => {
  const { editorSDK, widgetStateV2, setWidgetStateV2 } = useGridContext();
  const { isAddModalShow } = widgetStateV2;

  return (
    <>
      <ResponsiveDialog
        isOpen={isAddModalShow}
        direction='left'
        contentProps={{
          className: 'w-[420px]',
        }}
        dismissible={true}
        showOverlay={true}
        onOpenChange={open => {
          setWidgetStateV2({
            isAddModalShow: open,
          });
        }}
        title='添加内容'
      >
        <AddItemPicker
          onAdd={(item, category) => {
            category.onAction?.(item);
            item.action?.(item);
            setWidgetStateV2({
              isAddModalShow: false,
            });
          }}
        />
      </ResponsiveDialog>
    </>
  );
};
export default AddItemModalV2;
