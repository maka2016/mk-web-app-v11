import { Suspense } from 'react';
import ApplyPage from './components/ApplyPage';

export default function Apply() {
  return (
    <Suspense>
      <ApplyPage />
    </Suspense>
  );
}
