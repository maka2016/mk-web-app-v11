import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getAppId } from './env';
import { getToken, getUid } from './request';

let ossClientData: {
  client: S3Client;
  clientInfo: {
    region: string;
    endpoint: string;
    accessKeyId: string;
    accessKeySecret: string;
    stsToken: string;
    bucket: string;
  };
  uploadPath: string;
  bucket: string;
};

/**
 * 初始化 STS OSS 客户端（使用 AWS SDK S3Client）
 */
export async function startupStsOssClient(
  payload: {
    appid: string;
    uid: string;
    token: string;
  },
  resetClient = false,
  retryTime = 0
) {
  const { appid = getAppId(), uid = getUid(), token = getToken() } = payload;
  if (!resetClient && ossClientData) return ossClientData;

  const response = await fetch('/api/oss-sts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify({
      appid,
      uid,
      duration: 3600,
    }),
  });
  const res = await response.json();
  console.log('res', res);

  if (retryTime > 3) {
    throw new Error('oss client error');
  }

  if ((res as any).message === 'tokenError') {
    return await startupStsOssClient(payload, true, retryTime + 1);
  }

  const region = 'oss-cn-beijing'; // 后续要改造接口从接口返回拿
  const endpoint = res.hostId || `https://${res.bucket}.${region}.aliyuncs.com`;

  const clientInfo = {
    region,
    endpoint,
    accessKeyId: res.credentials.AccessKeyId,
    accessKeySecret: res.credentials.AccessKeySecret,
    stsToken: res.credentials.SecurityToken,
    bucket: res.bucket,
  };

  // 创建 S3 客户端（使用 AWS SDK）
  const client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: res.credentials.AccessKeyId,
      secretAccessKey: res.credentials.AccessKeySecret,
      sessionToken: res.credentials.SecurityToken,
    },
    forcePathStyle: false,
  });

  ossClientData = {
    client,
    clientInfo,
    uploadPath: res.uploadPath,
    bucket: res.bucket,
  };

  return ossClientData;
}

/**
 * 上传文件到 OSS（使用 AWS SDK）
 * 兼容原有的 ali-oss multipartUpload API
 */
export async function uploadFileToOSS(
  file: File | Blob,
  path: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; name: string }> {
  try {
    const { client, uploadPath, bucket, clientInfo } = ossClientData;

    if (!client) {
      throw new Error(
        'OSS client not initialized. Call startupStsOssClient first.'
      );
    }

    const fullPath = `${uploadPath}${path}`;

    // 将 File/Blob 转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 模拟进度开始
    if (onProgress) {
      onProgress(0.1);
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fullPath,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    });

    await client.send(command);

    // 模拟进度完成
    if (onProgress) {
      onProgress(1);
    }

    // 构建 URL
    const url = `${clientInfo.endpoint}/${fullPath}`;

    return {
      url,
      name: fullPath,
    };
  } catch (error) {
    console.error('Upload file to OSS failed:', error);
    throw error;
  }
}

/**
 * 获取当前 OSS 客户端数据
 */
export function getOssClientData() {
  return ossClientData;
}

/**
 * 清除 OSS 客户端缓存
 */
export function clearOssClient() {
  ossClientData = null as any;
}
