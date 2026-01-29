'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ManagerPage() {
  const router = useRouter();

  useEffect(() => {
    // 默认重定向到作品管理页面
    router.replace('/dashboard/designer/works');
  }, [router]);

  return null;
}
