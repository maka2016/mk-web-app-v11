import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import styled from '@emotion/styled';
import clas from 'classnames';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import RowRendererV2 from '../../AppV2/RowRendererV2';
import { getCopyRowCodeWithGroupPure } from '../../provider/gridPropsOperator';
import { GridRow, scrollToActiveRow } from '../../utils';
import { useWorksStore } from '../../works-store/store/hook';

const RowRoot = styled.div`
  height: 100%;
  width: 100%;
  overflow: hidden;
  overflow-y: auto;
  padding: 8px;
  .vertical_scroll_view {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
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
    &.used {
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
    width: fit-content;
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

function ThemePackPages({
  gridsData,
  worksData,
  usedRowIds,
  handleClick,
}: {
  gridsData: GridRow[];
  worksData: IWorksData;
  usedRowIds?: string[];
  handleClick?: (row: GridRow) => void;
}) {
  const worksStore = useWorksStore();
  const { widgetStateV2, setWidgetStateV2 } = worksStore;
  const { addRowFromTemplateV2, getRowByDepth } = worksStore.gridPropsOperator;
  const [cate, setCate] = useState<Set<string>>();
  const [activeCate, setActiveCate] = useState<string>();
  const allLayers = worksData.layersMap;
  const zoom = 0.3;

  useEffect(() => {
    const setGroup = () => {
      const nextCate = new Set<string>();
      gridsData.forEach(row => {
        const rowNameSplit = row.name?.split('-');
        if (rowNameSplit && rowNameSplit?.length > 1) {
          nextCate.add(rowNameSplit[0]);
        }
      });
      setCate(nextCate);
    };
    setGroup();
  }, []);

  const getRenderGridsData = () => {
    if (activeCate) {
      return gridsData.filter(row => row.name?.split('-')[0] === activeCate);
    }
    return gridsData;
  };

  return (
    <div className='h-full'>
      <CateView className='cate_view'>
        <div className='scroll_view'>
          <div
            className={clas('cate_item', activeCate === undefined && 'active')}
            onClick={() => {
              setActiveCate(undefined);
            }}
          >
            全部
          </div>
          {cate &&
            Array.from(cate).map(cate => {
              return (
                <div
                  className={clas('cate_item', activeCate === cate && 'active')}
                  key={cate}
                  onClick={() => {
                    setActiveCate(cate);
                  }}
                >
                  {cate}
                </div>
              );
            })}
        </div>
      </CateView>
      <RowRoot>
        <div className='vertical_scroll_view'>
          <RowRendererV2
            gridsData={getRenderGridsData()}
            worksData={worksData}
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
              const isUsed = usedRowIds && usedRowIds.includes(row.id);
              return (
                <div
                  key={`row_${blockIdx}`}
                  onClick={() => {
                    if (isUsed) {
                      toast('页面已存在');
                      return;
                    }
                    if (handleClick) {
                      handleClick(row);
                      return;
                    }
                    const copyRowCode = getCopyRowCodeWithGroupPure({
                      activeRowDepth: [blockIdx],
                      gridsData,
                      getLayer: (id: string) => allLayers[id],
                    });
                    if (copyRowCode) {
                      const res = addRowFromTemplateV2(copyRowCode, {
                        activeRowDepth: [
                          widgetStateV2.activeRowDepth?.[0] || 0,
                        ],
                      });
                      setWidgetStateV2({
                        activeRowDepth: res.copiedRowDepth,
                      });
                      scrollToActiveRow(
                        getRowByDepth([res.copiedRowDepth?.[0] || 0])?.id || ''
                      );
                      toast.success('添加成功');
                    } else {
                      toast.error('添加失败');
                    }
                  }}
                  className={clas('row_wrapper relative', isUsed && 'used')}
                >
                  <div className='row_content relative z-0'>{rowDOM}</div>
                  <div className='page_name'>
                    {row.name || '页面' + (blockIdx + 1)}
                    {isUsed && '-已使用'}
                  </div>
                </div>
              );
            }}
          />
        </div>
      </RowRoot>
    </div>
  );
}
export default observer(ThemePackPages);
