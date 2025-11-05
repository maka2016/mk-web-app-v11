import { getQueryString } from '@/utils';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import Main from './components/main';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const defaultTab = getQueryString(params.default_tab);
  const appid = getQueryString(params.appid) || 'jiantie';
  const storeChannelV1 = getQueryString(params.store_channel_v1);

  // 防止小程序头部闪烁
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const isMiniProgram = /miniProgram/i.test(userAgent);

  // const isStoreV1 =
  //   appid === 'jiantie' || appid === 'xueji' || storeChannelV1 === 'true';

  // const isPrisma = false && appid === 'jiantie';

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
