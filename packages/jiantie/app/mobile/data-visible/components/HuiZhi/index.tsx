'use client';
import Header from '@/components/DeviceWrapper/mobile/Header';
import { getUid } from '@/services';
import { getWorkData2 } from '@/services/works2';
import APPBridge from '@mk/app-bridge';
import { formReceiverServiceApi } from '@mk/services';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import styles from '../dataVisible.module.scss';
import Table from '../Table';

const PAGE_SIZE = 30;
interface Props {
  worksId: string;
}

interface CustomFieldItem {
  id: string;
  label: string;
  options?: string;
  type: string;
  required?: boolean;
}
const BulletScreen = (props: Props) => {
  const { worksId } = props;
  const [list, setList] = useState<any[]>([]);
  const [formId, setFormId] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [total, setTotal] = useState(0);
  const [collectFields, setCollectFields] = useState(['name', 'guestCount']);
  const [dataColumns, setDataColumns] = useState<any[]>([]);
  const t = useTranslations('DataVisible');
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

  const columns = [
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
      title: t('name'),
      key: 'name',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: t('phone'),
      key: 'phone',
      dataIndex: 'phone',
      width: 160,
    },
    {
      title: t('gender'),
      key: 'gender',
      dataIndex: 'gender',
      width: 60,
      render(text: string) {
        return text === 'female' ? t('female') : t('male');
      },
    },
    {
      title: t('guestCount'),
      key: 'guestCount',
      dataIndex: 'guestCount',
      width: 90,
    },
    {
      title: t('remarks'),
      key: 'remarks',
      dataIndex: 'remarks',
      width: 110,
    },
    {
      title: t('submitTime'),
      key: 'submitDate',
      dataIndex: 'submitDate',
      width: 160,
      render(text: string) {
        return text ? dayjs(text).format('YYYY.MM.DD HH:mm:ss') : '-';
      },
    },
  ];

  const getLayerData = async () => {
    const uid = getUid();
    const res = await getWorkData2(worksId);
    if (res?.work_data) {
      const layers = getAllLayers(res.work_data);
      // 是否有回执组件
      const comp = layers.find(item => item.elementRef === 'MkHuiZhi');
      if (comp?.attrs?.formRefId) {
        setFormId(comp.attrs.formRefId);
        setCollectFields(comp.attrs.collectFields || ['name', 'guestCount']);

        // 表头
        const showColumns = columns.filter(
          item => collectFields.includes(item.key) || item.key === 'submitDate'
        );

        comp.attrs.customFields?.forEach((item: CustomFieldItem) => {
          showColumns.push({
            title: item.label,
            key: item.id,
            dataIndex: item.id,
            width: 120,
            render(text: string) {
              return text || '-';
            },
          });
        });

        setDataColumns(showColumns);
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

  // const handleExport = async () => {
  //   const file = await exportSubmitData(formId);
  //   console.log('file', file);

  //   try {
  //     APPBridge.appCall(
  //       {
  //         type: 'MkFileDownload',
  //         jsCbFnName: 'appBridgeOnMKShare',
  //         params: {
  //           fileData: file,
  //           filename: t('receipt'),
  //         },
  //       },
  //       data => {
  //         console.log('MKShare', data);
  //       }
  //     );
  //   } catch (error) {
  //     window.alert(error);
  //   }
  // };

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
            filename: '回执信息',
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
        title={`${t('receipt')}(${total})`}
        rightContent={<span>{t('export')}</span>}
        onRightClick={handleExport}
      />

      <div className='px-4'>
        <Table
          finished={finished}
          loadMore={() => loadMore()}
          loading={loading}
          data={list}
          columns={dataColumns}
        ></Table>
      </div>
    </div>
  );
};

export default BulletScreen;
