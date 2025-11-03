import { Suspense } from 'react';
import Boost from '../components/Boost';
export default async function Page({ searchParams }: any) {
  const worksId = (await searchParams).works_id;
  return (
    <Suspense>
      <Boost worksId={worksId}></Boost>
    </Suspense>
  );
}
