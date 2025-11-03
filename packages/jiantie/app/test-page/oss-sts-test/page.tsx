'use client';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { cdnApi, startupStsOssClient } from '@mk/services';
import { Button } from '@workspace/ui/components/button';
import { useState } from 'react';

export default function OSSSTSTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appid, setAppid] = useState('jiantie');
  const [uid, setUid] = useState('123');
  const [token, setToken] = useState('backdoor'); // 默认使用后门token用于开发测试
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const testGetSTS = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await startupStsOssClient({ appid, uid, token });
      console.log('data', data);

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testPostSTS = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await startupStsOssClient({ appid, uid, token });
      console.log('data', data);

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      // 动态导入 ali-oss（避免 SSR 问题）
      // 获取 STS 凭证
      const response = await fetch(`/api/oss-sts?appid=${appid}&uid=${uid}`, {
        headers: {
          token: token,
        },
      });
      const stsData = await response.json();

      if (!response.ok) {
        throw new Error(stsData.error || 'Failed to get STS token');
      }

      // 创建 OSS 客户端
      const { client } = await startupStsOssClient({ appid, uid, token });

      // 上传文件（带进度）
      const fileName = `${stsData.uploadPath}${Date.now()}-${file.name}`;
      const uploadRes = await client.send(
        new PutObjectCommand({
          Bucket: stsData.bucket,
          Key: fileName,
          Body: file,
        })
      );

      setUploadResult(uploadRes);
      setResult(stsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-8 max-w-4xl mx-auto'>
      <h1 className='text-2xl font-bold mb-6'>OSS STS 服务测试</h1>

      <div className='mb-6 space-y-4'>
        <div className='flex gap-4 items-center'>
          <label className='font-medium w-24'>应用 APPID:</label>
          <input
            type='text'
            value={appid}
            onChange={e => setAppid(e.target.value)}
            className='border rounded px-3 py-1.5 w-40'
            placeholder='输入应用ID'
          />
        </div>
        <div className='flex gap-4 items-center'>
          <label className='font-medium w-24'>用户 UID:</label>
          <input
            type='text'
            value={uid}
            onChange={e => setUid(e.target.value)}
            className='border rounded px-3 py-1.5 w-40'
            placeholder='输入用户ID'
          />
        </div>
        <div className='flex gap-4 items-center'>
          <label className='font-medium w-24'>Token:</label>
          <input
            type='text'
            value={token}
            onChange={e => setToken(e.target.value)}
            className='border rounded px-3 py-1.5 flex-1'
            placeholder='输入用户Token (开发测试可用 backdoor)'
          />
        </div>
        <div className='text-sm text-amber-600 bg-amber-50 p-2 rounded'>
          ⚠️ 开发测试：使用 <code className='bg-amber-100 px-1'>backdoor</code>{' '}
          作为 token 可绕过验证
        </div>
      </div>

      <div className='flex gap-4 mb-6'>
        <Button onClick={testGetSTS} disabled={loading}>
          {loading ? '请求中...' : '测试 GET 请求'}
        </Button>
        <Button onClick={testPostSTS} disabled={loading}>
          {loading ? '请求中...' : '测试 POST 请求'}
        </Button>
      </div>

      <div className='mb-6'>
        <label className='block font-medium mb-2'>测试文件上传:</label>
        <input
          type='file'
          onChange={testUploadFile}
          disabled={loading}
          className='border rounded px-3 py-1.5'
        />
        {loading && uploadProgress > 0 && (
          <div className='mt-2'>
            <p className='text-sm text-gray-600'>上传进度: {uploadProgress}%</p>
            <div className='w-full bg-gray-200 rounded h-2 mt-1'>
              <div
                className='bg-blue-600 h-2 rounded transition-all'
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4'>
          <p className='font-bold'>错误:</p>
          <p>{error}</p>
        </div>
      )}

      {uploadResult && (
        <div className='bg-green-50 border border-green-200 rounded p-4 mb-4'>
          <p className='font-bold text-green-800 mb-2'>✅ 文件上传成功！</p>
          <div className='bg-white p-4 rounded'>
            <p className='text-sm mb-1'>
              <strong>文件名:</strong>
              <a
                href={cdnApi(uploadResult.name)}
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:underline break-all'
              >
                {uploadResult.name}
              </a>
            </p>
            <p className='text-sm mb-1'>
              <strong>URL:</strong>{' '}
              <a
                href={uploadResult.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:underline break-all'
              >
                {uploadResult.url}
              </a>
            </p>
            <p className='text-sm text-gray-500 mt-2'>
              状态码: {uploadResult.res?.status}
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className='bg-green-50 border border-green-200 rounded p-4'>
          <p className='font-bold text-green-800 mb-2'>成功获取 STS Token:</p>
          <pre className='bg-white p-4 rounded overflow-auto text-sm'>
            {JSON.stringify(result, null, 2)}
          </pre>

          <div className='mt-4 p-4 bg-blue-50 rounded'>
            <p className='font-bold text-blue-800 mb-2'>关键信息:</p>
            <ul className='list-disc list-inside space-y-1 text-sm'>
              <li>
                <strong>Bucket:</strong> {result.bucket}
              </li>
              <li>
                <strong>上传路径:</strong> {result.uploadPath}
              </li>
              <li>
                <strong>OSS Endpoint:</strong> {result.hostId}
              </li>
              <li>
                <strong>过期时间:</strong> {result.credentials?.Expiration}
              </li>
            </ul>
          </div>
        </div>
      )}

      <div className='mt-8 p-4 bg-gray-50 rounded'>
        <h2 className='font-bold mb-2'>使用说明:</h2>
        <ol className='list-decimal list-inside space-y-2 text-sm'>
          <li>确保已配置所需的环境变量（参考 README.md）</li>
          <li>输入测试用的用户ID</li>
          <li>点击按钮测试 GET 或 POST 请求</li>
          <li>查看返回的 STS 临时凭证信息</li>
        </ol>

        <h3 className='font-bold mt-4 mb-2'>必需的环境变量:</h3>
        <ul className='list-disc list-inside space-y-1 text-sm text-gray-700'>
          <li>aliyun_ak_id (阿里云 AccessKey ID)</li>
          <li>aliyun_ak_secret (阿里云 AccessKey Secret)</li>
          <li>sts_role_arn (RAM 角色 ARN)</li>
          <li>oss_main_bucket (OSS Bucket 名称)</li>
          <li>oss_region (OSS 地域，可选，默认 oss-cn-beijing)</li>
          <li>nest_user_center (用户中心服务地址，用于 token 验证)</li>
        </ul>

        <h3 className='font-bold mt-4 mb-2'>OSS 路径规划:</h3>
        <p className='text-sm text-gray-700'>
          文件存储路径格式：
          <code className='bg-gray-200 px-1 py-0.5 rounded ml-1'>
            {'{APPID}/{UID}/资源文件'}
          </code>
        </p>
        <p className='text-sm text-gray-500 mt-1'>
          示例：jiantie/123/1234567890-photo.jpg
        </p>
      </div>
    </div>
  );
}
