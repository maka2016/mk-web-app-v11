'use client';

import { getCookie, setCookie, removeCookie } from '@/utils/cookie';
import { trpc } from '@/utils/trpc';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ResponsiveDialog } from '@workspace/ui/components/responsive-dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DASHBOARD_MENU_CATEGORIES } from '../config/dashboardMenu';

// 路由到菜单分组的映射（客户端版本），从统一菜单配置中生成
function getMenuGroupByRoute(route: string): string | null {
  for (const category of DASHBOARD_MENU_CATEGORIES) {
    for (const item of category.items) {
      const basePath =
        item.routePattern ?? item.url.split('?')[0];
      if (route.startsWith(basePath)) {
        return category.label;
      }
    }
  }
  return null;
}

const ADMIN_USER_ID_COOKIE_KEY = 'admin_user_id';
const ADMIN_USER_INFO_COOKIE_KEY = 'admin_user_info';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // 兼容处理：如果有「基础数据管理」，自动添加「平台资源管理」
  const getEffectivePermissions = (permissions: string[]): string[] => {
    const effective = [...permissions];
    if (permissions.includes('基础数据管理') && !permissions.includes('平台资源管理')) {
      effective.push('平台资源管理');
    }
    return effective;
  };

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const adminUserId = getCookie(ADMIN_USER_ID_COOKIE_KEY);
      if (!adminUserId) {
        setIsAuthenticated(false);
        setIsLoading(false);
        setPermissionsLoaded(false);
        setShowLoginDialog(true);
        return;
      }

      try {
        // 先加载用户权限，再设置认证状态
        try {
          const permissions = await trpc.adminAuth.getUserMenuGroups.query();
          const effectivePermissions = getEffectivePermissions(permissions || []);
          setUserPermissions(effectivePermissions);
          setPermissionsLoaded(true);
          
          // 权限加载成功后再设置认证状态
          setIsAuthenticated(true);
          setIsLoading(false);
        } catch (error) {
          console.error('Failed to load permissions:', error);
          // 如果加载权限失败，可能是认证失效，重新登录
          removeCookie(ADMIN_USER_ID_COOKIE_KEY);
          removeCookie(ADMIN_USER_INFO_COOKIE_KEY);
          setIsAuthenticated(false);
          setIsLoading(false);
          setPermissionsLoaded(false);
          setShowLoginDialog(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        removeCookie(ADMIN_USER_ID_COOKIE_KEY);
        removeCookie(ADMIN_USER_INFO_COOKIE_KEY);
        setIsAuthenticated(false);
        setIsLoading(false);
        setPermissionsLoaded(false);
        setShowLoginDialog(true);
      }
    };

    checkAuth();
  }, []);

  // 检查页面权限（只有在权限加载完成后才检查）
  useEffect(() => {
    // 如果权限还没加载完成，不进行检查
    if (!isAuthenticated || !permissionsLoaded || !pathname) return;

    const menuGroup = getMenuGroupByRoute(pathname);
    if (!menuGroup) {
      // 如果路由没有匹配到任何菜单分组，默认允许访问
      return;
    }

    const effectivePermissions = getEffectivePermissions(userPermissions);
    if (!effectivePermissions.includes(menuGroup)) {
      toast.error(`您没有权限访问"${menuGroup}"`);
      router.push('/dashboard/manager');
    }
  }, [pathname, isAuthenticated, userPermissions, permissionsLoaded, router]);

  // 处理登录
  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      toast.error('请输入用户名和密码');
      return;
    }

    setLoginLoading(true);
    try {
      const result = await trpc.adminAuth.login.mutate(loginForm);
      
      // 保存登录状态
      setCookie(ADMIN_USER_ID_COOKIE_KEY, result.id);
      setCookie(ADMIN_USER_INFO_COOKIE_KEY, JSON.stringify(result));

      setIsAuthenticated(true);
      setShowLoginDialog(false);
      setLoginForm({ username: '', password: '' });

      // 加载用户权限
      try {
        const permissions = await trpc.adminAuth.getUserMenuGroups.query();
        const effectivePermissions = getEffectivePermissions(permissions || []);
        setUserPermissions(effectivePermissions);
        setPermissionsLoaded(true);
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }

      // 触发登录成功事件，通知 layout 重新加载权限
      window.dispatchEvent(new CustomEvent('admin-login-success'));

      toast.success('登录成功');
    } catch (error: any) {
      toast.error(error.message || '登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      await trpc.adminAuth.logout.mutate();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeCookie(ADMIN_USER_ID_COOKIE_KEY);
      removeCookie(ADMIN_USER_INFO_COOKIE_KEY);
      setIsAuthenticated(false);
      setUserPermissions([]);
      setShowLoginDialog(true);
      router.push('/dashboard/manager');
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <ResponsiveDialog
          isOpen={showLoginDialog}
          onOpenChange={setShowLoginDialog}
          isDialog={true}
          dismissible={false}
          contentProps={{
            className: 'max-w-[400px]',
          }}
        >
          <div className='p-6 space-y-4'>
            <h2 className='text-xl font-semibold'>管理员登录</h2>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='username'>用户名</Label>
                <Input
                  id='username'
                  value={loginForm.username}
                  onChange={e =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                  placeholder='请输入用户名'
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleLogin();
                  }}
                  autoFocus
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password'>密码</Label>
                <Input
                  id='password'
                  type='password'
                  value={loginForm.password}
                  onChange={e =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  placeholder='请输入密码'
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleLogin();
                  }}
                />
              </div>
            </div>
            <div className='flex justify-end gap-2'>
              <Button
                onClick={handleLogin}
                disabled={loginLoading || !loginForm.username || !loginForm.password}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </>
    );
  }

  return <>{children}</>;
}
