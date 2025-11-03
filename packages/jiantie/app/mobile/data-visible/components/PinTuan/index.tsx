'use client';
import Header from '@/components/DeviceWrapper/mobile/Header';
import { request } from '@/services';
import { getWorkData2 } from '@/services/works2';
import { useStore } from '@/store';
import { maskPhoneNumber } from '@/utils';
import { toVipPage } from '@/utils/jiantie';
import APPBridge from '@mk/app-bridge';
import { API, formReceiverServiceApi, getUid } from '@mk/services';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import cls from 'classnames';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroller';
import styles from './index.module.scss';
import Item from './Item';

const PAGE_SIZE = 20;
interface Props {
  worksId: string;
}
// 报名
const PinTuan = (props: Props) => {
  const { worksId } = props;
  const { setVipShow, isVip, permissions } = useStore();
  const [list, setList] = useState<any[]>([]);
  const [formId, setFormId] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [total, setTotal] = useState(0);
  const [collectFields, setCollectFields] = useState(['name', 'phone']);
  const t = useTranslations('DataVisible');
  const [dataColumns, setDataColumns] = useState<any[]>([
    {
      title: '姓名',
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
      title: '选择课程',
      key: 'course',
      dataIndex: 'course',
      width: 120,
    },
    {
      title: '孩子年龄',
      key: 'age',
      dataIndex: 'age',
      width: 60,
    },
    {
      title: '备注',
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
    {
      title: 'ip',
      key: 'ip',
      dataIndex: 'ip',
      width: 110,
    },
  ]);
  const [worksData, setWorksData] = useState<any | null>(null);
  const [uv, setUv] = useState(0);
  const [isMiniP, setIsMiniP] = useState(false);

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
      const layers = getAllLayers(res.work_data);
      // 是否有拼团组件
      const comp = layers.find(item => item.elementRef === 'MkPinTuan');
      if (comp?.attrs?.formRefId) {
        setFormId(comp.attrs.formRefId);
        setCollectFields(comp.attrs.collectFields || ['name', 'phone']);
      }
    } else {
      toast.error('获取作品错误');
    }
  };

  const getWorksOverview = async () => {
    const uid = getUid();
    const res = await request.get(
      `${API('营销助手服务API')}/data/users/${uid}/works/${worksId}/overview`
    );
    setUv(res.data.uv);
  };

  useEffect(() => {
    getLayerData();
    getWorksOverview();
    setIsMiniP(APPBridge.judgeIsInMiniP());
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
    // 非会员
    if (!isVip && list.length >= +permissions.lead_num) {
      setFinished(true);
      return;
    }
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
        if (key === 'phone') {
          if (total - index > +permissions.lead_unmasked_num) {
            data.push(maskPhoneNumber(item[key]));
          } else {
            data.push(item[key] || '-');
          }
        } else if (key === 'submitDate') {
          data.push(dayjs(item[key]).format('YYYY/MM/DD HH:mm:ss'));
        } else {
          data.push(item[key] || '-');
        }
      });
      tableRows.push(data);
    });

    // 构造数据字符，换行需要用\r\n
    let CsvString = tableRows.map(data => data.join(',')).join('\r\n');

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
      <Header title={`报名信息(${total})`} />

      <div className={styles.worksInfo}>
        <div className={styles.cover}>
          <img src={worksData?.cover} alt='' />
        </div>
        <div>
          <div className={styles.title}>{worksData?.title}</div>
          <div className={styles.desc}>报名信息管理</div>
        </div>
      </div>
      <div className={styles.overview}>
        <div className={styles.overviewItem}>
          <p className={styles.overviewLabel}>报名人数</p>
          <p className={styles.overviewNum}>{total}</p>
        </div>
        <div className={styles.line}></div>
        <div className={styles.overviewItem}>
          <p className={styles.overviewLabel}>传播量</p>
          <p
            className={styles.overviewNum}
            style={{
              color: '#008A2E',
            }}
          >
            {uv}
          </p>
        </div>
      </div>
      <div className='py-2 px-3 flex justify-between items-center'>
        <div className='flex items-center gap-1'>
          <Icon name='team' size={16} />
          <span className={styles.listTitle}>报名信息</span>
          <div className={styles.total}>
            <span
              className={cls([
                total / +permissions.lead_num >= 0.9 && styles.warn,
              ])}
            >
              {total}/
              {permissions.lead_num === '999999'
                ? '无限'
                : permissions.lead_num}
            </span>

            <span className='ml-1'>线索额度</span>
          </div>
        </div>
        {!isMiniP && (
          <Button
            size='sm'
            className='h-9 flex items-center gap-1'
            onClick={() => {
              if (permissions.form_export) {
                handleExport();
              } else {
                toVipPage({
                  vipType: 'h5',
                  tab: 'business',
                });
              }
            }}
          >
            <Icon name='xiazai' size={16} />
            <span>导出Excel</span>
          </Button>
        )}
      </div>
      {isVip && !isMiniP && total / +permissions.lead_num >= 0.9 && (
        <div className='px-3'>
          <div className={styles.vipTip}>
            <div className='flex items-center gap-1'>
              <Icon name='crown' color='#EF8D3C' size={16} />
              <span className={styles.text}>
                线索额度即将耗尽，升级会员扩容
              </span>
            </div>
            <div
              className={styles.upgradeVip}
              onClick={() =>
                toVipPage({
                  vipType: 'h5',
                  tab: 'business',
                })
              }
            >
              升级会员
            </div>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {!isVip && !isMiniP && (
          <div className={styles.vipTip}>
            <div className='flex items-center gap-1'>
              <Icon name='crown' color='#EF8D3C' size={16} />
              <span className={styles.text}>升级会员，解锁完整线索信息！</span>
            </div>
            <div
              className={styles.upgradeVip}
              onClick={() =>
                toVipPage({
                  vipType: 'h5',
                  tab: 'business',
                })
              }
            >
              升级会员
            </div>
          </div>
        )}
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          loadMore={loadMore}
          hasMore={!finished}
          className='flex flex-col gap-2'
          useWindow={false}
        >
          {list.map((item, index) => {
            return (
              <Item
                collectFields={collectFields}
                item={item}
                key={index}
                mask={total - index > +permissions.lead_unmasked_num}
                showVipPage={() =>
                  toVipPage({
                    vipType: 'h5',
                    tab: 'business',
                  })
                }
                isMiniProgram={isMiniP}
              />
            );
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

export default PinTuan;
