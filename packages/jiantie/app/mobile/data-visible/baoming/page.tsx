import { Suspense } from 'react';
import MkBaoMingV2 from '../components/MkBaoMingV2';
export default async function Page({ searchParams }: any) {
  const worksId = (await searchParams).works_id;
  return (
    <Suspense>
      <MkBaoMingV2 worksId={worksId}></MkBaoMingV2>
    </Suspense>
  );
}
