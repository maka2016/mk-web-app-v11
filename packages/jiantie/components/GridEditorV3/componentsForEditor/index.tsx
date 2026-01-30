import styled from '@emotion/styled';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';
import { cn } from '@workspace/ui/lib/utils';
import { observer } from 'mobx-react';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { isPc } from '../../../utils';
import MaterialComponents from '../componentForContentLib/ThemeLayoutLibraryV3/MaterialComponents';
import StylingCreatorV4 from '../componentForContentLib/ThemeLayoutLibraryV3/StylingCreatorV4';
import ThemePackManagement from '../componentForContentLib/ThemePackManagement';
import ShortcutHelp from '../components/ShortcutHelp';
import { CopyRowData, scrollToActiveRow } from '../utils';
import { useWorksStore } from '../works-store/store/hook';
import AddItemModalV2 from './AddCompHelperV2';
import ElementAttrsEditorV2 from './ElementAttrsEditorV2/index';
import DesignerToolHeaderV2 from './HeaderV2';
import HeaderForUser, { HeaderType } from './HeaderV2/HeaderForUser';
import LayerManager from './LayerManager';
import MaterialsPanel from './MaterialsPanel';
import PageManager from './PageManager';
import SettingPanel from './SettingPanel';
import { TagPickerWrapper } from './SettingPopoverDesigner/TagPicker';
import SplitView from './SplitView';

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

function DesignerToolForEditor({
  children,
  headerType = 'default',
}: {
  children: React.ReactNode;
  headerType?: HeaderType;
}) {
  const worksStore = useWorksStore();
  const {
    widgetStateV2,
    setWidgetStateV2,
    config: { readonly },
    worksData,
    fullStack,
    designerInfo,
  } = worksStore;
  const { gridProps } = worksData;
  const gridsData = gridProps.gridsData;
  const { addRowFromTemplateV2, getRowByDepth } = worksStore.gridPropsOperator;
  const { themePackV3Operator } = worksStore;
  const searchParams = useSearchParams();

  useEffect(() => {
    // 设计师相关设置
    const setThemePackV3 = () => {
      const url = new URL(window.location.href);
      const themePackV3 = url.searchParams.get('themePackV3');
      const themeWorksId =
        gridProps.themePackV3?.content?.worksId ||
        gridProps.themePackV3RefId?.worksId;
      if (!themePackV3 && themeWorksId) {
        url.searchParams.set('themePackV3', themeWorksId);
        window.history.replaceState({}, '', url.toString());
      }
    };
    if (fullStack && isPc()) {
      if (!designerInfo.isDesigner && !designerInfo.fetching) {
        toast.error('你还不是设计师，请联系管理员');
      }
      setThemePackV3();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designerInfo.isDesigner, designerInfo.fetching]);

  // 从URL参数获取tab状态，默认为theme1
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'theme3';
  });

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
    const inEditor = !readonly;
    return (
      <div
        className={cn(
          'root_editor_container overflow-hidden h-full w-full',
          inEditor && 'h-dvh'
        )}
      >
        <div
          className='relative h-full w-full overflow-hidden flex flex-col'
          id='editor_container'
        >
          {!readonly && <HeaderForUser headerType={headerType} />}
          <div
            className={cn(
              'overflow-y-auto overflow-x-hidden relative z-10 flex flex-col h-full'
            )}
            id='designer_scroll_container'
          >
            <div
              className={cn(
                'flex flex-col flex-1 justify-center items-center relative'
              )}
              id='designer_canvas_container'
            >
              <div
                className={cn(
                  'h-full w-full flex',
                  inEditor && 'pt-12 md:pt-24 pb-36 md:w-[375px] md:mx-auto'
                )}
                id='designer_canvas_container_inner'
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DesignerToolRoot>
        <DesignerToolHeaderV2 />
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
                        <TabsTrigger value='theme3'>主题包</TabsTrigger>
                        <TabsTrigger value='blocks'>版式</TabsTrigger>
                        <TabsTrigger value='components'>组件</TabsTrigger>
                        <TabsTrigger value='materials'>素材</TabsTrigger>
                        <TabsTrigger value='style_setting4'>风格</TabsTrigger>
                        <TabsTrigger value='page_manager'>画布</TabsTrigger>
                        <TabsTrigger value='setting'>设置</TabsTrigger>
                        {/* <TabsTrigger value='material'>素材(旧)</TabsTrigger> */}
                      </>
                    </TabsList>
                  </div>
                  <TabsContent
                    value='theme3'
                    className='flex-1 overflow-hidden'
                  >
                    <ThemePackManagement />
                  </TabsContent>
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
                          themePackV3Operator.blockGroupData &&
                          confirm('确定要添加所有页面到画布吗？')
                        ) {
                          const allData: CopyRowData = {
                            rows: [],
                            elemComps: [],
                          };
                          // 遍历所有组件组，添加所有组件
                          for (const group of themePackV3Operator.blockGroupData) {
                            for (const data of group.datas) {
                              allData.rows.push(...data.data.rows);
                              allData.elemComps.push(...data.data.elemComps);
                            }
                          }
                          addRowFromTemplateV2(allData, {
                            activeRowDepth: [0],
                          });
                        }
                      }}
                      itemAspectRatio='3/4'
                      onAdd={(component, group) => {
                        console.log('component', component);
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
                    value='style_setting4'
                    className='flex-1 overflow-hidden'
                  >
                    <StylingCreatorV4 key={gridProps._updateVersion} />
                  </TabsContent>
                  <TabsContent
                    value='materials'
                    className='flex-1 overflow-hidden'
                  >
                    <MaterialsPanel />
                  </TabsContent>
                  {/* <TabsContent
                    value='material'
                    className='flex-1 overflow-hidden'
                  >
                    <MaterialManager />
                  </TabsContent> */}
                  <TabsContent
                    value='page_manager'
                    className='flex-1 overflow-hidden'
                  >
                    <PageManager />
                  </TabsContent>
                  <TabsContent
                    value='setting'
                    className='flex-1 overflow-hidden'
                  >
                    <SettingPanel />
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
                {/* 快捷键说明组件 - 外挂到designer_scroll_container */}
                {fullStack && (
                  <>
                    <ShortcutHelp targetContainer='#designer_scroll_container' />
                  </>
                )}
              </div>
            </div>
          </div>
          <ElementAttrsEditorV2 />
        </div>
        <AddItemModalV2 />
      </DesignerToolRoot>
      <TagPickerWrapper />
    </>
  );
}

export default observer(DesignerToolForEditor);
