import { redirect } from 'next/navigation';

// 此页面已废弃，重定向到 /viewer2
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{
    uid: string;
    worksId: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const paramsRes = await params;
  const queryRes = await searchParams;

  const searchParamsStr = new URLSearchParams(
    queryRes as Record<string, string>
  ).toString();

  redirect(
    `/viewer2/${paramsRes.worksId}${searchParamsStr ? `?${searchParamsStr}` : ''}`
  );
}
