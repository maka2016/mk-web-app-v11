import { Suspense } from 'react';
import { getQueryString } from '../../../utils/index1';
import EditorPCClient from './EditorPCClient';

export default async function EditorPc({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const worksId = getQueryString(params.works_id);
  const uid = getQueryString(params.uid);
  return (
    <Suspense>
      <EditorPCClient worksId={worksId} uid={uid} />
    </Suspense>
  );
}
