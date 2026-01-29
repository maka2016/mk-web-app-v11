import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import {
  AssumeRoleCommand,
  STSClient,
  type AssumeRoleCommandOutput,
} from '@aws-sdk/client-sts';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

/**
 * 云服务提供商类型
 */
export type CloudProvider = 'aliyun' | 'aws';

/**
 * 云服务统一配置接口
 * 包含 OSS/S3 和 STS 所需的所有配置项
 */
export interface AliCloudConfig {
  provider?: CloudProvider; // 云服务提供商，默认 'aliyun'
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  roleArn?: string; // STS 需要
}

export interface STSResponse {
  hostId: string;
  bucket: string;
  uploadPath: string;
  region: string; // 云服务区域
  provider?: CloudProvider; // 云服务提供商
  credentials: {
    AccessKeyId: string;
    AccessKeySecret: string;
    SecurityToken: string;
    Expiration: string;
  };
}

/**
 * 从环境变量加载云服务配置（统一入口）
 * 延迟读取环境变量，避免在模块加载时读取
 * 支持阿里云和 AWS S3 双云服务
 */
export function loadAliCloudConfigFromEnv(): AliCloudConfig {
  // 优先使用云服务提供商配置，默认为阿里云
  const provider = (process.env.CLOUD_PROVIDER as CloudProvider) || 'aliyun';

  const accessKeyId = process.env.ALIYUN_AK_ID || process.env.AWS_ACCESS_KEY_ID;
  const accessKeySecret =
    process.env.ALIYUN_AK_SECRET || process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.OSS_MAIN_BUCKET || process.env.S3_BUCKET;
  const region = process.env.OSS_REGION || process.env.AWS_REGION;
  const roleArn = process.env.STS_ROLE_ARN || process.env.AWS_ROLE_ARN;

  if (!accessKeyId || !accessKeySecret || !bucket || !region) {
    console.error(
      '[loadAliCloudConfigFromEnv] Missing required environment variables:',
      {
        provider,
        hasAccessKeyId: !!accessKeyId,
        hasAccessKeySecret: !!accessKeySecret,
        hasBucket: !!bucket,
        hasRegion: !!region,
      }
    );

    throw new Error(
      `Missing required environment variables for ${provider}. ` +
        'For Aliyun: ALIYUN_AK_ID, ALIYUN_AK_SECRET, OSS_MAIN_BUCKET, OSS_REGION. ' +
        'For AWS: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, AWS_REGION'
    );
  }

  return {
    provider,
    accessKeyId,
    accessKeySecret,
    bucket,
    region,
    roleArn,
  };
}

/**
 * 阿里云 API 专用 URL 编码
 * 符合阿里云 API 签名规范
 * 参考：https://help.aliyun.com/document_detail/315526.html
 */
function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

/**
 * 生成阿里云 API 签名
 */
function generateSignature(
  accessKeySecret: string,
  stringToSign: string
): string {
  const hmac = crypto.createHmac('sha1', accessKeySecret + '&');
  return hmac.update(stringToSign).digest('base64');
}

/**
 * 调用阿里云 STS AssumeRole API（原生 HTTP 实现）
 */
async function callAliyunSTS(
  config: AliCloudConfig,
  roleArn: string,
  sessionName: string,
  policy: string,
  durationSeconds: number
): Promise<any> {
  // 时间戳格式：ISO 8601，去除毫秒
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const nonce = Math.random().toString(36).substring(2, 15);

  // 公共参数
  const params: Record<string, string> = {
    Format: 'JSON',
    Version: '2015-04-01',
    AccessKeyId: config.accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: timestamp,
    SignatureVersion: '1.0',
    SignatureNonce: nonce,
    // API 参数
    Action: 'AssumeRole',
    RoleArn: roleArn,
    RoleSessionName: sessionName,
    Policy: policy,
    DurationSeconds: durationSeconds.toString(),
  };

  // 按字典序排序参数，使用阿里云专用编码
  const sortedKeys = Object.keys(params).sort();
  const canonicalizedQueryString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  // 构造待签名字符串（注意：这里对 canonicalizedQueryString 再次编码）
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalizedQueryString)}`;

  // 生成签名
  const signature = generateSignature(config.accessKeySecret, stringToSign);

  // 构造请求 URL（注意：这里不对参数再次编码，直接使用原始值）
  const queryString = sortedKeys
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
  const url = `https://sts.aliyuncs.com/?${queryString}&Signature=${encodeURIComponent(signature)}`;

  console.log('[callAliyunSTS] 请求详情:', {
    timestamp,
    roleArn,
    sessionName,
  });

  // 发送请求
  const response = await fetch(url);
  const data = await response.json();

  if (data.Code) {
    console.error('[callAliyunSTS] 阿里云 API 返回错误:', {
      Code: data.Code,
      Message: data.Message,
      RequestId: data.RequestId,
    });
    throw new Error(
      `Aliyun STS Error: ${data.Code} - ${data.Message || 'Unknown error'}`
    );
  }

  console.log('[callAliyunSTS] STS token 获取成功');
  return data;
}

