import { getQueryString } from '@/utils';
import Home from './index';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const id = getQueryString(params.id);

  return <Home></Home>;
}
