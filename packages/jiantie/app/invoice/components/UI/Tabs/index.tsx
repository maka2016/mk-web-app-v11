'use client';
import { cn } from '@workspace/ui/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import styles from './index.module.scss';

export interface TabItemProp {
  label: string;
  key: string;
  children: React.ReactNode;
}

interface Props {
  activeKey?: string;
  defaultActiveKey?: string;
  items: TabItemProp[];

  hiddenTabs?: boolean;

  onChange?: (key: string) => void;

  /** 是否启用同步页面查询参数功能 */
  enableSyncQueryParams?: boolean;

  /** 页面参数名称 */
  queryParamName?: string;

  /** 是否固定头部 */
  fixedTabHeader?: boolean;
}

const Tabs: React.FC<Props> = props => {
  const [activeKey, setActiveKey] = useState<Props['activeKey']>();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setActiveKey(props.defaultActiveKey);
  }, []);

  useEffect(() => {
    if (props.activeKey) {
      setActiveKey(props.activeKey);
    }
  }, [props.activeKey]);

  useEffect(() => {
    // 同步页面查询参数
    if (props.enableSyncQueryParams && props.queryParamName) {
      const search = new URLSearchParams(searchParams);
      search.set(props.queryParamName, activeKey ?? '');
      router.replace(`${pathname}?${search.toString()}`);
    }
  }, [activeKey]);

  useEffect(() => {
    if (props.activeKey) return;
    if (props.enableSyncQueryParams && props.queryParamName) {
      const queryValue = searchParams.get(props.queryParamName);
      if (queryValue) {
        setActiveKey(queryValue);
      }
    }
  }, [props.enableSyncQueryParams, props.queryParamName, props.activeKey]);

  return (
    <Suspense>
      <div className={styles.main}>
        {!props.hiddenTabs && (
          <div className={styles.tabsWrapper}>
            {props.items.map(item => {
              const isActive = activeKey === item.key;
              return (
                <div
                  key={item.key}
                  className={cn(styles.tabItem, isActive && styles.active)}
                  onClick={() => {
                    props.onChange?.(item.key);
                    if (!props.activeKey) {
                      setActiveKey(item.key);
                    }
                  }}
                >
                  {item.label}
                </div>
              );
            })}
          </div>
        )}
        <div
          className={styles.contentWrapper}
          style={{ overflow: props.fixedTabHeader ? 'scroll' : undefined }}
        >
          {props.items.find(item => item.key === activeKey)?.children}
        </div>
      </div>
    </Suspense>
  );
};

export default Tabs;
