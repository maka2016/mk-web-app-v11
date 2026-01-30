'use client';

import {
  getAppId,
  getDesignerInfoForClient,
  getToken,
  getUid,
  type DesignerConfig,
} from '@/services';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@workspace/ui/components/sidebar';
import { Button } from '@workspace/ui/components/button';
import { Copy, FileText } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    title: '作品管理',
    icon: FileText,
    url: '/dashboard/designer/works',
  },
];

export default function ManagerLayout({ children }: ManagerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [designerName, setDesignerName] = useState<string>('');

  // 检查简帖用户登录状态（每次渲染时检查）
  const checkUserLoggedIn = () => {
    if (typeof window !== 'undefined') {
      const token = getToken();
      const uid = getUid();
      return !!(token && uid);
    }
    return false;
  };
  const isUserLoggedIn = checkUserLoggedIn();

  useEffect(() => {
    if (!isUserLoggedIn) return;
    const currentUid = getUid();
    if (!currentUid) return;
    getDesignerInfoForClient({
      uid: currentUid,
      appid: getAppId(),
    })
      .then((res: DesignerConfig) => {
        setDesignerName(res.fullName || '');
      })
      .catch(() => {});
  }, [isUserLoggedIn]);

  const handleMenuClick = (url: string) => {
    router.push(url);
  };

  const handleCopyUid = async () => {
    const uid = getUid();
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      toast.success('已复制 UID');
    } catch {
      toast.error('复制失败');
    }
  };

  // 如果简帖用户未登录，显示提示
  if (!isUserLoggedIn) {
    return '0';
  }

  return (
    <SidebarProvider>
      <div className='flex h-screen w-full'>
        <Sidebar className='border-r'>
          <SidebarHeader>
            <div className='flex items-center gap-2 px-4 py-2'>
              <h2 className='text-lg font-semibold'>设计师工作台</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>资源管理</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map(item => {
                    const Icon = item.icon;
                    // 使用 startsWith 来判断激活状态，支持带查询参数的 URL
                    const isActive =
                      pathname === item.url ||
                      pathname.startsWith(item.url + '/');
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleMenuClick(item.url)}
                        >
                          <Icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className='mt-auto border-t pt-2'>
            <div className='space-y-2 px-4 py-2'>
              {designerName && (
                <div className='text-sm text-muted-foreground truncate'>
                  设计师：{designerName}
                </div>
              )}
              <div className='flex items-center gap-1.5'>
                <span className='text-xs text-muted-foreground whitespace-nowrap'>
                  UID：
                </span>
                <span className='min-w-0 flex-1 truncate text-xs font-mono text-muted-foreground'>
                  {getUid() || '-'}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 shrink-0'
                  onClick={handleCopyUid}
                  title='复制 UID'
                >
                  <Copy className='h-3.5 w-3.5' />
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className='flex-1 overflow-auto bg-background'>{children}</main>
      </div>
    </SidebarProvider>
  );
}
