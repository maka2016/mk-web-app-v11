import { API } from './apis';
import request, { getAppId, getToken, getUid } from './request';
import { startupStsOssClient, uploadFileToOSS } from './sts-client';

const getBaseUrl = () => {
  return API('apiv10');
  // "https://staging-apiv10.maka.im";
  // return "https://staging-apiv10.maka.im";
};

export interface FolderItem {
  id: number;
  appid: string;
  uid: number;
  name: string;
  isInternalDesigner: number;
  createdAt: string;
  updatedAt: string;
  /** 父级id */
  parentId?: FolderItem['id'];
}

export interface FileItem {
  id: number;
  appid: string;
  uid: number;
  folderId: number;
  worksId: string;
  ossKey: string;
  originName: string;
  type: string;
  mimeType: string;
  size: string;
  url: string;
}

// Folder APIs
export const createFolder = async (name: string, parentId?: number) => {
  const response = await request.post(`${getBaseUrl()}/user-folders`, {
    name,
    parentId,
  });
  return response;
};

export const updateFolder = async (id: number, name: string) => {
  const response = await request.put(`${getBaseUrl()}/user-folders/${id}`, {
    name,
  });
  return response;
};

export const deleteFolder = async (id: number) => {
  const response = await request.delete(`${getBaseUrl()}/user-folders/${id}`);
  return response;
};

export const getFolders = async (parentId?: number) => {
  const response = await request.get<FolderItem[]>(
    `${getBaseUrl()}/user-folders${parentId ? `?parentId=${parentId}` : ''}`
  );
  return response;
};

// File APIs
export interface UploadFileParams {
  folderId?: number;
  worksId?: string;
  originName?: string;
  type?: 'picture' | 'music' | 'video';
  file: File;
  shareToCommunity?: boolean;
}

export const uploadFile = async (params: UploadFileParams) => {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('folderId', String(params.folderId || 0));
  if (params.worksId) formData.append('worksId', params.worksId);
  formData.append('originName', params.originName || params.file.name);
  formData.append('type', params.type || 'picture');
  if (params.shareToCommunity !== undefined) {
    formData.append('shareToCommunity', String(params.shareToCommunity));
  }

  const response = await request.post<FileItem>(`${getBaseUrl()}/user-files/upload/stream`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Accept-Charset': 'utf-8',
    },
  });
  return response;
};

export const deleteFile = async (id: number, targetFolderId: number) => {
  const response = await request.delete(`${getBaseUrl()}/user-files/${id}`, {
    data: { targetFolderId },
  });
  return response;
};

export const getFiles = async (params: {
  folderId?: number;
  worksId?: string;
  page?: number;
  pageSize?: number;
  ignoreIsInternalDesigner?: string;
  type?: 'picture' | 'music';
}) => {
  const { folderId, worksId, page = 1, pageSize = 10, ignoreIsInternalDesigner, type } = params;
  const response = await request.get<{
    data: FileItem[];
    meta: {
      pagination: {
        total: number;
        page: number;
        pageSize: number;
        pageCount: number;
      };
    };
  }>(`${getBaseUrl()}/user-files`, {
    params: {
      folderId,
      worksId,
      page,
      pageSize,
      ignoreIsInternalDesigner,
      type,
    },
  });
  return response;
};

export const moveFile = async (id: number, targetFolderId: number): Promise<unknown> => {
  const response = await request.put(`${getBaseUrl()}/user-files/${id}`, {
    targetFolderId,
  });
  // 拦截器已经返回了 data，不需要再访问 .data
  return response;
};

/**
 * 使用 STS OSS 直接上传文件（不经过后端中转）
 * @param params 上传参数
 * @param onProgress 上传进度回调
 * @returns 文件信息
 */
export const uploadFile2 = async (params: UploadFileParams, onProgress?: (progress: number) => void) => {
  const { file, folderId = 0, worksId, originName, type = 'picture', shareToCommunity } = params;

  // 1. 初始化 STS OSS 客户端
  const appid = getAppId();
  const uid = getUid();
  const token = getToken();

  const ossClientData = await startupStsOssClient({
    appid,
    uid,
    token,
  });

  // 2. 生成文件路径
  const getFileExtension = (filename: string) => {
    const reg = /\.[^.]+$/;
    const matches = reg.exec(filename);
    return matches ? matches[0] : '';
  };

  const timestamp = new Date().valueOf();
  const extension = getFileExtension(file.name);
  const fileName = `${timestamp}${extension}`;

  // 根据类型决定文件夹
  const folder = type === 'music' ? 'musics' : type === 'video' ? 'videos' : 'timages';
  const ossKey = `${folder}/${fileName}`;

  // 3. 直接上传文件到 OSS
  const uploadResult = await uploadFileToOSS(file, ossKey, onProgress);

  // 直接返回地址即可
  return {
    url: uploadResult.url,
    name: ossKey,
  };
};
