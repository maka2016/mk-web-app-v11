'use client';
import { cn } from '@workspace/ui/lib/utils';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import {
  cdnApi,
  getAppId,
  getCollectTemplates,
  getStoreCategories,
  getUserTemplates,
} from '@/services';
import APPBridge from '@/store/app-bridge';
import { Loading } from '@workspace/ui/components/loading';
import { useRouter } from 'next/navigation';
import InfiniteScroll from 'react-infinite-scroller';

const menus = [
  {
    key: 'collect',
    label: '我的收藏',
  },
  {
    key: 'bought',
    label: '已购模板',
  },
];

const PAGE_SIZE = 30;

interface Category {
  id: number;
  name: string;
  alias: string;
}

const Template = () => {
  const [activeMenu, setActiveMenu] = useState('collect');
  const [page, setPage] = useState(0);
  const [list, setList] = useState<any[]>([]);
  const [category, setCategory] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const loadingRef = useRef<boolean>(false);
  const router = useRouter();

  /** 收藏模板 */
  const getCollectTemplateList = async (loading = true) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const res = await getCollectTemplates({
      page,
      page_size: PAGE_SIZE,
      store_category_id: categoryId?.toString(),
    });

    if (res.data) {
      const templates = res.data.templates.map((item: any) => {
        return {
          template_id: item.template_id,
          title: item.title,
          thumb: item.avatar,
        };
      });
      setList(page === 0 ? templates : [...list, ...templates]);
      setFinished(res.data.templates.length < PAGE_SIZE);
    } else {
      setFinished(true);
    }
    setLoading(false);
    loadingRef.current = false;
  };

  /** 已购模板 */
  const getBoughtTemplates = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const res = await getUserTemplates({
      page,
      page_size: PAGE_SIZE,
      store_category_id: categoryId,
      is_vip_free: '',
    });

    if (res.data) {
      const templates = res.data.map((item: any) => {
        return {
          template_id: item.template_id,
          title: item.title,
          thumb: item.avatar,
        };
      });
      setList(page === 0 ? templates : [...list, ...templates]);
      setFinished(res.data.length < PAGE_SIZE);
    } else {
      setFinished(true);
    }
    setLoading(false);
    loadingRef.current = false;
  };

  /** 规格 */
  const getAllCategories = async () => {
    const res = await getStoreCategories();
    if (res?.data?.categories) {
      res.data.categories.unshift({
        name: '全部',
        id: 0,
      });

      setCategory(res.data.categories);
    }
  };

  useEffect(() => {
    getAllCategories();
  }, []);

  useEffect(() => {
    if (activeMenu === 'collect') {
      getCollectTemplateList();
    } else if (activeMenu === 'bought') {
      getBoughtTemplates();
    }
  }, [activeMenu, page, categoryId]);

  const onChangeMenu = (key: string) => {
    setCategoryId(0);
    setPage(0);
    setLoading(false);
    setFinished(false);
    loadingRef.current = false;
    setList([]);
    setActiveMenu(key);
  };

  const toTemplateDetail = (template_id: string) => {
    if (APPBridge.judgeIsInApp()) {
      APPBridge.navToPage({
        url: `${location.origin}/maka/mobile/template?id=${template_id}&is_full_screen=1`,
        type: 'URL',
      });
    } else {
      router.push(
        `/maka/mobile/template?id=${template_id}&appid=${getAppId()}`
      );
    }
  };

  const onChangeCategoryId = (id: number) => {
    setCategoryId(id);
    setPage(0);
    setFinished(false);
    setLoading(false);
    loadingRef.current = false;
    setList([]);
  };

  const loadMore = () => {
    if (loading || finished || loadingRef.current) {
      return;
    }
    setLoading(true);
    setPage(page + 1);
  };

  const renderTemplateList = () => {
    // 自创模板
    if (activeMenu === 'diy') {
      return (
        <InfiniteScroll
          useWindow={false}
          className={styles.templateList}
          loadMore={loadMore}
          hasMore={!finished}
        >
          {list.map((item, index) => (
            <div key={index} className={styles.template} style={{}}>
              <div className={styles.thumb}>
                <img src={cdnApi(item.thumb)} alt={item.title} />
              </div>
            </div>
          ))}
        </InfiniteScroll>
      );
    }

    // 收藏模板/已购模板
    return (
      <InfiniteScroll
        useWindow={false}
        initialLoad={false}
        className={styles.templateList}
        loadMore={loadMore}
        hasMore={!finished}
      >
        {list.map((item, index) => (
          <div
            key={index}
            className={styles.template}
            onClick={() => toTemplateDetail(item.template_id)}
          >
            <div className={styles.thumb}>
              <img src={cdnApi(item.thumb)} alt={item.title} />
            </div>
          </div>
        ))}
      </InfiniteScroll>
    );
  };

  return (
    <div className={styles.container}>
      <MobileHeader title='模板中心' />

      <div className={styles.menus}>
        {menus.map(item => (
          <div
            className={cn([
              styles.menuItem,
              activeMenu === item.key && styles.active,
            ])}
            key={item.key}
            onClick={() => {
              onChangeMenu(item.key);
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
      <div className={styles.tabs}>
        {category.map(item => (
          <div
            key={item.id}
            className={cn([
              styles.tabItem,
              categoryId === item.id && styles.active,
            ])}
            onClick={() => onChangeCategoryId(item.id)}
          >
            {item.name}
          </div>
        ))}
      </div>

      {/* {!loading && ((activeMenu === 'diy' && folders.length === 0) || activeMenu !== 'diy') && list.length === 0 && <Empty />} */}
      {renderTemplateList()}
      {!loading && finished && list.length === 0 && (
        <div className={styles.worksEmpty}>
          <img
            src='https://res.maka.im/cdn/editor7/material_empty_tip.png'
            alt=''
          />
          <span>暂无模板</span>
        </div>
      )}
      {loading && (
        <div className='flex justify-center items-center'>
          <Loading />
        </div>
      )}
    </div>
  );
};

export default Template;
