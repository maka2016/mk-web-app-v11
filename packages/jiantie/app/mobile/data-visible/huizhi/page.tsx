import { Suspense } from 'react';
import HuiZhi from '../components/HuiZhi';
export default async function Page({ searchParams }: any) {
  const worksId = (await searchParams).works_id;
  return (
    <Suspense>
      <HuiZhi worksId={worksId}></HuiZhi>
    </Suspense>
  );
}
