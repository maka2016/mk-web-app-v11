import { AlertCircle, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { FigmaErrorHandler } from '../services/error-handler';
import { FigmaService } from '../services/figma';
import { FigmaConverter } from '../services/figma-converter';

interface FigmaImporterProps {
  onImport: (code: string, fullComponent: string) => void;
}

interface ErrorDetails {
  title: string;
  message: string;
  solution?: string;
}

export const FigmaImporter: React.FC<FigmaImporterProps> = ({ onImport }) => {
  const [accessToken, setAccessToken] = useState('');
  const [sectionLink, setSectionLink] = useState('');
  const [componentName, setComponentName] = useState('FigmaComponent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [tokenValidation, setTokenValidation] = useState<string>('');
  const [urlValidation, setUrlValidation] = useState<string>('');

  const extractInfoFromLink = (link: string) => {
    try {
      const cleanLink = link.startsWith('@') ? link.substring(1) : link;
      const url = new URL(cleanLink);

      const pathParts = url.pathname.split('/');
      const fileKeyIndex = pathParts.findIndex(part => part === 'design') + 1;
      const fileKey = fileKeyIndex > 0 ? pathParts[fileKeyIndex] : '';

      // Figma URL 中的 node-id 格式是 7426-25858，需要转换为 API 格式 7426:25858
      const rawNodeId = url.searchParams.get('node-id') || '';
      const nodeId = rawNodeId.replace(/-/g, ':');

      return { fileKey, nodeId };
    } catch (err) {
      throw new Error('无效的 Figma 链接格式');
    }
  };

  const addProgress = (message: string) => {
    setProgress(prev => [...prev, message]);
  };

  const validateToken = (token: string) => {
    const result = FigmaErrorHandler.validateAccessToken(token);
    setTokenValidation(result.valid ? '' : result.error || '');
    return result.valid;
  };

  const validateUrl = (url: string) => {
    const result = FigmaErrorHandler.validateFigmaUrl(url);
    setUrlValidation(result.valid ? '' : result.error || '');
    return result.valid;
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setProgress([]);
      setTokenValidation('');
      setUrlValidation('');

      // 验证输入
      addProgress('验证输入参数...');
      if (!validateToken(accessToken)) {
        throw new Error('Access Token 格式不正确');
      }
      if (!validateUrl(sectionLink)) {
        throw new Error('Figma 链接格式不正确');
      }

      addProgress('解析 Figma 链接...');
      const { fileKey, nodeId } = extractInfoFromLink(sectionLink);

      if (!fileKey || !nodeId) {
        throw new Error('无效的 Figma 链接，请确保复制了正确的节点链接');
      }

      addProgress('初始化 Figma 服务...');
      const figmaService = new FigmaService({
        accessToken,
        fileKey,
      });

      addProgress('获取 Figma 节点数据...');
      const converter = new FigmaConverter(figmaService);
      const componentData = await converter.convertToReactComponent(
        fileKey,
        nodeId
      );

      addProgress('生成 React 代码...');
      const reactCode = converter.generateReactCode(componentData);
      const fullComponent = converter.generateFullComponent(
        componentData,
        componentName
      );

      addProgress('转换完成！');
      setSuccess(true);
      onImport(reactCode, fullComponent);
    } catch (err) {
      const errorInfo = FigmaErrorHandler.handleError(err);
      setError(errorInfo);
      addProgress(`错误: ${errorInfo.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-6'>
      <h2 className='text-2xl font-bold mb-6'>从 Figma 导入</h2>

      <div className='space-y-6'>
        <div>
          <label className='block text-sm font-medium mb-2'>
            Figma Access Token
          </label>
          <input
            type='password'
            value={accessToken}
            onChange={e => setAccessToken(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            placeholder='figd_...'
          />
          <p className='text-xs text-gray-500 mt-2'>
            在 Figma Settings → Account → Personal access tokens 中生成
          </p>
        </div>

        <div>
          <label className='block text-sm font-medium mb-2'>
            Figma 节点链接
          </label>
          <input
            type='text'
            value={sectionLink}
            onChange={e => setSectionLink(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            placeholder='https://www.figma.com/design/xxx/...'
          />
          <p className='text-xs text-gray-500 mt-2'>
            右键点击 Figma 中的元素，选择 "Copy/Paste as" → "Copy link"
          </p>
        </div>

        <div>
          <label className='block text-sm font-medium mb-2'>组件名称</label>
          <input
            type='text'
            value={componentName}
            onChange={e => setComponentName(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            placeholder='FigmaComponent'
          />
          <p className='text-xs text-gray-500 mt-2'>
            生成的 React 组件名称（大写开头）
          </p>
        </div>

        {error && (
          <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
            <div className='flex items-start gap-2 mb-2'>
              <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
              <div>
                <h4 className='text-sm font-semibold text-red-900'>
                  {error.title}
                </h4>
                <p className='text-sm text-red-700 mt-1'>{error.message}</p>
              </div>
            </div>
            {error.solution && (
              <div className='mt-3 pl-7'>
                <div className='text-xs font-medium text-red-800 mb-1'>
                  解决方案:
                </div>
                <div className='text-xs text-red-700 whitespace-pre-line'>
                  {error.solution}
                </div>
              </div>
            )}
          </div>
        )}

        {tokenValidation && (
          <div className='flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
            <HelpCircle className='w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5' />
            <div className='text-xs text-yellow-700'>{tokenValidation}</div>
          </div>
        )}

        {urlValidation && (
          <div className='flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
            <HelpCircle className='w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5' />
            <div className='text-xs text-yellow-700'>{urlValidation}</div>
          </div>
        )}

        {success && (
          <div className='flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg'>
            <CheckCircle2 className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
            <div className='text-sm text-green-700'>转换成功！代码已生成。</div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || !accessToken || !sectionLink || !componentName}
          className='w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
        >
          {loading && <Loader2 className='w-5 h-5 animate-spin' />}
          {loading ? '转换中...' : '开始转换'}
        </button>

        {progress.length > 0 && (
          <div className='mt-4'>
            <h3 className='text-sm font-medium mb-3'>转换进度:</h3>
            <div className='space-y-2'>
              {progress.map((msg, index) => (
                <div
                  key={index}
                  className='flex items-start gap-2 text-xs text-gray-600'
                >
                  <span className='text-blue-500 flex-shrink-0'>
                    {index === progress.length - 1 && loading ? '⏳' : '✓'}
                  </span>
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
