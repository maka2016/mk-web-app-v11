import React, { useState } from 'react';
import { FigmaService } from '../services/figma';
import { FigmaConverter } from '../services/figma-converter';

interface FigmaImporterProps {
  onImport: (code: string) => void;
}

export const FigmaImporter: React.FC<FigmaImporterProps> = ({ onImport }) => {
  const [accessToken, setAccessToken] = useState('');
  const [sectionLink, setSectionLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const extractInfoFromLink = (link: string) => {
    try {
      // 移除URL开头的@符号（如果存在）
      const cleanLink = link.startsWith('@') ? link.substring(1) : link;
      const url = new URL(cleanLink);

      // 从路径中提取file key
      const pathParts = url.pathname.split('/');
      const fileKeyIndex = pathParts.findIndex(part => part === 'design') + 1;
      const fileKey = fileKeyIndex > 0 ? pathParts[fileKeyIndex] : '';

      // 从查询参数中提取node id
      const nodeId = url.searchParams.get('node-id') || '';

      setDebugInfo(
        `Extracted info:\nFile Key: ${fileKey}\nNode ID: ${nodeId}\nClean URL: ${cleanLink}`
      );
      return { fileKey, nodeId };
    } catch (err) {
      setDebugInfo(
        `Error parsing URL: ${err instanceof Error ? err.message : 'Unknown error'}\nOriginal URL: ${link}`
      );
      return { fileKey: '', nodeId: '' };
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError('');
      setDebugInfo('');

      const { fileKey, nodeId } = extractInfoFromLink(sectionLink);

      if (!fileKey || !nodeId) {
        throw new Error(
          'Invalid Figma section link. Please make sure you copied the correct link.'
        );
      }

      setDebugInfo(prev => prev + '\n\nInitializing Figma service...');
      const figmaService = new FigmaService({
        accessToken,
        fileKey,
      });

      setDebugInfo(prev => prev + '\n\nFetching node data...');
      const converter = new FigmaConverter(figmaService);
      const componentData = await converter.convertToReactComponent(
        fileKey,
        nodeId
      );

      setDebugInfo(prev => prev + '\n\nGenerating React code...');
      const reactCode = converter.generateReactCode(componentData);

      setDebugInfo(prev => prev + '\n\nImport completed successfully!');
      onImport(reactCode);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to import from Figma';
      setError(errorMessage);
      setDebugInfo(prev => prev + `\n\nError: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-4'>
      <h2 className='text-xl font-bold mb-4'>Import from Figma</h2>

      <div className='space-y-4'>
        <div>
          <label className='block text-sm font-medium mb-1'>
            Figma Access Token
          </label>
          <input
            type='text'
            value={accessToken}
            onChange={e => setAccessToken(e.target.value)}
            className='w-full p-2 border rounded'
            placeholder='Enter your Figma access token'
          />
          <p className='text-xs text-gray-500 mt-1'>
            Get your access token from Figma Settings &gt; Account &gt; Access
            tokens
          </p>
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>
            Figma Section Link
          </label>
          <input
            type='text'
            value={sectionLink}
            onChange={e => setSectionLink(e.target.value)}
            className='w-full p-2 border rounded'
            placeholder='Paste Figma section link (e.g., https://www.figma.com/design/xxx/...)'
          />
          <p className='text-xs text-gray-500 mt-1'>
            Right-click on the element in Figma and select &quot;Copy/Paste
            as&quot; &gt; &quot;Copy link to section&quot;
          </p>
        </div>

        {error && <div className='text-red-500 text-sm'>{error}</div>}

        <button
          onClick={handleImport}
          disabled={loading || !accessToken || !sectionLink}
          className='w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400'
        >
          {loading ? 'Importing...' : 'Import'}
        </button>

        {debugInfo && (
          <div className='mt-4'>
            <h3 className='text-sm font-medium mb-2'>Debug Information:</h3>
            <pre className='bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40'>
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
