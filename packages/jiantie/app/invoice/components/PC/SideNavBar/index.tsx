'use client';
import { Icon } from '@workspace/ui/components/Icon';
import { cn } from '@workspace/ui/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import styles from './index.module.scss';

interface route {
  label: string;
  icon: string;
  pathname: string;

  subPaths?: string[];
}
const routes: route[] = [
  {
    label: '我的发票',
    icon: 'fapiao',
    pathname: '/invoice/home',
  },
  {
    label: '我的订单',
    icon: 'dindan',
    pathname: '/invoice/order',
  },
];
const SideNavBar = () => {
  const pathname = usePathname();

  const router = useRouter();
  const onMenuItemClick = (route: route) => {
    router.push(route.pathname);
  };

  return (
    <div className={styles.main}>
      <div className={`${styles.menuWrapper}`}>
        {routes.map((route, idx) => {
          const isActive = pathname.startsWith(route.pathname);
          return (
            <div
              className={cn(styles.menuItem, isActive && styles.active)}
              key={idx}
              onClick={() => {
                onMenuItemClick(route);
              }}
            >
              <Icon name={route.icon} size={18} />
              {route.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SideNavBar;
