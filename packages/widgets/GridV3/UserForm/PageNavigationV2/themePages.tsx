import { cdnApi } from '@mk/services';
import { Loading } from '@workspace/ui/components/loading';
import cls from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { themePackV2Manager } from '../../DesignerToolForEditor/ThemeLayoutLibrary/services';
import { MaterialFloor } from '../../DesignerToolForEditor/ThemePackManager/services';
import { useGridContext } from '../../comp/provider';
import { scrollToActiveRow } from '../../shared';
import styles from './index.module.scss';

const ThemePages = ({
  onSelect,
  onClose,
}: {
  onSelect?: (item: any) => void;
  onClose?: () => void;
}) => {
  const {
    setWidgetStateV2,
    widgetStateV2,
    gridProps,
    addRowFromTemplateV2,
    deleteRowBatchV2,
    getActiveRootRow,
    getRowByDepth,
  } = useGridContext();
  const { themePackV2 } = gridProps;
  const [materialTags, setMaterialTags] = useState<MaterialFloor[]>([]);
  const [floorId, setFloorId] = useState('all');
  const [_materialItems, setMaterialItems] = useState<any[]>([]);
  const itemRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const currRootRow = getActiveRootRow();
  // const appid = getAppId();

  const materialItems = _materialItems.filter(item => {
    if (floorId === 'all') {
      return true;
    }
    const nameSplitResult = item.name?.split('-');
    if (nameSplitResult.length === 2) {
      const [cate, display_name] = nameSplitResult;
      return cate === floorId;
    }
    return true;
  });

  const initData = async () => {
    if (themePackV2?.documentId) {
      const tagsSet: MaterialFloor[] = [];
      themePackV2Manager
        .getItems(themePackV2?.documentId)
        .then(res => {
          setMaterialItems(res?.data || []);
          res?.data?.forEach(item => {
            // item.name 的规则如：${cate}-${display_name} 比如：素材-楼层1
            const nameSplitResult = item.name?.split('-');
            if (nameSplitResult.length === 2) {
              const [cate, display_name] = item.name.split('-');
              if (!tagsSet.find(item => item.name === cate)) {
                tagsSet.push({
                  name: cate,
                  documentId: item.documentId,
                  id: 0,
                  desc: '',
                  createdAt: '',
                  updatedAt: '',
                });
              }
            }
          });
          setMaterialTags(tagsSet);
        })
        .finally(() => {
          setReady(true);
          setLoading(false);
        });
    } else {
      setReady(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, [themePackV2?.documentId]);

  if (!ready) {
    return (
      <>
        <Loading />
      </>
    );
  }

  return (
    <div className={styles.templatePages}>
      <div className={styles.tags}>
        <div
          className={cls([styles.tagItem, floorId === 'all' && styles.active])}
          onClick={() => setFloorId('all')}
        >
          全部
        </div>
        {materialTags.map(item => (
          <div
            key={item.documentId}
            className={cls([
              styles.tagItem,
              floorId === item.name && styles.active,
            ])}
            onClick={() => setFloorId(item.name)}
          >
            {item.name}
          </div>
        ))}
      </div>
      {!loading && materialItems.length === 0 && (
        <div className={styles.empty}>
          <img src={cdnApi('/cdn/webstore10/common/empty.png')} alt='' />
          <span>暂无内容</span>
        </div>
      )}
      <div className={styles.scrollList}>
        <div className={styles.list} ref={itemRef}>
          {materialItems?.map(item => {
            return (
              <div
                key={item.documentId}
                className={styles.templatePageItem}
                onClick={() => {
                  if (onSelect) {
                    onSelect(item);
                    return;
                  }
                  const { copiedRowDepth } = addRowFromTemplateV2(
                    item.content,
                    {
                      activeRowDepth: [widgetStateV2?.activeRowDepth?.[0] || 0],
                    }
                  );
                  // onChange();
                  setWidgetStateV2({
                    activeRowDepth: copiedRowDepth,
                    activeCellId: undefined,
                    editingElemId: undefined,
                  });
                  scrollToActiveRow(
                    getRowByDepth(copiedRowDepth || [])?.id || ''
                  );
                  onClose?.();
                }}
              >
                <img src={item.cover_url} alt='' />
                <div
                  className='absolute bottom-0 left-0 right-0 text-center py-1'
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  {item.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemePages;
