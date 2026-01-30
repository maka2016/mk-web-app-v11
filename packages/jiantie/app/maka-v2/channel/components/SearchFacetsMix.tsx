import { BehaviorBox } from '@/components/BehaviorTracker';
import { Icon } from '@workspace/ui/components/Icon';
import cls from 'classnames';
import { Clock } from 'lucide-react';
import { useState } from 'react';

export enum OrderType {
  sv = 'sv',
  times = 'time',
  undefined = '',
}

export interface filter {
  industry_tag?: string;
  style_tag?: string;
  category?: string;
  scene_tag?: string;
  spec?: string;
  color_tag?: string;
  ex_category?: string;
}

export interface Facet {
  id: string;
  name: string;
  val: string;
}

export interface Facets {
  category: Facet[];
  spec: Facet[];
  style_tag: Facet[];
  color_tag: Facet[];
}

export interface SearchParamsType {
  filter?: filter;
  orderBy?: OrderType;
}

interface Props {
  track?: {
    page_id?: string;
    page_type?: string;
    page_inst_id?: string;
    parent_page_type?: string;
  };
  searchParams: SearchParamsType;
  facets: Facets;
  setSearchParams: (val: any) => void;
}

const filterType = [
  {
    name: '品类',
    key: 'spec',
  },
  {
    name: '更多',
    key: 'more',
  },
];

