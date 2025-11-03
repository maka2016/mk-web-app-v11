'use client';

import supabaseService from '@/services/supabase';
import APPBridge from '@mk/app-bridge';
import { queryToObj } from '@mk/utils';
import { useEffect, useState } from 'react';
import PurchaseModal from './PurchaseModal';

export default function MakaAiTest() {
  const [urlParams, setUrlParams] = useState<Record<string, any>>({});
  const [userInfo, setUserInfo] = useState<any>(null);
  const [languageInfo, setLanguageInfo] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [runtime, setRuntime] = useState<string | false>(false);
  const [inApp, setInApp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(false);
  const [signInLoading, setSignInLoading] = useState<boolean>(false);
  const [signInResult, setSignInResult] = useState<any>(null);
  const [signOutLoading, setSignOutLoading] = useState<boolean>(false);
  const [signOutResult, setSignOutResult] = useState<any>(null);
  const [pricePackLoading, setPricePackLoading] = useState<boolean>(false);
  const [pricePackResult, setPricePackResult] = useState<any>(null);
  const [uidLoading, setUidLoading] = useState<boolean>(false);
  const [uidResult, setUidResult] = useState<any>(null);
  const [userRoleLoading, setUserRoleLoading] = useState<boolean>(false);
  const [userRoleResult, setUserRoleResult] = useState<any>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState<boolean>(false);
  const [supabaseUserRolesLoading, setSupabaseUserRolesLoading] =
    useState<boolean>(false);
  const [supabaseUserRolesResult, setSupabaseUserRolesResult] =
    useState<any>(null);
  const [resourcePermissionsLoading, setResourcePermissionsLoading] =
    useState<boolean>(false);
  const [resourcePermissionsResult, setResourcePermissionsResult] =
    useState<any>(null);
  const [resourceIdInput, setResourceIdInput] = useState<string>('');
  const [resourceIdQueryLoading, setResourceIdQueryLoading] =
    useState<boolean>(false);
  const [resourceIdQueryResult, setResourceIdQueryResult] = useState<any>(null);
  const [iapIdsInput, setIapIdsInput] = useState<string>('');
  const [iapPricesLoading, setIapPricesLoading] = useState<boolean>(false);
  const [iapPricesResult, setIapPricesResult] = useState<any>(null);
  const [shareLoading, setShareLoading] = useState<boolean>(false);
  const [shareResult, setShareResult] = useState<any>(null);

  useEffect(() => {
    // 读取 URL 参数
    const params = queryToObj();
    setUrlParams(params);

    // 检测运行环境
    const r = APPBridge.getRuntime();
    setRuntime(r);
    const isInApp = APPBridge.judgeIsInApp();
    setInApp(!!isInApp);

    supabaseService.signInWithRefreshToken();

    // 如果在 app 内，获取更多信息
    if (isInApp) {
      fetchAppData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAppData = async () => {
    try {
      // 获取用户信息
      await APPBridge.appCall(
        {
          type: 'MKUserInfo',
          params: {},
          jsCbFnName: 'makaaiTestUserInfoCb',
        },
        data => {
          console.log('userInfo ggg:', data);
          setUserInfo(data);
        },
        2000
      );

      // 获取语言信息
      await APPBridge.appCall(
        {
          type: 'MKLanguageInfo',
          params: {},
          jsCbFnName: 'makaaiTestLanguageInfoCb',
        },
        data => {
          setLanguageInfo(data);
        },
        2000
      );

      // 获取设备信息
      await APPBridge.appCall(
        {
          type: 'MKDeviceInfo' as any,
          params: {},
          jsCbFnName: 'makaaiTestDeviceInfoCb',
        },
        data => {
          setDeviceInfo(data);
        },
        2000
      );
    } catch (error) {
      console.error('获取 APP 数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentUser = async () => {
    setSupabaseLoading(true);
    try {
      const result = await supabaseService.getCurrentUser();

      setSupabaseUser({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    } catch (error) {
      console.error('获取 Supabase 用户失败:', error);
      setSupabaseUser({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setSupabaseLoading(false);
    }
  };

  const handleSignInWithRefreshToken = async () => {
    setSignInLoading(true);
    setSignInResult(null);
    try {
      await supabaseService.signInWithRefreshToken();
      setSignInResult({
        success: true,
        message: '登录成功',
      });
    } catch (error) {
      console.error('使用 RefreshToken 登录失败:', error);
      setSignInResult({
        success: false,
        message: error instanceof Error ? error.message : '登录失败',
      });
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    setSignOutResult(null);
    try {
      const result = await supabaseService.signOut();
      setSignOutResult({
        success: result.success,
        message: result.success
          ? '退出登录成功'
          : result.error || '退出登录失败',
      });

      // 如果退出成功，清除用户相关的状态
      if (result.success) {
        setSupabaseUser(null);
      }
    } catch (error) {
      console.error('退出登录失败:', error);
      setSignOutResult({
        success: false,
        message: error instanceof Error ? error.message : '退出登录失败',
      });
    } finally {
      setSignOutLoading(false);
    }
  };

  // 拉取价格包
  const handleGetPricePack = async () => {
    setPricePackLoading(true);
    setPricePackResult(null);
    try {
      const result = await supabaseService.getProductPackages(
        100,
        urlParams.lang || 'zh-CN'
      );
      setPricePackResult({
        success: result.success,
        data: result.data,
        message: result.success
          ? '获取价格包成功'
          : result.error || '获取价格包失败',
      });
    } catch (error) {
      console.error('获取价格包失败:', error);
      setPricePackResult({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '获取价格包失败',
      });
    } finally {
      setPricePackLoading(false);
    }
  };

  // 拉取 UID
  const handleGetUid = async () => {
    setUidLoading(true);
    setUidResult(null);
    try {
      const userInfoData = await APPBridge.appCall(
        {
          type: 'MKUserInfo',
          params: {},
          jsCbFnName: 'makaaiTestUidCb',
        },
        (callbackData: any) => callbackData,
        2000
      );
      const uid =
        (userInfoData as any)?.uid || (userInfoData as any)?.userId || '未获取';
      setUidResult({
        success: true,
        data: uid,
        message: '获取 UID 成功',
        fullData: userInfoData,
      });
    } catch (error) {
      console.error('获取 UID 失败:', error);
      setUidResult({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '获取 UID 失败',
      });
    } finally {
      setUidLoading(false);
    }
  };

  // 拉取用户身份
  const handleGetUserRole = async () => {
    setUserRoleLoading(true);
    setUserRoleResult(null);
    try {
      const data = await APPBridge.appCall(
        {
          type: 'MKUserInfo',
          params: {},
          jsCbFnName: 'makaaiTestUserRoleCb',
        },
        (callbackData: any) => callbackData,
        2000
      );
      setUserRoleResult({
        success: true,
        data: data,
        message: '获取用户身份成功',
      });
    } catch (error) {
      console.error('获取用户身份失败:', error);
      setUserRoleResult({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '获取用户身份失败',
      });
    } finally {
      setUserRoleLoading(false);
    }
  };

  // 打开购买弹窗
  const handleOpenPurchaseModal = () => {
    setPurchaseModalOpen(true);
  };

  // 查询 Supabase 用户角色和有效期
  const handleGetSupabaseUserRoles = async () => {
    setSupabaseUserRolesLoading(true);
    setSupabaseUserRolesResult(null);
    try {
      const result = await supabaseService.getUserRoles();
      setSupabaseUserRolesResult({
        success: result.success,
        data: result.data,
        message: result.success
          ? '查询用户角色成功'
          : result.error || '查询用户角色失败',
      });
    } catch (error) {
      console.error('查询用户角色失败:', error);
      setSupabaseUserRolesResult({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '查询用户角色失败',
      });
    } finally {
      setSupabaseUserRolesLoading(false);
    }
  };

  // 查询用户资源权限
  const handleGetResourcePermissions = async () => {
    setResourcePermissionsLoading(true);
    setResourcePermissionsResult(null);
    try {
      const result = await supabaseService.getUserResourcePermissions();
      setResourcePermissionsResult({
        success: result.success,
        data: result.data,
        message: result.success
          ? '查询资源权限成功'
          : result.error || '查询资源权限失败',
      });
    } catch (error) {
      console.error('查询资源权限失败:', error);
      setResourcePermissionsResult({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '查询资源权限失败',
      });
    } finally {
      setResourcePermissionsLoading(false);
    }
  };

  // 根据作品ID查询权限
  const handleQueryResourceById = async () => {
    if (!resourceIdInput.trim()) {
      setResourceIdQueryResult({
        success: false,
        data: null,
        message: '请输入作品ID',
      });
      return;
    }

    setResourceIdQueryLoading(true);
    setResourceIdQueryResult(null);
    try {
      const result =
        await supabaseService.getUserResourcePermissionsByResourceId(
          resourceIdInput.trim()
        );
      setResourceIdQueryResult({
        success: result.success,
        data: result.data,
        message: result.success
          ? '查询作品权限成功'
          : result.error || '查询作品权限失败',
      });
    } catch (error) {
      console.error('查询作品权限失败:', error);
      setResourceIdQueryResult({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '查询作品权限失败',
      });
    } finally {
      setResourceIdQueryLoading(false);
    }
  };

  // 查询 IAP 价格
  const handleGetIapPrices = async () => {
    if (!iapIdsInput.trim()) {
      setIapPricesResult({
        success: false,
        data: null,
        message: '请输入 Apple IAP ID（多个用逗号分隔）',
      });
      return;
    }

    setIapPricesLoading(true);
    setIapPricesResult(null);
    try {
      // 将输入的字符串按逗号分割成数组
      const productIds = iapIdsInput
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (productIds.length === 0) {
        setIapPricesResult({
          success: false,
          data: null,
          message: '请输入有效的 Apple IAP ID',
        });
        setIapPricesLoading(false);
        return;
      }

      // 调用 APPBridge 的 RNGETIAPPRICES 方法
      const data = await APPBridge.appCall(
        {
          type: 'RNGETIAPPRICES' as any,
          params: { productIds },
          jsCbFnName: 'makaaiTestIapPricesCb',
        },
        (callbackData: any) => callbackData,
        5000
      );

      setIapPricesResult({
        success: true,
        data: data,
        message: '查询 IAP 价格成功',
      });
    } catch (error) {
      console.error('查询 IAP 价格失败:', error);
      setIapPricesResult({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '查询 IAP 价格失败',
      });
    } finally {
      setIapPricesLoading(false);
    }
  };

  // 测试分享功能
  const handleShare = async () => {
    setShareLoading(true);
    setShareResult(null);
    try {
      const data = await APPBridge.appCall(
        {
          type: 'MKShare' as any,
          params: {
            type: 'link',
            shareType: 'system',
            url: 'https://maka.ai',
            content: 'makaai测试content',
            title: 'makaai测试标题',
          },
          jsCbFnName: 'makaaiTestShareCb',
        },
        (callbackData: any) => callbackData,
        5000
      );

      setShareResult({
        success: true,
        data: data,
        message: '分享成功',
      });
    } catch (error) {
      console.error('分享失败:', error);
      setShareResult({
        success: false,
        data: null,
        message: error instanceof Error ? error.message : '分享失败',
      });
    } finally {
      setShareLoading(false);
    }
  };

  const renderSection = (title: string, data: any) => {
    if (!data) return null;

    return (
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-2'>
        <h3 className='text-base font-semibold text-gray-900 border-b pb-2'>
          {title}
        </h3>
        <div className='space-y-1'>
          {typeof data === 'object' ? (
            Object.entries(data).map(([key, value]) => (
              <div key={key} className='flex items-start gap-2 text-sm'>
                <span className='font-mono text-blue-600 min-w-[100px]'>
                  {key}:
                </span>
                <span className='text-gray-700 break-all flex-1'>
                  {typeof value === 'object'
                    ? JSON.stringify(value, null, 2)
                    : String(value)}
                </span>
              </div>
            ))
          ) : (
            <div className='text-sm text-gray-700'>{String(data)}</div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center space-y-2'>
          <div className='w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto'></div>
          <p className='text-sm text-gray-600'>加载中...</p>
        </div>
      </div>
    );
  }

  const sessionToken =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('editor_token')
      : null;

  return (
    <div className='min-h-screen bg-gray-50 p-4 pb-8'>
      <div className='max-w-4xl mx-auto space-y-4'>
        {/* 页面标题 */}
        <div className='bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white'>
          <h1 className='text-2xl font-bold mb-2'>MAKA-AI Test Page</h1>
          <p className='text-sm opacity-90'>App 内嵌页面 - 环境变量检测工具</p>
        </div>

        {/* 运行环境状态 */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
          <h2 className='text-base font-semibold text-gray-900 mb-3'>
            运行环境
          </h2>
          <div className='flex flex-wrap gap-2'>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                inApp
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {inApp ? '✓ 在 App 内' : '✗ 非 App 环境'}
            </span>
            <span className='px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800'>
              Runtime: {runtime || 'Unknown'}
            </span>
            {typeof window !== 'undefined' && (
              <span className='px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800'>
                {/iPhone|iPad|iPod/i.test(navigator.userAgent)
                  ? 'iOS'
                  : /Android/i.test(navigator.userAgent)
                    ? 'Android'
                    : 'Web'}
              </span>
            )}
          </div>
        </div>

        {/* Supabase 用户测试 */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
          <h2 className='text-base font-semibold text-gray-900 mb-3'>
            Supabase 用户测试
          </h2>
          <button
            onClick={handleGetCurrentUser}
            disabled={supabaseLoading}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
              supabaseLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {supabaseLoading ? '获取中...' : '获取 getCurrentUser'}
          </button>

          <button
            onClick={handleSignInWithRefreshToken}
            disabled={signInLoading}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors mt-2 ${
              signInLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
            }`}
          >
            {signInLoading ? '登录中...' : '使用 RefreshToken 登录'}
          </button>

          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors mt-2 ${
              signOutLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
            }`}
          >
            {signOutLoading ? '退出中...' : '退出登录'}
          </button>

          <button
            onClick={handleGetSupabaseUserRoles}
            disabled={supabaseUserRolesLoading}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors mt-2 ${
              supabaseUserRolesLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800'
            }`}
          >
            {supabaseUserRolesLoading ? '查询中...' : '查询用户角色和有效期'}
          </button>

          <button
            onClick={handleGetResourcePermissions}
            disabled={resourcePermissionsLoading}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors mt-2 ${
              resourcePermissionsLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-pink-600 text-white hover:bg-pink-700 active:bg-pink-800'
            }`}
          >
            {resourcePermissionsLoading ? '查询中...' : '查询用户资源权限'}
          </button>

          {signInResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    signInResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {signInResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {signInResult.message}
                </span>
              </div>
            </div>
          )}

          {signOutResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    signOutResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {signOutResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {signOutResult.message}
                </span>
              </div>
            </div>
          )}

          {supabaseUser && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    supabaseUser.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {supabaseUser.success ? '成功' : '失败'}
                </span>
              </div>
              {supabaseUser.error && (
                <div className='text-sm text-red-600 mb-2'>
                  错误: {supabaseUser.error}
                </div>
              )}
              {supabaseUser.data && (
                <div className='space-y-1'>
                  <div className='text-sm font-mono break-all'>
                    <span className='text-gray-600'>ID:</span>{' '}
                    <span className='text-gray-900'>
                      {supabaseUser.data.id}
                    </span>
                  </div>
                  <div className='text-sm font-mono break-all'>
                    <span className='text-gray-600'>Email:</span>{' '}
                    <span className='text-gray-900'>
                      {supabaseUser.data.email || '无'}
                    </span>
                  </div>
                  <div className='text-sm font-mono break-all'>
                    <span className='text-gray-600'>Created At:</span>{' '}
                    <span className='text-gray-900'>
                      {supabaseUser.data.created_at}
                    </span>
                  </div>
                  <details className='mt-2'>
                    <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                      查看完整数据
                    </summary>
                    <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                      {JSON.stringify(supabaseUser.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
              {!supabaseUser.data && !supabaseUser.error && (
                <div className='text-sm text-gray-600'>
                  未登录或未找到用户信息
                </div>
              )}
            </div>
          )}

          {supabaseUserRolesResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    supabaseUserRolesResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {supabaseUserRolesResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {supabaseUserRolesResult.message}
                </span>
              </div>
              {supabaseUserRolesResult.data &&
              supabaseUserRolesResult.data.length > 0 ? (
                <div className='space-y-3 mt-3'>
                  {supabaseUserRolesResult.data.map(
                    (userRole: any, index: number) => {
                      const isExpired = userRole.expires_at
                        ? new Date(userRole.expires_at) < new Date()
                        : false;
                      const isActive = userRole.start_at
                        ? new Date(userRole.start_at) <= new Date()
                        : true;
                      const status = isExpired
                        ? '已过期'
                        : isActive
                          ? '有效'
                          : '未生效';
                      const statusColor = isExpired
                        ? 'bg-red-100 text-red-800'
                        : isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800';

                      return (
                        <div
                          key={index}
                          className='p-3 bg-white border border-gray-200 rounded-lg'
                        >
                          <div className='flex items-center gap-2 mb-2'>
                            <span className='text-sm font-semibold text-gray-900'>
                              {userRole.roles?.name || '未知角色'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
                            >
                              {status}
                            </span>
                          </div>
                          {userRole.roles?.description && (
                            <div className='text-xs text-gray-600 mb-2'>
                              {userRole.roles.description}
                            </div>
                          )}
                          <div className='space-y-1 text-xs'>
                            {userRole.roles?.alias && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  别名:
                                </span>
                                <span className='text-gray-700 font-mono'>
                                  {userRole.roles.alias}
                                </span>
                              </div>
                            )}
                            {userRole.start_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  开始:
                                </span>
                                <span className='text-gray-700'>
                                  {new Date(userRole.start_at).toLocaleString(
                                    'zh-CN'
                                  )}
                                </span>
                              </div>
                            )}
                            {userRole.expires_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  到期:
                                </span>
                                <span className='text-gray-700'>
                                  {new Date(userRole.expires_at).toLocaleString(
                                    'zh-CN'
                                  )}
                                </span>
                              </div>
                            )}
                            {!userRole.expires_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  有效期:
                                </span>
                                <span className='text-green-700 font-medium'>
                                  永久有效
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                  <details className='mt-2'>
                    <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                      查看原始数据
                    </summary>
                    <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                      {JSON.stringify(supabaseUserRolesResult.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : supabaseUserRolesResult.success ? (
                <div className='text-sm text-gray-600 mt-2'>
                  该用户暂无角色信息
                </div>
              ) : null}
            </div>
          )}

          {resourcePermissionsResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    resourcePermissionsResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {resourcePermissionsResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {resourcePermissionsResult.message}
                </span>
              </div>
              {resourcePermissionsResult.data &&
              resourcePermissionsResult.data.length > 0 ? (
                <div className='space-y-3 mt-3'>
                  {resourcePermissionsResult.data.map(
                    (permission: any, index: number) => {
                      const isExpired = permission.expires_at
                        ? new Date(permission.expires_at) < new Date()
                        : false;
                      const isActive = permission.start_at
                        ? new Date(permission.start_at) <= new Date()
                        : true;
                      const status = isExpired
                        ? '已过期'
                        : isActive
                          ? '有效'
                          : '未生效';
                      const statusColor = isExpired
                        ? 'bg-red-100 text-red-800'
                        : isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800';

                      return (
                        <div
                          key={index}
                          className='p-3 bg-white border border-gray-200 rounded-lg'
                        >
                          <div className='flex items-center gap-2 mb-2'>
                            <span className='text-sm font-semibold text-gray-900'>
                              {permission.permissions?.alias || '未知权限'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
                            >
                              {status}
                            </span>
                          </div>
                          {permission.permissions?.description && (
                            <div className='text-xs text-gray-600 mb-2'>
                              {permission.permissions.description}
                            </div>
                          )}
                          <div className='space-y-1 text-xs'>
                            {permission.resource_id && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  资源ID:
                                </span>
                                <span className='text-gray-700 font-mono'>
                                  {permission.resource_id}
                                </span>
                              </div>
                            )}
                            {permission.resouce_type && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  资源类型:
                                </span>
                                <span className='text-gray-700'>
                                  {permission.resouce_type}
                                </span>
                              </div>
                            )}
                            {permission.action_url && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  操作URL:
                                </span>
                                <span className='text-gray-700 font-mono break-all'>
                                  {permission.action_url}
                                </span>
                              </div>
                            )}
                            {permission.val !== null &&
                              permission.val !== undefined && (
                                <div className='flex gap-2'>
                                  <span className='text-gray-500 min-w-[60px]'>
                                    数值:
                                  </span>
                                  <span className='text-gray-700 font-mono'>
                                    {permission.val}
                                  </span>
                                </div>
                              )}
                            {permission.start_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  开始:
                                </span>
                                <span className='text-gray-700'>
                                  {new Date(permission.start_at).toLocaleString(
                                    'zh-CN'
                                  )}
                                </span>
                              </div>
                            )}
                            {permission.expires_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  到期:
                                </span>
                                <span className='text-gray-700'>
                                  {new Date(
                                    permission.expires_at
                                  ).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            )}
                            {!permission.expires_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  有效期:
                                </span>
                                <span className='text-green-700 font-medium'>
                                  永久有效
                                </span>
                              </div>
                            )}
                            {permission.permissions?.value !== null &&
                              permission.permissions?.value !== undefined && (
                                <div className='flex gap-2'>
                                  <span className='text-gray-500 min-w-[60px]'>
                                    权限值:
                                  </span>
                                  <span className='text-gray-700 font-mono'>
                                    {permission.permissions.value}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    }
                  )}
                  <details className='mt-2'>
                    <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                      查看原始数据
                    </summary>
                    <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                      {JSON.stringify(resourcePermissionsResult.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : resourcePermissionsResult.success ? (
                <div className='text-sm text-gray-600 mt-2'>
                  该用户暂无资源权限
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 作品测试模块 */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
          <h2 className='text-base font-semibold text-gray-900 mb-3'>
            作品测试
          </h2>
          <div className='space-y-3'>
            <div>
              <label
                htmlFor='resourceId'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                作品 ID (resource_id)
              </label>
              <input
                id='resourceId'
                type='text'
                value={resourceIdInput}
                onChange={e => setResourceIdInput(e.target.value)}
                placeholder='请输入作品ID'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            <button
              onClick={handleQueryResourceById}
              disabled={resourceIdQueryLoading || !resourceIdInput.trim()}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                resourceIdQueryLoading || !resourceIdInput.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {resourceIdQueryLoading ? '查询中...' : '查询作品权限'}
            </button>
          </div>

          {resourceIdQueryResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    resourceIdQueryResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {resourceIdQueryResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {resourceIdQueryResult.message}
                </span>
              </div>
              {resourceIdQueryResult.data &&
              resourceIdQueryResult.data.length > 0 ? (
                <div className='space-y-3 mt-3'>
                  {resourceIdQueryResult.data.map(
                    (permission: any, index: number) => {
                      const isExpired = permission.expires_at
                        ? new Date(permission.expires_at) < new Date()
                        : false;
                      const isActive = permission.start_at
                        ? new Date(permission.start_at) <= new Date()
                        : true;
                      const status = isExpired
                        ? '已过期'
                        : isActive
                          ? '有效'
                          : '未生效';
                      const statusColor = isExpired
                        ? 'bg-red-100 text-red-800'
                        : isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800';

                      return (
                        <div
                          key={index}
                          className='p-3 bg-white border border-gray-200 rounded-lg'
                        >
                          <div className='flex items-center gap-2 mb-2'>
                            <span className='text-sm font-semibold text-gray-900'>
                              {permission.permissions?.alias || '未知权限'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}
                            >
                              {status}
                            </span>
                          </div>
                          {permission.permissions?.description && (
                            <div className='text-xs text-gray-600 mb-2'>
                              {permission.permissions.description}
                            </div>
                          )}
                          <div className='space-y-1 text-xs'>
                            {permission.resource_id && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  资源ID:
                                </span>
                                <span className='text-gray-700 font-mono'>
                                  {permission.resource_id}
                                </span>
                              </div>
                            )}
                            {permission.resouce_type && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  资源类型:
                                </span>
                                <span className='text-gray-700'>
                                  {permission.resouce_type}
                                </span>
                              </div>
                            )}
                            {permission.action_url && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  操作URL:
                                </span>
                                <span className='text-gray-700 font-mono break-all'>
                                  {permission.action_url}
                                </span>
                              </div>
                            )}
                            {permission.val !== null &&
                              permission.val !== undefined && (
                                <div className='flex gap-2'>
                                  <span className='text-gray-500 min-w-[60px]'>
                                    数值:
                                  </span>
                                  <span className='text-gray-700 font-mono'>
                                    {permission.val}
                                  </span>
                                </div>
                              )}
                            {permission.start_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  开始:
                                </span>
                                <span className='text-gray-700'>
                                  {new Date(permission.start_at).toLocaleString(
                                    'zh-CN'
                                  )}
                                </span>
                              </div>
                            )}
                            {permission.expires_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  到期:
                                </span>
                                <span className='text-gray-700'>
                                  {new Date(
                                    permission.expires_at
                                  ).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            )}
                            {!permission.expires_at && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  有效期:
                                </span>
                                <span className='text-green-700 font-medium'>
                                  永久有效
                                </span>
                              </div>
                            )}
                            {permission.permissions?.value !== null &&
                              permission.permissions?.value !== undefined && (
                                <div className='flex gap-2'>
                                  <span className='text-gray-500 min-w-[60px]'>
                                    权限值:
                                  </span>
                                  <span className='text-gray-700 font-mono'>
                                    {permission.permissions.value}
                                  </span>
                                </div>
                              )}
                            {permission.permissions?.name && (
                              <div className='flex gap-2'>
                                <span className='text-gray-500 min-w-[60px]'>
                                  权限名称:
                                </span>
                                <span className='text-gray-700'>
                                  {permission.permissions.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                  <details className='mt-2'>
                    <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                      查看原始数据
                    </summary>
                    <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                      {JSON.stringify(resourceIdQueryResult.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : resourceIdQueryResult.success ? (
                <div className='text-sm text-gray-600 mt-2'>
                  该作品暂无权限记录
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 业务测试模块 */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
          <h2 className='text-base font-semibold text-gray-900 mb-3'>
            业务测试
          </h2>
          <div className='space-y-2'>
            {/* 拉取价格包按钮 */}
            <button
              onClick={handleGetPricePack}
              disabled={pricePackLoading}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                pricePackLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
              }`}
            >
              {pricePackLoading ? '拉取中...' : '拉取价格包'}
            </button>

            {/* 拉取 UID 按钮 */}
            <button
              onClick={handleGetUid}
              disabled={uidLoading}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                uidLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
              }`}
            >
              {uidLoading ? '拉取中...' : '拉取 UID'}
            </button>

            {/* 拉取用户身份按钮 */}
            <button
              onClick={handleGetUserRole}
              disabled={userRoleLoading}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                userRoleLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800'
              }`}
            >
              {userRoleLoading ? '拉取中...' : '拉取用户身份'}
            </button>

            {/* 打开购买弹窗按钮 */}
            <button
              onClick={handleOpenPurchaseModal}
              className='w-full px-4 py-2 rounded-lg font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800'
            >
              打开购买弹窗
            </button>

            {/* 测试分享按钮 */}
            <button
              onClick={handleShare}
              disabled={shareLoading}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                shareLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
              }`}
            >
              {shareLoading ? '分享中...' : '测试分享 (makaai测试)'}
            </button>
          </div>

          {/* IAP 价格查询按钮 */}
          <div className='mt-4 space-y-2'>
            <div className='text-sm font-medium text-gray-700 mb-2'>
              查询 Apple IAP 价格
            </div>
            <input
              type='text'
              value={iapIdsInput}
              onChange={e => setIapIdsInput(e.target.value)}
              placeholder='输入 Apple IAP ID，多个用逗号分隔'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'
            />
            <button
              onClick={handleGetIapPrices}
              disabled={iapPricesLoading}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                iapPricesLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
              }`}
            >
              {iapPricesLoading ? '查询中...' : '查询 IAP 价格'}
            </button>
          </div>

          {/* IAP 价格结果 */}
          {iapPricesResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    iapPricesResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {iapPricesResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {iapPricesResult.message}
                </span>
              </div>
              {iapPricesResult.data && (
                <details className='mt-2'>
                  <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                    查看数据
                  </summary>
                  <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                    {JSON.stringify(iapPricesResult.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* 价格包结果 */}
          {pricePackResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    pricePackResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {pricePackResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {pricePackResult.message}
                </span>
              </div>
              {pricePackResult.data && (
                <details className='mt-2'>
                  <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                    查看数据
                  </summary>
                  <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                    {JSON.stringify(pricePackResult.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* UID 结果 */}
          {uidResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    uidResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {uidResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {uidResult.message}
                </span>
              </div>
              {uidResult.data && (
                <div className='text-sm font-mono break-all'>
                  <span className='text-gray-600'>UID:</span>{' '}
                  <span className='text-gray-900'>{uidResult.data}</span>
                </div>
              )}
              {uidResult.fullData && (
                <details className='mt-2'>
                  <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                    查看完整数据
                  </summary>
                  <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                    {JSON.stringify(uidResult.fullData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* 用户身份结果 */}
          {userRoleResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    userRoleResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {userRoleResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {userRoleResult.message}
                </span>
              </div>
              {userRoleResult.data && (
                <details className='mt-2'>
                  <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                    查看数据
                  </summary>
                  <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                    {JSON.stringify(userRoleResult.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* 分享结果 */}
          {shareResult && (
            <div className='mt-3 p-3 bg-gray-50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    shareResult.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {shareResult.success ? '✓ 成功' : '✗ 失败'}
                </span>
                <span className='text-sm text-gray-700'>
                  {shareResult.message}
                </span>
              </div>
              {shareResult.data && (
                <details className='mt-2'>
                  <summary className='cursor-pointer text-xs text-blue-600 hover:text-blue-800'>
                    查看数据
                  </summary>
                  <pre className='mt-2 p-2 bg-black text-green-400 rounded text-xs overflow-auto'>
                    {JSON.stringify(shareResult.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* URL 参数 */}
        {renderSection('URL 参数', {
          ...urlParams,
          _count: Object.keys(urlParams).length,
        })}

        {/* Session Storage Token */}
        {sessionToken &&
          renderSection('Session Storage', {
            editor_token: sessionToken,
          })}

        {/* 用户信息 */}
        {userInfo && renderSection('用户信息 (MKUserInfo)', userInfo)}

        {/* 语言信息 */}
        {languageInfo &&
          renderSection('语言信息 (MKLanguageInfo)', languageInfo)}

        {/* 设备信息 */}
        {deviceInfo && renderSection('设备信息 (MKDeviceInfo)', deviceInfo)}

        {/* User Agent */}
        {typeof window !== 'undefined' &&
          renderSection('User Agent', {
            userAgent: navigator.userAgent,
          })}

        {/* 环境汇总 */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-2'>
          <h3 className='text-base font-semibold text-gray-900 border-b pb-2'>
            环境变量汇总
          </h3>
          <div className='space-y-1'>
            <div className='flex items-start gap-2 text-sm'>
              <span className='font-mono text-blue-600 min-w-[100px]'>
                UID:
              </span>
              <span className='text-gray-700 break-all flex-1'>
                {urlParams.uid || userInfo?.uid || userInfo?.userId || '未获取'}
              </span>
            </div>
            <div className='flex items-start gap-2 text-sm'>
              <span className='font-mono text-blue-600 min-w-[100px]'>
                Token:
              </span>
              <span className='text-gray-700 break-all flex-1 font-mono text-xs'>
                {urlParams.token || sessionToken || userInfo?.token || '未获取'}
              </span>
            </div>
            <div className='flex items-start gap-2 text-sm'>
              <span className='font-mono text-blue-600 min-w-[100px]'>
                RefreshToken:
              </span>
              <span className='text-gray-700 break-all flex-1 font-mono text-xs'>
                {userInfo?.refreshToken || '未获取'}
              </span>
            </div>
            <div className='flex items-start gap-2 text-sm'>
              <span className='font-mono text-blue-600 min-w-[100px]'>
                Lang:
              </span>
              <span className='text-gray-700 break-all flex-1'>
                {urlParams.lang ||
                  languageInfo?.language ||
                  languageInfo?.lang ||
                  '未获取'}
              </span>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        {!inApp && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <p className='text-sm text-yellow-800'>
              💡 提示：当前不在 App 环境中，某些功能可能无法使用。 请在 App
              内打开此页面以获取完整信息。
            </p>
          </div>
        )}

        {/* 调试信息 */}
        <details className='bg-gray-100 rounded-lg p-4'>
          <summary className='cursor-pointer text-sm font-medium text-gray-700'>
            查看原始数据 (JSON)
          </summary>
          <pre className='mt-2 p-3 bg-black text-green-400 rounded text-xs overflow-auto'>
            {JSON.stringify(
              {
                urlParams,
                sessionToken,
                userInfo,
                languageInfo,
                deviceInfo,
                runtime,
                inApp,
                userAgent:
                  typeof window !== 'undefined' ? navigator.userAgent : 'N/A',
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>

      {/* 购买弹窗 */}
      <PurchaseModal
        isOpen={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
        language={urlParams.lang || languageInfo?.language || 'zh-CN'}
        moduleId={100}
      />
    </div>
  );
}
