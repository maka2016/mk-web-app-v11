import { Suspense } from 'react';
import PinTuan from '../components/PinTuan';
export default async function Page({ searchParams }: any) {
  const worksId = (await searchParams).works_id;
  return (
    <Suspense>
      <PinTuan worksId={worksId}></PinTuan>
    </Suspense>
  );
}
