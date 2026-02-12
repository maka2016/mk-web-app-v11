import axios from 'axios';
import { log } from '../logger';
import { verifyToken } from './social-auth';

export interface TokenValidationResult {
  isValid: boolean;
  uid: number | null;
  appid: string | null;
  token: string | null;
  error?: string;
}

/**
 * 从请求中提取 token
 * 支持多种来源: headers, query, cookies, body
 */
export function extractToken(request: {
  headers?: Headers | Record<string, any>;
  url?: string;
  cookies?: Record<string, string>;
  body?: any;
}): string | null {
  // 从 headers 获取
  if (request.headers) {
    const headers = request.headers;
    if (headers instanceof Headers) {
      // Next.js Headers 对象
      const tokenFromHeader = headers.get('token');
      if (tokenFromHeader) return tokenFromHeader;
    } else {
      // 普通对象
      const tokenFromHeader = (headers as Record<string, any>).token;
      if (tokenFromHeader) return tokenFromHeader;
    }
  }

  // 从 URL query 获取
  if (request.url) {
    const url = new URL(request.url);
    const tokenFromQuery = url.searchParams.get('token');
    if (tokenFromQuery) return tokenFromQuery;
  }

  // 从 cookies 获取
  if (request.cookies?.token) {
    return request.cookies.token;
  }

  // 从 body 获取
  if (request.body?.token) {
    return request.body.token;
  }

  return null;
}

/**
 * 通过用户中心验证 token 并获取用户信息
 */
export async function tokenToUid(token: string): Promise<{
  uid: number | null;
  appid: string | null;
}> {
  if (process.env.APIV11 === 'true') {
    const result = verifyToken(token);
    if (result) {
      log.info({ result,token }, 'tokenToUid-APIV11 JWT 有效');
      return { uid: result.uid, appid: result.appid };
    }
    log.warn({ token }, 'tokenToUid-APIV11 JWT 无效或已过期');
    return { uid: null, appid: null };
  }

  const userCenterUrl =
    process.env.NODE_ENV === 'production' ? process.env.nest_user_center_k8s : process.env.nest_user_center_dev;

  if (!userCenterUrl) {
    log.error('Missing environment variable: nest_user_center_k8s or nest_user_center_dev');
    return { uid: null, appid: null };
  }

  const url = `${userCenterUrl}/auth/v2/validate-token`;

  try {
    const result = await axios.post(url, { token });
    const data = result.data;

    if (!data.user?.uid) {
      return { uid: null, appid: null };
    }

    return {
      uid: data.user.uid,
      appid: data.user.appid,
    };
  } catch (error) {
    log.error({ error }, 'Token validation error');
    return { uid: null, appid: null };
  }
}

/**
 * 验证请求的完整性
 * 检查 token 对应的 uid 是否与请求参数中的 uid 匹配
 */
export async function validateRequest(
  token: string,
  requestedUid: number,
  requestedAppid?: string
): Promise<TokenValidationResult> {
  // 后门，用于开发测试
  if (token === 'backdoor') {
    return {
      isValid: true,
      uid: requestedUid,
      appid: requestedAppid || null,
      token,
    };
  }

  // 验证 token 并获取用户信息
  const { uid: tokenUid, appid: tokenAppid } = await tokenToUid(token);

  if (!tokenUid) {
    return {
      isValid: false,
      uid: null,
      appid: null,
      token,
      error: 'Invalid or expired token',
    };
  }

  // 验证 uid 是否匹配
  const isUidMatch = String(requestedUid) === String(tokenUid);

  // 如果提供了 appid，也验证 appid 是否匹配
  const isAppidMatch = requestedAppid ? String(requestedAppid) === String(tokenAppid) : true;

  if (!isUidMatch) {
    return {
      isValid: false,
      uid: tokenUid,
      appid: tokenAppid,
      token,
      error: 'UID mismatch: token UID does not match requested UID',
    };
  }

  if (!isAppidMatch) {
    return {
      isValid: false,
      uid: tokenUid,
      appid: tokenAppid,
      token,
      error: 'APPID mismatch: token APPID does not match requested APPID',
    };
  }

  return {
    isValid: true,
    uid: tokenUid,
    appid: tokenAppid,
    token,
  };
}

/**
 * Next.js API Route 的认证中间件
 * 从请求中提取并验证 token
 */
export async function authenticateRequest(
  request: {
    headers: Headers;
    url: string;
    body?: any;
  },
  params: {
    uid: number;
    appid?: string;
  }
): Promise<TokenValidationResult> {
  // 提取 token
  const token = extractToken(request);

  if (!token) {
    return {
      isValid: false,
      uid: null,
      appid: null,
      token: null,
      error: 'Missing authentication token',
    };
  }

  // 验证 token 和参数
  return validateRequest(token, params.uid, params.appid);
}
