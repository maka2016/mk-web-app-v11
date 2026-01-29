import { API, getUid, request } from '../../services';

export interface FolderItem {
  uid: number;
  name: string;
  sort: number;
  id: number;
  folder_id: number;
  is_protect: number;
}

export interface FoldersResponse {
  success: number;
  code: number;
  message: string;
  data: FolderItem[];
}

export interface FileItem {
  id: number;
  name: string;
  url: string;
}

export interface FilesResponse {
  success: number;
  code: number;
  message: string;
  data: {
    perPage: number;
    pageNumber: number;
    dataList: FileItem[];
  };
}

export const getUserFoldersLegacy = async (uid?: string) => {
  const res = await request.get(
    `${API('查询服务API')}/api/v1/users/${uid}/image_folders?page_number=0&per_page=100`,
    {}
  );
  return res.data;
};

export const getMyPicsLegacy = async (uid: string, folderId: number, pageNum: number, pageSize: number) => {
  const res = await request.get(
    `${API('查询服务API')}/api/v1/users/${uid}/images?per_page=${pageSize}&page_number=${pageNum}&folder_id=${folderId}&hybrid_force_folder=1`,
    {}
  );
  return res.data;
};
export const deletePicOnServerLegacy = async (imageIds: Array<string>, destFolderId: number) => {
  // https://queryservice.maka.im/api/v1/users/10080702/image_folders/97559961/images
  return await request.delete(`${API('查询服务API')}/api/v1/users/${getUid()}/image_folders/${destFolderId}/images`, {
    data: {
      image_ids: imageIds.join(','),
    },
  });
};

export const queryRootFolderIdLegacy = async () => {
  let rootFolderId = 'root';
  const res = await request.get(
    `${API('查询服务API')}/api/v1/users/${getUid()}/image_folders?page_number=0&per_page=100`,
    {}
  );
  const { data } = res;
  if (Array.isArray(data) && data.length > 0) {
    data.forEach(item => {
      if (item.name === 'root') {
        rootFolderId = item.folder_id;
      }
    });
  }
  return rootFolderId;
};

export const syncPicToUserLib = async (folderId: string, ossPath: string) => {
  // ${API('查询服务API')}/api/v1/users/10080702/images
  return await request.post(`${API('查询服务API')}/api/v1/users/${getUid()}/images`, {
    folder_id: folderId,
    url: ossPath,
  });
};
