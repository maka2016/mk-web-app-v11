import {
  createOSSClient,
  getObject,
  listObjects,
  loadAliCloudConfigFromEnv,
  uploadFile,
} from './oss-client-for-node-server';
import { getTemplateAssetsPath } from './works-storage';

/**
 * 获取用户作品资源路径
 */
export const getUserWorksAssetsPath = (uid: number, worksId: string) => {
  return `res/works-resources/${uid}/works/${worksId}`;
};

/**
 * 复制作品的 OSS 资源
 * @param sourceUid - 源用户ID
 * @param sourceWorksId - 源作品ID
 * @param destinationWorksId - 目标作品ID
 * @param targetUid - 目标用户ID（可选，默认与源用户相同）
 */
export async function copyWorksAssets(
  sourceUid: number,
  sourceWorksId: string,
  destinationWorksId: string,
  targetUid?: number
): Promise<void> {
  const sourcePrefix = getUserWorksAssetsPath(sourceUid, sourceWorksId);
  const destinationPrefix = getUserWorksAssetsPath(
    targetUid || sourceUid,
    destinationWorksId
  );

  await copyFilesFromAToBConcurrently(sourcePrefix, destinationPrefix);
}

/**
 * 复制模板资源到作品
 * @param uid - 用户ID
 * @param worksId - 作品ID
 * @param templateId - 模板ID
 */
export async function copyTemplateToWorksAssets(
  uid: number,
  worksId: string,
  templateId: string
): Promise<void> {
  console.log('[copyTemplateToWorksAssets] Start copying template to works:', {
    uid,
    worksId,
    templateId,
  });

  const sourcePrefix = getTemplateAssetsPath(templateId);
  const destinationPrefix = getUserWorksAssetsPath(uid, worksId);

  await copyFilesFromAToBConcurrently(sourcePrefix, destinationPrefix);

  console.log(
    '[copyTemplateToWorksAssets] Successfully copied template to works'
  );
}

/**
 * 复制作品资源到模板
 * @param uid - 用户ID
 * @param worksId - 作品ID
 * @param templateId - 模板ID
 */
export async function copyWorksToTemplateAssets(
  uid: number,
  worksId: string,
  templateId: string
): Promise<void> {
  console.log('[copyWorksToTemplateAssets] Start copying works to template:', {
    uid,
    worksId,
    templateId,
  });

  const sourcePrefix = getUserWorksAssetsPath(uid, worksId);
  const destinationPrefix = getTemplateAssetsPath(templateId);

  await copyFilesFromAToBConcurrently(sourcePrefix, destinationPrefix);

  console.log(
    '[copyWorksToTemplateAssets] Successfully copied works to template'
  );
}

/**
 * 并发复制文件从源路径到目标路径
 */
async function copyFilesFromAToBConcurrently(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  try {
    console.log('[copyFilesFromAToBConcurrently] Starting copy operation:', {
      sourcePath,
      targetPath,
    });

    const config = loadAliCloudConfigFromEnv();
    const ossClient = createOSSClient(config);
    const bucket = config.bucket;

    let marker: string | undefined = undefined;
    let batchCount = 0;
    let totalFiles = 0;

    do {
      batchCount++;
      const list = await listObjects(
        ossClient,
        bucket,
        sourcePath,
        marker,
        1000
      );

      if (list.objects && list.objects.length > 0) {
        console.log(
          `[copyFilesFromAToBConcurrently] Batch ${batchCount}: Copying ${list.objects.length} files`
        );

        const copyPromises = list.objects.map(async (file, index) => {
          try {
            if (!file.name) {
              throw new Error(
                `File object missing name property at index ${index}`
              );
            }

            const sourceKey = file.name;
            const destinationKey = sourceKey.replace(sourcePath, targetPath);

            const result = await getObject(ossClient, bucket, sourceKey);
            await uploadFile(ossClient, bucket, destinationKey, result.content);
          } catch (error) {
            console.error(
              `[copyFilesFromAToBConcurrently] Failed to copy file ${index + 1}:`,
              error
            );
            // 继续复制其他文件，不抛出错误
          }
        });

        await Promise.all(copyPromises);
        totalFiles += list.objects.length;
      }

      marker = list.nextMarker;
    } while (marker);

    console.log('[copyFilesFromAToBConcurrently] Copy completed:', {
      totalBatches: batchCount,
      totalFiles,
    });
  } catch (error) {
    console.error(
      '[copyFilesFromAToBConcurrently] Copy operation failed:',
      error
    );

    if (error instanceof Error) {
      const enhancedError = new Error(
        `Failed to copy works assets: ${error.message}`
      );
      enhancedError.stack = `${enhancedError.stack}\n\nOriginal error:\n${error.stack}`;
      throw enhancedError;
    } else {
      throw new Error(`Failed to copy works assets: ${error}`);
    }
  }
}
