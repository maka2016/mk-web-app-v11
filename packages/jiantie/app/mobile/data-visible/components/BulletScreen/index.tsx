'use client';
import Header from '@/components/DeviceWrapper/mobile/Header';
import { exportSubmitData, getToken } from '@/services';
import { getWorkData2 } from '@/services/works2';
import APPBridge from '@mk/app-bridge';
import {
  formEntityServiceApi,
  formReceiverServiceApi,
  getUid,
} from '@mk/services';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { Icon } from '@workspace/ui/components/Icon';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import styles from '../dataVisible.module.scss';
import Empty from '../Empty';

const PAGE_SIZE = 30;
interface Props {
  worksId: string;
}
const BulletScreen = (props: Props) => {
  const { worksId } = props;
  const [list, setList] = useState<any[]>([]);
  const [formId, setFormId] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [total, setTotal] = useState(0);
  const t = useTranslations('DataVisible');

  const getAllForm = async () => {
    const res = await formEntityServiceApi.findByWorksId(worksId, {
      params: {
        limit: 200,
      },
    });

    const form = res.data.list.find(
      (item: any) => item.type === 'MkBulletScreen_v2'
    );
    if (form) {
      setFormId(form.id);
    }
  };

  const deepLayers = (items: LayerElemItem[], cbk: any, parentId?: string) => {
    if (!items?.length) {
      return;
    }
    for (const item of items) {
      cbk(item, parentId);
      const { body } = item;
      if (body instanceof Array && body.length > 0) {
        deepLayers(body, cbk, item.elemId);
      }
    }
  };

  const getAllLayers = (data: IWorksData): LayerElemItem[] => {
    const { pages } = data.canvasData.content;
    const layersItemArray: any = [];

    for (const pageKey in pages) {
      deepLayers(pages[pageKey].layers, (item: LayerElemItem) => {
        layersItemArray.push(item);
      });
    }
    return layersItemArray;
  };

  const getLayerData = async () => {
    const uid = getUid();
    const res = await getWorkData2(worksId);
    if (res?.work_data) {
      const layers = getAllLayers(res.work_data);
      // 是否有回执组件
      const comp = layers.find(item => item.elementRef === 'MkBulletScreen_v2');
      if (comp?.attrs?.formRefId) {
        setFormId(comp.attrs.formRefId);
      }
    }
  };

  useEffect(() => {
    // getAllForm()
    getLayerData();
  }, []);

  const onDeleteItem = (id: string[]) => {
    formReceiverServiceApi
      .deleteSubmitData(
        formId,
        {
          commitIds: id,
        },
        {
          headers: {
            uid: getUid(),
            token: getToken(),
          },
        }
      )
      .then(res => {
        setPage(0);
        setList([]);
        setFinished(false);
        getBulletScreen();
      });
  };

  const getBulletScreen = async () => {
    setLoading(true);
    const res = await formReceiverServiceApi.getFormList(formId, {
      params: {
        page,
        limit: PAGE_SIZE,
      },
    });
    setLoading(false);
    if (res.data) {
      const _list: any[] =
        page === 0 ? res.data.rows : list.concat(res.data.rows);
      setList(_list);
      setFinished(_list.length >= res.data.total);
      setTotal(res.data.total);
    }
  };

  useEffect(() => {
    if (formId) {
      getBulletScreen();
    }
  }, [formId, page]);

  const loadMore = () => {
    if (loading || finished) {
      return;
    }
    setPage(page + 1);
  };

  const handleExport = async () => {
    const file = await exportSubmitData(formId);

    try {
      APPBridge.appCall(
        {
          type: 'MkFileDownload',
          jsCbFnName: 'appBridgeOnMKShare',
          params: {
            fileData: file,
            filename: t('comment'),
          },
        },
        data => {
          console.log('MKShare', data);
        }
      );
    } catch (error) {
      window.alert(error);
    }
  };

  return (
    <div className={styles.overview}>
      <Header
        title={`${t('comment')}(${total})`}
        rightContent={<span>{t('export')}</span>}
        onRightClick={handleExport}
      />
      {list.length === 0 ? (
        <Empty title={t('commentEmpty')} />
      ) : (
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          loadMore={loadMore}
          hasMore={!finished}
          className={styles.bulletScreen}
        >
          {list.map((item, index) => (
            <div key={index} className={styles.bulletScreenItem}>
              {/* <div className={styles.headImg}>
          <img src={item.headImg} alt="" />
        </div> */}
              <div className={styles.left}>
                <p className={styles.name}>{item.nickname}</p>
                <p className={styles.content}>{item.content}</p>
                <p className={styles.time}>
                  {dayjs(item.submitDate).format('YYYY-MM-DD HH:mm:ss')}
                </p>
              </div>
              <Icon
                name='delete-g8c551hn'
                className='mt-1'
                size={16}
                onClick={() => onDeleteItem([item.id])}
              ></Icon>
            </div>
          ))}
        </InfiniteScroll>
      )}
    </div>
  );
};

export default BulletScreen;
