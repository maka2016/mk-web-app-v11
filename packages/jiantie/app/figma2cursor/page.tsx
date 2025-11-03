'use client';

import React, { useState } from 'react';
import { FigmaImporter } from './components/FigmaImporter';

export default function Figma2CursorPage() {
  const [importedCode, setImportedCode] = useState('');

  const handleImport = (code: string) => {
    setImportedCode(code);
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-4xl mx-auto py-8 px-4'>
        <h1 className='text-2xl font-bold mb-8'>Figma to Cursor</h1>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          <div className='bg-white rounded-lg shadow'>
            <FigmaImporter onImport={handleImport} />
          </div>

          <div className='bg-white rounded-lg shadow p-4'>
            <h2 className='text-xl font-bold mb-4'>Generated Code</h2>
            {importedCode ? (
              <pre className='bg-gray-50 p-4 rounded overflow-auto max-h-[600px]'>
                <code>{importedCode}</code>
              </pre>
            ) : (
              <div className='text-gray-500 text-center py-8'>
                Imported code will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
