import { Suspense } from 'react';
import GroupBuy from '../components/GroupBuy';
export default async function Page({ searchParams }: any) {
  const worksId = (await searchParams).works_id;
  return (
    <Suspense>
      <GroupBuy worksId={worksId}></GroupBuy>
    </Suspense>
  );
}
