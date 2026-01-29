import { BehaviorBox } from '@/components/BehaviorTracker';
import { Icon } from '@workspace/ui/components/Icon';
import { cn } from '@workspace/ui/lib/utils';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import styles from './index.module.scss';

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
    <div className={styles.filter}>
      <div className={styles.filterBar}>
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
        <div className='flex items-center'>
          {filterType.map((item, index) => (
            <div
              key={index}
              className={cn([
                styles.filterItem,
                'mr-4',
                active === item.key && styles.active,
              ])}
              onClick={() => {
                if (active === item.key) {
                  setActive('');
                } else {
                  setActive(item.key);
                }
              }}
            >
              <span>{item.name}</span>
              <Icon
                name={active === item.key ? 'arrow-up' : 'arrow-down'}
                size={12}
              />
            </div>
          ))}
        </div>
      </div>
      {active && (
        <div className={styles.filterPanel}>
          {active === 'spec' && (
            <div className={styles.list}>
              <BehaviorBox
                behavior={{
                  object_type: 'cate_filter_btn',
                  object_id: '全部',
                  ...track,
                }}
                className={cn([
                  styles.listItem,
                  !searchParams.filter?.spec && styles.active,
                ])}
                onClick={() =>
                  onChangeFilter({
                    spec: '',
                  })
                }
              >
                全部
              </BehaviorBox>
              {facets.spec?.map(item => (
                <BehaviorBox
                  behavior={{
                    object_type: 'cate_filter_btn',
                    object_id: item.name,
                    ...track,
                  }}
                  key={item.id}
                  className={cn([
                    styles.listItem,
                    item.id === searchParams.filter?.spec && styles.active,
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
              <p className={styles.tit}>颜色</p>
              <div className={styles.list} style={{ marginRight: -12 }}>
                <BehaviorBox
                  behavior={{
                    object_type: 'color_filter_btn',
                    object_id: '全部',
                    ...track,
                  }}
                  className={styles.colorItem}
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
                    <div className={styles.active}>
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
                    className={cn([
                      styles.colorItem,
                      item.id === searchParams.filter?.color_tag &&
                        styles.active,
                    ])}
                    style={{ backgroundColor: item.val }}
                    onClick={() =>
                      onChangeFilter({
                        color_tag: item.id,
                      })
                    }
                  >
                    {searchParams.filter?.color_tag === item.id && (
                      <div className={styles.active}>
                        <Icon name='colorCheck' size={16} />
                      </div>
                    )}
                  </BehaviorBox>
                ))}
              </div>
              <p className={styles.tit}>风格</p>
              <div className={styles.list}>
                <BehaviorBox
                  behavior={{
                    object_type: 'style_filter_btn',
                    object_id: '全部',
                    ...track,
                  }}
                  className={cn([
                    styles.listItem,
                    !searchParams.filter?.style_tag && styles.active,
                  ])}
                  onClick={() =>
                    onChangeFilter({
                      style_tag: '',
                    })
                  }
                >
                  全部
                </BehaviorBox>
                {facets.style_tag?.map(item => (
                  <BehaviorBox
                    behavior={{
                      object_type: 'style_filter_btn',
                      object_id: item.name,
                      ...track,
                    }}
                    key={item.id}
                    className={cn([
                      styles.listItem,
                      item.id === searchParams.filter?.style_tag &&
                        styles.active,
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
        <div className={styles.overlay} onClick={() => setActive('')}></div>
      )}
    </div>
  );
};

export default SearchFacetsMix;
