import axios from 'axios';

// 定义用户角色类型
export interface UserRole {
  id: number;
  uid: string;
  appid: string;
  roleAlias: string;
  validFrom: string;
  validTo: string;
  status: number;
  createdAt: string;
}

export interface DesignerConfig {
  uid: number;
  appid: string;
  fullName: string;
  isDesigner: boolean;
  roles: UserRole[];
}
const getApi = () => {
  const isDev = process.env.NODE_ENV === 'development';
  // return 'http://172.16.253.5:31263';
  if (isDev) {
    return 'http://172.16.253.5:31263';
  }
  return 'http://nest-user-center:3000';
};

/**
 * 服务端的获取设计师信息，不能在浏览器调用
 */
export const getDesignerInfoInServer = async ({
  uid,
  appid,
}: {
  uid: string;
  appid: string;
}) => {
  // 构建API URL
  const apiUrl = `${getApi()}/users/v2/${uid}`;
  console.log('apiUrl', apiUrl);

  // 调用外部API
  const response = await axios.get(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
  return response.data as Promise<DesignerConfig>;
};

/**
 * for client
 */
export const getDesignerInfoForClient = async ({
  uid,
  appid,
}: {
  uid: string;
  appid: string;
}) => {
  const res = await axios.get(
    `/api/check-is-designer?appid=${appid}&uid=${uid}`
  );
  const data = await res.data;
  return data;
};
