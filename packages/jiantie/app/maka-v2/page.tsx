import { getQueryString } from '@/utils';
import { Suspense } from 'react';
import Main from './HomeComp';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const defaultTab = getQueryString(params.default_tab);
  const appid = getQueryString(params.appid) || 'maka';

  return (
    <Suspense>
      <Main defaultTab={defaultTab} appid={appid} />
    </Suspense>
  );
}
// export default Channel
