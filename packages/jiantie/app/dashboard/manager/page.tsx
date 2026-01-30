'use client';

import { getCookie } from '@/utils/cookie';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ManagerPage() {
  const router = useRouter();

  useEffect(() => {
    // 未登录：由 layout.tsx 的 AdminAuthGuard 弹出登录框
    const adminUserId = getCookie('admin_user_id');
    if (!adminUserId) return;

    // 已登录：进入管理后台默认页
    router.replace('/dashboard/manager/templates');
  }, [router]);

  return <></>;
}
