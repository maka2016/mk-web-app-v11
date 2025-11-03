'use client';

import { Suspense } from 'react';
import EditorApp from './EditorApp';

export default function Page() {
  return (
    <Suspense>
      <EditorApp />
    </Suspense>
  );
}
