import { getQueryString } from '@/utils';
import Home from './index';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const keywords = getQueryString(params.keywords);

  return <Home keywords={keywords} />;
}