/**
 * 调用 AWS STS AssumeRole API（使用 AWS SDK）
 */
async function callAwsSTS(
  config: AliCloudConfig,
  roleArn: string,
  sessionName: string,
  policy: string,
  durationSeconds: number
): Promise<any> {
  const client = new STSClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.accessKeySecret,
    },
  });

  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: sessionName,
    DurationSeconds: durationSeconds,
    Policy: policy,
  });

  const result: AssumeRoleCommandOutput = await client.send(command);

  if (!result.Credentials) {
    throw new Error('Failed to get AWS STS credentials');
  }

  // 转换为统一格式
  return {
    Credentials: {
      AccessKeyId: result.Credentials.AccessKeyId!,
      AccessKeySecret: result.Credentials.SecretAccessKey!,
      SecurityToken: result.Credentials.SessionToken!,
      Expiration: result.Credentials.Expiration!.toISOString(),
    },
  };
}

/**
 * 获取 STS 临时凭证（支持阿里云和 AWS 双云服务）
 * @param config - 云服务配置
 * @param appid - 应用 ID
 * @param uid - 用户 ID
 * @param durationSeconds - 临时凭证有效期（秒），默认 3600，最小900，最大以角色设定为准
 * @returns STS 响应数据
 */
export async function getSTSToken(
  config: AliCloudConfig,
  appid: string,
  uid: number,
  durationSeconds: number = 3600
): Promise<STSResponse> {
  try {
    const roleArn = 'roleArn' in config ? config.roleArn : undefined;
    if (!roleArn) {
      throw new Error('Missing STS_ROLE_ARN in configuration');
    }

    const provider = config.provider || 'aliyun';
    const sessionName = `${appid}-user-${uid}-${Date.now()}`;
    const uploadPath = `cdn/${appid}/works-resources/${uid}/`;

    let result: any;

    // 根据云服务提供商选择不同的实现
    if (provider === 'aws') {
      // AWS S3 策略
      const awsPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              's3:PutObject',
              's3:GetObject',
              's3:DeleteObject',
              's3:ListBucket',
            ],
            Resource: [
              `arn:aws:s3:::${config.bucket}/${uploadPath}*`,
              `arn:aws:s3:::${config.bucket}`,
            ],
          },
        ],
      });

      result = await callAwsSTS(
        config,
        roleArn,
        sessionName,
        awsPolicy,
        durationSeconds
      );
    } else {
      // 阿里云 OSS 策略
      const aliyunPolicy = JSON.stringify({
        Version: '1',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'oss:PutObject',
              'oss:GetObject',
              'oss:DeleteObject',
              'oss:ListObjects',
            ],
            Resource: [
              `acs:oss:*:*:${config.bucket}/${uploadPath}*`,
              `acs:oss:*:*:${config.bucket}/${uploadPath}`,
            ],
          },
        ],
      });

      result = await callAliyunSTS(
        config,
        roleArn,
        sessionName,
        aliyunPolicy,
        durationSeconds
      );
    }

    if (!result.Credentials) {
      throw new Error(`Failed to get STS credentials from ${provider} API`);
    }

    // 构造 endpoint
    let hostId: string;
    if (provider === 'aws') {
      // AWS S3 endpoint
      hostId = `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
    } else {
      // 阿里云 OSS endpoint
      const region = config.region || 'oss-cn-beijing';
      hostId = `https://${config.bucket}.${region}.aliyuncs.com`;
    }

    return {
      hostId,
      bucket: config.bucket,
      uploadPath,
      region: config.region, // 返回 region 供客户端使用
      provider: provider, // 返回 provider 供客户端识别云服务类型
      credentials: {
        AccessKeyId: result.Credentials.AccessKeyId,
        AccessKeySecret: result.Credentials.AccessKeySecret,
        SecurityToken: result.Credentials.SecurityToken,
        Expiration: result.Credentials.Expiration,
      },
    };
  } catch (error) {
    console.error('[getSTSToken] Failed to generate STS token:', error);

    // 提供更详细的错误信息
    if (error instanceof Error) {
      const errorMsg = error.message;
      console.error('[getSTSToken] 错误详情:', errorMsg);
      console.error('[getSTSToken] 配置检查:');
      console.error(`- provider: ${config.provider || 'aliyun'}`);
      console.error(`- roleArn: ${config.roleArn}`);
      console.error(`- region: ${config.region}`);
      console.error(`- bucket: ${config.bucket}`);
      console.error(
        `- accessKeyId: ${config.accessKeyId?.substring(0, 10)}...`
      );

      throw new Error(`Failed to generate STS token: ${errorMsg}`);
    }

    throw new Error(`Failed to generate STS token: ${error}`);
  }
}

