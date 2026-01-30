'use client';

import BindPhoneModal from '@/components/DeviceWrapper/mobile/BindPhoneModal';
import MakaVipModal from '@/components/DeviceWrapper/mobile/MakaVipModal';
import { UserInfoLoader } from '@/components/DeviceWrapper/UserInfoLoader';
import { MakaLoginModal } from '@/components/MAKALogin/main';
import { getUid } from '@/services';
import { useStore } from '@/store';
import { setDocumentTitle } from '@/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@workspace/ui/components/sidebar';
import { cn } from '@workspace/ui/lib/utils';
import {
  CirclePlus,
  House,
  LayoutDashboard,
  Shapes,
  SquareArrowOutUpRight,
} from 'lucide-react';
import { observer } from 'mobx-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import Footer from './Footer';
import PcUserProfileCard from './PcUserProfileCard';

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  badge?: number | string;
  documentTitle?: string;
}

interface MenuGroup {
  label?: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: '',
    items: [
      {
        title: '2026新版',
        icon: House,
        url: '/maka-v2',
        documentTitle: '2026新版-MAKA（码卡）',
      },
      {
        title: '经典旧版',
        icon: Shapes,
        url: '/maka-v2/classic',
        documentTitle: '经典旧版-MAKA（码卡）',
        // badge: '经典旧版',
      },
      {
        title: '创建',
        icon: CirclePlus,
        url: '/maka-v2/create-works',
        documentTitle: '创建-MAKA（码卡）',
      },
    ],
  },
  {
    label: '',
    items: [
      {
        title: '我的作品',
        icon: LayoutDashboard,
        url: '/maka-v2/works',
        documentTitle: '我的作品-MAKA（码卡）',
      },
      // {
      //   title: '素材中心',
      //   icon: FolderTree,
      //   url: '/maka-v2/user-templates',
      //   // url: 'https://www.maka.im/workspacev2/collections',
      //   // badge: '1200+',
      // },
      {
        title: '旧版入口',
        icon: SquareArrowOutUpRight,
        url: 'https://www.maka.im/',
        // badge: '1200+',
        documentTitle: '旧版入口-MAKA（码卡）',
      },
    ],
  },
];

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  userAgent?: string;
}

const hideSidebarPaths = [
  '/maka-v2/editor',
  '/maka-v2/editor-pc',
  '/maka-v2/template2026',
];
const checkIsHideSidebar = (pathname: string) => {
  return hideSidebarPaths.some(path => pathname.startsWith(path));
};

// 从菜单配置生成路由到标题的映射
const routeTitleMap: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  menuGroups.forEach(group => {
    group.items.forEach(item => {
      // 只处理内部路由，跳过外部链接
      if (!/https?:\/\//.test(item.url)) {
        map[item.url] = item.documentTitle || item.title;
      }
    });
  });
  return map;
})();

function ResponsiveLayout({ children, userAgent }: ResponsiveLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setLoginShow } = useStore();

  // 根据路由设置 document title
  useEffect(() => {
    // 检查是否有精确匹配的路由
    let pageTitle = routeTitleMap[pathname];

    // 如果没有精确匹配，尝试匹配父路由
    if (!pageTitle) {
      const matchedRoute = Object.keys(routeTitleMap).find(route => {
        // 对于 /maka-v2，只匹配精确路径
        if (route === '/maka-v2') {
          return pathname === route;
        }
        // 对于其他路径，检查是否以 route + '/' 开头
        return pathname.startsWith(route + '/');
      });
      if (matchedRoute) {
        pageTitle = routeTitleMap[matchedRoute];
      }
    }

    // 如果找到了标题，设置 document title
    if (pageTitle) {
      setDocumentTitle(pageTitle);
    }
  }, [pathname]);

  const handleMenuClick = (url: string) => {
    if (/https?:\/\//.test(url)) {
      window.open(url, '_blank');
      return;
    }

    // 检查是否是"我的作品"页面，且用户未登录
    if (url === '/maka-v2/works') {
      const uid = getUid();
      if (!uid) {
        setLoginShow(true);
        return;
      }
    }

    router.push(url);
  };

  const isActive = (url: string) => {
    // 精确匹配
    if (pathname === url) {
      return true;
    }
    // 对于 /maka-v2，只匹配精确路径，不匹配子路径（如 /maka-v2/works）
    if (url === '/maka-v2') {
      return false;
    }
    // 对于其他路径，检查是否以 url + '/' 开头
    return pathname.startsWith(url + '/');
  };

  // 检查是否是 editor-pc 页面
  const isHideSidebar = checkIsHideSidebar(pathname);

  // 桌面端布局
  return (
    <>
      <UserInfoLoader />
      <MakaVipModal />
      <MakaLoginModal />
      <BindPhoneModal />
      <SidebarProvider defaultOpen={true} userAgent={userAgent}>
        <div className='flex h-screen w-full flex-col'>
          <div className='flex flex-1 overflow-hidden'>
            {!isHideSidebar && (
              <Sidebar className='border-r'>
                <SidebarHeader>
                  <div className=' p-2'>
                    <Link
                      href='/maka-v2'
                      className='flex items-center justify-center'
                    >
                      <img
                        src='https://res.maka.im/cdn/webstore7/assets/header_logo_v2.png'
                        alt='简帖'
                        className='w-28 object-contain'
                      />
                    </Link>
                  </div>
                </SidebarHeader>

                <SidebarContent>
                  {menuGroups.map((group: MenuGroup, groupIndex: number) => {
                    const showLabel = group.label && group.label.trim() !== '';

                    return (
                      <React.Fragment key={groupIndex}>
                        {groupIndex > 0 && (
                          <div className='border-t border-sidebar-border mx-4' />
                        )}
                        <SidebarGroup className='p-4 gap-0'>
                          {showLabel && (
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                          )}
                          <SidebarGroupContent>
                            <SidebarMenu className='gap-2'>
                              {group.items.map(item => {
                                const Icon = item.icon;
                                const active = isActive(item.url);

                                return (
                                  <SidebarMenuItem key={item.url}>
                                    <SidebarMenuButton
                                      isActive={active}
                                      onClick={() => handleMenuClick(item.url)}
                                      className={cn(
                                        `py-3 px-4 pr-0 h-auto text-base font-bold`
                                      )}
                                    >
                                      <div className='flex items-center gap-2'>
                                        <Icon className='size-4' />
                                        <span>{item.title}</span>
                                        {item.badge && (
                                          <span className='ml-auto text-xs text-muted-foreground'>
                                            {item.badge}
                                          </span>
                                        )}
                                      </div>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                );
                              })}
                            </SidebarMenu>
                          </SidebarGroupContent>
                        </SidebarGroup>
                      </React.Fragment>
                    );
                  })}
                </SidebarContent>
                <div className='mt-auto px-4 pb-4'>
                  <PcUserProfileCard />
                </div>
              </Sidebar>
            )}

            <main className='flex-1 overflow-auto'>
              {children}
              {!isHideSidebar && <Footer userAgent={userAgent} />}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default observer(ResponsiveLayout);
