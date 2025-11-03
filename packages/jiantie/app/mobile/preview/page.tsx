import { getQueryString } from '@/utils';
import React from 'react';
import Preview from './main';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const works_id = getQueryString(params.works_id);

  return (
    <div className='h-full flex flex-col overflow-hidden max-w-[600px] mx-auto'>
      <Preview worksId={works_id} query={params} />
      {/* <iframe id="preview-iframe" className={styles.iframe} src={viewerUrl} width="100%" height="100%" /> */}
    </div>
  );
}
