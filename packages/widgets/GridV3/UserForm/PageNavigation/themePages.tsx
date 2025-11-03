import { API, cdnApi, request } from '@mk/services';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import { getAppId } from '@mk/services';
import cls from 'classnames';
import TemplatePages from './templatePages';
import { Loading } from '@workspace/ui/components/loading';
import {
  getThemePackItemsByTemplateId,
  MaterialFloor,
} from '../../DesignerToolForEditor/ThemePackManager/services';

interface Props {
  templateId?: string;
  onChange: (value: { content: any; name: string }) => void;
}

const ThemePages = (props: Props) => {
  const { templateId, onChange } = props;

  const [materialTags, setMaterialTags] = useState<MaterialFloor[]>([]);
  const [floorId, setFloorId] = useState('all');
  const [themePackId, setThemePackId] = useState('');
  const [materialItems, setMaterialItems] = useState<any[]>([]);
  const itemRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  // const appid = getAppId();

  const initData = async () => {
    if (templateId) {
      const tagsSet: MaterialFloor[] = [];
      getThemePackItemsByTemplateId(templateId).then(res => {
        console.log('res', res);
        setThemePackId(res?.documentId);
        setMaterialItems(res?.material_items || []);
        res?.material_items?.forEach(item => {
          item.material_tags.forEach(tag => {
            if (!tagsSet.find(item => item.name === tag.name)) {
              tagsSet.push({
                name: tag.name,
                documentId: tag.documentId,
                id: 0,
                desc: '',
                createdAt: '',
                updatedAt: '',
              });
            }
          });
        });
        setMaterialTags(tagsSet);
        setReady(true);
      });
      // getThemePackFloorData(appid).then((res) => {
      //   setMaterialTags(res);
      // });
    }
  };

  useEffect(() => {
    initData();
  }, [templateId]);

  if (!ready) {
    return (
      <>
        <Loading />
      </>
    );
  }

  if (!themePackId) {
    return <TemplatePages templateId={templateId || ''} onChange={onChange} />;
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
              floorId === item.documentId && styles.active,
            ])}
            onClick={() => setFloorId(item.documentId)}
          >
            {item.name}
          </div>
        ))}
      </div>
      {themePackId && !loading && materialItems.length === 0 && (
        <div className={styles.empty}>
          <img src={cdnApi('/cdn/webstore10/common/empty.png')} alt='' />
          <span>暂无内容</span>
        </div>
      )}
      <div className={styles.scrollList}>
        <div className={styles.list} ref={itemRef}>
          {materialItems?.map(item => {
            const isActive =
              floorId === 'all' ||
              item.material_tags.some(
                (tag: { documentId: string }) => tag.documentId === floorId
              );
            if (!isActive) {
              return null;
            }
            return (
              <div
                key={item.documentId}
                className={styles.templatePageItem}
                onClick={() => onChange(item)}
              >
                {<img src={item.cover_url} alt='' />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemePages;
