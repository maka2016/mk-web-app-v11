import { getQueryString } from '@/utils';
import Vip from './components/main';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const appid = getQueryString(params.appid);
  return <Vip appid={appid}></Vip>;
}
