import styled from '@emotion/styled';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import clas from 'classnames';
import { Settings2 } from 'lucide-react';
import { observer } from 'mobx-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import RowRendererV2 from '../../AppV2/RowRendererV2';
import PageNavigationV2 from '../../componentForContentLib/PageNavigationV2';
import MaterialComponents from '../../componentForContentLib/ThemeLayoutLibraryV3/MaterialComponents';
import { deepClone, scrollToActiveRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';
import SettingRowV3Pop from '../SettingPopoverUser/SettingRowV3Pop';

const UserPageManager = styled.div`
  /* position: absolute;
  left: 0;
  right: 0;
  bottom: 0; */
  width: 100%;
`;

const RowRoot = styled.div<{ itemWidth: number }>`
  /* height: 100%; */
  width: 100%;
  overflow: hidden;
  overflow-x: auto;
  padding: 4px;
  margin-bottom: var(--safe-area-inset-bottom);
  .editor_row_wrapper {
    min-height: auto !important;
    height: auto !important;
  }
  .hori_scroll_view {
    width: fit-content;
    gap: 8px;
    display: flex;
    align-items: center;
    /* flex-direction: column; */
    flex-wrap: nowrap;
  }
  .row_container {
    max-height: 100%;
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 8px;
    overflow: auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .row_wrapper {
    position: relative;
    outline: 2px solid #fff;
    border-radius: 4px;
    overflow: hidden;
    aspect-ratio: 3/4;
    width: ${props => props.itemWidth}px;
    &.active {
      outline: 2px solid #1a87ff;
    }
    .row_content {
      * {
        pointer-events: none !important;
      }
    }
    .setting_btn {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      bottom: 0;
      z-index: 10;
      background-color: rgba(0, 0, 0, 0.2);
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      padding: 4px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      display: none;
    }
    &.active .setting_btn {
      display: flex;
    }
  }
  .action_area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background-color: rgba(0, 0, 0, 0.3);
  }
  .footer_action {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    padding: 12px;
    background-color: #fff;
    border-top: 1px solid #e5e5e5;
    z-index: 10;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
  }
  .loading_container {
    z-index: 10;
    background-color: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-weight: bold;
  }
  .page_name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 10px;
    text-align: center;
    padding: 2px 0;
  }
  .add_page_btn {
    background-color: #fff;
    border-radius: 50%;
    padding: 4px;
  }
`;

function PageManagerForUser() {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2, worksData, getStyleByTag2 } =
    worksStore;
  const { gridProps } = worksData;
  const gridsData = gridProps.gridsData;
  const gridStyle = gridProps.style;

  const { getRowByDepth, addRowFromTemplateV2 } = worksStore.gridPropsOperator;
  const currBlock = gridsData[widgetStateV2?.activeRowDepth?.[0] || 0];
  const [templateShowV2, setTemplateShowV2] = useState(false);
  const [openPopoverIdx, setOpenPopoverIdx] = useState<number | null>(null);
  const itemWidth = 48;

  const zoom = (itemWidth / 375).toFixed(2);

  // if (worksDetail.specInfo.is_flat_page) {
  //   // 设计师和长页不使用
  //   return null;
  // }

  return (
    <UserPageManager className='UserPageManager'>
      <RowRoot itemWidth={itemWidth}>
        <div className='hori_scroll_view'>
          <RowRendererV2
            readonly={true}
            isPlayFlipPage={false}
            isFlipPage={false}
            blockStyle={{
              width: '375px',
              maxWidth: 'unset',
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
              boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              height: 'auto',
            }}
            blockWrapper={(rowDOM, blockIdx, row) => {
              const isActive = widgetStateV2.activeRowDepth?.[0] === blockIdx;
              const isPopoverOpen = openPopoverIdx === blockIdx;
              return (
                <div
                  key={`row_${blockIdx}`}
                  className='flex items-center gap-2'
                >
                  {/* <div
                    className={clas(
                      isActive && 'active',
                      'row_wrapper relative'
                    )}
                    style={{
                      ...getStyleByTag2('page', gridStyle),
                    }}
                    onClick={() => {
                      setWidgetStateV2({
                        activeRowDepth: [blockIdx],
                        editingElemId: undefined,
                        hideOperator: false,
                      });
                      scrollToActiveRow(row.id);
                    }}
                  >
                    <div className='row_content relative z-0'>{rowDOM}</div>
                    <div className='page_name'>
                      {row.name || '页面' + (blockIdx + 1)}
                    </div>
                  </div> */}
                  <Popover
                    open={isPopoverOpen}
                    onOpenChange={open => {
                      setOpenPopoverIdx(open ? blockIdx : null);
                    }}
                    modal={false}
                  >
                    <div
                      className={clas(
                        isActive && 'active',
                        'row_wrapper relative'
                      )}
                      style={{
                        ...getStyleByTag2('page', gridStyle),
                      }}
                      onClick={() => {
                        setWidgetStateV2({
                          activeRowDepth: [blockIdx],
                          editingElemId: undefined,
                          hideOperator: false,
                        });
                        scrollToActiveRow(row.id);
                      }}
                    >
                      <div className='row_content relative z-0'>{rowDOM}</div>
                      <div className='page_name'>
                        {row.name || '页面' + (blockIdx + 1)}
                      </div>
                      {isActive && (
                        <PopoverTrigger asChild>
                          <div
                            className='setting_btn'
                            onClick={e => {
                              e.stopPropagation();
                            }}
                          >
                            <div className='p-1 bg-white rounded-sm'>
                              <Settings2 size={16} />
                            </div>
                          </div>
                        </PopoverTrigger>
                      )}
                    </div>
                    <PopoverContent
                      className='w-fit p-1'
                      side='top'
                      align='center'
                      onOpenAutoFocus={e => {
                        e.preventDefault();
                      }}
                    >
                      <div className='flex overflow-hidden'>
                        <SettingRowV3Pop />
                      </div>
                    </PopoverContent>
                  </Popover>
                  {/* <div
                    className='add_page_btn'
                    onClick={() => {
                      setWidgetStateV2({
                        editingElemId: undefined,
                        activeRowDepth: [blockIdx],
                      });
                      setTemplateShowV2(true);
                    }}
                  >
                    <Plus size={16} />
                  </div> */}
                </div>
              );
            }}
          />
        </div>
      </RowRoot>
      <ResponsiveDialog
        isOpen={templateShowV2}
        handleOnly={true}
        showOverlay={false}
        onOpenChange={setTemplateShowV2}
        title='添加页面'
        contentProps={{
          className: 'pt-2 h-[60vh]',
        }}
      >
        {gridProps.themePackV3RefId?.worksId ? (
          <MaterialComponents
            manager={false}
            // activeComponentGroupId={currBlock?.componentGroupRefId}
            dataType='blocks'
            onComponentClick={c => {
              // console.log('c', c);
              // return;
              const component = deepClone(c);
              try {
                component.data.rows[0].componentGroupRefId =
                  currBlock?.componentGroupRefId;
                component.data.rows[0]._id = currBlock?.id;
                const { copiedRowDepth } = addRowFromTemplateV2(
                  component.data,
                  {
                    activeRowDepth: [widgetStateV2?.activeRowDepth?.[0] || 0],
                  },
                  false
                );
                scrollToActiveRow(
                  getRowByDepth(copiedRowDepth || [])?.id || ''
                );
                setWidgetStateV2({
                  activeRowDepth: copiedRowDepth,
                });
                toast.success(
                  `添加页面 ${component.compName || '未命名'} 成功`
                );
              } catch (error) {
                console.error('添加页面失败', error);
                toast.error('添加失败');
              }
              setTemplateShowV2(false);
            }}
          />
        ) : (
          <PageNavigationV2
            onClose={() => setTemplateShowV2(false)}
            onChange={() => {
              setTemplateShowV2(false);
            }}
          />
        )}
      </ResponsiveDialog>
    </UserPageManager>
  );
}

export default observer(PageManagerForUser);
