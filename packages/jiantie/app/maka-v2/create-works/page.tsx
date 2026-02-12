'use client';

import {
  API,
  cdnApi,
  createWork,
  getEditorInfo,
  getStoreCategories,
  getToken,
  getUid,
  request,
} from '@/services';
import { useStore } from '@/store';
import { Button } from '@workspace/ui/components/button';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Loading from '../template2026/loading';

const defaultThumb =
  'https://img2.maka.im/cdn/webstore7/assets/default_thumb.png';

interface Spec {
  id: number;
  url: string;
  name: string;
  alias: string;
  store_category_id: number;
  parent_alias: string;
  type: string;
  contentId?: string;
  query?: string;
  tag?: {
    extra?: {
      width: number;
      height: number;
      unit: number;
    };
  };
}

interface Category {
  id: number;
  name: string;
  alias: string;
  children: Spec[];
}

const recommendSpecs = ['scfanyeH5', 'sczhangyeH5', 'scshoujihaibao'];

const CreateWorks = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const { setLoginShow, setVipShow } = useStore();
  const getAllCategories = async () => {
    const res = await getStoreCategories();
    const recommend: Category = {
      id: 0,
      alias: '',
      name: '常用',
      children: [],
    };

    // const activitySpec = await getActivitySpecList()

    // const activity = {
    //   id: 1,
    //   alias: "",
    //   name: "活动",
    //   children: activitySpec,
    // }

    const filterCategories = res.data.categories.filter(
      (category: Category) => {
        category.children = category.children.filter((item: Spec) => {
          item.store_category_id = category.id;
          item.parent_alias = category.alias;
          if (recommendSpecs.includes(item.alias)) {
            recommend.children.push(item);
            if (item.alias === 'sczhangyeH5') {
              // const newItem = Object.assign({}, item, { name: "文章主题", query: "&app_mode=flex_editor&themegen", url: 'https://img2.maka.im/cdn/webstore7/assets/preview_wenzhangchangtu.png' })
              // recommend.children.push(newItem)
            }
            return false;
          }
          return true;
        });
        if (category.children.length) {
          return true;
        }

        return false;
      }
    );
    const list = [recommend, ...filterCategories];
    setCategories(list);
  };

  const getActivitySpecList = async () => {
    const res = (await request.get(
      `${API('工具服务')}/works-activity/v1/list/spec`
    )) as any[];
    return res.map(item => {
      return {
        contentId: item.contentId,
        id: item.id,
        type: 'activity',
        name: item.name,
        activityMeta: item.activityMeta,
        url: cdnApi(item.preview),
      };
    });
  };

  useEffect(() => {
    getAllCategories();
    // getActivitySpecList()
  }, []);

  const onCreateWork = async (spec: Spec) => {
    const isLogin = getToken() && getUid();

    if (!isLogin) {
      setLoginShow(true);
      return;
    }

    toast.loading('创建中...');

    // 创建活动
    if (spec.type === 'activity') {
      spec.contentId && onCreateActivity(spec.contentId);
      return;
    }

    const res = await getEditorInfo('blank', `${spec.id}`);

    if (!res.data || !res.data.type) {
      toast.dismiss();
      toast.error((res as any).error || '发生错误~');
      return;
    }

    if (res.data.type !== 'native') {
      //新编辑器
      const data = {
        spec_id: spec.id,
        // category: "3",
        store_category_id: spec.store_category_id,
        come_from: 'create_diy',
        use_mode: 'diy_blank',
        from: 'editor7',
      };
      const res = (await createWork(data)) as any;
      toast.dismiss();

      if (res.data?.works_id) {
        const url_new = `${API('根域名')}/mk-web-store-v7/makapc/editor?id=${res.data.works_id}${
          spec.query || ''
        }&uid=${res.data.uid}&ref_page_id=create&parent_page_type=create`;
        window.open(url_new, '_blank');
      } else {
        toast.error((res as any).error);
      }
    }
  };

  const onCreateActivity = async (contentId: string) => {
    const uid = getUid();
    const res = (await request.post(`${API('工具服务')}/works-activity/v1`, {
      uid,
      from: 'pc',
      contentId,
    })) as any;
    toast.dismiss();

    if (res.activity.works_id) {
      const url_new = `/mk-web-store-v7/makapc/editor?id=${res.activity.works_id}&ref_page_id=create&parent_page_type=create`;
      window.open(url_new, '_blank');
    }
  };

  return (
    <div className='py-6 px-4 pl-10 min-h-screen'>
      {!categories.length && <Loading />}
      {categories.map(category => {
        return (
          <div className='mb-4' key={category.id}>
            <p className='mb-4 font-semibold text-xl leading-7 text-[#01070d]'>
              {category.name}
            </p>
            <div className='flex flex-wrap'>
              {category.children.map(spec => (
                <div
                  key={spec.id + spec.name}
                  className='text-center mr-6 mb-4'
                >
                  <div className='relative cursor-pointer group'>
                    <img
                      src={cdnApi(spec.url || defaultThumb)}
                      width={148}
                      height={148}
                      alt={spec.name}
                      className='w-[148px] h-[148px] object-contain bg-[#f5f5f5] rounded-md'
                    />
                    <div className='absolute top-0 left-0 right-0 bottom-0 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity'>
                      <Button
                        style={{ width: 80 }}
                        size='lg'
                        onClick={() => onCreateWork(spec)}
                      >
                        创建
                      </Button>
                    </div>
                  </div>
                  <p className='mt-2 font-semibold text-sm leading-[22px] text-black'>
                    {spec.name}
                  </p>
                  {spec.tag?.extra && (
                    <p className='text-xs leading-5 text-black/45'>
                      {spec.tag.extra.width}*{spec.tag.extra.height}
                      {spec.tag.extra.unit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreateWorks;