/**
 * 创建 OSS 客户端（使用 AWS SDK S3Client）
 * 注意：仅在服务端使用，不要暴露给前端
 */
export function createOSSClient(config: AliCloudConfig): S3Client {
  const formattedRegion = config.region.startsWith('oss-')
    ? config.region
    : `oss-${config.region}`;

  let endpoint: string;
  const lanEndpoint = process.env.OSS_LAN_ENDPOINT;

  if (lanEndpoint) {
    endpoint = lanEndpoint.startsWith('http')
      ? lanEndpoint
      : `https://${lanEndpoint}`;
  } else {
    endpoint = `https://${formattedRegion}.aliyuncs.com`;
  }

  return new S3Client({
    region: formattedRegion,
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.accessKeySecret,
    },
    forcePathStyle: false,
  });
}

/**
 * 上传文件到 OSS
 * @param client - S3 客户端
 * @param bucket - bucket 名称
 * @param key - OSS 路径
 * @param file - 文件内容（Buffer 或 字符串）
 * @returns 上传结果
 */
export async function uploadFile(
  client: S3Client,
  bucket: string,
  key: string,
  file: Buffer | string
) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
    });

    const result = await client.send(command);

    const endpoint = (client.config.endpoint as any)?.();
    const url = endpoint
      ? `${endpoint.protocol}//${bucket}.${endpoint.hostname}/${key}`
      : `https://${bucket}.oss-cn-beijing.aliyuncs.com/${key}`;

    return {
      name: key,
      url: url,
      res: result,
    };
  } catch (error) {
    console.error('[uploadFile] Failed to upload:', key, error);
    throw new Error(`Failed to upload file: ${error}`);
  }
}

/**
 * 获取 OSS 对象
 * @param client - S3 客户端
 * @param bucket - bucket 名称
 * @param key - OSS 路径
 * @returns 对象内容
 */
export async function getObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<{ content: Buffer }> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const result = await client.send(command);

    const chunks: Uint8Array[] = [];
    for await (const chunk of result.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return {
      content: buffer,
    };
  } catch (error) {
    console.error('[getObject] Failed to get:', key, error);
    throw new Error(`Failed to get object: ${error}`);
  }
}

/**
 * 列出 OSS 对象
 * @param client - S3 客户端
 * @param bucket - bucket 名称
 * @param prefix - 前缀
 * @param marker - 分页标记
 * @param maxKeys - 最大返回数量
 * @returns 对象列表
 */
export async function listObjects(
  client: S3Client,
  bucket: string,
  prefix?: string,
  marker?: string,
  maxKeys: number = 1000
): Promise<{
  objects: Array<{ name: string; size?: number; lastModified?: Date }>;
  nextMarker?: string;
  isTruncated: boolean;
}> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: marker,
      MaxKeys: maxKeys,
    });

    const result: ListObjectsV2CommandOutput = await client.send(command);

    const objects = (result.Contents || []).map(item => ({
      name: item.Key!,
      size: item.Size,
      lastModified: item.LastModified,
    }));

    return {
      objects,
      nextMarker: result.NextContinuationToken,
      isTruncated: result.IsTruncated || false,
    };
  } catch (error) {
    console.error('[listObjects] Failed to list:', prefix, error);
    throw new Error(`Failed to list objects: ${error}`);
  }
}

/**
 * 删除 OSS 文件
 */
export async function deleteFile(
  client: S3Client,
  bucket: string,
  key: string
) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const result = await client.send(command);
    return result;
  } catch (error) {
    console.error('[deleteFile] Failed to delete:', key, error);
    throw new Error(`Failed to delete file: ${error}`);
  }
}

/**
 * 生成签名URL（用于临时访问私有文件）
 * @param client - S3 客户端
 * @param bucket - bucket 名称
 * @param key - OSS 路径
 * @param expires - 过期时间（秒），默认3600秒
 * @returns 签名URL
 */
export async function generateSignedUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expires: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn: expires });
    return url;
  } catch (error) {
    console.error(
      '[generateSignedUrl] Failed to generate signed URL:',
      key,
      error
    );
    throw new Error(`Failed to generate signed URL: ${error}`);
  }
}
