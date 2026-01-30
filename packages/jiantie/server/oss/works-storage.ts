import { IWorksData } from '@/components/GridEditorV3/works-store/types';
import {
  createOSSClient,
  getObject,
  loadAliCloudConfigFromEnv,
  uploadFile,
} from './oss-client-for-node-server';

/**
 * 生成用户作品数据存储路径
 */
export const wrapUserWorksDataStoragePath = ({
  uid,
  worksId,
  version,
}: {
  uid: number;
  worksId: string;
  version: string;
}) => {
  return `res/works-resources/${uid}/works/${worksId}/${version}.json`;
};

/**
 * 获取模板资源路径
 */
export const getTemplateAssetsPath = (template_id: string) => {
  return `res/template/${template_id}`;
};

/**
 * 从 OSS 获取作品数据
 * @param worksId - 作品ID
 * @param uid - 用户ID
 * @param version - 版本号（默认 'latest'）
 */
export async function getWorksDataFromOSS(
  worksId: string,
  uid: number,
  version: string = 'latest'
): Promise<IWorksData> {
  try {
    const config = loadAliCloudConfigFromEnv();
    const ossClient = createOSSClient(config);
    const storagePath = wrapUserWorksDataStoragePath({ uid, worksId, version });

    const result = await getObject(ossClient, config.bucket, storagePath);
    return JSON.parse(result.content.toString());
  } catch (error) {
    console.error(
      '[getWorksDataFromOSS] Failed:',
      { worksId, uid, version },
      error
    );
    throw new Error(`Failed to get works data: ${error}`);
  }
}

/**
 * 保存作品数据到 OSS
 * @param worksId - 作品ID
 * @param uid - 用户ID
 * @param version - 版本号
 * @param worksData - 作品数据
 */
export async function saveWorksDataToOSS(
  worksId: string,
  uid: number,
  version: string,
  worksData: any
): Promise<void> {
  try {
    const config = loadAliCloudConfigFromEnv();
    const ossClient = createOSSClient(config);

    const content =
      typeof worksData === 'string' ? worksData : JSON.stringify(worksData);
    const savePath = wrapUserWorksDataStoragePath({ uid, worksId, version });

    await uploadFile(ossClient, config.bucket, savePath, Buffer.from(content));

    // 同时更新 latest.json
    const latestPath = wrapUserWorksDataStoragePath({
      uid,
      worksId,
      version: 'latest',
    });
    await uploadFile(
      ossClient,
      config.bucket,
      latestPath,
      Buffer.from(content)
    );
  } catch (error) {
    console.error(
      '[saveWorksDataToOSS] Failed:',
      { worksId, uid, version },
      error
    );
    throw new Error(`Failed to save works data: ${error}`);
  }
}

/**
 * 从 OSS 获取模板数据
 */
export async function getTemplateDataFromOSS(
  template_id: string
): Promise<any> {
  try {
    const config = loadAliCloudConfigFromEnv();
    const ossClient = createOSSClient(config);
    const storagePath = `${getTemplateAssetsPath(template_id)}/latest.json`;

    const result = await getObject(ossClient, config.bucket, storagePath);
    return JSON.parse(result.content.toString());
  } catch (error) {
    console.error('[getTemplateDataFromOSS] Failed:', template_id, error);
    throw new Error(`Failed to get template data: ${error}`);
  }
}

/**
 * 保存模板数据到 OSS
 * @param template_id - 模板ID
 * @param version - 版本号
 * @param templateData - 模板数据
 */
export async function saveTemplateDataToOSS(
  template_id: string,
  version: string | number,
  templateData: any
): Promise<void> {
  try {
    const config = loadAliCloudConfigFromEnv();
    const ossClient = createOSSClient(config);

    const content =
      typeof templateData === 'string'
        ? templateData
        : JSON.stringify(templateData);

    // 保存版本化的文件
    const versionPath = `${getTemplateAssetsPath(template_id)}/${version}.json`;
    await uploadFile(
      ossClient,
      config.bucket,
      versionPath,
      Buffer.from(content)
    );

    // 同时更新 latest.json
    const latestPath = `${getTemplateAssetsPath(template_id)}/latest.json`;
    await uploadFile(
      ossClient,
      config.bucket,
      latestPath,
      Buffer.from(content)
    );
  } catch (error) {
    console.error('[saveTemplateDataToOSS] Failed:', template_id, error);
    throw new Error(`Failed to save template data: ${error}`);
  }
}
