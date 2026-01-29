import { Suspense } from 'react';
import BridgeTest from './components';

export default function Page() {
  return (
    <Suspense>
      <BridgeTest />
    </Suspense>
  );
}
