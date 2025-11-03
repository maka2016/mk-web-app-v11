import { getQueryString } from '@/utils';
import Preview from './preview';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    url: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParamsRes = await searchParams;
  console.log('searchParamsRes', searchParamsRes);
  const videoUrl = getQueryString(searchParamsRes.url);
  const title = getQueryString(searchParamsRes.title);

  return <Preview videoUrl={videoUrl} title={title}></Preview>;
}
