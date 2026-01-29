import { Suspense } from 'react';
import WorksPreview from './components/main';
import { getQueryString } from '@/utils';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const id = getQueryString(params.works_id);
  return (
    <Suspense>
      <WorksPreview worksId={id}></WorksPreview>
    </Suspense>
  );
}
