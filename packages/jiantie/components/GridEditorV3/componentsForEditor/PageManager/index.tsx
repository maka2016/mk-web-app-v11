import styled from '@emotion/styled';
import clas from 'classnames';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import RowRendererV2 from '../../AppV2/RowRendererV2';
import { scrollToActiveRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';

const RowRoot = styled.div`
  height: 100%;
  width: 100%;
  overflow: hidden;
  overflow-y: auto;
  padding: 4px;
  .vertical_scroll_view {
    display: flex;
    /* flex-direction: column; */
    flex-wrap: wrap;
    gap: 8px;
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
    outline: 1px solid #eee;
    border-radius: 4px;
    aspect-ratio: 3/4;
    overflow: hidden;
    &:hover {
      outline: 2px solid #b8b8b8;
    }
    &.active {
      outline: 2px solid #1a87ff;
    }
    .row_content {
      * {
        pointer-events: none !important;
      }
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
    font-size: 12px;
    text-align: center;
    padding: 2px 0;
  }
`;

const CateView = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding: 8px;
  .scroll_view {
    width: 100%;
    flex-wrap: wrap;
    display: flex;
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
  }
  .cate_item {
    padding: 2px 6px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    font-size: 12px;
    &.active {
      border-color: #1a87ff;
      color: #1a87ff;
      background-color: #e6f4ff;
    }
  }
`;

function PageManager() {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2, worksData } = worksStore;
  // 监听widgetStateV2的变化
  toJS(widgetStateV2);
  const { gridProps } = worksData;
  const gridsData = gridProps.gridsData;
  const gridStyle = gridProps.style;
  const { getStyleByTag2 } = worksStore;
  const zoom = 0.3;
  const [activeCate, setActiveCate] = useState<string>();

  // 当页面数据变化时，重置分类筛选
  useEffect(() => {
    setActiveCate(undefined);
  }, [gridsData?.length]);

  // 从页面名称中提取分类
  const getCategories = () => {
    const categories = new Set<string>();
    gridsData?.forEach((page, idx) => {
      const pageName = page.name || `页面${idx + 1}`;
      const nameParts = pageName.split('-');
      if (nameParts && nameParts.length > 1) {
        categories.add(nameParts[0]);
      }
    });
    return categories;
  };

  const categories = getCategories();

  // 根据分类筛选页面的索引
  const getFilteredPageIndices = () => {
    if (!activeCate || !gridsData) {
      return gridsData?.map((_, idx) => idx) || [];
    }
    const indices: number[] = [];
    gridsData.forEach((page, idx) => {
      const pageName = page.name || `页面${idx + 1}`;
      const nameParts = pageName.split('-');
      if (nameParts && nameParts.length > 1 && nameParts[0] === activeCate) {
        indices.push(idx);
      }
    });
    return indices;
  };

  const filteredPageIndices = getFilteredPageIndices();

  return (
    <>
      <RowRoot>
        {/* <div className='mb-2'>
          <Button
            size='sm'
            variant={'outline'}
            onClick={() => {
              setReviewMode(!reviewMode);
            }}
          >
            审阅模式(暂未支持)
          </Button>
        </div> */}

        {/* 分类筛选 */}
        {categories.size > 0 && (
          <CateView className='cate_view'>
            <div className='scroll_view'>
              <div
                className={clas(
                  'cate_item',
                  activeCate === undefined && 'active'
                )}
                onClick={() => setActiveCate(undefined)}
              >
                全部
              </div>
              {Array.from(categories).map(cate => (
                <div
                  key={cate}
                  className={clas('cate_item', activeCate === cate && 'active')}
                  onClick={() => setActiveCate(cate)}
                >
                  {cate}
                </div>
              ))}
            </div>
          </CateView>
        )}

        <div className='vertical_scroll_view'>
          <RowRendererV2
            readonly={true}
            isPlayFlipPage={false}
            isFlipPage={false}
            blockStyle={{
              width: '375px',
              zoom,
              boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
            blockWrapper={(rowDOM, blockIdx, row) => {
              // 如果当前页面不在筛选列表中，不渲染
              if (!filteredPageIndices.includes(blockIdx)) {
                return null;
              }

              const isActive = widgetStateV2.activeRowDepth?.[0] === blockIdx;
              return (
                <div
                  key={`row_${blockIdx}`}
                  className={clas(isActive && 'active', 'row_wrapper relative')}
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
                </div>
              );
            }}
          />
        </div>
      </RowRoot>
    </>
  );
}

export default observer(PageManager);
