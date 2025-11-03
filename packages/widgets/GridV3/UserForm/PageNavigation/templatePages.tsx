import { API, request } from '@mk/services';
import { useEffect, useRef, useState } from 'react';
import { Item } from './templateItem';
import { IPositionLink, LayerElemItem } from '@mk/works-store/types';
import styles from './index.module.scss';
import axios from 'axios';
import { deepClone, random } from '@mk/utils';
import { Loading } from '@workspace/ui/components/loading';

interface Props {
  templateId: string;
  onChange: (data: any) => void;
}

const TemplatePages = (props: Props) => {
  const { templateId } = props;
  const [activeRowIndex, setActiveRowIdx] = useState(0);
  const [gridItem, setGridItem] = useState<LayerElemItem>();
  const [worksStore, setWorksStore] = useState<any>(null);
  const [itemWidth, setItemWidth] = useState(0);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (itemRef.current) {
      setItemWidth((itemRef.current.offsetWidth - 40) / 3);
    }
  }, []);

  const getTemplateDetail2 = () => {
    return axios
      .get(`${API('工具服务')}/works-template/v7/detail/${templateId}`)
      .then(res => {
        return res.data;
      });
  };

  const onChange = (index: number) => {
    console.log('index', index);
    if (!gridItem) return;
    const editorSDK = worksStore?.getEditorSDK(gridItem.elemId);

    const cells = gridItem.attrs.cellsMap;
    const nextCells = deepClone([...cells]);
    const layers: LayerElemItem[] = [];
    const positionLink: Record<string, IPositionLink> = {};
    console.log('nextCells[index]');
    const row = nextCells[index];
    row.cells.forEach((cell: any) => {
      cell.childrenIds?.forEach((elemId: string) => {
        const layer = editorSDK?.getLayer(elemId);
        const link = editorSDK?.getLink(elemId);
        if (layer) {
          positionLink[layer.elemId] = link;
          layers.push(layer);
        }
      });
    });

    props.onChange({
      row,
      elemComps: layers,
      positionLink,
    });
  };

  return (
    <div className={styles.templatePages}>
      {!gridItem?.attrs?.cellsMap?.length && <Loading />}
      <div className={styles.list} ref={itemRef}>
        {gridItem?.attrs?.cellsMap?.map((item: any, index: number) => (
          <div
            key={index}
            className={styles.templatePageItem}
            onClick={e => {
              onChange(index);
              console.log('Template page item clicked', index);
            }}
          >
            <Item
              worksStore={worksStore}
              key={index}
              elemId={gridItem.elemId}
              contentProps={{
                ...gridItem?.attrs,
                cellsMap: [item],
              }}
              itemWidth={itemWidth}
              index={index}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplatePages;
