import { redirect } from 'next/navigation';

export default async function page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const searchParamsObj = new URLSearchParams();

  // 将所有 search 参数添加到 URLSearchParams
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        // 处理数组值，将每个元素都添加
        value.forEach(v => {
          searchParamsObj.append(key, v);
        });
      } else {
        searchParamsObj.set(key, value);
      }
    }
  });

  const queryString = searchParamsObj.toString();
  const redirectUrl = queryString
    ? `/desktop/editor-designer?${queryString}`
    : '/desktop/editor-designer';

  redirect(redirectUrl);
}
