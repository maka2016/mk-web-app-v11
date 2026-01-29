'use client';

import DesignerEditorApp from '@/components/GridEditorV3/EditorCanvas/DesignerEditorApp';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense>
      <DesignerEditorApp />
    </Suspense>
  );
}
