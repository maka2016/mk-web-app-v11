import APPBridge from '@mk/app-bridge';
import { Loading } from '@workspace/ui/components/loading';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import styles from './index.module.scss';

interface Props {
  columns: any[];
  data: any[];
  loadMore?: () => void;
  showMore?: boolean;
  finished?: boolean;
  loading?: boolean;
  type?: string;
  formId?: string;
}

// 深度比较函数
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

const Table = (props: Props) => {
  const {
    columns = [],
    data = [],
    formId,
    loadMore,
    showMore,
    finished = true,
    loading = false,
    type,
  } = props;

  const [list, setList] = useState(data);
  const [headers, setHeaders] = useState<any[]>(columns);
  const t = useTranslations('DataVisible');

  // 深比较
  const useCampare = (value: any, compare: any) => {
    const ref = useRef<any>(null);

    if (!compare(value, ref.current)) {
      // deep compare
      ref.current = value;
    }

    return ref.current;
  };

  const compareColumns = useCampare(columns, deepEqual);
  const compareList = useCampare(data, deepEqual);

  useEffect(() => {
    setList(compareList);
  }, [compareList]);

  useEffect(() => {
    setHeaders(compareColumns);
  }, [compareColumns]);

  const onLoad = () => {
    loadMore?.();
  };

  const toForm = () => {
    let redirectUrl = `${location.origin}/mobile/data-visible/form?formId=${formId}&is_full_screen=1`;

    if (type === 'MkVote') {
      redirectUrl = `${location.origin}/mobile/data-visible/vote?formId=${formId}&is_full_screen=1`;
    }

    if (type === 'MkDengMi') {
      redirectUrl = `${location.origin}/mobile/data-visible/dengmi?formId=${formId}&is_full_screen=1`;
    }

    if (type === 'MkDaTi') {
      redirectUrl = `${location.origin}/mobile/data-visible/dati?formId=${formId}&is_full_screen=1`;
    }
    console.log(redirectUrl);
    if (APPBridge.judgeIsInApp()) {
      APPBridge.appCall({
        type: 'MKRouter',
        params: { url: redirectUrl, type: 'URL' },
      });
    } else {
      window.location.href = redirectUrl;
    }
  };

  const renderRowItem = (row: any, currentHeader: any, index: number) => {
    const item = row[currentHeader.key];
    if (currentHeader.render) {
      return currentHeader.render(item, row, index);
    }
    return item;
  };

  return (
    <>
      <div className={styles.table}>
        <div className={styles.thead}>
          {headers.map(item => {
            return (
              <div
                className={styles.theadItem}
                key={item.key}
                style={{
                  width: item.width,
                  textAlign: item.textAlign,
                }}
              >
                {item.title}
              </div>
            );
          })}
        </div>

        {list.length > 0 && (
          <InfiniteScroll
            initialLoad={false}
            pageStart={0}
            loadMore={onLoad}
            hasMore={!finished}
            className={styles.tbody}
          >
            {list?.map((row, idx) => {
              return (
                <div className={styles.row} key={idx}>
                  {headers.map((header, headerIdx) => {
                    return (
                      <div
                        className={styles.rowItem}
                        key={headerIdx}
                        style={{
                          width: header.width,
                          textAlign: header.textAlign,
                        }}
                      >
                        {renderRowItem(row, header, idx)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </InfiniteScroll>
        )}
      </div>
      {!showMore && (
        <>
          {loading && (
            <div className='flex justify-center'>
              <Loading />
            </div>
          )}
          {finished && list.length > 0 && (
            <div className={styles.finished}>{t('end')}</div>
          )}
        </>
      )}

      {list.length > 0 && showMore && (
        <div className={styles.more} onClick={() => toForm()}>
          查看更多
        </div>
      )}
      {list.length === 0 && (showMore || finished) && (
        <div className={styles.empty}>
          <img
            src='https://img2.maka.im/cdn/webstore7/assets/form_empty.png'
            alt=''
          />
          <span>该表单暂无统计数据</span>
        </div>
      )}
    </>
  );
};

export default Table;
