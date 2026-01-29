'use client';
import { Icon } from '@workspace/ui/components/Icon';
import { cn } from '@workspace/ui/lib/utils';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import styles from './index.module.scss';

export interface BreadcrumbItem {
  title: string | React.ReactNode;
  path?: string;
  href?: string;
}

interface Props {
  breadcrumbItems: BreadcrumbItem[];
  children?: React.ReactNode;
}

export const SecondaryLayoutContext = React.createContext({
  breadcrumbItems: [] as BreadcrumbItem[],
  baseBreadcrumbItems: [] as BreadcrumbItem[],
  setBreadcrumbItems: (items: BreadcrumbItem[]) => {},
  pushBreadcrumbItem: (item: BreadcrumbItem) => {},
  popBreadcrumbItem: () => {},
  setBreadcrumbCurrentTitle: (title: string) => {},
});

const SecondaryLayout: React.FC<Props> = props => {
  const router = useRouter();
  const [items, setItems] = useState<BreadcrumbItem[]>(props.breadcrumbItems);
  const baseBreadcrumbItems = props.breadcrumbItems;
  const lastItem = items.length > 1 ? items[items.length - 1] : undefined;

  return (
    <div className={styles.layout}>
      <div className={styles.breadcrumbWrapper}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              <div
                className={cn(styles.breadcrumbItem, isLast && styles.current)}
                onClick={() => {
                  if (item.path || item.href) {
                    router.push(item.path || item.href || '');
                  }
                }}
              >
                {item.title}
              </div>
              {!isLast && (
                <span className={styles.separator}>
                  <Icon name='right' size={12} />
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <SecondaryLayoutContext.Provider
        value={{
          breadcrumbItems: items,
          baseBreadcrumbItems: baseBreadcrumbItems,
          setBreadcrumbItems: items => setItems(items),
          setBreadcrumbCurrentTitle: title => {
            setItems(items => {
              return [
                ...items.slice(0, items.length - 1),
                {
                  title: title,
                },
              ];
            });
          },
          pushBreadcrumbItem: item => {
            setItems(currentItems => [...currentItems, item]);
          },
          popBreadcrumbItem: () => {
            setItems(currentItems => currentItems.slice(0, -1));
          },
        }}
      >
        <div className={styles.content}>{props.children}</div>
      </SecondaryLayoutContext.Provider>
    </div>
  );
};

export default SecondaryLayout;
