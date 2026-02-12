'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ResetAppid() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const appid = searchParams.get('appid');

    // 如果没有 appid 参数，或者 appid 不等于 'maka'，则设置为 'maka'
    if (appid !== 'maka') {
      const params = new URLSearchParams(searchParams);
      params.set('appid', 'maka');

      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
    }
  }, [searchParams, router]);
  return null;
}
