import { getAppId } from '../services';

interface CompressOptions {
  maxWidth?: number; // 默认最大宽度 3000
  maxHeight?: number; // 默认最大高度 3000
  fileName?: string;
  throwOnUnsupported?: boolean;
}

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/jpg'];

export async function compressImg(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<File | null> {
  const {
    maxWidth = 3000,
    maxHeight = 3000,
    fileName,
    throwOnUnsupported = false,
  } = options;

  if (getAppId() === 'maka') {
    return file as File;
  }

  const mimeType = file.type;

  // ❌ 跳过不支持的类型（例如 png/gif/heic），只压缩 JPEG 格式
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    // if (throwOnUnsupported) {
    //   throw new Error(`不支持的图片格式：${mimeType}`);
    // }
    return file as File;
  }

  const imageBitmap = await createImageBitmap(file);
  const { width, height } = imageBitmap;

  // ✅ 若尺寸已在最大限制内，无需压缩，直接返回原始 File（或转成 JPEG 格式）
  const withinSize = width <= maxWidth && height <= maxHeight;
  if (withinSize && mimeType === 'image/jpeg' && file instanceof File) {
    return file;
  }

  // ✅ 否则进行压缩
  let targetWidth = width;
  let targetHeight = height;

  if (width > maxWidth) {
    targetHeight = (height * maxWidth) / width;
    targetWidth = maxWidth;
  }
  if (targetHeight > maxHeight) {
    targetWidth = (targetWidth * maxHeight) / targetHeight;
    targetHeight = maxHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(targetWidth);
  canvas.height = Math.round(targetHeight);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不支持');

  ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

  const outputBlob = await new Promise<Blob>(resolve =>
    canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9)
  );

  const outputName =
    fileName ||
    (file instanceof File
      ? replaceExtension(file.name, 'jpg')
      : 'compressed.jpg');

  return new File([outputBlob], outputName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

function replaceExtension(fileName: string, newExt: string): string {
  return fileName.replace(/\.[^/.]+$/, '') + '.' + newExt;
}
