import { getQueryString } from '@/utils';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import Main from './main';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const defaultTab = getQueryString(params.default_tab);
  const appid = getQueryString(params.appid) || 'jiantie';

  // 防止小程序头部闪烁
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isMiniProgram = /miniProgram/i.test(userAgent);

  return (
    <Suspense>
      <Main
        isMiniProgram={isMiniProgram}
        // storeChannelV1={isStoreV1}
        defaultTab={defaultTab}
        appid={appid}
        // templateChannels={templateChannels}
      />
    </Suspense>
  );
}

// export default Channel
