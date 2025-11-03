import { Suspense } from 'react';
import BulletScreen from '../components/BulletScreen';
export default async function Page({ searchParams }: any) {
  const worksId = (await searchParams).works_id;
  return (
    <Suspense>
      <BulletScreen worksId={worksId}></BulletScreen>
    </Suspense>
  );
}
