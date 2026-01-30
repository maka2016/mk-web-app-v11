'use client';
import cls from 'classnames';
import { useEffect, useRef, useState } from 'react';

import MobileHeader from '@/components/DeviceWrapper/mobile/Header';
import {
  cdnApi,
  getAppId,
  getCollectTemplates,
  getStoreCategories,
  getUserTemplates,
} from '@/services';
import { useStore } from '@/store';
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
  const store = useStore();
  const isMobile = store.environment.isMobile;
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
    const gridCols = isMobile
      ? 'grid-cols-3'
      : 'grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8';
    const gap = isMobile ? 'gap-2' : 'gap-4';
    const padding = isMobile ? 'p-2' : 'p-6';

    // 自创模板
    if (activeMenu === 'diy') {
      return (
        <InfiniteScroll
          useWindow={false}
          className={`${padding} grid ${gridCols} ${gap}`}
          loadMore={loadMore}
          hasMore={!finished}
        >
          {list.map((item, index) => (
            <div
              key={index}
              className='rounded aspect-[9/16] overflow-hidden bg-[#f5f5f5]'
            >
              <div className='w-full h-full'>
                <img
                  src={cdnApi(item.thumb)}
                  alt={item.title}
                  className='w-full h-full object-cover'
                />
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
        className={`${padding} grid ${gridCols} ${gap}`}
        loadMore={loadMore}
        hasMore={!finished}
      >
        {list.map((item, index) => (
          <div
            key={index}
            className={cls([
              'rounded aspect-[9/16] overflow-hidden bg-[#f5f5f5] cursor-pointer transition-transform',
              !isMobile && 'hover:scale-105 hover:shadow-lg',
            ])}
            onClick={() => toTemplateDetail(item.template_id)}
          >
            <div className='w-full h-full'>
              <img
                src={cdnApi(item.thumb)}
                alt={item.title}
                className='w-full h-full object-cover'
              />
            </div>
          </div>
        ))}
      </InfiniteScroll>
    );
  };

  return (
    <div className='h-full overflow-y-auto bg-white'>
      {isMobile && <MobileHeader title='模板中心' />}
      {!isMobile && (
        <div className='px-6 py-4 border-b'>
          <h1 className='text-2xl font-semibold text-[#09090b]'>模板中心</h1>
        </div>
      )}

      <div
        className={cls([
          'flex items-center',
          isMobile ? 'gap-2 p-2' : 'gap-3 px-6 py-4',
        ])}
      >
        {menus.map(item => (
          <div
            className={cls([
              isMobile ? 'flex-1 px-3 py-1' : 'px-6 py-2',
              'bg-[#f5f5f5] rounded text-center text-sm font-semibold text-[#09090b] transition-colors',
              activeMenu === item.key && 'bg-[var(--theme-color)] text-white',
              !isMobile && 'hover:bg-[#e5e5e5] cursor-pointer',
              !isMobile &&
                activeMenu === item.key &&
                'hover:bg-[var(--theme-color)]',
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
      <div
        className={cls([
          'flex items-center overflow-x-auto',
          isMobile ? 'gap-6 pt-2 px-4' : 'gap-8 pt-4 px-6',
        ])}
      >
        {category.map(item => (
          <div
            key={item.id}
            className={cls([
              'flex-shrink-0 relative pb-1 text-sm leading-5 text-center text-[#09090b] rounded transition-colors cursor-pointer',
              isMobile ? 'h-6' : 'h-8 text-base',
              categoryId === item.id &&
                'text-[var(--theme-color)] font-semibold pointer-events-none after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[var(--theme-color)]',
              !isMobile &&
                categoryId !== item.id &&
                'hover:text-[var(--theme-color)]',
            ])}
            onClick={() => onChangeCategoryId(item.id)}
          >
            {item.name}
          </div>
        ))}
      </div>

      {/* {!loading && ((activeMenu === 'diy' && folders.length === 0) || activeMenu !== 'diy') && list.length === 0 && <Empty />} */}
      <div className={!isMobile ? 'max-w-7xl mx-auto' : ''}>
        {renderTemplateList()}
        {!loading && finished && list.length === 0 && (
          <div
            className={cls([
              'flex flex-col items-center justify-center',
              isMobile ? 'py-8' : 'py-16',
            ])}
          >
            <img
              src='https://res.maka.im/cdn/editor7/material_empty_tip.png'
              alt=''
              className={
                isMobile ? 'w-[123px] h-[118px]' : 'w-[200px] h-[192px]'
              }
            />
            <span
              className={cls([
                'text-black/60',
                isMobile ? 'text-sm leading-8' : 'text-base leading-10 mt-4',
              ])}
            >
              暂无模板
            </span>
          </div>
        )}
        {loading && (
          <div className='flex justify-center items-center py-8'>
            <Loading />
          </div>
        )}
      </div>
    </div>
  );
};

export default Template;