const SearchFacetsMix = (props: Props) => {
  const { searchParams, facets, setSearchParams, track = {} } = props;
  const [active, setActive] = useState('');

  const onChangeFilter = (value: Record<string, string>) => {
    const params = {
      ...searchParams,
      filter: Object.assign({}, searchParams.filter, value),
    };
    setSearchParams(params);
    setActive('');
  };

  return (
    <div className='pb-2 relative bg-white'>
      <div className='flex items-center justify-start py-1'>
        {/* 左侧：slogan */}
        <div className='flex items-center gap-2 shrink-0'>
          <Clock className='w-4 h-4' style={{ color: '#475569' }} />
          <div className='flex flex-col'>
            <span
              className='text-sm font-semibold leading-tight'
              style={{ color: '#475569' }}
            >
              往期经典
            </span>
            <span
              className='text-xs leading-tight pt-0.5'
              style={{ color: '#94a3b8' }}
            >
              自由画布 | 灵活布局
            </span>
          </div>
        </div>

        {/* 右侧：筛选按钮 */}
        <div className='flex items-center pl-12'>
          {filterType.map((item, index) => (
            <div
              key={index}
              className={cls([
                'flex items-center text-[#01070d33] text-sm font-normal leading-[22px] mr-4',
                active === item.key && 'text-[var(--theme-color)]',
              ])}
              onClick={() => {
                if (active === item.key) {
                  setActive('');
                } else {
                  setActive(item.key);
                }
              }}
            >
              <span
                className={cls([
                  'text-[rgba(1,7,13,0.8)] mr-1',
                  active === item.key && 'text-[var(--theme-color)]',
                ])}
              >
                {item.name}
              </span>
              <Icon
                name={active === item.key ? 'arrow-up' : 'arrow-down'}
                size={12}
              />
            </div>
          ))}
        </div>
      </div>
      {active && (
        <div className='absolute top-[99%] left-0 right-0 pt-1 bg-white z-[9] overflow-hidden overscroll-none'>
          {active === 'spec' && (
            <div className='flex flex-wrap max-h-[40vh] overflow-y-auto overscroll-contain px-4'>
              <BehaviorBox
                behavior={{
                  object_type: 'cate_filter_btn',
                  object_id: '全部',
                  ...track,
                }}
                className={cls([
                  'w-[calc(25%-9px)] shrink-0 h-[34px] mr-3 mb-2 inline-block rounded bg-[#fafafa] text-[rgba(0,0,0,0.88)] text-sm font-normal leading-[34px] text-center whitespace-nowrap',
                  !searchParams.filter?.spec &&
                    'text-[#1a87ff] font-semibold bg-[#e6f4ff]',
                ])}
                onClick={() =>
                  onChangeFilter({
                    spec: '',
                  })
                }
              >
                全部
              </BehaviorBox>
              {facets.spec?.map((item, idx) => (
                <BehaviorBox
                  behavior={{
                    object_type: 'cate_filter_btn',
                    object_id: item.name,
                    ...track,
                  }}
                  key={item.id}
                  className={cls([
                    'w-[calc(25%-9px)] shrink-0 h-[34px] mb-2 inline-block rounded bg-[#fafafa] text-[rgba(0,0,0,0.88)] text-sm font-normal leading-[34px] text-center whitespace-nowrap',
                    idx % 4 === 3 ? 'mr-0' : 'mr-3',
                    item.id === searchParams.filter?.spec &&
                      'text-[#1a87ff] font-semibold bg-[#e6f4ff]',
                  ])}
                  onClick={() =>
                    onChangeFilter({
                      spec: item.id,
                    })
                  }
                >
                  {item.name}
                </BehaviorBox>
              ))}
            </div>
          )}
          {active === 'more' && (
            <div>
              <p className='text-black text-sm font-semibold leading-[22px] mb-3 px-4'>
                颜色
              </p>
              <div
                className='flex flex-wrap max-h-[40vh] overflow-y-auto overscroll-contain px-4'
                style={{ marginRight: -12 }}
              >
                <BehaviorBox
                  behavior={{
                    object_type: 'color_filter_btn',
                    object_id: '全部',
                    ...track,
                  }}
                  className='relative w-8 h-8 border border-[rgba(0,0,0,0.06)] mr-3 mb-3 rounded-[2px]'
                  onClick={() =>
                    onChangeFilter({
                      color_tag: '',
                    })
                  }
                >
                  <img
                    src='https://img2.maka.im/cdn/webstore7/assets/icon_color.png'
                    alt=''
                  />
                  {!searchParams.filter?.color_tag && (
                    <div className='absolute left-0 right-0 bottom-0 top-0 flex items-center justify-center text-white'>
                      <Icon name='colorCheck' size={16} />
                    </div>
                  )}
                </BehaviorBox>
                {facets.color_tag?.map(item => (
                  <BehaviorBox
                    behavior={{
                      object_type: 'color_filter_btn',
                      object_id: item.name,
                      ...track,
                    }}
                    key={item.id}
                    className={cls([
                      'relative w-8 h-8 border border-[rgba(0,0,0,0.06)] mr-3 mb-3 rounded-[2px]',
                      item.id === searchParams.filter?.color_tag &&
                        'border-[var(--theme-color)]',
                    ])}
                    style={{ backgroundColor: item.val }}
                    onClick={() =>
                      onChangeFilter({
                        color_tag: item.id,
                      })
                    }
                  >
                    {searchParams.filter?.color_tag === item.id && (
                      <div className='absolute left-0 right-0 bottom-0 top-0 flex items-center justify-center text-white'>
                        <Icon name='colorCheck' size={16} />
                      </div>
                    )}
                  </BehaviorBox>
                ))}
              </div>
              <p className='text-black text-sm font-semibold leading-[22px] mb-3 px-4'>
                风格
              </p>
              <div className='flex flex-wrap max-h-[40vh] overflow-y-auto overscroll-contain px-4'>
                <BehaviorBox
                  behavior={{
                    object_type: 'style_filter_btn',
                    object_id: '全部',
                    ...track,
                  }}
                  className={cls([
                    'w-[calc(25%-9px)] shrink-0 h-[34px] mr-3 mb-2 inline-block rounded bg-[#fafafa] text-[rgba(0,0,0,0.88)] text-sm font-normal leading-[34px] text-center whitespace-nowrap',
                    !searchParams.filter?.style_tag &&
                      'text-[#1a87ff] font-semibold bg-[#e6f4ff]',
                  ])}
                  onClick={() =>
                    onChangeFilter({
                      style_tag: '',
                    })
                  }
                >
                  全部
                </BehaviorBox>
                {facets.style_tag?.map((item, idx) => (
                  <BehaviorBox
                    behavior={{
                      object_type: 'style_filter_btn',
                      object_id: item.name,
                      ...track,
                    }}
                    key={item.id}
                    className={cls([
                      'w-[calc(25%-9px)] shrink-0 h-[34px] mb-2 inline-block rounded bg-[#fafafa] text-[rgba(0,0,0,0.88)] text-sm font-normal leading-[34px] text-center whitespace-nowrap',
                      idx % 4 === 3 ? 'mr-0' : 'mr-3',
                      item.id === searchParams.filter?.style_tag &&
                        'text-[#1a87ff] font-semibold bg-[#e6f4ff]',
                    ])}
                    onClick={() =>
                      onChangeFilter({
                        style_tag: item.id,
                      })
                    }
                  >
                    {item.name}
                  </BehaviorBox>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {active && (
        <div
          className='fixed top-0 left-0 right-0 bottom-0 z-[8] overscroll-none'
          onClick={() => setActive('')}
        ></div>
      )}
    </div>
  );
};

export default SearchFacetsMix;
