'use client';

import React, { Suspense, useEffect, useState } from 'react';
import DesignerEditorApp from './DesignerEditorApp';

export default function Page() {
  return (
    <Suspense>
      <DesignerEditorApp />
    </Suspense>
  );
}
