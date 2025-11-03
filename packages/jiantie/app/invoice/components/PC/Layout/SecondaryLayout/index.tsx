'use client';
import { Icon } from '@workspace/ui/components/Icon';
import styles from './index.module.scss';
import cls from 'classnames';
import React, { useEffect, useState } from 'react';
import { Breadcrumb } from 'antd';
import { ItemType } from 'antd/es/breadcrumb/Breadcrumb';
import { useRouter } from 'next/navigation';

interface Props {
  breadcrumbItems: ItemType[];

  children?: React.ReactNode;
}

export const SecondaryLayoutContext = React.createContext({
  breadcrumbItems: [] as ItemType[],
  baseBreadcrumbItems: [] as ItemType[],
  setBreadcrumbItems: (items: ItemType[]) => {},

  pushBreadcrumbItem: (item: ItemType) => {},

  popBreadcrumbItem: () => {},

  setBreadcrumbCurrentTitle: (title: string) => {},
});

const SecondaryLayout: React.FC<Props> = props => {
  const router = useRouter();

  const [items, setItems] = useState<ItemType[]>(props.breadcrumbItems);

  const baseBreadcrumbItems = props.breadcrumbItems;

  const lastItem = items.length > 1 ? items[items.length - 1] : undefined;
  return (
    <div className={styles.layout}>
      <Breadcrumb
        className={styles.breadcrumbWrapper}
        items={items}
        itemRender={(route, params) => {
          return (
            <div
              className={cls(
                styles.breadcrumbItem,
                lastItem?.title === route.title && styles.current
              )}
              onClick={() => {
                if (route.path) {
                  router.push(route.path);
                }
              }}
            >
              {route.title}
            </div>
          );
        }}
      />

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

          pushBreadcrumbItem: items => {
            setItems(currentItems => [...currentItems, items]);
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
