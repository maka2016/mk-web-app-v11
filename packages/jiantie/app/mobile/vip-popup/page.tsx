import { Suspense } from 'react';
import Vip from './components/vip';

export default function Page() {
  return (
    <Suspense>
      <Vip />
    </Suspense>
  );
}
