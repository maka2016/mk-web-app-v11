import React, { useEffect, useRef, useState } from 'react';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { cdnApi } from '@mk/services';

import { deepClone, oddRowListReverseV3 } from '../../../shared/utils';
import styled from '@emotion/styled';
import { useGridContext } from '../../../comp/provider';
import { getAllLayers } from '../../../comp/utils';
import {
  createTimeline,
  stagger,
  text,
  TextSplitter,
  Timeline,
  utils,
} from 'animejs';
import { animation2Data } from '../animation2Data';
import { Button } from '@workspace/ui/components/button';
import { GridRow } from '../../../shared';
import { BlockGroup } from '../../../comp/provider/utils';

const TemplateList = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 8px;
  .template_item {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    cursor: pointer;

    .preview {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 68px;
      height: 68px;
      border: 1px solid #0000000f;
      border-radius: 4px;
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
    .name {
      font-size: 12px;
      font-weight: 400;
      line-height: 20px;
      color: #00000099;
      text-align: center;
    }
  }
`;

interface TemplateItem {
  name: string;
  type: {
    default: string;
    Text?: string;
    absoluteElem?: string;
    odd?: string;
    even?: string;
  };
  duration: number;
  delayTime: number;
  preview: string;
  activePreview: string;
}

const templateList: TemplateItem[] = [
  {
    //文字淡入, 其他上升
    name: '简约',
    type: {
      default: 'common-entrance-rise',
      Text: 'common-entrance-fade',
    },
    duration: 500,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_jianyue_active.png'
    ),
  },
  {
    //文字滑动, 其他底部弹出
    name: '流畅',
    type: {
      default: 'common-entrance-pop-bottom',
      Text: 'text-entrance-slide',
    },
    duration: 500,
    delayTime: 60,
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_jianyue_active.png'
    ),
  },
  {
    // 文字移位，绝对元素上升，其他下落
    name: '趣味',
    type: {
      default: 'common-entrance-fall',
      absoluteElem: 'common-entrance-rise',
      Text: 'text-entrance-shift',
    },
    duration: 500,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_jianyue_active.png'
    ),
  },
  {
    // 文字弹出，绝对元素左飞进，其他向右飞进
    name: '派对',
    type: {
      default: 'common-entrance-slide-right',
      absoluteElem: 'common-entrance-slide-left',
      Text: 'common-entrance-pop',
    },
    duration: 500,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_jianyue_active.png'
    ),
  },
  {
    // 文字上升，其他淡入
    name: '企业风',
    type: {
      default: 'common-entrance-fade',
      Text: 'common-entrance-rise',
    },
    duration: 500,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_jianyue.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_jianyue_active.png'
    ),
  },

  {
    name: '上升',
    type: {
      default: 'common-entrance-rise',
    },
    delayTime: 200,
    duration: 1000,
    preview: cdnApi('/cdn/editor7/animation_template/preview_shangsheng.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_shangsheng_active.png?v=1'
    ),
  },

  {
    name: '平移',
    type: {
      default: 'common-entrance-slide-right',
    },
    duration: 1000,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_furu.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_furu_active.png'
    ),
  },
  {
    name: '淡入',
    type: {
      default: 'common-entrance-fade',
    },
    delayTime: 200,
    duration: 1000,
    preview: cdnApi('/cdn/editor7/animation_template/preview_danru.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_danru_active.png?v=1'
    ),
  },
  {
    name: '擦除',
    type: {
      default: 'common-entrance-wipe',
    },
    duration: 300,
    delayTime: 200,
    preview: cdnApi('/cdn/editor7/animation_template/preview_cachu.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_cachu_active.png'
    ),
  },
  {
    name: '弹出',
    type: {
      default: 'common-entrance-pop',
    },
    duration: 500,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_tanchu.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_tanchu_active.png'
    ),
  },
  {
    // 向左滚入、向右滚入交替
    name: '滚动',
    type: {
      odd: 'common-entrance-roll-left',
      even: 'common-entrance-roll-right',
      default: 'common-entrance-slide-left',
    },
    duration: 300,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_gundong.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_gundong_active.png'
    ),
  },

  // {
  //   name: "砸落",
  //   type: {
  //     default: "common-entrance-slide-down",
  //   },
  //   duration: 500,
  //   delayTime: 0,
  //   preview: cdnApi("/cdn/editor7/animation_template/preview_zaluo.png"),
  //   activePreview: cdnApi(
  //     "/cdn/editor7/animation_template/preview_zaluo_active.png"
  //   ),
  // },
  // {
  //   name: "渐大",
  //   type: {
  //     default: "common-entrance-zoom-in-little",
  //   },
  //   duration: 1000,
  //   delayTime: 200,
  //   preview: cdnApi("/cdn/editor7/animation_template/preview_jianda.png"),
  //   activePreview: cdnApi(
  //     "/cdn/editor7/animation_template/preview_jianda_active.png"
  //   ),
  // },
  // {
  //   name: "闪入",
  //   type: {
  //     default: "common-entrance-flicker-in",
  //   },
  //   duration: 500,
  //   delayTime: 100,
  //   preview: cdnApi("/cdn/editor7/animation_template/preview_shanru.png"),
  //   activePreview: cdnApi(
  //     "/cdn/editor7/animation_template/preview_shanru_active.png"
  //   ),
  // },

  {
    name: '底部弹出',
    type: {
      default: 'common-entrance-pop-bottom',
    },
    duration: 300,
    delayTime: 100,
    preview: cdnApi('/cdn/editor7/animation_template/preview_dibutanchu.png'),
    activePreview: cdnApi(
      '/cdn/editor7/animation_template/preview_dibutanchu_active.png'
    ),
  },
];

interface AnimationTemplatesProps {
  elemId: string;
}

const AnimationTemplates = (props: AnimationTemplatesProps) => {
  const { elemId } = props;
  const {
    widgetState,
    rowsGroup,
    cellsMap,
    editorSDK,
    getWorksData,
    gridsData,
    useGridV2,
    getActiveRow,
  } = useGridContext();
  const worksData = getWorksData();
  const { activeRowId } = widgetState;
  const [layers, setLayers] = useState<LayerElemItem[]>([]);
  const timer = useRef<any>(null);
  const [activeId, setActiveId] = useState('');

  const timelineRef = useRef<Timeline>(null);

  // 递归找到 elemId 所在的 row
  const findRowByElemId = (rows: GridRow[], elemId: string): any | null => {
    for (const row of rows) {
      if (row.childrenIds?.includes(elemId)) {
        return row;
      }
      if (row.children?.length) {
        const found = findRowByElemId(row.children, elemId);
        if (found) return row;
      }
    }
    return null;
  };

  // 通过 elemId 找 rowsGroup
  const findRowsGroupByElemId = (
    gridsData: GridRow[],
    rowsGroup: BlockGroup[],
    elemId: string
  ): any | null => {
    const row = findRowByElemId(gridsData, elemId);
    if (!row) return null;

    const groupId = row.groupByRowId;
    return rowsGroup.find(g => g.groupId === groupId) || null;
  };

  const getLayoutLayers = () => {
    const allLayerMap = getAllLayers(worksData);
    const getLayer = (elemId: string) => {
      const layer = allLayerMap[elemId];
      return layer;
    };

    const collectLayers = (currGroupRows: any[], layers: any[] = []): any[] => {
      currGroupRows.forEach(currRow => {
        if (!currRow) return;

        // 收集本行 childrenIds
        currRow.childrenIds?.forEach((elemId: string) => {
          const layer = getLayer(elemId);
          if (layer) {
            layers.push(layer);
          }
        });

        // 向下递归 children
        if (currRow.children && currRow.children.length > 0) {
          collectLayers(currRow.children, layers);
        }
      });

      return layers;
    };

    if (useGridV2) {
      const result = findRowsGroupByElemId(gridsData, rowsGroup, elemId);

      const currGroupRows = gridsData.filter(row =>
        result?.rowIds.includes(row.id)
      );
      const _layers = collectLayers(currGroupRows);
      setLayers(_layers);
    } else {
      if (!activeRowId) return;
      const currBlock = rowsGroup.find(group =>
        group.rowIds.includes(activeRowId || '')
      );

      const currGroupRows = cellsMap.filter(row =>
        currBlock?.rowIds.includes(row.id)
      );

      const _layers: LayerElemItem[] = [];

      currGroupRows.map((currRow, rowIndex) => {
        const isRepeatList = currRow.isRepeatList;
        const listReverse = isRepeatList && currRow.listReverse;
        const rowPerCount =
          currRow.repeatColumnCount ||
          String(currRow.style?.gridTemplateColumns)?.split('1fr ')?.length ||
          1;
        const rowCells = listReverse
          ? oddRowListReverseV3(deepClone(currRow.cells), rowPerCount)
          : currRow.cells;

        currRow.childrenIds?.forEach(elemId => {
          const layer = getLayer(elemId);
          _layers.push(layer);
        });

        rowCells.forEach(cell => {
          cell.childrenIds?.forEach(id => {
            const layer = getLayer(id);
            _layers.push(layer);
          });
        });
      });
      setLayers(_layers);
    }
  };

  useEffect(() => {
    getLayoutLayers();
  }, []);

  const getItemAnimation = (
    layer: LayerElemItem,
    animation: TemplateItem,
    index: number
  ) => {
    let type = '';
    if (layer.elementRef === 'Text' && animation.type.Text) {
      type = animation.type.Text;
    } else if (layer?.attrs?.absoluteElem && animation.type.absoluteElem) {
      type = animation.type.absoluteElem;
    } else if (animation.type.odd && index % 2 === 0) {
      type = animation.type.odd;
    } else if (animation.type.even && index % 2 === 1) {
      type = animation.type.even;
    } else {
      type = animation.type.default;
    }

    if (type.startsWith('text')) {
      return animation2Data.text.entrance.find(item => item.id === type);
    } else {
      return animation2Data.common.entrance.find(item => item.id === type);
    }
  };

  const setItemAnimation = (
    layer: LayerElemItem,
    item: TemplateItem,
    index: number
  ) => {
    const delayTime = index * item.delayTime;
    const animation: any = getItemAnimation(layer, item, index);
    editorSDK?.fullSDK.setLink(layer?.elemId, {
      animateQueue2: {
        entrance: [
          {
            id: animation.id,
            name: animation.name,
            parameters: {
              ...animation.parameters,
              duration: item.duration,
              delay: delayTime,
            },
            delay: animation.delay || 0,
            type: animation.type || 'common',
          },
        ],
      },
    });
  };

  const setLayoutAnimation = (item: TemplateItem) => {
    layers.forEach((layer, i) => {
      setItemAnimation(layer, item, i);
    });
  };

  const playAnimation = (item: TemplateItem) => {
    if (timelineRef.current) {
      timelineRef.current.complete();
    }
    const timeline = createTimeline({
      autoplay: false,
    });
    layers.forEach((layer, i) => {
      const target = document.getElementById(`layer_root_${layer.elemId}`);

      if (target) {
        const animation: any = getItemAnimation(layer, item, i);

        // 如果 parameters 里有 opacity 动画，提前设成 from 值
        if (animation.type !== 'text' && animation.parameters.opacity) {
          (target as HTMLElement).style.opacity = '0';
        }

        let split: TextSplitter | null = null;
        if (animation.type === 'text') {
          split = text.split(target, {
            chars: true,
          });
          split?.chars?.forEach(char => {
            (char as HTMLElement).style.opacity = '0';
          });
        }

        timeline.add(
          animation.type === 'text' ? split?.chars || target : target,
          {
            ...animation.parameters,
            delay: stagger(animation.delay || 0),
            onComplete: e => {
              split?.revert();
              utils.cleanInlineStyles(e);
              if (animation.type !== 'text' && animation.parameters.opacity) {
                (target as HTMLElement).style.opacity = '1';
              }
            },
          },
          `<<+=${item.delayTime}`
        );
      }
    });
    timeline.seek(0);

    timeline.play().then(() => {
      console.log('播放完成');
      timeline.cancel();
      timelineRef.current = null;
    });
    timelineRef.current = timeline;
  };

  const removeAllAnimation = () => {
    layers.forEach((layer, i) => {
      editorSDK?.fullSDK.setLink(layer?.elemId, {
        animateQueue2: {
          entrance: [],
        },
      });
    });
    setActiveId('');
  };

  return (
    <>
      <TemplateList>
        {templateList.map((item, index) => (
          <div className='template_item' key={index}>
            <div
              className='preview'
              onMouseEnter={() => {
                timer.current = setTimeout(() => {
                  playAnimation(item);
                }, 200);
              }}
              onMouseLeave={() => {
                clearTimeout(timer.current);
              }}
              onClick={() => {
                setLayoutAnimation(item);
                setActiveId(item.name);
              }}
            >
              <img
                src={activeId === item.name ? item.activePreview : item.preview}
                alt=''
              />
            </div>
            <div className='name'>{item.name}</div>
          </div>
        ))}
      </TemplateList>
      <div className='p-4'>
        <Button
          className='w-full'
          onClick={() => {
            removeAllAnimation();
          }}
        >
          清除所有动画
        </Button>
      </div>
    </>
  );
};

export default AnimationTemplates;
