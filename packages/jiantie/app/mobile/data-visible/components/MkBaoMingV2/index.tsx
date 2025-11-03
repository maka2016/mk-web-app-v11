'use client';
import Header from '@/components/DeviceWrapper/mobile/Header';
import { getWorkData2 } from '@/services/works2';
import APPBridge from '@mk/app-bridge';
import { formEntityServiceApi, formReceiverServiceApi } from '@mk/services';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { Loading } from '@workspace/ui/components/loading';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import styles from './index.module.scss';
import Item from './Item';

const PAGE_SIZE = 30;
interface Props {
  worksId: string;
}
const MkBaoMingV2 = (props: Props) => {
  const { worksId } = props;
  const [list, setList] = useState<any[]>([]);
  const [formId, setFormId] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [total, setTotal] = useState(0);
  const [collectFields, setCollectFields] = useState(['name', 'phone']);
  const t = useTranslations('DataVisible');
  const [dataColumns, setDataColumns] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [worksData, setWorksData] = useState<any | null>(null);

  const getAllForm = async () => {
    const res = await formEntityServiceApi.findByWorksId(worksId, {
      params: {
        limit: 200,
      },
    });

    const form = res.data.list.find((item: any) => item.type === 'MkBaoMingV2');
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
    const res = await getWorkData2(worksId);
    if (res?.work_data) {
      setWorksData(res.detail);
      const layers = getAllLayers(res.work_data as IWorksData);
      // 是否有回执组件
      const comp = layers.find(item => item.elementRef === 'MkBaoMingV2');
      if (comp?.attrs?.formRefId) {
        setFormId(comp.attrs.formRefId);
        setCollectFields(comp.attrs.collectFields || ['name', 'phone']);
        setCustomFields(comp.attrs.customFields || []);
        const columns: any = [
          // {
          //   title: t('grouping'),
          //   key: "isAttend",
          //   dataIndex: "isAttend",
          //   width: 80,
          //   render(text: string) {
          //     return text ? t('attending') : t('notAttending')
          //   }
          // },
          {
            title: '参会姓名',
            key: 'name',
            dataIndex: 'name',
            width: 100,
          },
          {
            title: '联系电话',
            key: 'phone',
            dataIndex: 'phone',
            width: 120,
          },
          {
            title: '所在单位',
            key: 'oragnization',
            dataIndex: 'oragnization',
            width: 60,
          },
          {
            title: '职务职位',
            key: 'position',
            dataIndex: 'position',
            width: 60,
          },
          {
            title: '备注',
            key: 'remarks',
            dataIndex: 'remarks',
            width: 110,
          },
        ];
        const col: any[] = comp.attrs.customFields.map((item: any) => {
          return {
            title: item.label,
            key: item.id,
            dataIndex: item.id,
            width: 100,
          };
        });

        setDataColumns([
          ...columns,
          ...col,
          {
            title: t('submitTime'),
            key: 'submitDate',
            dataIndex: 'submitDate',
            width: 160,
            render(text: string) {
              return text ? dayjs(text).format('YYYY.MM.DD HH:mm:ss') : '-';
            },
          },
          {
            title: 'ip',
            key: 'ip',
            dataIndex: 'ip',
            width: 110,
          },
        ]);
      }
    }
  };

  useEffect(() => {
    // getAllForm()
    getLayerData();
  }, []);

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
    const thead: string[] = [];
    const theadKey: string[] = [];
    dataColumns.forEach(item => {
      thead.push(item.title);
      theadKey.push(item.key);
    });

    const tableRows: string[][] = [thead];

    list.forEach((item, index) => {
      const data: string[] = [];
      theadKey.forEach(key => {
        if (key === 'submitDate') {
          data.push(dayjs(item[key]).format('YYYY/MM/DD HH:mm:ss'));
        } else {
          data.push(item[key] || '-');
        }
      });
      tableRows.push(data);
    });

    // 构造数据字符，换行需要用\r\n
    let CsvString = tableRows.map(data => data.join(',')).join('\r\n');
    // 加上 CSV 文件头标识
    // CsvString =
    //   "data:application/vnd.ms-excel;charset=utf-8,\uFEFF" +
    //   encodeURIComponent(CsvString);
    // const file = await exportSubmitData(formId)

    try {
      APPBridge.appCall(
        {
          type: 'MkFileDownload',
          jsCbFnName: 'appBridgeOnMKShare',
          params: {
            fileData: CsvString,
            filename: '报名信息',
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
    <div className={styles.container}>
      <Header
        title={`报名信息(${total})`}
        rightContent={<span>{t('export')}</span>}
        onRightClick={handleExport}
      />

      <div className={styles.worksInfo}>
        <div className={styles.cover}>
          <img src={worksData?.cover} alt='' />
        </div>
        <div>
          <div className={styles.title}>{worksData?.title}</div>
          <div className={styles.desc}>报名信息管理</div>
        </div>
      </div>
      <div className={styles.list}>
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          loadMore={loadMore}
          hasMore={!finished}
          className='flex flex-col gap-2'
          useWindow={false}
        >
          {list.map((item, index) => {
            return <Item customFields={customFields} item={item} key={index} />;
          })}
        </InfiniteScroll>
        {loading && (
          <div className='flex items-center justify-center p-4'>
            <Loading />
          </div>
        )}
      </div>
    </div>
  );
};

export default MkBaoMingV2;
