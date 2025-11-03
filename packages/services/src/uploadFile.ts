import { API } from './apis';
import { request2 } from './request';

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
  const response = await request2.post(`${getBaseUrl()}/user-folders`, {
    name,
    parentId,
  });
  return response.data;
};

export const updateFolder = async (id: number, name: string) => {
  const response = await request2.put(`${getBaseUrl()}/user-folders/${id}`, {
    name,
  });
  return response.data;
};

export const deleteFolder = async (id: number) => {
  const response = await request2.delete(`${getBaseUrl()}/user-folders/${id}`);
  return response.data;
};

export const getFolders = async (parentId?: number) => {
  const response = await request2.get<FolderItem[]>(
    `${getBaseUrl()}/user-folders${parentId ? `?parentId=${parentId}` : ''}`
  );
  return response.data;
};

// File APIs
export interface UploadFileParams {
  folderId?: number;
  worksId?: string;
  originName?: string;
  type?: 'picture' | 'music';
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

  const response = await request2.post<FileItem>(
    `${getBaseUrl()}/user-files/upload/stream`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept-Charset': 'utf-8',
      },
    }
  );
  return response.data;
};

export const deleteFile = async (id: number, targetFolderId: number) => {
  const response = await request2.delete(`${getBaseUrl()}/user-files/${id}`, {
    data: { targetFolderId },
  });
  return response.data;
};

export const getFiles = async (params: {
  folderId?: number;
  worksId?: string;
  page?: number;
  pageSize?: number;
  ignoreIsInternalDesigner?: string;
  type?: 'picture' | 'music';
}) => {
  const {
    folderId,
    worksId,
    page = 1,
    pageSize = 10,
    ignoreIsInternalDesigner,
    type,
  } = params;
  const response = await request2.get<{
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
  return response.data;
};

export const moveFile = async (id: number, targetFolderId: number) => {
  const response = await request2.put(`${getBaseUrl()}/user-files/${id}`, {
    targetFolderId,
  });
  return response.data;
};
