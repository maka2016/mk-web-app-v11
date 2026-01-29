import { getQueryString } from '@/utils';
import { Suspense } from 'react';
import DataViewPage from './main';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const worksId = getQueryString(params.works_id);
  return (
    <Suspense>
      <DataViewPage worksId={worksId} />
    </Suspense>
  );
}
