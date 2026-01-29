'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChannelDataPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到默认的业务报表页面
    router.replace('/dashboard/manager/data/channel/report');
  }, [router]);

  return null;
}
