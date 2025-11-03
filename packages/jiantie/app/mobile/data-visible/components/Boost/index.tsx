'use client';
import Header from '@/components/DeviceWrapper/mobile/Header';
import { getUid, request, worksServerV2 } from '@/services';
import { getWorkData2 } from '@/services/works2';
import { useStore } from '@/store';
import { toVipPage } from '@/utils/jiantie';
import APPBridge from '@mk/app-bridge';
import { API } from '@mk/services';
import { IWorksData, LayerElemItem } from '@mk/works-store/types';
import { Button } from '@workspace/ui/components/button';
import { Icon } from '@workspace/ui/components/Icon';
import { Loading } from '@workspace/ui/components/loading';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import cls from 'classnames';
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

const selectedOptions = [
  {
    label: '最新发起',
    value: 'desc',
  },
  {
    label: '最早发起',
    value: 'asc',
  },
];

const statusOptions = [
  {
    label: '未确认',
    value: 0,
  },
  {
    label: '已添加',
    value: 1,
  },
  {
    label: '已确认',
    value: 2,
  },
  {
    label: '已取消',
    value: 3,
  },
];

const subBoostActivityStatus: any = {
  0: {
    text: '未确认',
    style: 'pendding',
  },
  1: {
    text: '已添加',
    style: 'added',
  },
  2: {
    text: '已确认',
    style: 'confirmed',
  },
  3: {
    text: '已取消',
    style: 'canceled',
  },
};
const MkBaoMingV2 = (props: Props) => {
  const { worksId } = props;
  const [list, setList] = useState<any[]>([]);
  const [boostActivityId, setBoostActivityId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const t = useTranslations('DataVisible');
  const [worksData, setWorksData] = useState<any | null>(null);
  const [uv, setUv] = useState(0);
  const [order, setOrder] = useState('desc');
  const [status, setStatus] = useState('');
  const [isMiniP, setIsMiniP] = useState(false);
  const { isVip, setVipShow, permissions } = useStore();

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
      // 是否有回执组件
      const comp = layers.find(item => item.elementRef === 'MkPinTuan');
      if (comp?.attrs?.boostActivityId) {
        setBoostActivityId(comp.attrs.boostActivityId);
      }
    }
  };

  const getWorksOverview = async () => {
    const uid = getUid();
    const res = await request.get(
      `${API('营销助手服务API')}/data/users/${uid}/works/${worksId}/overview`
    );
    if (res?.data) {
      setUv(res.data.uv);
    }
  };

  useEffect(() => {
    getLayerData();
    getWorksOverview();
    setIsMiniP(APPBridge.judgeIsInMiniP());
  }, []);

  const getBoostActivityData = async () => {
    const res: any = await request.get(
      `${worksServerV2()}/boost-activity/${boostActivityId}/sub-activities`,
      {
        params: {
          page,
          pageSize: PAGE_SIZE,
          order,
          status,
        },
      }
    );
    if (res.list) {
      setList(page === 1 ? res?.list : list.concat(res.list));
      setLoading(false);
      setFinished(res.list.length < PAGE_SIZE);
      setTotal(res.total);
      setTotalParticipants(res.totalParticipants);
    } else {
      setLoading(false);
      setFinished(true);
    }
  };

  useEffect(() => {
    if (boostActivityId) {
      getBoostActivityData();
    }
  }, [boostActivityId, page, order, status]);

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
    if (!isVip) {
      toVipPage({
        vipType: 'h5',
        tab: 'business',
      });
      return;
    }
    const thead: string[] = [];
    const theadKey: string[] = [];
    const dataColumns = [
      {
        title: '姓名',
        key: 'nickname',
      },
      {
        title: '手机号',
        key: 'phone',
      },
      {
        title: '开始时间',
        key: 'startTime',
      },
      {
        title: '助力人数',
        key: 'score',
      },
      {
        title: '状态',
        key: 'status',
      },
    ];
    dataColumns.forEach(item => {
      thead.push(item.title);
      theadKey.push(item.key);
    });

    const tableRows: string[][] = [thead];

    list.forEach((item, index) => {
      const data: string[] = [];
      theadKey.forEach(key => {
        if (key === 'status') {
          data.push(subBoostActivityStatus[item[key]].text);
        } else if (key === 'startTime') {
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
      <Header title={`集赞数据(${total})`} />

      <div className={styles.worksInfo}>
        <div className={styles.cover}>
          <img src={worksData?.cover} alt='' />
        </div>
        <div className='flex-1 overflow-hidden'>
          <div className={styles.title}>{worksData?.title}</div>
          <div className={styles.desc}>助力信息总览</div>
        </div>
      </div>
      <div className={styles.overview}>
        <div className={styles.overviewItem}>
          <p className={styles.overviewLabel}>发起人数</p>
          <p className={styles.overviewNum}>{total}</p>
        </div>
        <div className={styles.line}></div>
        <div className={styles.overviewItem}>
          <p className={styles.overviewLabel}>总参与人数</p>
          <p
            className={styles.overviewNum}
            style={{
              color: '#0090FF',
            }}
          >
            {totalParticipants}
          </p>
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
      <div className='py-2 px-3'>
        <div className='flex items-center gap-1 mb-2'>
          <Icon name='team' size={16} />
          <span className={styles.listTitle}>发起人线索</span>
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
        {isVip && total / +permissions.lead_num >= 0.9 && (
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
        )}
        <div className='flex items-center gap-2'>
          <Select
            value={order}
            onValueChange={val => {
              setOrder(val);
              setPage(1);
              setFinished(false);
            }}
          >
            <SelectTrigger className='flex-1 h-9'>
              <SelectValue placeholder='选择文件格式' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {selectedOptions.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={val => {
              setStatus(val);
              setPage(1);
              setFinished(false);
            }}
          >
            <SelectTrigger className='flex-1 h-9'>
              <SelectValue placeholder='选择状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statusOptions.map(item => (
                  <SelectItem key={item.value} value={`${item.value}`}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {!isMiniP && (
            <Button
              size='sm'
              className='h-9'
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
              导出Excel
            </Button>
          )}
        </div>
      </div>

      <div className={styles.list}>
        {!isVip && (
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
                item={item}
                key={index}
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

export default MkBaoMingV2;
