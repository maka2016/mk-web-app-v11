'use client';

import EditorApp from '@/components/GridEditorV3/EditorCanvas/UserEditorApp';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense>
      <EditorApp />
    </Suspense>
  );
}
