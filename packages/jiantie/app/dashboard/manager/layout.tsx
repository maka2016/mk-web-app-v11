'use client';

import { getCookie, setCookie } from '@/utils/cookie';
import { Button } from '@workspace/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@workspace/ui/components/sidebar';
import {
  Ban,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  FolderTree,
  Layout,
  LayoutDashboard,
  Package,
  Radio,
  Search,
  Shield,
  TrendingUp,
  User,
  UserCheck,
  UserCog,
  Users
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DASHBOARD_MENU_CATEGORIES } from '../../../config/dashboardMenu';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  title: string;
  icon: React.ComponentType;
  url: string;
}

interface MenuCategory {
  label: string;
  items: MenuItem[];
}

// 路由对应的图标，根据 url 前缀简单判断
function getIconForUrl(url: string): React.ComponentType {
  if (url.startsWith('/dashboard/manager/designer-works')) return Layout;
  if (url.startsWith('/dashboard/manager/works')) return FileText;
  if (url.startsWith('/dashboard/manager/templates')) return Layout;
  if (url.startsWith('/dashboard/manager/specs')) return Package;
  if (url.startsWith('/dashboard/manager/material')) return FolderTree;
  if (url.startsWith('/dashboard/manager/channels')) return Radio;
  if (url.startsWith('/dashboard/manager/theme-tasks')) return LayoutDashboard;
  if (url.startsWith('/dashboard/manager/async-tasks')) return Clock;
  if (url.startsWith('/dashboard/manager/search')) return TrendingUp;
  if (url.startsWith('/dashboard/manager/data/bi')) return LayoutDashboard;
  if (url.startsWith('/dashboard/manager/risk/result')) return Shield;
  if (url.startsWith('/dashboard/manager/risk/whiteUser')) return UserCheck;
  if (url.startsWith('/dashboard/manager/risk')) return Ban;
  if (url.startsWith('/dashboard/manager/admin/users')) return Users;
  if (url.startsWith('/dashboard/manager/admin/roles')) return UserCog;
  if (url.startsWith('/dashboard/manager/designers')) return User;
  if (url.startsWith('/dashboard/manager/data/channel')) return LayoutDashboard;
  if (url.startsWith('/dashboard/manager/data/makamix')) return Search;

  // 默认图标
  return Layout;
}

const menuCategories: MenuCategory[] = DASHBOARD_MENU_CATEGORIES.map(
  category => ({
    label: category.label,
    items: category.items.map(item => ({
      title: item.title,
      url: item.url,
      icon: getIconForUrl(item.url),
    })),
  })
);

const SIMPLE_PWD_COOKIE_KEY = 'dashboard_manager_simple_pwd_ok';
const SIMPLE_PASSWORD = '1432';

export default function ManagerLayout({ children }: ManagerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');

  // 管理每个分组的展开/收起状态，默认全部展开，但"业务报表（废弃）"默认折叠
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const defaultExpanded: Record<string, boolean> = {};
      menuCategories.forEach(category => {
        defaultExpanded[category.label] = category.label !== '业务报表（废弃）';
      });
      return defaultExpanded;
    }
  );

  useEffect(() => {
    // 简单密码验证：检查本地 cookie
    const ok = getCookie(SIMPLE_PWD_COOKIE_KEY);
    // 使用一个微任务避免在 effect 里直接同步 setState 的 lint 提示
    Promise.resolve().then(() => {
      setIsAuthorized(ok === '1');
      setLoading(false);
    });
  }, []);

  const handleSimpleLogin = () => {
    if (password === SIMPLE_PASSWORD) {
      setCookie(SIMPLE_PWD_COOKIE_KEY, '1');
      setIsAuthorized(true);
      toast.success('验证通过');
    } else {
      toast.error('密码错误');
    }
  };

  const handleMenuClick = (url: string) => {
    router.push(url);
  };

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <span className='text-sm text-muted-foreground'>加载中...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className='flex h-screen items-center justify-center bg-background'>
        <div className='w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm'>
          <h2 className='mb-4 text-lg font-semibold'>管理后台访问验证</h2>
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='manager-password'>访问密码</Label>
              <Input
                id='manager-password'
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='请输入访问密码'
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSimpleLogin();
                  }
                }}
              />
            </div>
            <Button
              className='w-full'
              onClick={handleSimpleLogin}
              disabled={!password}
            >
              进入管理后台
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className='flex h-screen w-full'>
        <Sidebar className='border-r'>
          <SidebarHeader>
            <div className='flex items-center justify-between px-4 py-2'>
              <h2 className='text-lg font-semibold'>平台管理</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {menuCategories.map(category => {
              const isExpanded = expandedGroups[category.label] ?? true;
              return (
                <SidebarGroup key={category.label}>
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={open => {
                      setExpandedGroups(prev => ({
                        ...prev,
                        [category.label]: open,
                      }));
                    }}
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarGroupLabel className='cursor-pointer'>
                        {category.label}
                        <SidebarGroupAction>
                          {isExpanded ? <ChevronDown /> : <ChevronRight />}
                        </SidebarGroupAction>
                      </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {category.items.length > 0 ? (
                            category.items.map(item => {
                              const Icon = item.icon;
                              // 使用 startsWith 来判断激活状态，支持带查询参数的 URL
                              const isActive =
                                pathname === item.url ||
                                pathname.startsWith(item.url + '/');
                              return (
                                <SidebarMenuItem key={item.url}>
                                  <SidebarMenuButton
                                    isActive={isActive}
                                    onClick={() =>
                                      handleMenuClick(item.url)
                                    }
                                  >
                                    <Icon />
                                    <span>{item.title}</span>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })
                          ) : (
                            <SidebarMenuItem>
                              <div className='px-2 py-1.5 text-sm text-muted-foreground'>
                                TODO
                              </div>
                            </SidebarMenuItem>
                          )}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>
              );
            })}
          </SidebarContent>
          <SidebarFooter>
            {/* 简单密码模式暂不展示用户信息/登出 */}
          </SidebarFooter>
        </Sidebar>
        <main className='flex-1 overflow-auto bg-background'>{children}</main>
      </div>
    </SidebarProvider>
  );
}
