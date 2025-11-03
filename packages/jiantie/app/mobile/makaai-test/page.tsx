import { Suspense } from 'react';
import MakaAiTest from './components';

export default function Page() {
  return (
    <Suspense>
      <MakaAiTest />
    </Suspense>
  );
}
