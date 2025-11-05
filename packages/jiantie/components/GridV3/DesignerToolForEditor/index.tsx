import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { useSearchParams } from 'next/navigation';
import React, { useLayoutEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import { useGridContext } from '../comp/provider';
import { CopyRowData, scrollToActiveRow } from '../shared';
import AddItemModal from './AddCompHelper';
import AddItemModalV2 from './AddCompHelperV2';
import CoverAnimateLibrary from './CoverAnimateLibrary';
import { TagPickerWrapper } from './DesignerOperatorV2/SettingPopoverV2/TagPicker';
import ElementAttrsEditor from './ElementAttrsEditor';
import ElementAttrsEditorV2 from './ElementAttrsEditorV2/index';
import GridLibrary from './GridLibrary';
import DesignerToolHeader from './Header';
import HeaderForUser from './HeaderForUser';
import DesignerToolHeaderV2 from './HeaderV2';
import LayerManager from './LayerManager';
import LayoutLibrary from './LayoutLibrary';
import MaterialManager from './MaterialManager';
import PageManager from './PageManager';
import SplitView from './SplitView';
import StylingManager from './StylingManager';
import ThemeLayoutLibrary from './ThemeLayoutLibrary';
import MaterialColors from './ThemeLayoutLibraryV3/MaterialColors';
import MaterialComponents from './ThemeLayoutLibraryV3/MaterialComponents';
import MaterialPic from './ThemeLayoutLibraryV3/MaterialPic';
import MaterialText from './ThemeLayoutLibraryV3/MaterialText';
import StylingCreatorV4 from './ThemeLayoutLibraryV3/StylingCreatorV4';
import ThemeImport from './ThemeLayoutLibraryV3/ThemeImport';
import ThemeV3LayoutLibrary from './ThemeLayoutLibraryV3/ThemeV3LayoutLibrary';
import ThemePackManager from './ThemePackManager';
import CreateThemePackLayout from './ThemePackManager/CreateThemePackLayout';
import ThemeProvider from './ThemePackManager/ThemeProvider';
import ThemeRootSelector from './ThemePackManager/ThemeRootSelector';

const DesignerToolRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
`;

const UserRoot = styled.div`
  overflow: hidden;
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
`;

const SideContainer = styled.div`
  width: 460px;
  overflow: hidden;
  background-color: #fff;
  border: 1px solid #0000000f;
  border-radius: 12px;
  &.left {
    left: 0;
    right: auto;
  }
`;

export default function DesignerToolForEditor({
  useGridV2,
  children,
}: {
  useGridV2: boolean;
  children: React.ReactNode;
}) {
  const {
    editorSDK,
    widgetState,
    widgetStateV2,
    fullStack,
    designerInfo,
    gridProps,
    gridsData,
    addRowFromTemplateV2,
    getRowById,
    setWidgetStateV2,
    getRowByDepth,
    themePackV3Data,
  } = useGridContext();
  const [showOldVersion, setShowOldVersion] = useState(true);
  const { showCreateLayoutForm } = widgetState;
  const searchParams = useSearchParams();
  const isThemeMode = gridProps.worksCate === 'theme';

  // 从URL参数获取tab状态，默认为theme1
  const [activeTab, setActiveTab] = useState(() => {
    return (
      searchParams.get('tab') || (isThemeMode ? 'blocks' : 'theme3_import')
    );
  });

  // 为非设计师模式创建第一个子容器
  const [firstChildContainer, setFirstChildContainer] =
    useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!fullStack || !designerInfo?.isDesigner) {
      const headerContainer = document.querySelector('#editor_container');
      if (headerContainer) {
        const wrapper = document.createElement('div');
        // 插入到第一位
        if (headerContainer.firstChild) {
          headerContainer.insertBefore(wrapper, headerContainer.firstChild);
        } else {
          headerContainer.appendChild(wrapper);
        }

        // 使用 requestAnimationFrame 来在下一帧更新状态，避免同步更新
        requestAnimationFrame(() => {
          setFirstChildContainer(wrapper);
        });

        return () => {
          if (headerContainer.contains(wrapper)) {
            headerContainer.removeChild(wrapper);
          }
          setFirstChildContainer(null);
        };
      }
    }
  }, [fullStack, designerInfo?.isDesigner]);

  // 当tab改变时更新URL参数
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());

    // 如果是默认值，则从URL中移除tab参数
    if (value === 'theme1') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }

    // 使用 window.history.replaceState 更新 URL，避免页面刷新
    const search = params.toString();
    const newUrl = search ? `?${search}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  };

  if (designerInfo?.fetching) {
    return (
      <div className='flex-1 flex justify-center items-center'>Loading...</div>
    );
  }

  if (!fullStack || !designerInfo?.isDesigner) {
    return (
      <>
        {firstChildContainer &&
          ReactDOM.createPortal(<HeaderForUser />, firstChildContainer)}
        {children}
      </>
    );
  }

  return (
    <ThemeProvider>
      <DesignerToolRoot>
        {useGridV2 ? <DesignerToolHeaderV2 /> : <DesignerToolHeader />}
        <div className='flex-1 flex justify-between overflow-hidden'>
          <SideContainer>
            <SplitView
              topTitle='素材库'
              bottomTitle='图层管理'
              topChildren={
                <Tabs
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className='h-full overflow-hidden flex justify-start'
                >
                  <div className='flex flex-col'>
                    <TabsList className='flex flex-col h-auto justify-start gap-2 py-1 m-1 items-stretch self-stretch'>
                      <>
                        {isThemeMode ? (
                          <>
                            {/* <TabsTrigger value='theme3'>主题制作</TabsTrigger> */}
                            <TabsTrigger value='blocks'>版式</TabsTrigger>
                            <TabsTrigger value='components'>组件</TabsTrigger>
                            <TabsTrigger value='materials_pic'>
                              图库
                            </TabsTrigger>
                            <TabsTrigger value='materials_text'>
                              文案
                            </TabsTrigger>
                            <TabsTrigger value='materials_color'>
                              色板
                            </TabsTrigger>
                            <TabsTrigger value='style_setting4'>
                              风格
                            </TabsTrigger>
                          </>
                        ) : (
                          <>
                            <TabsTrigger value='theme3_import'>
                              主题
                            </TabsTrigger>
                            <TabsTrigger value='components'>组件</TabsTrigger>
                          </>
                        )}
                        {/* <TabsTrigger value='layer_manager'>图层</TabsTrigger> */}
                        <TabsTrigger value='page_manager'>画布</TabsTrigger>
                      </>
                    </TabsList>
                    <TabsList className='flex flex-col h-auto justify-start self-start gap-2 py-1 m-1 items-stretch'>
                      <Button
                        variant={'outline'}
                        size={'xs'}
                        onClick={() => {
                          setShowOldVersion(!showOldVersion);
                        }}
                      >
                        旧版
                      </Button>
                      {showOldVersion && (
                        <>
                          {useGridV2 && (
                            <>
                              <TabsTrigger value='theme2'>主题包2</TabsTrigger>
                            </>
                          )}
                          <TabsTrigger value='theme1'>主题包1</TabsTrigger>
                          <TabsTrigger value='layout_library'>
                            板式库1
                          </TabsTrigger>
                          <TabsTrigger value='styling_library'>
                            风格库1
                          </TabsTrigger>
                          <TabsTrigger value='grid_library'>Grid库</TabsTrigger>
                          <TabsTrigger value='cover_animation'>
                            开幕库
                          </TabsTrigger>
                          <TabsTrigger value='material'>素材库</TabsTrigger>
                        </>
                      )}
                    </TabsList>
                  </div>
                  <TabsContent
                    value='theme1'
                    className='flex-1 overflow-hidden'
                  >
                    <ThemePackManager />
                  </TabsContent>
                  {useGridV2 && (
                    <>
                      <TabsContent
                        value='theme2'
                        className='flex-1 overflow-hidden'
                      >
                        <ThemeLayoutLibrary />
                      </TabsContent>
                      {isThemeMode ? (
                        <>
                          {/* <TabsContent
                        value='theme3_setting'
                        className='flex-1 overflow-hidden'
                      >
                        <ThemeLayoutLibraryV3 />
                      </TabsContent> */}
                          <TabsContent
                            value='theme3'
                            className='flex-1 overflow-hidden'
                          >
                            <ThemeV3LayoutLibrary />
                          </TabsContent>
                        </>
                      ) : (
                        <TabsContent
                          value='theme3_import'
                          className='flex-1 overflow-hidden'
                        >
                          <ThemeImport />
                        </TabsContent>
                      )}
                    </>
                  )}

                  <TabsContent
                    value='components'
                    className='flex-1 overflow-hidden'
                  >
                    {/* <ComponentManager /> */}
                    <MaterialComponents
                      dataType='components'
                      onAdd={(component, group) => {
                        console.log('group', group);
                        try {
                          const addDepth = widgetStateV2.activeRowDepth?.slice(
                            0,
                            2
                          );
                          if (addDepth?.length && addDepth.length < 2) {
                            toast.error('请先选中需要添加到的区块');
                            return;
                          }
                          delete component.data.rows[0]._id;
                          component.data.rows[0].componentGroupRefId =
                            group.groupId;
                          const res = addRowFromTemplateV2(component.data, {
                            activeRowDepth: addDepth,
                          });
                          setWidgetStateV2({
                            activeRowDepth: res.copiedRowDepth,
                          });
                          toast.success('添加成功');
                        } catch (error) {
                          console.error('添加组件失败', error);
                          toast.error('添加失败');
                        }
                      }}
                      onComponentClick={component => {
                        // 定位到被关联的第一个组件
                        for (let i = 0; i < gridsData.length; i++) {
                          const block = gridsData[i];
                          // console.log('block', block);
                          if (block && block.children) {
                            for (let j = 0; j < block.children.length; j++) {
                              const row = block.children?.[j];
                              if (row?.sourceComponentId === component.compId) {
                                if (widgetStateV2.activeRowDepth?.[0] === i) {
                                  return;
                                }
                                setWidgetStateV2({
                                  activeRowDepth: row.depth,
                                  hideOperator: false,
                                });
                                const block = getRowByDepth([i]);
                                scrollToActiveRow(block?.id);
                                return;
                              }
                            }
                          }
                        }
                        toast.error('找不到关联的区块');
                      }}
                    />
                  </TabsContent>

                  <TabsContent
                    value='blocks'
                    className='flex-1 overflow-hidden'
                  >
                    {/* <ComponentManager /> */}
                    <MaterialComponents
                      dataType='blocks'
                      onAddAll={() => {
                        if (
                          themePackV3Data.blockGroupData &&
                          confirm('确定要添加所有页面到画布吗？')
                        ) {
                          const allData: CopyRowData = {
                            rows: [],
                            elemComps: [],
                            positionLink: {},
                          };
                          // 遍历所有组件组，添加所有组件
                          for (const group of themePackV3Data.blockGroupData) {
                            for (const data of group.datas) {
                              allData.rows.push(...data.data.rows);
                              allData.elemComps.push(...data.data.elemComps);
                              Object.assign(
                                allData.positionLink,
                                data.data.positionLink
                              );
                            }
                          }
                          addRowFromTemplateV2(allData, {
                            activeRowDepth: [0],
                          });
                        }
                      }}
                      itemAspectRatio='3/4'
                      onAdd={(component, group) => {
                        try {
                          delete component.data.rows[0]._id;
                          component.data.rows[0].componentGroupRefId =
                            group.groupId;
                          const res = addRowFromTemplateV2(component.data, {
                            activeRowDepth:
                              widgetStateV2.activeRowDepth?.slice(0, 1) || [],
                          });
                          setWidgetStateV2({
                            activeRowDepth: res.copiedRowDepth,
                          });
                          if (res.copiedRowDepth) {
                            scrollToActiveRow(
                              getRowByDepth(res.copiedRowDepth)?.id || ''
                            );
                          }
                          toast.success('添加成功');
                        } catch (error) {
                          console.error('添加组件失败', error);
                          toast.error('添加失败');
                        }
                      }}
                      onComponentClick={component => {
                        // 定位到被关联的第一个组件
                        for (let i = 0; i < gridsData.length; i++) {
                          const block = gridsData[i];
                          // console.log('block', block);
                          if (block && block.children) {
                            if (block?.sourceComponentId === component.compId) {
                              if (widgetStateV2.activeRowDepth?.[0] === i) {
                                return;
                              }
                              setWidgetStateV2({
                                activeRowDepth: [i],
                                hideOperator: false,
                              });
                              scrollToActiveRow(block?.id);
                              return;
                            }
                          }
                        }
                        toast.error('找不到关联的区块');
                      }}
                    />
                  </TabsContent>
                  <TabsContent
                    value='materials_color'
                    className='flex-1 overflow-hidden'
                  >
                    <MaterialColors />
                  </TabsContent>
                  <TabsContent
                    value='style_setting4'
                    className='flex-1 overflow-hidden'
                  >
                    <StylingCreatorV4 />
                  </TabsContent>
                  <TabsContent
                    value='materials_pic'
                    className='flex-1 overflow-hidden'
                  >
                    <MaterialPic />
                  </TabsContent>
                  <TabsContent
                    value='materials_text'
                    className='flex-1 overflow-hidden'
                  >
                    <MaterialText />
                  </TabsContent>
                  <TabsContent
                    value='materials'
                    className='flex-1 overflow-hidden'
                  >
                    {/* <MaterialManagerForTheme /> */}
                  </TabsContent>
                  <TabsContent
                    value='styling_library'
                    className='flex-1 overflow-hidden'
                  >
                    <StylingManager />
                  </TabsContent>
                  <TabsContent
                    value='material'
                    className='flex-1 overflow-hidden'
                  >
                    <MaterialManager />
                  </TabsContent>
                  <TabsContent
                    value='cover_animation'
                    className='flex-1 overflow-hidden'
                  >
                    <CoverAnimateLibrary />
                  </TabsContent>
                  <TabsContent
                    value='layout_library'
                    className='flex-1 overflow-hidden'
                  >
                    <LayoutLibrary />
                  </TabsContent>
                  <TabsContent
                    value='grid_library'
                    className='flex-1 overflow-hidden'
                  >
                    <GridLibrary />
                  </TabsContent>
                  {/* <TabsContent
                value='layer_manager'
                className='flex-1 overflow-hidden'
              >
                <LayerManager />
              </TabsContent> */}
                  <TabsContent
                    value='page_manager'
                    className='flex-1 overflow-hidden'
                  >
                    <PageManager />
                  </TabsContent>
                </Tabs>
              }
              bottomChildren={<LayerManager />}
              defaultTopHeight={60}
              minTopHeight={100}
              minBottomHeight={150}
              storageKey='designer-splitview-height'
            />
          </SideContainer>
          <div
            className='overflow-y-auto overflow-x-auto flex-1 relative z-10 flex flex-col'
            id='designer_scroll_container'
          >
            <div
              className='flex flex-col flex-1 justify-center items-center relative'
              id='designer_canvas_container'
            >
              <div className='h-full' id='designer_canvas_container_inner'>
                {children}
              </div>
            </div>
          </div>
          {useGridV2 ? <ElementAttrsEditorV2 /> : <ElementAttrsEditor />}
        </div>
        {useGridV2 ? <AddItemModalV2 /> : <AddItemModal />}
      </DesignerToolRoot>
      <TagPickerWrapper />
      <ResponsiveDialog
        contentProps={{
          className: 'w-[400px]',
        }}
        isOpen={showCreateLayoutForm}
        onOpenChange={nextVal => {
          editorSDK?.changeWidgetState({
            showCreateLayoutForm: nextVal,
          });
        }}
        title='保存Block'
      >
        <CreateThemePackLayout
          onSave={() => {
            editorSDK?.changeWidgetState({
              showCreateLayoutForm: false,
            });
          }}
          onClose={() =>
            editorSDK?.changeWidgetState({
              showCreateLayoutForm: false,
            })
          }
        />
      </ResponsiveDialog>
      <ThemeRootSelector />
    </ThemeProvider>
  );
}
